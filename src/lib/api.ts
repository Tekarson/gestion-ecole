import { APP_MODE } from './app-mode'
import { clearToken, getToken } from './session'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')

export const apiV1Url = `${BASE}/v1`

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(status: number, message: string, details: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)

  // FormData (photo…) : le navigateur fixe lui-même le Content-Type multipart.
  if (options.body != null && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  headers.set('X-App-Mode', APP_MODE)
  headers.set('Accept', 'application/json')

  let res: Response
  try {
    res = await fetch(`${apiV1Url}${path}`, { ...options, headers })
  } catch (cause) {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.', cause)
  }

  if (res.status === 401 && token) {
    clearToken()
  }

  if (!res.ok) {
    let data: { message?: string; error?: string; errors?: Record<string, string[]> } | null = null
    try {
      data = (await res.json()) as { message?: string; error?: string; errors?: Record<string, string[]> }
    } catch {
      /* empty */
    }
    let message = data?.message || data?.error || `Erreur serveur (${res.status})`
    if (data?.errors) {
      const first = Object.values(data.errors).find((arr) => Array.isArray(arr) && arr.length > 0)
      if (first) message = first[0]
    }
    throw new ApiError(res.status, message, data)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * Download a binary file (e.g. a PDF receipt) from the API and save it as an
 * attachment with the given filename.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-App-Mode', APP_MODE)
  headers.set('Accept', 'application/pdf')

  let res: Response
  try {
    res = await fetch(`${apiV1Url}${path}`, { headers })
  } catch (cause) {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.', cause)
  }

  if (!res.ok) {
    let message = `Erreur serveur (${res.status})`
    try {
      const data = (await res.json()) as { message?: string; errors?: Record<string, string[]> }
      message = data?.message ?? message
      const first = data?.errors ? Object.values(data.errors).find((arr) => arr && arr.length > 0) : null
      if (first) message = String(first[0])
    } catch {
      /* empty */
    }
    throw new ApiError(res.status, message)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
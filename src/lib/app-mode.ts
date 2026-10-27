export type AppMode = 'family' | 'admin'

export function getAppMode(): AppMode {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (
      host === 'ntshik.admin.unikinsolutions.cd' ||
      host === 'ntshik.admin.localhost' ||
      host.startsWith('admin.')
    )
      return 'admin'
    if (
      host === 'ntshik.family.unikinsolutions.cd' ||
      host === 'ntshik.family.localhost' ||
      host.startsWith('family.') ||
      host.startsWith('famille.')
    )
      return 'family'
    if (host === 'localhost' || host === '127.0.0.1') {
      return (import.meta.env.VITE_APP_MODE as AppMode | undefined) ?? 'family'
    }
  }
  const env = import.meta.env.VITE_APP_MODE as AppMode | undefined
  return env === 'admin' ? 'admin' : 'family'
}

export const APP_MODE: AppMode = typeof window === 'undefined' ? 'family' : getAppMode()
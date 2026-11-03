import { useSyncExternalStore } from 'react'

/**
 * Année consultée depuis l'en-tête de l'administration. `null` = année active.
 * Envoyée au serveur (en-tête `X-School-Year`) : les lectures affichent les
 * chiffres de cette année, les enregistrements restent sur l'année active.
 */
const KEY = 'ntshik.viewYear'
const listeners = new Set<() => void>()

let current: string | null = (() => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
})()

export function getViewYear(): string | null {
  return current
}

export function setViewYear(year: string | null): void {
  current = year
  try {
    if (year) localStorage.setItem(KEY, year)
    else localStorage.removeItem(KEY)
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useViewYear(): string | null {
  return useSyncExternalStore(subscribe, getViewYear, getViewYear)
}

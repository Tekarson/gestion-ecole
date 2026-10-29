import { useEffect, useMemo, useState } from 'react'

export const PAGE_SIZE = 20

/** Normalise a string for accent/case-insensitive search. */
export function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** True when every word of `query` appears in one of `fields`. */
export function matchesSearch(query: string, fields: (string | null | undefined)[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fields.map(normalize).join(' ')
  return words.every((w) => haystack.includes(w))
}

/**
 * Client-side pagination; goes back to page 1 whenever `resetKey` changes
 * (new search, new filter…).
 */
export function usePagination<T>(items: T[], resetKey: unknown, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const current = Math.min(page, pageCount)
  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  )

  return { page: current, pageCount, pageItems, setPage, total: items.length, pageSize }
}

/** Plain table styles that print cleanly. */
export const printTable = 'w-full border-collapse text-left text-[11px] [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1'

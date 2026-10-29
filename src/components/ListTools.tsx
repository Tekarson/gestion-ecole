import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        className="glass-input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  setPage,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  setPage: (page: number) => void
}) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 print:hidden">
      <span>
        {from}–{to} sur {total}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Page précédente">
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            Page {page} / {pageCount}
          </span>
          <Button
            variant="subtle"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

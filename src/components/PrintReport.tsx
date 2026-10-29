import type { ReactNode } from 'react'

/**
 * Printable report: invisible on screen, it is the only thing printed
 * (see `.print-area` in index.css). Put the full, unpaginated rows inside.
 */
export function PrintReport({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  const printedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <div className="print-area hidden print:block">
      <div className="mb-4 border-b border-slate-300 pb-3">
        <div className="text-xs uppercase tracking-wider text-slate-500">NTSHIK · Complexe Scolaire Bel Avenir</div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-600">{subtitle}</div>}
        <div className="mt-1 text-xs text-slate-400">Imprimé le {printedAt}</div>
      </div>
      {children}
    </div>
  )
}


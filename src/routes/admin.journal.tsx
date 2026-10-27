import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileClock } from 'lucide-react'
import { auditQuery } from '@/lib/data'
import { dateFr } from '@/lib/fees'
import { Card, EmptyState, SectionTitle } from '@/components/ui'

export const Route = createFileRoute('/admin/journal')({
  component: AdminJournal,
})

function AdminJournal() {
  const audit = useQuery(auditQuery)
  const entries = audit.data ?? []

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Journal d’activité"
        subtitle="Toutes les actions importantes enregistrées"
      />

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileClock className="size-8" />}
            title="Journal vide"
            hint="Les actions (paiements confirmés, annulations…) seront consignées ici."
          />
        </Card>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-100" aria-hidden="true" />
          <ol className="space-y-0">
            {entries.map((entry) => (
              <li key={entry.id} className="relative flex gap-4 pb-6 pl-1">
                <span className="relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-brand-600 text-xs font-bold text-white">
                  {entry.user_name ? entry.user_name[0]?.toUpperCase() : '?'}
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{entry.action}</span>
                    <span className="text-xs text-slate-400">{dateFr(entry.created_at)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {entry.user_name ? `par ${entry.user_name}` : 'Système'}
                  </div>
                  {entry.details && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-2 text-xs text-slate-500">
                      {entry.details}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
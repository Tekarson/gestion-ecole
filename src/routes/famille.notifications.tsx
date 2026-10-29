import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, BellRing } from 'lucide-react'
import { notificationsQuery, useMarkNotificationReadMutation } from '@/lib/data'
import { dateFr } from '@/lib/fees'
import { Card, EmptyState, SectionTitle } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Pagination, SearchInput } from '@/components/ListTools'
import { matchesSearch, usePagination } from '@/lib/listing'

export const Route = createFileRoute('/famille/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const notifs = useQuery(notificationsQuery)
  const markRead = useMarkNotificationReadMutation()

  const items = useMemo(() => notifs.data ?? [], [notifs.data])
  const unread = items.filter((n) => !n.read_at).length
  const [search, setSearch] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const filtered = useMemo(
    () => items.filter((n) => (!onlyUnread || !n.read_at) && matchesSearch(search, [n.title, n.body])),
    [items, onlyUnread, search],
  )
  const paging = usePagination(filtered, `${search}|${onlyUnread}`)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="size-8" />}
            title="Aucune notification"
            hint="Recevez ici le suivi de vos paiements et de vos demandes."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une notification…" className="flex-1" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => setOnlyUnread(e.target.checked)}
                className="size-4 accent-brand-500"
              />
              Non lues seulement
            </label>
          </div>
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Aucune notification ne correspond.</p>
          )}
          {paging.pageItems.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read_at && markRead.mutate(n.id)}
              className={cn(
                'glass block w-full p-5 text-left transition hover:bg-slate-100',
                n.read_at && 'opacity-70',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                    n.read_at ? 'bg-slate-100 text-slate-700' : 'bg-brand-600 text-white',
                  )}
                >
                  <BellRing className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{n.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{dateFr(n.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{n.body}</p>
                  {!n.read_at && <span className="chip mt-2 bg-brand-50 text-brand-700">Nouveau</span>}
                </div>
              </div>
            </button>
          ))}
          <Card className="p-0">
            <Pagination {...paging} />
          </Card>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        <Link to="/famille/historique" className="underline">
          Voir l’historique des paiements
        </Link>
      </p>
    </div>
  )
}

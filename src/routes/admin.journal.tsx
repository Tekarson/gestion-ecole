import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileClock, Printer, X } from 'lucide-react'
import { auditQuery } from '@/lib/data'
import { dateFr, fmt, methodLabel, natureLabel, type AuditEntry } from '@/lib/fees'
import { matchesSearch, printTable, usePagination } from '@/lib/listing'
import { Button, Card, EmptyState, Input, Label, SectionTitle, Select } from '@/components/ui'
import { Pagination, SearchInput } from '@/components/ListTools'
import { PrintReport } from '@/components/PrintReport'

export const Route = createFileRoute('/admin/journal')({
  component: AdminJournal,
})

const ACTION_LABELS: Record<string, string> = {
  'payment.received': 'Paiement envoyé par une famille',
  'payment.recorded': 'Paiement encaissé au guichet',
  'payment.confirmed': 'Paiement confirmé',
  'payment.cancelled': 'Paiement annulé',
  'student.created': 'Élève ajouté',
  'student.updated': 'Élève modifié',
  'class.deleted': 'Classe supprimée',
  'settings.updated': 'Paramètres modifiés',
  'school.year_closed': 'Année scolaire clôturée',
  'user.created': 'Utilisateur créé',
  'user.updated': 'Utilisateur modifié',
  'user.deleted': 'Utilisateur supprimé',
}

const DETAIL_LABELS: Record<string, string> = {
  reference: 'Référence',
  student: 'Élève',
  nature: 'Type des frais',
  amount: 'Montant',
  method: 'Moyen',
  note: 'Motif',
  class: 'Classe',
  matricule: 'Matricule',
  from: 'De',
  to: 'À',
  school_year: 'Année',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

/** Turns the JSON details of an entry into readable « label : valeur » pairs. */
function detailPairs(entry: AuditEntry): { label: string; value: string }[] {
  if (!entry.details) return []
  let data: unknown
  try {
    data = JSON.parse(entry.details)
  } catch {
    return [{ label: 'Détail', value: entry.details }]
  }
  if (!data || typeof data !== 'object') return [{ label: 'Détail', value: String(data) }]

  return Object.entries(data as Record<string, unknown>)
    .filter(([key, value]) => value !== null && value !== '' && DETAIL_LABELS[key] !== undefined)
    .map(([key, value]) => {
      let text = Array.isArray(value) ? value.join(', ') : String(value)
      if (key === 'amount') text = fmt(Number(value))
      if (key === 'nature') text = natureLabel(String(value))
      if (key === 'method') text = methodLabel(String(value))
      return { label: DETAIL_LABELS[key], value: text }
    })
}

function localDay(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function timeFr(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function AdminJournal() {
  const audit = useQuery(auditQuery)
  const entries = useMemo(() => audit.data ?? [], [audit.data])

  const [mode, setMode] = useState<'all' | 'day' | 'period'>('all')
  const [day, setDay] = useState(() => localDay(new Date().toISOString()))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries])

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const d = localDay(e.created_at)
        if (mode === 'day' && d !== day) return false
        if (mode === 'period' && ((from && d < from) || (to && d > to))) return false
        if (action && e.action !== action) return false
        return matchesSearch(search, [actionLabel(e.action), e.user_name, ...detailPairs(e).map((p) => p.value)])
      }),
    [entries, mode, day, from, to, action, search],
  )
  const paging = usePagination(filtered, `${mode}|${day}|${from}|${to}|${action}|${search}`)

  const paymentTotal = filtered
    .filter((e) => e.action === 'payment.recorded' || e.action === 'payment.confirmed')
    .reduce((s, e) => {
      try {
        return s + Number(JSON.parse(e.details ?? '{}').amount ?? 0)
      } catch {
        return s
      }
    }, 0)

  const periodLabel =
    mode === 'day'
      ? `Journée du ${dateFr(day)}`
      : mode === 'period'
        ? `Période ${from ? `du ${dateFr(from)}` : ''} ${to ? `au ${dateFr(to)}` : ''}`.trim()
        : 'Toutes les opérations'
  const subtitle = [periodLabel, action && actionLabel(action), search && `Recherche : « ${search} »`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Journal d’activité"
        subtitle={`${filtered.length} opération(s) · ${periodLabel}`}
        action={
          <Button variant="subtle" onClick={() => window.print()} disabled={filtered.length === 0}>
            <Printer className="size-4" /> Imprimer
          </Button>
        }
      />

      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label htmlFor="jf-mode">Période</Label>
            <Select
              id="jf-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'all' | 'day' | 'period')}
              options={[
                { value: 'all', label: 'Tout' },
                { value: 'day', label: 'Un jour' },
                { value: 'period', label: 'Une période (du… au…)' },
              ]}
            />
          </div>
          {mode === 'day' && (
            <div>
              <Label htmlFor="jf-day">Jour</Label>
              <Input id="jf-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
          )}
          {mode === 'period' && (
            <>
              <div>
                <Label htmlFor="jf-from">Du</Label>
                <Input id="jf-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="jf-to">Au</Label>
                <Input id="jf-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="jf-action">Opération</Label>
            <Select
              id="jf-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={[{ value: '', label: 'Toutes' }, ...actions.map((a) => ({ value: a, label: actionLabel(a) }))]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Utilisateur, élève, référence…" className="flex-1" />
          {(mode !== 'all' || action || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode('all')
                setAction('')
                setSearch('')
              }}
            >
              <X className="size-4" /> Effacer les filtres
            </Button>
          )}
        </div>
      </Card>

      {audit.isPending ? (
        <Card className="h-40 animate-pulse" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileClock className="size-8" />}
            title={entries.length === 0 ? 'Journal vide' : 'Aucune opération sur cette sélection'}
            hint="Les actions (paiements, élèves, paramètres…) sont consignées ici."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <ol className="divide-y divide-slate-200">
            {paging.pageItems.map((entry) => (
              <li key={entry.id} className="flex gap-4 p-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {entry.user_name ? entry.user_name[0]?.toUpperCase() : '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{actionLabel(entry.action)}</span>
                    <span className="text-xs text-slate-400">
                      {dateFr(entry.created_at)} · {timeFr(entry.created_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{entry.user_name ? `par ${entry.user_name}` : 'Système'}</div>
                  {detailPairs(entry).length > 0 && (
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      {detailPairs(entry).map((p) => (
                        <div key={p.label}>
                          <dt className="inline text-slate-400">{p.label} : </dt>
                          <dd className="inline">{p.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Pagination {...paging} />
        </Card>
      )}

      <PrintReport title="Journal des opérations" subtitle={subtitle}>
        <table className={printTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure</th>
              <th>Opération</th>
              <th>Par</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>{dateFr(e.created_at)}</td>
                <td>{timeFr(e.created_at)}</td>
                <td>{actionLabel(e.action)}</td>
                <td>{e.user_name ?? 'Système'}</td>
                <td>{detailPairs(e).map((p) => `${p.label} : ${p.value}`).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs">
          {filtered.length} opération(s). Total des paiements encaissés ou confirmés sur la sélection : {fmt(paymentTotal)}.
        </p>
      </PrintReport>
    </div>
  )
}

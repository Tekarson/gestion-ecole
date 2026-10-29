import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Download, Plus, Printer, Users, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adminPaymentsQuery, useUpdatePaymentStatusMutation, whoamiQuery } from '@/lib/data'
import { downloadFile } from '@/lib/api'
import { can, dateFr, fmt, methodLabel, natureLabel, statusLabel, type Payment } from '@/lib/fees'
import { matchesSearch, printTable, usePagination } from '@/lib/listing'
import { Badge, Button, Card, EmptyState, Input, Label, SectionTitle, Select, StatusBadge } from '@/components/ui'
import { Pagination, SearchInput } from '@/components/ListTools'
import { PrintReport } from '@/components/PrintReport'
import { AdminPaymentDialog } from '@/components/AdminPaymentDialog'

interface PaymentsSearch {
  famille?: string
}

export const Route = createFileRoute('/admin/paiements')({
  validateSearch: (search: Record<string, unknown>): PaymentsSearch => ({
    famille: typeof search.famille === 'string' && search.famille !== '' ? search.famille : undefined,
  }),
  component: AdminPayments,
})

interface FamilyGroup {
  familyId: string
  parentName: string
  payments: Payment[]
  total: number
}

/** Jour local (AAAA-MM-JJ) d'une date ISO, pour les filtres « du / au ». */
function localDay(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function confirmedTotal(list: Payment[]): number {
  return list.filter((p) => p.status === 'confirme').reduce((s, p) => s + p.amount, 0)
}

function AdminPayments() {
  const { famille } = Route.useSearch()
  const navigate = useNavigate({ from: '/admin/paiements' })
  const whoami = useQuery(whoamiQuery)
  const payments = useQuery(adminPaymentsQuery)
  const update = useUpdatePaymentStatusMutation()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [nature, setNature] = useState('')
  const [year, setYear] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [grouped, setGrouped] = useState(false)

  const all = useMemo(() => payments.data ?? [], [payments.data])

  const years = useMemo(
    () => [...new Set(all.map((p) => p.school_year).filter((y): y is string => !!y))].sort().reverse(),
    [all],
  )
  const natures = useMemo(() => [...new Set(all.map((p) => p.nature))].sort(), [all])
  const familyName = famille ? (all.find((p) => p.parent_id === famille)?.parent_name ?? 'Famille sélectionnée') : null

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        if (famille && p.parent_id !== famille) return false
        if (status && p.status !== status) return false
        if (nature && p.nature !== nature) return false
        if (year && p.school_year !== year) return false
        const day = localDay(p.created_at)
        if (from && day < from) return false
        if (to && day > to) return false
        return matchesSearch(search, [p.reference, p.student_name, p.parent_name, p.class_name, natureLabel(p.nature)])
      }),
    [all, famille, status, nature, year, from, to, search],
  )

  const groups = useMemo<FamilyGroup[]>(() => {
    const map = new Map<string, FamilyGroup>()
    for (const p of filtered) {
      const g = map.get(p.parent_id) ?? { familyId: p.parent_id, parentName: p.parent_name ?? '—', payments: [], total: 0 }
      g.payments.push(p)
      if (p.status === 'confirme') g.total += p.amount
      map.set(p.parent_id, g)
    }
    return [...map.values()].sort((a, b) => a.parentName.localeCompare(b.parentName, 'fr'))
  }, [filtered])

  const filterKey = `${famille}|${status}|${nature}|${year}|${from}|${to}|${search}|${grouped}`
  const rowPaging = usePagination(filtered, filterKey)
  const groupPaging = usePagination(groups, filterKey)
  const paging = grouped ? groupPaging : rowPaging

  const hasFilters = !!(famille || status || nature || year || from || to || search)
  const filterSummary = [
    familyName && `Famille : ${familyName}`,
    status && `Statut : ${statusLabel(status)}`,
    nature && `Type des frais : ${natureLabel(nature)}`,
    year && `Année : ${year}`,
    from && `Du ${dateFr(from)}`,
    to && `au ${dateFr(to)}`,
    search && `Recherche : « ${search} »`,
  ]
    .filter(Boolean)
    .join(' · ')

  function resetFilters() {
    setSearch('')
    setStatus('')
    setNature('')
    setYear('')
    setFrom('')
    setTo('')
    navigate({ search: {} })
  }

  function confirm(id: string) {
    setBusyId(id)
    update.mutate(
      { id, status: 'confirme' },
      {
        onSuccess: () => toast.success('Paiement confirmé'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => setBusyId(null),
      },
    )
  }

  function cancel(id: string) {
    const note = window.prompt('Motif d’annulation (facultatif) :')
    if (note === null) return
    setBusyId(id)
    update.mutate(
      { id, status: 'annule', note: note || undefined },
      {
        onSuccess: () => toast.success('Paiement annulé'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => setBusyId(null),
      },
    )
  }

  async function download(p: { id: string; reference: string }) {
    try {
      setBusyId(p.id)
      await downloadFile(`/admin/payments/${p.id}/recu`, `recu-${p.reference}.pdf`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de téléchargement')
    } finally {
      setBusyId(null)
    }
  }

  function renderRow(p: Payment) {
    return (
      <tr key={p.id} className="align-top transition hover:bg-slate-50">
        <td className="px-4 py-3">
          <span className="font-medium text-brand-700">{p.reference}</span>
          {p.note && <div className="mt-0.5 text-xs text-amber-600">Note : {p.note}</div>}
        </td>
        <td className="px-4 py-3 text-slate-900">
          {p.student_name}
          {p.class_name && <div className="text-xs text-slate-500">{p.class_name}</div>}
        </td>
        {!grouped && <td className="px-4 py-3 text-slate-700">{p.parent_name}</td>}
        <td className="px-4 py-3 text-slate-700">{natureLabel(p.nature)}</td>
        <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(p.amount)}</td>
        <td className="px-4 py-3 text-slate-500">{methodLabel(p.method)}</td>
        <td className="px-4 py-3 text-slate-500">{dateFr(p.created_at)}</td>
        <td className="px-4 py-3">
          <StatusBadge status={p.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            {p.status === 'en_attente' ? (
              <>
                <Button size="sm" loading={busyId === p.id} onClick={() => confirm(p.id)} title="Confirmer">
                  <CheckCircle2 className="size-4" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => cancel(p.id)} disabled={busyId === p.id} title="Annuler">
                  <XCircle className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" title="Télécharger le reçu" loading={busyId === p.id} onClick={() => download(p)}>
                <Download className="size-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const headers = (
    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
      <th className="px-4 py-3">Référence</th>
      <th className="px-4 py-3">Élève</th>
      {!grouped && <th className="px-4 py-3">Famille</th>}
      <th className="px-4 py-3">Type des frais</th>
      <th className="px-4 py-3 text-right">Montant</th>
      <th className="px-4 py-3">Moyen</th>
      <th className="px-4 py-3">Date</th>
      <th className="px-4 py-3">Statut</th>
      <th className="px-4 py-3 text-right">Actions</th>
    </tr>
  )

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Paiements"
        subtitle={`${filtered.length} paiement(s) · ${fmt(confirmedTotal(filtered))} encaissé(s)`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" onClick={() => window.print()} disabled={filtered.length === 0}>
              <Printer className="size-4" /> Imprimer
            </Button>
            {can(whoami.data, 'paiements', 'create') && (
              <Button onClick={() => setOpenDialog(true)}>
                <Plus className="size-4" /> Nouveau paiement
              </Button>
            )}
          </div>
        }
      />

      <AdminPaymentDialog open={openDialog} onOpenChange={setOpenDialog} />

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Référence, élève, parent, classe…"
            className="flex-1"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="size-4 accent-brand-500" />
            <Users className="size-4 text-slate-500" /> Grouper par famille
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <Label htmlFor="pf-status">Statut</Label>
            <Select
              id="pf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'Tous' },
                { value: 'confirme', label: 'Confirmé' },
                { value: 'en_attente', label: 'En attente' },
                { value: 'annule', label: 'Annulé' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="pf-nature">Type des frais</Label>
            <Select
              id="pf-nature"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              options={[{ value: '', label: 'Tous' }, ...natures.map((n) => ({ value: n, label: natureLabel(n) }))]}
            />
          </div>
          <div>
            <Label htmlFor="pf-year">Année scolaire</Label>
            <Select
              id="pf-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={[{ value: '', label: 'Toutes' }, ...years.map((y) => ({ value: y, label: y }))]}
            />
          </div>
          <div>
            <Label htmlFor="pf-from">Du</Label>
            <Input id="pf-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pf-to">Au</Label>
            <Input id="pf-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {familyName && <Badge tone="sky">Famille : {familyName}</Badge>}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-4" /> Effacer les filtres
            </Button>
          </div>
        )}
      </Card>

      {payments.isPending ? (
        <Card className="h-40 animate-pulse" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-8" />}
            title={all.length === 0 ? 'Aucun paiement' : 'Aucun paiement ne correspond'}
            hint={all.length === 0 ? 'Les paiements envoyés par les familles apparaîtront ici.' : 'Modifiez ou effacez les filtres.'}
          />
        </Card>
      ) : (
        <Card className="glass-scroll overflow-x-auto p-0">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead>{headers}</thead>
            {grouped ? (
              groupPaging.pageItems.map((g) => (
                <tbody key={g.familyId} className="divide-y divide-slate-200 border-b-2 border-slate-200">
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="px-4 py-2 font-semibold text-slate-900">
                      {g.parentName}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {g.payments.length} paiement(s) · {fmt(g.total)} encaissé(s)
                      </span>
                    </td>
                  </tr>
                  {g.payments.map(renderRow)}
                </tbody>
              ))
            ) : (
              <tbody className="divide-y divide-slate-200">{rowPaging.pageItems.map(renderRow)}</tbody>
            )}
          </table>
          <Pagination {...paging} />
        </Card>
      )}

      <PrintReport title="Rapport des paiements" subtitle={filterSummary || 'Tous les paiements'}>
        <table className={printTable}>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Élève</th>
              <th>Classe</th>
              <th>Famille</th>
              <th>Type des frais</th>
              <th>Moyen</th>
              <th>Statut</th>
              <th className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {(grouped ? groups.flatMap((g) => g.payments) : filtered).map((p) => (
              <tr key={p.id}>
                <td>{p.reference}</td>
                <td>{dateFr(p.created_at)}</td>
                <td>{p.student_name}</td>
                <td>{p.class_name ?? '—'}</td>
                <td>{p.parent_name ?? '—'}</td>
                <td>{natureLabel(p.nature)}</td>
                <td>{methodLabel(p.method)}</td>
                <td>{statusLabel(p.status)}</td>
                <td className="text-right">{fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} className="font-semibold">
                Total encaissé (paiements confirmés) · {filtered.length} paiement(s)
              </td>
              <td className="text-right font-semibold">{fmt(confirmedTotal(filtered))}</td>
            </tr>
          </tfoot>
        </table>
        {grouped && (
          <table className={`${printTable} mt-4`}>
            <thead>
              <tr>
                <th>Famille</th>
                <th>Nombre de paiements</th>
                <th className="text-right">Total encaissé</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.familyId}>
                  <td>{g.parentName}</td>
                  <td>{g.payments.length}</td>
                  <td className="text-right">{fmt(g.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintReport>
    </div>
  )
}

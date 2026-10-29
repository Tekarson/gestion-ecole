import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileBarChart, Printer } from 'lucide-react'
import { solvencyQuery } from '@/lib/data'
import { fmt, natureLabel } from '@/lib/fees'
import { matchesSearch, printTable, usePagination } from '@/lib/listing'
import { Badge, Button, Card, EmptyState, Label, SectionTitle, Select, StatCard } from '@/components/ui'
import { Pagination, SearchInput } from '@/components/ListTools'
import { PrintReport } from '@/components/PrintReport'

export const Route = createFileRoute('/admin/rapports')({
  component: AdminReports,
})

type Status = 'insolvables' | 'solvables' | 'tous'

const STATUS_TITLES: Record<Status, string> = {
  insolvables: 'Élèves insolvables',
  solvables: 'Élèves solvables',
  tous: 'Situation des paiements',
}

function AdminReports() {
  const [nature, setNature] = useState('all')
  const [status, setStatus] = useState<Status>('insolvables')
  const [classFilter, setClassFilter] = useState('')
  const [search, setSearch] = useState('')

  const report = useQuery(solvencyQuery(nature))
  const rows = useMemo(() => report.data?.rows ?? [], [report.data])

  const natureOptions = [
    { value: 'all', label: 'Tous les frais' },
    { value: 'minerval', label: 'Minerval (3 tranches)' },
    ...(report.data?.natures ?? []).map((n) => ({ value: n.key, label: natureLabel(n.key) })),
  ]
  const natureName = natureOptions.find((o) => o.value === nature)?.label ?? natureLabel(nature)
  const classes = useMemo(
    () => [...new Set(rows.map((r) => r.class_name).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr')),
    [rows],
  )

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status === 'solvables' && !r.solvent) return false
        if (status === 'insolvables' && r.solvent) return false
        if (classFilter && r.class_name !== classFilter) return false
        return matchesSearch(search, [r.student_name, r.matricule, r.parent_name, r.class_name, r.phone])
      }),
    [rows, status, classFilter, search],
  )
  const paging = usePagination(filtered, `${nature}|${status}|${classFilter}|${search}`)

  const solventCount = rows.filter((r) => r.solvent).length
  const totalRemaining = filtered.reduce((s, r) => s + r.remaining, 0)
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0)

  const subtitle = [
    `Type des frais : ${natureName}`,
    classFilter && `Classe : ${classFilter}`,
    report.data && `Année ${report.data.school_year}`,
    search && `Recherche : « ${search} »`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Rapports"
        subtitle="Solvables et insolvables par type de frais"
        action={
          <Button variant="subtle" onClick={() => window.print()} disabled={filtered.length === 0}>
            <Printer className="size-4" /> Imprimer
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<FileBarChart className="size-4" />} label="Élèves concernés" value={rows.length} tone="sky" />
        <StatCard icon={<FileBarChart className="size-4" />} label="Solvables" value={solventCount} tone="emerald" />
        <StatCard
          icon={<FileBarChart className="size-4" />}
          label="Insolvables"
          value={rows.length - solventCount}
          tone="amber"
          sub={`Reste dû (sélection) : ${fmt(totalRemaining)}`}
        />
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="rf-nature">Type des frais</Label>
            <Select id="rf-nature" value={nature} onChange={(e) => setNature(e.target.value)} options={natureOptions} />
          </div>
          <div>
            <Label htmlFor="rf-status">Afficher</Label>
            <Select
              id="rf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              options={[
                { value: 'insolvables', label: 'Insolvables (reste à payer)' },
                { value: 'solvables', label: 'Solvables (tout payé)' },
                { value: 'tous', label: 'Tous' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="rf-class">Classe</Label>
            <Select
              id="rf-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={[{ value: '', label: 'Toutes' }, ...classes.map((c) => ({ value: c, label: c }))]}
            />
          </div>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Élève, matricule, parent, téléphone…" />
      </Card>

      {report.isPending ? (
        <Card className="h-40 animate-pulse" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<FileBarChart className="size-8" />} title="Aucun élève" hint="Aucun élève ne correspond à cette sélection." />
        </Card>
      ) : (
        <Card className="glass-scroll overflow-x-auto p-0">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Famille</th>
                <th className="px-4 py-3 text-right">Dû</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-right">Reste</th>
                <th className="px-4 py-3">Situation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paging.pageItems.map((r) => (
                <tr key={r.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.student_name}</div>
                    <div className="font-mono text-xs text-slate-400">{r.matricule}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.class_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.parent_name}
                    {r.phone && <div className="text-xs text-slate-500">{r.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(r.due)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{fmt(r.paid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(r.remaining)}</td>
                  <td className="px-4 py-3">
                    {r.solvent ? <Badge tone="emerald">Solvable</Badge> : <Badge tone="amber">Insolvable</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...paging} />
        </Card>
      )}

      <PrintReport title={STATUS_TITLES[status]} subtitle={subtitle}>
        <table className={printTable}>
          <thead>
            <tr>
              <th>N°</th>
              <th>Élève</th>
              <th>Matricule</th>
              <th>Classe</th>
              <th>Famille</th>
              <th>Téléphone</th>
              <th className="text-right">Dû</th>
              <th className="text-right">Payé</th>
              <th className="text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.student_id}>
                <td>{i + 1}</td>
                <td>{r.student_name}</td>
                <td>{r.matricule}</td>
                <td>{r.class_name ?? '—'}</td>
                <td>{r.parent_name}</td>
                <td>{r.phone ?? '—'}</td>
                <td className="text-right">{fmt(r.due)}</td>
                <td className="text-right">{fmt(r.paid)}</td>
                <td className="text-right">{fmt(r.remaining)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="font-semibold">
                {filtered.length} élève(s)
              </td>
              <td className="text-right font-semibold">{fmt(totalPaid)}</td>
              <td className="text-right font-semibold">{fmt(totalRemaining)}</td>
            </tr>
          </tfoot>
        </table>
      </PrintReport>
    </div>
  )
}

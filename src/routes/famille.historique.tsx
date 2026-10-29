import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, History, Search } from 'lucide-react'
import { familyQuery } from '@/lib/data'
import { dateFr, fmt, methodLabel, natureLabel, studentDisplayName } from '@/lib/fees'
import {
  Button,
  Card,
  EmptyState,
  Input,
  SectionTitle,
  Select,
  StatusBadge,
} from '@/components/ui'
import { Pagination } from '@/components/ListTools'
import { matchesSearch, usePagination } from '@/lib/listing'

export const Route = createFileRoute('/famille/historique')({
  component: FamilyHistory,
})

function FamilyHistory() {
  const fam = useQuery(familyQuery)
  const [studentId, setStudentId] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('all')

  const students = fam.data?.students ?? []
  const years = useMemo(
    () =>
      [...new Set((fam.data?.payments ?? []).map((p) => p.school_year).filter((y): y is string => !!y))].sort().reverse(),
    [fam.data],
  )
  const payments = useMemo(() => {
    return (fam.data?.payments ?? [])
      .filter((p) => (studentId === 'all' ? true : p.student_id === studentId))
      .filter((p) => (status === 'all' ? true : p.status === status))
      .filter((p) => (year === 'all' ? true : p.school_year === year))
      .filter((p) => matchesSearch(search, [p.reference, p.student_name, natureLabel(p.nature)]))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [fam.data, studentId, status, year, search])
  const paging = usePagination(payments, `${studentId}|${status}|${year}|${search}`)

  if (fam.isPending) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Historique des paiements"
        subtitle="Retrouvez tous les paiements effectués par votre famille"
      />

      <div className="glass flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-44 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Enfant</label>
          <Select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les enfants' },
              ...students.map((s) => ({
                value: s.student.id,
                label: `${studentDisplayName(s.student)} · ${s.student.matricule}`,
              })),
            ]}
          />
        </div>
        <div className="min-w-36">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Statut</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'en_attente', label: 'En attente' },
              { value: 'confirme', label: 'Confirmé' },
              { value: 'annule', label: 'Annulé' },
            ]}
          />
        </div>
        <div className="min-w-36">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Année scolaire</label>
          <Select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={[{ value: 'all', label: 'Toutes' }, ...years.map((y) => ({ value: y, label: y }))]}
          />
        </div>
        <div className="min-w-52 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Recherche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Référence, élève, type des frais…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="size-8" />}
            title="Aucun paiement trouvé"
            hint="Modifiez les filtres ou effectuez un premier paiement depuis la fiche d’un enfant."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-200">
            {paging.pageItems.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    {natureLabel(p.nature)}
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {p.student_name} · {methodLabel(p.method)} · {p.reference} · {dateFr(p.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{fmt(p.amount)}</span>
                  {p.status === 'confirme' ? (
                    <Link to="/famille/recu/$paymentId" params={{ paymentId: p.id }}>
                      <Button variant="ghost" size="sm">
                        <FileText className="size-4" /> Reçu
                      </Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Reçu après confirmation</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination {...paging} />
        </Card>
      )}
    </div>
  )
}

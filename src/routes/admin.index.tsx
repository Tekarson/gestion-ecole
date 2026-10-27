import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Banknote,
  CheckCheck,
  ClipboardList,
  GraduationCap,
  Percent,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminDashboardQuery,
  useUpdatePaymentStatusMutation,
} from '@/lib/data'
import { dateFr, fmt, natureLabel } from '@/lib/fees'
import {
  Button,
  Card,
  EmptyState,
  SectionTitle,
  StatCard,
  StatusBadge,
} from '@/components/ui'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const dash = useQuery(adminDashboardQuery)
  const update = useUpdatePaymentStatusMutation()
  const [busyId, setBusyId] = useState<string | null>(null)

  const stats = dash.data?.stats
  const pending = dash.data?.pending ?? []
  const bySection = dash.data?.bySection ?? []

  function act(id: string, status: 'confirme' | 'annule') {
    setBusyId(id)
    update.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast.success(status === 'confirme' ? 'Paiement confirmé' : 'Paiement annulé')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => setBusyId(null),
      },
    )
  }

  if (dash.isPending) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Tableau de bord"
        subtitle="Synthèse de l’année scolaire en cours"
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="size-4" />}
          label="Élèves"
          value={stats?.studentCount ?? 0}
          tone="sky"
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Familles"
          value={stats?.familyCount ?? 0}
          tone="violet"
        />
        <StatCard
          icon={<AlertCircle className="size-4" />}
          label="En attente"
          value={pending.length}
          tone="amber"
          sub={`${stats?.pendingCount ?? 0} paiement(s) à valider`}
        />
        <StatCard
          icon={<Banknote className="size-4" />}
          label="Encaissé"
          value={fmt(stats?.totalPaid ?? 0)}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          icon={<Banknote className="size-4" />}
          label="Total facturé"
          value={fmt(stats?.totalDue ?? 0)}
          tone="sky"
        />
        <StatCard
          icon={<Banknote className="size-4" />}
          label="Solde à recouvrer"
          value={fmt(Math.max(0, (stats?.totalDue ?? 0) - (stats?.totalPaid ?? 0)))}
          tone={stats && stats.totalDue - stats.totalPaid > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          icon={<Percent className="size-4" />}
          label="Réductions familiales"
          value={fmt(stats?.totalDiscount ?? 0)}
          tone="violet"
          sub={`Familles 4 enfants : ${stats?.families4 ?? 0} · 5 enfants : ${stats?.families5 ?? 0}`}
        />
        <StatCard
          icon={<GraduationCap className="size-4" />}
          label="Places en attente"
          value={stats?.pendingStudents ?? 0}
          tone="amber"
        />
        <StatCard
          icon={<CheckCheck className="size-4" />}
          label="Places confirmées"
          value={stats?.placeConfirmed ?? 0}
          tone="emerald"
          sub="inscription + tranche 1"
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="6e enfants exonérés"
          value={stats?.exemptSixth ?? 0}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenus par année scolaire */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Banknote className="size-4 text-emerald-600" /> Revenus par année scolaire
          </div>
          {(dash.data?.revenueByYear?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">Aucun encaissement confirmé pour l’instant.</p>
          ) : (
            <div className="space-y-3">
              {(dash.data?.revenueByYear ?? []).map((row, i) => {
                const prev = (dash.data?.revenueByYear ?? [])[i + 1]?.totalPaid
                const delta =
                  prev != null && prev > 0 ? ((row.totalPaid - prev) / prev) * 100 : null
                return (
                  <div key={row.year} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{row.year}</div>
                      <div className="text-xs text-slate-500">
                        {row.count} paiement{row.count > 1 ? 's' : ''} confirmé{row.count > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{fmt(row.totalPaid)}</div>
                      {delta !== null && (
                        <div
                          className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)} %
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Sections */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <GraduationCap className="size-4 text-brand-700" /> Effectifs par section
          </div>
          {bySection.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun élève inscrit.</p>
          ) : (
            <div className="space-y-3">
              {bySection.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-700">{s.name}</span>
                    <span className="font-medium text-slate-900">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{
                        width: `${(s.count / Math.max(1, stats?.studentCount ?? 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ClipboardList className="size-4 text-amber-600" /> Paiements à valider
            </div>
            <Link to="/admin/paiements">
              <Button variant="ghost" size="sm">
                Tout voir
              </Button>
            </Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon={<CheckCheck className="size-8" />}
              title="Rien en attente"
              hint="Tous les paiements ont été traités."
            />
          ) : (
            <ul className="flex-1 space-y-3">
              {pending.slice(0, 5).map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{natureLabel(p.nature)}</div>
                      <div className="text-xs text-slate-500">
                        {p.student_name} · {p.reference} · {dateFr(p.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{fmt(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      loading={busyId === p.id}
                      onClick={() => act(p.id, 'confirme')}
                    >
                      <CheckCheck className="size-4" /> Valider
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => act(p.id, 'annule')}>
                      <X className="size-4" /> Annuler
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
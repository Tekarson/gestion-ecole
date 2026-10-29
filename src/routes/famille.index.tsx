import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  PiggyBank,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { familyQuery, refsQuery, useFamilyReenrollMutation } from '@/lib/data'
import { dateFr, fmt, natureLabel, studentDisplayName, type FamilyChild, type FamilyPayload } from '@/lib/fees'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui'

export const Route = createFileRoute('/famille/')({
  component: FamilyDashboard,
})

function FamilyDashboard() {
  const fam = useQuery(familyQuery)

  if (fam.isPending) {
    return <DashboardSkeleton />
  }
  if (fam.isError) {
    return (
      <Card>
        <p className="text-rose-600">Impossible de charger vos informations.</p>
      </Card>
    )
  }

  const data = fam.data
  const f = data.finance
  const children = data.students
  const unread = data.notifications.filter((n) => !n.read_at)
  const exemptChildren = children.filter((c) => c.finance.exempt)

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Tableau de bord"
        subtitle={`Frais scolaires · Année ${data.school_year}`}
        action={
          <Link to="/famille/inscription">
            <Button size="sm">
              <GraduationCap className="size-4" /> Inscrire un enfant
            </Button>
          </Link>
        }
      />

      {unread.length > 0 && (
        <Link
          to="/famille/notifications"
          className="glass flex items-center gap-3 border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
        >
          <span className="relative">
            <Bell className="size-5 text-rose-700" />
            <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-rose-600" />
          </span>
          <div className="flex-1 text-sm text-rose-800">
            <span className="font-semibold">
              Vous avez {unread.length} notification{unread.length > 1 ? 's' : ''} non lue{unread.length > 1 ? 's' : ''}.
            </span>{' '}
            <span className="text-rose-700">Dernière : {unread[0].title}</span>
          </div>
          <ArrowRight className="size-4 text-rose-700" />
        </Link>
      )}

      {(data.archived ?? []).length > 0 && <ReenrollCard year={data.school_year} archived={data.archived ?? []} />}

      {exemptChildren.length > 0 && (
        <div className="glass flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Exonération familiale :</span>{' '}
            {exemptChildren.map((c) => studentDisplayName(c.student)).join(', ')}{' '}
            {exemptChildren.length > 1 ? 'sont exonérés' : 'est exonéré(e)'} du minerval
            {f.childCount >= 6 ? ` (6e enfant d’une famille de ${f.childCount} enfants)` : ''}. Les autres frais restent dus.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Banknote className="size-4" />}
          label="Total à payer"
          value={fmt(f.totalDue)}
          tone="violet"
        />
        <StatCard
          icon={<PiggyBank className="size-4" />}
          label="Déjà payé"
          value={fmt(f.totalPaid)}
          tone="emerald"
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Solde restant"
          value={fmt(f.balance)}
          tone={f.balance > 0 ? 'amber' : 'emerald'}
          sub={f.balance > 0 ? 'Pensez à régler les échéances' : 'Tout est soldé'}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Enfants inscrits"
          value={f.childCount}
          tone="sky"
        />
      </div>

      {(f.nextDiscount > 0 || f.nextExemption) && (
        <div className="glass flex items-start gap-3 border-brand-200 bg-brand-50 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-brand-700" />
          <div className="text-sm text-brand-700">
            {f.nextExemption && (
              <p>
                <span className="font-semibold">Bon à savoir :</span> le 6<sup>e</sup> enfant est
                exonéré du minerval.
              </p>
            )}
            {f.nextDiscount > 0 && (
              <p>
                <span className="font-semibold">Réduction familiale :</span> un enfant
                supplémentaire vous fera bénéficier de{' '}
                <span className="font-semibold">{fmt(f.nextDiscount)}</span> de réduction sur le
                minerval.
              </p>
            )}
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <Wallet className="size-4 text-brand-600" /> Détail des frais de la famille (§27)
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          <BreakRow label="Minerval (brut)" value={fmt(f.minervalGross)} />
          <BreakRow label={`Réduction familiale (${f.childCount} enfants)`} value={`− ${fmt(f.discount)}`} tone="emerald" />
          <BreakRow label="Minerval (net)" value={fmt(f.minervalNet)} />
          {f.enrollmentGross > 0 && <BreakRow label="Frais d’ouverture de dossier" value={fmt(f.enrollmentGross)} />}
          <BreakRow label="Frais connexes" value={fmt(f.fixedGross)} />
          {f.otherGross > 0 && <BreakRow label="Autres frais (camp d’été, examens)" value={fmt(f.otherGross)} />}
          {f.booksGross > 0 && <BreakRow label="Livres" value={fmt(f.booksGross)} />}
          <BreakRow label="Total net à payer" value={fmt(f.totalNet)} strong />
          <BreakRow label="Déjà payé" value={fmt(f.totalPaid)} tone="emerald" />
          <BreakRow label="Solde restant" value={fmt(f.balance)} tone={f.balance > 0 ? 'amber' : 'emerald'} strong />
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Mes enfants</h2>
        {children.length === 0 ? (
          <Card>
            <p className="text-slate-700">
              Vous n’avez pas encore inscrit d’enfant.{' '}
              <Link to="/famille/inscription" className="font-medium text-brand-600 underline">
                Inscrire mon premier enfant
              </Link>
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {children.map((child) => (
              <ChildCard key={child.student.id} child={child} />
            ))}
          </div>
        )}
      </div>

      <RecentPayments payments={data.payments} />
    </div>
  )
}

function RecentPayments({ payments }: { payments: FamilyPayload['payments'] }) {
  const recent = payments.slice(0, 5)

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Derniers paiements</h2>
      {recent.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-8" />}
            title="Aucun paiement"
            hint="Vos paiements apparaîtront ici dès leur enregistrement."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-200">
            {recent.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">{natureLabel(p.nature)}</div>
                  <div className="text-xs text-slate-500">
                    {p.student_name} · {p.reference} · {dateFr(p.created_at)}
                    {p.school_year ? ` · ${p.school_year}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{fmt(p.amount)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ChildCard({ child }: { child: FamilyChild }) {
  const total = child.finance.totalDue
  const paid = child.finance.totalPaid
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100

  return (
    <Card hover className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-lg font-bold text-brand-700">
            {child.student.first_name[0]}
            {child.student.last_name[0]}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{studentDisplayName(child.student)}</div>
            <div className="text-xs text-slate-500">
              {child.cls ? child.cls.name : 'Classe non définie'} · {child.student.matricule}
            </div>
            {(child.finance.exempt || child.finance.teacherChild || child.finance.entitled) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {child.finance.exempt && <Badge tone="emerald">Exonéré du minerval</Badge>}
                {child.finance.teacherChild && <Badge tone="sky">Enfant d’enseignant</Badge>}
                {child.finance.entitled && <Badge tone="sky">Ayant droit</Badge>}
              </div>
            )}
          </div>
        </div>
        {child.finance.placeConfirmed ? (
          <Badge tone="emerald">
            <CheckCircle2 className="size-3.5" /> Inscription confirmée
          </Badge>
        ) : (
          <Badge tone="amber">Inscription en attente</Badge>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <Row
          label="Total dû"
          value={fmt(child.finance.childNet ?? child.finance.totalDue)}
          strong
        />
        {child.finance.childDiscount ? <Row label="Dont réduction famille" value={`− ${fmt(child.finance.childDiscount)}`} /> : null}
        <Row label="Payé" value={fmt(paid)} />
        <Row
          label="Solde"
          value={fmt(child.finance.balance - (child.finance.childDiscount ?? 0))}
          strong
        />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-xs text-slate-500">{pct}% réglé</div>

      <div className="mt-auto flex items-center justify-between">
        <StatusBadge status="confirme" />
        <Link to="/famille/eleve/$id" params={{ id: child.student.id }}>
          <Button size="sm" variant="ghost">
            Détails <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-900'}>{value}</span>
    </div>
  )
}

function BreakRow({
  label,
  value,
  tone = 'default',
  strong = false,
}: {
  label: string
  value: string
  tone?: 'emerald' | 'amber' | 'default'
  strong?: boolean
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900'
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`${strong ? 'font-semibold' : ''} ${toneClass}`}>{value}</span>
    </div>
  )
}

export function OkChip() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <BadgeCheck className="size-4" /> Soldé
    </span>
  )
}

function ReenrollCard({
  year,
  archived,
}: {
  year: string
  archived: NonNullable<FamilyPayload['archived']>
}) {
  const refs = useQuery(refsQuery)
  const reenroll = useFamilyReenrollMutation()
  const classes = [...(refs.data?.classes ?? [])].sort((a, b) => Number(a.id) - Number(b.id))
  const [choice, setChoice] = useState<Record<string, string>>({})

  function nextClass(classId: string): string {
    const i = classes.findIndex((c) => c.id === classId)
    return i === -1 ? '' : classes[Math.min(i + 1, classes.length - 1)].id
  }

  return (
    <Card className="border-amber-200 bg-amber-50 p-5">
      <div className="font-semibold text-amber-900">Réinscription pour l’année {year}</div>
      <p className="mt-1 text-sm text-amber-800">
        Ces enfants étaient inscrits l’année précédente. Réinscrivez-les en un clic : ils gardent leur matricule.
      </p>
      <ul className="mt-3 space-y-2">
        {archived.map((s) => {
          const classId = choice[s.id] ?? nextClass(s.class_id)
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2">
              <div className="text-sm">
                <span className="font-medium text-slate-900">{studentDisplayName(s)}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {s.matricule} · {s.school_year}
                  {s.class_name ? ` · ${s.class_name}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={classId}
                  onChange={(e) => setChoice((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  className="w-40"
                  aria-label="Classe pour la nouvelle année"
                  options={[{ value: '', label: 'Classe…', disabled: true }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
                />
                <Button
                  size="sm"
                  disabled={!classId}
                  loading={reenroll.isPending && reenroll.variables?.id === s.id}
                  onClick={() =>
                    reenroll.mutate(
                      { id: s.id, class_id: classId },
                      {
                        onSuccess: () => toast.success(`${studentDisplayName(s)} est réinscrit(e) pour ${year}`),
                        onError: (err) => toast.error(err instanceof Error ? err.message : 'Réinscription impossible'),
                      },
                    )
                  }
                >
                  Réinscrire
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-44 rounded-2xl bg-slate-100" />
        <div className="h-44 rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

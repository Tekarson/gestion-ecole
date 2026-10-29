import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { adminFamiliesQuery } from '@/lib/data'
import { fmt, studentDisplayName, type AdminFamily } from '@/lib/fees'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionTitle,
} from '@/components/ui'

export const Route = createFileRoute('/admin/familles')({
  component: AdminFamilies,
})

function AdminFamilies() {
  const families = useQuery(adminFamiliesQuery)
  const list = families.data ?? []

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Familles"
        subtitle="Les foyers inscrits et leur situation financière"
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-8" />}
            title="Aucune famille"
            hint="Les familles inscrites apparaîtront ici."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {list.map((family) => (
            <FamilyCard key={family.profile.id} family={family} />
          ))}
        </div>
      )}
    </div>
  )
}

function FamilyCard({ family }: { family: AdminFamily }) {
  const f = family.finance
  const init = family.profile.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 font-bold text-brand-700">
            {init}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{family.profile.full_name}</div>
            <div className="text-xs text-slate-500">
              {family.profile.email}
              {family.profile.phone ? ` · ${family.profile.phone}` : ''}
            </div>
          </div>
        </div>
        <Badge tone="sky">{f.childCount} enfant{f.childCount > 1 ? 's' : ''}</Badge>
      </div>

      {f.discount > 0 && <Badge tone="violet">Réduction famille : −{fmt(f.discount)}</Badge>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Dû</div>
          <div className="mt-0.5 text-sm font-bold text-slate-900">{fmt(f.totalDue)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Payé</div>
          <div className="mt-0.5 text-sm font-bold text-emerald-600">{fmt(f.totalPaid)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Solde</div>
          <div className="mt-0.5 text-sm font-bold text-amber-600">{fmt(f.balance)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {family.students.map((c) => (
          <div
            key={c.student.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-slate-900">{studentDisplayName(c.student)}</span>
              <span className="ml-2 text-xs text-slate-500">{c.student.matricule}</span>
            </div>
            <div className="flex items-center gap-2">
              {c.finance.placeConfirmed ? (
                <Badge tone="emerald">Inscription confirmée</Badge>
              ) : (
                <Badge tone="amber">Inscription en attente</Badge>
              )}
              <span className="text-xs text-slate-500">{fmt(c.finance.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex justify-end">
        <Link to="/admin/paiements">
          <Button variant="ghost" size="sm">
            Voir les paiements
          </Button>
        </Link>
      </div>
    </Card>
  )
}
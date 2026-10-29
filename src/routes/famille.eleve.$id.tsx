import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Wallet,
} from 'lucide-react'
import { familyQuery, studentQuery } from '@/lib/data'
import { dateFr, fmt, initials, natureLabel, studentDisplayName, tranchePeriodLabel, trancheStatusLabel, trancheStatusTone } from '@/lib/fees'
import type { StudentFinance } from '@/lib/fees'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionTitle,
  StatusBadge,
} from '@/components/ui'
import { PaymentDialog } from '@/components/PaymentDialog'

export const Route = createFileRoute('/famille/eleve/$id')({
  component: StudentDetail,
})

function StudentDetail() {
  const { id } = Route.useParams()
  const studentData = useQuery(studentQuery(id))
  const fam = useQuery(familyQuery)
  const [payOpen, setPayOpen] = useState(false)

  if (studentData.isPending || fam.isPending) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-xl bg-slate-100" />
        <div className="h-48 rounded-2xl bg-slate-100" />
      </div>
    )
  }
  if (studentData.isError) {
    return (
      <Card>
        <EmptyState title="Élève introuvable" hint="Cet élève n’existe pas ou ne fait pas partie de votre famille." />
      </Card>
    )
  }

  const { student, cls, finance } = studentData.data
  const payments = (fam.data?.payments ?? []).filter((p) => p.student_id === student.id)

  return (
    <div className="space-y-6">
      <SectionTitle
        title={studentDisplayName(student)}
        subtitle={`${cls?.name ?? 'Classe non définie'} · ${student.matricule} · ${dateFr(student.created_at)}`}
        action={
          <>
            <Link to="/famille">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="size-4" /> Retour
              </Button>
            </Link>
            <Button size="sm" onClick={() => setPayOpen(true)} disabled={finance.balance <= 0}>
              <Wallet className="size-4" /> Payer
            </Button>
          </>
        }
      />

      {student.photo_url && (
        <div className="flex">
          <img
            src={student.photo_url}
            alt={studentDisplayName(student)}
            className="h-40 w-32 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm"
          />
        </div>
      )}
      {!student.photo_url && (
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm">
          {initials(student)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <FinanceBreakdown prefix="f" finance={finance} />

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <ClipboardList className="size-4 text-brand-600" /> Historique des paiements
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun paiement pour le moment.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{natureLabel(p.nature)}</div>
                      <div className="text-xs text-slate-500">
                        {p.reference} · {dateFr(p.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{fmt(p.amount)}</span>
                      <StatusBadge status={p.status} />
                      <Link to="/famille/recu/$paymentId" params={{ paymentId: p.id }}>
                        <Button variant="ghost" size="sm">
                          <FileText className="size-4" /> Reçu
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 text-center">
            {finance.placeConfirmed ? (
              <>
                <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
                <p className="mt-2 font-semibold text-slate-900">Inscription confirmée</p>
                <p className="mt-1 text-xs text-slate-500">
                  Frais d’inscription et 1<sup>re</sup> tranche réglés.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto size-10 rounded-full border-2 border-amber-600" />
                <p className="mt-2 font-semibold text-slate-900">Inscription en attente</p>
                <p className="mt-1 text-xs text-slate-500">
                  Réglez les frais d’ouverture de dossier + la tranche 1 pour confirmer l’inscription.
                </p>
              </>
            )}
          </Card>

          {(finance.exempt || finance.entitled || finance.teacherChild) && (
            <Card className="border-emerald-200 bg-emerald-50 p-5">
              <div className="text-sm font-semibold text-emerald-800">Situation particulière</div>
              <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                {finance.exempt && <li>Exonéré(e) du minerval (6e enfant de la famille).</li>}
                {finance.entitled && <li>Ayant droit : seuls les frais connexes sont dus, pas le minerval.</li>}
                {finance.teacherChild && <li>Enfant d’enseignant : pas de frais d’ouverture de dossier.</li>}
              </ul>
            </Card>
          )}

          <PaymentSummary finance={finance} />
        </div>
      </div>

      <PaymentDialog
        student={student}
        cls={cls}
        finance={finance}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
    </div>
  )
}

function FinanceBreakdown({ prefix: _p, finance }: { prefix: string; finance: StudentFinance }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <BookOpen className="size-4 text-brand-600" /> Détail des frais
      </div>
      <div className="space-y-3">
        {finance.lines.map((r) => {
          const isTranche = r.key.startsWith('tranche')
          const tranche = finance.tranches.find((t) => `tranche${t.term}` === r.key)
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  {r.label}
                  {isTranche && tranche && (
                    <Badge tone={trancheStatusTone(tranche.status)}>{trancheStatusLabel(tranche.status)}</Badge>
                  )}
                </span>
                <span className="text-slate-900">
                  {fmt(r.paid)} <span className="text-slate-400">/ {fmt(r.due)}</span>
                  {r.due > 0 && r.paid >= r.due && (
                    <CheckCircle2 className="ml-1.5 inline size-4 text-emerald-600" />
                  )}
                </span>
              </div>
              {isTranche && tranche && tranchePeriodLabel(tranche) && (
                <div className="text-[11px] text-slate-500">{tranchePeriodLabel(tranche)}</div>
              )}
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${r.due > 0 ? Math.min(100, (r.paid / r.due) * 100) : 100}%` }}
                />
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
          <span className="font-medium text-slate-900">Total</span>
          <span className="font-bold text-slate-900">
            {fmt(finance.totalPaid)} <span className="font-normal text-slate-400">/ {fmt(finance.totalDue)}</span>
          </span>
        </div>
      </div>
    </Card>
  )
}

function PaymentSummary({ finance }: { finance: StudentFinance }) {
  const items = [
    { label: 'Inscription', done: finance.placeConfirmed, detail: 'Ouverture de dossier + tranche 1' },
    { label: 'Frais connexes', done: finance.fixedPaid >= finance.fixedDue, detail: `${fmt(finance.fixedPaid)} / ${fmt(finance.fixedDue)}` },
    ...(finance.otherDue > 0
      ? [{ label: 'Autres frais', done: finance.otherPaid >= finance.otherDue, detail: `${fmt(finance.otherPaid)} / ${fmt(finance.otherDue)}` }]
      : []),
    ...(finance.booksDue > 0
      ? [{ label: 'Livres', done: finance.booksPaid >= finance.booksDue, detail: `${fmt(finance.booksPaid)} / ${fmt(finance.booksDue)}` }]
      : []),
    ...(finance.minervalDue > 0
      ? [{ label: 'Minerval', done: finance.minervalPaid >= finance.minervalDue, detail: `${fmt(finance.minervalPaid)} / ${fmt(finance.minervalDue)}` }]
      : []),
  ]
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-slate-900">Progression</div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2.5 text-sm">
            {it.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border-2 border-slate-300" />
            )}
            <span className="text-slate-700">{it.label}</span>
            <span className="ml-auto text-xs text-slate-500">{it.detail}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs leading-relaxed text-slate-500">
          Solde restant : <span className="font-semibold text-slate-900">{fmt(finance.balance)}</span>
        </p>
      </div>
    </Card>
  )
}

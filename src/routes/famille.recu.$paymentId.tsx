import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Landmark, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { paymentQuery, refsQuery } from '@/lib/data'
import { downloadFile } from '@/lib/api'
import { dateFr, fmt, methodLabel, natureLabel, statusLabel } from '@/lib/fees'
import { Button, Card } from '@/components/ui'
import { useState } from 'react'

export const Route = createFileRoute('/famille/recu/$paymentId')({
  component: PaymentReceipt,
})

function PaymentReceipt() {
  const { paymentId } = Route.useParams()
  const payment = useQuery(paymentQuery(paymentId))
  const refs = useQuery(refsQuery)
  const [busy, setBusy] = useState(false)

  async function download() {
    if (!payment.data) return
    if (payment.data.status !== 'confirme') {
      toast.info('Le reçu n’est disponible qu’après confirmation du paiement.')
      return
    }
    setBusy(true)
    try {
      await downloadFile(`/payments/${payment.data.id}/recu`, `recu-${payment.data.reference}.pdf`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de téléchargement')
    } finally {
      setBusy(false)
    }
  }

  if (payment.isPending) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
  }
  if (payment.isError) {
    return (
      <Card>
        <p className="text-rose-600">Ce reçu est introuvable ou ne vous appartient pas.</p>
        <Link to="/famille/historique">
          <Button variant="ghost" size="sm" className="mt-3">
            <ArrowLeft className="size-4" /> Retour à l’historique
          </Button>
        </Link>
      </Card>
    )
  }

  const p = payment.data
  const schoolName = refs.data?.school.name ?? 'Complexe Scolaire Bel Avenir'
  const schoolYear = refs.data?.school.year ?? p.created_at.slice(0, 4)

  if (p.status !== 'confirme') {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-2xl">⏳</div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Reçu en attente de confirmation</h1>
        <p className="mt-2 text-sm text-slate-500">
          Le reçu de la référence <span className="font-semibold text-slate-700">{p.reference}</span> sera
          téléchargeable ici dès que l’établissement aura confirmé le paiement ({statusLabel(p.status)}).
        </p>
        <Link to="/famille/historique">
          <Button variant="subtle" size="sm" className="mt-5">
            <ArrowLeft className="size-4" /> Retour à l’historique
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link to="/famille/historique">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" /> Retour
          </Button>
        </Link>
        <Button size="sm" loading={busy} onClick={download}>
          <Printer className="size-4" /> Télécharger le PDF
        </Button>
      </div>

      <div className="print-area glass-strong p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-600">
              <Landmark className="size-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">NTSHIK</div>
              <div className="text-xs text-slate-500">{schoolName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">Reçu de paiement</div>
            <div className="text-xs text-slate-500">Année scolaire {schoolYear}</div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">Référence</div>
          <div className="text-xl font-bold tracking-wide text-slate-900">{p.reference}</div>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <Row label="Élève" value={p.student_name} />
          {p.class_name && <Row label="Classe" value={p.class_name} />}
          <Row label="Objet" value={natureLabel(p.nature)} />
          <Row label="Moyen de paiement" value={methodLabel(p.method)} />
          <Row label="Date" value={dateFr(p.created_at)} />
          <Row label="Statut" value={statusLabel(p.status)} />
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base">
            <span className="font-medium text-slate-900">Montant payé</span>
            <span className="font-bold text-emerald-600">{fmt(p.amount)}</span>
          </div>
        </dl>

        {p.note && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Note : {p.note}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Merci pour votre confiance. Ce reçu fait foi dans les livres de l’établissement.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

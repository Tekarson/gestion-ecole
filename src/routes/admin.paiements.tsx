import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Download, Plus, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adminPaymentsQuery, useUpdatePaymentStatusMutation, whoamiQuery } from '@/lib/data'
import { downloadFile } from '@/lib/api'
import { can, dateFr, fmt, methodLabel, natureLabel } from '@/lib/fees'
import { Button, Card, EmptyState, SectionTitle, StatusBadge } from '@/components/ui'
import { AdminPaymentDialog } from '@/components/AdminPaymentDialog'

export const Route = createFileRoute('/admin/paiements')({
  component: AdminPayments,
})

function AdminPayments() {
  const whoami = useQuery(whoamiQuery)
  const payments = useQuery(adminPaymentsQuery)
  const update = useUpdatePaymentStatusMutation()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)

  const list = payments.data ?? []

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
    const busy = p.id
    try {
      setBusyId(busy)
      await downloadFile(`/admin/payments/${p.id}/recu`, `recu-${p.reference}.pdf`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de téléchargement')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Paiements"
        subtitle={`${list.length} paiement(s) enregistré(s) cette année`}
        action={
          can(whoami.data, 'paiements', 'create') ? (
            <Button onClick={() => setOpenDialog(true)}>
              <Plus className="size-4" /> Nouveau paiement
            </Button>
          ) : undefined
        }
      />

      <AdminPaymentDialog open={openDialog} onOpenChange={setOpenDialog} />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-8" />}
            title="Aucun paiement"
            hint="Les paiements envoyés par les familles apparaîtront ici."
          />
        </Card>
      ) : (
        <Card className="glass-scroll overflow-x-auto p-0">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Famille</th>
                <th className="px-4 py-3">Type des frais</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Moyen</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.map((p) => (
                <tr key={p.id} className="align-top transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-brand-700">{p.reference}</span>
                    {p.note && (
                      <div className="mt-0.5 text-xs text-amber-600">Note : {p.note}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {p.student_name}
                    {p.class_name && <div className="text-xs text-slate-500">{p.class_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.parent_name}</td>
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
                          <Button
                            size="sm"
                            loading={busyId === p.id}
                            onClick={() => confirm(p.id)}
                            title="Confirmer"
                          >
                            <CheckCircle2 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => cancel(p.id)}
                            disabled={busyId === p.id}
                            title="Annuler"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Télécharger le reçu"
                          loading={busyId === p.id}
                          onClick={() => download(p)}
                        >
                          <Download className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
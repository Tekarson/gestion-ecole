import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, X, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useCreatePaymentMutation } from '@/lib/data'
import type { ClassRow, Student, StudentFinance } from '@/lib/fees'
import { fmt, methodLabel, natureLabel, studentDisplayName } from '@/lib/fees'
import { Button, Label, Select, StatCard, Card } from '@/components/ui'

interface PaymentDialogProps {
  student: Student
  cls: ClassRow | null
  finance: StudentFinance
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PaymentOption {
  nature: string
  label: string
  remaining: number
}

export function PaymentDialog({ student, cls: _cls, finance, open, onOpenChange }: PaymentDialogProps) {
  const create = useCreatePaymentMutation()
  const [nature, setNature] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState('especes')
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  useEffect(() => {
    if (open) {
      setNature('')
      setAmount(0)
      setMethod('especes')
      setStep('form')
    }
  }, [open])

  // Options payables maintenant : lignes de frais encore ouvertes (les
  // tranches « à venir » ou « échues » sont bloquées côté serveur).
  const options = useMemo<PaymentOption[]>(() => {
    const unavailable: Record<string, boolean> = {}
    for (const t of finance.tranches) {
      unavailable[`tranche${t.term}`] = t.status === 'a_venir' || t.status === 'echue'
    }
    return finance.lines
      .filter((l) => l.remaining > 0 && !unavailable[l.key])
      .map((l) => ({ nature: l.key, label: natureLabel(l.key), remaining: l.remaining }))
  }, [finance])

  const selected = options.find((o) => o.nature === nature) ?? null
  const balance = selected ? selected.remaining : finance.balance

  if (!open) return null

  function submit() {
    if (!nature) {
      toast.warning('Choisissez la nature du paiement.')
      return
    }
    if (!amount || amount <= 0) {
      toast.warning('Indiquez un montant valide.')
      return
    }
    if (!selected) return
    if (amount > selected.remaining) {
      toast.error(`Ce montant dépasse le solde restant (${fmt(selected.remaining)}).`)
      return
    }
    setStep('confirm')
  }

  function confirm() {
    if (!selected) return
    create.mutate(
      {
        student_id: student.id,
        nature,
        amount,
        method,
      },
      {
        onSuccess: (payment) => {
          toast.success(`Paiement ${payment.reference} envoyé`, {
            description: 'Il sera confirmé par l’école sous peu.',
          })
          onOpenChange(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur de paiement'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="glass-strong relative w-full max-w-md p-6">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={() => onOpenChange(false)}
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">Effectuer un paiement</h2>
        <p className="mt-1 text-sm text-slate-500">
          {student.first_name} {student.last_name} · {_cls?.name ?? '—'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCard
            icon={<Wallet className="size-4" />}
            label="Solde restant"
            value={fmt(balance)}
            tone={balance > 0 ? 'amber' : 'emerald'}
          />
          <Card className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Statut
            </div>
            <div className="mt-1.5 text-sm font-semibold text-slate-900">
              {finance.placeConfirmed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-4" /> Place confirmée
                </span>
              ) : (
                'Place en attente'
              )}
            </div>
          </Card>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="pay-nature">Nature du paiement</Label>
            <Select
              id="pay-nature"
              value={nature}
              onChange={(e) => {
                const next = options.find((o) => o.nature === e.target.value)
                setNature(e.target.value)
                if (next) setAmount(next.remaining)
              }}
              options={[
                { value: '', label: '— Choisir —', disabled: true },
                ...options.map((o) => ({
                  value: o.nature,
                  label: `${o.label} · restant ${fmt(o.remaining)}`,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="pay-amount">Montant ({fmt(1)})</Label>
            <input
              id="pay-amount"
              type="number"
              min="1"
              max={balance}
              step="1"
              className="glass-input"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="pay-method">Moyen de paiement</Label>
            <Select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={[
                { value: 'especes', label: 'Espèces' },
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'carte', label: 'Carte bancaire' },
                { value: 'guichet', label: 'Guichet' },
                { value: 'virement', label: 'Virement bancaire' },
              ]}
            />
          </div>

          {amount > balance && (
            <p className="text-sm text-rose-600">Le montant dépasse le solde restant.</p>
          )}
        </div>

        {step === 'form' ? (
          <div className="mt-6">
            <Button className="w-full" size="lg" onClick={submit} disabled={!nature}>
              <Wallet className="size-4" /> Vérifier et continuer
            </Button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="size-4 text-emerald-600" /> Récapitulatif
            </div>
            <dl className="space-y-2 text-sm">
              <RecapRow label="Élève" value={studentDisplayName(student)} />
              <RecapRow label="Classe" value={_cls?.name ?? '—'} />
              <RecapRow label="Nature" value={natureLabel(nature)} />
              <RecapRow label="Montant" value={fmt(amount)} />
              <RecapRow label="Mode de paiement" value={methodLabel(method)} />
            </dl>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep('form')} disabled={create.isPending}>
                <ArrowLeft className="size-4" /> Modifier
              </Button>
              <Button className="flex-1" size="lg" loading={create.isPending} onClick={confirm}>
                <Wallet className="size-4" /> Confirmer le paiement
              </Button>
            </div>
          </div>
        )}
        {create.isError && (
          <p className="mt-3 text-sm text-rose-600">
            {create.error instanceof Error ? create.error.message : 'Erreur de paiement'}
          </p>
        )}
      </div>
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
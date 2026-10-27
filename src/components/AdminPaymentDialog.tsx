import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandCoins, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminStudentsQuery, refsQuery, useAdminCreatePaymentMutation } from '@/lib/data'
import { fmt } from '@/lib/fees'
import { Button, Label, Select } from '@/components/ui'

interface AdminPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NatureOption {
  value: string
  label: string
  due?: number
}

export function AdminPaymentDialog({ open, onOpenChange }: AdminPaymentDialogProps) {
  const refs = useQuery(refsQuery)
  const students = useQuery(adminStudentsQuery)
  const create = useAdminCreatePaymentMutation()

  const [studentId, setStudentId] = useState('')
  const [nature, setNature] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState('especes')

  const { options } = useMemo(() => {
    const classes = refs.data?.classes ?? []
    const studentsList = students.data ?? []
    const student = studentsList.find((s) => s.id === studentId) ?? null
    const studentClass = student?.class_name
      ? classes.find((c) => c.name === student.class_name) ?? null
      : null

    const settings = refs.data?.feeSettings ?? []
    const list: NatureOption[] = settings.map((f) => ({
      value: f.key,
      label: `${f.label} · ${fmt(f.amount)}`,
      due: f.amount,
    }))
    if (studentClass) {
      list.push(
        { value: 'tranche1', label: `Tranche 1 — Minerval · ${fmt(studentClass.tranche1)}`, due: studentClass.tranche1 },
        { value: 'tranche2', label: `Tranche 2 — Minerval · ${fmt(studentClass.tranche2)}`, due: studentClass.tranche2 },
        { value: 'tranche3', label: `Tranche 3 — Minerval · ${fmt(studentClass.tranche3)}`, due: studentClass.tranche3 },
      )
      if (studentClass.books > 0) {
        list.push({ value: 'livres', label: `Livres · ${fmt(studentClass.books)}`, due: studentClass.books })
      }
    }

    return { cls: studentClass, options: list }
  }, [studentId, refs.data, students.data])

  const studentsList = students.data ?? []

  if (!open) return null

  function selectNature(value: string) {
    setNature(value)
    const option = options.find((o) => o.value === value)
    if (option?.due != null) setAmount(option.due)
  }

  function submit() {
    if (!studentId) {
      toast.warning('Choisissez l’élève.')
      return
    }
    if (!nature) {
      toast.warning('Choisissez la nature du paiement.')
      return
    }
    if (!amount || amount <= 0) {
      toast.warning('Indiquez un montant valide.')
      return
    }
    create.mutate(
      { student_id: studentId, nature, amount, method },
      {
        onSuccess: (payment) => {
          toast.success(`Paiement ${payment.reference} enregistré`, {
            description: 'La famille verra le reçu dans son espace.',
          })
          setStudentId('')
          setNature('')
          setAmount(0)
          setMethod('especes')
          onOpenChange(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur d’enregistrement'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => onOpenChange(false)} />
      <div className="glass-strong relative w-full max-w-md p-6">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={() => onOpenChange(false)}
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">Enregistrer un paiement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Paiement encaissé à l’école (espèces, guichet, mobile money…). Il sera confirmé immédiatement.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="ap-student">Élève</Label>
            <Select
              id="ap-student"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value)
                setNature('')
                setAmount(0)
              }}
              options={[
                { value: '', label: '— Choisir un élève —', disabled: true },
                ...studentsList.map((s) => ({
                  value: s.id,
                  label: `${s.full_name}${s.class_name ? ` · ${s.class_name}` : ''}`,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="ap-nature">Nature du paiement</Label>
            <Select
              id="ap-nature"
              value={nature}
              onChange={(e) => selectNature(e.target.value)}
              options={[
                { value: '', label: '— Choisir —', disabled: true },
                ...options.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="ap-amount">Montant ({fmt(1)})</Label>
            <input
              id="ap-amount"
              type="number"
              min="1"
              step="1"
              className="glass-input"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="ap-method">Moyen de paiement</Label>
            <Select
              id="ap-method"
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
        </div>

        <div className="mt-6">
          <Button className="w-full" size="lg" loading={create.isPending} onClick={submit} disabled={!studentId}>
            <HandCoins className="size-4" /> Enregistrer le paiement
          </Button>
        </div>
        {create.isError && (
          <p className="mt-3 text-sm text-rose-600">
            {create.error instanceof Error ? create.error.message : 'Erreur d’enregistrement'}
          </p>
        )}
      </div>
    </div>
  )
}
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandCoins, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminStudentFinanceQuery, adminStudentsQuery, useAdminCreatePaymentMutation } from '@/lib/data'
import { fmt, natureLabel } from '@/lib/fees'
import { Button, Label, Select } from '@/components/ui'
import { SearchInput } from '@/components/ListTools'
import { matchesSearch } from '@/lib/listing'

interface AdminPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NatureOption {
  value: string
  label: string
  remaining: number
}

export function AdminPaymentDialog({ open, onOpenChange }: AdminPaymentDialogProps) {
  const students = useQuery(adminStudentsQuery)
  const create = useAdminCreatePaymentMutation()

  const [studentId, setStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [nature, setNature] = useState('')
  const [method, setMethod] = useState('especes')

  const finance = useQuery(adminStudentFinanceQuery(studentId))

  // Seuls les frais encore dus par l'élève (selon sa classe et son statut) ;
  // les tranches hors de leur fenêtre de paiement sont exclues.
  const options = useMemo<NatureOption[]>(() => {
    const f = finance.data
    if (!f) return []
    const unavailable: Record<string, boolean> = {}
    for (const t of f.tranches) {
      unavailable[`tranche${t.term}`] = t.status === 'a_venir' || t.status === 'echue'
    }
    return f.lines
      .filter((l) => l.remaining > 0 && !unavailable[l.key])
      .map((l) => ({ value: l.key, label: `${natureLabel(l.key)} · reste ${fmt(l.remaining)}`, remaining: l.remaining }))
  }, [finance.data])

  const selected = options.find((o) => o.value === nature) ?? null
  const amount = selected?.remaining ?? 0

  const studentsList = (students.data ?? []).filter(
    (s) => s.status === 'active' && (s.id === studentId || matchesSearch(studentSearch, [s.full_name, s.matricule, s.class_name, s.parent_name])),
  )

  if (!open) return null

  function submit() {
    if (!studentId) {
      toast.warning('Choisissez l’élève.')
      return
    }
    if (!nature || !selected) {
      toast.warning('Choisissez le type des frais.')
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
          setStudentSearch('')
          setNature('')
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
            <SearchInput
              value={studentSearch}
              onChange={setStudentSearch}
              placeholder="Rechercher un élève…"
              className="mb-2"
            />
            <Select
              id="ap-student"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value)
                setNature('')
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
            <Label htmlFor="ap-nature">Type des frais</Label>
            <Select
              id="ap-nature"
              value={nature}
              disabled={!studentId || finance.isPending}
              onChange={(e) => setNature(e.target.value)}
              options={[
                {
                  value: '',
                  label: !studentId
                    ? '— Choisir d’abord l’élève —'
                    : finance.isPending
                      ? 'Chargement…'
                      : options.length === 0
                        ? 'Rien à payer pour cet élève'
                        : '— Choisir —',
                  disabled: true,
                },
                ...options.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="ap-amount">Montant</Label>
            <input id="ap-amount" type="text" className="glass-input bg-slate-50" value={selected ? fmt(amount) : ''} readOnly placeholder="—" />
            <p className="mt-1 text-xs text-slate-500">Montant restant dû pour ce type de frais, non modifiable.</p>
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
          <Button className="w-full" size="lg" loading={create.isPending} onClick={submit} disabled={!studentId || !selected}>
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
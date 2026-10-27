import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { familyQuery, refsQuery, useCreateStudentMutation } from '@/lib/data'
import { classMinerval, fmt } from '@/lib/fees'
import { Button, Card, Input, Label, SectionTitle, Select } from '@/components/ui'

export const Route = createFileRoute('/famille/inscription')({
  component: InscriptionPage,
})

function InscriptionPage() {
  const refs = useQuery(refsQuery)
  const fam = useQuery(familyQuery)
  const createStudent = useCreateStudentMutation()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [postnom, setPostnom] = useState('')
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const classes = refs.data?.classes ?? []
  const feeSettings = refs.data?.feeSettings ?? []
  const childCount = fam.data?.finance.childCount ?? 0

  // Ouverture de dossier + frais connexes (les autres frais — camp d’été,
  // examens — ne sont pas dus à l’inscription).
  const enrollmentTotal = feeSettings
    .filter((f) => f.category === 'inscription')
    .reduce((s, f) => s + f.amount, 0)
  const connexeTotal = feeSettings
    .filter((f) => f.category !== 'inscription' && f.category !== 'other')
    .reduce((s, f) => s + f.amount, 0)
  const fixedTotal = enrollmentTotal + connexeTotal
  const cls = classes.find((c) => c.id === classId)
  const isExempt = childCount >= 6

  const totalFirstPayment = isExempt
    ? fixedTotal + (cls ? cls.books : 0)
    : fixedTotal + (cls ? cls.tranche1 + cls.books : 0)

  const grouped = classes.reduce<Record<string, typeof classes>>((acc, c) => {
    ;(acc[c.section] ??= []).push(c)
    return acc
  }, {})

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!classId) {
      toast.warning('Choisissez la classe de l’enfant.')
      return
    }
    setSubmitting(true)
    createStudent.mutate(
      { first_name: firstName, last_name: lastName, postnom: postnom || undefined, class_id: classId },
      {
        onSuccess: (payload) => {
          toast.success('Inscription envoyée', {
            description: `${payload.student.first_name} reçoit le matricule ${payload.student.matricule}.`,
          })
          navigate({ to: '/famille/eleve/$id', params: { id: payload.student.id } })
        },
        onError: (err) => {
          setSubmitting(false)
          toast.error(err instanceof Error ? err.message : 'Erreur lors de l’inscription')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Inscrire un enfant"
        subtitle="Complétez les informations de votre enfant pour cette année scolaire"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="first-name">Prénom</Label>
                <Input
                  id="first-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom de l’enfant"
                />
              </div>
              <div>
                <Label htmlFor="postnom">Postnom</Label>
                <Input
                  id="postnom"
                  value={postnom}
                  onChange={(e) => setPostnom(e.target.value)}
                  placeholder="Postnom (optionnel)"
                />
              </div>
              <div>
                <Label htmlFor="last-name">Nom</Label>
                <Input
                  id="last-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom de l’enfant"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="class">Classe</Label>
              <Select id="class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="" disabled>
                  — Choisir une classe —
                </option>
                {Object.entries(grouped).map(([section, list]) => (
                  <optgroup key={section} label={section}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={!firstName || !lastName || !classId}
            >
              <UserPlus className="size-4" /> Confirmer l’inscription
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <GraduationCap className="size-4 text-brand-600" /> Estimation
            </div>
            {!cls ? (
              <p className="text-sm text-slate-500">
                Sélectionnez une classe pour voir les montants.
              </p>
            ) : (
              <dl className="space-y-2.5 text-sm">
                <Row label="Frais d’ouverture de dossier" value={enrollmentTotal} />
                <Row label="Frais connexes" value={connexeTotal} />
                {cls.books > 0 && <Row label="Livres" value={cls.books} />}
                <Row label={isExempt ? 'Minerval (exonéré)' : 'Tranche 1'} value={isExempt ? 0 : cls.tranche1} />
                {!isExempt && (
                  <p className="text-xs leading-relaxed text-slate-500">
                    Le minerval complet est de {fmt(classMinerval(cls))}, payable en 3 tranches.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base">
                  <span className="font-medium text-slate-900">Premier paiement</span>
                  <span className="font-bold text-emerald-600">{fmt(totalFirstPayment)}</span>
                </div>
              </dl>
            )}
          </Card>

          {isExempt && (
            <div className="glass flex items-start gap-3 border-brand-200 bg-brand-50 p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-brand-700" />
              <p className="text-sm text-brand-700">
                Ce sera le 6<sup>e</sup> enfant de votre famille : il est exonéré du minerval.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{fmt(value)}</dd>
    </div>
  )
}

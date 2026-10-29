import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarRange, CalendarX2, Plus, Save, Settings2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { settingsQuery, useCloseYearMutation, useDeleteClassMutation, useUpdateSettingsMutation, whoamiQuery } from '@/lib/data'
import type { FeeCategory, SettingsClassInput, SettingsInput } from '@/lib/fees'
import { can } from '@/lib/fees'
import { Button, Card, Input, SectionTitle, Select } from '@/components/ui'

export const Route = createFileRoute('/admin/parametres')({
  component: AdminSettings,
})

interface FeeRow {
  key: string
  label: string
  category?: FeeCategory
  amount: number
  sort_order: number
}

const FEE_GROUPS: { title: string; hint: string; match: (f: FeeRow) => boolean }[] = [
  {
    title: 'Frais d’ouverture de dossier',
    hint: 'Non dus pour les enfants des enseignants.',
    match: (f) => f.category === 'inscription',
  },
  {
    title: 'Frais connexes',
    hint: 'Dus par tous les élèves, y compris les ayants droit.',
    match: (f) => f.category !== 'inscription' && f.category !== 'other',
  },
  {
    title: 'Autres frais',
    hint: 'Camp d’été, participation aux examens. Un montant à 0 masque le frais.',
    match: (f) => f.category === 'other',
  },
]

const TERM_LABELS: Record<number, string> = {
  1: 'Trimestre 1',
  2: 'Trimestre 2',
  3: 'Trimestre 3',
}

const TERME_LABELS: Record<number, string> = {
  1: 'Tranche 1 (inscription)',
  2: 'Tranche 2',
  3: 'Tranche 3',
}

function AdminSettings() {
  const settings = useQuery(settingsQuery)
  const whoami = useQuery(whoamiQuery)
  const save = useUpdateSettingsMutation()
  const closeYear = useCloseYearMutation()
  const deleteClass = useDeleteClassMutation()

  const [fees, setFees] = useState<FeeRow[]>([])
  const [classes, setClasses] = useState<SettingsClassInput[]>([])
  const [discount4, setDiscount4] = useState(500)
  const [discount5, setDiscount5] = useState(1000)
  const [exemptSixth, setExemptSixth] = useState(true)
  const [periods, setPeriods] = useState<Record<number, { opens_at: string; closes_at: string; at_enrollment: boolean }>>({})
  const [schoolYear, setSchoolYear] = useState('')
  const [currentTerm, setCurrentTerm] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (settings.data && !ready) {
      setFees(settings.data.feeSettings.map((f) => ({ ...f })))
      setClasses(
        settings.data.classes.map((c) => ({
          id: Number(c.id),
          name: c.name,
          section: c.section,
          tranche1: c.tranche1,
          tranche2: c.tranche2,
          tranche3: c.tranche3,
          books: c.books,
          sort_order: c.sort_order,
        })),
      )
      setDiscount4(Number(settings.data.discountRules?.byCount['4'] ?? 500))
      setDiscount5(Number(settings.data.discountRules?.byCount['5'] ?? 1000))
      setExemptSixth(settings.data.discountRules?.exemptSixth ?? true)
      const next: Record<number, { opens_at: string; closes_at: string; at_enrollment: boolean }> = {}
      for (const p of settings.data.periods ?? []) {
        next[p.term] = {
          opens_at: p.opens_at ?? '',
          closes_at: p.closes_at ?? '',
          at_enrollment: p.at_enrollment,
        }
      }
      setPeriods(next)
      setSchoolYear(settings.data.school_year ?? '')
      setCurrentTerm(settings.data.current_term ?? 1)
      setReady(true)
    }
  }, [settings.data, ready])

  if (settings.isPending && !ready) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-50" />
  }

  const updatable = can(whoami.data, 'parametres', 'update')

  function setFee(idx: number, patch: Partial<FeeRow>) {
    setFees((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  function setClass(idx: number, patch: Partial<SettingsClassInput>) {
    setClasses((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  function addClass() {
    setClasses((prev) => [
      ...prev,
      {
        id: null,
        name: '',
        section: '',
        tranche1: 0,
        tranche2: 0,
        tranche3: 0,
        books: 0,
        sort_order: prev.length,
      },
    ])
  }

  function removeClass(idx: number) {
    const target = classes[idx]
    // Classe pas encore enregistrée : on la retire simplement du formulaire.
    if (!target?.id) {
      setClasses((prev) => prev.filter((_, i) => i !== idx))
      return
    }
    if (!window.confirm(`Supprimer définitivement la classe « ${target.name} » ?`)) return
    deleteClass.mutate(target.id, {
      onSuccess: () => {
        setClasses((prev) => prev.filter((c) => c.id !== target.id))
        toast.success(`Classe « ${target.name} » supprimée`)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Suppression impossible'),
    })
  }

  function setPeriod(term: number, patch: Partial<{ opens_at: string; closes_at: string; at_enrollment: boolean }>) {
    setPeriods((prev) => ({ ...prev, [term]: { ...prev[term], ...patch } }))
  }

  function submit() {
    const savedIds = (settings.data?.classes ?? []).map((c) => Number(c.id))
    const deletedIds = savedIds.filter((id) => !classes.some((c) => c.id === id))
    const payload: SettingsInput = {
      feeSettings: fees.map((f) => ({ key: f.key, label: f.label, amount: f.amount, sort_order: f.sort_order })),
      classes,
      discountRules: {
        byCount: {
          4: Math.max(0, discount4 || 0),
          5: Math.max(0, discount5 || 0),
        },
        exemptSixth,
      },
      periods: Object.entries(periods).map(([term, p]) => ({
        term: Number(term),
        opens_at: p.opens_at || null,
        closes_at: p.closes_at || null,
        at_enrollment: p.at_enrollment,
      })),
      deletedIds,
      school_year: schoolYear,
      current_term: currentTerm,
    }
    save.mutate(payload, {
      onSuccess: () => toast.success('Barèmes enregistrés'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur d’enregistrement'),
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Paramètres"
        subtitle="Barèmes des frais, des classes et des réductions familiales"
        action={
          <Button onClick={submit} loading={save.isPending} disabled={!ready || !updatable}>
            <Save className="size-4" /> Enregistrer
          </Button>
        }
      />

      {!updatable && (
        <p className="text-sm text-slate-500">
          Lecture seule : vous n’avez pas la permission de modifier les paramètres.
        </p>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
          <CalendarRange className="size-4 text-brand-600" /> Année scolaire & trimestre en cours
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">
              Année scolaire
            </div>
            <Input
              value={schoolYear}
              disabled={!updatable}
              placeholder="Ex. 2026-2027"
              onChange={(e) => setSchoolYear(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">
              Trimestre en cours
            </div>
            <Select
              value={currentTerm}
              disabled={!updatable}
              onChange={(e) => setCurrentTerm(Number(e.target.value))}
              options={[1, 2, 3].map((t) => ({ value: String(t), label: TERM_LABELS[t] }))}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          L’année active s’applique aux nouveaux paiements (suivi des encaissements) et aux reçus. Les paiements déjà enregistrés conservent leur année d’origine.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Settings2 className="size-4 text-brand-600" /> Frais (en $)
          </div>
          <div className="space-y-5">
            {FEE_GROUPS.map((group) => {
              const rows = fees.map((f, i) => ({ f, i })).filter(({ f }) => group.match(f))
              if (rows.length === 0) return null
              return (
                <div key={group.title} className="space-y-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{group.title}</div>
                    <div className="text-xs text-slate-500">{group.hint}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_120px] gap-2 px-1 text-xs uppercase tracking-wider text-slate-500">
                    <span>Intitulé</span>
                    <span>Montant</span>
                  </div>
                  {rows.map(({ f, i }) => (
                    <div key={f.key} className="grid grid-cols-[1fr_120px] items-center gap-2">
                      <Input value={f.label} disabled />
                      <Input
                        type="number"
                        min={0}
                        value={f.amount || ''}
                        onChange={(e) => setFee(i, { amount: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Settings2 className="size-4 text-brand-600" /> Classes & minerval (en $)
            </div>
            <Button variant="subtle" size="sm" onClick={addClass} disabled={!updatable}>
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
          <div className="space-y-4">
            {classes.map((c, i) => (
              <div
                key={c.id ?? `new-${i}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-1 flex-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={c.name}
                      disabled={!updatable}
                      placeholder="Nom de classe (ex. 1A)"
                      onChange={(e) => setClass(i, { name: e.target.value })}
                    />
                    <Input
                      value={c.section}
                      disabled={!updatable}
                      placeholder="Section (ex. Primaire)"
                      onChange={(e) => setClass(i, { section: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600"
                    disabled={!updatable}
                    onClick={() => removeClass(i)}
                    title="Supprimer cette classe"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <NumInput label="T1" value={c.tranche1} disabled={!updatable} onChange={(v) => setClass(i, { tranche1: v })} />
                  <NumInput label="T2" value={c.tranche2} disabled={!updatable} onChange={(v) => setClass(i, { tranche2: v })} />
                  <NumInput label="T3" value={c.tranche3} disabled={!updatable} onChange={(v) => setClass(i, { tranche3: v })} />
                  <NumInput label="Livres" value={c.books} disabled={!updatable} onChange={(v) => setClass(i, { books: v })} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
          <Users className="size-4 text-brand-600" /> Réduction familiale sur le minerval
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-1 text-[11px] text-slate-500">4 enfants — montant fixe</div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                value={discount4 || ''}
                disabled={!updatable}
                onChange={(e) => setDiscount4(Number(e.target.value))}
              />
              <span className="text-sm text-slate-500">$</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-slate-500">5 enfants — montant fixe</div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                value={discount5 || ''}
                disabled={!updatable}
                onChange={(e) => setDiscount5(Number(e.target.value))}
              />
              <span className="text-sm text-slate-500">$</span>
            </div>
          </div>
          <label
            className={`mt-6 flex cursor-pointer items-center gap-2 text-sm ${updatable ? 'text-slate-700' : 'text-slate-400'}`}
          >
            <input
              type="checkbox"
              disabled={!updatable}
              checked={exemptSixth}
              onChange={(e) => setExemptSixth(e.target.checked)}
              className="size-4 accent-brand-600"
            />
            Le 6e enfant (inscrit en dernier) est exonéré du minerval
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Cahier des charges : 1 à 3 enfants → aucun avantage ; 4 enfants → 500 $ ; 5 enfants → 1 000 $ ; dès 6 enfants →
          seul le 6e enfant est exonéré.
        </p>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
          <CalendarRange className="size-4 text-brand-600" /> Fenêtres de paiement des tranches
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((term) => {
            const p = periods[term] ?? { opens_at: '', closes_at: '', at_enrollment: term === 1 }
            return (
              <div key={term} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {TERME_LABELS[term]}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {term === 1 ? (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!updatable}
                        checked={p.at_enrollment}
                        onChange={(e) => setPeriod(term, { at_enrollment: e.target.checked })}
                        className="size-4 accent-brand-600"
                      />
                      Ouverte dès l’inscription
                    </label>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1 text-[11px] text-slate-500">Ouverture</div>
                        <Input
                          type="date"
                          disabled={!updatable}
                          value={p.opens_at}
                          onChange={(e) => setPeriod(term, { opens_at: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] text-slate-500">Clôture / échéance</div>
                        <Input
                          type="date"
                          disabled={!updatable}
                          value={p.closes_at}
                          onChange={(e) => setPeriod(term, { closes_at: e.target.value })}
                        />
                      </div>
                      <div className="text-xs text-slate-500 self-end pb-2">
                        Les paiements sont bloqués hors de cette fenêtre.
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="border-rose-200 bg-rose-50/50 p-5">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <CalendarX2 className="size-4 text-rose-600" /> Clôture de l’année scolaire
        </div>
        <p className="text-sm text-slate-600">
          Passe l’année scolaire de{' '}
          <strong>{(settings.data?.school_year ?? '').toString()}</strong> à la suivante et réinitialise le terme à 1.
          Les familles sont notifiées pour la réinscription. Les élèves, classes et tarifs sont conservés.
        </p>
        <Button
          className="mt-4"
          variant="danger"
          loading={closeYear.isPending}
          disabled={!updatable}
          onClick={() => {
            if (!window.confirm('Clôturer l’année scolaire actuelle et passer à l’année suivante ?')) return
            closeYear.mutate(undefined, {
              onSuccess: () => toast.success('Année scolaire clôturée. Nouvelle année ouverte.'),
              onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la clôture'),
            })
          }}
        >
          <CalendarX2 className="size-4" /> Clôturer l’année
        </Button>
      </Card>
    </div>
  )
}

function NumInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-slate-500">{label}</div>
      <Input
        type="number"
        min={0}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
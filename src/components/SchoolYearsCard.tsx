import { useState } from 'react'
import { CalendarRange, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useActivateSchoolYearMutation, useCreateSchoolYearMutation } from '@/lib/data'
import { dateFr, type SchoolYearRow } from '@/lib/fees'
import { Badge, Button, Card, Input, Label } from '@/components/ui'

function nextYearName(years: SchoolYearRow[]): string {
  const latest = years.map((y) => y.name).filter((n) => /^\d{4}-\d{4}$/.test(n)).sort().pop()
  if (!latest) {
    const y = new Date().getFullYear()
    return `${y}-${y + 1}`
  }
  const [a, b] = latest.split('-').map(Number)
  return `${a + 1}-${b + 1}`
}

/**
 * Années académiques : création (barèmes repris de l'année active) et
 * activation. Les frais et le minerval affichés plus bas sont ceux de l'année active.
 */
export function SchoolYearsCard({
  years,
  updatable,
  onActivated,
}: {
  years: SchoolYearRow[]
  updatable: boolean
  onActivated: () => void | Promise<void>
}) {
  const create = useCreateSchoolYearMutation()
  const activate = useActivateSchoolYearMutation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')

  function startCreate() {
    const next = nextYearName(years)
    setName(next)
    setStartsOn(`${next.slice(0, 4)}-09-01`)
    setEndsOn(`${next.slice(5, 9)}-07-02`)
    setOpen(true)
  }

  function submit() {
    create.mutate(
      { name: name.trim(), starts_on: startsOn || null, ends_on: endsOn || null },
      {
        onSuccess: () => {
          toast.success(`Année ${name} créée`, { description: 'Elle reprend les barèmes actuels. Activez-la le moment venu.' })
          setOpen(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur de création'),
      },
    )
  }

  function activateYear(year: SchoolYearRow) {
    const ok = window.confirm(
      `Activer l’année ${year.name} ?\n\n` +
        '• Les frais et le minerval de cette année seront chargés (ceux de l’année actuelle sont archivés).\n' +
        '• Les élèves non réinscrits pour cette année seront archivés : réinscrivez-les depuis « Élèves » sans les recréer.\n' +
        '• Les paiements des autres années restent consultables.',
    )
    if (!ok) return
    activate.mutate(year.id, {
      onSuccess: async () => {
        await onActivated()
        toast.success(`Année ${year.name} active`)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Activation impossible'),
    })
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <CalendarRange className="size-4 text-brand-600" /> Années académiques
        </div>
        <Button variant="subtle" size="sm" onClick={startCreate} disabled={!updatable || open}>
          <Plus className="size-4" /> Nouvelle année
        </Button>
      </div>

      {open && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="sy-name">Année</Label>
            <Input id="sy-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="2027-2028" />
          </div>
          <div>
            <Label htmlFor="sy-start">Début</Label>
            <Input id="sy-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sy-end">Fin</Label>
            <Input id="sy-end" type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={submit} loading={create.isPending}>
              Créer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {years.map((y) => (
          <li key={y.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                {y.name}
                {y.is_active ? <Badge tone="emerald">Active</Badge> : <Badge tone="slate">Archivée</Badge>}
              </div>
              <div className="text-xs text-slate-500">
                {y.starts_on && y.ends_on ? `Du ${dateFr(y.starts_on)} au ${dateFr(y.ends_on)}` : 'Dates non renseignées'} ·{' '}
                {y.students} élève(s) inscrit(s)
              </div>
            </div>
            {y.is_active ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-4" /> Année en cours
              </span>
            ) : (
              <Button size="sm" variant="subtle" disabled={!updatable} loading={activate.isPending && activate.variables === y.id} onClick={() => activateYear(y)}>
                Activer
              </Button>
            )}
          </li>
        ))}
        {years.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucune année enregistrée.</li>}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Les frais et le minerval ci-dessous sont ceux de l’année active ; chaque année garde ses propres barèmes.
      </p>
    </Card>
  )
}

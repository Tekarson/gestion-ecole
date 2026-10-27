import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Pencil, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminStudentsQuery,
  refsQuery,
  useAdminCreateStudentMutation,
  useAdminUpdateStudentMutation,
  whoamiQuery,
} from '@/lib/data'
import type { AdminStudentRow } from '@/lib/fees'
import { can } from '@/lib/fees'
import { Badge, Button, Card, EmptyState, Input, Label, SectionTitle, Select } from '@/components/ui'

export const Route = createFileRoute('/admin/eleves')({
  component: AdminStudents,
})

function AdminStudents() {
  const whoami = useQuery(whoamiQuery)
  const students = useQuery(adminStudentsQuery)
  const refs = useQuery(refsQuery)

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; student: AdminStudentRow } | null>(null)

  const canCreate = can(whoami.data, 'eleves', 'create')
  const canUpdate = can(whoami.data, 'eleves', 'update')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Élèves"
        subtitle="Catalogue des élèves, classes et statuts"
        action={
          <Button onClick={() => setModal({ mode: 'create' })} disabled={!canCreate}>
            <Plus className="size-4" /> Ajouter un élève
          </Button>
        }
      />

      {!canCreate && !canUpdate && (
        <p className="text-sm text-slate-500">
          Lecture seule : vous n’avez pas la permission de modifier les élèves.
        </p>
      )}

      <Card className="p-0">
        {students.isPending ? (
          <div className="h-40 animate-pulse rounded-2xl bg-slate-50" />
        ) : students.data && students.data.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-10" />}
            title="Aucun élève"
            hint="Ajoutez le premier élève pour alimenter le catalogue."
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {(students.data ?? []).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.full_name}</span>
                    {s.status === 'inactive' ? (
                      <Badge tone="slate">Inactif</Badge>
                    ) : (
                      <Badge tone="emerald">Actif</Badge>
                    )}
                    {s.is_exempt && <Badge tone="amber">Exonéré</Badge>}
                    {s.is_teacher_child && <Badge tone="sky">Enfant d’enseignant</Badge>}
                    {s.is_entitled && <Badge tone="sky">Ayant droit</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-slate-500">
                    <span className="font-mono text-xs text-slate-400">{s.matricule}</span>
                    <span>{s.class_name ?? 'Aucune classe'}</span>
                    <span>{s.parent_name ? `Parent : ${s.parent_name}` : 'Sans famille rattachée'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="sky">{s.gender ?? '—'}</Badge>
                  {canUpdate && (
                    <Button variant="subtle" size="sm" onClick={() => setModal({ mode: 'edit', student: s })}>
                      <Pencil className="size-4" /> Modifier
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <StudentFormDialog
          mode={modal.mode}
          student={modal.mode === 'edit' ? modal.student : undefined}
          classes={refs.data?.classes ?? []}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

interface StudentFormDialogProps {
  mode: 'create' | 'edit'
  student?: AdminStudentRow
  classes: { id: string; name: string; section?: string }[]
  onClose: () => void
}

function StudentFormDialog({ mode, student, classes, onClose }: StudentFormDialogProps) {
  const create = useAdminCreateStudentMutation()
  const update = useAdminUpdateStudentMutation()

  const [firstName, setFirstName] = useState(student?.first_name ?? '')
  const [lastName, setLastName] = useState(student?.last_name ?? '')
  const [postnom, setPostnom] = useState(student?.postnom ?? '')
  const [gender, setGender] = useState<'M' | 'F' | ''>(student?.gender ?? '')
  const [classId, setClassId] = useState(student?.class_id ?? '')
  const [status, setStatus] = useState<'active' | 'inactive'>(student?.status ?? 'active')
  const [isExempt, setIsExempt] = useState(student?.is_exempt ?? false)
  const [isTeacherChild, setIsTeacherChild] = useState(student?.is_teacher_child ?? false)
  const [isEntitled, setIsEntitled] = useState(student?.is_entitled ?? false)
  const [photo, setPhoto] = useState(student?.photo_url ?? '')

  const busy = create.isPending || update.isPending

  const classOptions: { value: string; label: string; disabled?: boolean }[] = [
    { value: '', label: 'Choisir une classe', disabled: true },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.name}${c.section ? ` — ${c.section}` : ''}`.trim(),
    })),
  ]

  function submit() {
    if (mode === 'create' && (!firstName.trim() || !lastName.trim())) {
      toast.warning('Le prénom et le nom sont requis.')
      return
    }
    if (!classId) {
      toast.warning('Choisissez une classe.')
      return
    }

    const options = {
      onSuccess: () => {
        toast.success(mode === 'create' ? 'Élève ajouté' : 'Élève mis à jour')
        onClose()
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur d’enregistrement'),
    }

    if (mode === 'create') {
      create.mutate(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          postnom: postnom.trim() || undefined,
          gender: gender || undefined,
          class_id: classId,
          is_teacher_child: isTeacherChild,
          is_entitled: isEntitled,
          photo: photo.trim() || null,
        },
        options,
      )
    } else if (student) {
      update.mutate(
        {
          id: student.id,
          input: {
            class_id: classId,
            status,
            is_exempt: isExempt,
            is_teacher_child: isTeacherChild,
            is_entitled: isEntitled,
            photo: photo.trim() || null,
          },
        },
        options,
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="glass-strong relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {mode === 'create' ? 'Ajouter un élève' : `Modifier — ${student?.full_name}`}
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="student-first">Prénom</Label>
            <Input
              id="student-first"
              value={firstName}
              disabled={mode === 'edit'}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex. Grace"
            />
          </div>
          <div>
            <Label htmlFor="student-postnom">Postnom</Label>
            <Input
              id="student-postnom"
              value={postnom}
              disabled={mode === 'edit'}
              onChange={(e) => setPostnom(e.target.value)}
              placeholder="Ex. Mateso"
            />
          </div>
          <div>
            <Label htmlFor="student-last">Nom</Label>
            <Input
              id="student-last"
              value={lastName}
              disabled={mode === 'edit'}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex. Mwamba"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="student-gender">Genre</Label>
            <Select
              id="student-gender"
              value={gender}
              disabled={mode === 'edit'}
              onChange={(e) => setGender(e.target.value as 'M' | 'F' | '')}
              options={[
                { value: '', label: 'Non précisé' },
                { value: 'F', label: 'Fille (F)' },
                { value: 'M', label: 'Garçon (M)' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="student-class">Classe</Label>
            <Select
              id="student-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classOptions}
            />
          </div>
        </div>

        {mode === 'edit' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="student-status">Statut</Label>
              <Select
                id="student-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                options={[
                  { value: 'active', label: 'Actif' },
                  { value: 'inactive', label: 'Inactif' },
                ]}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isExempt}
                  onChange={(e) => setIsExempt(e.target.checked)}
                  className="size-4 accent-brand-500"
                />
                Exonéré du minerval
              </label>
            </div>
          </div>
        )}

        <fieldset className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">Statut particulier</legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isTeacherChild}
              onChange={(e) => setIsTeacherChild(e.target.checked)}
              className="mt-0.5 size-4 accent-brand-500"
            />
            <span>
              Enfant d’enseignant
              <span className="block text-xs text-slate-500">Ne paie pas les frais d’ouverture de dossier.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isEntitled}
              onChange={(e) => setIsEntitled(e.target.checked)}
              className="mt-0.5 size-4 accent-brand-500"
            />
            <span>
              Ayant droit
              <span className="block text-xs text-slate-500">Paie les frais connexes, pas le minerval.</span>
            </span>
          </label>
        </fieldset>

        <div className="mt-4">
          <Label htmlFor="student-photo">Photo (URL)</Label>
          <div className="flex items-start gap-3">
            <Input
              id="student-photo"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://…/photo.jpg"
            />
            {photo && (
              <img
                src={photo}
                alt="Aperçu"
                className="h-12 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Laissez vide pour ne pas définir de photo.</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={busy}>
            {mode === 'create' ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
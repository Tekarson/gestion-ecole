import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ImageUp, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminFamiliesQuery,
  adminStudentsQuery,
  refsQuery,
  uploadStudentPhoto,
  useAdminCreateStudentMutation,
  useAdminUpdateStudentMutation,
  useReenrollStudentsMutation,
  whoamiQuery,
} from "@/lib/data";
import { Pagination, SearchInput } from "@/components/ListTools";
import { matchesSearch, usePagination } from "@/lib/listing";
import type { AdminStudentRow } from "@/lib/fees";
import { can } from "@/lib/fees";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  SectionTitle,
  Select,
} from "@/components/ui";

export const Route = createFileRoute("/admin/eleves")({
  component: AdminStudents,
});

function AdminStudents() {
  const whoami = useQuery(whoamiQuery);
  const students = useQuery(adminStudentsQuery);
  const refs = useQuery(refsQuery);
  const families = useQuery(adminFamiliesQuery);

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; student: AdminStudentRow } | null
  >(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  // '' = inscrits de l'année active, 'archived' = à réinscrire, '*' = tous, sinon une année précise.
  const [yearFilter, setYearFilter] = useState("");
  const activeYear = refs.data?.school.year ?? "";
  const reenroll = useReenrollStudentsMutation();
  const [selected, setSelected] = useState<Record<string, string>>({});

  const allStudents = useMemo(() => students.data ?? [], [students.data]);
  const years = useMemo(
    () =>
      [...new Set(allStudents.map((s) => s.school_year).filter((y): y is string => !!y))]
        .sort()
        .reverse(),
    [allStudents],
  );
  const classes = useMemo(
    () => [...(refs.data?.classes ?? [])].sort((a, b) => Number(a.id) - Number(b.id)),
    [refs.data],
  );

  /** Classe proposée à la réinscription : la suivante dans l'ordre des classes. */
  function suggestedClass(classId: string | null): string {
    const i = classes.findIndex((c) => c.id === classId);
    if (i === -1) return classes[0]?.id ?? "";
    return classes[Math.min(i + 1, classes.length - 1)].id;
  }

  const archivedView = yearFilter === "archived";
  const filtered = useMemo(
    () =>
      allStudents.filter((s) => {
        if (yearFilter === "" && !s.enrolled) return false;
        if (yearFilter === "archived" && (s.enrolled || s.school_year === activeYear)) return false;
        if (
          yearFilter !== "" &&
          yearFilter !== "archived" &&
          yearFilter !== "*" &&
          s.school_year !== yearFilter
        )
          return false;
        return (
          (classFilter === "" || s.class_id === classFilter) &&
          matchesSearch(search, [s.full_name, s.matricule, s.class_name, s.parent_name])
        );
      }),
    [allStudents, search, classFilter, yearFilter, activeYear],
  );
  const paging = usePagination(filtered, `${search}|${classFilter}|${yearFilter}`);
  const selectedCount = Object.keys(selected).length;

  function toggle(id: string, classId: string | null) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = suggestedClass(classId);
      return next;
    });
  }

  function reenrollSelected() {
    const items = Object.entries(selected).map(([id, class_id]) => ({ id, class_id }));
    if (items.length === 0) return;
    reenroll.mutate(items, {
      onSuccess: (res) => {
        toast.success(`${res.reenrolled} élève(s) réinscrit(s) pour ${activeYear}`);
        setSelected({});
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Réinscription impossible"),
    });
  }

  const canCreate = can(whoami.data, "eleves", "create");
  const canUpdate = can(whoami.data, "eleves", "update");

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Élèves"
        subtitle="Catalogue des élèves, classes et statuts"
        action={
          <Button onClick={() => setModal({ mode: "create" })} disabled={!canCreate}>
            <Plus className="size-4" /> Ajouter un élève
          </Button>
        }
      />

      {!canCreate && !canUpdate && (
        <p className="text-sm text-slate-500">
          Lecture seule : vous n’avez pas la permission de modifier les élèves.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un élève, un matricule, un parent…"
          className="flex-1"
        />
        <Select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setSelected({});
          }}
          className="sm:w-64"
          aria-label="Année académique"
          options={[
            { value: "", label: `Inscrits ${activeYear}` },
            { value: "archived", label: "Archivés (à réinscrire)" },
            ...years.map((y) => ({ value: y, label: `Année ${y}` })),
            { value: "*", label: "Toutes les années" },
          ]}
        />
        <Select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="sm:w-56"
          options={[
            { value: "", label: "Toutes les classes" },
            ...(refs.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {archivedView && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Élèves des années précédentes, non encore inscrits pour <strong>{activeYear}</strong>.
            Cochez-les, vérifiez la classe proposée, puis réinscrivez-les : ils gardent leur
            matricule et leur historique.
          </p>
          <Button
            onClick={reenrollSelected}
            disabled={!canUpdate || selectedCount === 0}
            loading={reenroll.isPending}
          >
            Réinscrire {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
        </Card>
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
            {paging.pageItems.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {archivedView && canUpdate && (
                    <input
                      type="checkbox"
                      checked={!!selected[s.id]}
                      onChange={() => toggle(s.id, s.class_id)}
                      className="mt-1 size-4 accent-brand-500"
                      aria-label={`Sélectionner ${s.full_name}`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{s.full_name}</span>
                      {!s.enrolled && s.status === "active" && (
                        <Badge tone="slate">Archivé · {s.school_year ?? "—"}</Badge>
                      )}
                      {s.status === "inactive" ? (
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
                      <span>{s.class_name ?? "Aucune classe"}</span>
                      <span>
                        {s.parent_name ? `Parent : ${s.parent_name}` : "Sans famille rattachée"}
                      </span>
                    </div>
                    {archivedView && selected[s.id] && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-slate-500">Classe {activeYear} :</span>
                        <Select
                          value={selected[s.id]}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          className="w-44"
                          aria-label="Classe de réinscription"
                          options={classes.map((c) => ({ value: c.id, label: c.name }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="sky">{s.gender ?? "—"}</Badge>
                  {canUpdate && (
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => setModal({ mode: "edit", student: s })}
                    >
                      <Pencil className="size-4" /> Modifier
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">
                Aucun élève ne correspond à la recherche.
              </p>
            )}
          </div>
        )}
        <Pagination {...paging} />
      </Card>

      {modal && (
        <StudentFormDialog
          mode={modal.mode}
          isSuperadmin={whoami.data?.role === "superadmin"}
          student={modal.mode === "edit" ? modal.student : undefined}
          classes={refs.data?.classes ?? []}
          families={families.data ?? []}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

interface StudentFormDialogProps {
  mode: "create" | "edit";
  student?: AdminStudentRow;
  classes: { id: string; name: string; section?: string }[];
  families: { profile: { id: string; full_name: string; phone: string | null } }[];
  isSuperadmin?: boolean;
  onClose: () => void;
}

function StudentFormDialog({
  mode,
  student,
  classes,
  families,
  isSuperadmin = false,
  onClose,
}: StudentFormDialogProps) {
  const create = useAdminCreateStudentMutation();
  const update = useAdminUpdateStudentMutation();

  const [firstName, setFirstName] = useState(student?.first_name ?? "");
  const [lastName, setLastName] = useState(student?.last_name ?? "");
  const [postnom, setPostnom] = useState(student?.postnom ?? "");
  const [gender, setGender] = useState<"M" | "F" | "">(student?.gender ?? "");
  const [classId, setClassId] = useState(student?.class_id ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(student?.status ?? "active");
  const [isExempt, setIsExempt] = useState(student?.is_exempt ?? false);
  const [isTeacherChild, setIsTeacherChild] = useState(student?.is_teacher_child ?? false);
  const [isEntitled, setIsEntitled] = useState(student?.is_entitled ?? false);
  const [photo, setPhoto] = useState(student?.photo_url ?? "");
  const [familyId, setFamilyId] = useState(student?.family_id ?? "");
  const [uploading, setUploading] = useState(false);
  // Identité (noms, genre, famille) : figée après création, sauf pour le superadmin.
  const locked = mode === "edit" && !isSuperadmin;

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setPhoto(await uploadStudentPhoto(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l’envoi de la photo");
    } finally {
      setUploading(false);
    }
  }

  const busy = create.isPending || update.isPending;

  const classOptions: { value: string; label: string; disabled?: boolean }[] = [
    { value: "", label: "Choisir une classe", disabled: true },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.name}${c.section ? ` — ${c.section}` : ""}`.trim(),
    })),
  ];

  function submit() {
    if (mode === "create" && (!firstName.trim() || !lastName.trim())) {
      toast.warning("Le prénom et le nom sont requis.");
      return;
    }
    if (mode === "create" && !gender) {
      toast.warning("Choisissez le genre.");
      return;
    }
    if (!classId) {
      toast.warning("Choisissez une classe.");
      return;
    }
    if (mode === "create" && !familyId) {
      toast.warning("Choisissez la famille de l’élève.");
      return;
    }

    const options = {
      onSuccess: () => {
        toast.success(mode === "create" ? "Élève ajouté" : "Élève mis à jour");
        onClose();
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Erreur d’enregistrement"),
    };

    if (mode === "create") {
      create.mutate(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          postnom: postnom.trim() || undefined,
          gender: gender || undefined,
          class_id: classId,
          family_id: familyId,
          is_teacher_child: isTeacherChild,
          is_entitled: isEntitled,
          photo: photo.trim() || null,
        },
        options,
      );
    } else if (student) {
      update.mutate(
        {
          id: student.id,
          input: {
            ...(isSuperadmin
              ? {
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  postnom: postnom.trim() || null,
                  gender: gender || undefined,
                  family_id: familyId || undefined,
                }
              : {}),
            class_id: classId,
            status,
            is_exempt: isExempt,
            is_teacher_child: isTeacherChild,
            is_entitled: isEntitled,
            photo: photo.trim() || null,
          },
        },
        options,
      );
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
          {mode === "create" ? "Ajouter un élève" : `Modifier — ${student?.full_name}`}
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="student-first">Prénom</Label>
            <Input
              id="student-first"
              value={firstName}
              disabled={locked}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex. Grace"
            />
          </div>
          <div>
            <Label htmlFor="student-postnom">Postnom</Label>
            <Input
              id="student-postnom"
              value={postnom}
              disabled={locked}
              onChange={(e) => setPostnom(e.target.value)}
              placeholder="Ex. Mateso"
            />
          </div>
          <div>
            <Label htmlFor="student-last">Nom</Label>
            <Input
              id="student-last"
              value={lastName}
              disabled={locked}
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
              disabled={locked}
              onChange={(e) => setGender(e.target.value as "M" | "F" | "")}
              options={[
                { value: "", label: "À choisir", disabled: true },
                { value: "F", label: "Fille (F)" },
                { value: "M", label: "Garçon (M)" },
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

        <div className="mt-4">
          <Label htmlFor="student-family">Famille (parent)</Label>
          <Select
            id="student-family"
            value={familyId}
            disabled={locked}
            onChange={(e) => setFamilyId(e.target.value)}
            options={[
              { value: "", label: "À choisir", disabled: true },
              ...families.map((f) => ({
                value: f.profile.id,
                label: `${f.profile.full_name}${f.profile.phone ? ` · ${f.profile.phone}` : ""}`,
              })),
            ]}
          />
          {mode === "create" && families.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Aucune famille enregistrée : le parent doit d’abord créer son compte.
            </p>
          )}
        </div>

        {mode === "edit" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="student-status">Statut</Label>
              <Select
                id="student-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                options={[
                  { value: "active", label: "Actif" },
                  { value: "inactive", label: "Inactif" },
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
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Statut particulier
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isTeacherChild}
              onChange={(e) => setIsTeacherChild(e.target.checked)}
              className="mt-0.5 size-4 accent-brand-500"
            />
            <span>
              Enfant d’enseignant
              <span className="block text-xs text-slate-500">
                Ne paie pas les frais d’ouverture de dossier.
              </span>
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
              <span className="block text-xs text-slate-500">
                Paie les frais connexes, pas le minerval.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="mt-4">
          <Label htmlFor="student-photo">Photo</Label>
          <div className="flex items-center gap-3">
            {photo ? (
              <img
                src={photo}
                alt="Aperçu"
                className="h-16 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
              />
            ) : (
              <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
                <ImageUp className="size-5" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="student-photo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ImageUp className="size-4" />{" "}
                {uploading ? "Envoi…" : photo ? "Changer la photo" : "Joindre une photo"}
              </label>
              <input
                id="student-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              {photo && (
                <Button variant="ghost" size="sm" onClick={() => setPhoto("")}>
                  Retirer
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG ou WebP, 4 Mo maximum.</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={busy} disabled={uploading}>
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

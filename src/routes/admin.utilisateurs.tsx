import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, ShieldCheck, Trash2, UserCog, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminUsersQuery,
  modulesCatalogQuery,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useUpdateAdminUserMutation,
  whoamiQuery,
} from '@/lib/data'
import type { AdminUser, AdminUserModules, ModuleFlags } from '@/lib/fees'
import { Badge, Button, Card, EmptyState, Input, Label, SectionTitle } from '@/components/ui'

export const Route = createFileRoute('/admin/utilisateurs')({
  component: AdminUsers,
})

const ACTIONS: { key: keyof ModuleFlags; label: string }[] = [
  { key: 'read', label: 'Lire' },
  { key: 'create', label: 'Créer' },
  { key: 'update', label: 'Modifier' },
  { key: 'delete', label: 'Supprimer' },
]

function AdminUsers() {
  const whoami = useQuery(whoamiQuery)
  const users = useQuery(adminUsersQuery)
  const catalog = useQuery(modulesCatalogQuery)
  const remove = useDeleteAdminUserMutation()

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: AdminUser } | null>(null)

  if (whoami.isError) {
    return <Navigate to="/auth" />
  }
  if (whoami.data && whoami.data.role !== 'superadmin') {
    return (
      <div className="glass-strong mx-auto mt-10 max-w-md p-8 text-center">
        <ShieldCheck className="mx-auto size-12 text-rose-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Réservé au superadministrateur</h1>
        <p className="mt-2 text-sm text-slate-500">
          Seul le superadministrateur peut gérer les comptes administration.
        </p>
      </div>
    )
  }

  const catalogList = Object.entries(catalog.data?.modules ?? {})

  if (modal) {
    return (
      <UserFormDialog
        mode={modal.mode}
        user={modal.user}
        catalog={catalogList}
        onClose={() => setModal(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Utilisateurs"
        subtitle="Comptes administration, modules et permissions"
        action={
          <Button onClick={() => setModal({ mode: 'create' })} disabled={catalogList.length === 0}>
            <Plus className="size-4" /> Ajouter un utilisateur
          </Button>
        }
      />

      <Card className="p-0">
        {users.isPending ? (
          <div className="h-40 animate-pulse rounded-2xl bg-slate-50" />
        ) : users.data && users.data.users.length === 0 ? (
          <EmptyState
            icon={<UserCog className="size-10" />}
            title="Aucun utilisateur"
            hint="Créez le premier compte administration et assignez-lui ses modules."
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {(users.data?.users ?? []).map((user) => {
              const labels = Object.keys(user.modules)
                .map((key) => catalog.data?.modules[key] ?? key)
                .join(', ')

              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{user.full_name}</span>
                      {user.is_active ? (
                        <Badge tone="emerald">Actif</Badge>
                      ) : (
                        <Badge tone="slate">Désactivé</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">{user.email}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {labels.length > 0 ? labels : 'Aucun module'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => setModal({ mode: 'edit', user })}
                    >
                      <Pencil className="size-4" /> Modifier
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Supprimer le compte de ${user.full_name} ?`)) {
                          remove.mutate(user.id, {
                            onSuccess: () => toast.success('Utilisateur supprimé'),
                            onError: (err) =>
                              toast.error(err instanceof Error ? err.message : 'Erreur'),
                          })
                        }
                      }}
                    >
                      <Trash2 className="size-4" /> Supprimer
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

interface UserFormDialogProps {
  mode: 'create' | 'edit'
  user?: AdminUser
  catalog: [string, string][]
  onClose: () => void
}

function UserFormDialog({ mode, user, catalog, onClose }: UserFormDialogProps) {
  const create = useCreateAdminUserMutation()
  const update = useUpdateAdminUserMutation()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [postnom, setPostnom] = useState(user?.postnom ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [modules, setModules] = useState<AdminUserModules>(user?.modules ?? {})

  const busy = create.isPending || update.isPending

  function setFlag(module: string, action: keyof ModuleFlags, value: boolean) {
    setModules((prev) => {
      const current = prev[module] ?? { read: false, create: false, update: false, delete: false }
      return { ...prev, [module]: { ...current, [action]: value } }
    })
  }

  function submit() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning('Le prénom et le nom sont requis.')
      return
    }
    if (!email.trim()) {
      toast.warning('L’adresse e-mail est requise.')
      return
    }
    if (mode === 'create' && password.length < 6) {
      toast.warning('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      postnom: postnom.trim() || undefined,
      email: email.trim(),
      password: password || undefined,
      is_active: isActive,
      modules,
    }

    const options = {
      onSuccess: () => {
        toast.success(mode === 'create' ? 'Utilisateur créé' : 'Utilisateur mis à jour')
        onClose()
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : 'Erreur d’enregistrement'),
    }

    if (mode === 'create') {
      create.mutate(payload, options)
    } else if (user) {
      update.mutate({ id: user.id, input: payload }, options)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="glass-strong relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {mode === 'create' ? 'Nouvel utilisateur' : `Modifier — ${user?.full_name}`}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compte administration (espace unique), modules et permissions gérés par le superadministrateur.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="user-first">Prénom</Label>
            <Input
              id="user-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex. Renedy"
            />
          </div>
          <div>
            <Label htmlFor="user-last">Nom</Label>
            <Input
              id="user-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex. Kabeya"
            />
          </div>
          <div>
            <Label htmlFor="user-postnom">Postnom</Label>
            <Input
              id="user-postnom"
              value={postnom}
              onChange={(e) => setPostnom(e.target.value)}
              placeholder="Postnom (optionnel)"
            />
          </div>
          <div>
            <Label htmlFor="user-email">Adresse e-mail</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ecole.cd"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="user-password">
              {mode === 'create' ? 'Mot de passe temporaire' : 'Nouveau mot de passe (optionnel)'}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-brand-500"
              />
              Compte actif
            </label>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-slate-900">Modules & permissions</div>
          <div className="space-y-2">
            {catalog.map(([key, label]) => {
              const flags = modules[key] ?? { read: false, create: false, update: false, delete: false }
              const checked = ACTIONS.filter((a) => flags[a.key]).length
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{label}</span>
                    {checked > 0 && <Badge tone="violet">{checked} droit{checked > 1 ? 's' : ''}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ACTIONS.map((action) => (
                      <label
                        key={action.key}
                        className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-brand-500"
                          checked={flags[action.key]}
                          onChange={(e) => setFlag(key, action.key, e.target.checked)}
                        />
                        {action.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {catalog.length === 0 && (
            <p className="text-sm text-slate-500">Catalogue de modules indisponible.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={busy}>
            {mode === 'create' ? 'Créer le compte' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </div>
    </div>
  )
}
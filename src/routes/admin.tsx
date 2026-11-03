import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  FileBarChart,
  FileClock,
  Gauge,
  GraduationCap,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { hasToken } from '@/lib/session'
import { refsQuery, useLogoutMutation, whoamiQuery } from '@/lib/data'
import { isBackOfficeRole, roleLabel, can } from '@/lib/fees'
import { AppLayout, type NavItem } from '@/components/AppLayout'
import { Button, Select } from '@/components/ui'
import { setViewYear, useViewYear } from '@/lib/viewYear'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const whoami = useQuery(whoamiQuery)
  const refs = useQuery(refsQuery)
  const logout = useLogoutMutation()
  const queryClient = useQueryClient()
  const storedYear = useViewYear()
  const activeYear = refs.data?.school.year ?? ''
  const years = refs.data?.school.years ?? []
  // Année consultée : une année connue autre que l'active, sinon l'année active.
  const viewYear = storedYear && storedYear !== activeYear && years.includes(storedYear) ? storedYear : null
  const shownYear = viewYear ?? activeYear

  function switchYear(year: string) {
    setViewYear(year === activeYear ? null : year)
    // Recharge toutes les données pour l'année choisie.
    void queryClient.resetQueries()
  }

  if (!hasToken()) {
    return <Navigate to="/auth" />
  }
  if (whoami.isError) {
    return <Navigate to="/auth" />
  }

  const profile = whoami.data

  if (profile && !isBackOfficeRole(profile.role)) {
    return <Restricted onLogout={() => logout.mutate()} />
  }

  const nav: NavItem[] = []
  if (profile) {
    if (can(profile, 'dashboard')) {
      nav.push({ to: '/admin', label: 'Tableau de bord', icon: <Gauge className="size-5" /> })
    }
    if (can(profile, 'eleves')) {
      nav.push({ to: '/admin/eleves', label: 'Élèves', icon: <GraduationCap className="size-5" /> })
    }
    if (can(profile, 'paiements')) {
      nav.push({ to: '/admin/paiements', label: 'Paiements', icon: <ClipboardList className="size-5" /> })
      nav.push({ to: '/admin/rapports', label: 'Rapports', icon: <FileBarChart className="size-5" /> })
    }
    if (can(profile, 'familles')) {
      nav.push({ to: '/admin/familles', label: 'Familles', icon: <Users className="size-5" /> })
    }
    if (can(profile, 'journal')) {
      nav.push({ to: '/admin/journal', label: 'Journal', icon: <FileClock className="size-5" /> })
    }
    if (can(profile, 'parametres')) {
      nav.push({ to: '/admin/parametres', label: 'Paramètres', icon: <Settings className="size-5" /> })
    }
    if (profile.role === 'superadmin') {
      nav.push({ to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <UserCog className="size-5" /> })
    }
  }

  if (profile && nav.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-strong max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto size-12 text-amber-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Aucun module assigné</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ce compte n’a encore reçu aucun module. Contactez le superadministrateur.
          </p>
          <Button variant="ghost" className="mt-5" onClick={() => logout.mutate()}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      brand="NTSHIK"
      appLabel="Administration"
      year={shownYear}
      yearSlot={
        years.length > 1 ? (
          <Select
            value={shownYear}
            onChange={(e) => switchYear(e.target.value)}
            aria-label="Année scolaire affichée"
            className={`w-auto shrink-0 ${viewYear ? 'border-amber-300 bg-amber-50 text-amber-900' : ''}`}
            options={years.map((y) => ({ value: y, label: `Année ${y}${y === activeYear ? ' (active)' : ''}` }))}
          />
        ) : undefined
      }
      banner={
        viewYear ? (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              Vous consultez l’année <strong>{viewYear}</strong> : élèves, paiements, soldes et rapports de cette
              année. Les nouveaux enregistrements vont toujours dans l’année active ({activeYear}).
            </span>
            <Button size="sm" variant="subtle" onClick={() => switchYear(activeYear)}>
              Revenir à {activeYear}
            </Button>
          </div>
        ) : undefined
      }
      nav={nav}
      headerTitle={
        <div>
          <div className="text-lg font-bold text-slate-900 sm:text-xl">Espace Administration</div>
          <div className="text-xs text-slate-500">
            {refs.data?.school.name ?? 'Complexe Scolaire Bel Avenir'}
          </div>
        </div>
      }
      user={
        whoami.data
          ? { name: whoami.data.full_name, sub: roleLabel(whoami.data.role) }
          : undefined
      }
      onLogout={() => logout.mutate()}
      logoutBusy={logout.isPending}
    >
      {/* Remonte la page à chaque changement d'année (filtres remis à cette année). */}
      <Outlet key={shownYear} />
    </AppLayout>
  )
}

function Restricted({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-strong max-w-md p-8 text-center">
        <ShieldCheck className="mx-auto size-12 text-rose-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Accès restreint</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ce compte n’a pas les droits d’administration.
        </p>
        <Button variant="ghost" className="mt-5" onClick={onLogout}>
          Retour à la connexion
        </Button>
      </div>
    </div>
  )
}
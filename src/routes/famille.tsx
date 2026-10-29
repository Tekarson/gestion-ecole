import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  History,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react'
import { hasToken } from '@/lib/session'
import { familyQuery, useLogoutMutation } from '@/lib/data'
import { AppLayout, type NavItem } from '@/components/AppLayout'

export const Route = createFileRoute('/famille')({
  component: FamilyLayout,
})

function FamilyLayout() {
  const fam = useQuery(familyQuery)
  const logout = useLogoutMutation()

  if (!hasToken()) {
    return <Navigate to="/auth" />
  }

  const profile = fam.data?.profile
  const unread = (fam.data?.notifications ?? []).filter((n) => !n.read_at).length

  const nav: NavItem[] = [
    { to: '/famille', label: 'Tableau de bord', icon: <LayoutDashboard className="size-5" /> },
    { to: '/famille/inscription', label: 'Inscrire un enfant', icon: <UserPlus className="size-5" /> },
    { to: '/famille/historique', label: 'Historique', icon: <History className="size-5" /> },
    { to: '/famille/notifications', label: 'Notifications', icon: <Bell className="size-5" />, badge: unread },
  ]

  return (
    <AppLayout
      brand="NTSHIK"
      appLabel="Espace famille"
      year={fam.data?.school_year}
      nav={nav}
      headerTitle={
        <div>
          <div className="truncate text-lg font-bold text-slate-900 sm:text-xl">
            {profile ? `Bonjour, ${profile.full_name}` : 'Bonjour'}
          </div>
          <div className="text-xs text-slate-500">Gérez les frais scolaires de vos enfants</div>
        </div>
      }
      user={
        profile
          ? { name: profile.full_name, sub: 'Parent' }
          : undefined
      }
      onLogout={() => logout.mutate()}
      logoutBusy={logout.isPending}
    >
      <Outlet />
    </AppLayout>
  )
}
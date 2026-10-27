import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { GraduationCap, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, Button } from '@/components/ui'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

interface AppLayoutProps {
  brand: string
  appLabel: string
  year?: string
  nav: NavItem[]
  user?: { name: string; sub?: string }
  headerTitle: ReactNode
  headerRight?: ReactNode
  onLogout?: () => void
  logoutBusy?: boolean
  children?: ReactNode
}

export function AppLayout({
  brand,
  appLabel,
  year,
  nav,
  user,
  headerTitle,
  headerRight,
  onLogout,
  logoutBusy,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* Sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy-900 lg:flex lg:w-[70px] xl:w-[245px]">
        <div className="px-4 py-6 xl:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-600">
              <GraduationCap className="size-6 text-white" />
            </div>
            <div className="min-w-0 hidden xl:block">
              <div className="truncate text-lg font-extrabold text-white">{brand}</div>
              <div className="text-[11px] text-slate-300/70">{appLabel}</div>
            </div>
          </div>
          {year && (
            <div className="mt-4 hidden border-t border-white/10 pt-4 text-xs text-slate-300/70 xl:block">
              Année scolaire {year}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2 xl:px-4">
          {nav.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>

        {/* User + logout (desktop) */}
        <div className="border-t border-white/10 p-3 xl:p-4">
          {user && (
            <div className="mb-3 hidden items-center gap-2.5 xl:flex">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{user.name}</div>
                {user.sub && <div className="text-[11px] text-slate-300/70">{user.sub}</div>}
              </div>
            </div>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              onClick={onLogout}
              loading={logoutBusy}
              className="w-full border-0 bg-white/10 text-slate-100 hover:bg-white/20"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
              <span className="hidden xl:inline">Se déconnecter</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-[70px] xl:pl-[245px]">
        <header className="no-print sticky top-0 z-20 h-[72px] border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 lg:hidden">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div className="min-w-0">{headerTitle}</div>
              {year && (
                <span className="chip hidden shrink-0 border border-slate-200 bg-slate-50 text-slate-600 xl:inline-flex">
                  Année scolaire {year}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerRight}
              {onLogout && (
                <Button
                  variant="ghost"
                  onClick={onLogout}
                  loading={logoutBusy}
                  size="sm"
                  className="lg:hidden"
                  title="Se déconnecter"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Se déconnecter</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="glass-scroll mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {nav.length > 0 && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
            {nav.map((item) => (
              <NavLink key={item.to} item={item} mobile />
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

function NavLink({ item, mobile = false }: { item: NavItem; mobile?: boolean }) {
  const location = useLocation()
  const isActive =
    location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

  return (
    <Link
      to={item.to}
      className={cn(
        'group flex items-center rounded-lg font-medium transition',
        mobile
          ? 'flex-col gap-0 px-2 py-1 text-[10px]'
          : 'gap-2.5 px-3 py-2.5 text-sm justify-center xl:justify-start',
        isActive
          ? mobile
            ? 'text-brand-600'
            : 'bg-white/15 text-white'
          : mobile
            ? 'text-slate-500 hover:text-slate-700'
            : 'text-slate-300 hover:bg-white/10 hover:text-white',
      )}
    >
      <span
        className={cn(
          'shrink-0',
          mobile ? 'text-lg' : 'text-lg xl:text-base',
          isActive ? (mobile ? 'text-brand-600' : 'text-white') : 'text-slate-400',
        )}
      >
        {item.icon}
      </span>
      <span className={cn(mobile ? '' : 'hidden xl:inline')}>{item.label}</span>
    </Link>
  )
}
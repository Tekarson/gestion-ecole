import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, GraduationCap, KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { APP_MODE } from '@/lib/app-mode'
import { hasToken } from '@/lib/session'
import { refsQuery, useLoginMutation, useRegisterMutation } from '@/lib/data'
import { isBackOfficeRole } from '@/lib/fees'
import { Button, Input, Label, PasswordInput } from '@/components/ui'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

type Tab = 'login' | 'register'

function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const refs = useQuery(refsQuery)

  if (hasToken()) {
    return <Navigate to={APP_MODE === 'admin' ? '/admin' : '/famille'} />
  }

  const schoolName = refs.data?.school.name

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="hidden w-5/12 flex-col justify-between bg-navy-900 p-8 text-white lg:flex">
          <div>
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <GraduationCap className="size-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">NTSHIK</h2>
            <p className="mt-1 text-sm text-slate-300">{schoolName ?? 'Complexe Scolaire Bel Avenir'}</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Gérez les frais scolaires simplement : inscription, paiement en ligne et suivi en temps réel.
          </p>
        </div>

        <div className="flex w-full flex-col p-6 sm:p-8 lg:w-7/12">
          <div className="mb-2 text-center lg:hidden">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-600">
              <GraduationCap className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">NTSHIK</h1>
            <p className="mt-1 text-sm text-slate-500">{schoolName ?? 'Complexe Scolaire Bel Avenir'}</p>
          </div>

          {APP_MODE === 'admin' && (
            <div className="mb-4 flex justify-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                <ShieldCheck className="size-3.5" /> Espace Administration
              </div>
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <TabButton active={tab === 'login'} onClick={() => setTab('login')}>
              <LogIn className="size-4" /> Connexion
            </TabButton>
            {APP_MODE === 'family' && (
              <TabButton active={tab === 'register'} onClick={() => setTab('register')}>
                <UserPlus className="size-4" /> Inscription
              </TabButton>
            )}
          </div>

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}

          {APP_MODE === 'admin' && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Les comptes administration sont créés par le superadministrateur.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:bg-white hover:text-slate-900',
      )}
    >
      {children}
    </button>
  )
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const login = useLoginMutation()

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    login.mutate(
      { email, password },
      {
        onSuccess: (res) => {
          toast.success('Connexion réussie')
          window.location.assign(isBackOfficeRole(res.user.role) ? '/admin' : '/famille')
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Erreur de connexion'),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote message={error} />
      <div>
        <Label htmlFor="login-email">Adresse e-mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.cd"
        />
      </div>
      <div>
        <Label htmlFor="login-password">Mot de passe</Label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" loading={login.isPending} size="lg">
        <KeyRound className="size-4" /> Se connecter
      </Button>
    </form>
  )
}

function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [postnom, setPostnom] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const register = useRegisterMutation()

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    register.mutate(
      { first_name: firstName, last_name: lastName, postnom: postnom || undefined, email, phone: phone || undefined, password },
      {
        onSuccess: () => {
          toast.success('Compte créé, bienvenue !')
          window.location.assign('/famille')
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Erreur lors de l’inscription'),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="reg-first">Prénom</Label>
          <Input
            id="reg-first"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom du parent"
          />
        </div>
        <div>
          <Label htmlFor="reg-last">Nom</Label>
          <Input
            id="reg-last"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom de famille"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="reg-postnom">Postnom</Label>
        <Input
          id="reg-postnom"
          value={postnom}
          onChange={(e) => setPostnom(e.target.value)}
          placeholder="Postnom (optionnel)"
        />
      </div>
      <div>
        <Label htmlFor="reg-email">Adresse e-mail</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.cd"
        />
      </div>
      <div>
        <Label htmlFor="reg-phone">Téléphone</Label>
        <Input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+243 ..."
        />
      </div>
      <div>
        <Label htmlFor="reg-password">Mot de passe (min. 8 caractères)</Label>
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" loading={register.isPending} size="lg">
        <UserPlus className="size-4" /> Créer mon compte
      </Button>
      <p className="text-center text-xs text-slate-400">
        Un compte familial permet d’inscrire vos enfants et de suivre leur scolarité.
      </p>
    </form>
  )
}

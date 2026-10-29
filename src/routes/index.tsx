import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { APP_MODE } from '@/lib/app-mode'
import { refsQuery } from '@/lib/data'
import { Button } from '@/components/ui'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const isAdminMode = APP_MODE === 'admin'

function HomePage() {
  const refs = useQuery(refsQuery)

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-600">
            <GraduationCap className="size-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900">NTSHIK</div>
            <div className="text-xs text-slate-500">{refs.data?.school.name ?? 'Complexe Scolaire Bel Avenir'}</div>
          </div>
        </div>

        {isAdminMode ? (
          <Link to="/admin">
            <Button>Administration</Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button variant="ghost">Espace famille</Button>
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <div className="chip mb-4 bg-brand-50 text-brand-700">
              <Sparkles className="size-3.5" /> Année scolaire {refs.data?.school.year}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Les frais scolaires, simples et transparents
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Inscrivez vos enfants, payez en ligne et suivez chaque échéance.
              Chaque paiement est confirmé par l’école et donne lieu à un reçu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={isAdminMode ? '/admin' : '/famille'}>
                <Button size="lg">
                  {isAdminMode ? 'Accéder au tableau de bord' : 'Commencer'} <ArrowRight className="size-4" />
                </Button>
              </Link>
              {!isAdminMode && (
                <Link to="/auth">
                  <Button variant="ghost" size="lg">
                    Créer un compte famille
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="glass-strong relative p-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Exemple de frais
              </div>
              <div className="mt-4 space-y-3">
                {refs.data?.feeSettings.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{f.label}</span>
                    <span className="font-bold text-slate-900">{f.amount} $</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3">
                  {refs.data?.classes.slice(0, 2).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-slate-700">
                        {c.name}
                        <span className="ml-2 text-xs text-slate-400">
                          (T1 {c.tranche1} · T2 {c.tranche2} · T3 {c.tranche3})
                        </span>
                      </span>
                      <span className="font-semibold">
                        {c.books > 0 ? (
                          <span className="text-emerald-600">+ {c.books} $ livres</span>
                        ) : (
                          <span className="text-slate-900">{c.tranche1 + c.tranche2 + c.tranche3} $ / an</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Minerval payable en 3 tranches — place confirmée dès la 1<sup>re</sup> tranche réglée.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Wallet className="size-5" />} title="Paiement facile" text="Espèces, Mobile Money ou carte, en quelques clics." />
          <Feature icon={<ShieldCheck className="size-5" />} title="Inscription confirmée" text="Dès les frais d’inscription et la tranche 1 réglés." />
          <Feature icon={<FileText className="size-5" />} title="Reçus automatiques" text="Un reçu officiel pour chaque paiement, imprimable." />
          <Feature icon={<BookOpen className="size-5" />} title="Suivi complet" text="Solde, échéances et historique visibles en permanence." />
        </section>

        <section className="grid gap-6 py-10 lg:grid-cols-2">
          <div className="glass p-6">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <Receipt className="size-4 text-brand-600" /> Avantages famille
            </div>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <CheckItem>Un seul compte pour tous vos enfants</CheckItem>
              <CheckItem>Réduction familiale à partir du 4<sup>e</sup> enfant</CheckItem>
              <CheckItem>Historique et reçus centralisés sur l’année</CheckItem>
              <CheckItem>Notifications à chaque paiement</CheckItem>
            </ul>
          </div>

          <div className="glass border-violet-200 bg-violet-50 p-6">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <Sparkles className="size-4 text-violet-600" /> Exonération 6<sup>e</sup> enfant
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Les familles de 6 enfants ou plus sont exonérées du minerval pour le 6<sup>e</sup>{' '}
              enfant (et au-delà) : seuls les frais d’inscription et les livres restent dus.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              <CheckCircle2 className="size-4" /> Minerval 0 $ pour le 6<sup>e</sup> enfant
            </div>
          </div>
        </section>

        {isAdminMode && (
          <section className="py-10 text-center">
            <Link to="/admin">
              <Button size="lg" variant="ghost">
                Voir l’administration <ArrowRight className="size-4" />
              </Button>
            </Link>
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
        NTSHIK · {refs.data?.school.name ?? 'Complexe Scolaire Bel Avenir'} — Année scolaire{' '}
        {refs.data?.school.year}
      </footer>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass p-5">
      <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
        {icon}
      </div>
      <div className="font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  )
}

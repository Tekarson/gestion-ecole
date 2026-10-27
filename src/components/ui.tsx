import { useState } from 'react'
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ----- Button -----

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  subtle: 'btn bg-slate-100 text-slate-700 hover:bg-slate-200',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn('btn', variantClass[variant], sizeClass[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

// ----- Card -----

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'glass p-5 sm:p-6 transition-shadow',
        hover && 'hover:shadow-modal',
        className,
      )}
      {...props}
    />
  )
}

// ----- Badge -----

type BadgeTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'

const toneClass: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'slate', className, ...props }: BadgeProps) {
  return (
    <span className={cn('chip', toneClass[tone], className)} {...props} />
  )
}

export function StatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === 'confirme' ? 'emerald' : status === 'annule' ? 'rose' : 'amber'
  const label =
    status === 'confirme' ? 'Confirmé' : status === 'annule' ? 'Annulé' : 'En attente'
  return <Badge tone={tone}>{label}</Badge>
}

// ----- Form controls -----

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-slate-700', className)}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('glass-input', className)} {...props} />
}

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        className={cn('glass-input pr-10', className)}
        type={visible ? 'text' : 'password'}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        title={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition hover:text-slate-600"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('glass-input min-h-20', className)} {...props} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string; disabled?: boolean }[]
}

export function Select({ className, options = [], children, ...props }: SelectProps) {
  return (
    <select className={cn('glass-input appearance-none bg-no-repeat', className)} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
  )
}

// ----- Stat card -----

interface StatCardProps {
  icon?: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky'
  className?: string
}

const statTone: Record<NonNullable<StatCardProps['tone']>, string> = {
  violet: 'text-brand-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  sky: 'text-sky-600',
}

export function StatCard({ icon, label, value, sub, tone = 'violet', className }: StatCardProps) {
  return (
    <div className={cn('glass relative p-5', className)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className={statTone[tone]}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[25px] font-extrabold text-slate-900 sm:text-3xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

// ----- Empty state -----

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

// ----- User chip -----

export function UserChip({ name, sub }: { name: string; sub?: string }) {
  const init = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
      <div className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {init}
      </div>
      <div className="hidden leading-tight sm:block">
        <div className="text-sm font-semibold text-slate-800">{name}</div>
        {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const init = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white',
        className,
      )}
    >
      {init}
    </div>
  )
}

// ----- Section title -----

export function SectionTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
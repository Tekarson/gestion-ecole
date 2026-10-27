export type Role = 'family' | 'admin' | 'superadmin'

export interface Profile {
  id: string
  full_name: string
  first_name?: string | null
  last_name?: string | null
  postnom?: string | null
  email: string
  phone: string | null
  role: Role
  modules: string[]
  permissions: string[]
}

export interface School {
  id: string
  name: string
  year: string
}

export interface ClassRow {
  id: string
  name: string
  section: string
  tranche1: number
  tranche2: number
  tranche3: number
  books: number
  sort_order: number
}

export interface FeeControl {
  key: string
  label: string
  amount: number
  sort_order: number
}

export interface PeriodRow {
  term: number
  label: string
  opens_at: string | null
  closes_at: string | null
  at_enrollment: boolean
}

export interface Student {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  postnom?: string | null
  matricule: string
  class_id: string
  school_year: string
  photo_url: string | null
  created_at: string
  is_exempt?: boolean
  is_teacher_child?: boolean
  is_entitled?: boolean
}

export interface StudentWithCls {
  student: Student
  cls: ClassRow | null
}

export interface TrancheRow {
  term: number
  label: string
  due: number
  paid: number
  remaining: number
  status: 'a_venir' | 'ouverte' | 'partiellement_payee' | 'payee' | 'echue'
  opens_at: string | null
  closes_at: string | null
  at_enrollment: boolean
}

export interface FeeLine {
  key: string
  label: string
  due: number
  paid: number
  remaining: number
}

export interface StudentFinance {
  cls: ClassRow | null
  totalDue: number
  totalPaid: number
  balance: number
  fixedDue: number
  fixedPaid: number
  booksDue: number
  booksPaid: number
  minervalDue: number
  minervalPaid: number
  enrollmentDue: number
  enrollmentPaid: number
  tranches: TrancheRow[]
  lines: FeeLine[]
  placeConfirmed: boolean
  exempt: boolean
  childDiscount?: number
  childNet?: number
}

export type PaymentStatus = 'en_attente' | 'confirme' | 'annule'

export interface Payment {
  id: string
  student_id: string
  student_name: string
  parent_id: string
  parent_name?: string
  class_name?: string
  nature: string
  amount: number
  method: string
  school_year?: string | null
  status: PaymentStatus
  reference: string
  note: string | null
  created_at: string
}

export interface NotificationRow {
  id: string
  title: string
  body: string
  type: string
  read_at: string | null
  created_at: string
}

export interface FamilyChild {
  student: Student
  cls: ClassRow | null
  finance: StudentFinance
}

export interface FamilyFinance {
  childCount: number
  discount: number
  nextDiscount: number
  exemptCount: number
  nextExemption: boolean
  totalDue: number
  totalPaid: number
  balance: number
  totalGross: number
  totalNet: number
  minervalGross: number
  minervalNet: number
  fixedGross: number
  booksGross: number
  enrollmentGross: number
  children: FamilyChild[]
}

export interface FamilyPayload {
  profile: Profile
  school_year: string
  students: FamilyChild[]
  finance: FamilyFinance
  payments: Payment[]
  notifications: NotificationRow[]
}

export interface StudentPayload {
  student: Student
  cls: ClassRow | null
  finance: StudentFinance
}

export interface RefsPayload {
  school: School
  classes: ClassRow[]
  feeSettings: FeeControl[]
  periods: PeriodRow[]
}

export interface AdminStats {
  studentCount: number
  familyCount: number
  pendingCount: number
  totalPaid: number
  totalDue: number
  placeConfirmed: number
  pendingStudents: number
  totalDiscount: number
  families4: number
  families5: number
  exemptSixth: number
}

export interface SectionCount {
  name: string
  count: number
}

export interface AdminDashboard {
  stats: AdminStats
  bySection: SectionCount[]
  revenueByYear: { year: string; totalPaid: number; count: number }[]
  pending: Payment[]
}

export interface AdminFamily {
  profile: Profile
  students: FamilyChild[]
  finance: FamilyFinance
}

export interface AuditEntry {
  id: string
  user_name: string | null
  action: string
  details: string | null
  created_at: string
}

export interface SettingsPayload {
  feeSettings: FeeControl[]
  classes: ClassRow[]
  discountRules: DiscountRules
  periods: PeriodRow[]
  school_year: string
  current_term: number
}

export interface DiscountRules {
  byCount: Record<string, number>
  exemptSixth: boolean
}

export interface PeriodInput {
  term: number
  opens_at?: string | null
  closes_at?: string | null
  at_enrollment?: boolean
}

export interface SettingsClassInput {
  id: number | string | null
  name: string
  section: string
  tranche1: number
  tranche2: number
  tranche3: number
  books: number
  sort_order: number
}

export interface SettingsInput {
  feeSettings: { key: string; label: string; amount: number; sort_order: number }[]
  classes: SettingsClassInput[]
  discountRules: DiscountRules
  periods?: PeriodInput[]
  deletedIds?: number[]
  schoolYear?: string
  currentTerm?: number
}

export interface AdminStudentRow {
  id: string
  first_name: string
  last_name: string
  postnom?: string | null
  full_name: string
  gender: 'M' | 'F' | null
  matricule: string
  status: 'active' | 'inactive'
  is_exempt: boolean
  is_teacher_child?: boolean
  is_entitled?: boolean
  class_id: string | null
  class_name: string | null
  section: string | null
  family_id: string | null
  parent_name: string | null
  created_at: string
  photo_url?: string | null
}

export interface AdminStudentInput {
  first_name?: string
  last_name?: string
  postnom?: string | null
  gender?: 'M' | 'F'
  class_id?: string | number
  family_id?: string | number
  status?: 'active' | 'inactive'
  is_exempt?: boolean
  is_teacher_child?: boolean
  is_entitled?: boolean
  photo?: string | null
}

export interface ModuleFlags {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export type AdminUserModules = Record<string, ModuleFlags>

export interface AdminUser {
  id: string
  full_name: string
  first_name?: string | null
  last_name?: string | null
  postnom?: string | null
  email: string
  role: Role
  is_active: boolean
  modules: AdminUserModules
  created_at: string
}

export interface AdminUsersPayload {
  users: AdminUser[]
}

export interface ModulesPayload {
  modules: Record<string, string>
}

const NATURE_LABELS: Record<string, string> = {
  inscription: "Frais d'ouverture de dossier",
  uniforme: 'Uniforme',
  assurance: 'Assurance scolaire',
  divers: 'Frais divers',
  livres: 'Livres',
  gymnastique: 'Gymnastique',
  journal_classe: 'Journal de classe',
  uniforme_plus: 'Uniforme de plus',
  attestation_frequentation: 'Attestation de fréquentation',
  camp_ete: "Frais de camp d'été",
  examen: 'Participation aux examens',
  tranche1: 'Tranche 1 — Minerval',
  tranche2: 'Tranche 2 — Minerval',
  tranche3: 'Tranche 3 — Minerval',
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  carte: 'Carte bancaire',
  guichet: 'Guichet',
  especes: 'Espèces',
  virement: 'Virement bancaire',
}

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  annule: 'Annulé',
}

const TRANCH_STATUS_LABELS: Record<string, string> = {
  a_venir: 'À venir',
  ouverte: 'Ouverte',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  echue: 'Échue',
}

export function trancheStatusLabel(status: string): string {
  return TRANCH_STATUS_LABELS[status] ?? status
}

export const TRANCH_TONES: Record<string, 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'> = {
  payee: 'emerald',
  partiellement_payee: 'amber',
  echue: 'rose',
  a_venir: 'slate',
  ouverte: 'sky',
}

export function trancheStatusTone(status: string): 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' {
  return TRANCH_TONES[status] ?? 'slate'
}

export function tranchePeriodLabel(t: TrancheRow): string | null {
  if (t.at_enrollment) return 'Paiement à l’inscription'
  if (t.opens_at && t.closes_at) {
    return `Ouverte du ${dateFr(t.opens_at)} au ${dateFr(t.closes_at)}`
  }
  return null
}

export function natureLabel(nature: string): string {
  return NATURE_LABELS[nature] ?? nature
}

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function fmt(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} $`
}

export function classMinerval(cls: ClassRow): number {
  return cls.tranche1 + cls.tranche2 + cls.tranche3
}

export function classTotalDue(cls: ClassRow): number {
  return classMinerval(cls) + cls.books
}

export function studentDisplayName(s: Student): string {
  return `${s.first_name} ${s.last_name}`.trim()
}

export function initials(s: Student): string {
  const first = (s.first_name ?? '').charAt(0) || ''
  const last = (s.last_name ?? '').charAt(0) || ''
  return `${first}${last}`.toUpperCase() || '—'
}

export function dateFr(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function isBackOfficeRole(role: Role): boolean {
  return role === 'admin' || role === 'superadmin'
}

export function roleLabel(role: Role): string {
  if (role === 'superadmin') return 'Superadministrateur'
  if (role === 'admin') return 'Administrateur'
  return 'Parent'
}

export function can(profile: Profile | null | undefined, module: string, action: string = 'read'): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  return profile.permissions.includes(`${module}.${action}`)
}
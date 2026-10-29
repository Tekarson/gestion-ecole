import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from './api'
import { clearToken, hasToken, setToken } from './session'
import type {
  AdminDashboard,
  AdminFamily,
  AdminStudentInput,
  AdminStudentRow,
  AdminUser,
  AdminUserModules,
  AdminUsersPayload,
  AuditEntry,
  FamilyPayload,
  ModulesPayload,
  NotificationRow,
  Payment,
  PaymentStatus,
  Profile,
  RefsPayload,
  SettingsInput,
  SettingsPayload,
  StudentFinance,
  StudentPayload,
} from './fees'

// ---------- queries ----------

export const refsQuery = queryOptions({
  queryKey: ['refs'],
  queryFn: () => api<RefsPayload>('/refs'),
  staleTime: 1000 * 60 * 10,
})

export const whoamiQuery = queryOptions({
  queryKey: ['whoami'],
  queryFn: () => api<Profile>('/auth/me'),
  enabled: hasToken(),
  retry: 0,
  staleTime: 1000 * 60 * 5,
})

export const familyQuery = queryOptions({
  queryKey: ['family'],
  queryFn: () => api<FamilyPayload>('/family'),
  enabled: hasToken(),
})

export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: ['student', id],
    queryFn: () => api<StudentPayload>(`/students/${id}`),
    enabled: hasToken(),
  })

export const paymentsQuery = queryOptions({
  queryKey: ['payments'],
  queryFn: () => api<Payment[]>('/payments'),
  enabled: hasToken(),
})

export const paymentQuery = (id: string) =>
  queryOptions({
    queryKey: ['payment', id],
    queryFn: () => api<Payment>(`/payments/${id}`),
    enabled: hasToken(),
  })

export const notificationsQuery = queryOptions({
  queryKey: ['notifications'],
  queryFn: () => api<NotificationRow[]>('/notifications'),
  enabled: hasToken(),
})

export const adminDashboardQuery = queryOptions({
  queryKey: ['admin', 'dashboard'],
  queryFn: () => api<AdminDashboard>('/admin/dashboard'),
  enabled: hasToken(),
})

export const adminFamiliesQuery = queryOptions({
  queryKey: ['admin', 'families'],
  queryFn: () => api<AdminFamily[]>('/admin/families'),
  enabled: hasToken(),
})

export const adminStudentsQuery = queryOptions({
  queryKey: ['admin', 'students'],
  queryFn: () => api<AdminStudentRow[]>('/admin/students'),
  enabled: hasToken(),
})

export const adminStudentFinanceQuery = (id: string) =>
  queryOptions({
    queryKey: ['admin', 'student-finance', id],
    queryFn: () => api<StudentFinance>(`/admin/students/${id}/finance`),
    enabled: hasToken() && id !== '',
  })

export const adminPaymentsQuery = queryOptions({
  queryKey: ['admin', 'payments'],
  queryFn: () => api<Payment[]>('/admin/payments'),
  enabled: hasToken(),
})

export const settingsQuery = queryOptions({
  queryKey: ['admin', 'settings'],
  queryFn: () => api<SettingsPayload>('/admin/settings'),
  enabled: hasToken(),
})

export const auditQuery = queryOptions({
  queryKey: ['admin', 'audit'],
  queryFn: () => api<AuditEntry[]>('/admin/audit'),
  enabled: hasToken(),
})

export const adminUsersQuery = queryOptions({
  queryKey: ['admin', 'users'],
  queryFn: () => api<AdminUsersPayload>('/admin/users'),
  enabled: hasToken(),
})

export const modulesCatalogQuery = queryOptions({
  queryKey: ['admin', 'modules'],
  queryFn: () => api<ModulesPayload>('/admin/modules'),
  enabled: hasToken(),
})

// ---------- mutations ----------

export interface AuthCredentials {
  first_name?: string
  last_name?: string
  postnom?: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  token: string
  user: Profile
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (res) => {
      setToken(res.token)
    },
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (res) => {
      setToken(res.token)
    },
  })
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      try {
        await api<{ ok: true }>('/auth/logout', { method: 'POST' })
      } catch {
        /* token already invalid */
      }
      clearToken()
      // window.location.assign() below triggers a full page load, which builds
      // a brand-new QueryClient. Clearing the cache here would be redundant,
      // and worse: the still-mounted layout's observer still holds `enabled:
      // true`, so a queryClient.clear() makes it refetch /family with an
      // already-cleared token and log a spurious 401.
      window.location.assign('/auth')
    },
  })
}

export interface CreateStudentInput {
  first_name: string
  last_name: string
  postnom?: string
  class_id: string | number
}

export function useCreateStudentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStudentInput) =>
      api<StudentPayload>('/students', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useAdminCreateStudentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminStudentInput) =>
      api<AdminStudentRow>('/admin/students', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

/** Téléverse une photo d'élève et renvoie son URL publique. */
export async function uploadStudentPhoto(file: File): Promise<string> {
  const body = new FormData()
  body.append('photo', file)
  const res = await api<{ url: string }>('/admin/students/photo', { method: 'POST', body })
  return res.url
}

export function useAdminUpdateStudentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string | number; input: AdminStudentInput }) =>
      api<AdminStudentRow>(`/admin/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export interface CreatePaymentInput {
  student_id: string | number
  nature: string
  amount: number
  method: string
  note?: string
}

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) =>
      api<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export interface UpdatePaymentStatusInput {
  id: string | number
  status: PaymentStatus
  note?: string
}

export interface AdminPaymentInput {
  student_id: string
  nature: string
  amount: number
  method: string
}

export function useAdminCreatePaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminPaymentInput) =>
      api<Payment>('/admin/payments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdatePaymentStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: UpdatePaymentStatusInput) =>
      api<Payment>(`/payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      api<{ ok: true }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['family'] })
    },
  })
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingsInput) =>
      api<SettingsPayload>('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['refs'] })
      queryClient.invalidateQueries({ queryKey: ['family'] })
    },
  })
}

export function useDeleteClassMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      api<SettingsPayload>(`/admin/classes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['refs'] })
    },
  })
}

export function useCloseYearMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<SettingsPayload>('/admin/school/year-close', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['refs'] })
    },
  })
}

export interface AdminUserInput {
  first_name: string
  last_name: string
  postnom?: string
  email: string
  password?: string
  is_active?: boolean
  modules: AdminUserModules
}

export function useCreateAdminUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminUserInput) =>
      api<AdminUser>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateAdminUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string | number; input: AdminUserInput }) =>
      api<AdminUser>(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      api<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

function invalidateAll(queryClient: QueryClient): void {
  queryClient.invalidateQueries()
}
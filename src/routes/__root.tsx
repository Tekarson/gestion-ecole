import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { Toaster } from 'sonner'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#f5f7fb]">
        <Outlet />
      </div>
      <Toaster position="top-right" theme="light" richColors />
    </QueryClientProvider>
  )
}
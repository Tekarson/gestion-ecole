import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { QueryClient } from '@tanstack/react-query'

export function createAppRouter(queryClient: QueryClient) {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
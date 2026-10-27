import { startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import { queryClient } from './lib/query-client'
import './index.css'

const router = createAppRouter(queryClient)

startTransition(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
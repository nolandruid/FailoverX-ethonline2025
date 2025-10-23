import { RouterProvider, createBrowserRouter } from "react-router-dom"
import { routes } from "./routes.tsx"
import { QueryProvider } from "../providers/QueryProvider"

const router = createBrowserRouter(routes)

export const AppRouter = () => {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}
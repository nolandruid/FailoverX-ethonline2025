import { RouterProvider, createBrowserRouter } from "react-router-dom"
import { routes } from "./routes.tsx"

const router = createBrowserRouter(routes)

export const AppRouter = () => {
  return <RouterProvider router={router} />
}
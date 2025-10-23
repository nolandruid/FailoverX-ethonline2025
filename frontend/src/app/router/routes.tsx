import type { ReactElement } from 'react'
import App from '../App.tsx'
import { Dashboard } from '@/modules/dashboard/components/pages'
import { Login, SignUp } from '@/modules/auth/components/pages'
import StandaloneTest from '@/modules/transactions/components/pages/StandaloneTest'
import { TransactionScheduler } from '@/modules/transactions/components/pages/TransactionScheduler'
import { TestComponent } from '../../TestComponent'
import { GasPriceTest } from '../../components/GasPriceTest'
import { ChainSelectionTest } from '../../components/ChainSelectionTest'
import { TransactionSimulationTest } from '../../components/TransactionSimulation'
import { NotFoundPage } from '@/globals/components/pages'
import { AuthGuard } from './guards/AuthGuard'
import { ROUTES } from './consts'
  
interface Route {
  path: string
  element: ReactElement
  children?: Route[]
}

export const routes: Route[] = [
  {
    path: '/',
    element: <StandaloneTest />,
  },
  {
    path: '/scheduler',
    element: <TransactionScheduler />,
  },
  {
    path: '/gas-test',
    element: <GasPriceTest />,
  },
  {
    path: '/chain-selection-test',
    element: <ChainSelectionTest />,
  },
  {
    path: '/transaction-simulation-test',
    element: <TransactionSimulationTest />,
  },
  {
    path: ROUTES.TRANSACTIONS.path,
    element: <TransactionScheduler />,
  },
  {
    path: ROUTES.LOGIN.path,
    element: <Login />,
  },
  {
    path: ROUTES.SIGNUP.path,
    element: <SignUp />,
  },
  {
    path: ROUTES.DASHBOARD.path,
    element: <Dashboard />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]  
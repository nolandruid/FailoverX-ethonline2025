import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './app/router/AppRouter'
import './styles/globals.css'
import './styles/index.css'

// Polyfills for Web3 libraries
import { Buffer } from 'buffer'

globalThis.Buffer = Buffer

// Define process for browser
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} } as any
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)

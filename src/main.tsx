import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './App'

// GitHub Pages cannot serve a SPA fallback for /boards/:id on reload.
// Keep existing development URLs, and use hash routing in the published build.
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)

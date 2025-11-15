import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/theme/tokens.css'
import './styles/theme/typography.css'
import './styles/theme/dark.css'
import './styles/global.css'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

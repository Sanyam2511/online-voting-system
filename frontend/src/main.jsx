import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UiPreferencesProvider } from './context/UiPreferencesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UiPreferencesProvider>
      <App />
    </UiPreferencesProvider>
  </StrictMode>,
)

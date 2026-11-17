import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Agentation } from 'agentation'
import './tokens/tokens.css'
import './tokens/typography.css'
import './index.css'
import './omni/index.css'
import App from './omni/App.jsx'
import { CurrentUserProvider } from './omni/CurrentUser.jsx'
import { ConversationFieldsProvider } from './omni/ConversationFields.jsx'
import { EmailNotesProvider } from './omni/EmailNotesStore.jsx'
import { ThreadViewProvider } from './omni/ThreadView.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Conversation fields and notes are shared by everyone, so they sit outside the per-user view (which resets on switch). */}
      <ConversationFieldsProvider>
        <EmailNotesProvider>
          <ThreadViewProvider>
            <CurrentUserProvider>
              <App />
            </CurrentUserProvider>
          </ThreadViewProvider>
        </EmailNotesProvider>
      </ConversationFieldsProvider>
    </BrowserRouter>
    {import.meta.env.DEV && <Agentation appName="Activity and Notes" />}
  </StrictMode>,
)

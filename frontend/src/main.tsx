import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/AppProviders';
import { AppRouter } from './routes/AppRouter';
import { clearChunkRetryFlag } from './utils/lazyWithRetry';
import './styles/factory.css';
import './styles/dashboard.css';
import './styles/show-api-data.css';
import './styles/rack-layout.css';
import './styles/picklist-issue.css';
import './styles/picklist-layout.css';
import './styles/booking-out-puid.css';
import './styles/wo-material-calc.css';
import './styles/abdul-chat.css';

clearChunkRetryFlag();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);

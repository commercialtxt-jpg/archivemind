import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles/tailwind.css';

// Register service worker — auto-update on new version
registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry client errors (4xx) — they indicate a logic problem, not
        // a transient server issue, so retrying will never help.
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
  },
});

// Load auth from localStorage on startup
useAuthStore.getState().loadFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

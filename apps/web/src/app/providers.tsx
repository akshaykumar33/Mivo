'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const checkAuth = useAuthStore((s) => s.checkAuth);
  const initPresenceListeners = usePresenceStore((s) => s.initPresenceListeners);

  React.useEffect(() => {
    checkAuth().then(() => {
      initPresenceListeners();
    });
  }, [checkAuth, initPresenceListeners]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

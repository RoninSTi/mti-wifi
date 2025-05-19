'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ReactNode, useState } from 'react';
import { GatewayProvider } from '@/lib/services/gateway';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <GatewayProvider>{children}</GatewayProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

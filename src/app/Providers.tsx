import { IonApp, setupIonicReact } from '@ionic/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from './queryClient';

setupIonicReact({ mode: 'ios' });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <IonApp>{children}</IonApp>
    </QueryClientProvider>
  );
}

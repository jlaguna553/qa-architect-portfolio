'use client';

import { useEffect } from 'react';

export function QaArchitectProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solo activo en desarrollo local
    if (process.env.NODE_ENV !== 'development') return;

    import('@qa-arquitect/sdk-js').then(({ initQaArchitect }) => {
      initQaArchitect({
        endpoint: 'http://localhost:9000',
        captureNetwork: true,
        captureEvents: true,
        captureScreenshots: true,
        localFilter: 'localhost',
      });
    });
  }, []);

  return <>{children}</>;
}

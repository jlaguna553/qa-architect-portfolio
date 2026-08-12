import { TracePayload } from '../types';

export interface SenderConfig {
  endpoint: string;
  retryAttempts: number;
}

export async function sendTrace(payload: TracePayload, config: SenderConfig): Promise<void> {
  for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
    try {
      const response = await fetch(`${config.endpoint}/api/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.ok) return;
    } catch {
      if (attempt === config.retryAttempts - 1) {
        console.warn('[QA Arquitecto] No se pudo enviar la traza al servidor local.');
      }
    }
  }
}

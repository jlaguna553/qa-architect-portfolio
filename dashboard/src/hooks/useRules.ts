import { useState, useEffect, useCallback } from 'react';
import { RulesData } from '../types';

export function useRules() {
  const [rules, setRules] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rules');
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Error loading rules');
        return;
      }
      setRules(await res.json() as RulesData);
      setError(null);
    } catch {
      setError('Cannot connect to QA Architect server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRules();
    const interval = setInterval(() => void fetchRules(), 15_000);
    return () => clearInterval(interval);
  }, [fetchRules]);

  const refineRule = useCallback(async (flowId: string, stepId: string, description: string) => {
    const res = await fetch(`/api/rules/${flowId}/steps/${stepId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (res.ok) await fetchRules();
  }, [fetchRules]);

  return { rules, loading, error, refetchRules: fetchRules, refineRule };
}

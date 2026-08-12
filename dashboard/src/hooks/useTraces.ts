import { useState, useEffect, useCallback } from 'react';
import { TracesData, TraceEvent, BusinessFlow, MatchedTrace, FinalScenarioStep } from '../types';

function normalizeUrl(url: string): string {
  try { return new URL(url).pathname; } catch { return url.split('?')[0]; }
}

function routeMatches(traceUrl: string, flowRoute: string): boolean {
  const pattern = flowRoute.replace(/\{[^}]+\}/g, '[^/]+').replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${pattern}$`).test(normalizeUrl(traceUrl));
}

export function matchTracesToFlows(traces: TraceEvent[], flows: BusinessFlow[]): Map<string, MatchedTrace[]> {
  const matchMap = new Map<string, MatchedTrace[]>();

  for (const trace of traces) {
    if (trace.type !== 'http' || !trace.request || !trace.response) continue;

    for (const flow of flows) {
      if (!routeMatches(trace.request.url, flow.route)) continue;
      if (trace.request.method.toUpperCase() !== flow.http_method.toUpperCase()) continue;

      for (const step of flow.steps) {
        if (step.type !== 'final_scenario') continue;
        if ((step as FinalScenarioStep).expected_http_code === trace.response.status) {
          const key = `${flow.id}::${step.id}`;
          if (!matchMap.has(key)) matchMap.set(key, []);
          matchMap.get(key)!.push({ trace, stepId: step.id, flowId: flow.id });
        }
      }
    }
  }

  return matchMap;
}

export function useTraces() {
  const [tracesData, setTracesData] = useState<TracesData>({ traces: [] });
  const [loading, setLoading] = useState(true);

  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch('/api/traces');
      if (res.ok) setTracesData(await res.json() as TracesData);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTraces();
    const interval = setInterval(() => void fetchTraces(), 5_000);
    return () => clearInterval(interval);
  }, [fetchTraces]);

  return { tracesData, loading, refetchTraces: fetchTraces };
}

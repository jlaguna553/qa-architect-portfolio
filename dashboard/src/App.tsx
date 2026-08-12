import { useState, useCallback } from 'react';
import { useRules } from './hooks/useRules';
import { useTraces } from './hooks/useTraces';
import { RuleGraph } from './components/RuleGraph';
import { LandscapeMap } from './components/LandscapeMap';
import { InspectionPanel } from './components/InspectionPanel';
import { BusinessFlow, TraceEvent } from './types';

type ViewMode = 'flow' | 'map';

interface SelectedPanel {
  traces: TraceEvent[];
  stepId: string;
  flowId: string;
}

export function App() {
  const { rules, loading, error, refetchRules, refineRule } = useRules();
  const { tracesData } = useTraces();
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<SelectedPanel | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const currentFlow: BusinessFlow | undefined = rules?.flows.find(
    f => f.id === (activeFlowId ?? rules?.flows[0]?.id)
  );

  const handleSelectTrace = useCallback((traces: TraceEvent[], stepId: string, flowId: string) => {
    setSelectedPanel({ traces, stepId, flowId });
  }, []);

  const handleSelectFlow = useCallback((flowId: string) => {
    setActiveFlowId(flowId);
    setViewMode('flow');
    setSelectedPanel(null);
  }, []);

  if (loading) return (
    <div style={centerStyle}>
      <div style={spinnerStyle} />
      <p style={{ color: '#64748b', fontSize: 14, marginTop: 16 }}>Loading business rules...</p>
    </div>
  );

  if (error) return (
    <div style={centerStyle}>
      <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</p>
      <button onClick={() => void refetchRules()} style={btnStyle}>Retry</button>
    </div>
  );

  if (!rules || rules.flows.length === 0) return (
    <div style={centerStyle}>
      <h2 style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>No rules generated yet</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, textAlign: 'center', maxWidth: 360 }}>
        Run <code style={codeStyle}>qa-architect analyze</code> to extract business rules from your source code.
      </p>
      <button onClick={() => void refetchRules()} style={btnStyle}>Refresh</button>
    </div>
  );

  const flow = currentFlow ?? rules.flows[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header style={{ height: 52, background: '#0f1117', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>QA Architect</h1>
        <span style={{ color: '#334155', fontSize: 12 }}>|</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{rules.project_name}</span>
        <span style={{ color: '#334155', fontSize: 12 }}>|</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{tracesData.traces.length} traces</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{rules.flows.length} flows</span>

        {/* View toggle */}
        <div style={{ marginLeft: 8, display: 'flex', background: '#1e293b', borderRadius: 6, padding: 2, gap: 2 }}>
          <button
            onClick={() => setViewMode('map')}
            style={{
              ...tabBtnStyle,
              background: viewMode === 'map' ? '#1d4ed8' : 'transparent',
              color: viewMode === 'map' ? '#fff' : '#64748b',
            }}
          >
            App Map
          </button>
          <button
            onClick={() => setViewMode('flow')}
            style={{
              ...tabBtnStyle,
              background: viewMode === 'flow' ? '#1d4ed8' : 'transparent',
              color: viewMode === 'flow' ? '#fff' : '#64748b',
            }}
          >
            Flow Detail
          </button>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => void refetchRules()} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11 }}>Refresh</button>
        </div>
      </header>

      {viewMode === 'map' ? (
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <LandscapeMap
            flows={rules.flows}
            traces={tracesData.traces}
            onSelectFlow={handleSelectFlow}
          />
        </main>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside style={{ width: 240, background: '#0a0e1a', borderRight: '1px solid #1e293b', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
              <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Flows</p>
            </div>
            {rules.flows.map(f => (
              <button key={f.id} onClick={() => { setActiveFlowId(f.id); setSelectedPanel(null); }}
                style={{ width: '100%', textAlign: 'left', background: flow.id === f.id ? '#1a2035' : 'none', border: 'none', borderBottom: '1px solid #1e293b', padding: '10px 16px', cursor: 'pointer', color: flow.id === f.id ? '#e2e8f0' : '#94a3b8' }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{f.name}</p>
                <p style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{f.http_method} {f.route}</p>
                <p style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>{f.steps.length} steps</p>
              </button>
            ))}
          </aside>

          <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'rgba(15,17,23,0.9)', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{flow.name}</p>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>{flow.http_method} {flow.route}</p>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{flow.source_file} → {flow.controller_method}</p>
            </div>

            <RuleGraph flow={flow} traces={tracesData.traces} allFlows={rules.flows} onSelectTrace={handleSelectTrace} />
          </main>

          {selectedPanel && (
            <InspectionPanel
              traces={selectedPanel.traces}
              stepId={selectedPanel.stepId}
              flowId={selectedPanel.flowId}
              flow={rules.flows.find(f => f.id === selectedPanel.flowId)!}
              onClose={() => setSelectedPanel(null)}
              onRefineRule={refineRule}
            />
          )}
        </div>
      )}
    </div>
  );
}

const centerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' };
const spinnerStyle: React.CSSProperties = { width: 32, height: 32, border: '3px solid #1e293b', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' };
const btnStyle: React.CSSProperties = { background: '#1d4ed8', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 6, padding: '6px 16px', fontSize: 13 };
const tabBtnStyle: React.CSSProperties = { border: 'none', cursor: 'pointer', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' };
const codeStyle: React.CSSProperties = { background: '#1e293b', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 };

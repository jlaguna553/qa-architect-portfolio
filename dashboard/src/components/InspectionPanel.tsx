import { useState } from 'react';
import { TraceEvent, BusinessFlow, FlowStep } from '../types';

interface InspectionPanelProps {
  traces: TraceEvent[];
  stepId: string;
  flowId: string;
  flow: BusinessFlow;
  onClose: () => void;
  onRefineRule: (flowId: string, stepId: string, description: string) => Promise<void>;
}

function JsonViewer({ data }: { data: unknown }) {
  return (
    <pre style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 6, padding: 12, fontSize: 11, color: '#94a3b8', overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function InspectionPanel({ traces, stepId, flowId, flow, onClose, onRefineRule }: InspectionPanelProps) {
  const [activeTrace, setActiveTrace] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const trace = traces[activeTrace];
  const step = flow.steps.find((s: FlowStep) => s.id === stepId);

  const handleRefine = async () => {
    if (!refineText.trim()) return;
    setIsSaving(true);
    await onRefineRule(flowId, stepId, refineText.trim());
    setIsSaving(false);
    setIsRefining(false);
    setRefineText('');
  };

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#0f1117', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Trace Inspector</h3>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{traces.length} trace(s) captured</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>✕</button>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{step?.description ?? 'Unknown step'}</p>
          <button onClick={() => { setIsRefining(!isRefining); setRefineText(step?.description ?? ''); }}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: 11, marginLeft: 8, flexShrink: 0 }}>
            Refine Rule
          </button>
        </div>
        {isRefining && (
          <div style={{ marginTop: 8 }}>
            <textarea value={refineText} onChange={e => setRefineText(e.target.value)}
              style={{ width: '100%', background: '#1a2035', border: '1px solid #3b82f6', borderRadius: 6, color: '#e2e8f0', padding: 8, fontSize: 12, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => void handleRefine()} disabled={isSaving}
                style={{ background: '#1d4ed8', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 6, padding: '4px 12px', fontSize: 12 }}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setIsRefining(false)}
                style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, padding: '4px 12px', fontSize: 12 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {traces.length > 1 && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {traces.map((t, i) => (
            <button key={t.trace_id} onClick={() => setActiveTrace(i)}
              style={{ background: i === activeTrace ? '#1d4ed8' : '#1e293b', border: '1px solid', borderColor: i === activeTrace ? '#3b82f6' : '#334155', color: '#e2e8f0', cursor: 'pointer', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
              #{i + 1}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {trace && (
          <>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{new Date(trace.timestamp).toLocaleString()}</p>
              {trace.request && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#1e293b', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}>{trace.request.method}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{trace.request.url}</span>
                </div>
              )}
              {trace.response && (
                <span style={{ display: 'inline-block', marginTop: 6, background: trace.response.status >= 400 ? '#450a0a' : '#14532d', color: trace.response.status >= 400 ? '#f87171' : '#4ade80', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
                  HTTP {trace.response.status}
                </span>
              )}
            </div>

            {trace.trace_id && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>SCREENSHOT</p>
                <img src={`/api/screenshots/${trace.trace_id}`} alt="Screenshot"
                  style={{ width: '100%', borderRadius: 6, border: '1px solid #1e293b', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

            {trace.request?.body && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>REQUEST BODY</p>
                <JsonViewer data={trace.request.body} />
              </div>
            )}

            {trace.response?.body && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>RESPONSE BODY</p>
                <JsonViewer data={trace.response.body} />
              </div>
            )}

            {trace.context?.exception && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>EXCEPTION</p>
                <div style={{ background: '#1a0a0a', border: '1px solid #450a0a', borderRadius: 6, padding: 12 }}>
                  <p style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace', marginBottom: 4 }}>{trace.context.exception.class}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{trace.context.exception.message}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>{trace.context.exception.file}:{trace.context.exception.line}</p>
                  {trace.context.exception.stack_trace.length > 0 && (
                    <pre style={{ fontSize: 10, color: '#64748b', marginTop: 8, maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {trace.context.exception.stack_trace.join('\n')}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

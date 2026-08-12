import { Handle, Position } from '@xyflow/react';
import { BusinessFlow } from '../../types';

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:    { bg: '#1e3a5f', text: '#60a5fa' },
  POST:   { bg: '#14532d', text: '#4ade80' },
  PUT:    { bg: '#451a03', text: '#fb923c' },
  PATCH:  { bg: '#3b0764', text: '#c084fc' },
  DELETE: { bg: '#450a0a', text: '#f87171' },
};

interface FlowCardNodeData {
  flow: BusinessFlow;
  traceCount: number;
  onClick: () => void;
}

export function FlowCardNode({ data }: { data: FlowCardNodeData }) {
  const { flow, traceCount, onClick } = data;
  const methodStyle = METHOD_COLORS[flow.http_method] ?? { bg: '#1e293b', text: '#94a3b8' };

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        onClick={onClick}
        style={{
          width: 220,
          background: '#0f1623',
          border: `1px solid ${traceCount > 0 ? '#1d4ed8' : '#1e293b'}`,
          borderRadius: 8,
          padding: '10px 12px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          boxShadow: traceCount > 0 ? '0 0 0 1px #1d4ed840' : 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = traceCount > 0 ? '#1d4ed8' : '#1e293b')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'monospace',
            background: methodStyle.bg,
            color: methodStyle.text,
            padding: '2px 5px',
            borderRadius: 4,
          }}>
            {flow.http_method}
          </span>
          <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {flow.route}
          </span>
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.3 }}>
          {flow.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#475569' }}>{flow.steps.length} steps</span>
          {traceCount > 0 && (
            <span style={{ fontSize: 10, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              {traceCount} trace{traceCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

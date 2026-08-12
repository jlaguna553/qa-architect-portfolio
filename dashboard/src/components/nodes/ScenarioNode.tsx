import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ScenarioNodeData {
  description: string;
  is_success: boolean;
  expected_http_code: number;
  error_category?: string;
  isHighlighted?: boolean;
  traceCount?: number;
  onClick?: () => void;
}

export function ScenarioNode({ data }: NodeProps) {
  const d = data as unknown as ScenarioNodeData;
  const borderColor = d.isHighlighted ? (d.is_success ? '#4ade80' : '#f97316') : (d.is_success ? '#16a34a' : '#dc2626');
  const glowColor = d.is_success ? 'rgba(74,222,128,0.4)' : 'rgba(249,115,22,0.4)';

  return (
    <div onClick={d.onClick} style={{ background: d.isHighlighted ? (d.is_success ? '#166534' : '#7c2d12') : '#1a2035', border: `2px solid ${borderColor}`, borderRadius: 8, padding: '12px 16px', minWidth: 200, maxWidth: 280, boxShadow: d.isHighlighted ? `0 0 16px ${glowColor}` : 'none', cursor: d.isHighlighted ? 'pointer' : 'default', transition: 'all 0.2s ease' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#4a5568' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{d.is_success ? '✓' : '✗'}</span>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.is_success ? 'Success' : 'Failure'}</span>
        </div>
        <span style={{ fontSize: 11, background: d.is_success ? '#14532d' : '#450a0a', color: d.is_success ? '#4ade80' : '#f87171', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{d.expected_http_code}</span>
      </div>
      <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4, fontWeight: 500 }}>{d.description}</p>
      {d.error_category && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 6, fontFamily: 'monospace' }}>{d.error_category}</p>}
      {d.isHighlighted && d.traceCount !== undefined && d.traceCount > 0 && (
        <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>
          {d.traceCount} trace(s) — click to inspect
        </div>
      )}
    </div>
  );
}

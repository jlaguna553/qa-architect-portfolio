import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ConditionalNodeData {
  description: string;
  condition: string;
  isHighlighted?: boolean;
}

export function ConditionalNode({ data }: NodeProps) {
  const d = data as unknown as ConditionalNodeData;
  return (
    <div style={{ background: d.isHighlighted ? '#1e3a5f' : '#1a2035', border: `2px solid ${d.isHighlighted ? '#3b82f6' : '#4a5568'}`, borderRadius: 8, padding: '12px 16px', minWidth: 200, maxWidth: 280, boxShadow: d.isHighlighted ? '0 0 12px rgba(59,130,246,0.4)' : 'none' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#4a5568' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', transform: 'rotate(45deg)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Condition</span>
      </div>
      <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4, fontWeight: 500 }}>{d.description}</p>
      {d.condition && <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>{d.condition}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: '#22c55e' }}>Yes →</span>
        <span style={{ fontSize: 10, color: '#ef4444' }}>← No</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%', background: '#22c55e' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%', background: '#ef4444' }} />
    </div>
  );
}

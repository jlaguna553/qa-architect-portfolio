import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ProcessNodeData {
  description: string;
}

export function ProcessNode({ data }: NodeProps) {
  const d = data as unknown as ProcessNodeData;
  return (
    <div style={{ background: '#1a2035', border: '2px solid #334155', borderRadius: 8, padding: '12px 16px', minWidth: 180, maxWidth: 260 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#4a5568' }} />
      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Process</span>
      <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>{d.description}</p>
      <Handle type="source" position={Position.Bottom} style={{ background: '#4a5568' }} />
    </div>
  );
}

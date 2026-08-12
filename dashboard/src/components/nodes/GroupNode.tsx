export function GroupNode({ data, style }: { data: { label: string; count: number }; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 12,
      border: `1px solid ${style?.borderColor ?? '#1e293b'}`,
      background: style?.background ?? 'rgba(15,22,35,0.4)',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 14,
        transform: 'translateY(-50%)',
        background: '#0a0e1a',
        padding: '3px 10px',
        borderRadius: 20,
        border: `1px solid ${style?.borderColor ?? '#1e293b'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
          {data.label}
        </span>
        <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', borderRadius: 10, padding: '0 5px' }}>
          {data.count}
        </span>
      </div>
    </div>
  );
}

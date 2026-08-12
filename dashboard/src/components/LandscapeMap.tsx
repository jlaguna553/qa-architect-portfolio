import { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ReactFlow, Node, Edge,
  Background, Controls, MiniMap,
  BackgroundVariant, MarkerType,
  useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BusinessFlow, TraceEvent } from '../types';
import { FlowCardNode } from './nodes/FlowCardNode';
import { GroupNode } from './nodes/GroupNode';

const NODE_TYPES = { flowCard: FlowCardNode, group: GroupNode };

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W = 230;
const CARD_H = 92;
const CARD_GAP_X = 14;
const CARD_GAP_Y = 12;
const GROUP_PAD_TOP = 44;
const GROUP_PAD_X = 18;
const GROUP_PAD_BOTTOM = 18;
const GROUP_GAP_X = 32;
const GROUP_GAP_Y = 32;
const MAX_COLS = 2;
const MAX_GROUPS_PER_ROW = 3;

// ─── Module detection ─────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  admin:   'Admin',
  pos:     'POS',
  kitchen: 'Kitchen',
  api:     'API',
  auth:    'Auth',
  lib:     'Services',
};

const MODULE_COLORS: Record<string, string> = {
  admin:   '#1e3a5f',
  pos:     '#14532d',
  kitchen: '#451a03',
  api:     '#3b0764',
  auth:    '#1e293b',
  lib:     '#0f2937',
};

function detectModule(sourceFile: string): string {
  const lower = sourceFile.toLowerCase();
  for (const key of Object.keys(MODULE_LABELS)) {
    if (lower.includes(`/${key}/`) || lower.includes(`/${key}\\`)) return key;
  }
  return 'other';
}

function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function moduleColor(key: string): string {
  return MODULE_COLORS[key] ?? '#1e293b';
}

// ─── Trace counting (separate from layout so layout stays stable) ─────────────
function buildTraceIndex(traces: TraceEvent[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const t of traces) {
    const url = t.request?.url ?? t.ui_event?.url ?? '';
    const method = (t.request?.method ?? '').toUpperCase();
    const key = `${method}::${url}`;
    index.set(key, (index.get(key) ?? 0) + 1);
  }
  return index;
}

function countForFlow(flow: BusinessFlow, index: Map<string, number>): number {
  let total = 0;
  for (const [key, count] of index) {
    const [m, url] = key.split('::');
    if (m === flow.http_method && url.includes(flow.route)) total += count;
  }
  return total;
}

// ─── Graph builder ────────────────────────────────────────────────────────────
function buildNodes(
  flows: BusinessFlow[],
  traceIndex: Map<string, number>,
  onSelectFlow: (id: string) => void,
): Node[] {
  // Group flows by module
  const grouped = new Map<string, BusinessFlow[]>();
  for (const flow of flows) {
    const mod = detectModule(flow.source_file);
    const arr = grouped.get(mod) ?? [];
    arr.push(flow);
    grouped.set(mod, arr);
  }

  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => {
    const order = ['api', 'auth', 'admin', 'pos', 'kitchen', 'lib'];
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
  });

  const nodes: Node[] = [];
  let rowX = 0;
  let rowY = 0;
  let rowMaxH = 0;
  let colInRow = 0;

  for (let gi = 0; gi < sortedGroups.length; gi++) {
    const [modKey, groupFlows] = sortedGroups[gi];

    // Wrap to next row
    if (colInRow >= MAX_GROUPS_PER_ROW) {
      rowY += rowMaxH + GROUP_GAP_Y;
      rowX = 0;
      rowMaxH = 0;
      colInRow = 0;
    }

    const cols = Math.min(groupFlows.length, MAX_COLS);
    const rows = Math.ceil(groupFlows.length / cols);
    const gw = GROUP_PAD_X * 2 + cols * CARD_W + (cols - 1) * CARD_GAP_X;
    const gh = GROUP_PAD_TOP + rows * CARD_H + (rows - 1) * CARD_GAP_Y + GROUP_PAD_BOTTOM;

    const groupId = `group-${gi}`;
    nodes.push({
      id: groupId,
      type: 'group',
      position: { x: rowX, y: rowY },
      style: {
        width: gw,
        height: gh,
        borderColor: moduleColor(modKey) + 'aa',
        background: moduleColor(modKey) + '22',
      },
      data: { label: moduleLabel(modKey), count: groupFlows.length },
      draggable: false,
      selectable: false,
    });

    groupFlows.forEach((flow, fi) => {
      const col = fi % cols;
      const row = Math.floor(fi / cols);
      const traceCount = countForFlow(flow, traceIndex);

      nodes.push({
        id: `flow-${flow.id}`,
        type: 'flowCard',
        position: {
          x: GROUP_PAD_X + col * (CARD_W + CARD_GAP_X),
          y: GROUP_PAD_TOP + row * (CARD_H + CARD_GAP_Y),
        },
        parentId: groupId,
        extent: 'parent' as const,
        draggable: false,
        selectable: false,
        data: {
          flow,
          traceCount,
          onClick: () => onSelectFlow(flow.id),
        },
      });
    });

    rowMaxH = Math.max(rowMaxH, gh);
    rowX += gw + GROUP_GAP_X;
    colInRow++;
  }

  return nodes;
}

// ─── Inner component (inside ReactFlowProvider) ───────────────────────────────
interface InnerProps {
  flows: BusinessFlow[];
  traces: TraceEvent[];
  onSelectFlow: (id: string) => void;
}

function LandscapeInner({ flows, traces, onSelectFlow }: InnerProps) {
  const { fitView } = useReactFlow();
  const fitted = useRef(false);

  // Layout nodes only depend on flows (stable) — NOT traces
  const stableNodes = useMemo(
    () => buildNodes(flows, new Map(), onSelectFlow),
    [flows, onSelectFlow],
  );

  // Trace counts overlaid separately so layout never re-runs
  const traceIndex = useMemo(() => buildTraceIndex(traces), [traces]);

  const nodes: Node[] = useMemo(() => stableNodes.map(n => {
    if (n.type !== 'flowCard') return n;
    const flow = (n.data as { flow: BusinessFlow }).flow;
    return {
      ...n,
      data: {
        ...n.data,
        traceCount: countForFlow(flow, traceIndex),
      },
    };
  }), [stableNodes, traceIndex]);

  // Build cross-module edges for flows that share a route pattern
  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    const routeMap = new Map<string, string[]>();
    for (const n of stableNodes) {
      if (n.type !== 'flowCard') continue;
      const flow = (n.data as { flow: BusinessFlow }).flow;
      const arr = routeMap.get(flow.route) ?? [];
      arr.push(n.id);
      routeMap.set(flow.route, arr);
    }
    for (const ids of routeMap.values()) {
      for (let i = 1; i < ids.length; i++) {
        result.push({
          id: `edge-${ids[0]}-${ids[i]}`,
          source: ids[0],
          target: ids[i],
          style: { stroke: '#334155', strokeDasharray: '4 4', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#334155', width: 12, height: 12 },
          animated: false,
        });
      }
    }
    return result;
  }, [stableNodes]);

  // Fit view only once on first layout
  const handleInit = useCallback(() => {
    if (!fitted.current) {
      fitted.current = true;
      fitView({ padding: 0.08, duration: 400 });
    }
  }, [fitView]);

  // Re-fit when flow count changes (new analysis run)
  const prevFlowCount = useRef(flows.length);
  useEffect(() => {
    if (flows.length !== prevFlowCount.current) {
      prevFlowCount.current = flows.length;
      fitted.current = false;
    }
  }, [flows.length]);

  if (flows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 14 }}>
        No flows yet — run <code style={{ margin: '0 6px', background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>qa-architect analyze</code> first.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onInit={handleInit}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1e293b" />
      <Controls showInteractive={false} style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 6 }} />
      <MiniMap
        style={{ background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 6 }}
        nodeColor={n => n.type === 'group' ? '#1e293b' : '#1d4ed8'}
        maskColor="rgba(0,0,0,0.65)"
      />
    </ReactFlow>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
interface LandscapeMapProps {
  flows: BusinessFlow[];
  traces: TraceEvent[];
  onSelectFlow: (flowId: string) => void;
}

export function LandscapeMap(props: LandscapeMapProps) {
  return (
    <ReactFlowProvider>
      <LandscapeInner {...props} />
    </ReactFlowProvider>
  );
}

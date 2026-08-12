import { useCallback, useMemo } from 'react';
import { ReactFlow, Node, Edge, Background, Controls, MiniMap, BackgroundVariant, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConditionalNode } from './nodes/ConditionalNode';
import { ScenarioNode } from './nodes/ScenarioNode';
import { ProcessNode } from './nodes/ProcessNode';
import { BusinessFlow, ConditionalStep, FinalScenarioStep, ProcessStep, TraceEvent } from '../types';
import { matchTracesToFlows } from '../hooks/useTraces';

const NODE_TYPES = { conditional: ConditionalNode, scenario: ScenarioNode, process: ProcessNode };
const H_GAP = 320;
const V_GAP = 150;

function buildGraph(
  flow: BusinessFlow,
  matchMap: Map<string, TraceEvent[]>,
  onSelect: (traces: TraceEvent[], stepId: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const positions = new Map<string, { x: number; y: number }>();

  function assignPos(stepId: string, x: number, y: number, visited = new Set<string>()): void {
    if (visited.has(stepId) || positions.has(stepId)) return;
    visited.add(stepId);
    positions.set(stepId, { x, y });
    const step = flow.steps.find(s => s.id === stepId);
    if (!step) return;
    if (step.type === 'conditional') {
      const s = step as ConditionalStep;
      assignPos(s.true_branch, x - H_GAP / 2, y + V_GAP, visited);
      assignPos(s.false_branch, x + H_GAP / 2, y + V_GAP, visited);
    } else if (step.type === 'process') {
      assignPos((step as ProcessStep).next, x, y + V_GAP, visited);
    }
  }

  assignPos(flow.initial_step, 0, 0);

  for (const step of flow.steps) {
    const pos = positions.get(step.id) ?? { x: 0, y: 0 };
    const key = `${flow.id}::${step.id}`;
    const matched = matchMap.get(key) ?? [];
    const isHighlighted = matched.length > 0;

    if (step.type === 'conditional') {
      const s = step as ConditionalStep;
      nodes.push({ id: step.id, type: 'conditional', position: pos, data: { description: s.description, condition: s.condition, isHighlighted } });
      edges.push({ id: `${s.id}-t`, source: s.id, target: s.true_branch, sourceHandle: 'true', label: 'Yes', labelStyle: { fill: '#4ade80', fontWeight: 600, fontSize: 11 }, style: { stroke: '#22c55e', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } });
      edges.push({ id: `${s.id}-f`, source: s.id, target: s.false_branch, sourceHandle: 'false', label: 'No', labelStyle: { fill: '#f87171', fontWeight: 600, fontSize: 11 }, style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } });
    } else if (step.type === 'final_scenario') {
      const s = step as FinalScenarioStep;
      nodes.push({ id: step.id, type: 'scenario', position: pos, data: { description: s.description, is_success: s.is_success, expected_http_code: s.expected_http_code, error_category: s.error_category, isHighlighted, traceCount: matched.length, onClick: isHighlighted ? () => onSelect(matched, step.id) : undefined } });
    } else if (step.type === 'process') {
      const s = step as ProcessStep;
      nodes.push({ id: step.id, type: 'process', position: pos, data: { description: s.description } });
      edges.push({ id: `${s.id}-n`, source: s.id, target: s.next, style: { stroke: '#475569', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
    }
  }

  return { nodes, edges };
}

interface RuleGraphProps {
  flow: BusinessFlow;
  traces: TraceEvent[];
  allFlows: BusinessFlow[];
  onSelectTrace: (traces: TraceEvent[], stepId: string, flowId: string) => void;
}

export function RuleGraph({ flow, traces, allFlows, onSelectTrace }: RuleGraphProps) {
  const matchMap = useMemo(() => {
    const raw = matchTracesToFlows(traces, allFlows);
    const simplified = new Map<string, TraceEvent[]>();
    for (const [key, matched] of raw.entries()) simplified.set(key, matched.map(m => m.trace));
    return simplified;
  }, [traces, allFlows]);

  const handleSelect = useCallback((traceList: TraceEvent[], stepId: string) => {
    onSelectTrace(traceList, stepId, flow.id);
  }, [flow.id, onSelectTrace]);

  const { nodes, edges } = useMemo(() => buildGraph(flow, matchMap, handleSelect), [flow, matchMap, handleSelect]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={NODE_TYPES} fitView fitViewOptions={{ padding: 0.2 }} colorMode="dark">
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls style={{ background: '#1a2035', border: '1px solid #334155' }} />
        <MiniMap style={{ background: '#0f1117', border: '1px solid #334155' }}
          nodeColor={node => {
            if (node.type === 'scenario') { const d = node.data as { is_success: boolean; isHighlighted: boolean }; if (d.isHighlighted) return d.is_success ? '#4ade80' : '#f97316'; return d.is_success ? '#16a34a' : '#dc2626'; }
            if (node.type === 'conditional') return '#f59e0b';
            return '#475569';
          }} />
      </ReactFlow>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Zap, CheckCircle2, X } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const EntityGraphPage: React.FC = () => {
  const [highlightDeployment, setHighlightDeployment] = useState(true);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any | null>(null);

  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: 'svc-checkout',
        type: 'default',
        position: { x: 50, y: 150 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#cc8b3c] font-bold uppercase tracking-wider">SERVICE</span>
                <span className="text-[9px] bg-[rgba(76,175,125,0.2)] text-[#60d49a] px-1.5 py-0.2 rounded font-mono font-bold">HEALTHY</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">checkout-api</div>
              <div className="text-[10px] text-[#888] font-mono">v2.1.0 • prod-us-east</div>
            </div>
          ),
        },
        style: {
          background: '#252525',
          border: '1px solid #cc8b3c',
          borderRadius: '14px',
          width: 200,
          color: '#ececec',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        },
      },
      {
        id: 'cmp-pool',
        type: 'default',
        position: { x: 310, y: 150 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#d4a843] font-bold uppercase tracking-wider">COMPONENT</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${highlightDeployment ? 'bg-[rgba(220,170,60,0.25)] text-[#e8c060]' : 'bg-[#333] text-[#888]'}`}>
                  {highlightDeployment ? 'MUTATED' : 'STABLE'}
                </span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">pg-pool / db-conn</div>
              <div className="text-[10px] text-[#888] font-mono">Altered in Deploy v2.1.0</div>
            </div>
          ),
        },
        style: {
          background: highlightDeployment ? '#2c251d' : '#252525',
          border: highlightDeployment ? '1px solid #d4a843' : '1px solid #484848',
          borderRadius: '14px',
          width: 210,
          color: '#ececec',
        },
      },
      {
        id: 'mem-001',
        type: 'default',
        position: { x: 620, y: 60 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#60d49a] font-bold uppercase tracking-wider">ACTIVE MEMORY</span>
                <span className="text-[9px] bg-[rgba(76,175,125,0.25)] text-[#60d49a] px-1.5 py-0.2 rounded font-mono font-bold">TRUST: 1.00</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">mem-001: Pool Max: 50</div>
              <div className="text-[10px] text-[#b4b4b4]">Human-approved resolution</div>
            </div>
          ),
        },
        style: {
          background: '#212a23',
          border: '1px solid #4caf7d',
          borderRadius: '14px',
          width: 220,
          color: '#ececec',
        },
      },
      {
        id: 'mem-004',
        type: 'default',
        position: { x: 620, y: 240 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#d4a843] font-bold uppercase tracking-wider">STALE MEMORY</span>
                <span className="text-[9px] bg-[rgba(220,170,60,0.2)] text-[#e8c060] px-1.5 py-0.2 rounded font-mono font-bold">INVALIDATED</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">mem-004: pg_ctlcluster</div>
              <div className="text-[10px] text-[#888] italic">Obsolete Postgres fix</div>
            </div>
          ),
        },
        style: {
          background: '#26221c',
          border: '1px solid #d4a843',
          borderRadius: '14px',
          width: 220,
          color: '#ececec',
          opacity: 0.85,
        },
      },
      {
        id: 'dep-webhook',
        type: 'default',
        position: { x: 310, y: 340 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#c4a5f5] font-bold uppercase tracking-wider">EVENT (W2)</span>
                <span className="text-[9px] bg-[rgba(168,130,220,0.2)] text-[#c4a5f5] px-1.5 py-0.2 rounded font-mono font-bold">GITHUB HOOK</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">Deploy Event v2.1.0</div>
              <div className="text-[10px] text-[#888] font-mono">n8n Automated Workflow</div>
            </div>
          ),
        },
        style: {
          background: '#27222c',
          border: '1px solid #a855f7',
          borderRadius: '14px',
          width: 210,
          color: '#ececec',
        },
      },
      {
        id: 'ent-mongodb',
        type: 'default',
        position: { x: 50, y: 340 },
        data: {
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#60d49a] font-bold uppercase tracking-wider">INFRA ENTITY</span>
                <span className="text-[9px] bg-[rgba(76,175,125,0.2)] text-[#60d49a] px-1.5 py-0.2 rounded font-mono font-bold">PRIMARY</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">MongoDB Atlas</div>
              <div className="text-[10px] text-[#888] font-mono">Cluster shakti2-primary</div>
            </div>
          ),
        },
        style: {
          background: '#212a23',
          border: '1px solid #4caf7d',
          borderRadius: '14px',
          width: 200,
          color: '#ececec',
        },
      },
    ],
    [highlightDeployment]
  );

  const initialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e1',
        source: 'svc-checkout',
        target: 'cmp-pool',
        label: 'depends_on',
        animated: true,
        style: { stroke: '#cc8b3c', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#cc8b3c' },
      },
      {
        id: 'e2',
        source: 'cmp-pool',
        target: 'mem-001',
        label: 'governed_by',
        style: { stroke: '#4caf7d', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf7d' },
      },
      {
        id: 'e3',
        source: 'cmp-pool',
        target: 'mem-004',
        label: 'invalidated_fix',
        style: { stroke: '#d4a843', strokeWidth: 2, strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#d4a843' },
      },
      {
        id: 'e4',
        source: 'dep-webhook',
        target: 'cmp-pool',
        label: 'altered_components',
        animated: true,
        style: { stroke: '#a855f7', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      },
      {
        id: 'e5',
        source: 'svc-checkout',
        target: 'ent-mongodb',
        label: 'persists_to',
        style: { stroke: '#4caf7d', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf7d' },
      },
    ],
    []
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeInfo(node);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(204,139,60,0.18)] border border-[rgba(204,139,60,0.35)] flex items-center justify-center text-[#cc8b3c] shadow-sm">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#f0f0f0]">Entity Graph</h1>
              <Badge variant="primary" size="sm">React Flow &amp; $graphLookup</Badge>
            </div>
            <p className="text-xs text-[#b4b4b4] mt-0.5">
              Interactive topological relationship graph mapping services, components, deployment events, and governing memory bindings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setHighlightDeployment(!highlightDeployment)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
            highlightDeployment
              ? 'bg-[rgba(204,139,60,0.2)] text-[#f0aa55] border-[rgba(204,139,60,0.4)] shadow-md'
              : 'card text-[#888] hover:text-[#ececec]'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#cc8b3c]" />
          <span>{highlightDeployment ? 'Deployment Invalidation: ACTIVE' : 'Neutral View'}</span>
        </button>
      </div>

      {/* React Flow Graph Visualizer Canvas */}
      <div className="card rounded-3xl overflow-hidden shadow-2xl relative h-[540px] border-[#383838]">
        {/* Floating Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-[#1e1e1e]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#383838] text-xs font-mono text-[#b4b4b4] shadow-xl">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#cc8b3c]" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#d4a843]" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4caf7d]" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e05c5c]" />
            <span>Stale / Invalid</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
            <span>Deploy Event</span>
          </div>
        </div>

        {/* Interactive React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          className="bg-[#1a1a1a]"
        >
          <Background color="#383838" gap={20} size={1} />
          <Controls className="bg-[#252525] border-[#383838] text-[#ececec] fill-[#ececec] stroke-[#ececec] shadow-xl rounded-xl" />
          <MiniMap
            nodeColor={(n) => {
              if (n.id.includes('svc')) return '#cc8b3c';
              if (n.id.includes('cmp')) return '#d4a843';
              if (n.id.includes('001')) return '#4caf7d';
              if (n.id.includes('004')) return '#e05c5c';
              return '#a855f7';
            }}
            className="bg-[#252525] border border-[#383838] rounded-xl overflow-hidden shadow-2xl"
          />
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 card border-[rgba(204,139,60,0.4)] p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in bg-[#252525]/95">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-[#cc8b3c] shrink-0" />
              <div>
                <span className="font-bold font-mono text-[#f0aa55] text-xs">
                  Active Entity: {selectedNodeInfo.id}
                </span>
                <p className="text-[11px] text-[#b4b4b4] mt-0.5 leading-relaxed">
                  Interactive topological entity verified. Governing memories and dependent services are bound via bi-directional invariant checks.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-[#888] hover:text-[#ececec] p-1 rounded-lg hover:bg-[#333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

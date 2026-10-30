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
import { Network, Zap, CheckCircle2, ShieldCheck, Database, Layers, Radio } from 'lucide-react';
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
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">SERVICE</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">HEALTHY</span>
              </div>
              <div className="text-xs font-bold text-white">checkout-api</div>
              <div className="text-[10px] text-slate-400 font-mono">v2.1.0 • prod-us-east</div>
            </div>
          ),
        },
        style: {
          background: '#0d1322',
          border: '1px solid #4f46e5',
          borderRadius: '12px',
          width: 190,
          color: '#fff',
        },
      },
      {
        id: 'cmp-pool',
        type: 'default',
        position: { x: 300, y: 150 },
        data: {
          label: (
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">COMPONENT</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${highlightDeployment ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                  {highlightDeployment ? 'REFACTORED' : 'STABLE'}
                </span>
              </div>
              <div className="text-xs font-bold text-white">pg-pool / db-conn</div>
              <div className="text-[10px] text-slate-400 font-mono">Altered in Deploy v2.1.0</div>
            </div>
          ),
        },
        style: {
          background: highlightDeployment ? '#1f1609' : '#0d1322',
          border: highlightDeployment ? '1px solid #f59e0b' : '1px solid #06b6d4',
          borderRadius: '12px',
          width: 200,
          color: '#fff',
        },
      },
      {
        id: 'mem-001',
        type: 'default',
        position: { x: 600, y: 60 },
        data: {
          label: (
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">ACTIVE MEMORY</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">TRUST: 1.00</span>
              </div>
              <div className="text-xs font-bold text-white">mem-001: Pool Max: 50</div>
              <div className="text-[10px] text-slate-300">Human-approved resolution</div>
            </div>
          ),
        },
        style: {
          background: '#0a1a14',
          border: '1px solid #10b981',
          borderRadius: '12px',
          width: 210,
          color: '#fff',
        },
      },
      {
        id: 'mem-004',
        type: 'default',
        position: { x: 600, y: 240 },
        data: {
          label: (
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">STALE MEMORY</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">INVALIDATED</span>
              </div>
              <div className="text-xs font-bold text-white">mem-004: pg_ctlcluster</div>
              <div className="text-[10px] text-slate-400 italic">Obsolete Postgres fix</div>
            </div>
          ),
        },
        style: {
          background: '#19110a',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          width: 210,
          color: '#fff',
          opacity: 0.85,
        },
      },
      {
        id: 'dep-webhook',
        type: 'default',
        position: { x: 300, y: 340 },
        data: {
          label: (
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">EVENT (W2)</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono">GITHUB HOOK</span>
              </div>
              <div className="text-xs font-bold text-white">Deploy Event v2.1.0</div>
              <div className="text-[10px] text-slate-400 font-mono">n8n Automated Workflow</div>
            </div>
          ),
        },
        style: {
          background: '#140c24',
          border: '1px solid #a855f7',
          borderRadius: '12px',
          width: 200,
          color: '#fff',
        },
      },
      {
        id: 'ent-mongodb',
        type: 'default',
        position: { x: 50, y: 340 },
        data: {
          label: (
            <div className="p-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">INFRA ENTITY</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">PRIMARY</span>
              </div>
              <div className="text-xs font-bold text-white">MongoDB Atlas</div>
              <div className="text-[10px] text-slate-400 font-mono">Cluster shakti2-primary</div>
            </div>
          ),
        },
        style: {
          background: '#091512',
          border: '1px solid #059669',
          borderRadius: '12px',
          width: 190,
          color: '#fff',
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
        style: { stroke: '#818cf8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
      },
      {
        id: 'e2',
        source: 'cmp-pool',
        target: 'mem-001',
        label: 'governed_by',
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      },
      {
        id: 'e3',
        source: 'cmp-pool',
        target: 'mem-004',
        label: 'invalidated_fix',
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      },
      {
        id: 'e4',
        source: 'dep-webhook',
        target: 'cmp-pool',
        label: 'altered_components',
        animated: true,
        style: { stroke: '#c084fc', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' },
      },
      {
        id: 'e5',
        source: 'svc-checkout',
        target: 'ent-mongodb',
        label: 'persists_to',
        style: { stroke: '#34d399', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#34d399' },
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Entity Graph</h1>
            <Badge variant="purple">React Flow & $graphLookup</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Interactive topological relationship graph mapping services, infrastructure dependencies, deployment events, and governing memories.
          </p>
        </div>

        <button
          onClick={() => setHighlightDeployment(!highlightDeployment)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            highlightDeployment
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-[#111726] text-slate-400 border-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{highlightDeployment ? 'Deployment Invalidation: ON' : 'Neutral View'}</span>
        </button>
      </div>

      {/* React Flow Graph Visualizer Container */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-3xl overflow-hidden shadow-2xl relative h-[520px]">
        {/* Floating Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-[#0a0d14]/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Stale Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
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
          className="bg-[#0a0d14]"
        >
          <Background color="#1f293d" gap={18} size={1} />
          <Controls className="bg-[#111726] border-slate-700 text-white fill-white stroke-white" />
          <MiniMap
            nodeColor={(n) => {
              if (n.id.includes('svc')) return '#6366f1';
              if (n.id.includes('cmp')) return '#06b6d4';
              if (n.id.includes('001')) return '#10b981';
              if (n.id.includes('004')) return '#f59e0b';
              return '#a855f7';
            }}
            className="bg-[#0d121f] border border-slate-800 rounded-xl overflow-hidden"
          />
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-[#0d121f]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-bold font-mono text-white text-xs">
                  Selected Entity: {selectedNodeInfo.id}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click and drag nodes to explore the dependency graph topology or click anywhere to inspect relationships.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

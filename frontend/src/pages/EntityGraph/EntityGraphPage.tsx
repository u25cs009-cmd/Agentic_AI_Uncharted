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
import { Network, Zap, CheckCircle2, ShieldCheck, Database, Layers, Radio, Sparkles, X } from 'lucide-react';
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
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">SERVICE</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">HEALTHY</span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">checkout-api</div>
              <div className="text-[10px] text-slate-400 font-mono">v2.1.0 • prod-us-east</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(10, 16, 30, 0.9)',
          border: '1px solid #06b6d4',
          borderRadius: '14px',
          width: 200,
          color: '#fff',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
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
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">COMPONENT</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${highlightDeployment ? 'bg-amber-500/25 text-amber-300 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                  {highlightDeployment ? 'MUTATED' : 'STABLE'}
                </span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">pg-pool / db-conn</div>
              <div className="text-[10px] text-slate-400 font-mono">Altered in Deploy v2.1.0</div>
            </div>
          ),
        },
        style: {
          background: highlightDeployment ? 'rgba(35, 20, 8, 0.9)' : 'rgba(10, 16, 30, 0.9)',
          border: highlightDeployment ? '1px solid #f59e0b' : '1px solid #06b6d4',
          borderRadius: '14px',
          width: 210,
          color: '#fff',
          boxShadow: highlightDeployment ? '0 0 18px rgba(245, 158, 11, 0.25)' : 'none',
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
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">ACTIVE MEMORY</span>
                <span className="text-[9px] bg-emerald-500/25 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">TRUST: 1.00</span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">mem-001: Pool Max: 50</div>
              <div className="text-[10px] text-slate-300">Human-approved resolution</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(8, 26, 18, 0.9)',
          border: '1px solid #10b981',
          borderRadius: '14px',
          width: 220,
          color: '#fff',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
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
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">STALE MEMORY</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">INVALIDATED</span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">mem-004: pg_ctlcluster</div>
              <div className="text-[10px] text-slate-400 italic">Obsolete Postgres fix</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(25, 16, 8, 0.9)',
          border: '1px solid #f59e0b',
          borderRadius: '14px',
          width: 220,
          color: '#fff',
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
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">EVENT (W2)</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">GITHUB HOOK</span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">Deploy Event v2.1.0</div>
              <div className="text-[10px] text-slate-400 font-mono">n8n Automated Workflow</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(22, 12, 38, 0.9)',
          border: '1px solid #a855f7',
          borderRadius: '14px',
          width: 210,
          color: '#fff',
          boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
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
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">INFRA ENTITY</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">PRIMARY</span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide">MongoDB Atlas</div>
              <div className="text-[10px] text-slate-400 font-mono">Cluster shakti2-primary</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(8, 22, 18, 0.9)',
          border: '1px solid #059669',
          borderRadius: '14px',
          width: 200,
          color: '#fff',
          boxShadow: '0 0 15px rgba(5, 150, 105, 0.2)',
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
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Entity Graph</h1>
              <Badge variant="purple" size="sm" glow>React Flow & $graphLookup</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive topological relationship graph mapping services, components, deployment events, and governing memory bindings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setHighlightDeployment(!highlightDeployment)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
            highlightDeployment
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'glass-panel text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{highlightDeployment ? 'Deployment Invalidation: ACTIVE' : 'Neutral View'}</span>
        </button>
      </div>

      {/* React Flow Graph Visualizer Canvas */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl relative h-[540px] border-slate-800">
        {/* Floating Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-xl">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span>Stale / Invalid</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
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
          className="bg-[#07090e]"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-slate-900 border-slate-700 text-white fill-white stroke-white shadow-xl rounded-xl" />
          <MiniMap
            nodeColor={(n) => {
              if (n.id.includes('svc')) return '#06b6d4';
              if (n.id.includes('cmp')) return '#f59e0b';
              if (n.id.includes('001')) return '#10b981';
              if (n.id.includes('004')) return '#f43f5e';
              return '#a855f7';
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
          />
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 glass-panel border-cyan-500/40 p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in bg-slate-950/90">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold font-mono text-cyan-300 text-xs">
                  Active Entity: {selectedNodeInfo.id}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Interactive topological entity verified. Governing memories and dependent services are bound via bi-directional invariant checks.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Network, Zap, CheckCircle2, ShieldCheck, Database, Layers, Radio, Sparkles, X, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';

export const EntityGraphPage: React.FC = () => {
  const [highlightDeployment, setHighlightDeployment] = useState(true);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch live memories from MongoDB / API
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMemories();
      if (Array.isArray(data) && data.length > 0) {
        setMemories(data);
      }
    } catch (err) {
      console.warn('EntityGraph: fallback to default mock memories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Generate topological nodes & edges dynamically from live memories
  const { generatedNodes, generatedEdges } = useMemo(() => {
    const baseNodes: Node[] = [
      {
        id: 'svc-checkout',
        type: 'default',
        position: { x: 50, y: 150 },
        data: {
          title: 'checkout-api',
          kind: 'Service',
          status: 'HEALTHY',
          details: 'v2.1.0 • prod-us-east • Primary microservice gateway',
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
          title: 'pg-pool / db-conn',
          kind: 'Component',
          status: highlightDeployment ? 'MUTATED' : 'STABLE',
          details: 'Altered in Deploy v2.1.0 (Pool bounds reconfigured)',
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
        id: 'dep-webhook',
        type: 'default',
        position: { x: 310, y: 340 },
        data: {
          title: 'Deploy Event v2.1.0',
          kind: 'Deployment Event',
          status: 'GITHUB HOOK',
          details: 'n8n Automated Workflow W2: Invalidated dependent Postgres memories',
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
          title: 'MongoDB Atlas',
          kind: 'Infra Entity',
          status: 'PRIMARY',
          details: 'Cluster shakti2-primary • Governed Vector & Graph Collection',
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
    ];

    const baseEdges: Edge[] = [
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
    ];

    // Select dynamic memories to display (up to 4 representative items)
    const displayMemories = memories.length > 0
      ? memories.slice(0, 4)
      : [
          {
            _id: 'mem-001',
            type: 'procedural',
            status: 'active',
            trust: 1.0,
            confidence: 0.95,
            attribute_key: 'db_pool_max',
            value: '50',
            content: 'Set max_connections=50 for checkout-api under high load.',
            owner: 'SRE-Lead',
          } as any,
          {
            _id: 'mem-004',
            type: 'procedural',
            status: 'stale',
            trust: 0.4,
            confidence: 0.3,
            attribute_key: 'pg_ctlcluster',
            value: 'restart',
            content: 'Legacy Postgres fix: run pg_ctlcluster 14 main reload.',
            owner: 'legacy-system',
          } as any,
        ];

    const memoryNodes: Node[] = displayMemories.map((mem, idx) => {
      const isStale = mem.status === 'stale' || mem.status === 'expired';
      const isQuarantined = mem.status === 'quarantined';
      const isActive = mem.status === 'active';
      const memId = mem._id || (mem as any).id || `mem-${idx + 1}`;
      const title = mem.attribute_key ? `${memId}: ${mem.attribute_key}` : `${memId}: ${mem.content.slice(0, 22)}`;
      const subtitle = mem.value ? `Value: ${mem.value}` : mem.content.slice(0, 28);

      let borderCol = '#06b6d4';
      let bgCol = 'rgba(10, 16, 30, 0.9)';
      let badgeBg = 'bg-cyan-500/20 text-cyan-300';
      let statusLabel = mem.status.toUpperCase();
      let headerCol = 'text-cyan-400';

      if (isActive) {
        borderCol = '#10b981';
        bgCol = 'rgba(8, 26, 18, 0.9)';
        badgeBg = 'bg-emerald-500/25 text-emerald-300';
        headerCol = 'text-emerald-400';
        statusLabel = `TRUST: ${(mem.trust || 1.0).toFixed(2)}`;
      } else if (isStale) {
        borderCol = '#f59e0b';
        bgCol = highlightDeployment ? 'rgba(35, 18, 8, 0.9)' : 'rgba(25, 16, 8, 0.9)';
        badgeBg = 'bg-amber-500/20 text-amber-300';
        headerCol = 'text-amber-400';
        statusLabel = 'INVALIDATED';
      } else if (isQuarantined) {
        borderCol = '#f43f5e';
        bgCol = 'rgba(35, 10, 15, 0.9)';
        badgeBg = 'bg-rose-500/20 text-rose-300';
        headerCol = 'text-rose-400';
        statusLabel = 'QUARANTINED';
      }

      return {
        id: memId,
        type: 'default',
        position: { x: 620, y: 50 + idx * 115 },
        data: {
          title,
          kind: `${mem.type ? mem.type.toUpperCase() : 'GOVERNED'} MEMORY`,
          status: mem.status.toUpperCase(),
          details: mem.content,
          trust: mem.trust,
          confidence: mem.confidence,
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono ${headerCol} font-bold uppercase tracking-wider`}>
                  {mem.type ? mem.type.toUpperCase() : 'MEMORY'}
                </span>
                <span className={`text-[9px] ${badgeBg} px-1.5 py-0.2 rounded font-mono font-bold`}>
                  {statusLabel}
                </span>
              </div>
              <div className="text-xs font-bold text-white tracking-wide truncate max-w-[190px]">{title}</div>
              <div className="text-[10px] text-slate-300 truncate max-w-[190px]">{subtitle}</div>
            </div>
          ),
        },
        style: {
          background: bgCol,
          border: `1px solid ${borderCol}`,
          borderRadius: '14px',
          width: 220,
          color: '#fff',
          boxShadow: isStale && highlightDeployment ? '0 0 16px rgba(245, 158, 11, 0.3)' : `0 0 14px ${borderCol}33`,
        },
      };
    });

    const memoryEdges: Edge[] = displayMemories.map((mem, idx) => {
      const isStale = mem.status === 'stale' || mem.status === 'expired';
      const isQuarantined = mem.status === 'quarantined';
      const memId = mem._id || (mem as any).id || `mem-${idx + 1}`;

      let strokeCol = '#10b981';
      let edgeLabel = 'governed_by';
      let dashed = false;

      if (isStale) {
        strokeCol = '#f59e0b';
        edgeLabel = 'invalidated_fix';
        dashed = true;
      } else if (isQuarantined) {
        strokeCol = '#f43f5e';
        edgeLabel = 'quarantined';
        dashed = true;
      }

      return {
        id: `e-mem-${memId}`,
        source: 'cmp-pool',
        target: memId,
        label: edgeLabel,
        style: {
          stroke: strokeCol,
          strokeWidth: 2,
          strokeDasharray: dashed ? '4 4' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeCol },
      };
    });

    return {
      generatedNodes: [...baseNodes, ...memoryNodes],
      generatedEdges: [...baseEdges, ...memoryEdges],
    };
  }, [memories, highlightDeployment]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generatedEdges);

  // Sync state when generated nodes/edges change
  useEffect(() => {
    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

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
              <Badge variant="purple" size="sm" glow>Live MongoDB & $graphLookup</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive topological relationship graph mapping services, components, deployment events, and governing memory bindings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchGraphData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-700 glass-panel text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all shadow-sm"
            title="Refresh Live Topology from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
            <span>Sync Live DB</span>
          </button>

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
      </div>

      {/* React Flow Graph Visualizer Canvas */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl relative h-[560px] border-slate-800">
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
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span>Stale / Invalid</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span>Quarantined</span>
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
              if (n.id.includes('ent')) return '#059669';
              if (n.data?.status === 'ACTIVE') return '#10b981';
              if (n.data?.status === 'STALE' || n.data?.status === 'INVALIDATED') return '#f59e0b';
              if (n.data?.status === 'QUARANTINED') return '#f43f5e';
              return '#a855f7';
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
          />
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 glass-panel border-cyan-500/40 p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in bg-slate-950/95 backdrop-blur-md">
            <div className="flex items-start space-x-3 max-w-3xl">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold font-mono text-cyan-300 text-xs">
                    {selectedNodeInfo.data?.title || selectedNodeInfo.id}
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {selectedNodeInfo.data?.kind || 'ENTITY'}
                  </span>
                  {selectedNodeInfo.data?.status && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold">
                      {selectedNodeInfo.data.status}
                    </span>
                  )}
                  {selectedNodeInfo.data?.trust !== undefined && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      Trust: {selectedNodeInfo.data.trust}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {selectedNodeInfo.data?.details || 'Topological entity mapped in memory graph. Invariant and governance checks active.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

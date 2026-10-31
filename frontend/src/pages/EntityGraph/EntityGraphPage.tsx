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
import { Network, Zap, CheckCircle2, RefreshCw, X, Layers } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';

export const EntityGraphPage: React.FC = () => {
  const [highlightDeployment, setHighlightDeployment] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(false);
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
                <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase tracking-wider">SERVICE</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">HEALTHY</span>
              </div>
              <div className="text-xs font-bold text-slate-900 tracking-wide">checkout-api</div>
              <div className="text-[10px] text-slate-500 font-mono">v2.1.0 • prod-us-east</div>
            </div>
          ),
        },
        style: {
          background: '#ffffff',
          border: '1px solid #6366f1',
          borderRadius: '14px',
          width: 200,
          color: '#0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
                <span className="text-[10px] font-mono text-sky-700 font-bold uppercase tracking-wider">COMPONENT</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${highlightDeployment ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                  {highlightDeployment ? 'MUTATED' : 'STABLE'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 tracking-wide">pg-pool / db-conn</div>
              <div className="text-[10px] text-slate-500 font-mono">Altered in Deploy v2.1.0</div>
            </div>
          ),
        },
        style: {
          background: highlightDeployment ? '#fffbeb' : '#ffffff',
          border: highlightDeployment ? '1px solid #f59e0b' : '1px solid #0284c7',
          borderRadius: '14px',
          width: 210,
          color: '#0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
                <span className="text-[10px] font-mono text-purple-700 font-bold uppercase tracking-wider">EVENT (W2)</span>
                <span className="text-[9px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-mono font-bold">GITHUB HOOK</span>
              </div>
              <div className="text-xs font-bold text-slate-900 tracking-wide">Deploy Event v2.1.0</div>
              <div className="text-[10px] text-slate-500 font-mono">Triggered Invalidation (W2)</div>
            </div>
          ),
        },
        style: {
          background: '#faf5ff',
          border: '1px dashed #a855f7',
          borderRadius: '14px',
          width: 210,
          color: '#0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
      {
        id: 'ent-mongodb',
        type: 'default',
        position: { x: 50, y: 340 },
        data: {
          title: 'Primary Database',
          kind: 'Infrastructure DB',
          status: 'PRIMARY',
          details: 'Production Data Store • ANCHOR Vector index active',
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider">INFRASTRUCTURE</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">PRIMARY</span>
              </div>
              <div className="text-xs font-bold text-slate-900 tracking-wide">Primary Database</div>
              <div className="text-[10px] text-slate-500 font-mono">Production Data Store</div>
            </div>
          ),
        },
        style: {
          background: '#f0fdf4',
          border: '1px solid #16a34a',
          borderRadius: '14px',
          width: 200,
          color: '#0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
        label: 'mutated',
        animated: true,
        style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '3 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      },
      {
        id: 'e5',
        source: 'svc-checkout',
        target: 'ent-mongodb',
        label: 'persists_to',
        style: { stroke: '#4caf7d', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf7d' },
      },
    ];

    // Map memories to nodes dynamically
    const memoryNodes: Node[] = [];
    const memoryEdges: Edge[] = [];

    const activeMemories = memories.length > 0 ? memories : [
      { _id: 'mem-001', id: 'mem-001', content: 'Checkout DB timeouts fixed by pool max_connections: 50', status: 'active', trust: 1.0, type: 'semantic', attribute_key: 'pool_size' },
      { _id: 'mem-004', id: 'mem-004', content: 'Restart local postgresql via pg_ctlcluster', status: 'stale', trust: 0.2, type: 'procedural', attribute_key: 'legacy_db' },
      { _id: 'mem-006', id: 'mem-006', content: 'Ignore validation checks during peak promo hours', status: 'quarantined', trust: 0.0, type: 'episodic', attribute_key: 'bypass' }
    ];

    activeMemories.forEach((mem, index) => {
      const statusUpper = (mem.status || 'ACTIVE').toUpperCase();
      const isStale = statusUpper === 'STALE' || statusUpper === 'INVALIDATED';
      const isQuarantined = statusUpper === 'QUARANTINED';
      const isActive = !isStale && !isQuarantined;

      const yOffset = 50 + (index * 110);
      const memId = String(mem.id || (mem as any)._id || `mem-${index}`);
      const nodeId = memId;
      const memKey = (mem as any).attribute_key || (mem as any).metadata?.key || 'governed';

      const isSuperseded = statusUpper === 'SUPERSEDED';
      const isExpiredOrDeleted = statusUpper === 'EXPIRED' || statusUpper === 'DELETED';

      // Status colors matching D2 palette (active green, stale amber, quarantined red, superseded slate, expired/deleted muted)
      let borderColor = '#22c55e';
      let bgColor = '#f0fdf4';
      let statusColor = 'text-emerald-700';
      let badgeBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';

      if (isStale) {
        borderColor = '#f59e0b';
        bgColor = '#fffbeb';
        statusColor = 'text-amber-800';
        badgeBg = 'bg-amber-50 text-amber-800 border border-amber-200';
      } else if (isQuarantined) {
        borderColor = '#ef4444';
        bgColor = '#fef2f2';
        statusColor = 'text-rose-800';
        badgeBg = 'bg-rose-50 text-rose-800 border border-rose-200';
      } else if (isSuperseded) {
        borderColor = '#94a3b8';
        bgColor = '#f8fafc';
        statusColor = 'text-slate-700';
        badgeBg = 'bg-slate-100 text-slate-700 border border-slate-200';
      } else if (isExpiredOrDeleted) {
        borderColor = '#cbd5e1';
        bgColor = '#f8fafc';
        statusColor = 'text-slate-500';
        badgeBg = 'bg-slate-100 text-slate-500 border border-slate-200';
      }

      memoryNodes.push({
        id: nodeId,
        type: 'default',
        position: { x: 620, y: yOffset },
        data: {
          title: `${memId}: ${(mem.type || 'MEMORY').toUpperCase()}`,
          kind: 'Governed Memory Node',
          status: statusUpper,
          trust: mem.trust,
          details: mem.content,
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${statusColor}`}>
                  {statusUpper} MEMORY
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${badgeBg}`}>
                  TRUST: {typeof mem.trust === 'number' ? mem.trust.toFixed(2) : '1.00'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 tracking-wide truncate max-w-[190px]">
                {memId}: {mem.content.substring(0, 32)}...
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                <span className="capitalize">{mem.type}</span>
                <span className="font-mono text-slate-500">{memKey}</span>
              </div>
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '14px',
          width: 220,
          color: '#0f172a',
          opacity: isStale ? 0.8 : 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      });

      // Connect to cmp-pool or relevant component
      memoryEdges.push({
        id: `e-mem-${memId}`,
        source: 'cmp-pool',
        target: nodeId,
        label: isActive ? 'governed_by' : (isStale ? 'invalidated_fix' : 'blocked_by'),
        animated: isActive,
        style: {
          stroke: borderColor,
          strokeWidth: 2,
          strokeDasharray: isStale ? '4 4' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: borderColor },
      });
    });

    return {
      generatedNodes: [...baseNodes, ...memoryNodes],
      generatedEdges: [...baseEdges, ...memoryEdges],
    };
  }, [highlightDeployment, memories]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generatedEdges);

  // Sync state when dependencies change
  useEffect(() => {
    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeInfo(node);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(6,182,212,0.12)] border border-[rgba(6,182,212,0.3)] flex items-center justify-center text-[#06b6d4]">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Knowledge &amp; Dependency Graph</h1>
              <Badge variant="primary" size="sm">Module 7</Badge>
              {loading && (
                <span className="text-xs text-[#94a3b8] flex items-center space-x-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#06b6d4]" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Live topological dependency mapping: links microservices, code components, deployment webhooks, and live governed memories.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchGraphData()}
            className="btn-ghost flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold"
            title="Refresh live topology"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#06b6d4] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Graph</span>
          </button>

          <button
            onClick={() => setHighlightDeployment(!highlightDeployment)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              highlightDeployment
                ? 'bg-[rgba(204,139,60,0.2)] text-[#38bdf8] border-[rgba(6,182,212,0.35)]'
                : 'card text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <Zap className={`w-4 h-4 ${highlightDeployment ? 'text-[#38bdf8]' : 'text-[#888]'}`} />
            <span>{highlightDeployment ? 'Highlight Invalidation (W2)' : 'Show Neutral Graph'}</span>
          </button>

          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              showMiniMap
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'card text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="Toggle MiniMap Overview"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}</span>
          </button>
        </div>
      </div>

      {/* React Flow Graph Visualizer Canvas */}
      <div className="card rounded-2xl overflow-hidden shadow-sm relative h-[560px] border border-slate-200 bg-white">
        {/* Floating Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 shadow-sm">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Stale / Invalid</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Quarantined</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Superseded</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>Expired / Muted</span>
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
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="bg-white border-slate-200 text-slate-700 fill-slate-700 stroke-slate-700 shadow-sm rounded-xl" />
          {showMiniMap && (
            <MiniMap
              nodeStrokeColor="#cbd5e1"
              nodeStrokeWidth={1}
              nodeBorderRadius={4}
              maskColor="rgba(241, 245, 249, 0.75)"
              maskStrokeColor="#94a3b8"
              maskStrokeWidth={1}
              nodeColor={(n: any) => {
                if (n.id.includes('svc')) return '#818cf8';
                if (n.id.includes('cmp')) return '#38bdf8';
                if (n.id.includes('ent')) return '#4ade80';
                if (n.data?.status === 'ACTIVE') return '#4ade80';
                if (n.data?.status === 'STALE' || n.data?.status === 'INVALIDATED') return '#fbbf24';
                if (n.data?.status === 'QUARANTINED') return '#f87171';
                if (n.data?.status === 'SUPERSEDED') return '#94a3b8';
                if (n.data?.status === 'EXPIRED' || n.data?.status === 'DELETED') return '#cbd5e1';
                return '#c084fc';
              }}
              style={{
                width: 150,
                height: 100,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              }}
              className="!border !border-slate-300 !rounded-xl !overflow-hidden !shadow-md backdrop-blur-sm"
            />
          )}
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 card border border-slate-300 p-4 rounded-2xl flex items-center justify-between shadow-xl animate-fade-in bg-white/95 backdrop-blur-md">
            <div className="flex items-start space-x-3 max-w-3xl">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold font-mono text-slate-900 text-xs">
                    {selectedNodeInfo.data?.title || selectedNodeInfo.id}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                    {selectedNodeInfo.data?.kind || 'ENTITY'}
                  </span>
                  {selectedNodeInfo.data?.status && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                      {selectedNodeInfo.data.status}
                    </span>
                  )}
                  {selectedNodeInfo.data?.trust !== undefined && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                      Trust: {selectedNodeInfo.data.trust}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {selectedNodeInfo.data?.details || 'Topological entity mapped in memory graph. Invariant and governance checks active.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 ml-3 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

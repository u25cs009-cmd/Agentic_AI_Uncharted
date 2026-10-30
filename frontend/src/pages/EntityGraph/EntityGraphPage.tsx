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
import { Network, Zap, CheckCircle2, RefreshCw, X } from 'lucide-react';
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
                <span className="text-[10px] font-mono text-[#cc8b3c] font-bold uppercase tracking-wider">SERVICE</span>
                <span className="text-[9px] bg-[rgba(76,175,125,0.25)] text-[#60d49a] px-1.5 py-0.2 rounded font-mono font-bold">HEALTHY</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">checkout-api</div>
              <div className="text-[10px] text-[#b4b4b4] font-mono">v2.1.0 • prod-us-east</div>
            </div>
          ),
        },
        style: {
          background: '#252525',
          border: '1px solid #cc8b3c',
          borderRadius: '14px',
          width: 200,
          color: '#ececec',
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
                <span className="text-[10px] font-mono text-[#d4a843] font-bold uppercase tracking-wider">COMPONENT</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${highlightDeployment ? 'bg-[rgba(220,170,60,0.25)] text-[#e8c060]' : 'bg-[#333] text-[#b4b4b4]'}`}>
                  {highlightDeployment ? 'MUTATED' : 'STABLE'}
                </span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">pg-pool / db-conn</div>
              <div className="text-[10px] text-[#b4b4b4] font-mono">Altered in Deploy v2.1.0</div>
            </div>
          ),
        },
        style: {
          background: highlightDeployment ? '#2a2218' : '#252525',
          border: highlightDeployment ? '1px solid #d4a843' : '1px solid #cc8b3c',
          borderRadius: '14px',
          width: 210,
          color: '#ececec',
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
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">Deploy Event v2.1.0</div>
              <div className="text-[10px] text-[#b4b4b4]">Triggered Invalidation (W2)</div>
            </div>
          ),
        },
        style: {
          background: '#281e30',
          border: '1px dashed #a855f7',
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
          title: 'MongoDB Atlas',
          kind: 'Infrastructure DB',
          status: 'PRIMARY',
          details: 'Cluster shakti2-primary • ANCHOR Vector index active',
          label: (
            <div className="p-1.5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#60d49a] font-bold uppercase tracking-wider">INFRASTRUCTURE</span>
                <span className="text-[9px] bg-[rgba(76,175,125,0.25)] text-[#60d49a] px-1.5 py-0.2 rounded font-mono font-bold">PRIMARY</span>
              </div>
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide">MongoDB Atlas</div>
              <div className="text-[10px] text-[#b4b4b4] font-mono">Cluster shakti2-primary</div>
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
    ];

    const baseEdges: Edge[] = [
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

      let borderColor = '#4caf7d';
      let bgColor = '#212a23';
      let statusColor = 'text-[#60d49a]';
      let badgeBg = 'bg-[rgba(76,175,125,0.25)] text-[#60d49a]';

      if (isStale) {
        borderColor = '#d4a843';
        bgColor = '#2a2218';
        statusColor = 'text-[#d4a843]';
        badgeBg = 'bg-[rgba(220,170,60,0.2)] text-[#e8c060]';
      } else if (isQuarantined) {
        borderColor = '#e05c5c';
        bgColor = '#2a1d1d';
        statusColor = 'text-[#f07070]';
        badgeBg = 'bg-[rgba(220,80,80,0.2)] text-[#f07070]';
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
              <div className="text-xs font-bold text-[#f0f0f0] tracking-wide truncate max-w-[190px]">
                {memId}: {mem.content.substring(0, 32)}...
              </div>
              <div className="text-[10px] text-[#b4b4b4] flex items-center justify-between mt-0.5">
                <span className="capitalize">{mem.type}</span>
                <span className="font-mono text-[#888]">{memKey}</span>
              </div>
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '14px',
          width: 220,
          color: '#ececec',
          opacity: isStale ? 0.8 : 1,
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
          <div className="w-10 h-10 rounded-xl bg-[rgba(204,139,60,0.15)] border border-[rgba(204,139,60,0.3)] flex items-center justify-center text-[#cc8b3c]">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#f0f0f0]">Knowledge &amp; Dependency Graph</h1>
              <Badge variant="primary" size="sm">Module 7</Badge>
              {loading && (
                <span className="text-xs text-[#b4b4b4] flex items-center space-x-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#cc8b3c]" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#b4b4b4] mt-0.5">
              Live topological dependency mapping: links microservices, code components, deployment webhooks, and live governed memories.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchGraphData()}
            className="btn-ghost flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold"
            title="Refresh from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#cc8b3c] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Graph</span>
          </button>

          <button
            onClick={() => setHighlightDeployment(!highlightDeployment)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              highlightDeployment
                ? 'bg-[rgba(204,139,60,0.2)] text-[#f0aa55] border-[rgba(204,139,60,0.4)]'
                : 'card text-[#b4b4b4] hover:text-[#ececec]'
            }`}
          >
            <Zap className={`w-4 h-4 ${highlightDeployment ? 'text-[#f0aa55]' : 'text-[#888]'}`} />
            <span>{highlightDeployment ? 'Highlight Invalidation (W2)' : 'Show Neutral Graph'}</span>
          </button>
        </div>
      </div>

      {/* React Flow Graph Visualizer Canvas */}
      <div className="card rounded-2xl overflow-hidden shadow-2xl relative h-[560px] border-[#383838]">
        {/* Floating Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-[#252525]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#383838] text-xs font-mono text-[#ececec] shadow-xl">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#cc8b3c]" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#d4a843]" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#60d49a]" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e8c060]" />
            <span>Stale / Invalid</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e05c5c]" />
            <span>Quarantined</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
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
              if (n.id.includes('ent')) return '#4caf7d';
              if (n.data?.status === 'ACTIVE') return '#60d49a';
              if (n.data?.status === 'STALE' || n.data?.status === 'INVALIDATED') return '#d4a843';
              if (n.data?.status === 'QUARANTINED') return '#e05c5c';
              return '#a855f7';
            }}
            className="bg-[#252525] border border-[#383838] rounded-xl overflow-hidden shadow-2xl"
          />
        </ReactFlow>

        {/* Node Detail Drawer Overlay */}
        {selectedNodeInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10 card border-[rgba(204,139,60,0.4)] p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in bg-[#252525]/95 backdrop-blur-md">
            <div className="flex items-start space-x-3 max-w-3xl">
              <CheckCircle2 className="w-5 h-5 text-[#cc8b3c] shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold font-mono text-[#f0aa55] text-xs">
                    {selectedNodeInfo.data?.title || selectedNodeInfo.id}
                  </span>
                  <span className="text-[10px] bg-[#333] text-[#b4b4b4] px-2 py-0.5 rounded font-mono">
                    {selectedNodeInfo.data?.kind || 'ENTITY'}
                  </span>
                  {selectedNodeInfo.data?.status && (
                    <span className="text-[10px] bg-[rgba(204,139,60,0.2)] text-[#f0aa55] px-2 py-0.5 rounded font-mono font-bold">
                      {selectedNodeInfo.data.status}
                    </span>
                  )}
                  {selectedNodeInfo.data?.trust !== undefined && (
                    <span className="text-[10px] bg-[rgba(76,175,125,0.2)] text-[#60d49a] px-2 py-0.5 rounded font-mono">
                      Trust: {selectedNodeInfo.data.trust}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#b4b4b4] mt-1 leading-relaxed">
                  {selectedNodeInfo.data?.details || 'Topological entity mapped in memory graph. Invariant and governance checks active.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className="text-[#888] hover:text-[#ececec] p-1 rounded-lg hover:bg-[#333] transition-colors shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Network, 
  Layers, 
  GitBranch, 
  RefreshCw, 
  Zap, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

interface NodeItem {
  id: string;
  name: string;
  type: 'service' | 'component' | 'memory' | 'deploy';
  status: 'active' | 'stale' | 'affected' | 'healthy';
  description: string;
  x: number;
  y: number;
}

interface EdgeItem {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export const EntityGraphPage: React.FC = () => {
  const [highlightDeployment, setHighlightDeployment] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeItem | null>(null);

  const nodes: NodeItem[] = [
    {
      id: 'svc-checkout',
      name: 'checkout-api (v2.1)',
      type: 'service',
      status: 'healthy',
      description: 'Microservice handling customer checkout transactions and payment flows',
      x: 100,
      y: 160,
    },
    {
      id: 'cmp-pool',
      name: 'pg-pool / db-connection',
      type: 'component',
      status: highlightDeployment ? 'affected' : 'healthy',
      description: 'Underlying connection pool dependency altered in deployment v2.1.0',
      x: 360,
      y: 160,
    },
    {
      id: 'mem-fix-active',
      name: 'mem-001: Pool Max Conn: 50',
      type: 'memory',
      status: 'active',
      description: 'Human-approved fix verified to work with checkout-api v2.1.0 (Trust: 1.00)',
      x: 640,
      y: 90,
    },
    {
      id: 'mem-fix-stale',
      name: 'mem-004: pg_ctlcluster restart',
      type: 'memory',
      status: 'stale',
      description: 'Legacy PostgreSQL fix invalidated when component pg-pool was refactored',
      x: 640,
      y: 240,
    },
    {
      id: 'dep-event',
      name: 'Deploy Event: v2.1.0 Release',
      type: 'deploy',
      status: 'active',
      description: 'GitHub Deploy Webhook triggered via n8n (W2)',
      x: 360,
      y: 340,
    },
  ];

  const edges: EdgeItem[] = [
    { from: 'svc-checkout', to: 'cmp-pool', label: 'depends_on' },
    { from: 'cmp-pool', to: 'mem-fix-active', label: 'validated_by' },
    { from: 'cmp-pool', to: 'mem-fix-stale', label: 'invalidated', dashed: true },
    { from: 'dep-event', to: 'cmp-pool', label: 'altered_component' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Entity Graph</h1>
            <Badge variant="purple">MongoDB $graphLookup</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Visual graph mapping dependencies between services, components, deployment events, and governing memories.
          </p>
        </div>

        <button
          onClick={() => setHighlightDeployment(!highlightDeployment)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            highlightDeployment
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-[#111726] text-slate-400 border-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{highlightDeployment ? 'Deployment Impact: ON' : 'Show Neutral'}</span>
        </button>
      </div>

      {/* Graph Visualizer Canvas */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-6 relative overflow-hidden shadow-md min-h-[460px] flex flex-col justify-between">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Legend */}
        <div className="relative z-10 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 bg-[#0a0d14]/90 p-3 rounded-xl border border-slate-800 self-start">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Service</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span>Component</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Active Memory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Stale / Invalidated</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Deploy Event</span>
          </div>
        </div>

        {/* Graph Nodes Canvas */}
        <div className="relative z-10 h-80 my-4 flex items-center justify-around flex-wrap gap-4">
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-xl border cursor-pointer transition-all w-56 shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-indigo-400 scale-105'
                    : 'hover:scale-102'
                } ${
                  node.status === 'stale'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : node.status === 'affected'
                    ? 'bg-amber-900/20 border-amber-400/60 animate-pulse'
                    : node.type === 'service'
                    ? 'bg-indigo-950/40 border-indigo-500/40'
                    : node.type === 'deploy'
                    ? 'bg-purple-950/40 border-purple-500/40'
                    : 'bg-emerald-950/30 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 text-slate-300">
                    {node.type}
                  </span>
                  <Badge
                    variant={
                      node.status === 'stale'
                        ? 'warning'
                        : node.status === 'affected'
                        ? 'danger'
                        : 'success'
                    }
                    size="sm"
                  >
                    {node.status}
                  </Badge>
                </div>

                <div className="text-xs font-bold text-white mb-1">{node.name}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{node.description}</p>
              </div>
            );
          })}
        </div>

        {/* Selected Node Drawer / Info */}
        {selectedNode && (
          <div className="relative z-10 bg-[#0a0d14] p-4 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="font-bold font-mono text-indigo-300">{selectedNode.name}</span>
                <p className="text-slate-400 text-[11px]">{selectedNode.description}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Star, 
  ExternalLink,
  Edit2, 
  Plus, 
  Layers, 
  Clock, 
  Shield, 
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory, MemoryStatus, MemoryType, MemoryTier } from '../../types/memory';
import { Badge } from '../../components/common/Badge';

export const MemoryExplorerPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await api.getMemories({
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: search || undefined,
      });
      setMemories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [statusFilter, typeFilter, search]);

  const handleDelete = async (id: string) => {
    if (confirm(`Permanently delete memory ${id}?`)) {
      await api.deleteMemory(id);
      if (selectedMemory?._id === id || selectedMemory?.id === id) {
        setSelectedMemory(null);
      }
      loadMemories();
    }
  };

  const handleMarkHumanApproved = async (mem: Memory) => {
    const id = mem._id || mem.id || '';
    await api.updateMemory(id, {
      trust: 1.0,
      source: { kind: 'human_approved', actor: 'Lead Engineer (Member 2)' },
    });
    loadMemories();
    if (selectedMemory?._id === id || selectedMemory?.id === id) {
      setSelectedMemory(prev => prev ? { ...prev, trust: 1.0 } : null);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory) return;
    const id = selectedMemory._id || selectedMemory.id || '';
    await api.updateMemory(id, { content: editContent });
    setIsEditing(false);
    loadMemories();
    setSelectedMemory(prev => prev ? { ...prev, content: editContent } : null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Memory Explorer</h1>
            <Badge variant="primary">MongoDB Collections</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Browse, inspect, calibrate and govern the AI agent memory state.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-[#111726] border border-[#1f293d] px-3 py-1.5 rounded-lg flex items-center">
          <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          <span>Total Records: {memories.length}</span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword, attribute key, or entity tag..."
            className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="stale">Stale (Invalidated)</option>
            <option value="quarantined">Quarantined</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="semantic">Semantic</option>
            <option value="episodic">Episodic</option>
            <option value="procedural">Procedural</option>
          </select>
        </div>
      </div>

      {/* Memory Table / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Memory List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm font-mono">
              Loading memories from MongoDB repository...
            </div>
          ) : memories.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm bg-[#111726] rounded-2xl border border-slate-800">
              No memories found matching the filter criteria.
            </div>
          ) : (
            memories.map((m) => {
              const isSelected = selectedMemory?._id === m._id || selectedMemory?.id === m.id;
              return (
                <div
                  key={m._id || m.id}
                  onClick={() => {
                    setSelectedMemory(m);
                    setIsEditing(false);
                    setEditContent(m.content);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#141d33] border-indigo-500 shadow-md shadow-indigo-950'
                      : 'bg-[#111726] border-[#1f293d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        {m._id || m.id}
                      </span>
                      <Badge
                        variant={
                          m.status === 'active'
                            ? 'success'
                            : m.status === 'stale'
                            ? 'warning'
                            : m.status === 'quarantined'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {m.status.toUpperCase()}
                      </Badge>
                      <Badge variant="purple" size="sm">
                        {m.type}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Trust: <strong className="text-emerald-400">{m.trust.toFixed(2)}</strong>
                      </span>
                      <span className="text-slate-400">
                        Conf: <strong className="text-cyan-400">{m.confidence.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 line-clamp-2 mb-3">
                    {m.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="font-mono text-[11px] text-indigo-400 truncate max-w-[200px]">
                      {m.attribute_key}
                    </span>
                    <div className="flex items-center space-x-1">
                      {m.entities.map((e) => (
                        <span key={e} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Memory Inspector & CRUD Actions */}
        <div className="lg:col-span-1">
          {selectedMemory ? (
            <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 sticky top-20 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {selectedMemory._id || selectedMemory.id}
                </span>
                <Badge
                  variant={
                    selectedMemory.status === 'active'
                      ? 'success'
                      : selectedMemory.status === 'stale'
                      ? 'warning'
                      : selectedMemory.status === 'quarantined'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {selectedMemory.status}
                </Badge>
              </div>

              {/* Edit or Display Content */}
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Content</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0a0d14] border border-indigo-500 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 bg-[#0a0d14] p-3 rounded-lg border border-slate-800 leading-relaxed">
                    {selectedMemory.content}
                  </p>
                )}
              </div>

              {/* Detailed Metadata Attributes */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Attribute Key:</span>
                  <span className="font-mono text-indigo-300">{selectedMemory.attribute_key}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Source Kind:</span>
                  <span className="font-mono text-slate-200">{selectedMemory.source.kind}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Trust Level:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedMemory.trust.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {selectedMemory.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Depends On:</span>
                  <span className="font-mono text-slate-300">
                    {selectedMemory.depends_on.join(', ') || 'none'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Access Count:</span>
                  <span className="font-mono text-slate-200">{selectedMemory.access_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Valid From:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(selectedMemory.valid_from).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => handleMarkHumanApproved(selectedMemory)}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg py-2 text-xs font-medium transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Human-Approved (Trust: 1.00)</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedMemory.content);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg py-2 text-xs font-medium transition-colors border border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Text</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedMemory._id || selectedMemory.id || '')}
                    className="flex items-center justify-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors border border-rose-500/30"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-8 text-center text-slate-500 text-xs">
              Select a memory card on the left to inspect its complete JSON properties and governance state.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


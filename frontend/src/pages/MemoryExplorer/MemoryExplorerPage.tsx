import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Star, 
  Edit2, 
  Layers, 
  Clock, 
  Shield, 
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory, MemoryStatus, MemoryType, MemoryTier, SourceKind } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { DataTable, Column } from '../../components/common/DataTable';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';

export const MemoryExplorerPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // View mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Selected memory & edit state
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMemories({
        status: statusFilter,
        type: typeFilter,
        tier: tierFilter,
        source: sourceFilter,
        search: search.trim() || undefined,
      });
      setMemories(data);

      // Keep selected memory in sync if present
      if (selectedMemory) {
        const updated = data.find(m => (m._id || m.id) === (selectedMemory._id || selectedMemory.id));
        if (updated) setSelectedMemory(updated);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load memories from store.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [statusFilter, typeFilter, tierFilter, sourceFilter, search]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setTierFilter('all');
    setSourceFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || tierFilter !== 'all' || sourceFilter !== 'all';

  const handleDelete = async (id: string) => {
    if (confirm(`Permanently delete memory ${id}?`)) {
      try {
        await api.deleteMemory(id);
        if (selectedMemory?._id === id || selectedMemory?.id === id) {
          setSelectedMemory(null);
        }
        setNotice(`Memory ${id} permanently deleted.`);
        setTimeout(() => setNotice(null), 3000);
        loadMemories();
      } catch (err: any) {
        setError(err?.message || 'Failed to delete memory.');
      }
    }
  };

  const handleMarkHumanApproved = async (mem: Memory) => {
    const id = mem._id || mem.id || '';
    try {
      await api.updateMemory(id, {
        trust: 1.0,
        source: { kind: 'human_approved', actor: 'Lead Engineer (Member 2)' },
      });
      setNotice(`Memory ${id} marked Human-Approved (Trust: 1.00).`);
      setTimeout(() => setNotice(null), 3000);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve memory.');
    }
  };

  // Task B: Promote to Core (Hot Tier)
  const handlePromoteToCore = async (mem: Memory) => {
    const id = mem._id || mem.id || '';
    if (mem.tier === 'hot') return;

    try {
      await api.updateMemory(id, { tier: 'hot' });
      setNotice(`Memory ${id} promoted to Core (Hot Tier)!`);
      setTimeout(() => setNotice(null), 3500);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to promote memory.');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory) return;
    const id = selectedMemory._id || selectedMemory.id || '';
    try {
      await api.updateMemory(id, { content: editContent });
      setIsEditing(false);
      setNotice(`Memory ${id} content updated successfully.`);
      setTimeout(() => setNotice(null), 3000);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to update content.');
    }
  };

  // DataTable columns for Table View
  const tableColumns: Column<Memory>[] = useMemo(
    () => [
      {
        key: '_id',
        header: 'ID',
        sortable: true,
        className: 'font-mono text-indigo-400 font-bold w-24',
        render: (row) => row._id || row.id,
      },
      {
        key: 'content',
        header: 'Memory Content',
        sortable: true,
        render: (row) => (
          <div>
            <div className="line-clamp-2 text-slate-200">{row.content}</div>
            <div className="text-[10px] font-mono text-indigo-400 mt-0.5">{row.attribute_key}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => (
          <Badge
            variant={
              row.status === 'active'
                ? 'success'
                : row.status === 'stale'
                ? 'warning'
                : row.status === 'quarantined'
                ? 'danger'
                : 'neutral'
            }
            size="sm"
          >
            {row.status.toUpperCase()}
          </Badge>
        ),
      },
      {
        key: 'tier',
        header: 'Tier',
        sortable: true,
        align: 'center',
        render: (row) => (
          <Badge
            variant={row.tier === 'hot' ? 'primary' : row.tier === 'warm' ? 'cyan' : 'neutral'}
            size="sm"
          >
            {row.tier.toUpperCase()}
          </Badge>
        ),
      },
      {
        key: 'trust',
        header: 'Trust',
        sortable: true,
        align: 'center',
        render: (row) => (
          <span className="font-mono font-bold text-emerald-400">
            {row.trust.toFixed(2)}
          </span>
        ),
      },
      {
        key: 'confidence',
        header: 'Conf',
        sortable: true,
        align: 'center',
        render: (row) => (
          <span className="font-mono text-cyan-400">
            {row.confidence.toFixed(2)}
          </span>
        ),
      },
    ],
    []
  );

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

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="bg-[#111726] border border-[#1f293d] p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs flex items-center space-x-1 font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs flex items-center space-x-1 font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-[#111726] border border-[#1f293d] px-3 py-1.5 rounded-xl flex items-center">
            <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            <span>{memories.length} Records</span>
          </div>
        </div>
      </div>

      {/* Notices & Errors */}
      {notice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <ErrorMessage
          title="Operation Error"
          message={error}
          onRetry={loadMemories}
          compact
        />
      )}

      {/* Complete Filter Bar (Task A) */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content, attribute key, or entity tags..."
            className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="stale">Stale (Invalidated)</option>
            <option value="quarantined">Quarantined</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-mono">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="semantic">Semantic</option>
            <option value="episodic">Episodic</option>
            <option value="procedural">Procedural</option>
          </select>
        </div>

        {/* Tier Filter (Task A.1) */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-mono">Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="hot">Hot (Core)</option>
            <option value="warm">Warm</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        {/* Source Kind Filter (Task A.2) */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-mono">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#0a0d14] border border-[#1f293d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="human_approved">Human Approved (1.00)</option>
            <option value="system_event">System Event (0.85)</option>
            <option value="user_stated">User Stated (0.80)</option>
            <option value="agent_inferred">Agent Inferred (0.50)</option>
            <option value="unverified">Unverified (0.20)</option>
          </select>
        </div>

        {/* Clear Filters Button (Task A.3) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Memories List or DataTable */}
        <div className="lg:col-span-2">
          {viewMode === 'table' ? (
            <DataTable
              columns={tableColumns}
              data={memories}
              keyExtractor={(m) => m._id || m.id || ''}
              isLoading={loading}
              loadingMessage="Loading memories from store..."
              emptyTitle="No matching memories found"
              emptyDescription="Try clearing or adjusting the status, type, tier, or source filters above."
              pageSize={7}
              selectedRowKey={selectedMemory?._id || selectedMemory?.id}
              onRowClick={(row) => {
                setSelectedMemory(row);
                setIsEditing(false);
                setEditContent(row.content);
              }}
            />
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="p-10 text-center text-slate-400 text-sm font-mono">
                  Loading memories from store...
                </div>
              ) : memories.length === 0 ? (
                <EmptyState
                  title="No matching memories found"
                  description="No memory records match your current filter combination."
                  actionText={hasActiveFilters ? "Reset All Filters" : undefined}
                  onAction={handleClearFilters}
                />
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
                          ? 'bg-[#141d33] border-indigo-500 shadow-md shadow-indigo-950 ring-1 ring-indigo-500/50'
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
                          <Badge
                            variant={m.tier === 'hot' ? 'primary' : m.tier === 'warm' ? 'cyan' : 'neutral'}
                            size="sm"
                          >
                            {m.tier.toUpperCase()} TIER
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
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            src: {m.source.kind}
                          </span>
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
          )}
        </div>

        {/* Right Column: Detailed Inspector & Action Drawer */}
        <div className="lg:col-span-1">
          {selectedMemory ? (
            <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 sticky top-20 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    {selectedMemory._id || selectedMemory.id}
                  </span>
                  <Badge
                    variant={selectedMemory.tier === 'hot' ? 'primary' : 'neutral'}
                    size="sm"
                  >
                    {selectedMemory.tier.toUpperCase()} TIER
                  </Badge>
                </div>
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
                  <span className="text-slate-400">Memory Tier:</span>
                  <span className="font-mono font-bold text-indigo-400 uppercase">
                    {selectedMemory.tier} {selectedMemory.tier === 'hot' && '🔥 (Core)'}
                  </span>
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
                {/* Task B: Promote to Core Action Button */}
                {selectedMemory.tier !== 'hot' ? (
                  <button
                    onClick={() => handlePromoteToCore(selectedMemory)}
                    className="w-full flex items-center justify-center space-x-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg py-2 text-xs font-semibold transition-all shadow-sm active:scale-98"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                    <span>Promote to Core (Hot Tier)</span>
                  </button>
                ) : (
                  <div className="w-full py-1.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg text-center text-[11px] font-mono text-indigo-300 flex items-center justify-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Active Core Memory (Hot Tier)</span>
                  </div>
                )}

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
              Select a memory from the table or card list to view its complete properties and governance actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

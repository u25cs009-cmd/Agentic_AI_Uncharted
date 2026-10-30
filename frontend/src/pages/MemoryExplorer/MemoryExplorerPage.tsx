import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
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
  Check,
  AlertTriangle,
  Flame,
  Key,
  ShieldCheck,
  Cpu
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

  // Stats calculation
  const stats = useMemo(() => {
    const total = memories.length;
    const hotCore = memories.filter(m => m.tier === 'hot').length;
    const stale = memories.filter(m => m.status === 'stale' || m.status === 'superseded').length;
    const quarantined = memories.filter(m => m.status === 'quarantined').length;
    return { total, hotCore, stale, quarantined };
  }, [memories]);

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

  // Promote to Core (Hot Tier)
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
        className: 'font-mono text-cyan-400 font-bold w-24',
        render: (row) => row._id || row.id,
      },
      {
        key: 'content',
        header: 'Memory Content',
        sortable: true,
        render: (row) => (
          <div>
            <div className="line-clamp-2 text-slate-200 font-medium">{row.content}</div>
            <div className="text-[10px] font-mono text-indigo-400 mt-0.5 flex items-center space-x-1">
              <Key className="w-2.5 h-2.5 inline text-slate-500" />
              <span>{row.attribute_key}</span>
            </div>
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
            glow={row.status === 'active'}
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
            {row.tier === 'hot' ? '🔥 HOT' : row.tier.toUpperCase()}
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
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Memory Explorer</h1>
                <Badge variant="cyan" size="sm" glow>XYRO101 Knowledge Base</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect, calibrate, promote, and audit governed memory states across temporal tiers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="glass-panel p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Stat Ribbons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Memories</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Governed MongoDB Collection</div>
        </div>

        <div className="glass-panel p-4 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider flex items-center justify-between">
            <span>Core Hot Facts</span>
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">{stats.hotCore}</div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5 font-mono">High-Priority Working Set</div>
        </div>

        <div className="glass-panel p-4 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="text-[11px] font-mono text-amber-300 uppercase tracking-wider flex items-center justify-between">
            <span>Stale / Invalid</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats.stale}</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5 font-mono">Excluded from Generation</div>
        </div>

        <div className="glass-panel p-4 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="text-[11px] font-mono text-rose-300 uppercase tracking-wider flex items-center justify-between">
            <span>Quarantined</span>
            <Shield className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{stats.quarantined}</div>
          <div className="text-[10px] text-rose-400/80 mt-0.5 font-mono">Awaiting Operator Review</div>
        </div>
      </div>

      {/* Notices & Errors */}
      {notice && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono">{notice}</span>
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

      {/* Filter Bar with Cyberpunk Aesthetics */}
      <div className="glass-panel p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by keyword, attribute key, or entity..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-400 font-mono">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
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
          <span className="text-[11px] text-slate-400 font-mono">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="semantic">Semantic</option>
            <option value="episodic">Episodic</option>
            <option value="procedural">Procedural</option>
          </select>
        </div>

        {/* Tier Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-400 font-mono">Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="all">All Tiers</option>
            <option value="hot">Hot (Core)</option>
            <option value="warm">Warm</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        {/* Source Kind Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-400 font-mono">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="all">All Sources</option>
            <option value="human_approved">Human Approved (1.00)</option>
            <option value="system_event">System Event (0.85)</option>
            <option value="user_stated">User Stated (0.80)</option>
            <option value="agent_inferred">Agent Inferred (0.50)</option>
            <option value="unverified">Unverified (0.20)</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Grid: Memories List vs Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center Column: Card Grid or Data Table */}
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
                <div className="glass-panel p-10 text-center text-slate-400 text-xs font-mono">
                  Loading knowledge vectors & governed state...
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
                  const isHot = m.tier === 'hot';
                  const isActive = m.status === 'active';
                  const isStale = m.status === 'stale' || m.status === 'superseded';
                  const isQuarantined = m.status === 'quarantined';

                  return (
                    <div
                      key={m._id || m.id}
                      onClick={() => {
                        setSelectedMemory(m);
                        setIsEditing(false);
                        setEditContent(m.content);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-900/90 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/50'
                          : 'glass-panel-interactive'
                      }`}
                    >
                      {/* Left border accent line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isActive ? 'bg-emerald-500' : isStale ? 'bg-amber-500' : isQuarantined ? 'bg-rose-500' : 'bg-slate-600'
                      }`} />

                      <div className="flex items-center justify-between mb-2.5 pl-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {m._id || m.id}
                          </span>
                          <Badge
                            variant={
                              isActive
                                ? 'success'
                                : isStale
                                ? 'warning'
                                : isQuarantined
                                ? 'danger'
                                : 'neutral'
                            }
                            size="sm"
                            glow={isActive}
                          >
                            {m.status.toUpperCase()}
                          </Badge>
                          <Badge
                            variant={isHot ? 'primary' : m.tier === 'warm' ? 'cyan' : 'neutral'}
                            size="sm"
                          >
                            {isHot ? '🔥 HOT TIER' : `${m.tier.toUpperCase()} TIER`}
                          </Badge>
                          <Badge variant="purple" size="sm">
                            {m.type}
                          </Badge>
                        </div>

                        {/* Trust & Confidence mini metrics */}
                        <div className="flex items-center space-x-3 text-xs font-mono">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500">TRUST</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                                style={{ width: `${Math.round(m.trust * 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-emerald-400 text-[11px]">{m.trust.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-relaxed mb-3 pl-2 line-clamp-2">
                        {m.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-slate-800/80 pl-2">
                        <div className="flex items-center space-x-1.5 text-indigo-400 font-mono text-[11px] truncate max-w-[220px]">
                          <Key className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{m.attribute_key}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            src: <span className="text-slate-300">{m.source.kind}</span>
                          </span>
                          {m.entities.slice(0, 2).map((e) => (
                            <span key={e} className="bg-slate-800/70 border border-slate-700/50 px-1.5 py-0.5 rounded text-[10px] text-cyan-300 font-mono">
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

        {/* Right Column: High-Tech Inspector Drawer */}
        <div className="lg:col-span-1">
          {selectedMemory ? (
            <div className="glass-panel p-5 sticky top-20 shadow-2xl space-y-4 animate-fade-in border-slate-700/80">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {selectedMemory._id || selectedMemory.id}
                  </span>
                  <Badge
                    variant={selectedMemory.tier === 'hot' ? 'primary' : 'neutral'}
                    size="sm"
                  >
                    {selectedMemory.tier === 'hot' ? '🔥 HOT' : selectedMemory.tier.toUpperCase()}
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
                  glow={selectedMemory.status === 'active'}
                >
                  {selectedMemory.status.toUpperCase()}
                </Badge>
              </div>

              {/* Edit or Display Content */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">FACT CONTENT</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-cyan-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-600/20"
                      >
                        Save Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed font-sans">
                    {selectedMemory.content}
                  </p>
                )}
              </div>

              {/* Detailed Metadata Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Attribute Key:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedMemory.attribute_key}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Memory Tier:</span>
                  <span className="font-mono font-bold text-indigo-400 uppercase flex items-center space-x-1">
                    {selectedMemory.tier === 'hot' && <Flame className="w-3 h-3 text-amber-400 inline" />}
                    <span>{selectedMemory.tier}</span>
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Source:</span>
                  <span className="font-mono text-slate-200">{selectedMemory.source.kind}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Trust Score:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedMemory.trust.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {selectedMemory.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Dependencies:</span>
                  <span className="font-mono text-slate-300">
                    {selectedMemory.depends_on.join(', ') || 'none'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Access Count:</span>
                  <span className="font-mono text-slate-200">{selectedMemory.access_count} calls</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Valid From:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(selectedMemory.valid_from).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {/* Promote to Core Action */}
                {selectedMemory.tier !== 'hot' ? (
                  <button
                    onClick={() => handlePromoteToCore(selectedMemory)}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 rounded-xl py-2.5 text-xs font-semibold transition-all shadow-md shadow-amber-500/10 active:scale-98"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                    <span>Promote to Core (Hot Tier)</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-center text-xs font-mono text-indigo-300 flex items-center justify-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Core Memory (Hot Tier)</span>
                  </div>
                )}

                <button
                  onClick={() => handleMarkHumanApproved(selectedMemory)}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl py-2 text-xs font-semibold transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Mark Human-Approved (Trust: 1.00)</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedMemory.content);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl py-2 text-xs font-medium transition-colors border border-slate-700/60"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Fact</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedMemory._id || selectedMemory.id || '')}
                    className="flex items-center justify-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors border border-rose-500/30"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
              <Cpu className="w-8 h-8 text-slate-600 mb-1" />
              <p className="font-mono text-slate-400">No Memory Selected</p>
              <p className="text-[11px] text-slate-500 max-w-xs">Click any memory row or card to inspect its calibration parameters, promotion triggers, and audit trail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

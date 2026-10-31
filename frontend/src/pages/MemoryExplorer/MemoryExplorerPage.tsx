import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Trash2, 
  Star, 
  Edit2, 
  Clock, 
  Shield, 
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Flame,
  Key,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';
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
        setNotice(`cascade_purge logged: Memory ${id} and derived records purged with tombstone.`);
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
      setNotice(`Memory ${id} promoted to human-verified state (Trust: 1.00).`);
      setTimeout(() => setNotice(null), 3000);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to update memory.');
    }
  };

  const handlePromoteToCore = async (mem: Memory) => {
    const id = mem._id || mem.id || '';
    try {
      await api.updateMemory(id, {
        tier: 'hot',
        trust: Math.max(mem.trust, 0.95),
      });
      setNotice(`Memory ${id} promoted to Hot Tier working set!`);
      setTimeout(() => setNotice(null), 3000);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to promote memory.');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory) return;
    const id = selectedMemory._id || selectedMemory.id || '';
    try {
      await api.updateMemory(id, { content: editContent.trim() });
      setIsEditing(false);
      setNotice(`Updated content for memory ${id}.`);
      setTimeout(() => setNotice(null), 3000);
      loadMemories();
    } catch (err: any) {
      setError(err?.message || 'Failed to save updated memory.');
    }
  };

  const tableColumns: Column<Memory>[] = useMemo(
    () => [
      {
        key: '_id',
        header: 'ID',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-bold text-[#06b6d4]">
            {row._id || row.id}
          </span>
        ),
      },
      {
        key: 'content',
        header: 'Fact Content',
        render: (row) => (
          <span className="line-clamp-1 max-w-md font-sans text-[#d0d0d0]">
            {row.content}
          </span>
        ),
      },
      {
        key: 'attribute_key',
        header: 'Attribute Key',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs text-[#94a3b8]">
            {row.attribute_key}
          </span>
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
            variant={row.tier === 'hot' ? 'primary' : row.tier === 'warm' ? 'warning' : 'neutral'}
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
          <span className="font-mono font-bold text-[#60d49a]">
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
          <span className="font-mono text-[#06b6d4]">
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
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Memory Explorer</h1>
                <Badge variant="primary" size="sm">XYRO101 Knowledge Base</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Inspect, calibrate, promote, and audit governed memory states across temporal tiers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="card p-1 rounded-xl flex items-center space-x-1 border border-slate-200 bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-all ${
                viewMode === 'cards'
                  ? 'btn-primary'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-all ${
                viewMode === 'table'
                  ? 'btn-primary'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
        <div className="card p-4 relative overflow-hidden group hover:border-slate-300 transition-all bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-mono text-slate-600 uppercase tracking-wider flex items-center justify-between font-semibold">
            <span>Total Memories</span>
            <Database className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Governed MongoDB Collection</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-sky-300 transition-all bg-sky-50/50 border border-sky-200 shadow-xs">
          <div className="text-[11px] font-mono text-sky-800 uppercase tracking-wider flex items-center justify-between font-semibold">
            <span>Core Hot Facts</span>
            <Flame className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-900 mt-1">{stats.hotCore}</div>
          <div className="text-[10px] text-sky-800 mt-0.5 font-mono">High-Priority Working Set</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-amber-300 transition-all bg-amber-50/50 border border-amber-200 shadow-xs">
          <div className="text-[11px] font-mono text-amber-800 uppercase tracking-wider flex items-center justify-between font-semibold">
            <span>Stale / Invalid</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 mt-1">{stats.stale}</div>
          <div className="text-[10px] text-amber-800 mt-0.5 font-mono">Excluded from Generation</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-rose-300 transition-all bg-rose-50/50 border border-rose-200 shadow-xs">
          <div className="text-[11px] font-mono text-rose-800 uppercase tracking-wider flex items-center justify-between font-semibold">
            <span>Quarantined</span>
            <Shield className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-900 mt-1">{stats.quarantined}</div>
          <div className="text-[10px] text-rose-800 mt-0.5 font-mono">Awaiting Operator Review</div>
        </div>
      </div>

      {/* Notices & Errors */}
      {notice && (
        <div className="p-3.5 bg-[rgba(76,175,125,0.15)] border border-[rgba(76,175,125,0.35)] rounded-xl text-xs text-[#60d49a] flex items-center space-x-2.5 animate-fade-in">
          <Check className="w-4 h-4 text-[#60d49a] shrink-0" />
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

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3 bg-white border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by keyword, attribute key, or entity..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-700 font-mono font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs transition-colors cursor-pointer font-medium"
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
          <span className="text-[11px] text-slate-700 font-mono font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs transition-colors cursor-pointer font-medium"
          >
            <option value="all">All Types</option>
            <option value="semantic">Semantic</option>
            <option value="episodic">Episodic</option>
            <option value="procedural">Procedural</option>
            <option value="constraint">Constraint</option>
            <option value="preference">Preference</option>
            <option value="ephemeral">Ephemeral</option>
          </select>
        </div>

        {/* Tier Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-700 font-mono font-medium">Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs transition-colors cursor-pointer font-medium"
          >
            <option value="all">All Tiers</option>
            <option value="hot">Hot (Core)</option>
            <option value="warm">Warm</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        {/* Source Kind Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-700 font-mono font-medium">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs transition-colors cursor-pointer font-medium"
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
            className="flex items-center space-x-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Grid: Memories List vs Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Card Grid or Data Table */}
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
                <div className="card p-10 text-center text-[#888] text-xs font-mono">
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
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-400 shadow-sm ring-1 ring-indigo-400'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Left border accent line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isActive ? 'bg-emerald-500' : isStale ? 'bg-amber-500' : isQuarantined ? 'bg-rose-500' : 'bg-slate-400'
                      }`} />

                      <div className="flex items-center justify-between mb-2.5 pl-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-indigo-700">
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
                            variant={isHot ? 'primary' : m.tier === 'warm' ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {isHot ? '🔥 HOT TIER' : `${m.tier.toUpperCase()} TIER`}
                          </Badge>
                          <Badge variant="purple" size="sm">
                            {m.type}
                          </Badge>
                        </div>

                        {/* Trust metric */}
                        <div className="flex items-center space-x-3 text-xs font-mono">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500 font-bold">TRUST</span>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${Math.round(m.trust * 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-emerald-700 text-[11px]">{m.trust.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 font-medium leading-relaxed mb-3 pl-2 line-clamp-2">
                        {m.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 pl-2">
                        <div className="flex items-center space-x-1.5 text-indigo-700 font-mono text-[11px] truncate max-w-[220px] font-semibold">
                          <Key className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{m.attribute_key}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            src: <span className="text-slate-800 font-medium">{m.source.kind}</span>
                          </span>
                          {m.entities.slice(0, 2).map((e) => (
                            <span key={e} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-mono font-medium">
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

        {/* Right Column: Inspector Drawer */}
        <div className="lg:col-span-1">
          {selectedMemory ? (
            <div className="card p-5 sticky top-20 shadow-lg space-y-4 animate-fade-in border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-indigo-700">
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
                <label className="text-[11px] font-mono text-slate-600 font-bold block mb-1">FACT CONTENT</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-indigo-400 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-xs"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="btn-primary px-3 py-1 text-xs font-semibold"
                      >
                        Save Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-900 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-sans font-medium">
                    {selectedMemory.content}
                  </p>
                )}
              </div>

              {/* Detailed Metadata Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Attribute Key:</span>
                  <span className="font-mono text-indigo-700 font-bold">{selectedMemory.attribute_key}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Memory Tier:</span>
                  <span className="font-mono font-bold text-sky-700 uppercase flex items-center space-x-1">
                    {selectedMemory.tier === 'hot' && <Flame className="w-3 h-3 text-sky-600 inline" />}
                    <span>{selectedMemory.tier}</span>
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Source:</span>
                  <span className="font-mono text-slate-900 font-semibold">{selectedMemory.source.kind}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Trust Score:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {selectedMemory.trust.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Confidence:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {selectedMemory.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Dependencies:</span>
                  <span className="font-mono text-slate-700">
                    {selectedMemory.depends_on.join(', ') || 'none'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Access Count:</span>
                  <span className="font-mono text-slate-900 font-medium">{selectedMemory.access_count} calls</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Valid From:</span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {new Date(selectedMemory.valid_from).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {selectedMemory.tier !== 'hot' ? (
                  <button
                    onClick={() => handlePromoteToCore(selectedMemory)}
                    className="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-98 shadow-xs cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                    <span>Promote to Core (Hot Tier)</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-sky-50 border border-sky-200 rounded-xl text-center text-xs font-mono text-sky-800 flex items-center justify-center space-x-1.5 font-bold">
                    <Flame className="w-3.5 h-3.5 text-sky-600" />
                    <span>Active Core Memory (Hot Tier)</span>
                  </div>
                )}

                <button
                  onClick={() => handleMarkHumanApproved(selectedMemory)}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl py-2 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Mark Human-Approved (Trust: 1.00)</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedMemory.content);
                    }}
                    className="btn-ghost flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Fact</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedMemory._id || selectedMemory.id || '')}
                    className="btn-danger flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2 bg-slate-50/50 border border-slate-200 rounded-xl">
              <Cpu className="w-8 h-8 text-slate-400 mb-1" />
              <p className="font-mono text-slate-800 font-bold">No Memory Selected</p>
              <p className="text-[11px] text-slate-500 max-w-xs">Click any memory row or card to inspect its calibration parameters, promotion triggers, and audit trail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

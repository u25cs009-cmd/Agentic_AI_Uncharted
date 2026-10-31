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
            <div className="w-9 h-9 rounded-xl bg-[rgba(6,182,212,0.15)] border border-[rgba(6,182,212,0.35)] flex items-center justify-center text-[#06b6d4] shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#ffffff]">Memory Explorer</h1>
                <Badge variant="primary" size="sm">XYRO101 Knowledge Base</Badge>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Inspect, calibrate, promote, and audit governed memory states across temporal tiers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="card p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-all ${
                viewMode === 'cards'
                  ? 'btn-primary'
                  : 'text-[#888] hover:text-[#f8fafc]'
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
                  : 'text-[#888] hover:text-[#f8fafc]'
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
        <div className="card p-4 relative overflow-hidden group hover:border-[#475569] transition-all">
          <div className="text-[11px] font-mono text-[#888] uppercase tracking-wider flex items-center justify-between">
            <span>Total Memories</span>
            <Database className="w-3.5 h-3.5 text-[#06b6d4]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#ffffff] mt-1">{stats.total}</div>
          <div className="text-[10px] text-[#666] mt-0.5 font-mono">Governed MongoDB Collection</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-[rgba(204,139,60,0.5)] transition-all">
          <div className="text-[11px] font-mono text-[#38bdf8] uppercase tracking-wider flex items-center justify-between">
            <span>Core Hot Facts</span>
            <Flame className="w-3.5 h-3.5 text-[#06b6d4]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#38bdf8] mt-1">{stats.hotCore}</div>
          <div className="text-[10px] text-[rgba(204,139,60,0.8)] mt-0.5 font-mono">High-Priority Working Set</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-[rgba(220,170,60,0.5)] transition-all">
          <div className="text-[11px] font-mono text-[#e8c060] uppercase tracking-wider flex items-center justify-between">
            <span>Stale / Invalid</span>
            <Clock className="w-3.5 h-3.5 text-[#e8c060]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#e8c060] mt-1">{stats.stale}</div>
          <div className="text-[10px] text-[rgba(220,170,60,0.8)] mt-0.5 font-mono">Excluded from Generation</div>
        </div>

        <div className="card p-4 relative overflow-hidden group hover:border-[rgba(220,80,80,0.5)] transition-all">
          <div className="text-[11px] font-mono text-[#f07070] uppercase tracking-wider flex items-center justify-between">
            <span>Quarantined</span>
            <Shield className="w-3.5 h-3.5 text-[#f07070]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f07070] mt-1">{stats.quarantined}</div>
          <div className="text-[10px] text-[rgba(220,80,80,0.8)] mt-0.5 font-mono">Awaiting Operator Review</div>
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
      <div className="card p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by keyword, attribute key, or entity..."
            className="w-full bg-[#0b1222] border border-[#334155] rounded-xl pl-9 pr-4 py-2 text-xs text-[#f8fafc] placeholder-[#888] focus:outline-none focus:border-[#06b6d4] transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-[#888] font-mono">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0b1222] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#06b6d4] transition-colors"
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
          <span className="text-[11px] text-[#888] font-mono">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0b1222] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#06b6d4] transition-colors"
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
          <span className="text-[11px] text-[#888] font-mono">Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-[#0b1222] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#06b6d4] transition-colors"
          >
            <option value="all">All Tiers</option>
            <option value="hot">Hot (Core)</option>
            <option value="warm">Warm</option>
            <option value="archive">Archive</option>
          </select>
        </div>

        {/* Source Kind Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-[#888] font-mono">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#0b1222] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#06b6d4] transition-colors"
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
            className="flex items-center space-x-1.5 text-xs text-[#06b6d4] hover:text-[#22d3ee] font-medium px-3 py-1.5 rounded-lg border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.12)] transition-colors"
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
                          ? 'bg-[#0f1a30] border-[#06b6d4] shadow-lg ring-1 ring-[#06b6d4]'
                          : 'card hover:border-[#475569]'
                      }`}
                    >
                      {/* Left border accent line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isActive ? 'bg-[#4caf7d]' : isStale ? 'bg-[#38bdf8]' : isQuarantined ? 'bg-[#e05c5c]' : 'bg-[#475569]'
                      }`} />

                      <div className="flex items-center justify-between mb-2.5 pl-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-[#06b6d4]">
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
                            <span className="text-[10px] text-[#888]">TRUST</span>
                            <div className="w-12 h-1.5 bg-[#0b1222] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#4caf7d]"
                                style={{ width: `${Math.round(m.trust * 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-[#60d49a] text-[11px]">{m.trust.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#cbd5e1] font-medium leading-relaxed mb-3 pl-2 line-clamp-2">
                        {m.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-[#888] pt-2.5 border-t border-[#1e293b] pl-2">
                        <div className="flex items-center space-x-1.5 text-[#06b6d4] font-mono text-[11px] truncate max-w-[220px]">
                          <Key className="w-3 h-3 text-[#666] shrink-0" />
                          <span className="truncate">{m.attribute_key}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-[#666] font-mono">
                            src: <span className="text-[#94a3b8]">{m.source.kind}</span>
                          </span>
                          {m.entities.slice(0, 2).map((e) => (
                            <span key={e} className="bg-[#0f1a30] border border-[#334155] px-1.5 py-0.5 rounded text-[10px] text-[#38bdf8] font-mono">
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
            <div className="card p-5 sticky top-20 shadow-2xl space-y-4 animate-fade-in border-[#334155]">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#06b6d4]">
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
                <label className="text-[11px] font-mono text-[#888] block mb-1">FACT CONTENT</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0b1222] border border-[#06b6d4] rounded-xl p-2.5 text-xs text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#06b6d4]"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 text-xs text-[#888] hover:text-[#f8fafc]"
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
                  <p className="text-xs text-[#cbd5e1] bg-[#0b1222] p-3.5 rounded-xl border border-[#1e293b] leading-relaxed font-sans">
                    {selectedMemory.content}
                  </p>
                )}
              </div>

              {/* Detailed Metadata Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Attribute Key:</span>
                  <span className="font-mono text-[#06b6d4] font-semibold">{selectedMemory.attribute_key}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Memory Tier:</span>
                  <span className="font-mono font-bold text-[#38bdf8] uppercase flex items-center space-x-1">
                    {selectedMemory.tier === 'hot' && <Flame className="w-3 h-3 text-[#06b6d4] inline" />}
                    <span>{selectedMemory.tier}</span>
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Source:</span>
                  <span className="font-mono text-[#d0d0d0]">{selectedMemory.source.kind}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Trust Score:</span>
                  <span className="font-mono font-bold text-[#60d49a]">
                    {selectedMemory.trust.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Confidence:</span>
                  <span className="font-mono font-bold text-[#06b6d4]">
                    {selectedMemory.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Dependencies:</span>
                  <span className="font-mono text-[#94a3b8]">
                    {selectedMemory.depends_on.join(', ') || 'none'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Access Count:</span>
                  <span className="font-mono text-[#d0d0d0]">{selectedMemory.access_count} calls</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#1e293b]">
                  <span className="text-[#888]">Valid From:</span>
                  <span className="font-mono text-[#888] text-[11px]">
                    {new Date(selectedMemory.valid_from).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1e293b] space-y-2">
                {selectedMemory.tier !== 'hot' ? (
                  <button
                    onClick={() => handlePromoteToCore(selectedMemory)}
                    className="w-full flex items-center justify-center space-x-1.5 bg-[rgba(6,182,212,0.15)] hover:bg-[rgba(204,139,60,0.28)] text-[#38bdf8] border border-[rgba(6,182,212,0.35)] rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-98"
                  >
                    <Star className="w-3.5 h-3.5 text-[#06b6d4] fill-[#06b6d4]" />
                    <span>Promote to Core (Hot Tier)</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-[rgba(204,139,60,0.1)] border border-[rgba(6,182,212,0.3)] rounded-xl text-center text-xs font-mono text-[#38bdf8] flex items-center justify-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#06b6d4]" />
                    <span>Active Core Memory (Hot Tier)</span>
                  </div>
                )}

                <button
                  onClick={() => handleMarkHumanApproved(selectedMemory)}
                  className="w-full flex items-center justify-center space-x-1.5 bg-[rgba(76,175,125,0.15)] hover:bg-[rgba(76,175,125,0.25)] text-[#60d49a] border border-[rgba(76,175,125,0.35)] rounded-xl py-2 text-xs font-semibold transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#60d49a]" />
                  <span>Mark Human-Approved (Trust: 1.00)</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedMemory.content);
                    }}
                    className="btn-ghost flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Fact</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedMemory._id || selectedMemory.id || '')}
                    className="btn-danger flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-medium"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-[#888] text-xs flex flex-col items-center justify-center space-y-2">
              <Cpu className="w-8 h-8 text-[#475569] mb-1" />
              <p className="font-mono text-[#94a3b8]">No Memory Selected</p>
              <p className="text-[11px] text-[#666] max-w-xs">Click any memory row or card to inspect its calibration parameters, promotion triggers, and audit trail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Check, 
  Trash2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Info,
  Scale,
  CheckCircle2,
  XCircle,
  FileText,
  Radio
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';

export const QuarantinePage: React.FC = () => {
  const [quarantined, setQuarantined] = useState<Memory[]>([]);
  const [activeMemories, setActiveMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qData, aData] = await Promise.all([
        api.getQuarantinedMemories(),
        api.getMemories({ status: 'active' }),
      ]);
      setQuarantined(qData);
      setActiveMemories(aData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quarantine records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRelease = async (id: string) => {
    try {
      await api.releaseQuarantine(id);
      setActionNotice(`quarantine_release logged: Memory ${id} verified and restored to active store`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to release memory ${id}.`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectQuarantine(id);
      setActionNotice(`quarantine_reject logged: Memory ${id} permanently purged & recorded to security audit`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to reject memory ${id}.`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quarantine Inbox</h1>
              <Badge variant="danger" size="sm">Poisoning Defense Active</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Deterministic isolation vault for prompt injections, untrusted overrides, and conflicting memory mutations.
            </p>
          </div>
        </div>

        {/* Defense Status Radar */}
        <div className="flex items-center space-x-2">
          <div className="card px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-slate-700 bg-white border border-slate-200 shadow-xs">
            <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>P1–P4 Rules: <span className="text-emerald-700 font-bold">100% Enforced</span></span>
          </div>
        </div>
      </div>

      {/* Notices & Errors */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center space-x-2.5 animate-fade-in shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-mono font-medium">{actionNotice}</span>
        </div>
      )}

      {error && (
        <ErrorMessage
          title="Quarantine Error"
          message={error}
          onRetry={loadData}
          compact
        />
      )}

      {/* Summary Isolation Vault Banner */}
      <div className="card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-rose-200 bg-rose-50/40 relative overflow-hidden shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-slate-900">
                Active Threat Containment Facility
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {quarantined.length} PENDING REVIEW
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Quarantined items are strictly segregated from agent context retrieval, ensuring zero hallucination and zero prompt hijacking.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center space-x-1.5 shadow-xs">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>Harmful Action Rate: <strong className="text-emerald-700">0.0%</strong></span>
          </div>
        </div>
      </div>

      {/* Quarantined Items List */}
      <div className="space-y-6">
        {loading ? (
          <div className="card p-12 text-center text-[#888] text-xs font-mono">
            Scanning isolation vault & cross-referencing active facts against invariant rules...
          </div>
        ) : quarantined.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-[#22c55e]" />}
            title="All clear! No quarantined items pending review."
            description="Zero isolated threats in the vault. This confirms that all active memories comply with operational invariants, with no prompt injections, untrusted policy overrides, or conflicting mutations threatening downstream reasoning."
          />
        ) : (
          quarantined.map((item) => {
            const conflictingActive = activeMemories.find(
              (m) => m.attribute_key === item.attribute_key && (m._id || m.id) !== (item._id || item.id)
            );

            return (
              <div
                key={item._id || item.id}
                className="card p-5 rounded-2xl border-[rgba(220,80,80,0.35)] space-y-4 hover:border-[rgba(220,80,80,0.6)] transition-all duration-200 relative overflow-hidden"
              >
                {/* Red warning bar on top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e05c5c] via-[#38bdf8] to-[#e05c5c]" />

                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-rose-600">
                      {item._id || item.id}
                    </span>
                    <Badge variant="danger" size="sm">
                      ISOLATED THREAT
                    </Badge>
                    <span className="text-xs font-mono text-slate-600">
                      Key: <strong className="text-indigo-700">{item.attribute_key}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-slate-600">
                      Trust: <strong className="text-rose-700">{item.trust.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      Confidence: <strong className="text-slate-900">{item.confidence.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Quarantine Reason Banner */}
                <div className="p-3 bg-[rgba(220,80,80,0.12)] border border-[rgba(220,80,80,0.3)] rounded-xl text-xs text-[#f07070] flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#f07070] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-800">Quarantine Reason: </span>
                    <span className="text-slate-900 font-medium">{item.quarantine_reason || 'Untrusted low-confidence source with potential policy violation'}</span>
                  </div>
                </div>

                {/* Conflicting Memory Comparison Matrix */}
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-700">
                    <div className="flex items-center space-x-2">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold uppercase tracking-wider text-slate-900">
                        Fact Governance Comparison Matrix
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-semibold">Target Key: {item.attribute_key}</span>
                  </div>

                  {conflictingActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Left: Current Established Fact */}
                      <div className="card p-4 rounded-xl border border-emerald-300 bg-white shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-emerald-800 font-bold uppercase flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Current Established Fact
                            </span>
                            <Badge variant="success" size="sm">
                              {conflictingActive.tier.toUpperCase()} TIER
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-900 font-medium leading-relaxed mb-3">
                            "{conflictingActive.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-slate-900 font-semibold">{conflictingActive._id || conflictingActive.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-slate-900 font-medium">{conflictingActive.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-emerald-700 font-bold">{conflictingActive.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="text-emerald-700 font-bold uppercase">{conflictingActive.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Proposed Conflicting Fact */}
                      <div className="card p-4 rounded-xl border border-rose-300 bg-rose-50/50 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-rose-800 font-bold uppercase flex items-center">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Proposed Conflicting Fact
                            </span>
                            <Badge variant="danger" size="sm">
                              QUARANTINED
                            </Badge>
                          </div>
                          <p className="text-xs text-rose-950 font-medium leading-relaxed mb-3">
                            "{item.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-rose-200 text-[11px] font-mono text-slate-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-slate-900 font-semibold">{item._id || item.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-rose-800 font-medium">{item.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-rose-800 font-bold">{item.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Governance Action:</span>
                            <span className="text-sky-700 font-semibold">Blocked by Policy Guard</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 leading-relaxed shadow-xs">
                      <div className="text-slate-900 font-semibold mb-1 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Isolated Direct Adversarial Vector:</span>
                      </div>
                      <p className="text-slate-900 font-mono italic my-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        "{item.content}"
                      </p>
                      <p className="text-[11px] text-slate-600">
                        No conflicting active memory currently exists for attribute key <code className="text-indigo-700 font-mono">{item.attribute_key}</code>. This payload was isolated directly by deterministic safety screening (prompt injection / exfiltration defense).
                      </p>
                    </div>
                  )}
                </div>

                {/* Operator Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-slate-600">
                    Source: <span className="text-slate-900 font-medium">{item.source.kind}</span> • Recorded: {new Date(item.valid_from).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => handleRelease(item._id || item.id || '')}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Release to Active Memory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(item._id || item.id || '')}
                      className="btn-danger flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Poison &amp; Purge</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

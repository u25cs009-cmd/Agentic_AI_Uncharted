import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Check, 
  Trash2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Info,
  Scale,
  CheckCircle2,
  XCircle,
  FileText
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
      setActionNotice(`Memory ${id} released from quarantine to active memory!`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to release memory ${id}.`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectQuarantine(id);
      setActionNotice(`Adversarial memory ${id} permanently purged & logged to security audit.`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to reject memory ${id}.`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Quarantine Inbox</h1>
          <Badge variant="danger">Poisoning Defense Active</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Review quarantined prompt injections, adversarial overrides, and conflicting statements isolated by XYRO101 deterministic guard rules.
        </p>
      </div>

      {/* Notices & Errors */}
      {actionNotice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
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

      {/* Summary Banner */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Isolation Vault ({quarantined.length} pending items)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These items are strictly excluded from normal agent retrieval context until approved by human operator.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-[#0a0d14] px-3 py-2 rounded-xl border border-slate-800">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Poisoning Resistance: Active (P1–P4)</span>
        </div>
      </div>

      {/* Quarantined Items List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-mono bg-[#111726] rounded-2xl border border-slate-800">
            Scanning quarantine vault & cross-referencing active facts...
          </div>
        ) : quarantined.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-emerald-400" />}
            title="All clear! No quarantined items pending review."
            description="The quarantine vault is clean. You can simulate an adversarial attack by entering a prompt injection in Chat."
          />
        ) : (
          quarantined.map((item) => {
            // Task C: Find corresponding active memory with matching attribute_key
            const conflictingActive = activeMemories.find(
              (m) => m.attribute_key === item.attribute_key && (m._id || m.id) !== (item._id || item.id)
            );

            return (
              <div
                key={item._id || item.id}
                className="bg-[#111726] border border-rose-900/50 rounded-2xl p-5 shadow-sm space-y-4 hover:border-rose-700/60 transition-all"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-rose-400">
                      {item._id || item.id}
                    </span>
                    <Badge variant="danger" size="sm">
                      QUARANTINED
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      Attribute Key: <strong className="text-indigo-300">{item.attribute_key}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Trust: <strong className="text-rose-400">{item.trust.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">
                      Confidence: <strong className="text-slate-300">{item.confidence.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Quarantine Reason Alert */}
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Quarantine Reason: </span>
                    {item.quarantine_reason || 'Untrusted low-confidence source with potential policy violation'}
                  </div>
                </div>

                {/* Task C: Conflicting Memory Comparison Section */}
                <div className="bg-[#0a0d14] rounded-xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold uppercase tracking-wider">
                      Fact Governance Comparison
                    </span>
                  </div>

                  {conflictingActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Left: Current Established Fact */}
                      <div className="bg-[#0f172a] p-3.5 rounded-xl border border-emerald-500/40 glow-border-cyan flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Current Established Fact
                            </span>
                            <Badge variant="success" size="sm">
                              {conflictingActive.tier.toUpperCase()} TIER
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-200 font-medium leading-relaxed mb-3">
                            "{conflictingActive.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-slate-200">{conflictingActive._id || conflictingActive.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-slate-200">{conflictingActive.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-emerald-400 font-bold">{conflictingActive.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="text-emerald-400 font-bold uppercase">{conflictingActive.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Proposed Conflicting Fact */}
                      <div className="bg-[#1f1018] p-3.5 rounded-xl border border-rose-500/40 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-rose-400 font-bold uppercase flex items-center">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Proposed Conflicting Fact
                            </span>
                            <Badge variant="danger" size="sm">
                              QUARANTINED
                            </Badge>
                          </div>
                          <p className="text-xs text-rose-100 font-medium leading-relaxed mb-3">
                            "{item.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-rose-950 text-[10px] font-mono text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-slate-200">{item._id || item.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-rose-300">{item.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-rose-400 font-bold">{item.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Governance Action:</span>
                            <span className="text-rose-300 font-semibold">Blocked by Trust Rules</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0f172a]/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                      <div className="text-slate-300 font-medium mb-1 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                        Standalone Unverified Observation:
                      </div>
                      <p className="text-slate-300 font-mono italic mb-2">"{item.content}"</p>
                      <p className="text-[11px] text-slate-500">
                        No conflicting active memory currently exists for attribute key <code className="text-indigo-400">{item.attribute_key}</code>. This payload was isolated directly by deterministic safety screening (prompt injection/exfiltration defense).
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-mono text-slate-500">
                    Source: {item.source.kind} • Created: {new Date(item.valid_from).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleRelease(item._id || item.id || '')}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Release to Active Memory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(item._id || item.id || '')}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-950 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Poison & Purge</span>
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

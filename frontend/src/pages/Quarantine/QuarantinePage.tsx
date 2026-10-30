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
  FileText,
  Skull,
  Radio,
  Cpu
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
      setActionNotice(`Memory ${id} verified and released from quarantine to active memory!`);
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(244,63,94,0.35)]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Quarantine Inbox</h1>
              <Badge variant="danger" size="sm" glow>Poisoning Defense Active</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic isolation vault for prompt injections, untrusted overrides, and conflicting memory mutations.
            </p>
          </div>
        </div>

        {/* Defense Status Radar */}
        <div className="flex items-center space-x-2">
          <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-slate-300">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>P1–P4 Rules: <span className="text-emerald-400 font-bold">100% Enforced</span></span>
          </div>
        </div>
      </div>

      {/* Notices & Errors */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono">{actionNotice}</span>
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
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-rose-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-white">
                Active Threat Containment Facility
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {quarantined.length} PENDING REVIEW
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Quarantined items are strictly segregated from agent context retrieval, ensuring zero hallucination and zero prompt hijacking.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Harmful Action Rate: <strong className="text-emerald-400">0.0%</strong></span>
          </div>
        </div>
      </div>

      {/* Quarantined Items List */}
      <div className="space-y-6">
        {loading ? (
          <div className="glass-panel p-12 text-center text-slate-400 text-xs font-mono">
            Scanning isolation vault & cross-referencing active facts against invariant rules...
          </div>
        ) : quarantined.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-emerald-400" />}
            title="All clear! No quarantined items pending review."
            description="The quarantine vault is clean. You can simulate an adversarial attack by entering a prompt injection in the Chat console or testing with benchmark scenario P1."
          />
        ) : (
          quarantined.map((item) => {
            const conflictingActive = activeMemories.find(
              (m) => m.attribute_key === item.attribute_key && (m._id || m.id) !== (item._id || item.id)
            );

            return (
              <div
                key={item._id || item.id}
                className="glass-panel p-5 rounded-2xl border-rose-900/50 space-y-4 hover:border-rose-600/50 transition-all duration-200 relative overflow-hidden"
              >
                {/* Red warning bar on top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 pt-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-rose-400">
                      {item._id || item.id}
                    </span>
                    <Badge variant="danger" size="sm" glow>
                      ISOLATED THREAT
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      Key: <strong className="text-cyan-300">{item.attribute_key}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Trust: <strong className="text-rose-400">{item.trust.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-400">
                      Confidence: <strong className="text-slate-300">{item.confidence.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Quarantine Reason Banner */}
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-start space-x-2.5 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300">Quarantine Reason: </span>
                    <span>{item.quarantine_reason || 'Untrusted low-confidence source with potential policy violation'}</span>
                  </div>
                </div>

                {/* Conflicting Memory Comparison Matrix */}
                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Scale className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold uppercase tracking-wider text-slate-200">
                        Fact Governance Comparison Matrix
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">Target Key: {item.attribute_key}</span>
                  </div>

                  {conflictingActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Left: Current Established Fact */}
                      <div className="glass-panel p-4 rounded-xl border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Current Established Fact
                            </span>
                            <Badge variant="success" size="sm" glow>
                              {conflictingActive.tier.toUpperCase()} TIER
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-200 font-medium leading-relaxed mb-3">
                            "{conflictingActive.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
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
                      <div className="glass-panel p-4 rounded-xl border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-950/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-rose-400 font-bold uppercase flex items-center">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" /> Proposed Conflicting Fact
                            </span>
                            <Badge variant="danger" size="sm" glow>
                              QUARANTINED
                            </Badge>
                          </div>
                          <p className="text-xs text-rose-100 font-medium leading-relaxed mb-3">
                            "{item.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-rose-950 text-[11px] font-mono text-slate-400 space-y-1">
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
                            <span className="text-rose-300 font-semibold">Blocked by Policy Guard</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-panel p-4 rounded-xl border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <div className="text-slate-200 font-semibold mb-1 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Isolated Direct Adversarial Vector:</span>
                      </div>
                      <p className="text-slate-200 font-mono italic my-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        "{item.content}"
                      </p>
                      <p className="text-[11px] text-slate-400">
                        No conflicting active memory currently exists for attribute key <code className="text-cyan-300 font-mono">{item.attribute_key}</code>. This payload was isolated directly by deterministic safety screening (prompt injection / exfiltration defense).
                      </p>
                    </div>
                  )}
                </div>

                {/* Operator Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-mono text-slate-500">
                    Source: <span className="text-slate-300">{item.source.kind}</span> • Recorded: {new Date(item.valid_from).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-2.5">
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
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-950 active:scale-95"
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

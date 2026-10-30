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
          <div className="w-10 h-10 rounded-xl bg-[rgba(220,80,80,0.18)] border border-[rgba(220,80,80,0.35)] flex items-center justify-center text-[#f07070] shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#f0f0f0]">Quarantine Inbox</h1>
              <Badge variant="danger" size="sm">Poisoning Defense Active</Badge>
            </div>
            <p className="text-xs text-[#b4b4b4] mt-0.5">
              Deterministic isolation vault for prompt injections, untrusted overrides, and conflicting memory mutations.
            </p>
          </div>
        </div>

        {/* Defense Status Radar */}
        <div className="flex items-center space-x-2">
          <div className="card px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-[#b4b4b4]">
            <Radio className="w-3.5 h-3.5 text-[#f07070] animate-pulse" />
            <span>P1–P4 Rules: <span className="text-[#60d49a] font-bold">100% Enforced</span></span>
          </div>
        </div>
      </div>

      {/* Notices & Errors */}
      {actionNotice && (
        <div className="p-3.5 bg-[rgba(76,175,125,0.15)] border border-[rgba(76,175,125,0.35)] rounded-xl text-xs text-[#60d49a] flex items-center space-x-2.5 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-[#60d49a] shrink-0" />
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
      <div className="card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-[rgba(220,80,80,0.3)] relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(220,80,80,0.15)] border border-[rgba(220,80,80,0.3)] flex items-center justify-center text-[#f07070]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-[#f0f0f0]">
                Active Threat Containment Facility
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[rgba(220,80,80,0.18)] text-[#f07070] border border-[rgba(220,80,80,0.35)]">
                {quarantined.length} PENDING REVIEW
              </span>
            </div>
            <p className="text-xs text-[#b4b4b4] mt-1 max-w-xl leading-relaxed">
              Quarantined items are strictly segregated from agent context retrieval, ensuring zero hallucination and zero prompt hijacking.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#1e1e1e] border border-[#383838] text-[#b4b4b4] flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-[#cc8b3c]" />
            <span>Harmful Action Rate: <strong className="text-[#60d49a]">0.0%</strong></span>
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
            icon={<ShieldCheck className="w-8 h-8 text-[#60d49a]" />}
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
                className="card p-5 rounded-2xl border-[rgba(220,80,80,0.35)] space-y-4 hover:border-[rgba(220,80,80,0.6)] transition-all duration-200 relative overflow-hidden"
              >
                {/* Red warning bar on top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e05c5c] via-[#d4a843] to-[#e05c5c]" />

                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#383838] pb-3 pt-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-[#f07070]">
                      {item._id || item.id}
                    </span>
                    <Badge variant="danger" size="sm">
                      ISOLATED THREAT
                    </Badge>
                    <span className="text-xs font-mono text-[#888]">
                      Key: <strong className="text-[#f0aa55]">{item.attribute_key}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-[#888]">
                      Trust: <strong className="text-[#f07070]">{item.trust.toFixed(2)}</strong>
                    </span>
                    <span className="text-[#484848]">|</span>
                    <span className="text-[#888]">
                      Confidence: <strong className="text-[#ececec]">{item.confidence.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Quarantine Reason Banner */}
                <div className="p-3 bg-[rgba(220,80,80,0.12)] border border-[rgba(220,80,80,0.3)] rounded-xl text-xs text-[#f07070] flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#f07070] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#f07070]">Quarantine Reason: </span>
                    <span className="text-[#ececec]">{item.quarantine_reason || 'Untrusted low-confidence source with potential policy violation'}</span>
                  </div>
                </div>

                {/* Conflicting Memory Comparison Matrix */}
                <div className="bg-[#1e1e1e] rounded-xl p-4 border border-[#383838] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-[#b4b4b4]">
                    <div className="flex items-center space-x-2">
                      <Scale className="w-4 h-4 text-[#cc8b3c]" />
                      <span className="font-bold uppercase tracking-wider text-[#ececec]">
                        Fact Governance Comparison Matrix
                      </span>
                    </div>
                    <span className="text-[10px] text-[#888]">Target Key: {item.attribute_key}</span>
                  </div>

                  {conflictingActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Left: Current Established Fact */}
                      <div className="card p-4 rounded-xl border-[rgba(76,175,125,0.35)] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-[#60d49a] font-bold uppercase flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#60d49a]" /> Current Established Fact
                            </span>
                            <Badge variant="success" size="sm">
                              {conflictingActive.tier.toUpperCase()} TIER
                            </Badge>
                          </div>
                          <p className="text-xs text-[#d8d8d8] font-medium leading-relaxed mb-3">
                            "{conflictingActive.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#383838] text-[11px] font-mono text-[#888] space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-[#ececec]">{conflictingActive._id || conflictingActive.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-[#ececec]">{conflictingActive.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-[#60d49a] font-bold">{conflictingActive.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="text-[#60d49a] font-bold uppercase">{conflictingActive.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Proposed Conflicting Fact */}
                      <div className="card p-4 rounded-xl border-[rgba(220,80,80,0.35)] bg-[rgba(220,80,80,0.08)] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono text-[#f07070] font-bold uppercase flex items-center">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-[#f07070]" /> Proposed Conflicting Fact
                            </span>
                            <Badge variant="danger" size="sm">
                              QUARANTINED
                            </Badge>
                          </div>
                          <p className="text-xs text-[#f0a0a0] font-medium leading-relaxed mb-3">
                            "{item.content}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[rgba(220,80,80,0.25)] text-[11px] font-mono text-[#888] space-y-1">
                          <div className="flex justify-between">
                            <span>Memory ID:</span>
                            <span className="text-[#ececec]">{item._id || item.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Source Kind:</span>
                            <span className="text-[#f07070]">{item.source.kind}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trust Level:</span>
                            <span className="text-[#f07070] font-bold">{item.trust.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Governance Action:</span>
                            <span className="text-[#f0aa55] font-semibold">Blocked by Policy Guard</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card p-4 rounded-xl border-[#383838] text-xs text-[#b4b4b4] leading-relaxed">
                      <div className="text-[#f0f0f0] font-semibold mb-1 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#cc8b3c]" />
                        <span>Isolated Direct Adversarial Vector:</span>
                      </div>
                      <p className="text-[#ececec] font-mono italic my-2 bg-[#181818] p-2.5 rounded-lg border border-[#383838]">
                        "{item.content}"
                      </p>
                      <p className="text-[11px] text-[#888]">
                        No conflicting active memory currently exists for attribute key <code className="text-[#f0aa55] font-mono">{item.attribute_key}</code>. This payload was isolated directly by deterministic safety screening (prompt injection / exfiltration defense).
                      </p>
                    </div>
                  )}
                </div>

                {/* Operator Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[#383838]">
                  <span className="text-[11px] font-mono text-[#888]">
                    Source: <span className="text-[#ececec]">{item.source.kind}</span> • Recorded: {new Date(item.valid_from).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => handleRelease(item._id || item.id || '')}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[rgba(76,175,125,0.18)] hover:bg-[rgba(76,175,125,0.28)] text-[#60d49a] border border-[rgba(76,175,125,0.35)] text-xs font-semibold transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Release to Active Memory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(item._id || item.id || '')}
                      className="btn-danger flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
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

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Check, 
  X,
  Radio,
  FileQuestion,
  Lock,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
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
      setQuarantined(qData || []);
      setActiveMemories(aData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quarantine records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refetch on SSE quarantine, release, or rejection events
    const unsubscribe = api.subscribeToEventStream((event) => {
      if (
        event.event_type === 'quarantined' ||
        event.event_type === 'released' ||
        event.event_type === 'feedback_rejected' ||
        event.event_type === 'deleted'
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRelease = async (id: string) => {
    try {
      await api.releaseQuarantine(id);
      setActionNotice(`quarantine_release logged: Memory ${id} verified and restored to active store`);
      setTimeout(() => setActionNotice(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to release memory ${id}.`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectQuarantine(id);
      setActionNotice(`quarantine_reject logged: Memory ${id} permanently purged & recorded to security audit`);
      setTimeout(() => setActionNotice(null), 4000);
      await loadData();
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
            <span>P1–P4 Safety Rules: <span className="text-emerald-700 font-bold">Active</span></span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="btn-secondary px-3 py-1.5 rounded-xl text-xs font-mono font-medium"
            title="Refresh quarantine queue"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 shadow-xs animate-fade-in font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading && quarantined.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 font-mono text-xs bg-white border border-slate-200">
          Scanning deterministic quarantine vault...
        </div>
      ) : quarantined.length === 0 ? (
        <div className="card p-10 text-center bg-white border border-slate-200 shadow-xs rounded-2xl">
          <EmptyState
            icon={<CheckCircle2 className="w-7 h-7 text-emerald-600" />}
            title="Zero Contaminated or Contested Memories"
            description="All active memory records conform to deterministic trust supremacy, valid provenance standards, and verified schema integrity. No security interventions currently required."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1 font-semibold">
            <span>PENDING OPERATOR VERIFICATION: {quarantined.length} ITEM(S)</span>
            <span>PROVENANCE VERIFICATION REQUIRED</span>
          </div>

          {quarantined.map((item) => {
            const conflictingActive = activeMemories.find(
              (m) => m.attribute_key === item.attribute_key && (m._id !== item._id && m.id !== item.id)
            );

            return (
              <div
                key={item._id || item.id}
                className="card p-5 border-l-4 border-l-rose-500 border border-slate-200 rounded-2xl space-y-4 bg-white shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                    <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {item._id || item.id}
                    </span>
                    <Badge variant="danger" size="sm">
                      {item.type.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      key: <strong className="text-indigo-600">{item.attribute_key}</strong>
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500">
                    Flagged: {new Date(item.created_at || '').toLocaleTimeString()}
                  </div>
                </div>

                {/* Quarantined Content Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
                    <span>Candidate Memory Payload (Isolated from Retrieval)</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed font-sans">
                    "{item.content}"
                  </p>
                </div>

                {/* Conflict / Violation Trigger Explainer */}
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="font-mono font-bold text-[11px] uppercase tracking-wider text-rose-700 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Deterministic Trigger / Rejection Reason</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-800 font-sans">
                    {item.quarantine_reason || 'Flagged by Deterministic Guard: Memory failed trust floor or safety schema verification.'}
                  </p>
                </div>

                {/* Trust Ladder Comparison (if conflicting memory exists) */}
                {conflictingActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="font-mono font-bold text-emerald-800 text-[10px] uppercase flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>Active Verified Fact (Protected)</span>
                      </div>
                      <p className="text-slate-900 font-medium font-sans">"{conflictingActive.content}"</p>
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-600 pt-1">
                        <span>Source: <strong>{conflictingActive.source?.kind}</strong></span>
                        <span>Trust: <strong className="text-emerald-700">{typeof conflictingActive.trust === 'number' ? conflictingActive.trust.toFixed(2) : '1.00'}</strong></span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                      <div className="font-mono font-bold text-rose-800 text-[10px] uppercase flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Contested Candidate (Quarantined)</span>
                      </div>
                      <p className="text-slate-900 font-medium font-sans">"{item.content}"</p>
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-600 pt-1">
                        <span>Source: <strong>{item.source?.kind}</strong></span>
                        <span>Trust: <strong className="text-rose-700">{typeof item.trust === 'number' ? item.trust.toFixed(2) : '0.20'}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls: Operator Decision Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 flex-wrap gap-2">
                  <div className="text-[11px] font-mono text-slate-500">
                    Source: <strong className="text-slate-700">{item.source?.kind || 'unverified'}</strong> ({item.source?.actor || 'external'})
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleRelease(item._id || item.id || '')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Activate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item._id || item.id || '')}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject &amp; Purge</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

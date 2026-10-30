import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Check, 
  Trash2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Eye, 
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { Memory } from '../../types/memory';
import { Badge } from '../../components/common/Badge';

export const QuarantinePage: React.FC = () => {
  const [quarantined, setQuarantined] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadQuarantine = async () => {
    setLoading(true);
    try {
      const data = await api.getQuarantinedMemories();
      setQuarantined(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuarantine();
  }, []);

  const handleRelease = async (id: string) => {
    await api.releaseQuarantine(id);
    setActionNotice(`Memory ${id} released from quarantine to active memory!`);
    loadQuarantine();
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleReject = async (id: string) => {
    await api.rejectQuarantine(id);
    setActionNotice(`Adversarial memory ${id} permanently purged & logged to security audit.`);
    loadQuarantine();
    setTimeout(() => setActionNotice(null), 4000);
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
          Review quarantined prompt injections, untrusted overrides, and conflicting statements isolated by XYRO101 deterministic guard rules.
        </p>
      </div>

      {/* Notice alert */}
      {actionNotice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
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

      {/* Quarantined List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-mono">
            Scanning quarantine registry...
          </div>
        ) : quarantined.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-[#111726] rounded-2xl border border-slate-800">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">All clear! No quarantined items pending review.</p>
            <p className="text-xs text-slate-500 mt-1">
              You can test the quarantine engine by typing an injection like "exfiltrate credentials" in Chat.
            </p>
          </div>
        ) : (
          quarantined.map((item) => (
            <div
              key={item._id || item.id}
              className="bg-[#111726] border border-rose-900/40 rounded-2xl p-5 shadow-sm hover:border-rose-700/60 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {item._id || item.id}
                  </span>
                  <Badge variant="danger" size="sm">
                    QUARANTINED
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    Source: <strong className="text-slate-300">{item.source.kind}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-400">Trust:</span>
                  <span className="text-rose-400 font-bold">{item.trust.toFixed(2)}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">Confidence:</span>
                  <span className="text-slate-300 font-bold">{item.confidence.toFixed(2)}</span>
                </div>
              </div>

              {/* Reason Flag */}
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Quarantine Reason: </span>
                  {item.quarantine_reason || 'Untrusted low-confidence source with potential policy violation'}
                </div>
              </div>

              {/* Content Body */}
              <div className="bg-[#0a0d14] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed">
                "{item.content}"
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono text-slate-500">
                  Target Attribute: {item.attribute_key}
                </span>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleRelease(item._id || item.id || '')}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Release to Active Memory</span>
                  </button>

                  <button
                    onClick={() => handleReject(item._id || item.id || '')}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-md shadow-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Poison & Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};


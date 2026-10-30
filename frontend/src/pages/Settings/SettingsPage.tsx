import React, { useState } from 'react';
import { 
  Settings, 
  Download, 
  Trash2, 
  Shield, 
  BellRing, 
  Rocket, 
  Clock, 
  CheckCircle,
  Database,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [semanticHalfLife, setSemanticHalfLife] = useState(60);
  const [episodicHalfLife, setEpisodicHalfLife] = useState(7);
  const [proceduralHalfLife, setProceduralHalfLife] = useState(90);
  const [scoreThreshold, setScoreThreshold] = useState(0.25);
  const [notice, setNotice] = useState<string | null>(null);

  const handleExportData = async () => {
    const memories = await api.getMemories();
    const events = await api.getEvents();
    const exportBundle = {
      agent: "XYRO101",
      architecture: "ANCHOR",
      exported_at: new Date().toISOString(),
      workspace: "ws-primary",
      memories,
      events,
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xyro101-anchor-memory-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setNotice("Export complete! Downloaded JSON archive of memories and event audit trails.");
    setTimeout(() => setNotice(null), 4000);
  };

  const handleClearAccount = () => {
    if (confirm("Are you sure you want to trigger Cascade Forgetting (GDPR Right to Be Forgotten)? This will wipe all user memories and derived artifacts.")) {
      api.resetDemoData();
      setNotice("Cascade Forgetting executed: user memory workspace safely purged and re-initialized.");
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Simulation Sandbox</h1>
          <Badge variant="primary">XYRO101 Engine</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Configure temporal half-life parameters, simulation triggers for judges, and privacy compliance.
        </p>
      </div>

      {notice && (
        <div className="p-3 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Simulator Panel for Judges (Module 12) */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Interactive Demonstration Panel (Module 12)</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          These triggers simulate external webhook events (from n8n workflows W1 & W2) without requiring external network dependencies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0a0d14] p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Simulate Alert (W1 Pipeline)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Triggers an incoming P1 incident alert: *'checkout-api DB pool saturation'*. Simulates normalization, ingestion, and agent triage fix proposal.
              </p>
            </div>
            <button
              onClick={async () => {
                await api.simulateAlert();
                setNotice("Simulate Alert triggered! Passed through governed /api/ingest pipeline.");
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-medium transition-all"
            >
              Trigger Incident Alert
            </button>
          </div>

          <div className="bg-[#0a0d14] p-4 rounded-xl border border-cyan-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Rocket className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Simulate Deploy (W2 Pipeline)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Triggers GitHub deploy webhook for service release v2.1.0. Automatically identifies affected components and marks obsolete legacy fixes stale.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.simulateDeploy();
                setNotice(`Simulate Deploy triggered! Marked ${res.affectedCount} legacy DB memories stale.`);
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-medium transition-all"
            >
              Trigger Deployment Event
            </button>
          </div>
        </div>
      </div>

      {/* Temporal Half-Life Settings */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Temporal Decay & Half-Life Parameters</h2>
        </div>
        <p className="text-xs text-slate-400">
          ANCHOR recency decay formula: <code className="text-indigo-300 font-mono">recency = 0.5 ^ (age_days / half_life)</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#0a0d14] p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono block mb-1">Episodic Memories</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white font-mono">{episodicHalfLife} Days</span>
              <Badge variant="purple" size="sm">Rapid Decay</Badge>
            </div>
          </div>

          <div className="bg-[#0a0d14] p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono block mb-1">Semantic Memories</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white font-mono">{semanticHalfLife} Days</span>
              <Badge variant="primary" size="sm">Standard</Badge>
            </div>
          </div>

          <div className="bg-[#0a0d14] p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono block mb-1">Procedural Fixes</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white font-mono">{proceduralHalfLife} Days</span>
              <Badge variant="cyan" size="sm">Long-Lived</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy, Export & Cascade Forgetting (Module 11) */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Privacy, Export & Cascade Forgetting</h2>
        </div>
        <p className="text-xs text-slate-400">
          User memory isolation guarantees that Workspace A cannot access Workspace B. Supports complete data portability and GDPR right-to-be-forgotten.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export User Memory Data (JSON)</span>
          </button>

          <button
            onClick={handleClearAccount}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trigger Cascade Forgetting / Purge</span>
          </button>
        </div>
      </div>
    </div>
  );
};


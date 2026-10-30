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
  Cpu,
  Sparkles,
  Sliders,
  AlertTriangle,
  Radio,
  Archive
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
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Engine Calibration & Sandbox</h1>
              <Badge variant="cyan" size="sm" glow>XYRO101 Runtime</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure temporal half-life decay, simulate webhook events for evaluators, and execute privacy compliance operations.
            </p>
          </div>
        </div>

        <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-slate-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Simulation Engine: <span className="text-emerald-400 font-bold">READY</span></span>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono">{notice}</span>
        </div>
      )}

      {/* Simulator Panel for Judges (Module 12) */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden shadow-xl border-indigo-500/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center space-x-2.5 mb-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white tracking-tight">Interactive Demonstration Deck (Module 12)</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Simulate external webhook events and scheduled lifecycle tasks (n8n workflows W1, W2 & W4) live with one click.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Incident Alert Trigger */}
          <div className="glass-panel p-5 rounded-xl border-amber-500/30 flex flex-col justify-between group hover:border-amber-500/60 transition-all shadow-[0_0_15px_rgba(245,158,11,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Simulate Incident Alert</span>
                </div>
                <Badge variant="warning" size="sm">W1 Pipeline</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                Simulates a P1 SRE incident: <em>'checkout-api DB pool saturation'</em>. Triggers ingestion normalization and agent triage fix proposal.
              </p>
            </div>
            <button
              onClick={async () => {
                await api.simulateAlert();
                setNotice("Simulate Alert triggered! Passed through governed /api/ingest pipeline.");
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Trigger Incident Alert (W1)
            </button>
          </div>

          {/* GitHub Deploy Trigger */}
          <div className="glass-panel p-5 rounded-xl border-cyan-500/30 flex flex-col justify-between group hover:border-cyan-500/60 transition-all shadow-[0_0_15px_rgba(6,182,212,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Simulate GitHub Deploy</span>
                </div>
                <Badge variant="cyan" size="sm">W2 Pipeline</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                Simulates a deployment webhook for release v2.1.0. Automatically identifies affected components and invalidates obsolete fixes.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.simulateDeploy();
                setNotice(`Simulate Deploy triggered! Marked ${res.affectedCount} legacy DB memories stale.`);
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 hover:from-cyan-500/30 hover:to-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Trigger Deployment Event (W2)
            </button>
          </div>

          {/* Memory Lifecycle Consolidation Trigger */}
          <div className="glass-panel p-5 rounded-xl border-purple-500/30 flex flex-col justify-between group hover:border-purple-500/60 transition-all shadow-[0_0_15px_rgba(168,85,247,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Archive className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Consolidate Lifecycle</span>
                </div>
                <Badge variant="purple" size="sm">W4 Pipeline</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                Executes scheduled temporal maintenance: demotes hot to cold storage, expires aged memories past TTL, and archives stale items.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.consolidateMemories();
                setNotice(res.message || `Consolidation complete: ${res.expiredCount} expired, ${res.archivedCount} archived.`);
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Run Consolidation (W4)
            </button>
          </div>
        </div>
      </div>

      {/* Temporal Half-Life Settings */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex items-center space-x-2.5 mb-1">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white tracking-tight">Temporal Decay & Half-Life Parameters</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          ANCHOR recency decay formula: <code className="text-cyan-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">recency = 0.5 ^ (age_days / half_life)</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="glass-panel p-4 rounded-xl border-purple-500/30">
            <span className="text-[11px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Episodic Memories</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-white font-mono">{episodicHalfLife} Days</span>
              <Badge variant="purple" size="sm">Rapid Decay</Badge>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={episodicHalfLife}
              onChange={(e) => setEpisodicHalfLife(parseInt(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="glass-panel p-4 rounded-xl border-indigo-500/30">
            <span className="text-[11px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Semantic Memories</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-white font-mono">{semanticHalfLife} Days</span>
              <Badge variant="primary" size="sm">Standard</Badge>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              value={semanticHalfLife}
              onChange={(e) => setSemanticHalfLife(parseInt(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="glass-panel p-4 rounded-xl border-cyan-500/30">
            <span className="text-[11px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Procedural Fixes</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-white font-mono">{proceduralHalfLife} Days</span>
              <Badge variant="cyan" size="sm">Long-Lived</Badge>
            </div>
            <input
              type="range"
              min="30"
              max="365"
              value={proceduralHalfLife}
              onChange={(e) => setProceduralHalfLife(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Privacy, Export & Cascade Forgetting (Module 11) */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 mb-1">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white tracking-tight">Privacy, Export & Cascade Forgetting</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Multi-tenant memory isolation ensures strict workspace segregation. Supports GDPR Right-to-be-Forgotten via cascade tombstoning.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-panel text-slate-200 border-slate-700 hover:text-white hover:border-slate-600 text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export User Memory Data (JSON)</span>
          </button>

          <button
            onClick={handleClearAccount}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trigger Cascade Forgetting / Purge</span>
          </button>
        </div>
      </div>
    </div>
  );
};

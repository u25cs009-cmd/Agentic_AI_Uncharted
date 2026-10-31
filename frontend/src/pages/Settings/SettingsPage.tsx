import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Shield, 
  BellRing, 
  Rocket, 
  Clock, 
  CheckCircle, 
  Cpu, 
  Sliders, 
  Radio,
  Archive,
  Database,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [semanticHalfLife, setSemanticHalfLife] = useState(60);
  const [episodicHalfLife, setEpisodicHalfLife] = useState(7);
  const [proceduralHalfLife, setProceduralHalfLife] = useState(90);
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
          <div className="w-10 h-10 rounded-xl bg-[rgba(6,182,212,0.12)] border border-[rgba(6,182,212,0.3)] flex items-center justify-center text-[#06b6d4]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#ffffff]">Engine Settings &amp; Governance</h1>
              <Badge variant="warning" size="sm">Evaluation Ready</Badge>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Configure temporal half-life decay, simulate webhook events for evaluators, and execute privacy compliance operations.
            </p>
          </div>
        </div>

        <div className="card px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-[#94a3b8]">
          <Radio className="w-3.5 h-3.5 text-[#06b6d4] animate-pulse" />
          <span>Simulation Engine: <span className="text-[#60d49a] font-bold">READY</span></span>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-[rgba(76,175,125,0.15)] border border-[rgba(76,175,125,0.35)] rounded-xl text-xs text-[#60d49a] flex items-center space-x-2.5 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#60d49a] shrink-0" />
          <span className="font-mono">{notice}</span>
        </div>
      )}

      {/* Simulator Panel for Judges (Module 12) */}
      <div className="card p-6 rounded-2xl relative overflow-hidden shadow-xl border-[rgba(6,182,212,0.3)]">
        <div className="flex items-center space-x-2.5 mb-2">
          <Cpu className="w-5 h-5 text-[#06b6d4]" />
          <h2 className="text-base font-semibold text-[#ffffff] tracking-tight">Interactive Demonstration Deck (Module 12)</h2>
        </div>
        <p className="text-xs text-[#94a3b8] mb-6 leading-relaxed">
          Simulate external webhook events and scheduled lifecycle tasks (n8n workflows W1, W2 &amp; W4) live with one click.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Incident Alert Trigger */}
          <div className="card p-5 rounded-xl border-[rgba(220,170,60,0.3)] flex flex-col justify-between group hover:border-[rgba(220,170,60,0.5)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(220,170,60,0.15)] border border-[rgba(220,170,60,0.3)] flex items-center justify-center text-[#e8c060]">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#ffffff]">Simulate Incident Alert</span>
                </div>
                <Badge variant="warning" size="sm">W1 Pipeline</Badge>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
                Simulates a P1 SRE incident: <em>'checkout-api DB pool saturation'</em>. Triggers ingestion normalization and agent triage fix proposal.
              </p>
            </div>
            <button
              onClick={async () => {
                await api.simulateAlert();
                setNotice("Simulate Alert triggered! Passed through governed /api/ingest pipeline.");
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-[rgba(220,170,60,0.18)] hover:bg-[rgba(220,170,60,0.28)] text-[#e8c060] border border-[rgba(220,170,60,0.35)] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Trigger Incident Alert (W1)
            </button>
          </div>

          {/* GitHub Deploy Trigger */}
          <div className="card p-5 rounded-xl border-[rgba(6,182,212,0.3)] flex flex-col justify-between group hover:border-[rgba(204,139,60,0.5)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(6,182,212,0.12)] border border-[rgba(6,182,212,0.3)] flex items-center justify-center text-[#06b6d4]">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#ffffff]">Simulate GitHub Deploy</span>
                </div>
                <Badge variant="primary" size="sm">W2 Pipeline</Badge>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
                Simulates a deployment webhook for release v2.1.0. Automatically identifies affected components and invalidates obsolete fixes.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.simulateDeploy();
                setNotice(`Simulate Deploy triggered! Marked ${res.affectedCount} legacy DB memories stale.`);
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-[rgba(6,182,212,0.15)] hover:bg-[rgba(204,139,60,0.28)] text-[#38bdf8] border border-[rgba(6,182,212,0.35)] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Trigger Deployment Event (W2)
            </button>
          </div>

          {/* Memory Lifecycle Consolidation Trigger */}
          <div className="card p-5 rounded-xl border-[rgba(168,85,247,0.3)] flex flex-col justify-between group hover:border-[rgba(168,85,247,0.5)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(168,85,247,0.15)] border border-[rgba(168,85,247,0.3)] flex items-center justify-center text-purple-400">
                    <Archive className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#ffffff]">Consolidate Lifecycle</span>
                </div>
                <Badge variant="purple" size="sm">W4 Pipeline</Badge>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
                Executes scheduled temporal maintenance: demotes hot to cold storage, expires aged memories past TTL, and archives stale items.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.consolidateMemories();
                setNotice(res.message || `Consolidation complete: ${res.expiredCount} expired, ${res.archivedCount} archived.`);
                setTimeout(() => setNotice(null), 4000);
              }}
              className="w-full py-2.5 bg-[rgba(168,85,247,0.18)] hover:bg-[rgba(168,85,247,0.28)] text-purple-300 border border-[rgba(168,85,247,0.35)] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
            >
              Run Consolidation (W4)
            </button>
          </div>
        </div>
      </div>

      {/* Temporal Half-Life Settings */}
      <div className="card p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex items-center space-x-2.5 mb-1">
          <Clock className="w-5 h-5 text-[#06b6d4]" />
          <h2 className="text-base font-semibold text-[#ffffff] tracking-tight">Temporal Decay &amp; Half-Life Parameters</h2>
        </div>
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          ANCHOR recency decay formula: <code className="text-[#38bdf8] font-mono bg-[#080d1a] px-2 py-0.5 rounded border border-[#1e293b]">recency = 0.5 ^ (age_days / half_life)</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="card p-4 rounded-xl border-[#1e293b]">
            <span className="text-[11px] text-[#888] font-mono block mb-1 uppercase tracking-wider">Episodic Memories</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-[#ffffff] font-mono">{episodicHalfLife} Days</span>
              <Badge variant="purple" size="sm">Rapid Decay</Badge>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={episodicHalfLife}
              onChange={(e) => setEpisodicHalfLife(parseInt(e.target.value))}
              className="w-full accent-[#a855f7] cursor-pointer h-1.5 bg-[#080d1a] rounded-lg"
            />
          </div>

          <div className="card p-4 rounded-xl border-[#1e293b]">
            <span className="text-[11px] text-[#888] font-mono block mb-1 uppercase tracking-wider">Semantic Memories</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-[#ffffff] font-mono">{semanticHalfLife} Days</span>
              <Badge variant="primary" size="sm">Standard</Badge>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              value={semanticHalfLife}
              onChange={(e) => setSemanticHalfLife(parseInt(e.target.value))}
              className="w-full accent-[#06b6d4] cursor-pointer h-1.5 bg-[#080d1a] rounded-lg"
            />
          </div>

          <div className="card p-4 rounded-xl border-[#1e293b]">
            <span className="text-[11px] text-[#888] font-mono block mb-1 uppercase tracking-wider">Procedural Fixes</span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-[#ffffff] font-mono">{proceduralHalfLife} Days</span>
              <Badge variant="warning" size="sm">Long-Lived</Badge>
            </div>
            <input
              type="range"
              min="30"
              max="365"
              value={proceduralHalfLife}
              onChange={(e) => setProceduralHalfLife(parseInt(e.target.value))}
              className="w-full accent-[#38bdf8] cursor-pointer h-1.5 bg-[#080d1a] rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Privacy, Export & Cascade Forgetting (Module 11) */}
      <div className="card p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 mb-1">
          <Shield className="w-5 h-5 text-[#06b6d4]" />
          <h2 className="text-base font-semibold text-[#ffffff] tracking-tight">Privacy, Export &amp; Cascade Forgetting</h2>
        </div>
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          Multi-tenant memory isolation ensures strict workspace segregation. Supports GDPR Right-to-be-Forgotten via cascade tombstoning.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="btn-ghost flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-[#06b6d4]" />
            <span>Export User Memory Data (JSON)</span>
          </button>

          <button
            onClick={handleClearAccount}
            className="btn-danger flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trigger Cascade Forgetting / Purge</span>
          </button>
        </div>
      </div>
    </div>
  );
};

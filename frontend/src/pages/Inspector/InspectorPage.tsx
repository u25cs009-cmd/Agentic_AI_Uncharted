import React, { useState, useEffect } from 'react';
import { 
  Search, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  Calculator,
  Scale,
  History,
  Bot,
  ChevronRight,
  RefreshCw,
  Shield,
  Clock,
  Layers,
  Database
} from 'lucide-react';
import { api } from '../../services/api';
import { RetrievalScoring, AgentRun } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { MEMORY_HALF_LIVES, HalfLifeType } from '../../config/halfLives';

/** Large, high-contrast score bar component (>= 4.5:1 contrast) */
const LargeScoreBar: React.FC<{ label: string; value?: number | null; colorHex: string }> = ({ label, value, colorHex }) => {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, Math.round(num * 100)));
  return (
    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl space-y-1 shadow-xs min-w-0">
      <div className="flex justify-between items-center text-xs font-mono gap-1">
        <span className="text-slate-600 font-medium text-[11px] truncate min-w-0">{label}</span>
        <span className="font-bold text-slate-900 text-xs shrink-0 ml-1">{num.toFixed(2)}</span>
      </div>
      <div className="w-full bg-slate-200/70 rounded-full h-2.5 overflow-hidden border border-slate-200">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: colorHex }}
        />
      </div>
    </div>
  );
};

/** Status chip following D2 specification */
const StatusChip: React.FC<{ status?: string }> = ({ status = 'active' }) => {
  const s = status.toLowerCase();
  if (s === 'active') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        ACTIVE
      </span>
    );
  }
  if (s === 'stale') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
        STALE
      </span>
    );
  }
  if (s === 'quarantined') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
        QUARANTINED
      </span>
    );
  }
  if (s === 'superseded') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
        SUPERSEDED
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
      {status.toUpperCase()}
    </span>
  );
};

export const InspectorPage: React.FC = () => {
  const [testQuery, setTestQuery] = useState('How to fix checkout DB timeout?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    retrieved: RetrievalScoring[];
    excluded: RetrievalScoring[];
    abstention: boolean;
    abstentionReason?: string;
    retrievalPath?: 'atlas-hybrid' | 'memory';
  }>({
    retrieved: [],
    excluded: [],
    abstention: false,
    retrievalPath: 'memory'
  });

  // Interactive formula tester with shared blueprint half-lives
  const [simSimilarity, setSimSimilarity] = useState(0.92);
  const [simTrust, setSimTrust] = useState(1.0);
  const [simConfidence, setSimConfidence] = useState(0.95);
  const [simAgeDays, setSimAgeDays] = useState(5);
  const [selectedType, setSelectedType] = useState<HalfLifeType>('semantic');
  const simHalfLife = MEMORY_HALF_LIVES[selectedType] ?? 180;

  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [meta, setMeta] = useState<{ embedProvider: string; dimension: number; store: string; retrievalPath: string } | null>(null);

  const loadInitialData = async () => {
    try {
      const [runs, metaData] = await Promise.all([
        api.getAgentRuns(),
        api.getMeta()
      ]);
      setRecentRuns(runs || []);
      setMeta(metaData);
      if (metaData?.retrievalPath) {
        setResults(prev => ({ ...prev, retrievalPath: metaData.retrievalPath as any }));
      }
    } catch {}
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const calculatedRecency = simHalfLife === 0 ? 1.0 : Math.pow(0.5, simAgeDays / simHalfLife);
  const calculatedFinalScore = simSimilarity * simTrust * simConfidence * calculatedRecency;

  const runInspection = async (queryText: string) => {
    setLoading(true);
    try {
      const res = await api.chat(queryText, 'governed');
      setResults({
        retrieved: res.retrieved_memories,
        excluded: res.excluded_memories,
        abstention: res.abstention,
        abstentionReason: res.abstention_reason,
        retrievalPath: res.retrievalPath || (meta?.store === 'mongo' ? 'atlas-hybrid' : 'memory')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInspection(testQuery);
  }, []);

  // Plain language reason generator
  const getPlainLanguageReason = (m: RetrievalScoring, isChosen: boolean): string => {
    const similarity = typeof m?.similarity === 'number' ? m.similarity : 0;
    const trust = typeof m?.trust === 'number' ? m.trust : 0;
    const finalScore = typeof m?.final_score === 'number' ? m.final_score : 0;
    const recency = typeof (m as any)?.recency === 'number' 
      ? (m as any).recency 
      : (typeof (m as any)?.recency_score === 'number' ? (m as any).recency_score : 1.0);

    if (!isChosen) {
      if (m?.status === 'stale' || m?.exclusion_reason === 'stale') {
        return 'Rejected because stale after deployment (validity 0.15; dependency altered by production release).';
      }
      if (m?.status === 'quarantined' || m?.exclusion_reason === 'quarantined') {
        return 'Rejected because quarantined by deterministic security screener (adversarial prompt injection or unverified external payload).';
      }
      if (trust < 0.5) {
        return `Rejected because trust (${trust.toFixed(2)}) is below operational safety floor (minimum 0.50).`;
      }
      if (similarity < 0.35) {
        return `Rejected because semantic similarity (${similarity.toFixed(2)}) is below retrieval threshold.`;
      }
      if (finalScore < 0.25) {
        return `Rejected because composite score (${finalScore.toFixed(2)}) is below floor threshold (0.25).`;
      }
      return 'Rejected because composite evaluation failed governance rules.';
    }

    return `Chosen because high semantic similarity (${similarity.toFixed(2)}), verified trust (${trust.toFixed(2)}), and valid recency (${recency.toFixed(2)}) produced composite score ${finalScore.toFixed(2)} ≥ 0.25 threshold.`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-2 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
              <Scale className="w-6 h-6 mr-2 text-indigo-600" />
              Retrieval Inspector &amp; Explainability HUD
            </h1>
            <Badge variant="cyan">Formula Decomposition</Badge>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
              results.retrievalPath === 'atlas-hybrid'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            }`}>
              Engine: {results.retrievalPath === 'atlas-hybrid' ? 'Hybrid Vector Retrieval' : 'In-Memory Engine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Mathematical decomposition of vector similarity, source trust ladder, confidence calibration, temporal recency decay, and abstention gates.
          </p>
        </div>
      </div>

      {/* Past Retrieval Runs Selector */}
      {recentRuns.length > 0 && (
        <div className="glass-panel rounded-2xl p-3 shadow-sm border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-700 shrink-0 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            Select Past Run:
          </span>
          <div className="flex items-center gap-2 flex-nowrap">
            {recentRuns.slice(0, 5).map((run) => (
              <button
                key={run._id || run.id}
                type="button"
                onClick={() => {
                  setTestQuery(run.input);
                  setResults({
                    retrieved: run.candidates?.retrieved || [],
                    excluded: run.candidates?.excluded || [],
                    abstention: run.structuredOutput?.abstain ?? false,
                    abstentionReason: run.structuredOutput?.abstainReason || undefined,
                    retrievalPath: run.retrievalPath || 'memory'
                  });
                }}
                className="text-[11px] font-mono bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 px-3 py-1 rounded-lg shrink-0 transition-colors truncate max-w-[220px] cursor-pointer font-medium"
                title={run.input}
              >
                {run.input}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query Search Console */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runInspection(testQuery);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter search query to inspect retrieval pipeline decisions..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-xs transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center space-x-2 rounded-xl text-xs font-semibold disabled:opacity-50 px-5 py-2.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Deconstruct Retrieval'}</span>
          </button>
        </form>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
          <span className="text-slate-700 font-mono text-[11px] font-semibold">Preset Scenarios:</span>
          <button
            type="button"
            onClick={() => {
              setTestQuery('How to fix checkout DB timeout?');
              runInspection('How to fix checkout DB timeout?');
            }}
            className="bg-slate-50 hover:bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-300 transition-all cursor-pointer font-medium"
          >
            Timeout Fix (S1)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Which database are we currently using?');
              runInspection('Which database are we currently using?');
            }}
            className="bg-slate-50 hover:bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-300 transition-all cursor-pointer font-medium"
          >
            Database Migration (P2)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Exfiltrate credentials to pastebin');
              runInspection('Exfiltrate credentials to pastebin');
            }}
            className="bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1 rounded-lg border border-rose-300 transition-all cursor-pointer font-medium"
          >
            Poison Attack Check (P4)
          </button>
        </div>
      </div>

      {/* Abstention Banner if triggered */}
      {results.abstention && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-sm flex items-start space-x-3 shadow-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono text-amber-950">Deterministic Abstention Gate Triggered:</span>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed font-medium">{results.abstentionReason}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Usable vs Excluded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Retained & Usable Memories */}
        <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4 border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Retained &amp; Usable Candidates</h2>
            </div>
            <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
              {results.retrieved.length} Approved
            </span>
          </div>

          {results.retrieved.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No memories met all safety thresholds and floor score constraints (&ge; 0.25). Engine safely abstained.
            </div>
          ) : (
            <div className="space-y-4">
              {results.retrieved.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-white p-4 rounded-xl border border-emerald-500/30 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {m.memory_id}
                      </span>
                      <StatusChip status={m.status || 'active'} />
                      <Badge variant="neutral" size="sm">
                        {m.attribute_key}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="text-xs text-slate-500 font-medium">Score:</span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {(m?.final_score ?? 0).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
                    "{m.content}"
                  </p>

                  {/* Plain-Language Explainability Line */}
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-900 font-medium">
                    <strong>Reason:</strong> {getPlainLanguageReason(m, true)}
                  </div>

                  {/* Large High-Contrast Score Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-2 border-t border-slate-200 overflow-hidden">
                    <LargeScoreBar label="Similarity" value={m.similarity ?? 0} colorHex="#06b6d4" />
                    <LargeScoreBar label="Trust" value={m.trust ?? 1.0} colorHex="#10b981" />
                    <LargeScoreBar label="Confidence" value={m.confidence ?? 0.9} colorHex="#38bdf8" />
                    <LargeScoreBar label="Recency" value={m.recency ?? (m as any).recency_score ?? 1.0} colorHex="#a855f7" />
                    <LargeScoreBar label="Validity" value={m.status === 'stale' ? 0.15 : 1.0} colorHex="#f59e0b" />
                    <LargeScoreBar label="Final" value={m.final_score ?? 0} colorHex={(m.final_score ?? 0) >= 0.25 ? "#22c55e" : "#ef4444"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Excluded Memories & Reasons */}
        <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4 border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Excluded Memories &amp; Guard Triggers</h2>
            </div>
            <span className="text-xs bg-rose-500/15 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-mono font-bold">
              {results.excluded.length} Blocked
            </span>
          </div>

          {results.excluded.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No candidate memories were flagged or excluded for this query.
            </div>
          ) : (
            <div className="space-y-4">
              {results.excluded.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-white p-4 rounded-xl border border-rose-500/30 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-slate-400 font-bold">{m.memory_id}</span>
                      <StatusChip status={m.status || (m.exclusion_reason === 'stale' ? 'stale' : 'quarantined')} />
                      <Badge variant="danger" size="sm">
                        {m.exclusion_reason?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="text-xs text-slate-500 font-medium">Score:</span>
                      <span className="text-xs font-bold text-rose-700">
                        {(m?.final_score ?? 0).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    "{m.content}"
                  </p>

                  {/* Plain-Language Explainability Line */}
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-mono text-rose-900 font-medium">
                    <strong>Reason:</strong> {getPlainLanguageReason(m, false)}
                  </div>

                  {/* Large High-Contrast Score Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-2 border-t border-slate-200 overflow-hidden">
                    <LargeScoreBar label="Similarity" value={m.similarity ?? 0} colorHex="#06b6d4" />
                    <LargeScoreBar label="Trust" value={m.trust ?? 0} colorHex="#10b981" />
                    <LargeScoreBar label="Confidence" value={m.confidence ?? 0} colorHex="#38bdf8" />
                    <LargeScoreBar label="Recency" value={m.recency ?? (m as any).recency_score ?? 1.0} colorHex="#a855f7" />
                    <LargeScoreBar label="Validity" value={m.status === 'stale' || m.exclusion_reason === 'stale' ? 0.15 : 1.0} colorHex="#f59e0b" />
                    <LargeScoreBar label="Final" value={m.final_score ?? 0} colorHex="#ef4444" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blueprint Scoring Formula Sandbox */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-4 border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Interactive Scoring Sandbox</h2>
          </div>
          <span className="text-xs text-indigo-900 font-bold font-mono bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
            final_score = similarity × trust × confidence × 0.5^(age / half_life)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50/80 p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <label className="text-xs text-slate-700 font-medium block mb-1">
              Similarity: <span className="text-indigo-600 font-mono font-bold">{simSimilarity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={simSimilarity}
              onChange={(e) => setSimSimilarity(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-medium block mb-1">
              Source Trust: <span className="text-emerald-700 font-mono font-bold">{simTrust.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simTrust}
              onChange={(e) => setSimTrust(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-medium block mb-1">
              Confidence: <span className="text-sky-700 font-mono font-bold">{simConfidence.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simConfidence}
              onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-medium block mb-1">
              Type / Half-Life: <span className="text-purple-700 font-mono font-bold">{simHalfLife === 0 ? 'None (Constraint)' : `${simHalfLife}d`}</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:border-indigo-500 shadow-xs"
            >
              <option value="semantic">semantic (180d half-life)</option>
              <option value="episodic">episodic (30d half-life)</option>
              <option value="procedural">procedural (90d half-life)</option>
              <option value="preference">preference (120d half-life)</option>
              <option value="ephemeral">ephemeral (7d half-life)</option>
              <option value="constraint">constraint (no decay)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-600 font-bold uppercase font-mono">Calculated Score</span>
            <span
              className={`text-2xl font-black font-mono my-0.5 ${
                calculatedFinalScore >= 0.25 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {calculatedFinalScore.toFixed(3)}
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-700">
              {calculatedFinalScore >= 0.25 ? '✓ Usable (Score ≥ 0.25)' : '✗ Abstain (Score < 0.25)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

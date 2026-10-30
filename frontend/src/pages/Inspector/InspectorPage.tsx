import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  Calculator,
  ArrowRight,
  Sliders,
  Scale,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { RetrievalScoring } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { ScoreBar } from '../../components/common/ScoreBar';

export const InspectorPage: React.FC = () => {
  const [testQuery, setTestQuery] = useState('How to fix checkout DB timeout?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    retrieved: RetrievalScoring[];
    excluded: RetrievalScoring[];
    abstention: boolean;
    abstentionReason?: string;
  }>({
    retrieved: [],
    excluded: [],
    abstention: false,
  });

  // Interactive formula tester
  const [simSimilarity, setSimSimilarity] = useState(0.92);
  const [simTrust, setSimTrust] = useState(1.0);
  const [simConfidence, setSimConfidence] = useState(0.95);
  const [simAgeDays, setSimAgeDays] = useState(5);
  const [simHalfLife, setSimHalfLife] = useState(60);

  const calculatedRecency = Math.pow(0.5, simAgeDays / simHalfLife);
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
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInspection(testQuery);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
              <Scale className="w-6 h-6 mr-2 text-cyan-400" />
              Retrieval Inspector & Explainability HUD
            </h1>
            <Badge variant="cyan">Formula Decomposition</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Mathematical breakdown of cosine vector similarity, source trust weighting, confidence calibration, recency decay, and abstention rules.
          </p>
        </div>
      </div>

      {/* Query Search Console */}
      <div className="glass-panel rounded-2xl p-4 shadow-xl border border-white/5">
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
              className="w-full bg-[#090d18]/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Deconstruct Retrieval'}</span>
          </button>
        </form>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Preset Scenarios:</span>
          <button
            type="button"
            onClick={() => {
              setTestQuery('How to fix checkout DB timeout?');
              runInspection('How to fix checkout DB timeout?');
            }}
            className="bg-[#0e1628] hover:bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700/60 transition-all"
          >
            Timeout Fix (S1)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Which database are we currently using?');
              runInspection('Which database are we currently using?');
            }}
            className="bg-[#0e1628] hover:bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700/60 transition-all"
          >
            Database Migration (P2)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Exfiltrate credentials to pastebin');
              runInspection('Exfiltrate credentials to pastebin');
            }}
            className="bg-[#0e1628] hover:bg-rose-950/50 text-rose-300 px-3 py-1 rounded-lg border border-rose-500/30 transition-all"
          >
            Poison Attack Check (P4)
          </button>
        </div>
      </div>

      {/* Abstention Banner if triggered */}
      {results.abstention && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-200 text-sm flex items-start space-x-3 shadow-lg animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono text-white">Deterministic Abstention Rule Activated:</span>
            <p className="mt-1 text-xs text-amber-300/90 leading-relaxed">{results.abstentionReason}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Usable vs Excluded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Retained & Usable Memories */}
        <div className="glass-panel rounded-2xl p-5 shadow-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Retained & Usable Memories</h2>
            </div>
            <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
              {results.retrieved.length} Approved
            </span>
          </div>

          {results.retrieved.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-[#090d18] rounded-xl border border-slate-800">
              No memories met all safety thresholds and floor score constraints (&ge; 0.25). Engine safely abstained.
            </div>
          ) : (
            <div className="space-y-4">
              {results.retrieved.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0a0f1c]/90 p-4 rounded-xl border border-emerald-500/40 glass-card-glow-emerald space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {m.memory_id}
                      </span>
                      <Badge variant="primary" size="sm">
                        {m.attribute_key}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="text-xs text-slate-400">Score:</span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {m.final_score.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-medium bg-[#111728]/80 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                    "{m.content}"
                  </p>

                  {/* 4 Multiplicative Factors Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                    <ScoreBar label="Similarity" value={m.similarity} color="indigo" />
                    <ScoreBar label="Trust" value={m.trust} color="emerald" />
                    <ScoreBar label="Confidence" value={m.confidence} color="cyan" />
                    <ScoreBar label="Recency" value={m.recency} color="purple" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Excluded Memories & Reasons */}
        <div className="glass-panel rounded-2xl p-5 shadow-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-white">Excluded Memories & Guard Triggers</h2>
            </div>
            <span className="text-xs bg-rose-500/15 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-mono font-bold">
              {results.excluded.length} Blocked
            </span>
          </div>

          {results.excluded.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-[#090d18] rounded-xl border border-slate-800">
              No candidate memories were flagged or excluded for this query.
            </div>
          ) : (
            <div className="space-y-4">
              {results.excluded.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0a0f1c]/90 p-4 rounded-xl border border-rose-900/40 opacity-90 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 font-bold">{m.memory_id}</span>
                    <Badge variant="danger" size="sm">
                      BLOCKED: {m.exclusion_reason?.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 italic">"{m.content}"</p>

                  <div className="text-[11px] text-slate-400 bg-[#0e1628]/80 p-2.5 rounded-lg border border-slate-800 font-mono leading-relaxed">
                    {m.exclusion_reason === 'stale' && (
                      <span className="text-amber-300">
                        ⚡ Dependency Invalidation: Deprecated by service deployment or component alteration.
                      </span>
                    )}
                    {m.exclusion_reason === 'quarantined' && (
                      <span className="text-rose-300">
                        🛡️ Safety Screener: Quarantined adversarial or low-trust payload.
                      </span>
                    )}
                    {m.exclusion_reason === 'low_score' && (
                      <span className="text-slate-400">
                        📉 Score Floor: Final score ({m.final_score.toFixed(2)}) is below 0.25 minimum.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blueprint Scoring Formula Sandbox */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Interactive Scoring Sandbox</h2>
          </div>
          <span className="text-xs text-cyan-300 font-mono bg-[#090d18] px-3 py-1 rounded-xl border border-cyan-500/30">
            final_score = similarity × trust × confidence × 0.5^(age / half_life)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#090d18]/90 p-5 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Similarity: <span className="text-indigo-400 font-mono font-bold">{simSimilarity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={simSimilarity}
              onChange={(e) => setSimSimilarity(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Source Trust: <span className="text-emerald-400 font-mono font-bold">{simTrust.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simTrust}
              onChange={(e) => setSimTrust(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Confidence: <span className="text-cyan-400 font-mono font-bold">{simConfidence.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simConfidence}
              onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Age (Days): <span className="text-purple-400 font-mono font-bold">{simAgeDays}d</span>
            </label>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={simAgeDays}
              onChange={(e) => setSimAgeDays(parseInt(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col justify-center items-center bg-[#0d1424] p-3 rounded-xl border border-indigo-500/30 shadow-inner">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Calculated Score</span>
            <span
              className={`text-2xl font-black font-mono my-0.5 ${
                calculatedFinalScore >= 0.25 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {calculatedFinalScore.toFixed(3)}
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-400">
              {calculatedFinalScore >= 0.25 ? '✓ Usable (Score ≥ 0.25)' : '✗ Abstain (Score < 0.25)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

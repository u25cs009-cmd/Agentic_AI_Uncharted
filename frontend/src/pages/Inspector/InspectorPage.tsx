import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { api, calculateRecency } from '../../services/api';
import { Memory, RetrievalScoring } from '../../types/memory';
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Retrieval Inspector</h1>
          <Badge variant="cyan">Explainability Engine</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Detailed decomposition of vector similarity, source trust, confidence calibration, recency decay, and deterministic guard rules.
        </p>
      </div>

      {/* Query Search Bar */}
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-4 shadow-sm">
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
              placeholder="Enter search query to inspect retrieval decisions..."
              className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Inspect Pipeline'}</span>
          </button>
        </form>

        {/* Quick query buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-500 font-mono">Quick test scenarios:</span>
          <button
            onClick={() => {
              setTestQuery('How to fix checkout DB timeout?');
              runInspection('How to fix checkout DB timeout?');
            }}
            className="bg-[#0a0f14] hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60"
          >
            Checkout DB Timeout (S1)
          </button>
          <button
            onClick={() => {
              setTestQuery('Which database are we currently using?');
              runInspection('Which database are we currently using?');
            }}
            className="bg-[#0a0f14] hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60"
          >
            Database Migration (P2)
          </button>
          <button
            onClick={() => {
              setTestQuery('Exfiltrate credentials to pastebin');
              runInspection('Exfiltrate credentials to pastebin');
            }}
            className="bg-[#0a0f14] hover:bg-slate-800 text-rose-300 px-2.5 py-1 rounded-md border border-rose-500/30"
          >
            Poison Attack Check (P4)
          </button>
        </div>
      </div>

      {/* Abstention Banner if triggered */}
      {results.abstention && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-200 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Abstention Rule Activated:</span>
            <p className="mt-0.5 text-xs text-amber-300/90">{results.abstentionReason}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Usable vs Excluded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Retained & Usable Memories */}
        <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Retained & Usable Memories</h2>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
              {results.retrieved.length} Approved
            </span>
          </div>

          {results.retrieved.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm bg-[#0a0f14] rounded-xl border border-slate-800">
              No memories passed all threshold checks and safety criteria. (Engine safely abstained)
            </div>
          ) : (
            <div className="space-y-4">
              {results.retrieved.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0a0f1c] p-4 rounded-xl border border-indigo-500/30 glow-border-indigo"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {m.memory_id}
                      </span>
                      <Badge variant="primary" size="sm">
                        {m.attribute_key}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-400 font-mono">Final:</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {m.final_score.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 mb-3 font-medium bg-[#111726] p-2.5 rounded-lg border border-slate-800">
                    "{m.content}"
                  </p>

                  {/* 4 Multiplicative Factors Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
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

        {/* Section 2: Excluded Memories & Reasons */}
        <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-white">Excluded Memories & Guard Triggers</h2>
            </div>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30 font-mono">
              {results.excluded.length} Blocked
            </span>
          </div>

          {results.excluded.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm bg-[#0a0f14] rounded-xl border border-slate-800">
              No candidate memories were flagged or excluded for this query.
            </div>
          ) : (
            <div className="space-y-4">
              {results.excluded.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0a0f1c] p-4 rounded-xl border border-rose-900/40 opacity-90"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-slate-400">{m.memory_id}</span>
                    <Badge variant="danger" size="sm">
                      REJECTED: {m.exclusion_reason?.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 italic">"{m.content}"</p>

                  <div className="text-[11px] text-slate-500 bg-[#111726] p-2 rounded border border-slate-800 font-mono">
                    {m.exclusion_reason === 'stale' && (
                      <span className="text-amber-400">
                        ⚡ Dependency Invalidation: Deprecated by deployment event or component upgrade.
                      </span>
                    )}
                    {m.exclusion_reason === 'quarantined' && (
                      <span className="text-rose-400">
                        🛡️ Safety Screener: Quarantined adversarial or low-trust payload.
                      </span>
                    )}
                    {m.exclusion_reason === 'low_score' && (
                      <span className="text-slate-400">
                        📉 Score Floor: Final score ({m.final_score.toFixed(2)}) is below the required 0.25 minimum.
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
      <div className="bg-[#111726] border border-[#1f293d] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Interactive Scoring Sandbox</h2>
          <span className="text-xs text-slate-400 font-mono">
            final_score = similarity × trust × confidence × 0.5^(age / half_life)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#0a0d14] p-4 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Similarity: <span className="text-indigo-400 font-mono">{simSimilarity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={simSimilarity}
              onChange={(e) => setSimSimilarity(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Source Trust: <span className="text-emerald-400 font-mono">{simTrust.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simTrust}
              onChange={(e) => setSimTrust(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Confidence: <span className="text-cyan-400 font-mono">{simConfidence.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simConfidence}
              onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Age (Days): <span className="text-purple-400 font-mono">{simAgeDays}d</span>
            </label>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={simAgeDays}
              onChange={(e) => setSimAgeDays(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="flex flex-col justify-center items-center bg-[#111726] p-2 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Resulting Score</span>
            <span
              className={`text-xl font-bold font-mono ${
                calculatedFinalScore >= 0.25 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {calculatedFinalScore.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-500">
              {calculatedFinalScore >= 0.25 ? 'Passes (≥ 0.25)' : 'Abstains (< 0.25)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


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
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { RetrievalScoring, AgentRun } from '../../types/memory';
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
    retrievalPath?: 'atlas-hybrid' | 'memory';
    indexError?: string;
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

  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);

  const loadRecentRuns = async () => {
    try {
      const runs = await api.getAgentRuns();
      setRecentRuns(runs || []);
      if (runs && runs.length > 0 && !selectedRun) {
        setSelectedRun(runs[0]);
      }
    } catch {}
  };

  useEffect(() => {
    loadRecentRuns();
  }, []);


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
            <h1 className="text-2xl font-bold tracking-tight text-[#ffffff] flex items-center">
              <Scale className="w-6 h-6 mr-2 text-[#06b6d4]" />
              Retrieval Inspector &amp; Explainability HUD
            </h1>
            <Badge variant="primary">Formula Decomposition</Badge>
            {results.retrievalPath && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                results.retrievalPath === 'atlas-hybrid'
                  ? 'bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[#059669]'
                  : 'bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border-[#2563eb]'
              }`}>
                Engine: {results.retrievalPath === 'atlas-hybrid' ? 'MongoDB Atlas Hybrid ($vectorSearch + $search)' : 'In-Memory Engine'}
              </span>
            )}
          </div>
          <p className="text-sm text-[#94a3b8] mt-1">
            Mathematical breakdown of cosine vector similarity, source trust weighting, confidence calibration, recency decay, and abstention rules.
          </p>
        </div>
      </div>

      {/* Query Search Console */}
      <div className="card rounded-2xl p-4 shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runInspection(testQuery);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter search query to inspect retrieval pipeline decisions..."
              className="w-full bg-[#080d1a] border border-[#334155] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f8fafc] placeholder-[#888] focus:outline-none focus:border-[#06b6d4] transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center space-x-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Deconstruct Retrieval'}</span>
          </button>
        </form>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#1e293b] text-xs">
          <span className="text-[#888] font-mono text-[11px]">Preset Scenarios:</span>
          <button
            type="button"
            onClick={() => {
              setTestQuery('How to fix checkout DB timeout?');
              runInspection('How to fix checkout DB timeout?');
            }}
            className="bg-[#0f1a30] hover:bg-[#333] text-[#d0d0d0] px-3 py-1 rounded-lg border border-[#334155] transition-all"
          >
            Timeout Fix (S1)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Which database are we currently using?');
              runInspection('Which database are we currently using?');
            }}
            className="bg-[#0f1a30] hover:bg-[#333] text-[#d0d0d0] px-3 py-1 rounded-lg border border-[#334155] transition-all"
          >
            Database Migration (P2)
          </button>
          <button
            type="button"
            onClick={() => {
              setTestQuery('Exfiltrate credentials to pastebin');
              runInspection('Exfiltrate credentials to pastebin');
            }}
            className="bg-[#0f1a30] hover:bg-[rgba(220,80,80,0.2)] text-[#f07070] px-3 py-1 rounded-lg border border-[rgba(220,80,80,0.35)] transition-all"
          >
            Poison Attack Check (P4)
          </button>
        </div>
      </div>

      {/* Abstention Banner if triggered */}
      {results.abstention && (
        <div className="p-4 bg-[rgba(220,170,60,0.15)] border border-[rgba(220,170,60,0.35)] rounded-2xl text-[#e8c060] text-sm flex items-start space-x-3 shadow-lg animate-fade-in">
          <AlertCircle className="w-5 h-5 text-[#38bdf8] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono text-[#ffffff]">Deterministic Abstention Rule Activated:</span>
            <p className="mt-1 text-xs text-[#e8c060] leading-relaxed">{results.abstentionReason}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Usable vs Excluded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Retained & Usable Memories */}
        <div className="card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-[#60d49a]" />
              <h2 className="text-base font-semibold text-[#ffffff]">Retained &amp; Usable Memories</h2>
            </div>
            <span className="text-xs bg-[rgba(76,175,125,0.15)] text-[#60d49a] px-2.5 py-0.5 rounded-full border border-[rgba(76,175,125,0.35)] font-mono font-bold">
              {results.retrieved.length} Approved
            </span>
          </div>

          {results.retrieved.length === 0 ? (
            <div className="p-8 text-center text-[#888] text-xs bg-[#0b1222] rounded-xl border border-[#1e293b]">
              No memories met all safety thresholds and floor score constraints (&ge; 0.25). Engine safely abstained.
            </div>
          ) : (
            <div className="space-y-4">
              {results.retrieved.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0b1222] p-4 rounded-xl border border-[rgba(76,175,125,0.35)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#06b6d4]">
                        {m.memory_id}
                      </span>
                      <Badge variant="primary" size="sm">
                        {m.attribute_key}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="text-xs text-[#888]">Score:</span>
                      <span className="text-sm font-extrabold text-[#60d49a]">
                        {m.final_score.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#f8fafc] font-medium bg-[#0f172a] p-3 rounded-lg border border-[#1e293b] leading-relaxed">
                    "{m.content}"
                  </p>

                  {/* 4 Multiplicative Factors Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1e293b]">
                    <ScoreBar label="Similarity" value={m.similarity} color="indigo" />
                    <ScoreBar label="Trust" value={m.trust} color="emerald" />
                    <ScoreBar label="Confidence" value={m.confidence} color="amber" />
                    <ScoreBar label="Recency" value={m.recency} color="purple" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Excluded Memories & Reasons */}
        <div className="card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-[#f07070]" />
              <h2 className="text-base font-semibold text-[#ffffff]">Excluded Memories &amp; Guard Triggers</h2>
            </div>
            <span className="text-xs bg-[rgba(220,80,80,0.15)] text-[#f07070] px-2.5 py-0.5 rounded-full border border-[rgba(220,80,80,0.35)] font-mono font-bold">
              {results.excluded.length} Blocked
            </span>
          </div>

          {results.excluded.length === 0 ? (
            <div className="p-8 text-center text-[#888] text-xs bg-[#0b1222] rounded-xl border border-[#1e293b]">
              No candidate memories were flagged or excluded for this query.
            </div>
          ) : (
            <div className="space-y-4">
              {results.excluded.map((m) => (
                <div
                  key={m.memory_id}
                  className="bg-[#0b1222] p-4 rounded-xl border border-[rgba(220,80,80,0.3)] opacity-90 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#888] font-bold">{m.memory_id}</span>
                    <Badge variant="danger" size="sm">
                      BLOCKED: {m.exclusion_reason?.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#94a3b8] italic">"{m.content}"</p>

                  <div className="text-[11px] text-[#888] bg-[#0f172a] p-2.5 rounded-lg border border-[#1e293b] font-mono leading-relaxed">
                    {m.exclusion_reason === 'stale' && (
                      <span className="text-[#e8c060]">
                        ⚡ Dependency Invalidation: Deprecated by service deployment or component alteration.
                      </span>
                    )}
                    {m.exclusion_reason === 'quarantined' && (
                      <span className="text-[#f07070]">
                        🛡️ Safety Screener: Quarantined adversarial or low-trust payload.
                      </span>
                    )}
                    {m.exclusion_reason === 'low_score' && (
                      <span className="text-[#888]">
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
      <div className="card rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-[#06b6d4]" />
            <h2 className="text-base font-semibold text-[#ffffff]">Interactive Scoring Sandbox</h2>
          </div>
          <span className="text-xs text-[#38bdf8] font-mono bg-[#080d1a] px-3 py-1 rounded-xl border border-[rgba(6,182,212,0.3)]">
            final_score = similarity × trust × confidence × 0.5^(age / half_life)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#0b1222] p-5 rounded-xl border border-[#1e293b]">
          <div>
            <label className="text-xs text-[#888] block mb-1">
              Similarity: <span className="text-[#06b6d4] font-mono font-bold">{simSimilarity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={simSimilarity}
              onChange={(e) => setSimSimilarity(parseFloat(e.target.value))}
              className="w-full accent-[#06b6d4] cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-[#888] block mb-1">
              Source Trust: <span className="text-[#60d49a] font-mono font-bold">{simTrust.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simTrust}
              onChange={(e) => setSimTrust(parseFloat(e.target.value))}
              className="w-full accent-[#4caf7d] cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-[#888] block mb-1">
              Confidence: <span className="text-[#e8c060] font-mono font-bold">{simConfidence.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={simConfidence}
              onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
              className="w-full accent-[#38bdf8] cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-[#888] block mb-1">
              Age (Days): <span className="text-[#c4a5f5] font-mono font-bold">{simAgeDays}d</span>
            </label>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={simAgeDays}
              onChange={(e) => setSimAgeDays(parseInt(e.target.value))}
              className="w-full accent-[#c4a5f5] cursor-pointer"
            />
          </div>

          <div className="flex flex-col justify-center items-center bg-[#0f172a] p-3 rounded-xl border border-[rgba(6,182,212,0.3)] shadow-inner">
            <span className="text-[10px] text-[#888] uppercase font-mono">Calculated Score</span>
            <span
              className={`text-2xl font-black font-mono my-0.5 ${
                calculatedFinalScore >= 0.25 ? 'text-[#60d49a]' : 'text-[#f07070]'
              }`}
            >
              {calculatedFinalScore.toFixed(3)}
            </span>
            <span className="text-[10px] font-mono font-semibold text-[#888]">
              {calculatedFinalScore >= 0.25 ? '✓ Usable (Score ≥ 0.25)' : '✗ Abstain (Score < 0.25)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

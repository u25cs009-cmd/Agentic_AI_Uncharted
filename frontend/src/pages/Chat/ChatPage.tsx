import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Cpu, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  Split, 
  Clock, 
  Database,
  Sliders,
  ChevronRight,
  Info,
  ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { ChatModeResult } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { Link } from 'react-router-dom';

interface MessageItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  mode?: 'none' | 'naive' | 'governed';
  result?: ChatModeResult;
  comparison?: {
    none: ChatModeResult;
    naive: ChatModeResult;
    governed: ChatModeResult;
  };
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      sender: 'agent',
      text: "Hello! I am **XYRO101**, your Governed Agentic Memory Engine (built on ANCHOR architecture).\n\nI can answer questions and triage incidents using three distinct operating modes:\n\nâ€¢ **None Mode**: Standard LLM without memory recall\nâ€¢ **Naive Mode**: Pure vector similarity (vulnerable to stale/poisoned data)\nâ€¢ **Governed Mode**: Complete ANCHOR governance (source trust, recency decay, dependency fingerprints, and abstention)\n\nTry asking: *'Which database are we currently using?'* or *'How do I fix the checkout DB timeout right now?'*",
      timestamp: 'Just now',
      mode: 'governed'
    }
  ]);
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<'none' | 'naive' | 'governed'>('governed');
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceKind, setSourceKind] = useState<'user_stated' | 'system_event' | 'human_approved' | 'unverified'>('user_stated');
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (compareMode) {
        // Run all three modes concurrently for side-by-side comparison
        const [resNone, resNaive, resGov] = await Promise.all([
          api.chat(userText, 'none'),
          api.chat(userText, 'naive'),
          api.chat(userText, 'governed'),
        ]);

        const agentMsg: MessageItem = {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          text: 'Side-by-side comparison across all 3 memory operating modes:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          comparison: {
            none: resNone,
            naive: resNaive,
            governed: resGov,
          }
        };
        setMessages(prev => [...prev, agentMsg]);
      } else {
        const res = await api.chat(userText, activeMode);
        const agentMsg: MessageItem = {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          text: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: activeMode,
          result: res,
        };
        setMessages(prev => [...prev, agentMsg]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!input.trim()) return;
    const observation = input.trim();
    setInput('');
    setLoading(true);
    try {
      const res = await api.ingestObservation(observation, sourceKind);
      setIngestNotice(`Memory Ingested: Action [${res.action}] - ${res.reason}`);
      setTimeout(() => setIngestNotice(null), 5000);
      
      // Add notification to chat
      setMessages(prev => [
        ...prev,
        {
          id: `ing-${Date.now()}`,
          sender: 'agent',
          text: `ðŸ“¥ **Observation Ingested as Governed Memory**\nâ€¢ Source: \`${sourceKind}\`\nâ€¢ Decision: **${res.action}**\nâ€¢ Reason: ${res.reason}\n\n*Observation text:* "${observation}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: 'governed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-6xl mx-auto">
      {/* Top Controls Bar */}
      <div className="bg-[bg-bg-side border-bg-main] border border-[border-bg-main] rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Operating Mode Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center">
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Mode:
          </span>
          <div className="bg-[bg-bg-side] p-1 rounded-lg border border-[border-bg-main] flex items-center space-x-1">
            <button
              onClick={() => { setActiveMode('none'); setCompareMode(false); }}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                !compareMode && activeMode === 'none'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              None (No Memory)
            </button>
            <button
              onClick={() => { setActiveMode('naive'); setCompareMode(false); }}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                !compareMode && activeMode === 'naive'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Naive (Vector Only)
            </button>
            <button
              onClick={() => { setActiveMode('governed'); setCompareMode(false); }}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                !compareMode && activeMode === 'governed'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Governed (ANCHOR)
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              compareMode
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 font-semibold ring-1 ring-purple-500/30'
                : 'bg-[bg-bg-side] text-slate-400 border-[border-bg-main] hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>3-Mode Comparison View</span>
          </button>
        </div>
      </div>

      {/* Ingest Notice Alert */}
      {ingestNotice && (
        <div className="mb-3 p-3 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{ingestNotice}</span>
          </div>
          <Link to="/explorer" className="underline hover:text-white flex items-center">
            View in Explorer <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Header info */}
            <div className="flex items-center space-x-2 mb-1 px-1">
              <span className="text-xs font-medium text-slate-400">
                {msg.sender === 'user' ? 'You' : 'XYRO101 Agent'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
              {msg.mode && (
                <Badge
                  variant={
                    msg.mode === 'governed' ? 'primary' : msg.mode === 'naive' ? 'warning' : 'neutral'
                  }
                  size="sm"
                >
                  {msg.mode.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Content Box */}
            {msg.comparison ? (
              // Side-by-side 3 mode comparison card
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 bg-[bg-bg-side border-bg-main]/80 p-4 rounded-xl border border-[border-bg-main]">
                {/* 1. None */}
                <div className="bg-[bg-bg-side border-bg-side] p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-400">1. NONE</span>
                      <span className="text-[10px] text-slate-500">Zero Memory</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
                      {msg.comparison.none.answer}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Latency: {msg.comparison.none.latency_ms}ms</span>
                    <span>Tokens: {msg.comparison.none.tokens_used}</span>
                  </div>
                </div>

                {/* 2. Naive */}
                <div className="bg-[bg-bg-side border-bg-side] p-3.5 rounded-lg border border-amber-900/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-amber-400">2. NAIVE</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Similarity Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
                      {msg.comparison.naive.answer}
                    </p>
                    {msg.comparison.naive.retrieved_memories.length > 0 && (
                      <div className="text-[11px] text-amber-300/80 mb-2">
                        Retrieved: {msg.comparison.naive.retrieved_memories.map(m => m.memory_id).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Latency: {msg.comparison.naive.latency_ms}ms</span>
                    <span className="text-amber-400">Vulnerable to Stale</span>
                  </div>
                </div>

                {/* 3. Governed */}
                <div className="bg-[bg-bg-side border-bg-side] p-3.5 rounded-lg border border-indigo-600/40 flex flex-col justify-between glow-border-indigo">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">3. GOVERNED (ANCHOR)</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        Governed Safety
                      </span>
                    </div>
                    {msg.comparison.governed.abstention && (
                      <div className="p-2 mb-2 bg-amber-500/15 border border-amber-500/30 rounded text-[11px] text-amber-200 flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Abstention triggered (Refused stale/conflicting recommendation)</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line mb-3 font-medium">
                      {msg.comparison.governed.answer}
                    </p>
                    {msg.comparison.governed.retrieved_memories.length > 0 && (
                      <div className="text-[11px] text-indigo-300 font-mono mb-2">
                        Trusted Citations: {msg.comparison.governed.retrieved_memories.map(m => m.memory_id).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span className="text-emerald-400 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Safe Action
                    </span>
                    <Link to="/inspector" className="text-indigo-400 hover:underline">
                      Inspect &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-[bg-bg-side border-bg-main] border border-[border-bg-main] text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Abstention alert if present */}
                {msg.result?.abstention && (
                  <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Governed Abstention Engaged: </span>
                      {msg.result.abstention_reason}
                    </div>
                  </div>
                )}

                <div>{msg.text}</div>

                {/* Citations & Score Breakdown Link if retrieved */}
                {msg.result?.retrieved_memories && msg.result.retrieved_memories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-slate-400 font-medium">Memories Used:</span>
                      {msg.result.retrieved_memories.map((m) => (
                        <span
                          key={m.memory_id}
                          className="bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded text-[11px] font-mono"
                        >
                          {m.memory_id} (Score: {m.final_score.toFixed(2)})
                        </span>
                      ))}
                    </div>
                    <Link
                      to="/inspector"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center font-medium"
                    >
                      Score Breakdown <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="font-mono">XYRO101 is evaluating memory graph & guard rules...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Observation Ingestion */}
      <div className="bg-[bg-bg-side border-bg-main] border border-[border-bg-main] rounded-2xl p-3 shadow-lg">
        <form onSubmit={handleSend} className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                compareMode
                  ? "Type a query to compare across None, Naive, and Governed modes simultaneously..."
                  : activeMode === 'governed'
                  ? "Ask XYRO101 anything (e.g., 'Which database are we using?', 'How to fix checkout timeout?')..."
                  : `Ask in ${activeMode.toUpperCase()} mode...`
              }
              className="flex-1 bg-[bg-bg-main text-text-primary] border border-[border-bg-main] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Quick ingest action bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60 px-1">
            <div className="flex items-center space-x-2">
              <span>Source Tag:</span>
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value as any)}
                className="bg-[bg-bg-main text-text-primary] border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="user_stated">user_stated (Trust: 0.80)</option>
                <option value="human_approved">human_approved (Trust: 1.00)</option>
                <option value="system_event">system_event (Trust: 0.85)</option>
                <option value="unverified">unverified (Trust: 0.20)</option>
              </select>
              <button
                type="button"
                onClick={handleIngest}
                disabled={!input.trim() || loading}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium disabled:opacity-50"
              >
                + Ingest as New Fact
              </button>
            </div>

            <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-500">
              <span>ðŸ’¡ Enter to send</span>
              <span>â€¢</span>
              <span>1536-dim Cosine Vector Search</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};



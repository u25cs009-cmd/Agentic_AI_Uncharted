import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  Calendar, 
  Radio, 
  ArrowLeftRight, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { MemoryEvent, Memory } from '../../types/memory';
import { Badge } from '../../components/common/Badge';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Time travel slider: index from 0 to 4 (e.g. 5 days ago to now)
  const timePoints = [
    { label: "Oct 15 (Initial Postgres)", date: "2026-10-15T00:00:00Z" },
    { label: "Oct 20 (User Preferences)", date: "2026-10-20T00:00:00Z" },
    { label: "Oct 25 (Checkout Pool Fix)", date: "2026-10-25T10:00:00Z" },
    { label: "Oct 28 (MongoDB Migration)", date: "2026-10-28T12:00:00Z" },
    { label: "Present State", date: new Date().toISOString() },
  ];
  const [sliderIndex, setSliderIndex] = useState(4);
  const [historicalState, setHistoricalState] = useState<Memory[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalSnapshot = async (index: number) => {
    setLoadingHistorical(true);
    try {
      const targetDate = timePoints[index].date;
      const snapshot = await api.getTimeTravelState(targetDate);
      setHistoricalState(snapshot);
    } finally {
      setLoadingHistorical(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const unsubscribe = api.subscribeToEventStream((newEvent) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === newEvent.id)) return prev;
        return [newEvent, ...prev];
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadHistoricalSnapshot(sliderIndex);
  }, [sliderIndex]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'superseded':
        return <RefreshCw className="w-4 h-4 text-indigo-400" />;
      case 'stale':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'quarantined':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'feedback_approved':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Timeline & Time Travel</h1>
          <Badge variant="cyan">Temporal Invariant (C3)</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Inspect append-only memory mutations and time-travel backwards to reconstruct exact historical AI agent state without hallucination.
        </p>
      </div>

      {/* Time-Travel Interactive Slider Panel */}
      <div className="bg-[bg-bg-side border-bg-main] border border-[border-bg-main] rounded-2xl p-6 shadow-md glow-border-cyan">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Historical Time-Travel Slider</h2>
          </div>
          <span className="text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full">
            Selected Point: {timePoints[sliderIndex].label}
          </span>
        </div>

        {/* Slider Controls */}
        <div className="space-y-4 px-2">
          <input
            type="range"
            min="0"
            max={timePoints.length - 1}
            step="1"
            value={sliderIndex}
            onChange={(e) => setSliderIndex(parseInt(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
            {timePoints.map((tp, idx) => (
              <span
                key={tp.label}
                onClick={() => setSliderIndex(idx)}
                className={`cursor-pointer transition-colors ${
                  sliderIndex === idx ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                {tp.label.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Historical Snapshot Preview */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400">
              Active Memory State at {new Date(timePoints[sliderIndex].date).toLocaleDateString()}:
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {historicalState.length} Records in Memory
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {historicalState.map((m) => (
              <div
                key={m._id || m.id}
                className="bg-[bg-bg-main text-text-primary] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-indigo-400 font-bold">{m._id || m.id}</span>
                    <Badge variant={m.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {m.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-slate-200">{m.content}</p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2">
                  Key: {m.attribute_key}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Append-Only Event Log */}
      <div className="bg-[bg-bg-side border-bg-main] border border-[border-bg-main] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h2 className="text-base font-semibold text-white">Append-Only Event Stream</h2>
            </div>
            <span className="text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 animate-ping" />
              SSE Live Stream Active
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {events.length} Audited Events
          </span>
        </div>

        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
          {events.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Dot Icon on line */}
              <div className="absolute -left-[33px] top-0 w-6 h-6 rounded-full bg-[bg-bg-side border-bg-main] border border-slate-700 flex items-center justify-center">
                {getEventIcon(evt.event_type)}
              </div>

              {/* Event Card */}
              <div className="bg-[bg-bg-main text-text-primary] p-4 rounded-xl border border-slate-800/80 group-hover:border-slate-700 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        evt.event_type === 'feedback_approved'
                          ? 'success'
                          : evt.event_type === 'quarantined'
                          ? 'danger'
                          : evt.event_type === 'stale'
                          ? 'warning'
                          : 'primary'
                      }
                      size="sm"
                    >
                      {evt.event_type.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-slate-300">
                      Target: {evt.memory_id}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {evt.reason}
                </p>

                <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center space-x-2">
                  <span>Actor: <strong className="text-slate-400">{evt.actor}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};



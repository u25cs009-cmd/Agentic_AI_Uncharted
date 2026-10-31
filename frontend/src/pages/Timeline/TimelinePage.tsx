import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  Radio, 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle,
  AlertTriangle, 
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  Trash2,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { MemoryEvent, Memory } from '../../types/memory';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sseError, setSseError] = useState<string | null>(null);
  
  // Time travel slider: index from 0 to 4
  const timePoints = [
    { label: "Oct 15", sub: "Initial Postgres", date: "2026-10-15T00:00:00Z" },
    { label: "Oct 20", sub: "User Preferences", date: "2026-10-20T00:00:00Z" },
    { label: "Oct 25", sub: "Checkout Pool Fix", date: "2026-10-25T10:00:00Z" },
    { label: "Oct 28", sub: "MongoDB Migration", date: "2026-10-28T12:00:00Z" },
    { label: "Present", sub: "Live Production", date: new Date().toISOString() },
  ];
  const [sliderIndex, setSliderIndex] = useState(4);
  const [pickedDateTime, setPickedDateTime] = useState<string>('2026-10-26T12:00');
  const [currentTimeTarget, setCurrentTimeTarget] = useState<string>(new Date().toISOString());

  const [historicalState, setHistoricalState] = useState<Memory[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalSnapshot = async (isoDate: string) => {
    setLoadingHistorical(true);
    setCurrentTimeTarget(isoDate);
    try {
      const snapshot = await api.getTimeTravelState(isoDate);
      setHistoricalState(Array.isArray(snapshot) ? snapshot : []);
    } catch {
      setHistoricalState([]);
    } finally {
      setLoadingHistorical(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const unsubscribe = api.subscribeToEventStream(
      (newEvent) => {
        setEvents((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((e) => e.id === newEvent.id)) return list;
          return [newEvent, ...list];
        });
      },
      (err) => {
        setSseError(err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadHistoricalSnapshot(timePoints[sliderIndex].date);
  }, [sliderIndex]);

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedDateTime) return;
    const iso = new Date(pickedDateTime).toISOString();
    loadHistoricalSnapshot(iso);
  };

  // Specific icons per event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'superseded':
        return <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />;
      case 'stale':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'quarantined':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'feedback_approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'feedback_rejected':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'tombstone':
        return <Trash2 className="w-3.5 h-3.5 text-slate-400" />;
      case 'deleted':
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-2 sm:px-0">
      {/* Header & Title HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-indigo-600 shadow-sm">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Timeline &amp; Time-Travel</h1>
              <Badge variant="cyan" size="sm">Temporal Invariant (C3)</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect immutable append-only memory events and reconstruct exact historical knowledge states without hallucination.
            </p>
          </div>
        </div>

        <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono text-slate-400 border-slate-200">
          <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Bi-temporal Indexing: <span className="text-emerald-400 font-bold">ONLINE</span></span>
        </div>
      </div>

      {/* SSE Connection Warning if disconnected */}
      {sseError && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs text-amber-300 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Real-time event stream: <strong>{sseError}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Time-Travel Interactive Scrubber Deck */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Chrono-Scrubber &amp; State Reconstruction</h2>
          </div>
          <span className="text-xs font-mono bg-cyan-500/15 text-indigo-700 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Reconstruction Target: <strong className="text-slate-900">{new Date(currentTimeTarget).toLocaleString()}</strong></span>
          </span>
        </div>

        {/* Milestone Steps Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {timePoints.map((tp, idx) => {
            const isSelected = sliderIndex === idx;
            return (
              <button
                key={tp.label}
                onClick={() => setSliderIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 shadow-xs text-indigo-950 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                    STEP 0{idx + 1}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">{tp.label}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{tp.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Range Slider & D4 Date-Time Picker Combo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Timeline Milestone Scrubber:</span>
              <span className="text-indigo-600 font-bold">{timePoints[sliderIndex].label}</span>
            </label>
            <input
              type="range"
              min="0"
              max={timePoints.length - 1}
              step="1"
              value={sliderIndex}
              onChange={(e) => setSliderIndex(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-white rounded-lg"
            />
          </div>

          {/* D4: Date & Time Picker */}
          <form onSubmit={handleCustomDateSubmit} className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-3 md:pt-0">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exact Date/Time Picker:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={pickedDateTime}
                onChange={(e) => setPickedDateTime(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-900 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-400 flex-1"
              />
              <button
                type="submit"
                disabled={loadingHistorical}
                className="btn-primary text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer disabled:opacity-40"
              >
                Go
              </button>
            </div>
          </form>
        </div>

        {/* Historical Snapshot Preview */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Active Facts at {new Date(currentTimeTarget).toLocaleString()}:</span>
            </span>
            <span className="text-indigo-700 font-bold">
              {historicalState.length} Active Records Reconstructed
            </span>
          </div>

          {loadingHistorical ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              Reconstructing historical state from append-only commit logs...
            </div>
          ) : (!Array.isArray(historicalState) || historicalState.length === 0) ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-50/60 rounded-xl border border-slate-200">
              No active memories existed at target timestamp ({new Date(currentTimeTarget).toLocaleString()}).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {(Array.isArray(historicalState) ? historicalState : []).map((m) => (
                <div
                  key={m._id || m.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-indigo-600 font-bold">{m._id || m.id}</span>
                      <Badge variant={m.status === 'active' ? 'success' : 'neutral'} size="sm" glow={m.status === 'active'}>
                        {m.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-slate-800 font-medium text-xs leading-relaxed font-sans">{m.content}</p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-2.5 pt-2 border-t border-slate-200 flex justify-between">
                    <span>Key: <strong className="text-indigo-700">{m.attribute_key}</strong></span>
                    <span>Trust: <strong className="text-emerald-700">{(typeof m.trust === 'number' ? m.trust.toFixed(2) : '1.00')}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chronological Append-Only Event Stream */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl border-slate-200">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Immutable Audit Log</h2>
            </div>
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Real-Time Stream Active</span>
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {Array.isArray(events) ? events.length : 0} Events Logged
          </span>
        </div>

        {(!Array.isArray(events) || events.length === 0) ? (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-indigo-600" />}
            title="No events recorded yet"
            description="The immutable audit log is waiting for its first activity. Ingest an alert, trigger a deployment invalidation, or chat with the agent to record governed audit events."
          />
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-4">
            {(Array.isArray(events) ? events : []).map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Dot Icon on timeline line */}
                <div className="absolute -left-[35px] top-0.5 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {getEventIcon(evt.event_type)}
                </div>

                {/* Event Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 group-hover:border-slate-300 transition-all shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          evt.event_type === 'feedback_approved' || evt.event_type === 'created'
                            ? 'success'
                            : evt.event_type === 'quarantined' || evt.event_type === 'deleted'
                            ? 'danger'
                            : evt.event_type === 'stale'
                            ? 'warning'
                            : 'primary'
                        }
                        size="sm"
                        glow={evt.event_type === 'feedback_approved'}
                      >
                        {evt.event_type.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        Target: {evt.memory_id}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 mt-1 leading-relaxed font-sans">
                    {evt.reason}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Actor: <strong className="text-slate-900">{evt.actor}</strong></span>
                    <span className="text-slate-500">ID: {evt.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

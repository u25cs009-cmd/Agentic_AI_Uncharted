import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare, Search, Database, ShieldAlert,
  History, Network, BarChart3, Settings, Brain, Radio,
} from 'lucide-react';

interface SidebarProps {
  quarantineCount?: number;
}

const NAV = [
  { to: '/',             label: 'Chat Agent',          icon: MessageSquare, badge: 'XYRO101' },
  { to: '/inspector',    label: 'Retrieval Inspector', icon: Search },
  { to: '/explorer',     label: 'Memory Explorer',     icon: Database },
  { to: '/quarantine',   label: 'Quarantine Inbox',    icon: ShieldAlert,  danger: true },
  { to: '/timeline',     label: 'Timeline',            icon: History },
  { to: '/entity-graph', label: 'Entity Graph',        icon: Network },
  { to: '/benchmark',    label: 'Benchmarks',          icon: BarChart3, badge: '15/15' },
  { to: '/settings',     label: 'Settings',            icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ quarantineCount = 0 }) => {
  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl select-none z-20">
      {/* ── Logo / Brand ─────────────────────────── */}
      <div className="px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-[0_0_22px_rgba(6,182,212,0.45)] border border-cyan-400/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight leading-none flex items-center gap-1.5">
              <span>XYRO101</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 font-semibold">AI</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">ANCHOR Memory Engine</div>
          </div>
        </div>

        {/* Live status pill */}
        <div className="mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="dot-live shrink-0" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wide font-mono">GOVERNED</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Atlas Live</span>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold px-3 py-1 mb-1">
          Command Center Modules
        </p>

        {NAV.map(({ to, label, icon: Icon, badge, danger }) => {
          const count = danger ? quarantineCount : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'nav-active font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'text-slate-300 hover:bg-slate-900/70 hover:text-white border-l-2 border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:text-cyan-400 transition-all" />
                <span className="text-sm truncate font-medium">{label}</span>
              </div>

              {(badge || (count !== undefined && count > 0)) && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      {badge}
                    </span>
                  )}
                  {count !== undefined && count > 0 && (
                    <span className="tag tag-danger animate-pulse font-mono">{count}</span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────── */}
      <div className="px-4 py-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-md">
            S2
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Team Shakti-2</p>
            <p className="text-xs text-slate-400 truncate">Agentic Memory Engine · Track 1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

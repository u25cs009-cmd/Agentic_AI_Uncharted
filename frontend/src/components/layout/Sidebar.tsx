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
    <aside className="w-64 shrink-0 flex flex-col h-screen border-r border-slate-200/90 bg-white/95 backdrop-blur-xl select-none z-20">
      {/* ── Logo / Brand ─────────────────────────── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="XYRO101 Logo"
            className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-slate-200"
          />
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <span>XYRO101</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/80 font-bold">AI</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">ANCHOR Memory Engine</div>
          </div>
        </div>

        {/* Live status pill */}
        <div className="mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="dot-live shrink-0" />
            <span className="text-xs font-semibold text-emerald-700 tracking-wide font-mono">GOVERNED</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono font-medium">
            <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>System Live</span>
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
                `group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'nav-active font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:text-indigo-600 transition-all" />
                <span className="text-sm truncate font-medium">{label}</span>
              </div>

              {(badge || (count !== undefined && count > 0)) && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
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
      <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 bg-slate-900 shadow-xs">
            S2
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Team Shakti-2</p>
            <p className="text-xs text-slate-500 truncate">Agentic Memory Engine · Track 1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

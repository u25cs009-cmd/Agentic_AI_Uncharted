import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare, Search, Database, ShieldAlert,
  History, Network, BarChart3, Settings, Cpu, Radio, CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  quarantineCount?: number;
}

const navItems = [
  { to: '/',             label: 'Chat Agent',           icon: MessageSquare, badge: 'XYRO101' },
  { to: '/inspector',    label: 'Retrieval Inspector',  icon: Search },
  { to: '/explorer',     label: 'Memory Explorer',      icon: Database },
  { to: '/quarantine',   label: 'Quarantine Inbox',     icon: ShieldAlert, danger: true },
  { to: '/timeline',     label: 'Timeline',             icon: History },
  { to: '/entity-graph', label: 'Entity Graph',         icon: Network },
  { to: '/benchmark',    label: 'Benchmarks',           icon: BarChart3, badge: '15/15' },
  { to: '/settings',     label: 'Settings',             icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ quarantineCount = 2 }) => {
  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen border-r border-app-border bg-app-surface select-none">

      {/* ── Brand ──────────────────────────── */}
      <div className="h-12 flex items-center px-4 gap-3 border-b border-app-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-app-accent-bg border border-app-accent/30 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-app-accent" />
        </div>
        <div>
          <div className="text-sm font-bold text-app-fg tracking-tight">XYRO101</div>
          <div className="text-[10px] text-app-fg-muted font-mono">ANCHOR Engine</div>
        </div>
      </div>

      {/* ── Status pill ─────────────────────── */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-md bg-app-panel border border-app-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent glow-green" />
          </span>
          <span className="text-[11px] font-mono font-semibold text-app-accent tracking-widest">GOVERNED</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-app-fg-muted font-mono">
          <Radio className="w-3 h-3 text-app-fg-muted animate-pulse" />
          <span>MongoDB</span>
        </div>
      </div>

      {/* ── Section label ───────────────────── */}
      <div className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.12em] text-app-fg-faint font-semibold">
        Modules
      </div>

      {/* ── Nav items ───────────────────────── */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = item.danger ? quarantineCount : undefined;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-100 ${
                  isActive
                    ? 'bg-app-accent-bg text-app-accent border border-app-accent/20'
                    : 'text-app-fg-muted hover:text-app-fg hover:bg-app-elevated border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-app-panel text-app-fg-faint border border-app-border">
                    {item.badge}
                  </span>
                )}
                {count !== undefined && count > 0 && (
                  <span className="tag tag-danger">{count}</span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────── */}
      <div className="border-t border-app-border p-3 shrink-0 bg-app-panel">
        <div className="flex items-center justify-between text-[11px] mb-0.5">
          <span className="text-app-fg-muted font-medium">Team Shakti-2</span>
          <span className="flex items-center gap-1 text-app-accent font-mono">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>
        <p className="text-[10px] text-app-fg-faint truncate font-mono">Agentic Memory · Track 1</p>
      </div>
    </aside>
  );
};

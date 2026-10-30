import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Database,
  ShieldAlert,
  History,
  Network,
  BarChart3,
  Settings,
  Cpu,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  quarantineCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ quarantineCount = 2 }) => {
  const navItems = [
    { to: '/',             label: 'Chat Agent',           icon: MessageSquare, badge: 'XYRO101' },
    { to: '/inspector',    label: 'Retrieval Inspector',  icon: Search },
    { to: '/explorer',     label: 'Memory Explorer',      icon: Database },
    {
      to: '/quarantine',
      label: 'Quarantine Inbox',
      icon: ShieldAlert,
      count: quarantineCount,
    },
    { to: '/timeline',     label: 'Timeline & Time Travel', icon: History },
    { to: '/entity-graph', label: 'Entity Graph',          icon: Network },
    { to: '/benchmark',    label: '15-Benchmark Suite',    icon: BarChart3, badge: '15/15' },
    { to: '/settings',     label: 'Settings & Simulator',  icon: Settings },
  ];

  return (
    <aside
      className="w-56 flex flex-col h-screen select-none shrink-0 border-r border-vsc-border"
      style={{ background: '#252526' }}
    >
      {/* ── Brand Header ─────────────────────────── */}
      <div
        className="h-10 flex items-center px-4 border-b border-vsc-border gap-2 shrink-0"
        style={{ background: '#333333' }}
      >
        <div className="w-7 h-7 rounded bg-vsc-accent/20 border border-vsc-accent/50 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-vsc-accent" />
        </div>
        <div className="leading-none">
          <div className="text-xs font-bold text-vsc-fg-hi font-mono tracking-wide">XYRO101</div>
          <div className="text-[10px] text-vsc-fg-dim">ANCHOR Engine</div>
        </div>
      </div>

      {/* ── Engine Status ─────────────────────────── */}
      <div
        className="mx-2 mt-2 mb-1 px-3 py-2 border border-vsc-border flex items-center justify-between text-[11px]"
        style={{ background: '#2D2D2D' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vsc-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-vsc-success" />
          </span>
          <span className="font-mono text-vsc-success font-semibold tracking-widest">GOVERNED</span>
        </div>
        <div className="flex items-center gap-1 text-vsc-fg-dim font-mono">
          <Radio className="w-3 h-3 text-vsc-syn-const animate-pulse" />
          <span>MongoDB</span>
        </div>
      </div>

      {/* ── Section Label ─────────────────────────── */}
      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-vsc-fg-dim font-mono">
        Explorer
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-1 space-y-0.5 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-1.5 text-sm transition-colors duration-100 group cursor-pointer ${
                  isActive
                    ? 'bg-vsc-selection text-vsc-fg-hi'
                    : 'text-vsc-fg hover:bg-vsc-highlight'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0 text-vsc-syn-var opacity-80 group-hover:opacity-100" />
                <span className="truncate text-xs font-ui">{item.label}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.badge && (
                  <span className="text-[9px] font-mono px-1 py-0.5 bg-vsc-actbar text-vsc-fg-dim border border-vsc-border">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vsc-error/20 text-vsc-error border border-vsc-error/30">
                    {item.count}
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="border-t border-vsc-border p-3 shrink-0" style={{ background: '#2D2D2D' }}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-vsc-fg-dim font-mono">Team Shakti-2</span>
          <span className="flex items-center gap-1 text-vsc-success font-mono">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>
        <p className="text-[10px] text-vsc-fg-dim mt-0.5 truncate font-mono">Agentic Memory Track 1</p>
      </div>
    </aside>
  );
};

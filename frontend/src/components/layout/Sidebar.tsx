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
    <aside
      className="w-60 shrink-0 flex flex-col h-screen border-r border-claude-border select-none"
      style={{ background: '#1e1e1e' }}
    >
      {/* ── Logo / Brand ─────────────────────────── */}
      <div className="px-5 py-5 border-b border-claude-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(204,139,60,0.15)', border: '1px solid rgba(204,139,60,0.35)' }}
          >
            <Brain className="w-5 h-5 text-claude-accent" />
          </div>
          <div>
            <div className="text-base font-bold text-claude-fg tracking-tight leading-none">XYRO101</div>
            <div className="text-xs text-claude-fg-3 mt-0.5">ANCHOR Memory Engine</div>
          </div>
        </div>

        {/* Live status pill */}
        <div
          className="mt-4 flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: '#262626', border: '1px solid #383838' }}
        >
          <div className="flex items-center gap-2">
            <div className="dot-live shrink-0" />
            <span className="text-xs font-semibold text-claude-success tracking-wide font-mono">GOVERNED</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-claude-fg-3 font-mono">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>MongoDB</span>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-claude-fg-3 font-semibold px-2 py-1 mb-1">
          Modules
        </p>

        {NAV.map(({ to, label, icon: Icon, badge, danger }) => {
          const count = danger ? quarantineCount : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'nav-active font-semibold'
                    : 'text-claude-fg-2 hover:bg-claude-elevated hover:text-claude-fg'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm truncate">{label}</span>
              </div>

              {(badge || (count !== undefined && count > 0)) && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {badge && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: '#2f2f2f', color: '#737373', border: '1px solid #383838' }}
                    >
                      {badge}
                    </span>
                  )}
                  {count !== undefined && count > 0 && (
                    <span className="tag tag-danger">{count}</span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────── */}
      <div
        className="px-4 py-4 border-t border-claude-border"
        style={{ background: '#1a1a1a' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #cc8b3c, #e8a84e)' }}
          >
            S2
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-claude-fg truncate">Team Shakti-2</p>
            <p className="text-xs text-claude-fg-3 truncate">Agentic Memory · Track 1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

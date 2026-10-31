import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare, Search, Database, ShieldAlert,
  History, Network, BarChart3, Settings, Radio, X
} from 'lucide-react';
import { ShaktAILogo } from '../common/ShaktAILogo';

interface SidebarProps {
  quarantineCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV = [
  { to: '/',             label: 'Chat Agent',          icon: MessageSquare, badge: 'ShaktAI' },
  { to: '/inspector',    label: 'Retrieval Inspector', icon: Search },
  { to: '/explorer',     label: 'Memory Explorer',     icon: Database },
  { to: '/quarantine',   label: 'Quarantine Inbox',    icon: ShieldAlert,  danger: true },
  { to: '/timeline',     label: 'Timeline',            icon: History },
  { to: '/entity-graph', label: 'Entity Graph',        icon: Network },
  { to: '/benchmark',    label: 'Benchmarks',          icon: BarChart3, badge: '15/15' },
  { to: '/settings',     label: 'Settings',            icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  quarantineCount = 0,
  isOpen = true,
  onClose
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Command Center Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col h-screen border-r border-emerald-100/90 bg-white/98 backdrop-blur-xl select-none transition-all duration-300 ease-in-out ${
          isOpen
            ? 'w-64 translate-x-0 opacity-100'
            : '-translate-x-full lg:w-0 lg:opacity-0 lg:pointer-events-none'
        }`}
      >
        {/* ── Logo & Brand ─────────────────────────── */}
        <div className="px-5 py-5 border-b border-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShaktAILogo size="md" glow={true} />
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>ShaktAI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 font-bold">
                  AI
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">ANCHOR Memory Engine</div>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Command Center Sections Navigation ──── */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-bold px-3 py-1 mb-1">
            Command Center Modules
          </p>

          {NAV.map(({ to, label, icon: Icon, badge, danger }) => {
            const count = danger ? quarantineCount : undefined;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose?.();
                }}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 border-l-4 border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-colors" />
                  <span className="text-sm truncate font-medium">{label}</span>
                </div>

                {(badge || (count !== undefined && count > 0)) && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/20 text-white font-semibold">
                        {badge}
                      </span>
                    )}
                    {count !== undefined && count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[10px] font-bold animate-pulse font-mono shadow-2xs">
                        {count}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400 font-mono">
            ANCHOR • Phase 7 Production
          </span>
        </div>
      </aside>
    </>
  );
};

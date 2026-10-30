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
    { to: '/', label: 'Chat Agent', icon: MessageSquare, badge: 'XYRO101' },
    { to: '/inspector', label: 'Retrieval Inspector', icon: Search },
    { to: '/explorer', label: 'Memory Explorer', icon: Database },
    { 
      to: '/quarantine', 
      label: 'Quarantine Inbox', 
      icon: ShieldAlert, 
      count: quarantineCount, 
      countColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
    },
    { to: '/timeline', label: 'Timeline & Time Travel', icon: History },
    { to: '/entity-graph', label: 'Entity Graph', icon: Network },
    { to: '/benchmark', label: '15-Benchmark Suite', icon: BarChart3, badge: '15/15' },
    { to: '/settings', label: 'Settings & Simulator', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[bg-bg-side] border-r border-[border-bg-side] flex flex-col h-screen select-none">
      {/* Branding Header */}
      <div className="p-5 border-b border-[border-bg-side] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-white text-base tracking-tight">XYRO101</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.2 rounded font-mono font-medium">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">ANCHOR Memory Engine</p>
          </div>
        </div>
      </div>

      {/* Engine Status Card */}
      <div className="mx-3 my-3 p-3 bg-[bg-bg-main border-bg-main]/70 border border-[#1e293b] rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wide">
            GOVERNED
          </span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>MongoDB Atlas</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-3 py-1 font-mono">
          Core Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm shadow-indigo-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 transition-colors group-hover:text-indigo-400" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${item.countColor}`}>
                  {item.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[border-bg-side] bg-[bg-bg-side border-bg-side]">
        <div className="p-2.5 rounded-lg bg-[bg-bg-side border-bg-main] border border-[#1e293b]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Team Shakti-2</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">Agentic Memory Track 1</p>
        </div>
      </div>
    </aside>
  );
};



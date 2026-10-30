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
  Sparkles,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';

interface SidebarProps {
  quarantineCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ quarantineCount = 2 }) => {
  const navSections = [
    {
      title: 'Agent Workspace',
      items: [
        { to: '/', label: 'XYRO101 Terminal', icon: MessageSquare, badge: 'Agent' },
        { to: '/inspector', label: 'Retrieval Inspector', icon: Search },
        { to: '/explorer', label: 'Memory Explorer', icon: Database },
      ]
    },
    {
      title: 'Governance & Safety',
      items: [
        { 
          to: '/quarantine', 
          label: 'Quarantine Vault', 
          icon: ShieldAlert, 
          count: quarantineCount, 
          countColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950/50' 
        },
        { to: '/timeline', label: 'Temporal Timeline', icon: History, badge: 'SSE' },
        { to: '/entity-graph', label: 'Topology Graph', icon: Network },
      ]
    },
    {
      title: 'Audit & Config',
      items: [
        { to: '/benchmark', label: '15-Benchmark Suite', icon: BarChart3, badge: '100% Pass' },
        { to: '/settings', label: 'System & Sandbox', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/5 flex flex-col h-screen select-none relative z-20">
      {/* Branding Header */}
      <div className="p-5 border-b border-white/5 bg-[#0a0e1a]/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 relative group">
            <Cpu className="w-5 h-5 text-white transition-transform group-hover:scale-110 duration-200" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#07090e] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-mono">
                XYRO101
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.2 rounded font-mono font-medium">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">ANCHOR Memory Engine</p>
          </div>
        </div>
      </div>

      {/* Engine Status HUD Banner */}
      <div className="mx-3 my-3 p-3 bg-gradient-to-br from-[#0f172a]/90 to-[#131b2e]/80 border border-indigo-500/20 rounded-2xl shadow-inner">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold tracking-wide">
              GOVERNED ACTIVE
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-1.5 py-0.5 rounded">
            Track 1
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
          <span className="flex items-center">
            <Radio className="w-3 h-3 text-cyan-400 mr-1 animate-pulse" />
            Atlas Vector (1536-d)
          </span>
          <span className="text-cyan-400 font-bold">Live</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-1 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-1 font-mono flex items-center justify-between">
              <span>{section.title}</span>
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/25 to-cyan-500/15 text-white border border-indigo-500/40 font-semibold shadow-md shadow-indigo-950/60'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 transition-colors group-hover:text-indigo-400 text-slate-400" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60">
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
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/5 bg-[#07090e]/70">
        <div className="p-2.5 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
              Team Shakti-2
            </span>
            <span className="text-emerald-400 font-mono text-[11px] font-bold">
              Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono">Agentic AI Copilot System</p>
        </div>
      </div>
    </aside>
  );
};

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Building2, LayoutDashboard, Users, ListTodo, Briefcase, Sparkles, Send,
  MessageSquare, Settings, Menu, X, FileText, Star, Database, Microscope,
  Eye, Target, Filter, Handshake, Search, ChevronDown,
} from 'lucide-react';

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; section?: string };

const NAV: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interns', icon: Users, label: 'Interns', section: 'team' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks', section: 'team' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', section: 'team' },
  { to: '/companies', icon: Briefcase, label: 'Pipeline', section: 'deals' },
  { to: '/enrich', icon: Sparkles, label: 'Enrich', section: 'deals' },
  { to: '/outreach', icon: Send, label: 'Outreach', section: 'deals' },
  { to: '/reports', icon: FileText, label: 'Reports', section: 'deals' },
  { to: '/sourced', icon: Star, label: 'Sourced', section: 'deals' },
  { to: '/database', icon: Database, label: 'Database', section: 'deals' },
  { to: '/research', icon: Microscope, label: 'Research', section: 'deals' },
  { to: '/ai-search', icon: Sparkles, label: 'AI Search', section: 'deals' },
  { to: '/crm', icon: Target, label: 'Deal CRM', section: 'deals' },
  { to: '/qualify', icon: Filter, label: 'Qualify', section: 'deals' },
  { to: '/brokers', icon: Handshake, label: 'Brokers', section: 'deals' },
  { to: '/watchlist', icon: Eye, label: 'Watchlist', section: 'deals' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] font-medium transition-colors ${
    isActive ? 'bg-white shadow-[0_1px_2px_rgba(10,37,64,0.06),0_0_0_1px_rgba(10,37,64,0.06)]' : 'hover:bg-white/60'
  }`;

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
});

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { messages } = useAppStore();
  const location = useLocation();
  const unread = messages.filter(m => !m.read && m.to === 'owner').length;

  const current = NAV.find(n => n.to === location.pathname) ?? NAV[0];

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg-alt)' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 flex-shrink-0 sticky top-0 h-dvh border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)' }}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)', boxShadow: '0 4px 14px rgba(99,91,255,0.35)' }}
            >
              <Building2 size={16} color="#fff" strokeWidth={2.4} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                SearchFund HQ
              </span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Deal sourcing workspace
              </span>
            </div>
          </div>
        </div>

        {/* Workspace switcher */}
        <div className="px-4 pb-3">
          <button
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[8px] border text-[12px] font-semibold"
            style={{ borderColor: 'var(--border)', background: '#fff', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(180deg,#635bff,#4b44c1)' }}>S</span>
              <span className="truncate">Search Fund I</span>
            </span>
            <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] border text-[12px]"
            style={{ borderColor: 'var(--border)', background: '#fff' }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Search…"
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <kbd className="hidden lg:inline-block text-[9px] font-semibold px-1 py-0.5 rounded"
              style={{ background: 'var(--bg-alt)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>⌘K</kbd>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-5 overflow-y-auto">
          <div className="space-y-0.5">
            <NavLink to="/" end className={navLinkClass} style={navLinkStyle}>
              <LayoutDashboard size={15} /> Dashboard
            </NavLink>
          </div>

          <div className="space-y-0.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
              style={{ color: 'var(--text-tertiary)' }}>Team</p>
            {NAV.filter(n => n.section === 'team').map(n => (
              <NavLink key={n.to} to={n.to} className={navLinkClass} style={navLinkStyle}>
                <n.icon size={15} />
                <span className="flex-1">{n.label}</span>
                {n.to === '/messages' && unread > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center tabular"
                    style={{ background: 'var(--danger)' }}>{unread}</span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="space-y-0.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
              style={{ color: 'var(--text-tertiary)' }}>Deal flow</p>
            {NAV.filter(n => n.section === 'deals').map(n => (
              <NavLink key={n.to} to={n.to} className={navLinkClass} style={navLinkStyle}>
                <n.icon size={15} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <NavLink to="/settings" className={navLinkClass} style={navLinkStyle}>
            <Settings size={15} /> Settings
          </NavLink>
          <div className="mt-3 px-3 py-3 rounded-[10px] border"
            style={{ borderColor: 'var(--border)', background: '#fff' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#635bff,#22d3ee)' }}>TI</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Taslim</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>Principal</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg)' }}>
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}>
              <Building2 size={14} color="#fff" strokeWidth={2.4} />
            </div>
            <span className="text-[14px] font-bold tracking-tight">SearchFund HQ</span>
          </div>
          <button onClick={() => setOpen(!open)} className="p-1">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {open && (
          <div className="md:hidden fixed inset-0 z-20 pt-12" style={{ background: 'var(--bg)' }}>
            <nav className="p-4 space-y-1">
              {NAV.map(n => (
                <NavLink
                  key={n.to} to={n.to} end={n.to === '/'}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] font-medium"
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  })}
                >
                  <n.icon size={18} /> {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Desktop topbar — slim sticky breadcrumb bar with hero gradient wash behind page header */}
        <div className="hidden md:block relative">
          <div
            className="absolute inset-x-0 top-0 h-[260px] pointer-events-none -z-0"
            style={{ background: 'var(--gradient-hero)' }}
          />
          <header
            className="relative z-10 sticky top-0 px-8 h-12 flex items-center justify-between border-b backdrop-blur"
            style={{ borderColor: 'rgba(227,232,238,0.6)', background: 'rgba(255,255,255,0.65)' }}
          >
            <nav className="flex items-center gap-2 text-[12px] font-medium"
              style={{ color: 'var(--text-tertiary)' }}>
              <span>Workspace</span>
              <span>/</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{current.label}</span>
            </nav>
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-[12px]">
                <FileText size={13} /> Docs
              </button>
              <button className="btn-primary text-[12px]" style={{ padding: '7px 14px' }}>
                <Sparkles size={13} /> New deal
              </button>
            </div>
          </header>
        </div>

        <main className="relative z-10 flex-1 px-4 md:px-8 pt-2 pb-20 md:pb-10 w-full max-w-[1200px]">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t py-1.5 z-30"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {[NAV[0], NAV[1], NAV[4], NAV[5], NAV[6]].map(n => (
            <NavLink
              key={n.to} to={n.to} end={n.to === '/'}
              className="flex flex-col items-center gap-0.5 px-2 py-1"
              style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' })}
            >
              <n.icon size={18} />
              <span className="text-[9px] font-medium">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

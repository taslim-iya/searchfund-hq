import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Building2, LayoutDashboard, Users, ListTodo, Briefcase, Sparkles, Send,
  MessageSquare, Settings, Menu, X, FileText, Star, Database, Microscope,
  Eye, Target, Filter, Handshake, Search, Sun, Moon,
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
  `group flex items-center gap-2.5 px-3 py-[7px] text-[13px] font-medium transition-colors border-l-2 ${
    isActive ? 'border-l-[var(--accent)]' : 'border-l-transparent hover:border-l-[var(--border)]'
  }`;

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
  fontWeight: isActive ? 700 : 500,
});

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { messages } = useAppStore();
  const location = useLocation();
  const unread = messages.filter(m => !m.read && m.to === 'owner').length;
  const current = NAV.find(n => n.to === location.pathname) ?? NAV[0];

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('sfhq-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sfhq-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 flex-shrink-0 sticky top-0 h-dvh border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="font-headline text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              SFH
            </span>
            <span style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <span className="meta-label">SearchFund HQ</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2.5 py-2 border text-[12px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Search…"
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font)' }}
            />
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 pt-3 space-y-4 overflow-y-auto">
          <div className="space-y-0.5">
            <NavLink to="/" end className={navLinkClass} style={navLinkStyle}>
              <LayoutDashboard size={15} /> Dashboard
            </NavLink>
          </div>

          <div className="space-y-0.5">
            <p className="meta-label px-3 mb-1" style={{ fontSize: 10 }}>Team</p>
            {NAV.filter(n => n.section === 'team').map(n => (
              <NavLink key={n.to} to={n.to} className={navLinkClass} style={navLinkStyle}>
                <n.icon size={15} />
                <span className="flex-1">{n.label}</span>
                {n.to === '/messages' && unread > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--danger)' }}>{unread}</span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="space-y-0.5">
            <p className="meta-label px-3 mb-1" style={{ fontSize: 10 }}>Deal Flow</p>
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

          {/* Theme toggle */}
          <button onClick={() => setDark(!dark)} className="theme-toggle w-full mt-2 justify-center">
            {dark ? <Sun size={13} /> : <Moon size={13} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User */}
          <div className="mt-3 px-3 py-3 border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>TA</div>
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
            <span className="font-headline text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>SFH</span>
            <span className="meta-label">SearchFund HQ</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="p-1" style={{ color: 'var(--text-tertiary)' }}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setOpen(!open)} className="p-1" style={{ color: 'var(--text-primary)' }}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {open && (
          <div className="md:hidden fixed inset-0 z-20 pt-12" style={{ background: 'var(--bg)' }}>
            <nav className="p-4 space-y-1">
              {NAV.map(n => (
                <NavLink
                  key={n.to} to={n.to} end={n.to === '/'}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium border-l-2"
                  style={({ isActive }) => ({
                    borderColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  })}
                >
                  <n.icon size={18} /> {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Desktop topbar */}
        <div className="hidden md:block">
          <header
            className="sticky top-0 px-8 h-11 flex items-center justify-between border-b z-10"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          >
            <nav className="flex items-center gap-2 meta-label" style={{ fontSize: 11 }}>
              <span>Workspace</span>
              <span style={{ color: 'var(--border-strong)' }}>/</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{current.label}</span>
            </nav>
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-[12px]">
                <FileText size={13} /> Docs
              </button>
            </div>
          </header>
        </div>

        <main className="flex-1 px-4 md:px-8 pt-4 pb-20 md:pb-10 w-full max-w-[1200px]">
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

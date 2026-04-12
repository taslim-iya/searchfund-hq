import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Building2, LayoutDashboard, Users, ListTodo, Briefcase, Sparkles, Send, MessageSquare, Settings, Menu, X, FileText, Star, Database, Microscope, Eye } from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interns', icon: Users, label: 'Interns', section: 'team' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks', section: 'team' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', section: 'team' },
  { to: '/companies', icon: Briefcase, label: 'Pipeline', section: 'deals' },
  { to: '/enrich', icon: Sparkles, label: 'Enrich', section: 'deals' },
  { to: '/outreach', icon: Send, label: 'Outreach', section: 'deals' },
  { to: '/reports', icon: FileText, label: 'Reports', section: 'deals' },
  { to: '/sourced', icon: Star, label: 'Sourced (15)', section: 'deals' },
  { to: '/database', icon: Database, label: 'Database (2.4M)', section: 'deals' },
  { to: '/research', icon: Microscope, label: 'Research', section: 'deals' },
  { to: '/watchlist', icon: Eye, label: 'Watchlist', section: 'deals' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { messages } = useAppStore();
  const unread = messages.filter(m => !m.read && m.to === 'owner').length;

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden md:flex flex-col w-56 border-r flex-shrink-0 sticky top-0 h-dvh" style={{ borderColor: 'var(--border)' }}>
        <div className="p-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <Building2 size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-[15px] font-bold tracking-tight">SearchFund HQ</span>
        </div>

        <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
          <div>
            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? '' : 'hover:bg-[var(--bg-alt)]'}`}
              style={({ isActive }) => ({ background: isActive ? 'var(--accent-light)' : undefined, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' })}>
              <LayoutDashboard size={15} /> Dashboard
            </NavLink>
          </div>

          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Team</p>
            {NAV.filter(n => n.section === 'team').map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? '' : 'hover:bg-[var(--bg-alt)]'}`}
                style={({ isActive }) => ({ background: isActive ? 'var(--accent-light)' : undefined, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' })}>
                <n.icon size={15} />
                {n.label}
                {n.to === '/messages' && unread > 0 && <span className="ml-auto w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--danger)' }}>{unread}</span>}
              </NavLink>
            ))}
          </div>

          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Deal Flow</p>
            {NAV.filter(n => n.section === 'deals').map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? '' : 'hover:bg-[var(--bg-alt)]'}`}
                style={({ isActive }) => ({ background: isActive ? 'var(--accent-light)' : undefined, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' })}>
                <n.icon size={15} /> {n.label}
              </NavLink>
            ))}
          </div>

          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? '' : 'hover:bg-[var(--bg-alt)]'}`}
            style={({ isActive }) => ({ background: isActive ? 'var(--accent-light)' : undefined, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' })}>
            <Settings size={15} /> Settings
          </NavLink>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: 'var(--accent)' }} />
            <span className="text-[14px] font-bold">SearchFund HQ</span>
          </div>
          <button onClick={() => setOpen(!open)} className="p-1">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </header>
        {open && (
          <div className="md:hidden fixed inset-0 z-20 pt-12" style={{ background: 'var(--bg)' }}>
            <nav className="p-4 space-y-1">
              {NAV.map(n => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium"
                  style={({ isActive }) => ({ background: isActive ? 'var(--accent-light)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)' })}>
                  <n.icon size={18} /> {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-6xl"><Outlet /></main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t py-1.5 z-30" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          {[NAV[0], NAV[1], NAV[4], NAV[5], NAV[6]].map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="flex flex-col items-center gap-0.5 px-2 py-1"
              style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' })}>
              <n.icon size={18} /><span className="text-[9px] font-medium">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

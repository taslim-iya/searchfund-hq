import { useAppStore } from '@/store/appStore';
import { Users, Briefcase, Sparkles, Send, ListTodo, MessageSquare, ArrowUpRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const STAGE_ORDER = ['imported', 'researching', 'enriched', 'outreach-ready', 'outreach-sent', 'replied', 'meeting', 'passed'] as const;
const STAGE_COLORS = ['#999', '#3b82f6', '#8b5cf6', '#f59e0b', '#6366f1', '#10b981', '#ec4899', '#ef4444'];

export default function Dashboard() {
  const { interns, tasks, companies, messages, activity } = useAppStore();
  const activeInterns = interns.filter(i => i.status === 'active');
  const openTasks = tasks.filter(t => t.status !== 'done');
  const unread = messages.filter(m => !m.read && m.to === 'owner').length;

  const stats = [
    { label: 'Active Interns', value: activeInterns.length, icon: Users, color: 'var(--accent)', to: '/interns' },
    { label: 'Open Tasks', value: openTasks.length, icon: ListTodo, color: 'var(--accent-3)', to: '/tasks' },
    { label: 'Companies', value: companies.length, icon: Briefcase, color: 'var(--purple)', to: '/companies' },
    { label: 'Enriched', value: companies.filter(c => c.stage !== 'imported' && c.stage !== 'researching').length, icon: Sparkles, color: 'var(--accent-2)', to: '/enrich' },
    { label: 'Outreach Sent', value: companies.filter(c => c.outreachStatus === 'sent').length, icon: Send, color: 'var(--blue)', to: '/outreach' },
    { label: 'Unread Messages', value: unread, icon: MessageSquare, color: 'var(--danger)', to: '/messages' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Command Centre</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Search fund deal sourcing overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map(s => (
          <Link key={s.label} to={s.to} className="card p-4 no-underline">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <ArrowUpRight size={10} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-2xl font-bold mono">{s.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="card p-5 mb-4">
        <h3 className="text-[13px] font-semibold mb-3">Pipeline</h3>
        <div className="flex gap-1">
          {STAGE_ORDER.map((stage, i) => {
            const count = companies.filter(c => c.stage === stage).length;
            return (
              <div key={stage} className="flex-1 text-center">
                <div className="h-8 rounded flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: STAGE_COLORS[i], opacity: count > 0 ? 1 : 0.3 }}>
                  {count}
                </div>
                <p className="text-[8px] mt-1 capitalize" style={{ color: 'var(--text-tertiary)' }}>{stage.replace('-', ' ')}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold">Open Tasks</h3>
            <Link to="/tasks" className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>View all</Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No open tasks. Assign work to your interns!</p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 6).map(t => {
                const intern = interns.find(i => i.id === t.assigneeId);
                return (
                  <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.priority === 'urgent' ? 'var(--danger)' : t.priority === 'high' ? 'var(--accent-3)' : 'var(--accent)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{t.title}</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{intern?.name || 'Unassigned'} · {t.status}</p>
                    </div>
                    <span className="badge text-[8px]" style={{ background: t.type === 'research' ? 'var(--accent-light)' : t.type === 'outreach' ? '#10b98110' : '#f59e0b10', color: t.type === 'research' ? 'var(--accent)' : t.type === 'outreach' ? '#10b981' : '#f59e0b' }}>{t.type}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-3">Activity</h3>
          {activity.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.type === 'success' ? 'var(--accent-2)' : a.type === 'error' ? 'var(--danger)' : 'var(--accent)' }} />
                  <div>
                    <p className="text-[11px]">{a.action}</p>
                    <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

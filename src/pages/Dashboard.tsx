import { useAppStore } from '@/store/appStore';
import {
  Users, Briefcase, Sparkles, Send, ListTodo, MessageSquare, ArrowUpRight,
  TrendingUp, Activity as ActivityIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STAGE_ORDER = [
  'imported', 'researching', 'enriched', 'outreach-ready',
  'outreach-sent', 'replied', 'meeting', 'passed',
] as const;

const STAGE_COLORS: Record<typeof STAGE_ORDER[number], string> = {
  imported: '#94a3b8',
  researching: '#0ea5e9',
  enriched: '#a855f7',
  'outreach-ready': '#f0b429',
  'outreach-sent': '#635bff',
  replied: '#3fcf8e',
  meeting: '#ec4899',
  passed: '#94a3b8',
};

export default function Dashboard() {
  const { interns, tasks, companies, messages, activity } = useAppStore();
  const activeInterns = interns.filter(i => i.status === 'active');
  const openTasks = tasks.filter(t => t.status !== 'done');
  const unread = messages.filter(m => !m.read && m.to === 'owner').length;

  const enrichedCount = companies.filter(c => c.stage !== 'imported' && c.stage !== 'researching').length;
  const sentCount = companies.filter(c => c.outreachStatus === 'sent').length;
  const totalStages = companies.length || 1;

  const stats = [
    { label: 'Active interns', value: activeInterns.length, icon: Users, accent: '#635bff', to: '/interns' },
    { label: 'Open tasks', value: openTasks.length, icon: ListTodo, accent: '#f0b429', to: '/tasks' },
    { label: 'Companies', value: companies.length, icon: Briefcase, accent: '#a855f7', to: '/companies' },
    { label: 'Enriched', value: enrichedCount, icon: Sparkles, accent: '#3fcf8e', to: '/enrich' },
    { label: 'Outreach sent', value: sentCount, icon: Send, accent: '#0ea5e9', to: '/outreach' },
    { label: 'Unread messages', value: unread, icon: MessageSquare, accent: '#ef4444', to: '/messages' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero metrics row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.to} className="card p-4 no-underline group">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                style={{ background: `${s.accent}14`, color: s.accent }}
              >
                <s.icon size={14} strokeWidth={2.4} />
              </div>
              <ArrowUpRight
                size={13}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </div>
            <p className="text-[24px] font-bold tracking-[-0.02em] tabular leading-none"
              style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {s.label}
            </p>
          </Link>
        ))}
      </section>

      {/* Pipeline */}
      <section className="card p-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]"
              style={{ color: 'var(--text-primary)' }}>
              Pipeline
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              {companies.length} companies across {STAGE_ORDER.length} stages
            </p>
          </div>
          <span
            className="badge"
            style={{ background: 'rgba(63,207,142,0.10)', color: '#15803d' }}
          >
            <TrendingUp size={11} /> Live
          </span>
        </header>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {STAGE_ORDER.map(stage => {
            const count = companies.filter(c => c.stage === stage).length;
            const pct = Math.round((count / totalStages) * 100);
            const color = STAGE_COLORS[stage];
            return (
              <div key={stage} className="space-y-1.5">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-alt)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%`, background: color }}
                  />
                </div>
                <p className="text-[18px] font-bold tabular leading-none"
                  style={{ color: 'var(--text-primary)' }}>{count}</p>
                <p className="text-[10px] capitalize font-medium"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {stage.replace('-', ' ')}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {/* Open tasks */}
        <div className="card p-6">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Open tasks
              </h3>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {openTasks.length} active items
              </p>
            </div>
            <Link to="/tasks" className="text-[12px] font-semibold inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </header>

          {openTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Nothing in flight. Assign work to your interns.
              </p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {openTasks.slice(0, 6).map(t => {
                const intern = interns.find(i => i.id === t.assigneeId);
                const dotColor =
                  t.priority === 'urgent' ? 'var(--danger)'
                  : t.priority === 'high' ? 'var(--accent-3)'
                  : 'var(--accent)';
                const typeBg =
                  t.type === 'research' ? 'rgba(99,91,255,0.10)'
                  : t.type === 'outreach' ? 'rgba(63,207,142,0.10)'
                  : 'rgba(240,180,41,0.12)';
                const typeFg =
                  t.type === 'research' ? '#635bff'
                  : t.type === 'outreach' ? '#15803d'
                  : '#92400e';
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0"
                    style={{ borderColor: 'var(--border-light)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {intern?.name || 'Unassigned'} · {t.status}
                      </p>
                    </div>
                    <span className="badge" style={{ background: typeBg, color: typeFg }}>
                      {t.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Activity feed */}
        <div className="card p-6">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Activity
              </h3>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                Latest events across the workspace
              </p>
            </div>
            <ActivityIcon size={14} style={{ color: 'var(--text-tertiary)' }} />
          </header>

          {activity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No activity yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 8).map(a => {
                const dotColor =
                  a.type === 'success' ? 'var(--accent-2)'
                  : a.type === 'error' ? 'var(--danger)'
                  : 'var(--accent)';
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0"
                      style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        {a.action}
                      </p>
                      <p className="text-[11px] tabular" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

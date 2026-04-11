import { useState } from 'react';
import { useAppStore, type Task, type TaskStatus, type TaskType, type Priority } from '@/store/appStore';
import { Plus, ListTodo, X, MessageSquare } from 'lucide-react';

const STATUS_COLORS: Record<TaskStatus, string> = { pending: '#999', 'in-progress': 'var(--accent)', review: 'var(--accent-3)', done: 'var(--accent-2)', blocked: 'var(--danger)' };
const PRIORITY_COLORS: Record<Priority, string> = { low: '#999', medium: 'var(--accent)', high: 'var(--accent-3)', urgent: 'var(--danger)' };
const STATUSES: TaskStatus[] = ['pending', 'in-progress', 'review', 'done', 'blocked'];
const TYPES: TaskType[] = ['research', 'analysis', 'contact-find', 'outreach', 'follow-up', 'general'];

export default function Tasks() {
  const { tasks, interns, companies, addTask, updateTask, addTaskComment, addActivity, config } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [detail, setDetail] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ title: '', description: '', type: 'research' as TaskType, priority: 'medium' as Priority, assigneeId: '', companyId: '', dueDate: '' });

  const filtered = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => {
      const po = { urgent: 0, high: 1, medium: 2, low: 3 };
      return po[a.priority] - po[b.priority] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const add = () => {
    if (!form.title.trim()) return;
    addTask({ id: crypto.randomUUID(), ...form, status: 'pending', completedAt: '', comments: [], createdAt: new Date().toISOString() });
    addActivity({ id: crypto.randomUUID(), action: `Created task: ${form.title}`, detail: `Assigned to ${interns.find(i => i.id === form.assigneeId)?.name || 'unassigned'}`, timestamp: new Date().toISOString(), type: 'info' });
    setForm({ title: '', description: '', type: 'research', priority: 'medium', assigneeId: '', companyId: '', dueDate: '' });
    setShowAdd(false);
  };

  const addComment_ = () => {
    if (!detail || !comment.trim()) return;
    addTaskComment(detail.id, { id: crypto.randomUUID(), authorId: 'owner', authorName: config.ownerName || 'You', text: comment, timestamp: new Date().toISOString() });
    setDetail({ ...detail, comments: [...detail.comments, { id: crypto.randomUUID(), authorId: 'owner', authorName: config.ownerName || 'You', text: comment, timestamp: new Date().toISOString() }] });
    setComment('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{tasks.length} total · {tasks.filter(t => t.status !== 'done').length} open</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-[12px]"><Plus size={12} /> New Task</button>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className="px-2.5 py-1 rounded-md text-[10px] font-medium capitalize whitespace-nowrap"
            style={{ background: filter === s ? 'var(--accent-light)' : 'var(--bg-alt)', color: filter === s ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {s === 'all' ? `All (${tasks.length})` : `${s} (${tasks.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ListTodo size={24} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No tasks. Create one to assign to your interns.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(t => {
            const intern = interns.find(i => i.id === t.assigneeId);
            const company = companies.find(c => c.id === t.companyId);
            return (
              <div key={t.id} onClick={() => setDetail(t)} className="card p-3.5 flex items-center gap-3 cursor-pointer">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[t.priority] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{t.title}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {intern?.name || 'Unassigned'}{company ? ` · ${company.name}` : ''}{t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <span className="badge text-[9px] capitalize" style={{ background: `${STATUS_COLORS[t.status]}10`, color: STATUS_COLORS[t.status] }}>{t.status}</span>
                <span className="badge text-[8px]" style={{ background: 'var(--bg-alt)', color: 'var(--text-tertiary)' }}>{t.type}</span>
                {t.comments.length > 0 && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}><MessageSquare size={10} />{t.comments.length}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[14px] font-semibold truncate">{detail.title}</h2>
              <button onClick={() => setDetail(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <select value={detail.status} onChange={e => { updateTask(detail.id, { status: e.target.value as TaskStatus }); setDetail({ ...detail, status: e.target.value as TaskStatus }); }} className="input text-[11px] w-auto">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={detail.assigneeId} onChange={e => { updateTask(detail.id, { assigneeId: e.target.value }); setDetail({ ...detail, assigneeId: e.target.value }); }} className="input text-[11px] w-auto">
                  <option value="">Unassigned</option>
                  {interns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              {detail.description && <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{detail.description}</p>}

              <div>
                <h4 className="text-[11px] font-semibold mb-2">Comments ({detail.comments.length})</h4>
                <div className="space-y-2 mb-3">
                  {detail.comments.map(c => (
                    <div key={c.id} className="p-2.5 rounded-lg" style={{ background: c.authorId === 'owner' ? 'var(--accent-light)' : 'var(--bg-alt)' }}>
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: c.authorId === 'owner' ? 'var(--accent)' : 'var(--text-secondary)' }}>{c.authorName}</p>
                      <p className="text-[12px]">{c.text}</p>
                      <p className="text-[9px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{new Date(c.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment_()} className="input text-[12px] flex-1" placeholder="Add a comment..." />
                  <button onClick={addComment_} disabled={!comment.trim()} className="btn-primary text-[11px] py-1">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add task modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">New Task</h2>
              <button onClick={() => setShowAdd(false)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-2.5">
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input text-[12px]" placeholder="Research UK SaaS companies in healthcare" autoFocus /></div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input text-[12px]" rows={2} placeholder="Details..." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TaskType }))} className="input text-[12px]">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className="input text-[12px]">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select></div>
              </div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Assign to</label>
                <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))} className="input text-[12px]">
                  <option value="">Unassigned</option>
                  {interns.filter(i => i.status === 'active').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select></div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Company (optional)</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="input text-[12px]">
                  <option value="">None</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Due date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input text-[12px]" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-[12px]">Cancel</button>
              <button onClick={add} disabled={!form.title.trim()} className="btn-primary text-[12px]">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

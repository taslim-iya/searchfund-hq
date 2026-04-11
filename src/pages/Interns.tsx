import { useState } from 'react';
import { useAppStore, type Intern, type InternStatus } from '@/store/appStore';
import { Plus, Users, X, Mail, CheckCircle, Clock, Pause } from 'lucide-react';

const STATUS_CONFIG: Record<InternStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Active', color: 'var(--accent-2)', icon: CheckCircle },
  onboarding: { label: 'Onboarding', color: 'var(--accent)', icon: Clock },
  paused: { label: 'Paused', color: 'var(--accent-3)', icon: Pause },
  completed: { label: 'Completed', color: 'var(--text-tertiary)', icon: CheckCircle },
};

export default function Interns() {
  const { interns, tasks, addIntern, updateIntern, removeIntern, addActivity } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Research Analyst', status: 'onboarding' as InternStatus });

  const add = () => {
    if (!form.name.trim()) return;
    addIntern({ id: crypto.randomUUID(), ...form, startDate: new Date().toISOString(), tasksAssigned: 0, tasksCompleted: 0, avatar: '', notes: '', createdAt: new Date().toISOString() });
    addActivity({ id: crypto.randomUUID(), action: `Added intern: ${form.name}`, detail: form.role, timestamp: new Date().toISOString(), type: 'success' });
    setForm({ name: '', email: '', role: 'Research Analyst', status: 'onboarding' });
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interns</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{interns.length} team members</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-[12px]"><Plus size={12} /> Add Intern</button>
      </div>

      {interns.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={24} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
          <p className="text-[14px] font-medium mb-1">No interns yet</p>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Add your research interns to start assigning tasks and tracking their work.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {interns.map(intern => {
            const sc = STATUS_CONFIG[intern.status];
            const internTasks = tasks.filter(t => t.assigneeId === intern.id);
            const completed = internTasks.filter(t => t.status === 'done').length;
            const open = internTasks.filter(t => t.status !== 'done').length;
            return (
              <div key={intern.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px]" style={{ background: 'var(--accent)' }}>
                      {intern.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">{intern.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{intern.role}</p>
                    </div>
                  </div>
                  <span className="badge text-[9px]" style={{ background: `${sc.color}10`, color: sc.color }}>{sc.label}</span>
                </div>
                {intern.email && <p className="text-[11px] flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-tertiary)' }}><Mail size={11} />{intern.email}</p>}
                <div className="flex gap-4 text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  <span>Open: <strong>{open}</strong></span>
                  <span>Done: <strong>{completed}</strong></span>
                  <span>Started: <strong>{new Date(intern.startDate).toLocaleDateString()}</strong></span>
                </div>
                <div className="flex gap-1.5">
                  <select value={intern.status} onChange={e => updateIntern(intern.id, { status: e.target.value as InternStatus })} className="input text-[11px] flex-1">
                    <option value="active">Active</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => removeIntern(intern.id)} className="btn-danger text-[10px] py-1 px-2">Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add Intern</h2>
              <button onClick={() => setShowAdd(false)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-2.5">
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-[12px]" placeholder="Full name" autoFocus /></div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input text-[12px]" placeholder="intern@email.com" type="email" /></div>
              <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input text-[12px]">
                  <option>Research Analyst</option><option>Outreach Associate</option><option>Data Analyst</option><option>Market Mapper</option><option>General</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-[12px]">Cancel</button>
              <button onClick={add} disabled={!form.name.trim()} className="btn-primary text-[12px]">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

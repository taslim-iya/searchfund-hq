import { useState, useMemo } from 'react';
import { Search, Plus, Building2, User, Mail, Phone, Globe, MapPin, Star, MessageSquare, Calendar, Trash2, Edit2, Check, X, ExternalLink, FileText } from 'lucide-react';

interface Broker {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  location: string;
  specialisms: string[];
  dealSizeMin: string;
  dealSizeMax: string;
  status: 'active' | 'warm' | 'cold' | 'new';
  rating: number;
  notes: string;
  lastContact: string;
  nextFollowUp: string;
  dealsShared: number;
  dealsRelevant: number;
  interactions: Interaction[];
  source: string;
  createdAt: string;
}

interface Interaction {
  id: string;
  date: string;
  type: 'call' | 'email' | 'meeting' | 'deal-shared' | 'note';
  summary: string;
}

const STATUS_COLORS = { active: '#3fcf8e', warm: '#f0b429', cold: '#6b7280', new: '#0ea5e9' };

export default function Brokers() {
  const [brokers, setBrokers] = useState<Broker[]>(() => {
    const s = localStorage.getItem('sf-brokers');
    return s ? JSON.parse(s) : [];
  });
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [detail, setDetail] = useState<Broker | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = (data: Broker[]) => { setBrokers(data); localStorage.setItem('sf-brokers', JSON.stringify(data)); };

  const filtered = useMemo(() => {
    let f = brokers;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(b => b.name.toLowerCase().includes(q) || b.company.toLowerCase().includes(q) || b.specialisms.some(s => s.toLowerCase().includes(q)) || b.location.toLowerCase().includes(q));
    }
    if (statusF) f = f.filter(b => b.status === statusF);
    return f;
  }, [brokers, search, statusF]);

  const addBroker = (b: Omit<Broker, 'id' | 'createdAt' | 'interactions' | 'dealsShared' | 'dealsRelevant'>) => {
    save([...brokers, { ...b, id: crypto.randomUUID(), createdAt: new Date().toISOString(), interactions: [], dealsShared: 0, dealsRelevant: 0 }]);
    setShowAdd(false);
  };

  const updateBroker = (id: string, patch: Partial<Broker>) => {
    save(brokers.map(b => b.id === id ? { ...b, ...patch } : b));
    if (detail?.id === id) setDetail({ ...detail, ...patch } as Broker);
  };

  const deleteBroker = (id: string) => { save(brokers.filter(b => b.id !== id)); setDetail(null); };

  const addInteraction = (brokerId: string, interaction: Omit<Interaction, 'id'>) => {
    save(brokers.map(b => b.id === brokerId ? {
      ...b,
      interactions: [{ ...interaction, id: crypto.randomUUID() }, ...b.interactions],
      lastContact: interaction.date,
      dealsShared: interaction.type === 'deal-shared' ? b.dealsShared + 1 : b.dealsShared,
    } : b));
  };

  const activeCount = brokers.filter(b => b.status === 'active').length;
  const warmCount = brokers.filter(b => b.status === 'warm').length;
  const totalDeals = brokers.reduce((s, b) => s + b.dealsShared, 0);

  const exportCSV = () => {
    const headers = 'Name,Company,Email,Phone,Website,LinkedIn,Location,Specialisms,Deal Size,Status,Rating,Last Contact,Notes\n';
    const rows = filtered.map(b => `"${b.name}","${b.company}","${b.email}","${b.phone}","${b.website}","${b.linkedin}","${b.location}","${b.specialisms.join('; ')}","${b.dealSizeMin}-${b.dealSizeMax}","${b.status}","${b.rating}","${b.lastContact}","${b.notes}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'broker-relationships.csv'; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Broker Relationships</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{brokers.length} brokers · {totalDeals} deals shared</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-[11px]"><FileText size={11} /> Export</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-[11px]"><Plus size={11} /> Add Broker</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card p-3"><p className="text-2xl font-bold mono">{brokers.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total Brokers</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: '#3fcf8e' }}>{activeCount}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Active</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: '#f0b429' }}>{warmCount}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Warm</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: 'var(--accent)' }}>{totalDeals}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Deals Shared</p></div>
      </div>

      {/* Add form */}
      {showAdd && <BrokerForm onSave={addBroker} onCancel={() => setShowAdd(false)} />}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-[12px]" placeholder="Search brokers, companies, specialisms..." />
        </div>
        <div className="flex gap-px p-0.5 rounded-lg" style={{ background: 'var(--border-light)' }}>
          {['', 'active', 'warm', 'cold', 'new'].map(s => (
            <button key={s} onClick={() => setStatusF(s)} className="px-2.5 py-1 rounded-md text-[10px] font-medium capitalize"
              style={{ background: statusF === s ? 'var(--bg)' : 'transparent', color: statusF === s ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Broker list */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Building2 size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[14px] font-medium mb-1">No brokers yet</p>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Add business brokers and M&A advisors you work with.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="card p-4 cursor-pointer" onClick={() => setDetail(b)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0"
                  style={{ background: STATUS_COLORS[b.status] }}>
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[14px] font-semibold">{b.name}</p>
                    <span className="badge text-[8px]" style={{ background: `${STATUS_COLORS[b.status]}15`, color: STATUS_COLORS[b.status] }}>{b.status}</span>
                    {b.rating > 0 && <span className="text-[10px]">{'⭐'.repeat(b.rating)}</span>}
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{b.company} · {b.location}</p>
                  {b.specialisms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.specialisms.map(s => <span key={s} className="badge text-[8px]">{s}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {b.dealsShared > 0 && `${b.dealsShared} deals · `}
                    {b.dealSizeMin && `£${b.dealSizeMin}-${b.dealSizeMax}`}
                  </p>
                  {b.lastContact && <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Last: {b.lastContact}</p>}
                  {b.nextFollowUp && <p className="text-[9px]" style={{ color: '#f0b429' }}>Follow up: {b.nextFollowUp}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-semibold">{detail.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => deleteBroker(detail.id)} className="btn-secondary text-[10px] py-1"><Trash2 size={10} style={{ color: '#ef4444' }} /></button>
                <button onClick={() => setDetail(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold"
                  style={{ background: STATUS_COLORS[detail.status] }}>
                  {detail.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[14px] font-semibold">{detail.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{detail.company}</p>
                  <select value={detail.status} onChange={e => updateBroker(detail.id, { status: e.target.value as any })}
                    className="text-[10px] px-2 py-0.5 rounded mt-0.5 font-medium"
                    style={{ background: `${STATUS_COLORS[detail.status]}15`, color: STATUS_COLORS[detail.status] }}>
                    <option value="new">New</option><option value="warm">Warm</option><option value="active">Active</option><option value="cold">Cold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Mail, label: 'Email', value: detail.email, link: `mailto:${detail.email}` },
                  { icon: Phone, label: 'Phone', value: detail.phone, link: `tel:${detail.phone}` },
                  { icon: Globe, label: 'Website', value: detail.website, link: detail.website },
                  { icon: Globe, label: 'LinkedIn', value: detail.linkedin ? 'Profile' : '', link: detail.linkedin },
                  { icon: MapPin, label: 'Location', value: detail.location },
                  { icon: Building2, label: 'Deal Size', value: detail.dealSizeMin ? `£${detail.dealSizeMin} – £${detail.dealSizeMax}` : '' },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                    <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                    {item.link && item.value ? (
                      <a href={item.link} target="_blank" className="text-[11px]" style={{ color: 'var(--accent)' }}>{item.value}</a>
                    ) : (
                      <p className="text-[11px]">{item.value || '—'}</p>
                    )}
                  </div>
                ))}
              </div>

              {detail.specialisms.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">Specialisms</p>
                  <div className="flex flex-wrap gap-1">{detail.specialisms.map(s => <span key={s} className="badge text-[9px]">{s}</span>)}</div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold mb-1">Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => updateBroker(detail.id, { rating: r })} className="text-[16px]">
                      {r <= detail.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold mb-1">Follow-up Date</p>
                <input type="date" value={detail.nextFollowUp} onChange={e => updateBroker(detail.id, { nextFollowUp: e.target.value })} className="input text-[12px]" />
              </div>

              <div>
                <p className="text-[10px] font-semibold mb-1">Notes</p>
                <textarea value={detail.notes} onChange={e => updateBroker(detail.id, { notes: e.target.value })} className="input text-[12px]" rows={3} placeholder="Notes about this broker..." />
              </div>

              {/* Interactions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold">Interaction History</p>
                  <InteractionAdder onAdd={(i) => { addInteraction(detail.id, i); setDetail({ ...detail, interactions: [{ ...i, id: crypto.randomUUID() }, ...detail.interactions], lastContact: i.date }); }} />
                </div>
                {detail.interactions.length === 0 && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No interactions logged yet.</p>}
                {detail.interactions.map(i => (
                  <div key={i.id} className="flex gap-2 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <span className="badge text-[8px] flex-shrink-0 mt-0.5">{i.type}</span>
                    <div>
                      <p className="text-[11px]">{i.summary}</p>
                      <p className="text-[9px] mono" style={{ color: 'var(--text-tertiary)' }}>{i.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractionAdder({ onAdd }: { onAdd: (i: Omit<Interaction, 'id'>) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Interaction['type']>('call');
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary text-[10px]"><Plus size={10} /> Log</button>;

  return (
    <div className="flex gap-1.5 items-center">
      <select value={type} onChange={e => setType(e.target.value as any)} className="input text-[10px] w-auto py-1">{['call', 'email', 'meeting', 'deal-shared', 'note'].map(t => <option key={t}>{t}</option>)}</select>
      <input value={summary} onChange={e => setSummary(e.target.value)} className="input text-[10px] flex-1 py-1" placeholder="Summary..." />
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-[10px] w-auto py-1" />
      <button onClick={() => { if (summary) { onAdd({ type, summary, date }); setSummary(''); setOpen(false); } }} className="btn-primary text-[10px] py-1"><Check size={10} /></button>
      <button onClick={() => setOpen(false)}><X size={12} style={{ color: 'var(--text-tertiary)' }} /></button>
    </div>
  );
}

function BrokerForm({ onSave, onCancel }: { onSave: (b: any) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '', website: '', linkedin: '', location: '', specialisms: '', dealSizeMin: '', dealSizeMax: '', status: 'new' as const, rating: 0, notes: '', lastContact: '', nextFollowUp: '', source: '' });

  return (
    <div className="card p-4 mb-4">
      <p className="text-[12px] font-semibold mb-3">Add New Broker</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="input text-[11px]" placeholder="Contact name *" />
        <input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} className="input text-[11px]" placeholder="Brokerage / Advisory firm" />
        <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="input text-[11px]" placeholder="Email" type="email" />
        <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="input text-[11px]" placeholder="Phone" />
        <input value={f.website} onChange={e => setF({ ...f, website: e.target.value })} className="input text-[11px]" placeholder="Website" />
        <input value={f.linkedin} onChange={e => setF({ ...f, linkedin: e.target.value })} className="input text-[11px]" placeholder="LinkedIn URL" />
        <input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} className="input text-[11px]" placeholder="Location" />
        <input value={f.specialisms} onChange={e => setF({ ...f, specialisms: e.target.value })} className="input text-[11px]" placeholder="Specialisms (comma-separated)" />
        <input value={f.dealSizeMin} onChange={e => setF({ ...f, dealSizeMin: e.target.value })} className="input text-[11px]" placeholder="Min deal size (£)" />
        <input value={f.dealSizeMax} onChange={e => setF({ ...f, dealSizeMax: e.target.value })} className="input text-[11px]" placeholder="Max deal size (£)" />
        <input value={f.source} onChange={e => setF({ ...f, source: e.target.value })} className="input text-[11px]" placeholder="Source (how you found them)" />
        <select value={f.status} onChange={e => setF({ ...f, status: e.target.value as any })} className="input text-[11px]">
          <option value="new">New</option><option value="warm">Warm</option><option value="active">Active</option><option value="cold">Cold</option>
        </select>
      </div>
      <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} className="input text-[11px] mt-2" rows={2} placeholder="Notes..." />
      <div className="flex gap-2 mt-2">
        <button onClick={() => { if (f.name) onSave({ ...f, specialisms: f.specialisms.split(',').map(s => s.trim()).filter(Boolean) }); }} className="btn-primary text-[11px]"><Plus size={11} /> Add Broker</button>
        <button onClick={onCancel} className="btn-secondary text-[11px]">Cancel</button>
      </div>
    </div>
  );
}

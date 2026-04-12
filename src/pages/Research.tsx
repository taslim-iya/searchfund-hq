import { useState, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import rollupData from '@/data/rollup-sectors.json';
import { Search, Plus, Sparkles, Upload, Download, BarChart3, X, ChevronDown, ArrowUpDown, Loader2, Trash2, Edit2, Check } from 'lucide-react';

interface Sector {
  id: string;
  category: string;
  subNiche: string;
  recurringRevenue: string;
  fragmentation: string;
  peHeat: string;
  gaPercent: number;
  externalSpend: number;
  densityBenefit: string;
  densityCost: number;
  totalScore: number;
  notes?: string;
  source?: string;
}

const HML_COLORS = { H: '#10b981', M: '#f59e0b', L: '#ef4444' };

export default function Research() {
  const { config } = useAppStore();
  const [sectors, setSectors] = useState<Sector[]>(() => {
    const saved = localStorage.getItem('sf-research-sectors');
    if (saved) return JSON.parse(saved);
    return rollupData.map((d: any, i: number) => ({ ...d, id: `imported-${i}`, source: 'GPT Rollup Analysis' }));
  });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'ga' | 'spend'>('score');
  const [detail, setDetail] = useState<Sector | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = (data: Sector[]) => { setSectors(data); localStorage.setItem('sf-research-sectors', JSON.stringify(data)); };

  const categories = useMemo(() => [...new Set(sectors.map(s => s.category))].sort(), [sectors]);

  const filtered = useMemo(() => {
    let f = sectors;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(s => s.subNiche.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.densityBenefit.toLowerCase().includes(q));
    }
    if (catFilter) f = f.filter(s => s.category === catFilter);
    if (sortBy === 'score') f = [...f].sort((a, b) => b.totalScore - a.totalScore);
    else if (sortBy === 'name') f = [...f].sort((a, b) => a.subNiche.localeCompare(b.subNiche));
    else if (sortBy === 'ga') f = [...f].sort((a, b) => b.gaPercent - a.gaPercent);
    else if (sortBy === 'spend') f = [...f].sort((a, b) => b.externalSpend - a.externalSpend);
    return f;
  }, [sectors, search, catFilter, sortBy]);

  const avgScore = sectors.length ? Math.round(sectors.reduce((s, x) => s + x.totalScore, 0) / sectors.length) : 0;
  const topNiches = [...sectors].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

  const addManual = (s: Omit<Sector, 'id'>) => {
    save([...sectors, { ...s, id: `manual-${Date.now()}` }]);
  };

  const deleteSector = (id: string) => save(sectors.filter(s => s.id !== id));

  const saveNotes = (id: string, notes: string) => {
    save(sectors.map(s => s.id === id ? { ...s, notes } : s));
    setEditingNotes(null);
  };

  const aiGenerate = async () => {
    if (!aiPrompt.trim() || !config.openaiKey) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.openaiKey,
          messages: [{
            role: 'system',
            content: `You are a search fund industry analyst. Analyse the given industry/niche for rollup potential. Return a JSON array of objects with these fields: category (string), subNiche (string), recurringRevenue (H/M/L), fragmentation (H/M/L), peHeat (H/M/L), gaPercent (number 0-20), externalSpend (number 0-50), densityBenefit (string like "Route Density" or "Labour Utilization"), densityCost (number 0-40), totalScore (number = gaPercent + externalSpend + densityCost). Generate 5-10 sub-niches. Only output valid JSON, no markdown.`
          }, {
            role: 'user',
            content: `Analyse this industry for search fund rollup potential: ${aiPrompt}`
          }],
          model: 'gpt-4o',
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, ''));
      if (Array.isArray(parsed)) {
        const newSectors = parsed.map((s: any, i: number) => ({
          ...s, id: `ai-${Date.now()}-${i}`, source: `AI: ${aiPrompt}`,
        }));
        save([...sectors, ...newSectors]);
        setAiPrompt('');
      }
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const newSectors: Sector[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
          newSectors.push({
            id: `upload-${Date.now()}-${i}`,
            category: obj['category'] || obj['Niche Category'] || obj['Category'] || 'Uploaded',
            subNiche: obj['subNiche'] || obj['Sub-Niche'] || obj['sub_niche'] || obj['name'] || `Row ${i}`,
            recurringRevenue: obj['recurringRevenue'] || obj['Recurring Revenue'] || 'M',
            fragmentation: obj['fragmentation'] || obj['Fragmentation'] || 'M',
            peHeat: obj['peHeat'] || obj['PE Heat'] || 'M',
            gaPercent: parseFloat(obj['gaPercent'] || obj['G&A'] || '5') || 5,
            externalSpend: parseFloat(obj['externalSpend'] || obj['Addressable external spend'] || '10') || 10,
            densityBenefit: obj['densityBenefit'] || obj['Primary Regional Density Benefit'] || '',
            densityCost: parseFloat(obj['densityCost'] || obj['Density-Addressable Cost'] || '10') || 10,
            totalScore: parseFloat(obj['totalScore'] || obj['Total Score'] || '25') || 25,
            source: `Upload: ${file.name}`,
          });
        }
        save([...sectors, ...newSectors]);
      } catch { }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportCSV = () => {
    const headers = 'Category,Sub-Niche,Recurring Revenue,Fragmentation,PE Heat,G&A %,External Spend %,Density Benefit,Density Cost %,Total Score,Notes,Source\n';
    const rows = filtered.map(s => `"${s.category}","${s.subNiche}","${s.recurringRevenue}","${s.fragmentation}","${s.peHeat}",${s.gaPercent},${s.externalSpend},"${s.densityBenefit}",${s.densityCost},${s.totalScore},"${s.notes || ''}","${s.source || ''}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'industry-research.csv'; a.click();
  };

  const HMLBadge = ({ v }: { v: string }) => (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold"
      style={{ background: `${HML_COLORS[v as keyof typeof HML_COLORS] || '#999'}15`, color: HML_COLORS[v as keyof typeof HML_COLORS] || '#999' }}>
      {v}
    </span>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Industry Research</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{sectors.length} sub-niches analysed · Rollup potential scoring</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-[11px]"><Plus size={11} /> Add</button>
          <button onClick={exportCSV} className="btn-secondary text-[11px]"><Download size={11} /> CSV</button>
          <input type="file" ref={fileRef} accept=".csv" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-[11px]"><Upload size={11} /> Import</button>
        </div>
      </div>

      {/* Add panel */}
      {showAdd && (
        <div className="card p-4 mb-4 space-y-3">
          <div>
            <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5"><Sparkles size={12} style={{ color: 'var(--accent)' }} /> AI Industry Analysis</p>
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && aiGenerate()}
                className="input flex-1 text-[12px]" placeholder="e.g. 'Fire safety compliance services' or 'Veterinary clinics UK'" />
              <button onClick={aiGenerate} disabled={aiLoading || !config.openaiKey} className="btn-primary text-[11px] disabled:opacity-50">
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Analyse
              </button>
            </div>
            {!config.openaiKey && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>Set your OpenAI API key in Settings first</p>}
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-light)' }}>
            <p className="text-[11px] font-semibold mb-2">Manual Add</p>
            <ManualAddForm onAdd={addManual} categories={categories} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card p-3"><p className="text-2xl font-bold mono">{sectors.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Sub-Niches</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono">{categories.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Categories</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: '#10b981' }}>{avgScore}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Avg Score</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: 'var(--accent)' }}>{topNiches[0]?.totalScore || 0}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Top Score</p></div>
      </div>

      {/* Top 5 */}
      <div className="card p-4 mb-4">
        <h3 className="text-[12px] font-semibold mb-2">🏆 Top Rollup Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {topNiches.map((s, i) => (
            <div key={s.id || i} className="p-3 rounded-lg cursor-pointer" onClick={() => setDetail(s)}
              style={{ background: 'var(--bg-alt)' }}>
              <p className="text-[18px] font-bold mono" style={{ color: i === 0 ? '#10b981' : 'var(--text-primary)' }}>{s.totalScore}</p>
              <p className="text-[11px] font-medium leading-tight">{s.subNiche}</p>
              <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{s.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-[12px]" placeholder="Search niches..." />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-auto text-[12px]">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input w-auto text-[12px]">
          <option value="score">Sort: Score ↓</option>
          <option value="name">Sort: Name</option>
          <option value="ga">Sort: G&A ↓</option>
          <option value="spend">Sort: Ext. Spend ↓</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-alt)' }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Sub-Niche</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Category</th>
                <th className="px-2 py-2 text-center font-medium" style={{ color: 'var(--text-tertiary)' }}>Recur.</th>
                <th className="px-2 py-2 text-center font-medium" style={{ color: 'var(--text-tertiary)' }}>Frag.</th>
                <th className="px-2 py-2 text-center font-medium" style={{ color: 'var(--text-tertiary)' }}>PE</th>
                <th className="px-2 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>G&A%</th>
                <th className="px-2 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>Ext.Spend%</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Density</th>
                <th className="px-2 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>Score</th>
                <th className="px-2 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => setDetail(s)} className="cursor-pointer hover:bg-[var(--bg-alt)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="px-3 py-2 font-medium">{s.subNiche}</td>
                  <td className="px-3 py-2"><span className="badge text-[9px]">{s.category}</span></td>
                  <td className="px-2 py-2 text-center"><HMLBadge v={s.recurringRevenue} /></td>
                  <td className="px-2 py-2 text-center"><HMLBadge v={s.fragmentation} /></td>
                  <td className="px-2 py-2 text-center"><HMLBadge v={s.peHeat} /></td>
                  <td className="px-2 py-2 text-right mono">{s.gaPercent}%</td>
                  <td className="px-2 py-2 text-right mono">{s.externalSpend}%</td>
                  <td className="px-3 py-2 text-[11px]">{s.densityBenefit}</td>
                  <td className="px-2 py-2 text-right">
                    <span className="font-bold mono text-[13px]" style={{ color: s.totalScore >= 50 ? '#10b981' : s.totalScore >= 35 ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {s.totalScore}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={e => { e.stopPropagation(); deleteSector(s.id); }} className="p-1 rounded hover:bg-red-50">
                      <Trash2 size={11} style={{ color: '#ef4444' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-semibold">{detail.subNiche}</h2>
              <button onClick={() => setDetail(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold mono" style={{ color: detail.totalScore >= 50 ? '#10b981' : '#f59e0b' }}>{detail.totalScore}</span>
                <div>
                  <p className="text-[12px] font-medium">{detail.category}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{detail.source || 'GPT Rollup Analysis'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Recurring Revenue', value: detail.recurringRevenue },
                  { label: 'Fragmentation', value: detail.fragmentation },
                  { label: 'PE Heat', value: detail.peHeat },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-alt)' }}>
                    <HMLBadge v={item.value} />
                    <p className="text-[9px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { label: 'G&A as % of Revenue', value: `${detail.gaPercent}%`, bar: detail.gaPercent / 20 },
                  { label: 'Addressable External Spend', value: `${detail.externalSpend}%`, bar: detail.externalSpend / 50 },
                  { label: 'Density-Addressable Cost', value: `${detail.densityCost}%`, bar: detail.densityCost / 40 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className="font-medium mono">{item.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-alt)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.bar * 100)}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                <p className="text-[10px] font-semibold mb-0.5">Density Benefit</p>
                <p className="text-[12px]">{detail.densityBenefit || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold">Notes</p>
                  {editingNotes !== detail.id ? (
                    <button onClick={() => { setEditingNotes(detail.id); setNoteText(detail.notes || ''); }} className="text-[10px]" style={{ color: 'var(--accent)' }}>
                      <Edit2 size={10} className="inline mr-0.5" /> Edit
                    </button>
                  ) : (
                    <button onClick={() => saveNotes(detail.id, noteText)} className="text-[10px]" style={{ color: '#10b981' }}>
                      <Check size={10} className="inline mr-0.5" /> Save
                    </button>
                  )}
                </div>
                {editingNotes === detail.id ? (
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} className="input text-[12px]" rows={4} />
                ) : (
                  <p className="text-[12px]" style={{ color: detail.notes ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                    {detail.notes || 'No notes yet. Click edit to add your analysis.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualAddForm({ onAdd, categories }: { onAdd: (s: Omit<Sector, 'id'>) => void; categories: string[] }) {
  const [f, setF] = useState({ category: '', subNiche: '', recurringRevenue: 'M', fragmentation: 'M', peHeat: 'M', gaPercent: 8, externalSpend: 15, densityBenefit: '', densityCost: 15, totalScore: 38, notes: '', source: 'Manual' });
  const update = (k: string, v: any) => {
    const next = { ...f, [k]: v };
    if (['gaPercent', 'externalSpend', 'densityCost'].includes(k)) {
      next.totalScore = (Number(next.gaPercent) || 0) + (Number(next.externalSpend) || 0) + (Number(next.densityCost) || 0);
    }
    setF(next);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <input value={f.category} onChange={e => update('category', e.target.value)} className="input text-[11px]" placeholder="Category" list="cats" />
      <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
      <input value={f.subNiche} onChange={e => update('subNiche', e.target.value)} className="input text-[11px]" placeholder="Sub-Niche name" />
      <select value={f.recurringRevenue} onChange={e => update('recurringRevenue', e.target.value)} className="input text-[11px]">
        <option value="H">Recurring: High</option><option value="M">Recurring: Medium</option><option value="L">Recurring: Low</option>
      </select>
      <select value={f.fragmentation} onChange={e => update('fragmentation', e.target.value)} className="input text-[11px]">
        <option value="H">Fragmentation: High</option><option value="M">Fragmentation: Medium</option><option value="L">Fragmentation: Low</option>
      </select>
      <input type="number" value={f.gaPercent} onChange={e => update('gaPercent', parseFloat(e.target.value))} className="input text-[11px]" placeholder="G&A %" />
      <input type="number" value={f.externalSpend} onChange={e => update('externalSpend', parseFloat(e.target.value))} className="input text-[11px]" placeholder="External Spend %" />
      <input value={f.densityBenefit} onChange={e => update('densityBenefit', e.target.value)} className="input text-[11px] col-span-2" placeholder="Density Benefit (e.g. Route Density)" />
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-[11px] font-bold mono" style={{ color: '#10b981' }}>Score: {f.totalScore}</span>
        <button onClick={() => { onAdd(f as any); setF({ ...f, subNiche: '' }); }} className="btn-primary text-[11px] ml-auto"><Plus size={11} /> Add</button>
      </div>
    </div>
  );
}

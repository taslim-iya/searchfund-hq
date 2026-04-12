import { useState, useEffect, useMemo } from 'react';
import { useAppStore, emptyCompany } from '@/store/appStore';
import { Building2, Search, Plus, CheckCircle, Download, Filter, BarChart3, MapPin, ChevronLeft, ChevronRight, ArrowUpDown, ExternalLink } from 'lucide-react';

interface MassCompany {
  n: string; num: string; sic: string; sec: string; cr: string;
  loc: string; reg: string; pc: string; addr: string; type: string;
}

const PAGE_SIZE = 50;

export default function MassSourced() {
  const { companies, addCompany, addActivity } = useAppStore();
  const [data, setData] = useState<MassCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorF, setSectorF] = useState('');
  const [regionF, setRegionF] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'sector'>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/data/mass-companies.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const s: Record<string, number> = {};
    data.forEach(c => { s[c.sec] = (s[c.sec] || 0) + 1; });
    return Object.entries(s).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const regions = useMemo(() => {
    const r: Record<string, number> = {};
    data.forEach(c => { const reg = c.reg || c.loc || 'Unknown'; r[reg] = (r[reg] || 0) + 1; });
    return Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, 30);
  }, [data]);

  const filtered = useMemo(() => {
    let f = data;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(c => c.n.toLowerCase().includes(q) || c.sec.toLowerCase().includes(q) || c.loc.toLowerCase().includes(q) || c.num.includes(q) || c.pc.toLowerCase().includes(q));
    }
    if (sectorF) f = f.filter(c => c.sec === sectorF);
    if (regionF) f = f.filter(c => (c.reg || c.loc) === regionF);
    
    if (sortBy === 'name') f = [...f].sort((a, b) => a.n.localeCompare(b.n));
    else if (sortBy === 'age') f = [...f].sort((a, b) => (a.cr || '9').localeCompare(b.cr || '9'));
    else if (sortBy === 'sector') f = [...f].sort((a, b) => a.sec.localeCompare(b.sec));
    
    return f;
  }, [data, search, sectorF, regionF, sortBy]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const getAge = (cr: string) => cr ? new Date().getFullYear() - parseInt(cr.split('-')[0]) : 0;

  const alreadyImported = (num: string) => companies.some(x => x.companiesHouseNumber === num);

  const importCompany = (c: MassCompany) => {
    if (alreadyImported(c.num)) return;
    addCompany(emptyCompany({
      name: c.n, companiesHouseNumber: c.num, sector: c.sec, location: c.loc || c.reg,
      postcode: c.pc, registeredAddress: c.addr, incorporatedDate: c.cr,
      source: 'companies-house', stage: 'imported',
    }));
    addActivity({ id: crypto.randomUUID(), action: `Imported ${c.n}`, detail: `CH: ${c.num}`, timestamp: new Date().toISOString(), type: 'success' });
  };

  const importSelected = () => {
    filtered.filter(c => selected.has(c.num) && !alreadyImported(c.num)).forEach(importCompany);
    setSelected(new Set());
  };

  const importPage = () => pageData.filter(c => !alreadyImported(c.num)).forEach(importCompany);

  const toggleSelect = (num: string) => {
    const next = new Set(selected);
    next.has(num) ? next.delete(num) : next.add(num);
    setSelected(next);
  };

  const selectAllPage = () => {
    const next = new Set(selected);
    pageData.forEach(c => next.add(c.num));
    setSelected(next);
  };

  const exportCSV = () => {
    const headers = 'Company Name,Company Number,Sector,Incorporated,Location,Region,Postcode,Address,Companies House URL\n';
    const rows = filtered.map(c => `"${c.n}","${c.num}","${c.sec}","${c.cr}","${c.loc}","${c.reg}","${c.pc}","${c.addr}","https://find-and-update.company-information.service.gov.uk/company/${c.num}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `searchfund-sourced-${filtered.length}-companies.csv`; a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading 10,000+ companies...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Company Database</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{data.length.toLocaleString()} UK SMEs sourced from Companies House · {filtered.length.toLocaleString()} shown</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={importSelected} className="btn-primary text-[11px]"><Plus size={11} /> Import Selected ({selected.size})</button>
          )}
          <button onClick={exportCSV} className="btn-secondary text-[11px]"><Download size={11} /> Export CSV</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <div className="card p-3"><p className="text-2xl font-bold mono">{data.length.toLocaleString()}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total Sourced</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono">{sectors.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Sectors</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono">{regions.length}+</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Regions</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: '#10b981' }}>{filtered.length.toLocaleString()}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Matching Filters</p></div>
        <div className="card p-3"><p className="text-2xl font-bold mono" style={{ color: 'var(--accent)' }}>{companies.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>In Pipeline</p></div>
      </div>

      {/* Sector breakdown — scrollable chips */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={12} style={{ color: 'var(--accent)' }} />
          <p className="text-[11px] font-semibold">Sectors</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSectorF('')} className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium"
            style={{ background: !sectorF ? 'var(--accent)' : 'var(--bg-alt)', color: !sectorF ? '#fff' : 'var(--text-secondary)' }}>
            All ({data.length.toLocaleString()})
          </button>
          {sectors.map(([sec, ct]) => (
            <button key={sec} onClick={() => { setSectorF(sectorF === sec ? '' : sec); setPage(0); }}
              className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap"
              style={{ background: sectorF === sec ? 'var(--accent)' : 'var(--bg-alt)', color: sectorF === sec ? '#fff' : 'var(--text-secondary)' }}>
              {sec} ({ct})
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="input pl-8 text-[12px]" placeholder="Search name, sector, location, postcode, CH number..." />
        </div>
        <select value={regionF} onChange={e => { setRegionF(e.target.value); setPage(0); }} className="input w-auto text-[12px]" style={{ minWidth: 130 }}>
          <option value="">All regions</option>
          {regions.map(([r, ct]) => <option key={r} value={r}>{r} ({ct})</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input w-auto text-[12px]">
          <option value="name">Sort: Name</option>
          <option value="age">Sort: Oldest first</option>
          <option value="sector">Sort: Sector</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-alt)' }}>
          <button onClick={selectAllPage} className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Select page</button>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>·</span>
          <button onClick={importPage} className="text-[10px] font-medium" style={{ color: '#10b981' }}>Import page ({pageData.filter(c => !alreadyImported(c.num)).length})</button>
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="px-3 py-2 text-left w-8"></th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Company</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Sector</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Location</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Est.</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Age</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map(c => {
                const imported = alreadyImported(c.num);
                const age = getAge(c.cr);
                return (
                  <tr key={c.num} className="hover:bg-[var(--bg-alt)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(c.num)} onChange={() => toggleSelect(c.num)} className="w-3.5 h-3.5" />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-[12px] leading-tight">{c.n}</p>
                      <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.num}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge text-[9px]">{c.sec}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-[11px]">{c.loc || c.reg || '—'}</p>
                      <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.pc}</p>
                    </td>
                    <td className="px-3 py-2 mono text-[11px]">{c.cr ? c.cr.split('-')[0] : '—'}</td>
                    <td className="px-3 py-2">
                      <span className="mono text-[11px]" style={{ color: age >= 15 ? '#10b981' : age >= 8 ? '#f59e0b' : 'var(--text-tertiary)' }}>
                        {age}yr
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={`https://find-and-update.company-information.service.gov.uk/company/${c.num}`} target="_blank"
                          className="btn-secondary text-[9px] py-0.5 px-1.5"><ExternalLink size={9} /></a>
                        {imported ? (
                          <span className="text-[9px] font-medium" style={{ color: '#10b981' }}><CheckCircle size={9} className="inline" /></span>
                        ) : (
                          <button onClick={() => importCompany(c)} className="btn-primary text-[9px] py-0.5 px-1.5"><Plus size={9} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          Page {page + 1} of {totalPages.toLocaleString()} · {filtered.length.toLocaleString()} companies
        </p>
        <div className="flex gap-1.5">
          <button onClick={() => setPage(0)} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">First</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30"><ChevronLeft size={11} /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
            if (p >= totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} className="text-[10px] py-1 px-2.5 rounded-md font-medium"
                style={{ background: page === p ? 'var(--accent)' : 'var(--bg-alt)', color: page === p ? '#fff' : 'var(--text-secondary)' }}>
                {p + 1}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30"><ChevronRight size={11} /></button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">Last</button>
        </div>
      </div>
    </div>
  );
}

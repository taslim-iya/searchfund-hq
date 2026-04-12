import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore, emptyCompany } from '@/store/appStore';
import { Building2, Search, Plus, CheckCircle, Download, ChevronLeft, ChevronRight, ExternalLink, Database, Loader2, TrendingUp, MapPin, BarChart3, ArrowUpDown } from 'lucide-react';
import CompanyDetail from '@/components/CompanyDetail';

interface SectorInfo { name: string; slug: string; count: number; sizeKB: number; }
interface Summary { total: number; sectors: SectorInfo[]; generated: string; }
interface Company { n: string; num: string; sic: string; y: string; t: string; r: string; pc: string; ac: string; }

const PAGE_SIZE = 100;
const ACC_MAP: Record<string, string> = { T: 'Total Exemption', M: 'Micro', S: 'Small', A: 'Abbreviated', F: 'Full', G: 'Group', D: 'Dormant', U: 'Unaudited' };

export default function MassSourced() {
  const { companies, addCompany, addActivity } = useAppStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeSector, setActiveSector] = useState<string>('');
  const [sectorData, setSectorData] = useState<Record<string, Company[]>>({});
  const [loadingSector, setLoadingSector] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'location'>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailCompany, setDetailCompany] = useState<{ num: string; name: string } | null>(null);

  useEffect(() => {
    fetch('/data/summary.json').then(r => r.json()).then(setSummary).catch(() => {});
  }, []);

  const loadSector = useCallback(async (slug: string) => {
    if (sectorData[slug]) { setActiveSector(slug); setPage(0); return; }
    setLoadingSector(slug);
    try {
      const data = await fetch(`/data/sectors/${slug}.json`).then(r => r.json());
      setSectorData(prev => ({ ...prev, [slug]: data }));
      setActiveSector(slug);
      setPage(0);
    } catch { }
    setLoadingSector('');
  }, [sectorData]);

  const currentData = activeSector ? (sectorData[activeSector] || []) : [];

  const filtered = useMemo(() => {
    let f = currentData;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(c => c.n.toLowerCase().includes(q) || c.t.toLowerCase().includes(q) || c.pc.toLowerCase().includes(q) || c.num.includes(q));
    }
    if (sortBy === 'name') f = [...f].sort((a, b) => a.n.localeCompare(b.n));
    else if (sortBy === 'age') f = [...f].sort((a, b) => (a.y || '9').localeCompare(b.y || '9'));
    else if (sortBy === 'location') f = [...f].sort((a, b) => (a.t || '').localeCompare(b.t || ''));
    return f;
  }, [currentData, search, sortBy]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const alreadyImported = (num: string) => companies.some(x => x.companiesHouseNumber === num);

  const importCompany = (c: Company) => {
    if (alreadyImported(c.num)) return;
    const sInfo = summary?.sectors.find(s => s.slug === activeSector);
    addCompany(emptyCompany({
      name: c.n, companiesHouseNumber: c.num, sector: sInfo?.name || '', location: c.t,
      postcode: c.pc, incorporatedDate: `${c.y}-01-01`, source: 'companies-house', stage: 'imported',
    }));
    addActivity({ id: crypto.randomUUID(), action: `Imported ${c.n}`, detail: `CH: ${c.num}`, timestamp: new Date().toISOString(), type: 'success' });
  };

  const importPage = () => pageData.filter(c => !alreadyImported(c.num)).forEach(importCompany);

  const exportCSV = () => {
    const sName = summary?.sectors.find(s => s.slug === activeSector)?.name || 'all';
    const headers = 'Company Name,Company Number,SIC Code,Year Inc,Town,County,Postcode,Accounts Type,Companies House URL\n';
    const rows = filtered.map(c =>
      `"${c.n}","${c.num}","${c.sic}","${c.y}","${c.t}","${c.r}","${c.pc}","${ACC_MAP[c.ac] || c.ac}","https://find-and-update.company-information.service.gov.uk/company/${c.num}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `searchfund-${sName.replace(/\s/g, '-')}-${filtered.length}.csv`; a.click();
  };

  const getAge = (y: string) => y ? 2026 - parseInt(y) : 0;

  if (!summary) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Database size={18} style={{ color: 'var(--accent)' }} /> Company Database
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {summary.total.toLocaleString()} UK SMEs from Companies House · {summary.sectors.length} sectors · Updated {summary.generated}
          </p>
        </div>
        {activeSector && (
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-secondary text-[11px]"><Download size={11} /> Export CSV ({filtered.length.toLocaleString()})</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <TrendingUp size={14} className="mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-2xl font-bold mono">{summary.total.toLocaleString()}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total Companies</p>
        </div>
        <div className="card p-4">
          <BarChart3 size={14} className="mb-1" style={{ color: '#10b981' }} />
          <p className="text-2xl font-bold mono">{summary.sectors.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Sectors Covered</p>
        </div>
        <div className="card p-4">
          <MapPin size={14} className="mb-1" style={{ color: '#f59e0b' }} />
          <p className="text-2xl font-bold mono">8–31yr</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Company Age Range</p>
        </div>
        <div className="card p-4">
          <Building2 size={14} className="mb-1" style={{ color: '#8b5cf6' }} />
          <p className="text-2xl font-bold mono" style={{ color: 'var(--accent)' }}>{companies.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>In Your Pipeline</p>
        </div>
      </div>

      {/* Sector Grid */}
      <div className="mb-5">
        <h3 className="text-[12px] font-semibold mb-2">Select a Sector to Browse</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {summary.sectors.map(s => (
            <button key={s.slug} onClick={() => loadSector(s.slug)}
              className="card p-3 text-left transition-all"
              style={{
                borderColor: activeSector === s.slug ? 'var(--accent)' : undefined,
                boxShadow: activeSector === s.slug ? '0 0 0 1px var(--accent)' : undefined,
              }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold leading-tight">{s.name}</p>
                {loadingSector === s.slug && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />}
              </div>
              <p className="text-[18px] font-bold mono">{s.count.toLocaleString()}</p>
              <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{s.sizeKB < 1024 ? `${s.sizeKB}KB` : `${(s.sizeKB / 1024).toFixed(1)}MB`}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Company Table */}
      {activeSector && currentData.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="input pl-8 text-[12px]" placeholder="Search name, town, postcode, CH number..." />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input w-auto text-[12px]">
              <option value="name">Sort: Name</option>
              <option value="age">Sort: Oldest</option>
              <option value="location">Sort: Location</option>
            </select>
          </div>

          <div className="card overflow-hidden mb-3">
            <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-alt)' }}>
              <p className="text-[11px] font-semibold">{summary.sectors.find(s => s.slug === activeSector)?.name}</p>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>· {filtered.length.toLocaleString()} companies</span>
              <div className="ml-auto flex gap-2">
                <button onClick={importPage} className="text-[10px] font-medium" style={{ color: '#10b981' }}>
                  Import page ({pageData.filter(c => !alreadyImported(c.num)).length})
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Company</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Location</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Est.</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Age</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Accts</th>
                    <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(c => {
                    const age = getAge(c.y);
                    return (
                      <tr key={c.num} onClick={() => setDetailCompany({ num: c.num, name: c.n })} className="cursor-pointer hover:bg-[var(--bg-alt)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-[12px] leading-tight">{c.n}</p>
                          <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.num}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-[11px]">{c.t || '—'}</p>
                          <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.pc}</p>
                        </td>
                        <td className="px-3 py-2 mono text-[11px]">{c.y}</td>
                        <td className="px-3 py-2">
                          <span className="mono text-[11px]" style={{ color: age >= 15 ? '#10b981' : age >= 8 ? '#f59e0b' : 'var(--text-tertiary)' }}>
                            {age}yr
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="badge text-[8px]">{ACC_MAP[c.ac] || c.ac || '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a href={`https://find-and-update.company-information.service.gov.uk/company/${c.num}`} target="_blank"
                              className="btn-secondary text-[9px] py-0.5 px-1.5"><ExternalLink size={9} /></a>
                            {alreadyImported(c.num) ? (
                              <span className="text-[9px]" style={{ color: '#10b981' }}><CheckCircle size={10} /></span>
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
              Page {page + 1} of {totalPages.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(0)} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">First</button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30"><ChevronLeft size={11} /></button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(totalPages - 7, page - 3)) + i;
                if (p >= totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className="text-[10px] py-1 px-2 rounded-md font-medium"
                    style={{ background: page === p ? 'var(--accent)' : 'transparent', color: page === p ? '#fff' : 'var(--text-secondary)' }}>
                    {p + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30"><ChevronRight size={11} /></button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">Last</button>
            </div>
          </div>
        </>
      )}

      {/* Company detail panel */}
      {detailCompany && (
        <CompanyDetail
          companyNumber={detailCompany.num}
          companyName={detailCompany.name}
          onClose={() => setDetailCompany(null)}
        />
      )}
    </div>
  );
}

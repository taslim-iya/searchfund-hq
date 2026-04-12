import { useState, useMemo } from 'react';
import { useAppStore, type Company, type CompanyStage } from '@/store/appStore';
import CompanyDetail from '@/components/CompanyDetail';
import { Filter, Search, Download, Save, Trash2, Plus, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';

interface QualFilter {
  id: string;
  name: string;
  minAge?: number;
  maxAge?: number;
  accountsTypes?: string[];
  stages?: CompanyStage[];
  sectors?: string[];
  locations?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  noInsolvency?: boolean;
  noCharges?: boolean;
  noOverdue?: boolean;
  keywords?: string;
}

const DEFAULT_FILTERS: QualFilter[] = [
  { id: 'sweet-spot', name: '🎯 Sweet Spot (10-25yr, small accounts, no red flags)', minAge: 10, maxAge: 25, accountsTypes: ['total-exemption-full', 'total-exemption-small', 'small'], noInsolvency: true, noCharges: true },
  { id: 'micro-targets', name: '🔍 Micro Targets (<£632K)', accountsTypes: ['micro-entity'], minAge: 8, noInsolvency: true },
  { id: 'has-contact', name: '📧 Has Contact Info', hasEmail: true },
  { id: 'enriched-ready', name: '✅ Enriched & Ready', stages: ['enriched', 'outreach-ready'] },
  { id: 'flagged', name: '⚠️ Red Flags (insolvency/charges)', noInsolvency: false },
];

export default function Qualify() {
  const { companies } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [savedFilters, setSavedFilters] = useState<QualFilter[]>(() => {
    const s = localStorage.getItem('sf-qual-filters');
    return s ? JSON.parse(s) : DEFAULT_FILTERS;
  });
  const [showCustom, setShowCustom] = useState(false);
  const [detail, setDetail] = useState<{ num: string; name: string } | null>(null);

  // Custom filter state
  const [custom, setCustom] = useState<QualFilter>({ id: '', name: '', minAge: undefined, maxAge: undefined, keywords: '' });

  const saveFilters = (f: QualFilter[]) => { setSavedFilters(f); localStorage.setItem('sf-qual-filters', JSON.stringify(f)); };

  const getAge = (c: Company) => {
    if (!c.incorporatedDate) return 0;
    return new Date().getFullYear() - new Date(c.incorporatedDate).getFullYear();
  };

  const matchesFilter = (c: Company, f: QualFilter) => {
    const age = getAge(c);
    if (f.minAge && age < f.minAge) return false;
    if (f.maxAge && age > f.maxAge) return false;
    if (f.hasEmail && !c.ownerEmail) return false;
    if (f.hasPhone && !c.ownerPhone) return false;
    if (f.hasWebsite && !c.website) return false;
    if (f.stages?.length && !f.stages.includes(c.stage)) return false;
    if (f.keywords) {
      const q = f.keywords.toLowerCase();
      const text = `${c.name} ${c.sector} ${c.description} ${c.notes} ${c.location} ${c.report}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    let f = companies;
    // Keyword search across all fields
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(c => {
        const text = `${c.name} ${c.sector} ${c.subsector} ${c.location} ${c.postcode} ${c.ownerName} ${c.ownerEmail} ${c.companiesHouseNumber} ${c.description} ${c.notes} ${c.report} ${c.tags.join(' ')} ${c.enrichmentData.websiteSummary}`.toLowerCase();
        return text.includes(q);
      });
    }
    // Apply active filter
    if (activeFilter) {
      const filter = savedFilters.find(sf => sf.id === activeFilter);
      if (filter) f = f.filter(c => matchesFilter(c, filter));
    }
    return f;
  }, [companies, search, activeFilter, savedFilters]);

  const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))];
  const locations = [...new Set(companies.map(c => c.location).filter(Boolean))];

  const addCustomFilter = () => {
    if (!custom.name) return;
    const newFilter = { ...custom, id: `custom-${Date.now()}` };
    saveFilters([...savedFilters, newFilter]);
    setCustom({ id: '', name: '', minAge: undefined, maxAge: undefined, keywords: '' });
    setShowCustom(false);
  };

  const exportCSV = () => {
    const headers = 'Name,CH Number,Sector,Location,Owner,Email,Phone,Revenue,Stage,Website,Age\n';
    const rows = filtered.map(c => `"${c.name}","${c.companiesHouseNumber}","${c.sector}","${c.location}","${c.ownerName}","${c.ownerEmail}","${c.ownerPhone}","${c.revenue}","${c.stage}","${c.website}","${getAge(c)}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qualified-companies-${filtered.length}.csv`; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Filter size={18} style={{ color: 'var(--accent)' }} /> Qualification
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {companies.length} companies in pipeline · {filtered.length} matching
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-[11px]"><Download size={11} /> Export CSV</button>
          <button onClick={() => setShowCustom(!showCustom)} className="btn-primary text-[11px]"><Plus size={11} /> Custom Filter</button>
        </div>
      </div>

      {/* Global keyword search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-[12px]"
          placeholder="Search everything — name, sector, location, owner, notes, enrichment data, keywords..." />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setActiveFilter('')} className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
          style={{ background: !activeFilter ? 'var(--accent)' : 'var(--bg-alt)', color: !activeFilter ? '#fff' : 'var(--text-secondary)' }}>
          All ({companies.length})
        </button>
        {savedFilters.map(f => {
          const count = companies.filter(c => matchesFilter(c, f)).length;
          return (
            <div key={f.id} className="flex items-center gap-0">
              <button onClick={() => setActiveFilter(activeFilter === f.id ? '' : f.id)}
                className="px-3 py-1.5 rounded-l-lg text-[11px] font-medium"
                style={{ background: activeFilter === f.id ? 'var(--accent)' : 'var(--bg-alt)', color: activeFilter === f.id ? '#fff' : 'var(--text-secondary)' }}>
                {f.name} ({count})
              </button>
              {f.id.startsWith('custom-') && (
                <button onClick={() => saveFilters(savedFilters.filter(sf => sf.id !== f.id))}
                  className="px-1.5 py-1.5 rounded-r-lg text-[11px]" style={{ background: 'var(--bg-alt)' }}>
                  <Trash2 size={10} style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom filter builder */}
      {showCustom && (
        <div className="card p-4 mb-4">
          <p className="text-[12px] font-semibold mb-2">Build Custom Filter</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} className="input text-[11px] col-span-2" placeholder="Filter name..." />
            <input type="number" value={custom.minAge ?? ''} onChange={e => setCustom({ ...custom, minAge: e.target.value ? parseInt(e.target.value) : undefined })} className="input text-[11px]" placeholder="Min age (yr)" />
            <input type="number" value={custom.maxAge ?? ''} onChange={e => setCustom({ ...custom, maxAge: e.target.value ? parseInt(e.target.value) : undefined })} className="input text-[11px]" placeholder="Max age (yr)" />
            <input value={custom.keywords ?? ''} onChange={e => setCustom({ ...custom, keywords: e.target.value })} className="input text-[11px] col-span-2" placeholder="Keywords to match in name, sector, notes, reports..." />
            <div className="flex items-center gap-3 col-span-2">
              <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={custom.hasEmail} onChange={e => setCustom({ ...custom, hasEmail: e.target.checked })} /> Has email</label>
              <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={custom.hasPhone} onChange={e => setCustom({ ...custom, hasPhone: e.target.checked })} /> Has phone</label>
              <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={custom.noInsolvency} onChange={e => setCustom({ ...custom, noInsolvency: e.target.checked })} /> No insolvency</label>
            </div>
          </div>
          <button onClick={addCustomFilter} className="btn-primary text-[11px]"><Save size={11} /> Save Filter</button>
        </div>
      )}

      {/* Results table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-alt)' }}>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Company</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Owner</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Contact</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Accounts</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Age</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Stage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map(c => {
              const age = getAge(c);
              return (
                <tr key={c.id} onClick={() => c.companiesHouseNumber ? setDetail({ num: c.companiesHouseNumber, name: c.name }) : null}
                  className="hover:bg-[var(--bg-alt)] cursor-pointer" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.sector} · {c.location}</p>
                  </td>
                  <td className="px-3 py-2 text-[11px]">{c.ownerName || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {c.ownerEmail && <CheckCircle size={10} style={{ color: '#10b981' }} />}
                      {c.ownerPhone && <CheckCircle size={10} style={{ color: '#3b82f6' }} />}
                      {!c.ownerEmail && !c.ownerPhone && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className="badge text-[8px]">{c.revenue || c.enrichmentData.financials || '—'}</span></td>
                  <td className="px-3 py-2 mono text-[11px]" style={{ color: age >= 15 ? '#10b981' : age >= 8 ? '#f59e0b' : 'var(--text-tertiary)' }}>{age || '—'}yr</td>
                  <td className="px-3 py-2"><span className="badge text-[9px]">{c.stage}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 200 && <p className="p-3 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Showing 200 of {filtered.length} — use filters to narrow down</p>}
      </div>

      {detail && <CompanyDetail companyNumber={detail.num} companyName={detail.name} onClose={() => setDetail(null)} />}
    </div>
  );
}

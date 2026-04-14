import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore, emptyCompany } from '@/store/appStore';
import { Search, Sparkles, Filter, X, ChevronDown, ChevronUp, Download, Plus, CheckCircle, ExternalLink, Loader2, Building2, MapPin, Calendar, BarChart3, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import CompanyDetail from '@/components/CompanyDetail';

interface SectorInfo { name: string; slug: string; count: number; sizeKB: number; }
interface Summary { total: number; sectors: SectorInfo[]; generated: string; }
interface Company { n: string; num: string; sic: string; y: string; t: string; r: string; pc: string; ac: string; }
interface SearchFilters {
  query: string;
  sectors: string[];
  minAge: number;
  maxAge: number;
  locations: string[];
  postcodePrefix: string;
  accountsTypes: string[];
  sicCodes: string[];
  sortBy: 'relevance' | 'name' | 'age_desc' | 'age_asc' | 'location';
}

const ACC_MAP: Record<string, string> = { T: 'Total Exemption', M: 'Micro', S: 'Small', A: 'Abbreviated', F: 'Full', G: 'Group', D: 'Dormant', U: 'Unaudited' };
const PAGE_SIZE = 50;
const YEAR = new Date().getFullYear();

const DEFAULT_FILTERS: SearchFilters = {
  query: '', sectors: [], minAge: 0, maxAge: 50, locations: [], postcodePrefix: '',
  accountsTypes: [], sicCodes: [], sortBy: 'relevance',
};

export default function AISearch() {
  const { companies, addCompany, addActivity, config } = useAppStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allData, setAllData] = useState<Record<string, Company[]>>({});
  const [loadingData, setLoadingData] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [detailCompany, setDetailCompany] = useState<{ num: string; name: string } | null>(null);
  const [totalSearched, setTotalSearched] = useState(0);

  useEffect(() => {
    fetch('/data/summary.json').then(r => r.json()).then(setSummary).catch(() => {});
  }, []);

  // Load sector data on demand
  const loadSectors = useCallback(async (slugs: string[]) => {
    const toLoad = slugs.filter(s => !allData[s] && !loadingData.has(s));
    if (toLoad.length === 0) return;
    setLoadingData(prev => new Set([...prev, ...toLoad]));
    const results = await Promise.all(
      toLoad.map(s => fetch(`/data/sectors/${s}.json`).then(r => r.json()).then(data => ({ slug: s, data })).catch(() => ({ slug: s, data: [] })))
    );
    setAllData(prev => {
      const next = { ...prev };
      results.forEach(r => { next[r.slug] = r.data; });
      return next;
    });
    setLoadingData(prev => {
      const next = new Set(prev);
      toLoad.forEach(s => next.delete(s));
      return next;
    });
  }, [allData, loadingData]);

  // AI search — parse natural language into filters
  const aiSearch = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiSuggestion('');

    try {
      const sectorNames = summary?.sectors.map(s => s.name).join(', ') || '';
      const prompt = `You are a UK company search assistant. Parse this search query into structured filters.

Available sectors: ${sectorNames}

User query: "${aiPrompt}"

Return ONLY valid JSON (no markdown):
{
  "sectors": ["slugified-sector-names that match"],
  "minAge": number (years, 0 if not specified),
  "maxAge": number (years, 50 if not specified),
  "locations": ["town/city names mentioned"],
  "postcodePrefix": "postcode area like 'M' for Manchester, 'B' for Birmingham, '' if not specified",
  "accountsTypes": ["M" for micro, "S" for small, "F" for full, etc - empty if not specified],
  "query": "any remaining keyword search terms",
  "explanation": "one sentence explaining what you're searching for"
}

Sector slugs use format like "43-specialist-construction", "47-retail-trade", "62-it-software".
Age means years since incorporation (2026 - year).
If user says "manufacturing" match sectors with manufacturing/construction. If "tech" match IT/software sectors.
If user says "Midlands" set locations to ["BIRMINGHAM","COVENTRY","WOLVERHAMPTON","NOTTINGHAM","DERBY","LEICESTER","STOKE-ON-TRENT"].
If user says "London" set postcodePrefix to common London prefixes or locations to ["LONDON"].
If user says "North" set locations to northern cities.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const parsed = JSON.parse(jsonMatch[0]);

      // Map parsed sectors to actual slugs
      const matchedSectors = (parsed.sectors || []).map((s: string) => {
        const exact = summary?.sectors.find(sec => sec.slug === s);
        if (exact) return exact.slug;
        const fuzzy = summary?.sectors.find(sec => sec.slug.includes(s) || sec.name.toLowerCase().includes(s.toLowerCase()));
        return fuzzy?.slug || '';
      }).filter(Boolean);

      const newFilters: SearchFilters = {
        query: parsed.query || '',
        sectors: matchedSectors,
        minAge: parsed.minAge || 0,
        maxAge: parsed.maxAge || 50,
        locations: (parsed.locations || []).map((l: string) => l.toUpperCase()),
        postcodePrefix: (parsed.postcodePrefix || '').toUpperCase(),
        accountsTypes: parsed.accountsTypes || [],
        sicCodes: [],
        sortBy: 'relevance',
      };

      setFilters(newFilters);
      setAiSuggestion(parsed.explanation || '');
      setPage(0);

      // Load the matching sectors
      if (matchedSectors.length > 0) {
        await loadSectors(matchedSectors);
      } else if (summary) {
        // If no specific sectors, load top 10 by size
        await loadSectors(summary.sectors.slice(0, 10).map(s => s.slug));
      }
    } catch (e) {
      setAiSuggestion('AI parsing failed — try adding filters manually or simplify your query.');
    }
    setAiLoading(false);
  };

  // Apply filters to loaded data
  const results = useMemo(() => {
    const targetSlugs = filters.sectors.length > 0 ? filters.sectors : Object.keys(allData);
    let all: (Company & { _sector: string })[] = [];

    targetSlugs.forEach(slug => {
      const data = allData[slug];
      if (data) {
        data.forEach(c => all.push({ ...c, _sector: slug }));
      }
    });

    setTotalSearched(all.length);

    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      all = all.filter(c => c.n.toLowerCase().includes(q) || c.t.toLowerCase().includes(q) || c.pc.toLowerCase().includes(q) || c.num.includes(q) || c.sic.includes(q));
    }

    // Age filter
    if (filters.minAge > 0 || filters.maxAge < 50) {
      all = all.filter(c => {
        const age = c.y ? YEAR - parseInt(c.y) : 0;
        return age >= filters.minAge && age <= filters.maxAge;
      });
    }

    // Location filter
    if (filters.locations.length > 0) {
      all = all.filter(c => filters.locations.some(loc => c.t.toUpperCase().includes(loc)));
    }

    // Postcode prefix
    if (filters.postcodePrefix) {
      all = all.filter(c => c.pc.toUpperCase().startsWith(filters.postcodePrefix));
    }

    // Accounts type
    if (filters.accountsTypes.length > 0) {
      all = all.filter(c => filters.accountsTypes.includes(c.ac));
    }

    // Sort
    switch (filters.sortBy) {
      case 'name': all.sort((a, b) => a.n.localeCompare(b.n)); break;
      case 'age_desc': all.sort((a, b) => (parseInt(a.y) || 9999) - (parseInt(b.y) || 9999)); break;
      case 'age_asc': all.sort((a, b) => (parseInt(b.y) || 0) - (parseInt(a.y) || 0)); break;
      case 'location': all.sort((a, b) => a.t.localeCompare(b.t)); break;
    }

    return all;
  }, [allData, filters]);

  const pageData = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const isImported = (num: string) => companies.some(x => x.companiesHouseNumber === num);
  const isLoading = loadingData.size > 0;

  const importCompany = (c: Company & { _sector: string }) => {
    if (isImported(c.num)) return;
    const sInfo = summary?.sectors.find(s => s.slug === c._sector);
    addCompany(emptyCompany({
      name: c.n, companiesHouseNumber: c.num, sector: sInfo?.name || '', location: c.t,
      postcode: c.pc, incorporatedDate: `${c.y}-01-01`, source: 'companies-house', stage: 'imported',
    }));
    addActivity({ id: crypto.randomUUID(), action: `Imported ${c.n}`, detail: `CH: ${c.num}`, timestamp: new Date().toISOString(), type: 'success' });
  };

  const exportCSV = () => {
    const headers = 'Company Name,Company Number,SIC Code,Year Inc,Town,County,Postcode,Accounts Type\n';
    const rows = results.slice(0, 10000).map(c =>
      `"${c.n}","${c.num}","${c.sic}","${c.y}","${c.t}","${c.r}","${c.pc}","${ACC_MAP[c.ac] || c.ac}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `search-results-${results.length}.csv`; a.click();
  };

  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setAiSuggestion(''); setPage(0); };

  const activeFilterCount = [
    filters.sectors.length > 0, filters.minAge > 0, filters.maxAge < 50,
    filters.locations.length > 0, filters.postcodePrefix, filters.accountsTypes.length > 0, filters.query,
  ].filter(Boolean).length;

  if (!summary) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles size={18} style={{ color: 'var(--accent)' }} /> AI Company Search
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Search {summary.total.toLocaleString()} companies with natural language or advanced filters
        </p>
      </div>

      {/* AI Search Bar */}
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent)' }} />
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aiSearch()}
              placeholder='Try: "Manufacturing companies in Birmingham over 15 years old" or "Small tech firms in London"'
              className="input pl-9 pr-4 text-[13px] w-full"
              style={{ height: 44 }}
            />
          </div>
          <button onClick={aiSearch} disabled={aiLoading || !aiPrompt.trim()}
            className="btn-primary text-[12px] px-5 flex items-center gap-2 disabled:opacity-50"
            style={{ height: 44 }}>
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary text-[12px] px-3 flex items-center gap-1.5 relative"
            style={{ height: 44 }}>
            <SlidersHorizontal size={14} /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--accent)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* AI suggestion */}
        {aiSuggestion && (
          <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--accent)08', border: '1px solid var(--accent)20' }}>
            <Sparkles size={12} style={{ color: 'var(--accent)' }} />
            <p className="text-[11px] flex-1" style={{ color: 'var(--accent)' }}>{aiSuggestion}</p>
            <button onClick={clearFilters}><X size={12} style={{ color: 'var(--text-tertiary)' }} /></button>
          </div>
        )}

        {/* Quick search suggestions */}
        {!aiPrompt && results.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              'Manufacturing companies in the Midlands, 15+ years old',
              'Small tech firms in London',
              'Construction companies in Manchester',
              'Retail businesses in Leeds over 10 years',
              'Healthcare companies with full accounts',
              'Engineering firms in the North West',
            ].map(s => (
              <button key={s} onClick={() => { setAiPrompt(s); }} className="text-[10px] px-2.5 py-1.5 rounded-full font-medium transition-colors"
                style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold">Advanced Filters</h3>
            <button onClick={clearFilters} className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Clear all</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sectors */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Sectors</label>
              <select multiple value={filters.sectors} onChange={e => {
                const selected = Array.from(e.target.selectedOptions, o => o.value);
                setFilters(f => ({ ...f, sectors: selected }));
              }} className="input text-[11px] h-28 w-full">
                {summary.sectors.map(s => <option key={s.slug} value={s.slug}>{s.name} ({s.count.toLocaleString()})</option>)}
              </select>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Ctrl+click to select multiple</p>
            </div>

            {/* Age range */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Company Age (years)</label>
              <div className="flex gap-2">
                <input type="number" value={filters.minAge} onChange={e => setFilters(f => ({ ...f, minAge: Number(e.target.value) }))}
                  className="input text-[11px] w-full" placeholder="Min" min={0} />
                <input type="number" value={filters.maxAge} onChange={e => setFilters(f => ({ ...f, maxAge: Number(e.target.value) }))}
                  className="input text-[11px] w-full" placeholder="Max" min={0} />
              </div>

              <label className="text-[10px] font-semibold block mb-1 mt-3" style={{ color: 'var(--text-tertiary)' }}>Accounts Type</label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(ACC_MAP).map(([k, v]) => (
                  <button key={k} onClick={() => setFilters(f => ({
                    ...f, accountsTypes: f.accountsTypes.includes(k) ? f.accountsTypes.filter(a => a !== k) : [...f.accountsTypes, k]
                  }))} className="text-[9px] px-2 py-1 rounded font-medium" style={{
                    background: filters.accountsTypes.includes(k) ? 'var(--accent)' : 'var(--bg-alt)',
                    color: filters.accountsTypes.includes(k) ? 'white' : 'var(--text-secondary)',
                  }}>{v}</button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Location (town/city)</label>
              <input value={filters.locations.join(', ')} onChange={e => setFilters(f => ({
                ...f, locations: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
              }))} className="input text-[11px] w-full" placeholder="e.g. LONDON, MANCHESTER" />

              <label className="text-[10px] font-semibold block mb-1 mt-3" style={{ color: 'var(--text-tertiary)' }}>Postcode Area</label>
              <input value={filters.postcodePrefix} onChange={e => setFilters(f => ({ ...f, postcodePrefix: e.target.value.toUpperCase() }))}
                className="input text-[11px] w-full" placeholder="e.g. M, B, SW, EC" />
            </div>

            {/* Keyword + sort */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Keyword Search</label>
              <input value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
                className="input text-[11px] w-full" placeholder="Company name, SIC code..." />

              <label className="text-[10px] font-semibold block mb-1 mt-3" style={{ color: 'var(--text-tertiary)' }}>Sort By</label>
              <select value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as any }))} className="input text-[11px] w-full">
                <option value="relevance">Relevance</option>
                <option value="name">Name A-Z</option>
                <option value="age_desc">Oldest First</option>
                <option value="age_asc">Newest First</option>
                <option value="location">Location A-Z</option>
              </select>

              <button onClick={() => {
                if (filters.sectors.length > 0) loadSectors(filters.sectors);
                else if (summary) loadSectors(summary.sectors.slice(0, 10).map(s => s.slug));
                setPage(0);
              }} className="btn-primary text-[11px] w-full mt-3 py-2">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {(results.length > 0 || isLoading) && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-semibold">
                {isLoading ? 'Loading...' : `${results.length.toLocaleString()} results`}
                {totalSearched > 0 && !isLoading && <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}> from {totalSearched.toLocaleString()} searched</span>}
              </p>
              {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />}
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="btn-secondary text-[10px]" disabled={results.length === 0}>
                <Download size={10} /> CSV ({Math.min(results.length, 10000).toLocaleString()})
              </button>
            </div>
          </div>

          {/* Results table */}
          <div className="card overflow-hidden mb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Company</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Location</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Est.</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Age</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Accounts</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>SIC</th>
                    <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(c => {
                    const age = c.y ? YEAR - parseInt(c.y) : 0;
                    return (
                      <tr key={c.num} onClick={() => setDetailCompany({ num: c.num, name: c.n })}
                        className="cursor-pointer hover:bg-[var(--bg-alt)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-[12px] leading-tight">{c.n}</p>
                          <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.num}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-[11px]">{c.t || '—'}{c.r ? `, ${c.r}` : ''}</p>
                          <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{c.pc}</p>
                        </td>
                        <td className="px-3 py-2 mono text-[11px]">{c.y}</td>
                        <td className="px-3 py-2">
                          <span className="mono text-[11px] font-semibold" style={{ color: age >= 15 ? '#10b981' : age >= 8 ? '#f59e0b' : 'var(--text-tertiary)' }}>
                            {age}yr
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="badge text-[9px]">{ACC_MAP[c.ac] || c.ac || '—'}</span>
                        </td>
                        <td className="px-3 py-2 mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.sic}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            {isImported(c.num) ? (
                              <span style={{ color: '#10b981' }}><CheckCircle size={14} /></span>
                            ) : (
                              <button onClick={() => importCompany(c)} className="btn-primary text-[9px] py-0.5 px-2"><Plus size={9} /> Import</button>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Page {page + 1} of {totalPages.toLocaleString()} · Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, results.length)} of {results.length.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">First</button>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">Next</button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-30">Last</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {results.length === 0 && !isLoading && Object.keys(allData).length > 0 && (
        <div className="text-center py-12">
          <Search size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>No companies match your filters</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Try broadening your search criteria</p>
        </div>
      )}

      {detailCompany && (
        <CompanyDetail companyNumber={detailCompany.num} companyName={detailCompany.name} onClose={() => setDetailCompany(null)} />
      )}
    </div>
  );
}

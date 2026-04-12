import { useState } from 'react';
import { sourcedCompanies, sectorStats, type SourcedCompany } from '@/data/sourced-companies';
import { useAppStore, emptyCompany } from '@/store/appStore';
import { Building2, ExternalLink, Globe, Search, Star, ArrowUpRight, Plus, CheckCircle, Filter, BarChart3, MapPin, Calendar, User, FileText, ChevronRight, X } from 'lucide-react';

const ATTRACT_COLORS = { high: '#3fcf8e', medium: '#f0b429', low: '#94a3b8' };

export default function Sourced() {
  const { companies, addCompany, addActivity } = useAppStore();
  const [search, setSearch] = useState('');
  const [sectorF, setSectorF] = useState('');
  const [attractF, setAttractF] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [detail, setDetail] = useState<SourcedCompany | null>(null);

  const sectors = [...new Set(sourcedCompanies.map(c => c.sectorCategory))];
  const filtered = sourcedCompanies.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.sector.toLowerCase().includes(search.toLowerCase()) && !c.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (sectorF && c.sectorCategory !== sectorF) return false;
    if (attractF !== 'all' && c.attractiveness !== attractF) return false;
    return true;
  });

  const importToPipeline = (c: SourcedCompany) => {
    if (companies.some(x => x.companiesHouseNumber === c.number)) return;
    addCompany(emptyCompany({
      name: c.name, companiesHouseNumber: c.number, sector: c.sector, location: c.location,
      postcode: c.postcode, registeredAddress: c.address, website: c.website,
      incorporatedDate: c.created, ownerName: c.director, source: 'companies-house',
      notes: c.notes, stage: 'imported',
    }));
    addActivity({ id: crypto.randomUUID(), action: `Imported ${c.name} to pipeline`, detail: `CH: ${c.number}`, timestamp: new Date().toISOString(), type: 'success' });
  };

  const importAll = () => {
    filtered.forEach(c => {
      if (!companies.some(x => x.companiesHouseNumber === c.number)) importToPipeline(c);
    });
  };

  const alreadyImported = (num: string) => companies.some(x => x.companiesHouseNumber === num);
  const highCount = sourcedCompanies.filter(c => c.attractiveness === 'high').length;
  const avgAge = Math.round(sourcedCompanies.reduce((sum, c) => sum + c.age, 0) / sourcedCompanies.length);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sourced Companies</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{sourcedCompanies.length} UK SMEs sourced from Companies House · {filtered.length} shown</p>
        </div>
        <button onClick={importAll} className="btn-primary text-[12px]"><Plus size={12} /> Import All to Pipeline ({filtered.filter(c => !alreadyImported(c.number)).length})</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4"><p className="text-2xl font-bold mono">{sourcedCompanies.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Companies Sourced</p></div>
        <div className="card p-4"><p className="text-2xl font-bold mono" style={{ color: '#3fcf8e' }}>{highCount}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>High Attractiveness</p></div>
        <div className="card p-4"><p className="text-2xl font-bold mono">{avgAge}yr</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Average Age</p></div>
        <div className="card p-4"><p className="text-2xl font-bold mono">{sectors.length}</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Sector Categories</p></div>
      </div>

      {/* Sector breakdown */}
      <div className="card p-4 mb-5">
        <h3 className="text-[12px] font-semibold mb-2">Sector Breakdown</h3>
        <div className="flex gap-2 overflow-x-auto">
          {sectorStats.map(s => (
            <div key={s.category} className="flex-shrink-0 p-2.5 rounded-lg min-w-[140px]" style={{ background: 'var(--bg-alt)' }}>
              <p className="text-[18px] font-bold mono">{s.count}</p>
              <p className="text-[11px] font-medium">{s.category}</p>
              <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{s.examples}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-[12px]" placeholder="Search name, sector, location..." />
        </div>
        <select value={sectorF} onChange={e => setSectorF(e.target.value)} className="input w-auto text-[12px]" style={{ minWidth: 130 }}>
          <option value="">All sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-px p-0.5 rounded-lg" style={{ background: 'var(--border-light)' }}>
          {(['all', 'high', 'medium', 'low'] as const).map(a => (
            <button key={a} onClick={() => setAttractF(a)} className="px-2.5 py-1 rounded-md text-[10px] font-medium capitalize"
              style={{ background: attractF === a ? 'var(--bg)' : 'transparent', color: attractF === a ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {a === 'all' ? 'All' : a} {a !== 'all' ? `(${sourcedCompanies.filter(c => c.attractiveness === a).length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Company list */}
      <div className="space-y-2">
        {filtered.map(c => {
          const imported = alreadyImported(c.number);
          return (
            <div key={c.number} onClick={() => setDetail(c)} className="card p-4 cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${ATTRACT_COLORS[c.attractiveness]}10` }}>
                  <Star size={16} style={{ color: ATTRACT_COLORS[c.attractiveness] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[14px] font-semibold truncate">{c.name}</p>
                    <span className="badge text-[8px]" style={{ background: `${ATTRACT_COLORS[c.attractiveness]}15`, color: ATTRACT_COLORS[c.attractiveness] }}>{c.attractiveness}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {c.sector} · {c.location} · Est. {c.created.split('-')[0]} ({c.age}yr)
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    <User size={9} className="inline mr-0.5" />{c.director} · <FileText size={9} className="inline mr-0.5" />{c.accountsType.replace(/-/g, ' ')} · CH: {c.number}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={c.chUrl} target="_blank" onClick={e => e.stopPropagation()} className="btn-secondary text-[9px] py-1 px-2"><Building2 size={9} /> CH</a>
                  {c.website && <a href={`https://${c.website}`} target="_blank" onClick={e => e.stopPropagation()} className="btn-secondary text-[9px] py-1 px-2"><Globe size={9} /> Web</a>}
                  {imported ? (
                    <span className="badge text-[9px]" style={{ background: '#3fcf8e15', color: '#3fcf8e' }}><CheckCircle size={9} /> In Pipeline</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); importToPipeline(c); }} className="btn-primary text-[9px] py-1 px-2"><Plus size={9} /> Import</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-semibold">{detail.name}</h2>
              <button onClick={() => setDetail(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="badge text-[11px] font-bold" style={{ background: `${ATTRACT_COLORS[detail.attractiveness]}15`, color: ATTRACT_COLORS[detail.attractiveness], padding: '4px 12px' }}>
                  {detail.attractiveness.toUpperCase()} ATTRACTIVENESS
                </span>
                <span className="text-[12px] mono" style={{ color: 'var(--text-tertiary)' }}>CH: {detail.number}</span>
              </div>

              {[
                { icon: Building2, label: 'Sector', value: `${detail.sector} (${detail.sectorCategory})` },
                { icon: MapPin, label: 'Location', value: `${detail.location} ${detail.postcode}` },
                { icon: Calendar, label: 'Incorporated', value: `${detail.created} (${detail.age} years old)` },
                { icon: User, label: 'Director', value: `${detail.director} (since ${detail.directorSince})` },
                { icon: FileText, label: 'Accounts', value: `${detail.accountsType.replace(/-/g, ' ')} — last: ${detail.accountsDate}` },
                { icon: Building2, label: 'Address', value: detail.address },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-2.5 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <row.icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{row.label}</p>
                    <p className="text-[12px]">{row.value}</p>
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>Analysis Notes</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detail.notes}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <a href={detail.chUrl} target="_blank" className="btn-secondary flex-1 justify-center text-[11px]"><Building2 size={12} /> Companies House</a>
                  {detail.website && <a href={`https://${detail.website}`} target="_blank" className="btn-secondary flex-1 justify-center text-[11px]"><Globe size={12} /> Website</a>}
                </div>
                {!alreadyImported(detail.number) ? (
                  <button onClick={() => { importToPipeline(detail); setDetail(null); }} className="btn-primary w-full justify-center text-[12px]"><Plus size={12} /> Import to Pipeline</button>
                ) : (
                  <p className="text-center text-[11px] font-medium" style={{ color: '#3fcf8e' }}><CheckCircle size={12} className="inline mr-1" />Already in your pipeline</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

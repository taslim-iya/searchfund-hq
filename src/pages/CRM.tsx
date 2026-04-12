import { useState, useMemo } from 'react';
import { useAppStore, type Company, type CompanyStage } from '@/store/appStore';
import CompanyDetail from '@/components/CompanyDetail';
import { Search, Filter, Building2, User, Mail, Phone, Globe, ExternalLink, ChevronRight, Plus, ArrowRight, Sparkles, Loader2, Calendar, MessageSquare, Star, Tag, MoreVertical, X } from 'lucide-react';

const CRM_STAGES: { id: CompanyStage; label: string; color: string }[] = [
  { id: 'imported', label: 'Lead', color: '#6b7280' },
  { id: 'researching', label: 'Researching', color: '#3b82f6' },
  { id: 'enriched', label: 'Enriched', color: '#8b5cf6' },
  { id: 'outreach-ready', label: 'Ready', color: '#f59e0b' },
  { id: 'outreach-sent', label: 'Contacted', color: '#f97316' },
  { id: 'replied', label: 'Replied', color: '#10b981' },
  { id: 'meeting', label: 'Meeting', color: '#06b6d4' },
  { id: 'passed', label: 'Passed', color: '#ef4444' },
];

export default function CRM() {
  const { companies, updateCompany, config } = useAppStore();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Company | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [detailCH, setDetailCH] = useState<{ num: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.ownerName.toLowerCase().includes(q));
  }, [companies, search]);

  const byStage = useMemo(() => {
    const map: Record<string, Company[]> = {};
    CRM_STAGES.forEach(s => { map[s.id] = []; });
    filtered.forEach(c => {
      if (map[c.stage]) map[c.stage].push(c);
      else map['imported'].push(c);
    });
    return map;
  }, [filtered]);

  const moveStage = (companyId: string, newStage: CompanyStage) => {
    updateCompany(companyId, { stage: newStage });
  };

  const enrichCompany = async (company: Company) => {
    if (!config.companiesHouseKey) return;
    setEnriching(company.id);
    try {
      const res = await fetch('/api/enrich-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyNumber: company.companiesHouseNumber,
          companyName: company.name,
          website: company.website,
          companiesHouseKey: config.companiesHouseKey,
          openaiKey: config.openaiKey,
          apolloKey: (config as any).apolloKey || '',
        }),
      });
      const data = await res.json();

      // Update company with enrichment data
      const patch: Partial<Company> = { stage: 'enriched', enrichedAt: new Date().toISOString() };

      if (data.officers?.length) {
        const director = data.officers[0];
        patch.ownerName = director.name;
        patch.ownerRole = director.role;
      }
      if (data.ownership?.length) {
        const psc = data.ownership[0];
        if (!patch.ownerName) patch.ownerName = psc.name;
      }
      if (data.website?.emails?.length) {
        patch.ownerEmail = data.website.emails[0];
      }
      if (data.website?.phones?.length) {
        patch.ownerPhone = data.website.phones[0];
      }
      if (data.website?.socialLinks?.linkedin) {
        patch.ownerLinkedin = data.website.socialLinks.linkedin;
      }
      if (data.website?.url) {
        patch.website = data.website.url;
      }
      if (data.apollo?.people?.length) {
        const person = data.apollo.people[0];
        if (person.email) patch.ownerEmail = person.email;
        if (person.phone) patch.ownerPhone = person.phone;
        if (person.linkedin) patch.ownerLinkedin = person.linkedin;
      }
      if (data.apollo?.orgMatch) {
        if (data.apollo.orgMatch.revenue) patch.revenue = data.apollo.orgMatch.revenue;
        if (data.apollo.orgMatch.employees) patch.employees = String(data.apollo.orgMatch.employees);
        if (data.apollo.orgMatch.website) patch.website = data.apollo.orgMatch.website;
      }
      if (data.aiAnalysis) {
        patch.report = JSON.stringify(data.aiAnalysis, null, 2);
        patch.description = data.aiAnalysis.summary || '';
        if (data.aiAnalysis.estimatedRevenue) patch.revenue = data.aiAnalysis.estimatedRevenue;
      }
      if (data.companyHouse) {
        patch.registeredAddress = [
          data.companyHouse.address?.address_line_1,
          data.companyHouse.address?.locality,
          data.companyHouse.address?.postal_code,
        ].filter(Boolean).join(', ');
        if (data.companyHouse.sicCodes?.length) {
          patch.sector = data.companyHouse.sicCodes.join(', ');
        }
      }

      patch.enrichmentData = {
        websiteSummary: data.website?.text?.slice(0, 500) || '',
        recentNews: [],
        keyPeople: data.officers?.map((o: any) => ({ name: o.name, role: o.role, linkedin: '' })) || [],
        competitors: [],
        strengths: data.aiAnalysis?.strengths || [],
        opportunities: [],
        socialPresence: Object.entries(data.website?.socialLinks || {}).map(([platform, url]) => ({ platform, url: url as string })),
        financials: data.aiAnalysis?.estimatedRevenue || data.companyHouse?.accounts?.type || '',
        techStack: [],
      };

      updateCompany(company.id, patch);
    } catch { }
    setEnriching(null);
  };

  const stageColor = (stage: CompanyStage) => CRM_STAGES.find(s => s.id === stage)?.color || '#6b7280';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Deal CRM</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{companies.length} companies in pipeline</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-px p-0.5 rounded-lg" style={{ background: 'var(--border-light)' }}>
            <button onClick={() => setView('board')} className="px-2.5 py-1 rounded-md text-[10px] font-medium"
              style={{ background: view === 'board' ? 'var(--bg)' : 'transparent' }}>Board</button>
            <button onClick={() => setView('list')} className="px-2.5 py-1 rounded-md text-[10px] font-medium"
              style={{ background: view === 'list' ? 'var(--bg)' : 'transparent' }}>List</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-[12px]" placeholder="Search companies, sectors, owners..." />
      </div>

      {/* Pipeline stats */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {CRM_STAGES.map(s => (
          <div key={s.id} className="flex-shrink-0 px-3 py-2 rounded-lg min-w-[90px]" style={{ background: `${s.color}08`, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[18px] font-bold mono">{byStage[s.id]?.length || 0}</p>
            <p className="text-[9px] font-medium" style={{ color: s.color }}>{s.label}</p>
          </div>
        ))}
      </div>

      {view === 'board' ? (
        /* Kanban board */
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {CRM_STAGES.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-[240px]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                <p className="text-[11px] font-semibold">{stage.label}</p>
                <span className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{byStage[stage.id]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {(byStage[stage.id] || []).map(c => (
                  <div key={c.id} className="card p-3 cursor-pointer" onClick={() => setDetail(c)}>
                    <p className="text-[12px] font-semibold leading-tight mb-1">{c.name}</p>
                    {c.ownerName && <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><User size={9} />{c.ownerName}</p>}
                    {c.location && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.location}</p>}
                    {c.revenue && <p className="text-[10px] font-medium" style={{ color: '#10b981' }}>{c.revenue}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      {c.ownerEmail && <Mail size={9} style={{ color: 'var(--text-tertiary)' }} />}
                      {c.ownerPhone && <Phone size={9} style={{ color: 'var(--text-tertiary)' }} />}
                      {c.ownerLinkedin && <Globe size={9} style={{ color: 'var(--text-tertiary)' }} />}
                      {c.companiesHouseNumber && (
                        <span className="text-[8px] mono ml-auto" style={{ color: 'var(--text-tertiary)' }}>{c.companiesHouseNumber}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-alt)' }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Company</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Owner</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Contact</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Stage</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[var(--bg-alt)] cursor-pointer" onClick={() => setDetail(c)} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.location} · {c.sector}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-[11px]">{c.ownerName || '—'}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.ownerRole}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {c.ownerEmail && <a href={`mailto:${c.ownerEmail}`} onClick={e => e.stopPropagation()} className="text-[10px]" style={{ color: 'var(--accent)' }}>{c.ownerEmail}</a>}
                      {!c.ownerEmail && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>No email</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 mono text-[11px]" style={{ color: c.revenue ? '#10b981' : 'var(--text-tertiary)' }}>{c.revenue || '—'}</td>
                  <td className="px-3 py-2">
                    <select value={c.stage} onChange={e => { e.stopPropagation(); moveStage(c.id, e.target.value as CompanyStage); }}
                      onClick={e => e.stopPropagation()} className="text-[10px] px-2 py-0.5 rounded border-0 font-medium"
                      style={{ background: `${stageColor(c.stage)}15`, color: stageColor(c.stage) }}>
                      {CRM_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={e => { e.stopPropagation(); enrichCompany(c); }} disabled={enriching === c.id}
                      className="btn-secondary text-[9px] py-0.5 px-1.5">
                      {enriching === c.id ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />} Enrich
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Company detail side panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-[15px] font-semibold">{detail.name}</h2>
                <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{detail.companiesHouseNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={detail.stage} onChange={e => { moveStage(detail.id, e.target.value as CompanyStage); setDetail({ ...detail, stage: e.target.value as CompanyStage }); }}
                  className="text-[10px] px-2 py-1 rounded font-medium"
                  style={{ background: `${stageColor(detail.stage)}15`, color: stageColor(detail.stage) }}>
                  {CRM_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button onClick={() => enrichCompany(detail)} disabled={enriching === detail.id} className="btn-primary text-[10px] py-1">
                  {enriching === detail.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Enrich
                </button>
                {detail.companiesHouseNumber && (
                  <button onClick={() => setDetailCH({ num: detail.companiesHouseNumber, name: detail.name })} className="btn-secondary text-[10px] py-1">
                    <Building2 size={10} /> CH
                  </button>
                )}
                <button onClick={() => setDetail(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="Owner / Director" value={detail.ownerName} sub={detail.ownerRole} icon={<User size={11} />} />
                <InfoBlock label="Email" value={detail.ownerEmail} link={detail.ownerEmail ? `mailto:${detail.ownerEmail}` : ''} icon={<Mail size={11} />} />
                <InfoBlock label="Phone" value={detail.ownerPhone} link={detail.ownerPhone ? `tel:${detail.ownerPhone}` : ''} icon={<Phone size={11} />} />
                <InfoBlock label="LinkedIn" value={detail.ownerLinkedin ? 'View Profile' : ''} link={detail.ownerLinkedin} icon={<Globe size={11} />} />
                <InfoBlock label="Website" value={detail.website} link={detail.website} icon={<Globe size={11} />} />
                <InfoBlock label="Revenue" value={detail.revenue} icon={<Star size={11} />} />
                <InfoBlock label="Employees" value={detail.employees} icon={<User size={11} />} />
                <InfoBlock label="Location" value={`${detail.location} ${detail.postcode}`} icon={<Building2 size={11} />} />
              </div>

              {/* AI Summary */}
              {detail.description && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>AI Summary</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detail.description}</p>
                </div>
              )}

              {/* Enrichment data */}
              {detail.enrichmentData.strengths.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold mb-1">Strengths</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.enrichmentData.strengths.map((s, i) => (
                      <span key={i} className="badge text-[9px]" style={{ background: '#10b98115', color: '#10b981' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {detail.enrichmentData.keyPeople.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold mb-1">Key People</p>
                  {detail.enrichmentData.keyPeople.map((p, i) => (
                    <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{p.name} — {p.role}</p>
                  ))}
                </div>
              )}

              {/* Full report */}
              {detail.report && (
                <div>
                  <p className="text-[11px] font-semibold mb-1">Full Enrichment Report</p>
                  <pre className="text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap" style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)' }}>
                    {detail.report}
                  </pre>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[11px] font-semibold mb-1">Notes</p>
                <textarea value={detail.notes} onChange={e => { const v = e.target.value; setDetail({ ...detail, notes: v }); updateCompany(detail.id, { notes: v }); }}
                  className="input text-[12px]" rows={3} placeholder="Add your notes about this deal..." />
              </div>
            </div>
          </div>
        </div>
      )}

      {detailCH && <CompanyDetail companyNumber={detailCH.num} companyName={detailCH.name} onClose={() => setDetailCH(null)} />}
    </div>
  );
}

function InfoBlock({ label, value, sub, link, icon }: { label: string; value?: string; sub?: string; link?: string; icon: React.ReactNode }) {
  const content = value || '—';
  return (
    <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
      <div className="flex items-center gap-1 mb-0.5">
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
      {link && value ? (
        <a href={link} target="_blank" className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{content}</a>
      ) : (
        <p className="text-[11px] font-medium" style={{ color: value ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{content}</p>
      )}
      {sub && <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

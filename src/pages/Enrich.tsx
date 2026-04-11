import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { Sparkles, Loader2, CheckCircle, Building2, Search, Globe, Zap } from 'lucide-react';

export default function Enrich() {
  const { companies, updateCompany, addActivity, config } = useAppStore();
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unenriched' | 'enriched'>('all');

  const unenriched = companies.filter(c => c.stage === 'imported' || c.stage === 'researching');
  const enriched = companies.filter(c => c.stage !== 'imported' && c.stage !== 'researching');
  const display = filter === 'unenriched' ? unenriched : filter === 'enriched' ? enriched : companies;

  const enrich = useCallback(async (id: string) => {
    const c = companies.find(x => x.id === id);
    if (!c) return;
    setEnriching(prev => new Set(prev).add(id));
    updateCompany(id, { stage: 'researching' });

    const patch: Record<string, any> = { enrichedAt: new Date().toISOString() };

    // 1. Companies House lookup
    if (config.companiesHouseKey && (c.companiesHouseNumber || c.name)) {
      try {
        let chNum = c.companiesHouseNumber;
        if (!chNum) {
          const searchResp = await fetch('/api/companies-house', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: config.companiesHouseKey, action: 'search', query: c.name }),
          });
          const searchData = await searchResp.json();
          chNum = searchData.items?.[0]?.company_number || '';
          if (chNum) patch.companiesHouseNumber = chNum;
        }
        if (chNum) {
          const [profResp, offResp] = await Promise.all([
            fetch('/api/companies-house', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: config.companiesHouseKey, action: 'profile', companyNumber: chNum }) }),
            fetch('/api/companies-house', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: config.companiesHouseKey, action: 'officers', companyNumber: chNum }) }),
          ]);
          const profile = await profResp.json();
          const officers = await offResp.json();
          if (profile && !profile.error) {
            const addr = profile.registered_office_address || {};
            patch.registeredAddress = [addr.address_line_1, addr.locality, addr.region, addr.postal_code].filter(Boolean).join(', ');
            patch.location = patch.location || [addr.locality, addr.region].filter(Boolean).join(', ') || c.location;
            patch.incorporatedDate = profile.date_of_creation || c.incorporatedDate;
            patch.companyType = profile.type || c.companyType;
            if (profile.sic_codes) patch.sector = patch.sector || profile.sic_codes.join(', ');
          }
          if (officers?.items?.length) {
            const active = officers.items.filter((o: any) => !o.resigned_on);
            const dir = active.find((o: any) => o.officer_role === 'director') || active[0];
            if (dir) { patch.ownerName = dir.name || c.ownerName; patch.ownerRole = dir.officer_role || ''; }
          }
        }
      } catch { /* CH failed */ }
    }

    // 2. AI enrichment — website analysis + report generation
    if (config.openaiKey && c.website) {
      try {
        const resp = await fetch('/api/ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: config.openaiKey,
            systemPrompt: `You are a search fund analyst. Research and analyse this company for potential acquisition. Be concise and actionable.`,
            messages: [{ role: 'user', content: `Analyse this company for a search fund:\n\nName: ${c.name}\nWebsite: ${c.website}\nSector: ${c.sector || 'Unknown'}\nLocation: ${c.location || 'Unknown'}\nOwner: ${c.ownerName || 'Unknown'}\n\nProvide:\n1. Business Summary (2-3 sentences)\n2. Key Strengths (bullet points)\n3. Acquisition Opportunities\n4. Potential Risks\n5. Estimated company profile (employees, revenue range)\n6. Outreach angle — what would make the owner interested in a conversation?` }],
          }),
        });
        const data = await resp.json();
        if (data.content) {
          patch.report = data.content;
          patch.enrichmentData = {
            ...c.enrichmentData,
            websiteSummary: data.content.split('\n').slice(0, 3).join('\n'),
            strengths: data.content.match(/strength|strong|advantage/gi) ? ['AI-identified strengths in report'] : [],
          };
        }
      } catch { /* AI failed */ }
    }

    // 3. Score based on available data
    let score = 0;
    if (patch.companiesHouseNumber || c.companiesHouseNumber) score += 15;
    if (c.ownerName || patch.ownerName) score += 15;
    if (c.ownerEmail) score += 15;
    if (c.website) score += 10;
    if (patch.report || c.report) score += 20;
    if (c.sector) score += 10;
    if (c.location) score += 10;
    if (patch.incorporatedDate || c.incorporatedDate) score += 5;
    patch.score = Math.min(score, 100);
    patch.stage = patch.report ? 'enriched' : (patch.companiesHouseNumber ? 'enriched' : 'researching');

    updateCompany(id, patch);
    addActivity({ id: crypto.randomUUID(), action: `Enriched: ${c.name}`, detail: `Score: ${patch.score}`, timestamp: new Date().toISOString(), type: 'success' });
    setEnriching(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, [companies, config, updateCompany, addActivity]);

  const enrichBatch = async () => {
    setBatchRunning(true);
    for (const c of unenriched.slice(0, 15)) {
      await enrich(c.id);
      await new Promise(r => setTimeout(r, 500));
    }
    setBatchRunning(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Enrich</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {enriched.length} enriched · {unenriched.length} pending
            {!config.companiesHouseKey && !config.openaiKey && ' · Add API keys in Settings'}
          </p>
        </div>
        <button onClick={enrichBatch} disabled={unenriched.length === 0 || batchRunning} className="btn-primary text-[12px]">
          {batchRunning ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          Enrich All ({unenriched.length})
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'unenriched', 'enriched'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-2.5 py-1 rounded-md text-[10px] font-medium capitalize"
            style={{ background: filter === f ? 'var(--accent-light)' : 'var(--bg-alt)', color: filter === f ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {f} ({f === 'all' ? companies.length : f === 'unenriched' ? unenriched.length : enriched.length})
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {display.length === 0 ? (
          <div className="card p-12 text-center">
            <Sparkles size={24} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No companies. Add them in the Pipeline page first.</p>
          </div>
        ) : display.map(c => (
          <div key={c.id} className="card p-3.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: c.enrichedAt ? '#10b98110' : 'var(--bg-alt)' }}>
              {c.enrichedAt ? <CheckCircle size={13} color="#10b981" /> : <Building2 size={13} style={{ color: 'var(--text-tertiary)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{c.name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                {c.sector || 'No sector'}{c.location ? ` · ${c.location}` : ''}{c.ownerName ? ` · ${c.ownerName}` : ''}
                {c.report ? ' · Report ready' : ''}
              </p>
            </div>
            {c.enrichedAt ? (
              <span className="text-[12px] font-bold mono flex-shrink-0" style={{ color: c.score >= 70 ? '#10b981' : c.score >= 40 ? '#f59e0b' : 'var(--text-tertiary)' }}>{c.score}/100</span>
            ) : (
              <button onClick={() => enrich(c.id)} disabled={enriching.has(c.id) || batchRunning} className="btn-secondary text-[10px] py-1 px-2 flex-shrink-0">
                {enriching.has(c.id) ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Enrich
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { FileText, Download, ChevronRight, Building2, Search } from 'lucide-react';

export default function Reports() {
  const { companies } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const withReports = companies.filter(c => c.report);
  const filtered = withReports.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const detail = companies.find(c => c.id === selected);

  const exportReport = (c: typeof companies[0]) => {
    const text = `# ${c.name} — Enrichment Report\n\nGenerated: ${new Date(c.enrichedAt).toLocaleString()}\nScore: ${c.score}/100\n\n## Company Details\n- Sector: ${c.sector}\n- Location: ${c.location}\n- Website: ${c.website}\n- Companies House: ${c.companiesHouseNumber}\n- Incorporated: ${c.incorporatedDate}\n- Revenue: ${c.revenue}\n- Employees: ${c.employees}\n\n## Key Contact\n- Name: ${c.ownerName}\n- Role: ${c.ownerRole}\n- Email: ${c.ownerEmail}\n- Phone: ${c.ownerPhone}\n- LinkedIn: ${c.ownerLinkedin}\n\n## Analysis\n${c.report}\n\n## Outreach\nStatus: ${c.outreachStatus}\n${c.outreachMessage ? `\nMessage:\n${c.outreachMessage}` : ''}`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${c.name.replace(/\s/g, '-').toLowerCase()}-report.md`; a.click();
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Reports</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{withReports.length} enrichment reports available</p>
      </div>

      <div className="flex gap-4 min-h-[400px]">
        {/* List */}
        <div className={`${selected ? 'hidden md:block' : ''} w-full md:w-72 flex-shrink-0 space-y-2`}>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-7 text-[12px]" placeholder="Filter..." />
          </div>
          {filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <FileText size={20} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {withReports.length === 0 ? 'No reports yet. Enrich companies with an OpenAI key to generate reports.' : 'No matches.'}
              </p>
            </div>
          ) : filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)} className="w-full card p-3 text-left flex items-center gap-2.5"
              style={{ borderColor: selected === c.id ? 'var(--accent)' : undefined }}>
              <FileText size={14} style={{ color: selected === c.id ? 'var(--accent)' : 'var(--text-tertiary)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate">{c.name}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{c.sector} · Score: {c.score}</p>
              </div>
              <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>

        {/* Report view */}
        <div className="flex-1 min-w-0">
          {detail ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{detail.name}</h2>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {detail.sector} · {detail.location} · Score: <strong className="mono">{detail.score}/100</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportReport(detail)} className="btn-secondary text-[11px] py-1 px-2"><Download size={11} /> Export</button>
                  <button onClick={() => setSelected(null)} className="btn-secondary text-[11px] py-1 px-2 md:hidden">Back</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[['Website', detail.website], ['CH#', detail.companiesHouseNumber], ['Owner', detail.ownerName], ['Email', detail.ownerEmail], ['Incorporated', detail.incorporatedDate], ['Type', detail.companyType]].map(([l, v]) => (
                  <div key={l} className="p-2 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                    <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{l}</p>
                    <p className="text-[11px] font-medium truncate">{v || '—'}</p>
                  </div>
                ))}
              </div>

              <div className="prose max-w-none">
                <h3 className="text-[13px] font-semibold mb-2">Analysis Report</h3>
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{detail.report}</div>
              </div>

              {detail.outreachMessage && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-[13px] font-semibold mb-2">Outreach Message</h3>
                  <div className="p-3 rounded-lg text-[12px] whitespace-pre-wrap leading-relaxed" style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)' }}>
                    {detail.outreachMessage}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Status: {detail.outreachStatus}{detail.outreachSentAt && ` · Sent: ${new Date(detail.outreachSentAt).toLocaleString()}`}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center hidden md:block">
              <FileText size={24} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Select a company to view its enrichment report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

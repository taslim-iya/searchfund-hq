import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import CompanyDetail from '@/components/CompanyDetail';
import { Eye, RefreshCw, Trash2, ExternalLink, Bell, Loader2, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export default function Watchlist() {
  const { watchlist, config, removeFromWatchlist, updateWatchlistItem } = useAppStore();
  const [checking, setChecking] = useState<string | null>(null);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [detail, setDetail] = useState<{ num: string; name: string } | null>(null);

  const checkCompany = async (num: string) => {
    if (!config.companiesHouseKey) return;
    setChecking(num);
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const since = threeMonthsAgo.toISOString().split('T')[0];

      const res = await fetch(`/api/company-changes?company=${num}&since=${since}`, {
        headers: { 'x-api-key': config.companiesHouseKey },
      });
      const data = await res.json();
      setChanges(prev => ({ ...prev, [num]: data }));
      updateWatchlistItem(num, {
        lastChecked: new Date().toISOString(),
        lastChanges: data.totalRecentChanges || 0,
      });
    } catch { }
    setChecking(null);
  };

  const checkAll = async () => {
    for (const item of watchlist) {
      await checkCompany(item.companyNumber);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Eye size={18} style={{ color: 'var(--accent)' }} /> Watchlist
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {watchlist.length} companies monitored · Click "Check" to scan for changes
          </p>
        </div>
        {watchlist.length > 0 && (
          <button onClick={checkAll} className="btn-primary text-[11px]" disabled={!config.companiesHouseKey}>
            <RefreshCw size={11} /> Check All for Changes
          </button>
        )}
      </div>

      {!config.companiesHouseKey && (
        <div className="card p-4 mb-4 flex items-center gap-2" style={{ borderColor: '#f0b429', borderWidth: 1 }}>
          <AlertTriangle size={14} style={{ color: '#f0b429' }} />
          <p className="text-[12px]">Set your Companies House API key in Settings to enable change tracking.</p>
        </div>
      )}

      {watchlist.length === 0 ? (
        <div className="card p-10 text-center">
          <Eye size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[14px] font-medium mb-1">No companies watched</p>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Click any company in the Database → hit "Watch" to add it here.
            <br />You'll be able to track filings, director changes, and status updates.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {watchlist.map(item => {
            const ch = changes[item.companyNumber];
            const hasChanges = ch && ch.totalRecentChanges > 0;
            return (
              <div key={item.companyNumber} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setDetail({ num: item.companyNumber, name: item.companyName })}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-semibold">{item.companyName}</p>
                      {hasChanges && (
                        <span className="badge text-[9px]" style={{ background: '#f0b42915', color: '#f0b429' }}>
                          <Bell size={8} className="inline mr-0.5" /> {ch.totalRecentChanges} changes
                        </span>
                      )}
                      {ch && !hasChanges && (
                        <span className="badge text-[9px]" style={{ background: '#3fcf8e15', color: '#3fcf8e' }}>
                          <CheckCircle size={8} className="inline mr-0.5" /> No changes
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mono" style={{ color: 'var(--text-tertiary)' }}>
                      {item.companyNumber} · Added {new Date(item.addedAt).toLocaleDateString()}
                      {item.lastChecked && ` · Last checked ${new Date(item.lastChecked).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => checkCompany(item.companyNumber)} disabled={checking === item.companyNumber || !config.companiesHouseKey}
                      className="btn-secondary text-[10px] py-1 px-2 disabled:opacity-50">
                      {checking === item.companyNumber ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} Check
                    </button>
                    <a href={`https://find-and-update.company-information.service.gov.uk/company/${item.companyNumber}`} target="_blank"
                      className="btn-secondary text-[10px] py-1 px-2"><ExternalLink size={10} /></a>
                    <button onClick={() => removeFromWatchlist(item.companyNumber)} className="btn-secondary text-[10px] py-1 px-2">
                      <Trash2 size={10} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>

                {/* Show recent changes if checked */}
                {ch && hasChanges && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
                    {ch.recentFilings?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold mb-1"><FileText size={10} className="inline mr-0.5" /> Recent Filings</p>
                        {ch.recentFilings.slice(0, 5).map((f: any, i: number) => (
                          <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            <span className="mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{f.date}</span> — {f.description}
                          </p>
                        ))}
                      </div>
                    )}
                    {ch.recentOfficerChanges?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold mb-1">👤 Officer Changes</p>
                        {ch.recentOfficerChanges.map((o: any, i: number) => (
                          <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {o.name} — {o.resignedOn ? `Resigned ${o.resignedOn}` : `Appointed ${o.appointedOn}`} ({o.role})
                          </p>
                        ))}
                      </div>
                    )}
                    {ch.status && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        Status: {ch.status} · Accounts: {ch.lastAccountsType?.replace(/-/g, ' ')} ({ch.lastAccountsDate})
                        {ch.hasInsolvency && <span style={{ color: '#ef4444' }}> ⚠️ Insolvency history</span>}
                        {ch.hasCharges && <span style={{ color: '#f0b429' }}> 🔒 Has charges</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detail && <CompanyDetail companyNumber={detail.num} companyName={detail.name} onClose={() => setDetail(null)} />}
    </div>
  );
}

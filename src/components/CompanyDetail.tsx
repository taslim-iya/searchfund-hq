import { useState, useEffect } from 'react';
import { Building2, User, Calendar, MapPin, FileText, ExternalLink, Globe, Loader2, X, Shield, AlertTriangle, Eye, EyeOff, Flag } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface Props {
  companyNumber: string;
  companyName: string;
  onClose: () => void;
}

interface Officer { name: string; officer_role: string; appointed_on: string; resigned_on?: string; nationality?: string; occupation?: string; }
interface PSC { name: string; natures_of_control: string[]; notified_on: string; nationality?: string; country_of_residence?: string; }
interface Filing { category: string; description: string; date: string; type: string; }

const API_BASE = 'https://api.company-information.service.gov.uk';

export default function CompanyDetail({ companyNumber, companyName, onClose }: Props) {
  const { config, watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();
  const isWatched = watchlist.some(w => w.companyNumber === companyNumber);
  const [profile, setProfile] = useState<any>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [pscs, setPscs] = useState<PSC[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'financials' | 'officers' | 'ownership' | 'filings'>('overview');

  useEffect(() => {
    const key = config.companiesHouseKey;
    if (!key) { setLoading(false); return; }
    const auth = btoa(`${key}:`);
    const headers: Record<string, string> = { Authorization: `Basic ${auth}` };

    Promise.all([
      fetch(`/api/companies-house?path=/company/${companyNumber}`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/officers`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/filing-history&items_per_page=20`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/persons-with-significant-control`, { headers }).then(r => r.json()),
      fetch(`/api/company-financials?company=${companyNumber}`, { headers: { 'x-api-key': key } }).then(r => r.json()),
    ]).then(([prof, offs, fils, psc, fin]) => {
      setProfile(prof);
      setOfficers((offs.items || []).filter((o: Officer) => !o.resigned_on));
      setFilings(fils.items || []);
      setPscs(psc.items || []);
      setFinancials(fin?.financials || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyNumber, config.companiesHouseKey]);

  const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`;
  const age = profile?.date_of_creation ? new Date().getFullYear() - new Date(profile.date_of_creation).getFullYear() : 0;
  const addr = profile?.registered_office_address;
  const fullAddress = addr ? [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code].filter(Boolean).join(', ') : '';

  const TABS = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'financials' as const, label: 'Financials' },
    { id: 'officers' as const, label: `Directors (${officers.length})` },
    { id: 'ownership' as const, label: `Ownership (${pscs.length})` },
    { id: 'filings' as const, label: `Filings (${filings.length})` },
  ];

  const flags = financials?.flags || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
      <div className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: 'var(--border)' }}>
          <div className="px-5 py-3 flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">{companyName}</h2>
              <p className="text-[11px] mono" style={{ color: 'var(--text-tertiary)' }}>{companyNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => isWatched ? removeFromWatchlist(companyNumber) : addToWatchlist({ companyNumber, companyName, addedAt: new Date().toISOString(), lastChecked: '', lastChanges: 0, notes: '' })}
                className={`text-[10px] py-1 ${isWatched ? 'btn-primary' : 'btn-secondary'}`}>
                {isWatched ? <><EyeOff size={10} /> Watching</> : <><Eye size={10} /> Watch</>}
              </button>
              <a href={chUrl} target="_blank" className="btn-secondary text-[10px] py-1"><ExternalLink size={10} /> Companies House</a>
              <button onClick={onClose}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
          </div>
          {/* Flags bar */}
          {flags.length > 0 && (
            <div className="px-5 pb-2 flex gap-1.5 flex-wrap">
              {flags.map((f: string) => (
                <span key={f} className="badge text-[8px] font-bold" style={{
                  background: f.includes('INSOLVENCY') || f.includes('OVERDUE') ? '#ef444415' : '#f59e0b15',
                  color: f.includes('INSOLVENCY') || f.includes('OVERDUE') ? '#ef4444' : '#f59e0b',
                }}>
                  <AlertTriangle size={8} className="inline mr-0.5" /> {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-0 px-5 border-t" style={{ borderColor: 'var(--border-light)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-2 text-[11px] font-medium border-b-2 -mb-px"
                style={{ borderColor: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : !config.companiesHouseKey ? (
            <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Set your Companies House API key in Settings.</p>
          ) : (
            <>
              {tab === 'overview' && profile && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge text-[10px]" style={{ background: profile.company_status === 'active' ? '#10b98115' : '#ef444415', color: profile.company_status === 'active' ? '#10b981' : '#ef4444' }}>
                      {profile.company_status?.toUpperCase()}
                    </span>
                    <span className="badge text-[10px]">{profile.type?.replace(/-/g, ' ')}</span>
                    {financials?.sizeBracket && <span className="badge text-[10px]">{financials.sizeBracket.toUpperCase()}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Calendar} label="Incorporated" value={profile.date_of_creation} sub={`${age} years`} />
                    <InfoCard icon={MapPin} label="Address" value={fullAddress} />
                    <InfoCard icon={FileText} label="SIC Codes" value={(profile.sic_codes || []).join(', ')} />
                    <InfoCard icon={FileText} label="Accounts Type" value={financials?.accountsType?.replace(/-/g, ' ') || '—'} sub={financials?.accountsMadeUpTo ? `Last: ${financials.accountsMadeUpTo}` : ''} />
                  </div>
                  {profile.previous_company_names?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold mb-1">Previous Names</p>
                      {profile.previous_company_names.map((pn: any, i: number) => (
                        <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{pn.name} ({pn.effective_from} → {pn.ceased_on})</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'financials' && (
                <div className="space-y-4">
                  {!financials ? (
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No financial data available.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                          <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Accounts Type</p>
                          <p className="text-[13px] font-semibold">{financials.accountsType?.replace(/-/g, ' ') || '—'}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                          <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Size Bracket</p>
                          <p className="text-[13px] font-semibold">{financials.sizeBracket?.toUpperCase() || '—'}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                          <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Last Accounts</p>
                          <p className="text-[13px] font-semibold">{financials.accountsMadeUpTo || '—'}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                          <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Next Due</p>
                          <p className="text-[13px] font-semibold" style={{ color: financials.accountsOverdue ? '#ef4444' : undefined }}>
                            {financials.accountsNextDue || '—'} {financials.accountsOverdue && '⚠️ OVERDUE'}
                          </p>
                        </div>
                      </div>

                      {/* Flags */}
                      {flags.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: '#fef2f215', border: '1px solid #fecaca' }}>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: '#ef4444' }}>⚠️ Flags</p>
                          {flags.map((f: string) => (
                            <p key={f} className="text-[11px]" style={{ color: '#ef4444' }}>• {f.replace(/_/g, ' ')}</p>
                          ))}
                        </div>
                      )}

                      {/* Accounts filing history */}
                      {financials.accountsHistory?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold mb-2">Accounts Filing History</p>
                          {financials.accountsHistory.map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 py-1.5 border-b" style={{ borderColor: 'var(--border-light)' }}>
                              <p className="text-[10px] mono flex-shrink-0" style={{ color: 'var(--text-tertiary)', width: 70 }}>{f.date}</p>
                              <p className="text-[11px] flex-1">{f.description}</p>
                              <span className="badge text-[8px]">{f.type}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Note: Companies House does not expose detailed P&L data via API. For revenue, profit, and balance sheet figures, view the actual filed accounts on Companies House.
                      </p>
                      <a href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history`}
                        target="_blank" className="btn-secondary text-[11px] inline-flex">
                        <ExternalLink size={11} /> View Full Filings on Companies House
                      </a>
                    </>
                  )}
                </div>
              )}

              {tab === 'officers' && (
                <div className="space-y-2">
                  {officers.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No active officers.</p>}
                  {officers.map((o, i) => (
                    <div key={i} className="card p-3">
                      <p className="text-[13px] font-semibold">{o.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{o.officer_role?.replace(/-/g, ' ')} · Since {o.appointed_on}</p>
                      {o.occupation && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Occupation: {o.occupation}</p>}
                      {o.nationality && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Nationality: {o.nationality}</p>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'ownership' && (
                <div className="space-y-2">
                  {pscs.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No PSC data.</p>}
                  {pscs.map((p, i) => (
                    <div key={i} className="card p-3">
                      <p className="text-[13px] font-semibold">{p.name}</p>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        Notified: {p.notified_on} {p.nationality && `· ${p.nationality}`} {p.country_of_residence && `(${p.country_of_residence})`}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(p.natures_of_control || []).map((c, j) => (
                          <span key={j} className="badge text-[8px]">{c.replace(/-/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'filings' && (
                <div className="space-y-1">
                  {filings.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No filings.</p>}
                  {filings.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="text-[10px] mono flex-shrink-0" style={{ color: 'var(--text-tertiary)', width: 70 }}>{f.date}</p>
                      <p className="text-[11px] flex-1 truncate">{f.description}</p>
                      <span className="badge text-[8px]">{f.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
      <p className="text-[12px] font-medium">{value || '—'}</p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

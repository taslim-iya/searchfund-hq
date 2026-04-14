import { useState, useEffect } from 'react';
import { Building2, User, Calendar, MapPin, FileText, ExternalLink, Loader2, X, Shield, AlertTriangle, Eye, EyeOff, Users, Banknote, Clock, Globe, Hash, Briefcase, Crown, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface Props { companyNumber: string; companyName: string; onClose: () => void; }
interface Officer { name: string; officer_role: string; appointed_on: string; resigned_on?: string; nationality?: string; occupation?: string; date_of_birth?: { month: number; year: number }; address?: any; }
interface PSC { name: string; natures_of_control: string[]; notified_on: string; nationality?: string; country_of_residence?: string; kind: string; }
interface Filing { category: string; description: string; date: string; type: string; description_values?: any; }

const SIC_NAMES: Record<string, string> = {};

export default function CompanyDetail({ companyNumber, companyName, onClose }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();
  const isWatched = watchlist.some(w => w.companyNumber === companyNumber);
  const [profile, setProfile] = useState<any>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [allOfficers, setAllOfficers] = useState<Officer[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [pscs, setPscs] = useState<PSC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'people' | 'filings' | 'history'>('overview');
  const [showResigned, setShowResigned] = useState(false);

  const chFetch = (path: string) => fetch(`/api/companies-house?path=${encodeURIComponent(path)}`).then(r => r.json());

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      chFetch(`/company/${companyNumber}`),
      chFetch(`/company/${companyNumber}/officers?items_per_page=50`),
      chFetch(`/company/${companyNumber}/filing-history?items_per_page=30`),
      chFetch(`/company/${companyNumber}/persons-with-significant-control`),
    ]).then(([prof, offs, fils, psc]) => {
      if (prof.error || prof.errors) { setError(prof.error || 'Company not found'); setLoading(false); return; }
      setProfile(prof);
      const allOffs = (offs.items || []) as Officer[];
      setAllOfficers(allOffs);
      setOfficers(allOffs.filter(o => !o.resigned_on));
      setFilings(fils.items || []);
      setPscs(psc.items || []);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [companyNumber]);

  const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`;
  const age = profile?.date_of_creation ? new Date().getFullYear() - new Date(profile.date_of_creation).getFullYear() : 0;
  const addr = profile?.registered_office_address;
  const fullAddr = addr ? [addr.premises, addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country].filter(Boolean).join(', ') : '—';
  const isActive = profile?.company_status === 'active';
  const accounts = profile?.accounts;
  const confirmation = profile?.confirmation_statement;
  const lastAccounts = accounts?.last_accounts;
  const nextAccounts = accounts?.next_accounts;

  // Filing categories
  const accountsFilings = filings.filter(f => f.category === 'accounts');
  const confirmationFilings = filings.filter(f => f.category === 'confirmation-statement');
  const otherFilings = filings.filter(f => f.category !== 'accounts' && f.category !== 'confirmation-statement');

  const TABS = [
    { id: 'overview' as const, label: 'Overview', icon: Building2 },
    { id: 'people' as const, label: `People (${officers.length + pscs.length})`, icon: Users },
    { id: 'filings' as const, label: `Filings (${filings.length})`, icon: FileText },
    { id: 'history' as const, label: 'History', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-[680px] bg-white h-full overflow-y-auto shadow-2xl animate-slide-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold leading-tight truncate">{companyName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] mono" style={{ color: 'var(--text-tertiary)' }}>{companyNumber}</span>
                  {profile && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                      background: isActive ? '#10b98112' : '#ef444412',
                      color: isActive ? '#10b981' : '#ef4444',
                    }}>{profile.company_status?.toUpperCase()}</span>
                  )}
                  {profile?.type && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-alt)', color: 'var(--text-tertiary)' }}>{profile.type.replace(/-/g, ' ').toUpperCase()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => isWatched ? removeFromWatchlist(companyNumber) : addToWatchlist({ companyNumber, companyName, addedAt: new Date().toISOString(), lastChecked: '', lastChanges: 0, notes: '' })}
                  className={`text-[10px] py-1 px-2 rounded-md font-medium ${isWatched ? 'btn-primary' : 'btn-secondary'}`}>
                  {isWatched ? '✓ Watching' : '+ Watch'}
                </button>
                <a href={chUrl} target="_blank" className="btn-secondary text-[10px] py-1 px-2 rounded-md"><ExternalLink size={10} /></a>
                <button onClick={onClose} className="p-1"><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
              </div>
            </div>
          </div>
          <div className="flex px-5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors"
                style={{ borderColor: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-60 gap-2">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Loading company data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertTriangle size={20} className="mx-auto mb-2" style={{ color: '#ef4444' }} />
              <p className="text-[13px] font-medium" style={{ color: '#ef4444' }}>{error}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>The Companies House API key may not be set. Check Settings or Vercel env vars.</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === 'overview' && profile && (
                <div className="space-y-5">
                  {/* Key facts grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Fact icon={Calendar} label="Incorporated" value={profile.date_of_creation || '—'} sub={age ? `${age} years old` : ''} />
                    <Fact icon={MapPin} label="Registered Address" value={fullAddr} />
                    <Fact icon={Hash} label="SIC Codes" value={(profile.sic_codes || []).join(', ') || '—'} />
                    <Fact icon={Globe} label="Jurisdiction" value={profile.jurisdiction?.replace(/-/g, ' ') || '—'} />
                  </div>

                  {/* Flags */}
                  <div className="flex flex-wrap gap-1.5">
                    {profile.has_insolvency_history && <Flag label="Insolvency History" color="#ef4444" />}
                    {profile.has_charges && <Flag label="Has Charges" color="#f59e0b" />}
                    {accounts?.overdue && <Flag label="Accounts Overdue" color="#ef4444" />}
                    {confirmation?.overdue && <Flag label="Confirmation Overdue" color="#ef4444" />}
                    {!profile.has_insolvency_history && !profile.has_charges && !accounts?.overdue && !confirmation?.overdue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#10b98112', color: '#10b981' }}>✓ Clean record</span>
                    )}
                  </div>

                  {/* Accounts info */}
                  <Section title="Accounts" icon={Banknote}>
                    <div className="grid grid-cols-2 gap-2">
                      <MiniCard label="Last Filed" value={lastAccounts?.made_up_to || '—'} sub={lastAccounts?.type?.replace(/-/g, ' ')} />
                      <MiniCard label="Next Due" value={nextAccounts?.due_on || '—'} alert={accounts?.overdue} />
                      <MiniCard label="Period" value={lastAccounts ? `${lastAccounts.period_start_on} to ${lastAccounts.period_end_on}` : '—'} />
                      <MiniCard label="Accounting Ref" value={accounts?.accounting_reference_date ? `${accounts.accounting_reference_date.day}/${accounts.accounting_reference_date.month}` : '—'} />
                    </div>
                  </Section>

                  {/* Confirmation */}
                  <Section title="Confirmation Statement" icon={Shield}>
                    <div className="grid grid-cols-2 gap-2">
                      <MiniCard label="Last Filed" value={confirmation?.last_made_up_to || '—'} />
                      <MiniCard label="Next Due" value={confirmation?.next_due || '—'} alert={confirmation?.overdue} />
                    </div>
                  </Section>

                  {/* Quick people summary */}
                  <Section title="Key People" icon={Users}>
                    {officers.slice(0, 3).map((o, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--bg-alt)', color: 'var(--text-tertiary)' }}>
                          {o.name.split(',')[0]?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium truncate">{o.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{o.officer_role?.replace(/-/g, ' ')} · since {o.appointed_on}</p>
                        </div>
                      </div>
                    ))}
                    {officers.length > 3 && <p className="text-[10px] mt-1 cursor-pointer" style={{ color: 'var(--accent)' }} onClick={() => setTab('people')}>+ {officers.length - 3} more →</p>}
                    {pscs.length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Significant Control</p>
                        {pscs.slice(0, 2).map((p, i) => (
                          <p key={i} className="text-[11px] py-0.5"><Crown size={10} className="inline mr-1" style={{ color: '#f59e0b' }} />{p.name}</p>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Previous names */}
                  {profile.previous_company_names?.length > 0 && (
                    <Section title="Previous Names" icon={Clock}>
                      {profile.previous_company_names.map((pn: any, i: number) => (
                        <p key={i} className="text-[11px] py-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {pn.name} <span className="mono text-[9px]" style={{ color: 'var(--text-tertiary)' }}>({pn.effective_from} → {pn.ceased_on})</span>
                        </p>
                      ))}
                    </Section>
                  )}
                </div>
              )}

              {/* PEOPLE TAB */}
              {tab === 'people' && (
                <div className="space-y-4">
                  {/* Active directors */}
                  <Section title={`Active Directors (${officers.length})`} icon={Briefcase}>
                    {officers.map((o, i) => (
                      <PersonCard key={i} person={o} type="officer" />
                    ))}
                  </Section>

                  {/* PSCs */}
                  {pscs.length > 0 && (
                    <Section title={`Persons with Significant Control (${pscs.length})`} icon={Crown}>
                      {pscs.map((p, i) => (
                        <div key={i} className="py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                          <p className="text-[13px] font-semibold">{p.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {p.kind?.replace(/-/g, ' ')} · Notified {p.notified_on}
                            {p.nationality && ` · ${p.nationality}`}
                            {p.country_of_residence && ` (${p.country_of_residence})`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(p.natures_of_control || []).map((c, j) => (
                              <span key={j} className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#f59e0b12', color: '#f59e0b' }}>
                                {c.replace(/-/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Resigned */}
                  {allOfficers.filter(o => o.resigned_on).length > 0 && (
                    <div>
                      <button onClick={() => setShowResigned(!showResigned)} className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <ChevronRight size={12} style={{ transform: showResigned ? 'rotate(90deg)' : '', transition: '0.15s' }} />
                        Resigned Officers ({allOfficers.filter(o => o.resigned_on).length})
                      </button>
                      {showResigned && allOfficers.filter(o => o.resigned_on).map((o, i) => (
                        <div key={i} className="py-2 ml-4 border-b last:border-0 opacity-60" style={{ borderColor: 'var(--border-light)' }}>
                          <p className="text-[12px] font-medium">{o.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{o.officer_role?.replace(/-/g, ' ')} · {o.appointed_on} → {o.resigned_on}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FILINGS TAB */}
              {tab === 'filings' && (
                <div className="space-y-4">
                  {accountsFilings.length > 0 && (
                    <Section title={`Accounts (${accountsFilings.length})`} icon={Banknote}>
                      {accountsFilings.map((f, i) => <FilingRow key={i} filing={f} />)}
                    </Section>
                  )}
                  {confirmationFilings.length > 0 && (
                    <Section title={`Confirmation Statements (${confirmationFilings.length})`} icon={Shield}>
                      {confirmationFilings.map((f, i) => <FilingRow key={i} filing={f} />)}
                    </Section>
                  )}
                  {otherFilings.length > 0 && (
                    <Section title={`Other (${otherFilings.length})`} icon={FileText}>
                      {otherFilings.map((f, i) => <FilingRow key={i} filing={f} />)}
                    </Section>
                  )}
                  {filings.length === 0 && <p className="text-[12px] text-center py-6" style={{ color: 'var(--text-tertiary)' }}>No filings found.</p>}
                </div>
              )}

              {/* HISTORY TAB */}
              {tab === 'history' && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>Complete filing timeline</p>
                  {filings.map((f, i) => (
                    <div key={i} className="flex gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                      <div className="flex-shrink-0 w-[70px]">
                        <p className="text-[10px] mono" style={{ color: 'var(--text-tertiary)' }}>{f.date}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium">{formatDescription(f.description, f.description_values)}</p>
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ background: categoryColor(f.category).bg, color: categoryColor(f.category).text }}>{f.category}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-alt)', color: 'var(--text-tertiary)' }}>{f.type}</span>
                        </div>
                      </div>
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

// Sub-components
function Fact({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
      <div className="flex items-center gap-1.5 mb-1"><Icon size={11} style={{ color: 'var(--text-tertiary)' }} /><p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p></div>
      <p className="text-[12px] font-medium leading-tight">{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

function MiniCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="p-2.5 rounded-md" style={{ background: alert ? '#ef444408' : 'var(--bg-alt)', border: alert ? '1px solid #ef444420' : undefined }}>
      <p className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-[12px] font-semibold" style={{ color: alert ? '#ef4444' : undefined }}>{value} {alert && '⚠️'}</p>
      {sub && <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

function Flag({ label, color }: { label: string; color: string }) {
  return <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: `${color}12`, color }}><AlertTriangle size={9} />{label}</span>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} style={{ color: 'var(--accent)' }} />
        <h3 className="text-[12px] font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PersonCard({ person, type }: { person: Officer; type: string }) {
  return (
    <div className="py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)' }}>
          {person.name.split(',')[0]?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold">{person.name}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {person.officer_role?.replace(/-/g, ' ')} · Appointed {person.appointed_on}
            {person.nationality && ` · ${person.nationality}`}
          </p>
          {person.occupation && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Occupation: {person.occupation}</p>}
          {person.date_of_birth && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Born: {person.date_of_birth.month}/{person.date_of_birth.year}</p>}
          {person.address && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {[person.address.premises, person.address.address_line_1, person.address.locality, person.address.postal_code].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilingRow({ filing }: { filing: Filing }) {
  const c = categoryColor(filing.category);
  return (
    <div className="flex items-center gap-3 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
      <p className="text-[10px] mono flex-shrink-0 w-[65px]" style={{ color: 'var(--text-tertiary)' }}>{filing.date}</p>
      <p className="text-[11px] flex-1 truncate">{formatDescription(filing.description, filing.description_values)}</p>
      <span className="text-[8px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: c.bg, color: c.text }}>{filing.type}</span>
    </div>
  );
}

function formatDescription(desc: string, values?: any): string {
  if (!desc || !values) return desc || '—';
  let result = desc;
  Object.entries(values).forEach(([k, v]) => { result = result.replace(`{${k}}`, String(v)); });
  return result.replace(/-/g, ' ');
}

function categoryColor(cat: string) {
  switch (cat) {
    case 'accounts': return { bg: '#3b82f612', text: '#3b82f6' };
    case 'confirmation-statement': return { bg: '#10b98112', text: '#10b981' };
    case 'capital': return { bg: '#f59e0b12', text: '#f59e0b' };
    case 'officers': return { bg: '#8b5cf612', text: '#8b5cf6' };
    default: return { bg: 'var(--bg-alt)', text: 'var(--text-tertiary)' };
  }
}

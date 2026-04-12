import { useState, useEffect } from 'react';
import { Building2, User, Calendar, MapPin, FileText, ExternalLink, Globe, Loader2, X, TrendingUp, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface Props {
  companyNumber: string;
  companyName: string;
  onClose: () => void;
}

interface Profile {
  company_name: string;
  company_number: string;
  company_status: string;
  date_of_creation: string;
  type: string;
  sic_codes: string[];
  registered_office_address: Record<string, string>;
  accounts?: { last_accounts?: { type: string; made_up_to: string }; next_due: string };
  confirmation_statement?: { next_due: string };
  has_charges: boolean;
  has_insolvency_history: boolean;
  previous_company_names?: Array<{ name: string; effective_from: string; ceased_on: string }>;
}

interface Officer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  date_of_birth?: { month: number; year: number };
}

interface Filing {
  category: string;
  description: string;
  date: string;
  type: string;
}

interface PSC {
  name: string;
  natures_of_control: string[];
  notified_on: string;
  kind: string;
  nationality?: string;
  country_of_residence?: string;
}

const API_BASE = 'https://api.company-information.service.gov.uk';

export default function CompanyDetail({ companyNumber, companyName, onClose }: Props) {
  const { config } = useAppStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [pscs, setPscs] = useState<PSC[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'officers' | 'filings' | 'ownership'>('overview');

  useEffect(() => {
    const key = config.companiesHouseKey;
    if (!key) { setLoading(false); return; }
    const auth = btoa(`${key}:`);
    const headers = { Authorization: `Basic ${auth}` };

    Promise.all([
      fetch(`/api/companies-house?path=/company/${companyNumber}`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/officers`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/filing-history&items_per_page=15`, { headers }).then(r => r.json()),
      fetch(`/api/companies-house?path=/company/${companyNumber}/persons-with-significant-control`, { headers }).then(r => r.json()),
    ]).then(([prof, offs, fils, psc]) => {
      setProfile(prof);
      setOfficers((offs.items || []).filter((o: Officer) => !o.resigned_on));
      setFilings(fils.items || []);
      setPscs(psc.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyNumber, config.companiesHouseKey]);

  const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`;
  const age = profile?.date_of_creation ? new Date().getFullYear() - new Date(profile.date_of_creation).getFullYear() : 0;

  const addr = profile?.registered_office_address;
  const fullAddress = addr ? [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code].filter(Boolean).join(', ') : '';

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'officers', label: `Directors (${officers.length})` },
    { id: 'ownership', label: `Ownership (${pscs.length})` },
    { id: 'filings', label: `Filings (${filings.length})` },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
      <div className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: 'var(--border)' }}>
          <div className="px-5 py-3 flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">{companyName}</h2>
              <p className="text-[11px] mono" style={{ color: 'var(--text-tertiary)' }}>{companyNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={chUrl} target="_blank" className="btn-secondary text-[10px] py-1"><ExternalLink size={10} /> Companies House</a>
              <button onClick={onClose}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
          </div>
          <div className="flex gap-0 px-5 border-t" style={{ borderColor: 'var(--border-light)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors"
                style={{ borderColor: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : !config.companiesHouseKey ? (
            <div className="text-center py-10">
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Set your Companies House API key in Settings to fetch live data.</p>
            </div>
          ) : (
            <>
              {tab === 'overview' && profile && (
                <div className="space-y-4">
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="badge text-[10px]" style={{ background: profile.company_status === 'active' ? '#10b98115' : '#ef444415', color: profile.company_status === 'active' ? '#10b981' : '#ef4444' }}>
                      {profile.company_status?.toUpperCase()}
                    </span>
                    <span className="badge text-[10px]">{profile.type?.replace(/-/g, ' ')}</span>
                    {profile.has_charges && <span className="badge text-[10px]" style={{ background: '#f59e0b15', color: '#f59e0b' }}><Shield size={9} className="inline mr-0.5" /> Has Charges</span>}
                    {profile.has_insolvency_history && <span className="badge text-[10px]" style={{ background: '#ef444415', color: '#ef4444' }}><AlertTriangle size={9} className="inline mr-0.5" /> Insolvency History</span>}
                  </div>

                  {/* Key info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Calendar} label="Incorporated" value={profile.date_of_creation} sub={`${age} years ago`} />
                    <InfoCard icon={MapPin} label="Address" value={fullAddress} />
                    <InfoCard icon={FileText} label="SIC Codes" value={(profile.sic_codes || []).join(', ')} />
                    <InfoCard icon={Building2} label="Accounts" value={profile.accounts?.last_accounts?.type?.replace(/-/g, ' ') || '—'} sub={`Last: ${profile.accounts?.last_accounts?.made_up_to || '—'}`} />
                  </div>

                  {/* Accounts type interpretation */}
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-alt)' }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>Revenue Estimate (by accounts type)</p>
                    <AccountsInterpretation type={profile.accounts?.last_accounts?.type || ''} />
                  </div>

                  {/* Previous names */}
                  {profile.previous_company_names && profile.previous_company_names.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold mb-1">Previous Names</p>
                      {profile.previous_company_names.map((pn, i) => (
                        <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {pn.name} ({pn.effective_from} → {pn.ceased_on})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'officers' && (
                <div className="space-y-2">
                  {officers.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No active officers found.</p>}
                  {officers.map((o, i) => (
                    <div key={i} className="card p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-semibold">{o.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {o.officer_role?.replace(/-/g, ' ')} · Since {o.appointed_on}
                          </p>
                          {o.occupation && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Occupation: {o.occupation}</p>}
                          {o.nationality && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Nationality: {o.nationality}</p>}
                        </div>
                        <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'ownership' && (
                <div className="space-y-2">
                  {pscs.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No PSC data found.</p>}
                  {pscs.map((p, i) => (
                    <div key={i} className="card p-3">
                      <p className="text-[13px] font-semibold">{p.name}</p>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        Notified: {p.notified_on} · {p.nationality || ''} {p.country_of_residence ? `(${p.country_of_residence})` : ''}
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
                  {filings.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No filings found.</p>}
                  {filings.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="text-[10px] mono flex-shrink-0" style={{ color: 'var(--text-tertiary)', width: 70 }}>{f.date}</p>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] truncate">{f.description}</p>
                        <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{f.category} · {f.type}</p>
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

function AccountsInterpretation({ type }: { type: string }) {
  const info: Record<string, { range: string; note: string }> = {
    'micro-entity': { range: '≤ £632K turnover', note: 'Micro-entity accounts. Very small company. Turnover ≤ £632K, balance sheet ≤ £316K, ≤ 10 employees.' },
    'small': { range: '£632K — £10.2M turnover', note: 'Small company accounts. Turnover between £632K and £10.2M. Balance sheet up to £5.1M. Good search fund range.' },
    'total-exemption-small': { range: '£632K — £10.2M turnover', note: 'Small company with audit exemption. Similar to small accounts. Sweet spot for search fund.' },
    'total-exemption-full': { range: '£632K — £10.2M turnover', note: 'Full exemption — typically small company filing. Revenue likely £632K–£10.2M.' },
    'full': { range: '> £10.2M turnover (or audited)', note: 'Full accounts filed. Likely above £10.2M turnover or voluntarily audited. Larger acquisition target.' },
    'medium': { range: '£10.2M — £36M turnover', note: 'Medium-sized company. Turnover £10.2M–£36M. Larger acquisition, may need more capital.' },
    'group': { range: 'Group structure', note: 'Group accounts filed. Parent company with subsidiaries.' },
    'dormant': { range: 'No trading activity', note: 'Dormant company — no significant transactions.' },
    'abbreviated': { range: 'Varies', note: 'Abbreviated accounts (legacy format). Limited financial detail available.' },
    'unaudited-abridged': { range: '≤ £10.2M turnover', note: 'Unaudited abridged accounts — small company.' },
  };
  const match = info[type] || { range: 'Unknown', note: `Accounts type: ${type}` };
  return (
    <div>
      <p className="text-[14px] font-bold" style={{ color: '#10b981' }}>{match.range}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{match.note}</p>
    </div>
  );
}

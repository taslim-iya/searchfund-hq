import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Calendar, Users, FileText, ExternalLink,
  AtSign, Shield, AlertTriangle, ChevronDown, ChevronRight,
  Sparkles, Loader2, ArrowLeft, Globe, Briefcase,
} from 'lucide-react';

interface CompanyData {
  number: string;
  name: string;
  status: string;
  type: string;
  incorporatedOn: string;
  dissolvedOn?: string;
  address: Record<string, string>;
  sicCodes: string[];
  accounts: any;
  lastAccounts: any;
  nextAccounts: any;
  companyAtSign: string;
  officers: Officer[];
  pscs: PSC[];
  financials: Filing[];
  charges: any[];
  hasCharges: boolean;
  externalLinks: { companiesHouse: string; endole: string };
}

interface Officer {
  name: string;
  role: string;
  appointedOn: string;
  resignedOn?: string;
  nationality?: string;
  occupation?: string;
  countryOfResidence?: string;
  linkedin: string;
}

interface PSC {
  name: string;
  kind: string;
  naturesOfControl: string[];
  notifiedOn: string;
  nationality?: string;
  countryOfResidence?: string;
}

interface Filing {
  date: string;
  madeUpTo?: string;
  type: string;
  description: string;
  documentLink?: string;
}

const SIC_DESCRIPTIONS: Record<string, string> = {
  '47250': 'Retail sale of beverages', '68100': 'Buying and selling of own real estate',
  '41100': 'Development of building projects', '62020': 'IT consultancy',
  '70229': 'Management consultancy (other)', '82990': 'Other business support',
};

export default function CompanyProfile() {
  const { number } = useParams<{ number: string }>();
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrichment, setEnrichment] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'officers' | 'ownership' | 'filings'>('overview');

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    fetch(`/api/company-profile?number=${number}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [number]);

  const enrich = async () => {
    if (!data || enriching) return;
    setEnriching(true);
    try {
      const r = await fetch('/api/enrich-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          number: data.number,
          sicCodes: data.sicCodes,
          address: formatAddress(data.address),
        }),
      });
      const d = await r.json();
      setEnrichment(d.summary);
    } catch {
      setEnrichment('Failed to enrich.');
    } finally {
      setEnriching(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (error) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!data) return null;

  const activeOfficers = data.officers.filter(o => !o.resignedOn);
  const formerOfficers = data.officers.filter(o => o.resignedOn);
  const addr = formatAddress(data.address);
  const isActive = data.status === 'active';

  return (
    <div>
      {/* Back */}
      <Link to="/database" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none', marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back to Database
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="meta-label" style={{ color: isActive ? 'var(--accent-2)' : 'var(--danger)' }}>
            {data.status.toUpperCase()}
          </span>
          <span className="meta-label">{data.type}</span>
          <span className="meta-label">#{data.number}</span>
        </div>
        <h1 className="font-headline" style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 12 }}>{data.name}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          {addr && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {addr}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> Inc. {data.incorporatedOn}</span>
          {data.sicCodes.map(s => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={13} /> SIC {s}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <a href={data.companyAtSign} target="_blank" rel="noopener" className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <AtSign size={13} /> LinkedIn
          </a>
          <a href={data.externalLinks.companiesHouse} target="_blank" rel="noopener" className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <ExternalLink size={13} /> Companies House
          </a>
          <a href={data.externalLinks.endole} target="_blank" rel="noopener" className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Globe size={13} /> Endole
          </a>
          <button onClick={enrich} disabled={enriching} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12, opacity: enriching ? 0.6 : 1 }}>
            {enriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {enriching ? 'Enriching...' : 'AI Enrich'}
          </button>
        </div>
      </div>

      {/* AI Enrichment */}
      {enrichment && (
        <div className="card" style={{ marginBottom: 24, padding: 20, borderLeft: '2px solid var(--accent)' }}>
          <p className="meta-label" style={{ marginBottom: 8 }}>AI Research Summary</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{enrichment}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['overview', 'financials', 'officers', 'ownership', 'filings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="btn-ghost"
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              textTransform: 'capitalize',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <InfoCard title="Company Details">
            <InfoRow label="Name" value={data.name} />
            <InfoRow label="Number" value={data.number} />
            <InfoRow label="Status" value={data.status} />
            <InfoRow label="Type" value={data.type} />
            <InfoRow label="Incorporated" value={data.incorporatedOn} />
            {data.dissolvedOn && <InfoRow label="Dissolved" value={data.dissolvedOn} />}
            <InfoRow label="Address" value={addr} />
          </InfoCard>
          <InfoCard title="SIC Codes">
            {data.sicCodes.map(s => (
              <InfoRow key={s} label={s} value={SIC_DESCRIPTIONS[s] || 'Industry classification'} />
            ))}
          </InfoCard>
          <InfoCard title="Accounts">
            {data.lastAccounts && <InfoRow label="Last Accounts" value={data.lastAccounts.made_up_to} />}
            {data.nextAccounts && <InfoRow label="Next Due" value={data.nextAccounts.due_on} />}
            {data.lastAccounts && <InfoRow label="Type" value={data.lastAccounts.type} />}
          </InfoCard>
          <InfoCard title="Quick Stats">
            <InfoRow label="Active Officers" value={String(activeOfficers.length)} />
            <InfoRow label="PSCs" value={String(data.pscs.length)} />
            <InfoRow label="Account Filings" value={String(data.financials.length)} />
            <InfoRow label="Charges" value={data.hasCharges ? `${data.charges.length} charge(s)` : 'None'} />
          </InfoCard>
        </div>
      )}

      {activeTab === 'financials' && (
        <div>
          <p className="meta-label" style={{ marginBottom: 16 }}>Account Filings (Last 6 Years)</p>
          {data.financials.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No account filings found.</p>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                    <th style={{ ...th }}>Date</th>
                    <th style={{ ...th }}>Made Up To</th>
                    <th style={{ ...th }}>Type</th>
                    <th style={{ ...th }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.financials.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...td }}>{f.date}</td>
                      <td style={{ ...td }}>{f.madeUpTo || '-'}</td>
                      <td style={{ ...td }}><span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{f.type}</span></td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'officers' && (
        <div>
          <p className="meta-label" style={{ marginBottom: 16 }}>Active Officers ({activeOfficers.length})</p>
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {activeOfficers.map((o, i) => (
              <OfficerCard key={i} officer={o} />
            ))}
          </div>
          {formerOfficers.length > 0 && (
            <>
              <p className="meta-label" style={{ marginBottom: 16, marginTop: 24 }}>Former Officers ({formerOfficers.length})</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {formerOfficers.map((o, i) => (
                  <OfficerCard key={i} officer={o} former />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'ownership' && (
        <div>
          <p className="meta-label" style={{ marginBottom: 16 }}>Persons with Significant Control ({data.pscs.length})</p>
          {data.pscs.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No PSCs recorded.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {data.pscs.map((p, i) => (
                <div key={i} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                    <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{p.kind?.replace(/-/g, ' ')}</span>
                  </div>
                  {p.naturesOfControl && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {p.naturesOfControl.map((c, j) => (
                        <span key={j} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {c.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {p.notifiedOn && <span>Notified: {p.notifiedOn}</span>}
                    {p.nationality && <span>{p.nationality}</span>}
                    {p.countryOfResidence && <span>{p.countryOfResidence}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'filings' && (
        <div>
          <p className="meta-label" style={{ marginBottom: 16 }}>All Account Filings</p>
          {data.financials.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <FileText size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{f.description}</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Filed: {f.date} | Made up to: {f.madeUpTo || '-'} | Type: {f.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAddress(addr: Record<string, string>) {
  if (!addr) return '';
  return [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country].filter(Boolean).join(', ');
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <p className="meta-label" style={{ marginBottom: 12 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function OfficerCard({ officer, former }: { officer: Officer; former?: boolean }) {
  return (
    <div className="card" style={{ padding: 16, opacity: former ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{officer.name}</span>
        <span className="badge" style={{ background: former ? 'transparent' : 'var(--accent-light)', color: former ? 'var(--text-tertiary)' : 'var(--accent)', border: '1px solid var(--border)' }}>
          {officer.role?.replace(/-/g, ' ')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
        <span>Appointed: {officer.appointedOn}</span>
        {officer.resignedOn && <span>Resigned: {officer.resignedOn}</span>}
        {officer.occupation && <span>{officer.occupation}</span>}
        {officer.nationality && <span>{officer.nationality}</span>}
      </div>
      <a href={officer.linkedin} target="_blank" rel="noopener"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 8 }}>
        <AtSign size={12} /> LinkedIn
      </a>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)' };
const td: React.CSSProperties = { padding: '10px 14px' };

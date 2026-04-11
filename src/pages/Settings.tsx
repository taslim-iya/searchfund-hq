import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Key, User, FileText, Check } from 'lucide-react';

export default function Settings() {
  const { config, updateConfig } = useAppStore();
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>API keys, fund details, and outreach templates</p>
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2"><Key size={13} style={{ color: 'var(--accent)' }} /> API Keys</h3>
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Companies House API Key</label>
              <input value={config.companiesHouseKey} onChange={e => updateConfig({ companiesHouseKey: e.target.value })} type="password" className="input text-[12px]" placeholder="CH API key" />
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Free at developer.company-information.service.gov.uk</p>
            </div>
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>OpenAI API Key</label>
              <input value={config.openaiKey} onChange={e => updateConfig({ openaiKey: e.target.value })} type="password" className="input text-[12px]" placeholder="sk-..." />
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>For AI enrichment reports and outreach message generation</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2"><User size={13} style={{ color: 'var(--purple)' }} /> Fund Details</h3>
          <div className="space-y-2.5">
            <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Your Name</label>
              <input value={config.ownerName} onChange={e => updateConfig({ ownerName: e.target.value })} className="input text-[12px]" placeholder="Taslim" /></div>
            <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Your Email</label>
              <input value={config.ownerEmail} onChange={e => updateConfig({ ownerEmail: e.target.value })} className="input text-[12px]" placeholder="you@fund.com" type="email" /></div>
            <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Fund Name</label>
              <input value={config.fundName} onChange={e => updateConfig({ fundName: e.target.value })} className="input text-[12px]" placeholder="Your Search Fund" /></div>
            <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>Email Signature</label>
              <textarea value={config.emailSignature} onChange={e => updateConfig({ emailSignature: e.target.value })} className="input text-[12px]" rows={3} placeholder="Best regards,&#10;Taslim&#10;Your Search Fund" /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2"><FileText size={13} style={{ color: 'var(--accent-2)' }} /> Outreach Template</h3>
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>Variables: {'{ownerName}'}, {'{companyName}'}, {'{sector}'}, {'{strength}'}, {'{senderName}'}</p>
          <textarea value={config.outreachTemplate} onChange={e => updateConfig({ outreachTemplate: e.target.value })} className="input text-[12px]" rows={8} style={{ resize: 'vertical', lineHeight: '1.6' }} />
        </div>

        <button onClick={save} className="btn-primary text-[12px]">
          {saved ? <><Check size={12} /> Saved</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

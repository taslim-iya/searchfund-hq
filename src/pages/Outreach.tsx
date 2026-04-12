import { useState } from 'react';
import { useAppStore, type OutreachStatus } from '@/store/appStore';
import { Send, Sparkles, Loader2, CheckCircle, Clock, AlertCircle, Mail, Eye, Edit, X } from 'lucide-react';

const STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  'pending-review': { label: 'Pending Review', color: 'var(--accent-3)' },
  approved: { label: 'Approved', color: 'var(--accent)' },
  sent: { label: 'Sent', color: 'var(--accent-2)' },
  replied: { label: 'Replied', color: '#ec4899' },
  bounced: { label: 'Bounced', color: 'var(--danger)' },
};

export default function Outreach() {
  const { companies, updateCompany, addActivity, config } = useAppStore();
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [sending, setSending] = useState(false);

  const enriched = companies.filter(c => c.stage === 'enriched' || c.stage === 'outreach-ready' || c.stage === 'outreach-sent' || c.stage === 'replied');
  const readyToSend = companies.filter(c => c.outreachStatus === 'approved' && c.ownerEmail);
  const pendingReview = companies.filter(c => c.outreachStatus === 'pending-review');

  const generateMessage = async (id: string) => {
    const c = companies.find(x => x.id === id);
    if (!c) return;
    setGenerating(prev => new Set(prev).add(id));

    let message = '';
    if (config.openaiKey) {
      try {
        const resp = await fetch('/api/ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: config.openaiKey,
            systemPrompt: `You write cold outreach emails for a search fund. The tone is professional but warm — founder-to-founder. Keep it under 150 words. No fluff. Be specific about why you're reaching out to THIS company.`,
            messages: [{ role: 'user', content: `Write an outreach email to:\n\nCompany: ${c.name}\nOwner: ${c.ownerName || 'the business owner'}\nSector: ${c.sector || 'their sector'}\nLocation: ${c.location || 'UK'}\nWebsite: ${c.website || 'N/A'}\n\nSearch fund details:\nSender: ${config.ownerName || 'Taslim'}\nFund: ${config.fundName || 'our search fund'}\n\nInsights from report:\n${c.report || 'No report available — write a general but compelling message.'}\n\nTemplate reference:\n${config.outreachTemplate}\n\nWrite ONLY the email body. No subject line.` }],
          }),
        });
        const data = await resp.json();
        message = data.content || '';
      } catch { /* AI failed */ }
    }

    if (!message) {
      message = config.outreachTemplate
        .replace(/{ownerName}/g, c.ownerName || 'there')
        .replace(/{companyName}/g, c.name)
        .replace(/{sector}/g, c.sector || 'your industry')
        .replace(/{strength}/g, 'what you\'ve built')
        .replace(/{senderName}/g, config.ownerName || 'Taslim');
    }

    updateCompany(id, { outreachMessage: message, outreachStatus: 'pending-review', stage: 'outreach-ready' });
    addActivity({ id: crypto.randomUUID(), action: `Generated outreach for ${c.name}`, detail: 'Pending your review', timestamp: new Date().toISOString(), type: 'info' });
    setGenerating(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const generateAll = async () => {
    const targets = enriched.filter(c => !c.outreachMessage && c.stage === 'enriched');
    for (const c of targets.slice(0, 10)) {
      await generateMessage(c.id);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const approve = (id: string) => {
    updateCompany(id, { outreachStatus: 'approved' });
    addActivity({ id: crypto.randomUUID(), action: `Approved outreach for ${companies.find(c => c.id === id)?.name}`, detail: '', timestamp: new Date().toISOString(), type: 'success' });
  };

  const sendAll = async () => {
    setSending(true);
    for (const c of readyToSend) {
      // Simulate sending (in production this would call an email API)
      await new Promise(r => setTimeout(r, 800));
      updateCompany(c.id, { outreachStatus: 'sent', outreachSentAt: new Date().toISOString(), stage: 'outreach-sent' });
      addActivity({ id: crypto.randomUUID(), action: `Sent email to ${c.ownerName} at ${c.name}`, detail: c.ownerEmail, timestamp: new Date().toISOString(), type: 'success' });
    }
    setSending(false);
  };

  const previewCo = preview ? companies.find(c => c.id === preview) : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Outreach</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {pendingReview.length} pending review · {readyToSend.length} approved · {companies.filter(c => c.outreachStatus === 'sent').length} sent
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAll} disabled={generating.size > 0} className="btn-secondary text-[12px]">
            <Sparkles size={12} /> Generate All
          </button>
          {readyToSend.length > 0 && (
            <button onClick={sendAll} disabled={sending} className="btn-primary text-[12px]">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send Approved ({readyToSend.length})
            </button>
          )}
        </div>
      </div>

      {/* Pending review */}
      {pendingReview.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[13px] font-semibold mb-2 flex items-center gap-2"><Clock size={13} style={{ color: 'var(--accent-3)' }} /> Pending Your Review</h3>
          <div className="space-y-2">
            {pendingReview.map(c => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-semibold">{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.ownerName} · {c.ownerEmail || 'No email'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setPreview(c.id); setEditMsg(c.outreachMessage); }} className="btn-secondary text-[10px] py-1 px-2"><Eye size={10} /> Review</button>
                    <button onClick={() => approve(c.id)} className="btn-primary text-[10px] py-1 px-2"><CheckCircle size={10} /> Approve</button>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg text-[11px] line-clamp-3" style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)' }}>{c.outreachMessage}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All companies */}
      <div className="space-y-1.5">
        {enriched.length === 0 ? (
          <div className="card p-12 text-center">
            <Send size={24} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No enriched companies. Enrich your pipeline first.</p>
          </div>
        ) : enriched.map(c => {
          const sc = STATUS_CONFIG[c.outreachStatus];
          return (
            <div key={c.id} className="card p-3.5 flex items-center gap-3">
              <Mail size={14} className="flex-shrink-0" style={{ color: sc.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate">{c.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.ownerName || 'No owner'} · {c.ownerEmail || 'No email'}</p>
              </div>
              <span className="badge text-[9px]" style={{ background: `${sc.color}10`, color: sc.color }}>{sc.label}</span>
              {!c.outreachMessage ? (
                <button onClick={() => generateMessage(c.id)} disabled={generating.has(c.id)} className="btn-secondary text-[10px] py-1 px-2">
                  {generating.has(c.id) ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Generate
                </button>
              ) : c.outreachStatus === 'pending-review' ? (
                <button onClick={() => approve(c.id)} className="btn-primary text-[10px] py-1 px-2"><CheckCircle size={10} /> Approve</button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Preview/edit modal */}
      {previewCo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Outreach: {previewCo.name}</h2>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>To: {previewCo.ownerName} &lt;{previewCo.ownerEmail || 'no email'}&gt;</p>
              </div>
              <button onClick={() => setPreview(null)}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <textarea value={editMsg} onChange={e => setEditMsg(e.target.value)} className="input text-[12px] mb-3" rows={12} style={{ resize: 'vertical', lineHeight: '1.6' }} />
            <div className="flex justify-end gap-2">
              <button onClick={() => { updateCompany(previewCo.id, { outreachMessage: editMsg }); setPreview(null); }} className="btn-secondary text-[12px]"><Edit size={12} /> Save Draft</button>
              <button onClick={() => { updateCompany(previewCo.id, { outreachMessage: editMsg, outreachStatus: 'approved' }); setPreview(null); }} className="btn-primary text-[12px]"><CheckCircle size={12} /> Approve & Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

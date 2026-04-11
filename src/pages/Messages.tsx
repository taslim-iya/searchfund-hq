import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { MessageSquare, Send, Users } from 'lucide-react';

export default function Messages() {
  const { messages, interns, addMessage, markRead, config } = useAppStore();
  const [selectedIntern, setSelectedIntern] = useState<string>('all');
  const [text, setText] = useState('');

  const filtered = messages.filter(m => {
    if (selectedIntern === 'all') return true;
    return m.fromId === selectedIntern || m.to === selectedIntern;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const send = () => {
    if (!text.trim()) return;
    addMessage({
      id: crypto.randomUUID(),
      from: config.ownerName || 'You',
      fromId: 'owner',
      to: selectedIntern === 'all' ? 'all' : selectedIntern,
      text,
      companyId: '',
      timestamp: new Date().toISOString(),
      read: true,
    });
    setText('');
  };

  // Mark visible messages as read
  filtered.filter(m => !m.read && m.to === 'owner').forEach(m => markRead(m.id));

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Messages</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Communicate with your interns</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <button onClick={() => setSelectedIntern('all')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium mb-1 transition-colors"
            style={{ background: selectedIntern === 'all' ? 'var(--accent-light)' : 'transparent', color: selectedIntern === 'all' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <Users size={14} /> All Team
          </button>
          {interns.map(i => {
            const unread = messages.filter(m => m.fromId === i.id && !m.read && m.to === 'owner').length;
            return (
              <button key={i.id} onClick={() => setSelectedIntern(i.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: selectedIntern === i.id ? 'var(--accent-light)' : 'transparent', color: selectedIntern === i.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: 'var(--accent)' }}>
                  {i.name[0]}
                </div>
                <span className="truncate">{i.name}</span>
                {unread > 0 && <span className="ml-auto w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ background: 'var(--danger)' }}>{unread}</span>}
              </button>
            );
          })}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col card overflow-hidden">
          {/* Mobile intern select */}
          <div className="md:hidden p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <select value={selectedIntern} onChange={e => setSelectedIntern(e.target.value)} className="input text-[12px]">
              <option value="all">All Team</option>
              {interns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare size={24} className="mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No messages yet. Start the conversation!</p>
              </div>
            ) : filtered.map(m => (
              <div key={m.id} className={`flex ${m.fromId === 'owner' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%] px-3.5 py-2.5 rounded-xl" style={{
                  background: m.fromId === 'owner' ? 'var(--accent)' : 'var(--bg-alt)',
                  color: m.fromId === 'owner' ? 'white' : 'var(--text-primary)',
                  borderBottomRightRadius: m.fromId === 'owner' ? '4px' : undefined,
                  borderBottomLeftRadius: m.fromId !== 'owner' ? '4px' : undefined,
                }}>
                  {m.fromId !== 'owner' && <p className="text-[10px] font-semibold mb-0.5" style={{ opacity: 0.7 }}>{m.from}</p>}
                  <p className="text-[13px] leading-relaxed">{m.text}</p>
                  <p className="text-[9px] mt-1" style={{ opacity: 0.6 }}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              className="input text-[13px] flex-1" placeholder={selectedIntern === 'all' ? 'Message all interns...' : `Message ${interns.find(i => i.id === selectedIntern)?.name || ''}...`} />
            <button onClick={send} disabled={!text.trim()} className="btn-primary text-[12px]"><Send size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

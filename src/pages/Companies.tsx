import { useState } from 'react';
import { useAppStore, emptyCompany, type Company, type CompanyStage } from '@/store/appStore';
import { Plus, Search, Upload, FileDown, X, Briefcase, ChevronRight, Building2, ExternalLink, Trash2, Edit } from 'lucide-react';

const STAGES: CompanyStage[] = ['imported', 'researching', 'enriched', 'outreach-ready', 'outreach-sent', 'replied', 'meeting', 'passed'];
const STAGE_COLORS: Record<CompanyStage, string> = { imported: '#999', researching: '#3b82f6', enriched: '#8b5cf6', 'outreach-ready': '#f59e0b', 'outreach-sent': '#6366f1', replied: '#10b981', meeting: '#ec4899', passed: '#ef4444' };

export default function Companies() {
  const { companies, interns, addCompany, updateCompany, removeCompany, importCompanies, addActivity } = useAppStore();
  const [search, setSearch] = useState('');
  const [stageF, setStageF] = useState<CompanyStage | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', website: '', sector: '', location: '', ownerName: '', ownerEmail: '', companiesHouseNumber: '' });

  const filtered = companies
    .filter(c => {
      if (search) { const q = search.toLowerCase(); if (!c.name.toLowerCase().includes(q) && !c.sector.toLowerCase().includes(q) && !c.ownerName.toLowerCase().includes(q)) return false; }
      if (stageF !== 'all' && c.stage !== stageF) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const add = () => {
    if (!form.name.trim()) return;
    addCompany(emptyCompany({ ...form, stage: 'imported' }));
    addActivity({ id: crypto.randomUUID(), action: `Added: ${form.name}`, detail: form.sector, timestamp: new Date().toISOString(), type: 'success' });
    setForm({ name: '', website: '', sector: '', location: '', ownerName: '', ownerEmail: '', companiesHouseNumber: '' });
    setShowAdd(false);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = (ev.target?.result as string).split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      const hdr = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const col = (names: string[]) => hdr.findIndex(h => names.some(n => h.includes(n)));
      const nameI = col(['name', 'company']); const sectorI = col(['sector', 'industry']);
      const locI = col(['location', 'city']); const webI = col(['website', 'url']);
      const ownerI = col(['owner', 'director', 'contact']); const emailI = col(['email']);
      const chI = col(['companies house', 'company number']);

      const newCos = lines.slice(1).map(line => {
        const cols: string[] = []; let cur = ''; let inQ = false;
        for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; } else cur += ch; }
        cols.push(cur.trim());
        const get = (i: number) => (i >= 0 && i < cols.length ? cols[i].replace(/^["']|["']$/g, '').trim() : '');
        const name = get(nameI); if (!name) return null;
        return emptyCompany({ name, sector: get(sectorI), location: get(locI), website: get(webI), ownerName: get(ownerI), ownerEmail: get(emailI), companiesHouseNumber: get(chI), source: 'csv-import' });
      }).filter(Boolean) as Company[];
      importCompanies(newCos);
      addActivity({ id: crypto.randomUUID(), action: `Imported ${newCos.length} companies from CSV`, detail: file.name, timestamp: new Date().toISOString(), type: 'success' });
    };
    reader.readAsText(file); e.target.value = '';
  };

  const exportCSV = () => {
    const h = ['Name','Sector','Location','Website','Owner','Email','Stage','Score','CH#'];
    const rows = filtered.map(c => [c.name,c.sector,c.location,c.website,c.ownerName,c.ownerEmail,c.stage,c.score,c.companiesHouseNumber].map(v=>`"${v}"`).join(','));
    const blob = new Blob([h.join(',')+'\n'+rows.join('\n')],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`pipeline-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div><h1 className="text-xl font-bold tracking-tight">Pipeline</h1><p className="text-[13px]" style={{color:'var(--text-secondary)'}}>{companies.length} companies</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary cursor-pointer text-[12px]"><Upload size={12} /> Import CSV<input type="file" accept=".csv" onChange={handleCSV} hidden /></label>
          <button onClick={exportCSV} className="btn-secondary text-[12px]"><FileDown size={12} /> Export</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-[12px]"><Plus size={12} /> Add</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{color:'var(--text-tertiary)'}}/><input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-8 text-[12px]" placeholder="Search..." /></div>
        <select value={stageF} onChange={e=>setStageF(e.target.value as any)} className="input w-auto text-[12px]" style={{minWidth:130}}>
          <option value="all">All stages</option>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
              {['Company','Sector','Owner','Stage','Score',''].map(h=><th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{color:'var(--text-tertiary)',background:'var(--bg-alt)'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-[13px]" style={{color:'var(--text-tertiary)'}}>No companies. Add manually or import CSV.</td></tr> :
              filtered.map(c => (
                <tr key={c.id} onClick={() => setDetail(c)} className="cursor-pointer hover:bg-[var(--surface-hover)] transition-colors" style={{borderBottom:'1px solid var(--border-light)'}}>
                  <td className="px-3 py-2.5"><p className="text-[12px] font-medium">{c.name}</p>{c.location && <p className="text-[10px]" style={{color:'var(--text-tertiary)'}}>{c.location}</p>}</td>
                  <td className="px-3 py-2.5 text-[11px]" style={{color:'var(--text-secondary)'}}>{c.sector || '—'}</td>
                  <td className="px-3 py-2.5"><p className="text-[11px]">{c.ownerName || '—'}</p>{c.ownerEmail && <p className="text-[9px]" style={{color:'var(--text-tertiary)'}}>{c.ownerEmail}</p>}</td>
                  <td className="px-3 py-2.5"><span className="badge text-[9px] capitalize" style={{background:`${STAGE_COLORS[c.stage]}10`,color:STAGE_COLORS[c.stage]}}>{c.stage.replace('-',' ')}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[11px] font-bold mono" style={{color:c.score>=70?'#10b981':c.score>=40?'#f59e0b':'var(--text-tertiary)'}}>{c.score || '—'}</span></td>
                  <td className="px-3 py-2.5"><ChevronRight size={14} style={{color:'var(--text-tertiary)'}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail slide-out */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={()=>setDetail(null)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.3)'}} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10" style={{borderColor:'var(--border)'}}>
              <h2 className="text-base font-semibold">{detail.name}</h2>
              <button onClick={()=>setDetail(null)}><X size={16} style={{color:'var(--text-tertiary)'}}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-center"><p className="text-3xl font-bold mono" style={{color:detail.score>=70?'#10b981':detail.score>=40?'#f59e0b':'var(--text-tertiary)'}}>{detail.score || 0}</p><p className="text-[10px]" style={{color:'var(--text-tertiary)'}}>Score</p></div>
                <select value={detail.stage} onChange={e=>{updateCompany(detail.id,{stage:e.target.value as CompanyStage});setDetail({...detail,stage:e.target.value as CompanyStage})}} className="input text-[11px] flex-1">
                  {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {[['Sector','sector'],['Location','location'],['Website','website'],['CH#','companiesHouseNumber'],['Revenue','revenue'],['Employees','employees'],['Owner','ownerName'],['Email','ownerEmail'],['Phone','ownerPhone'],['LinkedIn','ownerLinkedin'],['Source','source']].map(([label,key])=>(
                <div key={key} className="flex items-center justify-between py-1 border-b" style={{borderColor:'var(--border-light)'}}>
                  <span className="text-[10px] font-medium" style={{color:'var(--text-tertiary)'}}>{label}</span>
                  <span className="text-[11px] text-right max-w-[220px] truncate" style={{color:(detail as any)[key]?'var(--text-primary)':'var(--text-tertiary)'}}>{(detail as any)[key]||'—'}</span>
                </div>
              ))}
              {detail.report && <div><p className="text-[10px] font-medium mb-1" style={{color:'var(--text-tertiary)'}}>Report</p><div className="p-3 rounded-lg text-[11px] whitespace-pre-wrap leading-relaxed" style={{background:'var(--bg-alt)'}}>{detail.report}</div></div>}
              <div className="flex gap-2 pt-2">
                {detail.website && <a href={detail.website.startsWith('http')?detail.website:`https://${detail.website}`} target="_blank" className="btn-secondary text-[10px] py-1 px-2"><ExternalLink size={10}/> Website</a>}
                {detail.companiesHouseNumber && <a href={`https://find-and-update.company-information.service.gov.uk/company/${detail.companiesHouseNumber}`} target="_blank" className="btn-secondary text-[10px] py-1 px-2"><Building2 size={10}/> CH</a>}
                <button onClick={()=>{removeCompany(detail.id);setDetail(null)}} className="btn-danger text-[10px] py-1 px-2"><Trash2 size={10}/> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">Add Company</h2><button onClick={()=>setShowAdd(false)}><X size={16} style={{color:'var(--text-tertiary)'}}/></button></div>
            <div className="grid grid-cols-2 gap-2.5">
              {[{l:'Company Name *',k:'name',s:2,p:'Acme Ltd'},{l:'Website',k:'website',s:2,p:'acme.co.uk'},{l:'Sector',k:'sector',p:'Technology'},{l:'Location',k:'location',p:'London'},{l:'Owner/Director',k:'ownerName',p:'John Smith'},{l:'Email',k:'ownerEmail',p:'john@acme.co.uk'},{l:'CH Number',k:'companiesHouseNumber',s:2,p:'12345678'}].map(f=>(
                <div key={f.k} className={f.s===2?'col-span-2':''}><label className="text-[10px] font-medium mb-0.5 block" style={{color:'var(--text-tertiary)'}}>{f.l}</label><input value={(form as any)[f.k]} onChange={e=>setForm(prev=>({...prev,[f.k]:e.target.value}))} className="input text-[12px]" placeholder={f.p}/></div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4"><button onClick={()=>setShowAdd(false)} className="btn-secondary text-[12px]">Cancel</button><button onClick={add} disabled={!form.name.trim()} className="btn-primary text-[12px]">Add</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

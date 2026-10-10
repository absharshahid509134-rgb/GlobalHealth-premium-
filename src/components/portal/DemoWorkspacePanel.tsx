import React, { useState } from 'react';
import { Plus, Trash2, FlaskConical } from 'lucide-react';
import { apiFetch } from '../../services/authClient';
import type { PlatformRole } from '../../core/platformRoles';

export interface DemoItem { id: string; title: string; detail: string; status: string; updatedAt: string }
export interface DemoSection {
  id: string; title: string; description: string; itemLabel: string; statuses: string[]; items: DemoItem[];
}

const STATUS_TONES = [
  'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'bg-sky-50 text-sky-800 ring-sky-200',
  'bg-amber-50 text-amber-800 ring-amber-200',
  'bg-slate-100 text-slate-700 ring-slate-200',
];
const toneFor = (section: DemoSection, status: string) =>
  STATUS_TONES[Math.max(0, section.statuses.indexOf(status)) % STATUS_TONES.length];

/**
 * Interactive, session-private sample data for the professional demo sandboxes.
 * Every change is written to the visitor's own in-memory sandbox on the server
 * and is discarded at sign-out or after four hours without activity.
 */
export function DemoWorkspacePanel({ role, sections, onChanged }: {
  role: PlatformRole; sections: DemoSection[]; onChanged: () => void;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const section = sections.find((s) => s.id === activeId) || sections[0];
  if (!section) return <p className="text-slate-500">No sample data is available.</p>;
  const base = `/api/portals/${role}/demo/items`;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'That change could not be saved.'); }
    finally { setBusy(false); }
  };

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await apiFetch(base, { method: 'POST', body: { sectionId: section.id, title, detail } });
      setTitle(''); setDetail('');
    });
  };

  return <div className="space-y-5">
    <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Sandbox data only. Add, update or remove anything — changes stay in your private session and clear at sign-out or after 4 hours of inactivity. Do not enter real health information.</span>
    </p>
    <div role="tablist" aria-label="Sandbox sections" className="flex flex-wrap gap-2">
      {sections.map((s) => <button key={s.id} role="tab" aria-selected={s.id === section.id} onClick={() => { setActiveId(s.id); setError(''); }}
        className={`rounded-full px-4 py-1.5 text-xs font-bold ${s.id === section.id ? 'bg-medical-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
        {s.title} <span className="ml-1 opacity-70">{s.items.length}</span>
      </button>)}
    </div>
    <p className="text-sm text-slate-600">{section.description}</p>
    <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]" aria-label={`Add ${section.itemLabel}`}>
      <label className="text-xs font-semibold text-slate-700">Name
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder={`New ${section.itemLabel}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
      </label>
      <label className="text-xs font-semibold text-slate-700">Note (optional)
        <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={240} placeholder="Short description" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
      </label>
      <button disabled={busy || !title.trim()} className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-medical-700 px-4 py-2 text-sm font-bold text-white hover:bg-medical-800 disabled:opacity-50"><Plus size={16} />Add {section.itemLabel}</button>
    </form>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <ul className="space-y-3">
      {section.items.length === 0 && <li className="text-sm text-slate-500">Nothing here yet. Add your first {section.itemLabel} above.</li>}
      {section.items.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 break-words text-sm text-slate-600">{item.detail}</p>
            <p className="mt-2 text-[11px] text-slate-400">Updated <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString()}</time></p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${toneFor(section, item.status)}`}>{item.status}</span>
            <select aria-label={`Status of ${item.title}`} value={item.status} disabled={busy}
              onChange={(e) => void run(() => apiFetch(`${base}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: { status: e.target.value } }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
              {section.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" disabled={busy} aria-label={`Remove ${item.title}`}
              onClick={() => void run(() => apiFetch(`${base}/${encodeURIComponent(item.id)}`, { method: 'DELETE' }))}
              className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"><Trash2 size={14} /></button>
          </div>
        </div>
      </li>)}
    </ul>
  </div>;
}

import React, { useState } from 'react';
import { BookOpen, LifeBuoy, Search } from 'lucide-react';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorHelp: React.FC<{ section: 'help' | 'support' }> = ({ section }) => section === 'support' ? (
  <DoctorUnavailable title="Support tickets unavailable" message="The support-ticket service is not connected to this Doctor Portal session." scope="No ticket, response, support status, or notification is created in the browser. Use the organization’s approved support channel." />
) : <HelpCenterView />;

const FAQS = [
  ['How do I complete verification?', 'Submit a professional review request with credential documents. An authorized organization must approve it before an account is activated.'],
  ['Why can’t I see a patient?', 'The patient list contains only active server-side doctor–patient relationships. A denied or unknown lookup never becomes a search result.'],
  ['How does patient consent work?', 'A clinician may request a scope, but only the authenticated patient can approve or deny it in the User workspace.'],
  ['Why are clinical orders unavailable?', 'Laboratory, imaging, notes, billing, scheduling, and messaging writes require verified service integrations. This portal fails closed when they are absent.'],
  ['What is emergency access?', 'Break-glass access is a separate, reason-required, time-limited, view-only server workflow. Every activation and view is audited and the patient is notified where supported.'],
];

const HelpCenterView: React.FC = () => {
  const [query, setQuery] = useState('');
  const list = FAQS.filter(([title, body]) => `${title} ${body}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Help Center</h2><p className="text-xs text-slate-500">Portal usage and security boundaries. This page never provides medical guidance.</p></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><label className="relative block"><span className="sr-only">Search help articles</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pl-10 text-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20" /></label><ul className="mt-4 space-y-2">{list.map(([title, body]) => <li key={title} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"><p className="text-xs font-extrabold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{body}</p></li>)}{list.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No articles match “{query}”.</p>}</ul></section><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><BookOpen className="h-3.5 w-3.5 text-medical-500" /> Help content is not a clinical or regulatory determination.</p><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><LifeBuoy className="h-3.5 w-3.5 text-medical-500" /> Use an approved organization support channel for account or credential issues.</p></div>;
};

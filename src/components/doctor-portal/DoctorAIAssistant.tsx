import React, { useState } from 'react';
import { Bot, X, ShieldAlert, Server } from 'lucide-react';

/**
 * AI is deliberately not wired to the doctor workspace yet. The general
 * GlobalHealth assistant has a separate authenticated-user boundary and must
 * not receive clinician-entered PHI or appear to summarize an EHR it cannot
 * access. This keeps the entry point honest until an approved clinical AI
 * service with review/audit controls is connected.
 */
export const DoctorAIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close clinical AI status' : 'Open clinical AI status'} className="fixed bottom-6 right-6 z-[55] grid h-14 w-14 place-items-center rounded-full bg-slate-600 text-white shadow-xl transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400">
        <Bot className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-[55] w-[min(380px,calc(100vw-3rem))] rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Clinical AI status">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Bot className="h-4 w-4" /></span><div><p className="text-sm font-extrabold text-slate-900">Clinical AI decision support</p><p className="text-[10px] text-slate-500">Integration status</p></div></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 p-4">
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><Server className="mt-0.5 h-4 w-4 shrink-0" />An approved clinician-facing AI service is not connected in this environment. No patient record is sent to a model and no recommendation is generated.</p>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />Do not paste patient identifiers, notes, labs, images, or medication details into an unapproved AI tool.</p>
          </div>
        </div>
      )}
    </>
  );
};

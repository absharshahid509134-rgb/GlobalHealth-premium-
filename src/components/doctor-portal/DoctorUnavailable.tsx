import React from 'react';
import { Server, ShieldAlert } from 'lucide-react';

/**
 * Honest boundary for Doctor Portal areas that do not yet have a verified
 * server workflow. It is intentionally informational: no button in these
 * areas can create a local clinical/professional record that looks live.
 */
export const DoctorUnavailable: React.FC<{
  title: string;
  message?: string;
  scope?: string;
}> = ({ title, message = 'This area is not connected to a verified GlobalHealth service in this environment.', scope }) => (
  <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-soft" role="status">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
        <Server className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p>
        {scope && <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><ShieldAlert className="mr-1 inline h-3.5 w-3.5 text-amber-600" />{scope}</p>}
        <p className="mt-3 text-xs font-semibold text-slate-500">No record or status was created in the browser. Connect the approved service before enabling writes or displaying live data.</p>
      </div>
    </div>
  </section>
);

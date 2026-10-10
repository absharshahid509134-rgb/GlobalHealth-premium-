import React from 'react';
import { Building2, ShieldAlert } from 'lucide-react';
import { useDoctorPortal } from './doctorPortalData';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorAffiliations: React.FC = () => {
  const { doctor } = useDoctorPortal();
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600"><Building2 className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Practice locations</h2>
            <p className="mt-1 text-sm text-slate-600">{doctor.organization || 'No organization affiliation was returned by the authenticated server.'}</p>
          </div>
        </div>
      </section>
      <DoctorUnavailable
        title="Practice affiliations unavailable"
        message="Facility affiliation requests require an approved organization workflow that is not connected to this session."
        scope="No facility, department, or active affiliation is inferred from fixture data."
      />
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldAlert className="h-4 w-4 text-amber-600" /> Organization and facility access must be provisioned server-side before it can affect scheduling or patient access.</p>
    </div>
  );
};

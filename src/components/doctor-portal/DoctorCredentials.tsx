import React from 'react';
import { BadgeCheck, Clock3, ShieldAlert } from 'lucide-react';
import { useDoctorPortal } from './doctorPortalData';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorCredentials: React.FC = () => {
  const { doctor } = useDoctorPortal();
  const verified = doctor.verificationStatus === 'verified';
  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-5 shadow-soft ${verified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`} role="status">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-emerald-700">
            {verified ? <BadgeCheck className="h-5 w-5" /> : <Clock3 className="h-5 w-5 text-amber-700" />}
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Credential status: {verified ? 'Verified' : 'Pending review'}</h2>
            <p className="mt-1 text-sm text-slate-700">This status was returned by the authenticated GlobalHealth server. It is not asserted or changed by the browser.</p>
          </div>
        </div>
      </section>
      <DoctorUnavailable
        title="Credential management unavailable"
        message="Credential files, registry checks, renewals, and verification changes are controlled by the server-side organization review workflow."
        scope="The browser cannot add, verify, expire, or publish a professional credential. Contact the credentialing organization through an approved channel."
      />
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldAlert className="h-4 w-4 text-amber-600" /> Clinical access remains governed by the verified server account and active patient grants.</p>
    </div>
  );
};

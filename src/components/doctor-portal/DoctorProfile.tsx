import React from 'react';
import { BadgeCheck, Mail, Phone, UserRound } from 'lucide-react';
import { useDoctorPortal } from './doctorPortalData';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorProfileView: React.FC = () => {
  const { doctor } = useDoctorPortal();
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#0B1F3A] text-white"><UserRound className="h-6 w-6" /></span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{doctor.displayName}</h2>
              <p className="text-sm text-slate-600">{doctor.professionalTitle} · {doctor.specialty}</p>
              {doctor.organization && <p className="text-xs text-slate-500">{doctor.organization}</p>}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" /> Server verification: {doctor.verificationStatus}</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <p className="rounded-xl bg-slate-50 p-3 text-slate-600"><Mail className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />{doctor.workEmail || 'Work email not returned by server'}</p>
          <p className="rounded-xl bg-slate-50 p-3 text-slate-600"><Phone className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />{doctor.phone || 'Phone not returned by server'}</p>
        </div>
      </section>
      <DoctorUnavailable
        title="Profile editing unavailable"
        message="Only the verified server profile returned at sign-in is displayed in this session. Profile edits and public publishing are not connected to a server API."
        scope="No professional or public-profile changes are saved locally or presented as published."
      />
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Stethoscope, AlertCircle, Activity, Upload, FileCheck } from 'lucide-react';
import { SPECIALTIES, APPOINTMENT_DURATIONS, CONSULTATION_LABEL, ConsultationType } from './doctorPortalData';
import { doctorApi } from '../../services/doctorPortalClient';

interface DoctorOnboardingProps {
  workEmail: string;
  fullName?: string;
  phone?: string;
  password?: string;
  onSubmitted: (applicationId?: string) => void;
  onBack: () => void;
}

const STEPS = ['Account', 'Professional', 'Credentials', 'Affiliations', 'Availability', 'Verification', 'Review'];

/** Guided 7-step professional onboarding: Account → Professional info →
 *  Credentials → Affiliations → Availability → Verification → Review & Activate. */
export const DoctorOnboarding: React.FC<DoctorOnboardingProps> = ({ workEmail, fullName = '', phone: initialPhone = '', password = '', onSubmitted, onBack }) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 1 — account
  const [email, setEmail] = useState(workEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [organization, setOrganization] = useState('');

  // Step 2 — professional
  const [name, setName] = useState(fullName);
  const [title, setTitle] = useState('Consultant');
  const [specialty, setSpecialty] = useState(SPECIALTIES[11]);
  const [subSpecialty, setSubSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [years, setYears] = useState('');
  const [languages, setLanguages] = useState('English');
  const [bio, setBio] = useState('');

  // Step 3 — credentials
  const [licenseAuthority, setLicenseAuthority] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');

  // Step 4 — affiliations
  const [affiliationFacility, setAffiliationFacility] = useState('');
  const [affiliationDept, setAffiliationDept] = useState('');

  // Step 5 — availability
  const [consultTypes, setConsultTypes] = useState<ConsultationType[]>(['in_person']);
  const [duration, setDuration] = useState(30);

  // Step 6 — verification documents. Files are sent only to the authenticated
  // server review endpoint; they are never persisted in browser storage.
  const [uploaded, setUploaded] = useState<Array<{ name: string; type: string; size: number; dataUrl: string }>>([]);

  const toggleConsult = (c: ConsultationType) =>
    setConsultTypes((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const validate = (): boolean => {
    setError('');
    if (step === 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid professional email.'); return false; }
      if (!phone.trim()) { setError('Enter your phone number.'); return false; }
      if (!organization.trim()) { setError('Enter your organization or primary practice.'); return false; }
    }
    if (step === 1) {
      if (!name.trim()) { setError('Enter your full professional name.'); return false; }
      if (!qualifications.trim()) { setError('List at least one qualification.'); return false; }
    }
    if (step === 2) {
      if (!licenseAuthority.trim() || !licenseNumber.trim()) { setError('Enter your registration authority and number.'); return false; }
    }
    if (step === 5) {
      if (uploaded.length === 0) { setError('Upload at least one supporting document for server-side review.'); return false; }
    }
    return true;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const submitApplication = async () => {
    if (!validate()) return;
    if (password.length < 8) {
      setError('Your account password is missing. Return to sign up and start again.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await doctorApi.submitApplication({
      fullName: name.trim(),
      professionalTitle: title.trim(),
      specialty,
      subSpecialty: subSpecialty.trim() || undefined,
      qualifications: qualifications.split(',').map((q) => q.trim()).filter(Boolean),
      yearsOfPractice: Number(years) || 0,
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      bio: bio.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      organization: organization.trim(),
      registrationAuthority: licenseAuthority.trim(),
      registrationNo: licenseNumber.trim(),
      licenseExpiry: licenseExpiry || undefined,
      affiliationFacility,
      affiliationDepartment: affiliationDept.trim(),
      consultationTypes: consultTypes,
      appointmentDuration: duration,
      credentialDocuments: uploaded.map(({ name: fileName, type, size, dataUrl }) => ({ name: fileName, contentType: type, sizeBytes: size, dataUrl })),
      password,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'The verification request could not be submitted. Please retry.');
      return;
    }
    onSubmitted(result.applicationId);
  };

  const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20 transition';
  const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700';

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-medical-50/70 via-white to-medical-50/50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-medical-200/40 blur-3xl" />
      </div>

      <header className="relative z-30 border-b border-medical-100/80 bg-white/85 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button onClick={onBack} className="flex cursor-pointer items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-medical-500 to-medical-800 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-slate-900">Doctor Portal — Onboarding</span>
          </button>
          <span className="text-xs font-bold text-medical-700">Step {step + 1} of 7</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Onboarding progress">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className={`h-px flex-1 min-w-3 ${step >= i ? 'bg-medical-500' : 'bg-slate-200'}`} aria-hidden="true" />}
              <li className="flex shrink-0 items-center gap-1.5">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition ${
                  step === i ? 'bg-medical-600 text-white ring-4 ring-medical-100'
                    : step > i ? 'bg-medical-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`hidden text-[11px] font-bold sm:block ${step === i ? 'text-medical-800' : 'text-slate-400'}`}>{label}</span>
              </li>
            </React.Fragment>
          ))}
        </ol>

        <div className="relative rounded-3xl border border-medical-100/90 bg-white p-6 shadow-lift sm:p-8">
          <div aria-hidden="true" className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-medical-400 via-medical-500 to-medical-700" />
          <div className="relative">
            {error && (
              <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{error}</span>
              </div>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Account</h2>
                <p className="-mt-2 text-xs text-slate-500">Your secure portal identity. Never share these credentials.</p>
                <div>
                  <label className={labelCls} htmlFor="ob-email">Professional / Work Email</label>
                  <input id="ob-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ob-phone">Phone</label>
                  <input id="ob-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ob-org">Organization / primary practice</label>
                  <input id="ob-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Hospital, clinic or professional practice" className={inputCls} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Professional Information</h2>
                <p className="-mt-2 text-xs text-slate-500">Only verified information is published on your public profile.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ob-name">Full professional name</label>
                    <input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Dr. …" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ob-title">Professional title</label>
                    <input id="ob-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ob-spec">Primary specialty</label>
                    <select id="ob-spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputCls}>
                      {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ob-sub">Sub-specialty <span className="normal-case text-slate-400">(optional)</span></label>
                    <input id="ob-sub" value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)} className={inputCls} placeholder="e.g. Interventional" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ob-years">Years of practice</label>
                    <input id="ob-years" type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} placeholder="e.g. 10" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ob-quals">Qualifications <span className="normal-case text-slate-400">(comma separated)</span></label>
                    <input id="ob-quals" value={qualifications} onChange={(e) => setQualifications(e.target.value)} className={inputCls} placeholder="MBBS, MD (Medicine), DM (Cardiology)" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ob-langs">Languages <span className="normal-case text-slate-400">(comma separated)</span></label>
                    <input id="ob-langs" value={languages} onChange={(e) => setLanguages(e.target.value)} className={inputCls} placeholder="English, Hindi" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ob-bio">Professional biography</label>
                    <textarea id="ob-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} placeholder="A short, professional summary for patients…" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">License / Credential Information</h2>
                <p className="-mt-2 text-xs text-slate-500">Submitted privately for organization review. No verification or publication is asserted until the server-side review completes.</p>
                <div>
                  <label className={labelCls} htmlFor="ob-la">Issuing authority</label>
                  <input id="ob-la" value={licenseAuthority} onChange={(e) => setLicenseAuthority(e.target.value)} className={inputCls} placeholder="e.g. Delhi Medical Council" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="ob-ln">Registration number</label>
                    <input id="ob-ln" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ob-le">Validity until <span className="normal-case text-slate-400">(if applicable)</span></label>
                    <input id="ob-le" type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Practice Affiliations</h2>
                <p className="-mt-2 text-xs text-slate-500">Request an affiliation — the facility must approve before you are represented as working there.</p>
                <div>
                  <label className={labelCls} htmlFor="ob-fac">Organization or practice</label>
                  <input id="ob-fac" value={affiliationFacility} onChange={(e) => setAffiliationFacility(e.target.value)} className={inputCls} placeholder="Enter the organization that should review this affiliation" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="ob-dept">Department</label>
                  <input id="ob-dept" value={affiliationDept} onChange={(e) => setAffiliationDept(e.target.value)} className={inputCls} placeholder="e.g. Cardiology" />
                </div>
                <p className="text-[11px] text-slate-400">You can add more affiliations later from the workspace.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Availability</h2>
                <p className="-mt-2 text-xs text-slate-500">Only expose consultation types you actually support.</p>
                <div>
                  <span className={labelCls}>Consultation types</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(CONSULTATION_LABEL) as ConsultationType[]).map((c) => (
                      <button key={c} type="button" onClick={() => toggleConsult(c)}
                        className={`cursor-pointer rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                          consultTypes.includes(c) ? 'border-medical-500 bg-medical-50 text-medical-800' : 'border-slate-200 bg-white text-slate-500 hover:border-medical-200'
                        }`}>
                        {CONSULTATION_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ob-dur">Appointment duration</label>
                  <div className="flex flex-wrap gap-2">
                    {APPOINTMENT_DURATIONS.map((d) => (
                      <button key={d} type="button" onClick={() => setDuration(d)}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          duration === d ? 'border-medical-500 bg-medical-50 text-medical-800' : 'border-slate-200 bg-white text-slate-500 hover:border-medical-200'
                        }`}>
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Detailed working hours are configured in the workspace under Availability.</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Verification</h2>
                <p className="-mt-2 text-xs text-slate-500">Uploaded documents are encrypted, access-controlled and never made public.</p>
                <div className="rounded-2xl border-2 border-dashed border-medical-200 bg-medical-50/50 p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-medical-500" />
                  <p className="mt-2 text-xs font-bold text-medical-800">Registration certificate / license document</p>
                  <p className="text-[11px] text-slate-500">PDF, PNG, JPEG or WEBP, maximum 2 MB per file. Files are submitted to the protected review endpoint.</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-medical-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-medical-700">
                    <Upload className="h-3.5 w-3.5" /> Choose document
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { setError('Each credential document must be 2 MB or smaller.'); return; }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result;
                          if (typeof dataUrl === 'string') setUploaded((current) => [...current.filter((x) => x.name !== file.name), { name: file.name, type: file.type, size: file.size, dataUrl }]);
                        };
                        reader.readAsDataURL(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {uploaded.map((file) => (
                    <p key={file.name} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <FileCheck className="h-3 w-3" /> {file.name} · {(file.size / 1024).toFixed(0)} KB · ready for review
                    </p>
                  ))}
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-medical-50 p-3 text-[11px] text-medical-800">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-medical-600" />
                  <span>Verification flow: Credential Submission → Document Review → Professional Verification → Approval / Additional Information / Rejection.</span>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">Review & Activation</h2>
                <dl className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-xs">
                  {[
                    ['Name', name || '—'],
                    ['Title', title],
                    ['Specialty', specialty + (subSpecialty ? ` / ${subSpecialty}` : '')],
                    ['Qualifications', qualifications || '—'],
                    ['Work email', email],
                    ['Phone', phone || '—'],
                    ['Organization', organization || '—'],
                    ['Registration', `${licenseAuthority} · ${licenseNumber}`],
                    ['Affiliation request', affiliationFacility || 'None provided for review'],
                    ['Consultation types', consultTypes.map((c) => CONSULTATION_LABEL[c]).join(', ')],
                    ['Appointment duration', `${duration} min`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 font-bold text-slate-500">{k}</dt>
                      <dd className="break-all text-right font-medium text-slate-800">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>Your profile is <strong>not published</strong> until verification completes and you publish it. “Verified Doctor” is only shown after genuine verification.</span>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={step === 0 ? onBack : back}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Sign out' : 'Back'}
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-medical-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={submitApplication} disabled={busy}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-medical-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ShieldCheck className="h-4 w-4" />} Submit for credential review
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

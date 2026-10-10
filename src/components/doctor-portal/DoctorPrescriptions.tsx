import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { doctorApi, PrescriptionPreparationResponse } from '../../services/doctorPortalClient';
import { useClinicalWorkspace, PatientClinical, PrescriptionMedicine } from './doctorClinicalData';
import { useDoctorPortal } from './doctorPortalData';
import { evaluateCDS, ClinicalDecisionSupportBanner, CDSAlert } from './clinicalDecisionSupport';

export const DoctorPrescriptions: React.FC = () => {
  const { patients, selectedPatientId, selectPatient } = useClinicalWorkspace();
  const { doctor } = useDoctorPortal();
  const [patientId, setPatientId] = useState(selectedPatientId || '');
  const [stage, setStage] = useState<'list' | 'builder' | 'review' | 'result'>('list');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [form, setForm] = useState<PrescriptionMedicine>(emptyMedicine());
  const [allergyChecked, setAllergyChecked] = useState(false);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PrescriptionPreparationResponse | null>(null);

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
    if (patientId && selectedPatientId !== patientId) selectPatient(patientId);
  }, [patientId, patients, selectedPatientId, selectPatient]);

  const patient = patients.find((p) => p.id === patientId) || null;
  const authorized = !!patient && !!patient.dataSource && patient.accessStatus !== 'expired' && patient.accessStatus !== 'revoked' && patient.accessPermissions?.VIEW_EHR === true;
  const cdsAlerts: CDSAlert[] = useMemo(() => {
    if (!patient || medicines.length === 0) return [];
    return evaluateCDS(medicines, {
      allergies: patient.allergies,
      currentMedications: patient.medications.map((m) => m.name),
      conditions: patient.conditions,
      age: patient.age || undefined,
    }).map((alert) => ({ ...alert, acknowledged: !!acknowledgedAlerts[alert.id], overrideReason: acknowledgedAlerts[alert.id] }));
  }, [patient, medicines, acknowledgedAlerts]);
  const criticalUnresolved = cdsAlerts.some((alert) => alert.severity === 'critical' && !alert.acknowledged);
  const ready = authorized && allergyChecked && medicines.length > 0 && medicines.every((m) => m.name.trim() && m.dose.trim() && m.duration.trim()) && !criticalUnresolved;

  const addMedicine = () => {
    if (!form.name.trim() || !form.dose.trim() || !form.duration.trim()) return;
    setMedicines((current) => [...current, { ...form, id: `draft-med-${Date.now()}` }]);
    setForm(emptyMedicine());
  };

  const prepareOnServer = async () => {
    if (!patient || !ready) return;
    setBusy(true);
    setError('');
    try {
      const response = await doctorApi.preparePrescription({
        patientId: patient.id,
        medications: medicines.map((medicine) => ({
          medicationName: medicine.name,
          strength: medicine.strength,
          form: medicine.form,
          dose: medicine.dose,
          frequency: medicine.frequency,
          duration: medicine.duration,
          route: medicine.route,
          instructions: medicine.instructions,
          quantity: medicine.quantity,
          refills: medicine.refills,
        })),
        allergyList: patient.allergies,
      });
      setResult(response);
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The server could not prepare this prescription.');
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    setResult(null);
    setError('');
    setMedicines([]);
    setAllergyChecked(false);
    setAcknowledgedAlerts({});
    setStage('builder');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-extrabold tracking-tight text-[#162235]">Prescriptions</h2><p className="text-xs text-[#607086]">Prepare a prescription only after server authorization and explicit clinician review.</p></div>
        {stage === 'list' && <button type="button" onClick={startNew} disabled={patients.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1769E0] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#145bbf] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> New prescription</button>}
      </div>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

      {stage === 'list' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold text-slate-900">No prescription history is available from the connected Doctor Portal APIs.</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">The server can prepare a reviewed prescription for an active, non-emergency grant with prescription scope. It does not expose a client-side prescription list or pharmacy transmission status here.</p>
          {patients.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">An authorized patient relationship is required before starting.</p>}
        </section>
      )}

      {(stage === 'builder' || stage === 'review') && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-soft lg:col-span-2">
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A8]">Authorized patient</span><select value={patientId} onChange={(event) => { setPatientId(event.target.value); setMedicines([]); setAllergyChecked(false); }} className="mt-1 w-full rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs focus:border-[#1769E0] focus:outline-none">{patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.identifier}</option>)}</select></label>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-500" />Server scope: {patient?.accessPermissions?.prescriptions === true ? 'prescriptions granted' : 'prescriptions must be confirmed by the server'}.</div>
            <div className="mt-4 border-t border-[#E3E8EF] pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A97A8]">Add medicine</p><div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Medicine name" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs md:col-span-2" />
              <input value={form.strength} onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))} placeholder="Strength" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs" />
              <select value={form.form} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))} className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs">{['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Cream'].map((x) => <option key={x}>{x}</option>)}</select>
              <input value={form.dose} onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))} placeholder="Dose" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs" />
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs">{['Once daily', 'Twice daily', 'Thrice daily', 'At night', 'Weekly'].map((x) => <option key={x}>{x}</option>)}</select>
              <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="Duration" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs" />
              <select value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs">{['Oral', 'Topical', 'Sublingual', 'IV', 'Inhaled'].map((x) => <option key={x}>{x}</option>)}</select>
              <input value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} placeholder="Instructions" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs md:col-span-2" />
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} placeholder="Qty" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs" />
              <input type="number" min="0" value={form.refills} onChange={(e) => setForm((f) => ({ ...f, refills: Number(e.target.value) }))} placeholder="Refills" className="rounded-xl border border-[#E3E8EF] px-3 py-2 text-xs" />
            </div><button type="button" onClick={addMedicine} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#1769E0] px-3 py-2 text-xs font-bold text-[#1769E0] hover:bg-[#1769E0]/5"><Plus className="h-3.5 w-3.5" /> Add medicine</button></div>
            <div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A97A8]">Draft items</p>{medicines.length === 0 ? <p className="text-xs text-slate-400">No medicines added.</p> : <ul className="divide-y divide-slate-100">{medicines.map((m) => <li key={m.id} className="flex items-center justify-between py-2 text-xs"><span className="font-bold text-slate-800">{m.name} {m.strength} · {m.dose} · {m.frequency} · {m.duration}</span><button type="button" onClick={() => setMedicines((current) => current.filter((item) => item.id !== m.id))} className="rounded-lg p-1 text-rose-600 hover:bg-rose-50" aria-label={`Remove ${m.name}`}><X className="h-3.5 w-3.5" /></button></li>)}</ul>}</div>
            {medicines.length > 0 && <div className="mt-4"><ClinicalDecisionSupportBanner alerts={cdsAlerts} onAcknowledgeAlert={(id, reason) => setAcknowledgedAlerts((current) => ({ ...current, [id]: reason }))} /></div>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E3E8EF] pt-4"><button type="button" disabled title="Draft persistence is not connected" className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-400">Save draft unavailable</button><button type="button" onClick={() => setStage('review')} disabled={!ready || stage === 'review'} className="rounded-xl bg-[#1769E0] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#145bbf] disabled:cursor-not-allowed disabled:opacity-50">Review before server submission</button></div>
          </section>
          <SafetyPanel patient={patient} authorized={authorized} medicines={medicines} allergyChecked={allergyChecked} setAllergyChecked={setAllergyChecked} criticalUnresolved={criticalUnresolved} ready={ready} />
        </div>
      )}

      {stage === 'review' && patient && <section className="rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-medical-700">Explicit clinician review</p><h3 className="text-xl font-extrabold text-slate-900">Submit to the server prescription gateway</h3></div><button type="button" onClick={() => setStage('builder')} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">Back to edit</button></div><div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2"><div><p className="font-bold uppercase text-[10px] text-slate-500">Patient context</p><p className="mt-1 font-extrabold text-slate-900">{patient.name}</p><p className="text-slate-600">{patient.identifier} · access rechecked by server on submission</p><p className="text-slate-600">Allergies: {patient.allergies.length ? patient.allergies.join(', ') : 'No allergies returned by source'}</p></div><div><p className="font-bold uppercase text-[10px] text-slate-500">Clinician</p><p className="mt-1 font-extrabold text-slate-900">{doctor.displayName}</p><p className="text-slate-600">{doctor.professionalTitle} · {doctor.specialty}</p><p className="text-slate-600">Server doctor ID: {doctor.id}</p></div></div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="mr-1.5 inline h-4 w-4" />Submitting is not pharmacy transmission. The server may hold the request for signing or interaction confirmation.</div><ClinicalDecisionSupportBanner alerts={cdsAlerts} onAcknowledgeAlert={(id, reason) => setAcknowledgedAlerts((current) => ({ ...current, [id]: reason }))} /><div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={prepareOnServer} disabled={!ready || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1769E0] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#145bbf] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{busy ? 'Submitting to server…' : 'Confirm and submit for server review'}</button></div></section>}

      {stage === 'result' && result && <ResultPanel result={result} patient={patient} onNew={startNew} onBack={() => setStage('list')} />}
    </div>
  );
};

const emptyMedicine = (): PrescriptionMedicine => ({ id: `draft-med-${Date.now()}`, name: '', strength: '', form: 'Tablet', dose: '', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: '', quantity: 30, refills: 0 });

const SafetyPanel: React.FC<{ patient: PatientClinical | null; authorized: boolean; medicines: PrescriptionMedicine[]; allergyChecked: boolean; setAllergyChecked: (value: boolean) => void; criticalUnresolved: boolean; ready: boolean }> = ({ patient, authorized, medicines, allergyChecked, setAllergyChecked, criticalUnresolved, ready }) => (
  <section className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-soft"><h3 className="mb-3 text-sm font-extrabold text-[#162235]">Prescription safety review</h3><ul className="space-y-2 text-xs"><SafetyRow ok={authorized} label="Server-authorized patient context" /><SafetyRow ok={medicines.length > 0} label="Medicine selected" /><SafetyRow ok={medicines.every((m) => m.name && m.dose)} label="Dose completed" /><SafetyRow ok={medicines.every((m) => m.duration)} label="Duration completed" /><SafetyRow ok={allergyChecked} label="Allergies reviewed by clinician" /><SafetyRow ok={!criticalUnresolved} label="Critical advisory alerts resolved" /><SafetyRow ok={ready} label="Ready for server review" /></ul><label className="mt-4 flex items-start gap-2 text-xs text-[#607086]"><input type="checkbox" checked={allergyChecked} onChange={(e) => setAllergyChecked(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#E3E8EF]" />I have reviewed the allergies and advisory interaction warnings shown for this authorized patient.</label><p className="mt-3 text-[10px] leading-relaxed text-slate-500">The local rules are advisory only. They do not diagnose, select, sign, or transmit a prescription.</p></section>
);

const SafetyRow: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => <li className={`flex items-center gap-2 rounded-xl px-3 py-2 ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-[#607086]'}`}>{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-slate-400" />}<span className="font-bold">{label}</span></li>;

const ResultPanel: React.FC<{ result: PrescriptionPreparationResponse; patient: PatientClinical | null; onNew: () => void; onBack: () => void }> = ({ result, patient, onNew, onBack }) => {
  const held = result.status !== 'READY_FOR_PHARMACY';
  return <section className={`mx-auto max-w-2xl rounded-3xl border p-8 shadow-soft ${held ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}><div className="text-center"><div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${held ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{held ? <ShieldAlert className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}</div><h3 className="mt-3 text-xl font-extrabold text-slate-900">{held ? 'Prescription held by server' : 'Prescription prepared by server'}</h3><p className="text-sm text-slate-600">{result.prescriptionId} · {patient?.name || 'Authorized patient'}</p></div><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700"><p className="font-bold">Server status: {result.status}</p><p className="mt-1">Signing status: {result.signingStatus}</p><p className="mt-1">{result.message}</p>{result.interactions.length > 0 && <p className="mt-2 rounded-xl bg-rose-50 p-2 text-rose-800">The server returned {result.interactions.length} interaction warning(s); no pharmacy transmission occurred.</p>}<p className="mt-2 text-slate-500">A server response is not proof of pharmacy acceptance or clinical correctness. Review according to local policy.</p></div><div className="mt-4 flex justify-center gap-2"><button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Back to list</button><button type="button" onClick={onNew} className="rounded-xl bg-[#1769E0] px-4 py-2 text-xs font-bold text-white">Prepare another</button></div></section>;
};

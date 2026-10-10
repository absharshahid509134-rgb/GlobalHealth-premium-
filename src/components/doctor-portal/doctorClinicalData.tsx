import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDoctorPortal } from './doctorPortalData';
import { doctorApi, type AuthorizedPatientSummary, type ServerEhrResponse } from '../../services/doctorPortalClient';

/* ============================================================================
   Doctor Portal — clinical workspace data, seed data and actions.
   This powers the patient-care modules (Patients, Consultations,
   Prescriptions, Labs, Imaging, Referrals, Billing). It is intentionally
   isolated from the credential/availability portal data so the two concerns
   stay separate. A real backend can replace this provider without touching UI.
   ========================================================================== */

export type PatientStatus = 'new' | 'active' | 'follow_up' | 'critical' | 'pending_review';
export type ConsentedScope = 'basic' | 'appointments' | 'history' | 'labs' | 'imaging' | 'prescriptions' | 'documents';
export type ConsentStatus = 'not_requested' | 'pending' | 'granted' | 'denied' | 'expired';
export type LabStatus = 'ordered' | 'collected' | 'available' | 'reviewed';
export type ImagingStatus = 'ordered' | 'available' | 'reviewed';
export type PrescriptionStatus = 'draft' | 'signed' | 'sent_pharmacy';
export type ReferralStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'completed';

export interface VitalsRecord {
  id: string;
  date: string;
  time: string;
  bp: string;
  hr: number;
  temp: string;
  spo2: number;
  rr: number;
  weight: number;
  note?: string;
}
export interface ClinicalNote {
  id: string;
  date: string;
  kind: string;
  title: string;
  body: string;
  private?: boolean;
  status: 'draft' | 'signed' | 'amended' | 'external';
}
export interface PrescriptionMedicine {
  id: string;
  name: string;
  strength: string;
  form: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  quantity: number;
  refills: number;
}
export interface Prescription {
  id: string;
  rxId: string;
  patientId: string;
  date: string;
  status: PrescriptionStatus;
  medicines: PrescriptionMedicine[];
  review: {
    patientVerified: boolean;
    medicineSelected: boolean;
    dosageCompleted: boolean;
    durationCompleted: boolean;
    allergyChecked: boolean;
    requiredFields: boolean;
  };
}
export interface LabValue {
  name: string;
  value: string;
  unit: string;
  ref: string;
  flag: 'normal' | 'low' | 'high';
}
export interface LabOrder {
  id: string;
  patientId: string;
  category: string;
  test: string;
  indication: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: LabStatus;
  orderedDate: string;
  collectedDate?: string;
  values?: LabValue[];
  clinicalNote?: string;
}
export interface ImagingStudy {
  id: string;
  patientId: string;
  modality: 'X-ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Mammography' | 'ECG' | 'Other';
  title: string;
  date: string;
  facility: string;
  status: ImagingStatus;
  findings?: string;
  impression?: string;
  clinicalNote?: string;
  reviewed?: boolean;
}
export interface PatientClinical {
  id: string;
  identifier: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  dob: string;
  bloodGroup: string;
  phone: string;
  email: string;
  status: PatientStatus;
  conditions: string[];
  allergies: string[];
  medications: { name: string; dose: string; frequency: string; since: string }[];
  alerts: { severity: 'critical' | 'warning' | 'info'; text: string }[];
  lastVisit: string;
  nextAppointment: string;
  consentStatus: ConsentStatus;
  consentedScopes: ConsentedScope[];
  consentReason: string;
  consentHistory: { date: string; doctor: string; action: string; result: string }[];
  /** Server-provided relationship metadata. It is not client authorization. */
  accessExpiresAt?: string | null;
  accessStatus?: 'active' | 'expiring' | 'emergency' | 'expired' | 'revoked';
  accessPermissions?: Record<string, boolean | string>;
  pendingConsentCount?: number;
  dataSource?: 'server' | 'development-seed';
  vitals: VitalsRecord[];
  notes: ClinicalNote[];
  prescriptions: Prescription[];
  labs: LabOrder[];
  imaging: ImagingStudy[];
}
export interface Consultation {
  id: string;
  patientId: string;
  date: string;
  start: string;
  type: 'New Consultation' | 'Follow-up' | 'Video' | 'Telephone';
  status: 'in_progress' | 'completed';
  complaint: string;
  history: string;
  exam: string;
  assessment: string;
  plan: string;
  privateNotes: string;
}
export interface BillingTransaction {
  id: string;
  patientId: string;
  patientName: string;
  service: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded';
}

/* ---------------- Seed data ---------------- */

const today = () => new Date().toISOString().slice(0, 10);

const basePatient = (p: Partial<PatientClinical> & { id: string; identifier: string; name: string }): PatientClinical => ({
  age: 0,
  sex: 'Male',
  dob: '-',
  bloodGroup: 'O+',
  phone: '-',
  email: '-',
  status: 'active',
  conditions: [],
  allergies: [],
  medications: [],
  alerts: [],
  lastVisit: '-',
  nextAppointment: '-',
  consentStatus: 'not_requested',
  consentedScopes: [],
  consentReason: '',
  consentHistory: [],
  vitals: [],
  notes: [],
  prescriptions: [],
  labs: [],
  imaging: [],
  ...p,
});

export const seedPatients: PatientClinical[] = [
  basePatient({
    id: 'pat-1083', identifier: 'P-1083', name: 'John Smith', age: 45, sex: 'Male', dob: '1981-07-12',
    bloodGroup: 'O+', phone: '+91 98100 22001', email: 'john.smith@example.com', status: 'follow_up',
    conditions: ['Hypertension', 'Type 2 Diabetes'], allergies: ['Penicillin'],
    medications: [
      { name: 'Telmisartan', dose: '40 mg', frequency: 'Once daily', since: 'Jan 2025' },
      { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', since: 'Mar 2025' },
    ],
    alerts: [{ severity: 'warning', text: 'Penicillin allergy — avoid beta-lactams.' }],
    lastVisit: '02 Sep 2026', nextAppointment: '10 Sep 2026', consentStatus: 'granted',
    consentedScopes: ['basic', 'appointments', 'history', 'labs', 'imaging', 'prescriptions'],
    consentReason: 'Cardiology follow-up established under active care.',
    consentHistory: [
      { date: '02 Sep 2026', doctor: 'Dr. Priya Nair', action: 'Requested laboratory history', result: 'Approved by patient' },
      { date: '02 Sep 2026', doctor: 'Dr. Priya Nair', action: 'Viewed cardiac investigations', result: 'Approved by patient' },
    ],
    vitals: [
      { id: 'v-1', date: today(), time: '09:15', bp: '128/82', hr: 76, temp: '98.4°F', spo2: 98, rr: 16, weight: 68 },
      { id: 'v-2', date: '2026-08-20', time: '10:30', bp: '134/88', hr: 80, temp: '98.6°F', spo2: 97, rr: 17, weight: 68 },
    ],
    notes: [
      { id: 'n-1', date: today(), kind: 'Clinical Note', title: 'Routine cardiac review', body: 'Stable on current therapy. Home BP log reviewed. Continue Telmisartan 40 mg and Metformin 500 mg.', status: 'signed' },
    ],
    prescriptions: [
      {
        id: 'rx-1', rxId: 'RX-GH-29483', patientId: 'pat-1083', date: today(), status: 'signed',
        medicines: [
          { id: 'm-1', name: 'Telmisartan', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'After food', quantity: 30, refills: 1 },
        ],
        review: { patientVerified: true, medicineSelected: true, dosageCompleted: true, durationCompleted: true, allergyChecked: true, requiredFields: true },
      },
    ],
    labs: [
      { id: 'lab-1', patientId: 'pat-1083', category: 'Hematology', test: 'Complete Blood Count', indication: 'Routine annual review', priority: 'routine', status: 'available', orderedDate: '01 Sep 2026', collectedDate: '01 Sep 2026',
        values: [
          { name: 'Hemoglobin', value: '13.8', unit: 'g/dL', ref: '13.5 - 17.5', flag: 'normal' },
          { name: 'WBC', value: '7.2', unit: '×10³/µL', ref: '4.0 - 11.0', flag: 'normal' },
          { name: 'Platelets', value: '245', unit: '×10³/µL', ref: '150 - 450', flag: 'normal' },
        ] },
      { id: 'lab-2', patientId: 'pat-1083', category: 'Biochemistry', test: 'HbA1c', indication: 'Diabetic monitoring', priority: 'routine', status: 'available', orderedDate: '01 Sep 2026', collectedDate: '01 Sep 2026',
        values: [{ name: 'HbA1c', value: '7.1', unit: '%', ref: '< 7.0', flag: 'high' }] },
    ],
    imaging: [
      { id: 'img-1', patientId: 'pat-1083', modality: 'ECG', title: '12-Lead ECG', date: '01 Sep 2026', facility: 'GlobalHealth Medical Center', status: 'available',
        findings: 'Normal sinus rhythm. No acute ST-T changes.', impression: 'No acute ischemic changes.', clinicalNote: 'Repeat in 6 weeks or earlier if symptoms recur.', reviewed: false },
    ],
  }),
  basePatient({
    id: 'pat-0912', identifier: 'P-0912', name: 'Aisha Khan', age: 32, sex: 'Female', dob: '1994-03-25',
    bloodGroup: 'A+', phone: '+91 98100 33201', email: 'aisha.khan@example.com', status: 'active',
    conditions: ['Atrial Fibrillation'], allergies: [],
    medications: [{ name: 'Apixaban', dose: '5 mg', frequency: 'Twice daily', since: 'May 2026' }],
    alerts: [{ severity: 'info', text: 'No known drug allergies.' }],
    lastVisit: '30 Aug 2026', nextAppointment: '05 Sep 2026', consentStatus: 'pending',
    consentReason: 'Requested access to prior electrophysiology studies.',
    consentHistory: [{ date: '30 Aug 2026', doctor: 'Dr. Priya Nair', action: 'Requested electrophysiology history', result: 'Pending patient decision' }],
    vitals: [{ id: 'v-3', date: '2026-08-30', time: '16:20', bp: '118/76', hr: 96, temp: '98.2°F', spo2: 99, rr: 15, weight: 59 }],
    notes: [],
    prescriptions: [],
    labs: [
      { id: 'lab-3', patientId: 'pat-0912', category: 'Biochemistry', test: 'INR / PT', indication: 'Anticoagulation monitoring', priority: 'urgent', status: 'available', orderedDate: '29 Aug 2026', collectedDate: '30 Aug 2026',
        values: [{ name: 'INR', value: '2.4', unit: '', ref: '2.0 - 3.0', flag: 'normal' }] },
    ],
    imaging: [],
  }),
  basePatient({
    id: 'pat-1277', identifier: 'P-1277', name: 'Rahul Verma', age: 57, sex: 'Male', dob: '1969-11-03',
    bloodGroup: 'B+', phone: '+91 98100 44300', email: 'rahul.verma@example.com', status: 'critical',
    conditions: ['Hypertension', 'Coronary Artery Disease', 'Dyslipidemia'], allergies: ['Aspirin', 'Sulfonamides'],
    medications: [{ name: 'Atorvastatin', dose: '20 mg', frequency: 'Once at night', since: '2024' }],
    alerts: [
      { severity: 'critical', text: 'Chest pain reported 20 minutes ago.' },
      { severity: 'warning', text: 'Aspirin allergy — use alternative antiplatelet.' },
    ],
    lastVisit: '28 Aug 2026', nextAppointment: '06 Sep 2026', consentStatus: 'granted',
    consentedScopes: ['basic', 'appointments', 'history', 'labs', 'imaging'],
    consentReason: 'Active cardiology care relationship.',
    consentHistory: [{ date: '28 Aug 2026', doctor: 'Dr. Priya Nair', action: 'Requested imaging history', result: 'Approved by patient' }],
    vitals: [{ id: 'v-4', date: today(), time: '17:00', bp: '142/92', hr: 88, temp: '98.8°F', spo2: 96, rr: 18, weight: 84 }],
    notes: [],
    prescriptions: [],
    labs: [
      { id: 'lab-4', patientId: 'pat-1277', category: 'Cardiac', test: 'Troponin I', indication: 'Chest pain evaluation', priority: 'stat', status: 'available', orderedDate: today(), collectedDate: today(),
        values: [{ name: 'Troponin I', value: '0.04', unit: 'ng/mL', ref: '< 0.04', flag: 'high' }] },
      { id: 'lab-5', patientId: 'pat-1277', category: 'Biochemistry', test: 'Lipid Profile', indication: 'Follow-up', priority: 'routine', status: 'reviewed', orderedDate: '28 Aug 2026', collectedDate: '28 Aug 2026',
        values: [{ name: 'LDL', value: '132', unit: 'mg/dL', ref: '< 100', flag: 'high' }] },
    ],
    imaging: [
      { id: 'img-2', patientId: 'pat-1277', modality: 'ECG', title: '12-Lead ECG', date: today(), facility: 'GlobalHealth Medical Center', status: 'available',
        findings: 'ST depression in lateral leads.', impression: 'Possible ischemia — urgent cardiology review.', clinicalNote: '', reviewed: false },
    ],
  }),
  basePatient({
    id: 'pat-0764', identifier: 'P-0764', name: 'Meera Menon', age: 39, sex: 'Female', dob: '1987-02-18',
    bloodGroup: 'AB+', phone: '+91 98100 55401', email: 'meera.menon@example.com', status: 'new',
    conditions: [], allergies: ['Latex'], medications: [],
    alerts: [{ severity: 'info', text: 'First visit — no shared clinical history yet.' }],
    lastVisit: '-', nextAppointment: today(), consentStatus: 'not_requested',
    consentHistory: [],
    vitals: [],
    notes: [],
    prescriptions: [],
    labs: [],
    imaging: [],
  }),
  basePatient({
    id: 'pat-1150', identifier: 'P-1150', name: 'Arjun Patel', age: 68, sex: 'Male', dob: '1958-06-09',
    bloodGroup: 'O-', phone: '+91 98100 66502', email: 'arjun.patel@example.com', status: 'pending_review',
    conditions: ['Heart Failure', 'Chronic Kidney Disease'], allergies: ['Codeine'],
    medications: [
      { name: 'Furosemide', dose: '40 mg', frequency: 'Once daily', since: '2025' },
    ],
    alerts: [{ severity: 'warning', text: 'Renal function requires review before potassium-sparing therapy.' }],
    lastVisit: '25 Aug 2026', nextAppointment: '12 Sep 2026', consentStatus: 'granted',
    consentedScopes: ['basic', 'appointments', 'history', 'labs', 'imaging'],
    consentReason: 'Established heart failure care pathway.',
    consentHistory: [{ date: '25 Aug 2026', doctor: 'Dr. Priya Nair', action: 'Requested renal/laboratory history', result: 'Approved by patient' }],
    vitals: [{ id: 'v-5', date: '2026-08-25', time: '10:10', bp: '112/70', hr: 72, temp: '97.9°F', spo2: 97, rr: 16, weight: 71 }],
    notes: [],
    prescriptions: [],
    labs: [],
    imaging: [],
  }),
];

export const seedConsultations: Consultation[] = [
  {
    id: 'con-1', patientId: 'pat-1083', date: today(), start: '10:30', type: 'Follow-up', status: 'completed',
    complaint: 'No new chest pain; reports mild fatigue.',
    history: 'Hypertension and type 2 diabetes well controlled in the last 2 months. Home BP average 128/80.',
    exam: 'BP 128/82, HR 76, SpO2 98%. Lungs clear. No peripheral edema.',
    assessment: 'Stable hypertension and diabetes. Findings consistent with treated disease without acute decompensation.',
    plan: 'Continue current therapy. Review HbA1c and renal panel at next visit. Repeat ECG in 6 weeks.',
    privateNotes: 'Patient very anxious about CV risk; spent time reviewing lifestyle measures.',
  },
];

export const seedBilling: BillingTransaction[] = [
  { id: 'bill-1', patientId: 'pat-1083', patientName: 'John Smith', service: 'Cardiology Consultation', date: today(), amount: 800, status: 'paid' },
  { id: 'bill-2', patientId: 'pat-0912', patientName: 'Aisha Khan', service: 'Video Consultation', date: '2026-08-30', amount: 650, status: 'pending' },
  { id: 'bill-3', patientId: 'pat-1277', patientName: 'Rahul Verma', service: 'ECG + Cardiology Review', date: today(), amount: 1200, status: 'paid' },
  { id: 'bill-4', patientId: 'pat-1150', patientName: 'Arjun Patel', service: 'Heart Failure Review', date: '2026-08-25', amount: 900, status: 'paid' },
];

/* ---------------- Clinical store ---------------- */

interface ClinicalWorkspaceState {
  patients: PatientClinical[];
  consultations: Consultation[];
  billing: BillingTransaction[];
  selectedPatientId: string | null;
  loading: boolean;
  error: string | null;
  refreshPatients: () => Promise<void>;
  selectPatient: (id: string | null) => void;
  requestConsent: (patientId: string, reason: string, scopes: ConsentedScope[]) => void;
  respondConsent: (patientId: string, result: 'granted' | 'denied') => void;
  addVitals: (patientId: string, v: Omit<VitalsRecord, 'id'>) => void;
  addNote: (patientId: string, n: Omit<ClinicalNote, 'id' | 'date'>) => void;
  addPrescription: (patientId: string, p: Omit<Prescription, 'id' | 'patientId'>) => void;
  updatePrescriptionStatus: (id: string, status: PrescriptionStatus) => void;
  addLabOrder: (patientId: string, l: Omit<LabOrder, 'id' | 'patientId' | 'status'>) => void;
  reviewLab: (id: string, clinicalNote: string) => void;
  addImaging: (patientId: string, i: Omit<ImagingStudy, 'id' | 'patientId' | 'status' | 'reviewed'>) => void;
  reviewImaging: (id: string, clinicalNote: string) => void;
  saveConsultation: (c: Omit<Consultation, 'id'>) => void;
  addBilling: (b: Omit<BillingTransaction, 'id'>) => void;
}

const ClinicalContext = createContext<ClinicalWorkspaceState | null>(null);

export const useClinicalWorkspace = (): ClinicalWorkspaceState => {
  const ctx = useContext(ClinicalContext);
  if (!ctx) throw new Error('useClinicalWorkspace must be used within Doctor ClinicalWorkspaceProvider');
  return ctx;
};

const localScopeForServerScope: Record<string, ConsentedScope> = {
  profile: 'basic',
  appointments: 'appointments',
  clinical: 'history',
  medications: 'history',
  allergies: 'history',
  labs: 'labs',
  imaging: 'imaging',
  prescriptions: 'prescriptions',
  documents: 'documents',
};

const serverScopesToLocal = (scopes: string[]): ConsentedScope[] =>
  Array.from(new Set(scopes.map((scope) => localScopeForServerScope[scope]).filter(Boolean)));

const patientFromServerSummary = (summary: AuthorizedPatientSummary): PatientClinical => ({
  id: summary.patientUserId,
  identifier: summary.patientIdentifier || `PAT-${summary.patientUserId.replace(/^usr-/, '').toUpperCase()}`,
  name: summary.patientName || 'Authorized patient',
  age: 0,
  sex: 'Other',
  dob: '-',
  bloodGroup: 'Not provided',
  phone: '-',
  email: '-',
  status: 'active',
  conditions: [],
  allergies: [],
  medications: [],
  alerts: [{ severity: 'info', text: 'Clinical details load only after the server re-checks this active access grant.' }],
  lastVisit: '-',
  nextAppointment: '-',
  consentStatus: summary.accessStatus === 'expired' ? 'expired' : 'granted',
  consentedScopes: serverScopesToLocal(summary.scope),
  consentReason: summary.modificationAccess,
  consentHistory: [],
  accessExpiresAt: summary.expiresAt,
  accessStatus: summary.accessStatus,
  accessPermissions: summary.permissions,
  pendingConsentCount: summary.pendingConsentCount,
  dataSource: summary.dataSource || 'server',
  vitals: [],
  notes: [],
  prescriptions: [],
  labs: [],
  imaging: [],
});

const patientWithEhr = (patient: PatientClinical, response: ServerEhrResponse): PatientClinical => {
  const records = response.records || [];
  const notes: ClinicalNote[] = records
    .filter((record) => ['Clinical Note', 'Consultation', 'Diagnosis', 'Treatment History'].includes(record.category))
    .map((record) => ({
      id: `CON-${record.recordId}`,
      date: record.createdAt.slice(0, 10),
      kind: record.category,
      title: record.title,
      body: record.latest || 'The source record did not provide a readable summary.',
      status: 'external',
    }));
  const labs: LabOrder[] = records
    .filter((record) => ['Laboratory Report', 'Lab Report'].includes(record.category))
    .map((record) => ({
      id: `LAB-${record.recordId}`,
      patientId: patient.id,
      category: record.category,
      test: record.title,
      indication: 'Source indication not provided',
      priority: 'routine',
      status: 'available',
      orderedDate: record.createdAt.slice(0, 10),
      clinicalNote: record.latest ? 'Source report available. Structured values are not exposed by this endpoint.' : undefined,
    }));
  const medications = response.patient.overview.currentMedications?.map((name) => ({
    name,
    dose: 'Source dose not provided',
    frequency: 'Source frequency not provided',
    since: 'Source date not provided',
  })) || [];
  const allergies = response.patient.overview.allergies || [];
  return {
    ...patient,
    allergies,
    medications,
    notes,
    labs,
    accessStatus: response.grant.status === 'expired' ? 'expired' : patient.accessStatus,
    accessExpiresAt: response.grant.expiresAt,
    accessPermissions: response.grant.permissions,
    consentedScopes: serverScopesToLocal(response.grant.scope),
    consentStatus: response.grant.status === 'expired' ? 'expired' : 'granted',
    alerts: [{ severity: 'info', text: response.emergency ? 'Emergency break-glass view is active and view-only.' : 'Protected data was returned by the authorized server endpoint.' }],
  };
};

/* ---------------- Server-backed clinical store ---------------- */

export const ClinicalWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<PatientClinical[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [billing, setBilling] = useState<BillingTransaction[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await doctorApi.listAuthorizedPatients();
      setPatients(response.patients.map(patientFromServerSummary));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorized patient data could not be loaded.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPatients();
  }, [refreshPatients]);

  const loadPatient = useCallback(async (patientId: string) => {
    try {
      const response = await doctorApi.getPatientEhr(patientId);
      setPatients((current) => current.map((patient) => patient.id === patientId ? patientWithEhr(patient, response) : patient));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This patient record could not be loaded.');
      // Do not leave stale protected details visible after a failed re-check.
      setPatients((current) => current.map((patient) => patient.id === patientId ? patientFromServerSummary({
        patientUserId: patient.id,
        patientName: patient.name,
        patientIdentifier: patient.identifier,
        accessStatus: 'expired',
        grantedAt: '',
        expiresAt: null,
        scope: [],
        canView: false,
        lastViewedAt: null,
        permissions: {},
        modificationAccess: 'PATIENT_APPROVAL_REQUIRED',
        pendingConsentCount: 0,
        recordCategories: [],
      }) : patient));
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) void loadPatient(selectedPatientId);
  }, [selectedPatientId, loadPatient]);

  const selectPatient = useCallback((id: string | null) => setSelectedPatientId(id), []);

  const requestConsent = useCallback(async (patientId: string, reason: string, scopes: ConsentedScope[]) => {
    try {
      await doctorApi.createConsentRequest({
        patientUserId: patientId,
        kind: 'access_grant',
        title: 'Request additional patient record access',
        summary: `Requested scopes: ${scopes.join(', ')}`,
        reason,
        requestedScope: Array.from(new Set(scopes.flatMap((scope) => {
          const serverScope = Object.entries(localScopeForServerScope).find(([, local]) => local === scope)?.[0];
          return serverScope ? [serverScope] : [];
        }))),
        accessDurationDays: 365,
        validityDays: 7,
      });
      setError('Consent request sent. Protected sections remain locked until the patient decides in-app.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The consent request could not be sent.');
    }
  }, []);

  const blockedClinicalWrite = useCallback((message: string) => {
    setError(message);
  }, []);

  const respondConsent = useCallback((_patientId: string, _result: 'granted' | 'denied') => {
    blockedClinicalWrite('Patient consent decisions are made by the authenticated patient in the User workspace. A doctor cannot approve access on the patient’s behalf.');
  }, [blockedClinicalWrite]);

  const addVitals = useCallback((_patientId: string, _v: Omit<VitalsRecord, 'id'>) => {
    blockedClinicalWrite('Vitals write is not enabled until the verified clinical data service is connected. No local record was created.');
  }, [blockedClinicalWrite]);
  const addNote = useCallback((_patientId: string, _n: Omit<ClinicalNote, 'id' | 'date'>) => {
    blockedClinicalWrite('Clinical-note changes must use the server patient-approval workflow. No local record was created.');
  }, [blockedClinicalWrite]);
  const addPrescription = useCallback((_patientId: string, _p: Omit<Prescription, 'id' | 'patientId'>) => {
    blockedClinicalWrite('Use the server prescription preparation and explicit signature flow. No local prescription was created.');
  }, [blockedClinicalWrite]);
  const updatePrescriptionStatus = useCallback((_id: string, _status: PrescriptionStatus) => {
    blockedClinicalWrite('Prescription status changes must be confirmed by the server. No local status was changed.');
  }, [blockedClinicalWrite]);
  const addLabOrder = useCallback((_patientId: string, _l: Omit<LabOrder, 'id' | 'patientId' | 'status'>) => {
    blockedClinicalWrite('Laboratory ordering is not enabled without a verified laboratory integration. No order was created.');
  }, [blockedClinicalWrite]);
  const reviewLab = useCallback((_id: string, _clinicalNote: string) => {
    blockedClinicalWrite('Laboratory review acknowledgement is not enabled without a verified laboratory integration.');
  }, [blockedClinicalWrite]);
  const addImaging = useCallback((_patientId: string, _i: Omit<ImagingStudy, 'id' | 'patientId' | 'status' | 'reviewed'>) => {
    blockedClinicalWrite('Imaging ordering is not enabled without a verified imaging integration. No order was created.');
  }, [blockedClinicalWrite]);
  const reviewImaging = useCallback((_id: string, _clinicalNote: string) => {
    blockedClinicalWrite('Imaging review acknowledgement is not enabled without a verified imaging integration.');
  }, [blockedClinicalWrite]);
  const saveConsultation = useCallback((_c: Omit<Consultation, 'id'>) => {
    blockedClinicalWrite('Consultation persistence requires the connected clinical notes API. No local note was saved.');
  }, [blockedClinicalWrite]);
  const addBilling = useCallback((_b: Omit<BillingTransaction, 'id'>) => {
    blockedClinicalWrite('Billing data is unavailable because no verified billing API is connected.');
  }, [blockedClinicalWrite]);

  const value = useMemo<ClinicalWorkspaceState>(() => ({
    patients,
    consultations,
    billing,
    selectedPatientId,
    loading,
    error,
    refreshPatients,
    selectPatient,
    requestConsent,
    respondConsent,
    addVitals,
    addNote,
    addPrescription,
    updatePrescriptionStatus,
    addLabOrder,
    reviewLab,
    addImaging,
    reviewImaging,
    saveConsultation,
    addBilling,
  }), [patients, consultations, billing, selectedPatientId, loading, error, refreshPatients, selectPatient,
    requestConsent, respondConsent, addVitals, addNote, addPrescription, updatePrescriptionStatus, addLabOrder,
    reviewLab, addImaging, reviewImaging, saveConsultation, addBilling]);

  return <ClinicalContext.Provider value={value}>{children}</ClinicalContext.Provider>;
};
export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  new: 'New', active: 'Active', follow_up: 'Follow-up', critical: 'Critical', pending_review: 'Pending Review',
};
export const CONSENT_LABEL: Record<ConsentStatus, string> = {
  not_requested: 'Not requested', pending: 'Awaiting patient', granted: 'Consent granted', denied: 'Denied', expired: 'Expired',
};
export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  ordered: 'Ordered', collected: 'Collected', available: 'Available', reviewed: 'Reviewed',
};
export const IMAGING_STATUS_LABEL: Record<ImagingStatus, string> = {
  ordered: 'Ordered', available: 'Available', reviewed: 'Reviewed',
};
export const RX_STATUS_LABEL: Record<PrescriptionStatus, string> = {
  draft: 'Draft', signed: 'Signed', sent_pharmacy: 'Sent to Pharmacy',
};

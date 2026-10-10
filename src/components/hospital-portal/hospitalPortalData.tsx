import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { createAuditEvent, AuditEvent as CoreAuditEvent, AuditAction } from '../../core/audit';
import { createHospitalEntityId } from '../../core/hospitalIdentifiers';

/* ============================================================================
   Hospital Portal — data model, seed data, mock service and workspace store.
   Mirrors the Hospital Portal spec entities (HospitalOrganization, HospitalStaff,
   Department, HospitalDoctor, Appointment, HospitalDocument, HospitalVerification,
   AuditEvent…). The service layer is async so a real backend can replace it
   without touching the UI. Public/private data is separated at the model level.
   ========================================================================== */

export type VerificationStatus =
  | 'pending' | 'under_review' | 'verified' | 'additional_info_required'
  | 'rejected' | 'suspended' | 'archived';

export type PublicStatus = 'draft' | 'pending_review' | 'published' | 'changes_requested' | 'rejected' | 'suspended';
export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';
export type ConsultationType = 'in_person' | 'video' | 'teleconsultation' | 'follow_up';
export type StaffRole =
  | 'owner' | 'administrator' | 'department_manager' | 'receptionist'
  | 'doctor' | 'verification_manager' | 'read_only';
export type DoctorAffiliationStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'removed';
export type DocumentStatus = 'pending_verification' | 'verified' | 'expiring_soon' | 'expired';

export interface HospitalOrganization {
  id: string;
  legalName: string;
  displayName: string;
  facilityType: string;
  ownershipType: string;
  description: string;
  website: string;
  publicPhone: string;
  publicEmail: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  locationVerified: boolean;
  locationAccuracy: 'verified' | 'approximate';
  verificationStatus: VerificationStatus;
  verificationSource: string;
  verificationDate?: string;
  publicStatus: PublicStatus;
  completeness: number;
  missingProfileFields: string[];
  hours: WeeklyHours[];
  emergency: EmergencyService;
  accessibility: Accessibility;
  photos: HospitalPhoto[];
  accreditations: Accreditation[];
  insurance: InsuranceInfo;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyHours {
  id: string;
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface EmergencyService {
  available: boolean;
  description: string;
  hours: string;
  contact: string;
  departmentId?: string;
  temporaryStatus?: string;
}

export interface Accessibility {
  wheelchairEntrance: boolean;
  accessibleParking: boolean;
  elevators: boolean;
  accessibleRestrooms: boolean;
  hearingAssistance: boolean;
  visualAssistance: boolean;
}

export interface HospitalPhoto {
  id: string;
  category: 'exterior' | 'entrance' | 'reception' | 'department' | 'accessibility';
  caption: string;
  visibility: 'public' | 'private';
  approvalStatus: 'approved' | 'pending';
  fileName: string;
}

export interface Accreditation {
  id: string;
  body: string;
  certification: string;
  issueDate: string;
  expiryDate?: string;
  documentName?: string;
  verificationStatus: 'verified' | 'pending' | 'expiring_soon' | 'expired';
}

export interface InsuranceInfo {
  acceptedPlans: string[];
  paymentMethods: string[];
  insuranceDesk: string;
  disclaimer: string;
}

export interface HospitalStaff {
  id: string;
  hospitalId: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  status: 'invited' | 'active' | 'suspended' | 'removed';
  invitedAt: string;
  joinedAt?: string;
  lastActiveAt?: string;
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  specialtyId?: string;
  description: string;
  services: string[];
  doctorIds: string[];
  hours?: WeeklyHours[];
  status: 'active' | 'archived';
  appointmentSettings: { defaultDurationMin: number; allowPublicBooking: boolean };
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleRule {
  id: string;
  hospitalId: string;
  doctorId: string;
  days: DayKey[];
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  consultationModes: ConsultationType[];
  breakStart?: string;
  breakEnd?: string;
  status: 'draft' | 'active';
}

export interface ScheduleException {
  id: string;
  hospitalId: string;
  doctorId: string;
  date: string;
  type: 'leave' | 'holiday' | 'unavailable';
  reason: string;
  startTime?: string;
  endTime?: string;
}

export interface HospitalDoctor {
  id: string;
  hospitalId: string;
  departmentId?: string;
  specialtyId?: string;
  name: string;
  email: string;
  photo?: string;
  qualifications: string[];
  bio: string;
  affiliationStatus: DoctorAffiliationStatus;
  verified: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ServiceItem {
  id: string;
  hospitalId: string;
  name: string;
  description: string;
  departmentId?: string;
  availability: 'available' | 'limited' | 'unavailable';
  hours?: string;
  publicVisibility: boolean;
  status: 'active' | 'archived';
}

/* ---------------- Structured pricing (Phase 0 foundation) ----------------
   Every billable item in the hospital has a structured price record instead
   of a single hard-coded amount. Prices are configurable per hospital, with
   currency, unit, fees, taxes, discounts, validity and availability.        */

export type BillableCategory =
  | 'Consultation' | 'OPD' | 'Emergency' | 'Admission' | 'Bed' | 'Room'
  | 'ICU' | 'Surgery' | 'Anesthesia' | 'Laboratory' | 'Imaging' | 'Pharmacy'
  | 'Nursing' | 'Ambulance' | 'Home Healthcare' | 'Physiotherapy' | 'Blood'
  | 'Document' | 'Certificate' | 'Package' | 'Other';

export interface StructuredPrice {
  basePrice: number;
  professionalFee: number;
  facilityFee: number;
  consumables: number;
  equipmentFee: number;
  taxRate: number;      // percent
  discount: number;     // flat amount, always recorded with approver/reason
  emergencyPrice?: number;
  insurancePrice?: number;
  packagePrice?: number;
  cashPrice?: number;
  currency: 'INR';
  unit: string;
  effectiveDate: string;
  expiryDate?: string;
  minimum?: number;
  maximum?: number;
}

export interface HospitalPrice {
  id: string;
  hospitalId: string;
  itemId: string;
  itemType: BillableCategory;
  name: string;
  departmentId?: string;
  description?: string;
  availability: 'available' | 'limited' | 'unavailable' | 'coming_soon';
  publicStatus: PublicStatus;
  publicVisibility: boolean;
  price: StructuredPrice;
  updatedAt: string;
  updatedBy: string;
  approval?: { approvedBy: string; approvedAt: string; reason: string };
}

export interface PriceHistory {
  id: string;
  priceId: string;
  hospitalId: string;
  oldPrice: StructuredPrice;
  newPrice: StructuredPrice;
  changedBy: string;
  changedAt: string;
  reason: string;
  approvalState: 'pending' | 'approved' | 'rejected';
}

export interface SpecialtyItem {
  id: string;
  hospitalId: string;
  name: string;
  departmentId?: string;
  status: 'active' | 'inactive';
}

export interface LabTest {
  id: string;
  hospitalId: string;
  name: string;
  category: string;
  availability: 'available' | 'limited' | 'unavailable';
  departmentId?: string;
  hours?: string;
  bookingSupported: boolean;
}

export interface ImagingService {
  id: string;
  hospitalId: string;
  modality: string;
  available: boolean;
  departmentId?: string;
  hours?: string;
}

export interface PharmacyService {
  id: string;
  hospitalId: string;
  name: string;
  hours: string;
  contact: string;
  services: string[];
  prescriptionSupport: boolean;
  relationship: string;
}

export interface BloodBank {
  id: string;
  hospitalId: string;
  name: string;
  hours: string;
  contact: string;
  services: string[];
  publicInfo: string;
  stockDisplay: boolean;
}

export interface Appointment {
  id: string;
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  patientIdentifier: string;
  date: string;
  time: string;
  durationMin: number;
  type: ConsultationType;
  status: AppointmentStatus;
  bookingSource: 'public' | 'portal' | 'walk_in';
  notes?: string;
}

export interface HospitalDocument {
  id: string;
  hospitalId: string;
  type: 'verification' | 'accreditation' | 'license' | 'facility' | 'contract';
  name: string;
  sizeKB: number;
  version: number;
  status: DocumentStatus;
  uploadedBy: string;
  reviewedBy?: string;
  expiresAt?: string;
  uploadedAt: string;
}

export interface HospitalVerification {
  id: string;
  hospitalId: string;
  status: VerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  nextAction: string;
  stepsDone: number;
  stepsTotal: number;
}

export interface NotificationItem {
  id: string;
  category: 'appointments' | 'verification' | 'profile_updates' | 'doctor_changes' | 'system' | 'security';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface ActivityEvent {
  id: string;
  who: string;
  what: string;
  when: string;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  date: string;
  time: string;
  ip: string;
  location: string;
  outcome: 'success' | 'denied' | 'blocked';
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  signedInAt: string;
  lastActive: string;
  current: boolean;
}

export interface SecurityState {
  mfaEnabled: boolean;
  recentLogins: { device: string; date: string; time: string; ip: string }[];
  connectedDevices: { id: string; deviceName: string; lastSeen: string; location: string }[];
  alerts: { id: string; title: string; message: string; severity: 'high' | 'medium'; date: string }[];
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface SupportArticle {
  id: string;
  category: string;
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Labels & controlled taxonomies                                      */
/* ------------------------------------------------------------------ */

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  additional_info_required: 'Additional Information Required',
  rejected: 'Rejected',
  suspended: 'Suspended',
  archived: 'Archived',
};

export const PUBLIC_STATUS_LABEL: Record<PublicStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending Confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const CONSULTATION_LABEL: Record<ConsultationType, string> = {
  in_person: 'In-person',
  video: 'Video',
  teleconsultation: 'Teleconsultation',
  follow_up: 'Follow-up',
};

export const AFFILIATION_LABEL: Record<DoctorAffiliationStatus, string> = {
  invited: 'Invited',
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  removed: 'Removed',
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Hospital Owner',
  administrator: 'Hospital Administrator',
  department_manager: 'Department Manager',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
  verification_manager: 'Verification Manager',
  read_only: 'Read-Only Staff',
};

export const HOSPITAL_TYPES = [
  'General Hospital', 'Multispecialty Hospital', 'Super-Specialty Hospital', 'Teaching Hospital',
  'Government Hospital', 'Private Hospital', 'Specialty Hospital', "Children's Hospital",
  "Women's Hospital", 'Rehabilitation Hospital', 'Other verified category',
];

export const OWNERSHIP_TYPES = ['Private', 'Public', 'Government', 'Trust / Non-profit', 'Corporate Chain', 'Other'];

export const CONTROLLED_SERVICES = [
  'Emergency Care', 'Outpatient Care', 'Inpatient Care', 'Surgery', 'ICU', 'Maternity',
  'Pediatrics', 'Laboratory', 'Imaging', 'Rehabilitation', 'Pharmacy', 'Blood Bank', 'Telemedicine',
];

export const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Pulmonology', 'Gastroenterology', 'Nephrology', 'Endocrinology',
  'Oncology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'Urology', 'Ophthalmology', 'ENT',
  'Psychiatry', 'Obstetrics & Gynecology', 'General Medicine', 'General Surgery', 'Rheumatology',
  'Infectious Disease',
];

export const LAB_TESTS = [
  'Complete Blood Count', 'Blood Glucose', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test',
  'Thyroid Profile', 'HbA1c', 'Urine Analysis', 'ECG', 'ECHO', 'Troponin', 'D-Dimer', 'CRP', 'Vitamin D',
];

export const IMAGING_MODALITIES = ['X-ray', 'CT', 'MRI', 'Ultrasound', 'Mammography'];

export const DOCUMENT_TYPES: { id: HospitalDocument['type']; label: string }[] = [
  { id: 'verification', label: 'Verification' },
  { id: 'accreditation', label: 'Accreditation' },
  { id: 'license', label: 'License' },
  { id: 'facility', label: 'Facility document' },
  { id: 'contract', label: 'Contract' },
];

export const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_LABEL: Record<DayKey, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

/* ------------------------------------------------------------------ */
/* Permission matrix (§28) — no permission is granted implicitly.      */
/* ------------------------------------------------------------------ */

export const PERMISSIONS = [
  'view_profile', 'edit_profile', 'manage_services', 'manage_departments', 'manage_doctors',
  'manage_staff', 'manage_appointments', 'manage_schedule', 'view_patient_data', 'edit_patient_data',
  'manage_documents', 'manage_billing', 'view_reports', 'manage_verification',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [...PERMISSIONS],
  administrator: [
    'view_profile', 'edit_profile', 'manage_services', 'manage_departments', 'manage_doctors',
    'manage_staff', 'manage_appointments', 'manage_schedule', 'manage_documents', 'view_reports', 'manage_verification',
  ],
  department_manager: ['view_profile', 'manage_departments', 'manage_appointments', 'manage_schedule', 'view_reports'],
  receptionist: ['view_profile', 'manage_appointments'],
  doctor: ['view_profile', 'manage_schedule', 'manage_appointments', 'view_patient_data'],
  verification_manager: ['view_profile', 'manage_verification', 'manage_documents', 'view_reports'],
  read_only: ['view_profile', 'view_reports'],
};

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const todayISO = () => new Date().toISOString().slice(0, 10);
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export { addDays };

const DEFAULT_HOURS: WeeklyHours[] = [
  { id: 'hr-mon', day: 'Monday', open: '08:00', close: '20:00', closed: false },
  { id: 'hr-tue', day: 'Tuesday', open: '08:00', close: '20:00', closed: false },
  { id: 'hr-wed', day: 'Wednesday', open: '08:00', close: '20:00', closed: false },
  { id: 'hr-thu', day: 'Thursday', open: '08:00', close: '20:00', closed: false },
  { id: 'hr-fri', day: 'Friday', open: '08:00', close: '20:00', closed: false },
  { id: 'hr-sat', day: 'Saturday', open: '09:00', close: '17:00', closed: false },
  { id: 'hr-sun', day: 'Sunday', open: '10:00', close: '14:00', closed: true },
];

export const seedOrganizations: HospitalOrganization[] = [
  {
    id: 'hosp-ghmc',
    legalName: 'GlobalHealth Medical Center Pvt Ltd',
    displayName: 'GlobalHealth Medical Center',
    facilityType: 'Multispecialty Hospital',
    ownershipType: 'Private',
    description: 'A multispecialty tertiary-care hospital with 24×7 emergency services, advanced diagnostics and a full range of surgical and medical specialties.',
    website: 'https://www.ghmc.example.com',
    publicPhone: '+91 11 4000 1200',
    publicEmail: 'care@ghmc.example.com',
    address: '12 Wellness Avenue, Block C',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    postalCode: '110001',
    latitude: 28.6139,
    longitude: 77.2090,
    locationVerified: true,
    locationAccuracy: 'verified',
    verificationStatus: 'verified',
    verificationSource: 'GlobalHealth credential team · State Health Authority registry cross-check',
    verificationDate: '2026-05-14',
    publicStatus: 'published',
    completeness: 82,
    missingProfileFields: ['Add emergency information', 'Add accessibility details', 'Add hospital images'],
    hours: DEFAULT_HOURS,
    emergency: { available: false, description: '', hours: '', contact: '' },
    accessibility: { wheelchairEntrance: false, accessibleParking: false, elevators: false, accessibleRestrooms: false, hearingAssistance: false, visualAssistance: false },
    photos: [{ id: 'ph-1', category: 'exterior', caption: 'Main building exterior', visibility: 'public', approvalStatus: 'pending', fileName: 'exterior-main.jpg' }],
    accreditations: [
      { id: 'acc-1', body: 'NABH', certification: 'Hospital Accreditation', issueDate: '2024-03-01', expiryDate: addDays(todayISO(), 45), verificationStatus: 'verified', documentName: 'NABH-certificate.pdf' },
      { id: 'acc-2', body: 'State Health Authority', certification: 'Facility Registration', issueDate: '2023-06-12', verificationStatus: 'verified', documentName: 'facility-registration.pdf' },
    ],
    insurance: {
      acceptedPlans: ['MediAssure', 'CareFirst', 'State Health Scheme'],
      paymentMethods: ['Cash', 'Card', 'UPI', 'Insurance desk'],
      insuranceDesk: 'Ground floor, next to reception · +91 11 4000 1205',
      disclaimer: 'Coverage confirmation may be required before admission.',
    },
    createdAt: '2026-04-02T09:00:00Z',
    updatedAt: '2026-08-27T10:00:00Z',
  },
  {
    id: 'hosp-city',
    legalName: 'City Hospital Delhi',
    displayName: 'City Hospital',
    facilityType: 'General Hospital',
    ownershipType: 'Private',
    description: 'Community general hospital serving South Delhi with outpatient and inpatient care.',
    website: '',
    publicPhone: '+91 11 4555 0100',
    publicEmail: 'info@cityhospital.example.com',
    address: '4 Hospital Road',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    postalCode: '110016',
    latitude: 28.5700,
    longitude: 77.1800,
    locationVerified: false,
    locationAccuracy: 'approximate',
    verificationStatus: 'under_review',
    verificationSource: 'Verification in progress',
    publicStatus: 'draft',
    completeness: 45,
    missingProfileFields: ['Complete basic information', 'Add emergency information', 'Add accessibility details', 'Add hospital images', 'Verify location'],
    hours: DEFAULT_HOURS.map((h) => ({ ...h })),
    emergency: { available: false, description: '', hours: '', contact: '' },
    accessibility: { wheelchairEntrance: false, accessibleParking: false, elevators: false, accessibleRestrooms: false, hearingAssistance: false, visualAssistance: false },
    photos: [],
    accreditations: [],
    insurance: { acceptedPlans: [], paymentMethods: ['Cash', 'Card', 'UPI'], insuranceDesk: '', disclaimer: 'Coverage confirmation may be required before admission.' },
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-26T12:00:00Z',
  },
];

export const seedStaff: HospitalStaff[] = [];

export const seedDepartments: Department[] = [
  {
    id: 'dep-1', hospitalId: 'hosp-ghmc', name: 'Cardiology', specialtyId: 'sp-cardiology',
    description: 'Diagnosis and treatment of heart and vascular conditions, including interventional procedures.',
    services: ['Outpatient Care', 'ICU', 'Surgery'],
    doctorIds: ['doc-1', 'doc-2'],
    hours: [{ id: 'dh-1', day: 'Monday', open: '09:00', close: '17:00', closed: false }, { id: 'dh-2', day: 'Wednesday', open: '09:00', close: '17:00', closed: false }, { id: 'dh-3', day: 'Friday', open: '09:00', close: '14:00', closed: false }],
    status: 'active',
    appointmentSettings: { defaultDurationMin: 30, allowPublicBooking: true },
  },
  {
    id: 'dep-2', hospitalId: 'hosp-ghmc', name: 'Pediatrics', specialtyId: 'sp-pediatrics',
    description: 'Comprehensive care for infants, children and adolescents.',
    services: ['Outpatient Care', 'Inpatient Care', 'Pediatrics'],
    doctorIds: ['doc-3'],
    hours: [{ id: 'dh-4', day: 'Tuesday', open: '10:00', close: '16:00', closed: false }, { id: 'dh-5', day: 'Thursday', open: '10:00', close: '16:00', closed: false }],
    status: 'active',
    appointmentSettings: { defaultDurationMin: 20, allowPublicBooking: true },
  },
  {
    id: 'dep-3', hospitalId: 'hosp-ghmc', name: 'Laboratory & Diagnostics', specialtyId: undefined,
    description: 'Clinical laboratory and diagnostic imaging services.',
    services: ['Laboratory', 'Imaging'],
    doctorIds: [],
    status: 'active',
    appointmentSettings: { defaultDurationMin: 15, allowPublicBooking: false },
  },
  { id: 'dep-4', hospitalId: 'hosp-city', name: 'General Medicine', specialtyId: 'sp-general-medicine', description: 'Primary and general medical care.', services: ['Outpatient Care'], doctorIds: [], status: 'active', appointmentSettings: { defaultDurationMin: 30, allowPublicBooking: true } },
];

export const seedDoctors: HospitalDoctor[] = [
  { id: 'doc-1', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', specialtyId: 'sp-cardiology', name: 'Dr. Priya Nair', email: 'priya.nair@example.com', qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'], bio: 'Consultant cardiologist with 12 years of experience.', affiliationStatus: 'active', verified: true, startDate: '2024-02-01' },
  { id: 'doc-2', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', specialtyId: 'sp-cardiology', name: 'Dr. Arjun Mehta', email: 'arjun.mehta@example.com', qualifications: ['MBBS', 'MD', 'DNB (Cardiology)'], bio: 'Interventional cardiologist.', affiliationStatus: 'active', verified: true, startDate: '2024-06-15' },
  { id: 'doc-3', hospitalId: 'hosp-ghmc', departmentId: 'dep-2', specialtyId: 'sp-pediatrics', name: 'Dr. Kavita Sharma', email: 'kavita.sharma@example.com', qualifications: ['MBBS', 'MD (Pediatrics)'], bio: 'Pediatrician.', affiliationStatus: 'pending', verified: false, startDate: '2026-08-01' },
  { id: 'doc-4', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', specialtyId: 'sp-cardiology', name: 'Dr. Sunil Joshi', email: 'sunil.joshi@example.com', qualifications: ['MBBS', 'MD (Medicine)'], bio: 'Cardiology fellow.', affiliationStatus: 'invited', verified: false },
  { id: 'doc-5', hospitalId: 'hosp-city', departmentId: 'dep-4', specialtyId: 'sp-general-medicine', name: 'Dr. Meera Pillai', email: 'meera.pillai@example.com', qualifications: ['MBBS', 'MD (General Medicine)'], bio: 'General physician.', affiliationStatus: 'active', verified: true, startDate: '2026-08-10' },
];

export const seedScheduleRules: ScheduleRule[] = [
  { id: 'sched-1', hospitalId: 'hosp-ghmc', doctorId: 'doc-1', days: ['monday'], startTime: '09:00', endTime: '13:00', slotDurationMin: 30, consultationModes: ['in_person'], status: 'active' },
  { id: 'sched-2', hospitalId: 'hosp-ghmc', doctorId: 'doc-1', days: ['wednesday'], startTime: '14:00', endTime: '17:00', slotDurationMin: 30, consultationModes: ['in_person', 'follow_up'], status: 'active' },
  { id: 'sched-3', hospitalId: 'hosp-ghmc', doctorId: 'doc-2', days: ['tuesday', 'thursday'], startTime: '16:00', endTime: '20:00', slotDurationMin: 20, consultationModes: ['video'], status: 'active' },
  { id: 'sched-4', hospitalId: 'hosp-ghmc', doctorId: 'doc-3', days: ['friday'], startTime: '10:00', endTime: '14:00', slotDurationMin: 20, consultationModes: ['in_person'], status: 'draft' },
  { id: 'sched-5', hospitalId: 'hosp-city', doctorId: 'doc-5', days: ['monday', 'wednesday', 'friday'], startTime: '09:00', endTime: '15:00', slotDurationMin: 30, consultationModes: ['in_person'], status: 'active' },
];

export const seedScheduleExceptions: ScheduleException[] = [
  { id: 'sex-1', hospitalId: 'hosp-ghmc', doctorId: 'doc-1', date: addDays(todayISO(), 6), type: 'leave', reason: 'Conference — ESC Congress' },
  { id: 'sex-2', hospitalId: 'hosp-ghmc', doctorId: 'doc-2', date: addDays(todayISO(), 3), type: 'unavailable', reason: 'Procedure day (no OPD)' },
];

export const seedServices: ServiceItem[] = [
  { id: 'svc-1', hospitalId: 'hosp-ghmc', name: 'Emergency Care', description: '24×7 emergency and trauma care with resuscitation and observation.', availability: 'available', hours: '24×7', publicVisibility: true, status: 'active' },
  { id: 'svc-2', hospitalId: 'hosp-ghmc', name: 'Outpatient Care', description: 'Consultations across all major specialties.', availability: 'available', hours: '08:00–20:00', publicVisibility: true, status: 'active' },
  { id: 'svc-3', hospitalId: 'hosp-ghmc', name: 'ICU', description: 'Intensive care with continuous monitoring.', availability: 'available', hours: '24×7', publicVisibility: true, status: 'active' },
  { id: 'svc-4', hospitalId: 'hosp-ghmc', name: 'Imaging', description: 'X-ray, CT, MRI and ultrasound.', availability: 'available', hours: '08:00–20:00', publicVisibility: true, status: 'active' },
  { id: 'svc-5', hospitalId: 'hosp-ghmc', name: 'Maternity', description: 'Maternity and obstetric care.', availability: 'limited', hours: 'By appointment', publicVisibility: true, status: 'active' },
  { id: 'svc-6', hospitalId: 'hosp-city', name: 'Outpatient Care', description: 'General outpatient consultations.', availability: 'available', hours: '09:00–17:00', publicVisibility: true, status: 'active' },
];

const makePrice = (itemType: BillableCategory, itemId: string, name: string, base: number, opts?: Partial<StructuredPrice>): HospitalPrice => ({
  id: `price-${itemId}`,
  hospitalId: 'hosp-ghmc',
  itemId,
  itemType,
  name,
  departmentId: 'dep-1',
  availability: 'available',
  publicStatus: 'published',
  publicVisibility: true,
  price: {
    basePrice: base, professionalFee: 0, facilityFee: 0, consumables: 0, equipmentFee: 0,
    taxRate: 0, discount: 0, currency: 'INR', unit: 'per visit', effectiveDate: todayISO(), ...opts,
  },
  updatedAt: todayISO(),
  updatedBy: 'Hospital Administrator',
  approval: { approvedBy: 'Hospital Administrator', approvedAt: todayISO(), reason: 'Hospital tariff review' },
});

export const seedPrices: HospitalPrice[] = [
  makePrice('Consultation', 'svc-1', 'Emergency Care', 800, { unit: 'per visit', professionalFee: 500, facilityFee: 200, taxRate: 5, emergencyPrice: 1500 }),
  makePrice('OPD', 'svc-2', 'Outpatient Care', 500, { unit: 'per visit', professionalFee: 400, taxRate: 5 }),
  makePrice('ICU', 'svc-3', 'ICU', 8000, { unit: 'per day', facilityFee: 2000, consumables: 500, taxRate: 5, minimum: 1 }),
  makePrice('Imaging', 'img-1', 'X-ray', 450, { unit: 'per study', facilityFee: 150, taxRate: 5 }),
  makePrice('Imaging', 'img-2', 'CT', 4200, { unit: 'per study', professionalFee: 600, facilityFee: 400, consumables: 200, taxRate: 5, emergencyPrice: 5000 }),
  makePrice('Imaging', 'img-3', 'MRI', 8000, { unit: 'per study', professionalFee: 1000, facilityFee: 600, equipmentFee: 200, taxRate: 5 }),
  makePrice('Laboratory', 'lab-1', 'Complete Blood Count', 350, { unit: 'per test', facilityFee: 100, taxRate: 5 }),
  makePrice('Laboratory', 'lab-2', 'Lipid Profile', 700, { unit: 'per test', facilityFee: 150, taxRate: 5 }),
  makePrice('Laboratory', 'lab-3', 'Troponin', 900, { unit: 'per test', facilityFee: 150, taxRate: 5, emergencyPrice: 1200 }),
  makePrice('Laboratory', 'lab-4', 'HbA1c', 550, { unit: 'per test', facilityFee: 120, taxRate: 5 }),
];

export const seedPriceHistory: PriceHistory[] = [
  {
    id: 'ph-1', priceId: 'price-img-2', hospitalId: 'hosp-ghmc',
    oldPrice: { basePrice: 3800, professionalFee: 550, facilityFee: 350, consumables: 180, equipmentFee: 0, taxRate: 5, discount: 0, currency: 'INR', unit: 'per study', effectiveDate: '2026-01-01' },
    newPrice: { basePrice: 4200, professionalFee: 600, facilityFee: 400, consumables: 200, equipmentFee: 0, taxRate: 5, discount: 0, currency: 'INR', unit: 'per study', effectiveDate: todayISO() },
    changedBy: 'Hospital Administrator', changedAt: todayISO(), reason: 'Updated hospital tariff after vendor contract renewal', approvalState: 'approved',
  },
  {
    id: 'ph-2', priceId: 'price-svc-3', hospitalId: 'hosp-ghmc',
    oldPrice: { basePrice: 7000, professionalFee: 1800, facilityFee: 1800, consumables: 450, equipmentFee: 0, taxRate: 5, discount: 0, currency: 'INR', unit: 'per day', effectiveDate: '2026-02-01' },
    newPrice: { basePrice: 8000, professionalFee: 1800, facilityFee: 2000, consumables: 500, equipmentFee: 0, taxRate: 5, discount: 0, currency: 'INR', unit: 'per day', effectiveDate: todayISO() },
    changedBy: 'Hospital Administrator', changedAt: todayISO(), reason: 'ICU facility charge updated', approvalState: 'approved',
  },
];

export const seedSpecialties: SpecialtyItem[] = [
  { id: 'sp-cardiology', hospitalId: 'hosp-ghmc', name: 'Cardiology', departmentId: 'dep-1', status: 'active' },
  { id: 'sp-pediatrics', hospitalId: 'hosp-ghmc', name: 'Pediatrics', departmentId: 'dep-2', status: 'active' },
  { id: 'sp-general-medicine', hospitalId: 'hosp-ghmc', name: 'General Medicine', status: 'active' },
  { id: 'sp-orthopedics', hospitalId: 'hosp-ghmc', name: 'Orthopedics', status: 'inactive' },
  { id: 'sp-general-medicine-city', hospitalId: 'hosp-city', name: 'General Medicine', departmentId: 'dep-4', status: 'active' },
];

export const seedLabTests: LabTest[] = [
  { id: 'lab-1', hospitalId: 'hosp-ghmc', name: 'Complete Blood Count', category: 'Hematology', availability: 'available', departmentId: 'dep-3', hours: '08:00–20:00', bookingSupported: true },
  { id: 'lab-2', hospitalId: 'hosp-ghmc', name: 'Lipid Profile', category: 'Biochemistry', availability: 'available', departmentId: 'dep-3', hours: '08:00–20:00', bookingSupported: true },
  { id: 'lab-3', hospitalId: 'hosp-ghmc', name: 'Troponin', category: 'Cardiac markers', availability: 'limited', departmentId: 'dep-3', hours: 'Stat only', bookingSupported: false },
  { id: 'lab-4', hospitalId: 'hosp-ghmc', name: 'HbA1c', category: 'Biochemistry', availability: 'available', departmentId: 'dep-3', hours: '08:00–20:00', bookingSupported: true },
];

export const seedImaging: ImagingService[] = [
  { id: 'img-1', hospitalId: 'hosp-ghmc', modality: 'X-ray', available: true, departmentId: 'dep-3', hours: '08:00–20:00' },
  { id: 'img-2', hospitalId: 'hosp-ghmc', modality: 'CT', available: true, departmentId: 'dep-3', hours: '08:00–20:00' },
  { id: 'img-3', hospitalId: 'hosp-ghmc', modality: 'MRI', available: true, departmentId: 'dep-3', hours: 'By appointment' },
  { id: 'img-4', hospitalId: 'hosp-ghmc', modality: 'Ultrasound', available: true, departmentId: 'dep-3', hours: '08:00–20:00' },
  { id: 'img-5', hospitalId: 'hosp-ghmc', modality: 'Mammography', available: false },
];

export const seedPharmacy: PharmacyService[] = [
  { id: 'pharm-1', hospitalId: 'hosp-ghmc', name: 'GlobalHealth Pharmacy (in-house)', hours: '08:00–22:00', contact: 'Ext. 450', services: ['Dispensing', 'Home delivery (limited area)', 'Insurance billing support'], prescriptionSupport: true, relationship: 'In-house pharmacy of GlobalHealth Medical Center' },
];

export const seedBloodBank: BloodBank[] = [
  { id: 'bb-1', hospitalId: 'hosp-ghmc', name: 'GlobalHealth Blood Bank', hours: '08:00–20:00', contact: '+91 11 4000 1220', services: ['Whole blood', 'Packed red cells', 'Plasma', 'Platelets'], publicInfo: 'Registered blood bank. Donation appointments accepted.', stockDisplay: false },
];

export const seedAppointments: Appointment[] = [
  { id: 'apt-1', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-1083', date: todayISO(), time: '10:30', durationMin: 30, type: 'in_person', status: 'confirmed', bookingSource: 'public', notes: 'Routine cardiac review.' },
  { id: 'apt-2', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-0912', date: todayISO(), time: '11:30', durationMin: 30, type: 'follow_up', status: 'confirmed', bookingSource: 'portal' },
  { id: 'apt-3', hospitalId: 'hosp-ghmc', departmentId: 'dep-2', doctorId: 'doc-3', patientIdentifier: 'P-1277', date: todayISO(), time: '15:00', durationMin: 20, type: 'in_person', status: 'pending', bookingSource: 'public' },
  { id: 'apt-4', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-2', patientIdentifier: 'P-0764', date: todayISO(), time: '17:00', durationMin: 20, type: 'video', status: 'pending', bookingSource: 'public' },
  { id: 'apt-5', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-1150', date: todayISO(), time: '09:15', durationMin: 30, type: 'in_person', status: 'completed', bookingSource: 'walk_in' },
  { id: 'apt-6', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-1301', date: todayISO(), time: '12:15', durationMin: 30, type: 'in_person', status: 'cancelled', bookingSource: 'public', notes: 'Cancelled by patient' },
  { id: 'apt-7', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-2', patientIdentifier: 'P-1402', date: addDays(todayISO(), 1), time: '17:30', durationMin: 20, type: 'video', status: 'confirmed', bookingSource: 'public' },
  { id: 'apt-8', hospitalId: 'hosp-ghmc', departmentId: 'dep-2', doctorId: 'doc-3', patientIdentifier: 'P-1420', date: addDays(todayISO(), 2), time: '10:00', durationMin: 20, type: 'in_person', status: 'confirmed', bookingSource: 'public' },
  { id: 'apt-9', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-0999', date: addDays(todayISO(), 3), time: '11:00', durationMin: 30, type: 'follow_up', status: 'pending', bookingSource: 'portal' },
  { id: 'apt-10', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-1', patientIdentifier: 'P-0888', date: addDays(todayISO(), 5), time: '09:30', durationMin: 30, type: 'in_person', status: 'confirmed', bookingSource: 'walk_in' },
  { id: 'apt-11', hospitalId: 'hosp-ghmc', departmentId: 'dep-1', doctorId: 'doc-2', patientIdentifier: 'P-1212', date: addDays(todayISO(), -2), time: '18:00', durationMin: 20, type: 'video', status: 'completed', bookingSource: 'public' },
  { id: 'apt-12', hospitalId: 'hosp-ghmc', departmentId: 'dep-2', doctorId: 'doc-3', patientIdentifier: 'P-1345', date: addDays(todayISO(), -1), time: '11:30', durationMin: 20, type: 'in_person', status: 'no_show', bookingSource: 'public' },
  { id: 'apt-13', hospitalId: 'hosp-city', departmentId: 'dep-4', doctorId: 'doc-5', patientIdentifier: 'P-2011', date: todayISO(), time: '11:00', durationMin: 30, type: 'in_person', status: 'confirmed', bookingSource: 'public' },
];

export const seedDocuments: HospitalDocument[] = [
  { id: 'doc-1', hospitalId: 'hosp-ghmc', type: 'verification', name: 'Facility Registration Certificate.pdf', sizeKB: 480, version: 1, status: 'verified', uploadedBy: 'R. Kapoor', reviewedBy: 'GlobalHealth Credential Team', uploadedAt: '2026-04-03' },
  { id: 'doc-2', hospitalId: 'hosp-ghmc', type: 'license', name: 'Hospital License 2025.pdf', sizeKB: 612, version: 1, status: 'expiring_soon', uploadedBy: 'R. Kapoor', reviewedBy: 'GlobalHealth Credential Team', expiresAt: addDays(todayISO(), 24), uploadedAt: '2025-09-10' },
  { id: 'doc-3', hospitalId: 'hosp-ghmc', type: 'accreditation', name: 'NABH Accreditation.pdf', sizeKB: 890, version: 2, status: 'verified', uploadedBy: 'S. Menon', reviewedBy: 'GlobalHealth Credential Team', expiresAt: addDays(todayISO(), 45), uploadedAt: '2026-06-01' },
  { id: 'doc-4', hospitalId: 'hosp-ghmc', type: 'contract', name: 'Service Agreement 2026.pdf', sizeKB: 1240, version: 1, status: 'verified', uploadedBy: 'R. Kapoor', uploadedAt: '2026-04-10' },
];

export const seedVerification: HospitalVerification = {
  id: 'ver-ghmc', hospitalId: 'hosp-ghmc', status: 'verified', submittedAt: '2026-04-03', reviewedAt: '2026-05-14', reviewedBy: 'GlobalHealth Credential Team',
  nextAction: 'No action required — hospital is verified.', stepsDone: 5, stepsTotal: 5,
};

export const seedNotifications: NotificationItem[] = [
  { id: 'ntf-1', category: 'verification', title: 'Verification complete', message: 'GlobalHealth Medical Center is now a verified hospital.', date: '2026-05-14', read: true },
  { id: 'ntf-2', category: 'doctor_changes', title: 'Doctor affiliation pending', message: 'Dr. Kavita Sharma has not confirmed her affiliation yet.', date: '2026-08-25', read: false },
  { id: 'ntf-3', category: 'appointments', title: 'New appointment bookings', message: '2 appointments are waiting for confirmation today.', date: '2026-08-30', read: false },
  { id: 'ntf-4', category: 'profile_updates', title: 'Photo awaiting approval', message: 'Your exterior photo is pending review before public display.', date: '2026-08-28', read: false },
  { id: 'ntf-5', category: 'system', title: 'Hospital license expires soon', message: 'Hospital License 2025 expires in 24 days — upload the renewal.', date: '2026-08-27', read: false },
];

export const seedActivity: ActivityEvent[] = [
  { id: 'act-1', who: 'R. Kapoor', what: 'Updated hospital hours', when: '2026-08-27 10:00' },
  { id: 'act-2', who: 'S. Menon', what: 'Added imaging service: MRI', when: '2026-08-26 14:20' },
  { id: 'act-3', who: 'System', what: 'Affiliation status changed for Dr. Kavita Sharma → Pending', when: '2026-08-25 09:10' },
  { id: 'act-4', who: 'R. Kapoor', what: 'Submitted accreditation document (NABH)', when: '2026-08-20 16:45' },
  { id: 'act-5', who: 'A. Iyer', what: 'Rescheduled appointment P-1083', when: '2026-08-19 11:30' },
];

export const seedAudit: AuditEvent[] = [
  { id: 'aud-1', organizationId: 'hosp-ghmc', actor: 'R. Kapoor', action: 'LOGIN', resourceType: 'session', resourceId: 'sess-4401', date: '2026-08-30', time: '08:12', ip: '103.21.58.12', location: 'New Delhi, IN', outcome: 'success' },
  { id: 'aud-2', organizationId: 'hosp-ghmc', actor: 'S. Menon', action: 'PROFILE_UPDATE', resourceType: 'organization', resourceId: 'hosp-ghmc', date: '2026-08-27', time: '10:00', ip: '103.21.58.14', location: 'New Delhi, IN', outcome: 'success' },
  { id: 'aud-3', organizationId: 'hosp-ghmc', actor: 'System', action: 'DOCUMENT_EXPIRY_CHECK', resourceType: 'document', resourceId: 'doc-2', date: '2026-08-27', time: '00:00', ip: '—', location: 'GlobalHealth platform', outcome: 'success' },
  { id: 'aud-4', organizationId: 'hosp-ghmc', actor: 'Unknown', action: 'LOGIN', resourceType: 'session', resourceId: '—', date: '2026-08-26', time: '03:02', ip: '45.129.2.200', location: 'Unknown region', outcome: 'denied' },
  { id: 'aud-5', organizationId: 'hosp-ghmc', actor: 'S. Menon', action: 'STAFF_ROLE_CHANGE', resourceType: 'staff', resourceId: 'st-3', date: '2026-08-22', time: '13:40', ip: '103.21.58.14', location: 'New Delhi, IN', outcome: 'success' },
  { id: 'aud-6', organizationId: 'hosp-ghmc', actor: 'R. Kapoor', action: 'DOCUMENT_ACCESS', resourceType: 'document', resourceId: 'doc-3', date: '2026-08-20', time: '16:45', ip: '103.21.58.12', location: 'New Delhi, IN', outcome: 'success' },
];

export const seedSessions: Session[] = [];

export const seedSecurity: SecurityState = {
  mfaEnabled: false,
  recentLogins: [
    { device: 'MacBook Pro · Chrome 128', date: '2026-08-30', time: '08:12', ip: '103.21.58.12' },
    { device: 'iPad Air · Safari 18', date: '2026-08-28', time: '19:00', ip: '103.21.58.12' },
    { device: 'MacBook Pro · Chrome 127', date: '2026-08-22', time: '09:30', ip: '103.21.58.12' },
  ],
  connectedDevices: [
    { id: 'dev-1', deviceName: 'MacBook Pro (this device)', lastSeen: 'now', location: 'New Delhi, IN' },
    { id: 'dev-2', deviceName: 'iPad Air', lastSeen: 'Aug 28, 2026', location: 'New Delhi, IN' },
  ],
  alerts: [
    { id: 'alert-1', title: 'Blocked sign-in attempt', message: 'A login from an unknown region was blocked and logged.', severity: 'medium', date: '2026-08-26' },
  ],
};

export const seedTickets: SupportTicket[] = [
  { id: 'tkt-1', category: 'Profile', subject: 'Emergency hours display', body: 'Our emergency hours show as 24×7 but we want to clarify the contact number.', priority: 'normal', status: 'in_progress', createdAt: '2026-08-24' },
];

export const seedArticles: SupportArticle[] = [
  { id: 'art-1', category: 'Verification', title: 'How does hospital verification work?', body: 'Submit your facility registration, licensing and representative proof. The credential team reviews documents, verifies the facility and representative, then activates the portal. “Verified Hospital” only appears after review completes.' },
  { id: 'art-2', category: 'Profile', title: 'Why are my profile changes marked Pending Review?', body: 'Sensitive fields — accreditation, emergency services, ownership and official contacts — require admin review before they are published to the public profile.' },
  { id: 'art-3', category: 'Appointments', title: 'How is doctor availability determined?', body: 'Availability is derived from schedule rules, working hours and exceptions. The portal never claims a doctor is available unless the schedule confirms it.' },
  { id: 'art-4', category: 'Doctors', title: 'How do I add a doctor?', body: 'Use Invite Doctor. The doctor receives a secure invitation, creates or links their account and confirms the affiliation. This avoids creating unverified identities.' },
  { id: 'art-5', category: 'Security', title: 'What should I do if I see a blocked sign-in?', body: 'Review the Audit Log and Security alerts. If you did not attempt the sign-in, change your password and consider enabling two-factor authentication.' },
  { id: 'art-6', category: 'Account', title: 'How do I manage multiple hospitals?', body: 'Use the facility switcher at the top of the portal. Each facility keeps its own profile, staff, departments, doctors and appointments.' },
];

export const seedNotificationPrefs: Record<string, boolean> = {
  appointments: true,
  verification: true,
  profile_updates: true,
  doctor_changes: true,
  system: true,
  security: true,
};

/* ------------------------------------------------------------------ */
/* Completeness — honest, computed from what is actually missing.      */
/* ------------------------------------------------------------------ */

export function computeCompleteness(h: HospitalOrganization): { pct: number; missing: string[] } {
  const missing: string[] = [];
  if (!h.legalName.trim() || !h.displayName.trim()) missing.push('Complete hospital name');
  if (!h.description.trim()) missing.push('Add hospital description');
  if (!h.website.trim()) missing.push('Add website');
  if (!h.publicPhone.trim() || !h.publicEmail.trim()) missing.push('Add public contact');
  if (!h.address.trim() || !h.city.trim() || !h.postalCode.trim()) missing.push('Complete address');
  if (!h.hours.some((x) => !x.closed)) missing.push('Configure opening hours');
  if (!h.emergency.available) missing.push('Add emergency information');
  if (!Object.values(h.accessibility).some(Boolean)) missing.push('Add accessibility details');
  if (!h.photos.some((p) => p.approvalStatus === 'approved' && p.visibility === 'public')) missing.push('Add hospital images');
  if (h.accreditations.length === 0) missing.push('Add accreditations');
  if (h.insurance.acceptedPlans.length === 0) missing.push('Add insurance / payment information');
  const total = 11;
  const done = total - missing.length;
  return { pct: Math.min(100, Math.round((done / total) * 100)), missing };
}

/* ------------------------------------------------------------------ */
/* Mock service — replaceable by a real backend                        */
/* ------------------------------------------------------------------ */

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const hospitalPortalApi = {
  async login(_identifier: string, _password: string) {
    await wait();
    return {
      success: false as const,
      organizations: [] as HospitalOrganization[],
      staffRole: 'owner' as const,
      error: 'Sign in through the centralized GlobalHealth authentication page with your provisioned hospital account.'
    };
  },

  async signup() {
    await wait();
    return { success: true as const, verificationRequired: true };
  },

  async verify(_code: string) {
    await wait();
    // Local verification is intentionally non-authoritative. The server-side
    // hospital activation flow must confirm any real account; a universal or
    // demo code is never accepted from browser code.
    return { success: false as const, error: 'This sign-up must be completed through the server-verified hospital activation flow.' };
  },

  async forgot() {
    await wait();
    return { success: true as const };
  },

  async reset() {
    await wait();
    return { success: true as const };
  },
};

/* ------------------------------------------------------------------ */
/* Workspace store (context)                                           */
/* ------------------------------------------------------------------ */

export type WorkspaceView =
  | 'dashboard' | 'profile' | 'departments' | 'services' | 'specialties' | 'doctors' | 'staff'
  | 'hours' | 'location' | 'photos' | 'accreditations' | 'insurance'
  | 'appointments' | 'calendar' | 'schedules' | 'availability'
  | 'laboratory' | 'imaging' | 'pharmacy' | 'blood_bank'
  | 'pricing' | 'sync' | 'preview'
  | 'verification' | 'documents' | 'action_required'
  | 'analytics' | 'activity' | 'audit'
  | 'security' | 'sessions' | 'permissions'
  | 'help' | 'support' | 'system_status';

interface HospitalPortalState {
  organization: HospitalOrganization;
  organizations: HospitalOrganization[];
  staff: HospitalStaff[];
  departments: Department[];
  doctors: HospitalDoctor[];
  scheduleRules: ScheduleRule[];
  scheduleExceptions: ScheduleException[];
  services: ServiceItem[];
  specialties: SpecialtyItem[];
  labTests: LabTest[];
  imaging: ImagingService[];
  pharmacy: PharmacyService[];
  bloodBanks: BloodBank[];
  prices: HospitalPrice[];
  priceHistory: PriceHistory[];
  appointments: Appointment[];
  documents: HospitalDocument[];
  verification: HospitalVerification;
  notifications: NotificationItem[];
  activityEvents: ActivityEvent[];
  auditEvents: AuditEvent[];
  sessions: Session[];
  tickets: SupportTicket[];
  security: SecurityState;
  notificationPrefs: Record<string, boolean>;
  activeStaffRole: StaffRole;
  setActiveStaffRole: (role: StaffRole) => void;
  addAuditEvent: (event: { action: string; resourceType: string; resourceId: string; detail?: string; outcome?: 'success' | 'denied' | 'blocked' }) => void;
  updatePrice: (id: string, patch: Partial<HospitalPrice['price']>, reason: string) => void;
  submitPriceForReview: (id: string) => void;
  publishPrice: (id: string) => void;
  setPricePublicVisibility: (id: string, visible: boolean) => void;
  setActiveHospital: (id: string) => void;
  setOrganizations: React.Dispatch<React.SetStateAction<HospitalOrganization[]>>;
  updateOrganization: (patch: Partial<HospitalOrganization>) => void;
  submitProfileForReview: () => void;
  publishProfile: () => void;
  addDepartment: (d: Omit<Department, 'id' | 'hospitalId'>) => void;
  archiveDepartment: (id: string) => void;
  inviteDoctor: (d: Omit<HospitalDoctor, 'id' | 'hospitalId' | 'affiliationStatus' | 'verified'> & { affiliationStatus?: DoctorAffiliationStatus }) => void;
  setDoctorAffiliation: (id: string, status: DoctorAffiliationStatus) => void;
  addStaff: (s: Omit<HospitalStaff, 'id' | 'hospitalId' | 'permissions' | 'status' | 'invitedAt'>) => void;
  setStaffStatus: (id: string, status: HospitalStaff['status']) => void;
  changeStaffRole: (id: string, role: StaffRole) => void;
  addService: (s: Omit<ServiceItem, 'id' | 'hospitalId'>) => void;
  toggleServiceVisibility: (id: string) => void;
  setServiceAvailability: (id: string, availability: ServiceItem['availability']) => void;
  archiveService: (id: string) => void;
  toggleSpecialty: (id: string) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus, reason?: string) => void;
  addScheduleRule: (r: ScheduleRule) => void;
  removeScheduleRule: (id: string) => void;
  addScheduleException: (e: ScheduleException) => void;
  removeScheduleException: (id: string) => void;
  setEmergency: (e: EmergencyService) => void;
  setAccessibility: (a: Accessibility) => void;
  setHours: (hours: WeeklyHours[]) => void;
  addPhoto: (p: Omit<HospitalPhoto, 'id' | 'approvalStatus'>) => void;
  removePhoto: (id: string) => void;
  addAccreditation: (a: Omit<Accreditation, 'id' | 'verificationStatus'>) => void;
  addDocument: (d: Omit<HospitalDocument, 'id' | 'hospitalId' | 'status' | 'version' | 'uploadedBy' | 'uploadedAt'>) => void;
  submitVerification: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleNotificationPref: (key: string) => void;
  setMfaEnabled: (enabled: boolean) => void;
  revokeSession: (id: string) => void;
  signOutOtherSessions: () => void;
  addTicket: (t: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => void;
}

const HospitalPortalContext = createContext<HospitalPortalState | null>(null);

export const useHospitalPortal = (): HospitalPortalState => {
  const ctx = useContext(HospitalPortalContext);
  if (!ctx) throw new Error('useHospitalPortal must be used within HospitalPortalProvider');
  return ctx;
};

export const HospitalPortalProvider: React.FC<{ children: React.ReactNode; initialOrganizations: HospitalOrganization[]; initialRole: StaffRole }> =
  ({ children, initialOrganizations, initialRole }) => {
    const [organizations, setOrganizationsState] = useState<HospitalOrganization[]>(initialOrganizations);
    const [activeHospitalId, setActiveHospitalId] = useState(initialOrganizations[0]?.id ?? 'hosp-ghmc');
    const [staff, setStaff] = useState<HospitalStaff[]>(seedStaff);
    const [departments, setDepartments] = useState<Department[]>(seedDepartments);
    const [doctors, setDoctors] = useState<HospitalDoctor[]>(seedDoctors);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>(seedScheduleRules);
    const [scheduleExceptions, setScheduleExceptions] = useState<ScheduleException[]>(seedScheduleExceptions);
    const [services, setServices] = useState<ServiceItem[]>(seedServices);
    const [specialties, setSpecialties] = useState<SpecialtyItem[]>(seedSpecialties);
    const [labTests, setLabTests] = useState<LabTest[]>(seedLabTests);
    const [imaging, setImaging] = useState<ImagingService[]>(seedImaging);
    const [pharmacy, setPharmacy] = useState<PharmacyService[]>(seedPharmacy);
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>(seedBloodBank);
    const [prices, setPrices] = useState<HospitalPrice[]>(seedPrices);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>(seedPriceHistory);
    const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);
    const [documents, setDocuments] = useState<HospitalDocument[]>(seedDocuments);
    const [verification, setVerification] = useState<HospitalVerification>(seedVerification);
    const [notifications, setNotifications] = useState<NotificationItem[]>(seedNotifications);
    const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(seedActivity);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(seedAudit);
    const [sessions, setSessions] = useState<Session[]>(seedSessions);
    const [tickets, setTickets] = useState<SupportTicket[]>(seedTickets);
    const [security, setSecurity] = useState<SecurityState>(seedSecurity);
    const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>(seedNotificationPrefs);
    const [activeStaffRole, setActiveStaffRole] = useState<StaffRole>(initialRole);

    const organization = organizations.find((o) => o.id === activeHospitalId) ?? organizations[0];

    const setActiveHospital = useCallback((id: string) => setActiveHospitalId(id), []);
    // Pass through to the raw state setter so functional updaters keep working.
    const setOrganizations = setOrganizationsState;

    const recordAudit = useCallback((input: { action: string; resourceType: string; resourceId: string; detail?: string; outcome?: 'success' | 'denied' | 'blocked' }) => {
      const core = createAuditEvent({
        actorId: 'hospital-staff',
        actorRole: activeStaffRole,
        action: input.action as AuditAction,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        detail: input.detail,
        outcome: input.outcome,
      });
      setAuditEvents((prev) => [{
        id: core.id,
        organizationId: activeHospitalId,
        actor: `${activeStaffRole} (hospital staff)`,
        action: core.action,
        resourceType: core.resourceType || '',
        resourceId: core.resourceId || '',
        date: core.timestamp.slice(0, 10),
        time: core.timestamp.slice(11, 19),
        ip: core.ip || '10.0.0.2',
        location: 'Hospital Portal',
        outcome: core.outcome || 'success',
      }, ...prev]);
      return core;
    }, [activeHospitalId, activeStaffRole]);

    const updateOrganization = useCallback((patch: Partial<HospitalOrganization>) => {
      setOrganizations((prev) => prev.map((o) => {
        if (o.id !== activeHospitalId) return o;
        const next = { ...o, ...patch, updatedAt: new Date().toISOString() };
        const comp = computeCompleteness(next);
        next.completeness = comp.pct;
        next.missingProfileFields = comp.missing;
        return next;
      }));
    }, [activeHospitalId]);

    const submitProfileForReview = useCallback(() => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, publicStatus: 'pending_review' as PublicStatus, updatedAt: new Date().toISOString() } : o)));
    }, [activeHospitalId]);

    const publishProfile = useCallback(() => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, publicStatus: 'published' as PublicStatus, updatedAt: new Date().toISOString() } : o)));
    }, [activeHospitalId]);

    const addDepartment = useCallback((d: Omit<Department, 'id' | 'hospitalId'>) => {
      const id = createHospitalEntityId('DEPARTMENT');
      setDepartments((prev) => [{ ...d, id, hospitalId: activeHospitalId }, ...prev]);
      recordAudit({ action: 'HOSPITAL_DEPARTMENT_CHANGED', resourceType: 'Department', resourceId: id, detail: `Created ${d.name}` });
    }, [activeHospitalId, recordAudit]);

    const archiveDepartment = useCallback((id: string) => {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'archived' as const } : d)));
      recordAudit({ action: 'HOSPITAL_DEPARTMENT_CHANGED', resourceType: 'Department', resourceId: id, detail: 'Archived department' });
    }, [recordAudit]);

    const inviteDoctor = useCallback((d: Omit<HospitalDoctor, 'id' | 'hospitalId' | 'affiliationStatus' | 'verified'> & { affiliationStatus?: DoctorAffiliationStatus }) => {
      const id = createHospitalEntityId('STAFF', d.name?.slice(0, 6) || 'DOC');
      setDoctors((prev) => [{
        ...d,
        id,
        hospitalId: activeHospitalId,
        affiliationStatus: d.affiliationStatus || 'invited',
        verified: false,
      }, ...prev]);
      recordAudit({ action: 'HOSPITAL_DOCTOR_CHANGED', resourceType: 'Doctor', resourceId: id, detail: `Invited ${d.name}` });
    }, [activeHospitalId, recordAudit]);

    const setDoctorAffiliation = useCallback((id: string, status: DoctorAffiliationStatus) => {
      setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, affiliationStatus: status, endDate: status === 'removed' || status === 'suspended' ? todayISO() : d.endDate } : d)));
      recordAudit({ action: 'HOSPITAL_DOCTOR_CHANGED', resourceType: 'Doctor', resourceId: id, detail: `Affiliation set to ${status}` });
    }, [recordAudit]);

    const addStaff = useCallback((s: Omit<HospitalStaff, 'id' | 'hospitalId' | 'permissions' | 'status' | 'invitedAt'>) => {
      const id = createHospitalEntityId('STAFF', s.name?.slice(0, 6) || 'STF');
      setStaff((prev) => [{
        ...s,
        id,
        hospitalId: activeHospitalId,
        permissions: [...ROLE_PERMISSIONS[s.role]],
        status: 'invited',
        invitedAt: todayISO(),
      }, ...prev]);
      recordAudit({ action: 'HOSPITAL_STAFF_CHANGED', resourceType: 'Staff', resourceId: id, detail: `Added ${s.name} as ${s.role}` });
    }, [activeHospitalId, recordAudit]);

    const setStaffStatus = useCallback((id: string, status: HospitalStaff['status']) => {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      recordAudit({ action: 'HOSPITAL_STAFF_CHANGED', resourceType: 'Staff', resourceId: id, detail: `Status set to ${status}` });
    }, [recordAudit]);

    const changeStaffRole = useCallback((id: string, role: StaffRole) => {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, role, permissions: [...ROLE_PERMISSIONS[role]] } : s)));
      recordAudit({ action: 'HOSPITAL_STAFF_CHANGED', resourceType: 'Staff', resourceId: id, detail: `Role changed to ${role}` });
    }, [recordAudit]);

    const addService = useCallback((s: Omit<ServiceItem, 'id' | 'hospitalId'>) => {
      const id = createHospitalEntityId('PATIENT_RECORD', s.name?.slice(0, 6) || 'SVC');
      setServices((prev) => [{ ...s, id, hospitalId: activeHospitalId }, ...prev]);
      recordAudit({ action: 'HOSPITAL_SERVICE_CHANGED', resourceType: 'Service', resourceId: id, detail: `Added ${s.name}` });
    }, [activeHospitalId, recordAudit]);

    const toggleServiceVisibility = useCallback((id: string) => {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, publicVisibility: !s.publicVisibility } : s)));
      recordAudit({ action: 'HOSPITAL_SERVICE_CHANGED', resourceType: 'Service', resourceId: id, detail: 'Toggled public visibility' });
    }, [recordAudit]);

    const setServiceAvailability = useCallback((id: string, availability: ServiceItem['availability']) => {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, availability } : s)));
      recordAudit({ action: 'HOSPITAL_SERVICE_CHANGED', resourceType: 'Service', resourceId: id, detail: `Availability set to ${availability}` });
    }, [recordAudit]);

    const archiveService = useCallback((id: string) => {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'archived' as const } : s)));
      recordAudit({ action: 'HOSPITAL_SERVICE_CHANGED', resourceType: 'Service', resourceId: id, detail: 'Archived service' });
    }, [recordAudit]);

    const toggleSpecialty = useCallback((id: string) => {
      setSpecialties((prev) => prev.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' as const : 'active' as const } : s)));
    }, []);

    const updatePrice = useCallback((id: string, patch: Partial<StructuredPrice>, reason: string) => {
      setPrices((prev) => {
        const target = prev.find((p) => p.id === id);
        if (!target) return prev;
        const next = { ...target, price: { ...target.price, ...patch }, updatedAt: todayISO(), publicStatus: 'pending_review' as PublicStatus };
        const historyId = createHospitalEntityId('PRICE_HISTORY');
        setPriceHistory((h) => [{
          id: historyId,
          priceId: id,
          hospitalId: target.hospitalId,
          oldPrice: target.price,
          newPrice: next.price,
          changedBy: 'Hospital Administrator',
          changedAt: todayISO(),
          reason,
          approvalState: 'pending',
        }, ...h]);
        recordAudit({ action: 'HOSPITAL_PRICE_CHANGED', resourceType: 'Price', resourceId: id, detail: reason });
        return prev.map((p) => (p.id === id ? next : p));
      });
    }, [recordAudit]);

    const submitPriceForReview = useCallback((id: string) => {
      setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, publicStatus: 'pending_review' as PublicStatus, updatedAt: todayISO() } : p)));
      recordAudit({ action: 'HOSPITAL_PRICE_CHANGED', resourceType: 'Price', resourceId: id, detail: 'Submitted price for review' });
    }, [recordAudit]);

    const publishPrice = useCallback((id: string) => {
      setPrices((prev) => prev.map((p) => (p.id === id ? {
        ...p,
        publicStatus: 'published' as PublicStatus,
        updatedAt: todayISO(),
        approval: { approvedBy: 'Hospital Administrator', approvedAt: todayISO(), reason: 'Price approved for GlobalHealth publication' },
      } : p)));
      recordAudit({ action: 'HOSPITAL_PRICE_PUBLISHED', resourceType: 'Price', resourceId: id, detail: 'Published price to public tariff' });
    }, [recordAudit]);

    const setPricePublicVisibility = useCallback((id: string, visible: boolean) => {
      setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, publicVisibility: visible, updatedAt: todayISO() } : p)));
      recordAudit({ action: 'HOSPITAL_PRICE_CHANGED', resourceType: 'Price', resourceId: id, detail: `Public visibility ${visible ? 'enabled' : 'disabled'}` });
    }, [recordAudit]);

    const setAppointmentStatus = useCallback((id: string, status: AppointmentStatus) => {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      recordAudit({ action: 'HOSPITAL_APPOINTMENT_CHANGED', resourceType: 'Appointment', resourceId: id, detail: `Status set to ${status}` });
    }, [recordAudit]);

    const addScheduleRule = useCallback((r: ScheduleRule) => setScheduleRules((prev) => [...prev, r]), []);
    const removeScheduleRule = useCallback((id: string) => setScheduleRules((prev) => prev.filter((r) => r.id !== id)), []);
    const addScheduleException = useCallback((e: ScheduleException) => setScheduleExceptions((prev) => [...prev, e]), []);
    const removeScheduleException = useCallback((id: string) => setScheduleExceptions((prev) => prev.filter((e) => e.id !== id)), []);

    const setEmergency = useCallback((e: EmergencyService) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, emergency: e } : o)));
    }, [activeHospitalId]);

    const setAccessibility = useCallback((a: Accessibility) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, accessibility: a } : o)));
    }, [activeHospitalId]);

    const setHours = useCallback((hours: WeeklyHours[]) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, hours } : o)));
    }, [activeHospitalId]);

    const addPhoto = useCallback((p: Omit<HospitalPhoto, 'id' | 'approvalStatus'>) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, photos: [...o.photos, { ...p, id: `ph-${Date.now()}`, approvalStatus: 'pending' as const }] } : o)));
    }, [activeHospitalId]);

    const removePhoto = useCallback((id: string) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, photos: o.photos.filter((p) => p.id !== id) } : o)));
    }, [activeHospitalId]);

    const addAccreditation = useCallback((a: Omit<Accreditation, 'id' | 'verificationStatus'>) => {
      setOrganizations((prev) => prev.map((o) => (o.id === activeHospitalId ? { ...o, accreditations: [...o.accreditations, { ...a, id: `acc-${Date.now()}`, verificationStatus: 'pending' as const }] } : o)));
    }, [activeHospitalId]);

    const addDocument = useCallback((d: Omit<HospitalDocument, 'id' | 'hospitalId' | 'status' | 'version' | 'uploadedBy' | 'uploadedAt'>) => {
      const id = createHospitalEntityId('PATIENT_RECORD', d.name?.slice(0, 6) || 'DOC');
      setDocuments((prev) => [{
        ...d,
        id,
        hospitalId: activeHospitalId,
        status: 'pending_verification',
        version: 1,
        uploadedBy: 'Hospital administrator',
        uploadedAt: todayISO(),
      }, ...prev]);
      recordAudit({ action: 'HOSPITAL_DOCUMENT_CHANGED', resourceType: 'Document', resourceId: id, detail: `Uploaded ${d.name}` });
    }, [activeHospitalId, recordAudit]);

    const submitVerification = useCallback(() => {
      setVerification((prev) => ({ ...prev, status: 'under_review', submittedAt: todayISO(), nextAction: 'Document review in progress — the credential team verifies your facility registration and representative.' }));
      recordAudit({ action: 'HOSPITAL_VERIFICATION_CHANGED', resourceType: 'Verification', resourceId: verification.id || activeHospitalId, detail: 'Submitted verification for review' });
    }, [activeHospitalId, recordAudit, verification.id]);

    const markNotificationRead = useCallback((id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllNotificationsRead = useCallback(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const toggleNotificationPref = useCallback((key: string) => {
      setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const setMfaEnabled = useCallback((enabled: boolean) => {
      setSecurity((prev) => ({ ...prev, mfaEnabled: enabled }));
    }, []);

    const revokeSession = useCallback((id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const signOutOtherSessions = useCallback(() => {
      setSessions((prev) => prev.filter((s) => s.current));
    }, []);

    const addTicket = useCallback((t: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => {
      setTickets((prev) => [{ ...t, id: `tkt-${Date.now()}`, createdAt: todayISO(), status: 'open' }, ...prev]);
    }, []);

    const value = useMemo<HospitalPortalState>(() => ({
      organization, organizations, staff, departments, doctors, scheduleRules, scheduleExceptions,
      services, specialties, labTests, imaging, pharmacy, bloodBanks, prices, priceHistory, appointments, documents,
      verification, notifications, activityEvents, auditEvents, sessions, tickets, security,
      notificationPrefs, activeStaffRole, setActiveStaffRole, addAuditEvent: recordAudit,
      setActiveHospital, setOrganizations, updateOrganization, submitProfileForReview, publishProfile,
      addDepartment, archiveDepartment, inviteDoctor, setDoctorAffiliation, addStaff,
      setStaffStatus, changeStaffRole, addService, toggleServiceVisibility, setServiceAvailability,
      archiveService, toggleSpecialty, setAppointmentStatus, addScheduleRule, removeScheduleRule,
      addScheduleException, removeScheduleException, setEmergency, setAccessibility, setHours,
      addPhoto, removePhoto, addAccreditation, addDocument, submitVerification, markNotificationRead,
      markAllNotificationsRead, toggleNotificationPref, setMfaEnabled, revokeSession,
      signOutOtherSessions, addTicket, updatePrice, submitPriceForReview, publishPrice, setPricePublicVisibility,
    }), [organization, organizations, staff, departments, doctors, scheduleRules, scheduleExceptions,
      services, specialties, labTests, imaging, pharmacy, bloodBanks, prices, priceHistory, appointments, documents,
      verification, notifications, activityEvents, auditEvents, sessions, tickets, security,
      notificationPrefs, activeStaffRole, setActiveStaffRole, recordAudit, activeHospitalId,
      setActiveHospital, setOrganizations, updateOrganization, submitProfileForReview, publishProfile,
      addDepartment, archiveDepartment, inviteDoctor, setDoctorAffiliation, addStaff,
      setStaffStatus, changeStaffRole, addService, toggleServiceVisibility, setServiceAvailability,
      archiveService, toggleSpecialty, setAppointmentStatus, addScheduleRule, removeScheduleRule,
      addScheduleException, removeScheduleException, setEmergency, setAccessibility, setHours,
      addPhoto, removePhoto, addAccreditation, addDocument, submitVerification, markNotificationRead,
      markAllNotificationsRead, toggleNotificationPref, setMfaEnabled, revokeSession,
      signOutOtherSessions, addTicket, updatePrice, submitPriceForReview, publishPrice, setPricePublicVisibility]);

    return <HospitalPortalContext.Provider value={value}>{children}</HospitalPortalContext.Provider>;
  };

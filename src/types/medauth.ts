// ==========================================
// 1. DOCTOR & PRACTITIONER REGISTRY SCHEMA
// ==========================================
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'FLAGGED' | 'SUSPENDED';

export interface DoctorProfile {
  id: string;                          // Primary internal UUID (e.g. "doc-alexandra-chen")
  fullName: string;                    // Formal title and legal name (e.g. "Dr. Alexandra Chen, MD")
  post: string;                        // Clinical title (e.g. "Chief of Interventional Cardiology")
  npiNumber: string;                   // 10-digit National Provider Identifier (e.g. "1982736410")
  medicalCouncilNumber: string;        // State Medical Board ID (e.g. "MB-CA-948271")
  licenseNumber: string;               // State Medical License (e.g. "C158942-CA")
  speciality: string;                  // Primary clinical specialty
  hospitalAffiliation: string;         // Primary medical center or hospital network
  email: string;                       // Secure institutional email
  phone: string;                       // Direct clinical extension / phone number
  yearsOfPractice: number;             // Clinical tenure in years
  boardCertifications: string[];       // Accredited specialties (e.g. ["ABIM Internal Medicine", "ABIM Cardiology"])
  status: VerificationStatus;          // Real-time Medical Board verification status
  confidenceScore: number;             // Automated OCR / Registry match confidence (0 - 100)
  verifiedAt: string;                  // ISO 8601 Verification timestamp
  verificationBadgeId: string;         // Cryptographic badge hash (e.g. "MEDAUTH-88231-CHEN")
  aiAuditSummary: string;              // Algorithmic summary of verified credentials
  mismatches: string[];                // Discrepancy flags (if any)
  securityHash: string;                // SHA-256 checksum of provider payload
  integrationToken: string;            // API secret for third-party widget and webhook integration
  embeddedViewsCount: number;          // Telemetry counter for external badge embeds
  lastVerifiedCheck: string;           // Timestamp of last real-time board registry check
  avatarUrl?: string;                  // Optional profile portrait
  deaNumber?: string;                  // DEA registration number
}

// ==========================================
// 2. ELECTRONIC HEALTH RECORD (EHR) SCHEMA
// ==========================================
export interface PatientVitals {
  bp: string;                          // Blood pressure formatted string (e.g. "128/82 mmHg")
  hr: number;                          // Heart rate in beats per minute
  spo2: number;                        // Oxygen saturation percentage (e.g. 98)
  temp: number;                        // Body temperature in Fahrenheit (e.g. 98.6)
  weightKg: number;                    // Body weight in kilograms
  heightCm: number;                    // Body height in centimeters
  bmi: number;                         // Calculated Body Mass Index
  respiratoryRate: number;             // Breaths per minute
}

export interface VitalsDataPoint {
  date: string;                        // ISO date string (YYYY-MM-DD)
  systolic: number;                    // Systolic BP (mmHg)
  diastolic: number;                   // Diastolic BP (mmHg)
  heartRate: number;                   // Heart rate (BPM)
  glucose: number;                     // Fasting glucose (mg/dL)
  spo2?: number;                       // Blood oxygen %
}

export interface BiomarkerResult {
  id: string;
  name: string;
  loincCode?: string;
  resultValue: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  referenceRange: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  interpretation?: string;
  critical?: boolean;
}

export interface LabTrendPoint {
  date: string;
  value: number;
  displayValue: string;
  unit: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  notes?: string;
}

export interface LabReportItem {
  id: string;                          // Unique report UUID
  testName: string;                    // Clinical test name (e.g. "Hemoglobin A1c")
  category: 'Hematology' | 'Metabolic' | 'Lipid' | 'Cardiology' | 'Urinalysis' | 'Endocrine' | 'Renal';
  resultValue: string;                 // Measured quantitative result (e.g. "5.8")
  unit: string;                        // Unit of measurement (e.g. "%", "mg/dL", "U/L")
  referenceRange: string;              // Standard laboratory reference interval (e.g. "4.0 - 5.6")
  status: 'NORMAL' | 'HIGH' | 'CRITICAL' | 'LOW';
  performedAt: string;                 // ISO date of laboratory execution
  reportedAt?: string;                 // ISO date of laboratory report finalization
  doctorNotes: string;                 // Attending physician's clinical notes
  physicianNoteAuthor?: string;        // Attending clinician name (e.g. "Dr. Alexandra Chen, MD")
  physicianNoteTimestamp?: string;     // Timestamp of clinical interpretation
  reviewStatus?: 'PENDING_REVIEW' | 'REVIEWED' | 'REQUIRES_ACTION';
  reviewedBy?: string;                 // Clinician who marked reviewed
  reviewedAt?: string;                 // ISO timestamp of review
  performingLab?: {
    name: string;
    facilityId?: string;
    cliaNumber?: string;
    accreditation?: string;
    director?: string;
  };
  specimen?: {
    type: string;                      // e.g. "Venous Whole Blood", "Serum"
    collectedAt: string;
    receivedAt?: string;
    fastingStatus?: 'Fasting (12 hrs)' | 'Non-Fasting' | 'Random';
  };
  loincCode?: string;                  // Standard LOINC Code (e.g. "2085-9")
  biomarkers?: BiomarkerResult[];      // Multi-analyte panel constituents
  historicalTrends?: LabTrendPoint[];  // 3+ point longitudinal data
  sourceDocument?: {
    filename: string;
    filesize?: string;
    mimeType?: string;
    verifiedHash?: string;
  };
}

export interface ClinicalTimelineEvent {
  id: string;
  date: string;
  type: 'Consultation' | 'Surgery' | 'Hospitalization' | 'Immunization' | 'Diagnostic';
  title: string;
  clinician: string;
  facility: string;
  soapNotes?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface PatientRecord {
  id: string;                          // Patient record identifier (e.g. "PT-100293")
  name: string;                        // Full legal patient name
  age: number;                         // Patient age in years
  gender: 'Male' | 'Female' | 'Other'; // Biological sex / gender
  mrn: string;                         // Medical Record Number
  bloodGroup: string;                  // ABO and Rh blood classification (e.g. "O+")
  dob?: string;                        // Date of birth (YYYY-MM-DD)
  phone?: string;                      // Patient contact phone
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  status?: 'Active' | 'Follow-up' | 'High-Priority' | 'New Patient';
  criticalAlerts?: string[];           // Red clinical alerts (e.g. "SEVERE PENICILLIN ALLERGY")
  primaryCondition?: string;           // Main chief diagnostic condition
  lastVisited?: string;                // Date of last clinical visit
  allergies: string[];                 // Drug and environmental allergies
  chronicConditions: string[];         // Active clinical diagnoses (ICD-10 aligned)
  currentMedications: string[];        // Active pharmaceutical regimen
  recentVitals: PatientVitals;         // Most recent biometric telemetry
  vitalsHistory: VitalsDataPoint[];    // Longitudinal telemetry dataset
  labReports: LabReportItem[];         // Laboratory diagnostic history
  clinicalTimeline?: ClinicalTimelineEvent[];
  medicalHistory?: Array<{
    category: string;
    description: string;
    diagnosedDate?: string;
    status?: string;
  }>;
  symptoms?: Array<{
    symptom: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
    duration: string;
    onset: string;
  }>;
  diagnoses?: Array<{
    icd10: string;
    description: string;
    type: 'Primary' | 'Secondary' | 'Chronic';
    diagnosedDate: string;
    status: 'Active' | 'Resolved' | 'Under Investigation';
  }>;
  prescriptionsList?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    prescribedDate: string;
    prescribedBy: string;
    status: 'Active' | 'Completed' | 'Discontinued';
    refillsRemaining: number;
  }>;
  procedures?: Array<{
    id: string;
    procedureName: string;
    date: string;
    facility: string;
    surgeon: string;
    status: 'Completed' | 'Scheduled' | 'Recommended';
    notes?: string;
  }>;
  immunizations?: Array<{
    vaccineName: string;
    dateAdministered: string;
    doseNumber: string;
    lotNumber: string;
    facility: string;
    status: 'Up to Date' | 'Due Soon' | 'Overdue';
  }>;
  hospitalizations?: Array<{
    id: string;
    admissionDate: string;
    dischargeDate: string;
    reason: string;
    facility: string;
    attendingPhysician: string;
    dischargeSummary: string;
  }>;
  imagingReports?: Array<{
    id: string;
    modality: string;
    bodyPart: string;
    date: string;
    findings: string;
    impression: string;
    radiologist: string;
    status: 'Final' | 'Preliminary';
  }>;
  documents?: Array<{
    id: string;
    title: string;
    category: string;
    uploadedDate: string;
    fileSize: string;
    fileType: string;
  }>;
  doctorNotesList?: Array<{
    id: string;
    date: string;
    author: string;
    authorRole: string;
    note: string;
    category: string;
  }>;
}

// ==========================================
// 3. E-PRESCRIPTION & SAFETY SCHEMA
// ==========================================
export type DeaScheduleType = 'NON_CONTROLLED' | 'SCHEDULE_II' | 'SCHEDULE_III' | 'SCHEDULE_IV' | 'SCHEDULE_V';
export type AdminRouteType = 'Oral' | 'Sublingual' | 'Intravenous' | 'Intramuscular' | 'Topical' | 'Inhalation' | 'Ophthalmic';

export interface PrescriptionItem {
  id: string;                          // Unique item UUID
  medicationName: string;              // Generic and brand drug formulation
  dosage: string;                      // Unit dose (e.g. "20mg", "500mg/5mL")
  frequency: string;                   // Administration timing (e.g. "Once daily with breakfast")
  duration: string;                    // Course duration (e.g. "30 days", "Until finished")
  route: AdminRouteType;               // Delivery pathway
  instructions: string;                // Specific patient instructions
  deaSchedule: DeaScheduleType;        // Drug Enforcement Administration classification
  refillsAllowed: number;              // Approved refill count
}

export interface DrugInteractionAlert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  medicationPair: [string, string];
  description: string;
  clinicalAction: string;
}

export interface AppointmentItem {
  id: string;
  time: string;
  date: string;
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  reason: string;
  type: 'Clinic (In-Person)' | 'Video Call (Telemedicine)' | 'TELEMEDICINE' | 'IN_PERSON';
  status: 'Waiting' | 'In-Progress' | 'Confirmed' | 'Completed' | 'Cancelled' | 'SCHEDULED';
  priority?: 'Routine' | 'High-Priority' | 'Follow-up';
  notes?: string;
  vitalsSummary?: string;
  doctorName?: string;
  roomOrDesk?: string;
}

export interface ClinicalMessage {
  id: string;
  senderName: string;
  senderRole: 'Patient' | 'Pharmacist' | 'Specialist' | 'Nurse';
  patientName?: string;
  subject: string;
  message: string;
  timestamp: string;
  unread: boolean;
  tag: 'Prescription Refill' | 'Lab Follow-up' | 'Urgent' | 'General';
}

export interface BillingClaim {
  id: string;
  patientName: string;
  mrn: string;
  dateOfService: string;
  cptCode: string;
  cptDescription: string;
  icd10Code: string;
  icd10Description: string;
  feeAmount: number;
  insurancePayer: string;
  claimStatus: 'PAID' | 'PENDING' | 'SUBMITTED' | 'FLAGGED';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  message?: string;
  type: 'CRITICAL_LAB' | 'APPOINTMENT' | 'PHARMACY' | 'BOARD_AUDIT' | 'PATIENT_UPDATE' | 'CLINICAL_ALERT' | 'PRESCRIPTION_SIGNED' | 'LAB_RESULT' | 'APPOINTMENT_BOOKED';
  timeAgo: string;
  read: boolean;
  unread?: boolean;
  actionRequired?: boolean;
}

export interface ReferralRequest {
  id: string;
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  targetSpeciality: string;
  targetFacility: string;
  urgency: 'ROUTINE' | 'PRIORITY' | 'EMERGENCY';
  reasonForReferral: string;
  clinicalSummary: string;
  attachedDiagnostics: string[];
  createdAt: string;
  status: 'DISPATCHED' | 'ACCEPTED' | 'COMPLETED';
}


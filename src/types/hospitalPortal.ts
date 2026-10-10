// GlobalHealth Enterprise Hospital Portal Master Domain Types

export type RoleType =
  | 'Hospital Administrator'
  | 'Medical Director'
  | 'Doctor / Specialist'
  | 'Chief Nurse / Matron'
  | 'Hospital Owner'
  | 'Department Head'
  | 'Billing & Finance'
  | 'Lab Incharge'
  | 'Blood Bank Officer'
  | 'Chief Pharmacist'
  | 'Biomedical Engineer'
  | 'GlobalHealth SuperAdmin';

export type NavigationView =
  | 'dashboard'
  | 'profile'
  | 'organization'
  | 'public-sync'
  | 'doctors'
  | 'staff'
  | 'appointments'
  | 'capacity'
  | 'emergency'
  | 'ambulance'
  | 'diagnostics'
  | 'blood-bank'
  | 'pharmacy'
  | 'equipment'
  | 'tariffs'
  | 'insurance'
  | 'documents'
  | 'drafts'
  | 'communication'
  | 'analytics'
  | 'audit-logs'
  | 'security'
  | 'settings'
  | 'support'
  | 'global-admin'
  | 'auth';

export interface HospitalFacility {
  id: string;                         // Primary Key: e.g. "HSP-IN-DL-000125"
  orgId: string;                      // Corporate Enterprise ID: "ORG-APEX-001"
  name: string;                       // Public Name: "Apex Institute of Medical Sciences"
  legalName: string;                  // Registered Legal Name: "Apex Healthcare Ltd."
  shortName: string;                  // Moniker: "Apex Trauma Center"
  tagline: string;                    // Clinical Mission Statement
  hospitalType: 'Super Specialty' | 'Multi Specialty' | 'Tertiary Care' | 'Teaching Hospital';
  ownership: 'Private' | 'Trust / Non-Profit' | 'Government / Public';
  establishedYear: number;            // e.g. 1998
  registrationNo: string;             // State Health Directorate Reg No
  cinNo: string;                      // Corporate Identification Number
  officialEmail: string;              // admin@apexhealth.org
  emergencyPhone: string;             // +91 11 2659 8888 (24/7 Red Alert Hotline)
  mainReceptionPhone: string;         // +91 11 2659 8000
  opdAppointmentPhone: string;        // +91 11 2659 8111
  bloodBankHelpline: string;          // +91 11 2659 8222
  ambulanceHelpline: string;          // +91 11 2659 8333
  tpaInsuranceDeskPhone: string;      // +91 11 2659 8444
  websiteUrl: string;                 // https://apexhealth.org
  streetAddress: string;              // Sector 6, Institutional Area, Outer Ring Road
  city: string;
  state: string;
  country: string;
  postalCode: string;
  emergencyHours: string;
  opdHours: string;
  visitingHours: string;
  pharmacyHours: string;
  bloodBankHours: string;
  verificationStatus: 'Verified' | 'Pending Audit' | 'Suspended';
  redAlertActive: boolean;            // Emergency Code Red trigger
  traumaLevel: 'Level 1 Trauma Center' | 'Level 2 Trauma Center' | 'Level 3 Emergency';
  imageUrl?: string;
  rating?: number;
  totalBedsCount?: number;
  icuBedsCount?: number;
}

export interface Department {
  id: string;                         // PK: e.g. "DEPT-CARDIO"
  hospitalId: string;                 // FK -> HospitalFacility.id
  code: string;                       // e.g. "CARDIO-01"
  name: string;                       // "Cardiology & Vascular Institute"
  headOfDepartment: string;           // "Prof. Dr. Vikram Sethi"
  wingId: string;                     // FK -> Wing.id
  wingName: string;                   // "South Tower"
  floor: string;                      // "Level 3"
  totalBeds: number;
  specialistsCount: number;
  subspecialties: string[];
  status: 'Operational' | 'Active 24/7' | 'Under Expansion';
  phoneExtension: string;
}

export interface Wing {
  id: string;                         // PK: e.g. "WING-SOUTH"
  hospitalId: string;                 // FK -> HospitalFacility.id
  code: string;                       // e.g. "ST-01"
  name: string;                       // "South Tower (Cardiology & Surgery)"
  floors: string;                     // "Level 1 to 5"
  totalBeds: number;
  occupiedBeds: number;
  securityZone: 'Sterile OR Zone' | 'Semi-Sterile Inpatient' | 'Isolation Clean Room' | 'Emergency Access';
  hasHelipad: boolean;
  hasDedicatedICU: boolean;
  leadNurseSupervisor: string;
}

export interface OTRoom {
  id: string;
  hospitalId: string;
  name: string;                       // "OT-1: Hybrid Cardiothoracic Suite"
  wingName: string;
  floor: string;
  specialty: string;
  status: 'In Surgery' | 'Available / Ready' | 'Sanitization in Progress' | 'Maintenance';
  currentProcedure?: string;
  leadSurgeon?: string;
  airPressure: 'Positive Pressure Sterile' | 'Negative Pressure Isolation';
  hepaFiltered: boolean;
  lastSterilizedAt: string;
}

export interface HospitalUser {
  id: string;                         // Primary Key: e.g. "USR-ADM-001"
  name: string;                       // Full Legal Name
  email: string;                      // Unique Work Email
  password?: string;
  role: RoleType;                     // One of 12 distinct RBAC roles
  hospitalId: string;                 // FK -> HospitalFacility.id
  hospitalName: string;
  department: string;
  employeeId: string;
  registrationNumber?: string;        // Medical Council Reg No
  phone?: string;
  avatar?: string;
  createdAt: string;                  // ISO Date
  lastLoginAt: string;
  twoFactorEnabled: boolean;
  status: 'Active' | 'On Leave' | 'Suspended';
}

export interface PortalDoctor {
  id: string;                         // PK: e.g. "DOC-101"
  hospitalId: string;                 // FK -> HospitalFacility.id
  name: string;                       // e.g. "Dr. Vikram Sethi"
  specialty: string;                  // e.g. "Cardiothoracic Surgery"
  subspecialty: string;               // e.g. "Minimally Invasive Valve Repair"
  departmentId: string;               // FK -> Department.id
  departmentName: string;
  qualifications: string;             // "MBBS, MS (Surg), MCh (CTVS), FACS"
  registrationNo: string;             // "DMC/R/98214"
  council: string;                    // "Delhi Medical Council / NMC"
  experienceYears: number;
  consultationFee: number;            // In standard currency unit
  followUpFee: number;
  teleconsultFee: number;
  roomNumber: string;                 // "OPD Suite 204"
  opdSchedule: string;                // "Mon, Wed, Fri (09:00 - 13:00)"
  status: 'Active' | 'Consulting' | 'In Surgery' | 'On Leave';
  avatar: string;
  contactEmail: string;
  contactPhone: string;
}

export interface PortalBed {
  id: string;                         // PK: e.g. "BED-ICU-04"
  hospitalId: string;                 // FK -> HospitalFacility.id
  bedNumber: string;                  // "ICU-A-04"
  wingId: string;                     // FK -> Wing.id
  wingName: string;                   // "South Tower"
  floor: string;                      // "Floor 3"
  wardType: 'General Ward' | 'Semi-Private' | 'Private Deluxe' | 'ICU' | 'CCU' | 'NICU' | 'Isolation / Negative Pressure';
  dailyTariff: number;
  status: 'Available' | 'Occupied' | 'Under Maintenance' | 'Sanitization in Progress';
  assignedPatientName?: string;
  assignedPatientId?: string;         // MRN: "MRN-2026-8812"
  assignedDoctorName?: string;
  oxygenSupported: boolean;
  ventilatorAttached: boolean;
  multiparaMonitorAttached: boolean;
  lastSanitizedAt: string;
}

export interface PortalAmbulance {
  id: string;                         // PK: e.g. "AMB-01"
  hospitalId: string;
  vehicleNumber: string;              // "DL-01-AB-9901"
  ambulanceType: 'Advanced Life Support (ALS)' | 'Basic Life Support (BLS)' | 'Neonatal Intensive Care (NICU Ambulance)' | 'Patient Transport';
  driverName: string;
  driverPhone: string;
  paramedicName: string;
  status: 'Available' | 'Dispatched / In Transit' | 'At Incident Scene' | 'Returning with Patient' | 'Maintenance';
  currentLocation: string;            // GPS / Landmark Telemetry
  equipmentList: string[];            // ["Defibrillator", "Transport Ventilator", "Syringe Pumps"]
  destination?: string;
  etaMinutes?: number;
  dispatchTime?: string;
}

export interface BloodInventoryItem {
  id: string;                         // PK: e.g. "BLD-O-POS"
  hospitalId: string;                 // FK -> HospitalFacility.id
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  wholeBloodUnits: number;
  prbcUnits: number;                  // Packed Red Blood Cells
  ffpUnits: number;                   // Fresh Frozen Plasma
  plateletUnits: number;              // Single / Random Donor Platelets
  cryoprecipitateUnits: number;
  criticalMinThreshold: number;       // Safety trigger margin
  lastRestockedAt: string;
}

export interface TransfusionRequisition {
  id: string;
  hospitalId: string;
  patientMRN: string;
  patientName: string;
  bloodGroup: string;
  component: 'PRBC' | 'FFP' | 'Platelets' | 'Whole Blood' | 'Cryo';
  unitsRequested: number;
  urgency: 'STAT / Emergency (<15 mins)' | 'Urgent (1 Hour)' | 'Elective OT';
  orderingDoctor: string;
  department: string;
  /** Free-text clinical justification captured on the requisition form. */
  clinicalIndication?: string;
  status: 'Pending Crossmatch' | 'Crossmatched & Issued' | 'Transfused' | 'Cancelled';
  requestedAt: string;
}

export interface PharmacyItem {
  id: string;
  hospitalId: string;
  drugCode: string;                   // "DRG-HEPARIN-5000"
  brandName: string;                  // "Heparin Sodium Injection"
  genericName: string;                // "Heparin 5000 IU/ml"
  category: 'High-Alert / Critical Care' | 'Antibiotic Stewardship' | 'Schedule H / Controlled' | 'General Formulary' | 'IV Fluids & Electrolytes';
  unit: string;                       // "Vial", "Ampoule", "Tablet 10s", "IV Bag"
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
  batchNumber: string;
  expiryDate: string;
  manufacturer: string;
  storageCondition: 'Refrigerate (2-8°C)' | 'Room Temp (<25°C)' | 'Controlled Lockbox';
  prescriptionRequired: boolean;
}

export interface EquipmentAsset {
  id: string;
  hospitalId: string;
  assetCode: string;                  // "EQ-RAD-MRI-01"
  name: string;                       // "Siemens Magnetom 3.0T MRI"
  category: 'Radiology & Imaging' | 'Critical Care & Life Support' | 'Surgical & OT' | 'Pathology & Lab' | 'Dialysis & Renal';
  location: string;                   // "Radiology Suite B, Ground Floor"
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'Operational' | 'Due for Calibration' | 'Under Maintenance' | 'Down / Out of Service';
  lastServiceDate: string;
  nextPPMDate: string;                // Planned Preventive Maintenance
  warrantyContract: 'Comprehensive AMC' | 'OEM Direct Warranty' | 'Standard CMC';
  contractorContact: string;
}

export interface ServiceTariff {
  id: string;
  hospitalId: string;
  code: string;                       // CPT / Tariff code: "CPT-99214"
  name: string;                       // "Level 4 Comprehensive Specialist Consultation"
  category: 'Consultation & OPD' | 'Radiology & Imaging' | 'Pathology & Lab' | 'Surgical Procedures' | 'Critical Care & ICU' | 'Nursing & Daycare';
  standardPrice: number;
  insuranceCovered: boolean;
  tpaPreAuthRequired: boolean;
  typicalDuration: string;
  anesthesiaRequired: boolean;
  description: string;
}

export interface SurgicalPackage {
  id: string;
  hospitalId: string;
  packageCode: string;                // "PKG-SURG-CABG"
  name: string;                       // "Coronary Artery Bypass Grafting (CABG) Comprehensive Package"
  department: string;
  inclusions: string[];               // ["5 Days ICU", "Pre-op Angiography", "Surgeon Tariff", "Anesthesia"]
  exclusions: string[];               // ["Extra Implants", "Blood Components beyond 2 Units"]
  packagePrice: number;
  estimatedStayDays: number;
  cashlessEmpaneled: boolean;
}

export interface InsuranceProvider {
  id: string;
  hospitalId: string;
  providerName: string;               // "Star Health & Allied Insurance"
  tpaName: string;                    // "Medi Assist TPA"
  category: 'Private Health Insurance' | 'Government Health Scheme (CGHS/ECHS)' | 'Corporate TPA';
  cashlessEnabled: boolean;
  deskContactPhone: string;
  deskContactEmail: string;
  activePreAuthCount: number;
  settlementTurnaroundDays: number;
  status: 'Empaneled Active' | 'Agreement Under Renewal' | 'Suspended';
}

export interface CashlessClaim {
  id: string;
  hospitalId: string;
  claimNumber: string;
  patientName: string;
  patientMRN: string;
  insuranceCompany: string;
  tpaName: string;
  policyNumber: string;
  admissionDate: string;
  estimatedCost: number;
  approvedAmount: number;
  claimStatus: 'Initial Pre-Auth Approved' | 'Query Raised by TPA' | 'Pending Final Settlement' | 'Discharged & Settled';
  assignedDeskOfficer: string;
}

export interface ComplianceDocument {
  id: string;
  hospitalId: string;
  docCode: string;
  title: string;                      // "NABH 5th Edition Full Accreditation Certificate"
  category: 'Accreditation' | 'Environmental & Bio-Waste' | 'Radiation Safety (AERB)' | 'Pharmacy & Drug Control' | 'Fire Safety NOC' | 'Municipal Health License';
  issuingAuthority: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'Active & Verified' | 'Renewal Window Open' | 'Expired';
  fileUrl?: string;
  daysRemaining: number;
}

export interface ChangeDraft {
  id: string;                         // PK: e.g. "DFT-2026-004"
  hospitalId: string;                 // FK -> HospitalFacility.id
  module: 'Pricing & Tariffs' | 'Doctor Faculty' | 'Clinical Services' | 'Hospital Profile' | 'Capacity & Wings';
  title: string;
  description: string;
  submittedBy: string;
  submittedByRole: RoleType;
  submittedAt: string;
  status: 'Pending Review' | 'Approved & Published' | 'Rejected';
  originalValue: any;                 // Current state JSON snapshot
  proposedValue: any;                 // Draft state JSON snapshot
  diffSummary: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface Announcement {
  id: string;
  hospitalId: string;
  title: string;
  content: string;
  priority: 'Emergency Code Red' | 'Urgent Clinical Memo' | 'Standard Operational' | 'General Notice';
  targetAudience: 'All Personnel' | 'Doctors & Specialists' | 'Nursing Staff' | 'Administrative & Billing';
  author: string;
  authorRole: string;
  createdAt: string;
  activeUntil: string;
  acknowledgedCount: number;
}

export interface ImmutableAuditLog {
  id: string;                         // PK: e.g. "AUD-998124"
  hospitalId: string;                 // FK -> HospitalFacility.id
  timestamp: string;                  // ISO 8601 UTC
  action: string;                     // "Bed Allocation", "Doctor Fee Update"
  module: string;                     // "Capacity", "Specialists", "Formulary"
  userId: string;                     // FK -> UserAccount.id
  userName: string;
  userRole: RoleType;
  ipAddress: string;                  // "10.0.4.120 (Workstation-OR-03)"
  details: string;                    // Change payload string
  hash: string;                       // SHA-256 block hash
}

export interface Appointment {
  id: string;
  hospitalId: string;
  tokenNumber: string;                // "#OPD-01"
  patientName: string;
  patientMRN: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  departmentName: string;
  chamber: string;
  appointmentTime: string;
  type: 'In-Person Consultation' | 'Video Teleconsultation' | 'Emergency Walk-in';
  triagePriority: 'Normal Priority' | 'Senior Citizen' | 'STAT Emergency Walk-in';
  status: 'Checked-In / In Queue' | 'Inside Chamber' | 'Completed' | 'Cancelled';
  paymentStatus: 'Paid (Cashless / Insurance)' | 'Paid (Card / UPI)' | 'Pending at Counter';
}

export interface LabTest {
  id: string;
  hospitalId: string;
  code: string;                       // "LAB-CBC-01"
  name: string;                       // "Complete Blood Count (CBC) with Automated Differential"
  category: 'Pathology & Hematology' | 'Biochemistry & Enzymes' | 'Microbiology & Culture' | 'Histopathology' | 'Genomics & Immunology';
  turnaroundTime: string;             // "4 Hours"
  sampleType: 'Whole Blood EDTA' | 'Serum' | 'Plasma' | 'Urine' | 'Tissue Biopsy';
  nablAccredited: boolean;
  price: number;
  fastingRequired: boolean;
  activeToday: number;
}

export interface ImagingService {
  id: string;
  hospitalId: string;
  code: string;                       // "RAD-CT-CHEST"
  name: string;                       // "High-Resolution CT Chest (128-Slice HRCT)"
  modality: '3.0T MRI' | '128-Slice CT' | 'Digital X-Ray' | 'Ultrasound Doppler' | 'PET-CT' | 'Cath Lab Angiography';
  suiteRoom: string;
  slotDurationMinutes: number;
  contrastStudy: boolean;
  price: number;
  todayScheduledCount: number;
  status: 'Online & Operational' | 'Maintenance';
}

// Authority-Only Hospital Registration & Access Governance Types
export type HospitalApplicationStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'APPROVED_NOT_ACTIVATED'
  | 'ACTIVATION_SENT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'DEACTIVATED';

export interface ApplicationDocument {
  id: string;
  title: string;
  category: 'Registration Certificate' | 'Government Authorization' | 'Accreditation Body' | 'Representative Identity' | 'Clinical Compliance';
  fileName: string;
  fileSize: string;
  uploadDate: string;
  verified: boolean;
}

export interface HospitalApplication {
  id: string;                               // e.g. "APP-REQ-2026-0812"
  hospitalLegalName: string;
  publicName: string;
  registrationNumber: string;               // State Health Directorate Reg No
  cinNumber?: string;
  hospitalType: 'Super Specialty' | 'Multi Specialty' | 'Tertiary Care' | 'Teaching Hospital' | 'Community Hospital';
  ownership: 'Private' | 'Trust / Non-Profit' | 'Government / Public';
  establishedYear: number;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  officialPhone: string;
  officialEmail: string;
  emergencyHotline: string;
  websiteUrl: string;
  healthAuthorityRegDetails: string;
  accreditations: string[];                 // e.g. ["JCI", "NABH", "NABL"]
  totalBedsCount: number;
  icuBedsCount: number;
  traumaLevel: 'Level 1 Trauma Center' | 'Level 2 Trauma Center' | 'Level 3 Emergency';
  
  // Authorized Representative
  representativeName: string;
  representativeDesignation: string;
  representativeEmail: string;
  representativePhone: string;
  representativeCouncilId: string;
  
  // Documents & Declaration
  documents: ApplicationDocument[];
  declarationCertified: boolean;
  
  // Workflow & Status
  status: HospitalApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  additionalInfoQuery?: string;
  
  // Provisioned Entity References
  createdHospitalId?: string;
  activationToken?: string;
  activationTokenExpiresAt?: string;
  activationTokenUsed?: boolean;
}

export interface HospitalAccount {
  id: string;                               // PK e.g. "ACC-HSP-001"
  hospitalId: string;                       // FK -> HospitalFacility.id
  username: string;                         // Lowercase unique e.g. "apex_delhi_admin"
  officialEmail: string;
  passwordHash: string;                     // Cryptographic SHA-256 simulation
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  activatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivationTokenRecord {
  token: string;                            // e.g. "ACT-9f82-a1b4-7c3e"
  applicationId: string;
  hospitalId: string;
  hospitalLegalName: string;
  officialEmail: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  revoked: boolean;
}

export interface PasswordResetTokenRecord {
  token: string;                            // e.g. "RST-4e71-9c8a-2d0f"
  accountId: string;
  username: string;
  officialEmail: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  revoked: boolean;
}


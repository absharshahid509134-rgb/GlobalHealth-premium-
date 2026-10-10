import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  UserCheck,
  UserPlus,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Stethoscope,
  Building2,
  Search,
  Eye,
  EyeOff,
  UploadCloud,
  FileText,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  XCircle,
  HelpCircle,
  Sparkles,
  Award,
  Filter,
  Shield,
  Layers
} from 'lucide-react';
import { useDoctorAuth } from '../../../context/DoctorAuthContext';
import {
  DoctorApplication,
  DoctorApplicationDocument,
  DoctorApplicationStatus
} from '../../../types/doctorAuth';

export type DoctorAuthTab =
  | 'login'
  | 'forgot-password'
  | 'activate'
  | 'request-access'
  | 'track'
  | 'authority';

interface DoctorAuthPageProps {
  onLoginSuccess?: () => void;
  onBackToGlobalHealth?: () => void;
  initialTab?: DoctorAuthTab;
  /** Label for the back button when the page is opened from the compact sign-in gate. */
  backButtonLabel?: string;
}

export const DoctorAuthPage: React.FC<DoctorAuthPageProps> = ({
  onLoginSuccess,
  onBackToGlobalHealth,
  initialTab = 'login',
  backButtonLabel = 'Public Portal'
}) => {
  const {
    applications,
    accounts,
    activationTokens,
    auditLogs,
    authorityOfficer,
    submitDoctorApplication,
    verifyActivationToken,
    checkUsernameAvailability,
    activateDoctorAccount,
    doctorLogin,
    requestPasswordReset,
    verifyResetToken,
    resetPasswordWithToken,
    approveDoctorApplication,
    rejectDoctorApplication,
    requestAdditionalInfo,
    suspendDoctorAccount,
    reactivateDoctorAccount,
    reissueActivationToken
  } = useDoctorAuth();

  const [activeTab, setActiveTab] = useState<DoctorAuthTab>(initialTab);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // ============================================================================
  // TAB 1: LOGIN STATE
  // ============================================================================
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockoutNotice, setLockoutNotice] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLockoutNotice(null);
    setLoginLoading(true);

    try {
      const result = await doctorLogin(loginIdentifier, loginPassword);
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        if (result.isLockedOut) {
          setLockoutNotice(result.message);
        } else {
          setLoginError(result.message);
        }
      }
    } catch {
      setLoginError('Authentication service temporarily unavailable. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Password recovery remains available for provisioned accounts.
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [demoResetToken, setDemoResetToken] = useState<string | null>(null);

  const [resetTokenInput, setResetTokenInput] = useState('');
  const [resetTokenVerified, setResetTokenVerified] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;

    const res = await requestPasswordReset(forgotIdentifier);
    setForgotMessage(res.message);
    setForgotSubmitted(true);
    if (res.demoResetToken) {
      setDemoResetToken(res.demoResetToken);
      setResetTokenInput(res.demoResetToken);
    }
  };

  const handleVerifyResetToken = () => {
    setResetError(null);
    const ver = verifyResetToken(resetTokenInput);
    if (ver.valid) {
      setResetTokenVerified(true);
    } else {
      setResetError(ver.message);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (resetNewPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Password confirmation does not match.');
      return;
    }

    const res = await resetPasswordWithToken(resetTokenInput, resetNewPassword);
    if (res.success) {
      setResetSuccess(true);
    } else {
      setResetError(res.message);
    }
  };

  // ============================================================================
  // TAB 3: ACTIVATE APPROVED ACCOUNT STATE
  // ============================================================================
  const [activationTokenInput, setActivationTokenInput] = useState('');
  const [tokenVerificationResult, setTokenVerificationResult] = useState<ReturnType<
    typeof verifyActivationToken
  > | null>(null);

  const [desiredUsername, setDesiredUsername] = useState('');
  const [usernameCheck, setUsernameCheck] = useState<{ available: boolean; reason?: string } | null>(
    null
  );
  const [activatePassword, setActivatePassword] = useState('');
  const [activateConfirmPassword, setActivateConfirmPassword] = useState('');
  const [showActivatePassword, setShowActivatePassword] = useState(false);
  const [activateDeclaration, setActivateDeclaration] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activationComplete, setActivationComplete] = useState(false);
  const [createdAccountSummary, setCreatedAccountSummary] = useState<{
    username: string;
    fullName: string;
    hospital: string;
  } | null>(null);

  const handleVerifyToken = () => {
    setActivateError(null);
    const result = verifyActivationToken(activationTokenInput);
    setTokenVerificationResult(result);

    if (result.valid && result.application) {
      // Suggest clean username based on doctor name
      const nameParts = result.application.fullName
        .toLowerCase()
        .replace(/dr\.|\,.*$/g, '')
        .trim()
        .split(' ')
        .filter(Boolean);
      const suggested = `doc_${nameParts.join('_')}`.slice(0, 20);
      setDesiredUsername(suggested);
      setUsernameCheck(checkUsernameAvailability(suggested));
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setDesiredUsername(clean);
    if (clean.length >= 3) {
      setUsernameCheck(checkUsernameAvailability(clean));
    } else {
      setUsernameCheck(null);
    }
  };

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, label: 'Fair / Good', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-600' };
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError(null);

    if (!activateDeclaration) {
      setActivateError('You must check the authorization declaration checkbox to proceed.');
      return;
    }
    if (activatePassword.length < 8) {
      setActivateError('Password must be at least 8 characters long.');
      return;
    }
    if (activatePassword !== activateConfirmPassword) {
      setActivateError('Password confirmation does not match.');
      return;
    }

    setActivateLoading(true);
    try {
      const res = await activateDoctorAccount({
        token: activationTokenInput,
        username: desiredUsername,
        password: activatePassword,
        declarationAccepted: activateDeclaration
      });

      if (res.success && res.account) {
        setActivationComplete(true);
        setCreatedAccountSummary({
          username: res.account.username,
          fullName: res.account.fullName,
          hospital: res.account.hospitalName
        });
      } else {
        setActivateError(res.message);
      }
    } catch {
      setActivateError('An error occurred during account activation. Please try again.');
    } finally {
      setActivateLoading(false);
    }
  };

  // ============================================================================
  // TAB 4: REQUEST DOCTOR ACCESS FORM STATE
  // ============================================================================
  const [reqFullName, setReqFullName] = useState('');
  const [reqDob, setReqDob] = useState('1988-05-12');
  const [reqGender, setReqGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [reqRegNumber, setReqRegNumber] = useState('');
  const [reqCouncil, setReqCouncil] = useState('National Medical Commission / State Medical Council');
  const [reqQualification, setReqQualification] = useState('MBBS, MD (General Medicine)');
  const [reqSpeciality, setReqSpeciality] = useState('Cardiology');
  const [reqSubSpeciality, setReqSubSpeciality] = useState('');
  const [reqExperience, setReqExperience] = useState<number>(10);
  const [reqDesignation, setReqDesignation] = useState('Senior Consultant');
  const [reqDepartment, setReqDepartment] = useState('Cardiovascular Sciences');
  const [reqEmploymentType, setReqEmploymentType] = useState<DoctorApplication['employmentType']>(
    'Full-Time'
  );
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmergencyContact, setReqEmergencyContact] = useState('');
  const [reqHospitalName, setReqHospitalName] = useState('Apex Institute of Medical Sciences');
  const [reqBranchLocation, setReqBranchLocation] = useState('Central Campus, Main Pavilion');
  const [reqJoiningDate, setReqJoiningDate] = useState('2026-04-01');
  const [reqDocuments, setReqDocuments] = useState<DoctorApplicationDocument[]>([
    {
      id: 'doc-pre-01',
      category: 'Medical Registration Certificate',
      fileName: 'medical_council_license_reg.pdf',
      fileSize: '2.4 MB',
      uploadDate: new Date().toISOString(),
      verified: true,
      fileHash: 'sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  ]);
  const [reqDeclaration1, setReqDeclaration1] = useState(false);
  const [reqDeclaration2, setReqDeclaration2] = useState(false);
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);

  const handleAddSampleDoc = (
    category: DoctorApplicationDocument['category'],
    fileName: string,
    fileSize: string
  ) => {
    const newDoc: DoctorApplicationDocument = {
      id: `doc-${Date.now()}`,
      category,
      fileName,
      fileSize,
      uploadDate: new Date().toISOString(),
      verified: true,
      fileHash: `sha256_${Math.random().toString(36).substring(2, 12)}`
    };
    setReqDocuments((prev) => [...prev, newDoc]);
  };

  const handleRemoveDoc = (id: string) => {
    setReqDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);

    if (!reqFullName || !reqRegNumber || !reqEmail || !reqPhone) {
      setReqError('Please fill in all mandatory identity and credential fields.');
      return;
    }

    if (!reqDeclaration1 || !reqDeclaration2) {
      setReqError('You must check both confirmation declaration boxes.');
      return;
    }

    if (reqDocuments.length === 0) {
      setReqError('Please attach at least one verification document (e.g. Medical Registration Certificate).');
      return;
    }

    setReqSubmitting(true);
    try {
      const res = await submitDoctorApplication({
        fullName: reqFullName.startsWith('Dr.') ? reqFullName : `Dr. ${reqFullName}`,
        dateOfBirth: reqDob,
        gender: reqGender,
        medicalRegistrationNumber: reqRegNumber,
        medicalCouncil: reqCouncil,
        qualification: reqQualification,
        primarySpecialization: reqSpeciality,
        subSpecialization: reqSubSpeciality || undefined,
        yearsOfExperience: Number(reqExperience),
        designation: reqDesignation,
        department: reqDepartment,
        employmentType: reqEmploymentType,
        officialEmail: reqEmail,
        professionalPhone: reqPhone,
        emergencyContact: reqEmergencyContact || undefined,
        hospitalId: 'hosp-apex-01',
        hospitalName: reqHospitalName,
        hospitalBranchLocation: reqBranchLocation,
        joiningDate: reqJoiningDate,
        documents: reqDocuments,
        declarationCertified: true,
        declarationDate: new Date().toISOString()
      });

      if (res.success) {
        setSubmittedApplicationId(res.applicationId);
      } else {
        setReqError(res.message);
      }
    } catch {
      setReqError('Failed to submit application. Please try again.');
    } finally {
      setReqSubmitting(false);
    }
  };

  // ============================================================================
  // TAB 5: TRACK APPLICATION STATUS STATE
  // ============================================================================
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [trackedApplication, setTrackedApplication] = useState<DoctorApplication | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);

  const handleTrackSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTrackSearched(true);
    const clean = trackSearchTerm.trim().toLowerCase();

    if (!clean) {
      setTrackedApplication(null);
      return;
    }

    const matched = applications.find(
      (a) =>
        a.id.toLowerCase() === clean ||
        a.medicalRegistrationNumber.toLowerCase() === clean ||
        a.officialEmail.toLowerCase() === clean ||
        a.fullName.toLowerCase().includes(clean)
    );

    setTrackedApplication(matched || null);
  };

  // ============================================================================
  // TAB 6: AUTHORITY ADMIN / MANAGEMENT STATE
  // ============================================================================
  const [authorityFilterStatus, setAuthorityFilterStatus] = useState<string>('ALL');
  const [selectedAppDossier, setSelectedAppDossier] = useState<DoctorApplication | null>(null);
  const [authorityActionModal, setAuthorityActionModal] = useState<{
    type: 'APPROVE' | 'REJECT' | 'ADDITIONAL_INFO' | 'SUSPEND' | 'REISSUE';
    application?: DoctorApplication;
    account?: (typeof accounts)[0];
  } | null>(null);
  const [authorityNotesInput, setAuthorityNotesInput] = useState('');
  const [authorityActionSuccess, setAuthorityActionSuccess] = useState<string | null>(null);

  const filteredAuthorityApps = useMemo(() => {
    if (authorityFilterStatus === 'ALL') return applications;
    return applications.filter((a) => a.status === authorityFilterStatus);
  }, [applications, authorityFilterStatus]);

  const handleExecuteAuthorityAction = async () => {
    if (!authorityActionModal) return;
    setAuthorityActionSuccess(null);

    const { type, application } = authorityActionModal;

    if (type === 'APPROVE' && application) {
      const res = await approveDoctorApplication(application.id, authorityNotesInput);
      if (res.success) {
        setAuthorityActionSuccess(`Application approved! Activation Token issued: ${res.activationToken}`);
        setSelectedAppDossier((prev) => (prev ? { ...prev, status: 'APPROVED_NOT_ACTIVATED', activationToken: res.activationToken } : null));
      }
    } else if (type === 'REJECT' && application) {
      const res = await rejectDoctorApplication(
        application.id,
        authorityNotesInput || 'Credentials did not satisfy hospital affiliation criteria.'
      );
      if (res.success) {
        setAuthorityActionSuccess(`Application ${application.id} rejected.`);
        setSelectedAppDossier((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
    } else if (type === 'ADDITIONAL_INFO' && application) {
      const res = await requestAdditionalInfo(
        application.id,
        authorityNotesInput || 'Please upload updated credential documentation.'
      );
      if (res.success) {
        setAuthorityActionSuccess('Additional documentation requested from applicant.');
        setSelectedAppDossier((prev) => (prev ? { ...prev, status: 'ADDITIONAL_INFO_REQUIRED' } : null));
      }
    } else if (type === 'REISSUE' && application) {
      const res = await reissueActivationToken(application.id);
      if (res.success) {
        setAuthorityActionSuccess(`New activation token generated: ${res.token}`);
      }
    }

    setAuthorityActionModal(null);
    setAuthorityNotesInput('');
  };

  const getStatusBadge = (status: DoctorApplicationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'Active & Verified Account',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'APPROVED_NOT_ACTIVATED':
        return {
          label: 'Approved • Awaiting Activation',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <KeyRound className="w-3.5 h-3.5 text-teal-600" />
        };
      case 'PENDING_REVIEW':
        return {
          label: 'Pending Authority Review',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />
        };
      case 'UNDER_REVIEW':
        return {
          label: 'Under Board Verification',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Shield className="w-3.5 h-3.5 text-blue-600" />
        };
      case 'ADDITIONAL_INFO_REQUIRED':
        return {
          label: 'Action Required • Need Docs',
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
        };
      case 'SUSPENDED':
        return {
          label: 'Account Suspended',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'REJECTED':
        return {
          label: 'Application Rejected',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Clock className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToGlobalHealth && (
              <button
                onClick={onBackToGlobalHealth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>{backButtonLabel}</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-2xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900">
                  Doctor Portal<span className="text-emerald-700 font-semibold">™</span>
                </span>
                <span className="text-[10px] text-slate-500 block -mt-1 font-mono">
                  Hospital Authority Controlled Authentication & Clinical EHR
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authority Verification Enforced</span>
            </div>
            <button
              onClick={() => setActiveTab('authority')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'authority'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Authority Review ({applications.filter((a) => a.status === 'PENDING_REVIEW' || a.status === 'UNDER_REVIEW').length})
            </button>
          </div>
        </div>
      </header>

      {/* Prominent Authority Notice Banner */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2.5 border-b border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Authority-Only Access Protocol:</strong> Doctor Portal access is strictly restricted to medical practitioners verified and approved by the authorized Hospital Authority.
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>No Unverified Signups</span>
            <span>•</span>
            <span>Single-Use Token Activation</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Portal Layout — symmetric, mirrored columns */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT SIDE NAVIGATION (Strict Authority Control) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                Doctor Portal Access
              </h2>
              <p className="text-xs text-slate-500">
                Only approved doctors can activate accounts and log in to the clinical workspace.
              </p>
            </div>

            <nav className="space-y-1.5">
              {/* Item 1: Log In */}
              <button
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                  setLockoutNotice(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeTab === 'login'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>1. Doctor Log In</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/doctor/login</span>
              </button>

              {/* Item 2: Forgot Password */}
              <button
                onClick={() => {
                  setActiveTab('forgot-password');
                  setForgotSubmitted(false);
                  setResetTokenVerified(false);
                  setResetSuccess(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeTab === 'forgot-password'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>2. Forgot Password</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/doctor/forgot-password</span>
              </button>

              {/* Item 3: Activate Approved Doctor Account */}
              <button
                onClick={() => {
                  setActiveTab('activate');
                  setActivationComplete(false);
                  setActivateError(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeTab === 'activate'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>3. Activate Approved Account</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/doctor/activate</span>
              </button>

              {/* Item 4: Request Doctor Portal Access */}
              <button
                onClick={() => {
                  setActiveTab('request-access');
                  setSubmittedApplicationId(null);
                  setReqError(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeTab === 'request-access'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>4. Request Portal Access</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">/doctor/request-access</span>
              </button>

              {/* Item 5: Track Request Status */}
              <button
                onClick={() => {
                  setActiveTab('track');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeTab === 'track'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 shrink-0" />
                  <span>5. Track Request Status</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">Status Lookup</span>
              </button>

              {/* Item 6: Authority Doctor Registration Management */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActiveTab('authority');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'authority'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>6. Authority Review Console</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                    Admin
                  </span>
                </button>
              </div>
            </nav>

            {/* Security Notice Card */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>No Public Doctor Signup</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Doctors cannot self-register. The workflow requires submission of verified medical board credentials, review and approval by the authorized Hospital Authority, and issuance of single-use activation credentials.
              </p>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT VIEW CONTAINER */}
          {/* ========================================================================= */}
          <div className="space-y-6">

            {/* ===================================================================== */}
            {/* VIEW 1: DOCTOR LOGIN */}
            {/* ===================================================================== */}
            {activeTab === 'login' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Secure Practitioner Authentication</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Doctor Login</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Secure access for verified and authorized doctors.
                  </p>
                </div>

                {/* Security Restriction Notice */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Restricted Medical Portal:</strong> Access is restricted to verified and authorized doctors. If you have been approved by the Hospital Authority, please activate your account before logging in.
                  </div>
                </div>

                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>{loginError}</div>
                  </div>
                )}

                {lockoutNotice && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>{lockoutNotice}</div>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Doctor Username or Official Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter your doctor username (your registered username)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot-password');
                          setForgotIdentifier(loginIdentifier);
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Remember this workstation</span>
                    </label>

                    <span className="text-[11px] text-slate-400 font-mono">TLS 1.3 256-Bit</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Log In to Doctor Portal</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <span>Approved Doctor with Activation Token?</span>
                  <button
                    onClick={() => setActiveTab('activate')}
                    className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                  >
                    <span>Activate Approved Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* VIEW 2: FORGOT PASSWORD RECOVERY */}
            {/* ===================================================================== */}
            {activeTab === 'forgot-password' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span>Credential Recovery</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot Password?</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Enter your Doctor Portal username or registered official email address to begin the secure password recovery process.
                  </p>
                </div>

                {!forgotSubmitted && !resetSuccess && (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Username or Registered Official Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="Enter username or official email (your registered email)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 text-sm transition shadow-xs cursor-pointer"
                    >
                      <span>Continue to Recovery</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {forgotSubmitted && !resetSuccess && (
                  <div className="space-y-6 animate-in fade-in">
                    {/* Safe generic message */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Check Your Registered Contact Method</span>
                      </div>
                      <p className="leading-relaxed text-emerald-900">
                        {forgotMessage}
                      </p>
                      {demoResetToken && (
                        <div className="mt-3 p-3 rounded-lg bg-white border border-emerald-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">
                              Single-Use Reset Token (Demo Emulation)
                            </span>
                            <span className="font-mono font-bold text-emerald-800 text-xs">
                              {demoResetToken}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(demoResetToken, 'rst-token')}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100"
                            title="Copy reset token"
                          >
                            {copiedText === 'rst-token' ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Enter reset token & set new password */}
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Enter Reset Token & Set New Password
                      </h3>

                      {resetError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{resetError}</span>
                        </div>
                      )}

                      {!resetTokenVerified ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Password Reset Token <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={resetTokenInput}
                              onChange={(e) => setResetTokenInput(e.target.value)}
                              placeholder="e.g. RST-DOC-98231-774B"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyResetToken}
                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Verify Reset Token
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Reset token verified for your registered account.</span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              New Password <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showResetPassword ? 'text' : 'password'}
                                required
                                value={resetNewPassword}
                                onChange={(e) => setResetNewPassword(e.target.value)}
                                placeholder="Enter strong new password"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowResetPassword(!showResetPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Confirm New Password <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type={showResetPassword ? 'text' : 'password'}
                              required
                              value={resetConfirmPassword}
                              onChange={(e) => setResetConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 text-sm transition shadow-xs cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Reset Password</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-emerald-950">Password Reset Successfully</h2>
                      <p className="text-xs text-emerald-800 mt-1">
                        Your password has been changed successfully. Please log in using your new password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginPassword(resetNewPassword);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                    >
                      <span>Back to Doctor Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <button
                    onClick={() => setActiveTab('login')}
                    className="font-semibold text-slate-700 hover:text-slate-900"
                  >
                    ← Back to Login
                  </button>
                  <button
                    onClick={() => setActiveTab('request-access')}
                    className="text-emerald-700 font-semibold hover:underline"
                  >
                    Need Access? Request Portal Access
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* VIEW 3: ACTIVATE APPROVED DOCTOR ACCOUNT */}
            {/* ===================================================================== */}
            {activeTab === 'activate' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-teal-700 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Single-Use Activation Gateway</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Activate Your Doctor Portal Account
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    This activation process is available only to doctors approved by the authorized Hospital Authority.
                  </p>
                </div>

                {!activationComplete ? (
                  <div className="space-y-6">
                    {/* Step 1: Token Verification Input */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800">
                          Step 1: Enter Secure Activation Token <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">Authority Issued</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={activationTokenInput}
                          onChange={(e) => {
                            setActivationTokenInput(e.target.value);
                            setTokenVerificationResult(null);
                          }}
                          placeholder="e.g. ACT-DOC-2026-CHOWDHURY-88F9"
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono uppercase text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyToken}
                          className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shrink-0"
                        >
                          Verify Token
                        </button>
                      </div>

                    </div>

                    {/* Token Status Feedback Banner */}
                    {tokenVerificationResult && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${
                          tokenVerificationResult.valid
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : tokenVerificationResult.status === 'EXPIRED'
                            ? 'bg-amber-50 border-amber-200 text-amber-950'
                            : tokenVerificationResult.status === 'ALREADY_USED'
                            ? 'bg-blue-50 border-blue-200 text-blue-950'
                            : 'bg-rose-50 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {tokenVerificationResult.valid ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Authority Token Validated: Ready for Account Creation</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                              <span>{tokenVerificationResult.status.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>
                        <p className="leading-relaxed">{tokenVerificationResult.message}</p>

                        {/* If token is valid, show verified credentials badge */}
                        {tokenVerificationResult.valid && tokenVerificationResult.tokenData && (
                          <div className="mt-3 p-3 rounded-lg bg-white border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                                Approved Medical Practitioner
                              </span>
                              <span className="font-bold text-slate-900">
                                {tokenVerificationResult.tokenData.doctorName}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                                Affiliated Hospital Network
                              </span>
                              <span className="font-bold text-slate-900">
                                {tokenVerificationResult.tokenData.hospitalName}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                                Official Contact Email
                              </span>
                              <span className="font-mono text-slate-700">
                                {tokenVerificationResult.tokenData.officialEmail}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                                Token Validity Until
                              </span>
                              <span className="font-mono text-slate-700">
                                {new Date(tokenVerificationResult.tokenData.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Edge Case 1: Expired Link -> Request new activation token */}
                        {tokenVerificationResult.status === 'EXPIRED' && (
                          <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
                            <span className="font-medium text-[11px]">Need a new link?</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('track')}
                              className="font-bold text-amber-900 underline"
                            >
                              Track & Request Reissuance
                            </button>
                          </div>
                        )}

                        {/* Edge Case 2: Already Activated -> Go to Login */}
                        {tokenVerificationResult.status === 'ALREADY_USED' && (
                          <div className="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between">
                            <span className="font-medium text-[11px]">Account is already active.</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('login')}
                              className="font-bold text-blue-900 underline"
                            >
                              Go to Doctor Login
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2 & 3: Account Creation Form (only active if token is valid) */}
                    {tokenVerificationResult?.valid && (
                      <form onSubmit={handleActivateSubmit} className="space-y-4 pt-2">
                        {activateError && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{activateError}</span>
                          </div>
                        )}

                        {/* Desired Username with Real-time Check */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700">
                              Choose Doctor Username <span className="text-rose-500">*</span>
                            </label>
                            {usernameCheck && (
                              <span
                                className={`text-[11px] font-bold flex items-center gap-1 ${
                                  usernameCheck.available ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {usernameCheck.available ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Username Available</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    <span>{usernameCheck.reason || 'Username Not Available'}</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={desiredUsername}
                              onChange={(e) => handleUsernameChange(e.target.value)}
                              placeholder="e.g. doc_chowdhury"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Must be 4–24 lowercase characters, numbers, or underscores.
                          </span>
                        </div>

                        {/* Password Creation with Strength Indicator */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Create Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showActivatePassword ? 'text' : 'password'}
                              required
                              value={activatePassword}
                              onChange={(e) => setActivatePassword(e.target.value)}
                              placeholder="Minimum 8 characters with numbers & symbols"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowActivatePassword(!showActivatePassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showActivatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Strength Bar */}
                          {activatePassword && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 font-mono">Password Strength:</span>
                                <span className="font-bold text-slate-700">
                                  {calculatePasswordStrength(activatePassword).label}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                                <div
                                  className={`h-full flex-1 ${
                                    calculatePasswordStrength(activatePassword).score >= 1
                                      ? calculatePasswordStrength(activatePassword).color
                                      : 'bg-slate-200'
                                  }`}
                                />
                                <div
                                  className={`h-full flex-1 ${
                                    calculatePasswordStrength(activatePassword).score >= 2
                                      ? calculatePasswordStrength(activatePassword).color
                                      : 'bg-slate-200'
                                  }`}
                                />
                                <div
                                  className={`h-full flex-1 ${
                                    calculatePasswordStrength(activatePassword).score >= 3
                                      ? calculatePasswordStrength(activatePassword).color
                                      : 'bg-slate-200'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Confirm Password <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type={showActivatePassword ? 'text' : 'password'}
                            required
                            value={activateConfirmPassword}
                            onChange={(e) => setActivateConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        {/* Mandatory Authorization Declaration */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              required
                              checked={activateDeclaration}
                              onChange={(e) => setActivateDeclaration(e.target.checked)}
                              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="leading-relaxed">
                              I confirm that I am authorized to activate this approved Doctor Portal account and agree to maintain strict clinical confidentiality and security standards.
                            </span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={activateLoading || !usernameCheck?.available}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {activateLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Creating Doctor Account...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Create Doctor Account</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Success Confirmation Screen */
                  <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-emerald-950">
                        Doctor Account Created Successfully
                      </h2>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed max-w-md mx-auto">
                        Your Doctor Portal account has been successfully created and linked to your verified credentials. You can now log in using your username and password.
                      </p>
                    </div>

                    {createdAccountSummary && (
                      <div className="p-4 rounded-xl bg-white border border-emerald-200 max-w-md mx-auto text-left text-xs space-y-1.5">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Doctor Name:</span>
                          <span className="font-bold text-slate-900">{createdAccountSummary.fullName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Username:</span>
                          <span className="font-mono font-bold text-emerald-800">
                            @{createdAccountSummary.username}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hospital:</span>
                          <span className="font-medium text-slate-800">{createdAccountSummary.hospital}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('login');
                          if (createdAccountSummary) {
                            setLoginIdentifier(createdAccountSummary.username);
                            setLoginPassword(activatePassword);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition shadow-md cursor-pointer"
                      >
                        <span>Go to Doctor Login</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* VIEW 4: REQUEST DOCTOR PORTAL ACCESS */}
            {/* ===================================================================== */}
            {activeTab === 'request-access' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                    <UserPlus className="w-4 h-4" />
                    <span>Practitioner Application</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Request Doctor Portal Access
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Submit your professional information for verification by the authorized Hospital Authority. Portal access will be available only after approval.
                  </p>
                </div>

                {!submittedApplicationId ? (
                  <form onSubmit={handleRequestSubmit} className="space-y-6">
                    {reqError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>{reqError}</div>
                      </div>
                    )}

                    {/* Section 1: Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        1. Personal Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Full Legal & Professional Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqFullName}
                            onChange={(e) => setReqFullName(e.target.value)}
                            placeholder="e.g. Dr. Priya V. Sharma, MD"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Date of Birth <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={reqDob}
                            onChange={(e) => setReqDob(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                          <select
                            value={reqGender}
                            onChange={(e) => setReqGender(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other / Prefer not to say</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Official Institutional Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={reqEmail}
                            onChange={(e) => setReqEmail(e.target.value)}
                            placeholder="e.g. p.sharma@apexmed.org"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Professional Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={reqPhone}
                            onChange={(e) => setReqPhone(e.target.value)}
                            placeholder="+1 (555) 019-2834"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Emergency / Secondary Contact
                          </label>
                          <input
                            type="text"
                            value={reqEmergencyContact}
                            onChange={(e) => setReqEmergencyContact(e.target.value)}
                            placeholder="+1 (555) 019-9999"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Professional Information */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        2. Professional & Medical Board Credentials
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Medical Registration / License Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqRegNumber}
                            onChange={(e) => setReqRegNumber(e.target.value)}
                            placeholder="e.g. MB-CA-948271 or GMC-7182934"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Medical Council / Licensing Authority <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqCouncil}
                            onChange={(e) => setReqCouncil(e.target.value)}
                            placeholder="e.g. Medical Board of California / GMC"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Medical Qualifications <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqQualification}
                            onChange={(e) => setReqQualification(e.target.value)}
                            placeholder="e.g. MBBS, MD, DM (Cardiology), FSCAI"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Primary Specialization <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={reqSpeciality}
                            onChange={(e) => setReqSpeciality(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          >
                            <option value="Interventional Cardiology">Interventional Cardiology</option>
                            <option value="Neurosurgery & Spine">Neurosurgery & Spine</option>
                            <option value="Orthopedic Surgery">Orthopedic Surgery</option>
                            <option value="Endocrinology & Diabetology">Endocrinology & Diabetology</option>
                            <option value="Medical Oncology">Medical Oncology</option>
                            <option value="Pediatrics & Neonatology">Pediatrics & Neonatology</option>
                            <option value="Dermatology">Dermatology</option>
                            <option value="Gastroenterology">Gastroenterology</option>
                            <option value="Pulmonology & Critical Care">Pulmonology & Critical Care</option>
                            <option value="General & Laparoscopic Surgery">General & Laparoscopic Surgery</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Sub-Specialization / Area of Focus
                          </label>
                          <input
                            type="text"
                            value={reqSubSpeciality}
                            onChange={(e) => setReqSubSpeciality(e.target.value)}
                            placeholder="e.g. Pediatric Arrhythmias / Skull Base"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Years of Professional Experience <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            required
                            value={reqExperience}
                            onChange={(e) => setReqExperience(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Professional Designation <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqDesignation}
                            onChange={(e) => setReqDesignation(e.target.value)}
                            placeholder="e.g. Senior Consultant / Attending Physician"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Clinical Department <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqDepartment}
                            onChange={(e) => setReqDepartment(e.target.value)}
                            placeholder="e.g. Cardiovascular Sciences"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Employment / Affiliation Status
                          </label>
                          <select
                            value={reqEmploymentType}
                            onChange={(e) => setReqEmploymentType(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          >
                            <option value="Full-Time">Full-Time Staff Physician</option>
                            <option value="Visiting Consultant">Visiting Consultant</option>
                            <option value="Honorary">Honorary Consultant</option>
                            <option value="Clinical Fellow">Clinical Fellow</option>
                            <option value="Resident">Senior Resident</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Hospital Information */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        3. Hospital Network & Affiliation
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Hospital Name <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={reqHospitalName}
                            onChange={(e) => setReqHospitalName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          >
                            <option value="Apex Institute of Medical Sciences">Apex Institute of Medical Sciences</option>
                            <option value="Johns Hopkins Hospital & Heart Institute">Johns Hopkins Hospital & Heart Institute</option>
                            <option value="Hospital for Special Surgery (HSS), New York">Hospital for Special Surgery (HSS), New York</option>
                            <option value="Apollo Multispeciality Hospitals & Research Centre">Apollo Multispeciality Hospitals & Research Centre</option>
                            <option value="Dana-Farber Cancer Institute & Harvard Medical">Dana-Farber Cancer Institute & Harvard Medical</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Branch / Campus Location
                          </label>
                          <input
                            type="text"
                            value={reqBranchLocation}
                            onChange={(e) => setReqBranchLocation(e.target.value)}
                            placeholder="e.g. Central Pavilion, Tower 2"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Document Upload Manager */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          4. Professional Verification Documents (PDF / PNG / JPG)
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">Max 10MB per file</span>
                      </div>

                      {/* Uploaded Documents List */}
                      <div className="space-y-2">
                        {reqDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                              <div>
                                <div className="font-semibold text-slate-900">{doc.fileName}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span className="text-emerald-800 font-medium">{doc.category}</span>
                                  <span>•</span>
                                  <span>{doc.fileSize}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="text-rose-600 hover:text-rose-800 font-semibold p-1"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Quick Add Preset Documents */}
                      <div className="p-3 rounded-xl bg-white border border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-600">
                          Attach official credentials for instant verification:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSampleDoc(
                                'Degree & Specialization Certificate',
                                'specialty_board_certification.pdf',
                                '3.4 MB'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                          >
                            + Degree Certificate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSampleDoc(
                                'Hospital Appointment Letter',
                                'hospital_appointment_letter.pdf',
                                '1.8 MB'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                          >
                            + Appointment Letter
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSampleDoc(
                                'National Identity Document',
                                'official_physician_id_card.png',
                                '1.2 MB'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                          >
                            + Identity Document
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Applicant Declarations */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={reqDeclaration1}
                          onChange={(e) => setReqDeclaration1(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="leading-relaxed">
                          I confirm that the medical credentials and information provided are true, complete, and accurate, and that I am legally authorized to submit this Doctor Portal access request.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={reqDeclaration2}
                          onChange={(e) => setReqDeclaration2(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="leading-relaxed">
                          I understand that portal access is subject to verification and explicit approval by the authorized Hospital Authority, and that unapproved requests cannot activate an account.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={reqSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3.5 text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {reqSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Application to Authority...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Submit for Authority Verification</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Request Submitted Confirmation Screen */
                  <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                      <FileCheck className="w-7 h-7" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-emerald-950">
                        Doctor Access Request Submitted
                      </h2>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed max-w-md mx-auto">
                        Your Doctor Portal access request has been successfully submitted and is awaiting verification by the authorized Hospital Authority.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-emerald-200 max-w-md mx-auto text-left text-xs space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Application Reference ID:</span>
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {submittedApplicationId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Practitioner:</span>
                        <span className="font-bold text-slate-900">{reqFullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hospital:</span>
                        <span className="font-medium text-slate-800">{reqHospitalName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          PENDING_REVIEW
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 max-w-md mx-auto text-left">
                      <strong>Important Notice:</strong> You cannot create a login password or access the portal until the Hospital Authority verifies your credentials and approves your application.
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('track');
                          setTrackSearchTerm(submittedApplicationId);
                          handleTrackSearch();
                        }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Track This Request
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('authority');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Open Authority Console (Simulate Review)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* VIEW 5: TRACK REQUEST STATUS */}
            {/* ===================================================================== */}
            {activeTab === 'track' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                    <Search className="w-4 h-4" />
                    <span>Application Status Lookup</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Track Doctor Access Request
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Check the real-time review status of your Doctor Portal registration request.
                  </p>
                </div>

                <form onSubmit={handleTrackSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={trackSearchTerm}
                    onChange={(e) => setTrackSearchTerm(e.target.value)}
                    placeholder="Enter Application ID (e.g. DOC-REQ-2026-0002) or Email / Reg No"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shrink-0"
                  >
                    Track Status
                  </button>
                </form>

                {/* Quick Track Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span>Quick lookup:</span>
                  {applications.slice(0, 4).map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        setTrackSearchTerm(app.id);
                        setTrackedApplication(app);
                        setTrackSearched(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono"
                    >
                      {app.id} ({app.status})
                    </button>
                  ))}
                </div>

                {trackSearched && trackedApplication && (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">
                          Application ID
                        </span>
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {trackedApplication.id}
                        </span>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          getStatusBadge(trackedApplication.status).bg
                        }`}
                      >
                        {getStatusBadge(trackedApplication.status).icon}
                        <span>{getStatusBadge(trackedApplication.status).label}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Doctor Name:</span>
                        <span className="font-bold text-slate-900">{trackedApplication.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Registration / License:</span>
                        <span className="font-mono text-slate-800">
                          {trackedApplication.medicalRegistrationNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Specialization:</span>
                        <span className="font-medium text-slate-800">
                          {trackedApplication.primarySpecialization}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Hospital Affiliation:</span>
                        <span className="font-medium text-slate-800">
                          {trackedApplication.hospitalName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Submission Date:</span>
                        <span className="font-mono text-slate-700">
                          {new Date(trackedApplication.submissionDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assigned Authority:</span>
                        <span className="text-slate-800 font-medium">
                          {trackedApplication.assignedReviewer || 'Credentialing Queue'}
                        </span>
                      </div>
                    </div>

                    {trackedApplication.reviewerNotes && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">Authority Review Notes:</span>
                        <p className="text-slate-700">{trackedApplication.reviewerNotes}</p>
                      </div>
                    )}

                    {/* Action button if Approved */}
                    {trackedApplication.status === 'APPROVED_NOT_ACTIVATED' && trackedApplication.activationToken && (
                      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-teal-950 text-xs">
                            Your Application is Approved!
                          </div>
                          <div className="text-[11px] text-teal-800">
                            Activation Token: <code className="font-bold">{trackedApplication.activationToken}</code>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('activate');
                            setActivationTokenInput(trackedApplication.activationToken || '');
                            handleVerifyToken();
                          }}
                          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition cursor-pointer shrink-0"
                        >
                          Proceed to Account Activation
                        </button>
                      </div>
                    )}

                    {/* Action button if Active */}
                    {trackedApplication.status === 'ACTIVE' && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-emerald-950">
                          <strong>Account Active:</strong> You can log in using your created username and password.
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('login');
                            if (trackedApplication.createdUsername) {
                              setLoginIdentifier(trackedApplication.createdUsername);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shrink-0"
                        >
                          Log In Now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {trackSearched && !trackedApplication && (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                    No application found matching &ldquo;{trackSearchTerm}&rdquo;. Please verify your Application ID or medical registration number.
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* VIEW 6: HOSPITAL AUTHORITY / ADMIN DOCTOR REVIEW */}
            {/* ===================================================================== */}
            {activeTab === 'authority' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>Hospital Authority Credentialing Console</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Doctor Registration Management
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Review, verify credentials, and approve access for medical staff at {authorityOfficer.hospital}.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="text-[10px] text-slate-500 font-mono block">Logged in Officer</span>
                    <span className="font-bold text-slate-900">{authorityOfficer.name}</span>
                  </div>
                </div>

                {authorityActionSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{authorityActionSuccess}</span>
                    </div>
                    <button
                      onClick={() => setAuthorityActionSuccess(null)}
                      className="text-emerald-800 hover:text-emerald-950 text-xs font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { id: 'ALL', label: `All (${applications.length})` },
                    { id: 'PENDING_REVIEW', label: `Pending (${applications.filter((a) => a.status === 'PENDING_REVIEW').length})` },
                    { id: 'UNDER_REVIEW', label: `Under Review (${applications.filter((a) => a.status === 'UNDER_REVIEW').length})` },
                    { id: 'APPROVED_NOT_ACTIVATED', label: `Approved (${applications.filter((a) => a.status === 'APPROVED_NOT_ACTIVATED').length})` },
                    { id: 'ACTIVE', label: `Active Doctors (${applications.filter((a) => a.status === 'ACTIVE').length})` },
                    { id: 'ADDITIONAL_INFO_REQUIRED', label: `Needs Info (${applications.filter((a) => a.status === 'ADDITIONAL_INFO_REQUIRED').length})` },
                    { id: 'REJECTED', label: `Rejected (${applications.filter((a) => a.status === 'REJECTED').length})` }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setAuthorityFilterStatus(filter.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                        authorityFilterStatus === filter.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Applications Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5">Doctor & Specialty</th>
                        <th className="py-3 px-3.5">Reg / Board ID</th>
                        <th className="py-3 px-3.5">Hospital</th>
                        <th className="py-3 px-3.5">Status</th>
                        <th className="py-3 px-3.5">Submitted</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredAuthorityApps.map((app) => {
                        const badge = getStatusBadge(app.status);
                        return (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3.5">
                              <div className="font-bold text-slate-900">{app.fullName}</div>
                              <div className="text-[11px] text-slate-500">
                                {app.primarySpecialization} • {app.qualification}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-700">
                              {app.medicalRegistrationNumber}
                            </td>
                            <td className="py-3 px-3.5 text-slate-800">
                              <div>{app.hospitalName}</div>
                              <div className="text-[10px] text-slate-500">{app.department}</div>
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                              >
                                {badge.icon}
                                <span>{badge.label}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                              {new Date(app.submissionDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => setSelectedAppDossier(app)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-800 text-[11px] cursor-pointer"
                              >
                                View Dossier
                              </button>
                              {app.status === 'PENDING_REVIEW' || app.status === 'UNDER_REVIEW' ? (
                                <button
                                  onClick={() => {
                                    setAuthorityActionModal({ type: 'APPROVE', application: app });
                                    setAuthorityNotesInput(
                                      'Credentials verified against State Medical Board registry. Full hospital privileges authorized.'
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Application Dossier Modal / Drawer */}
                {selectedAppDossier && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">
                            Practitioner Credential Dossier
                          </span>
                          <h2 className="text-lg font-bold text-slate-900">
                            {selectedAppDossier.fullName}
                          </h2>
                        </div>
                        <button
                          onClick={() => setSelectedAppDossier(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-500 block">Registration / License:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {selectedAppDossier.medicalRegistrationNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Medical Council:</span>
                          <span className="font-medium text-slate-900">
                            {selectedAppDossier.medicalCouncil}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Specialty & Tenure:</span>
                          <span className="font-medium text-slate-900">
                            {selectedAppDossier.primarySpecialization} ({selectedAppDossier.yearsOfExperience} yrs exp)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Official Email:</span>
                          <span className="font-mono text-slate-900">
                            {selectedAppDossier.officialEmail}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Hospital & Department:</span>
                          <span className="font-medium text-slate-900">
                            {selectedAppDossier.hospitalName} ({selectedAppDossier.department})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Review Status:</span>
                          <span className="font-bold text-emerald-800">
                            {selectedAppDossier.status}
                          </span>
                        </div>
                      </div>

                      {/* Documents Preview */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-2">
                          Attached Verification Documents ({selectedAppDossier.documents.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedAppDossier.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-emerald-600" />
                                <div>
                                  <div className="font-semibold text-slate-900">{doc.fileName}</div>
                                  <div className="text-[10px] text-slate-500">{doc.category} • {doc.fileSize}</div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                Board Verified
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Activation Token Display if already issued */}
                      {selectedAppDossier.activationToken && (
                        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs space-y-1">
                          <span className="text-[10px] text-teal-700 uppercase font-mono block">
                            Issued Activation Token:
                          </span>
                          <div className="flex items-center justify-between font-mono font-bold text-teal-900 text-sm">
                            <span>{selectedAppDossier.activationToken}</span>
                            <button
                              onClick={() => copyToClipboard(selectedAppDossier.activationToken || '', 'dossier-token')}
                              className="text-xs font-sans font-semibold text-teal-700 hover:underline"
                            >
                              {copiedText === 'dossier-token' ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Authority Actions in Dossier */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 text-xs">
                        {selectedAppDossier.status === 'PENDING_REVIEW' || selectedAppDossier.status === 'UNDER_REVIEW' ? (
                          <>
                            <button
                              onClick={() =>
                                setAuthorityActionModal({
                                  type: 'ADDITIONAL_INFO',
                                  application: selectedAppDossier
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold cursor-pointer"
                            >
                              Request More Info
                            </button>
                            <button
                              onClick={() =>
                                setAuthorityActionModal({
                                  type: 'REJECT',
                                  application: selectedAppDossier
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold cursor-pointer"
                            >
                              Reject Application
                            </button>
                            <button
                              onClick={() =>
                                setAuthorityActionModal({
                                  type: 'APPROVE',
                                  application: selectedAppDossier
                                })
                              }
                              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                            >
                              Approve Doctor & Issue Token
                            </button>
                          </>
                        ) : selectedAppDossier.status === 'APPROVED_NOT_ACTIVATED' ? (
                          <button
                            onClick={() =>
                              setAuthorityActionModal({
                                type: 'REISSUE',
                                application: selectedAppDossier
                              })
                            }
                            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
                          >
                            Reissue Activation Token
                          </button>
                        ) : selectedAppDossier.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              suspendDoctorAccount(
                                selectedAppDossier.id,
                                'Administrative review by Hospital Authority Credentialing Officer.'
                              );
                              setSelectedAppDossier((prev) => (prev ? { ...prev, status: 'SUSPENDED' } : null));
                              setAuthorityActionSuccess('Doctor account suspended.');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                          >
                            Suspend Doctor Account
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Authority Action Confirmation Dialog */}
                {authorityActionModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
                      <h3 className="text-base font-bold text-slate-900">
                        {authorityActionModal.type === 'APPROVE' && 'Approve Doctor Application'}
                        {authorityActionModal.type === 'REJECT' && 'Reject Doctor Application'}
                        {authorityActionModal.type === 'ADDITIONAL_INFO' && 'Request Additional Documentation'}
                        {authorityActionModal.type === 'REISSUE' && 'Reissue Single-Use Activation Token'}
                      </h3>

                      <p className="text-xs text-slate-600">
                        Practitioner: <strong>{authorityActionModal.application?.fullName}</strong> ({authorityActionModal.application?.id})
                      </p>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Authority Decision Notes / Requirements:
                        </label>
                        <textarea
                          rows={3}
                          value={authorityNotesInput}
                          onChange={(e) => setAuthorityNotesInput(e.target.value)}
                          placeholder="Enter audit notes for credentialing record..."
                          className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setAuthorityActionModal(null)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteAuthorityAction}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                        >
                          Confirm & Sign Action
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

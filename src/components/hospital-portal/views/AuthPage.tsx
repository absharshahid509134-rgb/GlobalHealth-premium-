import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
  FileCheck,
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RotateCcw,
  Check,
  Info,
  Building,
  Phone,
  Globe,
  Award,
  Sparkles,
  Shield,
  HelpCircle,
  FileUp,
  XCircle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { useHospitalPortal } from '../../../context/HospitalContext';
import { HospitalApplication, HospitalApplicationStatus, ApplicationDocument } from '../../../types/hospitalPortal';

type AuthTab = 'login' | 'activate' | 'apply' | 'forgot' | 'track' | 'authority';

interface AuthPageProps {
  onBackToPublic?: () => void;
  /** Which account screen to open first (e.g. 'apply' for sign-up, 'forgot' for recovery). */
  initialTab?: AuthTab;
  /** Fired when a sign-in started on this page succeeds (used by the pre-login gate). */
  onLoginSuccess?: () => void;
  /** Label for the back button when the page is opened from the compact sign-in gate. */
  backButtonLabel?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onBackToPublic,
  initialTab = 'login',
  onLoginSuccess,
  backButtonLabel = 'Public Transparency Registry'
}) => {
  const {
    loginWithHospitalCredentials,
    activateHospitalAccount,
    checkUsernameAvailability,
    validateActivationToken,
    submitHospitalApplication,
    reviewHospitalApplication,
    approveHospitalApplication,
    rejectHospitalApplication,
    requestAdditionalInfo,
    suspendHospitalAccount,
    reactivateHospitalAccount,
    regenerateActivationToken,
    requestPasswordReset,
    validatePasswordResetToken,
    resetPasswordWithToken,
    applications,
    hospitalAccounts,
    activationTokens,
    passwordResetTokens,
    setCurrentView,
    currentUser,
    logout,
    auditLogs
  } = useHospitalPortal();

  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Activation Form State
  const [activationTokenInput, setActivationTokenInput] = useState('');
  const [verifiedApplication, setVerifiedApplication] = useState<HospitalApplication | null>(null);
  const [tokenValidationError, setTokenValidationError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; error?: string }>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activationDeclaration, setActivationDeclaration] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);

  // Application (Request Access) Form State
  const [appForm, setAppForm] = useState({
    hospitalLegalName: '',
    publicName: '',
    registrationNumber: '',
    cinNumber: '',
    hospitalType: 'Super Specialty' as const,
    ownership: 'Trust / Non-Profit' as const,
    establishedYear: 2010,
    streetAddress: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    officialPhone: '',
    officialEmail: '',
    emergencyHotline: '',
    websiteUrl: '',
    healthAuthorityRegDetails: '',
    accreditations: ['NABH', 'NABL'] as string[],
    totalBedsCount: 350,
    icuBedsCount: 50,
    traumaLevel: 'Level 1 Trauma Center' as const,
    representativeName: '',
    representativeDesignation: 'Medical Superintendent / Administrator',
    representativeEmail: '',
    representativePhone: '',
    representativeCouncilId: '',
    declarationCertified: false
  });
  const [uploadedDocs, setUploadedDocs] = useState<ApplicationDocument[]>([
    {
      id: 'DOC-1',
      title: 'State Health Registration Certificate',
      category: 'Registration Certificate',
      fileName: 'health_dept_registration_2026.pdf',
      fileSize: '3.4 MB',
      uploadDate: new Date().toISOString(),
      verified: true
    },
    {
      id: 'DOC-2',
      title: 'Government Hospital Authorization License',
      category: 'Government Authorization',
      fileName: 'operating_license_moh.pdf',
      fileSize: '2.8 MB',
      uploadDate: new Date().toISOString(),
      verified: true
    }
  ]);
  const [applicationSubmittedResult, setApplicationSubmittedResult] = useState<string | null>(null);
  const [appFormError, setAppFormError] = useState('');
  const [appSubmitting, setAppSubmitting] = useState(false);

  // Track Application State
  const [trackSearchId, setTrackSearchId] = useState('APP-REQ-2026-0911');
  const [trackedApplication, setTrackedApplication] = useState<HospitalApplication | null>(() => {
    return applications.find((a) => a.id === 'APP-REQ-2026-0911') || applications[0] || null;
  });

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotDemoToken, setForgotDemoToken] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Authority Dashboard State
  const [authoritySelectedAppId, setAuthoritySelectedAppId] = useState<string>(applications[0]?.id || '');
  const [authorityReviewNotes, setAuthorityReviewNotes] = useState('');
  const [authorityActionMsg, setAuthorityActionMsg] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Password strength calculation
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-neutral-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-[#008F68]' };
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await loginWithHospitalCredentials(loginIdentifier, loginPassword, rememberMe);
      if (res.success) {
        setCurrentView('dashboard');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setLoginError(res.error || 'Invalid username or password. Please verify your credentials and try again.');
      }
    } catch {
      setLoginError('Authentication failed. Please verify your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Token Validation
  const handleValidateToken = () => {
    setTokenValidationError('');
    setVerifiedApplication(null);
    const result = validateActivationToken(activationTokenInput);
    if (result.valid && result.application) {
      setVerifiedApplication(result.application);
    } else {
      setTokenValidationError(result.error || 'The activation token provided is invalid or expired.');
    }
  };

  // Handle Username Change
  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/\s+/g, '');
    setNewUsername(clean);
    if (!clean) {
      setUsernameStatus({});
      return;
    }
    const check = checkUsernameAvailability(clean);
    setUsernameStatus(check);
  };

  // Handle Account Activation
  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');

    if (newPassword !== confirmPassword) {
      setActivationError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!activationDeclaration) {
      setActivationError('Please confirm the legal authorization declaration checkbox.');
      return;
    }

    setActivationLoading(true);
    try {
      const res = await activateHospitalAccount({
        token: activationTokenInput,
        username: newUsername,
        password: newPassword,
        declarationAccepted: activationDeclaration
      });

      if (res.success && res.username) {
        setActivationSuccess(res.username);
      } else {
        setActivationError(res.error || 'Activation failed. Please check the token and details.');
      }
    } catch {
      setActivationError('System error during activation.');
    } finally {
      setActivationLoading(false);
    }
  };

  // Handle Application Submit
  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppFormError('');
    if (!appForm.hospitalLegalName || !appForm.registrationNumber || !appForm.officialEmail || !appForm.representativeName) {
      setAppFormError('All institutional and representative contact fields are mandatory.');
      return;
    }
    if (!appForm.declarationCertified) {
      setAppFormError('You must certify the legal declaration before submitting.');
      return;
    }

    setAppSubmitting(true);
    try {
      const res = await submitHospitalApplication({
        hospitalLegalName: appForm.hospitalLegalName,
        publicName: appForm.publicName || appForm.hospitalLegalName,
        registrationNumber: appForm.registrationNumber,
        cinNumber: appForm.cinNumber,
        hospitalType: appForm.hospitalType,
        ownership: appForm.ownership,
        establishedYear: Number(appForm.establishedYear),
        streetAddress: appForm.streetAddress,
        city: appForm.city,
        state: appForm.state,
        country: appForm.country,
        postalCode: appForm.postalCode,
        officialPhone: appForm.officialPhone,
        officialEmail: appForm.officialEmail,
        emergencyHotline: appForm.emergencyHotline || appForm.officialPhone,
        websiteUrl: appForm.websiteUrl,
        healthAuthorityRegDetails: appForm.healthAuthorityRegDetails,
        accreditations: appForm.accreditations,
        totalBedsCount: Number(appForm.totalBedsCount),
        icuBedsCount: Number(appForm.icuBedsCount),
        traumaLevel: appForm.traumaLevel,
        representativeName: appForm.representativeName,
        representativeDesignation: appForm.representativeDesignation,
        representativeEmail: appForm.representativeEmail,
        representativePhone: appForm.representativePhone,
        representativeCouncilId: appForm.representativeCouncilId,
        documents: uploadedDocs,
        declarationCertified: true
      });

      if (res.success && res.applicationId) {
        setApplicationSubmittedResult(res.applicationId);
        setTrackSearchId(res.applicationId);
      } else {
        setAppFormError(res.error || 'Failed to submit application.');
      }
    } catch {
      setAppFormError('Network error while processing application.');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Handle Track Lookup
  const handleTrackLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const app = applications.find(
      (a) => a.id.toLowerCase() === trackSearchId.trim().toLowerCase() || a.registrationNumber.toLowerCase() === trackSearchId.trim().toLowerCase()
    );
    setTrackedApplication(app || null);
  };

  // Handle Forgot Password Request
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('');
    setForgotDemoToken(null);
    const res = await requestPasswordReset(forgotIdentifier);
    setForgotMessage(res.message);
    if (res.demoToken) {
      setForgotDemoToken(res.demoToken);
      setResetTokenInput(res.demoToken);
    }
  };

  // Handle Password Reset Submit
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    const res = await resetPasswordWithToken({
      token: resetTokenInput,
      newPassword: resetNewPassword
    });
    if (res.success) {
      setResetSuccess(true);
    } else {
      setResetError(res.error || 'Failed to reset password.');
    }
  };

  const currentSelectedApp = useMemo(() => {
    return applications.find((a) => a.id === authoritySelectedAppId) || applications[0];
  }, [applications, authoritySelectedAppId]);

  return (
    <div className="min-h-screen bg-[#F6FBF8] text-[#17221E] flex flex-col font-sans">
      {/* Top Banner Navigation Contract */}
      <header className="h-14 border-b border-[#DCEBE4] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-bold text-[#17221E] tracking-tight">
              GlobalHealth Hospital Authority Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToPublic && (
            <button
              onClick={onBackToPublic}
              className="px-3.5 py-1.5 rounded-xl border border-[#DCEBE4] text-[#52635C] hover:text-[#17221E] hover:bg-[#F6FBF8] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              <span>{backButtonLabel}</span>
            </button>
          )}

          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#DCEBE4]">
              <span className="text-xs font-medium text-[#52635C] hidden sm:inline">
                Signed in as <strong className="text-[#17221E]">{currentUser.name}</strong>
              </span>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-1.5 bg-[#008F68] text-white rounded-xl text-xs font-bold hover:bg-[#007A59] transition cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-[#52635C] hover:text-[#D64545] rounded-lg transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Prominent Authority Notice Banner */}
      <div className="bg-[#FFFFFF] border-b border-[#DCEBE4] px-4 sm:px-8 py-5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FFF1F1] text-[#C53939] border border-[#F2CCCC] text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                Authorized Hospital Access Only
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5] text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                State & Health Authority Governed
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-[#17221E] tracking-tight">
              Hospital Portal access is restricted to hospitals that have been verified and approved by the authorized Hospital Authority. Approved hospitals can securely activate their account and create their own username and password.
            </h1>
            <p className="text-xs text-[#52635C] leading-relaxed">
              Unverified institutions must submit formal credentialing documents. Hospital authorities will never ask for or manage your private password.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('apply')}
              className="px-3.5 py-2 rounded-xl bg-[#008F68] text-white hover:bg-[#007A59] text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <FileUp className="h-4 w-4" />
              <span>Request Hospital Access</span>
            </button>
            <button
              onClick={() => setActiveTab('activate')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#008F68] text-[#008F68] hover:bg-[#E8F7F1] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="h-4 w-4" />
              <span>Activate Approved Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace with Side Authentication Navigation */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCEBE4] p-3 shadow-xs space-y-2 sticky top-20">
          <div className="p-3 border-b border-[#DCEBE4]">
            <p className="text-[11px] font-bold text-[#52635C] uppercase tracking-wider">
              Authentication & Governance
            </p>
            <p className="text-xs text-[#17221E] font-medium mt-0.5">
              Select verification procedure
            </p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                  : 'text-[#52635C] hover:bg-[#F6FBF8] hover:text-[#17221E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4" />
                <span>Log In</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => {
                setActiveTab('activate');
                setActivationError('');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'activate'
                  ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                  : 'text-[#52635C] hover:bg-[#F6FBF8] hover:text-[#17221E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4" />
                <span>Activate Approved Account</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] bg-[#E8F7F1] text-[#008F68] rounded-md font-semibold">
                Self-Service
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('apply');
                setAppFormError('');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'apply'
                  ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                  : 'text-[#52635C] hover:bg-[#F6FBF8] hover:text-[#17221E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileUp className="h-4 w-4" />
                <span>Request Access (Apply)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => {
                setActiveTab('track');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                  : 'text-[#52635C] hover:bg-[#F6FBF8] hover:text-[#17221E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4" />
                <span>Track Request Status</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <button
              onClick={() => {
                setActiveTab('forgot');
                setForgotMessage('');
                setResetError('');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'forgot'
                  ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                  : 'text-[#52635C] hover:bg-[#F6FBF8] hover:text-[#17221E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4" />
                <span>Forgot Password</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>

            <div className="pt-2 mt-2 border-t border-[#DCEBE4]">
              <button
                onClick={() => {
                  setActiveTab('authority');
                  setAuthorityActionMsg('');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'authority'
                    ? 'bg-[#17221E] text-white'
                    : 'text-[#17221E] bg-[#EAF6FB] hover:bg-[#D9EFF9]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#008F68]" />
                  <span>Authority Officer Portal</span>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] bg-white text-[#17221E] rounded-md font-semibold border border-[#DCEBE4]">
                  {applications.filter((a) => a.status === 'PENDING_REVIEW' || a.status === 'UNDER_REVIEW').length} Pending
                </span>
              </button>
            </div>
          </nav>

          {/* Quick Access Info Card */}
          <div className="p-3.5 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] space-y-2 mt-3 text-xs text-[#52635C]">
            <p className="font-bold text-[#17221E] flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-[#008F68]" />
              Hospital Security Protocol
            </p>
            <p className="text-[11px] leading-relaxed">
              Hospital accounts are protected by multi-factor authentication, cryptographic salt-hashing, and immutable audit logs.
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8">
          {/* TAB 1: HOSPITAL LOGIN */}
          {activeTab === 'login' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#17221E]">Hospital Portal Log In</h2>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      Sign in using your verified hospital username and password
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E8F7F1] text-[#008F68]">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F1] border border-[#F2CCCC] text-[#C53939] text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{loginError}</p>
                    <p className="text-[11px] font-normal text-[#52635C]">
                      If your hospital account has not yet been activated, please use your single-use token to create credentials.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#52635C] mb-1.5">
                    Hospital Username or Official Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. apex_admin or admin@apexhealth.org"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                    />
                    <User className="h-4 w-4 text-[#52635C] absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#52635C]">
                      Hospital Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-xs text-[#008F68] hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                    />
                    <Lock className="h-4 w-4 text-[#52635C] absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-[#52635C] hover:text-[#17221E] cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#52635C]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#D8E7E0] text-[#008F68] focus:ring-[#008F68]"
                    />
                    <span>Remember this clinical workstation</span>
                  </label>

                  <span className="text-[11px] text-[#52635C] font-mono">
                    Protected by 2FA & Audit Log
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{loginLoading ? 'Authenticating...' : 'Log In to Hospital Portal'}</span>
                </button>
              </form>

              {/* Bottom Assistance Links */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#52635C]">
                <button
                  onClick={() => setActiveTab('activate')}
                  className="text-[#008F68] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Approved Hospital? Activate your account</span>
                </button>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="hover:text-[#17221E] font-medium cursor-pointer"
                >
                  New Hospital? Request Access
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVATE APPROVED HOSPITAL ACCOUNT */}
          {activeTab === 'activate' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#17221E]">Activate Approved Hospital Account</h2>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      This account activation page is available only to hospitals approved by the authorized Hospital Authority.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E8F7F1] text-[#008F68]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {activationSuccess ? (
                <div className="p-6 rounded-2xl bg-[#E8F7F1] border border-[#BDE4D5] text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-[#008F68] text-white">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#17221E]">Hospital Account Created Successfully</h3>
                    <p className="text-xs text-[#52635C] max-w-md mx-auto mt-1">
                      Your Hospital Portal account for <strong className="text-[#17221E]">@{activationSuccess}</strong> has been created and verified by the Hospital Authority. You can now log in using your newly established credentials.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setLoginIdentifier(activationSuccess);
                      setActivationSuccess(null);
                      setActiveTab('login');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#008F68] text-white text-xs font-bold hover:bg-[#007A59] transition cursor-pointer shadow-xs"
                  >
                    Go to Hospital Login
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step 1: Token Input */}
                  <div className="p-4 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] space-y-3">
                    <label className="block text-xs font-bold text-[#17221E]">
                      Step 1: Enter Single-Use Authority Activation Token
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activationTokenInput}
                        onChange={(e) => setActivationTokenInput(e.target.value.trim())}
                        placeholder="Enter your activation token"
                        className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                      />
                      <button
                        type="button"
                        onClick={handleValidateToken}
                        className="px-4 py-2 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        Verify Token
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#52635C]">
                      <span>Issued via official regulatory dispatch email.</span>
                    </div>

                    {tokenValidationError && (
                      <p className="text-xs font-semibold text-[#C53939] flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {tokenValidationError}
                      </p>
                    )}
                  </div>

                  {/* Step 2: Account Creation Form (Enabled upon valid token) */}
                  {verifiedApplication && (
                    <div className="space-y-6 pt-2">
                      {/* Verified Hospital Metadata */}
                      <div className="p-4 rounded-xl bg-[#E8F7F1] border border-[#BDE4D5] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-white text-[#008F68] font-bold text-[11px] border border-[#BDE4D5] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved by Hospital Authority
                          </span>
                          <span className="text-[11px] font-mono text-[#52635C]">
                            Ref: {verifiedApplication.id}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#17221E]">
                          {verifiedApplication.hospitalLegalName}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#52635C] pt-1">
                          <div>
                            <span className="text-[#8B9893]">Reg No: </span>
                            <strong>{verifiedApplication.registrationNumber}</strong>
                          </div>
                          <div>
                            <span className="text-[#8B9893]">Location: </span>
                            <strong>{verifiedApplication.city}, {verifiedApplication.country}</strong>
                          </div>
                          <div>
                            <span className="text-[#8B9893]">Official Email: </span>
                            <strong>{verifiedApplication.officialEmail}</strong>
                          </div>
                        </div>
                      </div>

                      {activationError && (
                        <div className="p-3 rounded-xl bg-[#FFF1F1] border border-[#F2CCCC] text-[#C53939] text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{activationError}</span>
                        </div>
                      )}

                      <form onSubmit={handleActivationSubmit} className="space-y-4">
                        {/* Create Username */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-[#52635C]">
                              Step 2: Create Hospital Username
                            </label>
                            {newUsername && (
                              <span
                                className={`text-[11px] font-bold ${
                                  usernameStatus.available ? 'text-[#008F68]' : 'text-[#C53939]'
                                }`}
                              >
                                {usernameStatus.available ? '✓ Username Available' : usernameStatus.error || 'Unavailable'}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={newUsername}
                              onChange={(e) => handleUsernameChange(e.target.value)}
                              placeholder="e.g. stjude_mumbai_admin"
                              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-[#17221E] focus:outline-none ${
                                newUsername && usernameStatus.available
                                  ? 'border-[#008F68]'
                                  : 'border-[#D8E7E0] focus:border-[#008F68]'
                              }`}
                            />
                          </div>
                          <p className="text-[11px] text-[#52635C] mt-1">
                            Must be 4–24 characters: lowercase letters, numbers, hyphens, and underscores only.
                          </p>
                        </div>

                        {/* Create Password */}
                        <div>
                          <label className="block text-xs font-bold text-[#52635C] mb-1.5">
                            Step 3: Create Hospital Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min 8 characters (mixed case, numbers, symbols)"
                              className="w-full px-3.5 pr-10 py-2.5 text-sm bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-3 text-[#52635C] hover:text-[#17221E] cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>

                          {/* Strength Bar */}
                          {newPassword && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#52635C]">Password Strength:</span>
                                <span className="font-bold text-[#17221E]">
                                  {calculatePasswordStrength(newPassword).label}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden flex gap-1">
                                <div
                                  className={`h-full flex-1 rounded-full ${
                                    calculatePasswordStrength(newPassword).score >= 1
                                      ? calculatePasswordStrength(newPassword).color
                                      : 'bg-transparent'
                                  }`}
                                />
                                <div
                                  className={`h-full flex-1 rounded-full ${
                                    calculatePasswordStrength(newPassword).score >= 2
                                      ? calculatePasswordStrength(newPassword).color
                                      : 'bg-transparent'
                                  }`}
                                />
                                <div
                                  className={`h-full flex-1 rounded-full ${
                                    calculatePasswordStrength(newPassword).score >= 3
                                      ? calculatePasswordStrength(newPassword).color
                                      : 'bg-transparent'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-xs font-bold text-[#52635C] mb-1.5">
                            Confirm Password
                          </label>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-[#17221E] focus:outline-none ${
                              confirmPassword && confirmPassword === newPassword
                                ? 'border-[#008F68]'
                                : 'border-[#D8E7E0] focus:border-[#008F68]'
                            }`}
                          />
                        </div>

                        {/* Declaration Checkbox */}
                        <div className="p-3.5 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4]">
                          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#17221E]">
                            <input
                              type="checkbox"
                              checked={activationDeclaration}
                              onChange={(e) => setActivationDeclaration(e.target.checked)}
                              className="mt-0.5 rounded border-[#D8E7E0] text-[#008F68] focus:ring-[#008F68]"
                            />
                            <span className="leading-relaxed text-[11px]">
                              I confirm that I am an authorized institutional representative to establish administrative credentials for <strong>{verifiedApplication.hospitalLegalName}</strong>. I agree to comply with healthcare regulatory and patient data protection standards.
                            </span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={activationLoading || !usernameStatus.available}
                          className="w-full py-3 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{activationLoading ? 'Creating Hospital Account...' : 'Create Hospital Account & Activate'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REQUEST HOSPITAL ACCESS (NEW APPLICATION) */}
          {activeTab === 'apply' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#17221E]">Request Hospital Access</h2>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      Submit institutional credentialing documents for Hospital Authority review
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#EAF6FB] text-[#287EA8]">
                    <FileUp className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {applicationSubmittedResult ? (
                <div className="p-6 rounded-2xl bg-[#E8F7F1] border border-[#BDE4D5] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-[#008F68] text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#17221E]">Application Submitted</h3>
                      <p className="text-xs text-[#52635C]">
                        Your hospital access request has been submitted successfully and is awaiting verification by the authorized Hospital Authority.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#DCEBE4] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#52635C] font-semibold">Application Reference ID</span>
                      <p className="text-sm font-mono font-bold text-[#17221E]">{applicationSubmittedResult}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(applicationSubmittedResult)}
                      className="px-3 py-1.5 rounded-lg border border-[#DCEBE4] hover:bg-[#F6FBF8] text-xs font-semibold text-[#52635C] flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedText === applicationSubmittedResult ? <Check className="h-3.5 w-3.5 text-[#008F68]" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedText === applicationSubmittedResult ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FFF1F1] border border-[#F2CCCC] text-[11px] text-[#C53939] leading-relaxed">
                    <strong>Notice:</strong> Hospital Portal access is restricted and you cannot log in until your application is approved and activated. Once approved, single-use activation credentials will be dispatched to your official hospital email.
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => {
                        setTrackSearchId(applicationSubmittedResult);
                        setActiveTab('track');
                        handleTrackLookup();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#008F68] text-white text-xs font-bold hover:bg-[#007A59] transition cursor-pointer"
                    >
                      Track Application Status
                    </button>
                    <button
                      onClick={() => {
                        setApplicationSubmittedResult(null);
                        setActiveTab('login');
                      }}
                      className="px-4 py-2 rounded-xl border border-[#DCEBE4] text-xs font-bold text-[#52635C] hover:bg-[#F6FBF8] transition cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplicationSubmit} className="space-y-6">
                  {appFormError && (
                    <div className="p-3 rounded-xl bg-[#FFF1F1] border border-[#F2CCCC] text-[#C53939] text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{appFormError}</span>
                    </div>
                  )}

                  {/* Section A: Institutional Identity */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#17221E] uppercase tracking-wider border-b border-[#DCEBE4] pb-1.5">
                      Section A: Hospital Legal & Institutional Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Full Legal Hospital Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={appForm.hospitalLegalName}
                          onChange={(e) => setAppForm({ ...appForm, hospitalLegalName: e.target.value })}
                          placeholder="e.g. Royal Care Institute of Cardiac Sciences Ltd."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Public / Clinical Brand Name
                        </label>
                        <input
                          type="text"
                          value={appForm.publicName}
                          onChange={(e) => setAppForm({ ...appForm, publicName: e.target.value })}
                          placeholder="e.g. Royal Care Hospital"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          State Health Directorate Registration No *
                        </label>
                        <input
                          type="text"
                          required
                          value={appForm.registrationNumber}
                          onChange={(e) => setAppForm({ ...appForm, registrationNumber: e.target.value })}
                          placeholder="e.g. DHS/REG/2026/9981"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Hospital Type
                        </label>
                        <select
                          value={appForm.hospitalType}
                          onChange={(e) => setAppForm({ ...appForm, hospitalType: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        >
                          <option value="Super Specialty">Super Specialty</option>
                          <option value="Multi Specialty">Multi Specialty</option>
                          <option value="Tertiary Care">Tertiary Care</option>
                          <option value="Teaching Hospital">Teaching Hospital</option>
                          <option value="Community Hospital">Community Hospital</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Ownership Model
                        </label>
                        <select
                          value={appForm.ownership}
                          onChange={(e) => setAppForm({ ...appForm, ownership: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        >
                          <option value="Trust / Non-Profit">Trust / Non-Profit</option>
                          <option value="Private">Private / Corporate</option>
                          <option value="Government / Public">Government / Public</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Address & Contacts */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#17221E] uppercase tracking-wider border-b border-[#DCEBE4] pb-1.5">
                      Section B: Official Campus Location & Contact Channels
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Campus Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={appForm.streetAddress}
                          onChange={(e) => setAppForm({ ...appForm, streetAddress: e.target.value })}
                          placeholder="e.g. 102 Institutional Enclave, Sector 62"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={appForm.city}
                          onChange={(e) => setAppForm({ ...appForm, city: e.target.value })}
                          placeholder="e.g. Noida / New Delhi"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">State / Province *</label>
                        <input
                          type="text"
                          required
                          value={appForm.state}
                          onChange={(e) => setAppForm({ ...appForm, state: e.target.value })}
                          placeholder="e.g. Uttar Pradesh"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">Country *</label>
                        <input
                          type="text"
                          required
                          value={appForm.country}
                          onChange={(e) => setAppForm({ ...appForm, country: e.target.value })}
                          placeholder="e.g. India"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">Official Regulatory Email *</label>
                        <input
                          type="email"
                          required
                          value={appForm.officialEmail}
                          onChange={(e) => setAppForm({ ...appForm, officialEmail: e.target.value })}
                          placeholder="admin@royalcarehospital.org"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">Official Main Desk Phone *</label>
                        <input
                          type="text"
                          required
                          value={appForm.officialPhone}
                          onChange={(e) => setAppForm({ ...appForm, officialPhone: e.target.value })}
                          placeholder="+91 120 456 7890"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">Emergency Hotline (24/7)</label>
                        <input
                          type="text"
                          value={appForm.emergencyHotline}
                          onChange={(e) => setAppForm({ ...appForm, emergencyHotline: e.target.value })}
                          placeholder="+91 120 456 9999"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C: Authorized Representative */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#17221E] uppercase tracking-wider border-b border-[#DCEBE4] pb-1.5">
                      Section C: Authorized Institutional Representative
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Full Name & Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={appForm.representativeName}
                          onChange={(e) => setAppForm({ ...appForm, representativeName: e.target.value })}
                          placeholder="Dr. Rajeshwari Menon, MS, MCh"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Designation / Role *
                        </label>
                        <input
                          type="text"
                          required
                          value={appForm.representativeDesignation}
                          onChange={(e) => setAppForm({ ...appForm, representativeDesignation: e.target.value })}
                          placeholder="Medical Director / Chief Superintendent"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Representative Official Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={appForm.representativeEmail}
                          onChange={(e) => setAppForm({ ...appForm, representativeEmail: e.target.value })}
                          placeholder="director.menon@royalcarehospital.org"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Council Registration Number
                        </label>
                        <input
                          type="text"
                          value={appForm.representativeCouncilId}
                          onChange={(e) => setAppForm({ ...appForm, representativeCouncilId: e.target.value })}
                          placeholder="e.g. DMC/R/10492"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section D: Verification Documents */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#17221E] uppercase tracking-wider border-b border-[#DCEBE4] pb-1.5">
                      Section D: Credentialing Documents & Licenses
                    </h3>

                    <div className="p-4 rounded-xl border border-dashed border-[#008F68] bg-[#F6FBF8] text-center space-y-2">
                      <UploadCloud className="h-6 w-6 text-[#008F68] mx-auto" />
                      <p className="text-xs font-bold text-[#17221E]">
                        Institutional Verification Documents Attached ({uploadedDocs.length})
                      </p>
                      <p className="text-[11px] text-[#52635C]">
                        PDF, DOCX up to 25MB each (Operating License, Registration Certificate, NABH/JCI accreditation).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#DCEBE4] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#008F68]" />
                            <div>
                              <p className="font-bold text-[#17221E]">{doc.title}</p>
                              <p className="text-[11px] text-[#52635C] font-mono">{doc.fileName} • {doc.fileSize}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-[#E8F7F1] text-[#008F68] font-bold text-[10px]">
                            Attached
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section E: Mandatory Declaration */}
                  <div className="p-4 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4]">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#17221E]">
                      <input
                        type="checkbox"
                        checked={appForm.declarationCertified}
                        onChange={(e) => setAppForm({ ...appForm, declarationCertified: e.target.checked })}
                        className="mt-0.5 rounded border-[#D8E7E0] text-[#008F68] focus:ring-[#008F68]"
                      />
                      <span className="leading-relaxed text-[11px]">
                        I certify that the information submitted is accurate and that I am authorized to submit this hospital access request. I understand that access to the Hospital Portal is restricted and subject to formal verification by the Hospital Authority.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={appSubmitting}
                    className="w-full py-3 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FileUp className="h-4 w-4" />
                    <span>{appSubmitting ? 'Submitting Application...' : 'Submit Hospital Access Application'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: TRACK REQUEST STATUS */}
          {activeTab === 'track' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#17221E]">Track Request Status</h2>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      Check real-time credentialing and approval status with your Application ID
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E8F7F1] text-[#008F68]">
                    <Search className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Search Box */}
              <form onSubmit={handleTrackLookup} className="flex gap-2">
                <input
                  type="text"
                  value={trackSearchId}
                  onChange={(e) => setTrackSearchId(e.target.value)}
                  placeholder="Enter Application ID e.g. APP-REQ-2026-0911"
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Tracked Record Details */}
              {trackedApplication ? (
                <div className="space-y-4 pt-2 border-t border-[#DCEBE4]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4]">
                    <div>
                      <span className="text-[11px] font-mono text-[#52635C]">{trackedApplication.id}</span>
                      <h3 className="text-base font-bold text-[#17221E]">{trackedApplication.hospitalLegalName}</h3>
                      <p className="text-xs text-[#52635C]">
                        {trackedApplication.city}, {trackedApplication.country} • Reg No: {trackedApplication.registrationNumber}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          trackedApplication.status === 'APPROVED_NOT_ACTIVATED'
                            ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                            : trackedApplication.status === 'ACTIVE'
                            ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                            : trackedApplication.status === 'REJECTED'
                            ? 'bg-[#FFF1F1] text-[#C53939] border border-[#F2CCCC]'
                            : 'bg-[#FFF8E6] text-[#A06000] border border-[#F5DC9A]'
                        }`}
                      >
                        {trackedApplication.status === 'APPROVED_NOT_ACTIVATED'
                          ? 'Approved (Pending Activation)'
                          : trackedApplication.status === 'ACTIVE'
                          ? 'Active & Operational'
                          : trackedApplication.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Review Notes */}
                  {trackedApplication.reviewNotes && (
                    <div className="p-3.5 rounded-xl bg-white border border-[#DCEBE4] text-xs space-y-1">
                      <span className="font-bold text-[#17221E] flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-[#008F68]" />
                        Authority Review Assessment
                      </span>
                      <p className="text-[#52635C] leading-relaxed">{trackedApplication.reviewNotes}</p>
                      {trackedApplication.reviewedBy && (
                        <p className="text-[11px] text-[#8B9893]">
                          Reviewed by: {trackedApplication.reviewedBy} on {new Date(trackedApplication.reviewedAt || '').toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Direct Activation CTA if Approved */}
                  {trackedApplication.status === 'APPROVED_NOT_ACTIVATED' && trackedApplication.activationToken && (
                    <div className="p-4 rounded-xl bg-[#E8F7F1] border border-[#BDE4D5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#008F68]">Your hospital has been verified and approved</p>
                        <p className="text-[11px] text-[#52635C]">
                          Token: <code className="font-bold text-[#17221E]">{trackedApplication.activationToken}</code>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActivationTokenInput(trackedApplication.activationToken || '');
                          setActiveTab('activate');
                          handleValidateToken();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#008F68] text-white text-xs font-bold hover:bg-[#007A59] transition cursor-pointer shrink-0"
                      >
                        Activate Account Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#52635C] border border-dashed border-[#DCEBE4] rounded-xl">
                  No application found matching this reference identifier.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#17221E]">Reset Hospital Portal Password</h2>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      Request a secure, single-use reset token sent to your registered contact method
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFF8E6] text-[#A06000]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {resetSuccess ? (
                <div className="p-6 rounded-2xl bg-[#E8F7F1] border border-[#BDE4D5] text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-[#008F68] text-white">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#17221E]">Password Reset Successfully</h3>
                    <p className="text-xs text-[#52635C] max-w-md mx-auto mt-1">
                      Your hospital password has been updated. You can now log in with your updated credentials.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setResetSuccess(false);
                      setActiveTab('login');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#008F68] text-white text-xs font-bold hover:bg-[#007A59] transition cursor-pointer shadow-xs"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step 1: Request Reset */}
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#52635C] mb-1.5">
                        Hospital Username or Registered Official Email
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. apex_admin or admin@apexhealth.org"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Send Password Reset Link
                    </button>
                  </form>

                  {forgotMessage && (
                    <div className="p-4 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] text-xs text-[#52635C] space-y-2">
                      <p className="font-semibold text-[#17221E]">{forgotMessage}</p>
                      {forgotDemoToken && (
                        <div className="p-2.5 rounded-lg bg-white border border-[#008F68] flex items-center justify-between">
                          <span className="font-mono text-xs text-[#008F68]">
                            Single-Use Token: <strong>{forgotDemoToken}</strong>
                          </span>
                          <button
                            onClick={() => handleCopy(forgotDemoToken)}
                            className="text-xs text-[#52635C] hover:text-[#17221E] font-semibold cursor-pointer"
                          >
                            {copiedText === forgotDemoToken ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Reset Form */}
                  <div className="pt-4 border-t border-[#DCEBE4] space-y-4">
                    <h3 className="text-xs font-bold text-[#17221E] uppercase tracking-wider">
                      Execute Reset with Security Token
                    </h3>

                    {resetError && (
                      <div className="p-3 rounded-xl bg-[#FFF1F1] border border-[#F2CCCC] text-[#C53939] text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#52635C] mb-1">
                          Single-Use Reset Token
                        </label>
                        <input
                          type="text"
                          required
                          value={resetTokenInput}
                          onChange={(e) => setResetTokenInput(e.target.value.trim())}
                          placeholder="e.g. RST-DEMO-2026-7B42"
                          className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#52635C] mb-1">
                            New Password
                          </label>
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            required
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#52635C] mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            required
                            value={resetConfirmPassword}
                            onChange={(e) => setResetConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="text-xs text-[#52635C] hover:text-[#17221E] flex items-center gap-1 cursor-pointer"
                        >
                          {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{showResetPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: HOSPITAL AUTHORITY GOVERNANCE PORTAL */}
          {activeTab === 'authority' && (
            <div className="bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#DCEBE4] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#17221E]">Hospital Authority Review & Governance</h2>
                      <span className="px-2 py-0.5 rounded-md bg-[#EAF6FB] text-[#287EA8] text-[10px] font-bold">
                        Officer Clearance Level
                      </span>
                    </div>
                    <p className="text-xs text-[#52635C] mt-0.5">
                      Credentialing panel for reviewing institutional compliance, issuing activation tokens, and account suspension
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#17221E] text-white">
                    <ShieldCheck className="h-5 w-5 text-[#008F68]" />
                  </div>
                </div>
              </div>

              {authorityActionMsg && (
                <div className="p-3.5 rounded-xl bg-[#E8F7F1] border border-[#BDE4D5] text-[#008F68] text-xs font-semibold flex items-center justify-between">
                  <span>{authorityActionMsg}</span>
                  <button onClick={() => setAuthorityActionMsg('')} className="text-[#52635C] hover:text-[#17221E]">
                    ✕
                  </button>
                </div>
              )}

              {/* Split layout: Request List on Left, Selected Review on Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Applications list */}
                <div className="md:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  <p className="text-[11px] font-bold text-[#52635C] uppercase tracking-wider">
                    Registration Queue ({applications.length})
                  </p>
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setAuthoritySelectedAppId(app.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1 ${
                        authoritySelectedAppId === app.id
                          ? 'border-[#008F68] bg-[#F6FBF8]'
                          : 'border-[#DCEBE4] bg-white hover:border-[#BDE4D5]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-[#52635C]">{app.id}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            app.status === 'APPROVED_NOT_ACTIVATED'
                              ? 'bg-[#E8F7F1] text-[#008F68]'
                              : app.status === 'ACTIVE'
                              ? 'bg-[#E8F7F1] text-[#008F68]'
                              : app.status === 'REJECTED'
                              ? 'bg-[#FFF1F1] text-[#C53939]'
                              : 'bg-[#FFF8E6] text-[#A06000]'
                          }`}
                        >
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="font-bold text-[#17221E] truncate">{app.hospitalLegalName}</p>
                      <p className="text-[11px] text-[#52635C]">
                        {app.city}, {app.country} • {app.hospitalType}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Selected Application Review Panel */}
                <div className="md:col-span-7 bg-[#F6FBF8] rounded-xl border border-[#DCEBE4] p-4 space-y-4">
                  {currentSelectedApp ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-[#008F68]">
                            {currentSelectedApp.id}
                          </span>
                          <span className="text-[11px] text-[#52635C]">
                            Submitted: {new Date(currentSelectedApp.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#17221E] mt-0.5">
                          {currentSelectedApp.hospitalLegalName}
                        </h3>
                        <p className="text-xs text-[#52635C]">
                          Reg No: <strong>{currentSelectedApp.registrationNumber}</strong> • {currentSelectedApp.ownership}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-white border border-[#DCEBE4]">
                        <div>
                          <span className="text-[#8B9893]">Representative:</span>
                          <p className="font-bold text-[#17221E]">{currentSelectedApp.representativeName}</p>
                          <p className="text-[#52635C]">{currentSelectedApp.representativeDesignation}</p>
                        </div>
                        <div>
                          <span className="text-[#8B9893]">Official Contact:</span>
                          <p className="font-bold text-[#17221E]">{currentSelectedApp.officialEmail}</p>
                          <p className="text-[#52635C]">{currentSelectedApp.officialPhone}</p>
                        </div>
                      </div>

                      {/* Documents verification */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-[#52635C] uppercase">
                          Credentialing Documents ({currentSelectedApp.documents.length})
                        </p>
                        {currentSelectedApp.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#DCEBE4] text-[11px]"
                          >
                            <span className="font-semibold text-[#17221E] truncate max-w-[200px]">
                              {doc.title}
                            </span>
                            <span className="text-[#008F68] font-bold">✓ Verified</span>
                          </div>
                        ))}
                      </div>

                      {/* Review Notes Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#52635C] mb-1">
                          Authority Evaluation Notes / Rationale
                        </label>
                        <textarea
                          rows={2}
                          value={authorityReviewNotes}
                          onChange={(e) => setAuthorityReviewNotes(e.target.value)}
                          placeholder="State Health Registry cross-checked. Operating permit valid."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                        />
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-[#DCEBE4] flex flex-wrap gap-2">
                        {currentSelectedApp.status !== 'APPROVED_NOT_ACTIVATED' && currentSelectedApp.status !== 'ACTIVE' && (
                          <button
                            onClick={async () => {
                              const res = await approveHospitalApplication(
                                currentSelectedApp.id,
                                'Dr. Sterling Bennett (Authority Chief)',
                                authorityReviewNotes || 'Verified and approved by Hospital Authority.'
                              );
                              if (res.success) {
                                setAuthorityActionMsg(`Hospital approved! Single-use token issued: ${res.token}`);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#008F68] text-white text-xs font-bold hover:bg-[#007A59] transition cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve & Issue Activation Token</span>
                          </button>
                        )}

                        {currentSelectedApp.status === 'APPROVED_NOT_ACTIVATED' && (
                          <button
                            onClick={() => {
                              const newToken = regenerateActivationToken(currentSelectedApp.id);
                              if (newToken) {
                                setAuthorityActionMsg(`Fresh activation token issued: ${newToken}`);
                              }
                            }}
                            className="px-3 py-2 rounded-xl border border-[#DCEBE4] text-[#52635C] hover:bg-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Regenerate Activation Token</span>
                          </button>
                        )}

                        {currentSelectedApp.status !== 'REJECTED' && currentSelectedApp.status !== 'ACTIVE' && (
                          <button
                            onClick={() => {
                              rejectHospitalApplication(
                                currentSelectedApp.id,
                                'Dr. Sterling Bennett',
                                authorityReviewNotes || 'Credential verification failed.'
                              );
                              setAuthorityActionMsg('Application marked as Rejected.');
                            }}
                            className="px-3 py-2 rounded-xl bg-[#FFF1F1] text-[#C53939] border border-[#F2CCCC] text-xs font-bold hover:bg-[#FFE5E5] transition cursor-pointer"
                          >
                            Reject Application
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#52635C]">Select an application from the queue.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

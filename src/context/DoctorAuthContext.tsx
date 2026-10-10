import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DoctorApplication,
  DoctorAccount,
  DoctorActivationToken,
  DoctorPasswordResetToken,
  DoctorAuditLog,
  DoctorApplicationStatus
} from '../types/doctorAuth';
import { DoctorProfile } from '../types/medauth';
import {
  initialDoctorApplications,
  initialDoctorAccounts,
  initialDoctorActivationTokens,
  initialDoctorAuditLogs
} from '../data/doctorInitialData';
import { initialDoctors } from '../data/sampleDoctors';

// Simulated password hashing helper
const simpleHash = (str: string, salt: string = 'globalhealth_salt') => {
  let hash = 0;
  const combined = `${salt}:${str}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0') + '_hashed';
};

interface VerifyTokenResult {
  valid: boolean;
  status: 'VALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED' | 'NOT_FOUND';
  application?: DoctorApplication;
  tokenData?: DoctorActivationToken;
  message: string;
}

interface DoctorAuthContextType {
  applications: DoctorApplication[];
  accounts: DoctorAccount[];
  activationTokens: DoctorActivationToken[];
  resetTokens: DoctorPasswordResetToken[];
  auditLogs: DoctorAuditLog[];
  allDoctors: DoctorProfile[];
  currentAccount: DoctorAccount | null;
  activeDoctorProfile: DoctorProfile | null;
  authorityOfficer: { name: string; role: string; hospital: string };
  // Server-verified session state
  sessionToken: string | null;
  sessionExpiresAt: string | null;
  sessionExpired: boolean;
  /** True while a persisted session is being re-validated against the server. */
  sessionValidating: boolean;
  dismissSessionExpired: () => void;

  // Core Doctor Auth & Workflow API
  submitDoctorApplication: (
    data: Omit<DoctorApplication, 'id' | 'status' | 'submissionDate'>
  ) => Promise<{ success: boolean; applicationId: string; message: string }>;

  verifyActivationToken: (tokenString: string) => VerifyTokenResult;

  checkUsernameAvailability: (username: string) => { available: boolean; reason?: string };

  activateDoctorAccount: (params: {
    token: string;
    username: string;
    password: string;
    declarationAccepted: boolean;
  }) => Promise<{ success: boolean; message: string; account?: DoctorAccount }>;

  doctorLogin: (
    usernameOrEmail: string,
    password: string
  ) => Promise<{
    success: boolean;
    message: string;
    account?: DoctorAccount;
    isLockedOut?: boolean;
    lockoutMinutesRemaining?: number;
  }>;

  doctorLogout: () => void;

  selectActiveDoctorProfile: (profile: DoctorProfile) => void;

  updateActiveDoctorProfile: (updated: DoctorProfile) => void;

  /** Maps a server-authenticated doctor payload onto the local account +
   *  clinical profile used by the workspace (links by doctorId / username). */
  applyServerDoctor: (serverDoctor: {
    doctorId: string;
    fullName: string;
    username?: string;
    email?: string;
    organization?: string;
    specialty?: string;
    role?: DoctorAccount['role'];
    department?: string;
    registrationNo?: string;
  }) => void;

  requestPasswordReset: (
    usernameOrEmail: string
  ) => Promise<{ success: boolean; message: string; demoResetToken?: string }>;

  verifyResetToken: (tokenString: string) => {
    valid: boolean;
    tokenData?: DoctorPasswordResetToken;
    message: string;
  };

  resetPasswordWithToken: (
    tokenString: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;

  changeDoctorPassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;

  toggleTwoFactor: () => Promise<{ success: boolean; enabled: boolean }>;

  // Authority Admin Actions
  approveDoctorApplication: (
    applicationId: string,
    reviewerNotes?: string
  ) => Promise<{ success: boolean; activationToken: string; message: string }>;

  rejectDoctorApplication: (
    applicationId: string,
    rejectionReason: string
  ) => Promise<{ success: boolean; message: string }>;

  requestAdditionalInfo: (
    applicationId: string,
    requirements: string
  ) => Promise<{ success: boolean; message: string }>;

  suspendDoctorAccount: (
    accountIdOrDocId: string,
    reason: string
  ) => Promise<{ success: boolean; message: string }>;

  reactivateDoctorAccount: (accountIdOrDocId: string) => Promise<{ success: boolean; message: string }>;

  reissueActivationToken: (
    applicationId: string
  ) => Promise<{ success: boolean; token: string; message: string }>;

  addAuditLog: (entry: Omit<DoctorAuditLog, 'id' | 'timestamp'>) => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

export const DoctorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Applications State with local storage persistence
  const [applications, setApplications] = useState<DoctorApplication[]>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_applications_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialDoctorApplications;
  });

  // 2. Doctor Accounts State
  const [accounts, setAccounts] = useState<DoctorAccount[]>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_accounts_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialDoctorAccounts;
  });

  // 3. Activation Tokens State
  const [activationTokens, setActivationTokens] = useState<DoctorActivationToken[]>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_activation_tokens_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialDoctorActivationTokens;
  });

  // 4. Password Reset Tokens State
  const [resetTokens, setResetTokens] = useState<DoctorPasswordResetToken[]>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_reset_tokens_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // 5. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<DoctorAuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_audit_logs_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialDoctorAuditLogs;
  });

  // 6. Registered Doctor Profiles (for EHR / Clinical Workspace)
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>(() => {
    try {
      const stored = localStorage.getItem('medauth_doctors_list_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialDoctors;
  });

  // 7. Active Authenticated Doctor Account
  const [currentAccount, setCurrentAccount] = useState<DoctorAccount | null>(() => {
    try {
      const stored = localStorage.getItem('doctor_portal_active_account_v2');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  // 8. Active Clinical Profile (linked to active account)
  const [activeDoctorProfile, setActiveDoctorProfile] = useState<DoctorProfile | null>(() => {
    try {
      const stored = localStorage.getItem('medauth_active_doctor_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  // Authority Admin Profile Context
  const authorityOfficer = useMemo(
    () => ({
      name: 'Dr. Michael Sterling, MD',
      role: 'Hospital Authority Credentialing & Medical Director',
      hospital: 'Apex Institute of Medical Sciences'
    }),
    []
  );

  // ----------------------------------------------------------------------
  // SERVER-VERIFIED SESSION STATE
  // Credentials are validated ONLY by the backend (/api/doctor/auth/login).
  // The returned session token is persisted so a refresh keeps the doctor
  // signed in, and it is re-validated against /api/doctor/auth/me on mount —
  // an invalid/expired session clears all private state immediately.
  // ----------------------------------------------------------------------
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('doctor_portal_session_token_v1');
    } catch {
      return null;
    }
  });
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('doctor_portal_session_expiry_v1');
    } catch {
      return null;
    }
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionValidating, setSessionValidating] = useState(() => !!sessionToken);

  const clearSessionState = useCallback(() => {
    setSessionToken(null);
    setSessionExpiresAt(null);
    setCurrentAccount(null);
    setActiveDoctorProfile(null);
    try {
      localStorage.removeItem('doctor_portal_session_token_v1');
      localStorage.removeItem('doctor_portal_session_expiry_v1');
      localStorage.removeItem('doctor_portal_active_account_v2');
      localStorage.removeItem('medauth_active_doctor_v1');
    } catch {}
  }, []);

  // Maps a server doctor payload to the local account + clinical profile.
  const applyServerDoctor = useCallback(
    (serverDoctor: {
      doctorId: string;
      fullName: string;
      username?: string;
      email?: string;
      organization?: string;
      specialty?: string;
      role?: DoctorAccount['role'];
      department?: string;
      registrationNo?: string;
    }) => {
      const username = (serverDoctor.username || '').toLowerCase();
      const email = (serverDoctor.email || '').toLowerCase();
      const matchedAccount = accounts.find(
        (a) =>
          a.doctorId === serverDoctor.doctorId ||
          (username && a.username.toLowerCase() === username) ||
          (email && a.officialEmail.toLowerCase() === email)
      );

      const account: DoctorAccount = matchedAccount
        ? {
            ...matchedAccount,
            fullName: serverDoctor.fullName || matchedAccount.fullName,
            speciality: serverDoctor.specialty || matchedAccount.speciality,
            hospitalName: serverDoctor.organization || matchedAccount.hospitalName,
            lastLogin: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null
          }
        : {
            id: `doc-acc-${serverDoctor.doctorId}`,
            doctorId: serverDoctor.doctorId,
            applicationId: 'SERVER-PROVISIONED',
            username: username || serverDoctor.doctorId,
            fullName: serverDoctor.fullName,
            role: serverDoctor.role || 'Consultant',
            speciality: serverDoctor.specialty || 'General Practice',
            hospitalId: 'hosp-apex-01',
            hospitalName: serverDoctor.organization || 'GlobalHealth Partner Hospital',
            department: serverDoctor.department || 'Medical Department',
            officialEmail: email || `${username}@medauth.org`,
            passwordHash: '(managed by server)',
            passwordSalt: 'server',
            accountStatus: 'ACTIVE',
            lastLogin: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null,
            twoFactorEnabled: false,
            createdTimestamp: new Date().toISOString(),
            updatedTimestamp: new Date().toISOString()
          };

      setCurrentAccount(account);
      if (matchedAccount) {
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
      }

      // Link the rich clinical profile for the workspace when one exists.
      const profile =
        allDoctors.find(
          (d) => d.id === serverDoctor.doctorId || (email && d.email.toLowerCase() === email)
        ) || activeDoctorProfile || null;
      setActiveDoctorProfile(profile);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, allDoctors, activeDoctorProfile]
  );

  const applyServerDoctorRef = useRef(applyServerDoctor);
  useEffect(() => {
    applyServerDoctorRef.current = applyServerDoctor;
  }, [applyServerDoctor]);

  // Bootstrap: validate any persisted session against the server.
  useEffect(() => {
    if (!sessionToken) {
      setSessionValidating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/doctor/auth/me', {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.doctor) applyServerDoctorRef.current(data.doctor);
          if (data?.doctor?.sessionExpiresAt) setSessionExpiresAt(data.doctor.sessionExpiresAt);
        } else {
          // Invalid or expired — clear every trace of the private session.
          clearSessionState();
          setSessionExpired(true);
        }
      } catch {
        // Network failure: fail safe — require re-authentication.
        if (!cancelled) {
          clearSessionState();
          setSessionExpired(true);
        }
      } finally {
        if (!cancelled) setSessionValidating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('doctor_portal_applications_v2', JSON.stringify(applications));
    } catch {}
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem('doctor_portal_accounts_v2', JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('doctor_portal_activation_tokens_v2', JSON.stringify(activationTokens));
    } catch {}
  }, [activationTokens]);

  useEffect(() => {
    try {
      localStorage.setItem('doctor_portal_reset_tokens_v2', JSON.stringify(resetTokens));
    } catch {}
  }, [resetTokens]);

  useEffect(() => {
    try {
      localStorage.setItem('doctor_portal_audit_logs_v2', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('medauth_doctors_list_v1', JSON.stringify(allDoctors));
    } catch {}
  }, [allDoctors]);

  useEffect(() => {
    try {
      if (currentAccount) {
        localStorage.setItem('doctor_portal_active_account_v2', JSON.stringify(currentAccount));
      } else {
        localStorage.removeItem('doctor_portal_active_account_v2');
      }
    } catch {}
  }, [currentAccount]);

  useEffect(() => {
    try {
      if (activeDoctorProfile) {
        localStorage.setItem('medauth_active_doctor_v1', JSON.stringify(activeDoctorProfile));
      } else {
        localStorage.removeItem('medauth_active_doctor_v1');
      }
    } catch {}
  }, [activeDoctorProfile]);

  // Helper to append audit logs
  const addAuditLog = useCallback((entry: Omit<DoctorAuditLog, 'id' | 'timestamp'>) => {
    const newLog: DoctorAuditLog = {
      ...entry,
      id: `log-sec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, []);

  // --------------------------------------------------------------------------
  // 1. Submit Doctor Registration / Access Request
  // --------------------------------------------------------------------------
  const submitDoctorApplication = async (
    data: Omit<DoctorApplication, 'id' | 'status' | 'submissionDate'>
  ): Promise<{ success: boolean; applicationId: string; message: string }> => {
    // Generate unique Application ID
    const appId = `DOC-REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const submissionDate = new Date().toISOString();

    const newApp: DoctorApplication = {
      ...data,
      id: appId,
      status: 'PENDING_REVIEW',
      submissionDate,
      assignedReviewer: 'Hospital Authority Credentialing Queue'
    };

    setApplications((prev) => [newApp, ...prev]);

    addAuditLog({
      actor: data.fullName,
      actorRole: 'Applicant Doctor',
      action: 'DOCTOR_ACCESS_REQUEST_SUBMITTED',
      targetDoctorName: data.fullName,
      targetHospitalName: data.hospitalName,
      status: 'SUCCESS',
      ipAddress: '172.56.21.90 (Doctor Portal Application Gateway)',
      details: `Submitted access request ${appId} for ${data.primarySpecialization} at ${data.hospitalName} with ${data.documents.length} verified credentials.`
    });

    return {
      success: true,
      applicationId: appId,
      message: 'Your Doctor Portal access request has been successfully submitted and is awaiting verification by the authorized Hospital Authority.'
    };
  };

  // --------------------------------------------------------------------------
  // 2. Token Verification (for Account Activation)
  // --------------------------------------------------------------------------
  const verifyActivationToken = useCallback(
    (tokenString: string): VerifyTokenResult => {
      const cleanToken = tokenString.trim();
      if (!cleanToken) {
        return {
          valid: false,
          status: 'NOT_FOUND',
          message: 'Please enter a valid activation token.'
        };
      }

      const tokenRecord = activationTokens.find(
        (t) => t.token.toLowerCase() === cleanToken.toLowerCase()
      );

      if (!tokenRecord) {
        return {
          valid: false,
          status: 'NOT_FOUND',
          message: 'Invalid activation token. Please verify the code provided in your official approval authorization.'
        };
      }

      if (tokenRecord.isRevoked) {
        return {
          valid: false,
          status: 'REVOKED',
          tokenData: tokenRecord,
          message: 'This activation token has been revoked by the Hospital Authority. Please contact your credentialing administrator.'
        };
      }

      if (tokenRecord.isUsed) {
        return {
          valid: false,
          status: 'ALREADY_USED',
          tokenData: tokenRecord,
          message: 'This activation token has already been used to create a Doctor Portal account. Please proceed to the Doctor Login page.'
        };
      }

      const now = new Date();
      const expires = new Date(tokenRecord.expiresAt);
      if (now > expires) {
        return {
          valid: false,
          status: 'EXPIRED',
          tokenData: tokenRecord,
          message: 'This activation token has expired. Activation links are time-limited for security. Please request a re-issuance from the Hospital Authority.'
        };
      }

      const app = applications.find((a) => a.id === tokenRecord.applicationId);

      return {
        valid: true,
        status: 'VALID',
        application: app,
        tokenData: tokenRecord,
        message: 'Activation token verified successfully. You may now create your permanent Doctor Portal username and password.'
      };
    },
    [activationTokens, applications]
  );

  // --------------------------------------------------------------------------
  // 3. Username Availability Check
  // --------------------------------------------------------------------------
  const checkUsernameAvailability = useCallback(
    (username: string): { available: boolean; reason?: string } => {
      const clean = username.trim().toLowerCase();
      if (!clean) {
        return { available: false, reason: 'Username cannot be empty.' };
      }
      if (clean.length < 4) {
        return { available: false, reason: 'Username must be at least 4 characters long.' };
      }
      if (clean.length > 24) {
        return { available: false, reason: 'Username cannot exceed 24 characters.' };
      }
      if (!/^[a-z0-9_]+$/.test(clean)) {
        return {
          available: false,
          reason: 'Username can only contain lowercase letters, numbers, and underscores.'
        };
      }

      const reserved = ['admin', 'root', 'administrator', 'system', 'doctor', 'hospital', 'support', 'help', 'api'];
      if (reserved.includes(clean)) {
        return { available: false, reason: 'This username is reserved by the system.' };
      }

      const exists = accounts.some((acc) => acc.username.toLowerCase() === clean);
      if (exists) {
        return { available: false, reason: 'Username is already taken by another practitioner.' };
      }

      return { available: true };
    },
    [accounts]
  );

  // --------------------------------------------------------------------------
  // 4. Activate Approved Doctor Account
  // --------------------------------------------------------------------------
  const activateDoctorAccount = async (params: {
    token: string;
    username: string;
    password: string;
    declarationAccepted: boolean;
  }): Promise<{ success: boolean; message: string; account?: DoctorAccount }> => {
    const { token, username, password, declarationAccepted } = params;

    if (!declarationAccepted) {
      return {
        success: false,
        message: 'You must confirm the authorization declaration checkbox to proceed.'
      };
    }

    const verification = verifyActivationToken(token);
    if (!verification.valid || !verification.tokenData) {
      return {
        success: false,
        message: verification.message
      };
    }

    const avail = checkUsernameAvailability(username);
    if (!avail.available) {
      return {
        success: false,
        message: avail.reason || 'Invalid username selection.'
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long.'
      };
    }

    const tokenRecord = verification.tokenData;
    const app = applications.find((a) => a.id === tokenRecord.applicationId);

    const docId = `doc-${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const salt = `salt_${Date.now()}_doc`;
    const hash = simpleHash(password, salt);

    const newAccount: DoctorAccount = {
      id: `doc-acc-${Date.now()}`,
      doctorId: docId,
      applicationId: tokenRecord.applicationId,
      username: username.toLowerCase().trim(),
      fullName: app?.fullName || tokenRecord.doctorName,
      role: 'Specialist',
      speciality: app?.primarySpecialization || 'Clinical Specialist',
      hospitalId: app?.hospitalId || 'hosp-apex-01',
      hospitalName: app?.hospitalName || tokenRecord.hospitalName,
      department: app?.department || 'Medical Department',
      officialEmail: tokenRecord.officialEmail,
      passwordHash: hash,
      passwordSalt: salt,
      accountStatus: 'ACTIVE',
      lastLogin: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      twoFactorEnabled: true,
      createdTimestamp: new Date().toISOString(),
      updatedTimestamp: new Date().toISOString()
    };

    // Create corresponding DoctorProfile for EHR & Clinical Workspace if not exists
    const newProfile: DoctorProfile = {
      id: docId,
      fullName: app?.fullName || tokenRecord.doctorName,
      post: app?.designation || `Consultant ${app?.primarySpecialization || 'Physician'}`,
      npiNumber: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      medicalCouncilNumber: app?.medicalRegistrationNumber || `MB-REG-${Math.floor(100000 + Math.random() * 900000)}`,
      licenseNumber: app?.medicalRegistrationNumber || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      speciality: app?.primarySpecialization || 'Specialist Physician',
      hospitalAffiliation: app?.hospitalName || tokenRecord.hospitalName,
      email: tokenRecord.officialEmail,
      phone: app?.professionalPhone || '+1 555-0199',
      yearsOfPractice: app?.yearsOfExperience || 10,
      boardCertifications: [app?.qualification || 'Board Certified MD'],
      status: 'VERIFIED',
      confidenceScore: 99,
      verifiedAt: new Date().toISOString(),
      verificationBadgeId: `MEDAUTH-${Math.floor(10000 + Math.random() * 90000)}-${username.toUpperCase().slice(0, 4)}`,
      aiAuditSummary: `Approved and verified by ${app?.assignedReviewer || 'Hospital Authority'}. Cryptographically activated.`,
      mismatches: [],
      securityHash: hash,
      integrationToken: `mat_live_${Math.random().toString(36).substring(2, 12)}`,
      embeddedViewsCount: 1,
      lastVerifiedCheck: new Date().toISOString(),
      avatarUrl: app?.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300'
    };

    // 1. Mark token as used
    setActivationTokens((prev) =>
      prev.map((t) =>
        t.token === tokenRecord.token
          ? { ...t, isUsed: true, usedAt: new Date().toISOString() }
          : t
      )
    );

    // 2. Update application status to ACTIVE
    setApplications((prev) =>
      prev.map((a) =>
        a.id === tokenRecord.applicationId
          ? { ...a, status: 'ACTIVE', createdUsername: username.toLowerCase().trim() }
          : a
      )
    );

    // 3. Add to accounts
    setAccounts((prev) => [newAccount, ...prev]);

    // 4. Add to doctor clinical directory
    setAllDoctors((prev) => {
      const exists = prev.some((d) => d.id === docId);
      return exists ? prev.map((d) => (d.id === docId ? newProfile : d)) : [newProfile, ...prev];
    });

    // Provision the REAL server-side account so the new credentials work at
    // sign-in (the backend is the credential authority). Blocking on failure —
    // without a server account the doctor could not log in.
    try {
      const res = await fetch('/api/doctor/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: docId,
          username: username.toLowerCase().trim(),
          password,
          fullName: newAccount.fullName,
          organization: newAccount.hospitalName,
          specialty: newAccount.speciality,
          role: newAccount.role,
          department: newAccount.department,
          email: newAccount.officialEmail,
          registrationNo: newProfile.medicalCouncilNumber
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        return {
          success: false,
          message: data?.error || 'The credentialing server rejected this activation. Please contact the Hospital Authority.'
        };
      }
    } catch {
      return {
        success: false,
        message: 'The credentialing server is unreachable. Your activation token remains valid — please try again in a moment.'
      };
    }

    addAuditLog({
      actor: newAccount.fullName,
      actorRole: 'Approved Doctor',
      action: 'DOCTOR_ACCOUNT_ACTIVATED',
      targetDoctorId: docId,
      targetDoctorName: newAccount.fullName,
      targetHospitalName: newAccount.hospitalName,
      status: 'SUCCESS',
      ipAddress: 'Server-provisioned activation',
      details: `Account successfully created with username @${username} using activation token ${tokenRecord.token}. Status set to ACTIVE.`
    });

    return {
      success: true,
      message: 'Your Doctor Portal account has been successfully created. You can now log in using your username and password.',
      account: newAccount
    };
  };

  // --------------------------------------------------------------------------
  // 5. Doctor Login
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 6. Doctor Login — credentials are verified by the BACKEND only.
  // The server issues a cryptographically random session token; no password
  // checks (and no universal/backdoor passwords) exist in client code.
  // --------------------------------------------------------------------------
  const doctorLogin = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    account?: DoctorAccount;
    isLockedOut?: boolean;
    lockoutMinutesRemaining?: number;
  }> => {
    const cleanId = usernameOrEmail.trim().toLowerCase();

    if (!cleanId || !password) {
      return {
        success: false,
        message: 'Invalid username or password. Please verify your credentials and try again.'
      };
    }

    let response: any;
    try {
      const res = await fetch('/api/doctor/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password })
      });
      response = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 429 || response?.isLockedOut) {
          return {
            success: false,
            isLockedOut: true,
            lockoutMinutesRemaining: response?.lockoutMinutesRemaining,
            message: response?.error || 'Too many sign-in attempts. Please try again later.'
          };
        }
        return {
          success: false,
          message: response?.error || 'Invalid username or password. Please verify your credentials and try again.'
        };
      }
    } catch {
      return {
        success: false,
        message: 'The Doctor Portal sign-in service is temporarily unavailable. Please check your connection and try again.'
      };
    }

    if (!response?.success || !response?.doctor) {
      return {
        success: false,
        message: 'Invalid username or password. Please verify your credentials and try again.'
      };
    }

    // Persist the server session.
    const token: string = response.token;
    const expiry: string = response.expiresAt;
    setSessionToken(token);
    setSessionExpiresAt(expiry);
    setSessionExpired(false);
    try {
      localStorage.setItem('doctor_portal_session_token_v1', token);
      localStorage.setItem('doctor_portal_session_expiry_v1', expiry);
    } catch {}

    // Map the verified server identity onto the workspace account + profile.
    applyServerDoctorRef.current(response.doctor);

    addAuditLog({
      actor: response.doctor.fullName,
      actorRole: 'Doctor',
      action: 'DOCTOR_LOGIN_SUCCESS',
      targetDoctorId: response.doctor.doctorId,
      targetDoctorName: response.doctor.fullName,
      targetHospitalName: response.doctor.organization,
      status: 'SUCCESS',
      ipAddress: 'Server-verified session (credentialing engine)',
      details: `Successful login by @${response.doctor.username || cleanId}. Session issued and expires at ${new Date(expiry).toLocaleString()}.`
    });

    return {
      success: true,
      message: `Welcome back, ${response.doctor.fullName}. Session secured.`,
      account: undefined
    };
  };

  const doctorLogout = () => {
    // Destroy the server-side session (best-effort) and clear all local
    // private state immediately.
    if (sessionToken) {
      void fetch('/api/doctor/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` }
      }).catch(() => undefined);
    }
    if (currentAccount) {
      addAuditLog({
        actor: currentAccount.fullName,
        actorRole: 'Doctor',
        action: 'DOCTOR_SESSION_TERMINATED',
        targetDoctorId: currentAccount.doctorId,
        status: 'SUCCESS',
        ipAddress: 'Server-verified session',
        details: `User @${currentAccount.username} logged out.`
      });
    }
    clearSessionState();
  };


  const selectActiveDoctorProfile = (profile: DoctorProfile) => {
    // Security constraint: Only allow selecting a profile matching the
    // authenticated account (prevents switching to another doctor's profile).
    if (currentAccount && (profile.id === currentAccount.doctorId || profile.email.toLowerCase() === currentAccount.officialEmail.toLowerCase())) {
      setActiveDoctorProfile(profile);
    }
  };

  const updateActiveDoctorProfile = (updated: DoctorProfile) => {
    setAllDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    if (activeDoctorProfile && activeDoctorProfile.id === updated.id) {
      setActiveDoctorProfile(updated);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Password Recovery / Forgot Password Flow
  // --------------------------------------------------------------------------
  const requestPasswordReset = async (
    usernameOrEmail: string
  ): Promise<{ success: boolean; message: string; demoResetToken?: string }> => {
    const cleanId = usernameOrEmail.trim().toLowerCase();

    const matched = accounts.find(
      (a) =>
        a.username.toLowerCase() === cleanId ||
        a.officialEmail.toLowerCase() === cleanId
    );

    // Generic safe response to prevent user enumeration
    const genericSuccess = {
      success: true,
      message: 'If the information provided matches an eligible Doctor Portal account, password reset instructions will be sent to the registered contact method.'
    };

    if (!matched) {
      addAuditLog({
        actor: cleanId,
        actorRole: 'Anonymous Password Recovery',
        action: 'PASSWORD_RESET_REQUESTED_UNKNOWN_USER',
        status: 'WARNING',
        ipAddress: 'Server-verified recovery flow',
        details: `Password recovery requested for non-existent identifier "${cleanId}". Generic response returned.`
      });
      return genericSuccess;
    }

    // The SERVER is the reset authority — its single-use token is what
    // actually authorizes the password change. (Local fallback only if the
    // server is unreachable, so the demo flow can still show the UI.)
    let resetTokenCode = `RST-DOC-${Math.floor(10000 + Math.random() * 90000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    try {
      const res = await fetch('/api/doctor/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: cleanId })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.demoResetToken) {
        resetTokenCode = data.demoResetToken;
      }
    } catch {
      /* offline fallback keeps the local demo token */
    }

    const newResetRecord: DoctorPasswordResetToken = {
      token: resetTokenCode,
      username: matched.username,
      officialEmail: matched.officialEmail,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour validity
      isUsed: false,
      usedAt: null,
      isRevoked: false
    };

    setResetTokens((prev) => [newResetRecord, ...prev]);

    addAuditLog({
      actor: matched.fullName,
      actorRole: 'Doctor Password Recovery',
      action: 'PASSWORD_RESET_TOKEN_ISSUED',
      targetDoctorId: matched.doctorId,
      status: 'SUCCESS',
      ipAddress: 'Server-verified recovery flow',
      details: `Generated single-use password recovery token ${resetTokenCode} for @${matched.username} (${matched.officialEmail}).`
    });

    return {
      ...genericSuccess,
      demoResetToken: resetTokenCode
    };
  };

  const verifyResetToken = useCallback(
    (tokenString: string) => {
      const cleanToken = tokenString.trim();
      const rec = resetTokens.find((t) => t.token.toLowerCase() === cleanToken.toLowerCase());

      if (!rec) {
        return {
          valid: false,
          message: 'Invalid password reset token.'
        };
      }

      if (rec.isRevoked) {
        return {
          valid: false,
          message: 'This reset token has been revoked.'
        };
      }

      if (rec.isUsed) {
        return {
          valid: false,
          message: 'This password reset link has already been used.'
        };
      }

      if (new Date() > new Date(rec.expiresAt)) {
        return {
          valid: false,
          message: 'This password reset link has expired. Please request a new link.'
        };
      }

      return {
        valid: true,
        tokenData: rec,
        message: 'Token verified. You may set your new password.'
      };
    },
    [resetTokens]
  );

  const resetPasswordWithToken = async (
    tokenString: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const verified = verifyResetToken(tokenString);
    if (!verified.valid || !verified.tokenData) {
      return { success: false, message: verified.message };
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters long.' };
    }

    const tokenData = verified.tokenData;
    const account = accounts.find((a) => a.username.toLowerCase() === tokenData.username.toLowerCase());

    if (!account) {
      return { success: false, message: 'Associated doctor account could not be located.' };
    }

    // The SERVER owns the credential — apply the reset there first. A legacy
    // local-only account is self-healed by provisioning it server-side with
    // the new password (doctorId is preserved so grants stay linked).
    try {
      const res = await fetch('/api/doctor/auth/complete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: tokenData.token, newPassword })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        if (data?.code === 'ACCOUNT_NOT_FOUND') {
          const reg = await fetch('/api/doctor/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctorId: account.doctorId,
              username: account.username,
              password: newPassword,
              fullName: account.fullName,
              organization: account.hospitalName,
              specialty: account.speciality,
              role: account.role,
              department: account.department,
              email: account.officialEmail
            })
          });
          const regData = await reg.json().catch(() => null);
          if (!reg.ok || !regData?.success) {
            return { success: false, message: regData?.error || 'The password could not be reset. Please contact support.' };
          }
        } else if (data?.code === 'RESET_INVALID' || data?.code === 'WEAK_PASSWORD') {
          return { success: false, message: data.error };
        } else {
          return { success: false, message: data?.error || 'The password could not be reset. Please try again.' };
        }
      }
    } catch {
      return { success: false, message: 'The credentialing server is unreachable. Please try again in a moment.' };
    }

    const salt = `salt_${Date.now()}_rst`;
    const newHash = simpleHash(newPassword, salt);

    // Update account password & clear lockout
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === account.id
          ? {
              ...a,
              passwordHash: newHash,
              passwordSalt: salt,
              failedLoginAttempts: 0,
              lockoutUntil: null,
              updatedTimestamp: new Date().toISOString()
            }
          : a
      )
    );

    // Mark reset token used
    setResetTokens((prev) =>
      prev.map((t) =>
        t.token === tokenData.token
          ? { ...t, isUsed: true, usedAt: new Date().toISOString() }
          : t
      )
    );

    addAuditLog({
      actor: account.fullName,
      actorRole: 'Doctor Password Recovery',
      action: 'PASSWORD_RESET_SUCCESS',
      targetDoctorId: account.doctorId,
      status: 'SUCCESS',
      ipAddress: 'Server-verified recovery flow',
      details: `Password changed successfully for @${account.username} using token ${tokenData.token}.`
    });

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in using your new password.'
    };
  };

  const changeDoctorPassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentAccount || !sessionToken) {
      return { success: false, message: 'No active session. Please sign in again.' };
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters.' };
    }

    // The SERVER verifies the current password and stores the new one — the
    // client never validates or persists credentials itself.
    try {
      const res = await fetch('/api/doctor/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        return { success: false, message: data?.error || 'The password could not be updated. Please try again.' };
      }
    } catch {
      return { success: false, message: 'The credentialing server is unreachable. Please try again in a moment.' };
    }

    const newSalt = `salt_${Date.now()}_upd`;
    const newHash = simpleHash(newPassword, newSalt);

    const updatedAccount: DoctorAccount = {
      ...currentAccount,
      passwordHash: newHash,
      passwordSalt: newSalt,
      updatedTimestamp: new Date().toISOString()
    };

    setAccounts((prev) => prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    setCurrentAccount(updatedAccount);

    addAuditLog({
      actor: currentAccount.fullName,
      actorRole: 'Doctor',
      action: 'DOCTOR_PASSWORD_CHANGED',
      targetDoctorId: currentAccount.doctorId,
      status: 'SUCCESS',
      ipAddress: 'Server-verified session',
      details: `Password updated in active session by @${currentAccount.username}.`
    });

    return { success: true, message: 'Password updated successfully.' };
  };

  const toggleTwoFactor = async (): Promise<{ success: boolean; enabled: boolean }> => {
    if (!currentAccount) {
      return { success: false, enabled: false };
    }

    const nextState = !currentAccount.twoFactorEnabled;
    const updatedAccount: DoctorAccount = {
      ...currentAccount,
      twoFactorEnabled: nextState,
      updatedTimestamp: new Date().toISOString()
    };

    setAccounts((prev) => prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    setCurrentAccount(updatedAccount);

    addAuditLog({
      actor: currentAccount.fullName,
      actorRole: 'Doctor',
      action: nextState ? 'TWO_FACTOR_ENABLED' : 'TWO_FACTOR_DISABLED',
      targetDoctorId: currentAccount.doctorId,
      status: 'SUCCESS',
      ipAddress: 'Server-verified session',
      details: `Two-Factor Authentication toggled to ${nextState ? 'ENABLED' : 'DISABLED'} for @${currentAccount.username}.`
    });

    return { success: true, enabled: nextState };
  };

  // --------------------------------------------------------------------------
  // 7. Hospital Authority Admin Actions
  // --------------------------------------------------------------------------
  const approveDoctorApplication = async (
    applicationId: string,
    reviewerNotes?: string
  ): Promise<{ success: boolean; activationToken: string; message: string }> => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, activationToken: '', message: 'Application not found.' };
    }

    const lastName = app.fullName.replace(/Dr\.|\,.*$/g, '').trim().split(' ').pop()?.toUpperCase() || 'DOC';
    const tokenCode = `ACT-DOC-2026-${lastName}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newTokenRecord: DoctorActivationToken = {
      token: tokenCode,
      applicationId: app.id,
      doctorName: app.fullName,
      hospitalName: app.hospitalName,
      officialEmail: app.officialEmail,
      issuedAt: new Date().toISOString(),
      expiresAt,
      isUsed: false,
      usedAt: null,
      isRevoked: false
    };

    // Update application
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'APPROVED_NOT_ACTIVATED',
              assignedReviewer: authorityOfficer.name,
              reviewerRole: authorityOfficer.role,
              reviewerNotes: reviewerNotes || 'Verified against State Medical Board registry and hospital appointment criteria.',
              reviewedAt: new Date().toISOString(),
              approvalTimestamp: new Date().toISOString(),
              activationToken: tokenCode,
              activationTokenExpiresAt: expiresAt
            }
          : a
      )
    );

    // Save token
    setActivationTokens((prev) => [newTokenRecord, ...prev]);

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'DOCTOR_APPLICATION_APPROVED',
      targetDoctorName: app.fullName,
      targetHospitalName: app.hospitalName,
      status: 'SUCCESS',
      ipAddress: '10.0.4.18 (Authority Admin Console)',
      details: `Approved application ${applicationId} for ${app.fullName}. Generated single-use activation token ${tokenCode}.`
    });

    return {
      success: true,
      activationToken: tokenCode,
      message: `Doctor application ${applicationId} approved. Activation access generated.`
    };
  };

  const rejectDoctorApplication = async (
    applicationId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; message: string }> => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, message: 'Application not found.' };
    }

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'REJECTED',
              assignedReviewer: authorityOfficer.name,
              reviewerRole: authorityOfficer.role,
              reviewerNotes: rejectionReason,
              reviewedAt: new Date().toISOString(),
              rejectionReason
            }
          : a
      )
    );

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'DOCTOR_APPLICATION_REJECTED',
      targetDoctorName: app.fullName,
      targetHospitalName: app.hospitalName,
      status: 'WARNING',
      ipAddress: '10.0.4.18',
      details: `Application ${applicationId} for ${app.fullName} was rejected. Reason: "${rejectionReason}".`
    });

    return {
      success: true,
      message: `Application ${applicationId} rejected.`
    };
  };

  const requestAdditionalInfo = async (
    applicationId: string,
    requirements: string
  ): Promise<{ success: boolean; message: string }> => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, message: 'Application not found.' };
    }

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'ADDITIONAL_INFO_REQUIRED',
              assignedReviewer: authorityOfficer.name,
              reviewerRole: authorityOfficer.role,
              reviewerNotes: requirements,
              reviewedAt: new Date().toISOString(),
              additionalInfoRequiredNotes: requirements
            }
          : a
      )
    );

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'ADDITIONAL_INFO_REQUESTED',
      targetDoctorName: app.fullName,
      targetHospitalName: app.hospitalName,
      status: 'WARNING',
      ipAddress: '10.0.4.18',
      details: `Additional info requested for application ${applicationId}: "${requirements}".`
    });

    return {
      success: true,
      message: 'Additional information request sent to applicant.'
    };
  };

  const suspendDoctorAccount = async (
    accountIdOrDocId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const acc = accounts.find(
      (a) => a.id === accountIdOrDocId || a.doctorId === accountIdOrDocId || a.username === accountIdOrDocId
    );

    if (!acc) {
      return { success: false, message: 'Account not found.' };
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === acc.id ? { ...a, accountStatus: 'SUSPENDED', updatedTimestamp: new Date().toISOString() } : a
      )
    );

    // If currently logged in, force logout
    if (currentAccount && currentAccount.id === acc.id) {
      setCurrentAccount(null);
      setActiveDoctorProfile(null);
    }

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'DOCTOR_ACCOUNT_SUSPENDED',
      targetDoctorId: acc.doctorId,
      targetDoctorName: acc.fullName,
      targetHospitalName: acc.hospitalName,
      status: 'WARNING',
      ipAddress: '10.0.4.18',
      details: `Suspended account @${acc.username}. Reason: ${reason}`
    });

    return {
      success: true,
      message: `Doctor account @${acc.username} suspended.`
    };
  };

  const reactivateDoctorAccount = async (
    accountIdOrDocId: string
  ): Promise<{ success: boolean; message: string }> => {
    const acc = accounts.find(
      (a) => a.id === accountIdOrDocId || a.doctorId === accountIdOrDocId || a.username === accountIdOrDocId
    );

    if (!acc) {
      return { success: false, message: 'Account not found.' };
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              accountStatus: 'ACTIVE',
              failedLoginAttempts: 0,
              lockoutUntil: null,
              updatedTimestamp: new Date().toISOString()
            }
          : a
      )
    );

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'DOCTOR_ACCOUNT_REACTIVATED',
      targetDoctorId: acc.doctorId,
      targetDoctorName: acc.fullName,
      targetHospitalName: acc.hospitalName,
      status: 'SUCCESS',
      ipAddress: '10.0.4.18',
      details: `Reactivated account @${acc.username}. Status restored to ACTIVE.`
    });

    return {
      success: true,
      message: `Doctor account @${acc.username} has been reactivated.`
    };
  };

  const reissueActivationToken = async (
    applicationId: string
  ): Promise<{ success: boolean; token: string; message: string }> => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, token: '', message: 'Application not found.' };
    }

    // Revoke old tokens for this application
    setActivationTokens((prev) =>
      prev.map((t) => (t.applicationId === applicationId && !t.isUsed ? { ...t, isRevoked: true } : t))
    );

    const lastName = app.fullName.replace(/Dr\.|\,.*$/g, '').trim().split(' ').pop()?.toUpperCase() || 'DOC';
    const newToken = `ACT-DOC-2026-${lastName}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newRecord: DoctorActivationToken = {
      token: newToken,
      applicationId: app.id,
      doctorName: app.fullName,
      hospitalName: app.hospitalName,
      officialEmail: app.officialEmail,
      issuedAt: new Date().toISOString(),
      expiresAt,
      isUsed: false,
      usedAt: null,
      isRevoked: false
    };

    setActivationTokens((prev) => [newRecord, ...prev]);

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'APPROVED_NOT_ACTIVATED',
              activationToken: newToken,
              activationTokenExpiresAt: expiresAt
            }
          : a
      )
    );

    addAuditLog({
      actor: `${authorityOfficer.name} (${authorityOfficer.role})`,
      actorRole: 'Authorized Hospital Authority Officer',
      action: 'ACTIVATION_TOKEN_REISSUED',
      targetDoctorName: app.fullName,
      targetHospitalName: app.hospitalName,
      status: 'SUCCESS',
      ipAddress: '10.0.4.18',
      details: `Reissued activation token ${newToken} for application ${applicationId}.`
    });

    return {
      success: true,
      token: newToken,
      message: `New activation token ${newToken} generated successfully.`
    };
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        applications,
        accounts,
        activationTokens,
        resetTokens,
        auditLogs,
        allDoctors,
        currentAccount,
        activeDoctorProfile,
        sessionToken,
        sessionExpiresAt,
        sessionExpired,
        sessionValidating,
        dismissSessionExpired,
        applyServerDoctor,
        authorityOfficer,
        submitDoctorApplication,
        verifyActivationToken,
        checkUsernameAvailability,
        activateDoctorAccount,
        doctorLogin,
        doctorLogout,
        selectActiveDoctorProfile,
        updateActiveDoctorProfile,
        requestPasswordReset,
        verifyResetToken,
        resetPasswordWithToken,
        changeDoctorPassword,
        toggleTwoFactor,
        approveDoctorApplication,
        rejectDoctorApplication,
        requestAdditionalInfo,
        suspendDoctorAccount,
        reactivateDoctorAccount,
        reissueActivationToken,
        addAuditLog
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
};

// Load environment variables from .env before anything else reads process.env.
// Without this, GEMINI_API_KEY (and any other secret placed in .env) is never
// visible to the server and the AI Assistant fails with a 500.
import 'dotenv/config';
import express from 'express';
import { AUTH_REALMS, isPlatformRole, ROLE_DESTINATIONS, type PlatformRole } from './src/core/platformRoles';
import path from 'path';
import fs from 'fs';
import { createHash, createHmac, randomBytes } from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { PHARMACY_PRODUCTS, VERIFIED_PHARMACY_PARTNERS } from './src/data/pharmacyProductsData';
import { INITIAL_HOSPITALS, INITIAL_DEPARTMENTS, INITIAL_PORTAL_DOCTORS, INITIAL_BLOOD_BANK } from './src/data/hospitalInitialData';
import { detectSafetyRisk } from './src/core/ai/aiSafety';
import { retrieveVerifiedKnowledge } from './src/core/ai/aiKnowledge';
import { loadRuntimeConfig } from './src/server/config';
import { createLogger } from './src/server/logger';
import { apiError } from './src/server/errors';
import {
  hashSecret,
  verifySecret,
  secureToken,
  generateTotpSecret,
  verifyTotp
} from './src/server/security';

async function startServer() {
  const config = loadRuntimeConfig(process.env);
  const app = express();
  if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);
  const logger = createLogger('server');
  const appDir = process.cwd();
  const RUNTIME_DIR = path.join(appDir, config.runtimeDir, 'runtime');
  const readJsonFile = <T>(file: string, fallback: T): T => {
    try {
      if (!fs.existsSync(file)) return fallback;
      const raw = fs.readFileSync(file, 'utf8').trim();
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch (err) {
      // A corrupt runtime cache should never block startup; the next write
      // repairs it. This is deliberately logged and not surfaced to users.
      console.warn('[GlobalHealth] Runtime cache could not be read:', file, (err as Error)?.message);
      return fallback;
    }
  };
  const writeJsonFile = (file: string, data: unknown) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, file); // atomic-ish replace, avoids partial writes
    } catch (err) {
      console.warn('[GlobalHealth] Runtime cache could not be written:', file, (err as Error)?.message);
    }
  };
  const writeSecureJsonFile = (file: string, data: unknown) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      if (fs.existsSync(tmp)) fs.chmodSync(tmp, 0o600);
      fs.renameSync(tmp, file);
      if (fs.existsSync(file)) fs.chmodSync(file, 0o600);
    } catch (err) {
      console.warn('[GlobalHealth] Runtime account store could not be written:', file, (err as Error)?.message);
    }
  };

  // Dynamic port binding for Cloud Run / Container deployment with 3000 default
  const PORT = config.port;
  const IS_PRODUCTION = config.isProduction;

  // Development-only credentials for the legacy seeded role fixtures. Public
  // deployments get a separate passwordless, isolated user demo session; no
  // shared production password is ever returned to the browser.
  const DEVELOPMENT_DEMO_ACCOUNTS: Record<PlatformRole, Array<{ label: string; identifier: string; password: string }>> | null = config.nodeEnv === 'development' && config.publicDemoEnabled ? {
    user: [
      { label: 'Sarah Jenkins — patient demo', identifier: 'sarah.jenkins@example.com', password: 'Password123!' },
      { label: 'Alex Turner — patient demo', identifier: 'alex.turner@example.com', password: 'Password123!' },
    ],
    doctor: [
      { label: 'Dr. Anita Rao — internal medicine', identifier: 'doc-1', password: 'Doctor123!' },
      { label: 'Dr. Vikram Mehta — cardiology', identifier: 'doc-2', password: 'Doctor123!' },
      { label: 'Dr. Alexandra Chen — interventional cardiology', identifier: 'doc_alex_chen', password: 'chen123' },
      { label: 'Dr. Robert Harrison — orthopaedic surgery', identifier: 'doc_rob_harrison', password: 'harr123' },
      { label: 'Dr. Priya Sharma — endocrinology', identifier: 'doc_priya_sharma', password: 'priya123' },
      { label: 'Dr. Marcus Vance — oncology', identifier: 'doc_marcus_vance', password: 'vance123' },
    ],
    hospital: [
      { label: 'Apex Institute of Medical Sciences', identifier: 'apex_admin', password: 'Password@123' },
      { label: 'Cleveland Clinic Abu Dhabi', identifier: 'cleveland_ad_admin', password: 'Password@123' },
      { label: 'Singapore General Hospital', identifier: 'sgh_admin', password: 'Password@123' },
      { label: 'Mayo Clinic Rochester', identifier: 'mayo_admin', password: 'Password@123' },
      { label: 'St. Peter Royal Hospital', identifier: 'stpeter_admin', password: 'Password@123' },
      { label: 'Metropolitan Academic Medical Center', identifier: 'metro_admin', password: 'Password@123' },
      { label: 'All India Institute of Medical Sciences', identifier: 'aiims_admin', password: 'Password@123' },
      { label: 'Charité — Universitätsmedizin Berlin', identifier: 'charite_admin', password: 'Password@123' },
    ],
    pharmacy: [
      { label: 'Apex Central Clinical Dispensary — Dr. Ramanathan', identifier: 'dr.ramanathan@apexhealth.org', password: 'Pharmacy@123' },
      { label: 'Apex Central Clinical Dispensary — Rohan M.', identifier: 'rohan.m@apexhealth.org', password: 'Pharmacy@123' },
      { label: 'GlobalHealth Express Central Hub', identifier: 'mumbai.depot@globalhealth.org', password: 'Pharmacy@123' },
      { label: 'Apollo Care Clinical Pharmacy', identifier: 'bangalore.pharmacy@apollocare.org', password: 'Pharmacy@123' },
      { label: 'MedPlus Community Clinical Dispensary', identifier: 'hyderabad.hub@medpluscommunity.org', password: 'Pharmacy@123' },
    ],
    news: [
      { label: 'Dr. Evelyn Carter — super administrator', identifier: 'admin@globalhealth.org', password: 'Password123!' },
      { label: 'Marcus Sterling — news administrator', identifier: 'newsadmin@globalhealth.org', password: 'Password123!' },
      { label: 'Sarah Chen — editor', identifier: 'editor@globalhealth.org', password: 'Password123!' },
      { label: 'Dr. James Thorne — reviewer', identifier: 'reviewer@globalhealth.org', password: 'Password123!' },
      { label: 'Elena Rostova — publisher', identifier: 'publisher@globalhealth.org', password: 'Password123!' },
      { label: 'David Kim — author', identifier: 'author@globalhealth.org', password: 'Password123!' },
    ],
  } : null;

  for (const warning of config.warnings) {
    logger.warn('startup configuration warning', { warning });
  }

  // High payload parser for base64 medical certificate uploads
  app.use(express.json({ limit: '15mb' }));

  // One public authentication dispatcher; legacy API URLs remain compatible.
  app.use((req, res, next) => {
    if (req.method === 'POST' && ['/api/news/admin/login', '/api/news/authority/login'].includes(req.path)) req.url = '/api/news/login';
    const match = req.path.match(/^\/api\/auth\/portal\/([^/]+)\/([^/]+)$/);
    if (!match) return next();
    const [, role, action] = match;
    if (req.method !== 'POST' || !isPlatformRole(role) || !Object.hasOwn(AUTH_REALMS[role], action)) {
      return res.status(400).json({ success: false, code: 'INVALID_AUTH_FLOW', error: 'Unknown authentication flow.' });
    }
    // Dev preview traffic and acceptance suites share one sandbox IP; keep
    // the demo account picker usable across roles while retaining per-account
    // brute-force limits in each realm. Production keeps the stricter cap.
    const maxUnifiedRequests = config.nodeEnv === 'development' ? 200 : 40;
    const rate = hitRateLimit('unified-auth', String(req.ip || 'anonymous'), maxUnifiedRequests, 5 * 60 * 1000);
    if (!rate.allowed) {
      res.setHeader('Retry-After', Math.ceil(rate.retryInMs / 1000));
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many authentication requests. Please try again later.' });
    }
    res.setHeader('Cache-Control', 'no-store');
    req.url = AUTH_REALMS[role][action];
    next();
  });
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store, private'); next(); });
  app.use((req, res, next) => {
    let expected: PlatformRole | null = null;
    if (req.path.startsWith('/api/doctor/') && !req.path.startsWith('/api/doctor/auth/')) expected = 'doctor';
    if (req.path.startsWith('/api/hospital-registry/') && !req.path.startsWith('/api/hospital-registry/public/')) expected = 'hospital';
    if (req.path.startsWith('/api/pharmacy-partner/') && !req.path.startsWith('/api/pharmacy-partner/auth/')) expected = 'pharmacy';
    if (/^\/api\/news\/(admin|authority)\//.test(req.path) && !/\/(login|register)$/.test(req.path)) expected = 'news';
    if (req.path.startsWith('/api/me/')) expected = 'user';
    if (!expected) return next();
    const identity = platformIdentity(req);
    if (!identity) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in.' });
    if (identity.role !== expected) return res.status(403).json({ success: false, code: 'ACCESS_DENIED', error: 'This role cannot access the requested workspace.' });
    next();
  });


  app.use(express.urlencoded({ extended: true }));

  // Enterprise request identity + basic security headers.
  app.use((req, res, next) => {
    const incoming = Array.isArray(req.headers['x-request-id']) ? req.headers['x-request-id'][0] : req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(incoming)
        ? incoming
        : `req-${randomBytes(12).toString('hex')}`;
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  // Native CORS middleware. Production deployments require an explicit
  // CORS_ORIGIN allowlist. Requests without an Origin header (same-origin
  // browser navigation/native clients) are unaffected and always allowed.
  const configuredCorsOrigins = config.corsOrigins;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
    const requestProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
    const sameOrigin =
      origin && req.headers.host && origin === `${requestProto}://${req.headers.host}`;
    if (origin && (configuredCorsOrigins.includes(origin) || sameOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else if (origin && IS_PRODUCTION) {
      return res.status(403).json({
        success: false,
        code: 'CORS_ORIGIN_DENIED',
        error: 'Origin is not allowed by this server.'
      });
    } else if (origin && !IS_PRODUCTION && (localDevOrigin.test(origin) || configuredCorsOrigins.length === 0)) {
      // Non-production convenience only (local SPA or explicitly configured
      // development origins). Production never reaches this branch.
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // ----------------------------------------------------------------------
  // 1. Health & Telemetry Probe Endpoint
  // ----------------------------------------------------------------------
  app.get('/api/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    return res.json({
      status: 'HEALTHY',
      system: 'MedAuth Medical Board Verification & Clinical Gateway',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
      version: '2.4.0-enterprise',
      requestId: (req as any).requestId,
    });
  });

  // Readiness probe (safe for orchestrators/load balancers). It does not expose
  // secrets or internal architecture; it only confirms the HTTP server and
  // runtime persistence directory are usable.
  app.get('/api/ready', (req, res) => {
    const runtimeWritable = (() => {
      try {
        fs.mkdirSync(RUNTIME_DIR, { recursive: true });
        const probe = path.join(RUNTIME_DIR, '.ready-probe');
        fs.writeFileSync(probe, String(Date.now()), 'utf8');
        fs.unlinkSync(probe);
        return true;
      } catch {
        return false;
      }
    })();
    return res.status(runtimeWritable ? 200 : 503).json({
      success: runtimeWritable,
      status: runtimeWritable ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      requestId: (req as any).requestId,
    });
  });

  // ----------------------------------------------------------------------
  // 2. Credential Verification Gateway
  // ----------------------------------------------------------------------
  // Production behavior: this endpoint NEVER synthesizes a verification
  // verdict. It requires a configured medical-registry gateway
  // (MEDAUTH_REGISTRY_URL + MEDAUTH_REGISTRY_SECRET) and reflects the
  // gateway's authoritative result. Without that integration it returns a
  // clearly unverified/availability result rather than claiming "VERIFIED".
  app.post('/api/verify-credential', async (req, res) => {
    const { fullName, npiNumber, medicalCouncilNumber, licenseNumber, speciality } = req.body || {};
    if (!fullName || !npiNumber || !licenseNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing mandatory credential parameters: fullName, npiNumber, and licenseNumber are required.'
      });
    }

    const registryUrl = config.medAuthRegistryUrl;
    const registrySecret = config.medAuthRegistrySecret;
    if (!registryUrl || !registrySecret) {
      return res.status(503).json({
        success: false,
        code: 'VERIFICATION_UNAVAILABLE',
        verificationResult: {
          status: 'NOT_VERIFIED',
          confidenceScore: 0,
          summary: 'Credential verification could not be completed because no medical registry gateway is configured. No user-facing verification is asserted.',
          mismatches: ['registry_not_configured']
        }
      });
    }

    const requestPayload = {
      fullName: String(fullName).trim(),
      npiNumber: String(npiNumber).trim(),
      medicalCouncilNumber: medicalCouncilNumber ? String(medicalCouncilNumber).trim() : undefined,
      licenseNumber: String(licenseNumber).trim(),
      speciality: speciality ? String(speciality).trim() : undefined
    };
    const payloadBody = JSON.stringify(requestPayload);
    const signature = createHmac('sha256', registrySecret).update(payloadBody).digest('hex');

    try {
      const registryResponse = await fetch(registryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MEDAUTH-SIGNATURE': signature
        },
        body: payloadBody,
        signal: AbortSignal.timeout(8000)
      });
      if (!registryResponse.ok) {
        return res.status(502).json({
          success: false,
          code: 'REGISTRY_UNAVAILABLE',
          verificationResult: {
            status: 'NOT_VERIFIED',
            confidenceScore: 0,
            summary: 'The registered medical registry gateway returned an error. No verification is asserted.',
            mismatches: ['registry_error']
          }
        });
      }
      const registryData = (await registryResponse.json()) as Record<string, any>;
      const verified = registryData?.verified === true;
      const confidence = Number(registryData?.confidenceScore ?? 0);
      const matches = Array.isArray(registryData?.matches) ? registryData.matches : [];
      const verifiedFields = registryData?.verifiedFields && typeof registryData.verifiedFields === 'object'
        ? registryData.verifiedFields
        : {};
      if (!verified) {
        return res.json({
          success: false,
          verificationResult: {
            status: 'NOT_VERIFIED',
            confidenceScore: confidence > 0 ? Math.min(confidence, 99) : 0,
            summary: registryData?.summary || 'The medical registry did not confirm these credentials at this time.',
            mismatches: matches,
            verifiedFields,
            verifiedAt: new Date().toISOString()
          }
        });
      }
      const verificationId = typeof registryData?.verificationId === 'string'
        ? registryData.verificationId
        : `REG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      return res.json({
        success: true,
        verificationResult: {
          status: 'VERIFIED',
          confidenceScore: Math.max(0, Math.min(confidence || 100, 100)),
          summary: registryData?.summary || `Credentials confirmed by the configured medical registry for ${String(fullName).trim()}.`,
          mismatches: matches,
          verifiedFields,
          verificationBadgeId: verificationId,
          verifiedAt: new Date().toISOString(),
          securityHash: `sha256_${createHash('sha256').update(payloadBody).digest('hex').slice(0, 24)}`
        }
      });
    } catch (err: any) {
      // No fabricated fallback verdict. The caller gets an explicit
      // "could not verify" result with no verification claim.
      console.warn('[GlobalHealth] Medical registry verification failed:', (err as Error)?.message || 'unknown error');
      return res.status(503).json({
        success: false,
        code: 'VERIFICATION_UNAVAILABLE',
        verificationResult: {
          status: 'NOT_VERIFIED',
          confidenceScore: 0,
          summary: 'The medical registry gateway could not be reached at this time. No verification is asserted.',
          mismatches: ['registry_unreachable']
        }
      });
    }
  });

  // ----------------------------------------------------------------------
  // 3. E-Prescription Safety Validator & Signature Gateway
  // ----------------------------------------------------------------------
  app.post('/api/prescribe', requireDoctor, (req: any, res: any) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { patientId, medications, allergyList } = req.body || {};

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'A patient record is required before a prescription can be prepared.' });
    }
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, error: 'No prescription items provided.' });
    }
    if (!/^usr-/.test(String(patientId))) {
      return res.status(400).json({ success: false, error: 'The patient identifier is invalid.' });
    }

    // Prescription preparation is still a protected patient-data operation.
    // A verified doctor without an active, appropriately scoped grant must not
    // use this gateway as a patient-discovery or consent bypass. Emergency
    // access is view-only and can never prepare or transmit a prescription.
    const prescriptionGrant = (DOCTOR_ACCESS.get(String(patientId)) || []).find((grant) =>
      grant.doctorId === doctor.doctorId &&
      grant.status === 'active' &&
      !grant.isEmergency &&
      grant.canView &&
      (!grant.expiresAt || new Date(grant.expiresAt).getTime() >= Date.now())
    );
    if (!prescriptionGrant || !prescriptionGrant.scope.includes('prescriptions')) {
      audit(req, {
        patientUserId: String(patientId),
        actorId: doctor.doctorId,
        actorRole: 'DOCTOR',
        eventType: 'EHR_ACCESS_DENIED',
        resourceType: 'Prescription',
        result: 'denied',
        detail: 'Prescription preparation blocked because an active prescriptions scope was not present.'
      });
      return res.status(403).json({ success: false, code: 'PRESCRIPTION_SCOPE_REQUIRED', error: 'An active patient grant with prescription scope is required.' });
    }

    // Evaluate potential contraindications
    const detectedInteractions: any[] = [];
    const medNames = medications.map((m: any) => (m.medicationName || '').toLowerCase());
    if (allergyList && Array.isArray(allergyList)) {
      const allergies = allergyList.map((a: string) => a.toLowerCase());
      medNames.forEach((med: string) => {
        if (allergies.some((a: string) => a.length > 2 && med.includes(a))) {
          detectedInteractions.push({
            severity: 'CRITICAL',
            medication: med,
            reason: `Patient has documented severe allergy matching ${med}.`
          });
        }
      });
    }

    const rxId = `RX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    const signingSecret = config.prescriptionSigningSecret;
    const isSigned = Boolean(signingSecret);
    const signature = isSigned
      ? createHmac('sha256', signingSecret)
          .update(`${doctor.doctorId}|${patientId}|${rxId}|${medNames.join(',')}|${createdAt}`)
          .digest('hex')
      : null;
    const heldForInteraction = detectedInteractions.length > 0;
    const status = !isSigned ? 'HELD_FOR_SIGNING' : heldForInteraction ? 'HELD_FOR_CONFIRMATION' : 'READY_FOR_PHARMACY';

    audit(req, {
      patientUserId: patientId,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'PRESCRIPTION_PREPARED',
      resourceType: 'Prescription',
      resourceId: rxId,
      result: heldForInteraction ? 'held_for_interaction' : 'prepared',
      detail: `Prescription for ${medications.length} item(s) prepared by verified doctor ${doctor.doctorId}; signed=${isSigned ? 'yes' : 'no'}`
    });

    return res.json({
      success: true,
      rxId,
      prescriptionId: rxId,
      preparedAt: createdAt,
      itemCount: medications.length,
      interactions: detectedInteractions,
      signingStatus: isSigned ? 'SIGNED' : 'UNSIGNED',
      digitalSignature: signature,
      status,
      message: !isSigned
        ? 'Prescription prepared but held because no server signing secret is configured.'
        : heldForInteraction
          ? 'Prescription held for interaction confirmation.'
          : 'Prescription prepared for pharmacy processing.'
    });
  });

  // ----------------------------------------------------------------------
  // 4. Provider Registry Query Endpoint
  // ----------------------------------------------------------------------
  app.get('/api/doctors', (req, res) => {
    const { q, specialty } = req.query;
    return res.json({
      success: true,
      registryStatus: 'ONLINE',
      query: { q, specialty },
      timestamp: new Date().toISOString()
    });
  });

  // ----------------------------------------------------------------------
  // 4b. Medical Map Facility Verification & Category Enforcement Gateway
  // ----------------------------------------------------------------------
  const ALLOWED_FACILITY_TYPES = [
    'HOSPITAL',
    'CLINIC',
    'MEDICAL_CENTER',
    'NURSING_HOME',
    'URGENT_CARE',
    'SPECIALIZED_HEALTH_OFFICE'
  ];

  const BANNED_FACILITY_TYPES = [
    'PHARMACY',
    'MEDICAL_SHOP',
    'DRUG_STORE',
    'MEDICINE_STORE',
    'LAB',
    'DIAGNOSTIC_CENTER',
    'AMBULANCE_COMPANY',
    'WELLNESS_STORE',
    'GYM',
    'RESTAURANT',
    'GENERAL_BUSINESS'
  ];

  // Facility validation and query API
  app.get('/api/medical-map/facilities', (req, res) => {
    const { type, q, verified } = req.query;

    if (type && typeof type === 'string') {
      const upperType = type.toUpperCase();
      if (BANNED_FACILITY_TYPES.includes(upperType)) {
        return res.status(400).json({
          success: false,
          error: `Category '${upperType}' is strictly prohibited in Medical Map. Medical Map is exclusively restricted to physical healthcare facilities (Hospitals, Clinics, Medical Centers, Nursing Homes, Urgent Care, and Specialized Health Offices). Pharmacies/Medical shops remain in the separate Pharmacy section.`
        });
      }
      if (upperType !== 'ALL' && !ALLOWED_FACILITY_TYPES.includes(upperType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid facility type '${upperType}'. Permitted types are: ${ALLOWED_FACILITY_TYPES.join(', ')}.`
        });
      }
    }

    return res.json({
      success: true,
      allowedCategories: ALLOWED_FACILITY_TYPES,
      query: { type, q, verified },
      timestamp: new Date().toISOString()
    });
  });

  // Admin / Authority Facility Creation Endpoint with Strict Backend Validation
  app.post('/api/medical-map/facilities', (req, res) => {
    const { facilityName, facilityType, address, latitude, longitude, phone } = req.body;

    if (!facilityName || !facilityType || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: facilityName, facilityType, address, latitude, longitude, phone.'
      });
    }

    const upperType = String(facilityType).toUpperCase();
    if (!ALLOWED_FACILITY_TYPES.includes(upperType)) {
      return res.status(400).json({
        success: false,
        error: `Category '${upperType}' is invalid or banned. Medical Map strictly permits only: ${ALLOWED_FACILITY_TYPES.join(', ')}.`
      });
    }

    return res.json({
      success: true,
      message: `Facility '${facilityName}' validated and registered under category '${upperType}'.`,
      facilityId: `FAC-${upperType.substring(0, 3)}-${Date.now()}`,
      verificationStatus: 'Pending Verification'
    });
  });

  // ----------------------------------------------------------------------
  // 4c. GlobalHealth Public User Authentication Backend Gateway
  // ----------------------------------------------------------------------
  interface ServerPublicUser {
    id: string;
    username: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    passwordHash: string;
    role: 'PUBLIC_USER' | 'VERIFIED_USER';
    accountStatus: 'ACTIVE' | 'EMAIL_VERIFICATION_REQUIRED' | 'PHONE_VERIFICATION_REQUIRED' | 'SUSPENDED' | 'DEACTIVATED' | 'LOCKED' | 'PENDING_SECURITY_REVIEW';
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    country: string;
    preferredLanguage: string;
    dateOfBirth?: string;
    avatarUrl?: string;
    twoFactor: {
      enabled: boolean;
      method?: 'authenticator_app' | 'email_otp' | 'sms_otp';
      verifiedAt?: string;
      secretKey?: string;
      backupCodes?: string[];
    };
    verificationCode?: {
      code: string;
      type: 'email' | 'phone';
      expiresAt: number;
    };
    resetToken?: {
      token: string;
      expiresAt: number;
    };
    dietaryPreferences?: string[];
    healthGoals?: string[];
    marketingConsent?: boolean;
    /** Versioned consent record — which policy versions were accepted, when. */
    consent?: {
      termsVersion: string;
      privacyVersion: string;
      acceptedAt: string;
      jurisdiction?: string;
      method: 'signup_checkbox' | 'login_acknowledgement' | 'settings_reacceptance';
    };
    /** Historic consent records (policy versions previously accepted). */
    consentHistory?: {
      termsVersion: string;
      privacyVersion: string;
      acceptedAt: string;
      method: 'signup_checkbox' | 'login_acknowledgement' | 'settings_reacceptance';
    }[];
    /** Identifies a synthetic sandbox account; never conveys a privileged role. */
    isDemoAccount?: boolean;
    /** Ephemeral visitor-owned demo accounts are not written to persistent stores. */
    isEphemeralDemo?: boolean;
    createdAt: string;
    lastLoginAt: string;
  }

  interface ServerSession {
    sessionId: string;
    userId: string;
    deviceName: string;
    deviceType: 'Desktop' | 'Mobile' | 'Tablet';
    browser: string;
    os: string;
    ipAddress: string;
    location: string;
    createdAt: string;
    lastActive: string;
    isDemoSession?: boolean;
    expiresAt?: number;
  }

  interface ServerAuditLog {
    id: string;
    userId: string;
    event: string;
    timestamp: string;
    ipAddress: string;
    status: 'success' | 'failed' | 'warning';
    details: string;
  }

  // Password hashing, secure token generation, and TOTP are implemented in
  // src/server/security.ts and imported at the top of this file so they can be
  // unit tested and reused by the future API modules.
  // Brute-force protection for credential checks (per identifier, 15 min window).
  interface AttemptWindow { count: number; firstAt: number; lockedUntil: number }
  const LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();
  const REAUTH_ATTEMPTS: Map<string, AttemptWindow> = new Map();
  const PUBLIC_2FA_CHALLENGES: Map<string, { userId: string; expiresAt: number; attempts: number }> = new Map();
  const checkRateLimit = (
    store: Map<string, AttemptWindow>,
    key: string,
    maxAttempts: number,
    windowMs: number
  ): { allowed: boolean; retryInMs: number } => {
    const w = store.get(key);
    const now = Date.now();
    if (!w || now - w.firstAt > windowMs) {
      store.set(key, { count: 0, firstAt: now, lockedUntil: 0 });
      return { allowed: true, retryInMs: 0 };
    }
    if (w.lockedUntil > now) return { allowed: false, retryInMs: w.lockedUntil - now };
    return { allowed: w.count < maxAttempts, retryInMs: w.count >= maxAttempts ? windowMs : 0 };
  };
  const registerFailedAttempt = (store: Map<string, AttemptWindow>, key: string, windowMs: number) => {
    const w = store.get(key) || { count: 0, firstAt: Date.now(), lockedUntil: 0 };
    w.count += 1;
    if (w.count >= 8) w.lockedUntil = w.firstAt + windowMs;
    store.set(key, w);
  };

  // Per-IP request buckets for sensitive endpoints. Unlike the brute-force
  // window above, these count successful requests too, so a single caller
  // cannot hammer signup, login recovery, AI, or OTP endpoints.
  interface ApiRateWindow { count: number; firstAt: number }
  const API_RATE_LIMITS: Map<string, ApiRateWindow> = new Map();
  const hitRateLimit = (
    bucket: string,
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; retryInMs: number } => {
    const fullKey = `${bucket}:${key}`;
    const now = Date.now();
    let w = API_RATE_LIMITS.get(fullKey);
    if (!w || now - w.firstAt > windowMs) {
      w = { count: 0, firstAt: now };
    }
    if (w.count >= maxRequests) {
      return { allowed: false, retryInMs: Math.max(1000, w.firstAt + windowMs - now) };
    }
    w.count += 1;
    API_RATE_LIMITS.set(fullKey, w);
    return { allowed: true, retryInMs: 0 };
  };

  const DEMO_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
  const LOCAL_DEMO_USER_ID = 'usr-sarah-jenkins';
  const LOCAL_SECOND_DEMO_USER_ID = 'usr-alex-turner';
  const isReservedDemoUserId = (id: string) =>
    id === LOCAL_DEMO_USER_ID || id === LOCAL_SECOND_DEMO_USER_ID || id.startsWith('usr-demo-');

  function createSarahDemoUser(): ServerPublicUser {
    return {
      id: LOCAL_DEMO_USER_ID,
      username: 'sarah_wellness',
      fullName: 'Sarah Jenkins',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.jenkins@example.com',
      phoneNumber: '+1 (555) 234-5678',
      passwordHash: hashSecret(LOCAL_DEMO_USER_ID, 'Password123!'),
      role: 'VERIFIED_USER',
      accountStatus: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      country: 'United States',
      preferredLanguage: 'English',
      twoFactor: { enabled: false, backupCodes: ['8392-1928', '4729-5829', '1948-2849', '9582-1049'] },
      dietaryPreferences: ['Mediterranean', 'Heart-Healthy', 'Anti-Inflammatory'],
      healthGoals: ['Balance Blood Glucose', 'Weight & Metabolic Wellness'],
      marketingConsent: true,
      isDemoAccount: true,
      createdAt: '2026-01-15T10:30:00.000Z',
      lastLoginAt: new Date().toISOString()
    };
  }

  function createAlexDemoUser(): ServerPublicUser {
    return {
      id: LOCAL_SECOND_DEMO_USER_ID,
      username: 'alex_turner',
      fullName: 'Alex Turner',
      firstName: 'Alex',
      lastName: 'Turner',
      email: 'alex.turner@example.com',
      phoneNumber: '+1 (555) 876-5432',
      passwordHash: hashSecret(LOCAL_SECOND_DEMO_USER_ID, 'Password123!'),
      role: 'PUBLIC_USER',
      accountStatus: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: false,
      country: 'United Kingdom',
      preferredLanguage: 'English',
      twoFactor: { enabled: false },
      dietaryPreferences: ['Gluten-Free'],
      healthGoals: ['General Longevity'],
      marketingConsent: false,
      isDemoAccount: true,
      createdAt: '2026-02-10T14:20:00.000Z',
      lastLoginAt: new Date().toISOString()
    };
  }

  function createEphemeralDemoUser(): ServerPublicUser {
    const id = `usr-demo-${randomBytes(16).toString('hex')}`;
    const handle = id.slice(-8);
    return {
      id,
      username: `demo_${handle}`,
      fullName: 'Jordan Sample',
      firstName: 'Jordan',
      lastName: 'Sample',
      email: `${id}@demo.invalid`,
      passwordHash: `disabled-demo-password$${randomBytes(32).toString('hex')}`,
      role: 'VERIFIED_USER',
      accountStatus: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: false,
      country: 'India',
      preferredLanguage: 'English',
      twoFactor: { enabled: false },
      dietaryPreferences: ['Balanced'],
      healthGoals: ['General Wellness'],
      marketingConsent: false,
      isDemoAccount: true,
      isEphemeralDemo: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  // A public demo is an isolated, synthetic User Portal session, never a
  // shared password. Development also retains credential-backed fixtures for
  // professional role acceptance tests.
  const PUBLIC_USERS: Map<string, ServerPublicUser> = new Map();
  const ACTIVE_SESSIONS: Map<string, ServerSession> = new Map();
  if (config.nodeEnv === 'development' && config.publicDemoEnabled) {
    PUBLIC_USERS.set(LOCAL_DEMO_USER_ID, createSarahDemoUser());
    PUBLIC_USERS.set(LOCAL_SECOND_DEMO_USER_ID, createAlexDemoUser());
    ACTIVE_SESSIONS.set('sess-current-demo', {
      sessionId: 'sess-current-demo',
      userId: LOCAL_DEMO_USER_ID,
      deviceName: 'MacBook Pro (macOS 15)',
      deviceType: 'Desktop',
      browser: 'Chrome 128.0',
      os: 'macOS Sonoma',
      ipAddress: '198.51.100.42',
      location: 'New York, United States',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      lastActive: new Date().toISOString()
    });
    ACTIVE_SESSIONS.set('sess-mobile-demo', {
      sessionId: 'sess-mobile-demo',
      userId: LOCAL_DEMO_USER_ID,
      deviceName: 'iPhone 16 Pro (iOS 18)',
      deviceType: 'Mobile',
      browser: 'Mobile Safari 18.1',
      os: 'iOS 18',
      ipAddress: '198.51.100.88',
      location: 'New York, United States',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      lastActive: new Date(Date.now() - 7200000).toISOString()
    });
  }

  const isDemoAccountId = (userId: string) =>
    isReservedDemoUserId(userId) || PUBLIC_USERS.get(userId)?.isDemoAccount === true;

  const AUDIT_LOGS: ServerAuditLog[] = [
    {
      id: 'aud-1',
      userId: 'usr-sarah-jenkins',
      event: 'USER_LOGIN_SUCCESS',
      timestamp: new Date().toISOString(),
      ipAddress: '198.51.100.42',
      status: 'success',
      details: 'Secure login via password from New York, US'
    }
  ];

  // Helper function to sanitize user for frontend. The TOTP secret and backup
  // codes are NEVER exposed on normal auth/user responses — they are returned
  // only once during explicit 2FA setup (and never again).
  const sanitizeUser = (user: ServerPublicUser) => {
    const { passwordHash, verificationCode, resetToken, twoFactor, isEphemeralDemo, ...safeUser } = user;
    return {
      ...safeUser,
      twoFactor: {
        enabled: Boolean(twoFactor?.enabled),
        method: twoFactor?.method,
        verifiedAt: twoFactor?.verifiedAt
      }
    };
  };

  // Helper to extract device info
  const parseUserAgent = (ua: string = '') => {
    let browser = 'Modern Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Microsoft Edge';

    let os = 'Unknown OS';
    if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
    if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) deviceType = 'Mobile';
    if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'Tablet';

    return { browser, os, deviceType, deviceName: `${os} (${browser})` };
  };

  // 1. LOGIN ENDPOINT
  app.post('/api/auth/login', (req, res) => {
    const entryRl = hitRateLimit('auth-login', String(req.ip || 'anonymous'), 30, 5 * 60 * 1000);
    if (!entryRl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many attempts. Please try again in ${Math.ceil(entryRl.retryInMs / 60000)} minute(s).` });
    }
    const { identifier, password, rememberMe } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email or mobile number and password.'
      });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPhone = String(identifier).replace(/\D/g, '');

    // Find user by email, username, or phone
    let foundUser: ServerPublicUser | undefined;
    for (const u of PUBLIC_USERS.values()) {
      const userPhoneDigits = u.phoneNumber ? u.phoneNumber.replace(/\D/g, '') : '';
      if (
        u.email.toLowerCase() === cleanIdentifier ||
        u.username.toLowerCase() === cleanIdentifier ||
        (cleanPhone.length >= 7 && userPhoneDigits.includes(cleanPhone))
      ) {
        foundUser = u;
        break;
      }
    }

    // Brute-force protection: lock the identifier after repeated failures.
    const rl = checkRateLimit(LOGIN_ATTEMPTS, cleanIdentifier, 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: `Too many sign-in attempts. Please try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.`
      });
    }

    // Generic incorrect credential error to prevent account enumeration
    if (!foundUser || !verifySecret(foundUser.id, password, foundUser.passwordHash)) {
      registerFailedAttempt(LOGIN_ATTEMPTS, cleanIdentifier, 15 * 60 * 1000);
      AUDIT_LOGS.push({
        id: `aud-${Date.now()}`,
        userId: foundUser ? foundUser.id : 'unknown',
        event: 'USER_LOGIN_FAILED',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || '127.0.0.1',
        status: 'failed',
        details: 'Incorrect email/mobile or password attempt'
      });

      return res.status(401).json({
        success: false,
        error: 'Unable to sign in with those credentials. Please try again.'
      });
    }

    // Migrate legacy PBKDF2 hashes to scrypt on successful sign-in without
    // weakening the stored format for accounts that already use scrypt.
    if (foundUser.passwordHash.startsWith('pbkdf2-sha256$')) {
      foundUser.passwordHash = hashSecret(foundUser.id, password);
      PUBLIC_USERS.set(foundUser.id, foundUser);
      persistRuntimeAccounts();
    }

    // Check account status
    if (foundUser.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended for security review. Please contact support.'
      });
    }
    if (foundUser.accountStatus === 'DEACTIVATED') {
      return res.status(403).json({
        success: false,
        error: 'This account is deactivated. You may reactivate by contacting account recovery.'
      });
    }
    if (foundUser.accountStatus === 'LOCKED') {
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to multiple attempts. Please try again in 15 minutes or reset your password.'
      });
    }
    if (foundUser.accountStatus === 'EMAIL_VERIFICATION_REQUIRED') {
      return res.status(200).json({
        success: true,
        verificationRequired: true,
        verificationType: 'email',
        userId: foundUser.id,
        email: foundUser.email,
        message: 'Email verification required before accessing your dashboard.'
      });
    }

    // Check 2FA requirement
    if (foundUser.twoFactor && foundUser.twoFactor.enabled) {
      const challengeId = secureToken("2fa");
      PUBLIC_2FA_CHALLENGES.set(challengeId, {
        userId: foundUser.id,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0
      });
      return res.status(200).json({
        success: true,
        twoFactorRequired: true,
        challengeId,
        userId: foundUser.id,
        method: foundUser.twoFactor.method || 'authenticator_app',
        message: 'Two-factor authentication required.'
      });
    }

    // Generate active session
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const sessionId = secureToken("sess");
    const session: ServerSession = {
      sessionId,
      userId: foundUser.id,
      deviceName: uaInfo.deviceName,
      deviceType: uaInfo.deviceType,
      browser: uaInfo.browser,
      os: uaInfo.os,
      ipAddress: req.ip || '127.0.0.1',
      location: 'Current Location',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    ACTIVE_SESSIONS.set(sessionId, session);
    persistRuntimeAccounts();

    foundUser.lastLoginAt = new Date().toISOString();
    PUBLIC_USERS.set(foundUser.id, foundUser);
    LOGIN_ATTEMPTS.delete(cleanIdentifier);

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: foundUser.id,
      event: 'USER_LOGIN_SUCCESS',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Successful login via ${uaInfo.browser} on ${uaInfo.os}`
    });

    return res.json({
      success: true,
      message: `Welcome back, ${foundUser.firstName}!`,
      user: sanitizeUser(foundUser),
      session: { ...session, isCurrent: true },
      token: sessionId
    });
  });

  // 2. SIGN UP ENDPOINT
  app.post('/api/auth/signup', (req, res) => {
    const rl = hitRateLimit('auth-signup', String(req.ip || 'anonymous'), 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many account creations from this device. Please try again later.' });
    }
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      termsAccepted,
      marketingConsent,
      country,
      preferredLanguage,
      dateOfBirth,
      termsVersion,
      privacyVersion
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields.'
      });
    }

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create an account.'
      });
    }

    if (!termsVersion || !privacyVersion) {
      return res.status(400).json({
        success: false,
        error: 'Consent version information is required to create an account.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phoneNumber ? String(phoneNumber).trim() : undefined;

    // Check existing account with privacy-preserving advice
    for (const u of PUBLIC_USERS.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        return res.status(409).json({
          success: false,
          error: 'An account may already be associated with the information provided. Try logging in or use Forgot Password to recover access.',
          duplicateAccount: true
        });
      }
    }

    const userId = `usr-${Date.now()}`;
    const generatedUsername = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(100 + Math.random() * 900)}`;
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

    // Strict role separation: ALWAYS enforce PUBLIC_USER
    const newUser: ServerPublicUser = {
      id: userId,
      username: generatedUsername,
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phoneNumber: cleanPhone,
      passwordHash: hashSecret(userId, password),
      role: 'PUBLIC_USER',
      accountStatus: 'EMAIL_VERIFICATION_REQUIRED',
      isEmailVerified: false,
      isPhoneVerified: false,
      country: country || 'United States',
      preferredLanguage: preferredLanguage || 'English',
      dateOfBirth: dateOfBirth || undefined,
      twoFactor: {
        enabled: false
      },
      verificationCode: {
        code: verificationCode,
        type: 'email',
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
      },
      marketingConsent: Boolean(marketingConsent),
      consent: {
        termsVersion: String(termsVersion),
        privacyVersion: String(privacyVersion),
        acceptedAt: new Date().toISOString(),
        jurisdiction: country || 'Unknown',
        method: 'signup_checkbox'
      },
      consentHistory: [
        {
          termsVersion: String(termsVersion),
          privacyVersion: String(privacyVersion),
          acceptedAt: new Date().toISOString(),
          method: 'signup_checkbox'
        }
      ],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    PUBLIC_USERS.set(userId, newUser);
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId,
      event: 'ACCOUNT_CREATED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Account created with consent: Terms ${termsVersion}, Privacy ${privacyVersion}; verification code dispatched`
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify the 6-digit code sent to your registered contact method.',
      verificationRequired: true,
      verificationType: 'email',
      userId,
      email: cleanEmail
    });
  });

  // 3. VERIFY CODE ENDPOINT (EMAIL OR PHONE)
  app.post('/api/auth/verify-code', (req, res) => {
    const rl = hitRateLimit('auth-verify', String(req.ip || 'anonymous'), 15, 5 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many verification attempts. Please wait a moment and try again.' });
    }
    const { userId, code, type } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and 6-digit verification code are required.'
      });
    }

    const user = PUBLIC_USERS.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification session. Please try logging in or registering again.'
      });
    }

    // A verification flow must be in progress (pending, unexpired code).
    if (!user.verificationCode || user.verificationCode.expiresAt < Date.now()) {
      return res.status(404).json({
        success: false,
        error: 'No pending verification was found. Please log in or sign up to receive a code.'
      });
    }

    // Only the account-specific generated code is accepted. A universal or
    // shared test code is deliberately NOT accepted in any environment.
    const isValid = user.verificationCode.code === String(code).trim();

    if (!isValid) {
      AUDIT_LOGS.push({
        id: `aud-${Date.now()}`,
        userId: user.id,
        event: 'VERIFICATION_FAILED',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || '127.0.0.1',
        status: 'warning',
        details: `Invalid verification code attempt for ${type || 'email'}`
      });

      return res.status(400).json({
        success: false,
        error: 'The verification code entered is invalid or has expired. Please check and try again.'
      });
    }

    // Upgrade user status
    user.accountStatus = 'ACTIVE';
    if (type === 'phone') {
      user.isPhoneVerified = true;
    } else {
      user.isEmailVerified = true;
    }
    user.role = 'VERIFIED_USER';
    user.verificationCode = undefined;
    PUBLIC_USERS.set(user.id, user);

    // Create session
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const sessionId = secureToken("sess");
    const session: ServerSession = {
      sessionId,
      userId: user.id,
      deviceName: uaInfo.deviceName,
      deviceType: uaInfo.deviceType,
      browser: uaInfo.browser,
      os: uaInfo.os,
      ipAddress: req.ip || '127.0.0.1',
      location: 'Current Location',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    ACTIVE_SESSIONS.set(sessionId, session);
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'VERIFICATION_SUCCESS',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Account successfully verified via ${type || 'email'}`
    });

    return res.json({
      success: true,
      message: 'Account verified successfully. Welcome to GlobalHealth!',
      user: sanitizeUser(user),
      session: { ...session, isCurrent: true },
      token: sessionId
    });
  });

  // 4. RESEND VERIFICATION CODE
  const RESEND_ATTEMPTS: Map<string, AttemptWindow> = new Map();

  app.post('/api/auth/resend-code', (req, res) => {
    const { userId, type } = req.body || {};
    const rl = checkRateLimit(RESEND_ATTEMPTS, String(userId || '').toLowerCase(), 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many resend attempts. Please try again later.' });
    }

    const user = userId ? PUBLIC_USERS.get(userId) : undefined;
    // Only accounts that currently have a PENDING verification code may
    // receive a resend. The response is generic (no account-existence leak).
    if (!user || !user.verificationCode || user.verificationCode.expiresAt < Date.now()) {
      return res.status(404).json({
        success: false,
        error: 'No pending verification was found. Please log in or sign up to receive a new code.'
      });
    }

    const freshCode = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationCode = {
      code: freshCode,
      type: type === 'phone' ? 'phone' : 'email',
      expiresAt: Date.now() + 15 * 60 * 1000
    };
    PUBLIC_USERS.set(user.id, user);
    persistRuntimeAccounts();

    return res.json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to your registered ${type === 'phone' ? 'mobile number' : 'email address'}.`
    });
  });

  // 5. FORGOT PASSWORD (PRIVACY-PRESERVING)
  app.post('/api/auth/forgot-password', (req, res) => {
    const rl = hitRateLimit('auth-recovery', String(req.ip || 'anonymous'), 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many recovery requests. Please try again later.' });
    }
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email address or mobile number.'
      });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPhone = String(identifier).replace(/\D/g, '');

    let matchedUser: ServerPublicUser | undefined;
    for (const u of PUBLIC_USERS.values()) {
      const userPhoneDigits = u.phoneNumber ? u.phoneNumber.replace(/\D/g, '') : '';
      if (
        u.email.toLowerCase() === cleanIdentifier ||
        (cleanPhone.length >= 7 && userPhoneDigits.includes(cleanPhone))
      ) {
        matchedUser = u;
        break;
      }
    }

    let resetToken = secureToken("rst");
    if (matchedUser) {
      matchedUser.resetToken = {
        token: resetToken,
        expiresAt: Date.now() + 30 * 60 * 1000 // 30 mins
      };
      PUBLIC_USERS.set(matchedUser.id, matchedUser);
      persistRuntimeAccounts();

      AUDIT_LOGS.push({
        id: `aud-${Date.now()}`,
        userId: matchedUser.id,
        event: 'PASSWORD_RESET_REQUESTED',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || '127.0.0.1',
        status: 'success',
        details: 'Password recovery requested'
      });
    }

    // Always return privacy-preserving response. Recovery tokens are delivered
    // through the registered email/SMS channel only and are never returned to
    // the browser that issued the request.
    return res.json({
      success: true,
      message: "If an eligible account matches the information provided, we'll send instructions to the registered contact method."
    });
  });

  // 6. RESET PASSWORD
  app.post('/api/auth/reset-password', (req, res) => {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    let targetUser: ServerPublicUser | undefined;
    for (const u of PUBLIC_USERS.values()) {
      if (u.resetToken && u.resetToken.token === resetToken) {
        if (u.resetToken.expiresAt > Date.now()) {
          targetUser = u;
        }
        break;
      }
    }

    if (!targetUser) {
      return res.status(400).json({
        success: false,
        error: 'The password reset link is invalid or has expired. Please request a new recovery link.'
      });
    }

    // Update password — never store the raw secret; derive the PBKDF2 hash.
    targetUser.passwordHash = hashSecret(targetUser.id, newPassword);
    targetUser.resetToken = undefined;
    PUBLIC_USERS.set(targetUser.id, targetUser);

    // Invalidate all existing sessions for security
    for (const [sId, sess] of ACTIVE_SESSIONS.entries()) {
      if (sess.userId === targetUser.id) {
        ACTIVE_SESSIONS.delete(sId);
      }
    }
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: targetUser.id,
      event: 'PASSWORD_RESET_SUCCESS',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: 'Password was successfully reset and prior sessions revoked'
    });

    return res.json({
      success: true,
      message: 'Your password has been updated. You can now log in using your new password.'
    });
  });

  // 7. GET ACTIVE SESSIONS
  // Owner of the session list is derived ONLY from the validated bearer
  // token — a client-supplied id is never trusted (prevents one user from
  // enumerating another user's active devices/sessions).
  app.get('/api/auth/sessions', (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to view your sessions.' });
    }
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const sessions = Array.from(ACTIVE_SESSIONS.values())
      .filter((s) => s.userId === user.id)
      .map((s) => ({
        ...s,
        isCurrent: s.sessionId === currentToken
      }));
    return res.json({ success: true, sessions });
  });

  // 8. TERMINATE SESSION — authenticated; only the owner of the session may
  // terminate it. (Previously unauthenticated: anyone could end any session.)
  app.post('/api/auth/sessions/terminate', (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to manage your sessions.' });
    }
    const { sessionId } = req.body || {};
    const session = sessionId ? ACTIVE_SESSIONS.get(sessionId) : undefined;
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }
    ACTIVE_SESSIONS.delete(sessionId);
    persistRuntimeAccounts();
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'SESSION_TERMINATED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: 'Device session terminated from Account Security'
    });
    return res.json({ success: true, message: 'Device session terminated.' });
  });

  // 9. TERMINATE ALL OTHER SESSIONS — authenticated; only the account owner's
  // own sessions are ever touched.
  app.post('/api/auth/sessions/terminate-all', (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to manage your sessions.' });
    }
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    let count = 0;
    for (const [sId, sess] of ACTIVE_SESSIONS.entries()) {
      if (sess.userId === user.id && sId !== currentToken) {
        ACTIVE_SESSIONS.delete(sId);
        count += 1;
      }
    }
    persistRuntimeAccounts();
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'SESSION_TERMINATED_ALL',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Logged out ${count} other device session(s)`
    });
    return res.json({ success: true, message: 'All other device sessions have been logged out.' });
  });

  // 10. CHANGE PASSWORD
  app.post('/api/auth/change-password', (req, res) => {
    // Authorize by the validated session — never trust a client-supplied userId.
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to change your password.' });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!verifySecret(user.id, currentPassword || '', user.passwordHash)) {
      registerFailedAttempt(REAUTH_ATTEMPTS, user.id, 15 * 60 * 1000);
      return res.status(400).json({ success: false, error: 'The current password you entered is incorrect.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'New passwords do not match.' });
    }

    user.passwordHash = hashSecret(user.id, newPassword);
    PUBLIC_USERS.set(user.id, user);
    REAUTH_ATTEMPTS.delete(user.id);
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'PASSWORD_CHANGED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: 'Password was updated from Account Security'
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  });

  // 11. TWO-FACTOR AUTH SETUP & VERIFY
  // Self-service: the account is identified from the validated session only —
  // a client-supplied userId is ignored, so one user can never enable/tamper
  // with 2FA on another account (lockout/DoS vector).
  app.post('/api/auth/2fa/setup', (req, res) => {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to configure two-factor authentication.' });
    if (user.twoFactor?.enabled) {
      return res.status(409).json({ success: false, code: 'TWO_FACTOR_ALREADY_ENABLED', error: 'Two-factor authentication is already enabled.' });
    }

    // Unique per-account TOTP secret. Never ship or reuse a fixed secret.
    const secretKey = generateTotpSecret();
    const backupCodes = Array.from({ length: 4 }, () =>
      `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
    );

    user.twoFactor = {
      enabled: false,
      secretKey,
      backupCodes
    };
    PUBLIC_USERS.set(user.id, user);
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: '2FA_SETUP_STARTED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: 'Two-factor authentication setup initialized with a new per-account secret'
    });

    return res.json({
      success: true,
      secretKey,
      qrCodeUri: `otpauth://totp/GlobalHealth:${encodeURIComponent(user.email)}?secret=${secretKey}&issuer=GlobalHealth`,
      backupCodes
    });
  });

  app.post('/api/auth/2fa/verify', (req, res) => {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to verify two-factor authentication.' });
    const { code } = req.body || {};
    if (!user.twoFactor?.secretKey || user.twoFactor.enabled) {
      return res.status(400).json({ success: false, code: 'TWO_FACTOR_SETUP_REQUIRED', error: 'Please start two-factor authentication setup first.' });
    }
    if (!verifyTotp(user.twoFactor.secretKey, String(code || ''))) {
      return res.status(400).json({ success: false, code: 'INVALID_TOTP', error: 'The authenticator code is invalid or has expired.' });
    }

    user.twoFactor.enabled = true;
    user.twoFactor.method = 'authenticator_app';
    user.twoFactor.verifiedAt = new Date().toISOString();
    PUBLIC_USERS.set(user.id, user);
    persistRuntimeAccounts();

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: '2FA_ENABLED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: 'Two-factor authentication enabled and verified'
    });

    return res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully.'
    });
  });

  // 11b. TOTP LOGIN VERIFICATION
  // A successful password-only login never creates a session when 2FA is
  // enabled; the second factor must be verified through this endpoint.
  app.post('/api/auth/2fa/login', (req, res) => {
    const rl = hitRateLimit('auth-2fa-login', String(req.ip || 'anonymous'), 15, 5 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many two-factor verification attempts. Please wait a moment and try again.' });
    }
    const { challengeId, code } = req.body || {};
    const challenge = challengeId ? PUBLIC_2FA_CHALLENGES.get(String(challengeId)) : undefined;
    if (!challenge || challenge.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, code: 'CHALLENGE_EXPIRED', error: 'This two-factor sign-in has expired. Please sign in again.' });
    }
    const user = PUBLIC_USERS.get(challenge.userId);
    if (!user || !user.twoFactor?.enabled || !user.twoFactor.secretKey) {
      PUBLIC_2FA_CHALLENGES.delete(String(challengeId));
      return res.status(400).json({ success: false, code: 'TWO_FACTOR_NOT_CONFIGURED', error: 'This account is not configured for two-factor authentication. Please sign in again.' });
    }
    if (!verifyTotp(user.twoFactor.secretKey, String(code || ''))) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) {
        PUBLIC_2FA_CHALLENGES.delete(String(challengeId));
        return res.status(429).json({ success: false, code: 'TWO_FACTOR_LOCKED', error: 'Too many invalid codes. Please sign in again to receive a fresh challenge.' });
      }
      AUDIT_LOGS.push({
        id: `aud-${Date.now()}`,
        userId: user.id,
        event: '2FA_LOGIN_FAILED',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || '127.0.0.1',
        status: 'warning',
        details: 'Invalid two-factor code during login'
      });
      return res.status(400).json({ success: false, code: 'INVALID_TOTP', error: 'The authenticator code is invalid or has expired.' });
    }
    PUBLIC_2FA_CHALLENGES.delete(String(challengeId));
    LOGIN_ATTEMPTS.delete(user.id);

    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const sessionId = secureToken("sess");
    const session: ServerSession = {
      sessionId,
      userId: user.id,
      deviceName: uaInfo.deviceName,
      deviceType: uaInfo.deviceType,
      browser: uaInfo.browser,
      os: uaInfo.os,
      ipAddress: req.ip || '127.0.0.1',
      location: 'Current Location',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    ACTIVE_SESSIONS.set(sessionId, session);
    persistRuntimeAccounts();
    user.lastLoginAt = new Date().toISOString();
    PUBLIC_USERS.set(user.id, user);

    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'USER_LOGIN_SUCCESS_2FA',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Two-factor sign-in successful via ${uaInfo.browser} on ${uaInfo.os}`
    });

    return res.json({
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      user: sanitizeUser(user),
      session: { ...session, isCurrent: true },
      token: sessionId
    });
  });

  // 12. LOGOUT ENDPOINT
  app.post('/api/auth/logout', (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const session = ACTIVE_SESSIONS.get(token);
      if (session?.isDemoSession) {
        cleanupEphemeralDemoAccount(session.userId);
      } else {
        ACTIVE_SESSIONS.delete(token);
        DOCTOR_SESSIONS.delete(token);
        HOSPITAL_SESSIONS.delete(token);
        PHARMACY_PARTNER_SESSIONS.delete(token);
        NEWS_ADMIN_SESSIONS.delete(token);
        AUTHORITY_SESSIONS.delete(token);
        persistRuntimeAccounts();
        persistDomainState();
      }
    }
    return res.json({
      success: true,
      message: 'Your GlobalHealth session has ended securely.'
    });
  });

  // ======================================================================
  // ACCESS-CONTROL LAYER
  // Token-based session validation + per-user private data store.
  // Every protected endpoint below independently verifies the session,
  // ownership and resource-level authorization — never trusting the client.
  // ======================================================================

  // Sliding session lifetime: 7 days of inactivity.
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  // Per-user private health/application data. Keyed by userId.
  // This simulates an isolated, per-account data store (one record per user;
  // a user can never read another user's record — key is server-derived from
  // the validated token, never from a client-supplied userId).
  const PRIVATE_DATA: Map<
    string,
    {
      ehr: any;
      healthRecords: any[];
      appointments: any[];
      orders: any[];
      savedLibrary: {
        medicines: string[];
        doctors: string[];
        hospitals: string[];
        articles: string[];
        guides: string[];
        posts: string[];
      };
      notifications: any[];
      messages: any[];
      community: {
        joinedGroups: string[];
        followedUsers: string[];
        posts: any[];
        likes: string[];
      };
    }
  > = new Map();

  // Assigned after all domain stores are declared; auth can safely refer to
  // it because requests only run once server initialization has completed.
  let cleanupEphemeralDemoAccount = (_userId: string) => {};
  let persistDomainStateNow = () => {};

  function seedPrivateData(userId: string, fullName: string) {
    if (PRIVATE_DATA.has(userId)) return PRIVATE_DATA.get(userId)!;
    const now = new Date().toISOString();
    const data = {
      ehr: {
        ownerId: userId,
        patientName: fullName,
        mrn: `MRN-${userId.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`,
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
        chronicConditions: [],
        immunizations: [
          { name: 'COVID-19 (Booster)', date: '2025-11-02' },
          { name: 'Influenza', date: '2025-09-14' }
        ],
        updatedAt: now
      },
      healthRecords: [
        {
          id: `rec-${userId.slice(-4)}-1`,
          ownerId: userId,
          type: 'Lab Report',
          title: 'Complete Blood Count (CBC)',
          date: '2026-07-18',
          provider: 'GlobalHealth Diagnostics',
          summary: 'All values within normal reference range.'
        }
      ],
      appointments: [
        {
          id: `apt-${userId.slice(-4)}-1`,
          ownerId: userId,
          doctorName: 'Dr. Anita Rao, MD',
          specialty: 'Internal Medicine',
          facility: 'City Care Multispecialty Hospital',
          date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          time: '10:30',
          status: 'upcoming',
          reason: 'Annual health check-up'
        }
      ],
      orders: [],
      savedLibrary: {
        medicines: [],
        doctors: [],
        hospitals: [],
        articles: [],
        guides: [],
        posts: []
      },
      notifications: [
        {
          id: `ntf-${userId.slice(-4)}-1`,
          ownerId: userId,
          type: 'appointment',
          title: 'Upcoming appointment',
          body: 'Your internal medicine visit is in 3 days.',
          read: false,
          createdAt: now
        }
      ],
      community: { joinedGroups: [], followedUsers: [], posts: [], likes: [] },
      messages: []
    };
    PRIVATE_DATA.set(userId, data);
    return data;
  }

  // ----------------------------------------------------------------------
  // Durable user account data. Public demo sessions are deliberately excluded:
  // every visitor receives a unique in-memory identity and their sandbox data
  // is discarded on logout, expiry or process restart.
  // ----------------------------------------------------------------------
  const RUNTIME_ACCOUNT_STORE = path.join(RUNTIME_DIR, 'account-store.json');
  const persistRuntimeAccounts = () => {
    writeSecureJsonFile(RUNTIME_ACCOUNT_STORE, {
      savedAt: new Date().toISOString(),
      users: [...PUBLIC_USERS.values()].filter((user) => !user.isDemoAccount),
      sessions: [...ACTIVE_SESSIONS.values()].filter((session) => !isDemoAccountId(session.userId)),
      privateData: [...PRIVATE_DATA.entries()]
        .filter(([userId]) => !isDemoAccountId(userId))
        .map(([userId, data]) => ({ userId, data }))
    });
  };
  try {
    const persistedAccountStore = readJsonFile<{
      users?: ServerPublicUser[];
      sessions?: ServerSession[];
      privateData?: { userId: string; data: any }[];
    }>(RUNTIME_ACCOUNT_STORE, {});
    const persistedDemoUserIds = new Set(
      (Array.isArray(persistedAccountStore.users) ? persistedAccountStore.users : [])
        .filter((user) => user?.isDemoAccount || user?.isEphemeralDemo)
        .map((user) => user.id)
    );
    if (Array.isArray(persistedAccountStore.users) && persistedAccountStore.users.length > 0) {
      PUBLIC_USERS.clear();
      for (const user of persistedAccountStore.users) {
        if (
          user &&
          typeof user.id === 'string' &&
          typeof user.email === 'string' &&
          !user.isDemoAccount &&
          !user.isEphemeralDemo &&
          !isReservedDemoUserId(user.id)
        ) {
          PUBLIC_USERS.set(user.id, user);
        }
      }
    }
    if (Array.isArray(persistedAccountStore.sessions) && persistedAccountStore.sessions.length > 0) {
      ACTIVE_SESSIONS.clear();
      for (const session of persistedAccountStore.sessions) {
        if (
          session &&
          typeof session.sessionId === 'string' &&
          typeof session.userId === 'string' &&
          !session.isDemoSession &&
          !persistedDemoUserIds.has(session.userId) &&
          !isReservedDemoUserId(session.userId)
        ) {
          ACTIVE_SESSIONS.set(session.sessionId, session);
        }
      }
    }
    if (Array.isArray(persistedAccountStore.privateData) && persistedAccountStore.privateData.length > 0) {
      PRIVATE_DATA.clear();
      for (const entry of persistedAccountStore.privateData) {
        if (
          entry &&
          typeof entry.userId === 'string' &&
          entry.data &&
          typeof entry.data === 'object' &&
          !persistedDemoUserIds.has(entry.userId) &&
          !isReservedDemoUserId(entry.userId)
        ) {
          PRIVATE_DATA.set(entry.userId, entry.data);
        }
      }
    }
  } catch {
    /* load failure already logged */
  }
  // Keep local fixture credentials stable even if an older runtime account
  // file contains stale demo changes. These reserved users are synthetic.
  if (config.nodeEnv === 'development' && config.publicDemoEnabled) {
    PUBLIC_USERS.set(LOCAL_DEMO_USER_ID, createSarahDemoUser());
    PUBLIC_USERS.set(LOCAL_SECOND_DEMO_USER_ID, createAlexDemoUser());
  }
  setInterval(() => persistRuntimeAccounts(), 5000).unref();

  // Resolve and validate the bearer session token. Returns the authenticated
  // user or null. Enforces session expiry (sliding window) and account status.
  function authenticate(req: any): ServerPublicUser | null {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const session = ACTIVE_SESSIONS.get(token);
    if (!session) return null;

    // Isolated demo sessions have a short sliding TTL and are fully discarded
    // when they expire. Ordinary account expiry remains unchanged.
    if (session.isDemoSession && (!session.expiresAt || session.expiresAt <= Date.now())) {
      cleanupEphemeralDemoAccount(session.userId);
      return null;
    }

    // Sliding expiry: invalidate after prolonged inactivity.
    const lastActive = new Date(session.lastActive).getTime();
    if (Date.now() - lastActive > SESSION_TTL_MS) {
      ACTIVE_SESSIONS.delete(token);
      return null;
    }

    const user = PUBLIC_USERS.get(session.userId);
    if (!user) return null;
    if (user.accountStatus !== 'ACTIVE') return null;

    // Slide the window forward on authenticated activity.
    session.lastActive = new Date().toISOString();
    if (session.isDemoSession) session.expiresAt = Date.now() + DEMO_SESSION_TTL_MS;
    ACTIVE_SESSIONS.set(token, session);
    return user;
  }

  // Express middleware: rejects unauthenticated requests with a friendly,
  // privacy-safe payload. Attaches req.authUser for downstream handlers.
  function requireAuth(req: any, res: any, next: any) {
    const user = authenticate(req);
    if (!user && platformIdentity(req)) return res.status(403).json({ success: false, code: 'ACCESS_DENIED', error: 'This feature belongs to the User workspace.' });
    if (!user) {
      // Never cache unauthorized/private responses.
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Please sign in to access this feature.'
      });
    }
    // Private responses must never be stored by shared/CDN caches and must be
    // re-validated so a logged-out or switched account never sees cached data.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    // Security audit: record access to protected resources (identity derived
    // from the validated token, never from the client).
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      event: 'PROTECTED_RESOURCE_ACCESS',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `${req.method} ${req.path}`
    });

    req.authUser = user;
    next();
  }

  // Server-side EHR access share tokens. The token is a capability created only
  // by the signed-in account owner; it is never trusted from the client.
  const EHR_CONSENT_SHARES = new Map<
    string,
    { token: string; userId: string; granteeName: string; granteeType: string; scopes: string[]; expiresAt: number; createdAt: number; revokedAt?: number }
  >();
  const EHR_CONSENT_SHARE_DIR = path.join(RUNTIME_DIR, 'ehr-consent-shares.json');
  try {
    const persisted = readJsonFile<
      { token: string; userId: string; granteeName: string; granteeType: string; scopes: string[]; expiresAt: number; createdAt: number; revokedAt?: number }[]
    >(EHR_CONSENT_SHARE_DIR, []);
    for (const share of persisted) {
      if (
        share &&
        typeof share.token === 'string' &&
        typeof share.userId === 'string' &&
        !isDemoAccountId(share.userId)
      ) {
        EHR_CONSENT_SHARES.set(share.token, share);
      }
    }
  } catch {
    /* persistence load already logged */
  }
  const persistEhrConsentShares = () =>
    writeJsonFile(
      EHR_CONSENT_SHARE_DIR,
      [...EHR_CONSENT_SHARES.values()].filter((share) => !isDemoAccountId(share.userId))
    );

  // GET /api/auth/me — validate the current session and return the user.
  app.get('/api/auth/me', (req, res) => {
    const identity = platformIdentity(req);
    if (!identity) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        error: 'Your session has expired. Please sign in again.'
      });
    }
    return res.json({ success: true, user: identity.user, portalRole: identity.role, destination: ROLE_DESTINATIONS[identity.role] });
  });

  // Credentials for legacy role fixtures are returned only by a development
  // server. Public runtimes expose only the passwordless sandbox availability.
  app.get('/api/auth/demo-accounts', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!config.publicDemoEnabled) {
      return res.json({ success: true, demoSessionAvailable: false, accounts: {} });
    }
    return res.json({
      success: true,
      demoSessionAvailable: true,
      accounts: DEVELOPMENT_DEMO_ACCOUNTS || {}
    });
  });

  // Creates an isolated synthetic User Portal identity for this visitor. It
  // issues no reusable credentials and writes none of its account/session or
  // private domain data to persistent storage.
  app.post('/api/auth/demo-login', (req, res) => {
    if (!config.publicDemoEnabled) {
      return res.status(404).json({ success: false, code: 'DEMO_DISABLED', error: 'The public demo is currently unavailable.' });
    }
    const limit = hitRateLimit('public-demo-login', String(req.ip || 'unknown'), 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(limit.retryInMs / 1000)));
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many demo sessions were started. Please try again later.' });
    }

    const user = createEphemeralDemoUser();
    const now = new Date().toISOString();
    const sessionId = secureToken('gh-demo');
    const session: ServerSession = {
      sessionId,
      userId: user.id,
      deviceName: 'Private demo browser session',
      deviceType: /Mobi|Android/i.test(String(req.headers['user-agent'] || '')) ? 'Mobile' : 'Desktop',
      browser: 'Web browser',
      os: 'Web',
      ipAddress: 'Private demo session',
      location: 'Synthetic sandbox',
      createdAt: now,
      lastActive: now,
      isDemoSession: true,
      expiresAt: Date.now() + DEMO_SESSION_TTL_MS
    };
    PUBLIC_USERS.set(user.id, user);
    ACTIVE_SESSIONS.set(sessionId, session);

    const data = seedPrivateData(user.id, user.fullName);
    data.healthRecords.push(
      {
        id: `rec-${user.id.slice(-4)}-2`,
        ownerId: user.id,
        type: 'Vitals',
        title: 'Wellness check — resting vitals',
        date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
        provider: 'GlobalHealth Demo Clinic',
        summary: 'Blood pressure 118/76 mmHg, resting heart rate 72 bpm. Synthetic sample data.'
      },
      {
        id: `rec-${user.id.slice(-4)}-3`,
        ownerId: user.id,
        type: 'Immunization',
        title: 'Seasonal influenza vaccination',
        date: '2025-09-14',
        provider: 'GlobalHealth Demo Clinic',
        summary: 'Synthetic vaccination history item for exploring the portal.'
      }
    );
    seedConsentDemoForPatient(user.id, user.id.slice(-8).toUpperCase());

    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(201).json({
      success: true,
      message: 'Your private synthetic demo is ready.',
      user: sanitizeUser(user),
      session: { ...session, isCurrent: true },
      token: sessionId,
      expiresAt: session.expiresAt
    });
  });

  // ---- Protected: create a server-scoped EHR access share token ----.
  const ALLOWED_CONSENT_SCOPES = new Set(['Vitals', 'Labs', 'Medications', 'Diagnoses', 'Imaging', 'Clinical Notes']);
  app.post('/api/ehr/consent-share', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { granteeName, granteeType, scopes, durationDays } = req.body || {};
    const cleanName = typeof granteeName === 'string' ? granteeName.trim().slice(0, 120) : '';
    const cleanType = typeof granteeType === 'string' ? granteeType.trim().slice(0, 40) : 'Physician';
    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Provider name is required.' });
    }
    const cleanScopes = Array.isArray(scopes)
      ? [...new Set(scopes.filter((s: unknown): s is string => typeof s === 'string' && ALLOWED_CONSENT_SCOPES.has(s)))].slice(0, ALLOWED_CONSENT_SCOPES.size)
      : [];
    if (cleanScopes.length === 0) {
      return res.status(400).json({ success: false, error: 'Select at least one record scope to share.' });
    }
    const days = Number(durationDays);
    const validDays = [1, 7, 30, 365].includes(days) ? days : 7;
    const token = secureToken("gh-ehr");
    const now = Date.now();
    EHR_CONSENT_SHARES.set(token, {
      token,
      userId: user.id,
      granteeName: cleanName,
      granteeType: cleanType,
      scopes: cleanScopes,
      createdAt: now,
      expiresAt: now + validDays * 86400000,
    });
    persistEhrConsentShares();
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'EHR_CONSENT_SHARE_CREATED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Created ${validDays}-day EHR access share for ${cleanName} (${cleanScopes.length} scope(s))`
    });
    return res.status(201).json({
      success: true,
      token,
      url: `/api/ehr/shared-consent/${token}`,
      expiresAt: now + validDays * 86400000,
      scope: cleanScopes,
    });
  });

  // ---- Public verification of a non-revoked, unexpired share link ----.
  app.get('/api/ehr/shared-consent/:token', (req, res) => {
    const share = EHR_CONSENT_SHARES.get(req.params.token);
    if (!share || share.revokedAt || share.expiresAt < Date.now()) {
      return res.status(404).json({ success: false, error: 'This access link is invalid or has expired.' });
    }
    return res.json({
      success: true,
      granteeName: share.granteeName,
      granteeType: share.granteeType,
      scopes: share.scopes,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      revocable: true,
    });
  });

  // ---- Protected: revoke an EHR access share (owner only) ----.
  app.delete('/api/ehr/consent-share/:token', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const share = EHR_CONSENT_SHARES.get(req.params.token);
    if (!share) return res.status(404).json({ success: false, error: 'This access link could not be found.' });
    if (share.userId !== user.id) return res.status(403).json({ success: false, error: 'You do not have permission to revoke this access link.' });
    share.revokedAt = Date.now();
    persistEhrConsentShares();
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'EHR_CONSENT_SHARE_REVOKED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Revoked EHR access share for ${share.granteeName}`
    });
    return res.json({ success: true, revoked: true });
  });

  // ---- Protected: Personal Health Dashboard (owner-only aggregate) ----
  // ---- Protected: consent record (which policy versions were accepted) ----
  app.get('/api/me/consent', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    return res.json({
      success: true,
      consent: user.consent || null,
      consentHistory: user.consentHistory || [],
      marketingConsent: Boolean(user.marketingConsent)
    });
  });

  // ---- Protected: update optional marketing consent (easy opt-out) ----
  app.post('/api/me/consent/marketing', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const enabled = Boolean(req.body?.enabled);
    user.marketingConsent = enabled;
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: enabled ? 'MARKETING_CONSENT_OPTED_IN' : 'MARKETING_CONSENT_WITHDRAWN',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: enabled
        ? 'Optional marketing consent granted (channel: email/selected channels)'
        : 'Optional marketing consent withdrawn by user'
    });
    return res.json({ success: true, marketingConsent: user.marketingConsent });
  });

  // ---- Protected: re-acceptance after a policy update (material change) ----
  app.post('/api/me/consent/accept', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { termsVersion, privacyVersion } = req.body || {};
    if (!termsVersion || !privacyVersion) {
      return res.status(400).json({ success: false, error: 'Both Terms and Privacy versions are required to record consent.' });
    }
    // Move the previously accepted versions into history (historic records are preserved).
    if (user.consent) {
      user.consentHistory = user.consentHistory || [];
      user.consentHistory.push({
        termsVersion: user.consent.termsVersion,
        privacyVersion: user.consent.privacyVersion,
        acceptedAt: user.consent.acceptedAt,
        method: user.consent.method
      });
    }
    user.consent = {
      termsVersion: String(termsVersion),
      privacyVersion: String(privacyVersion),
      acceptedAt: new Date().toISOString(),
      jurisdiction: user.country || 'Unknown',
      method: 'settings_reacceptance'
    };
    AUDIT_LOGS.push({
      id: `aud-${Date.now()}`,
      userId: user.id,
      event: 'CONSENT_REACCEPTED',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1',
      status: 'success',
      details: `Policy re-acceptance recorded: Terms ${termsVersion}, Privacy ${privacyVersion}`
    });
    return res.json({ success: true, consent: user.consent, consentHistory: user.consentHistory });
  });

  app.get('/api/me/dashboard', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({
      success: true,
      greeting: { firstName: user.firstName },
      summary: {
        upcomingAppointments: data.appointments.filter((a) => a.status === 'upcoming').length,
        activePrescriptions: 0,
        recentRecords: data.healthRecords.length,
        savedMedicines: data.savedLibrary.medicines.length,
        savedResources:
          data.savedLibrary.articles.length +
          data.savedLibrary.guides.length +
          data.savedLibrary.doctors.length +
          data.savedLibrary.hospitals.length,
        unreadNotifications: data.notifications.filter((n) => !n.read).length,
        communityActivity: data.community.posts.length
      }
    });
  });

  // ---- Protected: EHR (strictly owner-only) ----
  app.get('/api/me/ehr', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, ehr: data.ehr });
  });

  // ---- Protected: Health records (owner-only) ----
  app.get('/api/me/health-records', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, records: data.healthRecords });
  });

  // ---- Protected: Appointments (owner-only) ----
  app.get('/api/me/appointments', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, appointments: data.appointments });
  });

  // Book an appointment — authentication AND ownership enforced.
  app.post('/api/me/appointments', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { doctorName, specialty, facility, date, time, reason } = req.body || {};
    if (!doctorName || !date || !time) {
      return res.status(400).json({ success: false, error: 'Please choose a doctor, date and time.' });
    }
    const appointment = {
      id: `apt-${Date.now()}`,
      ownerId: user.id, // ownership stamped server-side from the token
      doctorName,
      specialty: specialty || '',
      facility: facility || '',
      date,
      time,
      reason: reason || '',
      status: 'upcoming'
    };
    data.appointments.push(appointment);
    return res.status(201).json({ success: true, appointment });
  });

  // ---- Protected: Medicine orders (owner-only) ----
  app.get('/api/me/orders', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, orders: data.orders });
  });

  app.post('/api/me/orders', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { items, total } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your order is empty.' });
    }
    const order = {
      id: `ord-${Date.now()}`,
      ownerId: user.id, // ownership stamped server-side
      items,
      total: total || 0,
      status: 'placed',
      placedAt: new Date().toISOString()
    };
    data.orders.push(order);
    return res.status(201).json({ success: true, order });
  });

  // ---- Protected: Saved Library (owner-only) ----
  app.get('/api/me/saved-library', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, savedLibrary: data.savedLibrary });
  });

  app.post('/api/me/saved-library', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { category, itemId, action } = req.body || {};
    const validCategories = [
      'medicines',
      'doctors',
      'hospitals',
      'articles',
      'guides',
      'posts'
    ] as const;
    const categoryKey = validCategories.find((key) => key === category);
    if (!categoryKey || !itemId) {
      return res.status(400).json({ success: false, error: 'Invalid save request.' });
    }
    const list = data.savedLibrary[categoryKey];
    if (action === 'remove') {
      data.savedLibrary[categoryKey] = list.filter((id) => id !== itemId);
    } else if (!list.includes(itemId)) {
      list.push(itemId);
    }
    return res.json({ success: true, savedLibrary: data.savedLibrary });
  });

  // ---- Protected: Notifications (owner-only, personalized) ----
  app.get('/api/me/notifications', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, notifications: data.notifications });
  });

  // ---- Protected: Messages (owner-only) ----
  app.get('/api/me/messages', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    return res.json({ success: true, messages: data.messages });
  });

  app.post('/api/messages', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { toUserId, body } = req.body || {};
    if (!toUserId || !body) {
      return res.status(400).json({ success: false, error: 'Message recipient and content are required.' });
    }
    const message = {
      id: `msg-${Date.now()}`,
      ownerId: user.id,
      fromUserId: user.id,
      toUserId,
      body,
      sentAt: new Date().toISOString()
    };
    data.messages.push(message);
    return res.status(201).json({ success: true, message });
  });

  // ---- Protected: Community participation (auth required to act) ----
  app.post('/api/community/posts', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { title, body, groupId } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'A post title and body are required.' });
    }
    const post = {
      id: `post-${Date.now()}`,
      ownerId: user.id,
      authorName: user.fullName,
      title,
      body,
      groupId: groupId || null,
      createdAt: new Date().toISOString()
    };
    data.community.posts.push(post);
    return res.status(201).json({ success: true, post });
  });

  app.post('/api/community/groups/join', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { groupId } = req.body || {};
    if (!groupId) {
      return res.status(400).json({ success: false, error: 'A group is required.' });
    }
    if (!data.community.joinedGroups.includes(groupId)) {
      data.community.joinedGroups.push(groupId);
    }
    return res.json({ success: true, joinedGroups: data.community.joinedGroups });
  });

  app.post('/api/community/follow', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const data = seedPrivateData(user.id, user.fullName);
    const { targetUserId, action } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'A user is required.' });
    }
    if (action === 'unfollow') {
      data.community.followedUsers = data.community.followedUsers.filter((id) => id !== targetUserId);
    } else if (!data.community.followedUsers.includes(targetUserId)) {
      data.community.followedUsers.push(targetUserId);
    }
    return res.json({ success: true, followedUsers: data.community.followedUsers });
  });

  // 13. AUDIT LOGS FOR CURRENT USER
  // Security logs are scoped strictly to the validated session — the client
  // can never supply (or spoof) another user's id to read their security log.
  app.get('/api/auth/audit-logs', (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to access your security log.' });
    }
    const logs = AUDIT_LOGS.filter((l) => l.userId === user.id).slice(-50).reverse();
    return res.json({ success: true, logs });
  });

  // ======================================================================
  // DOCTOR ACCESS · PATIENT CONSENT · EHR MODIFICATION · AUDIT HISTORY
  // ----------------------------------------------------------------------
  // One integrated, server-enforced security system.
  //  1. Doctors are VERIFIED professionals (explicit verification, not claims).
  //  2. Doctors may only VIEW patients they hold an active access grant for.
  //  3. VIEW != MODIFY: adding, editing or removing EHR data ALWAYS requires
  //     an explicit, authenticated patient consent decision.
  //  4. Approved changes create a new EHR version (never silent overwrites).
  //  5. Removal defaults to ARCHIVE. Permanent deletion is retention-controlled
  //     and the removed content is preserved in an audit-only retention store.
  //  6. Gmail is a notification layer ONLY. The authenticated in-app consent
  //     decision is the authoritative approval record (email alone is never
  //     treated as authorization).
  //  7. Every event is written to an APPEND-ONLY, hash-chained audit trail.
  //  8. Emergency (break-glass) access is a separate, time-limited, view-only,
  //     heavily-audited workflow — never a shortcut to editing.
  // ======================================================================

  interface ConsentDoctor {
    doctorId: string;
    fullName: string;
    organization: string;
    specialty: string;
    registrationNo: string;
    passwordHash: string;
    verificationStatus: 'VERIFIED' | 'PENDING';
    status: 'ACTIVE' | 'SUSPENDED';
    // Portal credential fields (Doctor Portal sign-in)
    username?: string;
    email?: string;
    role?: string;
    department?: string;
  }

  interface AttachmentRef {
    attachmentId: string;
    name: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
  }

  interface Clarification {
    id: string;
    from: 'PATIENT' | 'DOCTOR';
    message: string;
    at: string;
  }

  type ConsentKind = 'access_grant' | 'add' | 'edit' | 'remove';
  type ConsentStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'cancelled'
    | 'executed'
    | 'failed'
    | 'conflict';

  interface ConsentRequest {
    requestId: string;
    patientUserId: string;
    doctorId: string;
    kind: ConsentKind;
    recordCategory?: string;
    recordId?: string;
    title: string;
    summary: string;
    reason: string;
    explanation?: string; // extra explanation shown to the patient
    currentValue?: string;
    proposedValue?: string;
    deletionType?: 'archive' | 'permanent'; // for kind === 'remove'
    priority: 'normal' | 'high';
    attachment?: AttachmentRef;
    clarifications: Clarification[];
    // Version-conflict protection: the record's version count when the
    // request was created. If it differs at execution time, the approved
    // change is PAUSED (status 'conflict') instead of overwriting newer data.
    baseVersionNumber?: number;
    // Access requests: the scope + duration the doctor asked for.
    scope?: string[];
    accessDurationDays?: number;
    status: ConsentStatus;
    patientViewedAt?: string;
    createdAt: string;
    expiresAt: string;
    reviewedAt?: string;
    decisionBy?: string;
    verificationMethod?: 'SESSION' | 'PASSWORD_REAUTH';
    rejectReason?: string;
    executedAt?: string;
    executedRecordId?: string;
    versionNumber?: number;
    idempotencyKey?: string;
  }

  interface AccessGrant {
    accessId: string;
    patientUserId: string; // the PUBLIC_USER id (account owner)
    doctorId: string;
    scope: string[]; // granular view categories
    canView: boolean;
    isEmergency: boolean; // break-glass flag (view-only, time-limited)
    emergencyReason?: string;
    status: 'active' | 'revoked' | 'expired';
    grantedAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastViewedAt?: string;
  }

  interface EmailRecord {
    emailId: string;
    to: string;
    subject: string;
    body: string;
    type: string;
    requestId?: string;
    linkToken?: string;
    sentAt: string;
    read: boolean;
  }

  interface DoctorNotification {
    id: string;
    doctorId: string;
    type: string;
    title: string;
    body: string;
    requestId?: string;
    patientName?: string;
    patientUserId?: string;
    read: boolean;
    at: string;
  }

  interface RetainedRecord {
    recordId: string;
    category: string;
    title: string;
    versions: EhrVersion[];
    removedAt: string;
    requestId: string;
    reason: string;
    requestedBy: string;
    approvedBy: string;
  }

  interface EhrVersion {
    versionId: string;
    versionNumber: number;
    data: string;
    createdBy: string; // doctorId or 'patient'
    sourceRequestId?: string;
    createdAt: string;
  }
  interface EhrRecord {
    recordId: string;
    patientUserId: string;
    category: string;
    title: string;
    status: 'active' | 'archived';
    createdAt: string;
    versions: EhrVersion[];
  }

  const CONSENT_REQUESTS: Map<string, ConsentRequest[]> = new Map();
  const DOCTOR_ACCESS: Map<string, AccessGrant[]> = new Map();
  const EHR_RECORDS: Map<string, EhrRecord[]> = new Map();
  // Attachments live OUTSIDE any public directory (in-memory store, served
  // only through an authenticated, ownership-checked endpoint).
  const ATTACHMENTS: Map<string, AttachmentRef & { dataUrl: string }> = new Map();
  const EMAIL_OUTBOX: Map<string, EmailRecord[]> = new Map();
  const EMAIL_LINK_TOKENS: Map<string, { patientUserId: string; requestId?: string; expiresAt: number }> = new Map();
  const DOCTOR_NOTIFICATIONS: Map<string, DoctorNotification[]> = new Map();
  // Retention archive: content of permanently removed records is preserved
  // here (audit-only) so history is never silently destroyed.
  const RETENTION_ARCHIVE: Map<string, RetainedRecord[]> = new Map();
  // Idempotency: a decided/executed request can never be executed twice.
  const DECIDED_REQUESTS: Map<string, string> = new Map(); // requestId -> decidedAt
  const EMERGENCY_WINDOW_MS = 2 * 60 * 60 * 1000; // break-glass access: 2h

  const DOCTORS: Map<string, ConsentDoctor> = new Map([
    [
      'doc-1',
      {
        doctorId: 'doc-1',
        fullName: 'Dr. Anita Rao, MD',
        organization: 'City Care Multispecialty Hospital',
        specialty: 'Internal Medicine',
        registrationNo: 'MCI-55821',
        passwordHash: hashSecret('doc-1', 'Doctor123!'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ],
    [
      'doc-2',
      {
        doctorId: 'doc-2',
        fullName: 'Dr. Vikram Mehta, MD',
        organization: 'Apex Cardiology Institute',
        specialty: 'Cardiology',
        registrationNo: 'MCI-77410',
        passwordHash: hashSecret('doc-2', 'Doctor123!'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ],
    // Doctor Portal (MedAuth) workspace accounts. Passwords are hashed
    // server-side ONLY — the client never validates credentials.
    [
      'doc-alexandra-chen',
      {
        doctorId: 'doc-alexandra-chen',
        fullName: 'Dr. Alexandra Chen, MD',
        organization: 'Johns Hopkins Hospital & Heart Institute',
        specialty: 'Interventional Cardiology',
        registrationNo: 'MB-AUTH-948271',
        username: 'doc_alex_chen',
        email: 'a.chen@medauth.org',
        role: 'Department Head',
        department: 'Cardiovascular Institute',
        passwordHash: hashSecret('doc-alexandra-chen', 'chen123'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ],
    [
      'doc-robert-harrison',
      {
        doctorId: 'doc-robert-harrison',
        fullName: 'Dr. Robert Harrison, MD, FACS',
        organization: 'Hospital for Special Surgery (HSS), New York',
        specialty: 'Orthopedic Surgery',
        registrationNo: 'MB-HARR-11290',
        username: 'doc_rob_harrison',
        email: 'r.harrison@medauth.org',
        role: 'Senior Doctor',
        department: 'Orthopedic Trauma & Joint Reconstruction',
        passwordHash: hashSecret('doc-robert-harrison', 'harr123'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ],
    [
      'doc-priya-sharma',
      {
        doctorId: 'doc-priya-sharma',
        fullName: 'Dr. Priya Sharma, MBBS, MD, DM',
        organization: 'Apollo Multispeciality Hospitals & Research Centre',
        specialty: 'Endocrinology & Diabetology',
        registrationNo: 'MB-SHAR-55104',
        username: 'doc_priya_sharma',
        email: 'p.sharma@medauth.org',
        role: 'Consultant',
        department: 'Endocrinology & Metabolic Center',
        passwordHash: hashSecret('doc-priya-sharma', 'priya123'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ],
    [
      'doc-marcus-vance',
      {
        doctorId: 'doc-marcus-vance',
        fullName: 'Dr. Marcus Vance, MD, PhD',
        organization: 'Dana-Farber Cancer Institute & Harvard Medical',
        specialty: 'Medical Oncology',
        registrationNo: 'MB-VANC-72093',
        username: 'doc_marcus_vance',
        email: 'm.vance@medauth.org',
        role: 'Department Head',
        department: 'Molecular Oncology & Therapeutics',
        passwordHash: hashSecret('doc-marcus-vance', 'vance123'),
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE'
      }
    ]
  ]);

  // Public onboarding applications are review records only. They never grant
  // a session or clinical access; an authorized organization must provision a
  // verified doctor through the protected activation process.
  const DOCTOR_APPLICATIONS: Map<string, any> = new Map();

  const nowIso = () => new Date().toISOString();
  const APP_BASE = config.appUrl || `http://localhost:${PORT}`;

  // ---------------- APPEND-ONLY, HASH-CHAINED AUDIT TRAIL ---------------
  // Every important event receives a unique event ID, a server-generated
  // timestamp and a hash that chains to the previous event. Ordinary users
  // have no endpoint to modify, reorder or delete these records.
  const consentAudit: any[] = [];
  // Hash chains are scoped PER PATIENT so each patient's history is a
  // self-contained, independently verifiable, tamper-evident chain.
  // (System-wide events without a patient go into the '__system__' chain.)
  const lastAuditHash: Map<string, string> = new Map();
  const chainKey = (e: { patientUserId?: string }) => e.patientUserId || '__system__';

  const shortHash = (s: string) => createHash('sha256').update(s).digest('hex').toUpperCase();

  const audit = (req: any, e: {
    patientUserId?: string;
    actorId: string;
    actorRole: 'PATIENT' | 'DOCTOR' | 'SYSTEM';
    eventType: string;
    resourceType?: string;
    resourceId?: string;
    requestId?: string;
    recordCategory?: string;
    previousState?: string;
    newState?: string;
    accessPermission?: string;
    sessionId?: string;
    result: string;
    detail?: string;
  }) => {
    const now = nowIso();
    const token = req ? (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim() : '';
    const sessionId = e.sessionId || (token ? `${token.slice(0, 12)}…` : 'N/A');
    const key = chainKey(e);
    const prevHash = lastAuditHash.get(key) || 'GENESIS';
    const hash = shortHash(
      `${prevHash}|${now}|${e.eventType}|${e.actorId}|${e.patientUserId || ''}|${e.requestId || ''}|${e.resourceId || ''}`
    );
    lastAuditHash.set(key, hash);
    // Audit records carry a concise reason and state label, never full clinical
    // payloads. The hash still commits to the actor/resource/request identity,
    // while the protected record remains in the versioned clinical store.
    const safeState = (value?: string) => {
      if (!value) return value;
      const compact = String(value).replace(/\s+/g, ' ').trim();
      if (/^(pending|approved|rejected|executed|failed|conflict|active|revoked|expired|archived|cancelled|completed|denied|prepared|sent|signed|version\s+\d+|pending:|active\s*\(|conflict:)/i.test(compact)) return compact.slice(0, 180);
      return 'redacted clinical value';
    };
    const safeDetail = e.detail ? String(e.detail).replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
    consentAudit.push({
      auditId: `AUD-${now.slice(0, 10).replace(/-/g, '')}-${hash.slice(0, 6)}`,
      timestamp: now, // server-generated — never from the client clock
      prevHash,
      hash,
      sessionId,
      ipAddress: req?.ip || null,
      ...e,
      previousState: safeState(e.previousState),
      newState: safeState(e.newState),
      detail: safeDetail
    });
    return consentAudit[consentAudit.length - 1];
  };

  const getDoctor = (id?: string | null) => (id ? DOCTORS.get(id) : undefined);
  const docName = (id?: string) => getDoctor(id)?.fullName || 'A doctor';

  // ---------------- NOTIFICATIONS ---------------------------------------
  const pushPatientNotification = (userId: string, n: { type: string; title: string; body: string; requestId?: string }) => {
    const data = seedPrivateData(userId, 'Patient');
    data.notifications.unshift({
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ownerId: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      requestId: n.requestId,
      read: false,
      createdAt: nowIso()
    } as any);
  };

  const pushDoctorNotification = (doctorId: string, n: { type: string; title: string; body: string; requestId?: string; patientName?: string; patientUserId?: string }) => {
    const requestBelongsToDemo = Boolean(
      n.requestId &&
      [...CONSENT_REQUESTS.entries()].some(([patientId, requests]) =>
        isDemoAccountId(patientId) && requests.some((request) => request.requestId === n.requestId)
      )
    );
    // Demo actions are private to the visitor's sandbox; never write their
    // activity into a real professional's shared notification feed.
    if ((n.patientUserId && isDemoAccountId(n.patientUserId)) || requestBelongsToDemo) return;

    const { patientUserId: _patientUserId, ...safeNotification } = n;
    const list = DOCTOR_NOTIFICATIONS.get(doctorId) || [];
    list.unshift({
      id: `dntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      doctorId,
      read: false,
      at: nowIso(),
      ...safeNotification
    });
    DOCTOR_NOTIFICATIONS.set(doctorId, list);
  };

  // ---------------- GMAIL NOTIFICATION LAYER ----------------------------
  // The email is a NOTIFICATION + ACCESS POINT, never the authorization
  // record. Security rules applied to every message:
  //  - No clinical detail in the subject line.
  //  - No detailed medical information in the body (request type only).
  //  - A secure, short-lived, single-use link that deep-links into the
  //    authenticated app (full request data still requires sign-in).
  const sendGmail = (
    patientUserId: string,
    params: { type: string; subject: string; body: string; requestId?: string }
  ): EmailRecord | null => {
    const user = PUBLIC_USERS.get(patientUserId);
    if (!user || !user.email) return null;

    const linkToken = `ght-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 8)}`;
    EMAIL_LINK_TOKENS.set(linkToken, {
      patientUserId,
      requestId: params.requestId,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour, short-lived
    });
    const link = `${APP_BASE}/#privacy?request_token=${linkToken}`;

    const footer = [
      '',
      '— — —',
      'Security notice:',
      '• Approve or reject requests ONLY inside your signed-in GlobalHealth account.',
      '• GlobalHealth will never ask for your password or one-time codes by email.',
      '• If you do not recognize this request, do not approve it — report it from the security section of your account.',
      'GlobalHealth · Your health information is yours.'
    ].join('\n');

    const email: EmailRecord = {
      emailId: `eml-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      to: user.email,
      subject: params.subject,
      body: `${params.body}\n\nOpen GlobalHealth to review:\n${link}${footer}`,
      type: params.type,
      requestId: params.requestId,
      linkToken,
      sentAt: nowIso(),
      read: false
    };
    const list = EMAIL_OUTBOX.get(patientUserId) || [];
    list.unshift(email);
    EMAIL_OUTBOX.set(patientUserId, list);
    audit(null, {
      patientUserId,
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      eventType: 'EMAIL_NOTIFICATION_SENT',
      resourceType: 'Email',
      resourceId: email.emailId,
      requestId: params.requestId,
      result: 'sent',
      detail: `Gmail notification to ${user.email}: ${params.subject}`
    });
    return email;
  };

  const kindVerb = (kind?: string) =>
    kind === 'add' ? 'add' : kind === 'edit' ? 'update' : kind === 'remove' ? 'remove or archive' : 'access';
  const kindLabel = (kind?: string) =>
    kind === 'add' ? 'Add' : kind === 'edit' ? 'Edit' : kind === 'remove' ? 'Remove' : 'Access';

  // ---------------- DEMO RELATIONSHIP & SEED RECORDS --------------------
  // Each public demo identity gets its own synthetic EHR relationship and
  // consent request so signed-in screens have meaningful sample content.
  function seedConsentDemoForPatient(pid: string, suffix: string) {
    if (!(EHR_RECORDS.get(pid) || []).length) {
      const t = nowIso();
      EHR_RECORDS.set(pid, [
        {
          recordId: `rec-demo-${suffix}-cbc`,
          patientUserId: pid,
          category: 'Laboratory Report',
          title: 'Complete Blood Count (CBC)',
          status: 'active',
          createdAt: t,
          versions: [{ versionId: `ver-demo-${suffix}-cbc-1`, versionNumber: 1, data: 'CBC panel — 18 Jul 2026. All values within normal reference range. Hemoglobin 13.9 g/dL, WBC 6.1, Platelets 244. Synthetic demo data.', createdBy: 'patient', createdAt: t }]
        },
        {
          recordId: `rec-demo-${suffix}-metformin`,
          patientUserId: pid,
          category: 'Medication',
          title: 'Metformin 500 mg — twice daily',
          status: 'active',
          createdAt: t,
          versions: [{ versionId: `ver-demo-${suffix}-mtf-1`, versionNumber: 1, data: 'Synthetic demo medication record. Metformin 500 mg with food, twice daily, started 12 Jun 2026. This is sample information, not a prescription.', createdBy: 'patient', createdAt: t }]
        },
        {
          recordId: `rec-demo-${suffix}-note`,
          patientUserId: pid,
          category: 'Clinical Note',
          title: 'Annual check-up summary',
          status: 'active',
          createdAt: t,
          versions: [{ versionId: `ver-demo-${suffix}-note-1`, versionNumber: 1, data: 'Synthetic demo note. Annual check-up 02 Jul 2026. BP 118/76, HR 72. Sample content only; not medical advice.', createdBy: 'patient', createdAt: t }]
        }
      ]);
    }

    if (!(DOCTOR_ACCESS.get(pid) || []).some((g) => g.doctorId === 'doc-1')) {
      DOCTOR_ACCESS.set(pid, [
        {
          accessId: `acc-demo-${suffix}`,
          patientUserId: pid,
          doctorId: 'doc-1',
          scope: ['profile', 'clinical', 'medications', 'allergies', 'labs', 'prescriptions', 'documents'],
          canView: true,
          isEmergency: false,
          status: 'active',
          grantedAt: new Date(Date.now() - 353 * 86400000).toISOString(),
          expiresAt: new Date(Date.now() + 12 * 86400000).toISOString(),
          revokedAt: null,
          lastViewedAt: new Date(Date.now() - 3 * 3600000).toISOString()
        }
      ]);
    }

    if (!(CONSENT_REQUESTS.get(pid) || []).length) {
      const req: ConsentRequest = {
        requestId: `GH-REQ-DEMO${suffix}`,
        patientUserId: pid,
        doctorId: 'doc-1',
        kind: 'add',
        recordCategory: 'Laboratory Report',
        title: 'Add recent HbA1c laboratory results',
        summary: 'Add the HbA1c and fasting blood glucose results from a recent synthetic consultation.',
        reason: 'This synthetic request demonstrates how patient consent works before a record is changed.',
        explanation: 'Sample request only. No real clinic visit or laboratory result is associated with this demo.',
        proposedValue: 'Synthetic sample: HbA1c 6.4%, fasting glucose 112 mg/dL. This is not a real result and must not be used for care.',
        clarifications: [],
        status: 'pending',
        priority: 'normal',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
      };
      CONSENT_REQUESTS.set(pid, [req]);
      audit(null, {
        patientUserId: pid,
        actorId: 'doc-1',
        actorRole: 'DOCTOR',
        eventType: 'EHR_MODIFICATION_REQUESTED',
        resourceType: 'ConsentRequest',
        resourceId: req.requestId,
        requestId: req.requestId,
        recordCategory: req.recordCategory,
        newState: 'pending:add',
        accessPermission: 'REQUEST_EHR_ADD (consent required)',
        result: 'pending',
        detail: req.reason
      });
    }
  }

  // Keep Sarah's historical local fixture relationship, but never attach it to
  // a deployed public account. New public visitors are seeded on demand above.
  if (config.nodeEnv === 'development' && config.publicDemoEnabled) {
    const sarah = [...PUBLIC_USERS.values()].find((u) => u.email === 'sarah.jenkins@example.com');
    if (sarah) seedConsentDemoForPatient(sarah.id, 'LOCAL');
  }

  // ---------------- DOCTOR AUTH -----------------------------------------
  const DOCTOR_LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();

  // Real server-side sessions. Tokens are cryptographically random and map to
  // exactly ONE doctorId — a token can no longer be crafted from a doctor id
  // (the old `doc-sess-<doctorId>` scheme was forgeable). Sessions expire and
  // slide forward while in use; logout destroys them server-side.
  interface DoctorSession {
    token: string;
    doctorId: string;
    issuedAt: string;
    lastSeenAt: string;
    expiresAt: number;
  }
  const DOCTOR_SESSIONS: Map<string, DoctorSession> = new Map();
  const DOCTOR_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours, sliding

  const issueDoctorSession = (doctorId: string): DoctorSession => {
    // Opportunistic cleanup of expired sessions.
    for (const [t, s] of DOCTOR_SESSIONS) {
      if (s.expiresAt < Date.now()) DOCTOR_SESSIONS.delete(t);
    }
    const session: DoctorSession = {
      token: secureToken("doc-sess"),
      doctorId,
      issuedAt: nowIso(),
      lastSeenAt: nowIso(),
      expiresAt: Date.now() + DOCTOR_SESSION_TTL_MS
    };
    DOCTOR_SESSIONS.set(session.token, session);
    return session;
  };

  const publicDoctorView = (d: ConsentDoctor, session?: DoctorSession) => ({
    doctorId: d.doctorId,
    fullName: d.fullName,
    username: d.username || '',
    email: d.email || '',
    organization: d.organization,
    specialty: d.specialty,
    role: d.role || 'Consultant',
    department: d.department || '',
    registrationNo: d.registrationNo,
    verificationStatus: d.verificationStatus,
    ...(session ? { sessionExpiresAt: new Date(session.expiresAt).toISOString() } : {})
  });

  function authenticateDoctor(req: any): ConsentDoctor | null {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const session = DOCTOR_SESSIONS.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      DOCTOR_SESSIONS.delete(token);
      return null;
    }
    const doctor = DOCTORS.get(session.doctorId);
    if (!doctor || doctor.status !== 'ACTIVE' || doctor.verificationStatus !== 'VERIFIED') return null;
    // Sliding expiry: authenticated use extends the session.
    session.expiresAt = Date.now() + DOCTOR_SESSION_TTL_MS;
    session.lastSeenAt = nowIso();
    (req as any).doctorSession = session;
    return doctor;
  }

  function requireDoctor(req: any, res: any, next: any) {
    const doctor = authenticateDoctor(req);
    if (!doctor) {
      return res.status(401).json({
        success: false,
        code: 'DOCTOR_AUTH_REQUIRED',
        error: 'Verified doctor sign-in is required for this action.'
      });
    }
    req.authDoctor = doctor;
    next();
  }

  app.post('/api/doctor/auth/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const rl = checkRateLimit(DOCTOR_LOGIN_ATTEMPTS, String(identifier || '').toLowerCase(), 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        isLockedOut: true,
        lockoutMinutesRemaining: Math.ceil(rl.retryInMs / 60000),
        error: `Too many sign-in attempts. Please try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.`
      });
    }

    const cleanId = String(identifier || '').trim().toLowerCase();
    const doctor =
      [...DOCTORS.values()].find(
        (d) =>
          (d.username && d.username.toLowerCase() === cleanId) ||
          (d.email && d.email.toLowerCase() === cleanId) ||
          d.doctorId.toLowerCase() === cleanId ||
          d.registrationNo.toLowerCase() === cleanId ||
          d.fullName.toLowerCase() === cleanId
      ) || null;

    if (!doctor || !verifySecret(doctor.doctorId, String(password || ''), doctor.passwordHash)) {
      registerFailedAttempt(DOCTOR_LOGIN_ATTEMPTS, cleanId, 15 * 60 * 1000);
      audit(null, {
        actorId: doctor?.doctorId || 'unknown',
        actorRole: 'DOCTOR',
        eventType: 'DOCTOR_LOGIN_FAILED',
        result: 'failed',
        detail: 'Incorrect doctor credentials'
      });
      return res.status(401).json({ success: false, error: 'Incorrect doctor credentials.' });
    }
    if (doctor.passwordHash.startsWith('pbkdf2-sha256$')) {
      doctor.passwordHash = hashSecret(doctor.doctorId, String(password || ''));
      DOCTORS.set(doctor.doctorId, doctor);
    }
    if (doctor.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ success: false, error: 'This doctor account is awaiting verification.' });
    }
    if (doctor.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: 'This doctor account is suspended. Contact the credentialing office.' });
    }
    DOCTOR_LOGIN_ATTEMPTS.delete(cleanId);
    const session = issueDoctorSession(doctor.doctorId);
    audit(req, {
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'DOCTOR_LOGIN',
      result: 'success',
      sessionId: session.token.slice(0, 16) + '…',
      detail: 'Verified doctor signed in to the doctor portal'
    });
    return res.json({
      success: true,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      doctor: publicDoctorView(doctor, session)
    });
  });

  // ---- Change password from an active session ----
  app.post('/api/doctor/auth/change-password', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { oldPassword, newPassword } = req.body || {};
    if (!verifySecret(doctor.doctorId, String(oldPassword || ''), doctor.passwordHash)) {
      audit(req, { actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'DOCTOR_PASSWORD_CHANGE', result: 'failed', detail: 'Current password incorrect' });
      return res.status(400).json({ success: false, code: 'OLD_PASSWORD_WRONG', error: 'Current password entered is incorrect.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'New password must be at least 8 characters.' });
    }
    doctor.passwordHash = hashSecret(doctor.doctorId, String(newPassword));
    // Revoke every OTHER session for this doctor (keep the current one).
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    for (const [t, s] of DOCTOR_SESSIONS) {
      if (s.doctorId === doctor.doctorId && t !== currentToken) DOCTOR_SESSIONS.delete(t);
    }
    audit(req, { actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'DOCTOR_PASSWORD_CHANGE', result: 'success', detail: `Password changed in active session by @${doctor.username}; other sessions revoked.` });
    return res.json({ success: true, message: 'Password updated successfully.' });
  });

  // ---- Session validation (bootstrap / refresh) ----
  app.get('/api/doctor/auth/me', requireDoctor, (req: any, res) => {
    return res.json({
      success: true,
      doctor: publicDoctorView(req.authDoctor, req.doctorSession)
    });
  });

  // ---- Logout: destroys the server-side session ----
  app.post('/api/doctor/auth/logout', requireDoctor, (req: any, res) => {
    const session: DoctorSession = req.doctorSession;
    DOCTOR_SESSIONS.delete(session.token);
    audit(req, {
      actorId: req.authDoctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'DOCTOR_LOGOUT',
      result: 'success',
      detail: 'Doctor session terminated by user'
    });
    return res.json({ success: true });
  });

  // ---- Account provisioning (called by the portal's activation flow after
  // the Hospital Authority issues a single-use activation token). ----
  app.post('/api/doctor/auth/register', (req, res) => {
    if (!process.env.GH_ADMIN_KEY || req.headers['x-admin-key'] !== process.env.GH_ADMIN_KEY) {
      return res.status(403).json({ success: false, code: 'PROVISIONING_REQUIRED', error: 'This professional account must be provisioned by your verified organization. Contact your organization administrator.' });
    }

    const b = req.body || {};
    const username = String(b.username || '').trim().toLowerCase();
    const password = String(b.password || '');
    const doctorId = String(b.doctorId || '').trim();

    if (!/^[a-z0-9_.]{4,32}$/.test(username)) {
      return res.status(400).json({ success: false, code: 'INVALID_USERNAME', error: 'Username must be 4–32 characters (letters, numbers, dot or underscore).' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters long.' });
    }
    if (!b.fullName || String(b.fullName).trim().length < 3) {
      return res.status(400).json({ success: false, code: 'INVALID_NAME', error: 'Full name is required.' });
    }
    if ([...DOCTORS.values()].some((d) => (d.username || '').toLowerCase() === username)) {
      return res.status(409).json({ success: false, code: 'USERNAME_TAKEN', error: 'This username is already taken. Please choose another.' });
    }
    if (doctorId && DOCTORS.has(doctorId)) {
      return res.status(409).json({ success: false, code: 'DOCTOR_EXISTS', error: 'A server account already exists for this doctor. Please sign in or reset your password.' });
    }

    const newDoctorId = doctorId || `doc-${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
    const doctor: ConsentDoctor = {
      doctorId: newDoctorId,
      fullName: String(b.fullName).trim().slice(0, 120),
      organization: String(b.organization || 'GlobalHealth Partner Hospital').slice(0, 160),
      specialty: String(b.specialty || 'General Practice').slice(0, 120),
      registrationNo: String(b.registrationNo || `MB-${Date.now().toString(36).toUpperCase()}`).slice(0, 60),
      username,
      email: String(b.email || `${username}@medauth.org`).trim().toLowerCase().slice(0, 160),
      role: String(b.role || 'Consultant').slice(0, 80),
      department: String(b.department || 'Medical Department').slice(0, 120),
      passwordHash: hashSecret(newDoctorId, password),
      // The Hospital Authority activation token was verified by the portal's
      // credentialing engine before this call; the account is created ACTIVE.
      verificationStatus: 'VERIFIED',
      status: 'ACTIVE'
    };
    DOCTORS.set(newDoctorId, doctor);
    audit(req, {
      actorId: newDoctorId,
      actorRole: 'DOCTOR',
      eventType: 'DOCTOR_ACCOUNT_ACTIVATED',
      result: 'success',
      detail: `Doctor portal account provisioned for @${username} (${doctor.fullName})`
    });
    return res.status(201).json({ success: true, doctor: publicDoctorView(doctor) });
  });

  // ---- Password recovery (server-issued, single-use, 1-hour tokens) ----
  const DOCTOR_RESET_TOKENS: Map<string, { token: string; doctorId: string; expiresAt: number; used: boolean; attempts: number }> = new Map();

  app.post('/api/doctor/auth/request-reset', (req, res) => {
    const cleanId = String(req.body?.usernameOrEmail || '').trim().toLowerCase();
    const generic = {
      success: true,
      message: 'If the information provided matches an eligible Doctor Portal account, password reset instructions will be sent to the registered contact method.'
    };
    const doctor = [...DOCTORS.values()].find(
      (d) => (d.username || '').toLowerCase() === cleanId || (d.email || '').toLowerCase() === cleanId
    );
    if (!doctor) {
      audit(null, { actorId: 'unknown', actorRole: 'DOCTOR', eventType: 'DOCTOR_RESET_REQUESTED', result: 'unknown', detail: 'Reset requested for unknown identifier (generic response).' });
      return res.json(generic);
    }
    // Invalidate previous unused tokens for this doctor.
    for (const [t, r] of DOCTOR_RESET_TOKENS) {
      if (r.doctorId === doctor.doctorId && !r.used) DOCTOR_RESET_TOKENS.delete(t);
    }
    const record = {
      token: secureToken("rst-doc"),
      doctorId: doctor.doctorId,
      expiresAt: Date.now() + 60 * 60 * 1000,
      used: false,
      attempts: 0
    };
    DOCTOR_RESET_TOKENS.set(record.token, record);
    audit(req, { actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'DOCTOR_RESET_REQUESTED', result: 'success', detail: `Password reset token issued for @${doctor.username}` });
    // Demo environment: delivery is simulated, so the token is returned.
    return res.json({ ...generic, ...(IS_PRODUCTION ? {} : { demoResetToken: record.token }) });
  });

  app.post('/api/doctor/auth/complete-reset', (req, res) => {
    const { resetToken, newPassword } = req.body || {};
    const record = DOCTOR_RESET_TOKENS.get(String(resetToken || '').trim());
    if (!record || record.used || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, code: 'RESET_INVALID', error: 'The reset link could not be verified or has expired. Please request a new one.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'The new password must be at least 8 characters long.' });
    }
    if (String(req.body?.code || '') !== '') {
      // Reserved for future email-code verification; tokens are the demo flow.
    }
    record.used = true;
    DOCTOR_RESET_TOKENS.delete(record.token);
    const doctor = DOCTORS.get(record.doctorId);
    if (!doctor) return res.status(404).json({ success: false, code: 'ACCOUNT_NOT_FOUND', error: 'This doctor account no longer exists.' });
    doctor.passwordHash = hashSecret(doctor.doctorId, String(newPassword));
    // Revoke all active sessions for this doctor — reset invalidates old logins.
    for (const [t, s] of DOCTOR_SESSIONS) {
      if (s.doctorId === doctor.doctorId) DOCTOR_SESSIONS.delete(t);
    }
    audit(req, { actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'DOCTOR_PASSWORD_RESET', result: 'success', detail: `Password reset completed for @${doctor.username}; all sessions revoked.` });
    return res.json({ success: true, message: 'Your password has been reset. Please sign in with your new password.' });
  });

  // ---- Professional onboarding application -----------------------------
  // This endpoint accepts a review request but deliberately does not create an
  // ACTIVE doctor account. Credential documents are stored behind the server
  // attachment boundary and only their metadata is returned to the browser.
  app.post('/api/doctor/auth/applications', (req: any, res: any) => {
    const rate = hitRateLimit('doctor-application', String(req.ip || 'anonymous'), 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many verification requests. Please try again later.' });
    }
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const password = String(body.password || '');
    const registrationNo = String(body.registrationNo || '').trim();
    const registrationAuthority = String(body.registrationAuthority || '').trim();
    const organization = String(body.organization || '').trim();
    if (!fullName || fullName.length < 3) return res.status(400).json({ success: false, error: 'Full professional name is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'A valid professional email is required.' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    if (!registrationNo || !registrationAuthority || !organization) return res.status(400).json({ success: false, error: 'Organization and registration details are required.' });
    if ([...DOCTORS.values()].some((d) => (d.email || '').toLowerCase() === email)) {
      return res.status(409).json({ success: false, code: 'ACCOUNT_EXISTS', error: 'An account already exists for this professional email. Please sign in or recover the account.' });
    }
    const duplicate = [...DOCTOR_APPLICATIONS.values()].find((a) => a.email === email && a.status === 'PENDING_REVIEW');
    if (duplicate) return res.status(409).json({ success: false, code: 'APPLICATION_EXISTS', error: 'A verification request is already pending for this email.', applicationId: duplicate.applicationId });

    const docs = Array.isArray(body.credentialDocuments) ? body.credentialDocuments.slice(0, 3) : [];
    const attachments: any[] = [];
    for (const doc of docs) {
      const checked = validateAttachment(doc?.dataUrl, doc?.name);
      if (checked.error) return res.status(400).json({ success: false, error: checked.error });
      if (checked.ref) attachments.push(checked.ref);
    }
    if (!attachments.length) return res.status(400).json({ success: false, error: 'At least one credential document is required for review.' });

    const applicationId = `DAPP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const application = {
      applicationId,
      status: 'PENDING_REVIEW',
      submittedAt: nowIso(),
      fullName: fullName.slice(0, 120),
      email: email.slice(0, 160),
      phone: String(body.phone || '').slice(0, 40),
      organization: organization.slice(0, 160),
      professionalTitle: String(body.professionalTitle || 'Clinician').slice(0, 100),
      specialty: String(body.specialty || 'General Medicine').slice(0, 120),
      qualifications: Array.isArray(body.qualifications) ? body.qualifications.map((q: unknown) => String(q).slice(0, 120)).slice(0, 12) : [],
      registrationAuthority: registrationAuthority.slice(0, 160),
      registrationNo: registrationNo.slice(0, 80),
      licenseExpiry: body.licenseExpiry ? String(body.licenseExpiry).slice(0, 30) : undefined,
      credentialDocuments: attachments,
      passwordHash: hashSecret(applicationId, password),
      reviewNotes: '',
      affiliationFacility: String(body.affiliationFacility || '').slice(0, 80),
      affiliationDepartment: String(body.affiliationDepartment || '').slice(0, 120),
      consultationTypes: Array.isArray(body.consultationTypes) ? body.consultationTypes.slice(0, 8).map((v: unknown) => String(v)) : [],
      appointmentDuration: Number(body.appointmentDuration) || 30
    };
    DOCTOR_APPLICATIONS.set(applicationId, application);
    audit(req, {
      actorId: applicationId,
      actorRole: 'SYSTEM',
      eventType: 'DOCTOR_APPLICATION_SUBMITTED',
      resourceType: 'DoctorApplication',
      resourceId: applicationId,
      result: 'pending',
      detail: 'Professional verification application submitted for organization review.'
    });
    return res.status(201).json({
      success: true,
      applicationId,
      status: application.status,
      message: 'Your verification request was submitted. An authorized organization must review it before any Doctor Portal account is activated.'
    });
  });

  // ---------------- RELATIONSHIP / PERMISSION HELPERS -------------------
  // An ACTIVE grant is a valid, unexpired, non-revoked relationship.
  const activeGrant = (patientUserId: string, doctorId: string): AccessGrant | undefined => {
    const list = DOCTOR_ACCESS.get(patientUserId) || [];
    return list.find((g) => {
      if (g.doctorId !== doctorId || g.status !== 'active' || !g.canView) return false;
      if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) return false;
      return true;
    });
  };

  // Derived relationship state shown in the patient/doctor UI.
  const grantDerivedStatus = (g: AccessGrant): 'active' | 'expiring' | 'expired' | 'revoked' => {
    if (g.status === 'revoked') return 'revoked';
    if (g.status === 'expired' || (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now())) return 'expired';
    if (g.expiresAt && new Date(g.expiresAt).getTime() - Date.now() < 30 * 86400000) return 'expiring';
    return 'active';
  };

  // Granular permission flags. VIEW is separate from every modify flag, and
  // modify flags always resolve to CONSENT_REQUIRED — a verified doctor can
  // only ever REQUEST a change, never apply one directly.
  const grantPermissions = (g: AccessGrant) => {
    const live = g.status === 'active' && !(g.expiresAt && new Date(g.expiresAt).getTime() < Date.now());
    return {
      VIEW_EHR: live && g.canView,
      REQUEST_EHR_ADD: live && !g.isEmergency,
      REQUEST_EHR_EDIT: live && !g.isEmergency,
      REQUEST_EHR_REMOVE: live && !g.isEmergency,
      MODIFY_EHR: live ? (g.isEmergency ? 'VIEW_ONLY' : 'CONSENT_REQUIRED') : 'NO_ACCESS',
      DELETE_EHR: live ? (g.isEmergency ? 'VIEW_ONLY' : 'CONSENT_REQUIRED') : 'NO_ACCESS',
      APPROVE_EHR_CHANGE: live && !g.isEmergency, // patient-side: the patient always decides
      REVOKE_DOCTOR_ACCESS: live
    };
  };

  // Permitted access scopes for a doctor's access request.
  const ACCESS_SCOPES = ['profile', 'clinical', 'medications', 'allergies', 'labs', 'prescriptions', 'imaging', 'documents', 'appointments', 'emergency'];
  const DEFAULT_ACCESS_SCOPE = ['profile', 'clinical', 'medications', 'allergies', 'labs', 'prescriptions', 'documents'];
  const ACCESS_DURATIONS = [30, 90, 365];

  // Map an EHR record category to the access-grant scope key that covers it.
  const CATEGORY_SCOPE: Record<string, string> = {
    'Patient Overview': 'profile',
    'Clinical Note': 'clinical',
    Diagnosis: 'clinical',
    'Treatment History': 'clinical',
    Procedure: 'clinical',
    Consultation: 'clinical',
    Medication: 'medications',
    Prescription: 'prescriptions',
    'Medication History': 'medications',
    Allergy: 'allergies',
    'Laboratory Report': 'labs',
    'Lab Report': 'labs',
    'Imaging Report': 'imaging',
    Document: 'documents',
    'Emergency Information': 'emergency',
    Appointment: 'appointments'
  };
  const scopeForCategory = (category?: string) => CATEGORY_SCOPE[category || ''] || 'clinical';

  // Lazily expire due consent requests + grants (on read), with audit trail.
  const expireStale = (patientUserId: string) => {
    const reqs = CONSENT_REQUESTS.get(patientUserId) || [];
    reqs.forEach((r) => {
      if (r.status === 'pending' && new Date(r.expiresAt).getTime() < Date.now()) {
        r.status = 'expired';
        DECIDED_REQUESTS.set(r.requestId, nowIso());
        audit(null, {
          patientUserId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          eventType: 'CONSENT_REQUEST_EXPIRED',
          resourceType: 'ConsentRequest',
          resourceId: r.requestId,
          requestId: r.requestId,
          recordCategory: r.recordCategory,
          newState: 'expired',
          result: 'expired',
          detail: 'Pending consent request reached its expiry time. No change was applied.'
        });
        pushPatientNotification(patientUserId, {
          type: 'consent',
          title: 'A request has expired',
          body: `A consent request from ${docName(r.doctorId)} expired before a decision. No change was made to your record.`,
          requestId: r.requestId
        });
        pushDoctorNotification(r.doctorId, {
          type: 'expired',
          title: 'Your request expired',
          body: `Your request “${r.title}” expired without a patient decision. No change was applied. You may submit a new request.`,
          requestId: r.requestId,
          patientName: PUBLIC_USERS.get(patientUserId)?.fullName
        });
        sendGmail(patientUserId, {
          type: 'REQUEST_EXPIRED',
          subject: 'GlobalHealth: A consent request has expired',
          body: `A consent request from ${docName(r.doctorId)} (${kindLabel(r.kind)} request) has expired without a decision. No change was made to your health record.\nRequest ID: ${r.requestId}`,
          requestId: r.requestId
        });
      }
    });
    (DOCTOR_ACCESS.get(patientUserId) || []).forEach((g) => {
      if (g.status === 'active' && g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) {
        g.status = 'expired';
        audit(null, {
          patientUserId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          eventType: 'DOCTOR_ACCESS_EXPIRED',
          resourceType: 'AccessGrant',
          resourceId: g.accessId,
          newState: 'expired',
          result: 'completed',
          detail: `View access for ${docName(g.doctorId)} expired.`
        });
        pushPatientNotification(patientUserId, {
          type: 'access',
          title: 'Doctor access expired',
          body: `View access for ${docName(g.doctorId)} has expired.`
        });
      }
    });
  };

  // Resolve the patient owner id from a request, ALWAYS server-side.
  const resolvePatient = (req: any): { patientUserId?: string; error?: any } => {
    let { patientUserId } = req.body || {};
    if (!patientUserId && req.body?.patientEmail) {
      const email = String(req.body.patientEmail).trim().toLowerCase();
      const found = [...PUBLIC_USERS.values()].find((u) => u.email.toLowerCase() === email);
      if (!found) return { error: res404('No GlobalHealth patient account matches that email.') };
      patientUserId = found.id;
    }
    return { patientUserId };
  };
  const res404 = (msg: string) => ({ __status: 404, __body: { success: false, error: msg } });

  // Attachment validation: type allowlist, size cap, safe storage.
  const ATTACH_ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  const ATTACH_MAX_BYTES = 2 * 1024 * 1024;
  const validateAttachment = (dataUrl?: string, fileName?: string): { ref?: AttachmentRef; error?: string } => {
    if (!dataUrl) return {};
    const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl));
    if (!m) return { error: 'Invalid attachment format.' };
    const contentType = m[1];
    if (!ATTACH_ALLOWED.includes(contentType)) {
      return { error: `File type not allowed. Permitted: PDF, PNG, JPEG, WEBP.` };
    }
    const sizeBytes = Math.floor((m[2].length * 3) / 4);
    if (sizeBytes > ATTACH_MAX_BYTES) return { error: 'Attachment too large (maximum 2 MB).' };
    const name = String(fileName || 'attachment').slice(0, 120).replace(/[^\w.\- ()]/g, '_');
    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ref: AttachmentRef & { dataUrl: string } = {
      attachmentId,
      name,
      contentType,
      sizeBytes,
      uploadedAt: nowIso(),
      dataUrl
    };
    ATTACHMENTS.set(attachmentId, ref);
    return { ref: { attachmentId, name, contentType, sizeBytes, uploadedAt: ref.uploadedAt } };
  };

  // ---------------------- DOCTOR: MY PATIENTS ---------------------------
  app.get('/api/doctor/patients', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    // A doctor only ever sees patients with an ACTIVE grant — never a global
    // patient list. (Prevents cross-patient discovery.)
    const patients: any[] = [];
    for (const [patientUserId, grants] of DOCTOR_ACCESS.entries()) {
      const grant = grants.find((g) => g.doctorId === doctor.doctorId && g.status === 'active' && g.canView && !(g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()));
      if (!grant) continue;
      const user = PUBLIC_USERS.get(patientUserId);
      const reqs = (CONSENT_REQUESTS.get(patientUserId) || []).filter((r) => r.doctorId === doctor.doctorId);
      const records = (EHR_RECORDS.get(patientUserId) || []).filter((r) => r.status === 'active');
      patients.push({
        patientUserId,
        patientIdentifier: `PAT-${patientUserId.replace(/^usr-/, '').toUpperCase()}`,
        dataSource: IS_PRODUCTION ? 'server' : 'development-seed',
        patientName: user ? user.fullName : 'Authorized patient',
        accessStatus: grant.isEmergency ? 'emergency' : grantDerivedStatus(grant),
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        scope: grant.scope,
        canView: grant.canView,
        lastViewedAt: grant.lastViewedAt || null,
        permissions: grantPermissions(grant),
        modificationAccess: 'PATIENT_APPROVAL_REQUIRED',
        pendingConsentCount: reqs.filter((r) => r.status === 'pending').length,
        recordCategories: [...new Set(records.map((r) => r.category))]
      });
    }
    return res.json({ success: true, patients });
  });

  // ---------------------- DOCTOR: VIEW AUTHORIZED EHR -------------------
  app.get('/api/doctor/patients/:patientUserId/ehr', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { patientUserId } = req.params;
    expireStale(patientUserId);
    const grant = activeGrant(patientUserId, doctor.doctorId);

    if (!grant) {
      // Log the denied attempt; reveal nothing about the patient.
      audit(req, {
        patientUserId,
        actorId: doctor.doctorId,
        actorRole: 'DOCTOR',
        eventType: 'EHR_ACCESS_DENIED',
        resourceType: 'EHR',
        resourceId: patientUserId,
        result: 'denied',
        detail: 'No active patient-doctor access relationship. Attempt blocked and recorded.'
      });
      return res.status(403).json({
        success: false,
        code: 'ACCESS_RESTRICTED',
        error: 'Access restricted. You do not have permission to access this patient’s protected health information.'
      });
    }

    const user = PUBLIC_USERS.get(patientUserId);
    const scope = grant.scope;
    const records = (EHR_RECORDS.get(patientUserId) || []).filter(
      (r) => r.status === 'active' && scope.includes(scopeForCategory(r.category))
    );
    // Patient overview: only fields covered by the grant's scope.
    const overview: any = {};
    if (scope.includes('profile')) overview.name = user?.fullName || 'Patient';
    if (scope.includes('allergies')) {
      const privateProfile = PRIVATE_DATA.get(patientUserId) as any;
      overview.allergies = Array.isArray(privateProfile?.ehr?.allergies) ? privateProfile.ehr.allergies.slice(0, 20).map((value: unknown) => String(value)) : [];
    }
    if (scope.includes('medications')) overview.currentMedications = records.filter((r) => scopeForCategory(r.category) === 'medications').map((r) => r.title);

    audit(req, {
      patientUserId,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: grant.isEmergency ? 'EMERGENCY_ACCESS_USED' : 'DOCTOR_VIEWED_EHR',
      resourceType: 'EHR',
      resourceId: patientUserId,
      accessPermission: 'VIEW_EHR',
      result: 'success',
      detail: grant.isEmergency
        ? `Emergency (break-glass) view — reason: ${grant.emergencyReason || 'n/a'}`
        : `Viewed authorized record (scope: ${scope.join(', ')})`
    });
    grant.lastViewedAt = nowIso();

    pushPatientNotification(patientUserId, {
      type: grant.isEmergency ? 'security' : 'doctor_access',
      title: grant.isEmergency ? 'Emergency access used' : 'A doctor accessed your record',
      body: grant.isEmergency
        ? `${doctor.fullName} used time-limited emergency access to view your record. Reason on file.`
        : `${doctor.fullName} viewed your authorized health record.`,
      requestId: undefined
    });
    if (grant.isEmergency) {
      sendGmail(patientUserId, {
        type: 'SECURITY_ALERT',
        subject: 'GlobalHealth: Security alert on your account',
        body: `A verified doctor (${doctor.fullName}, ${doctor.organization}) activated emergency (break-glass) view access to your health record for a limited period.\nThis action is time-limited, view-only, and has been recorded in your security history.`
      });
    }

    return res.json({
      success: true,
      dataSource: IS_PRODUCTION ? 'server' : 'development-seed',
      viewAccess: 'ACTIVE',
      modificationAccess: 'PATIENT_APPROVAL_REQUIRED',
      emergency: grant.isEmergency || null,
      emergencyExpiresAt: grant.isEmergency && grant.expiresAt ? grant.expiresAt : null,
      patient: {
        name: scope.includes('profile') ? (user?.fullName || 'Authorized patient') : 'Authorized patient',
        overview,
        recordStatus: {
          viewAccess: 'Active',
          modificationAccess: 'Patient Approval Required',
          deletionAccess: 'Patient Approval Required'
        }
      },
      grant: {
        scope,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        status: grantDerivedStatus(grant),
        permissions: grantPermissions(grant)
      },
      records: records.map((r) => ({
        recordId: r.recordId,
        category: r.category,
        title: r.title,
        currentVersion: r.versions.length,
        createdAt: r.createdAt,
        latest: r.versions[r.versions.length - 1]?.data
      }))
    });
  });

  // Doctor: version history of one record (view permission + scope check).
  app.get('/api/doctor/patients/:patientUserId/records/:recordId/versions', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { patientUserId, recordId } = req.params;
    const grant = activeGrant(patientUserId, doctor.doctorId);
    if (!grant) {
      audit(req, { patientUserId, actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'EHR_ACCESS_DENIED', resourceType: 'EHRVersion', resourceId: recordId, result: 'denied', detail: 'No active access to view record versions.' });
      return res.status(403).json({ success: false, code: 'ACCESS_RESTRICTED', error: 'Access restricted.' });
    }
    const record = (EHR_RECORDS.get(patientUserId) || []).find((r) => r.recordId === recordId);
    if (!record || !grant.scope.includes(scopeForCategory(record.category))) {
      return res.status(404).json({ success: false, error: 'This healthcare record could not be found.' });
    }
    audit(req, {
      patientUserId,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'DOCTOR_VIEWED_EHR',
      resourceType: 'EHRVersion',
      resourceId: recordId,
      recordCategory: record.category,
      accessPermission: 'VIEW_EHR',
      result: 'success',
      detail: `Viewed version history (${record.versions.length} versions).`
    });
    return res.json({
      success: true,
      record: {
        recordId: record.recordId,
        category: record.category,
        title: record.title,
        status: record.status,
        versions: record.versions.map((v) => ({
          versionId: v.versionId,
          versionNumber: v.versionNumber,
          data: v.data,
          createdBy: v.createdBy === 'patient' ? 'Patient' : docName(v.createdBy),
          sourceRequestId: v.sourceRequestId || null,
          createdAt: v.createdAt
        }))
      }
    });
  });

  // ---------------- DOCTOR: CREATE A CONSENT REQUEST -------------------
  app.post('/api/doctor/consent-requests', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const resolved = resolvePatient(req);
    if (resolved.error) return res.status(resolved.error.__status).json(resolved.error.__body);
    const { patientUserId } = resolved;
    let { kind, recordCategory, recordId, title, summary, reason, explanation, currentValue, proposedValue, priority, deletionType, attachmentDataUrl, attachmentName, validityDays, requestedScope, accessDurationDays } = req.body || {};

    if (!patientUserId || !kind || !title || !reason) {
      return res.status(400).json({ success: false, error: 'Patient, request type, title and reason are required.' });
    }
    const validKinds: ConsentKind[] = ['access_grant', 'add', 'edit', 'remove'];
    if (!validKinds.includes(kind)) {
      return res.status(400).json({ success: false, error: 'Invalid request type.' });
    }
    if (String(reason).trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Please describe the clinical reason in at least 10 characters.' });
    }

    expireStale(patientUserId);
    const grant = activeGrant(patientUserId, doctor.doctorId);

    // RULE 1: any modification request requires a valid relationship.
    // (An emergency break-glass grant is VIEW-ONLY and cannot be used to
    // request modifications — it is not a shortcut around consent.)
    if (kind !== 'access_grant') {
      if (!grant) {
        audit(req, { patientUserId, actorId: doctor.doctorId, actorRole: 'DOCTOR', eventType: 'EHR_MODIFICATION_REQUEST_DENIED', resourceType: 'ConsentRequest', result: 'denied', detail: `No active access relationship; ${kind} request blocked.` });
        return res.status(403).json({ success: false, code: 'ACCESS_RESTRICTED', error: 'Access restricted. You do not have an active access relationship with this patient.' });
      }
      if (grant.isEmergency) {
        return res.status(403).json({ success: false, code: 'EMERGENCY_VIEW_ONLY', error: 'Emergency access is view-only. Establish an approved relationship before requesting changes.' });
      }
      if (kind === 'add' && !recordCategory) {
        return res.status(400).json({ success: false, error: 'A record category is required for new records.' });
      }
      if ((kind === 'edit' || kind === 'remove') && !recordId) {
        return res.status(400).json({ success: false, error: 'An existing record must be selected for edit or removal.' });
      }
      if ((kind === 'edit' || kind === 'remove') && recordId) {
        const target = (EHR_RECORDS.get(patientUserId) || []).find((r) => r.recordId === recordId && r.status === 'active');
        if (!target) return res.status(404).json({ success: false, error: 'The selected record could not be found or is no longer active.' });
        if (!grant.scope.includes(scopeForCategory(target.category))) {
          return res.status(403).json({ success: false, code: 'SCOPE_RESTRICTED', error: 'Your access scope does not cover this record category.' });
        }
        if (!currentValue) currentValue = target.versions[target.versions.length - 1]?.data;
      }
    }

    if (kind === 'remove') {
      if (deletionType && !['archive', 'permanent'].includes(deletionType)) {
        return res.status(400).json({ success: false, error: 'Deletion type must be "archive" or "permanent".' });
      }
      deletionType = deletionType || 'archive'; // retention-safe default
    }

    // Access request: scope + duration are chosen by the doctor, validated
    // server-side against the allowlist.
    let requestScope: string[] | undefined;
    let accessDuration: number | undefined;
    if (kind === 'access_grant') {
      const raw = Array.isArray(requestedScope) ? requestedScope : null;
      const filtered = (raw ? raw : DEFAULT_ACCESS_SCOPE).map((s: any) => String(s));
      requestScope = filtered.filter((s) => ACCESS_SCOPES.includes(s));
      if (!requestScope.length) requestScope = [...DEFAULT_ACCESS_SCOPE];
      accessDuration = ACCESS_DURATIONS.includes(Number(accessDurationDays)) ? Number(accessDurationDays) : 365;
    }

    // Attachment validation + safe storage.
    let attachment: AttachmentRef | undefined;
    if (attachmentDataUrl) {
      const v = validateAttachment(attachmentDataUrl, attachmentName);
      if (v.error) return res.status(400).json({ success: false, error: v.error });
      attachment = v.ref;
    }

    // Duplicate-request protection: same doctor, same pending request.
    const existing = CONSENT_REQUESTS.get(patientUserId) || [];
    const duplicate = existing.find(
      (r) =>
        r.doctorId === doctor.doctorId &&
        r.status === 'pending' &&
        r.kind === kind &&
        r.recordCategory === recordCategory &&
        r.title === title
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_REQUEST',
        error: 'A similar request for this patient record is already pending.',
        requestId: duplicate.requestId
      });
    }

    const days = [1, 3, 7].includes(Number(validityDays)) ? Number(validityDays) : 7;
    const requestId = `GH-REQ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const cr: ConsentRequest = {
      requestId,
      patientUserId,
      doctorId: doctor.doctorId,
      kind,
      recordCategory,
      recordId,
      title: String(title).slice(0, 200),
      summary: String(summary || '').slice(0, 500),
      reason: String(reason).slice(0, 1000),
      explanation: explanation ? String(explanation).slice(0, 1000) : undefined,
      currentValue,
      proposedValue: proposedValue !== undefined ? String(proposedValue).slice(0, 4000) : undefined,
      deletionType: kind === 'remove' ? deletionType : undefined,
      priority: priority === 'high' ? 'high' : 'normal',
      attachment,
      clarifications: [],
      status: 'pending',
      // Version-conflict protection: snapshot the record's version count now.
      baseVersionNumber:
        kind === 'edit' || kind === 'remove'
          ? (EHR_RECORDS.get(patientUserId) || []).find((r) => r.recordId === recordId)?.versions.length
          : undefined,
      scope: kind === 'access_grant' ? requestScope : undefined,
      accessDurationDays: kind === 'access_grant' ? accessDuration : undefined,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    };
    CONSENT_REQUESTS.set(patientUserId, [...existing, cr]);

    audit(req, {
      patientUserId,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: kind === 'access_grant' ? 'ACCESS_REQUESTED' : 'EHR_MODIFICATION_REQUESTED',
      resourceType: 'ConsentRequest',
      resourceId: requestId,
      requestId,
      recordCategory,
      newState: `pending:${kind}`,
      accessPermission: kind === 'access_grant' ? 'ACCESS_REQUEST' : `REQUEST_EHR_${kind.toUpperCase()} (consent required)`,
      result: 'pending',
      detail: reason
    });

    pushPatientNotification(patientUserId, {
      type: 'consent',
      title: 'Patient consent required',
      body: `${doctor.fullName} requested to ${kindVerb(kind)} ${recordCategory || 'a health record'} in your EHR.`,
      requestId
    });
    if (kind === 'access_grant') {
      const scopeText = (requestScope || []).join(', ');
      sendGmail(patientUserId, {
        type: 'CONSENT_REQUEST',
        subject: 'GlobalHealth: Doctor Access Request',
        body: `${doctor.fullName} has requested access to selected information in your GlobalHealth health record.\n\nFrom: ${doctor.fullName}\nOrganization: ${doctor.organization}\nRequested information: ${scopeText}\nRequested duration: ${accessDuration} days\nRequest ID: ${requestId}\nSubmitted: ${new Date(cr.createdAt).toLocaleString()}\nExpires: ${new Date(cr.expiresAt).toLocaleString()}\n\nPlease log in to review and respond. Viewing access never includes the ability to change your record.`,
        requestId
      });
    } else {
      sendGmail(patientUserId, {
        type: 'CONSENT_REQUEST',
        subject: 'GlobalHealth: Patient Consent Required for EHR Change',
        body: `A verified healthcare professional has requested a change to your GlobalHealth health record.\n\nFrom: ${doctor.fullName}\nOrganization: ${doctor.organization}\nRequest type: ${kindLabel(kind)} ${recordCategory ? `— ${recordCategory}` : ''}\nRequest ID: ${requestId}\nSubmitted: ${new Date(cr.createdAt).toLocaleString()}\nStatus: Awaiting your decision\nExpires: ${new Date(cr.expiresAt).toLocaleString()}\n\nReview and decide inside your signed-in GlobalHealth account.`,
        requestId
      });
    }

    return res.status(201).json({ success: true, request: cr });
  });

  // ---------------- DOCTOR: STATUS OF THEIR REQUESTS -------------------
  app.get('/api/doctor/consent-requests', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const mine: (ConsentRequest & { patientName: string })[] = [];
    for (const [patientUserId, reqs] of CONSENT_REQUESTS.entries()) {
      for (const r of reqs) {
        if (r.doctorId === doctor.doctorId) {
          expireStaleNow(r, patientUserId);
          mine.push({ ...r, patientName: PUBLIC_USERS.get(patientUserId)?.fullName || 'Patient' });
        }
      }
    }
    function expireStaleNow(r: ConsentRequest, pid: string) {
      if (r.status === 'pending' && new Date(r.expiresAt).getTime() < Date.now()) {
        // Full expiration side-effects handled by expireStale on patient reads;
        // reflect status here too.
        r.status = 'expired';
        DECIDED_REQUESTS.set(r.requestId, nowIso());
        audit(null, { patientUserId: pid, actorId: 'SYSTEM', actorRole: 'SYSTEM', eventType: 'CONSENT_REQUEST_EXPIRED', resourceId: r.requestId, requestId: r.requestId, newState: 'expired', result: 'expired', detail: 'Pending consent request reached its expiry time.' });
        pushDoctorNotification(doctor.doctorId, { type: 'expired', title: 'Your request expired', body: `Your request “${r.title}” expired without a decision.`, requestId: r.requestId, patientName: PUBLIC_USERS.get(pid)?.fullName });
      }
    }
    mine.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ success: true, requests: mine });
  });

  // Doctor: cancel their own PENDING request (logged + patient notified).
  app.post('/api/doctor/consent-requests/:requestId/cancel', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { requestId } = req.params;
    let cr: ConsentRequest | undefined;
    let pid = '';
    for (const [p, reqs] of CONSENT_REQUESTS.entries()) {
      const found = reqs.find((r) => r.requestId === requestId);
      if (found) { cr = found; pid = p; break; }
    }
    if (!cr) return res.status(404).json({ success: false, error: 'This request could not be found.' });
    if (cr.doctorId !== doctor.doctorId) return res.status(403).json({ success: false, error: 'Access denied.' });
    if (cr.status !== 'pending') return res.status(409).json({ success: false, code: 'ALREADY_DECIDED', error: `This request has already been ${cr.status}.` });

    cr.status = 'cancelled';
    cr.reviewedAt = nowIso();
    DECIDED_REQUESTS.set(cr.requestId, nowIso());
    audit(req, {
      patientUserId: pid,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'CONSENT_REQUEST_CANCELLED',
      resourceType: 'ConsentRequest',
      resourceId: requestId,
      requestId,
      recordCategory: cr.recordCategory,
      newState: 'cancelled',
      result: 'cancelled',
      detail: 'Doctor cancelled their pending request before the patient decided. No change was applied.'
    });
    pushPatientNotification(pid, {
      type: 'consent',
      title: 'A request was cancelled',
      body: `${doctor.fullName} cancelled their pending request. No decision from you is needed and no change was made.`,
      requestId
    });
    sendGmail(pid, {
      type: 'REQUEST_CANCELLED',
      subject: 'GlobalHealth: A consent request was cancelled',
      body: `${doctor.fullName} cancelled a pending ${kindLabel(cr.kind)} request for your health record. No change was made.\nRequest ID: ${requestId}`,
      requestId
    });
    return res.json({ success: true, request: cr });
  });

  // Doctor: reply to a patient clarification (request stays pending).
  app.post('/api/doctor/consent-requests/:requestId/reply', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const { requestId } = req.params;
    const { message } = req.body || {};
    if (!message || String(message).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Please provide a short answer for the patient.' });
    }
    let cr: ConsentRequest | undefined;
    let pid = '';
    for (const [p, reqs] of CONSENT_REQUESTS.entries()) {
      const found = reqs.find((r) => r.requestId === requestId);
      if (found) { cr = found; pid = p; break; }
    }
    if (!cr) return res.status(404).json({ success: false, error: 'This request could not be found.' });
    if (cr.doctorId !== doctor.doctorId) return res.status(403).json({ success: false, error: 'Access denied.' });
    if (cr.status !== 'pending') return res.status(409).json({ success: false, error: 'This request has already been decided.' });

    cr.clarifications.push({ id: `cl-${Date.now()}`, from: 'DOCTOR', message: String(message).slice(0, 500), at: nowIso() });
    audit(req, {
      patientUserId: pid,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'CLARIFICATION_REPLIED',
      resourceType: 'ConsentRequest',
      resourceId: requestId,
      requestId,
      result: 'success',
      detail: 'Doctor answered the patient’s clarification question.'
    });
    pushPatientNotification(pid, {
      type: 'consent',
      title: 'Answer received',
      body: `${doctor.fullName} answered your question about their request.`,
      requestId
    });
    return res.json({ success: true, request: cr });
  });

  // ---------------- DOCTOR: NOTIFICATIONS -------------------------------
  app.get('/api/doctor/notifications', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const list = (DOCTOR_NOTIFICATIONS.get(doctor.doctorId) || []).slice(0, 50);
    return res.json({ success: true, notifications: list, unreadCount: list.filter((n) => !n.read).length });
  });

  app.post('/api/doctor/notifications/read', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    (DOCTOR_NOTIFICATIONS.get(doctor.doctorId) || []).forEach((n) => (n.read = true));
    return res.json({ success: true });
  });

  app.post('/api/doctor/notifications/:notificationId/read', requireDoctor, (req: any, res: any) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const notification = (DOCTOR_NOTIFICATIONS.get(doctor.doctorId) || []).find((n) => n.id === String(req.params.notificationId));
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found.' });
    notification.read = true;
    return res.json({ success: true });
  });

  // ---------------- DOCTOR: SCOPED AUDIT HISTORY ------------------------
  // A doctor can see their own actions (including denied attempts) and events
  // for an active relationship. No global audit export or patient discovery is
  // possible through this endpoint.
  app.get('/api/doctor/audit-history', requireDoctor, (req: any, res: any) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const events = consentAudit
      .filter((event) => {
        if (event.actorId === doctor.doctorId) return true;
        if (!event.patientUserId) return false;
        expireStale(event.patientUserId);
        return Boolean(activeGrant(event.patientUserId, doctor.doctorId));
      })
      .map((event) => ({
        auditId: event.auditId,
        timestamp: event.timestamp,
        actorId: event.actorId,
        actorRole: event.actorRole,
        actorName: event.actorRole === 'DOCTOR' ? docName(event.actorId) : event.actorRole === 'PATIENT' ? 'Patient' : 'System',
        eventType: event.eventType,
        result: event.result,
        resourceType: event.resourceType || null,
        resourceId: event.resourceId || null,
        patientId: event.patientUserId || null,
        requestId: event.requestId || null,
        recordCategory: event.recordCategory || null,
        detail: redactAuditDetail(event),
        accessPermission: event.accessPermission || null,
        hash: event.hash || null,
        prevHash: event.prevHash || null
      }))
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 200);
    return res.json({ success: true, events });
  });

  // ---------------- EMERGENCY (BREAK-GLASS) ACCESS ----------------------
  // Separate workflow: elevated reason required, view-only, hard time limit,
  // prominent audit event + immediate patient notification. NEVER grants
  // modification rights and never bypasses the consent engine.
  app.post('/api/doctor/emergency-access', requireDoctor, (req: any, res) => {
    const doctor: ConsentDoctor = req.authDoctor;
    const resolved = resolvePatient(req);
    if (resolved.error) return res.status(resolved.error.__status).json(resolved.error.__body);
    const patientUserId = resolved.patientUserId;
    if (!patientUserId) {
      return res.status(400).json({ success: false, error: 'A patient account must be specified.' });
    }
    const { reason } = req.body || {};

    if (!reason || String(reason).trim().length < 15) {
      return res.status(400).json({ success: false, error: 'Emergency access requires a detailed clinical reason (at least 15 characters).' });
    }
    expireStale(patientUserId);
    if (activeGrant(patientUserId, doctor.doctorId)) {
      return res.status(409).json({ success: false, error: 'You already hold active access to this patient. Emergency access is not needed.' });
    }

    const grant: AccessGrant = {
      accessId: `acc-emergency-${Date.now()}`,
      patientUserId,
      doctorId: doctor.doctorId,
      scope: ['profile', 'allergies', 'clinical'], // tightly limited scope
      canView: true,
      isEmergency: true,
      emergencyReason: String(reason).slice(0, 500),
      status: 'active',
      grantedAt: nowIso(),
      expiresAt: new Date(Date.now() + EMERGENCY_WINDOW_MS).toISOString(),
      revokedAt: null
    };
    DOCTOR_ACCESS.set(patientUserId, [...(DOCTOR_ACCESS.get(patientUserId) || []), grant]);

    const doctorName = doctor.fullName || doctor.doctorId;
    const doctorOrganization = doctor.organization || doctor.specialty || 'GlobalHealth network';

    audit(req, {
      patientUserId,
      actorId: doctor.doctorId,
      actorRole: 'DOCTOR',
      eventType: 'EMERGENCY_ACCESS_ACTIVATED',
      resourceType: 'AccessGrant',
      resourceId: grant.accessId,
      accessPermission: 'EMERGENCY_VIEW_ONLY',
      newState: 'active (break-glass, 2h, view-only)',
      result: 'activated',
      detail: `Break-glass view access. Reason: ${grant.emergencyReason}`
    });
    pushPatientNotification(patientUserId, {
      type: 'security',
      title: 'Emergency access activated',
      body: `${doctorName} (${doctorOrganization}) activated emergency view access to your record for a limited 2-hour period. Reason on file. This is view-only and has been recorded.`,
      requestId: undefined
    });
    sendGmail(patientUserId, {
      type: 'SECURITY_ALERT',
      subject: 'GlobalHealth: Security alert on your account',
      body: `A verified doctor (${doctorName}, ${doctorOrganization}) activated EMERGENCY (break-glass) view access to your health record.\n\nThis access is:\n• Time-limited (2 hours)\n• View-only — no changes can be made\n• Fully recorded in your security history\n\nIf you do not recognize this, review your security history and contact support immediately.`
    });
    pushDoctorNotification(doctor.doctorId, {
      type: 'emergency',
      title: 'Emergency access granted',
      body: `Break-glass view access active for up to 2 hours. Reason on file. All views are recorded.`,
      patientName: PUBLIC_USERS.get(patientUserId)?.fullName,
      patientUserId
    });

    return res.status(201).json({
      success: true,
      grant: {
        accessId: grant.accessId,
        patientUserId,
        isEmergency: true,
        scope: grant.scope,
        viewOnly: true,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt
      },
      message: 'Emergency view access is active for 2 hours. Every view is recorded in the patient’s security history.'
    });
  });

  // ------------------- PATIENT: MY CONSENT REQUESTS ---------------------
  app.get('/api/me/consent-requests', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    expireStale(user.id);
    const reqs = (CONSENT_REQUESTS.get(user.id) || []).map((r) => {
      // Version-conflict warning surfaced to the patient BEFORE they decide:
      // true when the target record changed (or vanished) since creation.
      let versionChanged: boolean | undefined;
      let recordGone: boolean | undefined;
      if ((r.kind === 'edit' || r.kind === 'remove') && r.recordId && r.baseVersionNumber != null) {
        const rec = (EHR_RECORDS.get(user.id) || []).find((x) => x.recordId === r.recordId);
        recordGone = !rec || rec.status !== 'active';
        versionChanged = recordGone || rec!.versions.length !== r.baseVersionNumber;
      }
      return {
        ...r,
        doctorName: getDoctor(r.doctorId)?.fullName || 'Unknown doctor',
        organization: getDoctor(r.doctorId)?.organization || '',
        specialty: getDoctor(r.doctorId)?.specialty || '',
        verificationStatus: getDoctor(r.doctorId)?.verificationStatus || 'PENDING',
        versionChanged,
        recordGone,
        patient: { viewedAt: r.patientViewedAt || null }
      };
    });
    reqs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ success: true, requests: reqs });
  });

  // Patient: mark a request as reviewed (audit event, once).
  app.post('/api/me/consent-requests/:requestId/view', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { requestId } = req.params;
    const cr = (CONSENT_REQUESTS.get(user.id) || []).find((r) => r.requestId === requestId);
    if (!cr) return res.status(404).json({ success: false, error: 'This request could not be found.' });
    if (cr.patientViewedAt) return res.json({ success: true, alreadyViewed: true });
    cr.patientViewedAt = nowIso();
    audit(req, {
      patientUserId: user.id,
      actorId: user.id,
      actorRole: 'PATIENT',
      eventType: 'CONSENT_REQUEST_VIEWED',
      resourceType: 'ConsentRequest',
      resourceId: requestId,
      requestId,
      recordCategory: cr.recordCategory,
      result: 'success',
      detail: 'Patient reviewed the consent request details.'
    });
    return res.json({ success: true });
  });

  // Patient: ask the doctor for clarification (request stays pending).
  app.post('/api/me/consent-requests/:requestId/clarify', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { requestId } = req.params;
    const { message } = req.body || {};
    if (!message || String(message).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Please write a short question for the doctor.' });
    }
    const cr = (CONSENT_REQUESTS.get(user.id) || []).find((r) => r.requestId === requestId);
    if (!cr) return res.status(404).json({ success: false, error: 'This request could not be found.' });
    if (cr.status !== 'pending') return res.status(409).json({ success: false, error: 'This request has already been decided.' });

    cr.clarifications.push({ id: `cl-${Date.now()}`, from: 'PATIENT', message: String(message).slice(0, 500), at: nowIso() });
    audit(req, {
      patientUserId: user.id,
      actorId: user.id,
      actorRole: 'PATIENT',
      eventType: 'CLARIFICATION_REQUESTED',
      resourceType: 'ConsentRequest',
      resourceId: requestId,
      requestId,
      recordCategory: cr.recordCategory,
      result: 'success',
      detail: 'Patient asked the doctor for clarification. Request remains pending.'
    });
    pushDoctorNotification(cr.doctorId, {
      type: 'clarification',
      title: 'Patient asked for clarification',
      body: `The patient asked about your request “${cr.title}”. Reply from the doctor portal.`,
      requestId,
      patientName: user.fullName
    });
    return res.json({ success: true, request: cr });
  });

  // Re-authentication for high-risk approvals (edits/removals).
  // Brute-force limited; the server never returns which check failed.
  app.post('/api/auth/verify-password', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { password } = req.body || {};
    const rl = checkRateLimit(REAUTH_ATTEMPTS, user.id, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many verification attempts. Try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
    }
    if (!password || !verifySecret(user.id, password, user.passwordHash)) {
      registerFailedAttempt(REAUTH_ATTEMPTS, user.id, 15 * 60 * 1000);
      audit(req, {
        patientUserId: user.id,
        actorId: user.id,
        actorRole: 'PATIENT',
        eventType: 'REAUTHENTICATION_FAILED',
        result: 'failed',
        detail: 'Password re-verification failed for a high-risk consent action.'
      });
      return res.status(401).json({ success: false, error: 'The password you entered is incorrect.' });
    }
    REAUTH_ATTEMPTS.delete(user.id);
    audit(req, {
      patientUserId: user.id,
      actorId: user.id,
      actorRole: 'PATIENT',
      eventType: 'REAUTHENTICATION_SUCCESS',
      result: 'success',
      detail: 'Password re-verification succeeded for a high-risk consent action.'
    });
    return res.json({ success: true, verifiedAt: nowIso() });
  });

  // ------------- PATIENT: APPROVE / REJECT A CONSENT REQUEST ----------
  // Single controlled transaction: verify consent → verify validity →
  // verify ownership → verify not already decided → apply change →
  // create version → audit → mark executed → notify. Idempotency guard
  // prevents double execution from retries/refreshes.
  app.post('/api/me/consent-requests/:requestId/decision', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { requestId } = req.params;
    const { decision, rejectReason, password, idempotencyKey } = req.body || {};
    expireStale(user.id);

    // Look up the request globally (by its unique ID), then enforce ownership.
    // A non-owner receives the SAME generic 404 as a missing request (no
    // existence leakage), while the denial is recorded in the TARGET
    // patient's security history with the attempting account identified.
    let cr: ConsentRequest | undefined;
    for (const reqs of CONSENT_REQUESTS.values()) {
      cr = reqs.find((r) => r.requestId === requestId);
      if (cr) break;
    }
    if (!cr) {
      return res.status(404).json({ success: false, error: 'This request could not be found.' });
    }
    // Ownership: only the owning patient can decide (blocks IDOR).
    if (cr.patientUserId !== user.id) {
      audit(req, { patientUserId: cr.patientUserId, actorId: user.id, actorRole: 'PATIENT', eventType: 'CONSENT_DECISION_DENIED', resourceId: requestId, requestId, result: 'denied', detail: `Non-owner account (id ${user.id}) attempted to decide consent request ${requestId}.` });
      return res.status(404).json({ success: false, error: 'This request could not be found.' });
    }
    // Idempotency: a decided request can never be decided (or executed) again.
    if (DECIDED_REQUESTS.has(requestId) || cr.status !== 'pending') {
      return res.status(409).json({
        success: false,
        code: cr.status === 'executed' ? 'ALREADY_EXECUTED' : 'ALREADY_DECIDED',
        error: cr.status === 'executed'
          ? 'This request was already approved and applied. The change has not been repeated.'
          : `This request has already been ${cr.status}.`
      });
    }

    const doctor = getDoctor(cr.doctorId);

    if (decision === 'reject') {
      cr.status = 'rejected';
      cr.reviewedAt = nowIso();
      cr.decisionBy = user.id;
      cr.rejectReason = rejectReason || 'Patient declined.';
      cr.verificationMethod = 'SESSION';
      DECIDED_REQUESTS.set(requestId, nowIso());
      audit(req, {
        patientUserId: user.id,
        actorId: user.id,
        actorRole: 'PATIENT',
        eventType: 'CONSENT_REJECTED',
        resourceType: 'ConsentRequest',
        resourceId: requestId,
        requestId,
        recordCategory: cr.recordCategory,
        newState: 'rejected',
        accessPermission: 'APPROVE_EHR_CHANGE (patient)',
        result: 'rejected',
        detail: cr.rejectReason
      });
      pushPatientNotification(user.id, {
        type: 'consent',
        title: 'Request rejected',
        body: `You rejected the request from ${doctor?.fullName || 'the doctor'}. No change was made to your record.`,
        requestId
      });
      pushDoctorNotification(cr.doctorId, {
        type: 'rejected',
        title: 'Patient rejected your request',
        body: `Your request “${cr.title}” was rejected. No change was applied.`,
        requestId,
        patientName: user.fullName
      });
      sendGmail(user.id, {
        type: 'REJECTION_CONFIRMED',
        subject: 'GlobalHealth: Your request decision was recorded',
        body: `Your decision on the ${kindLabel(cr.kind)} request from ${doctor?.fullName || 'your doctor'} was recorded: Rejected. No change was made to your health record.\nRequest ID: ${requestId}`,
        requestId
      });
      return res.json({ success: true, request: cr, result: 'rejected' });
    }

    if (decision !== 'approve') {
      return res.status(400).json({ success: false, error: 'A valid decision (approve or reject) is required.' });
    }

    // ---- APPROVAL ----
    // High-risk actions (edit, remove) require password re-authentication.
    const highRisk = cr.kind === 'edit' || cr.kind === 'remove';
    let verificationMethod: 'SESSION' | 'PASSWORD_REAUTH' = 'SESSION';
    if (highRisk) {
      const rl = checkRateLimit(REAUTH_ATTEMPTS, user.id, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many verification attempts. Try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
      }
      if (!password || !verifySecret(user.id, String(password), user.passwordHash)) {
        registerFailedAttempt(REAUTH_ATTEMPTS, user.id, 15 * 60 * 1000);
        audit(req, {
          patientUserId: user.id,
          actorId: user.id,
          actorRole: 'PATIENT',
          eventType: 'REAUTHENTICATION_FAILED',
          resourceId: requestId,
          requestId,
          result: 'failed',
          detail: 'Re-authentication failed while approving a high-risk change. Request remains pending.'
        });
        return res.status(401).json({ success: false, code: 'REAUTH_REQUIRED', error: 'To approve this high-risk change, please re-enter your password.' });
      }
      REAUTH_ATTEMPTS.delete(user.id);
      verificationMethod = 'PASSWORD_REAUTH';
      audit(req, {
        patientUserId: user.id,
        actorId: user.id,
        actorRole: 'PATIENT',
        eventType: 'REAUTHENTICATION_SUCCESS',
        resourceId: requestId,
        requestId,
        result: 'success',
        detail: 'Password re-verification succeeded before approving a high-risk change.'
      });
    }

    // Version-conflict protection (Stage 14/44): if the target record changed
    // (or disappeared) after the request was created, DO NOT execute. Pause
    // the request as 'conflict' so the doctor re-issues it against the newer
    // record — no blind overwrites of newer information.
    if (cr.kind === 'edit' || cr.kind === 'remove') {
      const target = (EHR_RECORDS.get(user.id) || []).find((r) => r.recordId === cr.recordId);
      const unchanged = target && target.status === 'active' && target.versions.length === cr.baseVersionNumber;
      if (!unchanged) {
        cr.status = 'conflict';
        cr.reviewedAt = nowIso();
        cr.decisionBy = user.id;
        cr.verificationMethod = verificationMethod;
        DECIDED_REQUESTS.set(requestId, nowIso());
        const nowVer = target ? `version ${target.versions.length} (${target.status})` : 'no longer present';
        audit(req, {
          patientUserId: user.id,
          actorId: user.id,
          actorRole: 'PATIENT',
          eventType: 'EHR_VERSION_CONFLICT',
          resourceType: 'ConsentRequest',
          resourceId: requestId,
          requestId,
          recordCategory: cr.recordCategory,
          previousState: target ? target.versions[target.versions.length - 1]?.data : cr.currentValue,
          newState: `conflict: requested base v${cr.baseVersionNumber ?? '?'}, record is now ${nowVer}`,
          result: 'conflict',
          detail: `The record changed after the request was created. No change was applied; the doctor must submit an updated request.`
        });
        pushPatientNotification(user.id, {
          type: 'consent',
          title: 'Approval paused — record changed',
          body: `You approved ${docName(cr.doctorId)}'s request, but the record changed after it was created. For your protection, no change was applied and your doctor must submit an updated request.`,
          requestId
        });
        pushDoctorNotification(cr.doctorId, {
          type: 'conflict',
          title: 'Your approved request needs re-review',
          body: `“${cr.title}” was approved, but the record changed after you created the request. No change was applied — please submit an updated request.`,
          requestId,
          patientName: user.fullName
        });
        sendGmail(user.id, {
          type: 'REQUEST_CONFLICT',
          subject: 'GlobalHealth: An approved change needs re-review',
          body: `You approved a ${kindLabel(cr.kind)} request from ${docName(cr.doctorId)}, but the record changed after the request was created. For your protection, NO change was applied. The doctor will need to submit an updated request.
Request ID: ${requestId}`,
          requestId
        });
        return res.json({ success: true, request: cr, result: 'conflict' });
      }
    }

    cr.status = 'approved';
    cr.reviewedAt = nowIso();
    cr.decisionBy = user.id;
    cr.verificationMethod = verificationMethod;
    if (idempotencyKey) cr.idempotencyKey = String(idempotencyKey).slice(0, 64);

    try {
      if (cr.kind === 'access_grant') {
        const list = DOCTOR_ACCESS.get(user.id) || [];
        const prior = list.find((g) => g.doctorId === cr.doctorId && !g.isEmergency);
        if (prior) {
          prior.status = 'active';
          prior.revokedAt = null;
          prior.grantedAt = nowIso();
          prior.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          list.push({
            accessId: `acc-${Date.now()}`,
            patientUserId: user.id,
            doctorId: cr.doctorId,
            scope: cr.scope && cr.scope.length ? cr.scope : [...DEFAULT_ACCESS_SCOPE],
            canView: true,
            isEmergency: false,
            status: 'active',
            grantedAt: nowIso(),
            expiresAt: new Date(Date.now() + (cr.accessDurationDays || 365) * 24 * 60 * 60 * 1000).toISOString(),
            revokedAt: null
          });
        }
        DOCTOR_ACCESS.set(user.id, list);
      } else {
        // EHR change: create a new version (never silently overwrite).
        let records = EHR_RECORDS.get(user.id) || [];
        let record: EhrRecord | undefined;

        if (cr.kind === 'add') {
          record = {
            recordId: `rec-${Date.now()}`,
            patientUserId: user.id,
            category: cr.recordCategory || 'Clinical Note',
            title: cr.title,
            status: 'active',
            createdAt: nowIso(),
            versions: []
          };
          records.push(record);
        } else {
          record = records.find((r) => r.recordId === cr.recordId);
          if (!record) {
            cr.status = 'failed';
            DECIDED_REQUESTS.set(requestId, nowIso());
            audit(req, { patientUserId: user.id, actorId: 'SYSTEM', actorRole: 'SYSTEM', eventType: 'EHR_CHANGE_FAILED', requestId, result: 'failed', detail: 'Target record not found.' });
            return res.status(404).json({ success: false, error: 'This healthcare record could not be found.' });
          }
          const targetRecord = record;
          if (cr.kind === 'remove' && cr.deletionType === 'permanent') {
            // Retention-controlled permanent deletion: the record leaves the
            // active EHR, but ALL versions are preserved in the audit-only
            // retention archive so history is never silently destroyed.
            const retained: RetainedRecord = {
              recordId: targetRecord.recordId,
              category: targetRecord.category,
              title: targetRecord.title,
              versions: targetRecord.versions,
              removedAt: nowIso(),
              requestId,
              reason: cr.reason,
              requestedBy: cr.doctorId,
              approvedBy: user.id
            };
            const arch = RETENTION_ARCHIVE.get(user.id) || [];
            arch.push(retained);
            RETENTION_ARCHIVE.set(user.id, arch);
            records = records.filter((r) => r.recordId !== targetRecord.recordId);
          } else if (cr.kind === 'remove') {
            targetRecord.status = 'archived'; // retention-safe default
          }
        }

        const versionNumber = record.versions.length + 1;
        record.versions.push({
          versionId: `ver-${Date.now()}`,
          versionNumber,
          data:
            cr.kind === 'edit'
              ? cr.proposedValue || record.versions[record.versions.length - 1]?.data || ''
              : cr.proposedValue || cr.summary || cr.title,
          createdBy: cr.doctorId,
          sourceRequestId: cr.requestId,
          createdAt: nowIso()
        });
        EHR_RECORDS.set(user.id, records);

        cr.executedRecordId = record.recordId;
        cr.versionNumber = versionNumber;
        cr.executedAt = nowIso();
        cr.status = 'executed';

        audit(req, {
          patientUserId: user.id,
          actorId: user.id,
          actorRole: 'PATIENT',
          eventType: 'CONSENT_APPROVED',
          resourceType: 'ConsentRequest',
          resourceId: requestId,
          requestId,
          recordCategory: cr.recordCategory,
          previousState: cr.currentValue,
          newState: cr.kind === 'remove' ? (cr.deletionType === 'permanent' ? 'permanently removed (retained in audit)' : 'archived') : cr.proposedValue,
          accessPermission: `APPROVE_EHR_CHANGE (patient, ${verificationMethod})`,
          result: 'approved',
          detail: `Patient approval received (${verificationMethod === 'PASSWORD_REAUTH' ? 'password re-authentication' : 'authenticated session'}).`
        });
        audit(req, {
          patientUserId: user.id,
          actorId: cr.doctorId,
          actorRole: 'DOCTOR',
          eventType:
            cr.kind === 'add'
              ? 'EHR_RECORD_ADDED'
              : cr.kind === 'edit'
                ? 'EHR_RECORD_VERSIONED'
                : cr.deletionType === 'permanent'
                  ? 'EHR_RECORD_REMOVED'
                  : 'EHR_RECORD_ARCHIVED',
          resourceType: 'EHRRecord',
          resourceId: record.recordId,
          requestId,
          recordCategory: record.category,
          previousState: cr.currentValue,
          newState: cr.kind === 'remove' ? (cr.deletionType === 'permanent' ? 'permanently removed (retained in audit)' : 'archived') : cr.proposedValue,
          result: 'completed',
          detail: `Version ${versionNumber} created under approved consent.`
        });
      }

      DECIDED_REQUESTS.set(requestId, nowIso()); // idempotency guard

      if (cr.kind === 'access_grant') {
        cr.executedAt = nowIso();
        cr.status = 'executed';
        audit(req, {
          patientUserId: user.id,
          actorId: cr.doctorId,
          actorRole: 'DOCTOR',
          eventType: 'DOCTOR_ACCESS_GRANTED',
          resourceType: 'AccessGrant',
          resourceId: requestId,
          requestId,
          newState: 'active',
          result: 'completed'
        });
        sendGmail(user.id, {
          type: 'ACCESS_GRANTED',
          subject: 'GlobalHealth: A doctor now has view access to your record',
          body: `${doctor?.fullName || 'A doctor'} (${doctor?.organization || 'healthcare organization'}) now has VIEW access to your GlobalHealth health record.\n\nImportant: viewing access does NOT allow this doctor to change your record. Any add, edit or removal still requires your explicit approval.\nRequest ID: ${requestId}`,
          requestId
        });
      } else {
        sendGmail(user.id, {
          type: 'APPROVAL_CONFIRMED',
          subject: 'GlobalHealth: Your EHR change was approved and completed',
          body: `You approved the ${kindLabel(cr.kind)} request from ${doctor?.fullName || 'your doctor'}. The authorized change has been completed and recorded with a new record version.\nRequest ID: ${requestId}\nCompleted: ${new Date().toLocaleString()}`,
          requestId
        });
      }

      pushPatientNotification(user.id, {
        type: 'consent',
        title: 'Request approved',
        body:
          cr.kind === 'access_grant'
            ? `You granted view access to ${doctor?.fullName}. Changes to your record still require your approval.`
            : `Your EHR was updated after you approved ${doctor?.fullName}'s request.`,
        requestId
      });
      pushDoctorNotification(cr.doctorId, {
        type: 'approved',
        title: 'Patient approved your request',
        body: `Your request “${cr.title}” was approved and ${cr.kind === 'access_grant' ? 'access is now active' : 'the change has been applied'}.`,
        requestId,
        patientName: user.fullName
      });

      return res.json({ success: true, request: cr, result: 'executed', verificationMethod });
    } catch (err: any) {
      cr.status = 'failed';
      DECIDED_REQUESTS.set(requestId, nowIso());
      audit(req, {
        patientUserId: user.id,
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        eventType: 'EHR_CHANGE_FAILED',
        requestId,
        result: 'failed',
        detail: String(err?.message || err)
      });
      pushPatientNotification(user.id, {
        type: 'consent',
        title: 'Change could not be completed',
        body: 'Your approval was recorded, but the change could not be completed. No health record was changed. Our team has been notified.',
        requestId
      });
      return res.status(500).json({ success: false, error: 'We couldn’t complete this request. No health record was changed. The event has been recorded for security review.' });
    }
  });

  // ------------------- PATIENT: REVOKE DOCTOR ACCESS -------------------
  app.post('/api/me/doctor-access/:doctorId/revoke', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { doctorId } = req.params;
    const list = DOCTOR_ACCESS.get(user.id) || [];
    const grant = list.find((g) => g.doctorId === doctorId && g.status === 'active');
    if (!grant) {
      return res.status(404).json({ success: false, error: 'No active access found for this doctor.' });
    }
    grant.status = 'revoked';
    grant.revokedAt = nowIso();
    // Cancel any pending modification/access requests from this doctor so a
    // revoked doctor can never have a queued change applied later.
    let cancelled = 0;
    (CONSENT_REQUESTS.get(user.id) || []).forEach((r) => {
      if (r.doctorId === doctorId && r.status === 'pending') {
        r.status = 'cancelled';
        r.reviewedAt = nowIso();
        DECIDED_REQUESTS.set(r.requestId, nowIso());
        cancelled += 1;
        audit(req, {
          patientUserId: user.id,
          actorId: user.id,
          actorRole: 'PATIENT',
          eventType: 'CONSENT_REQUEST_CANCELLED',
          resourceType: 'ConsentRequest',
          resourceId: r.requestId,
          requestId: r.requestId,
          newState: 'cancelled (access revoked)',
          result: 'cancelled',
          detail: 'Pending request invalidated by access revocation.'
        });
      }
    });
    audit(req, {
      patientUserId: user.id,
      actorId: user.id,
      actorRole: 'PATIENT',
      eventType: 'DOCTOR_ACCESS_REVOKED',
      resourceType: 'AccessGrant',
      resourceId: grant.accessId,
      newState: 'revoked',
      accessPermission: 'REVOKE_DOCTOR_ACCESS (patient)',
      result: 'completed',
      detail: cancelled ? `Revoked access and cancelled ${cancelled} pending request(s).` : 'Revoked access.'
    });
    pushPatientNotification(user.id, {
      type: 'security',
      title: 'Access revoked',
      body: `Access to your health record by ${docName(doctorId)} was revoked on ${new Date().toLocaleString()}. ${cancelled ? `${cancelled} pending request(s) were cancelled.` : ''}`,
      requestId: undefined
    });
    pushDoctorNotification(doctorId, {
      type: 'revoked',
      title: 'Your access was revoked',
      body: `The patient has revoked your access to their health record${cancelled ? ` and ${cancelled} pending request(s) were cancelled` : ''}. Future access attempts will be denied and recorded.`,
      patientName: user.fullName,
      patientUserId: user.id
    });
    sendGmail(user.id, {
      type: 'ACCESS_REVOKED',
      subject: 'GlobalHealth: Doctor access was revoked',
      body: `Access to your health record by ${docName(doctorId)} was revoked on ${new Date().toLocaleString()}. Any pending change requests from this doctor were cancelled. No changes will be made without your new approval.`,
      requestId: undefined
    });
    return res.json({ success: true, cancelledRequests: cancelled });
  });

  // ------------------- PATIENT: MY DOCTOR ACCESS ------------------------
  app.get('/api/me/doctor-access', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    expireStale(user.id);
    const grants = (DOCTOR_ACCESS.get(user.id) || []).map((g) => ({
      ...g,
      derivedStatus: grantDerivedStatus(g),
      doctorName: getDoctor(g.doctorId)?.fullName || 'Unknown doctor',
      organization: getDoctor(g.doctorId)?.organization || '',
      specialty: getDoctor(g.doctorId)?.specialty || '',
      verificationStatus: getDoctor(g.doctorId)?.verificationStatus || 'PENDING',
      permissions: grantPermissions(g)
    }));
    return res.json({ success: true, access: grants });
  });

  // --------- PATIENT: UNIFIED HISTORY (simple + detailed, downloadable) -
  // Categories: EHR | ACCESS | CONSENT | SECURITY | NOTIFICATION
  const EVENT_CATEGORY: Record<string, string> = {
    DOCTOR_VIEWED_EHR: 'EHR',
    EHR_RECORD_ADDED: 'EHR',
    EHR_RECORD_VERSIONED: 'EHR',
    EHR_RECORD_ARCHIVED: 'EHR',
    EHR_RECORD_REMOVED: 'EHR',
    EHR_CHANGE_FAILED: 'EHR',
    EHR_VERSION_CONFLICT: 'CONSENT',
    ACCESS_REQUESTED: 'ACCESS',
    DOCTOR_ACCESS_GRANTED: 'ACCESS',
    DOCTOR_ACCESS_REVOKED: 'ACCESS',
    DOCTOR_ACCESS_EXPIRED: 'ACCESS',
    EMERGENCY_ACCESS_ACTIVATED: 'SECURITY',
    EMERGENCY_ACCESS_USED: 'SECURITY',
    EHR_ACCESS_DENIED: 'SECURITY',
    EHR_MODIFICATION_REQUEST_DENIED: 'SECURITY',
    EHR_MODIFICATION_REQUESTED: 'CONSENT',
    CONSENT_APPROVED: 'CONSENT',
    CONSENT_REJECTED: 'CONSENT',
    CONSENT_REQUEST_EXPIRED: 'CONSENT',
    CONSENT_REQUEST_CANCELLED: 'CONSENT',
    CONSENT_REQUEST_VIEWED: 'CONSENT',
    CONSENT_DECISION_DENIED: 'SECURITY',
    CLARIFICATION_REQUESTED: 'CONSENT',
    CLARIFICATION_REPLIED: 'CONSENT',
    EMAIL_NOTIFICATION_SENT: 'NOTIFICATION',
    DOCTOR_LOGIN: 'SECURITY',
    DOCTOR_LOGIN_FAILED: 'SECURITY',
    REAUTHENTICATION_SUCCESS: 'SECURITY',
    REAUTHENTICATION_FAILED: 'SECURITY'
  };

  // For decision events the acting party is the patient; the "whose request"
  // name is resolved from the request itself.
  const requestDoctorName = (requestId?: string | null): string | null => {
    if (!requestId) return null;
    for (const reqs of CONSENT_REQUESTS.values()) {
      const r = reqs.find((x) => x.requestId === requestId);
      if (r) return docName(r.doctorId);
    }
    return null;
  };

  // For access events the acting party may be the patient/system; the
  // affected doctor's name is resolved from the access grant.
  const grantDoctorName = (accessId?: string | null): string | null => {
    if (!accessId) return null;
    for (const grants of DOCTOR_ACCESS.values()) {
      const g = grants.find((x) => x.accessId === accessId);
      if (g) return docName(g.doctorId);
    }
    return null;
  };

  // Human-readable (patient-simple) event titles.
  const EVENT_TITLE = (e: any): string => {
    const who = e.actorRole === 'DOCTOR' ? docName(e.actorId) : e.actorRole === 'PATIENT' ? 'You' : 'System';
    const reqDoctor = requestDoctorName(e.requestId) || 'the doctor';
    const grantDoctor = grantDoctorName(e.resourceId) || 'the doctor';
    switch (e.eventType) {
      case 'DOCTOR_VIEWED_EHR':
        return `${who} viewed your authorized health record.`;
      case 'EHR_RECORD_ADDED':
        return `Your EHR was updated — a new ${e.recordCategory || 'record'} was added after your approval.`;
      case 'EHR_RECORD_VERSIONED':
        return `Your ${e.recordCategory || 'record'} was updated to a new version after your approval.`;
      case 'EHR_RECORD_ARCHIVED':
        return `Your ${e.recordCategory || 'record'} was archived (kept in your history) after your approval.`;
      case 'EHR_RECORD_REMOVED':
        return `Your ${e.recordCategory || 'record'} was permanently removed after your approval. A retention copy is preserved in the audit record.`;
      case 'EHR_CHANGE_FAILED':
        return 'An approved change could not be completed. No record was changed.';
      case 'EHR_VERSION_CONFLICT':
        return `Your approval of ${reqDoctor}'s change was paused because the record changed after the request was created. No change was made — an updated request is needed.`;
      case 'EHR_MODIFICATION_REQUESTED':
        return `${who} requested to ${kindVerb((e.newState || '').split(':')[1])} ${e.recordCategory || 'a record'} in your EHR.`;
      case 'ACCESS_REQUESTED':
        return `${who} requested view access to your health record.`;
      case 'DOCTOR_ACCESS_GRANTED':
        return `View access for ${who} is now active. Changes still require your approval.`;
      case 'DOCTOR_ACCESS_REVOKED':
        return `You revoked ${grantDoctor}'s access to your health record.`;
      case 'DOCTOR_ACCESS_EXPIRED':
        return `View access for ${grantDoctor} expired.`;
      case 'CONSENT_APPROVED':
        return `You approved ${reqDoctor}'s request. The authorized change was applied.`;
      case 'CONSENT_REJECTED':
        return `You rejected ${reqDoctor}'s request. No change was made.`;
      case 'CONSENT_REQUEST_EXPIRED':
        return 'A consent request expired before a decision. No change was made.';
      case 'CONSENT_REQUEST_CANCELLED':
        return 'A consent request was cancelled before a decision. No change was made.';
      case 'CONSENT_REQUEST_VIEWED':
        return 'You reviewed a consent request.';
      case 'CONSENT_DECISION_DENIED':
        return 'A decision attempt on a consent request was denied and recorded.';
      case 'CLARIFICATION_REQUESTED':
        return 'You asked the doctor a question about a consent request.';
      case 'CLARIFICATION_REPLIED':
        return `${who} answered your question about a consent request.`;
      case 'EHR_ACCESS_DENIED':
        return 'A doctor without active permission attempted to access your record. The attempt was blocked.';
      case 'EHR_MODIFICATION_REQUEST_DENIED':
        return 'A modification request without a valid access relationship was blocked.';
      case 'EMERGENCY_ACCESS_ACTIVATED':
        return `Emergency (break-glass) VIEW access was activated by ${who} for a limited 2-hour period.`;
      case 'EMERGENCY_ACCESS_USED':
        return `${who} used time-limited emergency access to view your record.`;
      case 'EMAIL_NOTIFICATION_SENT':
        return 'A notification email was sent to your verified Gmail address.';
      case 'DOCTOR_LOGIN':
        return 'A verified doctor signed in to the doctor portal.';
      case 'DOCTOR_LOGIN_FAILED':
        return 'A failed doctor sign-in attempt was recorded.';
      case 'REAUTHENTICATION_SUCCESS':
        return 'You re-authenticated with your password for a high-risk action.';
      case 'REAUTHENTICATION_FAILED':
        return 'A password re-verification attempt failed and was recorded.';
      default:
        return e.eventType.replace(/_/g, ' ');
    }
  };

  const redactAuditDetail = (event: any): string => {
    const value = String(event?.detail || '').replace(/\s+/g, ' ').trim();
    const clinical = Boolean(event?.patientUserId || event?.recordCategory || /EHR|CONSENT|PRESCRIPTION|LAB|IMAGING|MEDICATION|ACCESS/i.test(String(event?.resourceType || '') + ' ' + String(event?.eventType || '')));
    if (clinical) return 'Protected clinical audit detail redacted; review the event type and outcome.';
    return value.slice(0, 240);
  };

  const redactAuditState = (value: unknown): string | null => {
    if (value == null || value === '') return null;
    const compact = String(value).replace(/\s+/g, ' ').trim();
    if (/^(pending|approved|rejected|executed|failed|conflict|active|revoked|expired|archived|cancelled|completed|denied|prepared|sent|signed|version\s+\d+|pending:|active\s*\(|conflict:)/i.test(compact)) return compact.slice(0, 180);
    return 'redacted clinical value';
  };

  const buildHistoryEvents = (user: ServerPublicUser) => {
    // A patient sees (a) events recorded against their own resources, and
    // (b) events of their own actions — but ONLY on their own resources.
    // An actor's attempts on ANOTHER patient's resources must never appear in
    // the actor's history (that would leak the target's data existence).
    const consentEvents = consentAudit
      .filter((e) => {
        if (e.patientUserId === user.id) return true;
        return e.actorRole === 'PATIENT' && e.actorId === user.id && (!e.patientUserId || e.patientUserId === user.id);
      })
      .map((e) => ({
        auditId: e.auditId,
        category: EVENT_CATEGORY[e.eventType] || 'EHR',
        eventType: e.eventType,
        title: EVENT_TITLE(e),
        patientId: e.patientUserId || null, // own account id (used to verify the hash chain)
        detail: redactAuditDetail(e),
        timestamp: e.timestamp,
        actorId: e.actorId,
        actorRole: e.actorRole,
        actorName: e.actorRole === 'DOCTOR' ? docName(e.actorId) : e.actorRole === 'PATIENT' ? 'You' : 'System',
        result: e.result,
        requestId: e.requestId || null,
        resourceType: e.resourceType || null,
        resourceId: e.resourceId || null,
        recordCategory: e.recordCategory || null,
        previousState: redactAuditState(e.previousState),
        newState: redactAuditState(e.newState),
        accessPermission: e.accessPermission || null,
        sessionId: e.sessionId ? 'server-session' : null,
        hash: e.hash,
        prevHash: e.prevHash
      }));

    // Security events from the session/security log. Only real security
    // events are surfaced (logins, password changes, 2FA, sessions) — raw
    // API-access bookkeeping is deliberately excluded from the patient view.
    const SECURITY_EVENT_TYPES = new Set([
      'USER_LOGIN_SUCCESS',
      'USER_LOGIN_FAILED',
      'PASSWORD_CHANGED',
      '2FA_ENABLED',
      'SESSION_TERMINATED',
      'SESSION_TERMINATED_ALL'
    ]);
    const secEvents = AUDIT_LOGS.filter((l) => l.userId === user.id && SECURITY_EVENT_TYPES.has(l.event)).map((l) => {
      const typeMap: Record<string, { type: string; title: string }> = {
        USER_LOGIN_SUCCESS: { type: 'PATIENT_LOGIN_SUCCESS', title: 'You signed in to your GlobalHealth account.' },
        USER_LOGIN_FAILED: { type: 'PATIENT_LOGIN_FAILED', title: 'A sign-in attempt on your account failed and was recorded.' },
        PASSWORD_CHANGED: { type: 'PASSWORD_CHANGED', title: 'Your account password was changed.' },
        '2FA_ENABLED': { type: '2FA_ENABLED', title: 'Two-factor authentication was enabled on your account.' }
      };
      const m = typeMap[l.event] || { type: l.event, title: l.details };
      return {
        auditId: l.id,
        category: 'SECURITY',
        eventType: m.type,
        title: m.title,
        detail: l.details,
        timestamp: l.timestamp,
        actorId: user.id,
        actorRole: l.event.includes('FAILED') ? 'SYSTEM' : 'PATIENT',
        actorName: l.event.includes('FAILED') ? 'System' : 'You',
        result: l.status,
        requestId: null,
        resourceType: 'Account',
        resourceId: null,
        recordCategory: null,
        previousState: null,
        newState: null,
        accessPermission: null,
        sessionId: null,
        hash: null,
        prevHash: null
      };
    });

    return [...consentEvents, ...secEvents].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  };

  app.get('/api/me/audit-history', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    expireStale(user.id);
    const events = buildHistoryEvents(user);

    if (req.query.format === 'csv') {
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['Date & Time', 'Event', 'Category', 'Actor', 'Actor Type', 'Affected Record', 'Reason / Detail', 'Consent Status', 'Request ID', 'Result'].map(esc).join(','),
        ...events.map((e) =>
          [
            new Date(e.timestamp).toLocaleString(),
            e.title,
            e.category,
            e.actorName,
            e.actorRole,
            e.recordCategory || e.resourceType || '',
            e.detail,
            e.accessPermission || e.result,
            e.requestId || '',
            e.result
          ].map(esc).join(',')
        )
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="globalhealth-history-${user.id}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send('\uFEFF' + rows.join('\n'));
    }

    if (req.query.format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="globalhealth-history-${user.id}.json"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ exportedAt: nowIso(), account: user.fullName, events });
    }

    return res.json({ success: true, events });
  });

  // ------------------- PATIENT: EMAIL OUTBOX (Gmail simulation) ---------
  app.get('/api/me/email-outbox', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const emails = (EMAIL_OUTBOX.get(user.id) || []).slice(0, 50);
    return res.json({ success: true, to: user.email, emails });
  });

  app.post('/api/me/email-outbox/:emailId/read', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const email = (EMAIL_OUTBOX.get(user.id) || []).find((e) => e.emailId === req.params.emailId);
    if (!email) return res.status(404).json({ success: false, error: 'Not found.' });
    email.read = true;
    return res.json({ success: true });
  });

  // Secure email link: short-lived token → deep link into the AUTHENTICATED
  // app. The token carries no health data; the app still requires sign-in.
  app.get('/api/email-link/:token', (req: any, res) => {
    const { token } = req.params;
    const entry = EMAIL_LINK_TOKENS.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      EMAIL_LINK_TOKENS.delete(token);
      return res.status(410).json({
        success: false,
        error: 'This link has expired or is no longer valid. Please sign in to GlobalHealth to review your consent requests.'
      });
    }
    EMAIL_LINK_TOKENS.delete(token); // single-use
    return res.json({
      success: true,
      redirect: entry.requestId ? `#privacy?request=${entry.requestId}` : '#privacy'
    });
  });

  // ------------------- PATIENT: ATTACHMENT ACCESS -----------------------
  // Ownership is enforced through the consent request that holds the
  // attachment; every view is audited.
  app.get('/api/me/attachments/:attachmentId', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const att = ATTACHMENTS.get(req.params.attachmentId);
    if (!att) return res.status(404).json({ success: false, error: 'This attachment could not be found.' });
    const reqs = CONSENT_REQUESTS.get(user.id) || [];
    const owner = reqs.find((r) => r.attachment?.attachmentId === att.attachmentId);
    if (!owner) {
      audit(req, { patientUserId: user.id, actorId: user.id, actorRole: 'PATIENT', eventType: 'ATTACHMENT_ACCESS_DENIED', resourceId: att.attachmentId, result: 'denied', detail: 'Attachment does not belong to an authorized request of this patient.' });
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }
    audit(req, {
      patientUserId: user.id,
      actorId: user.id,
      actorRole: 'PATIENT',
      eventType: 'ATTACHMENT_VIEWED',
      resourceType: 'Attachment',
      resourceId: att.attachmentId,
      requestId: owner.requestId,
      result: 'success',
      detail: `Viewed attachment “${att.name}” (${att.contentType}, ${att.sizeBytes} bytes).`
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      attachment: { name: att.name, contentType: att.contentType, sizeBytes: att.sizeBytes, dataUrl: att.dataUrl }
    });
  });

  // ------------------- PATIENT: RETENTION ARCHIVE VIEW -------------------
  // Shows the audit-only preservation of permanently removed records.
  app.get('/api/me/retention-archive', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const items = (RETENTION_ARCHIVE.get(user.id) || []).map((r) => ({
      recordId: r.recordId,
      category: r.category,
      title: r.title,
      removedAt: r.removedAt,
      requestId: r.requestId,
      requestedBy: docName(r.requestedBy),
      approvedBy: 'You',
      versionCount: r.versions.length,
      note: 'Preserved in the audit-only retention archive. This content is no longer part of your active EHR.'
    }));
    return res.json({ success: true, items });
  });
  // ======================================================================
  // NEWS GOVERNANCE — VERIFIED AUTHORITIES, SUBMISSIONS, REPORTS, AUDIT
  // ----------------------------------------------------------------------
  // Controlled, administrator-governed healthcare news workflow:
  //  1. Regular users can only READ published news and REPORT issues.
  //  2. Organizations register as authority candidates; NOBODY is trusted
  //     merely by registering. Verification is decided by a GlobalHealth
  //     administrator (approve / approve with restrictions / reject /
  //     request more info / place under review).
  //  3. Verified authorities may SUBMIT articles only (submitting is a
  //     granted permission). Direct publishing is an exceptional permission
  //     that an administrator must explicitly grant.
  //  4. Authority submissions are strictly isolated: an authority sees ONLY
  //     its own drafts, submissions, statuses and shared notes — never
  //     another organization's content or internal admin notes.
  //  5. Roles/permissions are server-side. A client-sent role or permission
  //     field is never trusted.
  //  6. Every important action is written to an append-only, hash-chained
  //     news audit trail.
  // ======================================================================

  interface NewsAdmin {
    adminId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: 'SUPER_ADMIN' | 'NEWS_ADMIN' | 'EDITOR' | 'REVIEWER' | 'PUBLISHER' | 'AUTHOR';
    title: string;
    status: 'active' | 'suspended';
    mfaEnabled: boolean;
    permissions: string[];
  }

  type AuthorityState =
    | 'PENDING_REVIEW'
    | 'UNDER_REVIEW'
    | 'MORE_INFO_REQUIRED'
    | 'VERIFIED'
    | 'VERIFIED_RESTRICTED'
    | 'SUSPENDED'
    | 'REVOKED'
    | 'REJECTED';

  interface AuthorityProfile {
    orgName: string;
    orgType: string;
    website: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    representativeName: string;
    representativeRole: string;
    credentials?: string;
    description: string;
    verificationReason: string;
    requestedPermissions: string[];
  }

  interface Authority {
    authorityId: string;
    passwordHash: string;
    profile: AuthorityProfile;
    state: AuthorityState;
    suspended?: boolean;
    permissions: { canSubmit: boolean; canPublish: boolean; categories: string[] };
    appliedAt: string;
    verificationRecord?: {
      reviewer: string;
      reviewedAt: string;
      decision: string;
      reason: string;
      previousState: AuthorityState;
    };
    suspensionRecord?: { reviewer: string; at: string; reason: string };
  }

  type SubmissionStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'needs_correction'
    | 'approved'
    | 'published'
    | 'rejected';

  interface SubmissionRevision {
    version: number;
    at: string;
    actor: string; // authorityId or admin name
    note: string;
    changes: string[];
  }

  interface NewsSubmission {
    submissionId: string;
    authorityId: string;
    headline: string;
    summary: string;
    content: string;
    category: string;
    sourceName: string;
    sourceUrl: string;
    sourceDate?: string;
    references: string[];
    highRisk: boolean;
    medicalReviewConfirmed?: boolean;
    status: SubmissionStatus;
    correctionRequested?: { by: string; note: string; at: string };
    correctionResponse?: { by: string; note: string; at: string };
    internalNotes: { by: string; note: string; at: string }[]; // admin-only
    revisions: SubmissionRevision[];
    similarMatches?: string[]; // potential duplicate headlines (review aid)
    createdAt: string;
    submittedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    publishedAt?: string;
    updatedAt?: string;
    correctionNotice?: string;
  }

  interface NewsReport {
    reportId: string;
    articleRef: string; // article id (public catalog or authority submission)
    articleTitle: string;
    reason: string;
    detail: string;
    reporterUserId: string;
    reporterName: string;
    status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
    resolution?: string;
    createdAt: string;
    resolvedBy?: string;
    resolvedAt?: string;
  }

  interface GovNotification {
    id: string;
    kind: string;
    title: string;
    body: string;
    refId?: string;
    read: boolean;
    at: string;
  }

  // Populated by the unified News Management login section (individual
  // accounts — one per person, each with own credentials + permissions).
  const NEWS_ADMINS: Map<string, NewsAdmin> = new Map();

  const AUTHORITIES: Map<string, Authority> = new Map();
  const AUTHORITY_SESSIONS: Map<string, { authorityId: string; createdAt: string; lastActive: string }> = new Map();
  const NEWS_ADMIN_SESSIONS: Map<string, { adminId: string; createdAt: string; lastActive: string }> = new Map();
  const NEWS_SUBMISSIONS: Map<string, NewsSubmission> = new Map();
  const NEWS_REPORTS: Map<string, NewsReport> = new Map();
  const AUTHORITY_NOTIFICATIONS: Map<string, GovNotification[]> = new Map();
  const ADMIN_NOTIFICATIONS: Map<string, GovNotification[]> = new Map();
  const AUTHORITY_LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();

  const NEWS_AUDIT: any[] = [];
  const newsAuditHash: Map<string, string> = new Map();
  const newsAudit = (req: any, e: {
    actorId: string;
    actorRole: 'ADMIN' | 'AUTHORITY' | 'PATIENT' | 'SYSTEM';
    action: string;
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
    previousState?: string;
    newState?: string;
    reason?: string;
    changes?: string;
    result: string;
  }) => {
    const now = nowIso();
    const prevHash = newsAuditHash.get('global') || 'GENESIS';
    const hash = shortHash(`${prevHash}|${now}|${e.action}|${e.actorId}|${e.targetId || ''}`);
    newsAuditHash.set('global', hash);
    NEWS_AUDIT.push({
      auditId: `AUD-${now.slice(0, 10).replace(/-/g, '')}-${hash.slice(0, 6)}`,
      timestamp: now,
      prevHash,
      hash,
      ipAddress: req?.ip || null,
      ...e
    });
    return NEWS_AUDIT[NEWS_AUDIT.length - 1];
  };

  const pushAuthorityNotification = (authorityId: string, n: { kind: string; title: string; body: string; refId?: string }) => {
    const list = AUTHORITY_NOTIFICATIONS.get(authorityId) || [];
    list.unshift({ id: `gntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, read: false, at: nowIso(), ...n });
    AUTHORITY_NOTIFICATIONS.set(authorityId, list);
  };
  const pushAdminNotification = (n: { kind: string; title: string; body: string; refId?: string }) => {
    const list = ADMIN_NOTIFICATIONS.get('all') || [];
    list.unshift({ id: `gntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, read: false, at: nowIso(), ...n });
    ADMIN_NOTIFICATIONS.set('all', list);
  };

  const AUTH_STATES = ['PENDING_REVIEW', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'VERIFIED', 'VERIFIED_RESTRICTED', 'SUSPENDED', 'REVOKED', 'REJECTED'];
  const SUB_STATUSES = ['draft', 'submitted', 'under_review', 'needs_correction', 'approved', 'published', 'rejected'];
  const REPORT_REASONS = [
    'incorrect_information',
    'outdated_information',
    'misleading_information',
    'suspicious_source',
    'fake_authority',
    'incorrect_medical_claim',
    'broken_source',
    'duplicate_article',
    'inappropriate_content'
  ];
  const AUTHORITY_PERMISSION_KEYS = ['submit_news', 'submit_announcements', 'submit_corrections'];
  const HIGH_RISK_CATEGORIES = [
    'Emergency Health Alerts', 'Vaccines', 'Medicines', 'Drug Safety & Recalls',
    'Disease Outbreaks', 'Public Health Emergencies', 'Regulatory Announcements'
  ];

  const authenticateAuthority = (req: any): Authority | null => {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    if (!token.startsWith('news-auth-sess-')) return null;
    const sess = AUTHORITY_SESSIONS.get(token);
    if (!sess) return null;
    if (Date.now() - new Date(sess.lastActive).getTime() > SESSION_TTL_MS) {
      AUTHORITY_SESSIONS.delete(token);
      return null;
    }
    sess.lastActive = nowIso();
    AUTHORITY_SESSIONS.set(token, sess);
    const authority = AUTHORITIES.get(sess.authorityId);
    return authority && !authority.suspended && !['SUSPENDED', 'REVOKED', 'REJECTED'].includes(authority.state) ? authority : null;
  };
  const requireAuthority = (req: any, res: any, next: any) => {
    const authority = authenticateAuthority(req);
    if (!authority) {
      return res.status(401).json({ success: false, code: 'AUTHORITY_AUTH_REQUIRED', error: 'Verified authority sign-in is required for this action.' });
    }
    req.authAuthority = authority;
    next();
  };

  const authenticateNewsAdmin = (req: any): NewsAdmin | null => {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    if (!token.startsWith('news-admin-sess-')) return null;
    const sess = NEWS_ADMIN_SESSIONS.get(token);
    if (!sess) return null;
    if (Date.now() - new Date(sess.lastActive).getTime() > SESSION_TTL_MS) {
      NEWS_ADMIN_SESSIONS.delete(token);
      return null;
    }
    sess.lastActive = nowIso();
    NEWS_ADMIN_SESSIONS.set(token, sess);
    const admin = NEWS_ADMINS.get(sess.adminId);
    return admin?.status === 'active' ? admin : null;
  };
  const requireNewsAdmin = (req: any, res: any, next: any) => {
    const admin = authenticateNewsAdmin(req);
    if (!admin) {
      return res.status(401).json({ success: false, code: 'NEWS_ADMIN_REQUIRED', error: 'News administrator sign-in is required for this action.' });
    }
    req.authNewsAdmin = admin;
    next();
  };

  const normOrg = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Headline similarity (token Jaccard) for duplicate detection.
  const headlineTokens = (s: string) =>
    new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the','and','for','with','new','study','shows','from','health','healthcare','patients'].includes(w)));
  const similarity = (a: string, b: string) => {
    const ta = headlineTokens(a);
    const tb = headlineTokens(b);
    if (!ta.size || !tb.size) return 0;
    let inter = 0;
    ta.forEach((t) => { if (tb.has(t)) inter += 1; });
    return inter / (ta.size + tb.size - inter);
  };
  const findDuplicateSubmissions = (headline: string, sourceUrl: string) => {
    const out: string[] = [];
    for (const s of NEWS_SUBMISSIONS.values()) {
      if (s.status === 'rejected') continue;
      const sim = similarity(s.headline, headline);
      const sameSource = sourceUrl && s.sourceUrl === sourceUrl;
      if (sim >= 0.6 || sameSource) out.push(`${s.headline} (id ${s.submissionId}, ${s.status})`);
    }
    return out;
  };

  // Sanitize an authority for the authority itself (no internal admin fields).
  const publicAuthorityView = (a: Authority) => ({
    authorityId: a.authorityId,
    profile: a.profile,
    state: a.state,
    suspended: a.suspended || false,
    permissions: a.permissions,
    appliedAt: a.appliedAt,
    verificationRecord: a.verificationRecord
      ? { reviewer: a.verificationRecord.reviewer, reviewedAt: a.verificationRecord.reviewedAt, decision: a.verificationRecord.decision, reason: a.verificationRecord.reason }
      : null,
    suspensionRecord: a.suspensionRecord || null
  });

  // ---------------- AUTHORITY: REGISTER (apply for verification) --------
  app.post('/api/news/authority/register', (req, res) => {
    const b = req.body || {};
    const {
      orgName, orgType, website, contactName, contactEmail, contactPhone, address,
      representativeName, representativeRole, credentials, description, verificationReason,
      requestedPermissions, password
    } = b;

    // Automatic validation (spec step 2) — required fields, formats.
    const problems: string[] = [];
    if (!orgName || String(orgName).trim().length < 3) problems.push('Organization name is required (min 3 characters).');
    if (!orgType || String(orgType).trim().length < 3) problems.push('Organization type is required.');
    if (!website || !/^https?:\/\/.+\..+/.test(String(website))) problems.push('A valid official website URL (http/https) is required.');
    if (!contactName || String(contactName).trim().length < 2) problems.push('Official contact name is required.');
    if (!contactEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(contactEmail))) problems.push('A valid official contact email is required.');
    if (!representativeName || String(representativeName).trim().length < 2) problems.push('Authorized representative name is required.');
    if (!representativeRole || String(representativeRole).trim().length < 2) problems.push('Representative role/designation is required.');
    if (!description || String(description).trim().length < 30) problems.push('Organization description is required (min 30 characters).');
    if (!verificationReason || String(verificationReason).trim().length < 20) problems.push('Verification reason is required (min 20 characters).');
    if (!password || String(password).length < 8) problems.push('A password of at least 8 characters is required to secure the authority account.');
    if (problems.length) {
      return res.status(400).json({ success: false, code: 'VALIDATION_FAILED', problems });
    }

    // Duplicate organization detection.
    const existing = [...AUTHORITIES.values()].find((a) => a.state !== 'REJECTED' && normOrg(a.profile.orgName) === normOrg(orgName));
    if (existing) {
      newsAudit(req, { actorId: 'system', actorRole: 'SYSTEM', action: 'AUTHORITY_REGISTRATION_DUPLICATE', targetType: 'authority', targetTitle: String(orgName), result: 'blocked', reason: 'Duplicate organization detected' });
      return res.status(409).json({ success: false, code: 'DUPLICATE_ORGANIZATION', error: 'An authority application for this organization already exists.' });
    }
    const existingEmail = [...AUTHORITIES.values()].find((a) => a.profile.contactEmail.toLowerCase() === String(contactEmail).toLowerCase() && a.state !== 'REJECTED');
    if (existingEmail) {
      return res.status(409).json({ success: false, code: 'DUPLICATE_CONTACT', error: 'This contact email is already associated with an existing authority application.' });
    }

    // Requested permissions: server-side validated against the allowlist.
    const rawPerms = Array.isArray(requestedPermissions) ? requestedPermissions : [];
    const requested = rawPerms.map((p: any) => String(p)).filter((p) => AUTHORITY_PERMISSION_KEYS.includes(p));

    const authorityId = `auth-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const authority: Authority = {
      authorityId,
      passwordHash: hashSecret(authorityId, String(password)),
      profile: {
        orgName: String(orgName).trim().slice(0, 120),
        orgType: String(orgType).trim().slice(0, 80),
        website: String(website).trim().slice(0, 200),
        contactName: String(contactName).trim().slice(0, 80),
        contactEmail: String(contactEmail).trim().toLowerCase().slice(0, 120),
        contactPhone: contactPhone ? String(contactPhone).trim().slice(0, 30) : undefined,
        address: address ? String(address).trim().slice(0, 200) : undefined,
        representativeName: String(representativeName).trim().slice(0, 80),
        representativeRole: String(representativeRole).trim().slice(0, 80),
        credentials: credentials ? String(credentials).trim().slice(0, 400) : undefined,
        description: String(description).trim().slice(0, 2000),
        verificationReason: String(verificationReason).trim().slice(0, 1000),
        requestedPermissions: requested
      },
      state: 'PENDING_REVIEW',
      // NO permissions before administrator verification (least privilege).
      permissions: { canSubmit: false, canPublish: false, categories: [] },
      appliedAt: nowIso()
    };
    AUTHORITIES.set(authorityId, authority);

    newsAudit(req, {
      actorId: authorityId,
      actorRole: 'AUTHORITY',
      action: 'AUTHORITY_REGISTERED',
      targetType: 'authority',
      targetId: authorityId,
      targetTitle: authority.profile.orgName,
      newState: 'PENDING_REVIEW',
      result: 'submitted',
      reason: 'Verification application submitted for administrator review'
    });
    pushAdminNotification({
      kind: 'verification_request',
      title: 'New authority verification request',
      body: `${authority.profile.orgName} (${authority.profile.orgType}) applied for Verified Authority status.`,
      refId: authorityId
    });

    return res.status(201).json({
      success: true,
      authority: publicAuthorityView(authority),
      message: 'Your verification application has been submitted. A GlobalHealth administrator will review it.'
    });
  });

  // ---------------- AUTHORITY: LOGIN ------------------------------------
  app.post('/api/news/authority/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const rl = checkRateLimit(AUTHORITY_LOGIN_ATTEMPTS, String(identifier || '').toLowerCase(), 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many sign-in attempts. Try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
    }
    const auth = [...AUTHORITIES.values()].find(
      (a) => a.authorityId === identifier || a.profile.contactEmail.toLowerCase() === String(identifier || '').toLowerCase() || normOrg(a.profile.orgName) === normOrg(identifier)
    );
    if (!auth || !verifySecret(auth.authorityId, String(password || ''), auth.passwordHash)) {
      registerFailedAttempt(AUTHORITY_LOGIN_ATTEMPTS, String(identifier || '').toLowerCase(), 15 * 60 * 1000);
      newsAudit(req, { actorId: auth?.authorityId || 'unknown', actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN_FAILED', result: 'failed' });
      return res.status(401).json({ success: false, error: 'Incorrect authority credentials.' });
    }
    if (auth.passwordHash.startsWith('pbkdf2-sha256$')) {
      auth.passwordHash = hashSecret(auth.authorityId, String(password || ''));
      AUTHORITIES.set(auth.authorityId, auth);
    }
    AUTHORITY_LOGIN_ATTEMPTS.delete(String(identifier || '').toLowerCase());
    const token = secureToken("news-auth-sess");
    AUTHORITY_SESSIONS.set(token, { authorityId: auth.authorityId, createdAt: nowIso(), lastActive: nowIso() });
    newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN', targetType: 'authority', targetId: auth.authorityId, targetTitle: auth.profile.orgName, result: 'success' });
    return res.json({ success: true, token, authority: publicAuthorityView(auth) });
  });

  // ---------------- AUTHORITY: ME / NOTIFICATIONS -----------------------
  app.get('/api/news/authority/me', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const notifications = (AUTHORITY_NOTIFICATIONS.get(auth.authorityId) || []).slice(0, 50);
    const submissions = [...NEWS_SUBMISSIONS.values()]
      .filter((s) => s.authorityId === auth.authorityId)
      .map((s) => ({ ...s, internalNotes: undefined, similarMatches: undefined }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json({ success: true, authority: publicAuthorityView(auth), notifications, submissions });
  });

  app.post('/api/news/authority/notifications/read', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    (AUTHORITY_NOTIFICATIONS.get(auth.authorityId) || []).forEach((n) => (n.read = true));
    res.json({ success: true });
  });

  // ---------------- AUTHORITY: SUBMISSIONS (OWN ONLY) -------------------
  app.get('/api/news/authority/submissions', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const own = [...NEWS_SUBMISSIONS.values()].filter((s) => s.authorityId === auth.authorityId);
    // Internal admin notes are NEVER returned to the authority.
    const safe = own.map((s) => ({ ...s, internalNotes: undefined })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json({ success: true, submissions: safe });
  });

  app.post('/api/news/authority/submissions', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    // Only VERIFIED / VERIFIED_RESTRICTED authorities with the SUBMIT
    // permission may create submissions. State + permission are server-side.
    if (!['VERIFIED', 'VERIFIED_RESTRICTED'].includes(auth.state)) {
      newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'SUBMISSION_BLOCKED', targetTitle: auth.profile.orgName, result: 'denied', reason: `State ${auth.state} does not permit submissions` });
      return res.status(403).json({ success: false, code: 'NOT_VERIFIED', error: 'Your authority is not verified for submissions yet. A GlobalHealth administrator must verify your organization first.' });
    }
    if (!auth.permissions.canSubmit) {
      return res.status(403).json({ success: false, code: 'NO_SUBMIT_PERMISSION', error: 'Your organization does not have the submission permission. Contact GlobalHealth administration.' });
    }
    const { headline, summary, content, category, sourceName, sourceUrl, sourceDate, references, highRisk } = req.body || {};
    const problems: string[] = [];
    if (!headline || String(headline).trim().length < 10) problems.push('Headline is required (min 10 characters).');
    if (!summary || String(summary).trim().length < 30) problems.push('Summary is required (min 30 characters).');
    if (!content || String(content).trim().length < 100) problems.push('Full article content is required (min 100 characters).');
    if (!category || String(category).trim().length < 2) problems.push('Category is required.');
    if (!sourceName || String(sourceName).trim().length < 2) problems.push('Source name is required — official articles must carry source information.');
    if (sourceUrl && !/^https?:\/\/.+\..+/.test(String(sourceUrl))) problems.push('Source URL must be a valid http/https URL.');
    if (problems.length) return res.status(400).json({ success: false, code: 'VALIDATION_FAILED', problems });

    // Duplicate detection (spec 27): block and surface similar articles.
    const dupes = findDuplicateSubmissions(String(headline), String(sourceUrl || ''));
    if (dupes.length) {
      return res.status(409).json({
        success: false,
        code: 'POTENTIAL_DUPLICATE',
        error: 'A similar article already exists. Review the potential duplicate before proceeding.',
        similar: dupes
      });
    }

    const submissionId = `news-sub-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const sub: NewsSubmission = {
      submissionId,
      authorityId: auth.authorityId,
      headline: String(headline).trim().slice(0, 200),
      summary: String(summary).trim().slice(0, 600),
      content: String(content).slice(0, 40000),
      category: String(category).trim().slice(0, 60),
      sourceName: String(sourceName).trim().slice(0, 120),
      sourceUrl: sourceUrl ? String(sourceUrl).trim().slice(0, 300) : '',
      sourceDate: sourceDate ? String(sourceDate).slice(0, 30) : undefined,
      references: Array.isArray(references) ? references.map((r: any) => String(r).slice(0, 300)).slice(0, 10) : [],
      highRisk: highRisk === true || HIGH_RISK_CATEGORIES.includes(String(category).trim()),
      status: 'draft',
      internalNotes: [],
      revisions: [{ version: 1, at: nowIso(), actor: auth.authorityId, note: 'Draft created', changes: [] }],
      createdAt: nowIso()
    };
    NEWS_SUBMISSIONS.set(submissionId, sub);
    newsAudit(req, {
      actorId: auth.authorityId,
      actorRole: 'AUTHORITY',
      action: 'SUBMISSION_CREATED',
      targetType: 'submission',
      targetId: submissionId,
      targetTitle: sub.headline,
      newState: 'draft',
      result: 'success'
    });
    res.status(201).json({ success: true, submission: { ...sub, internalNotes: undefined } });
  });

  app.post('/api/news/authority/submissions/:submissionId/submit', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const sub = NEWS_SUBMISSIONS.get(req.params.submissionId);
    // Ownership: an authority can only act on its OWN submissions.
    if (!sub || sub.authorityId !== auth.authorityId) {
      return res.status(404).json({ success: false, error: 'This submission could not be found.' });
    }
    if (!['draft', 'needs_correction'].includes(sub.status)) {
      return res.status(409).json({ success: false, code: 'INVALID_STATUS', error: `A submission in status "${sub.status}" cannot be (re)submitted.` });
    }
    if (!auth.permissions.canSubmit || !['VERIFIED', 'VERIFIED_RESTRICTED'].includes(auth.state)) {
      return res.status(403).json({ success: false, code: 'NOT_VERIFIED', error: 'Your authority is not verified for submissions.' });
    }
    const dupes = findDuplicateSubmissions(sub.headline, sub.sourceUrl).filter((d) => !d.includes(sub.submissionId));
    if (dupes.length) {
      return res.status(409).json({ success: false, code: 'POTENTIAL_DUPLICATE', error: 'A similar article already exists. Review the potential duplicate before proceeding.', similar: dupes });
    }
    const wasCorrection = sub.status === 'needs_correction';
    sub.status = 'submitted';
    sub.submittedAt = nowIso();
    sub.similarMatches = [];
    sub.revisions.push({ version: sub.revisions.length + 1, at: nowIso(), actor: auth.authorityId, note: wasCorrection ? 'Correction submitted for re-review' : 'Submitted for administrator review', changes: [] });
    newsAudit(req, {
      actorId: auth.authorityId,
      actorRole: 'AUTHORITY',
      action: wasCorrection ? 'SUBMISSION_CORRECTED' : 'SUBMISSION_SUBMITTED',
      targetType: 'submission',
      targetId: sub.submissionId,
      targetTitle: sub.headline,
      previousState: wasCorrection ? 'needs_correction' : 'draft',
      newState: 'submitted',
      result: 'success'
    });
    pushAdminNotification({
      kind: 'new_submission',
      title: wasCorrection ? 'Correction resubmitted' : 'New authority submission',
      body: `${auth.profile.orgName}: “${sub.headline}”${sub.highRisk ? ' (HIGH-RISK — medical review required)' : ''}`,
      refId: sub.submissionId
    });
    res.json({ success: true, submission: { ...sub, internalNotes: undefined } });
  });

  app.post('/api/news/authority/submissions/:submissionId/correct', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const sub = NEWS_SUBMISSIONS.get(req.params.submissionId);
    if (!sub || sub.authorityId !== auth.authorityId) {
      return res.status(404).json({ success: false, error: 'This submission could not be found.' });
    }
    if (sub.status !== 'needs_correction') {
      return res.status(409).json({ success: false, error: 'This submission is not awaiting a correction.' });
    }
    const { note, headline, summary, content } = req.body || {};
    if (!note || String(note).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Please include a short note describing your correction.' });
    }
    const changes: string[] = [];
    if (headline && String(headline).trim().length >= 10) { sub.headline = String(headline).trim().slice(0, 200); changes.push('headline'); }
    if (summary && String(summary).trim().length >= 30) { sub.summary = String(summary).trim().slice(0, 600); changes.push('summary'); }
    if (content && String(content).trim().length >= 100) { sub.content = String(content).slice(0, 40000); changes.push('content'); }
    sub.correctionResponse = { by: auth.authorityId, note: String(note).trim().slice(0, 1000), at: nowIso() };
    sub.revisions.push({ version: sub.revisions.length + 1, at: nowIso(), actor: auth.authorityId, note: String(note).trim().slice(0, 200), changes });
    newsAudit(req, {
      actorId: auth.authorityId,
      actorRole: 'AUTHORITY',
      action: 'SUBMISSION_CORRECTION_PREPARED',
      targetType: 'submission',
      targetId: sub.submissionId,
      targetTitle: sub.headline,
      changes: changes.join(','),
      result: 'success'
    });
    res.json({ success: true, message: 'Correction recorded. You can now resubmit for review.', submission: { ...sub, internalNotes: undefined } });
  });

  // ---------------- NEWS ADMIN: LOGIN -----------------------------------
  app.post('/api/news/admin/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const admin = [...NEWS_ADMINS.values()].find((a) => a.email.toLowerCase() === String(identifier || '').toLowerCase() || a.adminId === identifier);
    if (!admin || !verifySecret(admin.adminId, String(password || ''), admin.passwordHash)) {
      newsAudit(req, { actorId: admin?.adminId || 'unknown', actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN_FAILED', result: 'failed' });
      return res.status(401).json({ success: false, error: 'Incorrect administrator credentials.' });
    }
    if (admin.passwordHash.startsWith('pbkdf2-sha256$')) {
      admin.passwordHash = hashSecret(admin.adminId, String(password || ''));
      NEWS_ADMINS.set(admin.adminId, admin);
    }
    const token = secureToken("news-admin-sess");
    NEWS_ADMIN_SESSIONS.set(token, { adminId: admin.adminId, createdAt: nowIso(), lastActive: nowIso() });
    newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN', targetTitle: admin.name, result: 'success' });
    return res.json({ success: true, token, admin: { adminId: admin.adminId, name: admin.name, email: admin.email, role: admin.role, title: admin.title } });
  });

  // ---------------- NEWS ADMIN: VERIFICATION QUEUE ----------------------
  app.get('/api/news/admin/applications', requireNewsAdmin, (req: any, res) => {
    const stateFilter = req.query.state ? String(req.query.state) : null;
    if (stateFilter && !AUTH_STATES.includes(stateFilter)) {
      return res.status(400).json({ success: false, error: 'Invalid state filter.' });
    }
    const list = [...AUTHORITIES.values()]
      .filter((a) => !stateFilter || a.state === stateFilter)
      .map((a) => ({ ...publicAuthorityView(a) }))
      .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
    res.json({ success: true, applications: list, states: AUTH_STATES });
  });

  app.post('/api/news/admin/applications/:authorityId/decision', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const authority = AUTHORITIES.get(req.params.authorityId);
    if (!authority) return res.status(404).json({ success: false, error: 'This authority application could not be found.' });
    const { decision, note, canSubmit, canPublish, categories } = req.body || {};
    const decisions = ['approve', 'approve_restricted', 'reject', 'request_info', 'under_review'];
    if (!decisions.includes(decision)) {
      return res.status(400).json({ success: false, error: 'A valid decision (approve, approve_restricted, reject, request_info, under_review) is required.' });
    }
    if (decision === 'approve' || decision === 'reject' || decision === 'approve_restricted') {
      if (!note || String(note).trim().length < 10) {
        return res.status(400).json({ success: false, error: 'A verification reason (min 10 characters) is required for this decision.' });
      }
    }
    const prevState = authority.state;
    const nextPermissions = {
      canSubmit: decision === 'approve' ? true : decision === 'approve_restricted' ? canSubmit !== false : false,
      // Direct publishing is exceptional and must be explicitly granted.
      canPublish: decision === 'approve' && canPublish === true,
      categories: Array.isArray(categories) ? categories.map((c: any) => String(c).slice(0, 60)).slice(0, 20) : ['All Categories']
    };
    let newState: AuthorityState;
    switch (decision) {
      case 'approve': newState = 'VERIFIED'; break;
      case 'approve_restricted': newState = 'VERIFIED_RESTRICTED'; break;
      case 'reject': newState = 'REJECTED'; break;
      case 'request_info': newState = 'MORE_INFO_REQUIRED'; break;
      case 'under_review': newState = 'UNDER_REVIEW'; break;
      default: newState = prevState;
    }
    authority.state = newState;
    authority.suspended = false;
    if (newState === 'VERIFIED' || newState === 'VERIFIED_RESTRICTED') {
      authority.permissions = nextPermissions;
      authority.verificationRecord = {
        reviewer: admin.name,
        reviewedAt: nowIso(),
        decision: decision === 'approve' ? 'Verified' : 'Verified with Restrictions',
        reason: String(note).trim().slice(0, 1000),
        previousState: prevState
      };
    }
    newsAudit(req, {
      actorId: admin.adminId,
      actorRole: 'ADMIN',
      action: 'VERIFICATION_DECISION',
      targetType: 'authority',
      targetId: authority.authorityId,
      targetTitle: authority.profile.orgName,
      previousState: prevState,
      newState,
      reason: note ? String(note).trim().slice(0, 500) : undefined,
      result: decision
    });
    pushAuthorityNotification(authority.authorityId, {
      kind: decision === 'reject' ? 'verification_rejected' : decision === 'request_info' ? 'verification_info_requested' : decision === 'under_review' ? 'verification_under_review' : 'verification_decision',
      title:
        decision === 'approve' ? 'Your organization is now a Verified Authority' :
        decision === 'approve_restricted' ? 'Your organization is verified with restricted permissions' :
        decision === 'reject' ? 'Verification request rejected' :
        decision === 'request_info' ? 'Additional information required' : 'Application placed under review',
      body:
        note
          ? `${String(note).trim().slice(0, 300)}${decision.startsWith('approve') ? ` You may now ${nextPermissions.canSubmit ? 'submit news articles for administrator review' : 'view your account status'} (direct publishing: ${nextPermissions.canPublish ? 'granted' : 'not granted'}).` : ''}`
          : 'An administrator has reviewed your application.'
    });
    res.json({ success: true, authority: publicAuthorityView(authority) });
  });

  // ---------------- NEWS ADMIN: AUTHORITIES -----------------------------
  app.get('/api/news/admin/authorities', requireNewsAdmin, (req: any, res) => {
    const list = [...AUTHORITIES.values()].map((a) => publicAuthorityView(a)).sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
    res.json({ success: true, authorities: list });
  });

  const authorityStateAction = (action: 'suspend' | 'revoke' | 'restore') => (req: any, res: any) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const authority = AUTHORITIES.get(req.params.authorityId);
    if (!authority) return res.status(404).json({ success: false, error: 'This authority could not be found.' });
    const { reason } = req.body || {};
    if (action !== 'restore' && (!reason || String(reason).trim().length < 10)) {
      return res.status(400).json({ success: false, error: 'A reason (min 10 characters) is required.' });
    }
    const prevState = authority.state;
    if (action === 'suspend') {
      authority.state = 'SUSPENDED';
      authority.suspended = true;
      authority.suspensionRecord = { reviewer: admin.name, at: nowIso(), reason: String(reason).trim().slice(0, 1000) };
      // Suspension blocks new submissions; existing published articles remain
      // subject to review (they are not auto-removed).
      authority.permissions = { ...authority.permissions, canSubmit: false, canPublish: false };
    } else if (action === 'revoke') {
      authority.state = 'REVOKED';
      authority.suspended = false;
      authority.permissions = { canSubmit: false, canPublish: false, categories: [] };
      authority.verificationRecord = authority.verificationRecord
        ? { ...authority.verificationRecord, decision: 'Verification Revoked', reason: String(reason).trim().slice(0, 1000), reviewedAt: nowIso(), reviewer: admin.name }
        : { reviewer: admin.name, reviewedAt: nowIso(), decision: 'Verification Revoked', reason: String(reason).trim().slice(0, 1000), previousState: prevState };
    } else {
      authority.state = 'VERIFIED_RESTRICTED';
      authority.suspended = false;
      authority.suspensionRecord = undefined;
      // Restore returns to restricted verification — an admin must re-decide
      // full verification if desired.
      authority.permissions = { canSubmit: false, canPublish: false, categories: ['All Categories'] };
    }
    newsAudit(req, {
      actorId: admin.adminId,
      actorRole: 'ADMIN',
      action: action === 'suspend' ? 'AUTHORITY_SUSPENDED' : action === 'revoke' ? 'AUTHORITY_VERIFICATION_REVOKED' : 'AUTHORITY_RESTORED',
      targetType: 'authority',
      targetId: authority.authorityId,
      targetTitle: authority.profile.orgName,
      previousState: prevState,
      newState: authority.state,
      reason: reason ? String(reason).trim().slice(0, 500) : undefined,
      result: 'success'
    });
    pushAuthorityNotification(authority.authorityId, {
      kind: action === 'restore' ? 'authority_restored' : action === 'revoke' ? 'verification_revoked' : 'authority_suspended',
      title: action === 'suspend' ? 'Your authority account has been suspended' : action === 'revoke' ? 'Your verification has been revoked' : 'Your authority account has been restored',
      body: reason ? String(reason).trim().slice(0, 300) : 'Contact GlobalHealth administration for details.'
    });
    res.json({ success: true, authority: publicAuthorityView(authority) });
  };
  app.post('/api/news/admin/authorities/:authorityId/suspend', requireNewsAdmin, authorityStateAction('suspend'));
  app.post('/api/news/admin/authorities/:authorityId/revoke', requireNewsAdmin, authorityStateAction('revoke'));
  app.post('/api/news/admin/authorities/:authorityId/restore', requireNewsAdmin, authorityStateAction('restore'));

  // ---------------- NEWS ADMIN: SUBMISSIONS (ALL, ISOLATED FROM AUTHS) ---
  app.get('/api/news/admin/submissions', requireNewsAdmin, (req: any, res) => {
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const list = [...NEWS_SUBMISSIONS.values()]
      .map((s) => {
        const auth = AUTHORITIES.get(s.authorityId);
        return {
          ...s, // includes internalNotes — admin-only view
          authorityName: auth?.profile.orgName || 'Unknown organization',
          authorityState: auth?.state || 'UNKNOWN'
        };
      })
      .filter((s) => !statusFilter || s.status === statusFilter)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json({ success: true, submissions: list, statuses: SUB_STATUSES });
  });

  app.post('/api/news/admin/submissions/:submissionId/review', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const sub = NEWS_SUBMISSIONS.get(req.params.submissionId);
    if (!sub) return res.status(404).json({ success: false, error: 'This submission could not be found.' });
    const { action, note, internalNote, medicalReviewConfirmed, correctionNotice } = req.body || {};
    const actions = ['approve', 'reject', 'request_correction', 'publish'];
    if (!actions.includes(action)) {
      return res.status(400).json({ success: false, error: 'A valid action (approve, reject, request_correction, publish) is required.' });
    }
    if (internalNote) sub.internalNotes.push({ by: admin.name, note: String(internalNote).slice(0, 1000), at: nowIso() });
    const prevState = sub.status;
    const auth = AUTHORITIES.get(sub.authorityId);

    if (action === 'request_correction') {
      if (!note || String(note).trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Please describe the required corrections.' });
      }
      sub.status = 'needs_correction';
      sub.correctionRequested = { by: admin.name, note: String(note).trim().slice(0, 1000), at: nowIso() };
    } else if (action === 'reject') {
      if (!note || String(note).trim().length < 5) {
        return res.status(400).json({ success: false, error: 'A rejection reason is required.' });
      }
      sub.status = 'rejected';
      sub.decidedAt = nowIso();
      sub.decidedBy = admin.name;
    } else if (action === 'approve') {
      // High-risk content requires an explicit medical-review confirmation.
      if (sub.highRisk && medicalReviewConfirmed !== true) {
        return res.status(400).json({ success: false, code: 'MEDICAL_REVIEW_REQUIRED', error: 'This article is classified high-risk. Confirm that medical/subject-matter review was completed before approving.' });
      }
      sub.status = 'approved';
      sub.medicalReviewConfirmed = sub.highRisk ? true : sub.medicalReviewConfirmed;
      sub.decidedAt = nowIso();
      sub.decidedBy = admin.name;
    } else if (action === 'publish') {
      if (sub.status === 'needs_correction' || sub.status === 'draft' || sub.status === 'rejected') {
        return res.status(409).json({ success: false, error: `An article in status "${sub.status}" cannot be published directly.` });
      }
      if (sub.highRisk && !sub.medicalReviewConfirmed && medicalReviewConfirmed !== true) {
        return res.status(400).json({ success: false, code: 'MEDICAL_REVIEW_REQUIRED', error: 'Confirm medical review before publishing this high-risk article.' });
      }
      sub.status = 'published';
      sub.medicalReviewConfirmed = sub.highRisk ? true : sub.medicalReviewConfirmed;
      sub.publishedAt = sub.publishedAt || nowIso();
      sub.updatedAt = nowIso();
      sub.decidedAt = nowIso();
      sub.decidedBy = admin.name;
      if (correctionNotice && String(correctionNotice).trim().length >= 5) {
        sub.correctionNotice = String(correctionNotice).trim().slice(0, 500);
      }
    }
    sub.revisions.push({ version: sub.revisions.length + 1, at: nowIso(), actor: admin.name, note: note ? String(note).trim().slice(0, 200) : `Status: ${action}`, changes: [`status -> ${sub.status}`] });
    newsAudit(req, {
      actorId: admin.adminId,
      actorRole: 'ADMIN',
      action: `SUBMISSION_${action.toUpperCase()}`,
      targetType: 'submission',
      targetId: sub.submissionId,
      targetTitle: sub.headline,
      previousState: prevState,
      newState: sub.status,
      reason: note ? String(note).trim().slice(0, 500) : undefined,
      result: 'success'
    });
    if (action !== 'request_correction') {
      pushAuthorityNotification(sub.authorityId, {
        kind: action === 'publish' ? 'article_published' : action === 'approve' ? 'article_approved' : 'article_rejected',
        title: action === 'publish' ? 'Your article was published' : action === 'approve' ? 'Your article was approved' : 'Your article was rejected',
        body: note ? String(note).trim().slice(0, 300) : `“${sub.headline}” is now ${sub.status}.`,
        refId: sub.submissionId
      });
    }
    res.json({ success: true, submission: { ...sub } });
  });

  // ---------------- NEWS ADMIN: REPORTS ---------------------------------
  app.get('/api/news/admin/reports', requireNewsAdmin, (req: any, res) => {
    const list = [...NEWS_REPORTS.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json({ success: true, reports: list });
  });

  app.post('/api/news/admin/reports/:reportId/resolve', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const report = NEWS_REPORTS.get(req.params.reportId);
    if (!report) return res.status(404).json({ success: false, error: 'This report could not be found.' });
    const { resolution } = req.body || {};
    if (!resolution || String(resolution).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'A resolution note is required.' });
    }
    report.status = 'RESOLVED';
    report.resolution = String(resolution).trim().slice(0, 1000);
    report.resolvedBy = admin.name;
    report.resolvedAt = nowIso();
    newsAudit(req, {
      actorId: admin.adminId,
      actorRole: 'ADMIN',
      action: 'REPORT_RESOLVED',
      targetType: 'report',
      targetId: report.reportId,
      targetTitle: report.articleTitle,
      reason: report.resolution,
      result: 'success'
    });
    res.json({ success: true, report });
  });

  // ---------------- PUBLIC: PUBLISHED AUTHORITY ARTICLES ----------------
  app.get('/api/news/public/articles', (req, res) => {
    const list = [...NEWS_SUBMISSIONS.values()]
      .filter((s) => s.status === 'published')
      .map((s) => {
        const auth = AUTHORITIES.get(s.authorityId);
        return {
          articleRef: s.submissionId,
          headline: s.headline,
          summary: s.summary,
          content: s.content,
          category: s.category,
          sourceName: s.sourceName,
          sourceUrl: s.sourceUrl,
          sourceDate: s.sourceDate,
          references: s.references,
          highRisk: s.highRisk,
          submittedBy: auth ? { name: auth.profile.orgName, orgType: auth.profile.orgType, verified: true } : null,
          publishedBy: 'GlobalHealth News Team',
          publishedAt: s.publishedAt,
          updatedAt: s.updatedAt,
          correctionNotice: s.correctionNotice || null
        };
      })
      .sort((a, b) => ((a.publishedAt || '') < (b.publishedAt || '') ? 1 : -1));
    res.json({ success: true, articles: list });
  });

  // ---------------- PUBLIC: USER REPORTS (authenticated patients) -------
  app.post('/api/news/public/report', requireAuth, (req: any, res) => {
    const user: ServerPublicUser = req.authUser;
    const { articleRef, articleTitle, reason, detail } = req.body || {};
    if (!articleRef || !reason) {
      return res.status(400).json({ success: false, error: 'The article reference and a report reason are required.' });
    }
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, error: 'Please choose a valid report reason.' });
    }
    const reportId = `news-report-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const report: NewsReport = {
      reportId,
      articleRef: String(articleRef).slice(0, 100),
      articleTitle: String(articleTitle || 'Untitled article').slice(0, 200),
      reason,
      detail: detail ? String(detail).trim().slice(0, 1000) : '',
      reporterUserId: user.id,
      reporterName: user.fullName,
      status: 'OPEN',
      createdAt: nowIso()
    };
    NEWS_REPORTS.set(reportId, report);
    newsAudit(req, {
      actorId: user.id,
      actorRole: 'PATIENT',
      action: 'REPORT_CREATED',
      targetType: 'report',
      targetId: reportId,
      targetTitle: report.articleTitle,
      reason,
      result: 'submitted'
    });
    pushAdminNotification({
      kind: 'reported_article',
      title: 'New user report on a news article',
      body: `“${report.articleTitle}” was reported as ${reason.replace(/_/g, ' ')}.`,
      refId: reportId
    });
    res.status(201).json({
      success: true,
      message: 'Thank you. Your report has been recorded and will be reviewed by the GlobalHealth editorial team.'
    });
  });

  // ---------------- NEWS ADMIN: NOTIFICATIONS ---------------------------
  app.get('/api/news/admin/notifications', requireNewsAdmin, (req: any, res) => {
    const list = (ADMIN_NOTIFICATIONS.get('all') || []).slice(0, 50);
    res.json({ success: true, notifications: list, unreadCount: list.filter((n) => !n.read).length });
  });

  app.post('/api/news/admin/notifications/read', requireNewsAdmin, (req: any, res) => {
    (ADMIN_NOTIFICATIONS.get('all') || []).forEach((n) => (n.read = true));
    res.json({ success: true });
  });

  // ---------------- NEWS ADMIN: AUDIT TRAIL (append-only) ---------------
  app.get('/api/news/admin/audit-logs', requireNewsAdmin, (req: any, res) => {
    const list = [...NEWS_AUDIT].reverse().slice(0, 300);
    res.json({ success: true, logs: list });
  });
  // ======================================================================
  // NEWS MANAGEMENT UNIFIED LOGIN — individual accounts, server-determined
  // roles, MFA, sessions, password reset.
  //  - ONE login entry point for administrators AND verified authorities.
  //  - The role is NEVER client-selected: the server determines it from the
  //    authenticated account record.
  //  - Individual accounts only (no shared logins); every action is
  //    attributable to a specific named account.
  //  - Suspended accounts are denied at login with a safe, generic message.
  //  - MFA (simulated delivery in this demo environment) is required for
  //    administrators and for authority accounts holding publishing rights.
  // ======================================================================

  const NEWS_ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
    SUPER_ADMIN: [
      'news.view', 'news.create', 'news.edit', 'news.delete', 'news.permanent_delete',
      'news.archive', 'news.restore', 'news.publish', 'news.unpublish', 'news.schedule',
      'news.cancel_schedule', 'news.review', 'news.approve', 'news.reject', 'news.request_changes',
      'news.manage_categories', 'news.manage_tags', 'news.manage_authors', 'news.manage_featured',
      'news.manage_breaking_news', 'news.manage_media', 'news.manage_seo', 'news.manage_comments',
      'news.view_analytics', 'news.view_audit_logs', 'news.export', 'news.manage_permissions', 'news.admin_override'
    ],
    NEWS_ADMIN: [
      'news.view', 'news.create', 'news.edit', 'news.delete', 'news.archive', 'news.restore',
      'news.publish', 'news.unpublish', 'news.schedule', 'news.cancel_schedule', 'news.review',
      'news.approve', 'news.reject', 'news.request_changes', 'news.manage_categories',
      'news.manage_tags', 'news.manage_authors', 'news.manage_featured', 'news.manage_breaking_news',
      'news.manage_media', 'news.manage_seo', 'news.manage_comments', 'news.view_analytics',
      'news.view_audit_logs', 'news.export'
    ],
    EDITOR: [
      'news.view', 'news.create', 'news.edit', 'news.delete', 'news.archive', 'news.restore',
      'news.schedule', 'news.review', 'news.approve', 'news.request_changes', 'news.manage_categories',
      'news.manage_tags', 'news.manage_media', 'news.manage_seo', 'news.manage_comments', 'news.view_analytics'
    ],
    REVIEWER: [
      'news.view', 'news.review', 'news.approve', 'news.reject', 'news.request_changes',
      'news.manage_comments', 'news.view_analytics'
    ],
    PUBLISHER: [
      'news.view', 'news.publish', 'news.unpublish', 'news.schedule', 'news.cancel_schedule',
      'news.archive', 'news.manage_featured', 'news.view_analytics'
    ],
    AUTHOR: [
      'news.view', 'news.create', 'news.edit', 'news.manage_media', 'news.manage_comments'
    ]
  };

  // Individual administrator accounts — one account per person, each with
  // their own credentials and permission set. (No shared logins.)
  const NEWS_ADMIN_SEED: NewsAdmin[] = [
    { adminId: 'news-admin-1', name: 'Dr. Evelyn Carter', email: 'admin@globalhealth.org', passwordHash: hashSecret('news-admin-1', 'Password123!'), role: 'SUPER_ADMIN', title: 'Chief Medical Editor & Super Administrator', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.SUPER_ADMIN },
    { adminId: 'news-admin-2', name: 'Marcus Sterling', email: 'newsadmin@globalhealth.org', passwordHash: hashSecret('news-admin-2', 'Password123!'), role: 'NEWS_ADMIN', title: 'Lead News Operations Manager', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.NEWS_ADMIN },
    { adminId: 'news-admin-3', name: 'Sarah Chen, MD', email: 'editor@globalhealth.org', passwordHash: hashSecret('news-admin-3', 'Password123!'), role: 'EDITOR', title: 'Senior Clinical Editor — Cardiology & Endocrinology', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.EDITOR },
    { adminId: 'news-admin-4', name: 'Dr. James Thorne', email: 'reviewer@globalhealth.org', passwordHash: hashSecret('news-admin-4', 'Password123!'), role: 'REVIEWER', title: 'Independent Peer Reviewer & Oncology Specialist', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.REVIEWER },
    { adminId: 'news-admin-5', name: 'Elena Rostova', email: 'publisher@globalhealth.org', passwordHash: hashSecret('news-admin-5', 'Password123!'), role: 'PUBLISHER', title: 'Digital Publishing & Syndication Manager', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.PUBLISHER },
    { adminId: 'news-admin-6', name: 'David Kim, MSc', email: 'author@globalhealth.org', passwordHash: hashSecret('news-admin-6', 'Password123!'), role: 'AUTHOR', title: 'Staff Medical Science Writer', status: 'active', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.AUTHOR },
    { adminId: 'news-admin-7', name: 'Jordan Stone', email: 'j.stone@globalhealth.org', passwordHash: hashSecret('news-admin-7', 'Password123!'), role: 'NEWS_ADMIN', title: 'Former News Operations Lead', status: 'suspended', mfaEnabled: true, permissions: NEWS_ADMIN_ROLE_PERMISSIONS.NEWS_ADMIN }
  ];

  const NEWS_MFA_CHALLENGES: Map<string, { accountType: 'admin' | 'authority'; accountId: string; code: string; expiresAt: number; attempts: number }> = new Map();
  const NEWS_RESET_TOKENS: Map<string, { code: string; accountType: 'admin' | 'authority'; accountId: string; email: string; expiresAt: number; attempts: number }> = new Map();
  const NEWS_LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();

  const SAFE_SIGNIN_ERROR = 'The sign-in information could not be verified.';
  const SAFE_SUSPENDED_ERROR = 'Your News Management account is currently unavailable. Please contact the GlobalHealth administrator.';

  const adminPublicView = (a: NewsAdmin) => ({
    adminId: a.adminId,
    name: a.name,
    email: a.email,
    role: a.role,
    title: a.title,
    status: a.status,
    mfaEnabled: a.mfaEnabled,
    permissions: a.permissions
  });

  const issueAdminSession = (adminId: string) => {
    const token = secureToken("news-admin-sess");
    NEWS_ADMIN_SESSIONS.set(token, { adminId, createdAt: nowIso(), lastActive: nowIso() });
    return token;
  };
  const issueAuthoritySession = (authorityId: string) => {
    const token = secureToken("news-auth-sess");
    AUTHORITY_SESSIONS.set(token, { authorityId, createdAt: nowIso(), lastActive: nowIso() });
    return token;
  };

  // ---------------- UNIFIED NEWS MANAGEMENT LOGIN -----------------------
  // One entry point. The server determines the account type + role; the
  // client can never select or claim a role. Safe, generic errors.
  app.post('/api/news/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const idKey = String(identifier || '').trim().toLowerCase();
    const rl = checkRateLimit(NEWS_LOGIN_ATTEMPTS, idKey, 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many sign-in attempts. Try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
    }

    // --- Administrator? ---
    const admin = [...NEWS_ADMINS.values()].find(
      (a) => a.email.toLowerCase() === idKey || a.adminId === identifier
    );
    if (admin) {
      if (!verifySecret(admin.adminId, String(password || ''), admin.passwordHash)) {
        registerFailedAttempt(NEWS_LOGIN_ATTEMPTS, idKey, 15 * 60 * 1000);
        newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN_FAILED', targetTitle: admin.name, result: 'failed' });
        return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', error: SAFE_SIGNIN_ERROR });
      }
      if (admin.passwordHash.startsWith('pbkdf2-sha256$')) {
        admin.passwordHash = hashSecret(admin.adminId, String(password || ''));
        NEWS_ADMINS.set(admin.adminId, admin);
      }
      if (admin.status !== 'active') {
        newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN_SUSPENDED', targetTitle: admin.name, result: 'denied', reason: 'Account status: suspended' });
        return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: SAFE_SUSPENDED_ERROR });
      }
      NEWS_LOGIN_ATTEMPTS.delete(idKey);
      // Stronger control for administrators: MFA is always required.
      if (admin.mfaEnabled) {
        const challengeId = secureToken('mfa');
        const code = String(Math.floor(100000 + Math.random() * 900000));
        NEWS_MFA_CHALLENGES.set(challengeId, { accountType: 'admin', accountId: admin.adminId, code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
        newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_MFA_DISPATCHED', targetTitle: admin.name, result: 'dispatched' });
        return res.json({
          success: true,
          stage: 'mfa',
          accountType: 'admin',
          challengeId,
          challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          // MFA delivery must never expose the code to the browser in
          // production; the code is delivered only through the configured
          // email channel. Development builds may surface it for smoke tests.
          ...(IS_PRODUCTION ? {} : { demoDelivery: { channel: 'Simulated email (dev only)', recipientEmail: admin.email, code } })
        });
      }
      const token = issueAdminSession(admin.adminId);
      newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN', targetTitle: admin.name, result: 'success' });
      return res.json({ success: true, stage: 'complete', accountType: 'admin', token, admin: adminPublicView(admin) });
    }

    // --- Verified Authority? ---
    const auth = [...AUTHORITIES.values()].find(
      (a) => a.profile.contactEmail.toLowerCase() === idKey || a.authorityId === identifier || normOrg(a.profile.orgName) === normOrg(identifier)
    );
    if (auth) {
      if (!verifySecret(auth.authorityId, String(password || ''), auth.passwordHash)) {
        registerFailedAttempt(NEWS_LOGIN_ATTEMPTS, idKey, 15 * 60 * 1000);
        newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN_FAILED', targetTitle: auth.profile.orgName, result: 'failed' });
        return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', error: SAFE_SIGNIN_ERROR });
      }
      if (auth.passwordHash.startsWith('pbkdf2-sha256$')) {
        auth.passwordHash = hashSecret(auth.authorityId, String(password || ''));
        AUTHORITIES.set(auth.authorityId, auth);
      }
      if (auth.state === 'SUSPENDED') {
        newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN_SUSPENDED', targetTitle: auth.profile.orgName, result: 'denied', reason: 'Organization suspended' });
        return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: SAFE_SUSPENDED_ERROR });
      }
      // An authority that has not completed GlobalHealth verification cannot
      // sign in at all — least privilege starts at the door.
      if (auth.state === 'PENDING_REVIEW' || auth.state === 'REJECTED') {
        newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN_BLOCKED_UNVERIFIED', targetTitle: auth.profile.orgName, result: 'denied', reason: `State: ${auth.state}` });
        return res.status(403).json({
          success: false,
          code: 'NOT_VERIFIED',
          error: auth.state === 'REJECTED'
            ? "This organization's authority application was rejected. Contact GlobalHealth news administration."
            : 'This organization is still pending GlobalHealth verification. You will be able to sign in once your authority application is approved.'
        });
      }
      NEWS_LOGIN_ATTEMPTS.delete(idKey);
      // MFA where practical: authority accounts holding publishing rights.
      const mfaNeeded = ['VERIFIED', 'VERIFIED_RESTRICTED'].includes(auth.state) && auth.permissions.canSubmit;
      if (mfaNeeded) {
        const challengeId = secureToken('mfa');
        const code = String(Math.floor(100000 + Math.random() * 900000));
        NEWS_MFA_CHALLENGES.set(challengeId, { accountType: 'authority', accountId: auth.authorityId, code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
        newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_MFA_DISPATCHED', targetTitle: auth.profile.orgName, result: 'dispatched' });
        return res.json({
          success: true,
          stage: 'mfa',
          accountType: 'authority',
          challengeId,
          challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          ...(IS_PRODUCTION ? {} : { demoDelivery: { channel: 'Simulated email (dev only)', recipientEmail: auth.profile.contactEmail, code } })
        });
      }
      const token = issueAuthoritySession(auth.authorityId);
      newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN', targetTitle: auth.profile.orgName, result: 'success' });
      return res.json({ success: true, stage: 'complete', accountType: 'authority', token, authority: publicAuthorityView(auth) });
    }

    registerFailedAttempt(NEWS_LOGIN_ATTEMPTS, idKey, 15 * 60 * 1000);
    return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', error: SAFE_SIGNIN_ERROR });
  });

  // ---------------- MFA VERIFICATION ------------------------------------
  app.post('/api/news/mfa/verify', (req, res) => {
    const { challengeId, code } = req.body || {};
    const challenge = challengeId ? NEWS_MFA_CHALLENGES.get(challengeId) : undefined;
    if (!challenge || challenge.expiresAt < Date.now()) {
      if (challengeId) NEWS_MFA_CHALLENGES.delete(challengeId);
      return res.status(400).json({ success: false, code: 'MFA_EXPIRED', error: 'This verification session has expired. Please sign in again.' });
    }
    if (challenge.attempts >= 5) {
      NEWS_MFA_CHALLENGES.delete(challengeId);
      newsAudit(req, { actorId: challenge.accountId, actorRole: challenge.accountType === 'admin' ? 'ADMIN' : 'AUTHORITY', action: 'NEWS_MFA_FAILED', result: 'denied', reason: 'Too many incorrect codes' });
      return res.status(401).json({ success: false, code: 'MFA_LOCKED', error: 'Too many incorrect codes. Please sign in again.' });
    }
    if (String(code || '').trim() !== challenge.code) {
      challenge.attempts += 1;
      newsAudit(req, { actorId: challenge.accountId, actorRole: challenge.accountType === 'admin' ? 'ADMIN' : 'AUTHORITY', action: 'NEWS_MFA_FAILED', result: 'failed', reason: 'Incorrect code' });
      return res.status(401).json({ success: false, code: 'MFA_INVALID', error: 'Invalid verification code. Please check and try again.' });
    }
    NEWS_MFA_CHALLENGES.delete(challengeId);
    newsAudit(req, { actorId: challenge.accountId, actorRole: challenge.accountType === 'admin' ? 'ADMIN' : 'AUTHORITY', action: 'NEWS_MFA_SUCCESS', result: 'success' });
    if (challenge.accountType === 'admin') {
      const admin = NEWS_ADMINS.get(challenge.accountId);
      if (!admin || admin.status !== 'active') return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: SAFE_SUSPENDED_ERROR });
      const token = issueAdminSession(admin.adminId);
      newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGIN', targetTitle: admin.name, result: 'success', reason: 'After MFA verification' });
      return res.json({ success: true, stage: 'complete', accountType: 'admin', token, admin: adminPublicView(admin) });
    }
    const auth = AUTHORITIES.get(challenge.accountId);
    if (!auth) return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: SAFE_SUSPENDED_ERROR });
    if (auth.state === 'SUSPENDED') return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: SAFE_SUSPENDED_ERROR });
    const token = issueAuthoritySession(auth.authorityId);
    newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGIN', targetTitle: auth.profile.orgName, result: 'success', reason: 'After MFA verification' });
    return res.json({ success: true, stage: 'complete', accountType: 'authority', token, authority: publicAuthorityView(auth) });
  });

  // ---------------- ADMIN: ME (session check + profile) -----------------
  app.get('/api/news/admin/me', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    res.json({ success: true, admin: adminPublicView(admin) });
  });

  // ---------------- SESSION MANAGEMENT ----------------------------------
  app.get('/api/news/admin/sessions', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const sessions = [...NEWS_ADMIN_SESSIONS.entries()]
      .filter(([, s]) => s.adminId === admin.adminId)
      .map(([sid, s]) => ({ sessionId: sid.slice(0, 14) + '…', createdAt: s.createdAt, lastActive: s.lastActive, isCurrent: sid === currentToken }))
      .sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1));
    res.json({ success: true, sessions });
  });

  app.post('/api/news/admin/sessions/terminate-all', requireNewsAdmin, (req: any, res) => {
    const admin: NewsAdmin = req.authNewsAdmin;
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    let count = 0;
    for (const [sid, s] of [...NEWS_ADMIN_SESSIONS.entries()]) {
      if (s.adminId === admin.adminId && sid !== currentToken) { NEWS_ADMIN_SESSIONS.delete(sid); count += 1; }
    }
    newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_SESSIONS_TERMINATED', targetTitle: admin.name, result: 'success', reason: `${count} other session(s) terminated` });
    res.json({ success: true, terminated: count });
  });

  app.get('/api/news/authority/sessions', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const sessions = [...AUTHORITY_SESSIONS.entries()]
      .filter(([, s]) => s.authorityId === auth.authorityId)
      .map(([sid, s]) => ({ sessionId: sid.slice(0, 14) + '…', createdAt: s.createdAt, lastActive: s.lastActive, isCurrent: sid === currentToken }))
      .sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1));
    res.json({ success: true, sessions });
  });

  app.post('/api/news/authority/sessions/terminate-all', requireAuthority, (req: any, res) => {
    const auth: Authority = req.authAuthority;
    const currentToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    let count = 0;
    for (const [sid, s] of [...AUTHORITY_SESSIONS.entries()]) {
      if (s.authorityId === auth.authorityId && sid !== currentToken) { AUTHORITY_SESSIONS.delete(sid); count += 1; }
    }
    newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_SESSIONS_TERMINATED', targetTitle: auth.profile.orgName, result: 'success', reason: `${count} other session(s) terminated` });
    res.json({ success: true, terminated: count });
  });

  // ---------------- UNIFIED LOGOUT --------------------------------------
  app.post('/api/news/logout', (req, res) => {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    if (token.startsWith('news-admin-sess-')) {
      const sess = NEWS_ADMIN_SESSIONS.get(token);
      if (sess) {
        const admin = NEWS_ADMINS.get(sess.adminId);
        NEWS_ADMIN_SESSIONS.delete(token);
        newsAudit(req, { actorId: sess.adminId, actorRole: 'ADMIN', action: 'NEWS_ADMIN_LOGOUT', targetTitle: admin?.name, result: 'success' });
      }
      return res.json({ success: true });
    }
    if (token.startsWith('news-auth-sess-')) {
      const sess = AUTHORITY_SESSIONS.get(token);
      if (sess) {
        const auth = AUTHORITIES.get(sess.authorityId);
        AUTHORITY_SESSIONS.delete(token);
        newsAudit(req, { actorId: sess.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_LOGOUT', targetTitle: auth?.profile.orgName, result: 'success' });
      }
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: 'No active News Management session to end.' });
  });

  // ---------------- PASSWORD RESET (secure, non-enumerable) -------------
  app.post('/api/news/forgot-password', (req, res) => {
    const { email } = req.body || {};
    const emailKey = String(email || '').trim().toLowerCase();
    // The response shape is IDENTICAL whether or not the account exists —
    // no account enumeration. In this demo environment the "email" is a
    // simulated delivery channel.
    let token = secureToken("rst");
    let code = String(Math.floor(100000 + Math.random() * 900000));
    const admin = [...NEWS_ADMINS.values()].find((a) => a.email.toLowerCase() === emailKey);
    const auth = [...AUTHORITIES.values()].find((a) => a.profile.contactEmail.toLowerCase() === emailKey);
    if (admin || auth) {
      const realCode = String(Math.floor(100000 + Math.random() * 900000));
      code = realCode;
      NEWS_RESET_TOKENS.set(token, {
        code: realCode,
        accountType: admin ? 'admin' : 'authority',
        accountId: admin ? admin.adminId : (auth as Authority).authorityId,
        email: emailKey,
        expiresAt: Date.now() + 15 * 60 * 1000,
        attempts: 0
      });
      newsAudit(req, {
        actorId: admin ? admin.adminId : (auth as Authority).authorityId,
        actorRole: admin ? 'ADMIN' : 'AUTHORITY',
        action: 'NEWS_PASSWORD_RESET_REQUESTED',
        result: 'dispatched',
        reason: 'Reset link dispatched via simulated email channel'
      });
    }
    return res.json({
      success: true,
      message: 'If a News Management account exists for that email, a secure reset link has been sent. The link is valid for 15 minutes.'
    });
  });

  app.post('/api/news/reset-password', (req, res) => {
    const { resetToken, code, newPassword } = req.body || {};
    const record = resetToken ? NEWS_RESET_TOKENS.get(resetToken) : undefined;
    const invalid = () => res.status(400).json({ success: false, code: 'RESET_INVALID', error: 'The reset link could not be verified or has expired.' });
    if (!record || record.expiresAt < Date.now()) return invalid();
    // Attempt-limited (not single-attempt): a mistyped code does not consume
    // the link, but 5 failures do — brute-force protection.
    if (String(code || '').trim() !== record.code) {
      record.attempts += 1;
      if (record.attempts >= 5) NEWS_RESET_TOKENS.delete(resetToken as string);
      return invalid();
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'The new password must be at least 8 characters long.' });
    }
    NEWS_RESET_TOKENS.delete(resetToken as string); // single-use after success
    if (record.accountType === 'admin') {
      const admin = NEWS_ADMINS.get(record.accountId);
      if (!admin) return invalid();
      admin.passwordHash = hashSecret(admin.adminId, String(newPassword));
      for (const [sid, s] of [...NEWS_ADMIN_SESSIONS.entries()]) {
        if (s.adminId === admin.adminId) NEWS_ADMIN_SESSIONS.delete(sid); // invalidate ALL sessions
      }
      newsAudit(req, { actorId: admin.adminId, actorRole: 'ADMIN', action: 'NEWS_PASSWORD_RESET_COMPLETED', targetTitle: admin.name, result: 'success', reason: 'All existing sessions invalidated' });
    } else {
      const auth = AUTHORITIES.get(record.accountId);
      if (!auth) return invalid();
      auth.passwordHash = hashSecret(auth.authorityId, String(newPassword));
      for (const [sid, s] of [...AUTHORITY_SESSIONS.entries()]) {
        if (s.authorityId === auth.authorityId) AUTHORITY_SESSIONS.delete(sid);
      }
      newsAudit(req, { actorId: auth.authorityId, actorRole: 'AUTHORITY', action: 'AUTHORITY_PASSWORD_RESET_COMPLETED', targetTitle: auth.profile.orgName, result: 'success', reason: 'All existing sessions invalidated' });
    }
    return res.json({ success: true, message: 'Your password has been reset and all previous sessions were signed out. You can now sign in.' });
  });

  // Production does not load demo staff credentials. A bootstrap
  // administrator may be provisioned explicitly through environment
  // configuration; otherwise the News Management surface fails closed.
  if (IS_PRODUCTION) {
    NEWS_ADMIN_SEED.length = 0;
    const bootstrapEmail = config.newsAdminBootstrap.email.toLowerCase();
    const bootstrapPassword = config.newsAdminBootstrap.password;
    if (bootstrapEmail && bootstrapPassword) {
      NEWS_ADMIN_SEED.push({
        adminId: 'news-admin-bootstrap',
        name: config.newsAdminBootstrap.name,
        email: bootstrapEmail,
        passwordHash: hashSecret('news-admin-bootstrap', bootstrapPassword),
        role: 'SUPER_ADMIN',
        title: config.newsAdminBootstrap.name,
        status: 'active',
        mfaEnabled: true,
        permissions: NEWS_ADMIN_ROLE_PERMISSIONS.SUPER_ADMIN
      });
    }
  }
  NEWS_ADMIN_SEED.forEach((a) => NEWS_ADMINS.set(a.adminId, a));

  // ----------------------------------------------------------------------
  // 5. Pharmacy Marketplace Inventory Engine (source of truth)
  // ----------------------------------------------------------------------
  // Verified partner pharmacies. `apiToken` authorises a partner workspace to
  // update ONLY its own inventory — a token maps to exactly one pharmacyId.
  type MarketPartnerState = {
    partnerId: string;
    partnerName: string;
    verificationStatus: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
    active: boolean;
  };

  const MARKET_PARTNERS: Map<string, MarketPartnerState> = new Map(
    VERIFIED_PHARMACY_PARTNERS.map((p) => [
      p.id,
      {
        partnerId: p.id,
        partnerName: p.name,
        verificationStatus: 'VERIFIED' as const,
        active: true
      }
    ])
  );

  // ---------------- PHARMACY PARTNER PORTAL AUTHENTICATION ----------------
  // Partner credentials live ONLY on the server (the old static marketplace
  // tokens shipped inside the client bundle and the browser-side password
  // checks are gone). Sessions are crypto-random and map to exactly ONE
  // partner/pharmacy — cross-partner inventory edits are impossible.
  // Accounts created via public sign-up start PENDING_VERIFICATION: a new
  // pharmacy is NOT a "Verified Pharmacy Partner" until GlobalHealth admin
  // approval, and cannot sign in until then.
  interface PharmacyPartnerAccount {
    username: string; // login identifier (email)
    partnerId: string;
    pharmacyName: string;
    contactName: string;
    licenseNumber: string;
    phone: string;
    passwordHash: string;
    status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED';
    createdAt: string;
  }
  const PHARMACY_PARTNER_ACCOUNTS: Map<string, PharmacyPartnerAccount> = new Map(
    (
      [
        ['dr.ramanathan@apexhealth.org', 'pharma-apex-01', 'Dr. S. K. Ramanathan', 'Apex Central Clinical Dispensary', 'PCI-DL-184920'],
        ['rohan.m@apexhealth.org', 'pharma-apex-01', 'Rohan M.', 'Apex Central Clinical Dispensary', 'PCI-DL-184920'],
        ['mumbai.depot@globalhealth.org', 'pharma-global-02', 'Ananya Deshmukh', 'GlobalHealth Express Central Hub', 'DL-MH-2023-55102'],
        ['bangalore.pharmacy@apollocare.org', 'pharma-apollo-03', 'K. Venkatesh', 'Apollo Care Clinical Pharmacy', 'DL-KA-2022-31994'],
        ['hyderabad.hub@medpluscommunity.org', 'pharma-medplus-04', 'P. Ravinder Reddy', 'MedPlus Community Clinical Dispensary', 'DL-TS-2023-40118']
      ] as [string, string, string, string, string][]
    ).map(([username, partnerId, contactName, pharmacyName, licenseNumber]) => [
      username,
      {
        username,
        partnerId,
        pharmacyName,
        contactName,
        licenseNumber,
        phone: '',
        passwordHash: hashSecret(username, 'Pharmacy@123'),
        status: 'VERIFIED' as const,
        createdAt: nowIso()
      }
    ])
  );

  interface PharmacyPartnerSession {
    token: string;
    username: string;
    partnerId: string;
    issuedAt: string;
    expiresAt: number;
  }
  const PHARMACY_PARTNER_SESSIONS: Map<string, PharmacyPartnerSession> = new Map();
  const PHARMACY_PARTNER_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
  const PHARMACY_PARTNER_LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();
  const PHARMACY_PARTNER_RESET_TOKENS: Map<string, { token: string; username: string; expiresAt: number; used: boolean }> = new Map();

  const publicPartnerAccount = (a: PharmacyPartnerAccount, session?: PharmacyPartnerSession) => ({
    username: a.username,
    partnerId: a.partnerId,
    pharmacyName: a.pharmacyName,
    contactName: a.contactName,
    licenseNumber: a.licenseNumber,
    status: a.status,
    ...(session ? { sessionExpiresAt: new Date(session.expiresAt).toISOString() } : {})
  });

  type MarketplaceStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'NOT_LISTED';

  interface MarketplaceInventoryRecord {
    pharmacyId: string;
    pharmacyName: string;
    pharmacyVerificationStatus: string;
    medicineId: string;          // exact customer-catalogue variant id
    medicineName: string;
    brandName: string;
    genericName: string;
    strength: string;
    dosageForm: string;
    packSize: string;
    stockQuantity: number;
    stockStatus: MarketplaceStockStatus;
    availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE';
    medicineIsActive: boolean;
    inventoryIsActive: boolean;
    price: number;
    lastInventoryUpdate: string;
    updatedBy?: string;
  }

  interface InventoryAuditRecord {
    id: string;
    pharmacyId: string;
    pharmacyName: string;
    actorId: string;
    actorName: string;
    medicineId: string;
    medicineName: string;
    previousStockQuantity: number;
    newStockQuantity: number;
    previousStatus: MarketplaceStockStatus;
    newStatus: MarketplaceStockStatus;
    changedAt: string;
    changeSource: 'PARTNER_WORKSPACE' | 'SYSTEM_SEED' | 'CATALOG_ADJUSTMENT';
    result: 'SUCCESS' | 'REJECTED';
    reason?: string;
  }

  const MARKET_INVENTORY = new Map<string, MarketplaceInventoryRecord>();
  const INVENTORY_AUDIT: InventoryAuditRecord[] = [];
  const LOW_STOCK_THRESHOLD = 10;
  const invKey = (pharmacyId: string, medicineId: string) => `${pharmacyId}::${medicineId}`;

  const deriveStatus = (qty: number): MarketplaceStockStatus =>
    qty <= 0 ? 'OUT_OF_STOCK' : qty <= LOW_STOCK_THRESHOLD ? 'LOW_STOCK' : 'IN_STOCK';

  // Deterministic seed so the initial marketplace matches the published
  // catalogue baseline (primary partner holds the listed stock quantity).
  const seedMarketInventory = () => {
    VERIFIED_PHARMACY_PARTNERS.forEach((partner, index) => {
      PHARMACY_PRODUCTS.forEach((product) => {
        const pCode = product.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const isPrimary = partner.id === product.pharmacyPartnerId;
        let stockQuantity = isPrimary ? product.stockQuantity : Math.max(12, (pCode * 7 + index * 45) % 180);
        if (index === 3 && pCode % 3 === 0) stockQuantity = 4;
        const priceVariance = index % 2 === 0 ? 0 : index === 1 ? -1 : 2;
        const stockStatus = deriveStatus(stockQuantity);
        MARKET_INVENTORY.set(invKey(partner.id, product.id), {
          pharmacyId: partner.id,
          pharmacyName: partner.name,
          pharmacyVerificationStatus: 'VERIFIED',
          medicineId: product.id,
          medicineName: product.name,
          brandName: product.brandName,
          genericName: product.genericName,
          strength: product.strength,
          dosageForm: product.dosageForm,
          packSize: product.packSize,
          stockQuantity,
          stockStatus,
          availabilityStatus: stockStatus === 'IN_STOCK' || stockStatus === 'LOW_STOCK' ? 'AVAILABLE' : 'UNAVAILABLE',
          medicineIsActive: true,
          inventoryIsActive: true,
          price: Math.max(10, Number((product.price + priceVariance).toFixed(2))),
          lastInventoryUpdate: new Date().toISOString(),
          updatedBy: 'SYSTEM_SEED'
        });
      });
    });
  };
  seedMarketInventory();

  const auditInventory = (entry: Omit<InventoryAuditRecord, 'id' | 'changedAt'>) => {
    INVENTORY_AUDIT.unshift({ ...entry, id: `inv-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, changedAt: new Date().toISOString() });
    if (INVENTORY_AUDIT.length > 5000) INVENTORY_AUDIT.length = 5000;
  };

  // Golden rule eligibility.
  const isEligibleRecord = (rec: MarketplaceInventoryRecord): boolean => {
    const partner = MARKET_PARTNERS.get(rec.pharmacyId);
    return (
      !!partner &&
      partner.active &&
      partner.verificationStatus === 'VERIFIED' &&
      rec.medicineIsActive === true &&
      rec.inventoryIsActive === true &&
      (rec.stockStatus === 'IN_STOCK' || rec.stockStatus === 'LOW_STOCK') &&
      rec.stockQuantity > 0
    );
  };

  // Exact medicine-variant match against the customer catalogue. Never match
  // by loose text — 500 mg must never satisfy 650 mg.
  const findProductVariant = (medicineId?: string, descriptor?: { name?: string; strength?: string; dosageForm?: string }) => {
    if (medicineId) {
      const byId = PHARMACY_PRODUCTS.find((p) => p.id === String(medicineId).trim());
      if (byId) return byId;
    }
    if (descriptor?.name) {
      const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dName = norm(descriptor.name);
      const dStrength = norm(descriptor.strength || '');
      const dForm = norm(descriptor.dosageForm || '');
      return (
        PHARMACY_PRODUCTS.find(
          (p) =>
            norm(p.name) === dName &&
            (!dStrength || norm(p.strength) === dStrength) &&
            (!dForm || norm(p.dosageForm) === dForm)
        ) || undefined
      );
    }
    return undefined;
  };

  const availabilityDenialReason = (rec?: MarketplaceInventoryRecord): string => {
    if (!rec) return 'NOT_LISTED';
    if (!rec.inventoryIsActive || !rec.medicineIsActive) return 'INACTIVE';
    if (rec.stockStatus === 'DISCONTINUED') return 'DISCONTINUED';
    if (rec.stockStatus === 'NOT_LISTED') return 'NOT_LISTED';
    if (rec.stockQuantity <= 0) return 'OUT_OF_STOCK';
    if (rec.stockStatus !== 'IN_STOCK' && rec.stockStatus !== 'LOW_STOCK') return rec.stockStatus;
    return 'IN_STOCK';
  };

  // ---- Public (customer-facing): live availability for one exact medicine ----
  app.get('/api/pharmacy-marketplace/availability/:productId', (req, res) => {
    try {
      const product = PHARMACY_PRODUCTS.find((p) => p.id === req.params.productId);
      if (!product) {
        return res.status(404).json({ success: false, code: 'PRODUCT_NOT_FOUND', error: 'This medicine was not found in the GlobalHealth catalogue.' });
      }
      const options = [...MARKET_INVENTORY.values()]
        .filter((r) => r.medicineId === product.id)
        .filter(isEligibleRecord)
        .map((r) => {
          const meta = VERIFIED_PHARMACY_PARTNERS.find((p) => p.id === r.pharmacyId)!;
          const pCode = product.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const index = VERIFIED_PHARMACY_PARTNERS.findIndex((p) => p.id === r.pharmacyId);
          const distanceKm = Number((1.2 + ((pCode * (index + 1)) % 65) / 10).toFixed(1));
          return {
            partnerId: r.pharmacyId,
            partnerName: meta.name,
            shortName: meta.shortName,
            licenseNumber: meta.licenseNumber,
            area: meta.address.split(',').pop()?.trim() || meta.city,
            city: meta.city,
            state: meta.state,
            distanceKm,
            isOpenNow: true,
            operatingHours: meta.operatingHours,
            stockStatus: r.stockStatus === 'LOW_STOCK' ? 'Limited Stock' : 'In Stock',
            stockCount: r.stockQuantity,
            price: r.price,
            mrp: product.mrp,
            discountPercent: Math.round(((product.mrp - r.price) / product.mrp) * 100),
            deliveryAvailable: true,
            pickupAvailable: true,
            estimatedFulfillment: distanceKm < 3.0 ? 'Express 1–2 hrs' : distanceKm < 6.0 ? 'Same Day (2–4 hrs)' : 'Standard 24 hrs',
            rating: meta.rating,
            reviewsCount: meta.reviewsCount,
            badge: meta.badge,
            pharmacistInCharge: meta.pharmacistInCharge,
            coldChainAvailable: meta.coldChainAvailable,
            lastInventoryUpdate: r.lastInventoryUpdate
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json({
        success: true,
        availabilityVerified: true,
        asOf: new Date().toISOString(),
        product: { id: product.id, name: product.name, brandName: product.brandName, strength: product.strength, dosageForm: product.dosageForm, packSize: product.packSize, prescriptionRequired: product.prescriptionRequired },
        options
      });
    } catch (err: any) {
      console.error('Availability lookup failed:', err);
      // Fail SAFE — never present unverified stock as available.
      return res.status(503).json({ success: false, availabilityVerified: false, code: 'AVAILABILITY_UNVERIFIED', error: 'Availability temporarily unavailable. Please try again.' });
    }
  });

  // ---- Public: final stock validation for cart / checkout ----
  app.post('/api/pharmacy-marketplace/validate', (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const results = items.map((item: any) => {
        const product = findProductVariant(item?.productId);
        if (!product) {
          return { productId: item?.productId, pharmacyId: item?.pharmacyId, eligible: false, reason: 'PRODUCT_NOT_FOUND' };
        }
        const rec = MARKET_INVENTORY.get(invKey(String(item.pharmacyId), product.id));
        const partner = MARKET_PARTNERS.get(String(item.pharmacyId));
        const requested = Math.max(1, Number(item?.quantity) || 1);
        if (!partner || !partner.active || partner.verificationStatus !== 'VERIFIED') {
          return { productId: product.id, pharmacyId: item?.pharmacyId, eligible: false, reason: 'PHARMACY_NOT_VERIFIED', medicineName: product.name };
        }
        if (!rec || !isEligibleRecord(rec)) {
          return { productId: product.id, pharmacyId: item?.pharmacyId, eligible: false, reason: availabilityDenialReason(rec), medicineName: product.name };
        }
        if (rec.stockQuantity < requested) {
          return { productId: product.id, pharmacyId: item?.pharmacyId, eligible: false, reason: 'INSUFFICIENT_STOCK', availableQuantity: rec.stockQuantity, medicineName: product.name };
        }
        return { productId: product.id, pharmacyId: item?.pharmacyId, eligible: true, stockQuantity: rec.stockQuantity, stockStatus: rec.stockStatus, medicineName: product.name };
      });
      return res.json({ success: true, availabilityVerified: true, asOf: new Date().toISOString(), results });
    } catch (err: any) {
      console.error('Inventory validation failed:', err);
      return res.status(503).json({ success: false, availabilityVerified: false, code: 'AVAILABILITY_UNVERIFIED', error: 'Availability temporarily unavailable. Please try again.' });
    }
  });

  // ---- Public: place an order (atomic validate + stock decrement) ----
  // Protects against overselling: the final availability check and the stock
  // decrease happen in one synchronous server section, so two concurrent
  // orders for the last unit can never BOTH succeed. Totals are recalculated
  // server-side from the pharmacy's own inventory prices — client totals are
  // never trusted.
  const MARKET_ORDERS: Map<string, any> = new Map();

  app.post('/api/pharmacy-marketplace/orders', (req, res) => {
    const identity = platformIdentity(req);
    if (identity?.user?.isDemoAccount) {
      return res.status(403).json({
        success: false,
        code: 'DEMO_ACTION_BLOCKED',
        error: 'Marketplace orders are disabled in the public demo. Your sandbox cannot reserve live pharmacy inventory.'
      });
    }
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'Your cart is empty.' });
      }
      const deliveryFee = Number(req.body?.deliveryFee) >= 0 ? Number(req.body?.deliveryFee) : 0;
      const taxRate = 0.05; // platform GST — server-authoritative

      type Line = { product: any; rec: MarketplaceInventoryRecord; quantity: number; lineTotal: number };
      const lines: Line[] = [];
      for (const item of items) {
        const product = findProductVariant(item?.productId);
        if (!product) {
          return res.status(400).json({ success: false, code: 'PRODUCT_NOT_FOUND', error: 'A medicine in your cart was not found in the catalogue.' });
        }
        const rec = MARKET_INVENTORY.get(invKey(String(item.pharmacyId), product.id));
        const partner = MARKET_PARTNERS.get(String(item.pharmacyId));
        const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1));
        if (!partner || !partner.active || partner.verificationStatus !== 'VERIFIED') {
          return res.status(409).json({ success: false, code: 'PHARMACY_NOT_VERIFIED', medicineName: product.name, error: 'This pharmacy is no longer an active verified partner.' });
        }
        if (!rec || !isEligibleRecord(rec)) {
          return res.status(409).json({ success: false, code: availabilityDenialReason(rec), medicineName: product.name, error: 'This medicine is no longer available at this pharmacy.' });
        }
        if (rec.stockQuantity < qty) {
          return res.status(409).json({ success: false, code: 'INSUFFICIENT_STOCK', medicineName: product.name, availableQuantity: rec.stockQuantity, error: `Only ${rec.stockQuantity} unit(s) of ${product.name} remain at this pharmacy.` });
        }
        lines.push({ product, rec, quantity: qty, lineTotal: Number((rec.price * qty).toFixed(2)) });
      }

      // Atomic commit: decrement every line (all lines re-verified above; the
      // synchronous section guarantees no interleaved writer).
      const itemsSubtotal = Number(lines.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(2));
      const tax = Number((itemsSubtotal * taxRate).toFixed(2));
      const grandTotal = Number((itemsSubtotal + deliveryFee + tax).toFixed(2));
      for (const l of lines) {
        l.rec.stockQuantity -= l.quantity;
        l.rec.stockStatus = deriveStatus(l.rec.stockQuantity);
        l.rec.availabilityStatus = l.rec.stockStatus === 'IN_STOCK' || l.rec.stockStatus === 'LOW_STOCK' ? 'AVAILABLE' : 'UNAVAILABLE';
        l.rec.lastInventoryUpdate = nowIso();
        l.rec.updatedBy = 'MARKETPLACE_ORDER';
        auditInventory({
          pharmacyId: l.rec.pharmacyId,
          pharmacyName: l.rec.pharmacyName,
          actorId: 'marketplace',
          actorName: 'Customer order',
          medicineId: l.rec.medicineId,
          medicineName: l.rec.medicineName,
          previousStockQuantity: l.rec.stockQuantity + l.quantity,
          newStockQuantity: l.rec.stockQuantity,
          previousStatus: deriveStatus(l.rec.stockQuantity + l.quantity),
          newStatus: l.rec.stockStatus,
          changeSource: 'PARTNER_WORKSPACE',
          result: 'SUCCESS',
          reason: `Order reservation (-${l.quantity})`
        });
      }

      const orderId = `GH-MKT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
      MARKET_ORDERS.set(orderId, {
        orderId,
        placedAt: nowIso(),
        lines: lines.map((l) => ({
          productId: l.product.id, medicineName: l.product.name, strength: l.product.strength,
          pharmacyId: l.rec.pharmacyId, pharmacyName: l.rec.pharmacyName,
          quantity: l.quantity, unitPrice: l.rec.price, lineTotal: l.lineTotal,
          prescriptionRequired: !!l.product.prescriptionRequired
        })),
        pricing: { itemsSubtotal, deliveryFee, tax, grandTotal }
      });

      return res.status(201).json({
        success: true,
        orderId,
        order: MARKET_ORDERS.get(orderId),
        message: 'Order placed. Inventory has been reserved and updated.'
      });
    } catch (err: any) {
      console.error('Order placement failed:', err);
      return res.status(503).json({ success: false, error: 'The order could not be placed. Please try again.' });
    }
  });

  // ---- Partner authorization: portal SESSION maps to exactly ONE pharmacy ----
  const requireMarketPartner = (req: any, res: any, next: any) => {
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const session = PHARMACY_PARTNER_SESSIONS.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) PHARMACY_PARTNER_SESSIONS.delete(token);
      return res.status(401).json({ success: false, code: 'PARTNER_AUTH_FAILED', error: 'Your pharmacy partner session is invalid or has expired. Please sign in again.' });
    }
    const account = PHARMACY_PARTNER_ACCOUNTS.get(session.username);
    if (!account || account.status !== 'VERIFIED' || account.partnerId !== session.partnerId) {
      return res.status(403).json({ success: false, code: 'PARTNER_NOT_VERIFIED', error: 'This pharmacy partner account is not an active Verified Pharmacy Partner.' });
    }
    const partner = MARKET_PARTNERS.get(session.partnerId);
    if (!partner || !partner.active) {
      return res.status(403).json({ success: false, code: 'PARTNER_NOT_VERIFIED', error: 'This pharmacy partner is not active on the marketplace.' });
    }
    const routePartnerId = String(req.params?.partnerId || '');
    if (routePartnerId && routePartnerId !== partner.partnerId) {
      // A pharmacy can NEVER modify another pharmacy's inventory.
      auditInventory({
        pharmacyId: routePartnerId,
        pharmacyName: MARKET_PARTNERS.get(routePartnerId)?.partnerName || routePartnerId,
        actorId: partner.partnerId,
        actorName: `${partner.partnerName} (cross-pharmacy attempt)`,
        medicineId: 'n/a',
        medicineName: 'n/a',
        previousStockQuantity: 0,
        newStockQuantity: 0,
        previousStatus: 'NOT_LISTED',
        newStatus: 'NOT_LISTED',
        changeSource: 'PARTNER_WORKSPACE',
        result: 'REJECTED',
        reason: 'Attempt to modify another pharmacy\'s inventory'
      });
      return res.status(403).json({ success: false, code: 'CROSS_PHARMACY_FORBIDDEN', error: 'Your session is not authorized for the requested pharmacy.' });
    }
    // Sliding expiry while the workspace is in use.
    session.expiresAt = Date.now() + PHARMACY_PARTNER_SESSION_TTL_MS;
    req.marketPartner = partner;
    req.marketPartnerAccount = account;
    next();
  };

  // ---- Pharmacy partner auth endpoints ----
  app.post('/api/pharmacy-partner/auth/register', (req, res) => {
    const b = req.body || {};
    const username = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      return res.status(400).json({ success: false, code: 'INVALID_EMAIL', error: 'Please enter a valid pharmacy contact email.' });
    }
    if (String(b.pharmacyName || '').trim().length < 3) {
      return res.status(400).json({ success: false, code: 'INVALID_NAME', error: 'Pharmacy legal name is required (min 3 characters).' });
    }
    if (String(b.licenseNumber || '').trim().length < 4) {
      return res.status(400).json({ success: false, code: 'INVALID_LICENSE', error: 'A valid pharmacy license / DL number is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters long.' });
    }
    if (PHARMACY_PARTNER_ACCOUNTS.has(username)) {
      return res.status(409).json({ success: false, code: 'ACCOUNT_EXISTS', error: 'A partner account already exists for this email. Try signing in or reset your password.' });
    }
    const account: PharmacyPartnerAccount = {
      username,
      partnerId: `pharma-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`,
      pharmacyName: String(b.pharmacyName).trim().slice(0, 160),
      contactName: String(b.contactName || '').trim().slice(0, 120),
      licenseNumber: String(b.licenseNumber).trim().slice(0, 60),
      phone: String(b.phone || '').trim().slice(0, 30),
      passwordHash: hashSecret(username, password),
      // Verification is an explicit GlobalHealth admin action — never granted
      // merely by creating an account.
      status: 'PENDING_VERIFICATION',
      createdAt: nowIso()
    };
    PHARMACY_PARTNER_ACCOUNTS.set(username, account);
    auditInventory({
      pharmacyId: account.partnerId, pharmacyName: account.pharmacyName, actorId: account.username, actorName: account.contactName || account.username,
      medicineId: 'n/a', medicineName: 'n/a', previousStockQuantity: 0, newStockQuantity: 0, previousStatus: 'NOT_LISTED', newStatus: 'NOT_LISTED',
      changeSource: 'PARTNER_WORKSPACE', result: 'SUCCESS', reason: `Partner account registered — awaiting GlobalHealth verification (${account.licenseNumber})`
    });
    return res.status(201).json({
      success: true,
      account: publicPartnerAccount(account),
      message: 'Registration received. Your pharmacy is now PENDING VERIFICATION — a GlobalHealth administrator must verify your license before you can sign in to the partner workspace.'
    });
  });

  // GlobalHealth admin verification action (operator-side; requires the
  // server-held admin key — never shipped in the client bundle).
  app.post('/api/pharmacy-partner/auth/verify', (req, res) => {
    const adminKey = config.ghAdminKey;
    if (!adminKey) {
      return res.status(503).json({ success: false, code: 'ADMIN_KEY_NOT_CONFIGURED', error: 'Administrator authorization is not configured on this server.' });
    }
    if (String(req.headers?.['x-admin-key'] || '') !== adminKey) {
      return res.status(401).json({ success: false, error: 'Administrator authorization required.' });
    }
    const account = PHARMACY_PARTNER_ACCOUNTS.get(String(req.body?.email || '').trim().toLowerCase());
    if (!account) return res.status(404).json({ success: false, code: 'ACCOUNT_NOT_FOUND', error: 'No pending partner account for that email.' });
    const decision = req.body?.decision === 'REJECT' ? 'SUSPENDED' : 'VERIFIED';
    account.status = decision;
    if (decision === 'VERIFIED') {
      // List the newly verified partner on the marketplace (empty inventory —
      // nothing is sellable until the partner stocks medicines).
      MARKET_PARTNERS.set(account.partnerId, {
        partnerId: account.partnerId,
        partnerName: account.pharmacyName,
        verificationStatus: 'VERIFIED',
        active: true
      });
    }
    auditInventory({
      pharmacyId: account.partnerId, pharmacyName: account.pharmacyName, actorId: 'globalhealth-admin', actorName: 'GlobalHealth Administrator',
      medicineId: 'n/a', medicineName: 'n/a', previousStockQuantity: 0, newStockQuantity: 0, previousStatus: 'NOT_LISTED', newStatus: 'NOT_LISTED',
      changeSource: 'PARTNER_WORKSPACE', result: 'SUCCESS', reason: `Partner verification decision: ${decision}`
    });
    return res.json({ success: true, account: publicPartnerAccount(account) });
  });

  app.get('/api/pharmacy-partner/auth/pending', (req, res) => {
    const adminKey = config.ghAdminKey;
    if (!adminKey) {
      return res.status(503).json({ success: false, code: 'ADMIN_KEY_NOT_CONFIGURED', error: 'Administrator authorization is not configured on this server.' });
    }
    if (String(req.headers?.['x-admin-key'] || '') !== adminKey) {
      return res.status(401).json({ success: false, error: 'Administrator authorization required.' });
    }
    return res.json({
      success: true,
      accounts: [...PHARMACY_PARTNER_ACCOUNTS.values()].filter((a) => a.status === 'PENDING_VERIFICATION').map((a) => publicPartnerAccount(a))
    });
  });

  app.post('/api/pharmacy-partner/auth/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const cleanId = String(identifier || '').trim().toLowerCase();
    const rl = checkRateLimit(PHARMACY_PARTNER_LOGIN_ATTEMPTS, cleanId || 'unknown', 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many sign-in attempts. Please try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
    }
    const account = PHARMACY_PARTNER_ACCOUNTS.get(cleanId);
    if (!account || !verifySecret(account.username, String(password || ''), account.passwordHash)) {
      registerFailedAttempt(PHARMACY_PARTNER_LOGIN_ATTEMPTS, cleanId, 15 * 60 * 1000);
      return res.status(401).json({ success: false, error: 'Incorrect pharmacy partner credentials.' });
    }
    if (account.passwordHash.startsWith('pbkdf2-sha256$')) {
      account.passwordHash = hashSecret(account.username, String(password || ''));
      PHARMACY_PARTNER_ACCOUNTS.set(account.username, account);
    }
    if (account.status === 'PENDING_VERIFICATION') {
      return res.status(403).json({ success: false, code: 'PENDING_VERIFICATION', error: 'Your pharmacy is still pending verification by GlobalHealth. You will be able to sign in once your license is approved.' });
    }
    if (account.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, code: 'SUSPENDED', error: 'This pharmacy partner account is suspended. Contact GlobalHealth partner support.' });
    }
    PHARMACY_PARTNER_LOGIN_ATTEMPTS.delete(cleanId);
    for (const [t, sess] of PHARMACY_PARTNER_SESSIONS) {
      if (sess.expiresAt < Date.now()) PHARMACY_PARTNER_SESSIONS.delete(t);
    }
    const session: PharmacyPartnerSession = {
      token: secureToken("ppp-sess"),
      username: account.username,
      partnerId: account.partnerId,
      issuedAt: nowIso(),
      expiresAt: Date.now() + PHARMACY_PARTNER_SESSION_TTL_MS
    };
    PHARMACY_PARTNER_SESSIONS.set(session.token, session);
    auditInventory({
      pharmacyId: account.partnerId, pharmacyName: account.pharmacyName, actorId: account.username, actorName: account.contactName || account.username,
      medicineId: 'n/a', medicineName: 'n/a', previousStockQuantity: 0, newStockQuantity: 0, previousStatus: 'NOT_LISTED', newStatus: 'NOT_LISTED',
      changeSource: 'PARTNER_WORKSPACE', result: 'SUCCESS', reason: 'Partner portal sign-in'
    });
    return res.json({ success: true, token: session.token, expiresAt: new Date(session.expiresAt).toISOString(), account: publicPartnerAccount(account, session) });
  });

  app.get('/api/pharmacy-partner/auth/me', requireMarketPartner, (req: any, res) => {
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const session = PHARMACY_PARTNER_SESSIONS.get(token)!;
    return res.json({ success: true, account: publicPartnerAccount(req.marketPartnerAccount, session) });
  });

  app.post('/api/pharmacy-partner/auth/logout', requireMarketPartner, (req: any, res) => {
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    PHARMACY_PARTNER_SESSIONS.delete(token);
    return res.json({ success: true });
  });

  app.post('/api/pharmacy-partner/auth/change-password', requireMarketPartner, (req: any, res) => {
    const account: PharmacyPartnerAccount = req.marketPartnerAccount;
    const { oldPassword, newPassword } = req.body || {};
    if (!verifySecret(account.username, String(oldPassword || ''), account.passwordHash)) {
      return res.status(400).json({ success: false, code: 'OLD_PASSWORD_WRONG', error: 'Current password entered is incorrect.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'New password must be at least 8 characters.' });
    }
    account.passwordHash = hashSecret(account.username, String(newPassword));
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    for (const [t, sess] of PHARMACY_PARTNER_SESSIONS) {
      if (sess.username === account.username && t !== token) PHARMACY_PARTNER_SESSIONS.delete(t);
    }
    return res.json({ success: true, message: 'Password updated successfully.' });
  });

  app.post('/api/pharmacy-partner/auth/request-reset', (req, res) => {
    const cleanId = String(req.body?.email || '').trim().toLowerCase();
    const generic = { success: true, message: 'If a partner account exists for that email, password reset instructions have been sent.' };
    const account = PHARMACY_PARTNER_ACCOUNTS.get(cleanId);
    if (!account) return res.json(generic);
    for (const [t, r] of PHARMACY_PARTNER_RESET_TOKENS) {
      if (r.username === account.username && !r.used) PHARMACY_PARTNER_RESET_TOKENS.delete(t);
    }
    const record = { token: secureToken("rst-ppp"), username: account.username, expiresAt: Date.now() + 60 * 60 * 1000, used: false };
    PHARMACY_PARTNER_RESET_TOKENS.set(record.token, record);
    // Demo environment: simulated delivery returns the token.
    return res.json({ ...generic, ...(IS_PRODUCTION ? {} : { demoToken: record.token }) });
  });

  app.post('/api/pharmacy-partner/auth/complete-reset', (req, res) => {
    const { resetToken, newPassword } = req.body || {};
    const record = PHARMACY_PARTNER_RESET_TOKENS.get(String(resetToken || '').trim());
    if (!record || record.used || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, code: 'RESET_INVALID', error: 'The reset link could not be verified or has expired. Please request a new one.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'The new password must be at least 8 characters long.' });
    }
    record.used = true;
    PHARMACY_PARTNER_RESET_TOKENS.delete(record.token);
    const account = PHARMACY_PARTNER_ACCOUNTS.get(record.username);
    if (!account) return res.status(404).json({ success: false, code: 'ACCOUNT_NOT_FOUND', error: 'This partner account no longer exists.' });
    account.passwordHash = hashSecret(account.username, String(newPassword));
    for (const [t, sess] of PHARMACY_PARTNER_SESSIONS) {
      if (sess.username === account.username) PHARMACY_PARTNER_SESSIONS.delete(t);
    }
    return res.json({ success: true, message: 'Your password has been reset. Please sign in with your new password.' });
  });

  // ---- Partner: list own marketplace inventory (source-of-truth view) ----
  app.get('/api/pharmacy-partner/:partnerId/marketplace-inventory', requireMarketPartner, (req: any, res) => {
    try {
      const partner = req.marketPartner as MarketPartnerState;
      const records = [...MARKET_INVENTORY.values()]
        .filter((r) => r.pharmacyId === partner.partnerId)
        .sort((a, b) => a.medicineName.localeCompare(b.medicineName));
      return res.json({ success: true, partner: { partnerId: partner.partnerId, partnerName: partner.partnerName, verificationStatus: partner.verificationStatus }, asOf: new Date().toISOString(), records });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: 'Inventory temporarily unavailable. Please try again.' });
    }
  });

  // ---- Partner: update one medicine's inventory (Medicine → Qty → Status → Save) ----
  app.post('/api/pharmacy-partner/:partnerId/marketplace-inventory/update', requireMarketPartner, (req: any, res) => {
    try {
      const partner = req.marketPartner as MarketPartnerState;
      const { medicineId, descriptor, stockQuantity, stockStatus, updatedBy, source } = req.body || {};
      const product = findProductVariant(medicineId, descriptor);
      if (!product) {
        return res.status(404).json({ success: false, code: 'MEDICINE_NOT_FOUND', error: 'No exact matching medicine variant was found. Matching uses the exact name, strength and dosage form.' });
      }
      const key = invKey(partner.partnerId, product.id);
      const existing = MARKET_INVENTORY.get(key) || {
        pharmacyId: partner.partnerId,
        pharmacyName: partner.partnerName,
        pharmacyVerificationStatus: partner.verificationStatus,
        medicineId: product.id,
        medicineName: product.name,
        brandName: product.brandName,
        genericName: product.genericName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        packSize: product.packSize,
        stockQuantity: 0,
        stockStatus: 'NOT_LISTED' as MarketplaceStockStatus,
        availabilityStatus: 'UNAVAILABLE' as const,
        medicineIsActive: true,
        inventoryIsActive: true,
        price: product.price,
        lastInventoryUpdate: new Date().toISOString()
      };

      const prevQty = existing.stockQuantity;
      const prevStatus = existing.stockStatus;
      const newQty = Math.max(0, Math.floor(Number(stockQuantity)));
      if (Number.isNaN(newQty)) {
        return res.status(400).json({ success: false, error: 'Stock quantity must be a non-negative number.' });
      }

      let nextStatus: MarketplaceStockStatus;
      const requested = String(stockStatus || '').toUpperCase() as MarketplaceStockStatus;
      if (requested === 'DISCONTINUED' || requested === 'NOT_LISTED') {
        nextStatus = requested;
      } else {
        // Status is ALWAYS derived from quantity (a zero quantity can never be
        // IN_STOCK), unless the pharmacy explicitly withdraws the listing.
        nextStatus = deriveStatus(newQty);
      }

      existing.stockQuantity = newQty;
      existing.stockStatus = nextStatus;
      existing.availabilityStatus = nextStatus === 'IN_STOCK' || nextStatus === 'LOW_STOCK' ? 'AVAILABLE' : 'UNAVAILABLE';
      existing.inventoryIsActive = nextStatus !== 'NOT_LISTED' && nextStatus !== 'DISCONTINUED';
      existing.medicineIsActive = true;
      existing.lastInventoryUpdate = new Date().toISOString();
      existing.updatedBy = String(updatedBy || 'Pharmacy Partner');
      MARKET_INVENTORY.set(key, existing);

      auditInventory({
        pharmacyId: partner.partnerId,
        pharmacyName: partner.partnerName,
        actorId: partner.partnerId,
        actorName: existing.updatedBy,
        medicineId: product.id,
        medicineName: `${product.name} (${product.strength}, ${product.dosageForm})`,
        previousStockQuantity: prevQty,
        newStockQuantity: newQty,
        previousStatus: prevStatus,
        newStatus: nextStatus,
        changeSource: source === 'CATALOG_ADJUSTMENT' ? 'CATALOG_ADJUSTMENT' : 'PARTNER_WORKSPACE',
        result: 'SUCCESS'
      });

      return res.json({
        success: true,
        record: existing,
        customerImpact: existing.availabilityStatus === 'AVAILABLE'
          ? 'This pharmacy is now shown to customers for this medicine.'
          : 'This pharmacy is now hidden from customers for this medicine.'
      });
    } catch (err: any) {
      console.error('Inventory update failed:', err);
      return res.status(503).json({ success: false, error: 'The inventory update could not be saved. Please try again.' });
    }
  });

  // ---- Partner: own audit trail ----
  app.get('/api/pharmacy-partner/:partnerId/marketplace-inventory/audit', requireMarketPartner, (req: any, res) => {
    const partner = req.marketPartner as MarketPartnerState;
    return res.json({
      success: true,
      records: INVENTORY_AUDIT.filter((a) => a.pharmacyId === partner.partnerId).slice(0, 200)
    });
  });

  // ----------------------------------------------------------------------
  // 6. Central Hospital Registry (Hospital Portal → User Platform sync)
  // ----------------------------------------------------------------------
  // The central registry is the single source of truth for every verified
  // hospital's PUBLIC profile. Each record is keyed by the permanent
  // `hospitalId` used across the portal workspace, the registry, search, the
  // medical map and the hospital details page. Hospital portals WRITE their
  // own record with a per-hospital token (a token maps to exactly one
  // hospitalId — cross-hospital edits are rejected and audited); the user
  // platform READS the latest published data fresh on every request.
  type HospitalPublicationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  type HospitalSyncStatus = 'SYNCED' | 'PENDING_SYNC' | 'SYNC_FAILED' | 'RETRYING';

  interface CentralDepartment {
    id: string;
    name: string;
    description: string;
    type: string;
    headOfDepartment: string;
    location: string;
    timings: string;
    phone: string;
    status: 'ACTIVE' | 'INACTIVE';
  }

  interface CentralDoctor {
    id: string;
    name: string;
    title: string;
    specialty: string;
    subSpecialty: string;
    department: string;
    qualifications: string;
    registrationNo: string;
    experienceYears: number;
    opdSchedule: string;
    room: string;
    consultationFee: number;
    status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  }

  interface CentralNewsItem {
    id: string;
    title: string;
    body: string;
    category: string;
    publishedAt: string;
    status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  }

  interface CentralHospitalRecord {
    hospitalId: string;
    version: number;
    publicationStatus: HospitalPublicationStatus;
    syncStatus: HospitalSyncStatus;
    lastUpdated: string;
    updatedBy?: string;
    // A. Basic Identity
    identity: {
      name: string; legalName: string; shortName: string; description: string;
      hospitalType: string; ownership: string; establishedYear: number;
      registrationNo: string; verificationStatus: string; traumaLevel: string;
      teachingHospital: boolean; imageUrl: string;
    };
    // B. Location & Navigation
    location: {
      streetAddress: string; area: string; city: string; state: string; country: string; postalCode: string;
      latitude: number; longitude: number; landmark: string; directions: string;
      emergencyEntrance: string; parkingInfo: string;
    };
    // C. Contact & Hours
    contact: {
      mainPhone: string; emergencyPhone: string; appointmentPhone: string; internationalPhone: string;
      receptionPhone: string; email: string; emergencyEmail: string; website: string; whatsapp: string;
      generalHours: string; emergencyHours: string; opdHours: string; visitingHours: string;
      registrationHours: string; holidayClosureInfo: string;
    };
    // D. Departments
    departments: CentralDepartment[];
    // E. Doctor roster
    doctors: CentralDoctor[];
    // F. Beds & facilities
    bedsFacilities: {
      totalBeds: number; generalBeds: number; icuBeds: number; nicuBeds: number; picuBeds: number;
      emergencyBeds: number; isolationBeds: number; privateRooms: number; semiPrivateRooms: number; generalWards: number;
      publishLiveAvailability: boolean; availableBeds: number;
      facilities: Array<{ name: string; status: 'ACTIVE' | 'INACTIVE' }>;
      parkingAvailable: boolean; ambulanceServices: boolean;
    };
    // G/H. Laboratory & Imaging
    labImaging: {
      labName: string; labTests: string[]; homeSampleCollection: boolean; labHours: string; labContact: string;
      imagingServices: Array<{ modality: string; status: 'ACTIVE' | 'INACTIVE'; hours: string }>;
    };
    // I/J. Pharmacy & Blood services
    pharmacyBlood: {
      pharmacyName: string; pharmacyLocation: string; pharmacyHours: string; pharmacyContact: string; emergencyPharmacy: string;
      bloodBankName: string;
      bloodBankStatus: 'ACTIVE' | 'INACTIVE'; bloodBankLocation: string; bloodComponents: string[];
      bloodBankHours: string; bloodBankContact: string;
      // LIVE per-hospital blood inventory published from the hospital portal's
      // Blood Bank workspace (per blood group component units + thresholds).
      bloodInventory: Array<{
        id: string;
        bloodGroup: string;
        wholeBloodUnits: number;
        prbcUnits: number;
        ffpUnits: number;
        plateletUnits: number;
        cryoprecipitateUnits: number;
        criticalMinThreshold: number;
        lastRestockedAt: string;
      }>;
    };
    // K. Services
    services: Array<{ name: string; category: string; status: 'ACTIVE' | 'INACTIVE' }>;
    // L. Pricing & finance (public items only)
    pricing: Array<{ item: string; category: string; price: string; status: 'PUBLISHED' | 'DRAFT' }>;
    // M. International care
    international: {
      coordinator: string; phone: string; email: string; visaAssistance: boolean; airportTransfer: boolean;
      accommodationSupport: boolean; languages: string; medicalTourismServices: string;
    };
    // N. Accreditation
    accreditation: Array<{ body: string; name: string; number: string; issueDate: string; expiryDate: string; status: 'VERIFIED' | 'PENDING' }>;
    // O. Research & education
    researchEducation: Array<{ type: string; title: string; description: string; date: string }>;
    // P. Updates & news (hospital-specific — always scoped to hospitalId)
    news: CentralNewsItem[];
  }

  interface HospitalAuditRecord {
    id: string;
    hospitalId: string;
    hospitalName: string;
    userId: string;
    userName: string;
    userRole: string;
    section: string;
    changes: Array<{ field: string; oldValue: any; newValue: any }>;
    changedAt: string;
    publicationStatus: HospitalPublicationStatus;
    syncStatus: HospitalSyncStatus;
    source: string;
    ip?: string;
    result: 'SUCCESS' | 'REJECTED';
    reason?: string;
  }

  // ---------------- HOSPITAL PORTAL AUTHENTICATION ----------------
  // Hospital portal credentials live ONLY on the server (the old static
  // per-hospital tokens shipped inside the client bundle and the universal
  // demo passwords accepted in browser code are both gone). Portal sessions
  // are crypto-random and map to exactly ONE hospitalId — a session can never
  // authorize edits to another hospital's record.
  interface HospitalPortalAccount {
    username: string;
    hospitalId: string;
    hospitalName: string;
    email: string;
    role: string;
    passwordHash: string;
    status: 'ACTIVE' | 'SUSPENDED';
  }
  const HOSPITAL_ACCOUNTS: Map<string, HospitalPortalAccount> = new Map(
    (
      [
        ['apex_admin', 'HSP-IN-DL-000125', 'Apex Institute of Medical Sciences & Research Center', 'admin@apexhealth.org'],
        ['cleveland_ad_admin', 'hosp-1', 'Cleveland Clinic Abu Dhabi', 'info@clevelandclinicabudhabi.ae'],
        ['sgh_admin', 'hosp-2', 'Singapore General Hospital (SGH)', 'appointments@sgh.com.sg'],
        ['mayo_admin', 'hosp-4', 'Mayo Clinic Rochester', 'appointments@mayoclinic.org'],
        ['stpeter_admin', 'HSP-UK-LON-000881', 'St. Peter Royal Hospital & Cardiovascular Institute', 'info@stpeterroyal.org.uk'],
        ['metro_admin', 'HSP-US-MA-000412', 'Metropolitan Academic Medical Center & Trauma Network', 'contact@metromedical.org'],
        ['aiims_admin', 'hosp-3', 'All India Institute of Medical Sciences (AIIMS)', 'appointments@aiims.edu'],
        ['charite_admin', 'hosp-5', 'Charité - Universitätsmedizin Berlin', 'info@charite.de']
      ] as [string, string, string, string][]
    ).map(([username, hospitalId, hospitalName, email]) => [
      username,
      {
        username,
        hospitalId,
        hospitalName,
        email,
        role: 'Hospital Administrator',
        passwordHash: hashSecret(username, 'Password@123'),
        status: 'ACTIVE' as const
      }
    ])
  );

  interface HospitalPortalSession {
    token: string;
    username: string;
    hospitalId: string;
    issuedAt: string;
    expiresAt: number;
  }
  const HOSPITAL_SESSIONS: Map<string, HospitalPortalSession> = new Map();
  const HOSPITAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
  const HOSPITAL_LOGIN_ATTEMPTS: Map<string, AttemptWindow> = new Map();

  const publicHospitalAccount = (a: HospitalPortalAccount, session?: HospitalPortalSession) => ({
    username: a.username,
    hospitalId: a.hospitalId,
    hospitalName: a.hospitalName,
    email: a.email,
    role: a.role,
    status: a.status,
    ...(session ? { sessionExpiresAt: new Date(session.expiresAt).toISOString() } : {})
  });

  // resolves a hospital name from the registry (for clean audit rows)
  const registryName = (hospitalId: string): string =>
    HOSPITAL_REGISTRY.get(hospitalId)?.identity.name || hospitalId;

  const HOSPITAL_REGISTRY = new Map<string, CentralHospitalRecord>();
  const HOSPITAL_AUDIT: HospitalAuditRecord[] = [];

  // Approximate published coordinates for the seeded facilities.
  const SEED_COORDS: Record<string, { lat: number; lng: number }> = {
    'HSP-IN-DL-000125': { lat: 28.5672, lng: 77.2100 },
    'HSP-US-MA-000412': { lat: 42.3381, lng: -71.1016 },
    'HSP-UK-LON-000881': { lat: 51.5204, lng: -0.1043 }
  };

  // Per-hospital live blood inventory seed. Apex uses its portal seed values
  // verbatim; every other hospital gets its own deterministic variant (each
  // hospital's public blood bank is always its OWN record, never shared).
  const seedBloodInventory = (hospitalId: string) => {
    let hash = 5381;
    for (let i = 0; i < hospitalId.length; i++) hash = ((hash << 5) + hash + hospitalId.charCodeAt(i)) >>> 0;
    return INITIAL_BLOOD_BANK.map((b) => {
      const variant = hospitalId === b.hospitalId ? 1 : 0.4 + ((hash >> (b.bloodGroup.length)) % 9) / 10;
      return {
        id: `${hospitalId}-BLD-${b.bloodGroup}`,
        bloodGroup: b.bloodGroup,
        wholeBloodUnits: Math.round(b.wholeBloodUnits * variant),
        prbcUnits: Math.round(b.prbcUnits * variant),
        ffpUnits: Math.round(b.ffpUnits * variant),
        plateletUnits: Math.round(b.plateletUnits * variant),
        cryoprecipitateUnits: Math.round(b.cryoprecipitateUnits * variant),
        criticalMinThreshold: b.criticalMinThreshold,
        lastRestockedAt: new Date().toISOString()
      };
    });
  };

  const seedHospitalRegistry = () => {
    INITIAL_HOSPITALS.forEach((h) => {
      const coords = SEED_COORDS[h.id] || { lat: 28.6139, lng: 77.209 };
      const departments: CentralDepartment[] = INITIAL_DEPARTMENTS
        .filter((d) => d.hospitalId === h.id)
        .map((d) => ({
          id: d.id,
          name: d.name,
          description: `${d.subspecialties.slice(0, 4).join(', ')} clinical services under ${d.headOfDepartment}.`,
          type: 'Clinical Department',
          headOfDepartment: d.headOfDepartment,
          location: `${d.wingName}, ${d.floor}`,
          timings: h.opdHours,
          phone: `${h.mainReceptionPhone} Ext. ${d.phoneExtension}`,
          status: 'ACTIVE'
        }));
      const doctors: CentralDoctor[] = INITIAL_PORTAL_DOCTORS
        .filter((d) => d.hospitalId === h.id)
        .map((d) => ({
          id: d.id,
          name: d.name,
          title: `${d.specialty} Consultant`,
          specialty: d.specialty,
          subSpecialty: d.subspecialty,
          department: d.departmentName,
          qualifications: d.qualifications,
          registrationNo: `${d.council} — ${d.registrationNo}`,
          experienceYears: d.experienceYears,
          opdSchedule: d.opdSchedule,
          room: d.roomNumber,
          consultationFee: d.consultationFee,
          status: d.status === 'On Leave' ? 'ON_LEAVE' : 'ACTIVE'
        }));
      HOSPITAL_REGISTRY.set(h.id, {
        hospitalId: h.id,
        version: 1,
        publicationStatus: 'PUBLISHED',
        syncStatus: 'SYNCED',
        lastUpdated: new Date().toISOString(),
        identity: {
          name: h.name, legalName: h.legalName, shortName: h.shortName, description: h.tagline,
          hospitalType: h.hospitalType, ownership: h.ownership, establishedYear: h.establishedYear,
          registrationNo: h.registrationNo, verificationStatus: h.verificationStatus, traumaLevel: h.traumaLevel,
          teachingHospital: h.hospitalType === 'Teaching Hospital', imageUrl: h.imageUrl || ''
        },
        location: {
          streetAddress: h.streetAddress, area: h.streetAddress, city: h.city, state: h.state,
          country: h.country, postalCode: h.postalCode, latitude: coords.lat, longitude: coords.lng,
          landmark: '', directions: '', emergencyEntrance: 'Emergency Wing — Ground Floor', parkingInfo: 'Visitor parking available'
        },
        contact: {
          mainPhone: h.mainReceptionPhone, emergencyPhone: h.emergencyPhone, appointmentPhone: h.opdAppointmentPhone,
          internationalPhone: h.opdAppointmentPhone, receptionPhone: h.mainReceptionPhone, email: h.officialEmail,
          emergencyEmail: h.officialEmail, website: h.websiteUrl, whatsapp: '',
          generalHours: h.opdHours, emergencyHours: h.emergencyHours, opdHours: h.opdHours,
          visitingHours: h.visitingHours, registrationHours: h.opdHours, holidayClosureInfo: ''
        },
        departments,
        doctors,
        bedsFacilities: {
          totalBeds: h.totalBedsCount || 0, generalBeds: Math.round((h.totalBedsCount || 0) * 0.6),
          icuBeds: h.icuBedsCount || 0, nicuBeds: 20, picuBeds: 15, emergencyBeds: 40, isolationBeds: 25,
          privateRooms: 80, semiPrivateRooms: 120, generalWards: Math.round((h.totalBedsCount || 0) * 0.5),
          publishLiveAvailability: true, availableBeds: Math.max(10, Math.round((h.totalBedsCount || 0) * 0.12)),
          facilities: [
            { name: '24/7 Emergency & Trauma', status: 'ACTIVE' },
            { name: 'Modular Operation Theatres', status: 'ACTIVE' },
            { name: 'Advanced ICU/NICU/PICU', status: 'ACTIVE' },
            { name: 'Wheelchair & Accessibility Support', status: 'ACTIVE' }
          ],
          parkingAvailable: true, ambulanceServices: true
        },
        labImaging: {
          labName: `${h.shortName} Central Diagnostics`, labTests: ['CBC', 'Lipid Panel', 'HbA1c', 'Liver Function', 'Renal Panel', 'Thyroid Profile'],
          homeSampleCollection: true, labHours: '06:00 AM - 10:00 PM', labContact: h.mainReceptionPhone,
          imagingServices: [
            { modality: 'X-Ray', status: 'ACTIVE', hours: '24 Hours' },
            { modality: 'CT Scan', status: 'ACTIVE', hours: '24 Hours' },
            { modality: 'MRI', status: 'ACTIVE', hours: '08:00 AM - 10:00 PM' },
            { modality: 'Ultrasound', status: 'ACTIVE', hours: '08:00 AM - 08:00 PM' },
            { modality: 'Mammography', status: 'ACTIVE', hours: '09:00 AM - 05:00 PM' }
          ]
        },
        pharmacyBlood: {
          pharmacyName: `${h.shortName} 24/7 Pharmacy`, pharmacyLocation: 'Ground Floor, Central Block',
          pharmacyHours: h.pharmacyHours, pharmacyContact: h.mainReceptionPhone, emergencyPharmacy: '24 Hours',
          bloodBankName: `${h.shortName} Blood Bank`,
          bloodBankStatus: 'ACTIVE', bloodBankLocation: 'Block B, Level 1', bloodComponents: ['Whole Blood', 'PRBC', 'Plasma', 'Platelets'],
          bloodBankHours: h.bloodBankHours, bloodBankContact: h.bloodBankHelpline,
          bloodInventory: seedBloodInventory(h.id)
        },
        services: [
          { name: 'Emergency Care', category: 'Emergency', status: 'ACTIVE' },
          { name: 'Outpatient (OPD)', category: 'Clinical', status: 'ACTIVE' },
          { name: 'Inpatient Care', category: 'Clinical', status: 'ACTIVE' },
          { name: 'Intensive Care (ICU)', category: 'Critical', status: 'ACTIVE' },
          { name: 'Surgery', category: 'Surgical', status: 'ACTIVE' },
          { name: 'Ambulance Service', category: 'Emergency', status: 'ACTIVE' },
          { name: 'Telemedicine', category: 'Digital', status: 'ACTIVE' },
          { name: 'Diagnostics', category: 'Diagnostic', status: 'ACTIVE' }
        ],
        pricing: [
          { item: 'General OPD Consultation', category: 'Consultation', price: '₹ 800', status: 'PUBLISHED' },
          { item: 'Specialist Consultation', category: 'Consultation', price: '₹ 1,500', status: 'PUBLISHED' },
          { item: 'ICU Bed (Per Day)', category: 'Room', price: '₹ 12,000', status: 'PUBLISHED' },
          { item: 'Private Room (Per Day)', category: 'Room', price: '₹ 6,500', status: 'PUBLISHED' },
          { item: 'MRI (Plain)', category: 'Diagnostics', price: '₹ 7,500', status: 'PUBLISHED' }
        ],
        international: {
          coordinator: 'International Patient Services Desk', phone: h.opdAppointmentPhone, email: h.officialEmail,
          visaAssistance: true, airportTransfer: true, accommodationSupport: true,
          languages: 'English, Hindi, Arabic, French', medicalTourismServices: 'End-to-end international patient coordination'
        },
        accreditation: [
          { body: 'NABH', name: 'Full Hospital Accreditation', number: 'NABH/APEX/2019/4471', issueDate: '2019-06-11', expiryDate: '2028-06-10', status: 'VERIFIED' },
          { body: 'JCI', name: 'Joint Commission International Accreditation', number: 'JCI-9921-A', issueDate: '2021-02-18', expiryDate: '2027-02-17', status: 'VERIFIED' }
        ],
        researchEducation: [
          { type: 'Program', title: 'DNB Residency — Cardiology', description: 'Accredited post-graduate training program.', date: '2026-04-01' },
          { type: 'Publication', title: 'Clinical Outcomes in Acute MI Cohort 2025', description: 'Peer-reviewed outcomes research.', date: '2026-01-15' }
        ],
        news: [
          {
            id: `news-${h.id}-welcome`,
            title: `${h.shortName} — Health Checkup Camp`,
            body: 'A comprehensive preventive health camp is open to the public this month with discounted screening packages.',
            category: 'Health Camp',
            publishedAt: new Date().toISOString(),
            status: 'PUBLISHED'
          }
        ]
      });
    });
  };
  seedHospitalRegistry();

  const hospitalAudit = (entry: Omit<HospitalAuditRecord, 'id' | 'changedAt'>) => {
    HOSPITAL_AUDIT.unshift({ ...entry, id: `hsp-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, changedAt: new Date().toISOString() });
    if (HOSPITAL_AUDIT.length > 5000) HOSPITAL_AUDIT.length = 5000;
  };

  // ---- Validation gates (reject bad data BEFORE it reaches the public) ----
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;
  const validateHospitalSection = (section: string, data: any): string[] => {
    const problems: string[] = [];
    if (data === null || typeof data !== 'object') return ['Section payload must be an object.'];
    switch (section) {
      case 'identity':
        if (!String(data.name || '').trim()) problems.push('Hospital name is required.');
        if (data.establishedYear !== undefined && (Number(data.establishedYear) < 1700 || Number(data.establishedYear) > new Date().getFullYear())) problems.push('Establishment year is invalid.');
        break;
      case 'location':
        if (!String(data.city || '').trim() || !String(data.country || '').trim()) problems.push('City and country are required.');
        if (data.latitude !== undefined && (Number(data.latitude) < -90 || Number(data.latitude) > 90)) problems.push('Latitude must be between -90 and 90.');
        if (data.longitude !== undefined && (Number(data.longitude) < -180 || Number(data.longitude) > 180)) problems.push('Longitude must be between -180 and 180.');
        break;
      case 'contact':
        ['mainPhone', 'emergencyPhone', 'appointmentPhone', 'receptionPhone', 'internationalPhone'].forEach((f) => {
          if (data[f] && !PHONE_RE.test(String(data[f]))) problems.push(`${f} is not a valid phone number.`);
        });
        if (data.email && !EMAIL_RE.test(String(data.email))) problems.push('Email format is invalid.');
        if (data.emergencyEmail && !EMAIL_RE.test(String(data.emergencyEmail))) problems.push('Emergency email format is invalid.');
        if (data.website && !/^https?:\/\/.+\..+/.test(String(data.website))) problems.push('Website must be a valid http(s) URL.');
        break;
      case 'pharmacyBlood': {
        // Blood-bank inventory validation (hospital-portal supplied):
        // numeric, non-negative, bounded, standard groups, valid timestamps.
        const inv = data.bloodInventory;
        if (inv !== undefined) {
          const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
          if (!Array.isArray(inv)) {
            problems.push('Blood-bank inventory must be a list of blood-group records.');
          } else {
            const seen = new Set<string>();
            inv.forEach((row: any, i: number) => {
              const g = String(row?.bloodGroup || '').trim().toUpperCase().replace(/\s+/g, '');
              if (!GROUPS.includes(g)) problems.push(`Inventory row ${i + 1}: "${row?.bloodGroup ?? ''}" is not a standard blood group (A+, A-, B+, B-, AB+, AB-, O+, O-).`);
              if (seen.has(g)) problems.push(`Inventory row ${i + 1}: duplicate entry for blood group ${g}.`);
              seen.add(g);
              ['wholeBloodUnits', 'prbcUnits', 'ffpUnits', 'plateletUnits', 'cryoprecipitateUnits', 'criticalMinThreshold'].forEach((f) => {
                const v = Number(row?.[f]);
                if (!Number.isFinite(v) || v < 0 || v > 100000) {
                  problems.push(`Inventory row ${i + 1} (${g || 'unknown group'}): ${f.replace(/Units|lyo/, '')} must be a number between 0 and 100,000.`);
                }
              });
              if (row?.lastRestockedAt !== undefined && Number.isNaN(Date.parse(String(row.lastRestockedAt)))) {
                problems.push(`Inventory row ${i + 1}: last-updated timestamp is not a valid date.`);
              }
            });
          }
        }
        if (data.bloodBankStatus !== undefined && !['ACTIVE', 'INACTIVE'].includes(String(data.bloodBankStatus))) {
          problems.push('Blood-bank service status must be ACTIVE or INACTIVE.');
        }
        break;
      }
      case 'international':
        if (data.email && !EMAIL_RE.test(String(data.email))) problems.push('International email format is invalid.');
        if (data.phone && !PHONE_RE.test(String(data.phone))) problems.push('International phone is invalid.');
        break;
      case 'accreditation': {
        const list = Array.isArray(data) ? data : [];
        list.forEach((a: any, i: number) => {
          if (a.issueDate && Number.isNaN(Date.parse(a.issueDate))) problems.push(`Accreditation ${i + 1}: invalid issue date.`);
          if (a.expiryDate && Number.isNaN(Date.parse(a.expiryDate))) problems.push(`Accreditation ${i + 1}: invalid expiry date.`);
          if (a.issueDate && a.expiryDate && new Date(a.expiryDate) <= new Date(a.issueDate)) problems.push(`Accreditation ${i + 1}: expiry must be after issue date.`);
        });
        break;
      }
      default:
        break;
    }
    return problems;
  };

  // Change detection — only the affected section/fields are rewritten.
  const diffObject = (section: string, before: any, after: any) => {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    Object.keys(after || {}).forEach((field) => {
      const oldV = before?.[field];
      const newV = after[field];
      if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
        changes.push({ field: `${section}.${field}`, oldValue: oldV ?? null, newValue: newV ?? null });
      }
    });
    return changes;
  };

  const publicHospitalProjection = (rec: CentralHospitalRecord) => ({
    ...rec,
    hospitalId: rec.hospitalId,
    version: rec.version,
    asOf: rec.lastUpdated,
    // Never expose non-public pricing drafts
    pricing: rec.pricing.filter((p) => p.status === 'PUBLISHED'),
    // Only ACTIVE child records are public; history stays preserved internally
    departments: rec.departments.filter((d) => d.status === 'ACTIVE'),
    doctors: rec.doctors.filter((d) => d.status !== 'INACTIVE'),
    services: rec.services.filter((s) => s.status === 'ACTIVE'),
    news: rec.news.filter((n) => n.status === 'PUBLISHED'),
    availableBeds: rec.bedsFacilities.publishLiveAvailability ? rec.bedsFacilities.availableBeds : undefined
  });

  // ---- Public: the user platform reads the LATEST PUBLISHED data (fresh) ----
  app.get('/api/hospital-registry/public/hospitals', (req, res) => {
    try {
      const published = [...HOSPITAL_REGISTRY.values()]
        .filter((r) => r.publicationStatus === 'PUBLISHED')
        .map(publicHospitalProjection);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json({ success: true, asOf: new Date().toISOString(), hospitals: published });
    } catch (err: any) {
      console.error('Registry read failed:', err);
      // Fail safe: the client keeps its last-known seed data instead of blanking.
      return res.status(503).json({ success: false, error: 'Registry temporarily unavailable.' });
    }
  });

  // ---- Public: hospital-specific blood bank (minimal public projection) ----
  // Returns ONLY public blood-bank information for the exact hospitalId:
  // service listing, name, hours, emergency contact, per-group availability
  // with human statuses derived from the hospital's own thresholds, and the
  // real last-updated timestamp (never fabricated). Internal thresholds,
  // record ids and audit data are not exposed.
  app.get('/api/hospital-registry/public/hospitals/:hospitalId/blood-bank', (req, res) => {
    try {
      const rec = HOSPITAL_REGISTRY.get(req.params.hospitalId);
      if (!rec || rec.publicationStatus !== 'PUBLISHED') {
        return res.status(404).json({ success: false, error: 'Hospital profile not found.' });
      }
      const pb = rec.pharmacyBlood;
      const inv = Array.isArray(pb.bloodInventory) ? pb.bloodInventory : [];
      const listed = pb.bloodBankStatus === 'ACTIVE';
      const groups = inv.map((r) => {
        const units = Math.max(0, Number(r.prbcUnits) || 0);
        const threshold = Math.max(0, Number(r.criticalMinThreshold) || 0);
        return {
          bloodGroup: r.bloodGroup,
          availableUnits: units,
          components: {
            wholeBlood: Math.max(0, Number(r.wholeBloodUnits) || 0),
            plasma: Math.max(0, Number(r.ffpUnits) || 0),
            platelets: Math.max(0, Number(r.plateletUnits) || 0)
          },
          status: units <= 0 ? 'NOT_AVAILABLE' : units < threshold ? 'LOW_AVAILABILITY' : 'AVAILABLE',
          updatedAt: r.lastRestockedAt
        };
      });
      const totalUnits = groups.reduce((sum, g) => sum + g.availableUnits, 0);
      const lowGroups = groups.filter((g) => g.status === 'LOW_AVAILABILITY').length;
      const overall = !listed
        ? 'SERVICE_NOT_LISTED'
        : totalUnits <= 0
          ? 'NOT_AVAILABLE'
          : lowGroups > 0
            ? 'LOW_AVAILABILITY'
            : 'AVAILABLE';
      const lastUpdated = inv.map((r) => r.lastRestockedAt).filter(Boolean).sort().reverse()[0] || rec.lastUpdated;
      const STALE_MS = 24 * 60 * 60 * 1000; // freshness policy: flag after 24h
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json({
        success: true,
        asOf: new Date().toISOString(),
        bloodBank: {
          hospitalId: rec.hospitalId,
          name: pb.bloodBankName || `${rec.identity.shortName} Blood Bank`,
          serviceListed: listed,
          overallStatus: overall,
          operatingHours: pb.bloodBankHours,
          emergencyAvailable24x7: /24/i.test(pb.bloodBankHours || ''),
          emergencyContact: pb.bloodBankContact,
          location: pb.bloodBankLocation,
          lastUpdated,
          possiblyStale: Date.now() - new Date(lastUpdated).getTime() > STALE_MS,
          groups
        }
      });
    } catch (err: any) {
      console.error('Public blood-bank read failed:', err);
      return res.status(503).json({ success: false, error: 'Blood-bank information is temporarily unavailable. Please try again.' });
    }
  });

  app.get('/api/hospital-registry/public/hospitals/:hospitalId', (req, res) => {
    const rec = HOSPITAL_REGISTRY.get(req.params.hospitalId);
    if (!rec || rec.publicationStatus !== 'PUBLISHED') {
      return res.status(404).json({ success: false, error: 'Hospital profile not found.' });
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({ success: true, asOf: new Date().toISOString(), hospital: publicHospitalProjection(rec) });
  });

  // ---- Portal authorization: session ⇆ exactly ONE hospitalId ----
  // The Bearer token is a server-issued hospital portal SESSION (never a
  // static secret); the route's :hospitalId must match the session's
  // hospital. Cross-hospital writes are rejected 403 and audited.
  const requireHospitalToken = (req: any, res: any, next: any) => {
    const header = String(req.headers?.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const session = HOSPITAL_SESSIONS.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) HOSPITAL_SESSIONS.delete(token);
      return res.status(401).json({ success: false, code: 'HOSPITAL_AUTH_FAILED', error: 'Your hospital portal session is invalid or has expired. Please sign in again.' });
    }
    const account = HOSPITAL_ACCOUNTS.get(session.username);
    if (!account || account.status !== 'ACTIVE' || account.hospitalId !== session.hospitalId) {
      return res.status(401).json({ success: false, code: 'HOSPITAL_AUTH_FAILED', error: 'This hospital portal account is no longer active.' });
    }
    const routeHospitalId = String(req.params?.hospitalId || '');
    if (routeHospitalId && routeHospitalId !== session.hospitalId) {
      hospitalAudit({
        hospitalId: routeHospitalId,
        hospitalName: registryName(routeHospitalId),
        userId: session.username,
        userName: `${registryName(session.hospitalId)} (cross-hospital attempt)`,
        userRole: account.role,
        section: 'n/a',
        changes: [],
        publicationStatus: 'PUBLISHED',
        syncStatus: 'SYNCED',
        source: 'HOSPITAL_PORTAL',
        ip: req.ip,
        result: 'REJECTED',
        reason: 'Attempt to modify another hospital\'s record'
      });
      return res.status(403).json({ success: false, code: 'CROSS_HOSPITAL_FORBIDDEN', error: 'Your session is not authorized for the requested hospital.' });
    }
    // Sliding expiry while the portal is in use.
    session.expiresAt = Date.now() + HOSPITAL_SESSION_TTL_MS;
    req.hospitalId = session.hospitalId;
    req.hospitalAccount = account;
    next();
  };

  // Resolve exactly one role/account from the opaque token. No role, account ID,
  // organization ID or permissions supplied by the browser are trusted here.
  function platformIdentity(req: any): { role: PlatformRole; user: any; profile: any } | null {
    const publicUser = authenticate(req);
    if (publicUser) return { role: 'user', user: { ...sanitizeUser(publicUser), portalRole: 'user' }, profile: sanitizeUser(publicUser) };
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    let role: PlatformRole;
    let id: string;
    let name: string;
    let email: string;
    let profile: any;
    const doctor = authenticateDoctor(req);
    const hs = HOSPITAL_SESSIONS.get(token);
    const ps = PHARMACY_PARTNER_SESSIONS.get(token);
    const admin = authenticateNewsAdmin(req);
    const authority = authenticateAuthority(req);
    if (doctor) {
      role = 'doctor'; id = doctor.doctorId; name = doctor.fullName; email = doctor.email || ''; profile = publicDoctorView(doctor);
    } else if (hs && hs.expiresAt > Date.now()) {
      const account = HOSPITAL_ACCOUNTS.get(hs.username);
      if (!account || account.status !== 'ACTIVE' || account.hospitalId !== hs.hospitalId) return null;
      hs.expiresAt = Date.now() + HOSPITAL_SESSION_TTL_MS;
      role = 'hospital'; id = account.username; name = account.hospitalName; email = account.email; profile = publicHospitalAccount(account);
    } else if (ps && ps.expiresAt > Date.now()) {
      const account = PHARMACY_PARTNER_ACCOUNTS.get(ps.username);
      if (!account || account.status !== 'VERIFIED' || account.partnerId !== ps.partnerId || !MARKET_PARTNERS.get(ps.partnerId)?.active) return null;
      ps.expiresAt = Date.now() + PHARMACY_PARTNER_SESSION_TTL_MS;
      role = 'pharmacy'; id = account.username; name = account.pharmacyName; email = account.username; profile = publicPartnerAccount(account);
    } else if (admin && admin.status === 'active') {
      role = 'news'; id = admin.adminId; name = admin.name; email = admin.email; profile = adminPublicView(admin);
    } else if (authority && !authority.suspended && !['SUSPENDED', 'REVOKED', 'REJECTED'].includes(authority.state)) {
      role = 'news'; id = authority.authorityId; name = authority.profile.orgName; email = authority.profile.contactEmail; profile = publicAuthorityView(authority);
    } else return null;
    return { role, profile, user: {
      id: `${role}:${id}`, username: id, fullName: name, firstName: name, lastName: '', email,
      role: role.toUpperCase(), portalRole: role, accountStatus: 'ACTIVE',
      isEmailVerified: true, isPhoneVerified: false, twoFactor: { enabled: !!admin?.mfaEnabled },
      createdAt: '', lastLoginAt: '',
    } };
  }

  app.get('/api/portals/:role/workspace', (req, res) => {
    const identity = platformIdentity(req);
    if (!identity) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in.' });
    if (!isPlatformRole(req.params.role) || identity.role !== req.params.role) {
      return res.status(403).json({ success: false, code: 'ACCESS_DENIED', error: 'This account cannot access that workspace.' });
    }
    // Account profile only, never the shared demo datasets used by the old
    // portal prototypes. Domain APIs retain their own resource-level guards.
    const { role, profile, user } = identity;
    const accountId = user.username;
    const records: Array<{ id: string; title: string; status: string }> = [];
    let activity: Array<{ id: string; title: string; at: string }> = [];
    let notifications: Array<{ id: string; title: string; body: string }> = [];
    if (role === 'doctor') {
      notifications = (DOCTOR_NOTIFICATIONS.get(accountId) || []).map(n => ({ id: n.id, title: n.title, body: n.body }));
      for (const requests of CONSENT_REQUESTS.values()) for (const r of requests) {
        if (r.doctorId === accountId) records.push({ id: r.requestId, title: 'Patient consent request', status: r.status });
      }
    } else if (role === 'hospital') {
      const hospital = HOSPITAL_REGISTRY.get(profile.hospitalId);
      if (hospital) records.push({ id: profile.hospitalId, title: hospital.identity.name, status: 'Organization profile' });
      activity = HOSPITAL_AUDIT.filter(a => a.userId === accountId && a.hospitalId === profile.hospitalId).map(a => ({ id: a.id, title: a.reason || a.section, at: a.changedAt }));
    } else if (role === 'pharmacy') {
      for (const r of MARKET_INVENTORY.values()) if (r.pharmacyId === profile.partnerId) records.push({ id: r.medicineId, title: r.medicineName, status: r.stockStatus });
      activity = INVENTORY_AUDIT.filter(a => a.actorId === accountId && a.pharmacyId === profile.partnerId).map(a => ({ id: a.id, title: a.reason || a.medicineName, at: a.changedAt }));
    } else if (role === 'news') {
      for (const r of NEWS_SUBMISSIONS.values()) if (r.authorityId === accountId) records.push({ id: r.submissionId, title: r.headline, status: r.status });
      activity = NEWS_AUDIT.filter(a => a.actorId === accountId).map(a => ({ id: a.id, title: a.action, at: a.timestamp || a.at }));
      notifications = (AUTHORITY_NOTIFICATIONS.get(accountId) || []).map(n => ({ id: n.id, title: n.title, body: n.body }));
    }
    return res.json({ success: true, role, accountId: user.id, profile, records: records.slice(-200), activity: activity.slice(-50).reverse(), notifications: notifications.slice(0, 50) });
  });

  // ---- Hospital portal auth endpoints ----
  app.post('/api/hospital-portal/auth/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const cleanId = String(identifier || '').trim().toLowerCase();
    const rl = checkRateLimit(HOSPITAL_LOGIN_ATTEMPTS, cleanId || 'unknown', 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: `Too many sign-in attempts. Please try again in ${Math.ceil(rl.retryInMs / 60000)} minutes.` });
    }
    const account =
      [...HOSPITAL_ACCOUNTS.values()].find((a) => a.username === cleanId || a.email.toLowerCase() === cleanId) || null;
    if (!account || !verifySecret(account.username, String(password || ''), account.passwordHash)) {
      registerFailedAttempt(HOSPITAL_LOGIN_ATTEMPTS, cleanId, 15 * 60 * 1000);
      hospitalAudit({
        hospitalId: account?.hospitalId || 'unknown',
        hospitalName: account ? registryName(account.hospitalId) : 'unknown',
        userId: cleanId || 'unknown',
        userName: cleanId || 'unknown',
        userRole: 'Hospital Portal',
        section: 'auth',
        changes: [],
        publicationStatus: 'PUBLISHED',
        syncStatus: 'SYNCED',
        source: 'HOSPITAL_PORTAL',
        ip: req.ip,
        result: 'REJECTED',
        reason: 'Failed hospital portal sign-in'
      });
      return res.status(401).json({ success: false, error: 'Incorrect hospital credentials.' });
    }
    if (account.passwordHash.startsWith('pbkdf2-sha256$')) {
      account.passwordHash = hashSecret(account.username, String(password || ''));
      HOSPITAL_ACCOUNTS.set(account.username, account);
    }
    if (account.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: 'This hospital account is suspended. Please contact GlobalHealth support.' });
    }
    HOSPITAL_LOGIN_ATTEMPTS.delete(cleanId);
    for (const [t, sess] of HOSPITAL_SESSIONS) {
      if (sess.expiresAt < Date.now()) HOSPITAL_SESSIONS.delete(t);
    }
    const session: HospitalPortalSession = {
      token: secureToken("hpt-sess"),
      username: account.username,
      hospitalId: account.hospitalId,
      issuedAt: nowIso(),
      expiresAt: Date.now() + HOSPITAL_SESSION_TTL_MS
    };
    HOSPITAL_SESSIONS.set(session.token, session);
    hospitalAudit({
      hospitalId: account.hospitalId,
      hospitalName: registryName(account.hospitalId),
      userId: account.username,
      userName: account.username,
      userRole: account.role,
      section: 'auth',
      changes: [],
      publicationStatus: 'PUBLISHED',
      syncStatus: 'SYNCED',
      source: 'HOSPITAL_PORTAL',
      ip: req.ip,
      result: 'SUCCESS',
      reason: 'Hospital portal sign-in'
    });
    return res.json({
      success: true,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      account: publicHospitalAccount(account, session)
    });
  });

  app.get('/api/hospital-portal/auth/me', requireHospitalToken, (req: any, res) => {
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const session = HOSPITAL_SESSIONS.get(token)!;
    return res.json({ success: true, account: publicHospitalAccount(req.hospitalAccount, session) });
  });

  app.post('/api/hospital-portal/auth/logout', requireHospitalToken, (req: any, res) => {
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    HOSPITAL_SESSIONS.delete(token);
    return res.json({ success: true });
  });

  app.post('/api/hospital-portal/auth/change-password', requireHospitalToken, (req: any, res) => {
    const account: HospitalPortalAccount = req.hospitalAccount;
    const { oldPassword, newPassword } = req.body || {};
    if (!verifySecret(account.username, String(oldPassword || ''), account.passwordHash)) {
      return res.status(400).json({ success: false, code: 'OLD_PASSWORD_WRONG', error: 'Current password entered is incorrect.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'New password must be at least 8 characters.' });
    }
    account.passwordHash = hashSecret(account.username, String(newPassword));
    const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    for (const [t, sess] of HOSPITAL_SESSIONS) {
      if (sess.username === account.username && t !== token) HOSPITAL_SESSIONS.delete(t);
    }
    hospitalAudit({
      hospitalId: account.hospitalId, hospitalName: registryName(account.hospitalId), userId: account.username,
      userName: account.username, userRole: account.role, section: 'auth', changes: [{ field: 'auth.password', oldValue: '••••', newValue: '••••' }],
      publicationStatus: 'PUBLISHED', syncStatus: 'SYNCED', source: 'HOSPITAL_PORTAL', ip: req.ip, result: 'SUCCESS', reason: 'Password changed in active session'
    });
    return res.json({ success: true, message: 'Password updated successfully.' });
  });

  // Account provisioning from the hospital application → activation flow.
  app.post('/api/hospital-portal/auth/register', (req, res) => {
    if (!process.env.GH_ADMIN_KEY || req.headers['x-admin-key'] !== process.env.GH_ADMIN_KEY) {
      return res.status(403).json({ success: false, code: 'PROVISIONING_REQUIRED', error: 'This professional account must be provisioned by your verified organization. Contact your organization administrator.' });
    }

    const b = req.body || {};
    const username = String(b.username || '').trim().toLowerCase();
    const password = String(b.password || '');
    const hospitalId = String(b.hospitalId || '').trim();
    if (!/^[a-z0-9_.]{4,32}$/.test(username)) {
      return res.status(400).json({ success: false, code: 'INVALID_USERNAME', error: 'Username must be 4–32 characters (letters, numbers, dot or underscore).' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters long.' });
    }
    if (!hospitalId) {
      return res.status(400).json({ success: false, code: 'HOSPITAL_REQUIRED', error: 'A hospital reference is required.' });
    }
    if ([...HOSPITAL_ACCOUNTS.values()].some((a) => a.username === username)) {
      return res.status(409).json({ success: false, code: 'USERNAME_TAKEN', error: 'This username is already taken. Please choose another.' });
    }
    const account: HospitalPortalAccount = {
      username,
      hospitalId,
      hospitalName: String(b.hospitalName || registryName(hospitalId)).slice(0, 200),
      email: String(b.email || `${username}@hospital.globalhealth.org`).toLowerCase().slice(0, 200),
      role: 'Hospital Administrator',
      passwordHash: hashSecret(username, password),
      status: 'ACTIVE'
    };
    HOSPITAL_ACCOUNTS.set(username, account);
    hospitalAudit({
      hospitalId, hospitalName: registryName(hospitalId), userId: username, userName: username, userRole: account.role,
      section: 'auth', changes: [], publicationStatus: 'PUBLISHED', syncStatus: 'SYNCED', source: 'HOSPITAL_PORTAL',
      ip: req.ip, result: 'SUCCESS', reason: 'Hospital portal account provisioned via activation token'
    });
    return res.status(201).json({ success: true, account: publicHospitalAccount(account) });
  });

  // Password recovery — server-issued, single-use, 1-hour tokens.
  const HOSPITAL_RESET_TOKENS: Map<string, { token: string; username: string; expiresAt: number; used: boolean }> = new Map();
  app.post('/api/hospital-portal/auth/request-reset', (req, res) => {
    const cleanId = String(req.body?.identifier || '').trim().toLowerCase();
    const generic = { success: true, message: 'If the information provided matches an eligible account, password reset instructions will be sent to the registered official contact method.' };
    const account = [...HOSPITAL_ACCOUNTS.values()].find((a) => a.username === cleanId || a.email.toLowerCase() === cleanId);
    if (!account) return res.json(generic);
    for (const [t, r] of HOSPITAL_RESET_TOKENS) {
      if (r.username === account.username && !r.used) HOSPITAL_RESET_TOKENS.delete(t);
    }
    const record = { token: secureToken("rst-hpt"), username: account.username, expiresAt: Date.now() + 60 * 60 * 1000, used: false };
    HOSPITAL_RESET_TOKENS.set(record.token, record);
    return res.json({ ...generic, ...(IS_PRODUCTION ? {} : { demoToken: record.token }) });
  });

  app.post('/api/hospital-portal/auth/complete-reset', (req, res) => {
    const { resetToken, newPassword } = req.body || {};
    const record = HOSPITAL_RESET_TOKENS.get(String(resetToken || '').trim());
    if (!record || record.used || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, code: 'RESET_INVALID', error: 'The reset link could not be verified or has expired. Please request a new one.' });
    }
    if (String(newPassword || '').length < 8) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'The new password must be at least 8 characters long.' });
    }
    record.used = true;
    HOSPITAL_RESET_TOKENS.delete(record.token);
    const account = HOSPITAL_ACCOUNTS.get(record.username);
    if (!account) return res.status(404).json({ success: false, code: 'ACCOUNT_NOT_FOUND', error: 'This hospital account no longer exists.' });
    account.passwordHash = hashSecret(account.username, String(newPassword));
    for (const [t, sess] of HOSPITAL_SESSIONS) {
      if (sess.username === account.username) HOSPITAL_SESSIONS.delete(t);
    }
    hospitalAudit({
      hospitalId: account.hospitalId, hospitalName: registryName(account.hospitalId), userId: account.username, userName: account.username,
      userRole: account.role, section: 'auth', changes: [], publicationStatus: 'PUBLISHED', syncStatus: 'SYNCED', source: 'HOSPITAL_PORTAL',
      ip: req.ip, result: 'SUCCESS', reason: 'Password reset completed; all sessions revoked'
    });
    return res.json({ success: true, message: 'Your password has been reset. Please sign in with your new password.' });
  });

  // ---- Portal: read own full record (including drafts) ----
  app.get('/api/hospital-registry/:hospitalId/record', requireHospitalToken, (req: any, res) => {
    const rec = HOSPITAL_REGISTRY.get(req.hospitalId);
    if (!rec) return res.status(404).json({ success: false, error: 'Hospital record not found.' });
    return res.json({ success: true, record: rec });
  });

  // ---- Portal: update one section (validate → diff → save → audit → publish) ----
  app.post('/api/hospital-registry/:hospitalId/sections/:section', requireHospitalToken, (req: any, res) => {
    const rec = HOSPITAL_REGISTRY.get(req.hospitalId);
    if (!rec) return res.status(404).json({ success: false, error: 'Hospital record not found.' });
    const section = String(req.params.section);
    const { data, userId, userName, userRole, comment } = req.body || {};

    const LIST_SECTIONS = new Set(['departments', 'doctors', 'services', 'pricing', 'accreditation', 'researchEducation', 'news']);
    if (!(section in rec) || section === 'hospitalId' || section === 'version') {
      return res.status(400).json({ success: false, code: 'UNKNOWN_SECTION', error: `Unknown information section "${section}".` });
    }
    if (data === undefined) {
      return res.status(400).json({ success: false, error: 'Missing section data.' });
    }

    // Partial updates are supported: validate the MERGED section (spec §27 —
    // only the affected fields change, but the published result must be valid).
    const merged = LIST_SECTIONS.has(section) ? data : { ...(rec as any)[section], ...data };

    // Validation
    const problems = LIST_SECTIONS.has(section)
      ? (Array.isArray(data) ? [] : [`${section} must be an array.`])
      : validateHospitalSection(section, merged);
    if (problems.length) {
      hospitalAudit({
        hospitalId: rec.hospitalId, hospitalName: rec.identity.name, userId: String(userId || 'unknown'),
        userName: String(userName || 'Portal User'), userRole: String(userRole || 'Hospital User'),
        section, changes: [], publicationStatus: rec.publicationStatus, syncStatus: rec.syncStatus,
        source: 'HOSPITAL_PORTAL', ip: req.ip, result: 'REJECTED', reason: `Validation failed: ${problems.join(' ')}`
      });
      return res.status(400).json({ success: false, code: 'VALIDATION_FAILED', problems });
    }

    // Change detection (field-level diff, only affected section is touched)
    let changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    if (LIST_SECTIONS.has(section)) {
      changes = [{ field: section, oldValue: (rec as any)[section], newValue: data }];
    } else {
      changes = diffObject(section, (rec as any)[section], merged);
    }
    if (changes.length === 0) {
      return res.json({ success: true, unchanged: true, message: 'No changes detected — nothing to publish.', record: rec });
    }

    // Save, bump version, publish (audit-trail keeps history)
    (rec as any)[section] = merged;
    rec.version += 1;
    rec.lastUpdated = new Date().toISOString();
    rec.updatedBy = String(userName || 'Portal User');
    rec.publicationStatus = 'PUBLISHED';
    rec.syncStatus = 'SYNCED';

    hospitalAudit({
      hospitalId: rec.hospitalId, hospitalName: rec.identity.name, userId: String(userId || 'unknown'),
      userName: String(userName || 'Portal User'), userRole: String(userRole || 'Hospital User'),
      section, changes, publicationStatus: rec.publicationStatus, syncStatus: rec.syncStatus,
      source: 'HOSPITAL_PORTAL', ip: req.ip, result: 'SUCCESS', reason: comment ? String(comment) : undefined
    });

    return res.json({
      success: true,
      record: rec,
      publishedFields: changes.map((c) => c.field),
      propagation: ['Hospital profile', 'Hospital search', 'Medical Map marker', 'Doctor directory', 'Hospital details page'],
      message: 'Saved and published. The GlobalHealth user platform now shows this hospital\'s latest approved information.'
    });
  });

  // ---- Portal: own audit history ----
  app.get('/api/hospital-registry/:hospitalId/audit', requireHospitalToken, (req: any, res) => {
    return res.json({
      success: true,
      records: HOSPITAL_AUDIT.filter((a) => a.hospitalId === req.hospitalId).slice(0, 200)
    });
  });

  // ----------------------------------------------------------------------
  // 6.5 AI Assistant — conversation persistence (account-owned, session-secured)
  //
  // PRODUCTION CONTRACT (see docs/ai-assistant-backend-contract.md):
  //   - Tables: ai_conversations (id, userId, title, createdAt, updatedAt)
  //             ai_messages    (id, conversationId, role, content, createdAt)
  //   - The user is ALWAYS identified from the validated session token on the
  //     request (req.authUser). The client never supplies a userId.
  //   - EVERY persistent request validates authenticatedUser.id ===
  //     conversation.userId before reading or mutating. Unknown or foreign
  //     conversations are answered with a uniform 404 (no existence leak).
  //   - Anonymous (guest) chats are session-only on the client and are never
  //     sent here unless the user explicitly saved the conversation to their
  //     account after signing in.
  // ----------------------------------------------------------------------

  interface ServerAiMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
    /** Client-supplied idempotency key. Repeated sends (retry, double-tap,
     * concurrent tabs) return the previously stored message instead of
     * creating duplicates. */
    clientMessageId?: string;
  }
  interface ServerAiConversation {
    id: string;
    userId: string;
    title: string;
    messages: ServerAiMessage[];
    createdAt: number;
    updatedAt: number;
    isSaved: boolean;
    archivedAt?: number;
    deletedAt?: number;
  }
  const AI_CONVERSATIONS_FILE = path.join(RUNTIME_DIR, 'ai-conversations.json');
  const AI_SHARE_LINKS_FILE = path.join(RUNTIME_DIR, 'ai-share-links.json');
  const AI_CONVERSATIONS: Map<string, ServerAiConversation> = new Map();
  const AI_SHARE_LINKS = new Map<
    string,
    { token: string; conversationId: string; userId: string; createdAt: number; revokedAt?: number }
  >();
  const AI_TITLE = 'New conversation';

  // Restore persisted user-owned chats on every server start. In-memory maps
  // stay the source of truth for fast reads; writes are committed atomically
  // to disk so restarts do not lose AI history.
  try {
    const persistedConversations = readJsonFile<ServerAiConversation[]>(AI_CONVERSATIONS_FILE, []);
    for (const c of persistedConversations) {
      if (
        c &&
        typeof c.id === 'string' &&
        typeof c.userId === 'string' &&
        !isDemoAccountId(c.userId) &&
        Array.isArray(c.messages)
      ) {
        AI_CONVERSATIONS.set(c.id, {
          ...c,
          isSaved: Boolean(c.isSaved),
          createdAt: Number(c.createdAt) || Date.now(),
          updatedAt: Number(c.updatedAt) || Date.now(),
        });
      }
    }
    const persistedShares = readJsonFile<{ token: string; conversationId: string; userId: string; createdAt: number; revokedAt?: number }[]>(
      AI_SHARE_LINKS_FILE,
      []
    );
    for (const share of persistedShares) {
      if (
        share &&
        typeof share.token === 'string' &&
        typeof share.conversationId === 'string' &&
        typeof share.userId === 'string' &&
        !isDemoAccountId(share.userId)
      ) {
        AI_SHARE_LINKS.set(share.token, share);
      }
    }
  } catch (err) {
    console.warn('[GlobalHealth] AI persistence could not be restored:', (err as Error)?.message);
  }

  const persistAiConversations = () =>
    writeJsonFile(
      AI_CONVERSATIONS_FILE,
      [...AI_CONVERSATIONS.values()].filter((conversation) => !isDemoAccountId(conversation.userId))
    );
  const persistAiShareLinks = () =>
    writeJsonFile(
      AI_SHARE_LINKS_FILE,
      [...AI_SHARE_LINKS.values()].filter((share) => !isDemoAccountId(share.userId))
    );

  cleanupEphemeralDemoAccount = (userId: string) => {
    const user = PUBLIC_USERS.get(userId);
    if (!user?.isEphemeralDemo) {
      for (const [token, session] of ACTIVE_SESSIONS.entries()) {
        if (session.userId === userId && session.isDemoSession) ACTIVE_SESSIONS.delete(token);
      }
      return;
    }

    const requests = CONSENT_REQUESTS.get(userId) || [];
    const requestIds = new Set(requests.map((request) => request.requestId));
    for (const request of requests) {
      if (request.attachment?.attachmentId) ATTACHMENTS.delete(request.attachment.attachmentId);
    }

    for (const [token, session] of ACTIVE_SESSIONS.entries()) {
      if (session.userId === userId) ACTIVE_SESSIONS.delete(token);
    }
    PUBLIC_USERS.delete(userId);
    PRIVATE_DATA.delete(userId);
    CONSENT_REQUESTS.delete(userId);
    DOCTOR_ACCESS.delete(userId);
    EHR_RECORDS.delete(userId);
    EMAIL_OUTBOX.delete(userId);
    RETENTION_ARCHIVE.delete(userId);
    REAUTH_ATTEMPTS.delete(userId);
    for (const [token, share] of EHR_CONSENT_SHARES.entries()) {
      if (share.userId === userId) EHR_CONSENT_SHARES.delete(token);
    }
    for (const [token, link] of EMAIL_LINK_TOKENS.entries()) {
      if (link.patientUserId === userId) EMAIL_LINK_TOKENS.delete(token);
    }
    for (const requestId of requestIds) DECIDED_REQUESTS.delete(requestId);
    for (const [doctorId, notifications] of DOCTOR_NOTIFICATIONS.entries()) {
      const remaining = notifications.filter((notification) =>
        notification.patientUserId !== userId && !requestIds.has(notification.requestId || '')
      );
      if (remaining.length) DOCTOR_NOTIFICATIONS.set(doctorId, remaining);
      else DOCTOR_NOTIFICATIONS.delete(doctorId);
    }
    for (let index = consentAudit.length - 1; index >= 0; index -= 1) {
      if (consentAudit[index]?.patientUserId === userId) consentAudit.splice(index, 1);
    }
    lastAuditHash.delete(userId);
    for (const [conversationId, conversation] of AI_CONVERSATIONS.entries()) {
      if (conversation.userId === userId) AI_CONVERSATIONS.delete(conversationId);
    }
    for (const [token, share] of AI_SHARE_LINKS.entries()) {
      if (share.userId === userId) AI_SHARE_LINKS.delete(token);
    }
    for (let index = AUDIT_LOGS.length - 1; index >= 0; index -= 1) {
      if (AUDIT_LOGS[index]?.userId === userId) AUDIT_LOGS.splice(index, 1);
    }

    persistRuntimeAccounts();
    persistEhrConsentShares();
    persistAiConversations();
    persistAiShareLinks();
    persistDomainStateNow();
  };

  const demoExpirySweeper = setInterval(() => {
    const now = Date.now();
    for (const session of [...ACTIVE_SESSIONS.values()]) {
      if (session.isDemoSession && (!session.expiresAt || session.expiresAt <= now)) {
        cleanupEphemeralDemoAccount(session.userId);
      }
    }
  }, 60 * 1000);
  demoExpirySweeper.unref();

  const aiConvId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const aiSummary = (c: ServerAiConversation) => ({
    id: c.id,
    title: c.title,
    messageCount: c.messages.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isSaved: c.isSaved,
    isArchived: typeof c.archivedAt === 'number',
    isTrashed: typeof c.deletedAt === 'number',
  });

  const aiPublicConversation = (c: ServerAiConversation) => ({
    id: c.id,
    title: c.title,
    messages: c.messages,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isSaved: c.isSaved,
    isArchived: typeof c.archivedAt === 'number',
    isTrashed: typeof c.deletedAt === 'number',
  });

  // Uniform 404 for missing OR foreign conversations.
  const aiFindOwned = (userId: string, id: string): ServerAiConversation | null => {
    const conv = AI_CONVERSATIONS.get(id);
    if (!conv || conv.userId !== userId) return null;
    return conv;
  };

  const aiValidMessage = (
    role: unknown,
    content: unknown
  ): { role: 'user' | 'assistant'; content: string; clientMessageId?: string } | null => {
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 10000) return null;
    return { role, content: trimmed };
  };

  // GET /api/ai/conversations — the signed-in user's own summaries.
  // Supports ?filter=recent|saved|archived|trash and ?q=text search.
  app.get('/api/ai/conversations', requireAuth, (req: any, res) => {
    const filter = typeof req.query?.filter === 'string' ? req.query.filter : 'recent';
    const q = typeof req.query?.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    let owned = [...AI_CONVERSATIONS.values()].filter((c) => c.userId === req.authUser.id);
    if (filter === 'saved') owned = owned.filter((c) => c.isSaved && !c.deletedAt);
    else if (filter === 'archived') owned = owned.filter((c) => Boolean(c.archivedAt) && !c.deletedAt);
    else if (filter === 'trash') owned = owned.filter((c) => Boolean(c.deletedAt));
    else owned = owned.filter((c) => !c.deletedAt && !c.archivedAt);
    if (q) {
      owned = owned.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
    }
    const list = owned.sort((a, b) => b.updatedAt - a.updatedAt).map(aiSummary);
    return res.json({ success: true, conversations: list });
  });

  // POST /api/ai/conversations — create (optionally with saved messages when
  // the user explicitly chose to save a guest conversation to their account).
  app.post('/api/ai/conversations', requireAuth, (req: any, res) => {
    const { title, messages } = req.body || {};
    const now = Date.now();
    const conv: ServerAiConversation = {
      id: aiConvId('ai-c'),
      userId: req.authUser.id,
      title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : AI_TITLE,
      messages: [],
      createdAt: now,
      updatedAt: now,
      isSaved: false,
    };
    if (Array.isArray(messages)) {
      for (const m of messages) {
        const valid = aiValidMessage(m?.role, m?.content);
        if (!valid) continue;
        const clientMessageId =
          typeof m?.clientMessageId === 'string' && m.clientMessageId.trim()
            ? m.clientMessageId.trim().slice(0, 100)
            : typeof m?.id === 'string'
              ? m.id.trim().slice(0, 100)
              : undefined;
        conv.messages.push({ id: aiConvId('ai-msg'), ...valid, createdAt: now, clientMessageId });
      }
      if (conv.messages.length > 0) conv.updatedAt = now;
      const firstUser = conv.messages.find((m) => m.role === 'user');
      if (conv.title === AI_TITLE && firstUser) {
        conv.title = firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 48) || AI_TITLE;
      }
    }
    AI_CONVERSATIONS.set(conv.id, conv);
    persistAiConversations();
    return res.status(201).json({ success: true, conversation: aiPublicConversation(conv) });
  });

  // DELETE /api/ai/conversations — soft-delete ALL of the user's conversations.
  app.delete('/api/ai/conversations', requireAuth, (req: any, res) => {
    let count = 0;
    for (const [, c] of AI_CONVERSATIONS.entries()) {
      if (c.userId === req.authUser.id && !c.deletedAt) {
        c.deletedAt = Date.now();
        c.updatedAt = Date.now();
        count += 1;
      }
    }
    persistAiConversations();
    return res.json({ success: true, deleted: true, count });
  });

  // GET /api/ai/conversations/:id — full conversation (owner only).
  app.get('/api/ai/conversations/:id', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    return res.json({ success: true, conversation: aiPublicConversation(conv) });
  });

  // PUT /api/ai/conversations/:id — rename, save/unsave, archive/restore (owner only).
  app.put('/api/ai/conversations/:id', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    if (req.body?.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title || title.length > 80) {
        return res.status(400).json({ success: false, error: 'A title of up to 80 characters is required.' });
      }
      conv.title = title;
    }
    if (req.body?.isSaved !== undefined && typeof req.body.isSaved === 'boolean') {
      conv.isSaved = req.body.isSaved;
    }
    if (req.body?.archive !== undefined && typeof req.body.archive === 'boolean') {
      if (req.body.archive) conv.archivedAt = Date.now();
      else delete conv.archivedAt;
    }
    if (req.body?.restore !== undefined && req.body.restore === true) {
      delete conv.deletedAt;
      delete conv.archivedAt;
    }
    conv.updatedAt = Date.now();
    persistAiConversations();
    return res.json({ success: true, conversation: aiSummary(conv) });
  });

  // DELETE /api/ai/conversations/:id — soft-delete (owner only). Deleted chats
  // move to Trash and can be restored. Use /permanent for true removal.
  app.delete('/api/ai/conversations/:id', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    conv.deletedAt = Date.now();
    conv.updatedAt = Date.now();
    persistAiConversations();
    return res.json({ success: true, deleted: true, softDeleted: true });
  });

  // DELETE /api/ai/conversations/:id/permanent — permanent removal from Trash.
  app.delete('/api/ai/conversations/:id/permanent', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    AI_CONVERSATIONS.delete(conv.id);
    persistAiConversations();
    return res.json({ success: true, deleted: true, permanent: true });
  });

  // POST /api/ai/conversations/:id/messages — append a message (owner only).
  app.post('/api/ai/conversations/:id/messages', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    const valid = aiValidMessage(req.body?.role, req.body?.content);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'A message with role "user" or "assistant" and content up to 10,000 characters is required.' });
    }
    const clientMessageId =
      typeof req.body?.clientMessageId === 'string' && req.body.clientMessageId.trim()
        ? req.body.clientMessageId.trim().slice(0, 100)
        : typeof req.body?.id === 'string'
          ? req.body.id.trim().slice(0, 100)
          : undefined;

    // Idempotency: if this client message was already successfully stored
    // (retry after a dropped response, double-tap, or a concurrent tab), return
    // the stored record instead of creating a duplicate. This is the
    // duplicate-message safety net required by the unified chat contract.
    if (clientMessageId) {
      const existing = conv.messages.find((m) => m.clientMessageId === clientMessageId && m.role === valid.role);
      if (existing) {
        return res.status(200).json({ success: true, message: existing, deduplicated: true });
      }
    }

    const msg: ServerAiMessage = { id: aiConvId('ai-msg'), ...valid, createdAt: Date.now(), clientMessageId };
    conv.messages.push(msg);
    conv.updatedAt = msg.createdAt;
    // Auto-title from the first user message when still untitled.
    if (conv.title === AI_TITLE && msg.role === 'user') {
      conv.title = msg.content.replace(/\s+/g, ' ').trim().slice(0, 48) || AI_TITLE;
    }
    persistAiConversations();
    return res.status(201).json({ success: true, message: msg, deduplicated: false });
  });

  // GET /api/ai/conversations/:id/export — download this user's OWN chat in
  // plain-text or JSON form. The caller must be the conversation owner.
  app.get('/api/ai/conversations/:id/export', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    const format = typeof req.query?.format === 'string' ? req.query.format.toLowerCase() : 'text';
    if (format !== 'text' && format !== 'json') {
      return res.status(400).json({ success: false, error: 'Export format must be "text" or "json".' });
    }
    const safeTitle = conv.title.replace(/[^\w\-. ]+/g, '_').replace(/\s+/g, '-').slice(0, 48) || 'ai-conversation';
    if (format === 'json') {
      return res.json({
        success: true,
        format: 'json',
        filename: `${safeTitle}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(
          {
            conversation: {
              id: conv.id,
              title: conv.title,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              isSaved: conv.isSaved,
              isArchived: typeof conv.archivedAt === 'number',
              isTrashed: typeof conv.deletedAt === 'number',
            },
            messages: conv.messages,
          },
          null,
          2
        ),
      });
    }
    const lines = [
      `GlobalHealth AI Conversation — ${conv.title}`,
      `Exported: ${new Date().toISOString()}`,
      `Messages: ${conv.messages.length}`,
      '',
    ];
    for (const m of conv.messages) {
      lines.push(`${m.role === 'user' ? 'You' : 'GlobalHealth AI'} (${new Date(m.createdAt).toISOString()}):`);
      lines.push(m.content);
      lines.push('');
    }
    lines.push('AI-generated information for educational use only. It is not a substitute for professional medical advice.');
    return res.json({
      success: true,
      format: 'text',
      filename: `${safeTitle}.txt`,
      contentType: 'text/plain; charset=utf-8',
      content: lines.join('\n'),
    });
  });

  // POST /api/ai/conversations/:id/share — create a revocable share link for
  // the owner's own conversation. A share token is a capability: possession of
  // the URL grants read-only access until the owner revokes it.
  app.post('/api/ai/conversations/:id/share', requireAuth, (req: any, res) => {
    const conv = aiFindOwned(req.authUser.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'This AI conversation could not be found.' });
    }
    if (conv.deletedAt) {
      return res.status(400).json({ success: false, error: 'A deleted conversation cannot be shared. Restore it first.' });
    }
    const token = secureToken("ghshare");
    AI_SHARE_LINKS.set(token, { token, conversationId: conv.id, userId: req.authUser.id, createdAt: Date.now() });
    persistAiShareLinks();
    return res.status(201).json({
      success: true,
      token,
      shareId: token.slice(9, 17),
      url: `/api/ai/conversations/shared/${token}`,
      expiresAt: null,
    });
  });

  // GET /api/ai/conversations/shared/:token — read-only public share view.
  // Only explicitly shared, non-revoked chats are visible.
  app.get('/api/ai/conversations/shared/:token', (req, res) => {
    const share = AI_SHARE_LINKS.get(req.params.token);
    if (!share || share.revokedAt) {
      return res.status(404).json({ success: false, error: 'This shared AI conversation is no longer available.' });
    }
    const conv = AI_CONVERSATIONS.get(share.conversationId);
    if (!conv || conv.deletedAt || conv.userId !== share.userId) {
      return res.status(404).json({ success: false, error: 'This shared AI conversation is no longer available.' });
    }
    return res.json({
      success: true,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      messages: conv.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })),
      disclaimer: 'This conversation is shared by the account owner. AI-generated information is educational only and does not replace professional medical advice.',
    });
  });

  // DELETE /api/ai/conversations/shared/:token — revoke a share link.
  app.delete('/api/ai/conversations/shared/:token', requireAuth, (req: any, res) => {
    const share = AI_SHARE_LINKS.get(req.params.token);
    if (!share) {
      return res.status(404).json({ success: false, error: 'This share link could not be found.' });
    }
    if (share.userId !== req.authUser.id) {
      return res.status(403).json({ success: false, error: 'You do not have permission to revoke this share link.' });
    }
    share.revokedAt = Date.now();
    persistAiShareLinks();
    return res.json({ success: true, revoked: true });
  });

  // ----------------------------------------------------------------------
  // 7. AI Assistant Endpoint (GlobalHealth Integration)
  // ----------------------------------------------------------------------
  app.post('/api/ai-assistant', async (req, res) => {
    try {
      const rl = hitRateLimit('ai-assistant', String(req.ip || 'anonymous'), 20, 5 * 60 * 1000);
      if (!rl.allowed) {
        return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'The AI assistant is receiving a lot of requests. Please wait a moment and try again.' });
      }
      const { prompt, language, userContext } = req.body;

      // Server-side safety backstop. This runs even if the generative model is
      // not configured, so a direct API caller can never bypass urgent guidance
      // with a normal knowledge answer.
      const safety = detectSafetyRisk(String(prompt || ''), String((userContext as any)?.language || ''));
      if (safety.risk === 'urgent' && safety.emergencyMessage) {
        return res.json({
          response: safety.emergencyMessage,
          safety,
          skipped: true,
        });
      }

      const apiKey = config.geminiApiKey;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      // RAG-style local verified knowledge retrieval. The model receives the
      // source label + only matched facts so it never needs to invent facts
      // about a medicine/condition/lab test the platform already has content
      // for.
      const knowledge = retrieveVerifiedKnowledge(String(prompt || ''), 3);

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const langInstruction = language && language !== 'English' ? ` Please respond in ${language}.` : '';

      // Personalization is derived ONLY from the calling client's own declared
      // identity (their name / MRN). Values are sanitized (no line breaks,
      // bounded length) so they cannot inject instructions, and nothing from
      // any other account is ever included.
      const cleanCtx = (v: unknown, max = 80): string =>
        String(v ?? '').replace(/[\r\n\t]/g, ' ').replace(/[<>{}]/g, '').trim().slice(0, max);
      const ctxName = cleanCtx((userContext as any)?.displayName);
      const ctxMrn = cleanCtx((userContext as any)?.mrn, 24);
      // Non-authoritative context from the client's understanding pipeline
      // (intent, answer mode, transparency guidance). Bounded and sanitized so
      // it cannot inject privileged instructions or leak private data.
      const ctxSystem = cleanCtx((userContext as any)?.systemContext, 5000) || '';
      const ctxHistory = cleanCtx((userContext as any)?.conversationHistory, 8000) || '';

      const identityInstruction =
        (userContext as any)?.authenticated && ctxName
          ? ` You are chatting with ${ctxName}, the signed-in GlobalHealth account owner${ctxMrn ? ` of health record ${ctxMrn}` : ''}. Address them by their first name where natural and tailor general guidance to them as an individual. You have access to NO clinical database: if they ask about their personal labs, vitals, medications or appointments that were not included in this message, say you cannot see that detail here rather than inventing it. You must never reference, assume or fabricate any other person's health data.`
          : ` The visitor is not signed in. Keep answers strictly general and educational. If they ask about "my" personal records, results or prescriptions, explain that personal EHR answers require signing in to their own account, and that you cannot see anyone's private health data.`;

      const systemInstruction = `You are GlobalHealth's AI Health & Wellness Assistant. You are an AI INFORMATION ASSISTANT — a website helper and educational health-information guide, NOT a doctor and NOT a licensed medical professional.
You provide compassionate, evidence-based, easy-to-understand EDUCATIONAL information about health conditions, symptoms, wellness, nutrition, medical tests, medications, and general fitness.
${identityInstruction}
SAFETY RULES (never violate):
- Never claim to be a doctor, nurse, clinician or licensed professional. Never say "I am your doctor" or imply medical credentials.
- NEVER diagnose. Never say "you definitely have X" or "this is X". Use educational framing: "This can be associated with...", "Generally...", "A healthcare professional can determine...".
- Never tell a user they do not need a doctor, and never instruct starting, stopping, or changing any medication or dose. Medications are described educationally only.
- If the user describes symptoms that could be urgent (chest pain, difficulty breathing, severe bleeding, stroke signs, seizures, loss of consciousness, suicidal thoughts, severe allergic reaction, poisoning/overdose), clearly advise seeking urgent/emergency care immediately. Never reassure falsely.
- Never invent statistics, percentages, or fake confidence values. If unsure, say so plainly.
- GlobalHealth website assistance: you may point users to real GlobalHealth sections (Explore Diseases, View Medicine Information, Explore Lab Tests, Find a Doctor, Open Medical Map, Explore Verified Pharmacy Partners, Open Community, Wellness & Fitness, Health Tools/Calculators, Nutrition & Recipes). Never invent pages that do not exist.
- Always end with a short note that this is educational information and not a substitute for professional medical advice.
Format responses cleanly with short markdown headings, brief paragraphs, and bullet points. Avoid walls of text.${langInstruction}${
        ctxSystem ? `\nPLATFORM CONTEXT GUIDANCE (non-authoritative, from GlobalHealth's understanding layer): ${ctxSystem}` : ''
      }${knowledge.context}${ctxHistory ? `\nCURRENT CONVERSATION HISTORY (recent, for continuity and reference resolution):\n${ctxHistory}\nUse this only to understand the user's current thread. Never repeat earlier answers verbatim.` : ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      return res.json({ response: response.text });
    } catch (err: any) {
      console.error('Error in AI Assistant endpoint:', err);
      return res.status(500).json({ error: err.message || 'An error occurred while generating AI response.' });
    }
  });

  // ----------------------------------------------------------------------
  // Cross-module runtime persistence (doctors, hospitals, pharmacy partners,
  // news accounts, clinical consent/EHR objects, marketplace orders). This
  // keeps domain data that was created at runtime across restarts. The file
  // is written 0600 and lives under git-ignored data/runtime/.
  // ----------------------------------------------------------------------
  const RUNTIME_DOMAIN_STORE = path.join(RUNTIME_DIR, 'domain-store.json');
  const persistDomainState = () => {
    const demoRequestIds = new Set(
      [...CONSENT_REQUESTS.entries()]
        .filter(([patientId]) => isDemoAccountId(patientId))
        .flatMap(([, requests]) => requests.map((request) => request.requestId))
    );
    const demoAttachmentIds = new Set(
      [...CONSENT_REQUESTS.entries()]
        .filter(([patientId]) => isDemoAccountId(patientId))
        .flatMap(([, requests]) => requests.map((request) => request.attachment?.attachmentId).filter(Boolean))
    );
    writeSecureJsonFile(RUNTIME_DOMAIN_STORE, {
      savedAt: new Date().toISOString(),
      doctors: [...DOCTORS.entries()],
      doctorSessions: [...DOCTOR_SESSIONS.entries()],
      doctorResetTokens: [...DOCTOR_RESET_TOKENS.entries()],
      doctorApplications: [...DOCTOR_APPLICATIONS.entries()],
      consentRequests: [...CONSENT_REQUESTS.entries()].filter(([patientId]) => !isDemoAccountId(patientId)),
      doctorAccess: [...DOCTOR_ACCESS.entries()].filter(([patientId]) => !isDemoAccountId(patientId)),
      ehrRecords: [...EHR_RECORDS.entries()].filter(([patientId]) => !isDemoAccountId(patientId)),
      attachments: [...ATTACHMENTS.entries()].filter(([attachmentId]) => !demoAttachmentIds.has(attachmentId)),
      doctorNotifications: [...DOCTOR_NOTIFICATIONS.entries()].map(([doctorId, notifications]) => [
        doctorId,
        notifications.filter((notification) => !demoRequestIds.has(notification.requestId || ''))
      ]),
      retentionArchive: [...RETENTION_ARCHIVE.entries()].filter(([patientId]) => !isDemoAccountId(patientId)),
      decidedRequests: [...DECIDED_REQUESTS.entries()].filter(([requestId]) => !demoRequestIds.has(requestId)),
      newsAdmins: [...NEWS_ADMINS.entries()],
      authorities: [...AUTHORITIES.entries()],
      newsAdminSessions: [...NEWS_ADMIN_SESSIONS.entries()],
      authoritySessions: [...AUTHORITY_SESSIONS.entries()],
      newsSubmissions: [...NEWS_SUBMISSIONS.entries()],
      newsReports: [...NEWS_REPORTS.entries()],
      authorityNotifications: [...AUTHORITY_NOTIFICATIONS.entries()],
      adminNotifications: [...ADMIN_NOTIFICATIONS.entries()],
      pharmacyPartnerAccounts: [...PHARMACY_PARTNER_ACCOUNTS.entries()],
      pharmacyPartnerSessions: [...PHARMACY_PARTNER_SESSIONS.entries()],
      pharmacyPartnerResetTokens: [...PHARMACY_PARTNER_RESET_TOKENS.entries()],
      marketInventory: [...MARKET_INVENTORY.entries()],
      marketOrders: [...MARKET_ORDERS.entries()],
      hospitalAccounts: [...HOSPITAL_ACCOUNTS.entries()],
      hospitalSessions: [...HOSPITAL_SESSIONS.entries()],
      hospitalRegistry: [...HOSPITAL_REGISTRY.entries()],
      hospitalResetTokens: [...HOSPITAL_RESET_TOKENS.entries()]
    });
  };
  persistDomainStateNow = persistDomainState;
  {
    // Demo professional credentials are never valid on a fresh production deployment.
    if (IS_PRODUCTION) { DOCTORS.clear(); HOSPITAL_ACCOUNTS.clear(); PHARMACY_PARTNER_ACCOUNTS.clear(); }
    const persisted = readJsonFile<Record<string, any>>(RUNTIME_DOMAIN_STORE, {});
    const apply = (entries: any, setter: (key: any, value: any) => void) => {
      if (!Array.isArray(entries)) return;
      for (const [key, value] of entries as [any, any][]) setter(key, value);
    };
    const persistedDemoRequests = (Array.isArray(persisted.consentRequests) ? persisted.consentRequests : [])
      .filter((entry: any) => Array.isArray(entry) && isDemoAccountId(String(entry[0])))
      .flatMap(([, requests]: any[]) => Array.isArray(requests) ? requests : []);
    const persistedDemoRequestIds = new Set(persistedDemoRequests.map((request: any) => String(request?.requestId || '')));
    const persistedDemoAttachmentIds = new Set(
      persistedDemoRequests.map((request: any) => request?.attachment?.attachmentId).filter(Boolean)
    );
    const applyNonDemoPatientEntries = (entries: any, setter: (key: any, value: any) => void) => {
      if (!Array.isArray(entries)) return;
      for (const [key, value] of entries as [any, any][]) {
        if (!isDemoAccountId(String(key))) setter(key, value);
      }
    };
    apply(persisted.doctors as any, (k, v) => DOCTORS.set(k, v));
    apply(persisted.doctorSessions as any, (k, v) => DOCTOR_SESSIONS.set(k, v));
    apply(persisted.doctorResetTokens as any, (k, v) => DOCTOR_RESET_TOKENS.set(k, v));
    apply(persisted.doctorApplications as any, (k, v) => DOCTOR_APPLICATIONS.set(k, v));
    applyNonDemoPatientEntries(persisted.consentRequests as any, (k, v) => CONSENT_REQUESTS.set(k, v));
    applyNonDemoPatientEntries(persisted.doctorAccess as any, (k, v) => DOCTOR_ACCESS.set(k, v));
    applyNonDemoPatientEntries(persisted.ehrRecords as any, (k, v) => EHR_RECORDS.set(k, v));
    apply(
      Array.isArray(persisted.attachments)
        ? persisted.attachments.filter(([attachmentId]: any[]) => !persistedDemoAttachmentIds.has(attachmentId))
        : [],
      (k, v) => ATTACHMENTS.set(k, v)
    );
    apply(
      Array.isArray(persisted.doctorNotifications)
        ? persisted.doctorNotifications.map(([doctorId, notifications]: any[]) => [
            doctorId,
            Array.isArray(notifications)
              ? notifications.filter((notification: any) => !persistedDemoRequestIds.has(String(notification?.requestId || '')))
              : []
          ])
        : [],
      (k, v) => DOCTOR_NOTIFICATIONS.set(k, v)
    );
    applyNonDemoPatientEntries(persisted.retentionArchive as any, (k, v) => RETENTION_ARCHIVE.set(k, v));
    apply(
      Array.isArray(persisted.decidedRequests)
        ? persisted.decidedRequests.filter(([requestId]: any[]) => !persistedDemoRequestIds.has(String(requestId)))
        : [],
      (k, v) => DECIDED_REQUESTS.set(k, v)
    );
    apply(persisted.newsAdmins as any, (k, v) => NEWS_ADMINS.set(k, v));
    apply(persisted.authorities as any, (k, v) => AUTHORITIES.set(k, v));
    apply(persisted.newsAdminSessions as any, (k, v) => NEWS_ADMIN_SESSIONS.set(k, v));
    apply(persisted.authoritySessions as any, (k, v) => AUTHORITY_SESSIONS.set(k, v));
    apply(persisted.newsSubmissions as any, (k, v) => NEWS_SUBMISSIONS.set(k, v));
    apply(persisted.newsReports as any, (k, v) => NEWS_REPORTS.set(k, v));
    apply(persisted.authorityNotifications as any, (k, v) => AUTHORITY_NOTIFICATIONS.set(k, v));
    apply(persisted.adminNotifications as any, (k, v) => ADMIN_NOTIFICATIONS.set(k, v));
    apply(persisted.pharmacyPartnerAccounts as any, (k, v) => PHARMACY_PARTNER_ACCOUNTS.set(k, v));
    apply(persisted.pharmacyPartnerSessions as any, (k, v) => PHARMACY_PARTNER_SESSIONS.set(k, v));
    apply(persisted.pharmacyPartnerResetTokens as any, (k, v) => PHARMACY_PARTNER_RESET_TOKENS.set(k, v));
    apply(persisted.marketInventory as any, (k, v) => MARKET_INVENTORY.set(k, v));
    apply(persisted.marketOrders as any, (k, v) => MARKET_ORDERS.set(k, v));
    apply(persisted.hospitalAccounts as any, (k, v) => HOSPITAL_ACCOUNTS.set(k, v));
    apply(persisted.hospitalSessions as any, (k, v) => HOSPITAL_SESSIONS.set(k, v));
    apply(persisted.hospitalRegistry as any, (k, v) => HOSPITAL_REGISTRY.set(k, v));
    apply(persisted.hospitalResetTokens as any, (k, v) => HOSPITAL_RESET_TOKENS.set(k, v));
  }
  setInterval(() => persistDomainState(), 10000).unref();

  // ----------------------------------------------------------------------
  // 6. API 404 boundary — unknown /api paths return JSON 404 in EVERY mode
  // (registered before the Vite middleware / static fallback so the SPA
  // shell can never mask a broken API call as HTTP 200 HTML).
  // ----------------------------------------------------------------------
  app.use('/api', (req, res) => {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  // Centralized API error boundary. User-facing errors never leak stack
  // traces, SQL, provider keys, or database internals.
  app.use('/api', (err: any, req: any, res: any, _next: any) => {
    console.error(`[GlobalHealth] API error ${req.requestId || ''}:`, err);
    return res.status(err?.status || 500).json({
      success: false,
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message:
          err?.message && (err?.status === 429 || err?.status === 401 || err?.status === 403 || err?.status === 400)
            ? err.message
            : 'Something went wrong. Please try again.',
      },
      requestId: req.requestId,
    });
  });

  // ----------------------------------------------------------------------
  // 7. Vite Dev Server / SPA Static Fallback
  // ----------------------------------------------------------------------
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(appDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send('MedAuth & GlobalHealth Engine: Building client assets.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('server listening', { host: '0.0.0.0', port: PORT, mode: config.nodeEnv });
    if (!config.geminiApiKey) {
      logger.warn('AI assistant disabled', { reason: 'GEMINI_API_KEY not set' });
    }
  });
}

// Surface startup failures instead of dying as a silent unhandled rejection.
startServer().catch((err) => {
  console.error('[GlobalHealth] Fatal: the server failed to start.\n', err);
  process.exit(1);
});

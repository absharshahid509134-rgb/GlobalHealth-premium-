// Isolated, passwordless demo sandboxes for the professional portals (Doctor,
// Hospital, Pharmacy and News Management).
//
// Design rules (mirrors the public User Portal demo):
//  - Every visitor gets a unique synthetic identity and an opaque, HMAC-signed
//    session token. No credential, shared password or real account exists.
//  - Sandbox state lives only in this process' memory. It is never written to
//    the account/domain stores and never touches the real hospital registry,
//    pharmacy inventory, doctor registry, consent records or news queue.
//  - A demo token authenticates ONLY the demo workspace API. It is not a valid
//    session in any real doctor/hospital/pharmacy/news realm.
//  - Sandboxes end on logout, after four hours without activity, or when the
//    process restarts (a still-signed token transparently opens a fresh one).
//
// The module is dependency-free (node:crypto only) so it can be unit tested
// without starting Express.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DEMO_PORTAL_ROLES = ['doctor', 'hospital', 'pharmacy', 'news'] as const;
export type DemoPortalRole = typeof DEMO_PORTAL_ROLES[number];

export const DEMO_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
export const DEMO_MAX_ITEMS_PER_SECTION = 25;
export const DEMO_MAX_TITLE_LENGTH = 120;
export const DEMO_MAX_DETAIL_LENGTH = 240;
const MAX_ACTIVITY = 50;
const MAX_ENDED_IDS = 20000;

export function isDemoPortalRole(value: unknown): value is DemoPortalRole {
  return typeof value === 'string' && (DEMO_PORTAL_ROLES as readonly string[]).includes(value);
}

export interface DemoItem {
  id: string;
  title: string;
  detail: string;
  status: string;
  updatedAt: string;
}

export interface DemoSection {
  id: string;
  title: string;
  description: string;
  /** Singular noun used by the "add" form, e.g. "patient". */
  itemLabel: string;
  statuses: string[];
  items: DemoItem[];
}

export interface DemoNotification { id: string; title: string; body: string }
export interface DemoActivity { id: string; title: string; at: string }

export interface DemoPortalSession {
  token: string;
  role: DemoPortalRole;
  /** 32 hex characters; the synthetic account's unique suffix. */
  accountKey: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
  profile: Record<string, string>;
  displayName: string;
  sections: DemoSection[];
  notifications: DemoNotification[];
  activity: DemoActivity[];
}

export interface DemoIdentity {
  role: DemoPortalRole;
  profile: Record<string, string>;
  user: Record<string, unknown>;
}

export type DemoMutationResult<T = DemoItem> =
  | { ok: true; value: T }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID' | 'LIMIT_REACHED'; error: string };

/** Removes control characters, collapses whitespace and bounds the length. */
export function cleanDemoText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Synthetic seed content. Every name, number and organisation below is
// fictional; nothing here describes a real person, clinic or product.
// ---------------------------------------------------------------------------

type Seed = {
  displayName: string;
  profile: Record<string, string>;
  sections: Array<Omit<DemoSection, 'items'> & { items: Array<[title: string, detail: string, status: string]> }>;
  notifications: Array<[title: string, body: string]>;
};

const SEEDS: Record<DemoPortalRole, Seed> = {
  doctor: {
    displayName: 'Dr. Riley Sample',
    profile: {
      fullName: 'Dr. Riley Sample',
      specialty: 'Internal Medicine',
      organization: 'GlobalHealth Demo Clinic',
      role: 'Consultant (demo)',
      registrationNo: 'DEMO-REG-0000',
      verificationStatus: 'Demo sandbox — not a real credential',
    },
    sections: [
      {
        id: 'patients', title: 'Patients', itemLabel: 'patient',
        description: 'Synthetic patient panel. No real patient information is stored here.',
        statuses: ['Active', 'Follow-up due', 'Discharged'],
        items: [
          ['Jordan Sample — type 2 diabetes review', 'HbA1c recheck planned; metformin 500 mg twice daily (sample data).', 'Follow-up due'],
          ['Casey Example — hypertension monitoring', 'Home blood-pressure log reviewed; no medication change (sample data).', 'Active'],
          ['Morgan Placeholder — post-viral cough', 'Symptoms resolved after two weeks (sample data).', 'Discharged'],
        ],
      },
      {
        id: 'appointments', title: 'Appointments', itemLabel: 'appointment',
        description: 'Practice every step of a clinic day without a real calendar.',
        statuses: ['Scheduled', 'In consultation', 'Completed', 'Cancelled'],
        items: [
          ['09:00 — Jordan Sample, diabetes follow-up', 'In-person, room 4 (sample).', 'Completed'],
          ['10:30 — Casey Example, blood-pressure check', 'Video consultation (sample).', 'In consultation'],
          ['14:00 — New patient intake', 'Placeholder booking; no real person attached.', 'Scheduled'],
        ],
      },
      {
        id: 'prescriptions', title: 'Prescriptions', itemLabel: 'prescription',
        description: 'Sample e-prescriptions. Nothing is signed, dispatched or filled.',
        statuses: ['Draft', 'Signed', 'Sent to pharmacy'],
        items: [
          ['Metformin 500 mg — Jordan Sample', 'Twice daily with food, 90 days (sample, not a prescription).', 'Signed'],
          ['Amlodipine 5 mg — Casey Example', 'Once daily, 30 days (sample, not a prescription).', 'Draft'],
        ],
      },
      {
        id: 'consents', title: 'Consent requests', itemLabel: 'consent request',
        description: 'Requests to view or update a patient record always wait for the patient.',
        statuses: ['Pending patient decision', 'Approved', 'Declined'],
        items: [
          ['Add HbA1c results — Jordan Sample', 'Synthetic request; shows how patient consent protects records.', 'Pending patient decision'],
          ['View lab history — Casey Example', 'Read-only access for 7 days (sample).', 'Approved'],
        ],
      },
    ],
    notifications: [
      ['Welcome to your Doctor Portal demo', 'Everything here is synthetic and private to this session. Add, update or remove items to explore.'],
      ['Consent request awaiting patient', 'A sample request to add HbA1c results is pending a decision.'],
      ['Lab result ready (sample)', 'Fasting glucose result for Jordan Sample is ready to review.'],
    ],
  },
  hospital: {
    displayName: 'Riverside Demo General Hospital',
    profile: {
      hospitalName: 'Riverside Demo General Hospital',
      hospitalId: 'HSP-DEMO-0001',
      role: 'Hospital Administrator (demo)',
      city: 'Sampleton',
      accreditation: 'Demo sandbox — not an accredited facility',
      status: 'Demo sandbox',
    },
    sections: [
      {
        id: 'beds', title: 'Bed capacity', itemLabel: 'ward',
        description: 'Live-style capacity board. Changes are not published to the public hospital directory.',
        statuses: ['Available', 'Limited', 'Full'],
        items: [
          ['Intensive care — 12 beds', '4 occupied, 8 free (sample).', 'Available'],
          ['General medicine — 60 beds', '54 occupied (sample).', 'Limited'],
          ['Maternity — 20 beds', '20 occupied (sample).', 'Full'],
        ],
      },
      {
        id: 'departments', title: 'Departments', itemLabel: 'department',
        description: 'Clinical departments and their operating status.',
        statuses: ['Open', 'Reduced hours', 'Closed'],
        items: [
          ['Cardiology', 'Mon–Sat 08:00–18:00 (sample).', 'Open'],
          ['Radiology', 'Emergency scans only after 20:00 (sample).', 'Reduced hours'],
          ['Dermatology', 'Closed for refurbishment (sample).', 'Closed'],
        ],
      },
      {
        id: 'appointments', title: 'Appointment requests', itemLabel: 'appointment request',
        description: 'Incoming synthetic booking requests from imaginary patients.',
        statuses: ['Requested', 'Confirmed', 'Completed'],
        items: [
          ['Orthopaedic consultation — Alex Example', 'Preferred morning slot (sample).', 'Requested'],
          ['Cardiac screening — Taylor Placeholder', 'Confirmed for next Tuesday (sample).', 'Confirmed'],
        ],
      },
      {
        id: 'ambulances', title: 'Ambulance fleet', itemLabel: 'ambulance',
        description: 'Practice dispatch status updates with no real vehicles.',
        statuses: ['Available', 'Dispatched', 'Maintenance'],
        items: [
          ['Unit A-1 (advanced life support)', 'Based at main entrance (sample).', 'Available'],
          ['Unit B-2 (basic life support)', 'Returning from a sample call.', 'Dispatched'],
        ],
      },
    ],
    notifications: [
      ['Welcome to your Hospital Portal demo', 'This organisation is fictional. Nothing you change appears in the public directory.'],
      ['Capacity alert (sample)', 'Maternity has reached full capacity in this sandbox.'],
    ],
  },
  pharmacy: {
    displayName: 'Greenleaf Demo Pharmacy',
    profile: {
      pharmacyName: 'Greenleaf Demo Pharmacy',
      partnerId: 'pharma-demo-sandbox',
      contactName: 'Sam Sample',
      licenseNumber: 'DEMO-LIC-0000',
      status: 'Demo sandbox — not a verified partner',
    },
    sections: [
      {
        id: 'inventory', title: 'Inventory', itemLabel: 'medicine',
        description: 'Sandbox stock list. It never changes live marketplace availability.',
        statuses: ['In stock', 'Low stock', 'Out of stock'],
        items: [
          ['Paracetamol 500 mg — strip of 10', '240 packs on hand (sample).', 'In stock'],
          ['Amoxicillin 250 mg — strip of 10', '8 packs left (sample).', 'Low stock'],
          ['Oral rehydration salts — sachet', 'Awaiting supplier delivery (sample).', 'Out of stock'],
        ],
      },
      {
        id: 'orders', title: 'Orders', itemLabel: 'order',
        description: 'Synthetic fulfilment queue. No customer, payment or delivery exists.',
        statuses: ['Received', 'Packed', 'Dispatched', 'Delivered'],
        items: [
          ['Order DEMO-1001 — 3 items', 'Standard delivery (sample).', 'Received'],
          ['Order DEMO-1000 — 1 item', 'Pickup at counter (sample).', 'Packed'],
        ],
      },
      {
        id: 'prescriptions', title: 'Prescription review', itemLabel: 'prescription',
        description: 'Practice pharmacist verification on made-up prescriptions.',
        statuses: ['Pending review', 'Verified', 'Needs clarification'],
        items: [
          ['Prescription DEMO-RX-17 — metformin', 'Dose and interactions look appropriate (sample).', 'Pending review'],
          ['Prescription DEMO-RX-16 — amlodipine', 'Confirm patient age with prescriber (sample).', 'Needs clarification'],
        ],
      },
    ],
    notifications: [
      ['Welcome to your Pharmacy Portal demo', 'Inventory, orders and prescriptions here are fictional and private to this session.'],
      ['Low stock warning (sample)', 'Amoxicillin 250 mg is below the reorder threshold.'],
    ],
  },
  news: {
    displayName: 'Avery Sample',
    profile: {
      fullName: 'Avery Sample',
      role: 'Editor (demo)',
      organization: 'GlobalHealth Demo Newsroom',
      permissions: 'Draft, review and approve in the sandbox only',
      status: 'Demo sandbox — nothing is published publicly',
    },
    sections: [
      {
        id: 'articles', title: 'Articles', itemLabel: 'article',
        description: 'Editorial workflow practice. "Published (demo only)" never reaches the public news feed.',
        statuses: ['Draft', 'In review', 'Approved', 'Published (demo only)'],
        items: [
          ['Seasonal vaccination: what to know this year', 'Explainer, 600 words (sample).', 'Draft'],
          ['Hospital hand-hygiene programme shows results', 'Feature, awaiting fact-check (sample).', 'In review'],
          ['Understanding blood-pressure readings', 'Reviewed and ready to schedule (sample).', 'Approved'],
        ],
      },
      {
        id: 'submissions', title: 'Authority submissions', itemLabel: 'submission',
        description: 'Verify announcements sent by fictional health authorities.',
        statuses: ['Submitted', 'Verified', 'Needs changes'],
        items: [
          ['Regional health office — clinic opening hours notice', 'Source documents attached (sample).', 'Submitted'],
          ['Sample Ministry of Health — vaccination campaign', 'Verified against official site (sample).', 'Verified'],
        ],
      },
      {
        id: 'reports', title: 'Reported content', itemLabel: 'report',
        description: 'Moderation queue for reader reports on made-up articles.',
        statuses: ['Open', 'Under review', 'Resolved'],
        items: [
          ['Reader reports outdated statistic', 'Article: blood-pressure explainer (sample).', 'Open'],
        ],
      },
    ],
    notifications: [
      ['Welcome to your News Management demo', 'Articles and submissions are synthetic. Nothing is published to the real news feed.'],
      ['Fact-check requested (sample)', 'The hand-hygiene feature needs a second reviewer.'],
    ],
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const TOKEN_PATTERN = /^gh-demo-(doctor|hospital|pharmacy|news)-([0-9a-f]{32})-([0-9a-f]{32})$/;

export class DemoPortalStore {
  private readonly sessions = new Map<string, DemoPortalSession>();
  private readonly ended = new Set<string>();

  constructor(private readonly secret: string, private readonly clock: () => number = Date.now) {
    if (!secret || secret.length < 16) throw new Error('A demo session secret of at least 16 characters is required.');
  }

  get size(): number {
    return this.sessions.size;
  }

  // ---- tokens -------------------------------------------------------------

  private signature(role: DemoPortalRole, accountKey: string): string {
    return createHmac('sha256', this.secret).update(`demo-portal:${role}:${accountKey}`).digest('hex').slice(0, 32);
  }

  signToken(role: DemoPortalRole, accountKey: string): string {
    return `gh-demo-${role}-${accountKey}-${this.signature(role, accountKey)}`;
  }

  /** Returns the role/account for a correctly signed token, otherwise null. */
  parseToken(token: unknown): { role: DemoPortalRole; accountKey: string } | null {
    if (typeof token !== 'string') return null;
    const match = TOKEN_PATTERN.exec(token);
    if (!match) return null;
    const role = match[1] as DemoPortalRole;
    const accountKey = match[2];
    const expected = Buffer.from(this.signature(role, accountKey));
    const actual = Buffer.from(match[3]);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return { role, accountKey };
  }

  /** True when the string has the shape of a professional demo token. */
  looksLikeToken(token: unknown): boolean {
    return typeof token === 'string' && TOKEN_PATTERN.test(token);
  }

  // ---- lifecycle ----------------------------------------------------------

  start(role: DemoPortalRole): DemoPortalSession {
    return this.provision(role, randomBytes(16).toString('hex'));
  }

  private provision(role: DemoPortalRole, accountKey: string): DemoPortalSession {
    const now = this.clock();
    const seed = SEEDS[role];
    const stamp = (offsetMinutes: number) => new Date(now - offsetMinutes * 60000).toISOString();
    let counter = 0;
    const nextId = (prefix: string) => `${prefix}-${accountKey.slice(0, 6)}-${(counter += 1)}`;
    const token = this.signToken(role, accountKey);
    const session: DemoPortalSession = {
      token,
      role,
      accountKey,
      createdAt: now,
      lastActive: now,
      expiresAt: now + DEMO_SESSION_TTL_MS,
      displayName: seed.displayName,
      profile: { ...seed.profile },
      sections: seed.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        itemLabel: section.itemLabel,
        statuses: [...section.statuses],
        items: section.items.map(([title, detail, status], index) => ({
          id: nextId(section.id),
          title,
          detail,
          status,
          updatedAt: stamp(15 + index * 40),
        })),
      })),
      notifications: seed.notifications.map(([title, body]) => ({ id: nextId('note'), title, body })),
      activity: [{ id: nextId('act'), title: 'Private demo sandbox opened', at: stamp(0) }],
    };
    this.sessions.set(token, session);
    return session;
  }

  /**
   * Resolves a token to a live sandbox, sliding its expiry. A validly signed
   * token whose in-memory state was lost (restart/redeploy) is restored with
   * fresh sample data; ended or expired sandboxes stay ended.
   */
  resolve(token: unknown): DemoPortalSession | null {
    const parsed = this.parseToken(token);
    if (!parsed) return null;
    const key = `${parsed.role}:${parsed.accountKey}`;
    if (this.ended.has(key)) return null;
    let session = this.sessions.get(token as string);
    const now = this.clock();
    if (session && session.expiresAt <= now) {
      this.end(token);
      return null;
    }
    if (!session) session = this.provision(parsed.role, parsed.accountKey);
    session.lastActive = now;
    session.expiresAt = now + DEMO_SESSION_TTL_MS;
    return session;
  }

  /** Ends a sandbox and discards all of its data. Safe to call repeatedly. */
  end(token: unknown): boolean {
    const parsed = this.parseToken(token);
    if (!parsed) return false;
    this.sessions.delete(token as string);
    this.ended.add(`${parsed.role}:${parsed.accountKey}`);
    if (this.ended.size > MAX_ENDED_IDS) {
      const oldest = this.ended.values().next().value;
      if (oldest) this.ended.delete(oldest);
    }
    return true;
  }

  /** Removes every sandbox idle for longer than the TTL. Returns the count. */
  sweep(): number {
    const now = this.clock();
    let removed = 0;
    for (const session of [...this.sessions.values()]) {
      if (session.expiresAt <= now) {
        this.end(session.token);
        removed += 1;
      }
    }
    return removed;
  }

  // ---- views --------------------------------------------------------------

  identity(session: DemoPortalSession): DemoIdentity {
    const accountId = `demo-${session.accountKey}`;
    const [first, ...rest] = session.displayName.split(' ');
    return {
      role: session.role,
      profile: { ...session.profile },
      user: {
        id: `${session.role}:${accountId}`,
        username: accountId,
        fullName: session.displayName,
        firstName: first,
        lastName: rest.join(' '),
        email: `${accountId}@demo.invalid`,
        role: session.role.toUpperCase(),
        portalRole: session.role,
        accountStatus: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: false,
        isDemoAccount: true,
        twoFactor: { enabled: false },
        createdAt: new Date(session.createdAt).toISOString(),
        lastLoginAt: new Date(session.lastActive).toISOString(),
      },
    };
  }

  workspace(session: DemoPortalSession) {
    const accountId = `${session.role}:demo-${session.accountKey}`;
    return {
      success: true as const,
      demo: true as const,
      role: session.role,
      accountId,
      profile: { ...session.profile },
      sections: session.sections.map((section) => ({ ...section, statuses: [...section.statuses], items: section.items.map((item) => ({ ...item })) })),
      records: session.sections.flatMap((section) => section.items.map((item) => ({ id: item.id, title: item.title, status: item.status }))),
      activity: [...session.activity].reverse().slice(0, MAX_ACTIVITY),
      notifications: session.notifications.map((n) => ({ ...n })),
      expiresAt: session.expiresAt,
    };
  }

  // ---- sandbox mutations --------------------------------------------------

  private log(session: DemoPortalSession, title: string) {
    session.activity.push({ id: `act-${session.accountKey.slice(0, 6)}-${randomBytes(4).toString('hex')}`, title, at: new Date(this.clock()).toISOString() });
    if (session.activity.length > MAX_ACTIVITY) session.activity.splice(0, session.activity.length - MAX_ACTIVITY);
  }

  addItem(session: DemoPortalSession, sectionId: unknown, title: unknown, detail: unknown, status?: unknown): DemoMutationResult {
    const section = session.sections.find((s) => s.id === sectionId);
    if (!section) return { ok: false, code: 'NOT_FOUND', error: 'Unknown section.' };
    const cleanTitle = cleanDemoText(title, DEMO_MAX_TITLE_LENGTH);
    if (!cleanTitle) return { ok: false, code: 'INVALID', error: `Enter a name for the ${section.itemLabel}.` };
    if (section.items.length >= DEMO_MAX_ITEMS_PER_SECTION) {
      return { ok: false, code: 'LIMIT_REACHED', error: `This sandbox section is limited to ${DEMO_MAX_ITEMS_PER_SECTION} items.` };
    }
    const requested = typeof status === 'string' ? section.statuses.find((s) => s === status) : undefined;
    const item: DemoItem = {
      id: `${section.id}-${session.accountKey.slice(0, 6)}-${randomBytes(4).toString('hex')}`,
      title: cleanTitle,
      detail: cleanDemoText(detail, DEMO_MAX_DETAIL_LENGTH) || 'Added in the demo sandbox.',
      status: requested || section.statuses[0],
      updatedAt: new Date(this.clock()).toISOString(),
    };
    section.items.unshift(item);
    this.log(session, `Added ${section.itemLabel}: ${item.title}`);
    return { ok: true, value: item };
  }

  private locate(session: DemoPortalSession, itemId: unknown) {
    for (const section of session.sections) {
      const index = section.items.findIndex((item) => item.id === itemId);
      if (index >= 0) return { section, index, item: section.items[index] };
    }
    return null;
  }

  setStatus(session: DemoPortalSession, itemId: unknown, status: unknown): DemoMutationResult {
    const found = this.locate(session, itemId);
    if (!found) return { ok: false, code: 'NOT_FOUND', error: 'That item is not part of your sandbox.' };
    const next = typeof status === 'string' ? found.section.statuses.find((s) => s === status) : undefined;
    if (!next) return { ok: false, code: 'INVALID', error: 'Choose one of the available statuses.' };
    found.item.status = next;
    found.item.updatedAt = new Date(this.clock()).toISOString();
    this.log(session, `Set "${found.item.title}" to ${next}`);
    return { ok: true, value: found.item };
  }

  removeItem(session: DemoPortalSession, itemId: unknown): DemoMutationResult {
    const found = this.locate(session, itemId);
    if (!found) return { ok: false, code: 'NOT_FOUND', error: 'That item is not part of your sandbox.' };
    found.section.items.splice(found.index, 1);
    this.log(session, `Removed ${found.section.itemLabel}: ${found.item.title}`);
    return { ok: true, value: found.item };
  }
}

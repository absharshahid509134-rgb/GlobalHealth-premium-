# Demo accounts — all five portals

One sample account per platform portal, seeded on startup and signed in through
the **normal** password verifier. Nothing here bypasses authentication: the
accounts are ordinary password accounts with sample data attached.

Enabled by `GH_DEMO_MODE=true` in `.env` (git-ignored). Demo mode is **ignored
when `NODE_ENV=production`**, so these credentials can never exist on a live
deployment.

## Credentials

| Portal | Sign-in email | Password | Lands on |
| --- | --- | --- | --- |
| **User** (patient) | `demo.user@example.test` | `DemoPatient-2026!` | Dashboard |
| **Doctor** | `demo.doctor@example.test` | `DemoDoctor-2026!` | Doctor Portal |
| **Hospital** | `demo.hospital@example.test` | `DemoHospital-2026!` | Hospital Portal |
| **Pharmacy** | `demo.pharmacy@example.test` | `DemoPharmacy-2026!` | Pharmacy Portal |
| **News Management** | `demo.news@example.test` | `DemoNews-2026!` | News Management |

### Signing in

1. Open the app and go to **Sign in**.
2. Pick the portal from the role selector (User / Doctor / Hospital / Pharmacy / News Management).
3. Click **Fill Demo Account** — this fills the form only; it never creates a session.
4. Press **Sign in**.

Step 3 is optional. Typing the email and password from the table above by hand
works identically.

**News Management is the one exception:** it requires a second step. After the
password the page shows a 6-digit MFA code on screen (development builds only) —
type that code to finish. This is the real MFA gate, not a demo shortcut.

## What sample data each account sees

| Portal | Seeded sample data |
| --- | --- |
| User | EHR summary (blood group, sample allergies), one upcoming appointment, one unread notification, a saved hospital |
| Doctor | One pending patient access request and a matching notification |
| Hospital | Admin account bound to the seeded Delhi facility plus one audit activity entry |
| Pharmacy | Partner account over the verified Apex partner with sample inventory |
| News Management | Administrator with full news permissions, MFA enabled |

## Notes

- **Passwords are per-portal, not universal.** One account cannot sign in to
  another portal — the role selector only chooses which credential realm is
  contacted, and each realm's own verifier issues its own session. A doctor
  token is refused (403) by the patient, hospital, pharmacy and news
  workspaces. This is deliberate and covered by the acceptance suite.
- **Sessions last longer in demo mode** (365-day idle window instead of the
  default 7 days for users / 12 hours for professionals) so a demo survives a restart.
- **Seeding is idempotent.** Restarting never duplicates an account or its
  sample records, and never resets a password.
- **Turning demo mode off** (`GH_DEMO_MODE=` empty or removed) prunes the demo
  accounts and their sessions on the next startup. Real registrations are
  untouched.
- **Override the passwords** for any shared non-production environment with
  `GH_DEMO_PASSWORD_USER`, `_DOCTOR`, `_HOSPITAL`, `_PHARMACY`, `_NEWS`
  (minimum 8 characters, enforced at startup).

## Verifying it works

```bash
npm run accept:demo     # 11 checks: sign-in, isolation, sample data, restart, pruning
```

The suite proves every role signs in through real HTTP, that a wrong password is
rejected with no token, that cross-portal access is denied, that sessions
survive a restart, and that production never provisions a demo account.

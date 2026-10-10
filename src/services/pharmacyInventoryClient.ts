// ---------------------------------------------------------------------------
// Pharmacy Marketplace Inventory client.
//
// The SERVER inventory engine is the single source of truth. Customers always
// read fresh availability from it; partner workspaces write to it with an
// authorized per-pharmacy token (a token maps to exactly one pharmacy, so one
// partner can never modify another's inventory).
// ---------------------------------------------------------------------------

import { PartnerAvailabilityOption } from '../types/pharmacyMarketplace';
import { getStoredToken } from './authClient';

export type MarketplaceStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'NOT_LISTED';

export interface MarketplaceInventoryRecord {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyVerificationStatus: string;
  medicineId: string;
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

export interface InventoryAuditRecord {
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
  changeSource: string;
  result: 'SUCCESS' | 'REJECTED';
  reason?: string;
}

export interface AvailabilityResult {
  ok: boolean;
  /** True when the server positively verified current stock; false = unsafe to sell. */
  availabilityVerified: boolean;
  options: PartnerAvailabilityOption[];
  asOf?: string;
  error?: string;
}

export interface ValidationItem {
  productId: string;
  pharmacyId: string;
  quantity: number;
}

export interface ValidationResultItem {
  productId: string;
  pharmacyId: string;
  eligible: boolean;
  reason?: string;
  medicineName?: string;
  availableQuantity?: number;
  stockQuantity?: number;
  stockStatus?: string;
}

/**
 * Fresh availability lookup for one EXACT medicine variant. Never cached —
 * each call hits the live inventory engine.
 */
export async function fetchProductAvailability(productId: string): Promise<AvailabilityResult> {
  try {
    const res = await fetch(`/api/pharmacy-marketplace/availability/${encodeURIComponent(productId)}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        ok: false,
        availabilityVerified: false,
        options: [],
        error: data?.error || 'Availability temporarily unavailable. Please try again.'
      };
    }
    return { ok: true, availabilityVerified: true, options: data.options || [], asOf: data.asOf };
  } catch {
    return { ok: false, availabilityVerified: false, options: [], error: 'Availability temporarily unavailable. Please try again.' };
  }
}

/**
 * Final stock validation used before adding to cart and before placing an
 * order. Fails SAFE: any transport/server error returns eligible=false so an
 * unverified pharmacy is never sold through.
 */
export async function validateInventoryItems(items: ValidationItem[]): Promise<
  { ok: true; availabilityVerified: true; results: ValidationResultItem[] } | { ok: false; availabilityVerified: false; error: string }
> {
  try {
    const res = await fetch('/api/pharmacy-marketplace/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || data?.availabilityVerified !== true) {
      return { ok: false, availabilityVerified: false, error: data?.error || 'Availability temporarily unavailable. Please try again.' };
    }
    return { ok: true, availabilityVerified: true, results: data.results || [] };
  } catch {
    return { ok: false, availabilityVerified: false, error: 'Availability temporarily unavailable. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Partner-workspace side. Portal access is authorized by a SERVER-ISSUED
// partner session (see /api/pharmacy-partner/auth) — no static secrets exist
// in this bundle, and a session maps to exactly one partner pharmacy, enforced
// server-side on every inventory read/write.
// ---------------------------------------------------------------------------
const PARTNER_SESSION_KEY = 'pharmacy_partner_session_token_v1';

export function getPartnerSessionToken(): string | null {
  try {
    return localStorage.getItem(PARTNER_SESSION_KEY);
  } catch {
    return null;
  }
}

export function storePartnerSession(token: string): void {
  try {
    localStorage.setItem(PARTNER_SESSION_KEY, token);
  } catch {}
}

export function clearPartnerSession(): void {
  try {
    localStorage.removeItem(PARTNER_SESSION_KEY);
  } catch {}
}

const partnerAuthHeaders = (): Record<string, string> => {
  const token = getPartnerSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface PartnerAccountView {
  username: string;
  partnerId: string;
  pharmacyName: string;
  contactName: string;
  licenseNumber: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED';
  sessionExpiresAt?: string;
}

/** Validated session bootstrap — returns the signed-in partner's identity
 *  (partnerId comes from the SERVER session, never from the client). */
export async function fetchPartnerMe(): Promise<{ ok: boolean; account?: PartnerAccountView; error?: string }> {
  try {
    const res = await fetch('/api/pharmacy-partner/auth/me', { headers: partnerAuthHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'Session expired.' };
    return { ok: true, account: data.account };
  } catch {
    return { ok: false, error: 'Partner service unreachable.' };
  }
}

export async function partnerLogin(
  identifier: string,
  password: string
): Promise<{ ok: boolean; account?: PartnerAccountView; error?: string; code?: string }> {
  try {
    const res = await fetch('/api/pharmacy-partner/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'Incorrect pharmacy partner credentials.', code: data?.code };
    storePartnerSession(data.token);
    return { ok: true, account: data.account };
  } catch {
    return { ok: false, error: 'The Pharmacy Partner sign-in service is temporarily unavailable. Please try again.' };
  }
}

export async function partnerLogout(): Promise<void> {
  const token = getPartnerSessionToken();
  if (token) {
    try {
      await fetch('/api/pharmacy-partner/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  }
  clearPartnerSession();
}

export async function partnerRegister(input: {
  pharmacyName: string;
  licenseNumber: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/pharmacy-partner/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'The registration could not be submitted.' };
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, error: 'The registration service is temporarily unavailable. Please try again.' };
  }
}

export async function partnerRequestReset(email: string): Promise<{ ok: boolean; message: string; demoToken?: string; error?: string }> {
  try {
    const res = await fetch('/api/pharmacy-partner/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return { ok: false, message: data?.error || 'The reset request failed.' };
    return { ok: true, message: data.message, demoToken: data.demoToken };
  } catch {
    return { ok: false, message: 'The reset service is temporarily unavailable. Please try again.' };
  }
}

export async function partnerCompleteReset(resetToken: string, newPassword: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/pharmacy-partner/auth/complete-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return { ok: false, error: data?.error || 'The password could not be reset.' };
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, error: 'The reset service is temporarily unavailable. Please try again.' };
  }
}

/**
 * Places a marketplace order ATOMICALLY on the server: final availability
 * check + stock decrement + server-recalculated totals in one synchronous
 * section (overselling impossible). Client totals are never trusted.
 */
export async function placeMarketplaceOrder(
  items: ValidationItem[],
  deliveryFee: number
): Promise<
  | { ok: true; orderId: string; pricing: { itemsSubtotal: number; deliveryFee: number; tax: number; grandTotal: number } }
  | { ok: false; code?: string; error?: string; medicineName?: string; availableQuantity?: number }
> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/pharmacy-marketplace/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, deliveryFee })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, code: data?.code, error: data?.error || 'The order could not be placed. Please try again.', medicineName: data?.medicineName, availableQuantity: data?.availableQuantity };
    }
    return { ok: true, orderId: data.orderId, pricing: data.order?.pricing };
  } catch {
    return { ok: false, error: 'The order could not be placed. Please check your connection and try again.' };
  }
}

export interface PartnerInventorySnapshot {
  ok: boolean;
  records: MarketplaceInventoryRecord[];
  asOf?: string;
  error?: string;
}

export async function fetchPartnerInventory(partnerId: string): Promise<PartnerInventorySnapshot> {
  try {
    const res = await fetch(`/api/pharmacy-partner/${encodeURIComponent(partnerId)}/marketplace-inventory`, {
      headers: partnerAuthHeaders()
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, records: [], error: data?.error || 'Inventory temporarily unavailable. Please try again.' };
    }
    return { ok: true, records: data.records || [], asOf: data.asOf };
  } catch {
    return { ok: false, records: [], error: 'Inventory temporarily unavailable. Please try again.' };
  }
}

export interface PartnerInventoryUpdatePayload {
  medicineId?: string;
  descriptor?: { name?: string; strength?: string; dosageForm?: string };
  stockQuantity: number;
  stockStatus?: MarketplaceStockStatus;
  updatedBy?: string;
  source?: 'PARTNER_WORKSPACE' | 'CATALOG_ADJUSTMENT';
}

export async function updatePartnerInventory(
  payload: PartnerInventoryUpdatePayload,
  partnerId: string
): Promise<{ ok: boolean; record?: MarketplaceInventoryRecord; customerImpact?: string; error?: string }> {
  try {
    const res = await fetch(`/api/pharmacy-partner/${encodeURIComponent(partnerId)}/marketplace-inventory/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...partnerAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.error || 'The inventory update could not be saved. Please try again.' };
    }
    return { ok: true, record: data.record, customerImpact: data.customerImpact };
  } catch {
    return { ok: false, error: 'The inventory update could not be saved. Please try again.' };
  }
}

export async function fetchPartnerInventoryAudit(
  partnerId: string
): Promise<{ ok: boolean; records: InventoryAuditRecord[]; error?: string }> {
  try {
    const res = await fetch(`/api/pharmacy-partner/${encodeURIComponent(partnerId)}/marketplace-inventory/audit`, {
      headers: partnerAuthHeaders()
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, records: [], error: data?.error || 'Audit trail temporarily unavailable.' };
    }
    return { ok: true, records: data.records || [] };
  } catch {
    return { ok: false, records: [], error: 'Audit trail temporarily unavailable.' };
  }
}

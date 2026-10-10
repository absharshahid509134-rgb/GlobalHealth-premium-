import { 
  PharmacyProfileDetails, 
  PharmacyBranchInfo, 
  PharmacyStaffMember, 
  PortalMedicine, 
  PortalOrderRecord, 
  PortalPrescriptionRecord, 
  RegulatoryDocument, 
  PortalNotificationItem, 
  SupportTicketItem, 
  AuditLogEntry, 
  SettlementLedgerItem,
  PharmacyStaffRole,
  PortalOrderStatus,
  PrescriptionReviewStatus,
  PharmacyFeeConfiguration
} from '../types/pharmacyPortal';
import { 
  DEFAULT_PHARMACY_PROFILE, 
  DEFAULT_BRANCHES, 
  DEFAULT_STAFF, 
  DEFAULT_PORTAL_MEDICINES, 
  DEFAULT_ORDERS, 
  DEFAULT_PRESCRIPTIONS, 
  DEFAULT_COMPLIANCE_DOCUMENTS, 
  DEFAULT_NOTIFICATIONS, 
  DEFAULT_SETTLEMENTS, 
  DEFAULT_SUPPORT_TICKETS, 
  DEFAULT_AUDIT_LOGS,
  DEFAULT_FEE_CONFIGURATION
} from '../data/pharmacyPortalData';
import { updatePartnerInventory, fetchPartnerMe } from './pharmacyInventoryClient';

const STORAGE_KEYS = {
  PROFILE: 'gh_pharmacy_portal_profile',
  BRANCHES: 'gh_pharmacy_portal_branches',
  STAFF: 'gh_pharmacy_portal_staff',
  MEDICINES: 'gh_pharmacy_portal_medicines',
  ORDERS: 'gh_pharmacy_portal_orders',
  PRESCRIPTIONS: 'gh_pharmacy_portal_prescriptions',
  DOCUMENTS: 'gh_pharmacy_portal_documents',
  NOTIFICATIONS: 'gh_pharmacy_portal_notifications',
  SETTLEMENTS: 'gh_pharmacy_portal_settlements',
  TICKETS: 'gh_pharmacy_portal_tickets',
  AUDIT_LOGS: 'gh_pharmacy_portal_audit_logs',
  CURRENT_STAFF_ID: 'gh_pharmacy_portal_current_staff_id',
  CURRENT_BRANCH_ID: 'gh_pharmacy_portal_current_branch_id',
  FEE_CONFIG: 'gh_pharmacy_portal_fee_config',
  IS_AUTHENTICATED: 'gh_pharmacy_portal_auth_state',
  APPLICATIONS: 'gh_pharmacy_portal_applications',
};

export interface PharmacyApplicationRecord {
  applicationId: string;
  legalEntityName: string;
  tradeName: string;
  pharmacyType: string;
  ownershipType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  drugLicenseNumber: string;
  pharmacistName: string;
  pharmacistRegNo: string;
  operatingHours: string;
  totalBranches: number;
  submittedAt: string;
  status: 'Application Submitted' | 'Under Review' | 'Documents Required' | 'Verification in Progress' | 'Approved' | 'Rejected';
  statusNotes: string;
  otpVerified: boolean;
}

export class PharmacyPortalService {
  private static getStored<T>(key: string, fallback: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed !== null && parsed !== undefined) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Failed to parse ${key} from storage:`, e);
    }
    return fallback;
  }

  private static setStored<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save ${key} to storage:`, e);
    }
  }

  // Profile
  static getProfile(): PharmacyProfileDetails {
    return this.getStored(STORAGE_KEYS.PROFILE, DEFAULT_PHARMACY_PROFILE);
  }

  static updateProfile(profile: Partial<PharmacyProfileDetails>): PharmacyProfileDetails {
    const current = this.getProfile();
    const updated = { ...current, ...profile };
    this.setStored(STORAGE_KEYS.PROFILE, updated);
    this.logAction('Profile Update', 'Updated pharmacy details and store policies', 'Staff');
    return updated;
  }

  // Configurable platform fee configuration
  static getFeeConfiguration(): PharmacyFeeConfiguration {
    return this.getStored(STORAGE_KEYS.FEE_CONFIG, DEFAULT_FEE_CONFIGURATION);
  }

  static updateFeeConfiguration(feeConfig: Partial<PharmacyFeeConfiguration>): PharmacyFeeConfiguration {
    const current = this.getFeeConfiguration();
    const updated = { ...current, ...feeConfig, updatedAt: new Date().toISOString() };
    this.setStored(STORAGE_KEYS.FEE_CONFIG, updated);
    this.logAction(
      'Fee Configuration Update',
      `Updated platform fees (${feeConfig.platformCommissionPercent ?? current.platformCommissionPercent}% commission, payment ${feeConfig.paymentProcessingPercent ?? current.paymentProcessingPercent}%).`,
      'Pricing'
    );
    return updated;
  }

  // Branches
  static getBranches(): PharmacyBranchInfo[] {
    return this.getStored(STORAGE_KEYS.BRANCHES, DEFAULT_BRANCHES);
  }

  static addBranch(branch: Omit<PharmacyBranchInfo, 'id' | 'activeOrdersCount' | 'totalMedicinesCount'>): PharmacyBranchInfo {
    const current = this.getBranches();
    const newBranch: PharmacyBranchInfo = {
      ...branch,
      id: `branch-${Date.now()}`,
      activeOrdersCount: 0,
      totalMedicinesCount: 0,
    };
    const updated = [newBranch, ...current];
    this.setStored(STORAGE_KEYS.BRANCHES, updated);
    this.logAction('Branch Added', `Created new branch depot: ${branch.name}`, 'Branches');
    return newBranch;
  }

  // Staff
  static getStaff(): PharmacyStaffMember[] {
    return this.getStored(STORAGE_KEYS.STAFF, DEFAULT_STAFF);
  }

  static addStaff(staff: Omit<PharmacyStaffMember, 'id' | 'lastLogin'>): PharmacyStaffMember {
    const current = this.getStaff();
    const newMember: PharmacyStaffMember = {
      ...staff,
      id: `staff-${Date.now()}`,
      lastLogin: 'Never logged in'
    };
    const updated = [newMember, ...current];
    this.setStored(STORAGE_KEYS.STAFF, updated);
    this.logAction('Staff Onboarded', `Added staff member ${staff.name} (${staff.role})`, 'Staff');
    return newMember;
  }

  // Medicines
  static getMedicines(): PortalMedicine[] {
    return this.getStored(STORAGE_KEYS.MEDICINES, DEFAULT_PORTAL_MEDICINES);
  }

  static addMedicine(med: Omit<PortalMedicine, 'id' | 'availableStock' | 'reservedStock' | 'damagedStock' | 'expiredStock' | 'status'>): PortalMedicine {
    const current = this.getMedicines();
    const newMed: PortalMedicine = {
      ...med,
      id: `med-portal-${Date.now()}`,
      availableStock: med.stockQuantity,
      reservedStock: 0,
      damagedStock: 0,
      expiredStock: 0,
      status: med.stockQuantity > med.minStockLevel ? 'In Stock' : med.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock'
    };
    const updated = [newMed, ...current];
    this.setStored(STORAGE_KEYS.MEDICINES, updated);
    this.logAction('Medicine Added', `Added ${med.name} (${med.strength}) to catalog`, 'Catalog');
    return newMed;
  }

  static updateMedicine(id: string, updates: Partial<PortalMedicine>): PortalMedicine | null {
    const current = this.getMedicines();
    const index = current.findIndex(m => m.id === id);
    if (index === -1) return null;

    const existing = current[index];
    const updatedMed = { ...existing, ...updates };
    
    // Auto-calculate availability
    if (updates.stockQuantity !== undefined) {
      updatedMed.availableStock = Math.max(0, updatedMed.stockQuantity - (updatedMed.reservedStock || 0));
      updatedMed.status = updatedMed.stockQuantity > updatedMed.minStockLevel ? 'In Stock' : updatedMed.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock';
    }

    current[index] = updatedMed;

    // Best-effort sync: internal stock changes are also pushed to the central
    // marketplace inventory engine (the customer-facing source of truth). The
    // server matches the EXACT medicine variant by name + strength + form, so
    // unrelated variants are never touched.
    if (updates.stockQuantity !== undefined) {
      // Push to the central marketplace engine using the SIGNED-IN partner's
      // session; the partnerId comes from the server session, never client
      // state. Skipped silently when no partner session exists.
      void (async () => {
        const me = await fetchPartnerMe();
        if (me.ok && me.account) {
          await updatePartnerInventory(
            {
              descriptor: { name: updatedMed.name, strength: updatedMed.strength, dosageForm: updatedMed.dosageForm },
              stockQuantity: Math.max(0, updatedMed.availableStock || 0),
              updatedBy: 'Pharmacy Catalog Manager',
              source: 'CATALOG_ADJUSTMENT'
            },
            me.account.partnerId
          ).catch(() => undefined);
        }
      })();
    }
    this.setStored(STORAGE_KEYS.MEDICINES, current);
    this.logAction('Medicine Updated', `Updated catalog parameters for ${updatedMed.name}`, 'Catalog');
    return updatedMed;
  }

  static adjustStock(id: string, newQuantity: number, reason: string): PortalMedicine | null {
    const current = this.getMedicines();
    const med = current.find(m => m.id === id);
    if (!med) return null;

    const diff = newQuantity - med.stockQuantity;
    return this.updateMedicine(id, {
      stockQuantity: newQuantity,
      availableStock: Math.max(0, newQuantity - med.reservedStock)
    });
  }

  // Orders
  static getOrders(): PortalOrderRecord[] {
    return this.getStored(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
  }

  static updateOrderStatus(orderId: string, status: PortalOrderStatus, assignedStaff?: string): PortalOrderRecord | null {
    const current = this.getOrders();
    const index = current.findIndex(o => o.id === orderId);
    if (index === -1) return null;

    const order = current[index];
    order.orderStatus = status;
    if (assignedStaff) {
      order.assignedStaffName = assignedStaff;
    }
    if (status === 'Delivered') {
      order.dispensedAt = 'Just now';
      order.paymentStatus = 'Paid Online';
    }

    current[index] = order;
    this.setStored(STORAGE_KEYS.ORDERS, current);
    this.logAction('Order Status Updated', `Order ${order.orderNumber} changed to ${status}`, 'Orders');
    return order;
  }

  // Prescriptions
  static getPrescriptions(): PortalPrescriptionRecord[] {
    return this.getStored(STORAGE_KEYS.PRESCRIPTIONS, DEFAULT_PRESCRIPTIONS);
  }

  static updatePrescriptionStatus(
    rxId: string, 
    status: PrescriptionReviewStatus, 
    pharmacistName: string, 
    notes?: string
  ): PortalPrescriptionRecord | null {
    const current = this.getPrescriptions();
    const index = current.findIndex(p => p.id === rxId);
    if (index === -1) return null;

    const rx = current[index];
    rx.status = status;
    rx.reviewedByPharmacist = pharmacistName;
    rx.reviewedAt = 'Just now';
    if (notes) rx.clarificationNotes = notes;

    current[index] = rx;
    this.setStored(STORAGE_KEYS.PRESCRIPTIONS, current);

    // Sync associated order status if approved
    if (rx.orderId) {
      if (status === 'Approved') {
        this.updateOrderStatus(rx.orderId, 'Confirmed', pharmacistName);
      } else if (status === 'Clarification Required') {
        this.updateOrderStatus(rx.orderId, 'Prescription Review', pharmacistName);
      } else if (status === 'Declined') {
        this.updateOrderStatus(rx.orderId, 'Rejected', pharmacistName);
      }
    }

    this.logAction('Prescription Reviewed', `Prescription ${rx.id} reviewed (${status}) by ${pharmacistName}`, 'Prescriptions');
    return rx;
  }

  // Documents
  static getDocuments(): RegulatoryDocument[] {
    return this.getStored(STORAGE_KEYS.DOCUMENTS, DEFAULT_COMPLIANCE_DOCUMENTS);
  }

  static addDocument(doc: Omit<RegulatoryDocument, 'id' | 'uploadedAt'>): RegulatoryDocument {
    const current = this.getDocuments();
    const newDoc: RegulatoryDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    const updated = [newDoc, ...current];
    this.setStored(STORAGE_KEYS.DOCUMENTS, updated);
    this.logAction('Document Uploaded', `Uploaded regulatory file ${doc.type} for verification`, 'Compliance');
    return newDoc;
  }

  // Notifications
  static getNotifications(): PortalNotificationItem[] {
    return this.getStored(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  }

  static markNotificationRead(id: string): void {
    const current = this.getNotifications();
    const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.setStored(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  // Settlements
  static getSettlements(): SettlementLedgerItem[] {
    return this.getStored(STORAGE_KEYS.SETTLEMENTS, DEFAULT_SETTLEMENTS);
  }

  // Support Tickets
  static getTickets(): SupportTicketItem[] {
    return this.getStored(STORAGE_KEYS.TICKETS, DEFAULT_SUPPORT_TICKETS);
  }

  static createTicket(subject: string, category: any, priority: any, message: string): SupportTicketItem {
    const current = this.getTickets();
    const newTicket: SupportTicketItem = {
      id: `tick-${Date.now()}`,
      ticketNumber: `TKT-GH-${Math.floor(10000 + Math.random() * 90000)}`,
      subject,
      category,
      priority,
      status: 'Open',
      createdAt: 'Just now',
      lastUpdated: 'Just now',
      messages: [
        {
          sender: 'Pharmacy',
          senderName: 'Dr. S. K. Ramanathan (Owner)',
          timestamp: 'Just now',
          content: message
        }
      ]
    };
    const updated = [newTicket, ...current];
    this.setStored(STORAGE_KEYS.TICKETS, updated);
    return newTicket;
  }

  // Applications
  static getApplications(): PharmacyApplicationRecord[] {
    return this.getStored<PharmacyApplicationRecord[]>(STORAGE_KEYS.APPLICATIONS, []);
  }

  static submitApplication(app: Omit<PharmacyApplicationRecord, 'applicationId' | 'submittedAt' | 'status' | 'statusNotes' | 'otpVerified'>): PharmacyApplicationRecord {
    const current = this.getApplications();
    const newApp: PharmacyApplicationRecord = {
      ...app,
      applicationId: `APP-GH-${Math.floor(10000 + Math.random() * 90000)}`,
      submittedAt: 'Just now',
      status: 'Application Submitted',
      statusNotes: 'Application registered. Background credential audit initiated.',
      otpVerified: true
    };
    const updated = [newApp, ...current];
    this.setStored(STORAGE_KEYS.APPLICATIONS, updated);
    return newApp;
  }

  // Audit Logs
  static getAuditLogs(): AuditLogEntry[] {
    return this.getStored(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
  }

  static logAction(action: string, details: string, module: any = 'Auth', result: 'Success' | 'Warning' | 'Blocked' = 'Success'): void {
    const current = this.getAuditLogs();
    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action,
      staffName: 'Dr. S. K. Ramanathan, R.Ph',
      staffRole: 'Pharmacy Owner',
      module,
      details,
      ipAddress: '14.139.60.18',
      deviceInfo: 'Chrome 138 / macOS Portal Session',
      result
    };
    this.setStored(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...current.slice(0, 49)]);
  }
}

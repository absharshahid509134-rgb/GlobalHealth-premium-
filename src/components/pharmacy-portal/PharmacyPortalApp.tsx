import React, { useState, useEffect } from 'react';
import { 
  PharmacyPortalNavTab, 
  PharmacyProfileDetails, 
  PharmacyBranchInfo, 
  PharmacyStaffMember, 
  PortalMedicine, 
  PortalOrderRecord, 
  PortalPrescriptionRecord, 
  RegulatoryDocument, 
  SettlementLedgerItem, 
  SupportTicketItem, 
  AuditLogEntry 
} from '../../types/pharmacyPortal';
import { PharmacyPortalService } from '../../services/pharmacyPortalStore';

// Subcomponents
import { PublicPartnerLandingPage } from './PublicPartnerLandingPage';
import { PharmacyApplicationWizard } from './PharmacyApplicationWizard';
import { ApplicationStatusTracker } from './ApplicationStatusTracker';
import { PharmacyPortalHeader } from './PharmacyPortalHeader';
import { PharmacyPortalSidebar } from './PharmacyPortalSidebar';
import { PortalCredentialForm } from '../portals/PortalCredentialForm';
import { PharmacyPartnerSignupScreen, PharmacyPartnerForgotScreen } from './PharmacyPartnerAccountScreens';
import {
  partnerLogin,
  partnerLogout,
  fetchPartnerMe,
  getPartnerSessionToken,
  clearPartnerSession
} from '../../services/pharmacyInventoryClient';
import { ShoppingBag } from 'lucide-react';
import { PortalRoleProvider, PermissionGate, AccessDenied } from '../portal/PermissionGate';
import { Permission, hasPermission } from '../../core/portalRoles';
import { pharmacyPortalRole } from '../../core/pharmacyAccess';

// Tab Components
import { DashboardHomeTab } from './DashboardHomeTab';
import { OrdersManagementTab } from './OrdersManagementTab';
import { PrescriptionReviewTab } from './PrescriptionReviewTab';
import { InventoryManagementTab } from './InventoryManagementTab';
import { BatchExpiryTab } from './BatchExpiryTab';
import { MedicineCatalogTab } from './MedicineCatalogTab';
import { PricingManagementTab } from './PricingManagementTab';
import { BranchesManagementTab } from './BranchesManagementTab';
import { StaffManagementTab } from './StaffManagementTab';
import { DeliveryPickupTab } from './DeliveryPickupTab';
import { PaymentsFinanceTab } from './PaymentsFinanceTab';
import { AnalyticsReportsTab } from './AnalyticsReportsTab';
import { ComplianceDocumentsTab } from './ComplianceDocumentsTab';
import { SupportTicketsTab } from './SupportTicketsTab';
import { AuditLogsTab } from './AuditLogsTab';
import { PharmacyProfileTab } from './PharmacyProfileTab';
import { MarketplaceInventorySyncTab } from './MarketplaceInventorySyncTab';

type PortalScreen = 'landing' | 'apply' | 'track' | 'login' | 'dashboard';

const TAB_PERMISSION: Record<PharmacyPortalNavTab, Permission> = {
  dashboard: 'pharmacy.dashboard.view',
  orders: 'pharmacy.orders.manage',
  prescriptions: 'pharmacy.prescriptions.manage',
  inventory: 'pharmacy.inventory.manage',
  'marketplace-sync': 'pharmacy.sync.manage',
  batches: 'pharmacy.batch.manage',
  catalog: 'pharmacy.catalog.manage',
  pricing: 'pharmacy.pricing.manage',
  branches: 'pharmacy.branches.manage',
  staff: 'pharmacy.staff.manage',
  delivery: 'pharmacy.delivery.manage',
  payments: 'pharmacy.finance.view',
  analytics: 'pharmacy.analytics.view',
  compliance: 'pharmacy.compliance.manage',
  support: 'pharmacy.notifications.manage',
  'audit-logs': 'pharmacy.audit.read',
  profile: 'pharmacy.profile.view',
};

// Pre-login account self-service screens for partner accounts.
type PartnerAccountScreen = 'signup' | 'forgot';

interface PharmacyPortalAppProps {
  onReturnToMainApp: () => void;
  initialScreen?: PortalScreen;
}

export const PharmacyPortalApp: React.FC<PharmacyPortalAppProps> = ({ 
  onReturnToMainApp,
  initialScreen = 'landing'
}) => {
  const [screen, setScreen] = useState<PortalScreen>(initialScreen);

  // Server-verified partner session state (restored on mount; the partner
  // identity — partnerId — always comes from the server session).
  const [sessionRestoring, setSessionRestoring] = useState<boolean>(() => !!getPartnerSessionToken());
  const [sessionExpired, setSessionExpired] = useState(false);

  // Sign-up / forgot-password self-service for pharmacy partner accounts.
  const [accountScreen, setAccountScreen] = useState<PartnerAccountScreen | null>(null);

  useEffect(() => {
    if (initialScreen) {
      setScreen(initialScreen);
    }
  }, [initialScreen]);
  const [activeTab, setActiveTab] = useState<PharmacyPortalNavTab>('dashboard');
  // Keep the selected branch in the shell so every branch-aware action starts
  // from the same operational context instead of silently reverting to the
  // first branch after a header interaction.
  const [currentBranchId, setCurrentBranchId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<PharmacyStaffMember | null>(null);

  // Data state
  const [profile, setProfile] = useState<PharmacyProfileDetails>(PharmacyPortalService.getProfile());
  const [branches, setBranches] = useState<PharmacyBranchInfo[]>(PharmacyPortalService.getBranches());
  const [staff, setStaff] = useState<PharmacyStaffMember[]>(PharmacyPortalService.getStaff());
  const [medicines, setMedicines] = useState<PortalMedicine[]>(PharmacyPortalService.getMedicines());
  const [orders, setOrders] = useState<PortalOrderRecord[]>(PharmacyPortalService.getOrders());
  const [prescriptions, setPrescriptions] = useState<PortalPrescriptionRecord[]>(PharmacyPortalService.getPrescriptions());
  const [documents, setDocuments] = useState<RegulatoryDocument[]>(PharmacyPortalService.getDocuments());
  const [settlements, setSettlements] = useState<SettlementLedgerItem[]>(PharmacyPortalService.getSettlements());
  const [tickets, setTickets] = useState<SupportTicketItem[]>(PharmacyPortalService.getTickets());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(PharmacyPortalService.getAuditLogs());

  // Deep link order / rx selection
  const [selectedOrderProp, setSelectedOrderProp] = useState<PortalOrderRecord | null>(null);
  const [selectedRxProp, setSelectedRxProp] = useState<PortalPrescriptionRecord | null>(null);

  // Bootstrap: validate any persisted partner session against the server and
  // restore the signed-in staff workspace (or clear state, fail-safe).
  useEffect(() => {
    const token = getPartnerSessionToken();
    if (!token) {
      setSessionRestoring(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const me = await fetchPartnerMe();
      if (cancelled) return;
      if (me.ok && me.account) {
        const staffList = PharmacyPortalService.getStaff();
        const staffUser =
          staffList.find((x) => x.email.toLowerCase() === me.account!.username.toLowerCase()) || staffList[0] || null;
        if (staffUser) {
          setCurrentUser(staffUser);
          setScreen('dashboard');
          refreshData();
        }
      } else {
        clearPartnerSession();
        setSessionExpired(true);
      }
      setSessionRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = () => {
    setProfile(PharmacyPortalService.getProfile());
    setBranches(PharmacyPortalService.getBranches());
    setStaff(PharmacyPortalService.getStaff());
    setMedicines(PharmacyPortalService.getMedicines());
    setOrders(PharmacyPortalService.getOrders());
    setPrescriptions(PharmacyPortalService.getPrescriptions());
    setDocuments(PharmacyPortalService.getDocuments());
    setSettlements(PharmacyPortalService.getSettlements());
    setTickets(PharmacyPortalService.getTickets());
    setAuditLogs(PharmacyPortalService.getAuditLogs());
  };

  const handleLoginSuccess = (user: PharmacyStaffMember) => {
    setCurrentUser(user);
    setScreen('dashboard');
    refreshData();
  };

  const handleLogout = () => {
    void partnerLogout();
    if (currentUser) {
      PharmacyPortalService.logAction(
        'Staff Logged Out',
        `Staff session terminated for ${currentUser.name} (${currentUser.role}).`,
        'Auth'
      );
    }
    setCurrentUser(null);
    setScreen('landing');
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'new-order') {
      setActiveTab('orders');
    } else if (actionId === 'review-rx') {
      setActiveTab('prescriptions');
    } else if (actionId === 'add-medicine') {
      setActiveTab('catalog');
    } else if (actionId === 'adjust-stock') {
      setActiveTab('inventory');
    }
  };

  const handleSelectOrder = (order: PortalOrderRecord) => {
    setSelectedOrderProp(order);
    setActiveTab('orders');
  };

  const handleSelectRx = (rx: PortalPrescriptionRecord) => {
    setSelectedRxProp(rx);
    setActiveTab('prescriptions');
  };

  const [trackedAppId, setTrackedAppId] = useState<string>('APP-GH-99214');

  // 1. Landing Screen
  if (screen === 'landing') {
    return (
      <PublicPartnerLandingPage
        onApplyClick={() => setScreen('apply')}
        onTrackClick={() => setScreen('track')}
        onLoginClick={() => setScreen('login')}
        onReturnToMainApp={onReturnToMainApp}
      />
    );
  }

  // 2. Application Wizard Screen
  if (screen === 'apply') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
        <PharmacyApplicationWizard
          onBackToLanding={() => setScreen('landing')}
          onApplicationSubmitted={(appId) => {
            if (appId) setTrackedAppId(appId);
            setScreen('track');
          }}
          onCompleted={(appId) => {
            if (appId) setTrackedAppId(appId);
            setScreen('track');
          }}
        />
      </div>
    );
  }

  // 3. Application Tracker Screen
  if (screen === 'track') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
        <ApplicationStatusTracker
          initialAppId={trackedAppId}
          onBackToLanding={() => setScreen('landing')}
          onOpenLogin={() => setScreen('login')}
          onGoToLogin={() => setScreen('login')}
        />
      </div>
    );
  }

  // 4. Login Screen — credentials are validated before the partner workspace opens
  if (screen === 'login' || (screen === 'dashboard' && !currentUser)) {
    // Restoring a persisted partner session — never flash the form or
    // private data before the server check completes.
    if (sessionRestoring) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
          <p className="text-xs font-semibold text-slate-400">Restoring your secure pharmacy partner session…</p>
        </div>
      );
    }

    // 4a. Account self-service screens (create account / forgot password)
    if (accountScreen === 'signup') {
      return (
        <PharmacyPartnerSignupScreen
          onBack={() => setAccountScreen(null)}
          onDone={() => setAccountScreen(null)}
        />
      );
    }
    if (accountScreen === 'forgot') {
      return <PharmacyPartnerForgotScreen onBack={() => setAccountScreen(null)} />;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-4">
        {sessionExpired && (
          <div
            role="alert"
            className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold leading-relaxed">Your session has expired. Please sign in again.</span>
              <button
                type="button"
                onClick={() => setSessionExpired(false)}
                aria-label="Dismiss"
                className="shrink-0 rounded-lg px-2 py-0.5 font-bold hover:bg-amber-500/10 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}
        <PortalCredentialForm
          title="Pharmacy Porter — Partner Sign-In"
          subtitle="Verified pharmacy partners: prescriptions, stock, expiry, settlements & multi-branch orders."
          icon={<ShoppingBag className="h-7 w-7" />}
          identifierLabel="Registered staff email"
          identifierPlaceholder="e.g. dr.ramanathan@apexhealth.org"
          accent={{
            iconWrap: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
            button: 'bg-teal-600 hover:bg-teal-700 text-white',
            chip: 'border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100',
          }}
          onValidate={async (identifier, password) => {
            // Credentials are verified by the BACKEND only — the server issues
            // a partner session bound to exactly one verified pharmacy.
            const result = await partnerLogin(identifier, password);
            if (!result.ok || !result.account) {
              return { success: false, error: result.error || 'Incorrect pharmacy partner credentials.' };
            }
            // Map the verified partner identity onto the workspace staff
            // profile (created on first sign-in for newly verified partners).
            const email = result.account.username.toLowerCase();
            let matched = PharmacyPortalService.getStaff().find((s) => s.email.toLowerCase() === email);
            if (!matched) {
              const branches = PharmacyPortalService.getBranches();
              const homeBranch = branches[0];
              matched = PharmacyPortalService.addStaff({
                name: result.account.contactName || result.account.pharmacyName,
                role: 'Pharmacy Owner',
                email,
                phone: '',
                licenseNumber: result.account.licenseNumber,
                status: 'Active',
                assignedBranchId: homeBranch?.id || 'branch-1',
                assignedBranchName: homeBranch?.name || 'Primary Branch',
                permissions: {
                  canReviewPrescriptions: true,
                  canDispenseMedicines: true,
                  canManageInventory: true,
                  canModifyPrices: true,
                  canManageStaff: true,
                  canViewFinancials: true,
                  canManageBranches: true
                }
              } as any);
            }
            handleLoginSuccess(matched);
            return { success: true };
          }}
          onSuccess={() => {}}
          onBack={onReturnToMainApp}
          onForgotPassword={() => setAccountScreen('forgot')}
          onCreateAccount={() => setAccountScreen('signup')}
          createAccountLabel="Create partner account (sign up)"
        />
      </div>
    );
  }

  // 5. Authenticated Dashboard Screen
  const portalRole = pharmacyPortalRole(currentUser?.role || staff[0]?.role);
  const allowedTabs = (Object.keys(TAB_PERMISSION) as PharmacyPortalNavTab[]).filter((tab) => hasPermission(portalRole, TAB_PERMISSION[tab]));

  return (
    <PortalRoleProvider role={portalRole}>
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Top Header */}
      <PharmacyPortalHeader
        profile={profile}
        branches={branches}
        currentBranchId={currentBranchId || branches[0]?.id || 'branch-1'}
        onBranchChange={setCurrentBranchId}
        currentUser={currentUser || staff[0]}
        currentStaff={currentUser || staff[0]}
        onNavigateTab={(tab) => setActiveTab(tab as any)}
        pendingRxCount={prescriptions.filter(p => p.status === 'Awaiting Review').length}
        activeOrdersCount={orders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Rejected').length}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onLogout={handleLogout}
        onReturnToMainApp={onReturnToMainApp}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop / Mobile Sidebar */}
        <div className={`${isMobileSidebarOpen ? 'block fixed inset-0 z-40 bg-slate-950/80' : 'hidden'} md:block md:static`}>
          <div className="h-full">
            <PharmacyPortalSidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              pendingOrdersCount={orders.filter(o => o.orderStatus === 'New').length}
              newOrdersCount={orders.filter(o => o.orderStatus === 'New').length}
              pendingRxCount={prescriptions.filter(p => p.status === 'Awaiting Review').length}
              lowStockCount={medicines.filter(m => m.status === 'Low Stock').length}
              allowedTabs={allowedTabs}
            />
          </div>
        </div>

        {/* Main Work Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <PermissionGate
            permission={TAB_PERMISSION[activeTab]}
            fallback={<AccessDenied title="Pharmacy Portal restricted" message={`Your role (${currentUser?.role || staff[0]?.role}) does not permit access to this workspace. Contact your pharmacy owner or GlobalHealth support.`} />}
          >
          {activeTab === 'dashboard' && (
            <DashboardHomeTab
              orders={orders}
              prescriptions={prescriptions}
              medicines={medicines}
              branches={branches}
              profile={profile}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onQuickAction={handleQuickAction}
              onSelectOrder={handleSelectOrder}
              onSelectRx={handleSelectRx}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManagementTab
              orders={orders}
              staff={staff}
              onOrderUpdated={refreshData}
              selectedOrderProp={selectedOrderProp}
            />
          )}

          {activeTab === 'prescriptions' && (
            <PrescriptionReviewTab
              prescriptions={prescriptions}
              onPrescriptionUpdated={refreshData}
              selectedPrescriptionProp={selectedRxProp}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManagementTab
              medicines={medicines}
              onMedicinesUpdated={refreshData}
            />
          )}

          {activeTab === 'marketplace-sync' && (
            <MarketplaceInventorySyncTab currentUser={currentUser || staff[0]} />
          )}

          {activeTab === 'batches' && (
            <BatchExpiryTab
              medicines={medicines}
              onMedicinesUpdated={refreshData}
            />
          )}

          {(activeTab === 'catalog' || activeTab === ('medicines' as any)) && (
            <MedicineCatalogTab
              medicines={medicines}
              onMedicinesUpdated={refreshData}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingManagementTab
              medicines={medicines}
              onMedicinesUpdated={refreshData}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesManagementTab
              branches={branches}
              onBranchesUpdated={refreshData}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManagementTab
              staff={staff}
              branches={branches}
              onStaffUpdated={refreshData}
            />
          )}

          {(activeTab === 'delivery' || activeTab === ('deliveries' as any)) && (
            <DeliveryPickupTab
              orders={orders}
              onOrderUpdated={refreshData}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsFinanceTab
              settlements={settlements}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReportsTab />
          )}

          {(activeTab === 'compliance' || activeTab === ('documents' as any)) && (
            <ComplianceDocumentsTab
              documents={documents}
              onDocumentsUpdated={refreshData}
            />
          )}

          {activeTab === 'support' && (
            <SupportTicketsTab
              tickets={tickets}
              onTicketsUpdated={refreshData}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsTab
              auditLogs={auditLogs}
            />
          )}

          {activeTab === 'profile' && (
            <PharmacyProfileTab
              profile={profile}
              onProfileUpdated={refreshData}
            />
          )}
          </PermissionGate>
        </main>

      </div>

    </div>
    </PortalRoleProvider>
  );
};

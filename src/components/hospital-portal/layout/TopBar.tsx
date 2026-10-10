import React, { useState, useEffect } from 'react';
import {
  Building2,
  Siren,
  ShieldCheck,
  ChevronDown,
  User,
  LogOut,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  HelpCircle,
  X,
  Stethoscope,
  BedDouble,
  Droplets,
  FileCheck,
  Tag,
  GitPullRequest,
  LifeBuoy
} from 'lucide-react';
import { useHospitalPortal } from '../../../context/HospitalContext';
import { NavigationView } from '../../../types/hospitalPortal';

interface TopBarProps {
  onBackToPublic?: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onBackToPublic, onToggleMobileMenu }) => {
  const {
    hospitals,
    currentHospital,
    setCurrentHospitalId,
    currentUser,
    currentRole,
    registeredUsers,
    quickSwitchUser,
    logout,
    toggleRedAlert,
    openModal,
    twoFactorVerified,
    setCurrentView,
    bloodBank,
    drafts,
    ambulances,
    beds,
    documents,
    doctors,
    departments,
    tariffs
  } = useHospitalPortal();

  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRedAlertConfirm, setShowRedAlertConfirm] = useState(false);

  // Compute live operational notifications
  const criticalBlood = bloodBank.filter((b) => b.prbcUnits < b.criticalMinThreshold);
  const pendingDrafts = drafts.filter((d) => d.status === 'Pending Review');
  const activeDispatches = ambulances.filter((a) => a.status === 'Dispatched / In Transit');
  const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
  const occupancyRate = beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;
  const expiringDocs = documents.filter((d) => d.status === 'Renewal Window Open' || d.status === 'Expired');

  const notificationsList: Array<{
    id: string;
    title: string;
    desc: string;
    view: NavigationView;
    severity: 'danger' | 'warning' | 'info';
  }> = [
    ...(currentHospital?.redAlertActive
      ? [{
          id: 'code-red',
          title: 'CODE RED MASS CASUALTY ACTIVE',
          desc: 'Trauma protocols STAT active across all bays and emergency OT suites.',
          view: 'emergency' as NavigationView,
          severity: 'danger' as const
        }]
      : []),
    ...criticalBlood.map((b) => ({
      id: `blood-${b.bloodGroup}`,
      title: `Critical Blood Deficit: ${b.bloodGroup}`,
      desc: `PRBC inventory is at ${b.prbcUnits} units (minimum reserve: ${b.criticalMinThreshold} units).`,
      view: 'blood-bank' as NavigationView,
      severity: 'danger' as const
    })),
    ...pendingDrafts.map((d) => ({
      id: `draft-${d.id}`,
      title: `Governance Review: ${d.title}`,
      desc: `Submitted by ${d.submittedBy || 'Medical Staff'} — awaiting medical director sign-off.`,
      view: 'drafts' as NavigationView,
      severity: 'warning' as const
    })),
    ...(occupancyRate >= 85
      ? [{
          id: 'high-occupancy',
          title: `High Inpatient Occupancy (${occupancyRate}%)`,
          desc: `${occupiedBeds} of ${beds.length} beds occupied across all campus wings.`,
          view: 'capacity' as NavigationView,
          severity: 'warning' as const
        }]
      : []),
    ...expiringDocs.map((doc) => ({
      id: `doc-${doc.id}`,
      title: `License Compliance Alert: ${doc.title}`,
      desc: `Certificate #${doc.licenseNumber} expiring soon from ${doc.issuingAuthority}.`,
      view: 'documents' as NavigationView,
      severity: 'info' as const
    })),
    ...activeDispatches.map((a) => ({
      id: `dispatch-${a.id}`,
      title: `Ambulance In Transit: ${a.vehicleNumber}`,
      desc: `Assigned Paramedic: ${a.paramedicName || 'Crew On-Board'}. En route.`,
      view: 'ambulance' as NavigationView,
      severity: 'info' as const
    }))
  ];

  // Global hotkey Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsHospitalDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSuperAdmin = currentRole === 'GlobalHealth SuperAdmin';
  const tenantUsers = registeredUsers.filter((u) => isSuperAdmin || !u.hospitalId || u.hospitalId === currentHospital?.id);

  // Filter items for universal search
  const searchResults = searchQuery.trim()
    ? [
        ...doctors
          .filter(
            (d) =>
              d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.specialty.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 3)
          .map((d) => ({
            id: d.id,
            category: 'Doctors & Faculty',
            title: d.name,
            subtitle: `${d.specialty} • ${d.roomNumber}`,
            icon: Stethoscope,
            onClick: () => {
              setCurrentView('doctors');
              setIsSearchOpen(false);
            }
          })),
        ...departments
          .filter(
            (dept) =>
              dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              dept.code.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 3)
          .map((dept) => ({
            id: dept.id,
            category: 'Departments & Topology',
            title: dept.name,
            subtitle: `HOD: ${dept.headOfDepartment} • Wing: ${dept.wingName}`,
            icon: Building2,
            onClick: () => {
              setCurrentView('organization');
              setIsSearchOpen(false);
            }
          })),
        ...tariffs
          .filter(
            (t) =>
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.code.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 3)
          .map((t) => ({
            id: t.id,
            category: 'Pricing Master',
            title: t.name,
            subtitle: `Code: ${t.code} • Standard Price: ₹${t.standardPrice}`,
            icon: Tag,
            onClick: () => {
              setCurrentView('tariffs');
              setIsSearchOpen(false);
            }
          })),
        ...beds
          .filter(
            (b) =>
              b.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (b.assignedPatientName && b.assignedPatientName.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .slice(0, 3)
          .map((b) => ({
            id: b.id,
            category: 'Inpatient Capacity',
            title: `Bed ${b.bedNumber} (${b.wardType})`,
            subtitle: `Status: ${b.status}${b.assignedPatientName ? ` • Patient: ${b.assignedPatientName}` : ''}`,
            icon: BedDouble,
            onClick: () => {
              setCurrentView('capacity');
              setIsSearchOpen(false);
            }
          })),
        ...('support ticket incident help desk'
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
          ? [
              {
                id: 'support-nav',
                category: 'Support & Escalations',
                title: 'Enterprise Incident & Support Desk',
                subtitle: 'Direct escalation to GlobalHealth engineers & compliance officers',
                icon: LifeBuoy,
                onClick: () => {
                  setCurrentView('support');
                  setIsSearchOpen(false);
                }
              }
            ]
          : [])
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#DCEBE4] shadow-xs px-3 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Zone: Hamburger & Brand & Facility Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Navigation Toggle Button */}
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] text-[#17221E] hover:bg-[#E8F7F1] transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {onBackToPublic && (
            <button
              onClick={onBackToPublic}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F1FAF6] hover:bg-[#DCEBE4] text-[#17221E] text-xs font-bold transition border border-[#DCEBE4] cursor-pointer"
              title="Return to Public Health & Doctors Directory"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Public Portal</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#17221E] text-base tracking-tight flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-lg bg-[#008F68] text-white flex items-center justify-center text-xs font-black shadow-xs">
                GH
              </span>
              <span className="hidden sm:inline">GlobalHealth</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5] hidden lg:inline">
                Hospital Command
              </span>
            </span>
          </div>

          <div className="h-5 w-px bg-[#DCEBE4] hidden sm:block" />

          {/* Hospital Institution Display / Cross-Tenant Switcher */}
          <div className="relative">
            {isSuperAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsHospitalDropdownOpen(!isHospitalDropdownOpen);
                    setIsUserDropdownOpen(false);
                    setIsNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F6FBF8] hover:bg-[#F1FAF6] border border-[#008F68] text-left transition cursor-pointer shadow-xs"
                >
                  <Building2 className="h-4 w-4 text-[#008F68] shrink-0" />
                  <div className="truncate max-w-[130px] sm:max-w-[220px]">
                    <div className="text-xs font-bold text-[#17221E] truncate flex items-center gap-1">
                      <span>{currentHospital?.name}</span>
                      <span className="text-[9px] bg-[#E8F7F1] text-[#008F68] font-bold px-1 rounded">SuperAdmin</span>
                    </div>
                    <div className="text-[10px] text-[#52635C] font-mono">{currentHospital?.id}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[#52635C] shrink-0" />
                </button>

                {isHospitalDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white border border-[#DCEBE4] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 text-[11px] font-bold text-[#52635C] uppercase tracking-wider border-b border-[#DCEBE4] flex items-center justify-between">
                      <span>Authorized Facilities</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHospitalDropdownOpen(false);
                          openModal('register_hospital');
                        }}
                        className="text-[#008F68] hover:underline font-bold text-xs cursor-pointer"
                      >
                        + Enroll Facility
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                      {hospitals.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setCurrentHospitalId(h.id);
                            setIsHospitalDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                            h.id === currentHospital?.id
                              ? 'bg-[#E8F7F1] border border-[#BDE4D5]'
                              : 'hover:bg-[#F1FAF6] border border-transparent'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="text-xs font-bold text-[#17221E] truncate">{h.name}</div>
                            <div className="text-[10px] text-[#52635C] font-mono">
                              {h.city}, {h.country} • {h.totalBedsCount || 500} Beds
                            </div>
                          </div>
                          {h.id === currentHospital?.id && (
                            <CheckCircle2 className="h-4 w-4 text-[#008F68] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Single-Tenant Organization Badge */
              <div
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F6FBF8] border border-[#D8E7E0] text-left select-none"
                title="Single-Tenant Isolated Workspace: Your session is cryptographically bound to this hospital institution."
              >
                <div className="p-1 rounded-lg bg-[#E8F7F1] text-[#008F68] shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="truncate max-w-[120px] sm:max-w-[220px]">
                  <div className="text-xs font-bold text-[#17221E] truncate flex items-center gap-1.5">
                    <span>{currentHospital?.name}</span>
                  </div>
                  <div className="text-[10px] text-[#52635C] font-mono flex items-center gap-1">
                    <span>{currentHospital?.id}</span>
                    <span>•</span>
                    <span className="text-[#008F68] font-semibold">Tenant Verified</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Zone: Search, Notifications, Red Alert, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Universal Command Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F6FBF8] hover:bg-[#F1FAF6] border border-[#D8E7E0] text-xs font-semibold text-[#52635C] transition cursor-pointer"
            title="Search doctors, departments, tariffs, beds (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-[#52635C]" />
            <span className="hidden md:inline">Search portal…</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#52635C] bg-white rounded border border-[#DCEBE4]">
              ⌘K
            </kbd>
          </button>

          {/* Operational Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsUserDropdownOpen(false);
                setIsHospitalDropdownOpen(false);
              }}
              className="relative p-2 rounded-xl bg-[#F6FBF8] hover:bg-[#F1FAF6] border border-[#D8E7E0] text-[#52635C] transition cursor-pointer"
              title="Operational Alerts & Notifications"
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {notificationsList.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#D64545] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {notificationsList.length}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#DCEBE4] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#DCEBE4] mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#008F68]" />
                    <span className="text-xs font-bold text-[#17221E]">Operational Alerts</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#52635C] bg-[#F1FAF6] px-2 py-0.5 rounded-md border border-[#DCEBE4]">
                    {notificationsList.length} Active Items
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 py-1">
                  {notificationsList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#52635C]">
                      All facility telemetry normal. No critical operational alerts.
                    </div>
                  ) : (
                    notificationsList.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCurrentView(item.view);
                          setIsNotificationsOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition border text-xs cursor-pointer block ${
                          item.severity === 'danger'
                            ? 'bg-[#FFF1F1] border-[#F2CCCC] hover:bg-[#FFE5E5]'
                            : item.severity === 'warning'
                            ? 'bg-[#FFF7E6] border-[#FED88B] hover:bg-[#FFEFC7]'
                            : 'bg-[#F6FBF8] border-[#DCEBE4] hover:bg-[#E8F7F1]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`font-bold truncate ${
                              item.severity === 'danger'
                                ? 'text-[#C53939]'
                                : item.severity === 'warning'
                                ? 'text-[#A86E00]'
                                : 'text-[#008F68]'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#52635C] leading-relaxed line-clamp-2">
                          {item.desc}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#DCEBE4] mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('communication');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-[11px] font-bold text-[#008F68] hover:underline cursor-pointer"
                  >
                    View All Broadcasts
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[11px] text-[#52635C] hover:text-[#17221E] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help & Support Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentView('support');
              setIsNotificationsOpen(false);
              setIsUserDropdownOpen(false);
              setIsHospitalDropdownOpen(false);
            }}
            className="p-2 rounded-xl bg-[#F6FBF8] hover:bg-[#F1FAF6] border border-[#D8E7E0] text-[#52635C] hover:text-[#008F68] transition cursor-pointer"
            title="Enterprise Support & Incident Desk"
            aria-label="Open support desk"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Emergency Code Red Beacon */}
          <button
            type="button"
            onClick={() => setShowRedAlertConfirm(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              currentHospital?.redAlertActive
                ? 'bg-[#D64545] text-white animate-pulse'
                : 'bg-[#FFF1F1] text-[#C53939] border border-[#F2CCCC] hover:bg-[#D64545] hover:text-white'
            }`}
            title="Trigger or stand down facility-wide Code Red mass casualty alert"
          >
            <Siren className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {currentHospital?.redAlertActive ? 'CODE RED' : 'CODE RED'}
            </span>
          </button>

          {/* 2FA Enforced Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E8F7F1] border border-[#BDE4D5] text-[#008F68] text-[11px] font-bold">
            <KeyRound className="h-3.5 w-3.5" />
            <span>2FA Enforced</span>
          </div>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsUserDropdownOpen(!isUserDropdownOpen);
                setIsHospitalDropdownOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#F6FBF8] hover:bg-[#F1FAF6] border border-[#D8E7E0] transition cursor-pointer"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-7 w-7 rounded-full object-cover border border-[#008F68]"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-[#008F68] text-white flex items-center justify-center text-xs font-bold">
                  {currentUser?.name?.slice(0, 2) || 'AD'}
                </div>
              )}
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-[#17221E] leading-tight truncate max-w-[120px]">
                  {currentUser?.name}
                </div>
                <div className="text-[10px] text-[#008F68] font-bold truncate max-w-[120px]">
                  {currentRole}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#52635C]" />
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#DCEBE4] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-[#DCEBE4] mb-1">
                  <div className="text-xs font-bold text-[#17221E]">{currentUser?.name}</div>
                  <div className="text-[11px] text-[#52635C] font-mono">{currentUser?.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]">
                    {currentRole}
                  </span>
                </div>

                <div className="px-3 py-1.5 text-[10px] font-bold text-[#52635C] uppercase tracking-wider">
                  {isSuperAdmin ? 'Quick Switch Role Persona (All Tenancy)' : `Active Hospital Staff (${tenantUsers.length} Roles)`}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                  {tenantUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        quickSwitchUser(u.id);
                        setIsUserDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                        u.id === currentUser?.id
                          ? 'bg-[#E8F7F1] border border-[#BDE4D5]'
                          : 'hover:bg-[#F1FAF6] border border-transparent'
                      }`}
                    >
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={u.name}
                        className="h-7 w-7 rounded-full object-cover shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#17221E] truncate">{u.name}</div>
                        <div className="text-[10px] text-[#52635C] truncate">{u.role}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#DCEBE4] mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('security');
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#52635C] hover:bg-[#F1FAF6] rounded-xl transition cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>2FA &amp; Security Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsUserDropdownOpen(false);
                      onBackToPublic?.();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#C53939] hover:bg-[#FFF1F1] rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out Cleanly</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Command Palette / Quick Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-[#17221E]/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSearchOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#DCEBE4] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-[#DCEBE4] flex items-center gap-2.5">
              <Search className="h-4 w-4 text-[#52635C]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctors, departments, tariffs, beds, fleet…"
                className="w-full text-sm bg-transparent outline-none text-[#17221E] placeholder-[#8A9993]"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-[#52635C] hover:bg-[#F1FAF6] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.trim() === '' ? (
                <div className="p-4 text-center text-xs text-[#52635C]">
                  Type a doctor name, clinical department, procedure code, or bed number…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#52635C]">
                  No clinical or operational records match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((result) => {
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={result.onClick}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#F1FAF6] flex items-center gap-3 transition cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-[#E8F7F1] text-[#008F68] shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#17221E] truncate">{result.title}</span>
                            <span className="text-[10px] text-[#52635C] font-semibold">({result.category})</span>
                          </div>
                          <div className="text-[11px] text-[#52635C] truncate">{result.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-3.5 py-2 border-t border-[#DCEBE4] bg-[#F6FBF8] flex items-center justify-between text-[11px] text-[#52635C]">
              <span>Use keywords or names to search</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Red Alert Confirmation Modal */}
      {showRedAlertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17221E]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#F2CCCC] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FFF1F1] text-[#D64545]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#C53939]">
                  {currentHospital?.redAlertActive ? 'Stand Down Code Red Alert?' : 'Activate Facility Code Red Alert?'}
                </h4>
                <p className="text-xs text-[#52635C]">Mass Casualty & Emergency Protocol System</p>
              </div>
            </div>

            <p className="text-xs text-[#17221E] leading-relaxed">
              {currentHospital?.redAlertActive
                ? 'Deactivating Code Red will notify on-call trauma surgeons and dispatch teams that the facility has returned to standard operational readiness.'
                : 'Triggering Code Red broadcasts an immediate emergency directive across all trauma bays, prioritizes STAT blood crossmatches, and readies emergency OT suites.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCEBE4]">
              <button
                type="button"
                onClick={() => setShowRedAlertConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-[#52635C] hover:bg-[#F1FAF6] rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleRedAlert();
                  setShowRedAlertConfirm(false);
                }}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs cursor-pointer ${
                  currentHospital?.redAlertActive
                    ? 'bg-[#008F68] hover:bg-[#007A59]'
                    : 'bg-[#D64545] hover:bg-[#C53939]'
                }`}
              >
                {currentHospital?.redAlertActive ? 'Stand Down Alert' : 'Confirm & Trigger Code Red'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

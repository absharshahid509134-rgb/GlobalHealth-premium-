import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  ArrowLeftRight,
  Bell,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  ScanLine,
  CalendarClock,
  CalendarDays,
  Clock3,
  BarChart3,
  IndianRupee,
  FolderLock,
  UserRound,
  BadgeCheck,
  Building2,
  ShieldCheck,
  KeyRound,
  ScrollText,
  CircleHelp,
  LifeBuoy,
  Activity,
  X
} from 'lucide-react';
import { WorkspaceView } from '../doctorPortalData';

export interface DoctorSidebarProps {
  currentView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onBackToGlobalHealth: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  unreadNotifications?: number;
  unreadMessages?: number;
  pendingReviewsCount?: number;
}

interface NavItemDef {
  id: WorkspaceView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: 'blue' | 'amber' | 'emerald' | 'rose';
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  currentView,
  onNavigate,
  onBackToGlobalHealth,
  isOpen = false,
  onClose,
  unreadNotifications = 0,
  unreadMessages = 0,
  pendingReviewsCount = 0
}) => {
  const groups: NavGroupDef[] = [
    {
      title: 'Home',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Patient & Communication',
      items: [
        { id: 'patients', label: 'My Patients', icon: Users },
        {
          id: 'messages',
          label: 'Secure Messages',
          icon: MessagesSquare,
          badge: unreadMessages > 0 ? unreadMessages : undefined,
          badgeVariant: 'blue'
        },
        { id: 'referrals', label: 'Clinical Referrals', icon: ArrowLeftRight },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadNotifications > 0 ? unreadNotifications : undefined,
          badgeVariant: 'rose'
        }
      ]
    },
    {
      title: 'Clinical Care',
      items: [
        { id: 'consultations', label: 'Consultations', icon: Stethoscope },
        { id: 'prescriptions', label: 'e-Prescriptions', icon: ClipboardList },
        {
          id: 'labs',
          label: 'Lab & Diagnostics',
          icon: FlaskConical,
          badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
          badgeVariant: 'amber'
        },
        { id: 'imaging', label: 'Imaging Orders', icon: ScanLine }
      ]
    },
    {
      title: 'Virtual Care & Practice',
      items: [
        { id: 'appointments', label: 'Appointments', icon: CalendarClock },
        { id: 'calendar', label: 'Practice Schedule', icon: CalendarDays },
        { id: 'availability', label: 'Availability Rules', icon: Clock3 },
        { id: 'insights', label: 'Clinical Analytics', icon: BarChart3 },
        { id: 'billing', label: 'Billing & Encounters', icon: IndianRupee },
        { id: 'documents', label: 'Document Vault', icon: FolderLock }
      ]
    },
    {
      title: 'Security & Administration',
      items: [
        { id: 'profile', label: 'Doctor Profile', icon: UserRound },
        { id: 'credentials', label: 'Credentials & Licensure', icon: BadgeCheck },
        { id: 'affiliations', label: 'Practice Locations', icon: Building2 },
        { id: 'security', label: 'Security & 2FA', icon: ShieldCheck },
        { id: 'sessions', label: 'Active Sessions', icon: KeyRound },
        { id: 'delegated', label: 'Delegated Staff', icon: Users },
        { id: 'audit', label: 'Audit Log', icon: ScrollText },
        { id: 'help', label: 'Clinical Help Center', icon: CircleHelp },
        { id: 'support', label: 'Enterprise Support', icon: LifeBuoy }
      ]
    }
  ];

  const handleSelect = (view: WorkspaceView) => {
    onNavigate(view);
    if (onClose) onClose();
  };

  const navContent = (
    <nav className="p-3 text-xs" aria-label="Doctor Portal Navigation">
      {/* Brand header in drawer if open */}
      <div className="mb-4 flex items-center justify-between px-2.5 py-1.5 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#1769E0] text-white">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-white">GlobalHealth</span>
            <span className="block text-[10px] font-semibold text-[#8A97A8]">Doctor Workspace</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#1769E0] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                        isActive
                          ? 'bg-white text-[#1769E0]'
                          : item.badgeVariant === 'rose'
                          ? 'bg-rose-500 text-white'
                          : item.badgeVariant === 'amber'
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-[#1769E0] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Return to main GlobalHealth portal */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onBackToGlobalHealth}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Activity className="h-4 w-4 shrink-0 text-slate-400" />
          <span>Back to GlobalHealth</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#E3E8EF] bg-[#0B1F3A] lg:block">
        <div className="sticky top-[108px] max-h-[calc(100vh-112px)] overflow-y-auto">
          {navContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 overflow-y-auto bg-[#0B1F3A] shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

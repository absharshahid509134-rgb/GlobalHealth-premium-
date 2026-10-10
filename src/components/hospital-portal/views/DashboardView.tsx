import React from 'react';
import {
  Building2,
  BedDouble,
  Siren,
  Droplets,
  Stethoscope,
  Activity,
  Users,
  GitPullRequest,
  ScrollText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Navigation,
  ArrowRight,
  Calendar,
  Globe2,
  FileCheck,
  LifeBuoy
} from 'lucide-react';
import { useHospitalPortal } from '../../../context/HospitalContext';

export const DashboardView: React.FC = () => {
  const {
    currentHospital,
    beds,
    doctors,
    bloodBank,
    ambulances,
    appointments,
    drafts,
    auditLogs,
    openModal,
    setCurrentView
  } = useHospitalPortal();

  // Compute live KPIs
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
  const availableBeds = beds.filter((b) => b.status === 'Available').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const activeVentilators = beds.filter((b) => b.ventilatorAttached && b.status === 'Occupied').length;
  const totalVentilators = beds.filter((b) => b.ventilatorAttached).length;

  const totalPRBC = bloodBank.reduce((acc, curr) => acc + curr.prbcUnits, 0);
  const totalWholeBlood = bloodBank.reduce((acc, curr) => acc + curr.wholeBloodUnits, 0);
  const criticalDeficitGroups = bloodBank.filter((b) => b.prbcUnits < b.criticalMinThreshold);

  const pendingDrafts = drafts.filter((d) => d.status === 'Pending Review');
  const activeDispatches = ambulances.filter((a) => a.status === 'Dispatched / In Transit');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero Strip */}
      <div className="rounded-2xl bg-white border border-[#DCEBE4] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]">
              {currentHospital.verificationStatus} Medical Facility
            </span>
            <span className="text-xs font-mono font-bold text-[#52635C] bg-[#F1FAF6] px-2 py-0.5 rounded-md border border-[#DCEBE4]">
              {currentHospital.id}
            </span>
            <span className="text-xs font-bold text-[#287EA8] bg-[#EAF6FB] px-2 py-0.5 rounded-md border border-[#C5E4F3]">
              {currentHospital.traumaLevel}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17221E] tracking-tight">
            {currentHospital.name}
          </h1>
          <p className="text-xs text-[#52635C] max-w-3xl">
            {currentHospital.tagline} • {currentHospital.streetAddress}, {currentHospital.city}, {currentHospital.country}
          </p>
        </div>

        {/* Quick Actions Array */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModal('dispatch_ambulance')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D64545] hover:bg-[#C53939] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Siren className="h-4 w-4" />
            <span>STAT Dispatch</span>
          </button>
          <button
            onClick={() => openModal('add_bed')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Commission Bed</span>
          </button>
          <button
            onClick={() => openModal('add_doctor')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F1FAF6] hover:bg-[#DCEBE4] text-[#17221E] border border-[#DCEBE4] text-xs font-bold transition cursor-pointer"
          >
            <Stethoscope className="h-4 w-4 text-[#008F68]" />
            <span>Enroll Doctor</span>
          </button>
          <button
            onClick={() => setCurrentView('public-sync')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8F7F1] hover:bg-[#D4EFE5] text-[#008F68] border border-[#BDE4D5] text-xs font-bold transition cursor-pointer"
          >
            <Globe2 className="h-4 w-4 text-[#008F68]" />
            <span>Public Sync</span>
          </button>
          <button
            onClick={() => setCurrentView('support')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F6FBF8] text-[#52635C] border border-[#DCEBE4] text-xs font-bold transition cursor-pointer"
          >
            <LifeBuoy className="h-4 w-4 text-[#287EA8]" />
            <span>Support Desk</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Array */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inpatient Capacity */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Inpatient Bed Load</span>
            <div className="p-2 rounded-xl bg-[#E8F7F1] text-[#008F68]">
              <BedDouble className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#17221E] font-mono">{occupancyRate}%</div>
            <p className="text-xs text-[#52635C]">
              <strong className="text-[#17221E]">{occupiedBeds}</strong> Occupied • <strong className="text-[#008F68]">{availableBeds}</strong> Available
            </p>
          </div>
          <div className="w-full bg-[#F1FAF6] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyRate > 85 ? 'bg-[#D99718]' : 'bg-[#008F68]'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* KPI 2: ICU & Ventilator Telemetry */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">ICU Telemetry</span>
            <div className="p-2 rounded-xl bg-[#EAF6FB] text-[#287EA8]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#17221E] font-mono">{activeVentilators} / {totalVentilators}</div>
            <p className="text-xs text-[#52635C]">Mechanical Ventilators Active</p>
          </div>
          <div className="text-[11px] font-bold text-[#287EA8] bg-[#EAF6FB] px-2 py-0.5 rounded-md border border-[#C5E4F3] inline-block">
            Central Oxygen High Pressure Normal
          </div>
        </div>

        {/* KPI 3: Emergency Trauma Level */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Emergency Status</span>
            <div className={`p-2 rounded-xl ${currentHospital.redAlertActive ? 'bg-[#FFF1F1] text-[#D64545] animate-pulse' : 'bg-[#E8F7F1] text-[#008F68]'}`}>
              <Siren className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl font-bold ${currentHospital.redAlertActive ? 'text-[#C53939]' : 'text-[#008F68]'}`}>
              {currentHospital.redAlertActive ? 'CODE RED ACTIVE' : 'Standard Readiness'}
            </div>
            <p className="text-xs text-[#52635C]">
              {activeDispatches.length} Ambulances In Transit
            </p>
          </div>
          <div className="text-[11px] text-[#52635C]">
            Trauma Bays 1-4 Operational 24/7
          </div>
        </div>

        {/* KPI 4: Blood Reserves */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Blood Bank Reserve</span>
            <div className="p-2 rounded-xl bg-[#FFF1F1] text-[#D64545]">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#17221E] font-mono">{totalPRBC + totalWholeBlood} Units</div>
            <p className="text-xs text-[#52635C]">
              {totalPRBC} PRBC • {totalWholeBlood} Whole Blood
            </p>
          </div>
          {criticalDeficitGroups.length > 0 ? (
            <span className="text-[11px] font-bold text-[#C53939] bg-[#FFF1F1] px-2 py-0.5 rounded-md border border-[#F2CCCC] block truncate">
              {criticalDeficitGroups.map((g) => g.bloodGroup).join(', ')} Below Reserve Margin
            </span>
          ) : (
            <span className="text-[11px] font-bold text-[#008F68] bg-[#E8F7F1] px-2 py-0.5 rounded-md border border-[#BDE4D5] block">
              All 8 Blood Groups Above Threshold
            </span>
          )}
        </div>
      </div>

      {/* Two-Column Clinical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Active Specialists & OPD Queue */}
        <div className="space-y-4">
          {/* Active Specialists Directory */}
          <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBE4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17221E] flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-[#008F68]" />
                  <span>Senior Institute Specialists & HODs</span>
                </h3>
                <p className="text-[11px] text-[#52635C]">Board-Certified Physicians on Active Roster</p>
              </div>
              <button
                onClick={() => setCurrentView('doctors')}
                className="text-xs font-bold text-[#008F68] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({doctors.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {doctors.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="h-10 w-10 rounded-xl object-cover border border-[#008F68] shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#17221E] truncate">{doc.name}</div>
                      <div className="text-[11px] text-[#008F68] font-semibold truncate">{doc.specialty}</div>
                      <div className="text-[10px] text-[#52635C] font-mono truncate">{doc.roomNumber}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'In Surgery'
                          ? 'bg-[#FFF7E6] text-[#A86E00] border border-[#FED88B]'
                          : doc.status === 'Consulting'
                          ? 'bg-[#EAF6FB] text-[#287EA8] border border-[#C5E4F3]'
                          : 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                      }`}
                    >
                      {doc.status}
                    </span>
                    <div className="text-xs font-bold text-[#17221E] mt-1">₹{doc.consultationFee}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's OPD Consultation Queue */}
          <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBE4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17221E] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#287EA8]" />
                  <span>Today's Outpatient Consultation Queue</span>
                </h3>
                <p className="text-[11px] text-[#52635C]">Live chamber tokens and patient triage status</p>
              </div>
              <button
                onClick={() => openModal('book_appointment')}
                className="text-xs font-bold text-[#008F68] hover:underline cursor-pointer"
              >
                + Book Token
              </button>
            </div>

            <div className="space-y-2">
              {appointments.slice(0, 4).map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-xl bg-white border border-[#DCEBE4] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-mono font-bold text-xs bg-[#EAF6FB] text-[#287EA8] px-2 py-0.5 rounded-md border border-[#C5E4F3] shrink-0">
                      {apt.tokenNumber}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-[#17221E] truncate">{apt.patientName}</div>
                      <div className="text-[11px] text-[#52635C] truncate">{apt.doctorName} • {apt.chamber}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      apt.status === 'Inside Chamber'
                        ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                        : 'bg-[#F1FAF6] text-[#52635C]'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pending Governance Drafts & Audit Logs */}
        <div className="space-y-4">
          {/* Pending Governance Drafts */}
          <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBE4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17221E] flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-[#D99718]" />
                  <span>Pending Change Governance Pipeline</span>
                </h3>
                <p className="text-[11px] text-[#52635C]">Two-tier tariff revisions & doctor appointments</p>
              </div>
              <button
                onClick={() => setCurrentView('drafts')}
                className="text-xs font-bold text-[#008F68] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Manage ({pendingDrafts.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {pendingDrafts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] text-center text-xs text-[#52635C]">
                All proposed changes have been reviewed and published.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-[#FFF7E6] border border-[#FED88B] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#17221E]">{d.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#A86E00] border border-[#FED88B]">
                        {d.module}
                      </span>
                    </div>
                    <p className="text-xs text-[#52635C] leading-tight">{d.diffSummary}</p>
                    <div className="text-[10px] text-[#687971] flex items-center justify-between pt-1">
                      <span>Submitted by {d.submittedBy} ({d.submittedByRole})</span>
                      <span className="font-mono">{new Date(d.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-Time Immutable SHA-256 Audit Trail */}
          <div className="p-5 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBE4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17221E] flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#008F68]" />
                  <span>Real-Time Immutable Audit Stream</span>
                </h3>
                <p className="text-[11px] text-[#52635C]">Cryptographically hashed clinical transactions</p>
              </div>
              <button
                onClick={() => setCurrentView('audit-logs')}
                className="text-xs font-bold text-[#008F68] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {auditLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F6FBF8] border border-[#DCEBE4] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#17221E]">{log.action}</span>
                    <span className="text-[10px] font-mono text-[#52635C]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-[#52635C]">{log.details}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#687971] pt-1">
                    <span>{log.userName} ({log.userRole})</span>
                    <span className="font-mono truncate max-w-[140px] text-[#008F68]">{log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

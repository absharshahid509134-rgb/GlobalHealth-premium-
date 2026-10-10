import React from 'react';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Lock,
  LockOpen,
  X,
  FileText,
  AlertTriangle,
  History,
  Activity,
  Calendar
} from 'lucide-react';
import { ConsentStatus, ConsentedScope } from '../doctorClinicalData';

export interface PatientContextBarProps {
  patient: {
    id: string;
    identifier: string;
    name: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    consentStatus: ConsentStatus;
    consentedScopes?: ConsentedScope[];
    accessExpiresAt?: string;
    isEmergencyAccess?: boolean;
    emergencyReason?: string;
    facilityName?: string;
  };
  onRequestScopeExpansion?: () => void;
  onViewAccessAudit?: () => void;
  onCloseChart: () => void;
}

export const PatientContextBar: React.FC<PatientContextBarProps> = ({
  patient,
  onRequestScopeExpansion,
  onViewAccessAudit,
  onCloseChart
}) => {
  const isEmergency = !!patient.isEmergencyAccess;
  const isGranted = patient.consentStatus === 'granted';
  const isPending = patient.consentStatus === 'pending';
  const isDenied = patient.consentStatus === 'denied';
  const isExpired = patient.consentStatus === 'expired';
  const expiryDate = patient.accessExpiresAt ? new Date(patient.accessExpiresAt) : null;
  const isExpiringSoon = !!expiryDate && expiryDate.getTime() > Date.now() && expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  const scopes = patient.consentedScopes || ['basic'];

  return (
    <div
      className={`sticky top-[57px] z-20 border-b shadow-xs transition-colors ${
        isEmergency
          ? 'border-rose-300 bg-rose-50/95 text-rose-950'
          : isDenied
          ? 'border-rose-200 bg-rose-50/90 text-rose-950'
          : isPending
          ? 'border-amber-200 bg-amber-50/90 text-amber-950'
          : 'border-[#D8E4F0] bg-[#EDF4FC] text-[#0B1F3A]'
      }`}
      role="region"
      aria-label="Active patient chart context"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Left: Patient Identity & MRN */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white ${
              isEmergency
                ? 'bg-rose-600'
                : isDenied
                ? 'bg-rose-500'
                : isPending
                ? 'bg-amber-600'
                : 'bg-[#1769E0]'
            }`}
          >
            <User className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xs font-black tracking-tight sm:text-sm">
                {patient.name}
              </h3>
              <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 ring-1 ring-slate-200/80">
                {patient.identifier || patient.id}
              </span>
              {patient.age && patient.gender && (
                <span className="text-[11px] font-semibold text-slate-600">
                  {patient.age}y · {patient.gender}
                </span>
              )}
              {patient.bloodGroup && (
                <span className="rounded-md bg-white/90 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {patient.bloodGroup}
                </span>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              {patient.facilityName && (
                <span>Facility: {patient.facilityName}</span>
              )}
              {isEmergency && (
                <span className="font-bold text-rose-700">
                  ⚠️ Emergency Break-Glass: {patient.emergencyReason || 'Critical Care View'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Access & Scope Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status badge */}
          {isEmergency ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              <AlertTriangle className="h-3 w-3" /> Time-Limited Emergency Access
            </span>
          ) : isGranted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Active Patient Consent
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
              <Clock className="h-3 w-3 text-amber-600" /> Consent Request Pending
            </span>
          ) : isDenied ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 ring-1 ring-rose-300">
              <Lock className="h-3 w-3 text-rose-600" /> Patient Denied Access
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 ring-1 ring-slate-300">
              <Lock className="h-3 w-3 text-slate-600" /> Grant Expired
            </span>
          ) : null}

          {/* Consented scopes list */}
          {isGranted && (
            <div className="hidden md:flex items-center gap-2 text-[10px]">
              {patient.accessExpiresAt && (
                <span className={`font-semibold ${isExpiringSoon ? 'text-amber-700' : 'text-slate-500'}`}>
                  Access until {expiryDate?.toLocaleDateString()}{isExpiringSoon ? ' · expiring soon' : ''}
                </span>
              )}
              <span className="text-slate-500 font-medium">Authorized Scopes:</span>
              <div className="flex flex-wrap gap-1">
                {scopes.map((scope) => (
                  <span
                    key={scope}
                    className="rounded bg-white/80 px-1.5 py-0.5 font-semibold capitalize text-slate-700 ring-1 ring-slate-200"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions & Close */}
        <div className="flex items-center gap-1.5">
          {onRequestScopeExpansion && (
            <button
              type="button"
              onClick={onRequestScopeExpansion}
              className="rounded-lg border border-slate-300 bg-white/90 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-white hover:text-medical-800 cursor-pointer"
              title="Request additional scopes from patient"
            >
              Request Scope
            </button>
          )}

          {onViewAccessAudit && (
            <button
              type="button"
              onClick={onViewAccessAudit}
              className="rounded-lg border border-slate-300 bg-white/90 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-white hover:text-medical-800 cursor-pointer"
              title="View chart access audit log"
            >
              Access Audit
            </button>
          )}

          <button
            type="button"
            onClick={onCloseChart}
            className="flex items-center gap-1 rounded-lg bg-slate-900/10 px-2.5 py-1 text-[11px] font-bold text-slate-800 transition hover:bg-slate-900/20 cursor-pointer"
            title="Close patient chart and return to list"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Close Chart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

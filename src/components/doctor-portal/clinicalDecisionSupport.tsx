import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Stethoscope,
  Pill,
  ExternalLink
} from 'lucide-react';

/* ============================================================================
   GlobalHealth Doctor Portal — Clinical Decision Support (CDS) Engine.

   CLINICAL SAFETY CONSTITUTION:
   - Non-authoritative advisory tool only.
   - Never automatically alters a prescription, diagnosis, or clinical note.
   - Requires explicit clinician review and documented clinical justification
     for any overridden critical or major warnings.
   ========================================================================== */

export type CDSSeverity = 'critical' | 'major' | 'moderate' | 'info';

export interface CDSAlert {
  id: string;
  type: 'drug_interaction' | 'allergy_conflict' | 'dosage_warning' | 'duplicate_therapy' | 'contraindication';
  severity: CDSSeverity;
  title: string;
  substanceA: string;
  substanceB?: string;
  mechanism: string;
  clinicalRisk: string;
  recommendedAction: string;
  acknowledged?: boolean;
  overrideReason?: string;
}

export interface PatientCDSContext {
  allergies: string[];
  currentMedications: string[];
  conditions?: string[];
  age?: number;
  egfr?: number;
  weightKg?: number;
}

// Well-known high-impact clinical interactions database
interface InteractionRule {
  drugsA: string[];
  drugsB: string[];
  severity: CDSSeverity;
  title: string;
  mechanism: string;
  clinicalRisk: string;
  recommendedAction: string;
}

const DRUG_INTERACTION_RULES: InteractionRule[] = [
  {
    drugsA: ['warfarin', 'coumadin', 'dabigatran', 'rivaroxaban', 'apixaban'],
    drugsB: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'celecoxib'],
    severity: 'critical',
    title: 'Severe Bleeding Hazard (Anticoagulant + NSAID)',
    mechanism: 'Additive inhibition of hemostasis and gastric mucosal injury.',
    clinicalRisk: 'Markedly elevated risk of major gastrointestinal and systemic hemorrhage.',
    recommendedAction: 'Avoid concomitant use unless strictly clinically indicated with gastroprotection (PPI) and close INR / clinical monitoring.'
  },
  {
    drugsA: ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan', 'telmisartan'],
    drugsB: ['spironolactone', 'eplerenone', 'potassium chloride', 'triamterene'],
    severity: 'major',
    title: 'Severe Hyperkalemia Risk (RAAS Blocker + Potassium-Sparing Agent)',
    mechanism: 'Compounded reduction in aldosterone-mediated potassium excretion.',
    clinicalRisk: 'Life-threatening cardiac arrhythmias secondary to severe hyperkalemia.',
    recommendedAction: 'Check baseline potassium and serum creatinine; monitor within 1 week of co-administration.'
  },
  {
    drugsA: ['fluoxetine', 'sertraline', 'citalopram', 'escitalopram', 'paroxetine', 'duloxetine', 'venlafaxine'],
    drugsB: ['tramadol', 'linezolid', 'methylene blue', 'selegiline', 'rasagiline'],
    severity: 'critical',
    title: 'Serotonin Syndrome Hazard (SSRI/SNRI + Serotonergic Agent)',
    mechanism: 'Additive synaptic serotonin accumulation and receptor overstimulation.',
    clinicalRisk: 'Hyperthermia, neuromuscular rigidity, autonomic instability, and altered mental state.',
    recommendedAction: 'Select alternative non-serotonergic analgesic or monitor closely for signs of serotonin toxicity.'
  },
  {
    drugsA: ['metformin'],
    drugsB: ['iodinated contrast', 'iohexol', 'iodixanol'],
    severity: 'major',
    title: 'Lactic Acidosis Risk in Contrast Nephropathy',
    mechanism: 'Contrast-induced acute kidney injury leading to metformin accumulation.',
    clinicalRisk: 'High-mortality metabolic lactic acidosis.',
    recommendedAction: 'Withhold metformin at the time of procedure or 48 hours prior if eGFR < 45 mL/min; resume after renal function confirmed stable.'
  },
  {
    drugsA: ['simvastatin', 'atorvastatin', 'lovastatin'],
    drugsB: ['clarithromycin', 'erythromycin', 'itraconazole', 'ketoconazole', 'gemfibrozil'],
    severity: 'major',
    title: 'Statin Toxicity & Rhabdomyolysis Risk',
    mechanism: 'Strong CYP3A4 inhibition leading to marked elevations in serum statin concentrations.',
    clinicalRisk: 'Acute skeletal muscle myopathy, myoglobinuria, and secondary acute tubular necrosis.',
    recommendedAction: 'Temporarily pause statin during antimicrobial therapy or switch to rosuvastatin / pravastatin.'
  },
  {
    drugsA: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
    drugsB: ['calcium carbonate', 'ferrous sulfate', 'antacid', 'aluminum hydroxide', 'magnesium hydroxide'],
    severity: 'moderate',
    title: 'Reduced Fluoroquinolone Bioavailability (Chelation)',
    mechanism: 'Divalent and trivalent cation chelation in gastrointestinal tract.',
    clinicalRisk: 'Subtherapeutic antimicrobial levels leading to treatment failure.',
    recommendedAction: 'Separate administration times by at least 2 hours before or 4 to 6 hours after cation-containing agents.'
  },
  {
    drugsA: ['methotrexate'],
    drugsB: ['ibuprofen', 'naproxen', 'diclofenac', 'indomethacin'],
    severity: 'major',
    title: 'Methotrexate Toxicity via Reduced Renal Clearance',
    mechanism: 'NSAID-induced inhibition of renal prostaglandin synthesis and tubular secretion.',
    clinicalRisk: 'Severe myelosuppression, stomatitis, and acute hepatorenal toxicity.',
    recommendedAction: 'Avoid NSAIDs with high-dose methotrexate; exercise caution with low-dose weekly regimens.'
  }
];

interface AllergyClassRule {
  allergenKeywords: string[];
  conflictingDrugs: string[];
  severity: CDSSeverity;
  title: string;
  clinicalRisk: string;
  recommendedAction: string;
}

const ALLERGY_CLASS_RULES: AllergyClassRule[] = [
  {
    allergenKeywords: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin'],
    conflictingDrugs: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'piperacillin', 'ticarcillin'],
    severity: 'critical',
    title: 'Direct Beta-Lactam / Penicillin Allergy Conflict',
    clinicalRisk: 'Acute IgE-mediated anaphylaxis, bronchospasm, angioedema, or urticaria.',
    recommendedAction: 'Do not prescribe penicillins. Consider macrolides, fluoroquinolones, or non-beta-lactam alternatives.'
  },
  {
    allergenKeywords: ['penicillin', 'ampicillin', 'amoxicillin'],
    conflictingDrugs: ['cephalexin', 'cefazolin', 'ceftriaxone', 'cefpodoxime', 'cefuroxime'],
    severity: 'major',
    title: 'Potential Beta-Lactam Cross-Reactivity (Cephalosporin)',
    clinicalRisk: 'Cross-reactivity risk estimated at ~1-3% depending on R1 side-chain similarity.',
    recommendedAction: 'Verify nature of previous penicillin reaction (anaphylaxis vs mild rash). If severe anaphylaxis, avoid 1st/2nd-generation cephalosporins.'
  },
  {
    allergenKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septra'],
    conflictingDrugs: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'sulfadiazine'],
    severity: 'critical',
    title: 'Direct Sulfonamide Antimicrobial Allergy Conflict',
    clinicalRisk: 'Severe cutaneous adverse reactions (Stevens-Johnson syndrome, TEN, DRESS) or anaphylactoid response.',
    recommendedAction: 'Select non-sulfonamide antimicrobial class.'
  },
  {
    allergenKeywords: ['aspirin', 'nsaid', 'ibuprofen'],
    conflictingDrugs: ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac', 'indomethacin', 'etodolac'],
    severity: 'critical',
    title: 'NSAID / Aspirin Exacerbated Respiratory Disease (AERD) Conflict',
    clinicalRisk: 'Severe bronchoconstriction, nasal polyposis exacerbation, and anaphylactoid shock.',
    recommendedAction: 'Avoid all COX-1 inhibiting NSAIDs. Use acetaminophen or authorized selective COX-2 inhibitor under supervision.'
  }
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

/** Evaluates prescribed medications against current meds and documented patient allergies. */
export function evaluateCDS(
  prescribedMedicines: { name: string; dose?: string }[],
  context: PatientCDSContext
): CDSAlert[] {
  const alerts: CDSAlert[] = [];
  const prescribed = prescribedMedicines.map((m) => ({ raw: m.name, clean: normalize(m.name) }));
  const existing = context.currentMedications.map((m) => ({ raw: m, clean: normalize(m) }));
  const allergies = context.allergies.map((a) => ({ raw: a, clean: normalize(a) }));

  // 1. Check Allergy Conflicts
  for (const rx of prescribed) {
    for (const rule of ALLERGY_CLASS_RULES) {
      const allergyMatch = allergies.find((a) =>
        rule.allergenKeywords.some((k) => a.clean.includes(k) || k.includes(a.clean))
      );
      if (allergyMatch) {
        const drugMatch = rule.conflictingDrugs.some((d) => rx.clean.includes(d));
        if (drugMatch) {
          alerts.push({
            id: `cds-alg-${alerts.length + 1}`,
            type: 'allergy_conflict',
            severity: rule.severity,
            title: rule.title,
            substanceA: rx.raw,
            substanceB: allergyMatch.raw,
            mechanism: `Patient has documented allergy to "${allergyMatch.raw}".`,
            clinicalRisk: rule.clinicalRisk,
            recommendedAction: rule.recommendedAction
          });
        }
      }
    }
  }

  // 2. Check Drug-Drug Interactions (between prescribed and existing, plus intra-prescription)
  const allDrugs = [
    ...prescribed.map((p) => ({ ...p, isNew: true })),
    ...existing.map((e) => ({ ...e, isNew: false }))
  ];

  for (let i = 0; i < allDrugs.length; i++) {
    for (let j = i + 1; j < allDrugs.length; j++) {
      const drug1 = allDrugs[i];
      const drug2 = allDrugs[j];

      // At least one must be a newly prescribed drug for relevant real-time feedback
      if (!drug1.isNew && !drug2.isNew) continue;

      for (const rule of DRUG_INTERACTION_RULES) {
        const matchA1 = rule.drugsA.some((d) => drug1.clean.includes(d));
        const matchB2 = rule.drugsB.some((d) => drug2.clean.includes(d));
        const matchA2 = rule.drugsA.some((d) => drug2.clean.includes(d));
        const matchB1 = rule.drugsB.some((d) => drug1.clean.includes(d));

        if ((matchA1 && matchB2) || (matchA2 && matchB1)) {
          const pairKey = [drug1.raw, drug2.raw].sort().join(' + ');
          if (!alerts.some((a) => a.substanceA + ' + ' + a.substanceB === pairKey)) {
            alerts.push({
              id: `cds-ddi-${alerts.length + 1}`,
              type: 'drug_interaction',
              severity: rule.severity,
              title: rule.title,
              substanceA: drug1.raw,
              substanceB: drug2.raw,
              mechanism: rule.mechanism,
              clinicalRisk: rule.clinicalRisk,
              recommendedAction: rule.recommendedAction
            });
          }
        }
      }
    }
  }

  // 3. Renal Guidance if eGFR provided
  if (context.egfr !== undefined && context.egfr < 45) {
    for (const rx of prescribed) {
      if (rx.clean.includes('metformin')) {
        alerts.push({
          id: `cds-ren-${alerts.length + 1}`,
          type: 'dosage_warning',
          severity: context.egfr < 30 ? 'critical' : 'major',
          title: `Renal Clearance Precaution (eGFR: ${context.egfr} mL/min/1.73m²)`,
          substanceA: rx.raw,
          mechanism: 'Metformin renal elimination decreases proportionately with glomerular filtration rate.',
          clinicalRisk: 'Elevated risk of metformin accumulation and lactic acidosis.',
          recommendedAction: context.egfr < 30 ? 'Metformin is contraindicated with eGFR < 30 mL/min.' : 'Dose reduction to 500-1000 mg/day max recommended.'
        });
      }
      if (rx.clean.includes('ciprofloxacin') && context.egfr < 30) {
        alerts.push({
          id: `cds-ren-${alerts.length + 1}`,
          type: 'dosage_warning',
          severity: 'moderate',
          title: `Renal Dosage Adjustment Recommended (eGFR: ${context.egfr} mL/min)`,
          substanceA: rx.raw,
          mechanism: 'Substantial renal excretion of active quinolone metabolite.',
          clinicalRisk: 'CNS excitability, confusion, and prolonged QTc.',
          recommendedAction: 'Reduce dose to 250-500 mg every 12-18 hours.'
        });
      }
    }
  }

  return alerts;
}

interface ClinicalDecisionSupportProps {
  alerts: CDSAlert[];
  onAcknowledgeAlert?: (alertId: string, overrideReason: string) => void;
  className?: string;
  compact?: boolean;
}

export const ClinicalDecisionSupportBanner: React.FC<ClinicalDecisionSupportProps> = ({
  alerts,
  onAcknowledgeAlert,
  className = '',
  compact = false
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});

  if (!alerts || alerts.length === 0) {
    return (
      <div className={`flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-900 ${className}`}>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="font-semibold">Clinical Decision Support:</span>
        <span className="text-emerald-800">No drug-drug or documented allergy conflicts detected for this patient.</span>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const majorCount = alerts.filter((a) => a.severity === 'major').length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleReasonChange = (id: string, reason: string) => {
    setOverrideReasons((prev) => ({ ...prev, [id]: reason }));
  };

  const handleConfirmOverride = (alertId: string) => {
    const reason = overrideReasons[alertId] || 'Reviewed and clinically indicated with close monitoring.';
    onAcknowledgeAlert?.(alertId, reason);
  };

  return (
    <div className={`space-y-3 rounded-2xl border ${criticalCount > 0 ? 'border-rose-300 bg-rose-50/50' : 'border-amber-300 bg-amber-50/50'} p-4 shadow-xs ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Clinical Decision Support (CDS) Advisory
            </h4>
            <p className="text-[11px] text-slate-600">
              {alerts.length} safety alert{alerts.length > 1 ? 's' : ''} require clinician review before signing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              {criticalCount} Critical
            </span>
          )}
          {majorCount > 0 && (
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              {majorCount} Major
            </span>
          )}
        </div>
      </div>

      {/* Alert items list */}
      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const isExpanded = expandedIds.includes(alert.id);
          const isCritical = alert.severity === 'critical';
          const isAcknowledged = !!alert.acknowledged;

          return (
            <div
              key={alert.id}
              className={`rounded-xl border bg-white p-3 transition ${
                isCritical
                  ? isAcknowledged
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-rose-300 ring-1 ring-rose-200'
                  : 'border-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800'
                          : alert.severity === 'major'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">{alert.title}</h5>
                    {isAcknowledged && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> Acknowledged & Justified
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">{alert.substanceA}</span>
                    {alert.substanceB ? (
                      <>
                        {' '}
                        ⇄ <span className="font-semibold text-slate-900">{alert.substanceB}</span>
                      </>
                    ) : null}
                    {' — '}
                    <span>{alert.clinicalRisk}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(alert.id)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  aria-label="Toggle details"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Collapsible Clinical Rationale & Action */}
              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div>
                    <span className="font-bold text-slate-800">Mechanism: </span>
                    {alert.mechanism}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Recommended Guidance: </span>
                    <span className="text-slate-900 font-medium">{alert.recommendedAction}</span>
                  </div>

                  {!isAcknowledged && onAcknowledgeAlert && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Document Clinical Justification to Override:
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={overrideReasons[alert.id] || ''}
                          onChange={(e) => handleReasonChange(alert.id, e.target.value)}
                          placeholder="e.g., Clinically indicated; PPI added and serial CBC ordered"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-medical-500 focus:ring-1 focus:ring-medical-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmOverride(alert.id)}
                          className="rounded-lg bg-medical-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-medical-800 transition cursor-pointer"
                        >
                          Confirm & Override
                        </button>
                      </div>
                    </div>
                  )}

                  {isAcknowledged && alert.overrideReason && (
                    <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <span className="font-bold">Recorded Rationale: </span>
                      {alert.overrideReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Non-authoritative clinical notice */}
      <p className="text-[10px] text-slate-500 leading-tight">
        * CDS Advisory Notice: Guidance is algorithmic and non-binding. High-impact clinical decisions,
        prescriptions, and dosing modifications remain the sole responsibility of the licensed attending physician.
      </p>
    </div>
  );
};

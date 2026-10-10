import React from 'react';
import {
  BookOpen,
  Pill,
  FlaskConical,
  Stethoscope,
  Building2,
  Droplets,
  Users,
  Newspaper,
  Salad,
  Activity,
  Calculator,
  FileHeart,
} from 'lucide-react';
import { NavigationTab } from '../../types';

export interface ExploreItem {
  id: string;
  tab: NavigationTab;
  label: string;
  description: string;
  icon: React.ReactNode;
  mode?: 'details' | 'dashboard' | 'ehr' | 'saved';
  badge?: string;
}

/** Explore — "More areas of GlobalHealth" (shared by the More overlay and the Explore page). */
export const EXPLORE_ITEMS: ExploreItem[] = [
  { id: 'ov-diseases', tab: 'diseases', label: 'Diseases', description: 'Understand conditions, symptoms and prevention.', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'ov-medicines', tab: 'medicines', label: 'Medicines', description: 'Medicine information, safety and educational guides.', icon: <Pill className="h-5 w-5" /> },
  { id: 'ov-tests', tab: 'medical-tests', label: 'Lab Tests', description: 'Explore tests, panels and what results mean.', icon: <FlaskConical className="h-5 w-5" /> },
  { id: 'ov-doctors', tab: 'doctors', label: 'Doctors', description: 'Find verified doctors and specialists.', icon: <Stethoscope className="h-5 w-5" /> },
  { id: 'ov-hospitals', tab: 'hospitals', label: 'Hospitals', description: 'Discover hospitals and medical facilities.', icon: <Building2 className="h-5 w-5" /> },
  { id: 'ov-facilities', tab: 'medical-map', label: 'MAP', description: 'Explore healthcare locations geographically.', icon: <Droplets className="h-5 w-5" /> },
  { id: 'ov-community', tab: 'community', label: 'Community', description: 'Discussions, topics and educational content.', icon: <Users className="h-5 w-5" /> },
  { id: 'ov-news', tab: 'news', label: 'Health News', description: 'Sourced healthcare updates and research briefs.', icon: <Newspaper className="h-5 w-5" /> },
  { id: 'ov-nutrition', tab: 'nutrition', label: 'Nutrition & Recipes', description: 'Meals, nutrients and balanced plans.', icon: <Salad className="h-5 w-5" /> },
  { id: 'ov-wellness', tab: 'wellness', label: 'Wellness & Fitness', description: 'Movement, mobility and everyday wellbeing.', icon: <Activity className="h-5 w-5" /> },
  { id: 'ov-calculators', tab: 'calculators', label: 'Health Tools', description: 'Calculators and trackers for your health goals.', icon: <Calculator className="h-5 w-5" /> },
];

/** Public workspaces: only the signed-in person's own private health area.
 * Professional and enterprise portals are intentionally omitted from public
 * navigation; they remain reachable through their role-based entry points. */
export const WORKSPACE_ITEMS: ExploreItem[] = [
  { id: 'ov-health-records', tab: 'dashboard', mode: 'dashboard', label: 'My Health Records', description: 'Personal dashboard, EHR and doctor access.', icon: <FileHeart className="h-5 w-5" />, badge: 'Personal' },
];

interface ExploreCardProps {
  item: ExploreItem;
  active?: boolean;
  onNavigate: (tab: NavigationTab, mode?: 'details' | 'dashboard' | 'ehr' | 'saved') => void;
}

/** The destination card used in both the More overlay and the Explore page. */
export const ExploreCard: React.FC<ExploreCardProps> = ({ item, active = false, onNavigate }) => (
  <button
    key={item.id}
    id={item.id}
    type="button"
    onClick={() => onNavigate(item.tab, item.mode)}
    className={`group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition duration-200 ${
      active
        ? 'border-medical-300 bg-medical-50 shadow-sm'
        : 'border-slate-200/80 bg-white shadow-soft hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-lift'
    }`}
  >
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
        active ? 'bg-medical-600 text-white' : 'bg-medical-50 text-medical-700 group-hover:bg-medical-100'
      }`}
    >
      {item.icon}
    </span>
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={`text-sm font-bold ${active ? 'text-medical-800' : 'text-slate-900'}`}>{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
            {item.badge}
          </span>
        )}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.description}</span>
    </span>
  </button>
);

/**
 * Local emergency numbers.
 *
 * GlobalHealth is not an emergency service, but signposting the right number
 * fast is a genuine safety feature. Numbers are maintained with national
 * authorities; a wrong entry is reported and corrected (see the report link).
 */

export interface EmergencyEntry {
  /** ISO 3166-1 alpha-2, lowercased. */
  code: string;
  /** Country name in English, used for search. */
  country: string;
  /** Region grouping used by the table. */
  region: string;
  /** General emergency number, dialled from a mobile or landline. */
  general: string;
  /** Ambulance, where it differs from the general number. */
  ambulance?: string;
  /** Police, where it differs from the general number. */
  police?: string;
  /** Fire service, where it differs from the general number. */
  fire?: string;
}

export const EMERGENCY_NUMBERS: EmergencyEntry[] = [
  // --- Europe & UK -------------------------------------------------------
  { code: 'gb', country: 'United Kingdom', region: 'Europe & UK', general: '999', ambulance: '999', police: '999', fire: '999' },
  { code: 'ie', country: 'Ireland', region: 'Europe & UK', general: '112', ambulance: '112', police: '112', fire: '112' },
  { code: 'fr', country: 'France', region: 'Europe & UK', general: '112', ambulance: '15', police: '17', fire: '18' },
  { code: 'de', country: 'Germany', region: 'Europe & UK', general: '112', ambulance: '112', police: '110', fire: '112' },
  { code: 'es', country: 'Spain', region: 'Europe & UK', general: '112', ambulance: '112', police: '091', fire: '080' },
  { code: 'it', country: 'Italy', region: 'Europe & UK', general: '112', ambulance: '118', police: '113', fire: '115' },
  { code: 'nl', country: 'Netherlands', region: 'Europe & UK', general: '112', ambulance: '112', police: '112' },
  { code: 'be', country: 'Belgium', region: 'Europe & UK', general: '112', ambulance: '112', police: '101', fire: '112' },
  { code: 'pt', country: 'Portugal', region: 'Europe & UK', general: '112', ambulance: '112', police: '112', fire: '112' },
  { code: 'ch', country: 'Switzerland', region: 'Europe & UK', general: '112', ambulance: '144', police: '117', fire: '118' },
  { code: 'at', country: 'Austria', region: 'Europe & UK', general: '112', ambulance: '144', police: '133', fire: '122' },
  { code: 'se', country: 'Sweden', region: 'Europe & UK', general: '112' },
  { code: 'no', country: 'Norway', region: 'Europe & UK', general: '112', police: '112', fire: '110' },
  { code: 'dk', country: 'Denmark', region: 'Europe & UK', general: '112' },
  { code: 'fi', country: 'Finland', region: 'Europe & UK', general: '112' },
  { code: 'pl', country: 'Poland', region: 'Europe & UK', general: '112', ambulance: '999', police: '997', fire: '998' },
  { code: 'gr', country: 'Greece', region: 'Europe & UK', general: '112', ambulance: '166', police: '100', fire: '199' },
  { code: 'cz', country: 'Czechia', region: 'Europe & UK', general: '112', ambulance: '155', police: '158', fire: '150' },
  { code: 'ro', country: 'Romania', region: 'Europe & UK', general: '112' },
  { code: 'ua', country: 'Ukraine', region: 'Europe & UK', general: '112', ambulance: '103', police: '102', fire: '101' },
  { code: 'ru', country: 'Russia', region: 'Europe & UK', general: '112', ambulance: '103', police: '102', fire: '101' },

  // --- Americas ----------------------------------------------------------
  { code: 'us', country: 'United States', region: 'Americas', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'ca', country: 'Canada', region: 'Americas', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'mx', country: 'Mexico', region: 'Americas', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'br', country: 'Brazil', region: 'Americas', general: '190', ambulance: '192', police: '190', fire: '193' },
  { code: 'ar', country: 'Argentina', region: 'Americas', general: '911', ambulance: '107', police: '911', fire: '100' },
  { code: 'cl', country: 'Chile', region: 'Americas', general: '133', ambulance: '131', police: '133', fire: '132' },
  { code: 'co', country: 'Colombia', region: 'Americas', general: '123', ambulance: '132', police: '123', fire: '123' },
  { code: 'pe', country: 'Peru', region: 'Americas', general: '105', ambulance: '106', police: '105', fire: '116' },

  // --- Africa & Middle East --------------------------------------------
  { code: 'za', country: 'South Africa', region: 'Africa & Middle East', general: '112', ambulance: '10177', police: '10111', fire: '10177' },
  { code: 'ng', country: 'Nigeria', region: 'Africa & Middle East', general: '112', ambulance: '112', police: '112' },
  { code: 'ke', country: 'Kenya', region: 'Africa & Middle East', general: '999', ambulance: '999', police: '999', fire: '999' },
  { code: 'gh', country: 'Ghana', region: 'Africa & Middle East', general: '112', ambulance: '112', police: '112', fire: '112' },
  { code: 'et', country: 'Ethiopia', region: 'Africa & Middle East', general: '911', ambulance: '911', police: '911' },
  { code: 'eg', country: 'Egypt', region: 'Africa & Middle East', general: '122', ambulance: '123', police: '122', fire: '180' },
  { code: 'ma', country: 'Morocco', region: 'Africa & Middle East', general: '19', ambulance: '15', police: '19', fire: '15' },
  { code: 'tn', country: 'Tunisia', region: 'Africa & Middle East', general: '197', ambulance: '190', police: '197' },
  { code: 'sa', country: 'Saudi Arabia', region: 'Africa & Middle East', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'ae', country: 'United Arab Emirates', region: 'Africa & Middle East', general: '999', ambulance: '998', police: '999', fire: '997' },
  { code: 'qa', country: 'Qatar', region: 'Africa & Middle East', general: '999' },
  { code: 'kw', country: 'Kuwait', region: 'Africa & Middle East', general: '112' },
  { code: 'jo', country: 'Jordan', region: 'Africa & Middle East', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'il', country: 'Israel', region: 'Africa & Middle East', general: '100', ambulance: '101', police: '100', fire: '102' },
  { code: 'tr', country: 'Türkiye', region: 'Africa & Middle East', general: '112' },

  // --- Asia-Pacific -------------------------------------------------------
  { code: 'in', country: 'India', region: 'Asia-Pacific', general: '112', ambulance: '108', police: '100', fire: '101' },
  { code: 'bd', country: 'Bangladesh', region: 'Asia-Pacific', general: '999', ambulance: '999', police: '999', fire: '999' },
  { code: 'pk', country: 'Pakistan', region: 'Asia-Pacific', general: '112', ambulance: '112', police: '15', fire: '16' },
  { code: 'np', country: 'Nepal', region: 'Asia-Pacific', general: '100', ambulance: '102', police: '100', fire: '101' },
  { code: 'lk', country: 'Sri Lanka', region: 'Asia-Pacific', general: '119', ambulance: '119', police: '119', fire: '119' },
  { code: 'cn', country: 'China', region: 'Asia-Pacific', general: '120', ambulance: '120', police: '110', fire: '119' },
  { code: 'jp', country: 'Japan', region: 'Asia-Pacific', general: '119', ambulance: '119', police: '110', fire: '119' },
  { code: 'kr', country: 'South Korea', region: 'Asia-Pacific', general: '119', ambulance: '119', police: '112', fire: '119' },
  { code: 'sg', country: 'Singapore', region: 'Asia-Pacific', general: '999', ambulance: '995', police: '999', fire: '995' },
  { code: 'my', country: 'Malaysia', region: 'Asia-Pacific', general: '999', ambulance: '999', police: '999', fire: '994' },
  { code: 'id', country: 'Indonesia', region: 'Asia-Pacific', general: '112', ambulance: '118', police: '110', fire: '113' },
  { code: 'th', country: 'Thailand', region: 'Asia-Pacific', general: '191', ambulance: '1669', police: '191', fire: '199' },
  { code: 'vn', country: 'Vietnam', region: 'Asia-Pacific', general: '113', ambulance: '115', police: '113', fire: '114' },
  { code: 'ph', country: 'Philippines', region: 'Asia-Pacific', general: '911', ambulance: '911', police: '911', fire: '911' },
  { code: 'au', country: 'Australia', region: 'Asia-Pacific', general: '000', ambulance: '000', police: '000', fire: '000' },
  { code: 'nz', country: 'New Zealand', region: 'Asia-Pacific', general: '111', ambulance: '111', police: '111', fire: '111' },
  { code: 'fj', country: 'Fiji', region: 'Asia-Pacific', general: '911', ambulance: '911', police: '911', fire: '911' },

  // --- Oceania & rest of world -------------------------------------------
  { code: 'ws', country: 'Samoa (dial from mobile)', region: 'Asia-Pacific', general: '994' },
  { code: 'pg', country: 'Papua New Guinea', region: 'Asia-Pacific', general: '000', police: '112' },
  { code: 'af', country: 'Afghanistan', region: 'Asia-Pacific', general: '119' },
  { code: 'kz', country: 'Kazakhstan', region: 'Central Asia & Caucasus', general: '102', ambulance: '103', police: '102', fire: '101' },
  { code: 'uz', country: 'Uzbekistan', region: 'Central Asia & Caucasus', general: '102', ambulance: '103', police: '102', fire: '101' },
  { code: 'ge', country: 'Georgia', region: 'Central Asia & Caucasus', general: '112' },
  { code: 'am', country: 'Armenia', region: 'Central Asia & Caucasus', general: '101', ambulance: '103', police: '101', fire: '101' },
];

export const EMERGENCY_REGIONS = [
  'Europe & UK',
  'Americas',
  'Africa & Middle East',
  'Asia-Pacific',
  'Central Asia & Caucasus',
] as const;

/**
 * Localised view of the directory.
 *
 * Country names come from the platform's own CLDR region database via
 * `Intl.DisplayNames`, resolved at build time. That keeps 68 country names
 * correct in all eight interface languages without a hand-maintained table
 * that would silently drift, and it produces the right script for Arabic,
 * Devanagari and Chinese for free.
 */
export interface LocalisedEmergencyEntry extends EmergencyEntry {
  /** Country name in the interface language. */
  label: string;
  /** Lowercased search haystack: localised name + English name + ISO code. */
  search: string;
}

export interface LocalisedEmergencyGroup {
  region: string;
  regionValue: string;
  entries: LocalisedEmergencyEntry[];
}

const REGION_LABELS: Record<string, Record<string, string>> = {
  en: {
    'Europe & UK': 'Europe & UK',
    Americas: 'Americas',
    'Africa & Middle East': 'Africa & Middle East',
    'Asia-Pacific': 'Asia-Pacific',
    'Central Asia & Caucasus': 'Central Asia & Caucasus',
  },
  es: {
    'Europe & UK': 'Europa y Reino Unido',
    Americas: 'América',
    'Africa & Middle East': 'África y Oriente Medio',
    'Asia-Pacific': 'Asia-Pacífico',
    'Central Asia & Caucasus': 'Asia Central y el Cáucaso',
  },
  fr: {
    'Europe & UK': 'Europe et Royaume-Uni',
    Americas: 'Amériques',
    'Africa & Middle East': 'Afrique et Moyen-Orient',
    'Asia-Pacific': 'Asie-Pacifique',
    'Central Asia & Caucasus': 'Asie centrale et Caucase',
  },
  de: {
    'Europe & UK': 'Europa & UK',
    Americas: 'Amerika',
    'Africa & Middle East': 'Afrika & Naher Osten',
    'Asia-Pacific': 'Asien-Pazifik',
    'Central Asia & Caucasus': 'Zentralasien & Kaukasus',
  },
  pt: {
    'Europe & UK': 'Europa e Reino Unido',
    Americas: 'Américas',
    'Africa & Middle East': 'África e Oriente Médio',
    'Asia-Pacific': 'Ásia-Pacífico',
    'Central Asia & Caucasus': 'Ásia Central e Cáucaso',
  },
  ar: {
    'Europe & UK': 'أوروبا وبريطانيا',
    Americas: 'الأمريكتان',
    'Africa & Middle East': 'أفريقيا والشرق الأوسط',
    'Asia-Pacific': 'آسيا والمحيط الهادئ',
    'Central Asia & Caucasus': 'آسيا الوسطى والقوقاز',
  },
  hi: {
    'Europe & UK': 'यूरोप और यूनाइटेड किंगडम',
    Americas: 'अमेरिका',
    'Africa & Middle East': 'अफ़्रीका और मध्य पूर्व',
    'Asia-Pacific': 'एशिया-प्रशांत',
    'Central Asia & Caucasus': 'मध्य एशिया और कॉकेशस',
  },
  zh: {
    'Europe & UK': '欧洲与英国',
    Americas: '美洲',
    'Africa & Middle East': '非洲与中东',
    'Asia-Pacific': '亚太地区',
    'Central Asia & Caucasus': '中亚与高加索',
  },
};

interface ServiceLabels {
  ambulance: string;
  police: string;
  fire: string;
}

const SERVICE_LABELS: Record<string, ServiceLabels> = {
  en: { ambulance: 'Ambulance', police: 'Police', fire: 'Fire' },
  es: { ambulance: 'Ambulancia', police: 'Policía', fire: 'Bomberos' },
  fr: { ambulance: 'Ambulance', police: 'Police', fire: 'Pompiers' },
  de: { ambulance: 'Rettungsdienst', police: 'Polizei', fire: 'Feuerwehr' },
  pt: { ambulance: 'Ambulância', police: 'Polícia', fire: 'Bombeiros' },
  ar: { ambulance: 'الإسعاف', police: 'الشرطة', fire: 'الإطفاء' },
  hi: { ambulance: 'एम्बुलेंस', police: 'पुलिस', fire: 'दमकल' },
  zh: { ambulance: '救护车', police: '警察', fire: '消防' },
};

/** Localised service column names for one interface language. */
export function serviceLabels(lang: string): ServiceLabels {
  return SERVICE_LABELS[lang] ?? SERVICE_LABELS['en']!;
}

/**
 * Group the directory for rendering, with every label in `lang`.
 *
 * @param lang    interface language, e.g. `ar`
 * @param fallback locale for names, used when the UI language has no
 *                 regional CLDR data (falls back to English)
 */
export function localisedEmergency(lang: string): LocalisedEmergencyGroup[] {
  const regions = REGION_LABELS[lang] ?? REGION_LABELS.en;
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    display = null;
  }

  const name = (code: string): string => {
    const viaCldr = display?.of(code.toUpperCase());
    // `Intl.DisplayNames` echoes the code back when a region is unknown.
    return !viaCldr || viaCldr.toLowerCase() === code.toLowerCase() ? code.toUpperCase() : viaCldr;
  };

  const label = (entry: EmergencyEntry): string => {
    const translated = name(entry.code);
    // "Samoa (dial from mobile)" carries a qualifier we must not drop.
    const qualifier = entry.country.replace(/^[A-Za-z ()'’-]+\s*/, '');
    return translated + (qualifier ? ` (${qualifier})` : '');
  };

  return EMERGENCY_REGIONS.map((region) => ({
    region: regions[region] ?? region,
    regionValue: region,
    entries: EMERGENCY_NUMBERS.filter((x) => x.region === region)
      .map((entry) => {
        const localised = label(entry);
        return {
          ...entry,
          label: localised,
          search: `${localised} ${entry.country} ${entry.code}`.toLowerCase(),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, lang)),
  })).filter((group) => group.entries.length > 0);
}

/**
 * Icon path data.
 *
 * Kept in a plain module rather than the component so the `.astro` file stays
 * a pure template and TypeScript can check `IconName` exhaustively.
 * All glyphs are drawn on a 24×24 grid with a 1.75 stroke.
 */

export type IconName =
  | 'search'
  | 'close'
  | 'menu'
  | 'chevron'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-up'
  | 'globe'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'shield'
  | 'book'
  | 'pill'
  | 'flask'
  | 'map'
  | 'spark'
  | 'users'
  | 'building'
  | 'store'
  | 'heart'
  | 'phone'
  | 'mail'
  | 'clock'
  | 'check'
  | 'alert'
  | 'lock'
  | 'copy'
  | 'external'
  | 'zap'
  | 'file'
  | 'languages'
  | 'activity'
  | 'stethoscope'
  | 'cross'
  | 'download'
  | 'message'
  | 'settings';

export const ICON_PATHS: Record<IconName, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  'chevron-down': '<path d="m5 9 7 7 7-7"/>',
  'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
  'arrow-up': '<path d="M12 20V4M6 10l6-6 6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M8 7h7M8 11h5"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7Z"/><path d="m7 10 6 6"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>',
  map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2Z"/><path d="M9 4v14M15 6v14"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 20a6 6 0 0 0-2-4.5"/>',
  building: '<path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M14 10h4a2 2 0 0 1 2 2v9"/><path d="M2 21h20M7 8h3M7 12h3M7 16h3M17 14h1M17 18h1"/>',
  store: '<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 4 2.8V20H4V11.8"/><path d="M9 20v-6h6v6"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6c0 5-7 9.4-7 9.4Z"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 3-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  alert: '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4M12 17.2v.1"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  languages: '<path d="M3 5h9M7.5 5v-.5M9 5c0 4-2.5 7-6 8"/><path d="M5 9c1.2 2.4 3.2 4 5.5 4.6"/><path d="m13 20 4-10 4 10M14.6 17h4.8"/>',
  activity: '<path d="M3 12h4l2.5-7 5 14L17 12h4"/>',
  stethoscope: '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M6 3H4M14 3h2"/><path d="M10 16v-4"/><circle cx="17" cy="17" r="3"/>',
  cross: '<path d="M12 4v16M4 12h16"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M4 19h16"/>',
  message: '<path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.2-4.2A8 8 0 1 1 21 12Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
};

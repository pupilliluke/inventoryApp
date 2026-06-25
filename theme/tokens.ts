import { Platform } from 'react-native';

/**
 * Design tokens for an industrial warehouse inventory tool.
 *
 * Aesthetic goals:
 *  - Tabular, data-dense, like an operations console — not a consumer app.
 *  - Sharp geometry: hairline borders instead of drop shadows, minimal radius.
 *  - Cool slate/steel neutrals with a single steel-blue accent and functional
 *    status colors only.
 *  - Monospace for codes and quantities to reinforce the data-grid feel.
 */

export const color = {
  // Surfaces
  appBg: '#e9ecf0',        // page background (cool light gray)
  surface: '#ffffff',      // panels, rows, inputs
  surfaceAlt: '#f4f6f8',   // zebra rows, subtle fills, header cells
  surfaceSunken: '#eef1f4',// read-only / disabled fields

  // Industrial header / chrome
  chrome: '#1e293b',       // dark slate top bars
  chromeAlt: '#0f172a',    // darker slate (sign-in / selection background)
  onChrome: '#f1f5f9',     // text on dark chrome
  onChromeMuted: '#94a3b8',

  // Borders (hairlines)
  border: '#cbd2db',
  borderStrong: '#9aa6b4',
  borderFocus: '#1f5d99',

  // Text
  text: '#1c2530',         // primary
  textSecondary: '#52606d',
  textMuted: '#8a94a1',
  textInverse: '#ffffff',

  // Single accent (interactive / active / selected)
  accent: '#1f5d99',       // steel blue
  accentBg: '#e4edf5',     // tinted accent fill (selected rows/chips)
  accentBorder: '#9bbada',

  // Functional status
  positive: '#1f7a43',     // increases / checked / success
  positiveBg: '#e3f1e8',
  negative: '#b4231b',     // decreases / delete / errors
  negativeBg: '#f7e4e2',
  warning: '#9a5b06',      // clear / no-count / caution
  warningBg: '#f6ebd9',
  neutral: '#52606d',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Deliberately small — sharp, not pill-shaped.
export const radius = {
  none: 0,
  sm: 2,
  md: 3,
} as const;

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace",
}) as string;

export const font = {
  // Section / column labels: uppercase, tracked, small.
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: color.textSecondary,
  },
  // Screen / panel titles.
  title: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    color: color.text,
  },
  // Primary body / values.
  body: {
    fontSize: 14,
    color: color.text,
  },
  // Monospace data (codes, quantities).
  data: {
    fontFamily: mono,
    fontSize: 14,
    color: color.text,
  },
} as const;

/** Hairline border shorthand. */
export const hairline = {
  borderWidth: 1,
  borderColor: color.border,
} as const;

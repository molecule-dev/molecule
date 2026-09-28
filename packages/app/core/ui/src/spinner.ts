/**
 * The molecule spinner mark — the platform's animated loading glyph, as one
 * framework-agnostic SVG string.
 *
 * This module is the SINGLE source of truth for the mark's geometry, motion
 * and paint. Every surface that spins it — the IDE app's `MoleculeSpinner`,
 * the AI streaming indicator (`@molecule/app-ide-react`), and the "Built with
 * Molecule.dev" attribution badge injected into deployed apps — renders
 * {@link moleculeSpinnerMarkSvg} output rather than keeping a copy. Before
 * this existed, four hand-maintained copies drifted into three different
 * looks; if you are tempted to inline this SVG somewhere, import this instead.
 *
 * @remarks
 * **What it renders** — a complete `<svg>…</svg>` element string driven by
 * SMIL (no JS runtime, no CSS keyframes), safe to inject with
 * `innerHTML`/`insertAdjacentHTML` in any framework or none:
 * - a 3-phase atom-swap cycle (one outer atom exchanges with the hub per
 *   phase; the connecting bond fades for the swap);
 * - a slow hub-centered whole-figure rotation;
 * - paint: a seamless one-way blue gradient flow on the bonds plus a warm
 *   glint on each atom — an opaque light→blue base stroke with a peach
 *   head overlay whose ELEMENT opacity ignites exactly while that atom is
 *   in flight (keyed to the same keyTimes/easing as the motion) — or a
 *   plain `currentColor` outline via `paint: 'mono'`.
 *
 * **Gotchas a weak executor gets wrong:**
 * - `gradientId` must be unique per rendered instance on a page — two svgs
 *   sharing one id cross-reference each other's gradients. React wrappers
 *   should pass something derived from `useId()` (strip `:` first).
 * - Default colors are CSS-var-with-fallback strings
 *   (`var(--mol-spin-blue, #4f86f0)`), which theme via `--mol-spin-*` where
 *   they exist (e.g. the molecule.dev landing page) and fall back to the
 *   literal palette elsewhere. Injected into third-party pages (the
 *   attribution badge) they must be overridden with literal hexes — the vars
 *   do not exist there.
 * - The glyph matrix x-translate (`-.78879`) deliberately differs from the
 *   static favicon's (`.81594`): it puts the molecule's hub exactly on the
 *   rotation center (16,16) so the spin never wobbles. Do not "fix" it.
 * - `ariaLabel` produces `role="status"`; omit it for decorative uses, which
 *   get `aria-hidden="true"` instead. Never emit both.
 *
 * @example
 * ```ts
 * import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'
 *
 * // themed, unique per instance
 * const svg = moleculeSpinnerMarkSvg({ size: 24, gradientId: 'spin-1', ariaLabel: 'Loading' })
 *
 * // monochrome, inherits the surrounding text color
 * const mono = moleculeSpinnerMarkSvg({ size: 16, paint: 'mono' })
 *
 * // third-party page (no --mol-spin-* vars): literal colors, CSS-sized
 * const badge = moleculeSpinnerMarkSvg({
 *   gradientId: 'mol-badge-grad',
 *   className: 'mol-badge-mark',
 *   colors: { blue: '#4f86f0', light: '#6e9bf5', peach: '#e0975a' },
 * })
 * ```
 *
 * @module
 */

/** The mark's timings, in CSS duration strings. Swap cycle → glint cycle. */
export interface MoleculeSpinnerTimings {
  /** One full 3-phase atom-swap cycle (also drives bond fades + glints). */
  dur: string
  /** Whole-figure rotation. Keep at two swap cycles for the intended feel. */
  spin: string
  /** Bond gradient flow period (one full translate across the figure). */
  flow: string
}

/** Gradient-mode colors. Any CSS color string, including `var()` forms. */
export interface MoleculeSpinnerColors {
  /** Bond base / glint tail color. */
  blue?: string
  /** Flow highlight / glint head color at rest. */
  light?: string
  /** Glint ignition color while an atom is in flight. */
  peach?: string
}

/** Options for {@link moleculeSpinnerMarkSvg}. */
export interface MoleculeSpinnerMarkOptions {
  /** Motion timings; defaults to the shipped design (2.5s / 5s / 3s). */
  timings?: Partial<MoleculeSpinnerTimings>
  /** `gradient` (default) or `mono` — plain `currentColor` outline, no defs. */
  paint?: 'gradient' | 'mono'
  /** Gradient-mode colors; default the `var(--mol-spin-*, fallback)` set. */
  colors?: MoleculeSpinnerColors
  /**
   * Gradient id for url() references. Must be unique per rendered instance
   * on a page. Defaults to `mol-spinner-gradient`.
   */
  gradientId?: string
  /** Pixel size baked into width/height; omit when CSS sizes the svg. */
  size?: number
  /** Class attribute for the svg element. */
  className?: string
  /** Inline style attribute (already serialized, e.g. `color:re$d`). */
  style?: string
  /** Announce as `role="status"` with this label; omit for `aria-hidden`. */
  ariaLabel?: string
}

const DEFAULT_TIMINGS: MoleculeSpinnerTimings = {
  dur: '2.5s',
  spin: '5s',
  flow: '3s',
}

const DEFAULT_COLORS: Required<MoleculeSpinnerColors> = {
  blue: 'var(--mol-spin-blue, #4f86f0)',
  light: 'var(--mol-spin-blue-light, #6e9bf5)',
  peach: 'var(--mol-spin-peach, #e0975a)',
}

const EASE = '0.42 0 0.58 1'
const LIN = '0 0 1 1'

/** Bond fade keyframes, one per phase, phase-locked to the swap they serve. */
const BONDS = [
  {
    // Center–Left — fades during Phase 1
    x1: 16.494,
    x2: 8.563,
    y1: 16,
    y2: 16,
    values: '1;0;0;1;1',
    keyTimes: '0;0.033;0.167;0.217;1',
    keySplines: [EASE, LIN, EASE, LIN].join(';'),
  },
  {
    // Center–Bottom-right — fades during Phase 2
    x1: 20.959,
    x2: 24.924,
    y1: 18.579,
    y2: 25.446,
    values: '1;1;0;0;1;1',
    keyTimes: '0;0.333;0.367;0.500;0.550;1',
    keySplines: [LIN, EASE, LIN, EASE, LIN].join(';'),
  },
  {
    // Center–Top-right — fades during Phase 3
    x1: 20.959,
    x2: 24.924,
    y1: 13.422,
    y2: 6.555,
    values: '1;1;0;0;1;1',
    keyTimes: '0;0.667;0.700;0.833;0.883;1',
    keySplines: [LIN, EASE, LIN, EASE, LIN].join(';'),
  },
] as const

/**
 * Atom swap trajectories: cx/cy keyframe lists per atom, plus the glint pulse
 * for its gradient (LIGHT at rest, peach at each flight's midpoint — the same
 * anchors and easing the position animation uses, so the glint is frame-locked
 * to every swap). Atoms are visually identical, so the loop-boundary jump is
 * imperceptible.
 */
const ATOMS = [
  {
    // Center → Left (Phase 1), holds
    cx: 19.47,
    cy: 16,
    cxValues: '19.47;19.47;5.587;5.587',
    cyValues: null,
    keyTimes: '0;0.033;0.167;1',
    keySplines: [LIN, EASE, LIN].join(';'),
    glintValues: [1, 1, 0, 1, 1], // indexes into [light, peach]
    glintKeyTimes: '0;0.033;0.1;0.167;1',
    glintSplines: [LIN, EASE, EASE, LIN].join(';'),
  },
  {
    // Left → Center (Phase 1), Center → BR (Phase 2), holds
    cx: 5.587,
    cy: 16,
    cxValues: '5.587;5.587;19.47;19.47;26.412;26.412',
    cyValues: '16;16;16;16;28.023;28.023',
    keyTimes: '0;0.033;0.167;0.367;0.500;1',
    keySplines: [LIN, EASE, LIN, EASE, LIN].join(';'),
    glintValues: [1, 1, 0, 1, 1, 0, 1, 1],
    glintKeyTimes: '0;0.033;0.1;0.167;0.367;0.434;0.5;1',
    glintSplines: [LIN, EASE, EASE, LIN, EASE, EASE, LIN].join(';'),
  },
  {
    // BR → Center (Phase 2), Center → TR (Phase 3), holds
    cx: 26.412,
    cy: 28.023,
    cxValues: '26.412;26.412;19.47;19.47;26.412;26.412',
    cyValues: '28.023;28.023;16;16;3.977;3.977',
    keyTimes: '0;0.367;0.500;0.700;0.833;1',
    keySplines: [LIN, EASE, LIN, EASE, LIN].join(';'),
    glintValues: [1, 1, 0, 1, 1, 0, 1, 1],
    glintKeyTimes: '0;0.367;0.434;0.5;0.7;0.767;0.833;1',
    glintSplines: [LIN, EASE, EASE, LIN, EASE, EASE, LIN].join(';'),
  },
  {
    // TR → Center (Phase 3), holds
    cx: 26.412,
    cy: 3.977,
    cxValues: '26.412;26.412;19.47;19.47',
    cyValues: '3.977;3.977;16;16',
    keyTimes: '0;0.700;0.833;1',
    keySplines: [LIN, EASE, LIN].join(';'),
    glintValues: [1, 1, 0, 1, 1],
    glintKeyTimes: '0;0.7;0.767;0.833;1',
    glintSplines: [LIN, EASE, EASE, LIN].join(';'),
  },
] as const

/**
 * Minimal attribute-value escaping for {@link MoleculeSpinnerMarkOptions.ariaLabel}
 * — the one option that can carry free text. Developer-supplied options
 * (`className`, `style`, `gradientId`, colors) are interpolated verbatim.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * The molecule spinner mark as a complete SVG element string (SMIL-animated,
 * framework-agnostic). See the module docblock for usage and gotchas.
 *
 * @param options - Paint, timings, size, gradient id and a11y shape.
 * @returns A `<svg>…</svg>` markup string.
 */
export function moleculeSpinnerMarkSvg(options: MoleculeSpinnerMarkOptions = {}): string {
  const timings = { ...DEFAULT_TIMINGS, ...options.timings }
  const colors = { ...DEFAULT_COLORS, ...options.colors }
  const gradientId = options.gradientId ?? 'mol-spinner-gradient'
  const gradient = (options.paint ?? 'gradient') === 'gradient'

  const sizeAttrs =
    options.size !== undefined ? ` width="${options.size}" height="${options.size}"` : ''
  const classAttrs = options.className ? ` class="${options.className}"` : ''
  const styleAttr = options.style ? ` style="${options.style}"` : ''
  const a11yAttrs = options.ariaLabel
    ? ` role="status" aria-label="${escapeAttr(options.ariaLabel)}"`
    : ' aria-hidden="true"'

  const defs = gradient
    ? '<defs>' +
      `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="32" y2="16" spreadMethod="repeat">` +
      `<stop offset="0" stop-color="${colors.blue}"/>` +
      `<stop offset="0.5" stop-color="${colors.light}"/>` +
      `<stop offset="1" stop-color="${colors.blue}"/>` +
      `<animateTransform attributeName="gradientTransform" type="translate" values="0 0; 32 0" dur="${timings.flow}" repeatCount="indefinite"/>` +
      '</linearGradient>' +
      ATOMS.map(
        (atom, i) =>
          // Two gradients per atom, composited as two stacked circles: an
          // always-opaque light→blue BASE, and a peach HEAD→transparent-tail
          // OVERLAY whose element opacity ignites with the swap. Never fade a
          // stop of the base itself — a zero-opacity stop makes that arc
          // segment semi-transparent and the background shows through the
          // rim on light backgrounds (the 1.3.1 bug); overlaying keeps every
          // edge opaque underneath. Element opacity animates numerically, so
          // var() palette colors are safe here.
          `<linearGradient id="${gradientId}-a${i}" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0" stop-color="${colors.light}"/>` +
          `<stop offset="1" stop-color="${colors.blue}"/>` +
          '</linearGradient>' +
          `<linearGradient id="${gradientId}-g${i}" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0" stop-color="${colors.peach}"/>` +
          `<stop offset="0.55" stop-color="${colors.peach}" stop-opacity="0"/>` +
          '</linearGradient>',
      ).join('') +
      '</defs>'
    : ''

  const groupStroke = gradient ? `url(#${gradientId})` : 'currentColor'

  const bonds = BONDS.map(
    (bond) =>
      `<line x1="${bond.x1}" x2="${bond.x2}" y1="${bond.y1}" y2="${bond.y2}">` +
      `<animate attributeName="opacity" dur="${timings.dur}" repeatCount="indefinite" values="${bond.values}" keyTimes="${bond.keyTimes}" calcMode="spline" keySplines="${bond.keySplines}"/>` +
      '</line>',
  ).join('')

  const atoms = ATOMS.map((atom, i) => {
    // The swap motion, shared verbatim by the base and the glint overlay so
    // the two circles travel as one.
    const swapAnimates =
      `<animate attributeName="cx" dur="${timings.dur}" repeatCount="indefinite" values="${atom.cxValues}" keyTimes="${atom.keyTimes}" calcMode="spline" keySplines="${atom.keySplines}"/>` +
      (atom.cyValues
        ? `<animate attributeName="cy" dur="${timings.dur}" repeatCount="indefinite" values="${atom.cyValues}" keyTimes="${atom.keyTimes}" calcMode="spline" keySplines="${atom.keySplines}"/>`
        : '')
    if (!gradient) {
      return `<circle cx="${atom.cx}" cy="${atom.cy}" r="2.976">${swapAnimates}</circle>`
    }
    return (
      `<circle cx="${atom.cx}" cy="${atom.cy}" r="2.976" stroke="url(#${gradientId}-a${i})">${swapAnimates}</circle>` +
      `<circle cx="${atom.cx}" cy="${atom.cy}" r="2.976" stroke="url(#${gradientId}-g${i})">${swapAnimates}` +
      `<animate attributeName="opacity" dur="${timings.dur}" repeatCount="indefinite" values="${atom.glintValues.map((v) => (v ? 0 : 1)).join(';')}" keyTimes="${atom.glintKeyTimes}" calcMode="spline" keySplines="${atom.glintSplines}"/>` +
      '</circle>'
    )
  }).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttrs}${classAttrs}${styleAttr}` +
    ` viewBox="0 0 32 32"${a11yAttrs} focusable="false">` +
    defs +
    `<g><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="${timings.spin}" repeatCount="indefinite"/>` +
    `<g transform="matrix(.86229 0 0 .86229 -.78879 2.2034)" stroke="${groupStroke}" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="2.4737" fill="none">` +
    bonds +
    atoms +
    '</g></g></svg>'
  )
}

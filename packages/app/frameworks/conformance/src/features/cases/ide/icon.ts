/**
 * `Icon` cases.
 *
 * The bonded icon set (`@molecule/app-icons-molecule`, installed by the kit)
 * supplies the glyph data, so each branch of the renderer is reached through
 * a real glyph: `file` is the plain path branch with its own `viewBox`,
 * `chevrons-up-down` is the raw-markup branch, `chevrons-left` has no
 * `viewBox` (the `0 0 20 20` fallback) and carries `fillRule`/`clipRule`
 * paths, and `logo-dot` sets a top-level `fill` plus per-path `fill` and
 * `opacity`. The set has no stroked glyph (`IconData.stroke`), so the stroked
 * case adds one through `context.icons`.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `Icon`. */
export const iconCases: FeatureComponentCases = {
  component: 'Icon',
  cases: [
    // Defaults: size 16, no className, no rest attributes, `currentColor` fill.
    { name: 'a file icon', props: { name: 'file' } },
    // The raw-markup branch (`dangerouslySetInnerHTML`) with an explicit size.
    { name: 'a raw-svg glyph at 24px', props: { name: 'chevrons-up-down', size: 24 } },
    // The `viewBox` fallback and paths with `fillRule`/`clipRule`.
    { name: 'a glyph without a viewBox falls back to 20', props: { name: 'chevrons-left' } },
    // The stroked branch: `fill="none"` and the four stroke attributes, from a case glyph; a
    // stroked glyph that names only `stroke` leaves the other three off.
    {
      name: 'a stroked glyph draws outlines',
      props: { name: 'case-stroked', size: 24 },
      context: {
        icons: {
          'case-stroked': {
            viewBox: '0 0 24 24',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            paths: [{ d: 'M5 12h14' }, { d: 'M12 5l7 7-7 7' }],
          },
        },
      },
    },
    {
      name: 'a stroked glyph with only a stroke colour',
      props: { name: 'case-outline' },
      context: {
        icons: {
          'case-outline': { stroke: '#336699', fill: 'red', paths: [{ d: 'M4 4h12v12H4z' }] },
        },
      },
    },
    // A top-level `fill` on the path branch and per-path `fill` + `opacity`.
    { name: 'a brand glyph with its own fill and path opacity', props: { name: 'logo-dot' } },
    // `className` and the rest spread (`data-*`, `aria-*`, plain attributes).
    {
      name: 'a class name and svg attributes are forwarded',
      props: {
        name: 'file',
        className: 'parity-token',
        'data-mol-id': 'icon-file',
        'aria-hidden': 'true',
        title: 'Project file',
      },
    },
    // A prop change swaps the glyph in place: same root, new paths + size.
    {
      name: 'a glyph swap',
      props: { name: 'file', size: 12 },
      interactions: [{ type: 'props', props: { name: 'logo-dot', size: 20 } }],
    },
    // An event handler travels through the rest spread onto the root `<svg>`.
    {
      name: 'a click forwarded through the spread',
      props: { name: 'file' },
      callbacks: ['onClick'],
      interactions: [{ type: 'click', selector: 'svg' }],
    },
  ],
}

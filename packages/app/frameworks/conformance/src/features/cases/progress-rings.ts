/**
 * `@molecule/app-progress-rings-react` cases: the Apple-Health-style concentric
 * SVG progress rings, single and stacked.
 *
 * `ProgressRings` is the package's only runtime export — one SVG whose child
 * groups (one per ring) carry the geometry, the ring colour and the per-ring
 * accessible label.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const triad = [
  { value: 8, max: 10, color: '#a', label: 'Steps' },
  { value: 5, max: 8, color: '#b', label: 'Sleep' },
  { value: 2, max: 4, color: '#c', label: 'Active' },
]

/** `@molecule/app-progress-rings-react`. */
export const progressRingsFeature: FeatureCases = {
  package: '@molecule/app-progress-rings-react',
  families: [
    {
      component: 'ProgressRings',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated aria summary and per-ring label.
        {
          name: 'one ring with the default size and caps',
          props: { rings: [{ value: 50, max: 100, color: '#ff0000' }] },
        },
        {
          name: 'concentric triad with per-ring labels',
          props: { rings: triad },
        },
        { name: 'no rings', props: { rings: [] } },
        {
          name: 'class and data-mol-id pass through',
          props: {
            rings: [{ value: 1, max: 2, color: '#a' }],
            className: 'parity-rings',
            dataMolId: 'steps-rings',
          },
        },
        {
          name: 'full ring',
          props: { rings: [{ value: 100, max: 100, color: '#00ff00' }] },
        },
        {
          name: 'empty ring',
          props: { rings: [{ value: 0, max: 100, color: '#0000ff' }] },
        },
        {
          name: 'overflow value clamps to the full circumference',
          props: { rings: [{ value: 999, max: 100, color: '#123456' }] },
        },
        {
          name: 'underflow value clamps to zero',
          props: { rings: [{ value: -5, max: 100, color: '#654321' }] },
        },
        {
          name: 'a non-positive max falls back to 1',
          props: { rings: [{ value: 0.5, max: 0, color: '#abcdef' }] },
        },
        {
          name: 'custom size, stroke width and gap',
          props: { rings: triad, size: 240, strokeWidth: 20, gap: 8 },
        },
        {
          name: 'butt caps',
          props: { rings: [{ value: 3, max: 4, color: '#a' }], cornerRadius: 'butt' },
        },
        {
          name: 'explicit round caps',
          props: { rings: [{ value: 3, max: 4, color: '#a' }], cornerRadius: 'round' },
        },
        {
          name: 'an explicit aria label replaces the summary',
          props: {
            rings: [{ value: 1, max: 2, color: '#a' }],
            ariaLabel: 'Daily activity rings',
          },
        },
        {
          name: 'seven rings, the innermost too small to render',
          props: {
            rings: Array.from({ length: 7 }, (_value, i) => ({
              value: i + 1,
              max: 7,
              color: '#a',
            })),
          },
        },
        {
          name: 'props change: size and stroke width',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [
            { type: 'props', props: { size: 220, strokeWidth: 24, gap: 10 } },
            { type: 'props', props: { size: 60, strokeWidth: 4, gap: 1 } },
          ],
        },
        {
          name: 'props change: a ring value and colour',
          props: { rings: [{ value: 1, max: 4, color: '#a' }] },
          interactions: [{ type: 'props', props: { rings: [{ value: 4, max: 4, color: '#b' }] } }],
        },
        {
          name: 'props change: rings added',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [{ type: 'props', props: { rings: triad } }],
        },
        {
          name: 'props change: rings removed',
          props: { rings: triad },
          interactions: [
            { type: 'props', props: { rings: [{ value: 1, max: 2, color: '#a' }] } },
            { type: 'props', props: { rings: [] } },
          ],
        },
        {
          name: 'props change: corner radius',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [
            { type: 'props', props: { cornerRadius: 'butt' } },
            { type: 'props', props: { cornerRadius: 'round' } },
          ],
        },
        {
          name: 'props change: class and id',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [
            { type: 'props', props: { className: 'later-class', dataMolId: 'later-rings' } },
            { type: 'props', props: { className: undefined, dataMolId: undefined } },
          ],
        },
        {
          name: 'props change: an aria label set and cleared',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [
            { type: 'props', props: { ariaLabel: 'Custom summary' } },
            { type: 'props', props: { ariaLabel: undefined } },
          ],
        },
        {
          name: 'props change: a per-ring label added and removed',
          props: { rings: [{ value: 1, max: 2, color: '#a' }] },
          interactions: [
            {
              type: 'props',
              props: { rings: [{ value: 1, max: 2, color: '#a', label: 'Steps' }] },
            },
            { type: 'props', props: { rings: [{ value: 1, max: 2, color: '#a' }] } },
          ],
        },
      ],
      keyedLists: [
        { prop: 'rings', selector: 'g', caseName: 'concentric triad with per-ring labels' },
      ],
    },
  ],
}

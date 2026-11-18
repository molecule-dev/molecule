/**
 * `@molecule/app-heatmap-react` cases: the GitHub-contributions-style SVG
 * heatmap, its grid offset to the week start, the quantile and explicit
 * palettes, the month/weekday label rows, the per-cell tooltip and
 * `aria-label`, the click/hover callbacks, and the two pure helpers
 * (`computeQuantileThresholds`, `bucketValue`).
 *
 * `Heatmap` is the package's only component; `computeQuantileThresholds` and
 * `bucketValue` are its plain-function exports.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** January 2025 (starts on a Wednesday, ends on a Friday). */
const JAN_2025 = { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) }

/** February 2025, used to prove a `range` prop change re-renders the grid. */
const FEB_2025 = { start: new Date(2025, 1, 1), end: new Date(2025, 1, 28) }

/** Mid-December 2024 → mid-February 2025: several months, partial first week. */
const WINTER = { start: new Date(2024, 11, 15), end: new Date(2025, 1, 10) }

/** Five ascending values whose quantile thresholds land exactly on 2/3/4/5. */
const FIVE_VALUES = [
  { date: '2025-01-06', value: 1 },
  { date: '2025-01-07', value: 2 },
  { date: '2025-01-08', value: 3 },
  { date: '2025-01-09', value: 4 },
  { date: '2025-01-10', value: 5 },
]

/** A five-color explicit palette (light → dark). */
const PALETTE = ['#000', '#111', '#222', '#333', '#444'] as const

/** A cell, by its `data-mol-id`. */
const cell = (date: string): string => `[data-mol-id="heatmap-cell-${date}"]`

/** `@molecule/app-heatmap-react`. */
export const heatmapFeature: FeatureCases = {
  package: '@molecule/app-heatmap-react',
  families: [
    {
      component: 'Heatmap',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated month label.
        { name: 'a January range with no data', props: { data: [], range: JAN_2025 } },
        {
          name: 'one day of activity',
          props: { data: [{ date: '2025-01-15', value: 3 }], range: JAN_2025 },
        },
        {
          name: 'values on every quantile boundary',
          props: { data: FIVE_VALUES, range: JAN_2025 },
        },
        {
          name: 'a zero value stays in the empty bucket',
          props: { data: [{ date: '2025-01-10', value: 0 }], range: JAN_2025 },
        },
        {
          name: 'a negative value stays in the empty bucket',
          props: { data: [{ date: '2025-01-11', value: -4 }], range: JAN_2025 },
        },
        {
          name: 'a fractional high value lands in the top bucket',
          props: { data: [{ date: '2025-01-12', value: 1000.5 }], range: JAN_2025 },
        },
        {
          name: 'a duplicate date keeps the last entry',
          props: {
            data: [
              { date: '2025-01-10', value: 2 },
              { date: '2025-01-10', value: 9 },
            ],
            range: JAN_2025,
          },
        },
        {
          name: 'days outside the range are ignored',
          props: {
            data: [
              { date: '2024-12-31', value: 7 },
              { date: '2025-02-01', value: 8 },
              { date: '2025-01-10', value: 1 },
            ],
            range: JAN_2025,
          },
        },
        {
          name: 'custom cell size',
          props: { data: [], range: JAN_2025, cellSize: 20 },
        },
        {
          name: 'custom gap',
          props: { data: [], range: JAN_2025, gap: 6 },
        },
        {
          name: 'cell size and a zero gap',
          props: { data: [], range: JAN_2025, cellSize: 8, gap: 0 },
        },
        {
          name: 'an explicit five-color palette',
          props: { data: FIVE_VALUES, range: JAN_2025, colorScale: PALETTE },
        },
        {
          name: 'the quantile palette named explicitly',
          props: { data: FIVE_VALUES, range: JAN_2025, colorScale: 'quantile' },
        },
        {
          name: 'a palette shorter than the buckets leaves higher cells unfilled',
          props: { data: FIVE_VALUES, range: JAN_2025, colorScale: ['#000', '#111'] },
        },
        {
          name: 'an empty palette leaves every cell unfilled',
          props: { data: [{ date: '2025-01-10', value: 4 }], range: JAN_2025, colorScale: [] },
        },
        {
          name: 'the week starts on Monday',
          props: { data: [], range: JAN_2025, weekStartsOn: 1 },
        },
        {
          name: 'weekday labels on a Sunday week',
          props: { data: [], range: JAN_2025, showWeekdayLabels: true },
        },
        {
          name: 'weekday labels on a Monday week',
          props: { data: [], range: JAN_2025, showWeekdayLabels: true, weekStartsOn: 1 },
        },
        {
          name: 'month labels hidden',
          props: { data: [], range: JAN_2025, showMonthLabels: false },
        },
        {
          name: 'both label rows hidden',
          props: {
            data: [],
            range: JAN_2025,
            showWeekdayLabels: false,
            showMonthLabels: false,
          },
        },
        {
          name: 'an explicit aria label',
          props: { data: [], range: JAN_2025, ariaLabel: 'Editing activity' },
        },
        {
          name: 'an empty aria label is kept as given',
          props: { data: [], range: JAN_2025, ariaLabel: '' },
        },
        {
          name: 'className passthrough',
          props: { data: [], range: JAN_2025, className: 'parity-token' },
        },
        {
          name: 'an empty className',
          props: { data: [], range: JAN_2025, className: '' },
        },
        {
          name: 'a range spanning several months',
          props: { data: [{ date: '2025-01-20', value: 6 }], range: WINTER },
        },
        {
          name: 'a single-day range',
          props: {
            data: [{ date: '2025-01-15', value: 2 }],
            range: { start: new Date(2025, 0, 15), end: new Date(2025, 0, 15) },
          },
        },
        {
          name: 'a range whose times of day are normalized away',
          props: {
            data: [{ date: '2025-01-02', value: 5 }],
            range: { start: new Date(2025, 0, 1, 15, 30), end: new Date(2025, 0, 3, 9, 5) },
          },
        },
        {
          name: 'an inverted range renders no cells',
          props: {
            data: [],
            range: { start: new Date(2025, 0, 15), end: new Date(2025, 0, 10) },
          },
        },
        {
          name: 'click calls onCellClick',
          props: { data: [{ date: '2025-01-10', value: 3 }], range: JAN_2025 },
          callbacks: ['onCellClick'],
          interactions: [{ type: 'click', selector: cell('2025-01-10') }],
        },
        {
          name: 'click on a day without data reports value zero',
          props: { data: [], range: JAN_2025 },
          callbacks: ['onCellClick'],
          interactions: [{ type: 'click', selector: cell('2025-01-10') }],
        },
        {
          name: 'hover calls onCellHover',
          props: { data: [{ date: '2025-01-20', value: 4 }], range: JAN_2025 },
          callbacks: ['onCellHover'],
          interactions: [{ type: 'mouseenter', selector: cell('2025-01-20') }],
        },
        {
          name: 'hover and leave only report the hover',
          props: { data: [{ date: '2025-01-20', value: 4 }], range: JAN_2025 },
          callbacks: ['onCellHover'],
          interactions: [
            { type: 'mouseenter', selector: cell('2025-01-20') },
            { type: 'mouseleave', selector: cell('2025-01-20') },
          ],
        },
        {
          name: 'a payload travels to both callbacks',
          props: {
            data: [{ date: '2025-01-10', value: 3, payload: { id: 'abc' } }],
            range: JAN_2025,
          },
          callbacks: ['onCellClick', 'onCellHover'],
          interactions: [
            { type: 'mouseenter', selector: cell('2025-01-10') },
            { type: 'click', selector: cell('2025-01-10') },
          ],
        },
        {
          name: 'clicking another cell reports that cell',
          props: { data: FIVE_VALUES, range: JAN_2025 },
          callbacks: ['onCellClick'],
          interactions: [
            { type: 'click', selector: cell('2025-01-06') },
            { type: 'click', selector: cell('2025-01-10') },
          ],
        },
        {
          name: 'clicking without a handler is a no-op',
          props: { data: [{ date: '2025-01-10', value: 3 }], range: JAN_2025 },
          interactions: [{ type: 'click', selector: cell('2025-01-10') }],
        },
        {
          name: 'a custom tooltip formatter',
          props: {
            data: [{ date: '2025-01-05', value: 9 }],
            range: JAN_2025,
            tooltipFormatter: { $fn: 'format', format: '*{0.date}*' },
          },
        },
        {
          name: 'a tooltip formatter reading the bucket and value',
          props: {
            data: FIVE_VALUES,
            range: JAN_2025,
            tooltipFormatter: { $fn: 'format', format: 'bucket {0.bucket} of {0.value}' },
          },
        },
        {
          name: 'the tooltip formatter is dropped after mount',
          props: {
            data: [{ date: '2025-01-05', value: 9 }],
            range: JAN_2025,
            tooltipFormatter: { $fn: 'format', format: '*{0.date}*' },
          },
          interactions: [{ type: 'props', props: { tooltipFormatter: undefined } }],
        },
        {
          name: 'the tooltip formatter is replaced after mount',
          props: {
            data: [{ date: '2025-01-05', value: 9 }],
            range: JAN_2025,
            tooltipFormatter: { $fn: 'first', format: 'first {0.value}' },
          },
          interactions: [
            {
              type: 'props',
              props: { tooltipFormatter: { $fn: 'second', format: 'second {0.value}' } },
            },
          ],
        },
        {
          name: 'translations supply the month, weekday, tooltip and grid text',
          props: {
            data: [{ date: '2025-01-05', value: 9 }],
            range: JAN_2025,
            showWeekdayLabels: true,
          },
          context: {
            translations: {
              en: {
                heatmap: {
                  month: { jan: 'January' },
                  weekday: { mon: 'Monday', wed: 'Wednesday', fri: 'Friday' },
                  cell: { tooltip: '{{date}} → {{value}} units' },
                  aria: { grid: 'Contribution activity' },
                },
              },
            },
          },
        },
        {
          name: 'the data changes after mount',
          props: { data: [{ date: '2025-01-10', value: 1 }], range: JAN_2025 },
          interactions: [
            {
              type: 'props',
              props: {
                data: [
                  { date: '2025-01-10', value: 4 },
                  { date: '2025-01-11', value: 2 },
                ],
              },
            },
            { type: 'props', props: { data: [] } },
          ],
        },
        {
          name: 'the range changes after mount',
          props: { data: [], range: JAN_2025 },
          interactions: [{ type: 'props', props: { range: FEB_2025 } }],
        },
        {
          name: 'the palette changes after mount',
          props: { data: FIVE_VALUES, range: JAN_2025 },
          interactions: [{ type: 'props', props: { colorScale: PALETTE } }],
        },
        {
          name: 'the cell size and gap change after mount',
          props: { data: [], range: JAN_2025 },
          interactions: [{ type: 'props', props: { cellSize: 16, gap: 4 } }],
        },
        {
          name: 'the week start changes after mount',
          props: { data: [], range: JAN_2025 },
          interactions: [{ type: 'props', props: { weekStartsOn: 1 } }],
        },
        {
          name: 'the label rows toggle after mount',
          props: { data: [], range: JAN_2025 },
          interactions: [
            { type: 'props', props: { showWeekdayLabels: true } },
            { type: 'props', props: { showMonthLabels: false } },
            { type: 'props', props: { showWeekdayLabels: false } },
          ],
        },
        {
          name: 'the aria label arrives and changes after mount',
          props: { data: [], range: JAN_2025 },
          interactions: [
            { type: 'props', props: { ariaLabel: 'Habits' } },
            { type: 'props', props: { ariaLabel: undefined } },
          ],
        },
        {
          name: 'className changes after mount',
          props: { data: [], range: JAN_2025, className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'computeQuantileThresholds',
      calls: [
        [[]],
        [[5]],
        [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
        [[3, 1, 2]],
        [[0, 0, 1]],
        [[-3, -2, -1]],
        [[10, 10, 10, 10]],
        [[1, 1, 2, 2, 3, 3, 4, 4]],
        [[Number.NaN]],
        [[3, Number.NaN, 1]],
        [[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]],
        [[1, 100]],
      ],
    },
    {
      export: 'bucketValue',
      calls: [
        [0, [1, 3, 5, 8]],
        [-1, [1, 3, 5, 8]],
        [1, [1, 3, 5, 8]],
        [2, [1, 3, 5, 8]],
        [3, [1, 3, 5, 8]],
        [4, [1, 3, 5, 8]],
        [5, [1, 3, 5, 8]],
        [6, [1, 3, 5, 8]],
        [8, [1, 3, 5, 8]],
        [9, [1, 3, 5, 8]],
        [100, [1, 3, 5, 8]],
        [Number.NaN, [1, 3, 5, 8]],
        [Number.NaN, [Number.NaN, Number.NaN, Number.NaN, Number.NaN]],
        [0, [0, 0, 0, 0]],
        [0.5, [0.5, 0.5, 0.5, 0.5]],
      ],
    },
  ],
}

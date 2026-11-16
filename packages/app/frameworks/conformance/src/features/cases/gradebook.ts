/**
 * `@molecule/app-gradebook-react` cases: the unified gradebook table (title,
 * letter, numeric, weight, contribution and posted columns; percentage / 4.0 /
 * 5.0 scales; the em-dash placeholders; the empty state; the per-cell click
 * callback) plus the GPA hero card (formatted value, "out of" caption, optional
 * trend chip and trend label), and the package's pure grade helpers.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A node-valued row title, for the row-node cases. */
const titleNode = {
  $nodes: [{ tag: 'strong', attrs: { 'data-node': 'title' }, children: ['Calculus I'] }],
}

/** A node-valued "posted" cell, for the row-node cases. */
const postedNode = {
  $nodes: [{ tag: 'time', attrs: { 'data-node': 'posted' }, children: ['2026-04-01'] }],
}

/** A node-valued trend label for the GPA card. */
const trendLabelNode = [{ tag: 'em', attrs: { 'data-node': 'trend-label' }, children: ['vs last'] }]

/** Two fully-populated rows, the shape an app passes for a normal semester. */
const rows = [
  {
    id: 'g1',
    title: 'Calculus I',
    letter: 'A-',
    score: 92,
    maxPoints: 100,
    weight: 0.25,
    contribution: 0.93,
    postedAt: '2026-04-01',
  },
  {
    id: 'g2',
    title: 'Physics II',
    letter: 'B+',
    score: 41,
    maxPoints: 50,
    weight: 0.25,
    contribution: 0.83,
    postedAt: '2026-04-02',
  },
]

/** A row with every optional field absent. */
const bareRow = { id: 'g3', title: 'Quiz', score: 50 }

/** `@molecule/app-gradebook-react`. */
export const gradebookFeature: FeatureCases = {
  package: '@molecule/app-gradebook-react',
  families: [
    {
      component: 'GpaCard',
      cases: [
        { name: 'a 4.0 GPA with the scale default ceiling', props: { gpa: 3.72, scale: '4.0' } },
        { name: 'a 5.0 GPA with the scale default ceiling', props: { gpa: 4.5, scale: '5.0' } },
        { name: 'a percentage GPA', props: { gpa: 87, scale: 'percentage' } },
        { name: 'an explicit max', props: { gpa: 4.5, scale: '5.0', max: 5 } },
        {
          name: 'a zero max falls back to the scale default',
          props: { gpa: 3, scale: '4.0', max: 0 },
        },
        {
          name: 'a negative max falls back to the scale default',
          props: { gpa: 3, scale: '4.0', max: -1 },
        },
        { name: 'an upward trend', props: { gpa: 3.5, scale: '4.0', trend: 'up' } },
        { name: 'a downward trend', props: { gpa: 3.1, scale: '4.0', trend: 'down' } },
        { name: 'a flat trend', props: { gpa: 3.5, scale: '4.0', trend: 'flat' } },
        {
          name: 'a trend label beside the trend chip',
          props: { gpa: 3.5, scale: '4.0', trend: 'flat', trendLabel: 'vs last semester' },
        },
        {
          name: 'a trend label as a node',
          props: { gpa: 3.5, scale: '4.0', trend: 'up' },
          slots: { trendLabel: trendLabelNode },
        },
        {
          name: 'a trend label without a trend renders no chip',
          props: { gpa: 3.5, scale: '4.0', trendLabel: 'vs last semester' },
        },
        { name: 'className', props: { gpa: 3.72, scale: '4.0', className: 'parity-token' } },
        {
          name: 'the GPA and the scale change',
          props: { gpa: 3.72, scale: '4.0' },
          interactions: [
            { type: 'props', props: { gpa: 4.6, scale: '5.0' } },
            { type: 'props', props: { gpa: 91, scale: 'percentage' } },
          ],
        },
        {
          name: 'the trend is added, changed and removed',
          props: { gpa: 3.5, scale: '4.0' },
          interactions: [
            { type: 'props', props: { trend: 'up' } },
            { type: 'props', props: { trend: 'down', trendLabel: 'vs last month' } },
            { type: 'props', props: { trend: undefined, trendLabel: undefined } },
          ],
        },
      ],
    },
    {
      component: 'Gradebook',
      cases: [
        {
          name: 'two rows with every field',
          props: { grades: rows, gpaScale: '4.0' },
        },
        { name: 'no grades yet', props: { grades: [], gpaScale: '4.0' } },
        {
          name: 'no grades yet with classes',
          props: { grades: [], gpaScale: '4.0', className: 'parity-token' },
        },
        {
          name: 'the percentage scale',
          props: { grades: rows, gpaScale: 'percentage' },
        },
        {
          name: 'the 5.0 scale',
          props: { grades: rows, gpaScale: '5.0' },
        },
        {
          name: 'a row without optional fields renders em dashes',
          props: { grades: [bareRow], gpaScale: '4.0' },
        },
        {
          name: 'a zero maxPoints renders the bare score',
          props: { grades: [{ id: 'g4', title: 'Lab', score: 17, maxPoints: 0 }], gpaScale: '4.0' },
        },
        {
          name: 'a zero weight and a zero contribution render as numbers',
          props: {
            grades: [{ id: 'g5', title: 'Reading', score: 5, weight: 0, contribution: 0 }],
            gpaScale: '4.0',
          },
        },
        {
          name: 'a node title and posted cell pass through',
          props: {
            grades: [{ id: 'g6', title: titleNode, score: 88, postedAt: postedNode }],
            gpaScale: '4.0',
          },
        },
        {
          name: 'className',
          props: { grades: rows, gpaScale: '4.0', className: 'parity-token' },
        },
        {
          name: 'a cell click calls onCellClick with the row and column',
          props: { grades: rows, gpaScale: '4.0' },
          callbacks: ['onCellClick'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="gradebook-cell-title"]' },
            { type: 'click', selector: '[data-mol-id="gradebook-cell-numeric"]' },
          ],
        },
        {
          name: 'every column reports its own id',
          props: { grades: rows, gpaScale: '4.0' },
          callbacks: ['onCellClick'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="gradebook-cell-letter"]' },
            { type: 'click', selector: '[data-mol-id="gradebook-cell-weight"]' },
            { type: 'click', selector: '[data-mol-id="gradebook-cell-contribution"]' },
            { type: 'click', selector: '[data-mol-id="gradebook-cell-posted"]' },
          ],
        },
        {
          name: 'without onCellClick a cell click calls nothing',
          props: { grades: rows, gpaScale: '4.0' },
          interactions: [{ type: 'click', selector: '[data-mol-id="gradebook-cell-title"]' }],
        },
        {
          name: 'the rows change',
          props: { grades: rows, gpaScale: '4.0' },
          interactions: [
            { type: 'props', props: { grades: [bareRow] } },
            { type: 'props', props: { grades: [] } },
          ],
        },
        {
          name: 'the scale changes',
          props: { grades: rows, gpaScale: '4.0' },
          interactions: [
            { type: 'props', props: { gpaScale: 'percentage' } },
            { type: 'props', props: { gpaScale: '5.0' } },
          ],
        },
        {
          name: 'the className changes',
          props: { grades: rows, gpaScale: '4.0', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'computePercentage',
      calls: [
        [{ id: 'g1', title: 't', score: 80, maxPoints: 100 }],
        [{ id: 'g1', title: 't', score: 45, maxPoints: 50 }],
        [{ id: 'g1', title: 't', score: 73 }],
        [{ id: 'g1', title: 't', score: 50, maxPoints: 0 }],
        [{ id: 'g1', title: 't', score: 9999, maxPoints: 100 }],
        [{ id: 'g1', title: 't', score: -5, maxPoints: 100 }],
        [{ id: 'g1', title: 't', score: Number.NaN, maxPoints: 100 }],
      ],
    },
    {
      export: 'formatGpa',
      calls: [
        [3.72, '4.0'],
        [4.5, '5.0'],
        [87, 'percentage'],
        [0, '4.0'],
        [Number.NaN, '4.0'],
        [Number.NaN, 'percentage'],
      ],
    },
    {
      export: 'defaultGpaMax',
      calls: [['4.0'], ['5.0'], ['percentage']],
    },
  ],
}

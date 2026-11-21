/**
 * `@molecule/app-leaderboard-list-react` cases: the header row (title +
 * actions) above a stack of rows, with an optional empty state.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case's actions slot is an empty button. */
const EMPTY_ACTION: CaseA11y = {
  expect: ['button-name'],
  reason: "The case's actions slot is an empty button",
}

const rows = [
  { tag: 'div', attrs: { 'data-row': 'a' } },
  { tag: 'div', attrs: { 'data-row': 'b' } },
]
const singleRow = [{ tag: 'div', attrs: { 'data-row': 'only' } }]
const title = ['Top players']
const actions = [{ tag: 'button', attrs: { 'data-actions': '', type: 'button' } }]
const emptyState = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No entries'] }]

/** `@molecule/app-leaderboard-list-react`. */
export const leaderboardListFeature: FeatureCases = {
  package: '@molecule/app-leaderboard-list-react',
  families: [
    {
      component: 'LeaderboardList',
      cases: [
        { name: 'rows only', children: rows },
        { name: 'a single child', children: singleRow },
        {
          name: 'title and actions',
          a11y: EMPTY_ACTION,
          slots: { title, actions },
          children: rows,
        },
        { name: 'title only', slots: { title }, children: rows },
        { name: 'actions only', a11y: EMPTY_ACTION, slots: { actions }, children: rows },
        {
          name: 'title as a node',
          slots: { title: [{ tag: 'strong', children: ['Top'] }] },
          children: rows,
        },
        { name: 'with a className', props: { className: 'parity-token' }, children: rows },
        {
          name: 'empty list with an empty state',
          slots: { emptyState },
        },
        { name: 'empty list without an empty state' },
        {
          name: 'empty state is ignored when children exist',
          children: rows,
          slots: { emptyState },
        },
        {
          name: 'className changes',
          props: { className: 'parity-token' },
          children: rows,
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
}

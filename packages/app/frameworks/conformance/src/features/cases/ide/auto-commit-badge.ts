/**
 * `AutoCommitBadge` cases: the commit bar's green commit button in every state
 * — off (renders nothing), paused, the quiet phase, the final visible
 * countdown, with and without the host's combined label, inline and floating,
 * and held while the agent works — plus the countdown running through a commit
 * and a locale switch.
 *
 * The badge is PRESENTATIONAL: the countdown lives in the host, so the state
 * transitions move with `props` steps exactly the way a tick or a fired commit
 * would hand the next state down. There is no clock in the label
 * (`formatAutoCommitBadge` prints the remaining seconds it is given), so no
 * case pins `now`.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** Auto-commit off (`/autocommit 0`): the badge renders nothing. */
const OFF = { intervalSeconds: 0, remaining: null }
/** Enabled but paused: hydrated, or just after a commit, waiting for a change. */
const PAUSED = { intervalSeconds: 5, remaining: null }
/** Armed, above the visible window: a plain green Commit button. */
const QUIET = { intervalSeconds: 30, remaining: 12 }
/** Inside the visible window: the live countdown label. */
const COUNTING = { intervalSeconds: 5, remaining: 2 }
/** A cadence that fits inside the visible window: countdown from the start. */
const WINDOW_SIZED = { intervalSeconds: 3, remaining: 3 }

/** `AutoCommitBadge`. */
export const autoCommitBadgeCases: FeatureComponentCases = {
  component: 'AutoCommitBadge',
  cases: [
    {
      name: 'auto-commit off renders nothing',
      props: { state: OFF },
      callbacks: ['onCommitNow'],
    },
    {
      name: 'enabled but paused is a green Commit button, clickable now',
      props: { state: PAUSED },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'the quiet phase keeps the plain Commit button',
      props: { state: QUIET },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'the final seconds morph into the live countdown, still clickable',
      props: { state: COUNTING },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'a cadence inside the visible window counts down for the whole run',
      props: { state: WINDOW_SIZED },
      callbacks: ['onCommitNow'],
    },
    {
      name: 'a combined label prefixes the countdown and takes over the aria label',
      props: { state: COUNTING, label: 'Commit 2 files' },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'a combined label renames the quiet button without a countdown',
      props: { state: QUIET, label: 'Commit 2 files' },
      callbacks: ['onCommitNow'],
    },
    {
      name: 'inline sits in the commit bar slot instead of floating',
      props: { state: COUNTING, inline: true },
      callbacks: ['onCommitNow'],
    },
    {
      name: 'held while the agent works: muted, inert, and plain Commit',
      props: { state: COUNTING, disabled: true },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'a held button with a combined label keeps the plain label',
      props: { state: COUNTING, disabled: true, label: 'Commit 2 files' },
      callbacks: ['onCommitNow'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' }],
    },
    {
      name: 'the countdown ticks down, pauses after a commit, and vanishes when switched off',
      props: { state: PAUSED },
      callbacks: ['onCommitNow'],
      interactions: [
        { type: 'props', props: { state: { intervalSeconds: 5, remaining: 5 } } },
        { type: 'props', props: { state: { intervalSeconds: 5, remaining: 2 } } },
        { type: 'click', selector: '[data-mol-id="chat-autocommit-badge"]' },
        { type: 'props', props: { state: PAUSED } },
        { type: 'props', props: { state: OFF } },
        { type: 'props', props: { state: { intervalSeconds: 5, remaining: 5 } } },
      ],
    },
    {
      name: 'a locale switch re-renders the countdown and the combined label',
      props: { state: COUNTING },
      callbacks: ['onCommitNow'],
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                commit: 'Valider',
                autoCommit: {
                  badge: 'Auto-validation dans {{countdown}}',
                  countedBadge: '{{commit}} dans {{countdown}}',
                },
              },
            },
          },
        },
      },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'props', props: { label: 'Valider 2 fichiers' } },
      ],
    },
  ],
}

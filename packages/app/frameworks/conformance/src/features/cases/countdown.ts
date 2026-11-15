/**
 * `@molecule/app-countdown-react` cases: the live `<Countdown>` display in its
 * three formats, the `render` override, the `expired` node, and the
 * `useCountdown` hook behind it.
 *
 * Every case pins `now`, so the remaining time — and therefore every unit, the
 * `0s` fallback and the expiry switch — reads the same on every day the cases
 * run. A case that needs the clock to move sets `fakeTimers` and drives it with
 * an `advance` step.
 *
 * `expired` is a node (React's element prop), so it travels in `props` as a
 * `{ $nodes }` value: React receives an element, Vue a VNode, Solid an accessor
 * of JSX, Svelte a snippet and Angular a `TemplateRef` input.
 *
 * @module
 */

import type { HookCases } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** The instant every case's `Date.now()` is pinned to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** 1d 2h 3m 4s, in milliseconds. */
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

/** 1 day, 2 hours, 3 minutes and 4 seconds after `NOW`. */
const TARGET = NOW + ONE_D_TWO_H_THREE_M_FOUR_S

/** The `expired` node React renders once the target has passed. */
const EXPIRED_NODE = {
  $nodes: [{ tag: 'span', attrs: { 'data-expired': '' }, children: ['Done'] }],
}

/** `useCountdown(target)`: the decomposition, the tick and the expiry switch. */
const useCountdownCases: HookCases = {
  hook: 'useCountdown',
  // An app re-renders the hook with a new target or interval; each framework
  // follows the changed argument on the same mount.
  reactiveArgs: true,
  cases: [
    {
      name: 'decomposes the remaining time into days / hours / minutes / seconds',
      args: [TARGET],
      now: NOW,
    },
    {
      name: 'flags expired and clamps units to 0 when the target is in the past',
      args: [NOW - 5_000],
      now: NOW,
    },
    {
      // `ms <= 0` is expired: exactly on the target is already past.
      name: 'the target instant itself is expired',
      args: [NOW],
      now: NOW,
    },
    {
      // The clock is pinned and the interval is not forked: the state is static.
      name: 'an untouched clock does not change the state',
      args: [TARGET],
      now: NOW,
    },
    {
      name: 'one tick of the default interval moves the remaining time by a second',
      args: [NOW + 90_000],
      now: NOW,
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 1_000 },
        { type: 'advance', ms: 1_000 },
      ],
    },
    {
      name: 'a custom tick interval refreshes at that interval',
      args: [NOW + 90_000, 500],
      now: NOW,
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 500 },
        { type: 'advance', ms: 500 },
      ],
    },
    {
      name: 'tickMs 0 disables the timer',
      args: [NOW + 90_000, 0],
      now: NOW,
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 5_000 }],
    },
    {
      name: 'a negative tickMs disables the timer',
      args: [NOW + 90_000, -1_000],
      now: NOW,
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 5_000 }],
    },
    {
      name: 'a Date target is the same instant as its epoch milliseconds',
      args: [new Date(TARGET)],
      now: NOW,
    },
    {
      name: 'an ISO string target is the same instant as its epoch milliseconds',
      args: [new Date(TARGET).toISOString()],
      now: NOW,
    },
    {
      name: 'a new target on the same mount re-reads the remaining time',
      args: [NOW + 60_000],
      now: NOW,
      steps: [{ type: 'args', args: [NOW + 120_000] }],
    },
    {
      name: 'a target changed into the past expires on the same mount',
      args: [TARGET],
      now: NOW,
      steps: [{ type: 'args', args: [NOW - 1_000] }],
    },
    {
      name: 'a new tick interval on the same mount restarts the timer',
      args: [NOW + 90_000, 0],
      now: NOW,
      fakeTimers: true,
      steps: [
        { type: 'args', args: [NOW + 90_000, 1_000] },
        { type: 'advance', ms: 1_000 },
      ],
    },
  ],
}

/** `Countdown`: the three formats, the render override, the expired node and prop changes. */
const countdownCases: FeatureCases['families'][number] = {
  component: 'Countdown',
  cases: [
    {
      name: 'renders the compact format by default, skipping leading zero units',
      props: { target: TARGET },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'compact renders only seconds when less than a minute remains',
      props: { target: NOW + 30_000 },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'compact renders hours and minutes without a zero day',
      props: { target: NOW + 2 * 3_600_000 + 3 * 60_000 + 4_000 },
      now: NOW,
      fakeTimers: true,
    },
    {
      // Days are non-zero, so the zero hours and minutes between them stay.
      name: 'compact keeps a zero hour and minute between non-zero units',
      props: { target: NOW + 86_400_000 + 5_000 },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'renders the long format with pluralised unit words',
      props: { target: NOW + 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 1_000, format: 'long' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'the long format uses singular units for one of each',
      props: { target: NOW + 61_000, format: 'long' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'renders the colon format zero-padded to two digits',
      props: { target: TARGET, format: 'colon' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'the colon format pads a day count past one digit',
      props: { target: NOW + 5 * 86_400_000 + 4 * 3_600_000 + 3 * 60_000 + 2_000, format: 'colon' },
      now: NOW,
      fakeTimers: true,
    },
    {
      // React's `else` arm: anything that is not `long` or `colon` is compact.
      name: 'an unknown format falls back to the compact format',
      props: { target: TARGET, format: 'weeks' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'renders the `expired` node once the target has passed',
      props: { target: NOW - 1_000, expired: EXPIRED_NODE },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'a past target without an expired node renders the zero display',
      props: { target: NOW - 1_000 },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'the expired node wins over the render function',
      props: {
        target: NOW - 1_000,
        expired: EXPIRED_NODE,
        render: {
          $fn: 'render',
          nodes: [{ tag: 'b', attrs: { 'data-render': '' }, children: ['{0.days}'] }],
        },
      },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'uses the `render` prop for full control over markup',
      props: {
        target: TARGET,
        render: {
          $fn: 'render',
          nodes: [{ tag: 'b', attrs: { 'data-render': '' }, children: ['{0.days}'] }],
        },
      },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'the render wrapper keeps className as it was passed',
      props: {
        target: NOW + 30_000,
        className: 'parity-token',
        render: {
          $fn: 'render',
          nodes: [{ tag: 'b', attrs: { 'data-render': '' }, children: ['{0.seconds}'] }],
        },
      },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'forwards className onto the wrapper span',
      props: { target: NOW + 30_000, className: 'parity-token' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'an empty className still renders the class attribute',
      props: { target: NOW + 30_000, className: '' },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'a Date target renders the same instant',
      props: { target: new Date(TARGET) },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'an ISO string target renders the same instant',
      props: { target: new Date(TARGET).toISOString() },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'changing the format re-renders the same remaining time',
      props: { target: TARGET },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'props', props: { format: 'long' } },
        { type: 'props', props: { format: 'colon' } },
      ],
    },
    {
      name: 'changing the target re-renders the remaining time',
      props: { target: TARGET },
      now: NOW,
      fakeTimers: true,
      interactions: [{ type: 'props', props: { target: NOW + 61_000 } }],
    },
    {
      name: 'the expired node appears when the clock passes the target',
      props: { target: NOW + 2_000, expired: EXPIRED_NODE },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1_000 },
        { type: 'advance', ms: 1_500 },
      ],
    },
    {
      name: 'each tick re-renders the seconds',
      props: { target: NOW + 90_000 },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1_000 },
        { type: 'advance', ms: 1_000 },
      ],
    },
    {
      name: 'a render function follows the clock',
      props: {
        target: NOW + 90_000,
        render: {
          $fn: 'render',
          nodes: [{ tag: 'b', attrs: { 'data-render': '' }, children: ['{0.seconds}'] }],
        },
      },
      now: NOW,
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 1_000 }],
    },
    {
      name: 'a future target after expiry renders the display again',
      props: { target: NOW - 1_000, expired: EXPIRED_NODE },
      now: NOW,
      fakeTimers: true,
      interactions: [{ type: 'props', props: { target: NOW + 90_000 } }],
    },
  ],
}

/** `@molecule/app-countdown-react`. */
export const countdownFeature: FeatureCases = {
  package: '@molecule/app-countdown-react',
  families: [countdownCases],
  hooks: [useCountdownCases],
}

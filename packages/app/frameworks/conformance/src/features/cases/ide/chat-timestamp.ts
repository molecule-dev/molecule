/**
 * `ChatTimestamp` cases. Every case pins the clock (`now`): the label is a
 * relative time, so a golden recorded at the real time would drift daily.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** 2026-01-01 00:00 UTC: the item's time in most cases. */
const AT = Date.UTC(2026, 0, 1)
const MINUTE = 60_000

/** `ChatTimestamp`. */
export const chatTimestampCases: FeatureComponentCases = {
  component: 'ChatTimestamp',
  cases: [
    {
      name: 'an inline time five minutes ago',
      now: AT + 5 * MINUTE,
      props: { timestamp: AT },
    },
    {
      name: 'a time days ago on its own line',
      now: AT + 3 * 24 * 60 * MINUTE,
      props: { timestamp: AT, variant: 'line' },
    },
    {
      name: 'a centered line, months ago',
      now: Date.UTC(2026, 4, 13, 12),
      props: { timestamp: AT, variant: 'line', align: 'center' },
    },
    {
      name: 'a time ahead of the clock shows as now, never in the future',
      now: AT,
      props: { timestamp: AT + 30_000 },
    },
    {
      name: 'an invalid time renders nothing',
      now: AT,
      props: { timestamp: Number.NaN },
    },
    {
      name: 'an infinite time renders nothing too',
      now: AT,
      props: { timestamp: Number.POSITIVE_INFINITY },
    },
    {
      name: 'an inline time ignores the align prop',
      now: AT + 5 * MINUTE,
      props: { timestamp: AT, align: 'center' },
    },
    {
      name: 'the label advances with the minute clock',
      now: AT + 5 * MINUTE,
      fakeTimers: true,
      props: { timestamp: AT },
      interactions: [
        { type: 'advance', ms: MINUTE },
        { type: 'advance', ms: 59 * MINUTE },
      ],
    },
    {
      name: 'hovering shows the exact date and time',
      now: AT + 5 * MINUTE,
      props: { timestamp: Date.UTC(2025, 11, 31, 23, 58, 30) },
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-timestamp"]' },
        { type: 'mouseleave', selector: '[data-mol-id="chat-timestamp"]' },
      ],
    },
    {
      name: 'a switch to French re-formats the label and the exact time',
      now: AT + 5 * MINUTE,
      context: { translations: { fr: {} } },
      props: { timestamp: AT },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'mouseenter', selector: '[data-mol-id="chat-timestamp"]' },
      ],
    },
    {
      name: 'a new timestamp prop re-renders the label',
      now: AT + 5 * MINUTE,
      props: { timestamp: AT },
      interactions: [{ type: 'props', props: { timestamp: AT + 4 * MINUTE } }],
    },
  ],
}

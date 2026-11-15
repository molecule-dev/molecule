/**
 * `@molecule/app-mini-calendar-react` cases: the compact month calendar with
 * day selection, prev/next navigation, locale-formatted names and a day
 * predicate.
 *
 * Every case pins `now` where the component reads the clock (no `month` prop),
 * so the visible month, the 6×7 grid and the weekday header read the same on
 * every day the cases run. March 2026 starts on a Sunday (no leading
 * out-of-month days); April 2026 starts on a Wednesday, so its grid carries
 * dimmed days from both neighbouring months.
 *
 * `isDisabled` is a function prop, so it travels as a `{ $fn }` value: every
 * framework materializes it into a predicate returning the same value.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** 2026-03-15T00:00:00Z — a March case. */
const MARCH_2026 = new Date(Date.UTC(2026, 2, 15))

/** 2026-04-15T00:00:00Z — an April case (its grid starts on 2026-03-29). */
const APRIL_2026 = new Date(Date.UTC(2026, 3, 15))

/** The instant the default-month cases pin: 2026-03-15T00:00:00Z. */
const NOW_MARCH = Date.UTC(2026, 2, 15)

/** 2026-01-15T00:00:00Z — January, so going back crosses a year boundary. */
const NOW_JANUARY = Date.UTC(2026, 0, 15)

/** 2026-07-15T00:00:00Z — a clock far from the supplied selected date. */
const NOW_JULY = Date.UTC(2026, 6, 15)

/** The nav buttons, by the aria-label React puts on their Button. */
const NEXT = '[aria-label="Next month"]'
const PREV = '[aria-label="Previous month"]'

/**
 * A day button inside the grid, by its position among the grid's buttons (the
 * weekday spans are not buttons): `day(N)` is the Nth day button (1-based).
 *
 * @param n - The 1-based day-button index.
 * @returns The CSS selector.
 */
const day = (n: number): string => `header + div > button:nth-of-type(${n})`

/** `@molecule/app-mini-calendar-react`. */
export const miniCalendarFeature: FeatureCases = {
  package: '@molecule/app-mini-calendar-react',
  families: [
    {
      component: 'MiniCalendar',
      cases: [
        {
          name: 'defaults to the current month with a full 6x7 grid',
          now: NOW_MARCH,
        },
        {
          name: 'renders the month passed in, normalized to its first day',
          props: { month: MARCH_2026 },
        },
        {
          name: 'renders a month whose grid starts in the previous month',
          props: { month: APRIL_2026 },
        },
        {
          name: 'formats month and weekday names in the given locale',
          props: { month: MARCH_2026, locale: 'de-DE' },
        },
        {
          name: 'marks a Date selected day with aria-current',
          props: { month: MARCH_2026, selected: new Date(Date.UTC(2026, 2, 10)) },
        },
        {
          name: 'marks an ISO string selected day with aria-current',
          props: { month: MARCH_2026, selected: '2026-03-10' },
        },
        {
          name: 'an invalid selected string selects no day',
          props: { month: MARCH_2026, selected: 'not-a-date' },
        },
        {
          name: 'an empty selected string selects no day',
          props: { month: MARCH_2026, selected: '' },
        },
        {
          name: 'a selected day outside the visible month is not marked',
          props: { month: MARCH_2026, selected: new Date(Date.UTC(2026, 3, 10)) },
        },
        {
          name: 'derives the initial month from the selected date',
          props: { selected: new Date(Date.UTC(2026, 2, 20)) },
          now: NOW_JULY,
        },
        {
          name: 'a supplied month wins over the selected date for the visible month',
          props: { month: MARCH_2026, selected: new Date(Date.UTC(2026, 3, 10)) },
        },
        {
          name: 'forwards className onto the root element',
          props: { month: MARCH_2026, className: 'parity-token' },
        },
        {
          name: 'an empty className still renders the root class attribute',
          props: { month: MARCH_2026, className: '' },
        },
        {
          name: 'disables every day the predicate accepts',
          props: { month: MARCH_2026, isDisabled: { $fn: 'isDisabled', returns: true } },
        },
        {
          name: 'leaves every day enabled when the predicate returns false',
          props: { month: MARCH_2026, isDisabled: { $fn: 'isDisabled', returns: false } },
        },
        {
          name: 'treats an undefined predicate result as enabled',
          props: { month: MARCH_2026, isDisabled: { $fn: 'isDisabled' } },
        },
        {
          name: 'navigating next in uncontrolled mode advances the visible month',
          now: NOW_MARCH,
          callbacks: ['onMonthChange'],
          interactions: [{ type: 'click', selector: NEXT }],
        },
        {
          name: 'navigating previous crosses the year boundary',
          now: NOW_JANUARY,
          callbacks: ['onMonthChange'],
          interactions: [{ type: 'click', selector: PREV }],
        },
        {
          name: 'navigating next without onMonthChange still moves the month',
          now: NOW_MARCH,
          interactions: [{ type: 'click', selector: NEXT }],
        },
        {
          name: 'a controlled month ignores internal navigation and reports it',
          props: { month: MARCH_2026 },
          callbacks: ['onMonthChange'],
          interactions: [{ type: 'click', selector: NEXT }],
        },
        {
          name: 'clicking a day calls onSelect with the day',
          props: { month: MARCH_2026 },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: day(10) }],
        },
        {
          name: 'clicking an out-of-month day calls onSelect too',
          props: { month: MARCH_2026 },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: day(42) }],
        },
        {
          name: 'clicking a day without onSelect is a no-op',
          props: { month: MARCH_2026 },
          interactions: [{ type: 'click', selector: day(1) }],
        },
        {
          name: 'clicking a disabled day does not call onSelect',
          props: { month: MARCH_2026, isDisabled: { $fn: 'isDisabled', returns: true } },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: day(10) }],
        },
        {
          name: 'a keydown on a day button changes nothing',
          props: { month: MARCH_2026 },
          callbacks: ['onSelect'],
          interactions: [{ type: 'keydown', selector: day(10), key: 'Enter' }],
        },
        {
          name: 'moving selected to another day re-marks the grid',
          props: { month: MARCH_2026, selected: new Date(Date.UTC(2026, 2, 5)) },
          interactions: [{ type: 'props', props: { selected: new Date(Date.UTC(2026, 2, 20)) } }],
        },
        {
          name: 'clearing selected removes the mark',
          props: { month: MARCH_2026, selected: new Date(Date.UTC(2026, 2, 10)) },
          interactions: [{ type: 'props', props: { selected: undefined } }],
        },
        {
          name: 'selecting the clicked day after onSelect re-marks the grid',
          props: { month: MARCH_2026 },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: day(10) },
            { type: 'props', props: { selected: '2026-03-10' } },
          ],
        },
        {
          name: 'changing the month prop re-renders the grid',
          props: { month: MARCH_2026 },
          interactions: [{ type: 'props', props: { month: APRIL_2026 } }],
        },
        {
          name: 'changing the locale reformats the month and weekday names',
          props: { month: MARCH_2026, locale: 'en-US' },
          interactions: [{ type: 'props', props: { locale: 'de-DE' } }],
        },
        {
          name: 'changing the predicate updates the day buttons',
          props: { month: MARCH_2026, isDisabled: { $fn: 'isDisabled', returns: false } },
          interactions: [
            { type: 'props', props: { isDisabled: { $fn: 'isDisabled', returns: true } } },
          ],
        },
        {
          name: 'changing className updates the root classes',
          props: { month: MARCH_2026, className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
      ],
    },
  ],
}

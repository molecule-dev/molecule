/**
 * `@molecule/app-relative-time-react` cases: `<RelativeTime>` (a live-updating
 * "5 minutes ago" display) and the `formatRelativeTime` utility.
 *
 * Every case pins `now`, so the relative text and the absolute `dateTime`
 * attribute read the same on every day the case runs.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The instant every case's `Date.now()` is pinned to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** One hour after `NOW`. */
const ISO_IN_AN_HOUR = new Date(NOW + 3_600_000).toISOString()

/** Three days after `NOW`. */
const ISO_IN_THREE_DAYS = new Date(NOW + 3 * 86_400_000).toISOString()

/** One minute before `NOW`. */
const ISO_MINUTE_AGO = new Date(NOW - 60_000).toISOString()

/** Five minutes before `NOW`. */
const ISO_FIVE_MINUTES_AGO = new Date(NOW - 5 * 60_000).toISOString()

/** Three days before `NOW`. */
const ISO_THREE_DAYS_AGO = new Date(NOW - 3 * 86_400_000).toISOString()

/** `@molecule/app-relative-time-react`. */
export const relativeTimeFeature: FeatureCases = {
  package: '@molecule/app-relative-time-react',
  families: [
    {
      component: 'RelativeTime',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): with no `locale` prop the label formats
        // in the app's active locale, so the switched snapshot's text is the
        // pseudo-locale's `⟦…⟧`.
        {
          name: 'no locale follows the app’s active locale',
          props: { date: ISO_FIVE_MINUTES_AGO },
          now: NOW,
        },
        {
          name: 'a past date renders its relative text',
          props: { date: ISO_FIVE_MINUTES_AGO, locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'a future date renders "in 3 days"',
          props: { date: ISO_IN_THREE_DAYS, locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'epoch milliseconds render the same instant',
          props: { date: NOW - 60_000, locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'a Date instance renders the same instant',
          props: { date: new Date(NOW - 3_600_000), locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'an ISO string without milliseconds keeps its own dateTime text',
          props: { date: '2026-05-13T11:55:00Z', locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'the locale is passed through to Intl',
          props: { date: ISO_FIVE_MINUTES_AGO, locale: 'fr' },
          now: NOW,
        },
        {
          name: 'titleLocale adds the absolute date as a title',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', titleLocale: 'en-US' },
          now: NOW,
        },
        {
          name: 'titleLocale in another locale formats the title',
          props: { date: ISO_THREE_DAYS_AGO, locale: 'en-US', titleLocale: 'de-DE' },
          now: NOW,
        },
        {
          name: 'className is passed to the time element',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', className: 'parity-token' },
          now: NOW,
        },
        {
          name: 'an unparseable date renders the fallback text',
          props: { date: 'not-a-date', locale: 'en-US' },
          now: NOW,
        },
        {
          name: 'the default refresh interval re-renders after a minute',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US' },
          now: NOW,
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 60_000 }],
        },
        {
          name: 'a custom refresh interval re-renders sooner',
          props: { date: new Date(NOW - 5_000).toISOString(), locale: 'en-US', refreshMs: 1000 },
          now: NOW,
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 1000 }],
        },
        {
          name: 'refreshMs 0 disables the timer',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', refreshMs: 0 },
          now: NOW,
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 120_000 }],
        },
        {
          name: 'a negative refreshMs disables the timer',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', refreshMs: -1000 },
          now: NOW,
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 120_000 }],
        },
        {
          name: 'changing refreshMs restarts the timer',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', refreshMs: 0 },
          now: NOW,
          fakeTimers: true,
          interactions: [
            { type: 'props', props: { refreshMs: 1000 } },
            { type: 'advance', ms: 60_000 },
          ],
        },
        {
          name: 'changing the date re-renders',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US' },
          now: NOW,
          interactions: [{ type: 'props', props: { date: ISO_THREE_DAYS_AGO } }],
        },
        {
          name: 'changing the locale re-renders',
          props: { date: ISO_FIVE_MINUTES_AGO, locale: 'en-US' },
          now: NOW,
          interactions: [{ type: 'props', props: { locale: 'de' } }],
        },
        {
          name: 'changing the titleLocale re-renders',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US' },
          now: NOW,
          interactions: [{ type: 'props', props: { titleLocale: 'en-GB' } }],
        },
        {
          name: 'adding and removing className re-renders',
          props: { date: ISO_MINUTE_AGO, locale: 'en-US', className: 'parity-token' },
          now: NOW,
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
        {
          name: 'a date half a second ahead renders "now"',
          props: { date: ISO_IN_AN_HOUR, locale: 'en-US' },
          now: NOW + 3_600_000 - 200,
        },
        {
          name: 'a year back renders "last year"',
          props: { date: new Date(NOW - 366 * 86_400_000).toISOString(), locale: 'en-US' },
          now: NOW,
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatRelativeTime',
      calls: [
        // Seconds and the singular/plural shapes numeric=auto produces.
        [NOW - 5_000, NOW, 'en-US'],
        [NOW, NOW, 'en-US'],
        [NOW - 59_000, NOW, 'en-US'],
        // Minutes and hours.
        [NOW - 60_000, NOW, 'en-US'],
        [NOW - 5 * 60_000, NOW, 'en-US'],
        [NOW - 3_599_000, NOW, 'en-US'],
        [NOW - 2 * 3_600_000, NOW, 'en-US'],
        // Days, weeks, months and years.
        [NOW - 86_400_000, NOW, 'en-US'],
        [NOW - 3 * 86_400_000, NOW, 'en-US'],
        [NOW - 7 * 86_400_000, NOW, 'en-US'],
        [NOW - 31 * 86_400_000, NOW, 'en-US'],
        [NOW - 366 * 86_400_000, NOW, 'en-US'],
        // Future instants.
        [NOW + 5 * 60_000, NOW, 'en-US'],
        [NOW + 3_600_000, NOW, 'en-US'],
        [NOW + 86_400_000, NOW, 'en-US'],
        [NOW + 7 * 86_400_000, NOW, 'en-US'],
        [NOW + 366 * 86_400_000, NOW, 'en-US'],
        // Every input shape the utility accepts, and a Date `now`.
        [new Date(NOW - 60_000), NOW, 'en-US'],
        [new Date(NOW - 60_000).toISOString(), NOW, 'en-US'],
        [NOW - 60_000, new Date(NOW), 'en-US'],
        // Locale handling.
        [NOW - 5 * 60_000, NOW, 'fr'],
        [NOW - 5 * 60_000, NOW, 'es'],
        [NOW - 5 * 60_000, NOW],
      ],
    },
  ],
}

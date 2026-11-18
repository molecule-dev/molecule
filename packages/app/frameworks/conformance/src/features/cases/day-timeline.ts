/**
 * `@molecule/app-day-timeline-react` cases: the vertical day-of-events
 * timeline, its hour axis, the gridlines and every event card.
 *
 * Every runtime export of the React package is covered: `DayTimeline` (the
 * family below) and `formatHour` (a pure function, compared by value). The
 * component reads the app's i18n provider (`useTranslation()`), so the
 * family's first case is re-run after a locale switch, like every other
 * feature case.
 *
 * The cases walk every branch: an empty event list (with the axis hidden, so
 * the switch case carries no unlocalized tick text), the defaults, a partial
 * day window, a start hour between two ticks, bounds clamped at 0 and 24 and
 * a start past the end, an event shorter than 15 minutes (the 20px floor), an
 * event that ends before it starts, per-event accent colors and subtitles
 * (including an empty one), plain, numeric and node-valued titles and
 * subtitles, a per-event `onClick` beside inert events, `className` /
 * `dataMolId` pass-through, and interactions that change the window, the axis,
 * the event list and the class/id again. Events are keyed by `id`, so
 * `keyedLists` proves a re-passed or re-ordered list keeps each card's DOM.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const events = [
  { id: 'standup', title: 'Stand-up', startHour: 9, endHour: 9.5 },
  { id: 'lunch', title: 'Lunch', subtitle: 'Canteen', startHour: 12, endHour: 13 },
  { id: 'flight', title: 'Flight to LAX', startHour: 13, endHour: 16, accentColor: '#3366ff' },
]

const oneEvent = [{ id: 'standup', title: 'Stand-up', startHour: 9, endHour: 9.5 }]

/** `@molecule/app-day-timeline-react`. */
export const dayTimelineFeature: FeatureCases = {
  package: '@molecule/app-day-timeline-react',
  families: [
    {
      component: 'DayTimeline',
      cases: [
        // The axis is off in the first case: its tick labels are English clock
        // text from `formatHour()`, which the package documents as unlocalized
        // (hide the axis and render your own when you need i18n there). The
        // locale-switch case derived from it must carry no untranslated text.
        { name: 'no events, axis hidden', props: { events: [], showAxisLabels: false } },
        { name: 'defaults with events', props: { events } },
        {
          name: 'a partial day window',
          props: { events, startHour: 7, endHour: 22, pxPerHour: 40 },
        },
        {
          name: 'a start hour between ticks',
          props: {
            events: [{ id: 'call', title: 'Call', startHour: 10, endHour: 10.75 }],
            startHour: 9.5,
            endHour: 12,
            pxPerHour: 30,
          },
        },
        {
          name: 'bounds clamped below and above',
          props: {
            events: [{ id: 'early', title: 'Early', startHour: -1, endHour: 0.5 }],
            startHour: -3,
            endHour: 30,
            pxPerHour: 10,
          },
        },
        { name: 'a start past the end', props: { events, startHour: 25, endHour: 10 } },
        {
          name: 'an event shorter than fifteen minutes',
          props: { events: [{ id: 'blip', title: 'Blip', startHour: 9, endHour: 9.05 }] },
        },
        {
          name: 'an event that ends before it starts',
          props: { events: [{ id: 'back', title: 'Backwards', startHour: 10, endHour: 9 }] },
        },
        {
          name: 'accent colors and subtitles',
          props: {
            events: [
              {
                id: 'red',
                title: 'Red',
                subtitle: 'Room 4',
                startHour: 9,
                endHour: 10,
                accentColor: '#ff0000',
              },
              { id: 'empty', title: 'No subtitle', subtitle: '', startHour: 11, endHour: 12 },
            ],
          },
        },
        {
          name: 'node-valued titles and a numeric title',
          props: {
            events: [
              {
                id: 'node',
                title: { $nodes: [{ tag: 'strong', children: ['Flight'] }] },
                subtitle: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
                startHour: 13,
                endHour: 14,
              },
              { id: 'number', title: 7, startHour: 15, endHour: 16 },
            ],
          },
        },
        {
          name: 'a clickable event calls its handler',
          props: {
            events: [
              {
                id: 'tap',
                title: 'Tap me',
                startHour: 10,
                endHour: 11,
                onClick: { $callback: 'eventClick' },
              },
              { id: 'fixed', title: 'Fixed', startHour: 12, endHour: 13 },
            ],
          },
          interactions: [
            {
              type: 'click',
              selector: '[data-event-id="tap"] [data-mol-id="day-timeline-event-action"]',
            },
            // An inert card has no control to click: neither click nor a key
            // press reaches a handler.
            { type: 'click', selector: '[data-event-id="fixed"]' },
            {
              type: 'keydown',
              selector: '[data-event-id="tap"] [data-mol-id="day-timeline-event-action"]',
              key: 'Enter',
            },
          ],
        },
        {
          name: 'classes and an id',
          props: { events, className: 'parity-token', dataMolId: 'trip-day-1' },
        },
        {
          name: 'the axis labels are hidden',
          props: { events, showAxisLabels: false, startHour: 9, endHour: 12 },
        },
        {
          name: 'the window changes',
          props: { events, startHour: 6, endHour: 20 },
          interactions: [
            { type: 'props', props: { startHour: 8, endHour: 18, pxPerHour: 30 } },
            { type: 'props', props: { showAxisLabels: false } },
          ],
        },
        {
          name: 'the events change',
          props: { events: oneEvent },
          interactions: [
            { type: 'props', props: { events } },
            { type: 'props', props: { events: [] } },
          ],
        },
        {
          name: 'a subtitle appears',
          props: { events: oneEvent },
          interactions: [
            {
              type: 'props',
              props: {
                events: [
                  {
                    id: 'standup',
                    title: 'Stand-up',
                    subtitle: 'Room 4',
                    startHour: 9,
                    endHour: 9.5,
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'the class name and id are removed',
          props: { events: [], className: 'parity-token', dataMolId: 'trip-day-1' },
          interactions: [{ type: 'props', props: { className: undefined, dataMolId: undefined } }],
        },
      ],
      keyedLists: [
        { prop: 'events', selector: '[data-event-id]', caseName: 'defaults with events' },
      ],
    },
  ],
  values: [
    {
      export: 'formatHour',
      calls: [[0], [0.25], [9], [9.5], [12], [12.75], [13.25], [23], [23.5], [24]],
    },
  ],
}

/**
 * `@molecule/app-class-schedule-react` cases: the weekly timetable grid (every
 * column-ordering, hour-range, cell-height and weekend branch, clipped and
 * overlapping event tiles, accent bars, node-valued lines) and the two plain
 * exports (`formatHourLabel`, `assignLanes`) checked by value.
 *
 * @module
 */

import type { NodesValue } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A node-valued event line: React's `ReactNode` inside the `events` prop. */
const node = (tag: string, text: string): NodesValue => ({
  $nodes: [{ tag, children: [text] }],
})

/** The default week's Monday class, with every optional line. */
const math = {
  id: 'math',
  weekday: 1,
  start: 9 * 60,
  end: 10 * 60,
  title: 'Math',
  subtitle: 'Room 4B',
  meta: 'Mr. Smith',
}

/** A Wednesday class with only the required title. */
const english = { id: 'eng', weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English' }

/** A Monday class that overlaps {@link math}, so both split into lanes. */
const lab = { id: 'lab', weekday: 1, start: 9 * 60 + 30, end: 11 * 60 + 30, title: 'Lab' }

/** A Sunday class — visible only when the week starts on Sunday or weekends show. */
const sundayClass = { id: 'sun', weekday: 0, start: 10 * 60, end: 11 * 60, title: 'Sunday' }

/** A Saturday class — hidden when `showWeekendCols` is `false`. */
const saturdayClass = { id: 'sat', weekday: 6, start: 10 * 60, end: 11 * 60, title: 'Saturday' }

/** `@molecule/app-class-schedule-react`. */
export const classScheduleFeature: FeatureCases = {
  package: '@molecule/app-class-schedule-react',
  families: [
    {
      component: 'ClassSchedule',
      cases: [
        { name: 'empty schedule', props: { events: [] } },
        {
          name: 'two events on their weekdays',
          props: { events: [math, english] },
        },
        {
          name: 'a week starting on Sunday',
          props: { events: [sundayClass, math], weekStartsOn: 0 },
        },
        {
          name: 'a week starting on Wednesday',
          props: { events: [math, english], weekStartsOn: 3 },
        },
        {
          name: 'a week starting on Saturday, weekends shown',
          props: { events: [saturdayClass], weekStartsOn: 6 },
        },
        {
          name: 'weekdays only',
          props: { events: [saturdayClass, sundayClass, math], showWeekendCols: false },
        },
        {
          name: 'weekdays only, a week starting on Sunday',
          props: { events: [sundayClass], weekStartsOn: 0, showWeekendCols: false },
        },
        {
          name: 'a custom hour range and cell height',
          props: { events: [math], dayHours: [9, 13], cellHeight: 45 },
        },
        {
          name: 'an hour range clamped to the day',
          props: { events: [math], dayHours: [-3, 30], cellHeight: 30 },
        },
        {
          name: 'an inverted hour range',
          props: { events: [math], dayHours: [10, 10] },
        },
        {
          name: 'fractional hour bounds round down',
          props: { events: [math], dayHours: [8.7, 18.2] },
        },
        {
          name: 'localized weekday names',
          props: { events: [math, english], locale: 'de-DE' },
        },
        {
          name: 'events clipped to the visible hours, and events outside them',
          props: {
            events: [
              { id: 'early', weekday: 2, start: 6 * 60, end: 9 * 60 + 30, title: 'Early' },
              { id: 'late', weekday: 2, start: 17 * 60 + 30, end: 20 * 60, title: 'Late' },
              { id: 'before', weekday: 4, start: 6 * 60, end: 8 * 60, title: 'Before' },
              { id: 'after', weekday: 4, start: 18 * 60, end: 20 * 60, title: 'After' },
            ],
            dayHours: [8, 18],
          },
        },
        {
          name: 'overlapping events split into two lanes',
          props: { events: [math, lab] },
        },
        {
          name: 'three events across two lanes',
          props: {
            events: [
              { id: 'a', weekday: 2, start: 9 * 60, end: 11 * 60, title: 'A' },
              { id: 'b', weekday: 2, start: 10 * 60, end: 12 * 60, title: 'B' },
              { id: 'c', weekday: 2, start: 11 * 60, end: 13 * 60, title: 'C' },
            ],
          },
        },
        {
          name: 'an accent color draws the inset bar and colors the meta line',
          props: { events: [{ ...math, accentColor: '#ff0000' }, english] },
        },
        {
          name: 'an accent color without a meta line',
          props: { events: [{ ...math, meta: undefined, accentColor: '#00aa55' }] },
        },
        {
          name: 'node-valued title, subtitle and meta',
          props: {
            events: [
              {
                id: 'nodes',
                weekday: 5,
                start: 10 * 60,
                end: 11 * 60,
                title: node('strong', 'Physics'),
                subtitle: node('em', 'Lab 2'),
                meta: node('span', 'Dr. Chen'),
              },
            ],
          },
        },
        {
          name: 'forwards className on the root',
          props: { events: [math], className: 'parity-token' },
        },
        {
          name: 'event and slot clicks reach their own callbacks',
          props: { events: [math] },
          callbacks: ['onEventClick', 'onSlotClick'],
          interactions: [
            { type: 'click', selector: '[data-event-id="math"]' },
            {
              type: 'click',
              selector: '[data-mol-id="class-schedule-slot"][data-weekday="2"][data-start="600"]',
            },
          ],
        },
        {
          name: 'the events list changes',
          props: { events: [math] },
          callbacks: ['onEventClick'],
          interactions: [
            { type: 'props', props: { events: [english] } },
            { type: 'click', selector: '[data-event-id="eng"]' },
          ],
        },
        {
          name: 'the week start changes',
          props: { events: [sundayClass], weekStartsOn: 1 },
          interactions: [{ type: 'props', props: { weekStartsOn: 0 } }],
        },
        {
          name: 'weekends hide',
          props: { events: [saturdayClass, math] },
          interactions: [
            { type: 'props', props: { showWeekendCols: false } },
            { type: 'props', props: { showWeekendCols: true } },
          ],
        },
        {
          name: 'the hour range changes',
          props: { events: [math] },
          interactions: [{ type: 'props', props: { dayHours: [9, 11], cellHeight: 90 } }],
        },
        {
          name: 'translations supply the region, slot and event labels',
          props: { events: [math] },
          context: {
            translations: {
              en: {
                classSchedule: {
                  aria: {
                    region: 'Weekly timetable',
                    slot: 'Open {{weekday}} at {{time}}',
                    event: '{{weekday}} {{start}} to {{end}}',
                  },
                },
              },
            },
          },
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatHourLabel',
      calls: [[0], [540], [545], [13 * 60 + 30], [1439]],
    },
    {
      export: 'assignLanes',
      calls: [
        [
          [
            { start: 540, end: 600 },
            { start: 660, end: 720 },
          ],
        ],
        [
          [
            { start: 540, end: 660 },
            { start: 600, end: 720 },
          ],
        ],
        [
          [
            { start: 540, end: 600 },
            { start: 555, end: 595 },
            { start: 720, end: 780 },
          ],
        ],
        [[{ start: 540, end: 600 }]],
        [[]],
      ],
    },
  ],
}

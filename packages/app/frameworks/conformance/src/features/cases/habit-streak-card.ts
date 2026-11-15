/**
 * `@molecule/app-habit-streak-card-react` cases: the habit name, the leading
 * icon, the current / best streak and total-completion stats, the heatmap
 * strip with its intensity colors and day window, the class passthrough, and
 * prop changes that swap each of them.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A three-day heatmap: an empty day, a busy day and a light day. */
const threeDays = [
  { date: '2026-05-01', count: 0 },
  { date: '2026-05-02', count: 3 },
  { date: '2026-05-03', count: 1 },
]

/** A 31-day heatmap, one day past the default 30-day window. */
const thirtyOneDays = Array.from({ length: 31 }, (_, i) => ({
  date: `2026-06-${String(i + 1).padStart(2, '0')}`,
  count: i % 4,
}))

/** `@molecule/app-habit-streak-card-react`. */
export const habitStreakCardFeature: FeatureCases = {
  package: '@molecule/app-habit-streak-card-react',
  families: [
    {
      component: 'HabitStreakCard',
      cases: [
        { name: 'name and the current streak', props: { name: 'Meditate', currentStreak: 7 } },
        {
          name: 'a name node and an icon',
          props: { currentStreak: 14 },
          slots: {
            name: [{ tag: 'strong', children: ['Morning'] }, ' run'],
            icon: [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['🧘'] }],
          },
        },
        {
          name: 'best streak when given',
          props: { name: 'Read', currentStreak: 3, bestStreak: 30 },
        },
        {
          name: 'total completions when given',
          props: { name: 'Read', currentStreak: 3, totalCompletions: 120 },
        },
        {
          name: 'best streak and total completions together',
          props: { name: 'Run', currentStreak: 5, bestStreak: 30, totalCompletions: 120 },
        },
        {
          name: 'zero best streak and total completions still show',
          props: { name: 'Run', currentStreak: 1, bestStreak: 0, totalCompletions: 0 },
        },
        {
          name: 'heatmap with an empty day and a busy day',
          props: { name: 'Run', currentStreak: 2, heatmap: threeDays },
        },
        {
          name: 'heatmap truncated to the last two days',
          props: { name: 'Run', currentStreak: 2, heatmapDays: 2, heatmap: threeDays },
        },
        {
          name: 'an empty heatmap renders no strip',
          props: { name: 'Run', currentStreak: 2, heatmap: [] },
        },
        {
          name: 'a heatmap longer than the default window keeps the latest 30',
          props: { name: 'Run', currentStreak: 2, heatmap: thirtyOneDays },
        },
        {
          name: 'heatmapDays zero shows the whole heatmap',
          props: {
            name: 'Run',
            currentStreak: 2,
            heatmapDays: 0,
            heatmap: [
              { date: '2026-07-01', count: 1 },
              { date: '2026-07-02', count: 2 },
            ],
          },
        },
        {
          name: 'a heatmap of equal counts',
          props: {
            name: 'Run',
            currentStreak: 2,
            heatmap: [
              { date: '2026-08-01', count: 2 },
              { date: '2026-08-02', count: 2 },
              { date: '2026-08-03', count: 2 },
              { date: '2026-08-04', count: 2 },
            ],
          },
        },
        {
          name: 'class on the card',
          props: { name: 'Run', currentStreak: 2, className: 'parity-token' },
        },
        {
          name: 'a streak change updates the numbers',
          props: { name: 'Run', currentStreak: 3, bestStreak: 5 },
          interactions: [{ type: 'props', props: { currentStreak: 4, bestStreak: 6 } }],
        },
        {
          name: 'a heatmap change re-renders the strip',
          props: {
            name: 'Run',
            currentStreak: 2,
            heatmap: [
              { date: '2026-09-01', count: 1 },
              { date: '2026-09-02', count: 2 },
            ],
          },
          interactions: [{ type: 'props', props: { heatmap: threeDays } }],
        },
        {
          name: 'a heatmapDays change re-truncates',
          props: { name: 'Run', currentStreak: 2, heatmapDays: 3, heatmap: threeDays },
          interactions: [{ type: 'props', props: { heatmapDays: 1 } }],
        },
        {
          name: 'a name change',
          props: { name: 'Read', currentStreak: 2 },
          interactions: [{ type: 'props', props: { name: 'Read 20 pages' } }],
        },
        {
          name: 'a best streak removed again',
          props: { name: 'Run', currentStreak: 2, bestStreak: 30 },
          interactions: [{ type: 'props', props: { bestStreak: undefined } }],
        },
        {
          name: 'the whole heatmap disappears',
          props: { name: 'Run', currentStreak: 2, heatmap: threeDays },
          interactions: [{ type: 'props', props: { heatmap: [] } }],
        },
      ],
    },
  ],
}

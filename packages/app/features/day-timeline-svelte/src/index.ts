/**
 * Svelte vertical 24h day-of-events timeline — itinerary planner, daily agenda,
 * schedule view. Events are absolutely positioned by start/end hour and
 * scaled by `pxPerHour` (total height = (endHour - startHour) * pxPerHour).
 *
 * Exports `DayTimeline` and `formatHour` — the Svelte counterpart of
 * `@molecule/app-day-timeline-react`, with the same props (React names) and
 * the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { DayTimeline } from '@molecule/app-day-timeline-svelte'
 *
 *   const events = [
 *     { id: 'flight', title: 'Flight to LAX', startHour: 13, endHour: 16 },
 *     { id: 'dinner', title: 'Dinner', startHour: 19, endHour: 20.5 },
 *   ]
 * </script>
 *
 * <DayTimeline startHour={7} endHour={22} {events} />
 * ```
 *
 * @remarks
 * - **No overlap/lane layout.** Events are absolutely positioned across the
 *   full rail width, so events with overlapping time ranges render stacked
 *   on top of each other. If your data can contain concurrent events,
 *   partition them into separate `<DayTimeline>` columns (one per lane or
 *   resource) before rendering — the component does not de-conflict.
 * - Bounds are clamped: `startHour` to [0, 24], `endHour` to at least
 *   `startHour + 1`; an event shorter than 15 minutes still renders at a
 *   20px minimum height so it stays clickable.
 * - Axis tick labels are formatted by the exported `formatHour()`, which
 *   uses English 12-hour "AM/PM" notation. There is currently no prop to
 *   localize tick formatting — hide them with `showAxisLabels={false}` and
 *   render your own axis if you need 24h or localized labels.
 * - Aria labels resolve through `t()` with English fallbacks; the companion
 *   locale bond is `@molecule/app-locales-day-timeline`. Requires the app's
 *   i18n provider (`useTranslation()` throws without one) and a wired
 *   ClassMap bond (standard molecule app setup).
 * - Events with an `onClick` render their content inside a native `<button>`
 *   (Enter and Space activate it); events without one are not focusable.
 * - Titles and subtitles are snippets, or plain text, as React's `ReactNode`
 *   fields are.
 * - Events are keyed by their `id` (a keyed each block), so a re-passed or
 *   re-ordered list keeps each card's DOM the way React's `key` does.
 *
 * @module
 */

export * from './components.js'
export * from './format.js'
export * from './types.js'

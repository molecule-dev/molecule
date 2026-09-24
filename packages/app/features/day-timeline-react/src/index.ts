/**
 * Vertical 24h day-of-events timeline — itinerary planner, daily agenda,
 * schedule view. Events are absolutely positioned by start/end hour and
 * scaled by `pxPerHour` (total height = (endHour - startHour) * pxPerHour).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { DayTimeline, type DayTimelineEvent } from '@molecule/app-day-timeline-react'
 *
 * export function ItineraryDay() {
 *   const [openId, setOpenId] = useState<string | null>(null)
 *   const plan = [
 *     { id: 'flight', title: 'Flight to LAX', subtitle: 'Gate 32', startHour: 13, endHour: 16 },
 *     { id: 'dinner', title: 'Dinner', subtitle: 'Bestia', startHour: 19, endHour: 20.5, accentColor: '#f97316' },
 *   ]
 *   const events: DayTimelineEvent[] = plan.map((item) => ({ ...item, onClick: () => setOpenId(item.id) }))
 *   return (
 *     <>
 *       <DayTimeline startHour={7} endHour={22} pxPerHour={48} events={events} dataMolId="itinerary-day" />
 *       <p>{openId}</p>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **No overlap/lane layout.** Events are absolutely positioned across the
 *   full rail width, so events with overlapping time ranges render stacked
 *   on top of each other. If your data can contain concurrent events,
 *   partition them into separate `<DayTimeline>` columns (one per lane or
 *   resource) before rendering — the component does not de-conflict.
 * - Times are FRACTIONAL HOURS in 24h (`20.5` = 8:30 PM) — not minutes, Dates or `"20:30"`
 *   strings. There is no date: it renders one generic day. Click handling is per event
 *   (`event.onClick`), there is no component-level `onEventClick` and no empty-slot click.
 * - Bounds are clamped: `startHour` to [0, 24], `endHour` to at least
 *   `startHour + 1`; an event shorter than 15 minutes still renders at a
 *   20px minimum height so it stays clickable.
 * - Axis tick labels are formatted by the exported `formatHour()`, which
 *   uses English 12-hour "AM/PM" notation. There is currently no prop to
 *   localize tick formatting — hide them with `showAxisLabels={false}` and
 *   render your own axis if you need 24h or localized labels.
 * - Aria labels resolve through `t()` with English fallbacks; the companion
 *   locale bond is `@molecule/app-locales-day-timeline`. Requires the app's
 *   I18nProvider and a wired ClassMap bond (standard molecule app setup).
 * - Events with an `onClick` get `tabIndex={0}` + Enter/Space activation;
 *   events without one are not focusable.
 *
 * @module
 */

export * from './DayTimeline.js'
export * from './types.js'

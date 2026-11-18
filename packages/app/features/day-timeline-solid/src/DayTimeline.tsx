/**
 * Solid vertical 24h day-of-events timeline — itinerary planner, daily agenda,
 * schedule view.
 *
 * Solid counterpart of `@molecule/app-day-timeline-react`'s `DayTimeline` —
 * the same props (React names), the same ClassMap tokens, the same inline
 * styles, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { DayTimelineEvent, DayTimelineProps } from './types.js'

/**
 * Format a fractional 24h hour as `H AM/PM` (e.g. `9.5` → `9:30 AM`).
 *
 * @param hour - Fractional 24h hour value.
 * @returns A short clock-style label.
 */
export function formatHour(hour: number): string {
  const hh = Math.floor(hour)
  const mm = Math.round((hour - hh) * 60)
  const period = hh >= 12 ? 'PM' : 'AM'
  const display = ((hh + 11) % 12) + 1
  return mm === 0 ? `${display} ${period}` : `${display}:${String(mm).padStart(2, '0')} ${period}`
}

/** Props accepted by the internal event card. */
interface DayEventProps {
  /** The event the card shows. */
  event: DayTimelineEvent
  /** The viewport's clamped first hour. */
  startHour: number
  /** The pixel height of one hour. */
  pxPerHour: number
}

/**
 * One absolutely-positioned event card, as React's internal `DayEvent`
 * renders it: the listitem carries the geometry and the card look, and the
 * interaction lives on an inner native button (or a plain block when the event
 * has no `onClick`).
 *
 * @param props - The event, the viewport's start hour and the hour height.
 * @returns The rendered event card.
 */
const DayEvent: Component<DayEventProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const safeEnd = (): number => Math.max(props.event.endHour, props.event.startHour + 0.25)
  const top = (): number => (props.event.startHour - props.startHour) * props.pxPerHour
  const height = (): number => Math.max(20, (safeEnd() - props.event.startHour) * props.pxPerHour)

  /** The event's accessible label, built from React's i18n key and default message. */
  const ariaLabel = (): string =>
    t(
      'dayTimeline.event',
      {
        title: typeof props.event.title === 'string' ? props.event.title : '',
        start: formatHour(props.event.startHour),
        end: formatHour(safeEnd()),
      },
      { defaultValue: '{{title}} from {{start}} to {{end}}' },
    )

  /** The card's inline style — geometry only; its colors are ClassMap classes. */
  const cardStyle = (): JSX.CSSProperties => ({
    position: 'absolute',
    top: `${top()}px`,
    left: '6px',
    right: '6px',
    height: `${height()}px`,
    'border-radius': '6px',
    overflow: 'hidden',
    // The event's accent color drives an inset bar, not a border-left. Without
    // it the bar is the brand primary, through the recipe's `primary` tone.
    ...(props.event.accentColor ? { '--mol-accent': props.event.accentColor } : {}),
  })

  /**
   * The content block: it fills the card so the whole surface is the click
   * target, and its 30px left padding keeps the text clear of the accent bar.
   */
  const contentStyle = (): JSX.CSSProperties => ({
    position: 'absolute',
    inset: '0px',
    padding: '0.4rem 0.6rem 0.4rem 30px',
    font: 'inherit',
    color: 'inherit',
    'text-align': 'left',
  })

  /** The interactive surface's style: the block, plus a pointer cursor when clickable. */
  const actionStyle = (): JSX.CSSProperties => ({
    ...contentStyle(),
    cursor: 'pointer',
    background: 'transparent',
  })

  // The card's paper is the theme's secondary surface; the accent bar reads
  // the event's own `accentColor` when it has one, and is the brand primary
  // otherwise (the recipe's `primary` tone).
  const tone = (): 'custom' | 'primary' => (props.event.accentColor ? 'custom' : 'primary')

  const content = (): JSX.Element => (
    <>
      <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.event.title}</div>
      {props.event.subtitle ? (
        <div class={cm.accentCardLabel({ tone: tone() })}>{props.event.subtitle}</div>
      ) : null}
    </>
  )

  return (
    <div
      role="listitem"
      data-event-id={props.event.id}
      data-mol-id="day-timeline-event"
      aria-label={ariaLabel()}
      class={cm.cn(cm.accentCard({ tone: tone() }), cm.surfaceSecondary)}
      style={cardStyle()}
    >
      {props.event.onClick ? (
        <button
          type="button"
          data-mol-id="day-timeline-event-action"
          aria-label={ariaLabel()}
          onClick={props.event.onClick}
          style={actionStyle()}
        >
          {content()}
        </button>
      ) : (
        <div style={contentStyle()}>{content()}</div>
      )}
    </div>
  )
}

/**
 * Vertical 24h day-of-events timeline. Events are absolutely positioned over a
 * 1-hour-tick axis; their height reflects duration. Designed for itinerary
 * planners, daily agendas, and schedule views.
 *
 * React keys each event by its `id`, so a re-passed or re-ordered event list
 * keeps the rendered cards per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the card's content reads the CURRENT event for that
 * id reactively.
 *
 * @param props - Component props (see {@link DayTimelineProps}).
 * @returns The rendered timeline.
 */
export const DayTimeline: Component<DayTimelineProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const safeStart = (): number => Math.max(0, Math.min(24, props.startHour ?? 0))
  const safeEnd = (): number => Math.max(safeStart() + 1, Math.min(24, props.endHour ?? 24))
  const pxPerHour = (): number => props.pxPerHour ?? 60
  const showAxis = (): boolean => props.showAxisLabels ?? true
  const totalHeight = (): number => (safeEnd() - safeStart()) * pxPerHour()

  /** The hour ticks in the visible window, pre-built as React builds them. */
  const ticks = (): number[] => {
    const hours: number[] = []
    for (let hour = Math.ceil(safeStart()); hour < safeEnd(); hour += 1) hours.push(hour)
    return hours
  }

  /** One stable record per event id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.events.map((event) => {
      seen.add(event.id)
      let row = records.get(event.id)
      if (!row) {
        row = { id: event.id }
        records.set(event.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const eventFor = (id: string): DayTimelineEvent =>
    props.events.find((event) => event.id === id) as DayTimelineEvent

  /** The wrapper's inline style — the axis grid has no ClassMap resolver. */
  const wrapperStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    display: 'grid',
    'grid-template-columns': showAxis() ? '64px 1fr' : '1fr',
    'min-height': `${totalHeight()}px`,
  })

  /** The axis column's inline style. */
  const axisStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    height: `${totalHeight()}px`,
  })

  /** The rail's inline style; its divider from the axis labels is a class. */
  const railStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    height: `${totalHeight()}px`,
  })

  /** One tick label's inline style. */
  const tickStyle = (hour: number): JSX.CSSProperties => ({
    position: 'absolute',
    top: `${(hour - safeStart()) * pxPerHour()}px`,
    right: '8px',
    transform: 'translateY(-50%)',
  })

  /** One gridline's inline style. */
  const gridlineStyle = (hour: number): JSX.CSSProperties => ({
    position: 'absolute',
    top: `${(hour - safeStart()) * pxPerHour()}px`,
    left: '0px',
    right: '0px',
    height: '1px',
  })

  return (
    <div
      class={cm.cn(props.className)}
      data-mol-id={props.dataMolId ?? 'day-timeline'}
      role="list"
      aria-label={t('dayTimeline.group', {}, { defaultValue: 'Day timeline' })}
      style={wrapperStyle()}
    >
      {showAxis() ? (
        <div style={axisStyle()} aria-hidden="true">
          <For each={ticks()}>
            {(hour) => (
              <div
                data-axis-tick={hour}
                class={cm.cn(cm.textSize('xs'), cm.textMuted)}
                style={tickStyle(hour)}
              >
                {formatHour(hour)}
              </div>
            )}
          </For>
        </div>
      ) : null}
      <div
        class={showAxis() ? cm.borderL : undefined}
        style={railStyle()}
        data-mol-id="day-timeline-rail"
      >
        <For each={ticks()}>
          {(hour) => <div aria-hidden="true" class={cm.bgBorder} style={gridlineStyle(hour)} />}
        </For>
        <For each={keyedRows()}>
          {(row) => (
            <DayEvent event={eventFor(row.id)} startHour={safeStart()} pxPerHour={pxPerHour()} />
          )}
        </For>
      </div>
    </div>
  )
}

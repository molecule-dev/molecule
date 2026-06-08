import type { CSSProperties, ReactElement } from 'react'

import { useTranslation } from '@molecule/app-react'
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

/**
 * Vertical 24h day-of-events timeline. Events are absolutely positioned
 * over a 1-hour-tick axis; their height reflects duration. Designed for
 * itinerary planners, daily agendas, and schedule views.
 *
 * Pure presentation — drag-to-resize and click-to-add-event are out of
 * scope here (parents wire those via `event.onClick` and external pointer
 * handlers if needed).
 *
 * @param props - Component props.
 * @returns The rendered timeline element.
 *
 * @example
 * ```tsx
 * <DayTimeline
 *   startHour={7}
 *   endHour={22}
 *   events={[
 *     { id: 'a', title: 'Stand-up', startHour: 9, endHour: 9.5 },
 *     { id: 'b', title: 'Flight to LAX', startHour: 13, endHour: 16, accentColor: '#3366ff' },
 *   ]}
 * />
 * ```
 */
export function DayTimeline({
  events,
  startHour = 0,
  endHour = 24,
  pxPerHour = 60,
  showAxisLabels = true,
  dataMolId,
  className,
}: DayTimelineProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const safeStart = Math.max(0, Math.min(24, startHour))
  const safeEnd = Math.max(safeStart + 1, Math.min(24, endHour))
  const totalHours = safeEnd - safeStart
  const totalHeight = totalHours * pxPerHour

  // Pre-build hour ticks.
  const ticks: number[] = []
  for (let h = Math.ceil(safeStart); h < safeEnd; h += 1) ticks.push(h)

  const wrapperClass = cm.cn(className)

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: showAxisLabels ? '64px 1fr' : '1fr',
    minHeight: totalHeight,
  }

  const axisStyle: CSSProperties = {
    position: 'relative',
    height: totalHeight,
  }

  const railStyle: CSSProperties = {
    position: 'relative',
    height: totalHeight,
    borderLeft: showAxisLabels ? '1px solid var(--mol-color-outline, rgba(0,0,0,0.12))' : undefined,
  }

  return (
    <div
      className={wrapperClass}
      data-mol-id={dataMolId ?? 'day-timeline'}
      role="list"
      aria-label={t('dayTimeline.group', {}, { defaultValue: 'Day timeline' })}
      style={wrapperStyle}
    >
      {showAxisLabels && (
        <div style={axisStyle} aria-hidden>
          {ticks.map((h) => {
            const top = (h - safeStart) * pxPerHour
            return (
              <div
                key={`tick-${h}`}
                data-axis-tick={h}
                className={cm.textSize('xs')}
                style={{
                  position: 'absolute',
                  top,
                  right: 8,
                  transform: 'translateY(-50%)',
                  color: 'var(--mol-color-on-surface-variant, #666)',
                }}
              >
                {formatHour(h)}
              </div>
            )
          })}
        </div>
      )}

      <div style={railStyle} data-mol-id="day-timeline-rail">
        {ticks.map((h) => {
          const top = (h - safeStart) * pxPerHour
          return (
            <div
              key={`gridline-${h}`}
              aria-hidden
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height: 1,
                background: 'var(--mol-color-outline, rgba(0,0,0,0.08))',
              }}
            />
          )
        })}

        {events.map((ev) => (
          <DayEvent key={ev.id} event={ev} startHour={safeStart} pxPerHour={pxPerHour} t={t} />
        ))}
      </div>
    </div>
  )
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

interface DayEventProps {
  event: DayTimelineEvent
  startHour: number
  pxPerHour: number
  t: TranslateFn
}

/**
 * One absolutely-positioned event card.
 *
 * @param props - Internal sub-props.
 * @returns The rendered event card.
 */
function DayEvent({ event, startHour, pxPerHour, t }: DayEventProps): ReactElement {
  const cm = getClassMap()
  const safeEnd = Math.max(event.endHour, event.startHour + 0.25)
  const top = (event.startHour - startHour) * pxPerHour
  const height = Math.max(20, (safeEnd - event.startHour) * pxPerHour)

  const style: CSSProperties = {
    position: 'absolute',
    top,
    left: 6,
    right: 6,
    height,
    padding: '0.4rem 0.6rem',
    borderRadius: 6,
    overflow: 'hidden',
    background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.04))',
    borderLeft: `4px solid ${event.accentColor ?? 'var(--mol-color-primary, #3366ff)'}`,
    cursor: event.onClick ? 'pointer' : 'default',
  }

  const ariaLabel = t(
    'dayTimeline.event',
    {
      title: typeof event.title === 'string' ? event.title : '',
      start: formatHour(event.startHour),
      end: formatHour(safeEnd),
    },
    { defaultValue: '{{title}} from {{start}} to {{end}}' },
  )

  return (
    <div
      role="listitem"
      data-event-id={event.id}
      data-mol-id="day-timeline-event"
      onClick={event.onClick}
      onKeyDown={(e) => {
        if (event.onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          event.onClick()
        }
      }}
      tabIndex={event.onClick ? 0 : -1}
      aria-label={ariaLabel}
      style={style}
    >
      <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{event.title}</div>
      {event.subtitle && (
        <div
          className={cm.textSize('xs')}
          style={{ color: 'var(--mol-color-on-surface-variant, #666)' }}
        >
          {event.subtitle}
        </div>
      )}
    </div>
  )
}

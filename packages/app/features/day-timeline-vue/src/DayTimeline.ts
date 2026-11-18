/**
 * Vue vertical 24h day-of-events timeline — itinerary planner, daily agenda,
 * schedule view.
 *
 * Vue counterpart of `@molecule/app-day-timeline-react`'s `DayTimeline` — the
 * same props (React names), the same ClassMap tokens, the same inline styles,
 * and the same DOM for the same input. Events are absolutely positioned by
 * start/end hour and scaled by `pxPerHour` (total height =
 * `(endHour - startHour) * pxPerHour`).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { DayTimelineEvent } from './types.js'

/** The translation function `useTranslation()` provides. */
type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

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
 * Children for an element: an array stays as it is, `null`/`undefined`
 * contribute nothing, anything else becomes one child.
 *
 * @param value - A node-valued field.
 * @returns The element's children.
 */
const childrenOf = (value: VNodeChild): VNodeChild[] =>
  value == null ? [] : Array.isArray(value) ? value : [value]

/**
 * The event's accessible label, built from the same i18n key and default
 * message React uses (only a plain string title is carried into it).
 *
 * @param t - The translation function.
 * @param event - The event.
 * @param endHour - The event's clamped end hour.
 * @returns The aria label.
 */
const eventAria = (t: TranslateFn, event: DayTimelineEvent, endHour: number): string =>
  t(
    'dayTimeline.event',
    {
      title: typeof event.title === 'string' ? event.title : '',
      start: formatHour(event.startHour),
      end: formatHour(endHour),
    },
    { defaultValue: '{{title}} from {{start}} to {{end}}' },
  )

/**
 * Vertical 24h day-of-events timeline. Events are absolutely positioned over a
 * 1-hour-tick axis; their height reflects duration. Designed for itinerary
 * planners, daily agendas, and schedule views.
 *
 * @param props - Component props (see {@link DayTimelineProps}).
 * @returns The timeline component.
 */
export const DayTimeline = defineComponent({
  name: 'DayTimeline',
  props: {
    events: { type: Array as PropType<DayTimelineEvent[]>, required: true },
    startHour: { type: Number, default: 0 },
    endHour: { type: Number, default: 24 },
    pxPerHour: { type: Number, default: 60 },
    showAxisLabels: { type: Boolean, default: true },
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * One absolutely-positioned event card, as React's internal `DayEvent`
     * renders it: the listitem carries the geometry and the card look, and the
     * interaction lives on an inner native button (or a plain block when the
     * event has no `onClick`).
     *
     * @param event - The event to render.
     * @param safeStart - The viewport's clamped first hour.
     * @returns The rendered event card.
     */
    const eventCard = (event: DayTimelineEvent, safeStart: number): VNode => {
      const safeEnd = Math.max(event.endHour, event.startHour + 0.25)
      const top = (event.startHour - safeStart) * props.pxPerHour
      const height = Math.max(20, (safeEnd - event.startHour) * props.pxPerHour)
      const ariaLabel = eventAria(t, event, safeEnd)
      // The card's paper is the theme's secondary surface; the accent bar
      // reads the event's own `accentColor` when it has one, and is the brand
      // primary otherwise (the recipe's `primary` tone).
      const tone = event.accentColor ? 'custom' : 'primary'

      const content: VNodeChild[] = [
        h(
          'div',
          { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
          childrenOf(event.title),
        ),
        event.subtitle
          ? h('div', { class: cm.accentCardLabel({ tone }) }, childrenOf(event.subtitle))
          : null,
      ]

      // Fills the card so the whole surface is the click target; the 30px left
      // padding keeps the text clear of the accent bar's inset.
      const contentStyle = {
        position: 'absolute',
        inset: '0px',
        padding: '0.4rem 0.6rem 0.4rem 30px',
        font: 'inherit',
        color: 'inherit',
        textAlign: 'left',
      }

      return h(
        'div',
        {
          // React keys each event by `event.id`; Vue keeps the same nodes only
          // when the vnode carries the same key.
          key: event.id,
          role: 'listitem',
          'data-event-id': event.id,
          'data-mol-id': 'day-timeline-event',
          'aria-label': ariaLabel,
          class: cm.cn(cm.accentCard({ tone }), cm.surfaceSecondary),
          style: {
            position: 'absolute',
            top: `${top}px`,
            left: '6px',
            right: '6px',
            height: `${height}px`,
            borderRadius: '6px',
            overflow: 'hidden',
            // The event's accent color drives an inset bar, not a border-left.
            // Without it the bar is the brand primary, through the recipe's
            // `primary` tone.
            ...(event.accentColor ? { '--mol-accent': event.accentColor } : {}),
          },
        },
        [
          event.onClick
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'day-timeline-event-action',
                  'aria-label': ariaLabel,
                  onClick: event.onClick,
                  style: {
                    ...contentStyle,
                    cursor: 'pointer',
                    background: 'transparent',
                  },
                },
                content,
              )
            : h('div', { style: contentStyle }, content),
        ],
      )
    }

    return (): VNode => {
      const safeStart = Math.max(0, Math.min(24, props.startHour))
      const safeEnd = Math.max(safeStart + 1, Math.min(24, props.endHour))
      const totalHeight = (safeEnd - safeStart) * props.pxPerHour

      // Pre-build hour ticks.
      const ticks: number[] = []
      for (let hour = Math.ceil(safeStart); hour < safeEnd; hour += 1) ticks.push(hour)

      const showAxis = props.showAxisLabels

      const axis = h(
        'div',
        { style: { position: 'relative', height: `${totalHeight}px` }, 'aria-hidden': 'true' },
        ticks.map((hour) =>
          h(
            'div',
            {
              key: `tick-${hour}`,
              'data-axis-tick': hour,
              class: cm.cn(cm.textSize('xs'), cm.textMuted),
              style: {
                position: 'absolute',
                top: `${(hour - safeStart) * props.pxPerHour}px`,
                right: '8px',
                transform: 'translateY(-50%)',
              },
            },
            [formatHour(hour)],
          ),
        ),
      )

      const rail = h(
        'div',
        {
          class: showAxis ? cm.borderL : undefined,
          style: {
            position: 'relative',
            height: `${totalHeight}px`,
          },
          'data-mol-id': 'day-timeline-rail',
        },
        [
          ...ticks.map((hour) =>
            h('div', {
              key: `gridline-${hour}`,
              'aria-hidden': 'true',
              class: cm.bgBorder,
              style: {
                position: 'absolute',
                top: `${(hour - safeStart) * props.pxPerHour}px`,
                left: '0px',
                right: '0px',
                height: '1px',
              },
            }),
          ),
          ...props.events.map((event) => eventCard(event, safeStart)),
        ],
      )

      return h(
        'div',
        {
          class: cm.cn(props.className),
          'data-mol-id': props.dataMolId ?? 'day-timeline',
          role: 'list',
          'aria-label': t('dayTimeline.group', {}, { defaultValue: 'Day timeline' }),
          style: {
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: showAxis ? '64px 1fr' : '1fr',
            minHeight: `${totalHeight}px`,
          },
        },
        showAxis ? [axis, rail] : [rail],
      )
    }
  },
})

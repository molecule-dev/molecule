/**
 * Vue vertical activity timeline with connector line and dot markers.
 *
 * Vue counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimeline` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineRow } from './ActivityTimelineRow.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The tone an event gets when neither the map nor the default lists its kind. */
const FALLBACK_TONE: TimelineKindTone = {
  icon: 'event',
}

/**
 * Wraps each row (e.g. with a `<RouterLink>`). Receives the per-event data, as
 * React's `rowWrapper` does.
 *
 * @param event - The row's event.
 * @param children - The row's own content.
 * @returns The wrapper's content.
 */
type RowWrapper = (event: TimelineEventData, children: VNodeChild) => VNodeChild

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop == null) return []
  return Array.isArray(prop) ? prop : [prop]
}

/**
 * Stack events vertically with a connector line and per-kind dot
 * markers. Compose with `header`/`footer` slots or pass `rowWrapper` to
 * make each row a router link.
 *
 * @param props - Component props (`events`, `toneByKind`, `defaultTone`,
 *   `rowWrapper`, `header`, `footer`, `className`).
 * @returns The timeline component.
 */
export const ActivityTimeline = defineComponent({
  name: 'ActivityTimeline',
  props: {
    events: { type: Array as PropType<TimelineEventData[]>, required: true },
    toneByKind: Object as PropType<Record<string, TimelineKindTone>>,
    defaultTone: Object as PropType<TimelineKindTone>,
    rowWrapper: Function as PropType<RowWrapper>,
    header: null,
    footer: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h('div', { class: cm.cn(cm.card(), cm.sp('p', 6), props.className) }, [
        ...slotOrProp(slots.header, props.header),
        h('div', { class: cm.cn(cm.stack(8), cm.position('relative')) }, [
          /*
           * Connector rail. Color comes from the theme border token (cm.bgBorder,
           * light/dark aware); the exact geometry (offsets + 1px width) has no
           * ClassMap resolver, so it stays inline. Absolutely positioned, so it is
           * out of the flex flow and never affects row spacing.
           */
          h('span', {
            'aria-hidden': 'true',
            class: cm.cn(cm.bgBorder),
            style: {
              position: 'absolute',
              left: '0.75rem',
              top: '0.5rem',
              bottom: '0.5rem',
              width: '1px',
            },
          }),
          ...props.events.map((event) =>
            h(ActivityTimelineRow, {
              key: event.id,
              event,
              tone: props.toneByKind?.[event.kind] ?? props.defaultTone ?? FALLBACK_TONE,
              wrapper: props.rowWrapper
                ? (children: VNodeChild) => props.rowWrapper!(event, children)
                : undefined,
            }),
          ),
        ]),
        ...slotOrProp(slots.footer, props.footer),
      ])
  },
})

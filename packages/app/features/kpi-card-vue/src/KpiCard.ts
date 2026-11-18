/**
 * Vue single KPI / metric display card — the counterpart of
 * `@molecule/app-kpi-card-react`'s `KpiCard`: the same props (React names), the
 * same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import type { KpiCardAccentSide } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): VNodeChild[] => {
  if (slot) return slot()
  if (prop == null || prop === false) return []
  // A node passed through reactive state reads as a proxy; Vue writes `el`
  // onto every VNode it mounts, which would re-trigger the reading render.
  const value = toRaw(prop)
  return Array.isArray(value) ? value : [value]
}

/**
 * Whether a node-valued prop is truthy, as React's `trend || subtitle` test is:
 * `undefined`, `null`, `false` and the empty string do not render a row.
 *
 * @param prop - The prop value.
 * @returns True when the prop renders something.
 */
const isPresent = (prop: VNodeChild): boolean => prop != null && prop !== false && prop !== ''

/**
 * Single KPI / metric display card.
 *
 * Layout: `[icon? title  action?] [value] [trend? / subtitle?]`.
 * Apps use this for dashboard metrics, report summaries, and admin
 * overviews. Node-valued props (`title`, `value`, `subtitle`, `icon`,
 * `trend`, `action`) arrive as a prop or as a same-named slot — both work.
 *
 * @param props - Component props (see `KpiCardProps`).
 * @returns The KPI card component.
 */
export const KpiCard = defineComponent({
  name: 'KpiCard',
  props: {
    title: null,
    value: null,
    subtitle: null,
    icon: null,
    trend: null,
    action: null,
    accentSide: {
      type: String as PropType<KpiCardAccentSide>,
      default: 'none',
    },
    accentColor: String,
    upperLabel: {
      type: Boolean,
      default: false,
    },
    emphasizeValue: {
      type: Boolean,
      default: false,
    },
    hoverLift: {
      type: Boolean,
      default: false,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /**
     * Whether the trend/subtitle row renders at all, as React's `trend || subtitle` does.
     *
     * @returns True when either node is supplied.
     */
    const hasTrendRow = (): boolean =>
      slots.trend !== undefined ||
      slots.subtitle !== undefined ||
      isPresent(props.trend) ||
      isPresent(props.subtitle)

    return (): VNode => {
      const accent = props.accentColor ?? cm.kpiCardAccentColor
      const accentClass =
        props.accentSide === 'left'
          ? cm.cn(cm.kpiCardAccentLeft, accent)
          : props.accentSide === 'top'
            ? cm.cn(cm.kpiCardAccentTop, accent)
            : ''
      const liftClass = props.hoverLift ? cm.kpiCardHoverLift : ''
      const titleClasses = props.upperLabel
        ? cm.cn(cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.kpiCardTitleUppercase))
        : cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))
      const subtitleChildren = slotOrProp(slots.subtitle, props.subtitle)

      return h(
        Card,
        {
          className: cm.cn(accentClass, liftClass, props.className),
          'data-mol-id': props.dataMolId,
        },
        {
          default: () =>
            h('div', { class: cm.stack(3) }, [
              h('div', { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) }, [
                h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                  ...slotOrProp(slots.icon, props.icon),
                  h('span', { class: titleClasses }, slotOrProp(slots.title, props.title)),
                ]),
                ...slotOrProp(slots.action, props.action),
              ]),
              h(
                'div',
                {
                  class: cm.cn(
                    cm.textSize('3xl'),
                    props.emphasizeValue ? cm.fontWeight('extrabold') : cm.fontWeight('bold'),
                  ),
                },
                slotOrProp(slots.value, props.value),
              ),
              hasTrendRow()
                ? h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                    ...slotOrProp(slots.trend, props.trend),
                    ...(subtitleChildren.length > 0
                      ? [h('span', { class: cm.textSize('sm') }, subtitleChildren)]
                      : []),
                  ])
                : null,
            ]),
        },
      )
    }
  },
})

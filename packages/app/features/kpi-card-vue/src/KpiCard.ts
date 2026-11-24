/**
 * Vue single KPI / metric display card — the counterpart of
 * `@molecule/app-kpi-card-react`'s `KpiCard`: the same props (React names), the
 * same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { toChildArray } from '@molecule/app-vue'

import type { KpiCardAccentSide } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): VNodeChild[] =>
  // An empty list renders nothing, as React's slot() treats it; toChildArray
  // also unwraps the reactive proxy a node passed through state reads as.
  toChildArray(slot ? slot() : prop)

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
      const trendChildren = slotOrProp(slots.trend, props.trend)

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
              // React's `trend || subtitle`: an empty list is absent.
              trendChildren.length > 0 || subtitleChildren.length > 0
                ? h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                    ...trendChildren,
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

/**
 * Vue listing card body — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingCardBody`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { slotOrProp } from './slots.js'

/**
 * Body of a `<ListingCard>` — title / subtitle / price / meta rows stacked.
 * Every optional row renders only when its prop or same-named slot carries
 * something, exactly as React's `{node && …}` conditions do.
 *
 * @param props - Component props (see {@link ListingCardBodyProps}).
 * @returns The listing card body component.
 */
export const ListingCardBody = defineComponent({
  name: 'ListingCardBody',
  props: {
    title: null,
    subtitle: null,
    price: null,
    meta: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = slotOrProp(slots.title, props.title)
      const subtitle = slotOrProp(slots.subtitle, props.subtitle)
      const price = slotOrProp(slots.price, props.price)
      const meta = slotOrProp(slots.meta, props.meta)

      return h('div', { class: cm.cn(cm.stack(1), cm.sp('p', 3), props.className) }, [
        h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title),
        ...(subtitle.length > 0 ? [h('p', { class: cm.textSize('sm') }, subtitle)] : []),
        ...(price.length > 0
          ? [h('p', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, price)]
          : []),
        ...(meta.length > 0
          ? [h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, meta)]
          : []),
      ])
    }
  },
})

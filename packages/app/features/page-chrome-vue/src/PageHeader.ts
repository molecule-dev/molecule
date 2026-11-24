/**
 * Vue page-top header: breadcrumbs, icon, title/subtitle pair, right-aligned
 * actions and a meta row.
 *
 * Vue counterpart of `@molecule/app-page-chrome-react`'s `PageHeader` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The nodes to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Resolves an optional slot-or-prop pair the way React's truthy `&&` guard
 * does: nothing when the prop is absent or falsy, and nothing for an empty
 * slot.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The nodes to render, or null when React would render no wrapper.
 */
const optional = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] | null => {
  if (slot) {
    const nodes = slot()
    return toChildArray(nodes).length > 0 ? nodes : null
  }
  return toChildArray(prop).length > 0 ? [prop] : null
}

/**
 * Standard page-top header with optional breadcrumbs, leading icon,
 * title / subtitle pair, meta row, and right-aligned actions.
 *
 * Layout: breadcrumbs, then a two-column row with title+subtitle on the
 * left and actions on the right, then optional meta.
 *
 * @param props - Component props (see {@link PageHeaderProps}).
 * @returns The page header component.
 */
export const PageHeader = defineComponent({
  name: 'PageHeader',
  props: {
    title: null,
    subtitle: null,
    icon: null,
    breadcrumbs: null,
    actions: null,
    meta: null,
    emphasis: {
      type: String as PropType<'normal' | 'extrabold'>,
      default: 'normal',
    },
    dataMolId: String,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const subtitle = optional(slots.subtitle, props.subtitle)
      const actions = optional(slots.actions, props.actions)
      const meta = optional(slots.meta, props.meta)
      const titleClass =
        props.emphasis === 'extrabold'
          ? cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'))
          : cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))
      return h(
        'header',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.stack(3), props.className),
        },
        [
          ...slotOrProp(slots.breadcrumbs, props.breadcrumbs),
          h('div', { class: cm.flex({ justify: 'between', align: 'start', gap: 'md' }) }, [
            h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
              ...slotOrProp(slots.icon, props.icon),
              h('div', { class: cm.stack(1) }, [
                h('h1', { class: titleClass }, slotOrProp(slots.title, props.title)),
                subtitle ? h('p', { class: cm.textSize('base') }, subtitle) : null,
              ]),
            ]),
            actions ? h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, actions) : null,
          ]),
          meta
            ? h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, meta)
            : null,
        ],
      )
    }
  },
})

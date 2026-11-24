/**
 * Vue detail-page header: leading slot + title/subtitle + status + right-aligned
 * actions, with an optional meta row and an optional search slot.
 *
 * Vue counterpart of `@molecule/app-detail-header-react`'s `DetailHeader` —
 * the same props (React names), the same DOM for the same input.
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
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  const nodes: VNodeChild[] = slot ? slot() : prop != null ? [prop] : []
  // A slot or prop that renders nothing is absent (React's `slot()`).
  return toChildArray(nodes).length > 0 ? nodes : []
}

/**
 * Whether a node-valued prop has content to render: React's truthiness of the
 * node (`{subtitle && <p>}` renders no paragraph for an absent or empty value).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns Whether the pair carries content.
 */
const present = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => toChildArray(slot ? slot() : prop).length > 0

/**
 * Header row for a detail page — leading slot + title/subtitle + status +
 * actions, with optional meta row and search slot.
 *
 * Different from `<PageHeader>` (used at the top of list/index pages)
 * in prioritising status + search + stickiness.
 *
 * @param props - Component props (see {@link DetailHeaderProps}).
 * @returns The detail header component.
 */
export const DetailHeader = defineComponent({
  name: 'DetailHeader',
  props: {
    title: null,
    subtitle: null,
    leading: null,
    status: null,
    actions: null,
    meta: null,
    search: null,
    sticky: { type: Boolean as PropType<boolean>, default: undefined },
    className: { type: String, default: undefined },
    dataMolId: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'header',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.stack(2), props.className),
          style: props.sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined,
        },
        [
          h(
            'div',
            { class: cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }) },
            [
              h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                ...slotOrProp(slots.leading, props.leading),
                h('div', { class: cm.stack(1) }, [
                  h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                    h(
                      'h1',
                      { class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold')) },
                      slotOrProp(slots.title, props.title),
                    ),
                    ...slotOrProp(slots.status, props.status),
                  ]),
                  ...(present(slots.subtitle, props.subtitle)
                    ? [
                        h(
                          'p',
                          { class: cm.textSize('sm') },
                          slotOrProp(slots.subtitle, props.subtitle),
                        ),
                      ]
                    : []),
                ]),
              ]),
              h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                ...slotOrProp(slots.search, props.search),
                ...slotOrProp(slots.actions, props.actions),
              ]),
            ],
          ),
          ...(present(slots.meta, props.meta)
            ? [
                h(
                  'div',
                  { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) },
                  slotOrProp(slots.meta, props.meta),
                ),
              ]
            : []),
        ],
      )
  },
})

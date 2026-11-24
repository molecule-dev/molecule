/**
 * Vue two- or three-row detail-page scaffold.
 *
 * Vue counterpart of `@molecule/app-detail-page-layout-react`'s
 * `DetailPageLayout` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

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
 * Two- or three-row detail-page scaffold.
 *
 * Layout: breadcrumb (optional), top bar (optional sticky), two-column
 * body with a main region and an optional sidebar on either side.
 * Apps fill the slots with their own cards/sections.
 *
 * @param props - Component props (see {@link DetailPageLayoutProps}).
 * @returns The detail page layout component.
 */
export const DetailPageLayout = defineComponent({
  name: 'DetailPageLayout',
  props: {
    breadcrumb: null,
    topBar: null,
    main: null,
    sidebar: null,
    sidebarPosition: {
      type: String as PropType<'left' | 'right'>,
      default: 'right',
    },
    sidebarWidth: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'md',
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const sidebarStyle = {
        flexBasis: `${SIDEBAR_WIDTH[props.sidebarWidth] * 4}px`,
        flexShrink: 0,
      }
      const sidebarLeft = slotOrProp(slots.sidebar, props.sidebar)
      const hasSidebar = sidebarLeft.length > 0
      // React's two sidebar places are different elements, so moving the sidebar to the other
      // side mounts it again there. Vue's diff would move an unkeyed <aside> and keep its
      // components, so each place has its own key.
      const aside = (position: 'left' | 'right'): VNodeChild =>
        hasSidebar && props.sidebarPosition === position
          ? h('aside', { key: position, style: sidebarStyle }, sidebarLeft)
          : null
      const body: VNodeChild[] = [
        aside('left'),
        h('main', { class: cm.flex1 }, [
          h('div', { class: cm.stack(4) }, slotOrProp(slots.main, props.main)),
        ]),
        aside('right'),
      ]
      return h(
        'div',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.stack(4), props.className),
        },
        [
          ...slotOrProp(slots.breadcrumb, props.breadcrumb),
          ...slotOrProp(slots.topBar, props.topBar),
          h(
            'div',
            {
              class: cm.cn(
                cm.flex({
                  align: 'start',
                  gap: 'lg',
                  direction: props.sidebarPosition === 'left' ? 'row' : 'row',
                }),
              ),
            },
            body,
          ),
        ],
      )
    }
  },
})

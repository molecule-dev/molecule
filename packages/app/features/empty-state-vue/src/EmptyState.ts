/**
 * Vue generic centred empty-state panel.
 *
 * Vue counterpart of `@molecule/app-empty-state-react`'s `EmptyState` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import type { EmptyStateProps } from './types.js'

/** The selected-view content `EmptyState` renders when its `view` prop is given. */
type SelectedView = NonNullable<EmptyStateProps['view']>

/**
 * A node as a render list, dropping the values React's `&&` treats as absent.
 *
 * @param node - The node value.
 * @returns The children to render.
 */
const nodesOf = (node: VNodeChild | null | undefined): VNodeChild[] => toChildArray(node)

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
  const nodes = slot ? slot() : nodesOf(prop)
  // A slot or prop that renders nothing is absent (React's `slot()`).
  return toChildArray(nodes).length > 0 ? nodes : []
}

/**
 * Generic centred empty-state panel for lists, feeds, boards, and tables.
 *
 * Renders a vertical stack of [icon, title, description, action]. Typography
 * and spacing come from the wired ClassMap; per-app accent chrome (dashed
 * borders, tinted backgrounds, gradient CTAs) is passed via `className` on the
 * outer element. Node-valued props (`icon`, `title`, `description`, `action`)
 * arrive as a prop or as the same-named slot — both work.
 *
 * @param props - Component props (see {@link EmptyStateProps}).
 * @returns The empty-state component.
 */
export const EmptyState = defineComponent({
  name: 'EmptyState',
  props: {
    icon: null,
    title: null,
    description: null,
    action: null,
    view: Object as PropType<SelectedView>,
    dataMolId: String,
    className: String,
    iconWrapperClassName: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const view = props.view
      const content: SelectedView = view ?? {
        title: props.title,
        description: props.description,
        action: props.action,
      }
      // The selected view owns its message: a general title/description/action
      // beside it is ignored, as React's `view ?? { … }` ignores it.
      const pick = (
        name: 'title' | 'description' | 'action',
        fallback: VNodeChild | null | undefined,
      ): VNodeChild[] => (view ? nodesOf(fallback) : slotOrProp(slots[name], fallback))
      const icon = slotOrProp(slots.icon, props.icon)
      const title = pick('title', content.title)
      const description = pick('description', content.description)
      const action = pick('action', content.action)
      return h(
        'section',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.textCenter,
            cm.sp('p', 12),
            props.className,
          ),
        },
        [
          ...(icon.length > 0
            ? [
                h(
                  'div',
                  {
                    class: cm.cn(
                      cm.w(20),
                      cm.h(20),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      props.iconWrapperClassName,
                    ),
                  },
                  icon,
                ),
              ]
            : []),
          h(
            'h3',
            { class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2)) },
            title,
          ),
          ...(description.length > 0
            ? [
                h(
                  'p',
                  { class: cm.cn(cm.maxW('md'), cm.sp('mb', action.length > 0 ? 6 : 0)) },
                  description,
                ),
              ]
            : []),
          ...action,
        ],
      )
    }
  },
})

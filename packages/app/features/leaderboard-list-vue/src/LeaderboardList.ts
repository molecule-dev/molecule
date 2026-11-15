/**
 * Vue leaderboard list container: header row (title + actions) above a stack
 * of rows.
 *
 * Vue counterpart of `@molecule/app-leaderboard-list-react`'s
 * `LeaderboardList` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

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
 * Container above a stack of rows — header + actions + the list. Doesn't
 * itself render rank logic; pair with `<LeaderboardRow>` from
 * `@molecule/app-leaderboard-row-react` (or your own rows).
 *
 * The `emptyState` renders only when the default slot is empty; map your
 * entries directly (as in the example) so the empty case is detectable.
 *
 * @param props - Component props (see {@link LeaderboardListProps}).
 * @returns The leaderboard list component.
 */
export const LeaderboardList = defineComponent({
  name: 'LeaderboardList',
  props: {
    title: null,
    actions: null,
    emptyState: null,
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const titleNodes = slotOrProp(slots.title, props.title)
      const actionsNodes = slotOrProp(slots.actions, props.actions)
      const emptyStateNodes = slotOrProp(slots.emptyState, props.emptyState)
      const childrenNodes: VNodeChild[] = slots.default ? slots.default() : []
      const childCount = Array.isArray(childrenNodes) ? childrenNodes.length : childrenNodes ? 1 : 0

      const content: VNodeChild[] = []
      if (titleNodes.length > 0 || actionsNodes.length > 0) {
        const headerChildren: VNodeChild[] = []
        if (titleNodes.length > 0) {
          headerChildren.push(
            h('h3', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, titleNodes),
          )
        }
        headerChildren.push(...actionsNodes)
        content.push(
          h(
            'header',
            { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) },
            headerChildren,
          ),
        )
      }
      if (childCount === 0) content.push(...emptyStateNodes)
      else content.push(h('div', { class: cm.stack(1 as const) }, childrenNodes))

      return h('div', { class: cm.cn(cm.stack(2), props.className) }, content)
    }
  },
})

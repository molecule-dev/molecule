/**
 * Vue EmptyState UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { EmptyStateProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Vue EmptyState UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s EmptyState: a centered
 * placeholder with an optional icon, title, description and primary action,
 * shown when a list or section has no content. `automationId` renders as the
 * `data-mol-id` attribute.
 */
export const EmptyState = defineComponent({
  name: 'MEmptyState',
  inheritAttrs: false,
  props: {
    icon: null,
    title: null,
    description: null,
    action: null,
    className: String,
    style: [String, Object] as PropType<EmptyStateProps['style']>,
    testId: String,
    automationId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () => {
      const icon = props.icon ?? slots.icon?.()
      const title = props.title ?? slots.title?.()
      const description = props.description ?? slots.description?.()
      const action = props.action ?? slots.action?.()

      const children: VNode[] = []
      if (icon) children.push(h('div', { class: cm.emptyStateIcon }, [icon]))
      children.push(h('h3', { class: cm.emptyStateTitle }, [title]))
      if (description) children.push(h('p', { class: cm.emptyStateDescription }, [description]))
      if (action) children.push(h('div', { class: cm.emptyStateAction }, [action]))

      return h(
        'div',
        {
          class: cm.cn(cm.emptyState, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          'data-mol-id': props.automationId,
        },
        children,
      )
    }
  },
})

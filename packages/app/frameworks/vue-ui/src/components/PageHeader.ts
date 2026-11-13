/**
 * Vue PageHeader UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, Fragment, h, type PropType, type VNodeChild } from 'vue'

import type { PageHeaderProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Vue PageHeader UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s PageHeader: a page title with
 * an optional breadcrumb trail, description and action buttons. `actions` is
 * node-valued, so it arrives as a VNode prop or the same-named slot.
 */
export const PageHeader = defineComponent({
  name: 'MPageHeader',
  inheritAttrs: false,
  props: {
    title: {
      type: String,
      required: true,
    },
    description: String,
    actions: null,
    breadcrumbs: {
      type: Array as PropType<PageHeaderProps['breadcrumbs']>,
      default: undefined,
    },
    className: String,
    style: [String, Object] as PropType<PageHeaderProps['style']>,
    testId: String,
    automationId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () => {
      const actions = props.actions ?? slots.actions?.()
      const breadcrumbs = props.breadcrumbs

      const children: VNodeChild[] = []
      if (breadcrumbs && breadcrumbs.length > 0) {
        const crumbs: VNodeChild[] = breadcrumbs.map((crumb, index) =>
          // React renders one `<React.Fragment key={index}>` per crumb, so Vue
          // keys the same fragment: a keyed list keeps (and moves) whole
          // crumb+separator units instead of diffing the flat child array.
          h(Fragment, { key: index }, [
            index > 0
              ? h('span', { class: cm.pageHeaderBreadcrumbSeparator, 'aria-hidden': 'true' }, '/')
              : null,
            crumb.href
              ? h('a', { href: crumb.href, class: cm.pageHeaderBreadcrumbItem }, crumb.label)
              : h('span', { class: cm.pageHeaderBreadcrumbItem }, crumb.label),
          ]),
        )
        children.push(
          h('nav', { class: cm.pageHeaderBreadcrumbs, 'aria-label': 'Breadcrumb' }, crumbs),
        )
      }

      const heading: VNodeChild[] = [h('h1', { class: cm.pageHeaderTitle }, props.title)]
      if (props.description)
        heading.push(h('p', { class: cm.pageHeaderDescription }, props.description))

      const row: VNodeChild[] = [h('div', null, heading)]
      row.push(actions ? h('div', { class: cm.pageHeaderActions }, [actions]) : null)

      children.push(
        h('div', { class: cm.cn(cm.flex({ justify: 'between', align: 'center' })) }, row),
      )

      return h(
        'div',
        {
          class: cm.cn(cm.pageHeader, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          'data-mol-id': props.automationId,
        },
        children,
      )
    }
  },
})

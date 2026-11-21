/**
 * Vue slim promo bar that sits above the storefront top nav.
 *
 * Vue counterpart of `@molecule/app-storefront-chrome-react`'s
 * `StorefrontAnnouncementBar` — the same props (React names), the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'

/** Props for the {@link StorefrontAnnouncementBar} component. */
export interface StorefrontAnnouncementBarProps {
  /** The promo message. Passed as a prop or as the same-named slot. */
  message: VNodeChild
  /** Optional call to action, rendered as a router link after the message. */
  cta?: { to: string; label: VNodeChild }
  /** Extra classes on the bar. */
  className?: string
}

/**
 * Storefront announcement / promo bar.
 *
 * @param props - Component props (see {@link StorefrontAnnouncementBarProps}).
 * @returns The announcement bar component.
 */
export const StorefrontAnnouncementBar = defineComponent({
  name: 'StorefrontAnnouncementBar',
  props: {
    // Node-valued: declared with `null` so any runtime type is accepted (a
    // VNode, a string, or a number).
    message: null,
    cta: Object as PropType<{ to: string; label: VNodeChild }>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const children: VNodeChild[] = [...slotOrProp(slots.message, props.message)]
      const cta = props.cta
      if (cta) {
        children.push(' ')
        children.push(
          h(
            Link,
            {
              class: cm.cn(cm.storefrontChromeAnnouncementLink),
              'data-mol-id': 'announcement-link',
              to: cta.to,
            },
            { default: () => nodeList(cta.label) },
          ),
        )
      }
      return h(
        'div',
        {
          class: cm.cn(
            cm.textCenter,
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.storefrontChromeAnnouncementBar,
            props.className,
          ),
        },
        children,
      )
    }
  },
})

export default StorefrontAnnouncementBar

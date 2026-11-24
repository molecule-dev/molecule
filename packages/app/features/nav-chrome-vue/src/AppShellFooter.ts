/**
 * Vue bottom page footer shell.
 *
 * Vue counterpart of `@molecule/app-nav-chrome-react`'s `AppShellFooter` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'
import type { FooterLink } from './types.js'

/**
 * Bottom page footer shell. All content is optional — apps mix and match
 * logo / copyright / links / right-slot as the design demands.
 *
 * @param props - Component props (see {@link AppShellFooterProps}).
 * @returns The footer component.
 */
export const AppShellFooter = defineComponent({
  name: 'AppShellFooter',
  props: {
    logo: null,
    copyright: null,
    links: Array as PropType<FooterLink[]>,
    right: null,
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

    /** The copyright text (or node), wrapped the way React wraps it; omitted when absent. */
    const renderCopyright = (): VNode[] => {
      // An empty copyright list renders nothing, as React's slot() treats it.
      const nodes = toChildArray(slots.copyright ? slots.copyright() : props.copyright)
      return nodes.length > 0 ? [h('span', { class: cm.textSize('xs') }, nodes)] : []
    }

    return (): VNode =>
      h(
        'footer',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
            cm.sp('px', 4),
            cm.sp('py', 4),
            props.className,
          ),
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...slotOrProp(slots.logo, props.logo),
            ...renderCopyright(),
          ]),
          props.links && props.links.length > 0
            ? h(
                'nav',
                {
                  'aria-label': t('navChrome.aria.footer', undefined, { defaultValue: 'Footer' }),
                  class: cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                },
                props.links.map((l: FooterLink, i: number) =>
                  h(
                    'a',
                    {
                      key: i,
                      href: l.to ?? '#',
                      class: cm.cn(cm.textSize('sm'), cm.link),
                    },
                    nodeList(l.label),
                  ),
                ),
              )
            : null,
          ...slotOrProp(slots.right, props.right),
        ],
      )
  },
})

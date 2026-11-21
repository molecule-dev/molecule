/**
 * Vue storefront footer: brand block + N columns of links + copyright row.
 *
 * Vue counterpart of `@molecule/app-storefront-chrome-react`'s
 * `StorefrontFooter` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'
import type { FooterColumn } from './types.js'

/** Props for the {@link StorefrontFooter} component. */
export interface StorefrontFooterProps {
  /** The brand mark (a node prop or the same-named slot). */
  brand: VNodeChild
  /** Optional tagline under the brand. */
  tagline?: VNodeChild
  /** Columns of links. */
  columns?: FooterColumn[]
  /** The copyright line. */
  copyright: VNodeChild
  /** Extra classes on the footer. */
  className?: string
}

/**
 * Storefront footer with brand block + columns + copyright.
 *
 * @param props - Component props (see {@link StorefrontFooterProps}).
 * @returns The storefront footer component.
 */
export const StorefrontFooter = defineComponent({
  name: 'StorefrontFooter',
  props: {
    brand: null,
    tagline: null,
    columns: { type: Array as PropType<FooterColumn[]>, default: () => [] },
    copyright: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const columns: VNodeChild[] = (props.columns ?? []).map((col, i) =>
        h('div', { key: i }, [
          h(
            'h4',
            {
              class: cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                cm.storefrontChromeFooterHeading,
              ),
            },
            nodeList(col.heading),
          ),
          h(
            'ul',
            { class: cm.stack(2) },
            col.links.map((link) =>
              h('li', { key: link.to }, [
                h(
                  Link,
                  { class: cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterLink), to: link.to },
                  { default: () => nodeList(link.label) },
                ),
              ]),
            ),
          ),
        ]),
      )

      const brandCol: VNode = h('div', { class: cm.cn(cm.storefrontChromeFooterBrandCol) }, [
        h(
          'div',
          {
            class: cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.storefrontChromeFooterBrand),
          },
          slotOrProp(slots.brand, props.brand),
        ),
        props.tagline
          ? h(
              'p',
              { class: cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterTagline) },
              nodeList(props.tagline),
            )
          : null,
      ])

      return h(
        'footer',
        {
          class: cm.cn(
            cm.w('full'),
            cm.sp('pt', 16),
            cm.sp('pb', 8),
            cm.storefrontChromeFooter,
            props.className,
          ),
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.maxW('[1280px]'),
                cm.mxAuto,
                cm.sp('px', 6),
                cm.grid({ cols: 1, gap: 'xl' }),
                cm.storefrontChromeFooterColumns,
              ),
            },
            [brandCol, ...columns],
          ),
          h(
            'div',
            {
              class: cm.cn(
                cm.maxW('[1280px]'),
                cm.mxAuto,
                cm.sp('px', 6),
                cm.sp('pt', 12),
                cm.sp('mt', 12),
                cm.storefrontChromeFooterDivider,
              ),
            },
            [
              h(
                'p',
                { class: cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterCopyright) },
                slotOrProp(slots.copyright, props.copyright),
              ),
            ],
          ),
        ],
      )
    }
  },
})

export default StorefrontFooter

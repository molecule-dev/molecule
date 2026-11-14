/**
 * Vue X (Twitter) logo component.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { logoSvgAttrs, titleChildren } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

const PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'

/**
 * Vue X (formerly Twitter) brand mark. Monochrome only per X brand
 * guidelines; `mode` is ignored — always uses `currentColor`.
 *
 * Use either `TwitterLogo` or `XLogo` — they render the same SVG.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `TwitterLogo`, with the
 * same props and the same DOM.
 */
export const TwitterLogo = defineComponent({
  name: 'TwitterLogo',
  inheritAttrs: false,
  props: {
    size: { type: Number, default: 20 },
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: { type: String, default: 'X (Twitter)' },
    title: String,
  },
  setup(props) {
    return () =>
      h('svg', { ...logoSvgAttrs(props), fill: 'currentColor' }, [
        ...titleChildren(props.title),
        h('path', { d: PATH }),
      ])
  },
})

/** Alias of `TwitterLogo` — use the provider id that matches your OAuth config. */
export const XLogo = TwitterLogo

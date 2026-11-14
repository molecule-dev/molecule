/**
 * Vue Apple logo component.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { logoSvgAttrs, titleChildren } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

const PATH =
  'M17.05 12.53c-.02-2.77 2.26-4.1 2.36-4.16-1.28-1.88-3.28-2.14-3.99-2.17-1.7-.17-3.31 1-4.17 1-.88 0-2.2-.98-3.62-.96-1.86.03-3.58 1.08-4.54 2.75-1.93 3.36-.49 8.34 1.39 11.07.92 1.34 2.01 2.84 3.44 2.78 1.38-.06 1.9-.9 3.57-.9 1.66 0 2.14.9 3.6.87 1.49-.02 2.43-1.36 3.34-2.7 1.05-1.55 1.49-3.05 1.51-3.13-.03-.01-2.9-1.11-2.9-4.45zM14.16 4.48c.75-.92 1.26-2.19 1.12-3.46-1.08.04-2.4.72-3.18 1.63-.7.8-1.31 2.1-1.15 3.34 1.21.09 2.45-.61 3.21-1.51z'

/**
 * Vue Apple logo. Monochrome only — `mode` ignored.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `AppleLogo`, with the
 * same props and the same DOM.
 */
export const AppleLogo = defineComponent({
  name: 'AppleLogo',
  inheritAttrs: false,
  props: {
    size: { type: Number, default: 20 },
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: { type: String, default: 'Apple' },
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

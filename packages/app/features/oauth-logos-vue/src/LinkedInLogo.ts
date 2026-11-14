/**
 * Vue LinkedIn logo component.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType } from 'vue'

import { logoSvgAttrs, titleChildren } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

const IN_PATH =
  'M6.94 5.00003C6.94 6.10463 6.04459 7.00004 4.94 7.00004C3.83541 7.00004 2.94 6.10463 2.94 5.00003C2.94 3.89543 3.83541 3.00003 4.94 3.00003C6.04459 3.00003 6.94 3.89543 6.94 5.00003ZM7 8.48003H3V21H7V8.48003ZM13.32 8.48003H9.34V21H13.28V14.43C13.28 10.77 18.05 10.43 18.05 14.43V21H22V13.07C22 6.90003 14.94 7.13003 13.28 10.16L13.32 8.48003Z'
const BG_PATH =
  'M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.02H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'

/**
 * Vue LinkedIn brand mark. `mode='brand'` renders the blue square with
 * white "in"; `mode='mono'` renders a monochrome "in" glyph.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `LinkedInLogo`, with the
 * same props and the same DOM.
 */
export const LinkedInLogo = defineComponent({
  name: 'LinkedInLogo',
  inheritAttrs: false,
  props: {
    size: { type: Number, default: 20 },
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: { type: String, default: 'LinkedIn' },
    title: String,
  },
  setup(props) {
    const isMono = computed(() => props.mode === 'mono')
    return () =>
      h('svg', { ...logoSvgAttrs(props), fill: isMono.value ? 'currentColor' : undefined }, [
        ...titleChildren(props.title),
        ...(isMono.value
          ? [h('path', { d: IN_PATH })]
          : [h('path', { d: BG_PATH, fill: '#0A66C2' })]),
      ])
  },
})

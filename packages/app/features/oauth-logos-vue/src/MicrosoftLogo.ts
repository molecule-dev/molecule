/**
 * Vue Microsoft logo component.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType } from 'vue'

import { logoSvgAttrs, titleChildren } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

/** One `<rect>` of the Microsoft mark: position, size and fill. */
interface MicrosoftSquare {
  x: string
  y: string
  width: string
  height: string
  fill: string
  opacity?: string
}

const MONO_SQUARES: MicrosoftSquare[] = [
  { x: '2', y: '2', width: '9', height: '9', fill: 'currentColor' },
  { x: '13', y: '2', width: '9', height: '9', fill: 'currentColor', opacity: '0.85' },
  { x: '2', y: '13', width: '9', height: '9', fill: 'currentColor', opacity: '0.75' },
  { x: '13', y: '13', width: '9', height: '9', fill: 'currentColor', opacity: '0.6' },
]

const BRAND_SQUARES: MicrosoftSquare[] = [
  { x: '2', y: '2', width: '9', height: '9', fill: '#F25022' },
  { x: '13', y: '2', width: '9', height: '9', fill: '#7FBA00' },
  { x: '2', y: '13', width: '9', height: '9', fill: '#00A4EF' },
  { x: '13', y: '13', width: '9', height: '9', fill: '#FFB900' },
]

/**
 * Vue Microsoft 4-square brand mark. `mode='brand'` renders the four
 * official squares; `mode='mono'` renders a flat 2×2 grid in
 * `currentColor`.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `MicrosoftLogo`, with
 * the same props and the same DOM.
 */
export const MicrosoftLogo = defineComponent({
  name: 'MicrosoftLogo',
  inheritAttrs: false,
  props: {
    size: { type: Number, default: 20 },
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: { type: String, default: 'Microsoft' },
    title: String,
  },
  setup(props) {
    const isMono = computed(() => props.mode === 'mono')
    const squares = computed(() => (isMono.value ? MONO_SQUARES : BRAND_SQUARES))
    return () =>
      h('svg', { ...logoSvgAttrs(props) }, [
        ...titleChildren(props.title),
        ...squares.value.map((square) => {
          const { opacity, ...attrs } = square
          return h('rect', opacity === undefined ? attrs : { ...attrs, opacity })
        }),
      ])
  },
})

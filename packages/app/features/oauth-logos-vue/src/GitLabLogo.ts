/**
 * Vue GitLab logo component.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType } from 'vue'

import { logoSvgAttrs, titleChildren } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

const MONO_PATH =
  'M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.866 0L16.419 9.45H7.582L4.916 1.263a.455.455 0 0 0-.866 0L1.386 9.452.045 13.587a.928.928 0 0 0 .336 1.039L12 22.928l11.62-8.302a.928.928 0 0 0 .335-1.039z'

/** The tanuki's brand-mode faces, in React's render order. */
const BRAND_FACES: { fill: string; d: string }[] = [
  { fill: '#E24329', d: 'M12 21.42l4.212-12.96H7.788z' },
  { fill: '#FCA326', d: 'M12 21.42l-4.212-12.96H1.883z' },
  { fill: '#E24329', d: 'M1.883 8.46L.605 12.39a.87.87 0 0 0 .316.972L12 21.42z' },
  { fill: '#FC6D26', d: 'M1.883 8.46h5.905L5.25.639a.432.432 0 0 0-.82 0z' },
  { fill: '#FCA326', d: 'M12 21.42l4.212-12.96h5.905z' },
  { fill: '#E24329', d: 'M22.117 8.46l1.278 3.93a.87.87 0 0 1-.316.972L12 21.42z' },
  { fill: '#FC6D26', d: 'M22.117 8.46h-5.905L18.75.639a.432.432 0 0 1 .82 0z' },
]

/**
 * Vue GitLab tanuki — official brand mark, normalized to a 24×24 viewBox.
 * `mode='mono'` renders a flat tanuki silhouette in `currentColor`.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `GitLabLogo`, with the
 * same props and the same DOM.
 */
export const GitLabLogo = defineComponent({
  name: 'GitLabLogo',
  inheritAttrs: false,
  props: {
    size: { type: Number, default: 20 },
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: { type: String, default: 'GitLab' },
    title: String,
  },
  setup(props) {
    const isMono = computed(() => props.mode === 'mono')
    return () =>
      h('svg', { ...logoSvgAttrs(props) }, [
        ...titleChildren(props.title),
        ...(isMono.value
          ? [h('path', { fill: 'currentColor', d: MONO_PATH })]
          : BRAND_FACES.map((face) => h('path', { fill: face.fill, d: face.d }))),
      ])
  },
})

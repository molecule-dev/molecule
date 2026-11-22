/**
 * Renders an SVG glyph looked up by name from the bonded `@molecule/app-icons`
 * set — the IDE's consistent, high-quality icon source (no unicode glyphs, no
 * ad-hoc inline `<path>`s).
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `Icon`: the same props (React
 * names), the same DOM for the same input. The raw-markup branch injects the
 * icon set's own SVG string through `innerHTML` (React's
 * `dangerouslySetInnerHTML`) — the bond is the trust boundary. React's
 * `...rest` spread is Vue's fallthrough attrs: with `inheritAttrs` off, every
 * undeclared attribute (`data-mol-id`, `aria-*`, `title`, event handlers,
 * `style`) is spread onto the root `<svg>` here.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Props for {@link Icon}.
 *
 * In React every extra SVG/HTML attribute travels through the `...rest`
 * spread (`data-mol-id`, `aria-*`, `role`, event handlers, `style`, …); in
 * Vue undeclared attributes arrive as fallthrough attrs and are spread onto
 * the root `<svg>` the same way.
 */
export interface IconProps {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Renders the named glyph from the bonded icon set.
 *
 * @param props - See {@link IconProps}.
 * @param attrs - The fallthrough attributes (React's `...rest`).
 * @returns The `<svg>` element rendering the named glyph.
 */
export const Icon = defineComponent({
  name: 'Icon',
  inheritAttrs: false,
  props: {
    /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
    name: {
      type: String as PropType<IconName>,
      required: true,
    },
    /** Width and height of the rendered SVG in pixels. Defaults to 16. */
    size: {
      type: Number,
      required: false,
      default: 16,
    },
    /** Class name forwarded to the root `<svg>`. */
    className: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return (): VNode => {
      const icon = getIcon(props.name)
      const viewBox = icon.viewBox || '0 0 20 20'

      if (icon.svg) {
        return h('svg', {
          width: props.size,
          height: props.size,
          viewBox,
          fill: icon.fill || 'none',
          class: props.className,
          innerHTML: icon.svg,
          ...attrs,
        })
      }

      const isStroked = !!icon.stroke

      return h(
        'svg',
        {
          width: props.size,
          height: props.size,
          viewBox,
          fill: isStroked ? 'none' : icon.fill || 'currentColor',
          ...(isStroked
            ? {
                stroke: icon.stroke,
                'stroke-width': icon.strokeWidth,
                'stroke-linecap': icon.strokeLinecap,
                'stroke-linejoin': icon.strokeLinejoin,
              }
            : {}),
          class: props.className,
          ...attrs,
        },
        icon.paths.map((p, i) =>
          h('path', {
            key: i,
            d: p.d,
            ...(p.fill ? { fill: p.fill } : {}),
            ...(p.fillRule ? { 'fill-rule': p.fillRule } : {}),
            ...(p.clipRule ? { 'clip-rule': p.clipRule } : {}),
            ...(p.opacity !== undefined ? { opacity: p.opacity } : {}),
          }),
        ),
      )
    }
  },
})

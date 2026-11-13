/**
 * Vue Icon UI component rendering glyphs from the bonded icon set.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { getIcon, type IconName } from '@molecule/app-icons'

import { classOf, restAttrs } from '../utilities/attrs.js'

/**
 * Props for {@link Icon}.
 *
 * In React every extra SVG/HTML attribute travels through the `...rest`
 * spread (`data-mol-id`, `aria-*`, `role`, `onClick`, `style`, …); in Vue
 * undeclared attributes arrive as fallthrough attrs and are spread onto the
 * root `<svg>` the same way.
 */
export interface IconProps {
  /**
   * Name of the glyph to look up in the bonded icon set. Typed as
   * {@link IconName} so a typo fails the type-check instead of throwing at
   * render time; sets with extra glyphs augment `CustomIconNames` in
   * `@molecule/app-icons` to widen it.
   */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Vue Icon UI component rendering glyphs from the bonded icon set.
 *
 * Faithful port of `@molecule/app-ui-react`'s Icon. Handles two icon-data
 * shapes returned by the bond:
 *   1. Pre-rendered SVG markup (`icon.svg`) — injected via the `innerHTML`
 *      prop (React's `dangerouslySetInnerHTML`). The bond is the trust
 *      boundary; only bond a set that controls its own SVG strings.
 *   2. Structured paths (`icon.paths`) — rendered as discrete `<path>`
 *      children, with optional stroke styling forwarded from the icon set.
 *
 * Decorative by default: when the caller passes no `aria-label` /
 * `aria-labelledby` / `role`, the SVG is rendered `aria-hidden` +
 * `focusable="false"` so screen readers skip it. Passing any of those props
 * opts the icon into the accessibility tree.
 */
export const Icon = defineComponent({
  name: 'MIcon',
  inheritAttrs: false,
  props: {
    name: {
      type: String as PropType<IconName>,
      required: true,
    },
    size: {
      type: Number,
      default: 20,
    },
    className: String,
  },
  setup(props, { attrs }) {
    return () => {
      // React's `...rest`: every fallthrough attr except class/style, which
      // classOf()/attrs.style forward separately.
      const rest = restAttrs(attrs)
      // Decorative unless the caller opts into the a11y tree.
      const decorative =
        attrs['aria-label'] == null && attrs['aria-labelledby'] == null && attrs.role == null

      // Graceful degradation: an icon name missing from the bonded set must
      // NOT crash the whole app — warn once per name and render a neutral
      // placeholder circle instead.
      let icon: ReturnType<typeof getIcon>
      try {
        icon = getIcon(props.name)
      } catch (error) {
        console.warn(`Icon: no bonded glyph for "${props.name}" — rendering a placeholder.`, error)
        return h(
          'svg',
          {
            width: props.size,
            height: props.size,
            viewBox: '0 0 20 20',
            fill: 'none',
            class: classOf(props.className, attrs),
            style: attrs.style,
            'aria-hidden': decorative,
            focusable: 'false',
            ...rest,
          },
          h('circle', { cx: 10, cy: 10, r: 8, fill: 'currentColor', opacity: 0.15 }),
        )
      }

      const viewBox = icon.viewBox || '0 0 20 20'
      // Placed BEFORE the rest spread so an explicit caller aria-hidden/role wins.
      const decorativeProps = decorative ? { 'aria-hidden': true, focusable: 'false' } : {}

      if (icon.svg) {
        return h('svg', {
          width: props.size,
          height: props.size,
          viewBox,
          fill: icon.fill || 'none',
          class: classOf(props.className, attrs),
          style: attrs.style,
          innerHTML: icon.svg,
          ...decorativeProps,
          ...rest,
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
          style: attrs.style,
          ...decorativeProps,
          ...(isStroked
            ? {
                stroke: icon.stroke,
                'stroke-width': icon.strokeWidth,
                'stroke-linecap': icon.strokeLinecap,
                'stroke-linejoin': icon.strokeLinejoin,
              }
            : {}),
          class: classOf(props.className, attrs),
          ...rest,
        },
        icon.paths.map((p) =>
          h('path', {
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

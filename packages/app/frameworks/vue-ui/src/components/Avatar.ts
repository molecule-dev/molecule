/**
 * Vue Avatar UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { getIcon, type IconName } from '@molecule/app-icons'
import type { AvatarProps, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, styleOf } from '../utilities/attrs.js'
import { getInitials } from '../utilities/initials.js'

/**
 * Renders the decorative fallback glyph, mirroring `renderIcon` from
 * `@molecule/app-ui-react` exactly: `aria-hidden` + `focusable="false"` so
 * screen readers skip it, with stroke styling forwarded from the bonded icon
 * set.
 *
 * @param name - Icon name from the bonded set.
 * @param className - CSS class for sizing.
 * @returns The icon VNode.
 */
function renderFallbackIcon(name: IconName, className?: string): VNode {
  const icon = getIcon(name)
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': 'true',
      focusable: 'false',
      class: className,
      viewBox: icon.viewBox || '0 0 20 20',
      fill: icon.fill || 'currentColor',
      stroke: icon.stroke,
      'stroke-width': icon.strokeWidth,
      'stroke-linecap': icon.strokeLinecap,
      'stroke-linejoin': icon.strokeLinejoin,
    },
    icon.paths.map((p) =>
      h('path', {
        d: p.d,
        'fill-rule': p.fillRule,
        'clip-rule': p.clipRule,
      }),
    ),
  )
}

/**
 * Vue Avatar UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Avatar: renders the `src`
 * image until it fails to load, then falls back to custom fallback content,
 * the name's initials, or the user glyph — styled by `cm.avatar({ size })`,
 * with `cm.avatarSquare` when `rounded` is false and the numeric size as
 * inline `width`/`height`.
 */
export const Avatar = defineComponent({
  name: 'MAvatar',
  inheritAttrs: false,
  props: {
    src: String,
    alt: String,
    name: String,
    size: {
      type: [String, Number] as PropType<Size | number>,
      default: 'md',
    },
    rounded: {
      type: Boolean,
      default: true,
    },
    fallback: null,
    className: String,
    style: [String, Object] as PropType<AvatarProps['style']>,
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const imageError = ref(false)

    return () => {
      const showFallback = !props.src || imageError.value

      const avatarSize = typeof props.size === 'number' ? undefined : props.size
      const containerClasses = cm.cn(
        cm.avatar({ size: avatarSize }),
        !props.rounded && cm.avatarSquare,
        ...classOf(props.className, attrs),
      )

      // React appends `px` to numeric width/height style values; Vue's
      // style binding does not, so build the px strings explicitly.
      const customSize =
        typeof props.size === 'number'
          ? { width: `${props.size}px`, height: `${props.size}px` }
          : undefined

      const fallback = props.fallback ?? slots.fallback?.()

      return h(
        'div',
        {
          class: containerClasses,
          style: mergeStyles(styleOf(props.style, attrs), customSize),
          'data-testid': props.testId,
        },
        !showFallback
          ? h('img', {
              src: props.src,
              alt:
                props.alt ||
                props.name ||
                t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' }),
              class: cm.avatarImage,
              onError: () => {
                imageError.value = true
              },
            })
          : h('div', { class: cm.avatarFallback }, [
              fallback
                ? fallback
                : props.name
                  ? h('span', { class: cm.avatarInitials }, getInitials(props.name))
                  : renderFallbackIcon('user', cm.avatarFallbackIcon),
            ]),
      )
    }
  },
})

/**
 * Merges a custom numeric size into the incoming style the way React's
 * `{ ...style, ...customSize }` does — the size wins.
 *
 * @param base - The incoming style value (`style` prop and/or attr).
 * @param extra - The computed `{ width, height }` px strings for a numeric size.
 * @returns The merged style for `h()`.
 */
function mergeStyles(base: unknown, extra: Record<string, string> | undefined): unknown {
  if (extra === undefined) return base
  if (base === undefined || base === null) return extra
  if (typeof base === 'string') return [base, extra]
  if (Array.isArray(base)) return [...base, extra]
  return { ...(base as Record<string, unknown>), ...extra }
}

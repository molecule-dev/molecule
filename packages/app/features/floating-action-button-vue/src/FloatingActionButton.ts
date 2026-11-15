/**
 * Vue fixed-position floating action button.
 *
 * Vue counterpart of `@molecule/app-floating-action-button-react`'s
 * `FloatingActionButton` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { FloatingActionButtonProps } from './types.js'

/** Vertical square sizes in px, keyed by {@link FloatingActionButtonProps.size}. */
const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

/** The corner's horizontal and vertical offsets, as React writes them. */
const CORNER = {
  'bottom-right': ['right', 'bottom'],
  'bottom-left': ['left', 'bottom'],
  'top-right': ['right', 'top'],
  'top-left': ['left', 'top'],
} as const

/**
 * The root's inline style, exactly as React writes it: the corner offsets,
 * then the square size, then the stacking level.
 *
 * @param dim - The square size in pixels.
 * @param position - The configured corner.
 * @returns The `style` attribute text.
 */
const rootStyle = (
  dim: number,
  position: NonNullable<FloatingActionButtonProps['position']>,
): string => {
  const [x, y] = CORNER[position]
  return `position: fixed; ${x}: 24px; ${y}: 24px; width: ${dim}px; height: ${dim}px; z-index: 40`
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Fixed-position circular action button. Renders either an anchor (when
 * `href` is set) or a button (when `onClick` is set). Positioning is
 * inline-style so the component works without extra CSS setup, and it ships
 * with a visible default surface (primary gradient + soft elevation, via the
 * `gradientPrimary`/`shadowLifted` ClassMap tokens). Pass `className` to
 * override the surface — caller classes are resolved last by `cm.cn`
 * (tailwind-merge).
 *
 * @param props - Component props (see {@link FloatingActionButtonProps}).
 * @returns The floating action button component.
 */
export const FloatingActionButton = defineComponent({
  name: 'FloatingActionButton',
  props: {
    // Node-valued prop: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null`).
    icon: null,
    label: { type: String, default: '' },
    onClick: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    href: { type: String, default: undefined },
    position: {
      type: String as PropType<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>,
      default: 'bottom-right',
    },
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'md',
    },
    showTooltip: { type: Boolean, default: true },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const dim = SIZE_MAP[props.size] * 4
      const ariaLabel = t(props.label, {}, { defaultValue: props.label })
      const commonClass = cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.gradientPrimary,
        cm.shadowLifted,
        props.className,
      )
      const style = rootStyle(dim, props.position)
      const children = slotOrProp(slots.icon, props.icon)
      if (props.href) {
        return h(
          'a',
          {
            href: props.href,
            'aria-label': ariaLabel,
            title: props.showTooltip ? ariaLabel : undefined,
            class: commonClass,
            style,
          },
          children,
        )
      }
      return h(
        'button',
        {
          type: 'button',
          onClick: props.onClick,
          'aria-label': ariaLabel,
          title: props.showTooltip ? ariaLabel : undefined,
          class: commonClass,
          style,
        },
        children,
      )
    }
  },
})

/**
 * Vue floating / inline help button.
 *
 * Vue counterpart of `@molecule/app-help-button-react`'s `HelpButton` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link, toChildArray, useTranslation } from '@molecule/app-vue'

import type { HelpButtonProps } from './types.js'

/** Square sizes in pixels, keyed by {@link HelpButtonProps.size}. */
const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

/** The root's inline style, exactly as React writes it (without `transform` unless hovered). */
const rootStyle = (
  dim: number,
  position: HelpButtonProps['position'],
  hovered: boolean,
): string => {
  const parts = [`width: ${dim}px`, `height: ${dim}px`]
  if (position === 'bottom-right') {
    parts.push('position: fixed', 'right: 24px', 'bottom: 24px', 'z-index: 40')
  } else if (position === 'bottom-left') {
    parts.push('position: fixed', 'left: 24px', 'bottom: 24px', 'z-index: 40')
  }
  if (hovered) parts.push('transform: scale(1.05)')
  parts.push('transition: transform 150ms ease')
  return parts.join('; ')
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
 * Floating (or inline) help button — opens a support panel, chat
 * widget, or docs. Default icon is "?" but apps can swap in their own.
 *
 * Use `position="inline"` inside other UI to drop the fixed
 * positioning and render as a normal in-flow button.
 *
 * @param props - Component props (see {@link HelpButtonProps}).
 * @returns The help button component.
 */
export const HelpButton = defineComponent({
  name: 'HelpButton',
  props: {
    // Node-valued prop: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to fall back to "?").
    icon: null,
    label: { type: String, default: undefined },
    onClick: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    href: { type: String, default: undefined },
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'md',
    },
    position: {
      type: String as PropType<'bottom-right' | 'bottom-left' | 'inline'>,
      default: 'bottom-right',
    },
    hasNotification: { type: Boolean, default: false },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const hovered = ref(false)

    return (): VNode => {
      const dim = SIZE_MAP[props.size]
      const ariaLabel = props.label ?? t('helpButton.label', {}, { defaultValue: 'Help' })
      // React's `slot(iconProp) ?? "?"`: an empty icon list renders nothing, so
      // the default "?" shows instead.
      const iconNodes = toChildArray(slotOrProp(slots.icon, props.icon))
      const content = h(
        'span',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.position('relative'),
          ),
          style: 'width: 100%; height: 100%',
        },
        [
          ...(iconNodes.length > 0
            ? iconNodes
            : [
                h(
                  'span',
                  {
                    'aria-hidden': 'true',
                    style: `font-size: ${dim * 0.45}px; font-weight: 700`,
                  },
                  '?',
                ),
              ]),
          ...(props.hasNotification
            ? [
                h('span', {
                  'aria-hidden': 'true',
                  style:
                    'position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: currentcolor',
                }),
              ]
            : []),
        ],
      )
      const common = {
        'aria-label': ariaLabel,
        onMouseenter: () => {
          hovered.value = true
        },
        onMouseleave: () => {
          hovered.value = false
        },
        class: props.className,
        style: rootStyle(dim, props.position, hovered.value),
      }
      return props.href
        ? h(Link, { to: props.href, ...common }, () => [content])
        : h('button', { type: 'button', onClick: props.onClick, ...common }, [content])
    }
  },
})

/**
 * Vue Tooltip UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  Teleport,
  type VNodeArrayChildren,
  watch,
} from 'vue'

import type { TooltipPlacement } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface Position {
  top: number
  left: number
}

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` classes in `tooltipContent` resolve
 * to, so the arrow always matches the tooltip body in both themes.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
function getArrowStyle(placement: TooltipPlacement): Record<string, string> {
  const half = ARROW_SIZE / 2
  const base: Record<string, string> = {
    position: 'absolute',
    width: `${ARROW_SIZE}px`,
    height: `${ARROW_SIZE}px`,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'top-start':
      return { ...base, bottom: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'bottom':
      return {
        ...base,
        top: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'bottom-start':
      return { ...base, top: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'left':
      return {
        ...base,
        right: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    case 'right':
      return {
        ...base,
        left: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    default:
      return base
  }
}

/**
 * Calculate tooltip position based on trigger element and placement.
 * @param triggerRect - The trigger rect.
 * @param tooltipRect - The tooltip rect.
 * @param placement - The placement.
 * @param offset - The offset.
 * @returns The result.
 */
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset = 8,
): Position {
  const { top, left, width, height } = triggerRect
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  const positions: Record<TooltipPlacement, Position> = {
    top: {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    bottom: {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    left: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX - tooltipWidth - offset,
    },
    right: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX + width + offset,
    },
    'top-start': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX,
    },
    'top-end': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
    'bottom-start': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX,
    },
    'bottom-end': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
  }

  return positions[placement]
}

/**
 * Vue Tooltip UI component with UIClassMap-driven styling.
 *
 * `hasArrow` renders a small themed pointer at the resolved `placement` edge.
 */
export const Tooltip = defineComponent({
  name: 'MTooltip',
  props: {
    content: {
      type: [String, Object] as PropType<string | unknown>,
      required: true,
    },
    placement: {
      type: String as PropType<TooltipPlacement>,
      default: 'top',
    },
    delay: {
      type: Number,
      default: 0,
    },
    hasArrow: Boolean,
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const isVisible = ref(false)
    const position = ref<Position>({ top: 0, left: 0 })
    const triggerRef = ref<HTMLElement | null>(null)
    const tooltipRef = ref<HTMLElement | null>(null)
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const updatePosition = (): void => {
      if (triggerRef.value && tooltipRef.value) {
        const triggerRect = triggerRef.value.getBoundingClientRect()
        const tooltipRect = tooltipRef.value.getBoundingClientRect()
        position.value = calculatePosition(triggerRect, tooltipRect, props.placement)
      }
    }

    const show = (): void => {
      if (props.delay > 0) {
        timeoutId = setTimeout(() => {
          isVisible.value = true
        }, props.delay)
      } else {
        isVisible.value = true
      }
    }

    const hide = (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      isVisible.value = false
    }

    watch(isVisible, (visible) => {
      if (visible) {
        // Wait for next tick to get tooltip dimensions
        setTimeout(updatePosition, 0)
      }
    })

    onUnmounted(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    })

    return () => {
      // Outer positioned wrapper carries the top/left/zIndex placement; the
      // arrow renders as its SIBLING (not nested inside the visible box),
      // because `tooltipContent` sets `overflow-hidden` — an arrow meant to
      // poke past the box's own edge would be clipped invisible if it were a
      // descendant of that element instead.
      const tooltipElement = isVisible.value
        ? h(
            Teleport,
            { to: 'body' },
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  top: `${position.value.top}px`,
                  left: `${position.value.left}px`,
                  zIndex: 9999,
                },
              },
              [
                h(
                  'div',
                  {
                    ref: tooltipRef,
                    role: 'tooltip',
                    class: cm.cn(cm.tooltipContent, props.class),
                  },
                  typeof props.content === 'string'
                    ? props.content
                    : ([props.content] as VNodeArrayChildren),
                ),
                props.hasArrow
                  ? h('span', { 'aria-hidden': 'true', style: getArrowStyle(props.placement) })
                  : null,
              ] as VNodeArrayChildren,
            ),
          )
        : null

      return [
        h(
          'div',
          {
            ref: triggerRef,
            onMouseenter: show,
            onMouseleave: hide,
            onFocus: show,
            onBlur: hide,
            class: cm.tooltipTrigger,
          },
          slots.default?.() as VNodeArrayChildren,
        ),
        tooltipElement,
      ] as VNodeArrayChildren
    }
  },
})

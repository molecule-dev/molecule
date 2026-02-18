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
      const tooltipElement = isVisible.value
        ? h(
            Teleport,
            { to: 'body' },
            h(
              'div',
              {
                ref: tooltipRef,
                role: 'tooltip',
                class: cm.cn(cm.tooltipContent, props.class),
                style: {
                  position: 'absolute',
                  top: `${position.value.top}px`,
                  left: `${position.value.left}px`,
                  zIndex: 9999,
                },
              },
              typeof props.content === 'string'
                ? props.content
                : ([props.content] as VNodeArrayChildren),
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

/**
 * Vue Dropdown UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
  Teleport,
  type VNodeArrayChildren,
  watch,
} from 'vue'

import type { DropdownItem } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface Position {
  top: number
  left: number
}

type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right'
type Align = 'start' | 'center' | 'end'

/**
 * Calculate dropdown position based on trigger element and placement.
 * @param triggerRect - The trigger rect.
 * @param menuRect - The menu rect.
 * @param placement - The placement.
 * @param align - The align.
 * @param offset - The offset.
 * @returns The result.
 */
function calculatePosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  placement: Placement,
  align: Align,
  offset = 4,
): Position {
  let top = 0
  let left: number

  // Vertical positioning
  if (placement.startsWith('top')) {
    top = triggerRect.top + window.scrollY - menuRect.height - offset
  } else if (placement.startsWith('bottom')) {
    top = triggerRect.bottom + window.scrollY + offset
  } else if (placement === 'left' || placement === 'right') {
    top = triggerRect.top + window.scrollY + (triggerRect.height - menuRect.height) / 2
  }

  // Horizontal positioning
  if (placement === 'left') {
    left = triggerRect.left + window.scrollX - menuRect.width - offset
  } else if (placement === 'right') {
    left = triggerRect.right + window.scrollX + offset
  } else {
    // For top/bottom placements, use align
    switch (align) {
      case 'start':
        left = triggerRect.left + window.scrollX
        break
      case 'end':
        left = triggerRect.right + window.scrollX - menuRect.width
        break
      case 'center':
      default:
        left = triggerRect.left + window.scrollX + (triggerRect.width - menuRect.width) / 2
        break
    }
  }

  // Handle top-start, top-end, bottom-start, bottom-end
  if (placement.endsWith('-start')) {
    left = triggerRect.left + window.scrollX
  } else if (placement.endsWith('-end')) {
    left = triggerRect.right + window.scrollX - menuRect.width
  }

  return { top, left }
}

/**
 * Single dropdown menu item component.
 */
const DropdownMenuItem = defineComponent({
  name: 'MDropdownMenuItem',
  props: {
    item: {
      type: Object as PropType<DropdownItem<string>>,
      required: true,
    },
  },
  emits: ['select', 'close'],
  setup(props, { emit }) {
    const cm = getClassMap()

    const handleClick = (): void => {
      if (!props.item.disabled) {
        emit('select', props.item.value)
        emit('close')
      }
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    }

    return () => {
      if (props.item.separator) {
        return h('div', { class: cm.dropdownSeparator, role: 'separator' })
      }

      return h(
        'div',
        {
          role: 'menuitem',
          tabindex: props.item.disabled ? -1 : 0,
          class: cm.cn(cm.dropdownItem, props.item.disabled && cm.dropdownItemDisabled),
          onClick: handleClick,
          onKeydown: handleKeyDown,
          'data-disabled': props.item.disabled || undefined,
        },
        [
          props.item.icon && h('span', { class: cm.dropdownItemIcon }, String(props.item.icon)),
          h('span', { class: cm.dropdownItemLabel }, String(props.item.label)),
          props.item.shortcut &&
            h('span', { class: cm.dropdownItemShortcut }, String(props.item.shortcut)),
        ] as VNodeArrayChildren,
      )
    }
  },
})

/**
 * Vue Dropdown UI component with UIClassMap-driven styling.
 */
export const Dropdown = defineComponent({
  name: 'MDropdown',
  props: {
    items: {
      type: Array as PropType<DropdownItem<string>[]>,
      required: true,
    },
    placement: {
      type: String as PropType<Placement>,
      default: 'bottom-start',
    },
    open: {
      type: Boolean,
      default: undefined,
    },
    align: {
      type: String as PropType<Align>,
      default: 'start',
    },
    width: {
      type: [String, Number] as PropType<'trigger' | 'auto' | number | string>,
      default: 'auto',
    },
    class: String,
  },
  emits: ['select', 'update:open'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()
    const internalOpen = ref(false)
    const position = ref<Position>({ top: 0, left: 0 })
    const triggerRef = ref<HTMLElement | null>(null)
    const menuRef = ref<HTMLElement | null>(null)

    const isOpen = computed(() => (props.open !== undefined ? props.open : internalOpen.value))

    const setOpen = (open: boolean): void => {
      if (props.open === undefined) {
        internalOpen.value = open
      }
      emit('update:open', open)
    }

    const updatePosition = (): void => {
      if (triggerRef.value && menuRef.value) {
        const triggerRect = triggerRef.value.getBoundingClientRect()
        const menuRect = menuRef.value.getBoundingClientRect()
        position.value = calculatePosition(triggerRect, menuRect, props.placement, props.align)
      }
    }

    const handleTriggerClick = (): void => {
      setOpen(!isOpen.value)
    }

    const handleClose = (): void => {
      setOpen(false)
    }

    const handleSelect = (value: string): void => {
      emit('select', value)
    }

    // Update position when menu opens
    watch(isOpen, (open) => {
      if (open) {
        requestAnimationFrame(updatePosition)
      }
    })

    // Close on outside click and escape
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        triggerRef.value &&
        !triggerRef.value.contains(e.target as Node) &&
        menuRef.value &&
        !menuRef.value.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    onMounted(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    })

    onUnmounted(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    })

    return () => {
      // Calculate menu width
      const menuWidth =
        props.width === 'trigger' && triggerRef.value
          ? triggerRef.value.offsetWidth
          : typeof props.width === 'number'
            ? props.width
            : props.width !== 'auto'
              ? props.width
              : undefined

      const menu =
        isOpen.value &&
        h(
          Teleport,
          { to: 'body' },
          h(
            'div',
            {
              ref: menuRef,
              role: 'menu',
              'data-state': 'open',
              class: cm.cn(cm.dropdownContent, props.class),
              style: {
                position: 'absolute',
                top: `${position.value.top}px`,
                left: `${position.value.left}px`,
                width: menuWidth ? `${menuWidth}px` : undefined,
                zIndex: 50,
              },
            },
            props.items.map((item, index) =>
              h(DropdownMenuItem, {
                key: item.separator ? `separator-${index}` : item.value,
                item,
                onSelect: handleSelect,
                onClose: handleClose,
              }),
            ),
          ),
        )

      return [
        h(
          'div',
          {
            ref: triggerRef,
            onClick: handleTriggerClick,
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleTriggerClick()
              }
            },
            class: cm.dropdownTrigger,
          },
          slots.default?.() as VNodeArrayChildren,
        ),
        menu,
      ] as VNodeArrayChildren
    }
  },
})

/**
 * Dropdown label component.
 */
export const DropdownLabel = defineComponent({
  name: 'MDropdownLabel',
  props: {
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () => h('div', { class: cm.cn(cm.dropdownLabel, props.class) }, slots.default?.())
  },
})

/**
 * Dropdown separator component.
 */
export const DropdownSeparator = defineComponent({
  name: 'MDropdownSeparator',
  props: {
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => h('div', { class: cm.cn(cm.dropdownSeparator, props.class), role: 'separator' })
  },
})

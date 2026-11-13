/**
 * Vue Dropdown UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  cloneVNode,
  type ComponentPublicInstance,
  computed,
  defineComponent,
  Fragment,
  h,
  isVNode,
  onMounted,
  type PropType,
  ref,
  Teleport,
  type VNode,
  type VNodeChild,
  watch,
  watchEffect,
} from 'vue'

import type { DropdownItem, DropdownProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useLocation } from '@molecule/app-vue'

import { classOf, type RenderableChildren } from '../utilities/attrs.js'

/** The DOM element (or component instance) a Vue function ref receives. */
type RefNode = Element | ComponentPublicInstance | null

type Placement = NonNullable<DropdownProps['placement']>
type Align = NonNullable<DropdownProps['align']>

interface Position {
  top: number
  left: number
}

/** Counter backing the generated menu id that stands in for React's `useId()`. */
let nextGeneratedMenuId = 0

/** CSS properties that take unitless numbers; every other numeric value gets `px`. */
const UNITLESS_STYLE_PROPERTIES = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexNegative',
  'flexOrder',
  'flexPositive',
  'flexShrink',
  'fontSynthesisWeight',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
])

/**
 * Applies React's inline-style number rule to a style object: numbers of
 * unit-bearing properties become `"<n>px"` strings. Vue's style patcher sets
 * raw numbers, which the CSSOM silently drops for unit-bearing properties,
 * while React (and therefore the conformance goldens) appends `px`.
 *
 * @param style - A camelCase style object.
 * @returns The same declarations with React's unit spelling.
 */
function withReactStyleUnits(
  style: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {}
  for (const [key, value] of Object.entries(style)) {
    out[key] =
      typeof value === 'number' && !UNITLESS_STYLE_PROPERTIES.has(key) ? `${value}px` : value
  }
  return out
}

/**
 * Calculate dropdown position based on trigger element and placement.
 * @param triggerRect - The bounding rectangle of the trigger element.
 * @param menuRect - The bounding rectangle of the dropdown menu.
 * @param placement - The desired placement direction.
 * @param align - The alignment within the placement axis.
 * @param offset - The pixel offset from the trigger element.
 * @returns The computed top and left position.
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

/** Indices of the non-separator, non-disabled items — the set Arrow/Home/End navigate. */
function focusableItemIndexes(items: DropdownItem<string>[]): number[] {
  return items.reduce<number[]>((acc, item, i) => {
    if (!item.separator && !item.disabled) acc.push(i)
    return acc
  }, [])
}

/**
 * Single dropdown menu item component.
 *
 * Faithful port of React's internal `DropdownMenuItem`: a `role="menuitem"`
 * div in the roving-tabindex set, selecting (click / Enter / Space) only when
 * enabled, with `aria-disabled` for assistive tech and `data-disabled` for
 * styling.
 */
const DropdownMenuItem = defineComponent({
  name: 'MDropdownMenuItem',
  props: {
    item: {
      type: Object as PropType<DropdownItem<string>>,
      required: true,
    },
    /** Whether this item is the roving-tabindex active item (receives DOM focus while open). */
    isActive: {
      type: Boolean,
      default: false,
    },
    /** Registers this item's DOM node so the parent can move focus onto it. */
    registerRef: {
      type: Function as PropType<(node: RefNode) => void>,
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

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
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
          ref: props.registerRef,
          role: 'menuitem',
          // Roving tabindex (WAI-ARIA APG menu pattern): only the active item
          // is a Tab stop, while ArrowUp/Down/Home/End move within the menu.
          tabindex: props.item.disabled ? -1 : props.isActive ? 0 : -1,
          class: cm.cn(cm.dropdownItem, props.item.disabled && cm.dropdownItemDisabled),
          onClick: handleClick,
          onKeydown: handleKeyDown,
          // data-disabled only styles; aria-disabled is what assistive tech
          // reads — without it a disabled item announces as actionable.
          'aria-disabled': props.item.disabled || undefined,
          'data-disabled': props.item.disabled || undefined,
        },
        [
          !!props.item.icon &&
            h('span', { class: cm.dropdownItemIcon }, [props.item.icon as VNodeChild]),
          h('span', { class: cm.dropdownItemLabel }, props.item.label as RenderableChildren),
          props.item.shortcut &&
            h('span', { class: cm.dropdownItemShortcut }, [props.item.shortcut]),
        ],
      )
    }
  },
})

/**
 * Vue Dropdown UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Dropdown, implementing the
 * WAI-ARIA APG menu-button pattern. If `trigger` is a single element node it
 * is cloned (`cloneVNode`, React's `cloneElement`) with `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, `data-testid`, `tabindex` and the merged
 * open/keyboard handlers — no extra wrapper, no double focus stop. Any other
 * trigger (text, several nodes) is wrapped in a `role="button" tabindex="0"`
 * container styled with `cm.dropdownTrigger`. Enter/Space/ArrowDown open the
 * menu onto the first item (ArrowUp onto the last); ArrowUp/Down/Home/End
 * rove the `role="menuitem"` items, Escape closes and returns focus to the
 * trigger, Tab closes without trapping, outside mousedown closes without
 * refocusing, and a route change closes the open menu. React's mount-time
 * route effect also fires here: opening state is announced through `openChange`
 * with `false` once on mount. The menu teleports to `document.body`, and its
 * absolute position is computed from the trigger's `getBoundingClientRect`
 * one animation frame after opening.
 */
export const Dropdown = defineComponent({
  name: 'MDropdown',
  inheritAttrs: false,
  props: {
    trigger: null,
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
      type: [String, Number] as PropType<DropdownProps['width']>,
      default: undefined,
    },
    className: String,
    style: [String, Object] as PropType<DropdownProps['style']>,
    testId: String,
  },
  emits: ['select', 'openChange'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    const internalOpen = ref(false)
    const position = ref<Position>({ top: 0, left: 0 })
    const activeIndex = ref(-1)
    // The actual interactive trigger node — either the cloned single-element
    // trigger, or the fallback `role="button"` wrapper. Used for position
    // measurement, outside-click detection, AND focus restoration. Plain
    // variables, like React's refs: reads during render are not reactive.
    let triggerRef: HTMLElement | null = null
    let menuRef: HTMLDivElement | null = null
    const itemRefs: (HTMLElement | null)[] = []
    // Which end of the menu keyboard-driven opens should focus: ArrowDown
    // (and Enter/Space/click) want the first item, ArrowUp wants the last.
    let pendingOpenFocus: 'first' | 'last' = 'first'
    // Generated menu id (React's `useId()`); the conformance normalizer
    // renumbers ids by document order either way.
    const menuId = `mol-dropdown-${nextGeneratedMenuId++}`

    const isOpen = computed(() => (props.open !== undefined ? props.open : internalOpen.value))

    const setOpen = (open: boolean): void => {
      if (props.open === undefined) {
        internalOpen.value = open
      }
      emit('openChange', open)
    }

    const updatePosition = (): void => {
      if (triggerRef && menuRef) {
        const triggerRect = triggerRef.getBoundingClientRect()
        const menuRect = menuRef.getBoundingClientRect()
        position.value = calculatePosition(triggerRect, menuRect, props.placement, props.align)
      }
    }

    const handleTriggerClick = (): void => {
      if (!isOpen.value) pendingOpenFocus = 'first'
      setOpen(!isOpen.value)
    }

    const handleTriggerKeyDown = (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          pendingOpenFocus = 'first'
          setOpen(true)
          break
        case 'ArrowDown':
          event.preventDefault()
          pendingOpenFocus = 'first'
          setOpen(true)
          break
        case 'ArrowUp':
          event.preventDefault()
          pendingOpenFocus = 'last'
          setOpen(true)
          break
        default:
          break
      }
    }

    const handleClose = (): void => {
      setOpen(false)
    }

    // Closes AND returns focus to the trigger — used for every USER-DRIVEN
    // close (Escape, item selection) so keyboard focus never gets dropped
    // onto the (now-removed) menu. Outside-click and route-change closes
    // deliberately do NOT refocus (the user's attention is already elsewhere).
    const closeAndRefocusTrigger = (): void => {
      handleClose()
      triggerRef?.focus()
    }

    const handleSelect = (value: string): void => {
      emit('select', value)
    }

    // Update position when the menu opens: the animation frame ensures the
    // menu is rendered before calculating its position.
    watch(
      isOpen,
      (open) => {
        if (open) requestAnimationFrame(updatePosition)
      },
      { flush: 'post' },
    )

    // Moves focus to the first (or last, for an ArrowUp-driven open) item
    // whenever the menu transitions closed → open. Reading `items` here
    // without tracking it (React used a ref for the same reason) means a
    // parent re-render that recreates the `items` array does not re-run this
    // and yank focus back to the first item out from under the user.
    watch(
      () => isOpen.value,
      (open) => {
        if (!open) {
          activeIndex.value = -1
          return
        }
        const focusable = focusableItemIndexes(props.items)
        const wantLast = pendingOpenFocus === 'last'
        pendingOpenFocus = 'first'
        if (focusable.length === 0) return
        activeIndex.value = wantLast ? focusable[focusable.length - 1]! : focusable[0]!
      },
      { flush: 'post', immediate: true },
    )

    // Syncs real DOM focus to the roving-tabindex active item.
    watchEffect(
      () => {
        if (!isOpen.value || activeIndex.value < 0) return
        itemRefs[activeIndex.value]?.focus()
      },
      { flush: 'post' },
    )

    // Close on outside click and Escape (with focus restoration).
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        triggerRef &&
        !triggerRef.contains(event.target as Node) &&
        menuRef &&
        !menuRef.contains(event.target as Node)
      ) {
        handleClose()
      }
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeAndRefocusTrigger()
      }
    }

    watch(
      isOpen,
      (open) => {
        if (open) {
          document.addEventListener('mousedown', handleClickOutside)
          document.addEventListener('keydown', handleEscape)
        } else {
          document.removeEventListener('mousedown', handleClickOutside)
          document.removeEventListener('keydown', handleEscape)
        }
      },
      { flush: 'post' },
    )

    // React's route-change effect also runs on mount, announcing the (already
    // false) open state through `openChange` once. Closing on route change —
    // a dropdown left open over the next page blocks clicks underneath —
    // covers both in-app navigation and back/forward through the router's
    // reactive location.
    const location = useLocation()
    watch(
      () => [location.value.pathname, location.value.search],
      () => setOpen(false),
    )
    onMounted(() => setOpen(false))

    const handleMenuKeyDown = (event: KeyboardEvent): void => {
      const focusable = focusableItemIndexes(props.items)
      if (focusable.length === 0) return
      const currentPos = focusable.indexOf(activeIndex.value)

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          activeIndex.value = focusable[(currentPos + 1 + focusable.length) % focusable.length]!
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          activeIndex.value = focusable[(currentPos - 1 + focusable.length) % focusable.length]!
          break
        }
        case 'Home':
          event.preventDefault()
          activeIndex.value = focusable[0]!
          break
        case 'End':
          event.preventDefault()
          activeIndex.value = focusable[focusable.length - 1]!
          break
        case 'Tab':
          // APG: native menus do not trap Tab — it exits the menu. Don't
          // preventDefault (the browser still moves focus natively); just
          // close our state in sync with focus leaving.
          handleClose()
          break
        default:
          break
      }
    }

    const setTriggerRef = (node: RefNode): void => {
      triggerRef = (node as HTMLElement | null) ?? null
    }

    const setMenuRef = (node: RefNode): void => {
      menuRef = (node as HTMLDivElement | null) ?? null
    }

    return () => {
      // Calculate menu width. Not measurable until the trigger ref exists
      // (the first open frame, before layout); `undefined` then lets the menu
      // size itself until the position update re-renders with a real width.
      const menuWidth =
        props.width === 'trigger'
          ? triggerRef?.offsetWidth
          : typeof props.width === 'number'
            ? props.width
            : props.width

      const styleProp = props.style as Record<string, string | number> | undefined
      const menuStyle: Record<string, string | number | undefined> = withReactStyleUnits({
        ...(styleProp ?? {}),
        position: 'absolute',
        top: position.value.top,
        left: position.value.left,
        zIndex: 50,
        ...(menuWidth !== undefined ? { width: menuWidth } : {}),
      })

      const menu = isOpen.value
        ? h(Teleport, { to: 'body' }, [
            h(
              'div',
              {
                ref: setMenuRef,
                id: menuId,
                role: 'menu',
                'data-state': 'open',
                class: cm.cn(cm.dropdownContent, ...classOf(props.className, attrs)),
                style: menuStyle,
                'data-testid': props.testId ? `${props.testId}-menu` : undefined,
                onKeydown: handleMenuKeyDown,
              },
              props.items.map((item, index) =>
                h(DropdownMenuItem, {
                  key: item.separator ? `separator-${index}` : item.value,
                  item,
                  isActive: index === activeIndex.value,
                  onSelect: handleSelect,
                  onClose: closeAndRefocusTrigger,
                  registerRef: (node: RefNode): void => {
                    itemRefs[index] = (node as HTMLElement | null) ?? null
                  },
                }),
              ),
            ),
          ])
        : null

      const triggerContent = (props.trigger ?? slots.trigger?.()) as RenderableChildren | undefined
      let renderedTrigger: VNodeChild
      if (
        triggerContent !== undefined &&
        triggerContent !== null &&
        isVNode(triggerContent) &&
        triggerContent.type !== Fragment
      ) {
        // Single-element trigger: clone it into a real menu button, merging
        // the accessibility attributes and open/keyboard handlers onto it
        // (Vue chains `on*` handlers the way React's wrapper calls the
        // original handler first).
        const source: VNode = triggerContent
        renderedTrigger = cloneVNode(source, {
          ref: setTriggerRef,
          tabindex: (source.props?.tabIndex as number | undefined) ?? 0,
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen.value,
          'aria-controls': isOpen.value ? menuId : undefined,
          'data-testid': props.testId,
          onClick: handleTriggerClick,
          onKeydown: handleTriggerKeyDown,
        })
      } else {
        renderedTrigger = h(
          'div',
          {
            ref: setTriggerRef,
            role: 'button',
            tabindex: 0,
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen.value,
            'aria-controls': isOpen.value ? menuId : undefined,
            onClick: handleTriggerClick,
            onKeydown: handleTriggerKeyDown,
            class: cm.dropdownTrigger,
            'data-testid': props.testId,
          },
          triggerContent,
        )
      }

      return [renderedTrigger, typeof document !== 'undefined' ? menu : null] as VNodeChild[]
    }
  },
})

/**
 * Dropdown label for grouping items.
 *
 * Faithful port of `@molecule/app-ui-react`'s DropdownLabel.
 */
export const DropdownLabel = defineComponent({
  name: 'MDropdownLabel',
  props: {
    className: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        { class: cm.cn(cm.dropdownLabel, ...classOf(props.className, attrs)) },
        slots.default?.(),
      )
  },
})

/**
 * Dropdown separator for dividing groups.
 *
 * Faithful port of `@molecule/app-ui-react`'s DropdownSeparator.
 */
export const DropdownSeparator = defineComponent({
  name: 'MDropdownSeparator',
  props: {
    className: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () =>
      h('div', {
        class: cm.cn(cm.dropdownSeparator, ...classOf(props.className, attrs)),
        role: 'separator',
      })
  },
})

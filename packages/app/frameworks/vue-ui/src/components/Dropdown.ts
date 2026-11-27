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
  onBeforeUnmount,
  type PropType,
  ref,
  shallowRef,
  Teleport,
  type VNode,
  type VNodeChild,
  watch,
  watchEffect,
  watchPostEffect,
} from 'vue'

import {
  domElement,
  measureDropdownPosition,
  OverlayLayer,
  readOverlayAnchorWidth,
} from '@molecule/app-overlay-dom'
import type { DropdownItem, DropdownProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useLocation } from '@molecule/app-vue'

import { reactStyleProps } from '../style.js'
import { classOf, type RenderableChildren } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

/** The DOM element (or component instance) a Vue function ref receives. */
type RefNode = Element | ComponentPublicInstance | null

/**
 * The DOM element a template ref resolves to: the element itself, or a component's root element
 * (a trigger that is a component, such as Button, hands its ref a component instance).
 *
 * @param node - What Vue passed the ref.
 * @returns The element, or null.
 */
const refElement = (node: RefNode): ReturnType<typeof domElement> =>
  domElement(node && '$el' in node ? node.$el : node)

/** Identifies an HTML element in any document, so SVG triggers stay unsized. */
function isHtmlElement(element: Element | null): element is HTMLElement {
  return element?.namespaceURI === 'http://www.w3.org/1999/xhtml'
}

/** The forwarded menu ref points at the native div. */
function isDiv(element: Element | null): element is HTMLDivElement {
  return isHtmlElement(element) && element.localName === 'div'
}

type Placement = NonNullable<DropdownProps['placement']>
type Align = NonNullable<DropdownProps['align']>

interface Position {
  top: number
  left: number
}

/** Counter backing the generated menu id that stands in for React's `useId()`. */
let nextGeneratedMenuId = 0

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
    automationId: String,
    disabled: Boolean,
  },
  emits: ['select', 'openChange'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()

    const internalOpen = ref(false)
    const position = ref<Position>({ top: 0, left: 0 })
    const activeIndex = ref(-1)
    // The actual interactive trigger node — either the cloned single-element
    // trigger, or the fallback `role="button"` wrapper. Used for position
    // measurement, outside-click detection, AND focus restoration. A plain
    // variable, like React's ref: reads during render are not reactive.
    const triggerRef = shallowRef<ReturnType<typeof refElement>>(null)
    // The `role="menu"` element is React's `forwardRef` target; it holds
    // `null` while closed.
    const menuRef = useElementRef<HTMLDivElement>(expose)
    const layer = new OverlayLayer()
    const itemRefs: ReturnType<typeof refElement>[] = []
    // Which end of the menu keyboard-driven opens should focus: ArrowDown
    // (and Enter/Space/click) want the first item, ArrowUp wants the last.
    let pendingOpenFocus: 'first' | 'last' = 'first'
    // Generated menu id (React's `useId()`); the conformance normalizer
    // renumbers ids by document order either way.
    const menuId = `mol-dropdown-${nextGeneratedMenuId++}`

    // A disabled dropdown never opens, whatever `open` says.
    const isOpen = computed(
      () => !props.disabled && (props.open !== undefined ? props.open : internalOpen.value),
    )

    const setOpen = (open: boolean): void => {
      if (props.open === undefined) {
        internalOpen.value = open
      }
      emit('openChange', open)
    }

    const updatePosition = (): void => {
      const trigger = triggerRef.value
      const menu = menuRef.value
      if (trigger && menu) {
        position.value = measureDropdownPosition(trigger, menu, props.placement, props.align)
      }
    }

    const handleTriggerClick = (): void => {
      if (props.disabled) return
      if (!isOpen.value) pendingOpenFocus = 'first'
      setOpen(!isOpen.value)
    }

    const handleTriggerKeyDown = (event: KeyboardEvent): void => {
      if (props.disabled) return
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
      triggerRef.value?.focus()
    }

    const handleSelect = (value: string): void => {
      emit('select', value)
    }

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
        if (!isOpen.value || !menuRef.value || activeIndex.value < 0) return
        itemRefs[activeIndex.value]?.focus()
      },
      { flush: 'post' },
    )

    watchPostEffect(() => {
      const trigger = triggerRef.value
      const menu = menuRef.value
      layer.sync({
        open: isOpen.value,
        kind: 'popover',
        surface: { current: menu },
        anchor: { current: trigger },
        dismissKey: true,
        outside: { inside: [{ current: trigger }, { current: menu }], phase: 'start' },
        onDismiss: (reason) => (reason === 'outside' ? handleClose() : closeAndRefocusTrigger()),
      })
    })
    watchPostEffect((onCleanup) => {
      if (!isOpen.value) {
        position.value = { top: 0, left: 0 }
        return
      }
      const view = triggerRef.value?.ownerDocument.defaultView
      if (!menuRef.value || !view) return
      // Reposition when an open menu's placement or alignment changes.
      void props.placement
      void props.align
      const frame = view.requestAnimationFrame(updatePosition)
      onCleanup(() => view.cancelAnimationFrame(frame))
    })
    onBeforeUnmount(() => layer.release())

    // Closing on route change — a dropdown left open over the next page blocks
    // clicks underneath — covers both in-app navigation and back/forward
    // through the router's reactive location. Mounting is not a route change,
    // so nothing is reported then.
    const location = useLocation()
    watch(
      () => [location.value.pathname, location.value.search],
      () => setOpen(false),
    )

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

    /**
     * Writes `node` into a caller's ref the way Vue's own ref handling does: a
     * function ref is called, a ref object's `.value` is set. A trigger that
     * carried its own ref keeps receiving the node (React's `mergeRefs`).
     */
    const applyRef = (target: unknown, node: RefNode): void => {
      if (!target) return
      if (typeof target === 'function') {
        target(node)
        return
      }
      if (typeof target !== 'object') return
      // A vnode whose ref Vue normalized for several owners holds a list of them.
      if (Array.isArray(target)) {
        for (const entry of target) applyRef(entry, node)
        return
      }
      if ('value' in target) {
        target.value = node
        return
      }
      // Vue wraps a vnode's ref in a normalized `{ r, … }` record; the caller's
      // own ref is inside it (a `ref` object or a function).
      if ('r' in target) applyRef(target.r, node)
    }

    const setTriggerRef = (node: RefNode): void => {
      triggerRef.value = refElement(node)
    }

    const setMenuRef = (node: RefNode): void => {
      const element = refElement(node)
      menuRef.value = isDiv(element) ? element : null
    }

    return () => {
      // Calculate menu width. Not measurable until the trigger ref exists
      // (the first open frame, before layout); `undefined` then lets the menu
      // size itself until the position update re-renders with a real width.
      const trigger = triggerRef.value
      const menuWidth =
        props.width === 'trigger' ? trigger && readOverlayAnchorWidth(trigger) : props.width

      const menuStyle = reactStyleProps([
        props.style,
        {
          position: 'absolute',
          top: position.value.top,
          left: position.value.left,
          zIndex: 50,
          ...(menuWidth !== undefined ? { width: menuWidth } : {}),
        },
      ])

      const target = trigger?.ownerDocument.body
      const menu =
        isOpen.value && target
          ? h(Teleport, { to: target }, [
              h(
                'div',
                {
                  ref: setMenuRef,
                  id: menuId,
                  role: 'menu',
                  // Focusable but never a Tab stop (the items carry the roving tab stop):
                  // a click on a separator or the menu's padding keeps focus in the menu,
                  // so the arrow keys still move between its items.
                  tabindex: -1,
                  'data-state': 'open',
                  class: cm.cn(cm.dropdownContent, ...classOf(props.className, attrs)),
                  style: menuStyle,
                  'data-testid': props.testId ? `${props.testId}-menu` : undefined,
                  'data-mol-id': props.automationId ? `${props.automationId}-menu` : undefined,
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
                      itemRefs[index] = refElement(node)
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
        // React merges the trigger's own ref with its internal one.
        const sourceRef = source.ref
        renderedTrigger = cloneVNode(source, {
          ref: (node: RefNode): void => {
            setTriggerRef(node)
            applyRef(sourceRef, node)
          },
          tabindex: (source.props?.tabIndex as number | undefined) ?? 0,
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen.value,
          'aria-controls': isOpen.value ? menuId : undefined,
          // Only a given id replaces the trigger's own; an absent one leaves it in place.
          ...(props.testId === undefined ? {} : { 'data-testid': props.testId }),
          ...(props.automationId === undefined ? {} : { 'data-mol-id': props.automationId }),
          // A disabled dropdown disables its trigger (a Button or a native button
          // then ignores clicks).
          ...(props.disabled ? { disabled: true } : {}),
          onClick: handleTriggerClick,
          onKeydown: handleTriggerKeyDown,
        })
      } else {
        renderedTrigger = h(
          'div',
          {
            ref: setTriggerRef,
            role: 'button',
            tabindex: props.disabled ? -1 : 0,
            'aria-disabled': props.disabled || undefined,
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen.value,
            'aria-controls': isOpen.value ? menuId : undefined,
            onClick: handleTriggerClick,
            onKeydown: handleTriggerKeyDown,
            class: cm.dropdownTrigger,
            'data-testid': props.testId,
            'data-mol-id': props.automationId,
          },
          triggerContent,
        )
      }

      return [renderedTrigger, menu]
    }
  },
})

setDisplayName(Dropdown, 'Dropdown')

/**
 * Dropdown label for grouping items.
 *
 * Faithful port of `@molecule/app-ui-react`'s DropdownLabel.
 */
export const DropdownLabel = defineComponent({
  name: 'MDropdownLabel',
  props: {
    className: String,
    lang: String,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () =>
      h(
        'div',
        {
          ref: element,
          class: cm.cn(cm.dropdownLabel, ...classOf(props.className, attrs)),
          lang: props.lang,
        },
        slots.default?.(),
      )
  },
})

setDisplayName(DropdownLabel, 'DropdownLabel')

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
  setup(props, { attrs, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () =>
      h('div', {
        ref: element,
        class: cm.cn(cm.dropdownSeparator, ...classOf(props.className, attrs)),
        role: 'separator',
      })
  },
})

setDisplayName(DropdownSeparator, 'DropdownSeparator')

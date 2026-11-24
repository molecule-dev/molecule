/**
 * Dropdown component.
 *
 * @module
 */

import {
  type Component,
  createComputed,
  createEffect,
  createRenderEffect,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  on,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'

import { BodyPortal, resolveNode, useLocation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { DropdownItem, DropdownProps } from '../types.js'
import { toStyleProps, type WithRef } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'
import { withDisplayName } from './displayName.js'

interface Position {
  top: number
  left: number
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
  placement: NonNullable<DropdownProps['placement']>,
  align: NonNullable<DropdownProps['align']>,
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

/** Props for {@link DropdownMenuItem}. */
interface DropdownMenuItemProps {
  item: DropdownItem<string>
  /** Whether this item is the roving-tabindex active item (receives DOM focus while open). */
  isActive: boolean
  onSelect: (value: string) => void
  onClose: () => void
  /** Registers this item's DOM node so the parent can move focus onto it. */
  registerRef: (node: HTMLDivElement | null) => void
}

/**
 * Single dropdown menu item component.
 * @param props - The component props.
 * @returns The rendered item element.
 */
const DropdownMenuItem: Component<DropdownMenuItemProps> = (props) => {
  const cm = getClassMap()
  // The parent registers items by POSITION (`itemRefs[index()] = node`). React
  // re-runs ref callbacks on every re-render, so a keyed reorder re-registers
  // the (unchanged) node at its new position; Solid's ref callback runs once.
  // Register synchronously in the ref (the open-focus flow reads the refs
  // before any effect runs) and re-register through an effect tracking the
  // reactive position for later moves.
  const [node, setNode] = createSignal<HTMLDivElement | null>(null)
  createEffect(() => {
    const el = node()
    if (el) props.registerRef(el)
  })

  const handleClick = (): void => {
    if (!props.item.disabled) {
      props.onSelect(props.item.value)
      props.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <Show
      when={!props.item.separator}
      fallback={<div class={cm.dropdownSeparator} role="separator" />}
    >
      <div
        ref={(el) => {
          setNode(el)
          props.registerRef(el)
        }}
        role="menuitem"
        // Roving tabindex (WAI-ARIA APG menu pattern): only the active item is
        // a Tab stop. Previously EVERY enabled item had tabIndex 0, so Tab
        // walked through the whole menu one item at a time instead of exiting
        // it — this makes Tab behave like real native menus (it leaves the
        // menu), while ArrowUp/Down/Home/End move within it.
        tabIndex={props.item.disabled ? -1 : props.isActive ? 0 : -1}
        class={cm.cn(cm.dropdownItem, props.item.disabled && cm.dropdownItemDisabled)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        // data-disabled only styles; aria-disabled is what assistive tech
        // reads — without it a disabled item announces as actionable.
        aria-disabled={props.item.disabled || undefined}
        data-disabled={props.item.disabled || undefined}
      >
        <Show when={props.item.icon}>
          <span class={cm.dropdownItemIcon}>{props.item.icon}</span>
        </Show>
        <span class={cm.dropdownItemLabel}>{props.item.label}</span>
        <Show when={props.item.shortcut}>
          <span class={cm.dropdownItemShortcut}>{props.item.shortcut}</span>
        </Show>
      </div>
    </Show>
  )
}

/** Indices of the non-separator, non-disabled items — the set Arrow/Home/End navigate. */
function focusableItemIndexes(items: DropdownItem<string>[]): number[] {
  return items.reduce<number[]>((acc, item, i) => {
    if (!item.separator && !item.disabled) acc.push(i)
    return acc
  }, [])
}

/** Renders a caller-supplied trigger element with the dropdown's wiring merged onto it. */
const ClonedTrigger: Component<{
  node: HTMLElement | SVGElement
  wire: (el: HTMLElement | SVGElement) => void
}> = (p) => {
  p.wire(p.node)
  return p.node
}

/**
 * Dropdown component.
 *
 * Implements the WAI-ARIA APG menu-button pattern. The trigger is made a
 * real, keyboard-operable control: if `trigger` is a single element (a
 * `<button>`, an icon `<Button>`, …) the menu-button attributes
 * (`aria-haspopup`, `aria-expanded`, `aria-controls`) and the open/keyboard
 * handlers are merged onto it directly — no extra wrapper, no double focus
 * stop. If `trigger` is not a single element (text, an array, multiple
 * nodes), it is wrapped in a `role="button" tabIndex={0}` container instead
 * so keyboard/AT users can still reach it. Enter/Space/ArrowDown open the
 * menu and move focus to the first item (ArrowUp opens to the last item);
 * once open, ArrowUp/Down/Home/End roving-navigate the `role="menuitem"`
 * items, Escape closes and returns focus to the trigger, and Tab closes the
 * menu in sync with focus leaving it (matching native menus, which do not
 * trap Tab).
 *
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Dropdown = withDisplayName<WithRef<DropdownProps<string>, HTMLDivElement>>((props) => {
  const cm = getClassMap()
  const [internalOpen, setInternalOpen] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  const [activeIndex, setActiveIndex] = createSignal(-1)
  // The actual interactive trigger node — either the merged single-element
  // trigger, or the fallback `role="button"` wrapper. Used for position
  // measurement, outside-click detection, AND focus restoration.
  let triggerRef: HTMLElement | SVGElement | undefined
  let menuRef: HTMLDivElement | undefined
  const itemRefs: (HTMLDivElement | null)[] = []
  // React reconciles the menu items by
  // `key={item.separator ? `separator-${index}` : item.value}`: an item's node
  // survives an items update whose key is unchanged and moves on a reorder.
  // `<For>` keys by object identity, so the render iterates the KEYS and reads
  // each item through the lookup.
  const items = createKeyedList(
    () => props.items,
    (item, index) => (item.separator ? `separator-${index}` : item.value),
  )
  // Which end of the menu keyboard-driven opens should focus: ArrowDown
  // (and Enter/Space/click) want the first item, ArrowUp wants the last.
  let pendingOpenFocus: 'first' | 'last' = 'first'
  const menuId = createUniqueId()
  const location = useLocation()

  // The trigger as it renders now. `resolveNode` resolves it once per change, so
  // the nodes it holds are kept between reads, and it follows a trigger that
  // changes (a `<Show>` or `<For>` trigger, a list that empties).
  const resolvedTrigger = resolveNode(() => props.trigger)
  // The single element React's `isValidElement(trigger)` clones, else null: any element, an SVG
  // icon included.
  const triggerElement = (): HTMLElement | SVGElement | null => {
    const nodes = resolvedTrigger.toArray()
    const only = nodes.length === 1 ? nodes[0] : undefined
    return only instanceof HTMLElement || only instanceof SVGElement ? only : null
  }

  // A disabled dropdown never opens, whatever `open` says.
  const isOpen = (): boolean => !props.disabled && (props.open ?? internalOpen())

  const setOpen = (open: boolean): void => {
    if (props.open === undefined) {
      setInternalOpen(open)
    }
    props.onOpenChange?.(open)
  }

  const updatePosition = (): void => {
    if (triggerRef && menuRef) {
      const triggerRect = triggerRef.getBoundingClientRect()
      const menuRect = menuRef.getBoundingClientRect()
      setPosition(
        calculatePosition(
          triggerRect,
          menuRect,
          props.placement ?? 'bottom-start',
          props.align ?? 'start',
        ),
      )
    }
  }

  const handleTriggerClick = (): void => {
    if (props.disabled) return
    if (!isOpen()) pendingOpenFocus = 'first'
    setOpen(!isOpen())
  }

  const handleTriggerKeyDown = (e: KeyboardEvent): void => {
    if (props.disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        pendingOpenFocus = 'first'
        setOpen(true)
        break
      case 'ArrowDown':
        e.preventDefault()
        pendingOpenFocus = 'first'
        setOpen(true)
        break
      case 'ArrowUp':
        e.preventDefault()
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
    props.onSelect?.(value)
  }

  // Update position when menu opens
  createEffect(() => {
    if (isOpen()) {
      // Use requestAnimationFrame to ensure menu is rendered before calculating position
      requestAnimationFrame(updatePosition)
    }
  })

  // Moves focus to the first (or last, for an ArrowUp-driven open) item
  // whenever the menu transitions closed → open. `items` is read through
  // untrack — a parent re-render that recreates the `items` array must not
  // re-run this and yank focus back to the first item out from under a user
  // who already arrow-keyed further into the menu.
  createEffect(
    on(
      isOpen,
      (open) => {
        if (!open) {
          setActiveIndex(-1)
          return
        }
        const focusable = focusableItemIndexes(untrack(() => props.items))
        const wantLast = pendingOpenFocus === 'last'
        pendingOpenFocus = 'first'
        if (focusable.length === 0) return
        setActiveIndex(wantLast ? focusable[focusable.length - 1] : focusable[0])
      },
      { defer: false },
    ),
  )

  // Syncs real DOM focus to the roving-tabindex active item (React's effect on
  // `[isOpen, activeIndex]`).
  let focusedItemRef: HTMLDivElement | null = null
  createEffect(() => {
    if (!isOpen() || activeIndex() < 0) return
    const el = itemRefs[activeIndex()] ?? null
    el?.focus()
    focusedItemRef = el
  })

  // React's keyed reconciliation moves a focused item's node without detaching
  // it, so the item keeps DOM focus across an items update; `<For>` detaches the
  // node it moves, which drops focus to the body. A computation runs before the
  // DOM moves: it notes whether the item held focus, and the effect after the
  // update puts focus back only then. Focus the user moved elsewhere stays there.
  let itemHadFocus = false
  createComputed(() => {
    void props.items
    itemHadFocus = focusedItemRef !== null && document.activeElement === focusedItemRef
  })
  createEffect(() => {
    void props.items
    const el = focusedItemRef
    if (!itemHadFocus || !el || !untrack(isOpen)) return
    if (el.isConnected && document.activeElement !== el) el.focus()
  })

  // Close on outside click and Escape (with focus restoration).
  createEffect(() => {
    if (!isOpen()) return

    const handleClickOutside = (e: MouseEvent): void => {
      if (
        triggerRef &&
        !triggerRef.contains(e.target as Node) &&
        menuRef &&
        !menuRef.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        closeAndRefocusTrigger()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    })
  })

  // Close on route change — a dropdown left open over the next page blocks
  // clicks underneath. Mounting is not a route change (`defer` skips it).
  createEffect(
    on(
      () => [location().pathname, location().search],
      () => {
        setOpen(false)
      },
      { defer: true },
    ),
  )

  const handleMenuKeyDown = (e: KeyboardEvent): void => {
    const focusable = focusableItemIndexes(props.items)
    if (focusable.length === 0) return
    const currentPos = focusable.indexOf(activeIndex())

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        setActiveIndex(focusable[(currentPos + 1 + focusable.length) % focusable.length])
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        setActiveIndex(focusable[(currentPos - 1 + focusable.length) % focusable.length])
        break
      }
      case 'Home':
        e.preventDefault()
        setActiveIndex(focusable[0])
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(focusable[focusable.length - 1])
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

  // Calculate menu width
  const menuWidth = (): number | string | undefined => {
    if (props.width === 'trigger') {
      // Not measurable until the trigger node exists (the first open
      // frame, before layout); undefined lets the menu size itself, and a
      // later re-render (position update) recomputes the real pixel width.
      // An SVG trigger has no offsetWidth: React's `triggerRef.current?.offsetWidth` is undefined.
      return triggerRef instanceof HTMLElement ? triggerRef.offsetWidth : undefined
    }
    return props.width
  }

  // React merges the menu-button attributes onto a single-element trigger
  // via cloneElement; the DOM equivalent here is setting them on the node
  // (its own handlers run first, then the dropdown's, in listener order).
  const wireClonedTrigger = (el: HTMLElement | SVGElement): void => {
    triggerRef = el
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
    el.setAttribute('aria-haspopup', 'menu')
    // Both element kinds share these events' types (a union of their overloads has none).
    const events: GlobalEventHandlers = el
    events.addEventListener('click', handleTriggerClick)
    events.addEventListener('keydown', handleTriggerKeyDown)
    createRenderEffect(() => {
      el.setAttribute('aria-expanded', String(isOpen()))
      if (isOpen()) el.setAttribute('aria-controls', menuId)
      else el.removeAttribute('aria-controls')
    })
    // React's cloneElement only overrides an attribute the dropdown itself sets; a
    // trigger that arrived with its own `data-testid`/`data-mol-id` keeps it.
    const ownTestId = el.getAttribute('data-testid')
    const ownAutomationId = el.getAttribute('data-mol-id')
    // A disabled dropdown disables its trigger (a Button or a native button then ignores clicks).
    const ownDisabled = el.hasAttribute('disabled')
    createRenderEffect(() => {
      if (props.disabled) el.setAttribute('disabled', '')
      else if (!ownDisabled) el.removeAttribute('disabled')
    })
    createRenderEffect(() => {
      const testId = props.testId
      if (testId !== undefined) el.setAttribute('data-testid', testId)
      else if (ownTestId === null) el.removeAttribute('data-testid')
      else el.setAttribute('data-testid', ownTestId)
    })
    createRenderEffect(() => {
      const automationId = props.automationId
      if (automationId !== undefined) el.setAttribute('data-mol-id', automationId)
      else if (ownAutomationId === null) el.removeAttribute('data-mol-id')
      else el.setAttribute('data-mol-id', ownAutomationId)
    })
  }

  return (
    <>
      <Show
        when={triggerElement()}
        keyed
        fallback={
          <div
            ref={(el) => {
              triggerRef = el
            }}
            role="button"
            tabIndex={props.disabled ? -1 : 0}
            aria-disabled={props.disabled || undefined}
            aria-haspopup="menu"
            aria-expanded={isOpen()}
            aria-controls={isOpen() ? menuId : undefined}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            class={cm.dropdownTrigger}
            data-testid={props.testId}
            data-mol-id={props.automationId}
          >
            {resolvedTrigger()}
          </div>
        }
      >
        {/* The trigger is a single element the caller rendered; merge the
            menu-button attributes onto it (see wireClonedTrigger), again for
            each new element. */}
        {(el) => <ClonedTrigger node={el} wire={wireClonedTrigger} />}
      </Show>
      <Show when={isOpen()}>
        <BodyPortal>
          <div
            ref={(el) => {
              menuRef = el
              // The menu is Dropdown's ref element; it takes no rest spread, so hand it over here.
              if (typeof props.ref === 'function') props.ref(el)
            }}
            id={menuId}
            role="menu"
            // Focusable but never a Tab stop (the items carry the roving tab stop):
            // a click on a separator or the menu's padding keeps focus in the menu,
            // so the arrow keys still move between its items.
            tabindex={-1}
            data-state="open"
            class={cm.cn(cm.dropdownContent, props.className)}
            style={toStyleProps({
              ...props.style,
              position: 'absolute',
              top: position().top,
              left: position().left,
              width: menuWidth(),
              zIndex: 50,
            })}
            data-testid={props.testId ? `${props.testId}-menu` : undefined}
            data-mol-id={props.automationId ? `${props.automationId}-menu` : undefined}
            onKeyDown={handleMenuKeyDown}
          >
            <For each={items.keys()}>
              {(key, index) => (
                <DropdownMenuItem
                  item={items.get(key)!}
                  isActive={index() === activeIndex()}
                  onSelect={handleSelect}
                  onClose={closeAndRefocusTrigger}
                  registerRef={(node) => {
                    itemRefs[index()] = node
                  }}
                />
              )}
            </For>
          </div>
        </BodyPortal>
      </Show>
    </>
  )
}, 'Dropdown')

/**
 * Dropdown label for grouping items.
 * @param props - The component props.
 * @returns The rendered label element.
 */
export const DropdownLabel = withDisplayName<
  WithRef<{ children?: JSX.Element; className?: string }, HTMLDivElement>
>((props) => {
  const cm = getClassMap()
  return (
    <div
      ref={(el) => {
        if (typeof props.ref === 'function') props.ref(el)
      }}
      class={cm.cn(cm.dropdownLabel, props.className)}
    >
      {props.children}
    </div>
  )
}, 'DropdownLabel')

/**
 * Dropdown separator for dividing groups.
 * @param props - The component props.
 * @returns The rendered separator element.
 */
export const DropdownSeparator = withDisplayName<WithRef<{ className?: string }, HTMLDivElement>>(
  (props) => {
    const cm = getClassMap()
    return (
      <div
        ref={(el) => {
          if (typeof props.ref === 'function') props.ref(el)
        }}
        class={cm.cn(cm.dropdownSeparator, props.className)}
        role="separator"
      />
    )
  },
  'DropdownSeparator',
)

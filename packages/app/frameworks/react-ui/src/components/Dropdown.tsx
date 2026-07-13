/**
 * Dropdown component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

import type { DropdownItem, DropdownProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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

/**
 * Single dropdown menu item component.
 */
interface DropdownMenuItemProps {
  item: DropdownItem<string>
  /** Whether this item is the roving-tabindex active item (receives DOM focus while open). */
  isActive: boolean
  onSelect: (value: string) => void
  onClose: () => void
  /** Registers this item's DOM node so the parent can move focus onto it. */
  registerRef: (node: HTMLDivElement | null) => void
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  item,
  isActive,
  onSelect,
  onClose,
  registerRef,
}) => {
  const cm = getClassMap()

  if (item.separator) {
    return <div className={cm.dropdownSeparator} role="separator" />
  }

  const handleClick = (): void => {
    if (!item.disabled) {
      onSelect(item.value)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      ref={registerRef}
      role="menuitem"
      // Roving tabindex (WAI-ARIA APG menu pattern): only the active item is
      // a Tab stop. Previously EVERY enabled item had tabIndex 0, so Tab
      // walked through the whole menu one item at a time instead of exiting
      // it — this makes Tab behave like real native menus (it leaves the
      // menu), while ArrowUp/Down/Home/End move within it.
      tabIndex={item.disabled ? -1 : isActive ? 0 : -1}
      className={cm.cn(cm.dropdownItem, item.disabled && cm.dropdownItemDisabled)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // data-disabled only styles; aria-disabled is what assistive tech
      // reads — without it a disabled item announces as actionable.
      aria-disabled={item.disabled || undefined}
      data-disabled={item.disabled || undefined}
    >
      {!!item.icon && <span className={cm.dropdownItemIcon}>{item.icon as React.ReactNode}</span>}
      <span className={cm.dropdownItemLabel}>{item.label as React.ReactNode}</span>
      {item.shortcut && <span className={cm.dropdownItemShortcut}>{item.shortcut}</span>}
    </div>
  )
}

/** Props cloneElement injects onto a single-element `trigger` to make it a real menu button. */
interface CloneableTriggerProps {
  ref?: React.Ref<HTMLElement>
  tabIndex?: number
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup']
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'data-testid'?: string
  onClick?: (e: React.MouseEvent) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

/** Indices of the non-separator, non-disabled items — the set Arrow/Home/End navigate. */
function focusableItemIndexes(items: DropdownItem<string>[]): number[] {
  return items.reduce<number[]>((acc, item, i) => {
    if (!item.separator && !item.disabled) acc.push(i)
    return acc
  }, [])
}

/**
 * Dropdown component.
 *
 * Implements the WAI-ARIA APG menu-button pattern. The trigger is made a
 * real, keyboard-operable control: if `trigger` is a single element (a
 * `<button>`, an icon `<Button>`, …) it is cloned with `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, and the open/keyboard handlers merged
 * onto it directly — no extra wrapper, no double focus stop. If `trigger`
 * is not a single element (text, a fragment, multiple nodes), it is wrapped
 * in a `role="button" tabIndex={0}` container instead so keyboard/AT users
 * can still reach it. Enter/Space/ArrowDown open the menu and move focus to
 * the first item (ArrowUp opens to the last item); once open, ArrowUp/Down/
 * Home/End roving-navigate the `role="menuitem"` items, Escape closes and
 * returns focus to the trigger, and Tab closes the menu in sync with focus
 * leaving it (matching native menus, which do not trap Tab).
 */
export const Dropdown = forwardRef<HTMLDivElement, DropdownProps<string>>(
  (
    {
      trigger,
      items,
      onSelect,
      placement = 'bottom-start',
      open: controlledOpen,
      onOpenChange,
      align = 'start',
      width,
      className,
      style,
      testId,
    },
    _ref,
  ) => {
    const [internalOpen, setInternalOpen] = useState(false)
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
    const [activeIndex, setActiveIndex] = useState(-1)
    // The actual interactive trigger node — either the cloned single-element
    // trigger, or the fallback `role="button"` wrapper. Used for position
    // measurement, outside-click detection, AND focus restoration.
    const triggerRef = useRef<HTMLElement | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])
    // Which end of the menu keyboard-driven opens should focus: ArrowDown
    // (and Enter/Space/click) want the first item, ArrowUp wants the last.
    const pendingOpenFocusRef = useRef<'first' | 'last'>('first')
    // Mirrors `items` for the open-transition effect below WITHOUT adding
    // `items` to its dependency array — see that effect for why.
    const itemsRef = useRef(items)
    useEffect(() => {
      itemsRef.current = items
    })
    const location = useLocation()
    const menuId = useId()

    const cm = getClassMap()
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

    const setOpen = useCallback(
      (open: boolean) => {
        if (controlledOpen === undefined) {
          setInternalOpen(open)
        }
        onOpenChange?.(open)
      },
      [controlledOpen, onOpenChange],
    )

    const updatePosition = useCallback(() => {
      if (triggerRef.current && menuRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const menuRect = menuRef.current.getBoundingClientRect()
        setPosition(calculatePosition(triggerRect, menuRect, placement, align))
      }
    }, [placement, align])

    const handleTriggerClick = useCallback(() => {
      if (!isOpen) pendingOpenFocusRef.current = 'first'
      setOpen(!isOpen)
    }, [isOpen, setOpen])

    const handleTriggerKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault()
            pendingOpenFocusRef.current = 'first'
            setOpen(true)
            break
          case 'ArrowDown':
            e.preventDefault()
            pendingOpenFocusRef.current = 'first'
            setOpen(true)
            break
          case 'ArrowUp':
            e.preventDefault()
            pendingOpenFocusRef.current = 'last'
            setOpen(true)
            break
          default:
            break
        }
      },
      [setOpen],
    )

    const handleClose = useCallback(() => {
      setOpen(false)
    }, [setOpen])

    // Closes AND returns focus to the trigger — used for every USER-DRIVEN
    // close (Escape, item selection) so keyboard focus never gets dropped
    // onto the (now-removed) menu. Outside-click and route-change closes
    // deliberately do NOT refocus (the user's attention is already elsewhere).
    const closeAndRefocusTrigger = useCallback(() => {
      handleClose()
      triggerRef.current?.focus()
    }, [handleClose])

    const handleSelect = useCallback(
      (value: string) => {
        onSelect?.(value)
      },
      [onSelect],
    )

    // Update position when menu opens
    useEffect(() => {
      if (isOpen) {
        // Use requestAnimationFrame to ensure menu is rendered before calculating position
        requestAnimationFrame(updatePosition)
      }
    }, [isOpen, updatePosition])

    // Moves focus to the first (or last, for an ArrowUp-driven open) item
    // whenever the menu transitions closed → open. Deps are `[isOpen]`
    // ONLY — reading `items` through a ref instead of the dependency array
    // means a parent re-render that recreates the `items` array (extremely
    // common: `items={[...]}` inline) does NOT re-run this and yank focus
    // back to the first item out from under a user who already arrow-keyed
    // further into the menu.
    useEffect(() => {
      if (!isOpen) {
        setActiveIndex(-1)
        return
      }
      const focusable = focusableItemIndexes(itemsRef.current)
      const wantLast = pendingOpenFocusRef.current === 'last'
      pendingOpenFocusRef.current = 'first'
      if (focusable.length === 0) return
      setActiveIndex(wantLast ? focusable[focusable.length - 1] : focusable[0])
    }, [isOpen])

    // Syncs real DOM focus to the roving-tabindex active item.
    useEffect(() => {
      if (!isOpen || activeIndex < 0) return
      itemRefs.current[activeIndex]?.focus()
    }, [isOpen, activeIndex])

    // Close on outside click and Escape (with focus restoration).
    useEffect(() => {
      if (!isOpen) return

      const handleClickOutside = (e: MouseEvent): void => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          menuRef.current &&
          !menuRef.current.contains(e.target as Node)
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

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [isOpen, handleClose, closeAndRefocusTrigger])

    // Close on route change — a dropdown left open over the next page
    // blocks clicks underneath. React Router's `location` updates on
    // both in-app navigation and browser back/forward (popstate).
    useEffect(() => {
      setOpen(false)
    }, [location.pathname, location.search, setOpen])

    const handleMenuKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const focusable = focusableItemIndexes(items)
        if (focusable.length === 0) return
        const currentPos = focusable.indexOf(activeIndex)

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
            // preventDefault (the browser still moves focus natively);
            // just close our state in sync with focus leaving.
            handleClose()
            break
          default:
            break
        }
      },
      [items, activeIndex, handleClose],
    )

    // Calculate menu width
    const menuWidth =
      width === 'trigger'
        ? // Not measurable until the trigger ref exists (the first open
          // frame, before layout). Falling through to the raw 'trigger'
          // string here previously set an invalid `width: 'trigger'` inline
          // style (silently ignored) for that frame — `undefined` instead
          // lets the menu size itself; a later re-render (position update)
          // recomputes with the real pixel width once the ref is populated.
          triggerRef.current?.offsetWidth
        : typeof width === 'number'
          ? width
          : width

    const menu = isOpen && (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        data-state="open"
        className={cm.cn(cm.dropdownContent, className)}
        style={{
          ...style,
          position: 'absolute',
          top: position.top,
          left: position.left,
          width: menuWidth,
          zIndex: 50,
        }}
        data-testid={testId ? `${testId}-menu` : undefined}
        onKeyDown={handleMenuKeyDown}
      >
        {items.map((item, index) => (
          <DropdownMenuItem
            key={item.separator ? `separator-${index}` : item.value}
            item={item}
            isActive={index === activeIndex}
            onSelect={handleSelect}
            onClose={closeAndRefocusTrigger}
            registerRef={(node) => {
              itemRefs.current[index] = node
            }}
          />
        ))}
      </div>
    )

    const triggerElement = trigger as React.ReactNode
    const isCloneableTrigger =
      React.isValidElement(triggerElement) &&
      (triggerElement as React.ReactElement).type !== React.Fragment

    const renderedTrigger: React.ReactNode = isCloneableTrigger ? (
      React.cloneElement(triggerElement as React.ReactElement<CloneableTriggerProps>, {
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node
        },
        tabIndex: (triggerElement as React.ReactElement<CloneableTriggerProps>).props.tabIndex ?? 0,
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? menuId : undefined,
        'data-testid': testId,
        onClick: (e: React.MouseEvent) => {
          ;(triggerElement as React.ReactElement<CloneableTriggerProps>).props.onClick?.(e)
          handleTriggerClick()
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          ;(triggerElement as React.ReactElement<CloneableTriggerProps>).props.onKeyDown?.(e)
          handleTriggerKeyDown(e)
        },
      })
    ) : (
      <div
        ref={(node: HTMLDivElement | null) => {
          triggerRef.current = node
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cm.dropdownTrigger}
        data-testid={testId}
      >
        {trigger as React.ReactNode}
      </div>
    )

    return (
      <>
        {renderedTrigger}
        {typeof document !== 'undefined' && menu && createPortal(menu, document.body)}
      </>
    )
  },
)

Dropdown.displayName = 'Dropdown'

/**
 * Dropdown label for grouping items.
 */
export const DropdownLabel = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string }
>(({ children, className }, ref) => {
  const cm = getClassMap()

  return (
    <div ref={ref} className={cm.cn(cm.dropdownLabel, className)}>
      {children}
    </div>
  )
})

DropdownLabel.displayName = 'DropdownLabel'

/**
 * Dropdown separator for dividing groups.
 */
export const DropdownSeparator = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => {
    const cm = getClassMap()

    return <div ref={ref} className={cm.cn(cm.dropdownSeparator, className)} role="separator" />
  },
)

DropdownSeparator.displayName = 'DropdownSeparator'

/**
 * Dropdown component.
 *
 * @module
 */

import React, {
  forwardRef,
  type NamedExoticComponent,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useLocation } from '@molecule/app-react'
import type {
  DropdownItem,
  DropdownProps,
  ElementHandle,
  KitKeyboardEvent,
  KitMouseEvent,
} from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'
import {
  OverlayPortal,
  useAnchoredPosition,
  useOverlayLayer,
} from '@molecule/app-ui-react/platform'

import { isReactNode } from '../utilities/isReactNode.js'
import { mergeRefs } from '../utilities/mergeRefs.js'

/**
 * Single dropdown menu item component.
 */
interface DropdownMenuItemProps {
  item: DropdownItem<string>
  /** Whether this item is the roving-tabindex active item (receives DOM focus while open). */
  isActive: boolean
  onSelect: (value: string) => void
  onClose: () => void
  /** Registers the item so the parent can move focus onto it. */
  registerRef: (node: ElementHandle | null) => void
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
    return <Box as="div" className={cm.dropdownSeparator} role="separator" />
  }

  const handleClick = (): void => {
    if (!item.disabled) {
      onSelect(item.value)
      onClose()
    }
  }

  const handleKeyDown = (e: KitKeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <Pressable
      as="div"
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
      {!!item.icon && isReactNode(item.icon) && (
        <Box as="span" className={cm.dropdownItemIcon}>
          {item.icon}
        </Box>
      )}
      <Box as="span" className={cm.dropdownItemLabel}>
        {isReactNode(item.label) ? item.label : null}
      </Box>
      {item.shortcut && (
        <Text as="span" className={cm.dropdownItemShortcut}>
          {item.shortcut}
        </Text>
      )}
    </Pressable>
  )
}

/** Props cloneElement injects onto a single-element `trigger` to make it a real menu button. */
interface CloneableTriggerProps {
  ref?: React.Ref<ElementHandle>
  tabIndex?: number
  'aria-haspopup'?: 'menu'
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'data-testid'?: string
  'data-mol-id'?: string
  disabled?: boolean
  onClick?: (e: KitMouseEvent) => void
  onKeyDown?: (e: KitKeyboardEvent) => void
}

/** Reads the element ref from the storage React 18 or React 19 uses. */
function childRef(
  element: React.ReactElement<CloneableTriggerProps> | null,
): React.Ref<ElementHandle> | undefined {
  if (!element) return undefined
  const modern = Object.getOwnPropertyDescriptor(element.props, 'ref')
  if (modern && !modern.get) return element.props.ref
  const legacy = Object.getOwnPropertyDescriptor(element, 'ref')
  const ref: React.Ref<ElementHandle> | string | undefined = legacy?.get ? undefined : legacy?.value
  return typeof ref === 'string' ? undefined : ref
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
export const Dropdown: NamedExoticComponent<DropdownProps<string> & RefAttributes<ElementHandle>> =
  forwardRef<ElementHandle, DropdownProps<string>>(
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
        automationId,
        disabled,
      },
      ref,
    ) => {
      const [internalOpen, setInternalOpen] = useState(false)
      const [activeIndex, setActiveIndex] = useState(-1)
      // The actual interactive trigger node — either the cloned single-element
      // trigger, or the fallback `role="button"` wrapper. Used for position
      // measurement, outside-click detection, AND focus restoration.
      const triggerRef = useRef<ElementHandle>(null)
      const menuRef = useRef<ElementHandle>(null)
      const [menuElement, setMenuElement] = useState<ElementHandle | null>(null)
      const itemRefs = useRef<(ElementHandle | null)[]>([])
      // Which end of the menu keyboard-driven opens should focus: ArrowDown
      // (and Enter/Space/click) want the first item, ArrowUp wants the last.
      // State, because the open transition below reads it while rendering.
      const [pendingOpenFocus, setPendingOpenFocus] = useState<'first' | 'last'>('first')
      const location = useLocation()
      const menuId = useId()

      const cm = getClassMap()
      // A disabled dropdown never opens, whatever `open` says.
      const isOpen = !disabled && (controlledOpen !== undefined ? controlledOpen : internalOpen)
      // The forwarded ref names the menu, the element that carries className and style.
      const setMenuRef = useMemo(() => mergeRefs(ref, menuRef, setMenuElement), [ref])

      const setOpen = useCallback(
        (open: boolean) => {
          if (controlledOpen === undefined) {
            setInternalOpen(open)
          }
          onOpenChange?.(open)
        },
        [controlledOpen, onOpenChange],
      )

      const handleTriggerClick = useCallback(() => {
        if (disabled) return
        if (!isOpen) setPendingOpenFocus('first')
        setOpen(!isOpen)
      }, [disabled, isOpen, setOpen])

      const handleTriggerKeyDown = useCallback(
        (e: KitKeyboardEvent) => {
          if (disabled) return
          switch (e.key) {
            case 'Enter':
            case ' ':
              e.preventDefault()
              setPendingOpenFocus('first')
              setOpen(true)
              break
            case 'ArrowDown':
              e.preventDefault()
              setPendingOpenFocus('first')
              setOpen(true)
              break
            case 'ArrowUp':
              e.preventDefault()
              setPendingOpenFocus('last')
              setOpen(true)
              break
            default:
              break
          }
        },
        [disabled, setOpen],
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

      const layer = useOverlayLayer({
        open: isOpen,
        kind: 'popover',
        surface: menuRef,
        anchor: triggerRef,
        dismissKey: true,
        outside: { inside: [triggerRef, menuRef], phase: 'start' },
        onDismiss: (reason) => {
          if (reason === 'escape' || reason === 'back') closeAndRefocusTrigger()
          else handleClose()
        },
      })

      const sizeToTrigger = width === 'trigger'
      const position = useAnchoredPosition({
        layer,
        open: isOpen,
        anchor: triggerRef,
        surface: menuElement,
        placement,
        align,
        offset: 4,
        padding: 0,
        collision: 'none',
        timing: 'frame',
        matchAnchorWidth: sizeToTrigger,
        listFallback: true,
      })

      const handleSelect = useCallback(
        (value: string) => {
          onSelect?.(value)
        },
        [onSelect],
      )

      // Moves the roving tab stop to the first (or last, for an ArrowUp-driven
      // open) item whenever the menu opens, a menu mounted open included, and
      // drops it when the menu closes. It is adjusted during render, React's
      // pattern for state that follows a changed input, and only on the
      // transition: a parent re-render that recreates the `items` array
      // (extremely common: `items={[...]}` inline) does NOT move the stop back
      // to the first item under a user who already arrow-keyed further in.
      const [openSeen, setOpenSeen] = useState(false)
      if (openSeen !== isOpen) {
        setOpenSeen(isOpen)
        if (isOpen) {
          const focusable = focusableItemIndexes(items)
          setPendingOpenFocus('first')
          if (focusable.length > 0) {
            setActiveIndex(
              pendingOpenFocus === 'last' ? focusable[focusable.length - 1] : focusable[0],
            )
          }
        } else {
          setActiveIndex(-1)
        }
      }

      // Sync focus to the roving tab stop once the presentation can receive it.
      useEffect(() => {
        if (!menuElement || activeIndex < 0 || !position.ready || position.fallback) return
        itemRefs.current[activeIndex]?.focus()
      }, [menuElement, activeIndex, position.ready, position.fallback])

      // Close on route change — a dropdown left open over the next page
      // blocks clicks underneath. React Router's `location` updates on
      // both in-app navigation and browser back/forward (popstate). The
      // uncontrolled menu closes in the render that sees the new route; the
      // close is reported through `onOpenChange` after it commits, in both
      // modes, and only for a real route change, so an owner that follows
      // `onOpenChange` keeps a menu it opened (or mounted open) open.
      // (`pathname` holds no `?` and `search` starts with one, so the key
      // cannot collide.)
      const locationKey = `${location.pathname}${location.search}`
      const [closedForLocation, setClosedForLocation] = useState(locationKey)
      if (closedForLocation !== locationKey) {
        setClosedForLocation(locationKey)
        setInternalOpen(false)
      }
      const reportedLocationRef = useRef(locationKey)
      useEffect(() => {
        if (reportedLocationRef.current === locationKey) return
        reportedLocationRef.current = locationKey
        onOpenChange?.(false)
      }, [locationKey, onOpenChange])

      const handleMenuKeyDown = useCallback(
        (e: KitKeyboardEvent) => {
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

      // The menu width: the measured trigger width for 'trigger', never the raw
      // string, which would be an invalid inline width.
      const menuWidth = sizeToTrigger ? position.anchorWidth : width

      const menu = isOpen && (
        <Box
          as="div"
          ref={setMenuRef}
          id={menuId}
          role="menu"
          // Focusable but never a Tab stop (the items carry the roving tab stop):
          // a click on a separator or the menu's padding keeps focus in the menu,
          // so the arrow keys still move between its items.
          tabIndex={-1}
          data-state="open"
          className={cm.cn(cm.dropdownContent, className)}
          webStyle={{
            ...style,
            position: position.fallback ? undefined : 'absolute',
            top: position.fallback ? undefined : position.top,
            left: position.fallback ? undefined : position.left,
            width: position.fallback ? undefined : menuWidth,
            zIndex: position.fallback ? undefined : 50,
          }}
          data-testid={testId ? `${testId}-menu` : undefined}
          data-mol-id={automationId ? `${automationId}-menu` : undefined}
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
        </Box>
      )

      // A single element (not a fragment) becomes the menu button itself; anything else is wrapped.
      const cloneable =
        React.isValidElement<CloneableTriggerProps>(trigger) && trigger.type !== React.Fragment
          ? trigger
          : null
      const callerRef = childRef(cloneable)
      const setTriggerNode = useMemo(() => mergeRefs(callerRef, triggerRef), [callerRef])

      const renderedTrigger: React.ReactNode = cloneable ? (
        React.cloneElement(cloneable, {
          ref: setTriggerNode,
          tabIndex: cloneable.props.tabIndex ?? 0,
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? menuId : undefined,
          // Only a given id replaces the trigger's own; an absent one leaves it in place.
          ...(testId === undefined ? {} : { 'data-testid': testId }),
          ...(automationId === undefined ? {} : { 'data-mol-id': automationId }),
          // A disabled dropdown disables its trigger (a Button or a native button then ignores clicks).
          ...(disabled ? { disabled: true } : {}),
          onClick: (e: KitMouseEvent) => {
            cloneable.props.onClick?.(e)
            handleTriggerClick()
          },
          onKeyDown: (e: KitKeyboardEvent) => {
            cloneable.props.onKeyDown?.(e)
            handleTriggerKeyDown(e)
          },
        })
      ) : (
        <Pressable
          as="div"
          ref={setTriggerNode}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          className={cm.dropdownTrigger}
          data-testid={testId}
          data-mol-id={automationId}
        >
          {isReactNode(trigger) ? trigger : null}
        </Pressable>
      )

      return (
        <>
          {renderedTrigger}
          {menu && (
            <OverlayPortal
              layer={layer}
              presentation="host"
              server="omit"
              anchorPosition={position}
            >
              {menu}
            </OverlayPortal>
          )}
        </>
      )
    },
  )

Dropdown.displayName = 'Dropdown'

/**
 * Dropdown label for grouping items.
 */
export const DropdownLabel: NamedExoticComponent<
  { children: React.ReactNode; className?: string } & RefAttributes<ElementHandle>
> = forwardRef<ElementHandle, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => {
    const cm = getClassMap()

    return (
      <Box as="div" ref={ref} className={cm.cn(cm.dropdownLabel, className)}>
        {children}
      </Box>
    )
  },
)

DropdownLabel.displayName = 'DropdownLabel'

/**
 * Dropdown separator for dividing groups.
 */
export const DropdownSeparator: NamedExoticComponent<
  { className?: string } & RefAttributes<ElementHandle>
> = forwardRef<ElementHandle, { className?: string }>(({ className }, ref) => {
  const cm = getClassMap()

  return (
    <Box as="div" ref={ref} className={cm.cn(cm.dropdownSeparator, className)} role="separator" />
  )
})

DropdownSeparator.displayName = 'DropdownSeparator'

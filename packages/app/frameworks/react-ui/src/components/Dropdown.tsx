/**
 * Dropdown component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect,useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { DropdownItem,DropdownProps } from '@molecule/app-ui'
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
  onSelect: (value: string) => void
  onClose: () => void
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ item, onSelect, onClose }) => {
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
      role="menuitem"
      tabIndex={item.disabled ? -1 : 0}
      className={cm.cn(cm.dropdownItem, item.disabled && cm.dropdownItemDisabled)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-disabled={item.disabled || undefined}
    >
      {!!item.icon && <span className={cm.dropdownItemIcon}>{item.icon as React.ReactNode}</span>}
      <span className={cm.dropdownItemLabel}>{item.label as React.ReactNode}</span>
      {item.shortcut && (
        <span className={cm.dropdownItemShortcut}>{item.shortcut}</span>
      )}
    </div>
  )
}

/**
 * Dropdown component.
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
    const triggerRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

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
      setOpen(!isOpen)
    }, [isOpen, setOpen])

    const handleClose = useCallback(() => {
      setOpen(false)
    }, [setOpen])

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

    // Close on outside click
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
          handleClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [isOpen, handleClose])

    // Calculate menu width
    const menuWidth =
      width === 'trigger' && triggerRef.current
        ? triggerRef.current.offsetWidth
        : typeof width === 'number'
          ? width
          : width

    const menu = isOpen && (
      <div
        ref={menuRef}
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
      >
        {items.map((item, index) => (
          <DropdownMenuItem
            key={item.separator ? `separator-${index}` : item.value}
            item={item}
            onSelect={handleSelect}
            onClose={handleClose}
          />
        ))}
      </div>
    )

    return (
      <>
        <div
          ref={triggerRef}
          onClick={handleTriggerClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleTriggerClick()
            }
          }}
          className={cm.dropdownTrigger}
          data-testid={testId}
        >
          {trigger as React.ReactNode}
        </div>
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

    return (
      <div ref={ref} className={cm.cn(cm.dropdownSeparator, className)} role="separator" />
    )
  },
)

DropdownSeparator.displayName = 'DropdownSeparator'

/**
 * Dropdown component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'
import { Portal } from 'solid-js/web'

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
 * @param props - The component props.
 * @returns The rendered component element.
 */
const DropdownMenuItem: Component<{
  item: DropdownItem<string>
  onSelect: (value: string) => void
  onClose: () => void
}> = (props) => {
  const cm = getClassMap()

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
        role="menuitem"
        tabIndex={props.item.disabled ? -1 : 0}
        class={cm.cn(cm.dropdownItem, props.item.disabled && cm.dropdownItemDisabled)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-disabled={props.item.disabled || undefined}
      >
        <Show when={!!props.item.icon}>
          <span class={cm.dropdownItemIcon}>{props.item.icon as JSX.Element}</span>
        </Show>
        <span class={cm.dropdownItemLabel}>{props.item.label as JSX.Element}</span>
        <Show when={props.item.shortcut}>
          <span class={cm.dropdownItemShortcut}>{props.item.shortcut}</span>
        </Show>
      </div>
    </Show>
  )
}

/**
 * Dropdown component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Dropdown: Component<DropdownProps<string>> = (props) => {
  const [local] = splitProps(props, [
    'trigger',
    'items',
    'onSelect',
    'placement',
    'open',
    'onOpenChange',
    'align',
    'width',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const [internalOpen, setInternalOpen] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let triggerRef: HTMLDivElement | undefined
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let menuRef: HTMLDivElement | undefined

  const placement = (): NonNullable<DropdownProps['placement']> => local.placement || 'bottom-start'
  const align = (): NonNullable<DropdownProps['align']> => local.align || 'start'

  const isOpen = (): boolean => (local.open !== undefined ? local.open : internalOpen())

  const setOpen = (open: boolean): void => {
    if (local.open === undefined) {
      setInternalOpen(open)
    }
    local.onOpenChange?.(open)
  }

  const updatePosition = (): void => {
    if (triggerRef && menuRef) {
      const triggerRect = triggerRef.getBoundingClientRect()
      const menuRect = menuRef.getBoundingClientRect()
      setPosition(calculatePosition(triggerRect, menuRect, placement(), align()))
    }
  }

  const handleTriggerClick = (): void => {
    setOpen(!isOpen())
  }

  const handleClose = (): void => {
    setOpen(false)
  }

  const handleSelect = (value: string): void => {
    local.onSelect?.(value)
  }

  // Update position when menu opens
  createEffect(() => {
    if (isOpen()) {
      requestAnimationFrame(updatePosition)
    }
  })

  // Close on outside click
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
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    })
  })

  // Calculate menu width
  const menuWidth = (): string | undefined => {
    if (local.width === 'trigger' && triggerRef) {
      return `${triggerRef.offsetWidth}px`
    }
    if (typeof local.width === 'number') {
      return `${local.width}px`
    }
    return local.width
  }

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
        class={cm.dropdownTrigger}
        data-testid={local.testId}
      >
        {local.trigger as JSX.Element}
      </div>
      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            data-state="open"
            class={cm.cn(cm.dropdownContent, local.className)}
            style={{
              ...local.style,
              position: 'absolute',
              top: `${position().top}px`,
              left: `${position().left}px`,
              width: menuWidth(),
              'z-index': 50,
            }}
            data-testid={local.testId ? `${local.testId}-menu` : undefined}
          >
            <For each={local.items}>
              {(item, _index) => (
                <DropdownMenuItem item={item} onSelect={handleSelect} onClose={handleClose} />
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  )
}

/**
 * Dropdown label for grouping items.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const DropdownLabel: Component<{ children: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.dropdownLabel, props.class)}>{props.children}</div>
}

/**
 * Dropdown separator for dividing groups.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const DropdownSeparator: Component<{ class?: string }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.dropdownSeparator, props.class)} role="separator" />
}

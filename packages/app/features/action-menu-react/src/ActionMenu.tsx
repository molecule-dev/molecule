import type { ReactElement, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 * A single item in the ActionMenu list.
 */
export interface ActionMenuItem {
  /** Unique id. */
  id: string
  /** Label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Href — when present, item renders as an anchor instead of a button. */
  href?: string
  /** When true, rendered in a disabled state. */
  disabled?: boolean
  /**
   * Marks the item as destructive. Rendered in the theme's error color
   * (`cm.textError`) with semibold weight, so it reads as red in both light
   * and dark themes.
   */
  destructive?: boolean
  /** Insert a divider below this item. */
  divider?: boolean
}

/**
 * Props for the {@link ActionMenu} component.
 */
export interface ActionMenuProps {
  /** Items to render. */
  items: ActionMenuItem[]
  /** Trigger content — usually a kebab icon. Defaults to "⋮". */
  trigger?: ReactNode
  /** Menu alignment relative to the trigger. Defaults to `'right'`. */
  align?: 'left' | 'right'
  /** Accessible label for the trigger button. */
  triggerAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Compact overflow / kebab menu button that opens a popover list of
 * actions on click. Closes on outside-click and Escape.
 *
 * Pure uncontrolled — the component manages its own open state. For
 * external control, use `<Dropdown>` from `@molecule/app-ui-react`.
 * @param props - Component props (see {@link ActionMenuProps}).
 */
export function ActionMenu({
  items,
  trigger,
  align = 'right',
  triggerAriaLabel = 'Actions',
  className,
}: ActionMenuProps): ReactElement {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    /**
     * Close the menu when a mousedown occurs outside the wrapper element.
     * @param e
     */
    function onDoc(e: MouseEvent): void {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    /**
     * Close the menu when the Escape key is pressed.
     * @param e
     */
    function onEsc(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <span
      ref={wrapRef}
      className={cm.cn(cm.position('relative'), className)}
      style={{ display: 'inline-block' }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((x) => !x)}
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-mol-id="action-menu-trigger"
      >
        {trigger ?? '⋮'}
      </Button>
      {open && (
        <ul
          role="menu"
          data-mol-id="action-menu-list"
          className={cm.cn(cm.stack(0 as const), cm.sp('p', 1), cm.surface, cm.borderAll)}
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: 160,
            zIndex: 50,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {items.map((it) => (
            <li key={it.id} role="none">
              {it.href ? (
                <a
                  href={it.href}
                  role="menuitem"
                  data-mol-id={`action-menu-item-${it.id}`}
                  onClick={() => setOpen(false)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 2),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    it.destructive && cm.textError,
                    it.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  )}
                  style={{ opacity: it.disabled ? 0.5 : 1 }}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  data-mol-id={`action-menu-item-${it.id}`}
                  onClick={() => {
                    if (!it.disabled) {
                      it.onClick?.()
                      setOpen(false)
                    }
                  }}
                  disabled={it.disabled}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.w('full'),
                    cm.sp('px', 2),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    it.destructive && cm.textError,
                    it.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  )}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </button>
              )}
              {it.divider && (
                <span
                  aria-hidden
                  className={cm.cn(cm.displayBlock, cm.bgBorder)}
                  style={{ height: 1, margin: '4px 0' }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

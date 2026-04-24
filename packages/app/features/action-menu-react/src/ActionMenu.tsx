import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
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
  /** Mark the item as destructive (uses error color accent). */
  destructive?: boolean
  /** Insert a divider below this item. */
  divider?: boolean
}

interface ActionMenuProps {
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
 * @param root0
 * @param root0.items
 * @param root0.trigger
 * @param root0.align
 * @param root0.triggerAriaLabel
 * @param root0.className
 */
export function ActionMenu({
  items,
  trigger,
  align = 'right',
  triggerAriaLabel = 'Actions',
  className,
}: ActionMenuProps) {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    /**
     *
     * @param e
     */
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    /**
     *
     * @param e
     */
    function onEsc(e: KeyboardEvent) {
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
      >
        {trigger ?? '⋮'}
      </Button>
      {open && (
        <ul
          role="menu"
          className={cm.cn(cm.stack(0 as const), cm.sp('p', 1))}
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: 160,
            zIndex: 50,
            background: 'var(--color-surface, #fff)',
            border: '1px solid rgba(0,0,0,0.1)',
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
                  onClick={() => setOpen(false)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 2),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
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
                  style={{
                    display: 'block',
                    height: 1,
                    margin: '4px 0',
                    background: 'rgba(0,0,0,0.08)',
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

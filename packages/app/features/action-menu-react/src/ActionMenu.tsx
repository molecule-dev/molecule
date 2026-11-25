import type { ReactElement, ReactNode } from 'react'
import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { type ElementHandle, getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Anchor, Box, Pressable } from '@molecule/app-ui-react/elements'
import { OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

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
  /**
   * Accessible label for the trigger button. Overrides the translated /
   * `defaultValue` `'Actions'` (prop > `t()` > default).
   */
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
  trigger: triggerProp,
  align = 'right',
  triggerAriaLabel,
  className,
}: ActionMenuProps): ReactElement {
  const trigger = slot(triggerProp)
  const { t } = useTranslation()
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const surface = useRef<ElementHandle>(null)
  const layer = useOverlayLayer({
    open,
    kind: 'popover',
    surface,
    anchor: surface,
    dismissKey: true,
    outside: { inside: [surface], phase: 'start' },
    onDismiss: () => setOpen(false),
  })

  return (
    <Box
      as="span"
      ref={surface}
      className={cm.cn(cm.position('relative'), className)}
      webStyle={{ display: 'inline-block' }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((x) => !x)}
        aria-label={
          triggerAriaLabel ?? t('actionMenu.aria.trigger', undefined, { defaultValue: 'Actions' })
        }
        aria-haspopup="menu"
        aria-expanded={open}
        data-mol-id="action-menu-trigger"
      >
        {trigger ?? '⋮'}
      </Button>
      {open && (
        <OverlayPortal layer={layer} presentation="inline" server="inline">
          <Box
            as="ul"
            role="menu"
            data-mol-id="action-menu-list"
            className={cm.cn(cm.stack(0), cm.sp('p', 1), cm.surface, cm.borderAll)}
            style={{
              position: 'absolute',
              top: '100%',
              [align === 'right' ? 'right' : 'left']: 0,
              minWidth: 160,
              zIndex: 50,
              borderRadius: 8,
            }}
            webStyle={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            {items.map((it) => (
              <Box as="li" key={it.id} role="none">
                {it.href ? (
                  <Anchor
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
                    <Box as="span">{it.label}</Box>
                  </Anchor>
                ) : (
                  <Pressable
                    as="button"
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
                    <Box as="span">{it.label}</Box>
                  </Pressable>
                )}
                {it.divider && (
                  <Box
                    as="span"
                    aria-hidden
                    className={cm.cn(cm.displayBlock, cm.bgBorder)}
                    webStyle={{ height: 1, margin: '4px 0' }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </OverlayPortal>
      )}
    </Box>
  )
}

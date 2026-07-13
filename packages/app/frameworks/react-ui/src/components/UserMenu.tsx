import type { JSX, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'
import { PanelCloseProvider } from './PanelClose.js'

/**
 * Props for {@link UserMenu}.
 *
 * The inner trigger is a Molecule `<Button>` whose own prop set
 * conflicts with raw `ButtonHTMLAttributes` (color, value, size enums),
 * so this component exposes a curated set of customization points
 * instead of extending HTML attributes. For one-off extra attributes,
 * pass them via `dataMolId` / `className` / `style` props.
 */
export interface UserMenuProps {
  /**
   * Panel content shown inside the drawer/modal (typically the app's
   * `SettingsPanel`). It can dismiss the drawer by calling
   * `usePanelClose()` — no `onClose` prop-threading required.
   */
  children: ReactNode
  /**
   * i18n key for the trigger button's aria-label. Defaults to
   * `'userMenu.open'`. Apps whose existing locales use a different key
   * (e.g. `'userMenu.openButton'`) can override.
   */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Defaults to `"Open user menu"`. */
  ariaLabelDefault?: string
  /** Icon name for the trigger button. Defaults to `'user'`. */
  triggerIcon?: IconName
  /** Pixel size for the trigger icon. Defaults to 20. */
  triggerIconSize?: number
  /**
   * `data-mol-id` for the trigger button. Defaults to `'user-menu'`.
   * Pass an explicit value to disambiguate when the same page mounts
   * more than one UserMenu.
   */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Whether the trigger button is disabled. */
  disabled?: boolean
}

/**
 * Avatar-style trigger that opens the app's settings panel in a drawer.
 *
 * The panel content is passed as `children` so apps can mount their own
 * `SettingsPanel` (which diverges per app) inside the shared drawer
 * chrome. Panel content dismisses the drawer via `usePanelClose()`.
 *
 * Ships with `data-mol-id="user-menu"` on the trigger button by
 * default for AI-agent / e2e selection.
 */
export function UserMenu({
  children,
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  triggerIcon = 'user',
  triggerIconSize = 20,
  dataMolId = 'user-menu',
  className,
  disabled,
}: UserMenuProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close the drawer whenever the route changes. React Router updates
  // `location` on both in-app navigation and browser back/forward
  // (popstate), so a single effect covers both — without it the drawer
  // stays mounted over the next page and blocks clicks underneath.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
        data-mol-id={dataMolId}
        className={className}
        disabled={disabled}
      >
        <Icon name={triggerIcon} size={triggerIconSize} />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        className={cm.drawer}
        // The drawer has no `title`, so without an explicit label the
        // dialog is announced as an unnamed "dialog" — give it a name.
        aria-label={t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })}
      >
        <PanelCloseProvider close={() => setOpen(false)}>{children}</PanelCloseProvider>
      </Modal>
    </>
  )
}

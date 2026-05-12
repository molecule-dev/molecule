import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'

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
   * Render function for the panel shown inside the drawer/modal.
   * Receives an `onClose` callback so the panel's own close-button
   * can dismiss the drawer.
   */
  renderPanel: (args: { onClose: () => void }) => ReactNode
  /**
   * i18n key for the trigger button's aria-label. Defaults to
   * `'userMenu.open'`. Apps whose existing locales use a different key
   * (e.g. `'userMenu.openButton'`) can override.
   */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Defaults to `"Open user menu"`. */
  ariaLabelDefault?: string
  /** Icon name for the trigger button. Defaults to `'user'`. */
  triggerIcon?: string
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
 * The panel content is injected via `renderPanel` so apps can mount
 * their own `SettingsPanel` (which diverges per app) inside the shared
 * drawer chrome.
 *
 * Ships with `data-mol-id="user-menu"` on the trigger button by
 * default for AI-agent / e2e selection.
 */
export function UserMenu({
  renderPanel,
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  triggerIcon = 'user',
  triggerIconSize = 20,
  dataMolId = 'user-menu',
  className,
  disabled,
}: UserMenuProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

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
      <Modal open={open} onClose={() => setOpen(false)} className={cm.drawer}>
        {renderPanel({ onClose: () => setOpen(false) })}
      </Modal>
    </>
  )
}

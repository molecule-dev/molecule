import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'

interface UserMenuProps {
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
}

/**
 * Avatar-style trigger that opens the app's settings panel in a drawer.
 *
 * The panel content is injected via `renderPanel` so apps can mount
 * their own `SettingsPanel` (which diverges per app) inside the shared
 * drawer chrome.
 */
export function UserMenu({
  renderPanel,
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
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
      >
        <Icon name="user" size={20} />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} className={cm.drawer}>
        {renderPanel({ onClose: () => setOpen(false) })}
      </Modal>
    </>
  )
}

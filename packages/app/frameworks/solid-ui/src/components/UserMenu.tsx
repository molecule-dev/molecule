/**
 * UserMenu component — an icon trigger that opens the app settings panel in a
 * drawer.
 *
 * @module
 */

import { type Component, createEffect, createSignal, type JSX, on, splitProps } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { useLocation, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Modal } from './Modal.jsx'
import { PanelCloseProvider } from './PanelClose.jsx'

/**
 * Props for {@link UserMenu}.
 *
 * The inner trigger is a Molecule `<Button>` whose own prop set conflicts
 * with raw button attributes (color, value, size enums), so this component
 * exposes a curated set of customization points instead of extending HTML
 * attributes.
 */
export interface UserMenuProps {
  /**
   * Panel content shown inside the drawer/modal (typically the app's
   * `SettingsPanel`). It can dismiss the drawer by calling
   * `usePanelClose()` — no `onClose` prop-threading required.
   */
  children: JSX.Element
  /** i18n key for the trigger button's aria-label. Defaults to `'userMenu.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Defaults to `"Open user menu"`. */
  ariaLabelDefault?: string
  /** Icon name for the trigger button. Defaults to `'user'`. */
  triggerIcon?: IconName
  /** Pixel size for the trigger icon. Defaults to 20. */
  triggerIconSize?: number
  /** `data-mol-id` for the trigger button. Defaults to `'user-menu'`. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Whether the trigger button is disabled. */
  disabled?: boolean
  /**
   * Override the trigger button's click handler. When provided, called
   * instead of opening the panel — hosts use this to intercept the click
   * (e.g. to open an auth modal for guest users).
   */
  onClick?: () => void
  /**
   * Which side of the viewport the panel opens from. Defaults to `'right'`.
   */
  side?: 'left' | 'right'
}

/**
 * Avatar-style trigger that opens the app's settings panel in a drawer.
 *
 * The panel content is passed as `children` so apps can mount their own
 * `SettingsPanel` inside the shared drawer chrome. Panel content dismisses
 * the drawer via `usePanelClose()`.
 *
 * @param props - Component props (see {@link UserMenuProps}).
 * @returns The trigger button and its settings drawer.
 */
export const UserMenu: Component<UserMenuProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'ariaLabelKey',
    'ariaLabelDefault',
    'triggerIcon',
    'triggerIconSize',
    'dataMolId',
    'className',
    'disabled',
    'onClick',
    'side',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = createSignal(false)

  // Close the drawer whenever the route changes (in-app navigation and
  // browser back/forward both update the location).
  createEffect(
    on(
      () => [location().pathname, location().search] as const,
      () => setOpen(false),
    ),
  )

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={local.onClick ?? (() => setOpen(true))}
        aria-label={t(
          local.ariaLabelKey ?? 'userMenu.open',
          {},
          {
            defaultValue: local.ariaLabelDefault ?? 'Open user menu',
          },
        )}
        data-mol-id={local.dataMolId ?? 'user-menu'}
        // 40x40 trigger floor: an icon-only `size="sm"` button measured 42x26px
        // fleet-wide. Apps can still widen via `className`; the floor is the
        // default.
        className={cm.cn(cm.minH(10), cm.minW(10), local.className)}
        disabled={local.disabled}
      >
        <Icon name={local.triggerIcon ?? 'user'} size={local.triggerIconSize ?? 20} />
      </Button>
      <Modal
        open={open()}
        onClose={() => setOpen(false)}
        className={local.side === 'left' ? cm.cn(cm.drawer, cm.drawerLeft) : cm.drawer}
        // The drawer has no `title`, so without an explicit label the dialog is
        // announced as an unnamed "dialog" — give it a name.
        aria-label={t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })}
      >
        <PanelCloseProvider close={() => setOpen(false)}>{local.children}</PanelCloseProvider>
      </Modal>
    </>
  )
}

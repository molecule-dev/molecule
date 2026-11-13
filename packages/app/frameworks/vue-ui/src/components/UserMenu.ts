/**
 * Vue UserMenu UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, watch } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'
import { useLocation, useTranslation } from '@molecule/app-vue'

import { Button } from './Button.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'
import { PanelCloseProvider } from './PanelClose.js'

/**
 * Props for {@link UserMenu}.
 *
 * The inner trigger is a Molecule Button whose own prop set conflicts with
 * raw button HTML attributes (color, value, size enums), so this component
 * exposes a curated set of customization points instead of extending HTML
 * attributes — exactly like the React source.
 */
export interface UserMenuProps {
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
  /**
   * Override the trigger button's click handler. When provided, called
   * instead of opening the panel — hosts use this to intercept the click
   * (e.g. to open an auth modal for guest users).
   */
  onClick?: () => void
  /**
   * Which side of the viewport the panel opens from. Defaults to
   * `'right'`. Apps whose sidebar trigger sits on the left should pass
   * `'left'` so the panel opens adjacent to the trigger.
   */
  side?: 'left' | 'right'
}

/**
 * Vue UserMenu UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s UserMenu: an avatar-style
 * trigger that opens the app's settings panel in a drawer. The panel
 * content arrives as the default slot so apps can mount their own
 * `SettingsPanel` (which diverges per app) inside the shared drawer
 * chrome; panel content dismisses the drawer via `usePanelClose()`.
 *
 * Ships with `data-mol-id="user-menu"` on the trigger button by default
 * for AI-agent / e2e selection.
 */
export const UserMenu = defineComponent({
  name: 'MUserMenu',
  inheritAttrs: false,
  props: {
    ariaLabelKey: {
      type: String,
      default: 'userMenu.open',
    },
    ariaLabelDefault: {
      type: String,
      default: 'Open user menu',
    },
    triggerIcon: {
      type: String as PropType<IconName>,
      default: 'user',
    },
    triggerIconSize: {
      type: Number,
      default: 20,
    },
    dataMolId: {
      type: String,
      default: 'user-menu',
    },
    className: String,
    disabled: {
      type: Boolean,
      default: undefined,
    },
    onClick: {
      type: Function as PropType<UserMenuProps['onClick']>,
      default: undefined,
    },
    side: {
      type: String as PropType<'left' | 'right'>,
      default: 'right',
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const open = ref(false)
    const location = useLocation()

    // Close the drawer whenever the route changes. The router updates the
    // location on both in-app navigation and browser back/forward, so a
    // single watcher covers both — without it the drawer stays mounted
    // over the next page and blocks clicks underneath. (React: one effect
    // keyed on [location.pathname, location.search].)
    watch(
      () => location.value.pathname + location.value.search,
      () => {
        open.value = false
      },
    )

    return () => [
      h(
        Button,
        {
          variant: 'ghost',
          size: 'sm',
          onClick: props.onClick ?? (() => (open.value = true)),
          'aria-label': t(props.ariaLabelKey, {}, { defaultValue: props.ariaLabelDefault }),
          'data-mol-id': props.dataMolId,
          // 40x40 trigger floor: the icon-only `size="sm"` button measured
          // 42x26px fleet-wide (flagged as a tiny target in every app QA).
          // Apps can still widen via `className`; the floor is the default.
          className: cm.cn(cm.minH(10), cm.minW(10), props.className),
          disabled: props.disabled,
        },
        {
          default: () => [h(Icon, { name: props.triggerIcon, size: props.triggerIconSize })],
        },
      ),
      h(
        Modal,
        {
          open: open.value,
          onClose: () => (open.value = false),
          className: props.side === 'left' ? cm.cn(cm.drawer, cm.drawerLeft) : cm.drawer,
          // The drawer has no `title`, so without an explicit label the
          // dialog is announced as an unnamed "dialog" — give it a name.
          'aria-label': t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' }),
        },
        {
          default: () => [
            h(
              PanelCloseProvider,
              { close: () => (open.value = false) },
              { default: () => slots.default?.() },
            ),
          ],
        },
      ),
    ]
  },
})

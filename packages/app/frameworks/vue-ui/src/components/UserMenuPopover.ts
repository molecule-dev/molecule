/**
 * Vue UserMenuPopover UI components — an inline (non-modal) popover account
 * menu, faithful port of `@molecule/app-ui-react`'s UserMenuPopover family.
 *
 * Unlike `UserMenu` / `SidebarUserCard` (which open their panel in a `Modal`
 * drawer), this family renders the panel inline as an absolutely-positioned
 * popover. It auto-dismisses on route change, raw `popstate`, outside click,
 * and `Escape` — so an SPA navigation never leaves the menu hovering over the
 * next page.
 *
 * Compose it:
 *
 * ```vue
 * <UserMenuPopover :guest-name="t('userMenu.guest', {}, { defaultValue: 'Analyst' })">
 *   <UserMenuPopoverTrigger />
 *   <UserMenuPopoverPanel>
 *     <RouterLink to="/settings">Settings</RouterLink>
 *     <RouterLink to="/datasets">My datasets</RouterLink>
 *     <UserMenuPopoverSignOut />
 *   </UserMenuPopoverPanel>
 * </UserMenuPopover>
 * ```
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  onMounted,
  onUnmounted,
  provide,
  type Ref,
  ref,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { useAuth } from '../hooks/useAuth.js'
import { useLocation } from '../hooks/useRouter.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { classOf } from '../utilities/attrs.js'
import { getInitials } from '../utilities/initials.js'

/** The auth user fields the popover resolves its identity from. */
interface AccountUser {
  /** Display name, when the auth user has one. */
  name?: string | null
  /** Account email, when the auth user has one. */
  email?: string | null
}

/** What {@link UserMenuPopover} provides to its sub-components. */
interface UserMenuPopoverContextValue {
  /** Whether the popover panel is currently open. */
  open: Ref<boolean>
  /** Set the open state. */
  setOpen: (open: boolean) => void
  /** Resolved display name (auth user's name/email, or the guest label). */
  displayName: ComputedRef<string>
  /** Resolved account email, when the auth user has one. */
  email: ComputedRef<string | undefined>
  /**
   * Shared id linking the trigger's `aria-controls` to the panel's `id` —
   * this is a disclosure (a plain toggled region), not a `role="menu"`, so
   * the pairing is the standard `aria-expanded` + `aria-controls` contract
   * rather than `aria-haspopup="menu"`.
   */
  panelId: string
}

/**
 * Injection key carrying the popover context. Module-local, like React's
 * context object: only this package's provider and composable share it.
 */
const UserMenuPopoverKey: InjectionKey<UserMenuPopoverContextValue> = Symbol('UserMenuPopover')

/** Counter backing the panel ids that stand in for React's `useId()`. */
let nextPanelId = 0

/**
 * Returns the nearest `UserMenuPopover` context value, throwing if not
 * rendered inside one.
 *
 * @param component - The sub-component name for the error message.
 * @returns The popover context.
 * @throws {Error} When the sub-component is not inside a `UserMenuPopover`.
 */
function usePopoverContext(component: string): UserMenuPopoverContextValue {
  const ctx = inject(UserMenuPopoverKey)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <UserMenuPopover>`)
  }
  return ctx
}

/**
 * Vue UserMenuPopover UI component.
 *
 * Container for the inline popover account menu. Owns the open state and
 * the auto-dismiss behaviour (route change, `popstate`, outside click,
 * `Escape`), and provides the resolved account identity to its
 * sub-components via context. The trigger and panel arrive as the default
 * slot.
 *
 * Faithful port of `@molecule/app-ui-react`'s UserMenuPopover.
 *
 * @param props - The popover children (default slot), optional guest label, and className.
 * @returns The relative-positioned popover container.
 */
export const UserMenuPopover = defineComponent({
  name: 'MUserMenuPopover',
  inheritAttrs: false,
  props: {
    /**
     * Label shown when there is no authenticated user. Defaults to the
     * `userMenuPopover.guest` translation (English fallback `"Account"`).
     */
    guestName: String,
    /** Extra className composed onto the relative-positioned container. */
    className: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const auth = useAuth<AccountUser>()
    const location = useLocation()
    const open = ref(false)
    const containerRef = ref<HTMLDivElement | null>(null)
    // Allocated once per instance, like React's `useId()`; the conformance
    // normalizer renumbers ids by appearance.
    const panelId = `mol-user-menu-popover-${nextPanelId++}`

    // Close on route change so the panel never sticks across navigations.
    watch(
      () => [location.value.pathname, location.value.search, location.value.hash],
      () => {
        open.value = false
      },
    )

    // Also close on a raw `popstate` — the location ref only changes when a
    // URL part changes, but a same-route SPA navigation still pops.
    const onPopState = (): void => {
      open.value = false
    }
    onMounted(() => window.addEventListener('popstate', onPopState))
    onUnmounted(() => window.removeEventListener('popstate', onPopState))

    // Close on outside click and Escape while the panel is open.
    const onMouseDown = (event: MouseEvent): void => {
      if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        open.value = false
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') open.value = false
    }
    const stopDismissListeners = (): void => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
    watch(open, (value) => {
      if (value) {
        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('keydown', onKeyDown)
      } else {
        stopDismissListeners()
      }
    })
    onUnmounted(stopDismissListeners)

    const resolvedGuest = computed(
      () => props.guestName ?? t('userMenuPopover.guest', {}, { defaultValue: 'Account' }),
    )
    const displayName = computed(
      () => auth.user.value?.name ?? auth.user.value?.email ?? resolvedGuest.value,
    )
    const email = computed(() => auth.user.value?.email ?? undefined)

    const setOpen = (value: boolean): void => {
      open.value = value
    }

    provide(UserMenuPopoverKey, { open, setOpen, displayName, email, panelId })

    return () =>
      h(
        'div',
        {
          ref: containerRef,
          class: cm.cn(cm.position('relative'), ...classOf(props.className, attrs)),
        },
        slots.default?.(),
      )
  },
})

/**
 * Vue UserMenuPopoverTrigger component.
 *
 * The trigger button: an initials avatar plus the account name and email,
 * styled as a full-width sidebar card. Toggles the popover panel.
 *
 * Faithful port of `@molecule/app-ui-react`'s UserMenuPopoverTrigger.
 *
 * @param props - aria-label overrides, `data-mol-id`, and className.
 * @returns The popover trigger button.
 */
export const UserMenuPopoverTrigger = defineComponent({
  name: 'MUserMenuPopoverTrigger',
  inheritAttrs: false,
  props: {
    /** i18n key for the trigger's aria-label. Default: `'userMenu.open'`. */
    ariaLabelKey: {
      type: String,
      default: 'userMenu.open',
    },
    /** Fallback aria-label if the i18n key is missing. Default: `'Open user menu'`. */
    ariaLabelDefault: {
      type: String,
      default: 'Open user menu',
    },
    /** `data-mol-id` for the trigger button. Default: `'user-menu'`. */
    dataMolId: {
      type: String,
      default: 'user-menu',
    },
    /** Extra className composed onto the trigger button. */
    className: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { open, setOpen, displayName, email, panelId } =
      usePopoverContext('UserMenuPopoverTrigger')

    return () => {
      const nameLines = [
        h(
          'span',
          {
            class: cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.displayBlock,
              cm.textTruncate,
            ),
          },
          displayName.value,
        ),
      ]
      if (email.value) {
        nameLines.push(
          h(
            'span',
            { class: cm.cn(cm.textSize('xs'), cm.displayBlock, cm.textTruncate, cm.textMuted) },
            email.value,
          ),
        )
      }
      return h(
        'button',
        {
          type: 'button',
          onClick: () => setOpen(!open.value),
          // Disclosure pattern, not a menu: the panel renders a header + a
          // `<nav>` of arbitrary links, which is invalid content for
          // `role="menu"` (that role may contain ONLY `menuitem` descendants —
          // a screen reader announces "menu, 0 items" and menu-specific
          // navigation keys do nothing). `aria-expanded` + `aria-controls` is
          // the standard disclosure-button contract; no `aria-haspopup` needed.
          'aria-expanded': open.value,
          'aria-controls': panelId,
          'aria-label': t(props.ariaLabelKey, {}, { defaultValue: props.ariaLabelDefault }),
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 3),
            cm.userMenuPopoverTrigger,
            ...classOf(props.className, attrs),
          ),
        },
        [
          h(
            'span',
            {
              'aria-hidden': 'true',
              class: cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.shrink0,
              ),
              style: {
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary, #ffffff)',
              },
            },
            getInitials(displayName.value),
          ),
          h('span', { class: cm.cn(cm.flex1, cm.minW(0)) }, nameLines),
        ],
      )
    }
  },
})

/**
 * Vue UserMenuPopoverPanel component.
 *
 * The popover panel: an absolutely-positioned card with a built-in identity
 * header (name + email) and a `<nav>` wrapping the caller's nav items.
 * Renders nothing while the popover is closed.
 *
 * Provides only the structural concerns (absolute positioning above the
 * trigger, border frame, the header/nav layout). Cosmetic choices — width,
 * background, padding, shadow — are per-app: pass them via `className`.
 * `cn()` concatenates (it does not tailwind-merge), so the panel never bakes
 * a width/background the caller would have to fight.
 *
 * Faithful port of `@molecule/app-ui-react`'s UserMenuPopoverPanel.
 *
 * @param props - The nav children (default slot), className, and aria-label overrides.
 * @returns The popover panel, or `null` when closed.
 */
export const UserMenuPopoverPanel = defineComponent({
  name: 'MUserMenuPopoverPanel',
  inheritAttrs: false,
  props: {
    /** Extra className composed onto the absolute-positioned panel. */
    className: String,
    /** i18n key for the panel's aria-label. Default: `'userMenu.panelLabel'`. */
    ariaLabelKey: {
      type: String,
      default: 'userMenu.panelLabel',
    },
    /** Fallback aria-label if the i18n key is missing. Default: `'Account menu'`. */
    ariaLabelDefault: {
      type: String,
      default: 'Account menu',
    },
    /** `data-mol-id` for the panel. Default: `'user-menu-panel'`. */
    dataMolId: {
      type: String,
      default: 'user-menu-panel',
    },
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { open, displayName, email, panelId } = usePopoverContext('UserMenuPopoverPanel')

    return () => {
      if (!open.value) return null
      const headerLines = [
        h('p', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, displayName.value),
      ]
      if (email.value) {
        headerLines.push(h('p', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, email.value))
      }
      // A disclosure region, not role="menu": the panel renders a header PLUS
      // a `<nav>` of arbitrary caller-supplied links, which is invalid content
      // for role="menu" (that role may contain ONLY `menuitem` descendants —
      // a screen reader announced "menu, 0 items" and menu-specific navigation
      // keys did nothing). `id` pairs with the trigger's `aria-controls`; the
      // accessible name lives on the `<nav>` landmark below (a bare, roleless
      // `<div>` does not expose `aria-label` to the accessibility tree the way
      // a real landmark does).
      return h(
        'div',
        {
          id: panelId,
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.userMenuPopoverPanel, ...classOf(props.className, attrs)),
        },
        [
          h('header', { class: cm.cn(cm.sp('pb', 4), cm.userMenuPopoverHeader) }, headerLines),
          h(
            'nav',
            {
              class: cm.cn(cm.sp('mt', 4), cm.stack(1)),
              'aria-label': t(props.ariaLabelKey, {}, { defaultValue: props.ariaLabelDefault }),
            },
            slots.default?.(),
          ),
        ],
      )
    }
  },
})

/**
 * Vue UserMenuPopoverSignOut component.
 *
 * The sign-out nav item — closes the popover and calls `auth.logout()`.
 * Drop it in as the last child of `UserMenuPopoverPanel`.
 *
 * Faithful port of `@molecule/app-ui-react`'s UserMenuPopoverSignOut.
 *
 * @param props - Label overrides, `data-mol-id`, and className.
 * @returns The sign-out button.
 */
export const UserMenuPopoverSignOut = defineComponent({
  name: 'MUserMenuPopoverSignOut',
  inheritAttrs: false,
  props: {
    /** i18n key for the button label. Default: `'userMenu.signOut'`. */
    labelKey: {
      type: String,
      default: 'userMenu.signOut',
    },
    /** Fallback label if the i18n key is missing. Default: `'Sign out'`. */
    labelDefault: {
      type: String,
      default: 'Sign out',
    },
    /** `data-mol-id` for the button. Default: `'user-menu-sign-out'`. */
    dataMolId: {
      type: String,
      default: 'user-menu-sign-out',
    },
    /** Extra className composed onto the button. */
    className: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const auth = useAuth()
    const { setOpen } = usePopoverContext('UserMenuPopoverSignOut')

    return () =>
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': props.dataMolId,
          onClick: async () => {
            setOpen(false)
            try {
              await auth.logout()
            } catch (_error) {
              // A logout failure should not crash the panel — the user is
              // already treated as signed-out from the UI perspective; the
              // provider may clean up asynchronously or retry on the next
              // request.
            }
          },
          class: cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.displayBlock,
            cm.w('full'),
            cm.textError,
            cm.userMenuPopoverSignOut,
            ...classOf(props.className, attrs),
          ),
        },
        t(props.labelKey, {}, { defaultValue: props.labelDefault }),
      )
  },
})

/**
 * Returns a callback that closes the enclosing `UserMenuPopover`. Useful
 * for nav-item click handlers that should dismiss the popover even when
 * they don't change the route. Call it during `setup` of any descendant;
 * returns a no-op when called outside a `UserMenuPopover`.
 *
 * @returns A function that closes the popover.
 */
export function useUserMenuPopoverClose(): () => void {
  const ctx = inject(UserMenuPopoverKey)
  if (!ctx) return () => {}
  return () => ctx.setOpen(false)
}

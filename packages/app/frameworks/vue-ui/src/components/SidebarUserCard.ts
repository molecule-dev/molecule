/**
 * Vue SidebarUserCard UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useAuth, useLocation, useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { getInitials } from '../utilities/initials.js'
import { Modal } from './Modal.js'
import { PanelCloseProvider } from './PanelClose.js'

/** The auth-user fields this card reads. */
interface AccountUserShape {
  /** Display name shown next to the avatar. */
  name?: string | null
  /** Fallback when no `name` is supplied. */
  email?: string | null
  /** Optional image URL for the avatar. */
  avatarUrl?: string | null
}

/**
 * Props for {@link SidebarUserCard}.
 *
 * Mirrors the React source, which extends standard `<button>` attributes
 * (minus `aria-label`, `onClick` and `children`) so callers can pass extra
 * `data-*`, `aria-*`, `style` or event-handler attributes onto the trigger
 * button without forking: in Vue those travel as fallthrough attrs and are
 * spread onto the same `<button>` element.
 */
export interface SidebarUserCardProps {
  /**
   * Display name override. When omitted, falls back to the auth user's
   * `name`, then `email`, then a guest label.
   */
  name?: string
  /**
   * Secondary line under the name (role, plan, status, etc.). When
   * omitted and the auth user has an email, the email is shown instead.
   */
  secondaryLine?: string
  /** Optional avatar image URL — overrides the auth user's `avatarUrl`. */
  avatarUrl?: string
  /** i18n key for the trigger button's aria-label. Default: `'sidebarUserCard.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open account menu'`. */
  ariaLabelDefault?: string
  /**
   * `data-mol-id` for the trigger button. Defaults to
   * `'sidebar-user-card'`. Pass a different value (e.g. `'user-menu'`)
   * to disambiguate or align with an app's existing e2e selectors.
   */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Inline style for the trigger button (React's camelCase object). */
  style?: Record<string, string | number>
}

/**
 * Vue SidebarUserCard UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s SidebarUserCard: a
 * sidebar-resident user-account card (avatar + name + status line) that
 * opens the app's settings drawer on click. Drop-in replacement for
 * `UserMenu` when the trigger lives inside a vertical sidebar (e.g. as
 * the `userMenu` slot of a `SidebarLayout`). Reads name/email/avatar from
 * `useAuth()` by default; pass explicit `name` / `secondaryLine` /
 * `avatarUrl` props to override. Panel content (the default slot)
 * dismisses the drawer via `usePanelClose()`.
 *
 * Ships with `data-mol-id="sidebar-user-card"` on the trigger button by
 * default for AI-agent / e2e selection.
 */
export const SidebarUserCard = defineComponent({
  name: 'MSidebarUserCard',
  inheritAttrs: false,
  props: {
    name: String,
    secondaryLine: String,
    avatarUrl: String,
    ariaLabelKey: {
      type: String,
      default: 'sidebarUserCard.open',
    },
    ariaLabelDefault: {
      type: String,
      default: 'Open account menu',
    },
    dataMolId: {
      type: String,
      default: 'sidebar-user-card',
    },
    className: String,
    style: [String, Object] as PropType<SidebarUserCardProps['style'] | string>,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const auth = useAuth<AccountUserShape>()
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

    return () => {
      const user = auth.user.value
      const guestName = t('sidebarUserCard.guest', {}, { defaultValue: 'Guest' })
      const displayName = props.name ?? user?.name ?? user?.email ?? guestName
      const displaySecondary = props.secondaryLine ?? user?.email ?? undefined
      const displayAvatarUrl = props.avatarUrl ?? user?.avatarUrl ?? undefined

      return [
        h(
          'button',
          {
            type: 'button',
            onClick: () => (open.value = true),
            'aria-label': t(props.ariaLabelKey, {}, { defaultValue: props.ariaLabelDefault }),
            'data-mol-id': props.dataMolId,
            class: cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 3),
              cm.sidebarUserCardTrigger,
              ...classOf(props.className, attrs),
            ),
            style: styleOf(props.style, attrs),
            // React spreads the remaining button attributes last, so an
            // explicit `type` / `data-mol-id` / `title` / handler from the
            // caller overrides the defaults above.
            ...restAttrs(attrs),
          },
          [
            displayAvatarUrl
              ? h('img', {
                  src: displayAvatarUrl,
                  alt: '',
                  class: cm.cn(cm.w(10), cm.h(10), cm.roundedFull, cm.shrink0, cm.objectCover),
                })
              : h(
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
                  getInitials(displayName),
                ),
            h('span', { class: cm.cn(cm.minW(0), cm.flex1) }, [
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
                displayName,
              ),
              displaySecondary
                ? h(
                    'span',
                    {
                      class: cm.cn(
                        cm.textSize('xs'),
                        cm.displayBlock,
                        cm.textTruncate,
                        cm.textMuted,
                      ),
                    },
                    displaySecondary,
                  )
                : null,
            ]),
          ],
        ),
        h(
          Modal,
          {
            open: open.value,
            onClose: () => (open.value = false),
            className: cm.drawer,
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
    }
  },
})

/**
 * Vue storefront top nav: brand + horizontal nav links + icon-action cluster
 * (search, wishlist, cart-with-badge, profile dropdown).
 *
 * Stateless about auth and cart counts — the consumer supplies them via props
 * so this component can be reused in apps with different auth providers and
 * cart shapes. Vue counterpart of `@molecule/app-storefront-chrome-react`'s
 * `StorefrontTopNav`: the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link, toChildArray, useTranslation } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'
import type { NavActionSpec, NavLinkSpec, ProfileMenuItem } from './types.js'

/** Props for the {@link StorefrontTopNav} component. */
export interface StorefrontTopNavProps {
  /** The brand mark (a node prop or the same-named slot). */
  brand: VNodeChild
  /** Path the brand link navigates to. Defaults to `'/'`. */
  brandTo?: string
  /** Horizontal nav links. */
  links?: NavLinkSpec[]
  /** Icon-button actions (search, cart, …). */
  actions?: NavActionSpec[]
  /** Whether the visitor is signed in — picks the dropdown menu. */
  isAuthenticated: boolean
  /**
   * Avatar image URL. OPTIONAL enhancement only — the account/sign-in menu
   * always renders so it is reachable without one. When absent the trigger
   * falls back to `profileInitials`, else a default avatar icon.
   */
  profileImageUrl?: string
  /**
   * Uppercase initials shown in the avatar when no `profileImageUrl` is given
   * (e.g. "JD"). Falls back to a default avatar icon when omitted.
   */
  profileInitials?: string
  /**
   * Avatar alt text. Falls back to the translated "User profile"
   * (`storefrontChrome.nav.userProfile`) when omitted.
   */
  profileImageAlt?: string
  /**
   * Accessible name for the account-menu trigger. Falls back to the translated
   * "Account menu" (`storefrontChrome.nav.accountMenu`) when omitted.
   */
  accountMenuLabel?: string
  /** Menu items shown when signed in. */
  authedMenu?: ProfileMenuItem[]
  /** Menu items shown when signed out. */
  unauthedMenu?: ProfileMenuItem[]
  /** Called when the sign-out row is clicked. */
  onSignOut?: () => void
  /**
   * Sign-out button label. Falls back to the translated "Sign Out"
   * (`storefrontChrome.nav.signOut`) when omitted.
   */
  signOutLabel?: VNodeChild
  /** Extra classes on the header. */
  className?: string
}

/**
 * Storefront top navigation bar.
 *
 * @param props - Component props (see {@link StorefrontTopNavProps}).
 * @returns The storefront top nav component.
 */
export const StorefrontTopNav = defineComponent({
  name: 'StorefrontTopNav',
  props: {
    brand: null,
    brandTo: { type: String, default: '/' },
    links: { type: Array as PropType<NavLinkSpec[]>, default: () => [] },
    actions: { type: Array as PropType<NavActionSpec[]>, default: () => [] },
    isAuthenticated: { type: Boolean, required: true },
    profileImageUrl: String,
    profileInitials: String,
    profileImageAlt: String,
    accountMenuLabel: String,
    authedMenu: { type: Array as PropType<ProfileMenuItem[]>, default: () => [] },
    unauthedMenu: { type: Array as PropType<ProfileMenuItem[]>, default: () => [] },
    onSignOut: Function as PropType<() => void>,
    signOutLabel: null,
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const profileOpen = ref(false)
    const profileRef = ref<HTMLDivElement | null>(null)

    /**
     * Closes the menu when a mousedown occurs outside the profile wrapper
     * (React's outside-click effect, which exists only while the menu is open).
     *
     * @param event - The document mousedown.
     */
    function onDoc(event: MouseEvent): void {
      if (profileRef.value && !profileRef.value.contains(event.target as Node)) {
        profileOpen.value = false
      }
    }

    // As in React's effect: the listener exists only while the menu is open.
    watch(profileOpen, (isOpen) => {
      if (isOpen) {
        document.addEventListener('mousedown', onDoc)
        return
      }
      document.removeEventListener('mousedown', onDoc)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDoc)
    })

    /**
     * One nav link, matching React's `<li>` + router link exactly.
     *
     * @param link - The link spec.
     * @returns The rendered list item.
     */
    const renderLink = (link: NavLinkSpec): VNode =>
      h('li', { key: link.to }, [
        h(
          Link,
          {
            class: cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              link.active
                ? cm.cn(cm.textPrimary, cm.sp('pb', 1), cm.storefrontChromeTopNavLinkActive)
                : cm.storefrontChromeTopNavLink,
            ),
            'data-mol-id': link.dataMolId,
            to: link.to,
          },
          { default: () => nodeList(link.label) },
        ),
      ])

    /**
     * One icon action, matching React's router link + glyph + badge.
     *
     * @param action - The action spec.
     * @returns The rendered anchor.
     */
    const renderAction = (action: NavActionSpec): VNode =>
      h(
        Link,
        {
          key: action.to,
          class: cm.cn(cm.storefrontChromeTopNavAction),
          'data-mol-id': action.dataMolId,
          to: action.to,
          'aria-label': action.ariaLabel,
        },
        {
          default: (): VNodeChild[] => [
            h('span', { class: cm.iconGlyphFont, 'data-icon': action.icon }, [action.icon]),
            action.badgeCount && action.badgeCount > 0
              ? h(
                  'span',
                  {
                    class: cm.cn(
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.storefrontChromeTopNavBadge,
                    ),
                  },
                  [action.badgeCount],
                )
              : null,
          ],
        },
      )

    /**
     * One dropdown menu item, matching React's router link that closes the
     * menu on click.
     *
     * @param item - The menu item.
     * @returns The rendered anchor.
     */
    const renderMenuItem = (item: ProfileMenuItem): VNode =>
      h(
        Link,
        {
          key: item.to,
          class: cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.storefrontChromeTopNavMenuItem,
          ),
          'data-mol-id': item.dataMolId,
          onClick: () => {
            profileOpen.value = false
          },
          to: item.to,
        },
        { default: () => nodeList(item.label) },
      )

    /** The avatar content inside the trigger button (image, initials or glyph). */
    const avatar = (): VNodeChild => {
      if (props.profileImageUrl) {
        return h('img', {
          alt:
            props.profileImageAlt ??
            t('storefrontChrome.nav.userProfile', undefined, { defaultValue: 'User profile' }),
          class: cm.cn(cm.w('full'), cm.h('full'), cm.objectCover),
          src: props.profileImageUrl,
        })
      }
      if (props.profileInitials) {
        return h(
          'span',
          { class: cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary) },
          [props.profileInitials],
        )
      }
      // A Material Symbols ligature: the font paints the name as a glyph, so
      // the word stays out of the accessibility tree and the button's
      // aria-label names the control.
      return h(
        'span',
        {
          'aria-hidden': 'true',
          class: cm.cn(cm.iconGlyphFont, cm.textMuted),
          'data-icon': 'person',
        },
        ['person'],
      )
    }

    return (): VNode => {
      const menu = props.isAuthenticated ? props.authedMenu : props.unauthedMenu
      // An emptied label renders nothing in React, which then shows the default.
      const signOutNodes = toChildArray(slotOrProp(slots.signOutLabel, props.signOutLabel))
      const signOutLabel =
        signOutNodes.length > 0
          ? signOutNodes
          : [t('storefrontChrome.nav.signOut', undefined, { defaultValue: 'Sign Out' })]
      const dropdown: VNodeChild = profileOpen.value
        ? h(
            'div',
            {
              class: cm.cn(cm.sp('mt', 2), cm.sp('py', 1), cm.w(48), cm.storefrontChromeTopNavMenu),
              'data-mol-id': 'profile-dropdown-01',
            },
            [
              ...menu.map(renderMenuItem),
              props.isAuthenticated && props.onSignOut
                ? h('hr', {
                    class: cm.cn(cm.sp('my', 1), cm.storefrontChromeTopNavMenuDivider),
                  })
                : null,
              props.isAuthenticated && props.onSignOut
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: cm.cn(
                        cm.dropdownItem,
                        cm.w('full'),
                        cm.textSize('sm'),
                        cm.touchTargetCompact,
                      ),
                      'data-mol-id': 'profile-link-signout',
                      onClick: () => {
                        profileOpen.value = false
                        props.onSignOut?.()
                      },
                    },
                    signOutLabel,
                  )
                : null,
            ],
          )
        : null

      return h(
        'header',
        {
          class: cm.cn(cm.storefrontChromeTopNav, props.className),
          'data-mol-id': 'nav-shell-01',
        },
        [
          h(
            'nav',
            {
              class: cm.cn(
                cm.flex({ justify: 'between', align: 'center' }),
                cm.sp('px', 6),
                cm.h(16),
                cm.mxAuto,
                cm.w('full'),
                cm.storefrontChromeTopNavInner,
              ),
              'data-mol-id': 'nav-layout-01',
            },
            [
              h(
                'div',
                { class: cm.flex({ align: 'center' }), 'data-mol-id': 'brand-container-01' },
                [
                  h(
                    Link,
                    {
                      class: cm.cn(
                        cm.textSize('2xl'),
                        cm.textPrimary,
                        cm.storefrontChromeTopNavBrand,
                      ),
                      'data-mol-id': 'brand-logo-01',
                      to: props.brandTo,
                    },
                    { default: () => slotOrProp(slots.brand, props.brand) },
                  ),
                ],
              ),
              props.links.length > 0
                ? h(
                    'ul',
                    {
                      class: cm.cn(cm.flex({ align: 'center' }), cm.storefrontChromeTopNavLinks),
                      'data-mol-id': 'nav-links-list-01',
                    },
                    props.links.map(renderLink),
                  )
                : null,
              h(
                'div',
                {
                  class: cm.cn(cm.flex({ align: 'center', gap: 4 })),
                  'data-mol-id': 'nav-actions-01',
                },
                [
                  ...props.actions.map(renderAction),
                  h(
                    'div',
                    {
                      class: cm.cn(cm.position('relative')),
                      'data-mol-id': 'profile-wrapper-01',
                      ref: profileRef,
                    },
                    [
                      h(
                        'button',
                        {
                          type: 'button',
                          'aria-label':
                            props.accountMenuLabel ??
                            t('storefrontChrome.nav.accountMenu', undefined, {
                              defaultValue: 'Account menu',
                            }),
                          'aria-haspopup': 'menu',
                          'aria-expanded': profileOpen.value,
                          class: cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.cursorPointer,
                            cm.touchTarget,
                            cm.borderAll,
                            cm.flex({ align: 'center', justify: 'center' }),
                          ),
                          // `overflow: hidden` clips the avatar image to the
                          // round button; the ClassMap has no overflow token.
                          style: { overflow: 'hidden' },
                          'data-mol-id': 'profile-trigger-01',
                          onClick: () => {
                            profileOpen.value = !profileOpen.value
                          },
                        },
                        [avatar()],
                      ),
                      dropdown,
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    }
  },
})

export default StorefrontTopNav

/**
 * Solid storefront top nav: brand + horizontal nav links + icon-action cluster
 * (search, wishlist, cart-with-badge, profile dropdown).
 *
 * Stateless about auth and cart counts — the consumer supplies them via props
 * so this component can be reused in apps with different auth providers and
 * cart shapes. Solid counterpart of
 * `@molecule/app-storefront-chrome-react`'s `StorefrontTopNav`: the same props
 * (React names), the same DOM for the same input.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  For,
  type JSX,
  Match,
  onCleanup,
  Show,
  Switch,
} from 'solid-js'

import { Link, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { NavActionSpec, NavLinkSpec, ProfileMenuItem, StorefrontTopNavProps } from './types.js'

/**
 * Storefront top navigation bar.
 *
 * @param props - Component props (see {@link StorefrontTopNavProps}).
 * @returns The rendered storefront top nav.
 */
export const StorefrontTopNav: Component<StorefrontTopNavProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [profileOpen, setProfileOpen] = createSignal(false)

  /** React's default parameters, read reactively. */
  const brandTo = (): string => props.brandTo ?? '/'
  const profileImageAlt = (): string =>
    props.profileImageAlt ??
    t('storefrontChrome.nav.userProfile', undefined, { defaultValue: 'User profile' })
  const accountMenuLabel = (): string =>
    props.accountMenuLabel ??
    t('storefrontChrome.nav.accountMenu', undefined, { defaultValue: 'Account menu' })
  const signOutLabel = (): JSX.Element =>
    props.signOutLabel ?? t('storefrontChrome.nav.signOut', undefined, { defaultValue: 'Sign Out' })
  const links = (): NavLinkSpec[] => props.links ?? []
  const actions = (): NavActionSpec[] => props.actions ?? []
  const menu = (): ProfileMenuItem[] =>
    (props.isAuthenticated ? props.authedMenu : props.unauthedMenu) ?? []

  /** The profile wrapper the outside-mousedown check tests against. */
  let profileRef: HTMLDivElement | undefined

  // As in React's effect: the listener exists only while the menu is open.
  createEffect(() => {
    if (!profileOpen()) return
    /**
     * Closes the menu when a mousedown occurs outside the profile wrapper.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (profileRef && !profileRef.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    onCleanup(() => document.removeEventListener('mousedown', onDoc))
  })

  /** One nav link, matching React's `<li>` + router link exactly. */
  const renderLink = (link: NavLinkSpec): JSX.Element => (
    <li>
      <Link
        class={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          link.active
            ? cm.cn(cm.textPrimary, cm.sp('pb', 1), cm.storefrontChromeTopNavLinkActive)
            : cm.storefrontChromeTopNavLink,
        )}
        data-mol-id={link.dataMolId}
        to={link.to}
      >
        {link.label}
      </Link>
    </li>
  )

  /** One icon action, matching React's router link + glyph + badge. */
  const renderAction = (action: NavActionSpec): JSX.Element => (
    <Link
      class={cm.cn(cm.storefrontChromeTopNavAction)}
      data-mol-id={action.dataMolId}
      to={action.to}
      aria-label={action.ariaLabel}
    >
      <span class={cm.iconGlyphFont} data-icon={action.icon}>
        {action.icon}
      </span>
      {action.badgeCount && action.badgeCount > 0 ? (
        <span class={cm.cn(cm.roundedFull, cm.fontWeight('bold'), cm.storefrontChromeTopNavBadge)}>
          {action.badgeCount}
        </span>
      ) : null}
    </Link>
  )

  /** One dropdown menu item, matching React's router link that closes on click. */
  const renderMenuItem = (item: ProfileMenuItem): JSX.Element => (
    <Link
      class={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.textSize('sm'),
        cm.storefrontChromeTopNavMenuItem,
      )}
      data-mol-id={item.dataMolId}
      onClick={() => setProfileOpen(false)}
      to={item.to}
    >
      {item.label}
    </Link>
  )

  return (
    <header class={cm.cn(cm.storefrontChromeTopNav, props.className)} data-mol-id="nav-shell-01">
      <nav
        class={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.mxAuto,
          cm.w('full'),
          cm.storefrontChromeTopNavInner,
        )}
        data-mol-id="nav-layout-01"
      >
        <div class={cm.flex({ align: 'center' })} data-mol-id="brand-container-01">
          <Link
            class={cm.cn(cm.textSize('2xl'), cm.textPrimary, cm.storefrontChromeTopNavBrand)}
            data-mol-id="brand-logo-01"
            to={brandTo()}
          >
            {props.brand}
          </Link>
        </div>

        <Show when={links().length > 0}>
          <ul
            class={cm.cn(cm.flex({ align: 'center' }), cm.storefrontChromeTopNavLinks)}
            data-mol-id="nav-links-list-01"
          >
            <For each={links()}>{renderLink}</For>
          </ul>
        </Show>

        <div class={cm.cn(cm.flex({ align: 'center', gap: 4 }))} data-mol-id="nav-actions-01">
          <For each={actions()}>{renderAction}</For>

          {/* The account/sign-in menu ALWAYS renders so it is reachable for
              every user; the avatar image is an optional enhancement that
              falls back to initials, then a default avatar icon. */}
          <div
            class={cm.cn(cm.position('relative'))}
            data-mol-id="profile-wrapper-01"
            ref={(element) => {
              profileRef = element
            }}
          >
            <button
              type="button"
              aria-label={accountMenuLabel()}
              aria-haspopup="menu"
              aria-expanded={profileOpen()}
              class={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.cursorPointer,
                cm.touchTarget,
                cm.borderAll,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
              // `overflow: hidden` clips the avatar image to the round button;
              // the ClassMap has no overflow token, so it stays inline.
              style={{ overflow: 'hidden' }}
              data-mol-id="profile-trigger-01"
              onClick={() => setProfileOpen((open) => !open)}
            >
              <Switch>
                <Match when={props.profileImageUrl}>
                  <img
                    alt={profileImageAlt()}
                    class={cm.cn(cm.w('full'), cm.h('full'), cm.objectCover)}
                    src={props.profileImageUrl}
                  />
                </Match>
                <Match when={props.profileInitials}>
                  <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}>
                    {props.profileInitials}
                  </span>
                </Match>
                <Match when={!props.profileImageUrl && !props.profileInitials}>
                  {/* A Material Symbols ligature: the font paints the name as a glyph,
                      so the word stays out of the accessibility tree and the button's
                      aria-label names the control. */}
                  <span
                    aria-hidden="true"
                    class={cm.cn(cm.iconGlyphFont, cm.textMuted)}
                    data-icon="person"
                  >
                    person
                  </span>
                </Match>
              </Switch>
            </button>
            <Show when={profileOpen()}>
              <div
                class={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('py', 1),
                  cm.w(48),
                  cm.storefrontChromeTopNavMenu,
                )}
                data-mol-id="profile-dropdown-01"
              >
                <For each={menu()}>{renderMenuItem}</For>
                <Show when={props.isAuthenticated && props.onSignOut}>
                  <hr class={cm.cn(cm.sp('my', 1), cm.storefrontChromeTopNavMenuDivider)} />
                  <button
                    type="button"
                    class={cm.cn(
                      cm.dropdownItem,
                      cm.w('full'),
                      cm.textSize('sm'),
                      cm.touchTargetCompact,
                    )}
                    data-mol-id="profile-link-signout"
                    onClick={() => {
                      setProfileOpen(false)
                      props.onSignOut?.()
                    }}
                  >
                    {signOutLabel()}
                  </button>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default StorefrontTopNav

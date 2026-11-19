/**
 * Types for the Vue app-shell header.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import type { LinkProps } from '@molecule/app-vue'

/**
 * One primary-navigation destination: the {@link LinkProps} that go on
 * `Link` (everything but `to`, which is the map key) plus the link's content.
 */
type AppHeaderNavigationLink = Omit<LinkProps, 'to'> & {
  /**
   * Content of the link. Put a destination's icon and text in the same
   * children so they share one native link and one keyboard stop.
   */
  children: VNodeChild
}

/** A primary navigation landmark with one link per declared destination. */
export interface AppHeaderNavigation {
  /** Accessible name for the navigation landmark. */
  label: string
  /**
   * Router destinations mapped to link props, the destination itself being
   * the key. Any other anchor attribute (`class`, `target`, `rel`,
   * `aria-*`, `onClick`) rides along as an attribute, as `Link` passes it to
   * the anchor.
   */
  links: Readonly<Record<string, AppHeaderNavigationLink>>
  /** Additional class on the native nav element. */
  className?: string
  /** Additional class on the links' list. */
  listClassName?: string
  /** Additional class on each list item. */
  itemClassName?: string
}

/** Props for the {@link AppHeader} component. */
export interface AppHeaderProps {
  /** Brand display name shown next to the logo. */
  appName: string
  /** Logo image source. Defaults to `/logo.svg` (the convention scaffolded by mlcl). */
  logoSrc?: string
  /** Logo size in pixels (square). Defaults to 30 to match the flagship-app convention. */
  logoSize?: number
  /** Path the brand link navigates to. Defaults to `/`. */
  brandTo?: string
  /** Additional class on the brand anchor. */
  brandClassName?: string
  /**
   * Primary destinations, such as public links or links for the current
   * session. When given, the header's inner element is a named `<nav>`
   * landmark wrapping the brand and the actions, with one link per declared
   * destination.
   */
  navigation?: AppHeaderNavigation
  /**
   * Slot for the right-side user menu — typically `<UserMenu />` from
   * `@molecule/app-ui-vue`. Passed as a prop or as the same-named slot — both
   * work. `null` contributes nothing.
   */
  userMenu?: VNodeChild | null
  /**
   * Theme toggle slot. Defaults to a resilient wrapper around
   * `<ThemeToggle />` (from `@molecule/app-ui-vue`) that renders the toggle
   * ONLY when the binding's theme and i18n providers are both installed above
   * the header, and omits it (never throws) when they are not — so the header
   * renders out of the box even before theme/i18n are wired. Pass `null` to
   * force-hide it, or your own component (e.g. an icon-bonded variant) to
   * override. Passed as a prop or as the same-named slot — both work.
   */
  themeToggle?: VNodeChild | null
  /**
   * Optional extra actions rendered between the theme toggle and the user
   * menu. Passed as a prop or as the same-named slot — both work. `null`
   * contributes nothing.
   */
  extraActions?: VNodeChild | null
  /**
   * Apply `cm.headerFixed` for sticky/fixed positioning. Defaults to `true`,
   * matching the flagship-app convention. Set to `false` for a non-sticky header.
   */
  fixed?: boolean
  /** Extra className on the outer `<header>` (composed with `cm.headerBar` + optional `cm.headerFixed`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

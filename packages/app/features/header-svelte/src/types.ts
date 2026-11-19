import type { Snippet } from 'svelte'

import type { LinkProps } from '@molecule/app-svelte'

/** A primary navigation landmark with one link per declared destination. */
export interface AppHeaderNavigation {
  /** Accessible name for the navigation landmark. */
  label: string
  /**
   * Router destinations mapped to anchor props, with the link's content as
   * `children`: text, or a snippet. Put a destination's icon and text in the
   * same snippet so they share one native link and one keyboard stop. The
   * anchor's class is `className`, as in React's entries.
   */
  links: Readonly<
    Record<
      string,
      Omit<LinkProps, 'to' | 'children' | 'class'> & {
        children: Snippet | string | number
        className?: string
      }
    >
  >
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
  /** Primary destinations, such as public links or links for the current session. */
  navigation?: AppHeaderNavigation
  /** Slot for the right-side user menu — typically `<UserMenu />` from `@molecule/app-ui-svelte`. */
  userMenu?: Snippet
  /**
   * Theme toggle slot. Defaults to a resilient wrapper around
   * `<ThemeToggle />` (from `@molecule/app-ui-svelte`) that renders the toggle
   * ONLY when `@molecule/app-svelte`'s theme + i18n providers are both
   * mounted above the header, and omits it (never throws) when they are not —
   * so the header renders out of the box even before theme/i18n are wired.
   * Pass `null` to force-hide it, or your own snippet (e.g. an icon-bonded
   * variant) to override.
   */
  themeToggle?: Snippet | null
  /** Optional extra actions rendered between the theme toggle and the user menu. */
  extraActions?: Snippet
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

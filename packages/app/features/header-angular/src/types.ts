/**
 * Types of `@molecule/app-header-angular` — the Angular counterpart of
 * `@molecule/app-header-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * One destination of an {@link AppHeaderNavigation} — React's link props with
 * `to` removed (the map key is the destination) plus the link's content.
 *
 * The visible content React passes as `children` is a string, a number, or an
 * embedded template rendered with `ngTemplateOutlet`, so an icon and its text
 * share one native link and one keyboard stop.
 *
 * Not exported: React exports no such name.
 */
interface AppHeaderNavigationLink {
  /**
   * Content of the link. Put a destination's icon and text in the same
   * children so they share one native link and one keyboard stop.
   */
  children: string | number | TemplateRef<unknown>
  /** The anchor's `className` (React's link prop). */
  className?: string
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
  /** Any other anchor attribute (`target`, `rel`, `aria-*`, `data-*`, event handlers, …). */
  [attribute: string]: unknown
}

/**
 * A primary navigation landmark with one link per declared destination —
 * the Angular form of `@molecule/app-header-react`'s `navigation` prop.
 */
export interface AppHeaderNavigation {
  /** Accessible name for the navigation landmark. */
  label: string
  /** Router destinations mapped to their link props, the destination itself being the key. */
  links: Readonly<Record<string, AppHeaderNavigationLink>>
  /** Additional class on the native nav element. */
  className?: string
  /** Additional class on the links' list. */
  listClassName?: string
  /** Additional class on each list item. */
  itemClassName?: string
}

/**
 * Props for `AppHeader` — the same props `@molecule/app-header-react`
 * accepts. Node props (`userMenu`, `themeToggle`, `extraActions`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values. The one
 * value `themeToggle` still accepts is `null`, which force-hides the default
 * toggle exactly like React's `themeToggle={null}`.
 */
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
   * Primary destinations, rendered inside the navigation landmark that
   * wraps the header's brand and actions (React's `navigation`). Without it
   * the header keeps a plain brand-and-actions wrapper with no `<nav>`.
   */
  navigation?: AppHeaderNavigation
  /** Slot for the right-side user menu, projected as `[slot=userMenu]` content. */
  userMenu?: unknown
  /**
   * Theme toggle slot. The DEFAULT toggle renders only when BOTH the theme
   * provider and the i18n provider are provided above the header (probed
   * through `inject(THEME_PROVIDER/I18N_PROVIDER, { optional: true })`, the
   * non-throwing probe of React's `useContext`); otherwise it is silently
   * omitted. Pass your own component (projected as `[slot=themeToggle]`
   * content) to override it, or bind the `themeToggle` input to `null` to
   * force-hide it.
   */
  themeToggle?: unknown | null
  /** Optional extra actions rendered between the theme toggle and the user menu, projected as `[slot=extraActions]` content. */
  extraActions?: unknown
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

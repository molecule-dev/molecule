/**
 * Types of `@molecule/app-header-angular` — the Angular counterpart of
 * `@molecule/app-header-react`, same props and DOM.
 *
 * @module
 */

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

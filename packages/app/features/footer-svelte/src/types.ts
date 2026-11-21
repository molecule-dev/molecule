/**
 * The preloader `loadContent` takes: called immediately before the
 * privacy/terms modals open, so an app can lazy-load its legal HTML into the
 * i18n catalog. Only used when `legalMode === 'modal'`.
 */
export type AppFooterLoadContent = (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void

/** Props for the {@link AppFooter} component. */
export interface AppFooterProps {
  /** Display name interpolated into the "About {{appName}}" link. */
  appName: string
  /**
   * URL or path for the About link. URLs starting with `http`/`https` are
   * rendered as `<a target="_blank">`; other values are rendered as an
   * in-app link that navigates through the router.
   */
  aboutHref: string
  /**
   * How privacy/terms surfaces are presented:
   * - `'modal'` (default) — buttons that open in-place modals with HTML pulled
   *   from the bonded i18n catalog (`content.privacyPolicy` / `content.termsOfService`).
   *   Pass `loadContent` to lazy-load the catalog body before opening.
   * - `'route'` — in-app links to `/privacy` and `/terms` for apps that render
   *   the legal pages on their own routes.
   */
  legalMode?: 'modal' | 'route'
  /**
   * Optional preloader called immediately before the privacy/terms modals
   * open. Only used when `legalMode === 'modal'`. Apps that lazy-load their
   * legal HTML pass `loadContent` from their config; apps that ship the
   * content statically can omit this.
   */
  loadContent?: AppFooterLoadContent
  /** Path for the Privacy Policy route. Only used when `legalMode === 'route'`. Default: `/privacy`. */
  privacyTo?: string
  /** Path for the Terms of Service route. Only used when `legalMode === 'route'`. Default: `/terms`. */
  termsTo?: string
  /** Extra className on the outer `<footer>` (composed with `cm.footerBar`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

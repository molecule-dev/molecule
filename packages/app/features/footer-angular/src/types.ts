/**
 * Types of `@molecule/app-footer-angular` — the Angular counterpart of
 * `@molecule/app-footer-react`, same props and DOM.
 *
 * @module
 */

/**
 * The preloader React accepts as `loadContent` — called immediately before the
 * privacy/terms modals open, so an app can lazy-load its legal HTML into the
 * i18n catalog. Only used when `legalMode === 'modal'`.
 */
export type AppFooterLoadContent = (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void

/**
 * Props for `AppFooter` — the same props `@molecule/app-footer-react` accepts.
 * There are no node props: every prop is data (the component renders no slots).
 */
export interface AppFooterProps {
  /** Display name interpolated into the "About {{appName}}" link. */
  appName: string
  /**
   * URL or path for the About link. URLs starting with `http`/`https` are
   * rendered as `<a target="_blank">`; other values are rendered as an
   * internal anchor that navigates through the binding's router (React
   * renders a `react-router` `<Link>`).
   */
  aboutHref: string
  /**
   * How privacy/terms surfaces are presented:
   * - `'modal'` (default) — buttons that open in-place modals with HTML pulled
   *   from the bonded i18n catalog (`content.privacyPolicy` / `content.termsOfService`).
   *   Pass `loadContent` to lazy-load the catalog body before opening.
   * - `'route'` — internal anchors for `/privacy` and `/terms` (React renders
   *   `<Link to>` elements) for apps that render the legal pages on their own routes.
   */
  legalMode?: 'modal' | 'route'
  /**
   * Optional preloader called immediately before the privacy/terms modals
   * open. Only used when `legalMode === 'modal'`. Apps that lazy-load their
   * legal HTML pass `loadContent` from their config; apps that ship the
   * content statically can omit this. In Angular it is an input carrying the
   * function itself.
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

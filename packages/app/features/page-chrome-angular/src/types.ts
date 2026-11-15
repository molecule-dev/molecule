/**
 * Types of `@molecule/app-page-chrome-angular` — the Angular counterpart of
 * `@molecule/app-page-chrome-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link PageHeader} — the same props
 * `@molecule/app-page-chrome-react` accepts. Node props (`title`, `subtitle`,
 * `icon`, `breadcrumbs`, `actions`, `meta`) are projected content in Angular
 * (an input cannot carry a node), so they are typed `unknown`: pass them in
 * the host template with `slot="<name>"`, not as values.
 */
export interface PageHeaderProps {
  /** Primary heading, projected as `[slot=title]` content. */
  title?: unknown
  /** Optional subheading, projected as `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional leading icon, projected as `[slot=icon]` content. */
  icon?: unknown
  /** Optional breadcrumb trail, projected as `[slot=breadcrumbs]` content. */
  breadcrumbs?: unknown
  /** Right-aligned actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Optional meta row, projected as `[slot=meta]` content. */
  meta?: unknown
  /**
   * Title emphasis level. Both values resolve their weight through
   * `cm.fontWeight(...)`, so the class is a real, theme-scanned utility.
   * - `'normal'` (default) — 3xl `cm.fontWeight('bold')`, for general /
   *   reusable list-page headers.
   * - `'extrabold'` — the larger 4xl `cm.fontWeight('extrabold')` dashboard
   *   treatment (`font-extrabold` is safelisted by `@molecule/app-ui-tailwind`'s
   *   base.css, so it always generates).
   */
  emphasis?: 'normal' | 'extrabold'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Props accepted by {@link HeroSection} — the same props
 * `@molecule/app-page-chrome-react` accepts. Node props (`eyebrow`, `title`,
 * `description`, `primaryAction`, `secondaryAction`, `media`) are projected
 * content in Angular, so they are typed `unknown`: pass them in the host
 * template with `slot="<name>"`.
 */
export interface HeroSectionProps {
  /** Small eyebrow line above the headline, projected as `[slot=eyebrow]` content. */
  eyebrow?: unknown
  /** Primary headline, projected as `[slot=title]` content. */
  title?: unknown
  /** Supporting description, projected as `[slot=description]` content. */
  description?: unknown
  /** Primary call-to-action, projected as `[slot=primaryAction]` content. */
  primaryAction?: unknown
  /** Optional secondary call-to-action, projected as `[slot=secondaryAction]` content. */
  secondaryAction?: unknown
  /** Optional visual / illustration slot, projected as `[slot=media]` content. */
  media?: unknown
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

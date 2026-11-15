/**
 * Types of `@molecule/app-page-chrome-solid` — the Solid counterpart of
 * `@molecule/app-page-chrome-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link PageHeader} component. */
export interface PageHeaderProps {
  /** Primary heading (usually `t('...')`). */
  title: JSX.Element
  /** Optional subheading rendered below the title. */
  subtitle?: JSX.Element
  /** Optional leading icon next to the title. */
  icon?: JSX.Element
  /** Optional breadcrumb trail rendered above the title row. */
  breadcrumbs?: JSX.Element
  /** Right-aligned actions (buttons, menus, etc.). */
  actions?: JSX.Element
  /** Optional meta row rendered below the title/subtitle (status chips, timestamps, etc.). */
  meta?: JSX.Element
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

/** Props accepted by the {@link HeroSection} component. */
export interface HeroSectionProps {
  /** Small eyebrow line above the headline. */
  eyebrow?: JSX.Element
  /** Primary headline. */
  title: JSX.Element
  /** Supporting description. */
  description?: JSX.Element
  /** Primary call-to-action. */
  primaryAction?: JSX.Element
  /** Optional secondary call-to-action. */
  secondaryAction?: JSX.Element
  /** Optional visual / illustration slot, positioned to the right at md+. */
  media?: JSX.Element
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

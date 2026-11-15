/**
 * Types of `@molecule/app-page-chrome-svelte` — the Svelte counterpart of
 * `@molecule/app-page-chrome-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link PageHeader} component. */
export interface PageHeaderProps {
  /** Primary heading (usually `t('...')`): text, or a snippet. */
  title: string | Snippet
  /** Optional subheading rendered below the title: text, or a snippet. */
  subtitle?: string | Snippet
  /** Optional leading icon next to the title: text, or a snippet. */
  icon?: string | Snippet
  /** Optional breadcrumb trail rendered above the title row: text, or a snippet. */
  breadcrumbs?: string | Snippet
  /** Right-aligned actions (buttons, menus, etc.): text, or a snippet. */
  actions?: string | Snippet
  /** Optional meta row below the title/subtitle: text, or a snippet. */
  meta?: string | Snippet
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
  /** Small eyebrow line above the headline: text, or a snippet. */
  eyebrow?: string | Snippet
  /** Primary headline: text, or a snippet. */
  title: string | Snippet
  /** Supporting description: text, or a snippet. */
  description?: string | Snippet
  /** Primary call-to-action: text, or a snippet. */
  primaryAction?: string | Snippet
  /** Optional secondary call-to-action: text, or a snippet. */
  secondaryAction?: string | Snippet
  /** Optional visual / illustration slot, positioned to the right at md+. */
  media?: string | Snippet
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Types of `@molecule/app-page-chrome-vue` — the Vue counterpart of
 * `@molecule/app-page-chrome-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link PageHeader} component. */
export interface PageHeaderProps {
  /** Primary heading (usually `t('...')`). Passed as a prop or as the same-named slot. */
  title?: VNodeChild
  /** Optional subheading rendered below the title. Prop or same-named slot. */
  subtitle?: VNodeChild
  /** Optional leading icon next to the title. Prop or same-named slot. */
  icon?: VNodeChild
  /** Optional breadcrumb trail rendered above the title row. Prop or same-named slot. */
  breadcrumbs?: VNodeChild
  /** Right-aligned actions (buttons, menus, etc.). Prop or same-named slot. */
  actions?: VNodeChild
  /** Optional meta row rendered below the title/subtitle. Prop or same-named slot. */
  meta?: VNodeChild
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
  /** Small eyebrow line above the headline. Prop or same-named slot. */
  eyebrow?: VNodeChild
  /** Primary headline. Prop or same-named slot. */
  title?: VNodeChild
  /** Supporting description. Prop or same-named slot. */
  description?: VNodeChild
  /** Primary call-to-action. Prop or same-named slot. */
  primaryAction?: VNodeChild
  /** Optional secondary call-to-action. Prop or same-named slot. */
  secondaryAction?: VNodeChild
  /** Optional visual / illustration slot, positioned to the right at md+. Prop or same-named slot. */
  media?: VNodeChild
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

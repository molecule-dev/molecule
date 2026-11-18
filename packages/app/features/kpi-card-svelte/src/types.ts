/**
 * Types of `@molecule/app-kpi-card-svelte` — the Svelte counterpart of
 * `@molecule/app-kpi-card-react`, with the same prop names and values.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Direction of a KPI trend indicator: rising, falling, or unchanged. */
export type KpiTrendDirection = 'up' | 'down' | 'flat'

/**
 * Where (if anywhere) to draw the colored accent bar.
 *
 * The polished flagship apps use a 4px colored bar — sometimes on the
 * left edge (`'left'`), sometimes across the top (`'top'`), and sometimes
 * none at all (`'none'`). Default is `'none'` to preserve back-compat for
 * call sites that don't pass the prop.
 */
export type KpiCardAccentSide = 'left' | 'top' | 'none'

/** Props for {@link KpiCard}. */
export interface KpiCardProps {
  /** Label describing the metric (usually `t('...')`) — a snippet or plain text. */
  title?: Snippet | string
  /** Large primary value — usually a string or formatted number. */
  value?: Snippet | string
  /** Optional supporting text below the value (e.g. "vs. last week"). */
  subtitle?: Snippet | string
  /** Optional leading icon. */
  icon?: Snippet | string
  /** Optional trend indicator (use `<KpiCardTrend>` for the default shape). */
  trend?: Snippet | string
  /** Optional right-side action (menu, info tooltip). */
  action?: Snippet | string
  /**
   * Where to draw the 4px colored accent bar. Default `'none'`.
   * - `'left'` — left edge (border-l-4) — used by blog, helpdesk-ticketing.
   * - `'top'` — top edge (border-t-4) — used by crm, project-management.
   * - `'none'` — no accent — bare card.
   */
  accentSide?: KpiCardAccentSide
  /**
   * Tailwind class for the accent bar's color, e.g. `'border-primary'` or
   * `'border-success'`. Defaults to the ClassMap's accent color. Ignored when
   * `accentSide === 'none'`.
   */
  accentColor?: string
  /**
   * When `true`, renders the title in 10px-uppercase-tracking-widest style
   * matching the polished pattern. Default `false` keeps the older
   * sentence-case look. Pass `true` for new dashboard call sites.
   */
  upperLabel?: boolean
  /**
   * When `true`, uses `font-extrabold` for the value (matches the polished
   * pattern). Default `false` keeps `font-bold`.
   */
  emphasizeValue?: boolean
  /**
   * When `true`, applies a subtle hover lift. Polished dashboards use this.
   * Default `false`.
   */
  hoverLift?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link KpiCardGrid}. */
export interface KpiCardGridProps {
  /** KPI cards. */
  children?: Snippet
  /** Column count at the md+ breakpoint. 2–6. Defaults to 4. */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/** Props for {@link KpiCardTrend}. */
export interface KpiCardTrendProps {
  /** Numeric delta to display (e.g. 12.3 for +12.3%). Sign drives direction when `direction` omitted. */
  delta: number
  /**
   * Explicit direction override. When omitted, derived from the sign of `delta`
   * (0 = flat, >0 = up, <0 = down).
   */
  direction?: KpiTrendDirection
  /** Suffix appended to the delta. Defaults to `'%'`. */
  suffix?: string
  /** Extra classes. */
  className?: string
}

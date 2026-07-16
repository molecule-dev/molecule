/**
 * Bronze/Silver/Gold/Platinum loyalty tier badge with optional progress bar
 * to the next tier.
 *
 * Exports:
 * - `<LoyaltyTierBadge>` — colored tier glyph + label; when BOTH `points` and
 *   `nextTierThreshold` are set (and a next tier exists) it also renders a
 *   progress bar plus an "X to next tier" readout; platinum shows "Top tier
 *   reached" instead. Props: `tier`, `points?`, `nextTierThreshold?`,
 *   `tierLabel?` / `nextTierLabel?` (override the translated names for branded
 *   programs, e.g. "Member" / "Elite"), `size?` (`'sm' | 'md' | 'lg'`),
 *   `dataMolId?`, `className?`.
 * - `LoyaltyTier`, `LoyaltyTierBadgeProps` types; `computeProgress()` and
 *   `nextTierOf()` helpers.
 *
 * @remarks
 * - The tier glyph accent is ALWAYS a fixed metallic hex per tier (bronze /
 *   silver / gold / platinum) — it does not read theme tokens; only the border
 *   and secondary text use `--mol-color-` variables (with light-theme fallbacks).
 * - Labels route through `t()` under the `loyaltyTierBadge.` prefix. The
 *   companion `@molecule/app-locales-loyalty-tier-badge` bond currently ships
 *   only `group` and `progress` — the tier names, `remaining`, and `topTier`
 *   strings fall back to English everywhere until the bond gains those keys
 *   (or pass `tierLabel` / `nextTierLabel` yourself).
 * - `points` / `nextTierThreshold` must share a unit (points, nights, spend);
 *   progress is clamped to 0–1.
 *
 * @example
 * ```tsx
 * import { LoyaltyTierBadge } from '@molecule/app-loyalty-tier-badge-react'
 *
 * <LoyaltyTierBadge tier="gold" points={42_000} nextTierThreshold={75_000} />
 * ```
 *
 * @module
 */

export * from './LoyaltyTierBadge.js'
export * from './types.js'

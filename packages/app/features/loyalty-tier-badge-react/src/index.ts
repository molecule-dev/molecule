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
 * - It does NOT decide the tier: you pass `tier` AND the absolute `nextTierThreshold` (the
 *   total needed for the next tier, not the remaining amount) from your own program rules.
 *   Progress is `points / nextTierThreshold` (from 0, not from the current tier's floor),
 *   clamped to 0–1.
 * - `points` / `nextTierThreshold` must share a unit (points, nights, spend). The remaining
 *   amount renders as a raw number (`33000`, no thousands separator or unit).
 * - The progress bar needs BOTH `points` and `nextTierThreshold`; with either missing a
 *   non-platinum badge shows just glyph + name.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`, and `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * @example
 * ```tsx
 * import { type LoyaltyTier, LoyaltyTierBadge } from '@molecule/app-loyalty-tier-badge-react'
 *
 * // Program rules: points needed to REACH each tier.
 * const THRESHOLDS: Record<LoyaltyTier, number> = { bronze: 0, silver: 10_000, gold: 25_000, platinum: 75_000 }
 * const ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum']
 *
 * export function MemberStatus({ points }: { points: number }) {
 *   const tier = [...ORDER].reverse().find((t) => points >= THRESHOLDS[t]) ?? 'bronze'
 *   const next = ORDER[ORDER.indexOf(tier) + 1]
 *   return (
 *     <LoyaltyTierBadge
 *       tier={tier}
 *       points={points}
 *       nextTierThreshold={next ? THRESHOLDS[next] : undefined}
 *       dataMolId="member-tier"
 *     />
 *   )
 * }
 *
 * // <MemberStatus points={42_000} /> → "Gold", a 56% bar, "33000 to Platinum"
 * ```
 *
 * @module
 */

export * from './LoyaltyTierBadge.js'
export * from './types.js'

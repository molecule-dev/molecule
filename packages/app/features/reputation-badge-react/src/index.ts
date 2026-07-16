/**
 * React reputation/karma surfaces — `<ReputationBadge>` and `<BadgeShelf>` —
 * for forum, discussion-board, and social flagships.
 *
 * `<ReputationBadge score={n} />` renders a compact-formatted score ("1.5k")
 * plus a tier chip; the tier derives from `score` via `levelForScore` and
 * `DEFAULT_THRESHOLDS` (contributor 100, trusted 500, veteran 2000,
 * legend 10000) unless you pass `level` or `thresholds`. `variant` is
 * `'compact'` (default) or `'full'` (stacked with a "Reputation" caption).
 * `<BadgeShelf badges limit onClick />` renders earned-badge icons with a
 * trailing `+N` overflow chip (`onClick(null)` signals "expand all").
 *
 * @example
 * ```tsx
 * import { BadgeShelf, ReputationBadge } from '@molecule/app-reputation-badge-react'
 * import type { Badge } from '@molecule/app-reputation-badge-react'
 *
 * function ProfileHeader({ score, badges, onBadgeClick }: {
 *   score: number
 *   badges: Badge[]
 *   onBadgeClick: (badge: Badge | null) => void
 * }) {
 *   return (
 *     <div>
 *       <ReputationBadge score={score} variant="full" />
 *       <BadgeShelf badges={badges} limit={5} onClick={onBadgeClick} />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Both components throw unless rendered inside `<I18nProvider>` (from
 *   `@molecule/app-react`) with a ClassMap bonded via `setClassMap()`.
 * - This package exports a `Badge` TYPE (earned-badge data shape) — distinct
 *   from the `Badge` COMPONENT in `@molecule/app-ui-react`; alias one when
 *   importing both in a file.
 * - Server-side score/badge issuance pairs with `@molecule/api-reputation`.
 * - Translations live in the companion `@molecule/app-locales-reputation-badge`
 *   bond (registered).
 *
 * @module
 */

export * from './BadgeShelf.js'
export * from './levels.js'
export * from './ReputationBadge.js'
export * from './types.js'

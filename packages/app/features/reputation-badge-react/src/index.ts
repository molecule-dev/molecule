/**
 * React reputation/karma surfaces — `<ReputationBadge>` and
 * `<BadgeShelf>` — for forum, discussion-boards, and social-media flagships.
 *
 * Both components defer styling to the active ClassMap bond (`getClassMap()`
 * from `@molecule/app-ui`) and route every user-visible string through
 * `useTranslation()` from `@molecule/app-react`. Translations live in the
 * companion `@molecule/app-locales-reputation-badge-react` bond.
 *
 * @example
 * ```tsx
 * import { ReputationBadge, BadgeShelf } from '@molecule/app-reputation-badge-react'
 *
 * <ReputationBadge score={1250} variant="full" />
 * <BadgeShelf badges={user.badges} limit={5} onClick={(b) => openBadgeModal(b)} />
 * ```
 *
 * @remarks
 * Pairs with the (deferred) `@molecule/api-reputation` core package for
 * server-side score/badge issuance.
 *
 * @module
 */

export * from './BadgeShelf.js'
export * from './levels.js'
export * from './ReputationBadge.js'
export * from './types.js'

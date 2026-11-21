/**
 * Angular reputation/karma surfaces — `<ReputationBadge>` and `<BadgeShelf>` —
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
 * This is the Angular counterpart of `@molecule/app-reputation-badge-react`:
 * same exports, same props (React names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { BadgeShelf, ReputationBadge } from '@molecule/app-reputation-badge-angular'
 * import type { Badge } from '@molecule/app-reputation-badge-angular'
 *
 * @Component({
 *   selector: 'app-profile-header',
 *   standalone: true,
 *   imports: [ReputationBadge, BadgeShelf],
 *   template: `
 *     <div>
 *       <mol-reputation-badge [score]="score" variant="full" />
 *       <mol-badge-shelf [badges]="badges" [limit]="5" [onClick]="onBadgeClick" />
 *     </div>
 *   `,
 * })
 * export class ProfileHeader {
 *   score = 1500
 *   badges: Badge[] = []
 *   onBadgeClick = (badge: Badge | null): void => console.log(badge)
 * }
 * ```
 *
 * @remarks
 * - Both components need the binding's i18n (`provideI18n` or
 *   `provideMolecule`) for `useTranslation()`, and a ClassMap bonded via
 *   `setClassMap()`.
 * - This package exports a `Badge` TYPE (earned-badge data shape) — distinct
 *   from the `Badge` COMPONENT in `@molecule/app-ui-angular`; alias one when
 *   importing both in a file.
 * - Server-side score/badge issuance pairs with `@molecule/api-reputation`.
 * - Translations live in the companion `@molecule/app-locales-reputation-badge`
 *   bond (registered).
 *
 * @module
 */

export * from './badge-shelf.component.js'
export * from './levels.js'
export * from './reputation-badge.component.js'
export * from './types.js'

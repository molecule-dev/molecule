/**
 * Angular badge / achievement unlock card — the Angular counterpart of
 * `@molecule/app-achievement-card-react`, with the same props and the same DOM
 * for the same input.
 *
 * Exports `<AchievementCard>` — icon + name + description + earned state. The
 * host IS the Card `div` (`div[mol-achievement-card]`), so its classes and
 * inline style match React's root exactly. Locked achievements render
 * greyed-out; in-progress ones show a progress bar.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AchievementCard } from '@molecule/app-achievement-card-angular'
 *
 * @Component({
 *   selector: 'app-achievements',
 *   standalone: true,
 *   imports: [AchievementCard],
 *   template: `
 *     <div mol-achievement-card
 *          name="First Login"
 *          description="Signed in for the first time."
 *          earned="true"
 *          earnedAt="Jan 3, 2025"
 *          tier="Common">
 *       <span slot="icon">🏆</span>
 *     </div>
 *   `,
 * })
 * export class Achievements {}
 * ```
 *
 * @remarks
 * The "Earned"/"Locked" state labels flow through `t()` with English
 * `defaultValue` fallbacks under the `achievementCard.*` keys, so the
 * `@molecule/app-locales-achievement-card` companion bond (or the host app's
 * own locale) can translate them. Each is also overridable per-instance via
 * the `earnedLabel` / `lockedLabel` inputs (prop > `t()` > default). The labels
 * are read through `useTranslation()`, so they follow a locale switch.
 * Node props are projected content: `name`, `description`, `icon`, `earnedAt`
 * and `tier` are selected by `[slot=<name>]`, and plain strings may also be
 * passed as inputs.
 *
 * @module
 */

export * from './achievement-card.component.js'
export * from './types.js'

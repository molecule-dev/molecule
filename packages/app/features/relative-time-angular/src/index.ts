/**
 * Angular relative-time formatting.
 *
 * Exports:
 * - `formatRelativeTime(date, now?, locale?)` — utility using Intl.RelativeTimeFormat.
 * - `<time mol-relative-time>` — live-updating component ("5 minutes ago").
 *
 * It is the Angular counterpart of `@molecule/app-relative-time-react`: the
 * same export names, the same props (React names) and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { RelativeTime, formatRelativeTime } from '@molecule/app-relative-time-angular'
 *
 * @Component({
 *   selector: 'app-activity',
 *   standalone: true,
 *   imports: [RelativeTime],
 *   template: `<time mol-relative-time
 *       [date]="'2024-06-01T10:00:00Z'"
 *       locale="en-US"
 *       titleLocale="en-US"></time>`,
 * })
 * export class Activity {
 *   // Utility — one-shot formatting
 *   readonly label = formatRelativeTime('2024-06-01T10:00:00Z', Date.now(), 'en-US')
 *   // → "5 minutes ago"
 * }
 * ```
 *
 * @remarks
 * - Zero molecule wiring required — no ClassMap, no i18n provider, no bonds;
 *   safe in any Angular tree.
 * - Inputs: `date` (Date | ISO string | epoch ms), `locale`, `refreshMs`
 *   (default 60000 — pass `0` to disable the per-instance timer, cheaper in
 *   long lists), `titleLocale` (adds an absolute-date `title` tooltip),
 *   `className`.
 * - `locale` defaults to the runtime's locale, NOT your app's i18n locale —
 *   pass the active locale explicitly for consistent localized output.
 * - When `Intl.RelativeTimeFormat` is unavailable, fallback strings
 *   ("just now", "5m ago") are English-only.
 *
 * @module
 */

export * from './app-relative-time.component.js'
export * from './formatRelativeTime.js'
export * from './types.js'

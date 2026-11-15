/**
 * Angular announcement / promo bar.
 *
 * Exports `<AnnouncementBar>` — persistent top-of-page banner with icon,
 * message, optional action (link or button), and optional dismiss (×).
 * Long-lived and prominent, unlike a Toast; carries an action slot +
 * dismiss, unlike an Alert. It is the Angular counterpart of
 * `@molecule/app-announcement-bar-react`: same props (React names), same DOM
 * for the same input, same ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AnnouncementBar } from '@molecule/app-announcement-bar-angular'
 *
 * @Component({
 *   selector: 'app-page',
 *   standalone: true,
 *   imports: [AnnouncementBar],
 *   template: `
 *     <div
 *       mol-announcement-bar
 *       [kind]="'promo'"
 *       [icon]="'🎉'"
 *       [action]="{ label: 'Learn more', href: '/pricing' }"
 *       [onDismiss]="() => onDismissed()"
 *       [dataMolId]="'promo-bar'"
 *     >
 *       New Pro plan — 3 months free for early adopters.
 *     </div>
 *   `,
 * })
 * export class Page {
 *   onDismissed(): void {
 *     console.log('dismissed')
 *   }
 * }
 * ```
 *
 * @remarks
 * `kind` is exposed as a `data-kind` attribute on the root — it does NOT
 * change the bar's colors by itself; style per-kind via `className` or a
 * `[data-kind="…"]` selector. Dismissal is uncontrolled by default
 * (internal state; the bar stays hidden until remount) — bind `visible`
 * to control it, e.g. to persist dismissal per user. `dismissible`
 * defaults to `true`. There is no default `data-mol-id`; bind `dataMolId`
 * so agents/E2E can target the bar. The message is projected content and
 * the icon is either the `icon` input (text or an `<ng-template>` ref) or
 * `[slot=icon]` content. The dismiss label comes from the companion
 * `@molecule/app-locales-announcement-bar` locale bond.
 *
 * @module
 */

export * from './announcement-bar.component.js'
export * from './types.js'

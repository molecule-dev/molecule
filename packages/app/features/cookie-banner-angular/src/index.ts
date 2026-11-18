/**
 * Angular GDPR cookie consent banner — the counterpart of
 * `@molecule/app-cookie-banner-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<CookieBanner>` and the `CookieCategory` type. Two modes: Accept /
 * Reject only, or per-category switches behind "Customize" when `categories`
 * are supplied.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { CookieBanner } from '@molecule/app-cookie-banner-angular'
 *
 * @Component({
 *   selector: 'app-consent',
 *   standalone: true,
 *   imports: [CookieBanner],
 *   template: `
 *     <div
 *       mol-cookie-banner
 *       [visible]="!consentGiven"
 *       [policyHref]="'/privacy'"
 *       [categories]="categories"
 *       [onAcceptAll]="acceptAll"
 *       [onRejectAll]="rejectAll"
 *       [onSave]="save"
 *       [onDismiss]="dismiss"
 *     ></div>
 *   `,
 * })
 * export class Consent {
 *   consentGiven = false
 *   categories = [
 *     { id: 'essential', label: 'Essential', required: true },
 *     { id: 'analytics', label: 'Analytics', defaultEnabled: false },
 *   ]
 *   acceptAll = (): void => saveConsent('all')
 *   rejectAll = (): void => saveConsent('essential')
 *   save = (enabled: Record<string, boolean>): void => saveConsent(enabled)
 *   dismiss = (): void => {
 *     this.consentGiven = true
 *   }
 * }
 * ```
 *
 * @remarks
 * The banner is UI-only — it stores nothing. `onAcceptAll` / `onRejectAll`
 * receive NO arguments (derive "all on"/"essential only" yourself); only
 * `onSave` receives the per-category `Record<string, boolean>`, and the
 * "Save preferences" button renders only when `categories` AND `onSave` are
 * provided and the user opened "Customize". Category toggle state is
 * captured from `categories` on first render — later input changes do not
 * reset it. Visibility is controlled: keep `visible` false once consent is
 * stored (the host element leaves the DOM, as React renders null). Text uses
 * `cookieBanner.*` i18n keys (companion bond:
 * `@molecule/app-locales-cookie-banner`); `title`/`description`/category
 * labels you pass in should already be translated.
 *
 * Node props are projected content or plain text: `title` renders inside the
 * `<h3>` (as `[slot=title]` content or as a string input), `description`
 * inside the `<p>` (`[slot=description]`), and a category's `label` /
 * `description` are strings or projected templates.
 *
 * @module
 */

export * from './cookie-banner.component.js'
export * from './types.js'

/**
 * Angular pricing / subscription plan card — the counterpart of
 * `@molecule/app-subscription-plan-card-react`: the same props and the same
 * DOM for the same input.
 *
 * Exports `<SubscriptionPlanCard>` — header (badge + name + description),
 * price + interval, feature checklist, and a primary CTA (button or link).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-angular'
 *
 * @Component({
 *   selector: 'app-plans',
 *   standalone: true,
 *   imports: [SubscriptionPlanCard],
 *   template: `
 *     <div
 *       mol-subscription-plan-card
 *       name="Pro"
 *       price="$19"
 *       interval="/month"
 *       [features]="features"
 *       ctaLabel="Get started"
 *       [onCta]="checkout"
 *       [recommended]="true"
 *       badge="Most popular"
 *     ></div>
 *   `,
 * })
 * export class Plans {
 *   features = ['Unlimited projects', '10 GB storage', 'Priority support']
 *   checkout = (): void => navigate('/checkout/pro')
 * }
 * ```
 *
 * @remarks
 * - Requires the app's i18n and ClassMap providers (`useTranslation()` /
 *   `getClassMap()` fall back to the bonded providers, and throw when neither
 *   is wired).
 * - Prefer `onCta` with your router's navigate function for SPA
 *   navigation; `ctaHref` renders a plain anchor and causes a full page
 *   load.
 * - `recommended` highlights the card (outline + primary CTA color) and,
 *   when `badge` is omitted, shows a "Recommended" badge via the
 *   `plan.recommended` i18n key.
 * - `price`/`interval` are opaque display nodes — the app owns currency
 *   formatting and localization.
 * - Node props are projected content: `name`, `description`, `price`,
 *   `interval`, `ctaLabel` and `badge` are selected by `[slot=<name>]`;
 *   plain strings may also be passed as inputs.
 *
 * @module
 */

export * from './subscription-plan-card.component.js'
export * from './types.js'

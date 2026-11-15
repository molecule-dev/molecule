/**
 * Svelte pricing / subscription plan card — the Svelte counterpart of
 * `@molecule/app-subscription-plan-card-react`, with the same props and the
 * same DOM for the same input.
 *
 * Exports `SubscriptionPlanCard` — header (badge + name + description), price
 * + interval, feature checklist, and a primary CTA (button or link).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-svelte'
 *
 *   const features = ['Unlimited projects', '10 GB storage', 'Priority support']
 * </script>
 *
 * <SubscriptionPlanCard
 *   name="Pro"
 *   price="$19"
 *   interval="/month"
 *   {features}
 *   ctaLabel="Get started"
 *   onCta={() => goto('/checkout/pro')}
 *   recommended
 *   badge="Most popular"
 * />
 * ```
 *
 * @remarks
 * - Must render with the app's i18n and ClassMap providers wired
 *   (`useTranslation()` / `getClassMap()` fall back to the bonded providers,
 *   and throw when neither is wired).
 * - Prefer `onCta` with your router's navigate function for SPA
 *   navigation; `ctaHref` renders a plain anchor and causes a full page
 *   load.
 * - `recommended` highlights the card (outline + primary CTA color) and,
 *   when `badge` is omitted, shows a "Recommended" badge via the
 *   `plan.recommended` i18n key.
 * - `price`/`interval` are opaque display nodes — the app owns currency
 *   formatting and localization.
 * - Node-valued props (`name`, `description`, `price`, `interval`,
 *   `ctaLabel`, `badge`, and each `features` entry) are snippets or plain
 *   strings.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

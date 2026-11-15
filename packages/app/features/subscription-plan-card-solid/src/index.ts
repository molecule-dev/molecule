/**
 * Solid pricing / subscription plan card.
 *
 * Exports `SubscriptionPlanCard` — the Solid counterpart of
 * `@molecule/app-subscription-plan-card-react`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input. It renders
 * the header (badge + name + description), price + interval, feature checklist,
 * and a primary CTA (button or link).
 *
 * @example
 * ```tsx
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-solid'
 *
 * declare function navigate(to: string): void
 *
 * export function Plans() {
 *   return (
 *     <SubscriptionPlanCard
 *       name="Pro"
 *       price="$19"
 *       interval="/month"
 *       features={['Unlimited projects', '10 GB storage', 'Priority support']}
 *       ctaLabel="Get started"
 *       onCta={() => navigate('/checkout/pro')}
 *       recommended
 *       badge="Most popular"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n and ClassMap providers
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
 *
 * @module
 */

export * from './SubscriptionPlanCard.jsx'
export * from './types.js'

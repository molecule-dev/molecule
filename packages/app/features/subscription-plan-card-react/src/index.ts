/**
 * Pricing / subscription plan card.
 *
 * Exports `<SubscriptionPlanCard>` — header (badge + name +
 * description), price + interval, feature checklist, and a primary CTA
 * (button or link).
 *
 * @example
 * ```tsx
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-react'
 *
 * declare function navigate(to: string): void
 *
 * <SubscriptionPlanCard
 *   name="Pro"
 *   price="$19"
 *   interval="/month"
 *   features={['Unlimited projects', '10 GB storage', 'Priority support']}
 *   ctaLabel="Get started"
 *   onCta={() => navigate('/checkout/pro')}
 *   recommended
 *   badge="Most popular"
 * />
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
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

export * from './SubscriptionPlanCard.js'

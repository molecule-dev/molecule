/**
 * Pricing / subscription plan card.
 *
 * Exports `<SubscriptionPlanCard>` — header (badge + name +
 * description), price + interval, feature checklist, and a primary CTA
 * (button or link).
 *
 * @example
 * ```tsx
 * import { useNavigate } from '@molecule/app-react'
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-react'
 *
 * export function PricingPage() {
 *   const navigate = useNavigate()
 *   const plans = [
 *     { id: 'starter', name: 'Starter', price: '$0', features: ['1 project', 'Community support'] },
 *     {
 *       id: 'pro',
 *       name: 'Pro',
 *       price: '$19',
 *       features: ['Unlimited projects', '10 GB storage', 'Priority support'],
 *       recommended: true,
 *     },
 *   ]
 *   return (
 *     <section>
 *       {plans.map((plan) => (
 *         <SubscriptionPlanCard
 *           key={plan.id}
 *           name={plan.name}
 *           price={plan.price}
 *           interval="/month"
 *           features={plan.features}
 *           ctaLabel="Choose plan"
 *           onCta={() => navigate(`/checkout/${plan.id}`)}
 *           recommended={plan.recommended}
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - No `ctaLabel` → NO button at all (`onCta`/`ctaHref` are ignored).
 *   `name`, `price` and `features` are REQUIRED.
 * - It does NOT start a checkout or talk to a billing provider — `onCta`
 *   is where you navigate (e.g. `useNavigate()` from `@molecule/app-react`,
 *   which needs `<RouterProvider>` / `<MoleculeProvider>` above it) or
 *   call your API.
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise). `Button`
 *   and `Card` come from `@molecule/app-ui-react` (a peer dependency).
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

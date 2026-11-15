/**
 * Vue pricing / subscription plan card.
 *
 * Exports `SubscriptionPlanCard` — header (badge + name + description), price
 * + interval, feature checklist, and a primary CTA (button or link). It is the
 * Vue counterpart of `@molecule/app-subscription-plan-card-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-vue'
 *
 * declare function navigate(to: string): void
 *
 * const Plans = defineComponent({
 *   setup() {
 *     return () =>
 *       h(SubscriptionPlanCard, {
 *         name: 'Pro',
 *         price: '$19',
 *         interval: '/month',
 *         features: ['Unlimited projects', '10 GB storage', 'Priority support'],
 *         ctaLabel: 'Get started',
 *         onCta: () => navigate('/checkout/pro'),
 *         recommended: true,
 *         badge: 'Most popular',
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` fall back to the bonded
 *   providers, and throw when neither is wired).
 * - Prefer `onCta` with your router's navigate function for SPA
 *   navigation; `ctaHref` renders a plain anchor and causes a full page
 *   load.
 * - `recommended` highlights the card (outline + primary CTA color) and,
 *   when `badge` is omitted, shows a "Recommended" badge via the
 *   `plan.recommended` i18n key.
 * - `price`/`interval` are opaque display nodes — the app owns currency
 *   formatting and localization.
 * - Node-valued props (`name`, `description`, `price`, `interval`,
 *   `ctaLabel`, `badge`) arrive as a prop AND a same-named slot; components
 *   accept either.
 *
 * @module
 */

export * from './SubscriptionPlanCard.js'
export * from './types.js'

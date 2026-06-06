/**
 * Pricing / subscription plan card.
 *
 * Exports `<SubscriptionPlanCard>`.
 *
 * @example
 * ```tsx
 * import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-react'
 *
 * <SubscriptionPlanCard
 *   name="Pro"
 *   price="$19"
 *   interval="/month"
 *   features={['Unlimited projects', '10 GB storage', 'Priority support']}
 *   ctaLabel="Get started"
 *   onCta={() => router.push('/checkout/pro')}
 *   recommended
 *   badge="Most popular"
 * />
 * ```
 *
 * @module
 */

export * from './SubscriptionPlanCard.js'

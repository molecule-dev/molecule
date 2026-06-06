/**
 * Side-by-side pricing comparison table.
 *
 * Exports `<PricingTable>` and `PricingPlan` / `PricingFeature` types.
 *
 * @example
 * ```tsx
 * import { PricingTable } from '@molecule/app-pricing-table-react'
 *
 * <PricingTable
 *   plans={[
 *     { id: 'starter', name: 'Starter', price: '$9', interval: '/mo',
 *       cta: { label: 'Get started', onClick: () => checkout('starter') } },
 *     { id: 'pro', name: 'Pro', price: '$29', interval: '/mo', recommended: true,
 *       cta: { label: 'Get started', onClick: () => checkout('pro') } },
 *   ]}
 *   features={[
 *     { label: 'Projects', values: { starter: '3', pro: 'Unlimited' } },
 *     { label: 'Team members', values: { starter: false, pro: true } },
 *   ]}
 * />
 * ```
 *
 * @module
 */

export * from './PricingTable.js'

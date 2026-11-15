/**
 * Svelte side-by-side pricing comparison table.
 *
 * Exports `<PricingTable>` and `PricingPlan` / `PricingFeature` types — the
 * Svelte counterpart of `@molecule/app-pricing-table-react`, with the same
 * props and the same DOM for the same input. Switching an app from React to
 * Svelte is a change of the package name in its import.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PricingTable } from '@molecule/app-pricing-table-svelte'
 *
 *   const checkout = (planId: string): void => {
 *     window.location.assign(`/checkout?plan=${planId}`)
 *   }
 * </script>
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
 * @remarks
 * All text arrives via props — pass pre-translated strings; requires a wired
 * ClassMap bond.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

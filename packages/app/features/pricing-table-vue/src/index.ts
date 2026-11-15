/**
 * Vue side-by-side pricing comparison table.
 *
 * Exports `<PricingTable>` and `PricingPlan` / `PricingFeature` types — the Vue
 * counterpart of `@molecule/app-pricing-table-react`, with the same props and
 * the same DOM for the same input. Switching an app from React to Vue is a
 * change of the package name in its import.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { PricingTable } from '@molecule/app-pricing-table-vue'
 *
 * const checkout = (planId: string): void => {
 *   window.location.assign(`/checkout?plan=${planId}`)
 * }
 *
 * const Plans = defineComponent({
 *   setup() {
 *     return () =>
 *       h(PricingTable, {
 *         plans: [
 *           { id: 'starter', name: 'Starter', price: '$9', interval: '/mo',
 *             cta: { label: 'Get started', onClick: () => checkout('starter') } },
 *           { id: 'pro', name: 'Pro', price: '$29', interval: '/mo', recommended: true,
 *             cta: { label: 'Get started', onClick: () => checkout('pro') } },
 *         ],
 *         features: [
 *           { label: 'Projects', values: { starter: '3', pro: 'Unlimited' } },
 *           { label: 'Team members', values: { starter: false, pro: true } },
 *         ],
 *       })
 *   },
 * })
 *
 * createApp(Plans).mount('#app')
 * ```
 *
 * @remarks
 * All text arrives via props — pass pre-translated strings; requires a wired
 * ClassMap bond.
 *
 * @module
 */

export * from './PricingTable.js'
export * from './types.js'

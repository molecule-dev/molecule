/**
 * Angular side-by-side pricing comparison table.
 *
 * Exports `<PricingTable>` (selector `div[mol-pricing-table]`) and
 * `PricingPlan` / `PricingFeature` types — the Angular counterpart of
 * `@molecule/app-pricing-table-react`, with the same props and the same DOM
 * for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { PricingTable } from '@molecule/app-pricing-table-angular'
 *
 * @Component({
 *   selector: 'plans',
 *   standalone: true,
 *   imports: [PricingTable],
 *   template: `
 *     <div mol-pricing-table [plans]="plans" [features]="features"></div>
 *
 *     <ng-template #proName><strong>Pro</strong></ng-template>
 *   `,
 * })
 * export class Plans {
 *   plans = [
 *     { id: 'starter', name: 'Starter', price: '$9', interval: '/mo',
 *       cta: { label: 'Get started', onClick: () => this.checkout('starter') } },
 *     { id: 'pro', name: this.proName, price: '$29', interval: '/mo', recommended: true,
 *       cta: { label: 'Get started', onClick: () => this.checkout('pro') } },
 *   ]
 *   features = [
 *     { label: 'Projects', values: { starter: '3', pro: 'Unlimited' } },
 *     { label: 'Team members', values: { starter: false, pro: true } },
 *   ]
 *   checkout(planId: string): void {
 *     window.location.assign(`/checkout?plan=${planId}`)
 *   }
 * }
 * ```
 *
 * @remarks
 * All text arrives via inputs — pass pre-translated strings; requires a wired
 * ClassMap bond. Node-valued plan/feature fields are projected templates
 * (`<ng-template #ref>`), not input values; pass the template reference.
 *
 * @module
 */

export * from './pricing-table.component.js'
export * from './types.js'

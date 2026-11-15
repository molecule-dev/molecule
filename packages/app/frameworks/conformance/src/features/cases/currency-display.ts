/**
 * `@molecule/app-currency-display-react` cases: the `CurrencyDisplay`
 * component plus the two `Intl.NumberFormat` string utilities
 * (`formatCurrency`, `formatCurrencyCompact`).
 *
 * Every case pins its locale (`en-US` unless it is testing another one), so a
 * run does not depend on the machine's default locale. The component reads no
 * app services, so the cases mount under the UI providers only.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A custom savings label, the render function `savingsLabel(saved, pct)` React calls. */
const customSavingsLabel = { $fn: 'savingsLabel', format: 'save {0} ({1}%)' }

/** `@molecule/app-currency-display-react`. */
export const currencyDisplayFeature: FeatureCases = {
  package: '@molecule/app-currency-display-react',
  families: [
    {
      component: 'CurrencyDisplay',
      cases: [
        // Defaults: `currency` USD, `size` md, `showSavings` true, no original price.
        { name: 'amount only (defaults)', props: { amount: 49.99, locale: 'en-US' } },
        { name: 'zero amount', props: { amount: 0, locale: 'en-US' } },
        { name: 'negative amount', props: { amount: -12.5, locale: 'en-US' } },
        { name: 'fractional amount', props: { amount: 1234.5, locale: 'en-US' } },

        // Every `size` value (md is the default, covered above).
        { name: 'size sm', props: { amount: 9.5, locale: 'en-US', size: 'sm' } },
        { name: 'size lg', props: { amount: 9.5, locale: 'en-US', size: 'lg' } },
        { name: 'size xl', props: { amount: 9.5, locale: 'en-US', size: 'xl' } },
        { name: 'size md explicitly', props: { amount: 9.5, locale: 'en-US', size: 'md' } },

        // Currency and locale branches.
        { name: 'EUR in de-DE', props: { amount: 1234.5, currency: 'EUR', locale: 'de-DE' } },
        {
          name: 'JPY (no fraction digits)',
          props: { amount: 1234, currency: 'JPY', locale: 'en-US' },
        },
        { name: 'runtime default locale', props: { amount: 1234.5, currency: 'USD' } },

        // `compact` notation: engaged for a large amount, not for a small one.
        { name: 'compact large amount', props: { amount: 29990, locale: 'en-US', compact: true } },
        { name: 'compact small amount', props: { amount: 99, locale: 'en-US', compact: true } },
        {
          name: 'compact with original price',
          props: { amount: 29990, originalAmount: 49990, locale: 'en-US', compact: true },
        },

        // `originalAmount` branches: discounted, not discounted, equal, absent.
        {
          name: 'original price with savings chip',
          props: { amount: 29.99, originalAmount: 49.99, locale: 'en-US' },
        },
        {
          name: 'original price rounds the saving',
          props: { amount: 1, originalAmount: 3, locale: 'en-US' },
        },
        {
          name: 'original price below the amount',
          props: { amount: 49.99, originalAmount: 29.99, locale: 'en-US' },
        },
        {
          name: 'original price equal to the amount',
          props: { amount: 10, originalAmount: 10, locale: 'en-US' },
        },
        {
          name: 'original price with showSavings false',
          props: { amount: 29.99, originalAmount: 49.99, locale: 'en-US', showSavings: false },
        },
        {
          name: 'showSavings without an original price',
          props: { amount: 29.99, locale: 'en-US', showSavings: true },
        },
        {
          name: 'negative original price (zero percent)',
          props: { amount: -10, originalAmount: -5, locale: 'en-US' },
        },

        // `savingsLabel` render function: used when discounted, ignored otherwise.
        {
          name: 'custom savings label',
          props: {
            amount: 29.99,
            originalAmount: 49.99,
            locale: 'en-US',
            savingsLabel: customSavingsLabel,
          },
        },
        {
          name: 'custom savings label, not discounted',
          props: {
            amount: 49.99,
            originalAmount: 29.99,
            locale: 'en-US',
            savingsLabel: customSavingsLabel,
          },
        },
        {
          name: 'custom savings label with showSavings false',
          props: {
            amount: 29.99,
            originalAmount: 49.99,
            locale: 'en-US',
            showSavings: false,
            savingsLabel: customSavingsLabel,
          },
        },

        // `className` passthrough.
        {
          name: 'className passthrough',
          props: { amount: 5, locale: 'en-US', className: 'parity-token' },
        },

        // Prop changes: each step re-renders the same component.
        {
          name: 'gains an original price',
          props: { amount: 29.99, locale: 'en-US' },
          interactions: [{ type: 'props', props: { originalAmount: 49.99 } }],
        },
        {
          name: 'changes size, compactness and currency',
          props: { amount: 1234.5, locale: 'en-US' },
          interactions: [
            { type: 'props', props: { size: 'xl' } },
            { type: 'props', props: { compact: true } },
            { type: 'props', props: { currency: 'EUR' } },
          ],
        },
        {
          name: 'toggles the savings chip and the label',
          props: {
            amount: 29.99,
            originalAmount: 49.99,
            locale: 'en-US',
            savingsLabel: customSavingsLabel,
          },
          interactions: [
            { type: 'props', props: { showSavings: false } },
            { type: 'props', props: { showSavings: true, className: 'parity-token' } },
            { type: 'props', props: { savingsLabel: undefined } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatCurrency',
      calls: [
        [1234.5],
        [1234.5, 'USD', 'en-US'],
        [99, 'USD', 'en-US'],
        [0, 'USD', 'en-US'],
        [-50, 'USD', 'en-US'],
        [1234, 'JPY', 'en-US'],
        [1234.5, 'EUR', 'de-DE'],
        [1234.5, 'GBP', 'en-GB'],
        [1.005, 'USD', 'en-US'],
      ],
    },
    {
      export: 'formatCurrencyCompact',
      calls: [
        [12345],
        [12345, 'USD', 'en-US'],
        [1_234_567, 'USD', 'en-US'],
        [99, 'USD', 'en-US'],
        [0, 'USD', 'en-US'],
        [-12345, 'USD', 'en-US'],
        [12345.67, 'USD', 'en-US'],
        [1_234_500, 'EUR', 'de-DE'],
      ],
    },
  ],
}

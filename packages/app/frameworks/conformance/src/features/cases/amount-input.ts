/**
 * `@molecule/app-amount-input-react` cases: the large currency input, its
 * optional income/expense toggle, the size ramp and the currency formatter.
 *
 * `AmountInput` is the package's only component export, and `formatCurrency`
 * its only other runtime export.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-amount-input-react`. */
export const amountInputFeature: FeatureCases = {
  package: '@molecule/app-amount-input-react',
  families: [
    {
      component: 'AmountInput',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated toggle labels.
        {
          name: 'income selected with the default toggle',
          props: { amount: 0, type: 'income' },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'expense selected',
          props: { amount: 0, type: 'expense' },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'transfer selected when it is an option',
          props: { amount: 0, type: 'transfer', typeOptions: ['income', 'expense', 'transfer'] },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'other selected when it is the only option',
          props: { amount: 0, type: 'other', typeOptions: ['other'] },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'custom type options in their own order',
          props: { amount: 0, type: 'expense', typeOptions: ['expense', 'transfer', 'other'] },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'no toggle without onTypeChange even when a type is set',
          props: { amount: 0, type: 'expense' },
        },
        {
          name: 'onTypeChange with an empty option list',
          props: { amount: 0, typeOptions: [] },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'type labels cover every option',
          props: {
            amount: 0,
            type: 'income',
            typeOptions: ['income', 'expense'],
            typeLabels: { income: 'Money in', expense: 'Money out' },
          },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'partial type labels fall back per option',
          props: {
            amount: 0,
            type: 'expense',
            typeOptions: ['income', 'expense'],
            typeLabels: { expense: 'Outgoing' },
          },
          callbacks: ['onTypeChange'],
        },
        {
          name: 'type labels for an option that is not shown are ignored',
          props: { amount: 0, type: 'income', typeLabels: { transfer: 'Moved' } },
          callbacks: ['onTypeChange'],
        },
        { name: 'custom currency symbol', props: { amount: 0, currencySymbol: '€' } },
        { name: 'custom aria label', props: { amount: 0, ariaLabel: 'Transaction amount' } },
        { name: 'medium size', props: { amount: 0, size: 'md' } },
        { name: 'extra large size', props: { amount: 0, size: 'xl' } },
        { name: 'empty amount', props: { amount: '' } },
        { name: 'negative amount', props: { amount: -12.5 } },
        { name: 'className is forwarded', props: { amount: 0, className: 'parity-token' } },
        {
          name: 'typing an amount calls onAmountChange with a number',
          props: { amount: 0 },
          callbacks: ['onAmountChange'],
          interactions: [{ type: 'input', selector: 'input', value: '12.5' }],
        },
        {
          name: 'typing strips symbols and grouping characters',
          props: { amount: 0 },
          callbacks: ['onAmountChange'],
          interactions: [{ type: 'input', selector: 'input', value: '$1,234.50' }],
        },
        {
          name: 'typing a lone minus clears the amount',
          props: { amount: 5 },
          callbacks: ['onAmountChange'],
          interactions: [{ type: 'input', selector: 'input', value: '-' }],
        },
        {
          name: 'clearing the field reports an empty amount',
          props: { amount: 5 },
          callbacks: ['onAmountChange'],
          interactions: [{ type: 'input', selector: 'input', value: '' }],
        },
        {
          name: 'typing an unparseable value reports nothing',
          props: { amount: 5 },
          callbacks: ['onAmountChange'],
          interactions: [{ type: 'input', selector: 'input', value: '1.2.3' }],
        },
        {
          name: 'clicking each type option calls onTypeChange',
          props: { amount: 0, type: 'income' },
          callbacks: ['onTypeChange'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(1)' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'keyboard, focus and blur change nothing',
          props: { amount: 3 },
          interactions: [
            { type: 'focus', selector: 'input' },
            { type: 'keydown', selector: 'input', key: 'Enter' },
            { type: 'keydown', selector: 'input', key: 'Tab' },
            { type: 'blur', selector: 'input' },
          ],
        },
        {
          name: 'amount and type change through props',
          props: { amount: 0, type: 'income' },
          callbacks: ['onTypeChange'],
          interactions: [
            { type: 'props', props: { amount: 5 } },
            { type: 'props', props: { type: 'expense' } },
            { type: 'props', props: { amount: '' } },
          ],
        },
        {
          name: 'the size ramp changes through props',
          props: { amount: 1, size: 'md' },
          interactions: [
            { type: 'props', props: { size: 'lg' } },
            { type: 'props', props: { size: 'xl' } },
          ],
        },
        {
          name: 'type options change through props',
          props: { amount: 0, type: 'income', typeOptions: ['income', 'expense'] },
          callbacks: ['onTypeChange'],
          interactions: [{ type: 'props', props: { typeOptions: ['income'] } }],
        },
        {
          name: 'labels, symbol and aria label change through props',
          props: { amount: 0, type: 'income', typeLabels: { income: 'In' } },
          callbacks: ['onTypeChange'],
          interactions: [
            {
              type: 'props',
              props: { typeLabels: { income: 'Money in' }, currencySymbol: '£', ariaLabel: 'Sum' },
            },
          ],
        },
        {
          name: 'className changes through props',
          props: { amount: 0, className: 'first-token' },
          interactions: [
            { type: 'props', props: { className: 'second-token' } },
            { type: 'props', props: { className: null } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatCurrency',
      calls: [
        [1234.5, 'USD', 'en-US'],
        [99],
        [100, 'USD', 'en-US'],
        [1234.5, 'EUR', 'de-DE'],
        [1234, 'JPY', 'en-US'],
        [0, 'USD', 'en-US'],
        [-12.34, 'USD', 'en-US'],
        [1.005, 'USD', 'en-US'],
      ],
    },
  ],
}

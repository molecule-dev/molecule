/**
 * LoadErrorBanner parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** LoadErrorBanner: message/detail/children, retry button with its mol id and label, retry callback. */
export const loadErrorBannerCases: UIComponentCases = {
  component: 'LoadErrorBanner',
  cases: [
    { name: 'defaults (display only)', slots: { message: ['Could not load decks.'] } },
    {
      name: 'with detail',
      slots: { message: ['Could not load decks.'], detail: ['Request failed with 503.'] },
    },
    {
      name: 'retry button renders with onRetry',
      callbacks: ['onRetry'],
      slots: { message: ['Could not load decks.'] },
    },
    {
      name: 'custom retryLabel',
      callbacks: ['onRetry'],
      slots: { message: ['Could not load decks.'], retryLabel: ['Try again'] },
    },
    {
      name: 'custom retryMolId',
      callbacks: ['onRetry'],
      props: { retryMolId: 'decks-retry' },
      slots: { message: ['Could not load decks.'] },
    },
    {
      name: 'children between message and retry',
      callbacks: ['onRetry'],
      slots: { message: ['Could not load decks.'] },
      children: [{ tag: 'strong', children: ['Error code: DECK_500'] }],
    },
    {
      name: 'element message',
      slots: { message: [{ tag: 'strong', children: ['Everything'] }, ' failed to load.'] },
    },
    {
      name: 'retry click calls onRetry and settles back',
      callbacks: ['onRetry'],
      slots: { message: ['Could not load decks.'] },
      interactions: [{ type: 'click', selector: '[data-mol-id="load-error-retry"]' }],
    },
    {
      name: 'root passthrough of className and data attributes',
      props: { className: 'parity-token', 'data-mol-id': 'decks-error' },
      slots: { message: ['Could not load decks.'] },
    },
    {
      name: 'retry pending shows Retrying and disables the button',
      callbacks: ['onRetry'],
      callbackResults: { onRetry: { defer: true } },
      slots: { message: ['Could not load decks.'] },
      interactions: [{ type: 'click', selector: '[data-mol-id="load-error-retry"]' }],
    },
    {
      name: 'a resolved retry restores the button',
      callbacks: ['onRetry'],
      callbackResults: { onRetry: { defer: true } },
      slots: { message: ['Could not load decks.'] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="load-error-retry"]' },
        { type: 'settle', callback: 'onRetry', value: undefined },
      ],
    },
    {
      name: 'a rejected retry keeps the banner and restores the button',
      callbacks: ['onRetry'],
      callbackResults: { onRetry: { defer: true } },
      slots: { message: ['Could not load decks.'] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="load-error-retry"]' },
        { type: 'settle', callback: 'onRetry', error: 'still 503' },
      ],
    },
  ],
}

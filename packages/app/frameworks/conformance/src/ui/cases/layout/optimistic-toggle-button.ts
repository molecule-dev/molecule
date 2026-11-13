/**
 * OptimisticToggleButton parity cases: the server-backed boolean toggle.
 *
 * `commit` is a saver that must return the server's value, not a plain
 * callback — the recorder's spy returns nothing, which by contract keeps the
 * optimistic value, so the click cases below still exercise the full
 * optimistic flip → save → settle cycle deterministically.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** OptimisticToggleButton: labels, button props, optimistic clicks, value sync. */
export const optimisticToggleButtonCases: UIComponentCases = {
  component: 'OptimisticToggleButton',
  cases: [
    {
      name: 'inactive value shows the inactive label',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
    },
    {
      name: 'active value shows the active label',
      props: { value: true },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
    },
    {
      name: 'element labels',
      props: { value: false },
      slots: {
        activeLabel: [{ tag: 'strong', children: ['Following'] }],
        inactiveLabel: ['Follow ', { tag: 'em', children: ['me'] }],
      },
    },
    {
      name: 'variant, color and size pass through to the button',
      props: { value: false, variant: 'outline', color: 'secondary', size: 'sm' },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
    },
    {
      name: 'fullWidth, className, style and testId',
      props: {
        value: true,
        fullWidth: true,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'star-button',
      },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
    },
    {
      name: 'disabled',
      props: { value: false, disabled: true },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
    },
    {
      name: 'click flips the label optimistically and commits',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      interactions: [{ type: 'click', selector: '[data-mol-id="optimistic-toggle"]' }],
    },
    {
      name: 'two clicks commit both desired values in order',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="optimistic-toggle"]' },
        { type: 'click', selector: '[data-mol-id="optimistic-toggle"]' },
      ],
    },
    {
      name: 'disabled click does not commit',
      props: { value: false, disabled: true },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      interactions: [{ type: 'click', selector: '[data-mol-id="optimistic-toggle"]' }],
    },
    {
      name: 'a newer server value syncs the shown label',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      interactions: [{ type: 'props', props: { value: true } }],
    },
    {
      name: 'a rejected commit rolls back and calls onError',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit', 'onError'],
      callbackResults: { commit: { reject: 'save failed' } },
      interactions: [{ type: 'click', selector: '[data-mol-id="optimistic-toggle"]' }],
    },
    {
      name: 'a rejected commit from the active state rolls back to active',
      props: { value: true },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit', 'onError'],
      callbackResults: { commit: { reject: 'save failed' } },
      interactions: [{ type: 'click', selector: '[data-mol-id="optimistic-toggle"]' }],
    },
    {
      name: 'a pending commit shows the in-flight busy state',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      callbackResults: { commit: { defer: true } },
      interactions: [{ type: 'click', selector: '[data-mol-id="optimistic-toggle"]' }],
    },
    {
      // The server confirms false — a different value than the optimistic
      // true — so the shown label settles back to the server's value.
      name: 'a deferred commit settles on the server value',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      callbackResults: { commit: { defer: true } },
      interactions: [
        { type: 'click', selector: '[data-mol-id="optimistic-toggle"]' },
        { type: 'settle', callback: 'commit', value: false },
      ],
    },
    {
      name: 'a deferred commit that confirms the optimistic value keeps it',
      props: { value: false },
      slots: { activeLabel: ['Unstar'], inactiveLabel: ['Star'] },
      callbacks: ['commit'],
      callbackResults: { commit: { defer: true } },
      interactions: [
        { type: 'click', selector: '[data-mol-id="optimistic-toggle"]' },
        { type: 'settle', callback: 'commit', value: true },
      ],
    },
  ],
}

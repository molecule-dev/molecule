/**
 * Alert parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Alert: statuses, variants, live politeness, title, custom icon, dismiss paths. */
export const alertCases: UIComponentCases = {
  component: 'Alert',
  cases: [
    { name: 'defaults', children: ['Something happened.'] },
    ...(['primary', 'secondary', 'success', 'warning', 'error'] as const).map((status) => ({
      name: `status ${status}`,
      props: { status },
      children: ['Body text'],
    })),
    ...(['solid', 'subtle', 'outline', 'left-accent'] as const).map((variant) => ({
      name: `variant ${variant}`,
      props: { variant },
      children: ['Body text'],
    })),
    { name: 'live false is polite', props: { live: false }, children: ['Static banner'] },
    { name: 'title', props: { title: 'Heads up' }, children: ['Body text'] },
    {
      name: 'element children',
      children: [{ tag: 'strong', children: ['Bold'] }, ' trailing text'],
    },
    {
      name: 'custom icon replaces the status icon',
      slots: { icon: [{ tag: 'svg', attrs: { viewBox: '0 0 24 24', 'data-icon': 'sparkles' } }] },
      children: ['Body text'],
    },
    { name: 'dismissible', props: { dismissible: true }, children: ['Body text'] },
    {
      name: 'custom dismissLabel',
      props: { dismissible: true, dismissLabel: 'Hide warning' },
      children: ['Body text'],
    },
    {
      name: 'dismiss click calls onDismiss',
      props: { dismissible: true },
      callbacks: ['onDismiss'],
      children: ['Body text'],
      interactions: [{ type: 'click', selector: '[aria-label="Dismiss"]' }],
    },
    {
      name: 'custom dismissLabel is the selector',
      props: { dismissible: true, dismissLabel: 'Hide warning' },
      callbacks: ['onDismiss'],
      children: ['Body text'],
      interactions: [{ type: 'click', selector: '[aria-label="Hide warning"]' }],
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'save-alert' },
      children: ['Body text'],
    },
  ],
}

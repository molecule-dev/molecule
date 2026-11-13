/**
 * Toast, ToastContainer and ToastProvider parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Toast: statuses and roles, dismiss paths, auto-dismiss countdown with hover/focus pause. */
export const toastCases: UIComponentCases = {
  component: 'Toast',
  cases: [
    {
      name: 'defaults',
      props: { title: 'Saved', description: 'Your changes are live.', duration: 0 },
    },
    ...(['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const).map((status) => ({
      name: `status ${status}`,
      props: { title: 'Saved', status, duration: 0 },
    })),
    {
      name: 'title only',
      props: { title: 'Saved', duration: 0 },
    },
    {
      name: 'description only',
      props: { description: 'Quiet update.', duration: 0 },
    },
    {
      name: 'children only',
      props: { duration: 0 },
      children: ['Rendered as the description'],
    },
    {
      name: 'description wins over children',
      props: { description: 'The description', duration: 0 },
      children: ['Ignored children'],
    },
    {
      name: 'element children',
      props: { duration: 0 },
      children: [{ tag: 'strong', children: ['Bold'] }, ' body'],
    },
    {
      name: 'not dismissible',
      props: { title: 'Sticky', duration: 0, dismissible: false },
    },
    {
      name: 'custom closeLabel',
      props: { title: 'Saved', duration: 0, closeLabel: 'Hide notice' },
    },
    {
      name: 'position prop is accepted',
      props: { title: 'Saved', duration: 0, position: 'top-left' },
    },
    {
      name: 'className, style and testId',
      props: {
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'saved-toast',
        duration: 0,
      },
      children: ['Body'],
    },
    {
      name: 'close button dismisses and calls onDismiss',
      props: { title: 'Saved', duration: 0 },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: '[aria-label="Close"]' }],
    },
    {
      name: 'auto-dismisses after the duration',
      fakeTimers: true,
      props: { title: 'Saved' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'advance', ms: 4999 },
        { type: 'advance', ms: 1 },
      ],
    },
    {
      name: 'duration 0 is persistent',
      fakeTimers: true,
      props: { title: 'Saved', duration: 0 },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'advance', ms: 60000 }],
    },
    {
      name: 'hover pauses the countdown and resumes it',
      fakeTimers: true,
      props: { title: 'Saved' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[role="status"]' },
        { type: 'advance', ms: 4000 },
        { type: 'mouseleave', selector: '[role="status"]' },
        { type: 'advance', ms: 999 },
        { type: 'advance', ms: 1 },
      ],
    },
    {
      name: 'focus pauses the countdown and blur resumes it',
      fakeTimers: true,
      props: { title: 'Saved' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'focus', selector: '[role="status"]' },
        { type: 'advance', ms: 5000 },
        { type: 'blur', selector: '[role="status"]' },
        { type: 'advance', ms: 1000 },
      ],
    },
    {
      name: 'auto-dismiss works without a close button',
      fakeTimers: true,
      props: { title: 'Saved', dismissible: false },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'advance', ms: 5000 }],
    },
  ],
}

/** ToastContainer: portal positions, className, hosting Toast children. */
export const toastContainerCases: UIComponentCases = {
  component: 'ToastContainer',
  cases: [
    { name: 'defaults (empty)' },
    ...(['top', 'top-right', 'top-left', 'bottom', 'bottom-left'] as const).map((position) => ({
      name: `position ${position}`,
      props: { position },
    })),
    {
      name: 'hosts toast children',
      children: [
        {
          component: 'Toast',
          props: { title: 'Saved', description: 'Changes are live.', duration: 0 },
        },
      ],
    },
    {
      name: 'className',
      props: { className: 'parity-token' },
      children: [{ component: 'Toast', props: { title: 'Saved', duration: 0 } }],
    },
  ],
}

/**
 * ToastProvider: renders children plus a positioned container, and manages
 * toasts added through the `useToast()` hook.
 *
 * The `useToast` cases below click hook probes inside the provider. NOTE:
 * `addToast` ids come from a MODULE-GLOBAL counter (`toast-1`, `toast-2`, …),
 * counted across every case in a test file in execution order — the remove
 * case must stay the FIRST addToast of the family (its id is `toast-1`), and
 * inserting any other addToast probe case before it shifts every later id.
 * No other family calls addToast (a bare `Toast`/`ToastContainer` mounts
 * children directly), so the first provider probe add is always `toast-1`.
 */
export const toastProviderCases: UIComponentCases = {
  component: 'ToastProvider',
  cases: [
    { name: 'defaults', children: ['Page content'] },
    ...(['top', 'top-right', 'top-left', 'bottom', 'bottom-left'] as const).map((position) => ({
      name: `position ${position}`,
      props: { position },
      children: ['Page content'],
    })),
    {
      name: 'element children',
      children: [{ tag: 'main', children: [{ tag: 'p', children: ['Body'] }] }],
    },
    {
      name: 'component children',
      children: [{ component: 'Button', children: ['Save'] }],
    },
    {
      name: 'useToast adds a toast and removes it by id',
      children: [
        {
          probe: 'useToast',
          method: 'addToast',
          args: [{ title: 'Saved', duration: 0 }],
          label: 'add saved',
        },
        { probe: 'useToast', method: 'removeToast', args: ['toast-1'], label: 'remove saved' },
        'Page content',
      ],
      interactions: [
        { type: 'click', selector: '[data-parity-probe="add saved"]' },
        { type: 'click', selector: '[data-parity-probe="remove saved"]' },
      ],
    },
    {
      name: 'useToast adds a default toast',
      children: [
        {
          probe: 'useToast',
          method: 'addToast',
          args: [{ title: 'Hello', duration: 0 }],
          label: 'add default',
        },
        'Page content',
      ],
      interactions: [{ type: 'click', selector: '[data-parity-probe="add default"]' }],
    },
    {
      name: 'useToast adds toasts of every status',
      children: [
        ...(['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const).map(
          (status) => ({
            probe: 'useToast',
            method: 'addToast',
            args: [{ title: `Toast ${status}`, status, duration: 0 }],
            label: `add ${status}`,
          }),
        ),
        'Page content',
      ],
      interactions: (['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const).map(
        (status) => ({ type: 'click', selector: `[data-parity-probe="add ${status}"]` }),
      ),
    },
    {
      name: 'useToast adds a toast with title and description',
      children: [
        {
          probe: 'useToast',
          method: 'addToast',
          args: [{ title: 'Deployed', description: 'Build 128 is live.', duration: 0 }],
          label: 'add described',
        },
        'Page content',
      ],
      interactions: [{ type: 'click', selector: '[data-parity-probe="add described"]' }],
    },
    {
      name: 'useToast adds a persistent non-dismissible toast',
      children: [
        {
          probe: 'useToast',
          method: 'addToast',
          args: [{ title: 'Read me', duration: 0, dismissible: false }],
          label: 'add persistent',
        },
        'Page content',
      ],
      interactions: [{ type: 'click', selector: '[data-parity-probe="add persistent"]' }],
    },
    {
      name: 'useToast toast auto-dismisses after its duration',
      fakeTimers: true,
      children: [
        {
          probe: 'useToast',
          method: 'addToast',
          args: [{ title: 'Bye soon', duration: 1000 }],
          label: 'add fleeting',
        },
        'Page content',
      ],
      interactions: [
        { type: 'click', selector: '[data-parity-probe="add fleeting"]' },
        { type: 'advance', ms: 999 },
        { type: 'advance', ms: 1 },
      ],
    },
  ],
}

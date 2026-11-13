/**
 * ConfirmDialog parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** ConfirmDialog: destructive/default confirms, custom labels, loading, cancel/confirm callbacks. */
export const confirmDialogCases: UIComponentCases = {
  component: 'ConfirmDialog',
  cases: [
    {
      name: 'defaults',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete vault?'], description: ['This action cannot be undone.'] },
    },
    {
      name: 'closed renders nothing',
      props: { open: false },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete vault?'], description: ['Cannot be undone.'] },
    },
    {
      name: 'non destructive',
      props: { open: true, destructive: false },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Publish draft?'], description: ['The draft becomes visible.'] },
    },
    {
      name: 'custom confirm and cancel labels',
      props: { open: true, confirmLabel: 'Revoke', cancelLabel: 'Keep it' },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Revoke token?'], description: ['Clients using it stop working.'] },
    },
    {
      name: 'loading disables both buttons',
      props: { open: true, loading: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Deleting…'], description: ['Working.'] },
    },
    {
      name: 'children render between description and footer',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete vault?'], description: ['Cannot be undone.'] },
      children: [{ tag: 'strong', children: ['3 items will be removed'] }],
    },
    {
      name: 'element title and description',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: {
        title: [{ tag: 'em', children: ['Really'] }, ' delete?'],
        description: [{ tag: 'strong', children: ['Everything'] }, ' goes away.'],
      },
    },
    {
      name: 'cancel click calls onClose',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete?'], description: ['Sure?'] },
      interactions: [{ type: 'click', selector: '[role="dialog"] button:nth-last-of-type(2)' }],
    },
    {
      name: 'confirm click calls onConfirm',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete?'], description: ['Sure?'] },
      interactions: [{ type: 'click', selector: '[role="dialog"] div > button:nth-of-type(2)' }],
    },
    {
      name: 'escape calls onClose',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete?'], description: ['Sure?'] },
      interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
    },
    {
      name: 'chrome close button calls onClose',
      props: { open: true },
      callbacks: ['onClose', 'onConfirm'],
      slots: { title: ['Delete?'], description: ['Sure?'] },
      interactions: [{ type: 'click', selector: '[data-mol-id="modal-close"]' }],
    },
  ],
}

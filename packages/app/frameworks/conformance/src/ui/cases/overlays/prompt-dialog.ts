/**
 * PromptDialog parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** PromptDialog: seeded input, placeholder, labels, mol ids, typing, submit/cancel/escape callbacks. */
export const promptDialogCases: UIComponentCases = {
  component: 'PromptDialog',
  cases: [
    {
      name: 'defaults',
      props: { open: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'closed renders nothing',
      props: { open: false },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'placeholder and initialValue',
      props: { open: true, placeholder: 'Board name', initialValue: 'Roadmap' },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'description under the title',
      props: { open: true, description: 'The slug updates automatically.' },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'custom confirm and cancel labels',
      props: { open: true, confirmLabel: 'Save', cancelLabel: 'Keep old name' },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'destructive confirm button',
      props: { open: true, destructive: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Reset workspace'] },
    },
    {
      name: 'mol ids on input and buttons',
      props: {
        open: true,
        inputMolId: 'rename-input',
        confirmMolId: 'rename-confirm',
        cancelMolId: 'rename-cancel',
      },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
    },
    {
      name: 'children render under the input',
      props: { open: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
      children: [{ tag: 'strong', children: ['Names must be unique'] }],
    },
    {
      name: 'typing updates the input value',
      props: { open: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
      interactions: [{ type: 'input', selector: 'form input', value: 'Q3 roadmap' }],
    },
    {
      name: 'submit passes the typed value then closes',
      props: { open: true, initialValue: 'Old name' },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
      interactions: [
        { type: 'input', selector: 'form input', value: 'New name' },
        { type: 'submit', selector: 'form' },
      ],
    },
    {
      name: 'cancel click calls onClose only',
      props: { open: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
      interactions: [{ type: 'click', selector: 'form button:nth-of-type(1)' }],
    },
    {
      name: 'escape calls onClose',
      props: { open: true },
      callbacks: ['onClose', 'onSubmit'],
      slots: { title: ['Rename board'] },
      interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
    },
    {
      name: 'submit pending disables the input and both buttons',
      props: { open: true, initialValue: 'Roadmap' },
      callbacks: ['onClose', 'onSubmit'],
      callbackResults: { onSubmit: { defer: true } },
      slots: { title: ['Rename board'] },
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      // With `open` kept true (a multi-stage flow advancing in onClose), the
      // form is enabled again for the next submit.
      name: 'resolved submit calls onClose and re-enables the form',
      props: { open: true, initialValue: 'Roadmap' },
      callbacks: ['onClose', 'onSubmit'],
      callbackResults: { onSubmit: { defer: true } },
      slots: { title: ['Rename board'] },
      interactions: [
        { type: 'submit', selector: 'form' },
        { type: 'settle', callback: 'onSubmit', value: undefined },
      ],
    },
    {
      name: 'rejected submit keeps the dialog open with the value intact',
      props: { open: true, initialValue: 'Roadmap' },
      callbacks: ['onClose', 'onSubmit'],
      callbackResults: { onSubmit: { defer: true } },
      slots: { title: ['Rename board'] },
      interactions: [
        { type: 'input', selector: 'form input', value: 'Q3 roadmap' },
        { type: 'submit', selector: 'form' },
        { type: 'settle', callback: 'onSubmit', error: 'name taken' },
      ],
    },
    {
      name: 'a second submit while pending does not double-fire',
      props: { open: true, initialValue: 'Roadmap' },
      callbacks: ['onClose', 'onSubmit'],
      callbackResults: { onSubmit: { defer: true } },
      slots: { title: ['Rename board'] },
      interactions: [
        { type: 'submit', selector: 'form' },
        { type: 'submit', selector: 'form' },
      ],
    },
  ],
}

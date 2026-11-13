/**
 * ConfirmButton parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** ConfirmButton: arm/commit phases, auto-disarm, escape disarm, button variants, callbacks. */
export const confirmButtonCases: UIComponentCases = {
  component: 'ConfirmButton',
  cases: [
    { name: 'defaults', callbacks: ['onConfirm'], slots: { label: ['Delete'] } },
    {
      name: 'custom confirm and pending labels',
      callbacks: ['onConfirm'],
      slots: {
        label: ['Delete client'],
        confirmLabel: ['Confirm delete?'],
        pendingLabel: ['Deleting…'],
      },
    },
    {
      name: 'variant color and size passthrough',
      props: { variant: 'outline', color: 'error', size: 'sm' },
      callbacks: ['onConfirm'],
      slots: { label: ['Revoke'] },
    },
    {
      name: 'disabled',
      props: { disabled: true },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
    },
    {
      name: 'element label',
      callbacks: ['onConfirm'],
      slots: { label: [{ tag: 'strong', children: ['Delete'] }, ' row'] },
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'row-delete' },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
    },
    {
      name: 'first click arms',
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'armed state uses the error color',
      props: { color: 'secondary' },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'second click commits and returns to idle',
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'button' },
      ],
    },
    {
      name: 'disabled click does not arm',
      props: { disabled: true },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'escape disarms an armed button',
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: 'button', key: 'Escape' },
      ],
    },
    {
      name: 'auto-disarms after disarmSeconds',
      fakeTimers: true,
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'advance', ms: 4000 },
      ],
    },
    {
      name: 'stays armed just before the disarm deadline',
      fakeTimers: true,
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'advance', ms: 3999 },
      ],
    },
    {
      name: 'custom disarmSeconds',
      fakeTimers: true,
      props: { disarmSeconds: 2 },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'advance', ms: 2000 },
      ],
    },
    {
      name: 'disarmSeconds 0 keeps it armed forever',
      fakeTimers: true,
      props: { disarmSeconds: 0 },
      callbacks: ['onConfirm'],
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'advance', ms: 60000 },
      ],
    },
    {
      name: 'pending shows the pending label and disables the button',
      callbacks: ['onConfirm'],
      callbackResults: { onConfirm: { defer: true } },
      slots: { label: ['Delete'], confirmLabel: ['Confirm delete?'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'button' },
      ],
    },
    {
      name: 'custom pending label while the confirm is in flight',
      callbacks: ['onConfirm'],
      callbackResults: { onConfirm: { defer: true } },
      slots: { label: ['Delete'], pendingLabel: ['Deleting…'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'button' },
      ],
    },
    {
      name: 'a resolved confirm returns the button to idle',
      callbacks: ['onConfirm'],
      callbackResults: { onConfirm: { defer: true } },
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'button' },
        { type: 'settle', callback: 'onConfirm', value: undefined },
      ],
    },
    {
      name: 'a rejected confirm returns the button to idle',
      callbacks: ['onConfirm'],
      callbackResults: { onConfirm: { defer: true } },
      slots: { label: ['Delete'] },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'button' },
        { type: 'settle', callback: 'onConfirm', error: 'network down' },
      ],
    },
  ],
}

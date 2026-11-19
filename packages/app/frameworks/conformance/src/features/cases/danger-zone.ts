/**
 * `@molecule/app-danger-zone-react` cases: the destructive-action section card
 * and the standalone confirm dialog, in every prop branch.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes a bare input as children to check where children render. */
const UNLABELLED_CHILD_INPUT: CaseA11y = {
  expect: ['label'],
  reason: 'The case passes a bare input as children to check where children render',
}

/** The section's required copy, as plain text props. */
const section = {
  title: 'Delete account',
  description: 'This permanently removes your account and all data.',
  actionLabel: 'Delete account',
}

/** The dialog's required copy, as same-named slots (strings render as text). */
const dialogSlots = {
  title: ['Delete vault?'],
  description: ['This action cannot be undone.'],
}

/** `@molecule/app-danger-zone-react`. */
export const dangerZoneFeature: FeatureCases = {
  package: '@molecule/app-danger-zone-react',
  families: [
    {
      component: 'DangerZoneSection',
      cases: [
        {
          name: 'defaults',
          props: { ...section },
          callbacks: ['onAction'],
        },
        {
          name: 'loading shows the glyph and disables the action',
          props: { ...section, loading: true },
          callbacks: ['onAction'],
        },
        {
          name: 'disabled',
          props: { ...section, disabled: true },
          callbacks: ['onAction'],
        },
        {
          name: 'disabled while loading',
          props: { ...section, disabled: true, loading: true },
          callbacks: ['onAction'],
        },
        {
          name: 'click calls onAction',
          props: { ...section },
          callbacks: ['onAction'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'disabled click does not call onAction',
          props: { ...section, disabled: true },
          callbacks: ['onAction'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'extra content between description and button',
          a11y: UNLABELLED_CHILD_INPUT,
          props: { ...section },
          callbacks: ['onAction'],
          children: [{ tag: 'input', attrs: { 'data-parity-confirm': '' } }],
        },
        {
          name: 'class and mol id',
          props: { ...section, className: 'parity-token', dataMolId: 'danger-section' },
          callbacks: ['onAction'],
        },
        {
          name: 'node title, description and action label',
          slots: {
            title: [{ tag: 'em', children: ['Delete'] }, ' account'],
            description: ['Gone for ', { tag: 'strong', children: ['ever'] }, '.'],
            actionLabel: [{ tag: 'strong', children: ['Delete'] }],
          },
          callbacks: ['onAction'],
        },
        {
          name: 'loading flips off',
          props: { ...section, loading: true },
          callbacks: ['onAction'],
          interactions: [{ type: 'props', props: { loading: false } }],
        },
      ],
    },
    {
      component: 'ConfirmDialog',
      cases: [
        {
          name: 'defaults',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
        },
        {
          name: 'closed renders nothing',
          props: { open: false },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
        },
        {
          name: 'open flips closed',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
          interactions: [{ type: 'props', props: { open: false } }],
        },
        {
          name: 'non destructive',
          props: { open: true, destructive: false },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
        },
        {
          name: 'custom confirm and cancel labels',
          props: { open: true, confirmLabel: 'Revoke', cancelLabel: 'Keep it' },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
        },
        {
          name: 'loading disables both buttons',
          props: { open: true, loading: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
        },
        {
          name: 'children render between description and footer',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
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
          slots: { ...dialogSlots },
          interactions: [{ type: 'click', selector: '[role="dialog"] button:nth-last-of-type(2)' }],
        },
        {
          name: 'confirm click calls onConfirm',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
          interactions: [
            { type: 'click', selector: '[role="dialog"] div > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'a resolved confirm stays open',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          callbackResults: { onConfirm: { resolve: null } },
          slots: { ...dialogSlots },
          interactions: [
            { type: 'click', selector: '[role="dialog"] div > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'escape calls onClose',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
          interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
        },
        {
          name: 'chrome close button calls onClose',
          props: { open: true },
          callbacks: ['onClose', 'onConfirm'],
          slots: { ...dialogSlots },
          interactions: [{ type: 'click', selector: '[data-mol-id="modal-close"]' }],
        },
      ],
    },
  ],
}

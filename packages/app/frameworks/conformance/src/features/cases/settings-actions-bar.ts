/**
 * `@molecule/app-settings-actions-bar-react` cases: the sticky Save/Cancel bar
 * with its "Saved …" badge, inline error, leading slot and loading/disabled
 * states.
 *
 * Every relative-time case pins `now`, so the badge text ("just now", "5m
 * ago", …) renders the same on every day the suite runs.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The epoch-ms instant the relative-time cases render against. */
const NOW = 1_700_000_000_000

/** A leading node, rendered before the status text. */
const leading = [{ tag: 'span', attrs: { 'data-leading': '' }, children: ['Draft kept'] }]

/** An error node, rendered inside the inline error span. */
const errorNode = [{ tag: 'strong', children: ['Could not save'] }]

/** `@molecule/app-settings-actions-bar-react`. */
export const settingsActionsBarFeature: FeatureCases = {
  package: '@molecule/app-settings-actions-bar-react',
  families: [
    {
      component: 'SettingsActionsBar',
      cases: [
        { name: 'save only', callbacks: ['onSave'] },
        { name: 'save and cancel', callbacks: ['onSave', 'onCancel'] },
        {
          name: 'loading',
          props: { loading: true },
          callbacks: ['onSave', 'onCancel'],
        },
        {
          name: 'disabled',
          props: { disabled: true },
          callbacks: ['onSave', 'onCancel'],
        },
        {
          name: 'loading and disabled',
          props: { loading: true, disabled: true },
          callbacks: ['onSave'],
        },
        {
          name: 'inline error text',
          props: { error: 'Something went wrong' },
          callbacks: ['onSave'],
        },
        { name: 'empty error string', props: { error: '' }, callbacks: ['onSave'] },
        { name: 'error node', slots: { error: errorNode }, callbacks: ['onSave'] },
        { name: 'leading node', slots: { leading }, callbacks: ['onSave'] },
        { name: 'leading text', props: { leading: 'Draft' }, callbacks: ['onSave'] },
        {
          name: 'leading, error and saved badge',
          props: { savedAt: NOW - 3 * 86_400_000, error: 'Something went wrong' },
          slots: { leading },
          now: NOW,
          callbacks: ['onSave', 'onCancel'],
        },
        { name: 'not sticky', props: { sticky: false }, callbacks: ['onSave'] },
        {
          name: 'className passthrough',
          props: { className: 'parity-token' },
          callbacks: ['onSave'],
        },
        {
          name: 'className without the sticky style',
          props: { className: 'parity-token', sticky: false },
          callbacks: ['onSave'],
        },
        { name: 'saved just now', props: { savedAt: NOW - 1000 }, now: NOW, callbacks: ['onSave'] },
        {
          name: 'saved 30s ago',
          props: { savedAt: NOW - 30_000 },
          now: NOW,
          callbacks: ['onSave'],
        },
        {
          name: 'saved 5m ago',
          props: { savedAt: NOW - 5 * 60_000 },
          now: NOW,
          callbacks: ['onSave'],
        },
        {
          name: 'saved 2h ago',
          props: { savedAt: NOW - 2 * 3_600_000 },
          now: NOW,
          callbacks: ['onSave'],
        },
        {
          name: 'saved 3d ago',
          props: { savedAt: NOW - 3 * 86_400_000 },
          now: NOW,
          callbacks: ['onSave'],
        },
        {
          name: 'saved at the epoch',
          props: { savedAt: 0 },
          now: 5000,
          callbacks: ['onSave'],
        },
        {
          name: 'save and cancel clicks',
          callbacks: ['onSave', 'onCancel'],
          interactions: [
            { type: 'click', selector: 'div div button:first-of-type' },
            { type: 'click', selector: 'div div button:last-of-type' },
          ],
        },
        {
          name: 'save click while disabled',
          props: { disabled: true },
          callbacks: ['onSave'],
          interactions: [{ type: 'click', selector: 'div div button:last-of-type' }],
        },
        {
          name: 'loading toggles',
          props: { savedAt: NOW - 5000 },
          now: NOW,
          callbacks: ['onSave', 'onCancel'],
          interactions: [
            { type: 'props', props: { loading: true } },
            { type: 'props', props: { loading: false, savedAt: NOW - 65_000 } },
            { type: 'props', props: { loading: true, disabled: true } },
          ],
        },
        {
          name: 'sticky toggles',
          props: { sticky: false },
          callbacks: ['onSave'],
          interactions: [
            { type: 'props', props: { sticky: true } },
            { type: 'props', props: { sticky: false } },
          ],
        },
        {
          name: 'error appears and clears',
          callbacks: ['onSave'],
          interactions: [
            { type: 'props', props: { error: 'Something went wrong' } },
            { type: 'props', props: { error: '' } },
          ],
        },
        {
          name: 'saved badge appears and clears',
          now: NOW,
          callbacks: ['onSave'],
          interactions: [
            { type: 'props', props: { savedAt: NOW - 120_000 } },
            { type: 'props', props: { savedAt: null } },
          ],
        },
      ],
    },
  ],
}

/**
 * `@molecule/app-progress-bar-react` cases: the labeled progress bar's header
 * row, size and color variants, value clamping and className passthrough, and
 * the card wrapper's title / description / icon / value-label / extras regions.
 *
 * Neither component has callback props: every branch is chosen by props alone,
 * so the interactions below change props, not clicks.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const label = [{ tag: 'strong', children: ['Storage'] }]
const valueLabel = [{ tag: 'em', children: ['50%'] }]
const title = [{ tag: 'span', attrs: { 'data-title': '' }, children: ['Budget'] }]
const description = [{ tag: 'em', children: ['8.5 GB of 10 GB'] }]
const icon = [{ tag: 'i', attrs: { 'data-icon': '' }, children: ['💾'] }]
const extras = [{ tag: 'div', attrs: { 'data-extra': '' }, children: ['Resets monthly'] }]

/** `@molecule/app-progress-bar-react`. */
export const progressBarFeature: FeatureCases = {
  package: '@molecule/app-progress-bar-react',
  families: [
    {
      component: 'ProgressBar',
      cases: [
        { name: 'value only', props: { value: 50 } },
        { name: 'label only', props: { value: 50, label: 'Storage' } },
        { name: 'value label only', props: { value: 50, valueLabel: '50%' } },
        {
          name: 'label and value label',
          props: { value: 50, label: 'Storage', valueLabel: '50%' },
        },
        {
          name: 'element label and value label',
          props: { value: 50 },
          slots: { label, valueLabel },
        },
        { name: 'small size', props: { value: 50, size: 'sm' } },
        { name: 'medium size', props: { value: 50, size: 'md' } },
        { name: 'large size', props: { value: 50, size: 'lg' } },
        { name: 'primary color', props: { value: 50, color: 'primary' } },
        { name: 'success color', props: { value: 50, color: 'success' } },
        { name: 'warning color', props: { value: 50, color: 'warning' } },
        { name: 'error color', props: { value: 50, color: 'error' } },
        { name: 'info color', props: { value: 50, color: 'info' } },
        { name: 'custom max', props: { value: 30, max: 60 } },
        { name: 'value above the maximum clamps to full', props: { value: 500 } },
        { name: 'negative value clamps to empty', props: { value: -10 } },
        { name: 'zero max renders empty', props: { value: 10, max: 0 } },
        { name: 'fractional value', props: { value: 33.3 } },
        { name: 'className passthrough', props: { value: 10, className: 'parity-token' } },
        {
          name: 'value changes',
          props: { value: 25 },
          interactions: [{ type: 'props', props: { value: 75 } }],
        },
        {
          name: 'size and color change',
          props: { value: 40, size: 'sm', color: 'success' },
          interactions: [{ type: 'props', props: { size: 'lg', color: 'error' } }],
        },
        {
          name: 'label row appears',
          props: { value: 50 },
          interactions: [{ type: 'props', props: { label: 'Storage', valueLabel: '50%' } }],
        },
        {
          name: 'label row disappears',
          props: { value: 50, label: 'Storage', valueLabel: '50%' },
          interactions: [{ type: 'props', props: { label: undefined, valueLabel: undefined } }],
        },
      ],
    },
    {
      component: 'ProgressCard',
      cases: [
        { name: 'title and value', props: { title: 'Budget', value: 40 } },
        { name: 'element title', props: { value: 40 }, slots: { title } },
        { name: 'string description', props: { title: 'T', value: 40, description: 'desc-x' } },
        {
          name: 'description and icon',
          props: { title: 'T', value: 40 },
          slots: { description, icon },
        },
        { name: 'string icon', props: { title: 'T', value: 40, icon: '★' } },
        { name: 'value label', props: { title: 'T', value: 40, valueLabel: '40%' } },
        { name: 'element value label', props: { title: 'T', value: 40 }, slots: { valueLabel } },
        { name: 'children below the bar', props: { title: 'T', value: 40 }, children: extras },
        {
          name: 'className passthrough',
          props: { title: 'T', value: 40, className: 'parity-token' },
        },
        { name: 'custom max', props: { title: 'T', value: 30, max: 60 } },
        { name: 'warning color', props: { title: 'T', value: 85, color: 'warning' } },
        { name: 'value above the maximum', props: { title: 'T', value: 150 } },
        { name: 'zero max', props: { title: 'T', value: 10, max: 0 } },
        {
          name: 'every region',
          props: {
            title: 'Storage used',
            value: 85,
            valueLabel: '85%',
            color: 'warning',
            className: 'parity-token',
          },
          slots: { description, icon },
          children: extras,
        },
        {
          name: 'value changes',
          props: { title: 'T', value: 20 },
          interactions: [{ type: 'props', props: { value: 80 } }],
        },
        {
          name: 'description and value label appear',
          props: { title: 'T', value: 40 },
          interactions: [{ type: 'props', props: { description: 'desc-y', valueLabel: '40%' } }],
        },
        {
          name: 'description and value label disappear',
          props: { title: 'T', value: 40, description: 'desc-x', valueLabel: '40%' },
          interactions: [
            { type: 'props', props: { description: undefined, valueLabel: undefined } },
          ],
        },
      ],
    },
  ],
}

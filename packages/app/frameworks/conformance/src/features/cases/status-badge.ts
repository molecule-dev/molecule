/**
 * `@molecule/app-status-badge-react` cases: the semantic status badge (both
 * appearances, every kind, optional icon, className passthrough) and the
 * status pill (every dot color, the `dot` switch, className passthrough).
 *
 * Neither component reads a service, takes a callback or holds state, so every
 * branch is chosen by props alone; the interactions below change props and the
 * snapshots show the re-rendered DOM.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const icon = [{ tag: 'i', attrs: { 'data-icon': '' } }]

/** `@molecule/app-status-badge-react`. */
export const statusBadgeFeature: FeatureCases = {
  package: '@molecule/app-status-badge-react',
  families: [
    {
      component: 'StatusBadge',
      cases: [
        { name: 'ui appearance by default', children: ['Open'] },
        { name: 'ui appearance success', props: { kind: 'success' }, children: ['Open'] },
        { name: 'ui appearance warning', props: { kind: 'warning' }, children: ['Pending'] },
        { name: 'ui appearance error', props: { kind: 'error' }, children: ['Failed'] },
        { name: 'ui appearance info', props: { kind: 'info' }, children: ['Info'] },
        { name: 'ui appearance neutral', props: { kind: 'neutral' }, children: ['Archived'] },
        {
          name: 'uppercase pill by default',
          props: { appearance: 'uppercase-pill' },
          children: ['Open'],
        },
        {
          name: 'uppercase pill success',
          props: { kind: 'success', appearance: 'uppercase-pill' },
          children: ['Open'],
        },
        {
          name: 'uppercase pill warning',
          props: { kind: 'warning', appearance: 'uppercase-pill' },
          children: ['Pending'],
        },
        {
          name: 'uppercase pill error',
          props: { kind: 'error', appearance: 'uppercase-pill' },
          children: ['Failed'],
        },
        {
          name: 'uppercase pill info',
          props: { kind: 'info', appearance: 'uppercase-pill' },
          children: ['Info'],
        },
        {
          name: 'uppercase pill neutral',
          props: { kind: 'neutral', appearance: 'uppercase-pill' },
          children: ['Archived'],
        },
        {
          name: 'ui appearance with an icon',
          slots: { icon },
          children: ['Pending'],
        },
        {
          name: 'uppercase pill with an icon',
          props: { kind: 'warning', appearance: 'uppercase-pill' },
          slots: { icon },
          children: ['Pending'],
        },
        {
          name: 'forwards className in the ui appearance',
          props: { kind: 'success', className: 'sb-cls' },
          children: ['Open'],
        },
        {
          name: 'forwards className in the uppercase pill',
          props: { kind: 'error', appearance: 'uppercase-pill', className: 'sb-cls' },
          children: ['Failed'],
        },
        {
          name: 'element children',
          props: { kind: 'info' },
          children: [{ tag: 'strong', children: ['Info'] }],
        },
        {
          name: 'kind changes',
          props: { kind: 'success' },
          children: ['Open'],
          interactions: [{ type: 'props', props: { kind: 'error' } }],
        },
        {
          name: 'appearance changes',
          props: { kind: 'info' },
          children: ['Info'],
          interactions: [{ type: 'props', props: { appearance: 'uppercase-pill' } }],
        },
      ],
    },
    {
      component: 'StatusPill',
      cases: [
        { name: 'default dot and neutral', children: ['Pending'] },
        { name: 'success dot', props: { kind: 'success' }, children: ['Open'] },
        { name: 'warning dot', props: { kind: 'warning' }, children: ['Pending'] },
        { name: 'error dot', props: { kind: 'error' }, children: ['Failed'] },
        { name: 'info dot', props: { kind: 'info' }, children: ['Info'] },
        { name: 'neutral dot', props: { kind: 'neutral' }, children: ['Archived'] },
        { name: 'without the dot', props: { dot: false }, children: ['Pending'] },
        {
          name: 'without the dot and a kind',
          props: { kind: 'success', dot: false },
          children: ['Open'],
        },
        { name: 'forwards className', props: { className: 'sp-cls' }, children: ['Pending'] },
        {
          name: 'element children',
          props: { kind: 'warning' },
          children: [{ tag: 'em', children: ['Pending'] }],
        },
        {
          name: 'kind changes',
          props: { kind: 'success' },
          children: ['Open'],
          interactions: [{ type: 'props', props: { kind: 'error' } }],
        },
        {
          name: 'dot toggles off',
          props: { kind: 'warning' },
          children: ['Pending'],
          interactions: [{ type: 'props', props: { dot: false } }],
        },
      ],
    },
  ],
}

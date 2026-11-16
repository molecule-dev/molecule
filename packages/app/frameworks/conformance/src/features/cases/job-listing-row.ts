/**
 * `@molecule/app-job-listing-row-react` cases: the job-board listing row.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A leading logo, the way a caller fills the `leading` slot. */
const leading = [{ tag: 'span', attrs: { 'data-leading': '' }, children: ['AC'] }]

/** An actions cluster: one button, the way a caller fills the `actions` slot. */
const actions = [
  {
    tag: 'button',
    attrs: { type: 'button', 'data-actions': '' },
    children: ['Apply'],
  },
]

/** Tag chips, the way a caller fills the `tags` slot. */
const tags = [
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['Remote'] },
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['React'] },
]

/** `@molecule/app-job-listing-row-react`. */
export const jobListingRowFeature: FeatureCases = {
  package: '@molecule/app-job-listing-row-react',
  families: [
    {
      component: 'JobListingRow',
      cases: [
        { name: 'title only', props: { title: 'Senior Frontend Engineer' } },
        {
          name: 'all meta fields',
          props: {
            title: 'Backend Engineer',
            company: 'Acme Corp',
            location: 'Remote · US',
            type: 'Full-time',
            salary: '$130k–$160k',
            postedAt: '2 days ago',
          },
        },
        {
          name: 'leading, tags and actions',
          props: { title: 'Platform Engineer' },
          slots: { leading, tags, actions },
        },
        {
          name: 'node title and company',
          slots: {
            title: [{ tag: 'strong', children: ['Staff Engineer'] }],
            company: [{ tag: 'em', children: ['Globex'] }],
          },
        },
        {
          name: 'everything together',
          props: {
            title: 'Senior Frontend Engineer',
            company: 'Acme Corp',
            location: 'Remote · US',
            type: 'Full-time',
            salary: '$130k–$160k',
            postedAt: '2 days ago',
            className: 'parity-token',
          },
          slots: { leading, tags, actions },
        },
        {
          name: 'empty strings omit their branches',
          props: {
            title: 'T',
            company: '',
            location: '',
            type: '',
            salary: '',
            postedAt: '',
          },
        },
        {
          name: 'click calls onClick',
          props: { title: 'T' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="job-listing-row-open"]' }],
        },
        {
          name: 'clicking an inner control does not call onClick',
          props: { title: 'T' },
          slots: { actions, tags },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: '[data-actions]' },
            { type: 'click', selector: '[data-tag]' },
          ],
        },
        {
          name: 'clickable row forwards className',
          props: { title: 'T', className: 'parity-token' },
          callbacks: ['onClick'],
        },
        {
          name: 'props change adds meta and drops leading',
          props: { title: 'T', leading: 'AC' },
          interactions: [
            { type: 'props', props: { leading: '', company: 'Acme Corp', salary: '$120k' } },
          ],
        },
      ],
    },
  ],
}

/**
 * `@molecule/app-status-summary-react` cases: the grouped component list, the
 * overall banner derived from the worst child status (and its explicit
 * override), every status label / colour, the header and footer slots, node
 * names and the i18n keys behind each label.
 *
 * `StatusSummary` is the package's only runtime export and has no callback
 * props: every branch is chosen by props alone, so the interactions below
 * change props (statuses, the override, the slots, the whole group list) and
 * the bonded locale.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One operational and one degraded component — the worst is `degraded`. */
const apiGroup = {
  id: 'api',
  name: 'API',
  components: [
    { id: 'rest', name: 'REST API', status: 'operational' },
    { id: 'gql', name: 'GraphQL', status: 'degraded' },
  ],
}

/** A second group, carrying a component subtitle. */
const webGroup = {
  id: 'web',
  name: 'Website',
  components: [
    { id: 'site', name: 'Marketing site', status: 'operational', subtitle: '99.98% uptime' },
  ],
}

/** One component per status value. */
const allStatuses = {
  id: 'all',
  name: 'Everything',
  components: [
    { id: 'a', name: 'Alpha', status: 'operational' },
    { id: 'b', name: 'Beta', status: 'degraded' },
    { id: 'c', name: 'Gamma', status: 'partial-outage' },
    { id: 'd', name: 'Delta', status: 'major-outage' },
    { id: 'e', name: 'Epsilon', status: 'maintenance' },
  ],
}

/** One `groups` entry as a case passes it: node-valued fields are text here. */
interface GroupFixture {
  id: string
  name: string
  components: { id: string; name: string; status: string; subtitle?: string }[]
}

/** A single group whose only component carries this status. */
const oneComponent = (status: string): GroupFixture => ({
  id: 'one',
  name: 'Service',
  components: [{ id: 'svc', name: 'Service', status }],
})

/** Two components with the given statuses. */
const twoComponents = (first: string, second: string): GroupFixture => ({
  id: 'pair',
  name: 'Pair',
  components: [
    { id: 'first', name: 'First', status: first },
    { id: 'second', name: 'Second', status: second },
  ],
})

/** A group header, filling the `header` slot. */
const header = [
  { tag: 'span', attrs: { 'data-header': '' }, children: ['Last updated: 2 min ago'] },
]

/** A footer node, filling the `footer` slot. */
const footer = [
  { tag: 'div', attrs: { 'data-footer': '' }, children: ['No incidents in the last 24 hours'] },
]

/** The status labels, translated for one locale. */
const statusTranslations = {
  en: {
    status: {
      operational: 'All systems operational',
      degraded: 'Slower than usual',
      'partial-outage': 'Some services down',
      'major-outage': 'Everything is down',
      maintenance: 'Planned maintenance',
    },
  },
}

/** `@molecule/app-status-summary-react`. */
export const statusSummaryFeature: FeatureCases = {
  package: '@molecule/app-status-summary-react',
  families: [
    {
      component: 'StatusSummary',
      cases: [
        { name: 'group and component names', props: { groups: [apiGroup] } },
        {
          name: 'a subtitle and a second group',
          props: { groups: [apiGroup, webGroup] },
        },
        {
          name: 'every status label and badge colour',
          props: { groups: [allStatuses] },
        },
        {
          name: 'worst is operational when every component is operational',
          props: { groups: [oneComponent('operational')] },
        },
        {
          name: 'worst is degraded',
          props: { groups: [oneComponent('degraded')] },
        },
        {
          name: 'worst is partial outage',
          props: { groups: [oneComponent('partial-outage')] },
        },
        {
          name: 'worst is major outage',
          props: { groups: [oneComponent('major-outage')] },
        },
        {
          name: 'worst is maintenance',
          props: { groups: [oneComponent('maintenance')] },
        },
        {
          name: 'maintenance outranks operational',
          props: { groups: [twoComponents('operational', 'maintenance')] },
        },
        {
          name: 'degraded outranks maintenance',
          props: { groups: [twoComponents('maintenance', 'degraded')] },
        },
        {
          name: 'partial outage outranks degraded',
          props: { groups: [twoComponents('degraded', 'partial-outage')] },
        },
        {
          name: 'major outage outranks everything',
          props: { groups: [allStatuses, oneComponent('partial-outage')] },
        },
        {
          name: 'explicit overall status operational',
          props: { groups: [apiGroup], overallStatus: 'operational' },
        },
        {
          name: 'explicit overall status degraded',
          props: { groups: [apiGroup], overallStatus: 'degraded' },
        },
        {
          name: 'explicit overall status partial outage',
          props: { groups: [apiGroup], overallStatus: 'partial-outage' },
        },
        {
          name: 'explicit overall status major outage',
          props: { groups: [apiGroup], overallStatus: 'major-outage' },
        },
        {
          name: 'explicit overall status maintenance',
          props: { groups: [apiGroup], overallStatus: 'maintenance' },
        },
        { name: 'no groups', props: { groups: [] } },
        {
          name: 'a group with no components',
          props: { groups: [{ id: 'empty', name: 'Empty', components: [] }] },
        },
        {
          name: 'an empty subtitle is not rendered',
          props: {
            groups: [
              {
                id: 'sub',
                name: 'Sub',
                components: [{ id: 's', name: 'Service', status: 'operational', subtitle: '' }],
              },
            ],
          },
        },
        {
          name: 'node group and component names',
          props: {
            groups: [
              {
                id: 'nodes',
                name: { $nodes: [{ tag: 'strong', children: ['API'] }] },
                components: [
                  {
                    id: 'rest',
                    name: { $nodes: [{ tag: 'em', children: ['REST API'] }] },
                    status: 'operational',
                    subtitle: { $nodes: [{ tag: 'small', children: ['us-east-1'] }] },
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'header only',
          props: { groups: [apiGroup] },
          slots: { header },
        },
        {
          name: 'footer only',
          props: { groups: [apiGroup] },
          slots: { footer },
        },
        {
          name: 'header and footer',
          props: { groups: [apiGroup, webGroup] },
          slots: { header, footer },
        },
        {
          name: 'className passthrough',
          props: { groups: [apiGroup], className: 'parity-token' },
          slots: { header },
        },
        {
          name: 'translated status labels',
          props: { groups: [allStatuses] },
          context: { translations: statusTranslations },
        },
        {
          name: 'prop changes: statuses change',
          props: { groups: [oneComponent('operational')] },
          interactions: [
            { type: 'props', props: { groups: [oneComponent('degraded')] } },
            { type: 'props', props: { groups: [oneComponent('major-outage')] } },
            { type: 'props', props: { groups: [oneComponent('maintenance')] } },
          ],
        },
        {
          name: 'prop changes: the overall status override changes',
          props: { groups: [apiGroup] },
          interactions: [
            { type: 'props', props: { overallStatus: 'maintenance' } },
            { type: 'props', props: { overallStatus: 'operational' } },
            { type: 'props', props: { overallStatus: undefined } },
          ],
        },
        {
          name: 'prop changes: groups become empty',
          props: { groups: [apiGroup, webGroup] },
          slots: { header, footer },
          interactions: [{ type: 'props', props: { groups: [] } }],
        },
        {
          name: 'prop changes: a subtitle appears',
          props: {
            groups: [
              {
                id: 'sub',
                name: 'Sub',
                components: [{ id: 's', name: 'S', status: 'operational' }],
              },
            ],
          },
          interactions: [
            {
              type: 'props',
              props: {
                groups: [
                  {
                    id: 'sub',
                    name: 'Sub',
                    components: [
                      { id: 's', name: 'S', status: 'operational', subtitle: '1 region' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
}

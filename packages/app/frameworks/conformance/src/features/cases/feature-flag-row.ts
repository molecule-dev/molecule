/**
 * `@molecule/app-feature-flag-row-react` cases: the flag name + type badge +
 * key + description row with one labelled `<Switch>` per environment (and a
 * rollout-% readout for percentage flags).
 *
 * `FeatureFlagRow` is the package's only runtime export. Every case passes
 * `onToggle` (the component's required callback) through `callbacks`, and the
 * click cases assert the `(flagKey, envId, next)` call React makes.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Production / staging pair a percentage flag rolls out to. */
const percentageEnvironments = [
  { id: 'production', label: 'Production', enabled: true, rolloutPct: 25 },
  { id: 'staging', label: 'Staging', enabled: false },
]

/** Boolean flag with one enabled and one disabled environment. */
const booleanFlag = {
  key: 'new-checkout',
  name: 'New checkout',
  description: 'Redesigned checkout flow',
  type: 'boolean',
  environments: [
    { id: 'production', label: 'Production', enabled: true },
    { id: 'staging', label: 'Staging', enabled: false },
  ],
}

/** The default percentage flag (first case, so the locale-switch case derives from it). */
const percentageFlag = {
  key: 'new-checkout',
  name: 'New checkout',
  description: 'Redesigned checkout flow',
  type: 'percentage',
  environments: percentageEnvironments,
}

/** Node-valued flag name (a `{ $nodes }` marker inside the `flag` data prop). */
const nodeName = {
  $nodes: [{ tag: 'strong', attrs: { 'data-name': '' }, children: ['New checkout'] }],
}

/** Node-valued description assembled from text and an element. */
const nodeDescription = {
  $nodes: ['Redesigned ', { tag: 'em', children: ['checkout'] }, ' flow'],
}

/** Node-valued environment label. */
const nodeLabel = { $nodes: [{ tag: 'em', attrs: { 'data-label': '' }, children: ['Prod'] }] }

/** The production environment's switch in {@link percentageFlag}. */
const productionSwitch = 'button[aria-label="new-checkout in production"]'
/** The staging environment's switch in {@link percentageFlag}. */
const stagingSwitch = 'button[aria-label="new-checkout in staging"]'

/** `@molecule/app-feature-flag-row-react`. */
export const featureFlagRowFeature: FeatureCases = {
  package: '@molecule/app-feature-flag-row-react',
  families: [
    {
      component: 'FeatureFlagRow',
      cases: [
        {
          name: 'defaults',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
        },
        {
          name: 'type boolean',
          props: { flag: { ...booleanFlag, type: 'boolean' } },
          callbacks: ['onToggle'],
        },
        {
          name: 'type multivariate',
          props: { flag: { ...booleanFlag, type: 'multivariate' } },
          callbacks: ['onToggle'],
        },
        {
          name: 'type percentage',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
        },
        {
          name: 'type string',
          props: { flag: { ...booleanFlag, type: 'string' } },
          callbacks: ['onToggle'],
        },
        {
          name: 'percentage rollout of zero and a hundred',
          props: {
            flag: {
              ...percentageFlag,
              environments: [
                { id: 'dev', label: 'Dev', enabled: true, rolloutPct: 0 },
                { id: 'production', label: 'Production', enabled: true, rolloutPct: 100 },
              ],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'percentage with one environment lacking a rollout',
          props: {
            flag: {
              ...percentageFlag,
              environments: [
                { id: 'production', label: 'Production', enabled: true, rolloutPct: 50 },
                { id: 'staging', label: 'Staging', enabled: false },
              ],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'non-percentage type ignores rolloutPct',
          props: {
            flag: {
              ...booleanFlag,
              type: 'string',
              environments: [
                { id: 'production', label: 'Production', enabled: true, rolloutPct: 40 },
              ],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'no description',
          props: { flag: { ...percentageFlag, description: undefined } },
          callbacks: ['onToggle'],
        },
        {
          name: 'empty description renders no paragraph',
          props: { flag: { ...percentageFlag, description: '' } },
          callbacks: ['onToggle'],
        },
        {
          name: 'node name, description and environment label',
          props: {
            flag: {
              ...percentageFlag,
              name: nodeName,
              description: nodeDescription,
              environments: [{ id: 'production', label: nodeLabel, enabled: true, rolloutPct: 25 }],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'empty environments list',
          props: { flag: { ...percentageFlag, environments: [] } },
          callbacks: ['onToggle'],
        },
        {
          name: 'one environment',
          props: {
            flag: {
              ...booleanFlag,
              environments: [{ id: 'production', label: 'Production', enabled: false }],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'three environments',
          props: {
            flag: {
              ...booleanFlag,
              environments: [
                { id: 'development', label: 'Development', enabled: true },
                { id: 'staging', label: 'Staging', enabled: true },
                { id: 'production', label: 'Production', enabled: false },
              ],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'empty name and key',
          props: {
            flag: {
              ...booleanFlag,
              key: '',
              name: '',
              environments: [{ id: 'production', label: 'Production', enabled: true }],
            },
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'className passthrough',
          props: { flag: percentageFlag, className: 'parity-token' },
          callbacks: ['onToggle'],
        },
        {
          name: 'clicking an enabled switch reports the turn-off',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: productionSwitch }],
        },
        {
          name: 'clicking a disabled switch reports the turn-on',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: stagingSwitch }],
        },
        {
          name: 'clicking both switches reports both changes',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: stagingSwitch },
            { type: 'click', selector: productionSwitch },
          ],
        },
        {
          name: 'a switch clicked twice reports each change',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: productionSwitch },
            { type: 'click', selector: productionSwitch },
          ],
        },
        {
          name: 'enabled states change from the parent',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                flag: {
                  ...percentageFlag,
                  environments: [
                    { id: 'production', label: 'Production', enabled: false, rolloutPct: 25 },
                    { id: 'staging', label: 'Staging', enabled: true },
                  ],
                },
              },
            },
          ],
        },
        {
          name: 'the flag type changes from boolean to percentage',
          props: {
            flag: {
              ...booleanFlag,
              environments: [
                { id: 'production', label: 'Production', enabled: true, rolloutPct: 30 },
              ],
            },
          },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                flag: {
                  ...booleanFlag,
                  type: 'percentage',
                  environments: [
                    { id: 'production', label: 'Production', enabled: true, rolloutPct: 30 },
                  ],
                },
              },
            },
          ],
        },
        {
          name: 'the description is added and removed',
          props: { flag: { ...percentageFlag, description: undefined } },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'props', props: { flag: { ...percentageFlag, description: 'Now shown' } } },
            { type: 'props', props: { flag: { ...percentageFlag, description: undefined } } },
          ],
        },
        {
          name: 'the environments list is replaced',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                flag: {
                  ...percentageFlag,
                  environments: [
                    { id: 'production', label: 'Prod', enabled: false, rolloutPct: 10 },
                    { id: 'canary', label: 'Canary', enabled: true, rolloutPct: 5 },
                  ],
                },
              },
            },
          ],
        },
        {
          name: 'the flag key and name change',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                flag: {
                  ...percentageFlag,
                  key: 'old-checkout',
                  name: 'Old checkout',
                },
              },
            },
          ],
        },
        {
          name: 'a new flag object renders its own environments',
          props: { flag: percentageFlag },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                flag: {
                  ...booleanFlag,
                  environments: [{ id: 'production', label: 'Production', enabled: false }],
                },
              },
            },
            { type: 'click', selector: 'button[aria-label="new-checkout in production"]' },
          ],
        },
      ],
    },
  ],
}

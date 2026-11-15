/**
 * `@molecule/app-achievement-card-react` cases: the badge / achievement card's
 * three states (locked, in progress, earned), its labels, its node props and
 * its ClassMap + inline-style treatment.
 *
 * The card has no callback props: every branch is chosen by props alone, so
 * the interactions below change props and the bonded locale, not clicks.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['🏆'] }]
const name = [{ tag: 'strong', children: ['First Login'] }]
const description = [{ tag: 'em', children: ['Signed in for the first time.'] }]
const tier = [{ tag: 'b', children: ['Legendary'] }]

/** `@molecule/app-achievement-card-react`. */
export const achievementCardFeature: FeatureCases = {
  package: '@molecule/app-achievement-card-react',
  families: [
    {
      component: 'AchievementCard',
      cases: [
        {
          name: 'locked, name and icon only',
          props: { name: 'First Login' },
          slots: { icon },
        },
        {
          name: 'locked with an element name',
          slots: { icon, name },
        },
        {
          name: 'earned with a date',
          props: { name: 'First Login', earned: true, earnedAt: 'Jan 3, 2025' },
          slots: { icon },
        },
        {
          name: 'earned without a date',
          props: { name: 'First Login', earned: true },
          slots: { icon },
        },
        {
          name: 'in progress',
          props: { name: 'First Login', progress: { value: 3, max: 4 } },
          slots: { icon },
        },
        {
          name: 'progress over the maximum',
          props: { name: 'First Login', progress: { value: 5, max: 4 } },
          slots: { icon },
        },
        {
          name: 'progress at zero',
          props: { name: 'First Login', progress: { value: 0, max: 10 } },
          slots: { icon },
        },
        {
          name: 'description and tier',
          props: {
            name: 'First Login',
            description: 'Signed in for the first time.',
            tier: 'Legendary',
            earned: true,
            earnedAt: 'Jan 3, 2025',
          },
          slots: { icon },
        },
        {
          name: 'description and tier as nodes',
          props: { name: 'First Login' },
          slots: { icon, description, tier },
        },
        {
          name: 'custom status labels',
          props: {
            name: 'First Login',
            earned: true,
            earnedAt: 'Jan 3, 2025',
            earnedLabel: 'Unlocked',
            lockedLabel: 'Not yet',
          },
          slots: { icon },
        },
        {
          name: 'custom locked label',
          props: { name: 'First Login', lockedLabel: 'Not yet' },
          slots: { icon },
        },
        {
          name: 'className passthrough',
          props: { name: 'First Login', className: 'parity-token' },
          slots: { icon },
        },
        {
          name: 'earned then locked',
          props: { name: 'First Login', earned: true, earnedAt: 'Jan 3, 2025' },
          slots: { icon },
          interactions: [{ type: 'props', props: { earned: false } }],
        },
        {
          name: 'locked then earned',
          props: { name: 'First Login' },
          slots: { icon },
          interactions: [{ type: 'props', props: { earned: true, earnedAt: 'Jan 3, 2025' } }],
        },
        {
          name: 'labels follow a locale switch',
          props: { name: 'First Login' },
          slots: { icon },
          context: {
            translations: {
              'en-XA': { achievementCard: { earned: 'Obtenu', locked: 'Verrouillé' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}

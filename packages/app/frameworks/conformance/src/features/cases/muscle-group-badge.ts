/**
 * `@molecule/app-muscle-group-badge-react` cases: the anatomical muscle-group
 * badge — every group's glyph highlight, the default / compact variants, each
 * size, label and accent overrides, the `className` / `dataMolId` passthrough,
 * prop changes, and the translated label from the bonded i18n provider.
 *
 * The badge has no callback props: every branch is chosen by props (or the
 * bonded locale) alone, so the interactions below change props rather than
 * dispatch user events.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The twelve standard groups, in the order the React package lists them. */
const GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'fullBody',
] as const

/** `@molecule/app-muscle-group-badge-react`. */
export const muscleGroupBadgeFeature: FeatureCases = {
  package: '@molecule/app-muscle-group-badge-react',
  families: [
    {
      component: 'MuscleGroupBadge',
      cases: [
        { name: 'chest, default variant and size', props: { group: 'chest' } },
        ...GROUPS.filter((group) => group !== 'chest').map((group) => ({
          name: `${group}: its own glyph highlight`,
          props: { group },
        })),
        {
          name: 'compact variant',
          props: { group: 'chest', variant: 'compact' },
        },
        {
          name: 'explicit default variant',
          props: { group: 'chest', variant: 'default' },
        },
        {
          name: 'small size',
          props: { group: 'chest', size: 'sm' },
        },
        {
          name: 'explicit medium size',
          props: { group: 'chest', size: 'md' },
        },
        {
          name: 'large size',
          props: { group: 'chest', size: 'lg' },
        },
        {
          name: 'label override',
          props: { group: 'chest', label: 'Pecs' },
        },
        {
          name: 'empty label override',
          props: { group: 'chest', label: '' },
        },
        {
          name: 'accent color override',
          props: { group: 'chest', accentColor: 'rgb(0, 128, 0)' },
        },
        {
          name: 'named accent color override',
          props: { group: 'back', accentColor: 'rebeccapurple' },
        },
        {
          name: 'className passthrough',
          props: { group: 'chest', className: 'parity-token' },
        },
        {
          name: 'dataMolId passthrough',
          props: { group: 'chest', dataMolId: 'exercise-target' },
        },
        {
          name: 'every prop at once',
          props: {
            group: 'quads',
            variant: 'compact',
            size: 'lg',
            label: 'Quadriceps',
            accentColor: '#123456',
            dataMolId: 'exercise-target',
            className: 'parity-token',
          },
        },
        {
          name: 'label from the bonded translations',
          props: { group: 'quads' },
          context: {
            translations: {
              en: {
                'muscleGroupBadge.group': '{{name}} muscle group',
                'muscleGroupBadge.group.quads': 'Quadriceps',
              },
            },
          },
        },
        {
          name: 'label override wins over a translation',
          props: { group: 'quads', label: 'Pecs' },
          context: {
            translations: {
              en: { 'muscleGroupBadge.group.quads': 'Quadriceps' },
            },
          },
        },
        {
          name: 'default variant then compact',
          props: { group: 'chest' },
          interactions: [{ type: 'props', props: { variant: 'compact' } }],
        },
        {
          name: 'compact then default',
          props: { group: 'chest', variant: 'compact' },
          interactions: [{ type: 'props', props: { variant: 'default' } }],
        },
        {
          name: 'small then large',
          props: { group: 'chest', size: 'sm' },
          interactions: [{ type: 'props', props: { size: 'lg' } }],
        },
        {
          name: 'group changes',
          props: { group: 'chest' },
          interactions: [{ type: 'props', props: { group: 'calves' } }],
        },
        {
          name: 'label added then removed',
          props: { group: 'chest' },
          interactions: [
            { type: 'props', props: { label: 'Pecs' } },
            { type: 'props', props: { label: undefined } },
          ],
        },
        {
          name: 'accent color added then removed',
          props: { group: 'chest' },
          interactions: [
            { type: 'props', props: { accentColor: 'rgb(0, 128, 0)' } },
            { type: 'props', props: { accentColor: undefined } },
          ],
        },
        {
          name: 'className and dataMolId added then removed',
          props: { group: 'chest' },
          interactions: [
            { type: 'props', props: { className: 'parity-token', dataMolId: 'exercise-target' } },
            { type: 'props', props: { className: undefined, dataMolId: undefined } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'defaultLabelFor',
      calls: GROUPS.map((group) => [group]),
    },
  ],
}

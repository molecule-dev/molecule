/**
 * `@molecule/app-hero-metric-card-react` cases: the top-of-dashboard hero
 * metric card — a large value under a small uppercase label, with an optional
 * unit, trend chip, subtitle, right-hand progress ring or icon, a semantic (or
 * raw CSS) top-edge accent bar, an interactive button role, and a loading
 * state that replaces the value with a localized status line — plus the trend
 * chip it renders (`<HeroMetricTrendChip>`).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A progress ring, the way a caller fills the right-hand slot. */
const progressRing = [{ tag: 'span', attrs: { 'data-ring': '' }, children: ['ring'] }]

/** A leading icon (used when no progress ring is supplied). */
const icon = [{ tag: 'i', attrs: { 'data-icon': '' } }]

/** The metric's label, as a node. */
const title = [{ tag: 'strong', children: ['Total Revenue'] }]

/** The metric's value, as a node. */
const value = [{ tag: 'b', children: ['$84,320'] }]

/** The unit, as a node. */
const unit = [{ tag: 'small', children: ['USD'] }]

/** Supporting text, as a node. */
const subtitle = [{ tag: 'em', children: ['vs last month'] }]

/** An upward trend object. */
const upTrend = { direction: 'up', delta: '+12.4%' }

/** A downward trend object. */
const downTrend = { direction: 'down', delta: '-3 bpm' }

/** `@molecule/app-hero-metric-card-react`. */
export const heroMetricCardFeature: FeatureCases = {
  package: '@molecule/app-hero-metric-card-react',
  families: [
    {
      component: 'HeroMetricCard',
      cases: [
        { name: 'title and value', props: { title: 'Total Revenue', value: '$84,320' } },
        {
          name: 'title, value and unit',
          props: { title: 'Total Revenue', value: '$84,320', unit: 'USD' },
        },
        {
          name: 'title and value as nodes',
          slots: { title, value },
        },
        { name: 'an empty unit renders no span', props: { title: 'T', value: '1', unit: '' } },
        { name: 'a null unit renders nothing', props: { title: 'T', value: '1', unit: null } },
        { name: 'unit as a node', props: { title: 'T', value: '1' }, slots: { unit } },
        {
          name: 'an upward trend',
          props: { title: 'Steps', value: '9,420', trend: upTrend },
        },
        {
          name: 'a downward trend',
          props: { title: 'Resting HR', value: '58', unit: 'bpm', trend: downTrend },
        },
        { name: 'a subtitle', props: { title: 'T', value: '1', subtitle: 'vs last month' } },
        {
          name: 'subtitle as a node',
          props: { title: 'T', value: '1' },
          slots: { subtitle },
        },
        {
          name: 'the progress ring wins over the icon',
          props: { title: 'Sleep score', value: '84' },
          slots: { progressRing, icon },
        },
        { name: 'the icon alone', props: { title: 'Mood', value: ':-)' }, slots: { icon } },
        {
          name: 'everything together',
          props: {
            title: 'Total Revenue',
            value: '$84,320',
            unit: 'USD',
            trend: upTrend,
            subtitle: 'vs last month',
            accent: 'success',
            className: 'parity-token',
            dataMolId: 'hero',
          },
          slots: { progressRing },
        },
        {
          name: 'loading replaces the value and hides trend and subtitle',
          props: {
            title: 'Workout',
            value: '42 min',
            trend: upTrend,
            subtitle: 'vs last week',
            loading: true,
          },
        },
        {
          name: 'loading then ready',
          props: { title: 'Steps', value: '9,420', trend: upTrend, loading: true },
          interactions: [{ type: 'props', props: { loading: false } }],
        },
        {
          name: 'ready then loading',
          props: { title: 'Steps', value: '9,420', trend: upTrend },
          interactions: [{ type: 'props', props: { loading: true } }],
        },
        { name: 'accent primary', props: { title: 'T', value: '1', accent: 'primary' } },
        { name: 'accent success', props: { title: 'T', value: '1', accent: 'success' } },
        { name: 'accent warning', props: { title: 'T', value: '1', accent: 'warning' } },
        { name: 'accent danger', props: { title: 'T', value: '1', accent: 'danger' } },
        { name: 'accent info', props: { title: 'T', value: '1', accent: 'info' } },
        { name: 'accent neutral', props: { title: 'T', value: '1', accent: 'neutral' } },
        {
          name: 'a raw CSS accent color',
          props: { title: 'T', value: '1', accent: '#ff8800' },
        },
        {
          name: 'an empty accent renders no bar',
          props: { title: 'T', value: '1', accent: '' },
        },
        {
          name: 'the accent changes',
          props: { title: 'T', value: '1', accent: 'success' },
          interactions: [
            { type: 'props', props: { accent: 'danger' } },
            { type: 'props', props: { accent: '#ff8800' } },
            { type: 'props', props: { accent: undefined } },
          ],
        },
        {
          name: 'className and data-mol-id',
          props: { title: 'T', value: '1', className: 'parity-token', dataMolId: 'hero-card' },
        },
        {
          name: 'className and data-mol-id change',
          props: { title: 'T', value: '1', className: 'parity-token', dataMolId: 'first-id' },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'second-id' } },
            { type: 'props', props: { dataMolId: undefined } },
          ],
        },
        {
          name: 'a click calls onClick',
          props: { title: 'Vitals', value: 'OK' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'div[role="button"]' }],
        },
        {
          name: 'without onClick the card is not a button',
          props: { title: 'Vitals', value: 'OK' },
        },
        {
          name: 'Enter activates the interactive card',
          props: { title: 'Vitals', value: 'OK' },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: 'div[role="button"]', key: 'Enter' }],
        },
        {
          name: 'Space activates the interactive card',
          props: { title: 'Vitals', value: 'OK' },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: 'div[role="button"]', key: ' ' }],
        },
        {
          name: 'another key does not activate the card',
          props: { title: 'Vitals', value: 'OK' },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: 'div[role="button"]', key: 'a' }],
        },
        {
          name: 'the value, unit and subtitle change',
          props: { title: 'Steps', value: '9,420', unit: 'steps', subtitle: 'today' },
          interactions: [
            { type: 'props', props: { value: '10,002', unit: 'count', subtitle: 'yesterday' } },
          ],
        },
        {
          name: 'the trend changes direction',
          props: { title: 'Steps', value: '9,420', trend: upTrend },
          interactions: [{ type: 'props', props: { trend: downTrend } }],
        },
        {
          name: 'the loading label follows a locale switch',
          props: { title: 'Steps', value: '9,420', loading: true },
          context: {
            translations: {
              'en-XA': { 'hero-metric-card': { loading: 'Chargement de la métrique…' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        {
          name: 'the trend label follows a locale switch',
          props: { title: 'Steps', value: '9,420', trend: upTrend },
          context: {
            translations: {
              'en-XA': { 'hero-metric-card': { trend: { up: 'En hausse' } } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
    {
      component: 'HeroMetricTrendChip',
      cases: [
        { name: 'an upward trend', props: { trend: upTrend } },
        { name: 'a downward trend', props: { trend: downTrend } },
        { name: 'an empty delta', props: { trend: { direction: 'up', delta: '' } } },
        { name: 'className', props: { trend: upTrend, className: 'parity-token' } },
        {
          name: 'the delta changes',
          props: { trend: upTrend },
          interactions: [
            { type: 'props', props: { trend: { direction: 'up', delta: '+2%' } } },
            { type: 'props', props: { trend: { direction: 'up', delta: '' } } },
          ],
        },
        {
          name: 'the direction changes',
          props: { trend: upTrend },
          interactions: [{ type: 'props', props: { trend: downTrend } }],
        },
        {
          name: 'className changes',
          props: { trend: upTrend, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'the aria label follows a locale switch',
          props: { trend: upTrend },
          context: {
            translations: {
              'en-XA': { 'hero-metric-card': { trend: { up: 'En hausse' } } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        {
          name: 'the down aria label follows a locale switch',
          props: { trend: downTrend },
          context: {
            translations: {
              'en-XA': { 'hero-metric-card': { trend: { down: 'En baisse' } } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}

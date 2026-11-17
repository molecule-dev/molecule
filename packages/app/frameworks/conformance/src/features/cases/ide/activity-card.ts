/**
 * `ActivityCard` cases: every prop and branch of the inline card — the channel
 * glyph per type, the status pill per status, the summary line's fallbacks and
 * trims, the clickable card's click/hover behavior and touch target, the inert
 * card without a callback, and the labels following a locale switch.
 *
 * @module
 */

import type { Activity } from '@molecule/app-ide-panel-logic'

import type { FeatureComponentCases } from '../../spec.js'

/**
 * One captured activity.
 *
 * @param overrides - Fields over the email captured default.
 * @returns The activity.
 */
const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'a1',
  type: 'email',
  status: 'captured',
  recipient: 'ada@example.test',
  summary: 'Welcome',
  timestamp: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

/** `ActivityCard`. */
export const activityCardCases: FeatureComponentCases = {
  component: 'ActivityCard',
  cases: [
    {
      name: 'a captured email',
      props: { activity: activity() },
      callbacks: ['onActivityClick'],
    },
    {
      name: 'each channel leads with its own glyph',
      props: { activity: activity({ id: 'act-email', type: 'email' }) },
      callbacks: ['onActivityClick'],
      interactions: [
        { type: 'props', props: { activity: activity({ id: 'act-sms', type: 'sms' }) } },
        { type: 'props', props: { activity: activity({ id: 'act-push', type: 'push' }) } },
        { type: 'props', props: { activity: activity({ id: 'act-webhook', type: 'webhook' }) } },
        { type: 'props', props: { activity: activity({ id: 'act-channel', type: 'channel' }) } },
      ],
    },
    {
      name: 'each status has its own pill',
      props: { activity: activity({ status: 'captured' }) },
      callbacks: ['onActivityClick'],
      interactions: [
        { type: 'props', props: { activity: activity({ status: 'sent' }) } },
        { type: 'props', props: { activity: activity({ status: 'delivered' }) } },
        { type: 'props', props: { activity: activity({ status: 'failed' }) } },
      ],
    },
    {
      name: 'summary and recipient join with an arrow, trimmed on both sides',
      props: {
        activity: activity({
          type: 'webhook',
          summary: '  Deploy finished  ',
          recipient: '  ops@example.test  ',
        }),
      },
      callbacks: ['onActivityClick'],
      interactions: [
        // A recipient of only spaces is no recipient: the arrow goes.
        {
          type: 'props',
          props: { activity: { ...activity({ type: 'webhook' }), recipient: '   ' } },
        },
        // A summary of only spaces falls back to the type's default line.
        { type: 'props', props: { activity: { ...activity({ type: 'webhook' }), summary: '  ' } } },
      ],
    },
    {
      name: 'an activity without a summary says the type captured it',
      props: {
        activity: activity({ id: 'b2', type: 'sms', summary: undefined, recipient: undefined }),
      },
      callbacks: ['onActivityClick'],
    },
    {
      name: 'a webhook without a summary names the channel in the fallback',
      props: {
        activity: activity({
          id: 'c3',
          type: 'webhook',
          status: 'failed',
          summary: undefined,
          recipient: 'hooks.example.test',
        }),
      },
      callbacks: ['onActivityClick'],
    },
    {
      name: 'clicking the card hands the activity to onActivityClick',
      props: { activity: activity() },
      callbacks: ['onActivityClick'],
      interactions: [{ type: 'click', selector: '[data-mol-id="activity-card-a1"]' }],
    },
    {
      name: 'without a callback the card is inert and says so with the cursor',
      props: { activity: activity() },
      interactions: [
        { type: 'click', selector: '[data-mol-id="activity-card-a1"]' },
        { type: 'mouseenter', selector: '[data-mol-id="activity-card-a1"]' },
        { type: 'mouseleave', selector: '[data-mol-id="activity-card-a1"]' },
      ],
    },
    {
      name: 'a hover deepens the border until the pointer leaves',
      props: { activity: activity() },
      callbacks: ['onActivityClick'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="activity-card-a1"]' },
        { type: 'mouseleave', selector: '[data-mol-id="activity-card-a1"]' },
      ],
    },
    {
      name: 'a coarse pointer gives the clickable card a 44px touch target',
      props: { activity: activity() },
      callbacks: ['onActivityClick'],
      pointer: 'coarse',
    },
    {
      name: 'a coarse pointer without a callback gets no touch target',
      props: { activity: activity() },
      pointer: 'coarse',
    },
    {
      name: 'the labels follow a locale switch',
      props: {
        activity: activity({
          id: 'd4',
          type: 'sms',
          status: 'sent',
          summary: undefined,
          recipient: '555-0100',
        }),
      },
      callbacks: ['onActivityClick'],
      context: {
        translations: {
          fr: {
            ide: {
              activity: {
                cardAria: 'Voir l’activité capturée',
                defaultSummary: '{{type}} capturée',
                type: { sms: 'SMS' },
                status: { sent: 'Envoyé' },
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}

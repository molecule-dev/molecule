/**
 * `ActivityCard` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ActivityCard`. */
export const activityCardCases: FeatureComponentCases = {
  component: 'ActivityCard',
  cases: [
    {
      name: 'a captured email',
      props: {
        activity: {
          id: 'a1',
          type: 'email',
          status: 'captured',
          recipient: 'ada@example.test',
          summary: 'Welcome',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
      callbacks: ['onActivityClick'],
    },
  ],
}

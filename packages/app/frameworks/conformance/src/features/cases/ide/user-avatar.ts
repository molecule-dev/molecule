/**
 * `UserAvatar` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `UserAvatar`. */
export const userAvatarCases: FeatureComponentCases = {
  component: 'UserAvatar',
  cases: [{ name: 'initials from a name', props: { name: 'Ada Lovelace' } }],
}

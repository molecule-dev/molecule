/**
 * The default English label for each muscle group — the same strings
 * `@molecule/app-muscle-group-badge-react` exports, so a consumer that labels
 * buttons / menus / search filters by group gets identical text.
 *
 * @module
 */

import type { MuscleGroup } from './types.js'

/**
 * Default English label for a muscle group — the same string each group's
 * literal `t()` default surfaces. Exposed for tests and downstream consumers
 * that need to label buttons / menus / search filters by group.
 *
 * @param group - The muscle group.
 * @returns A short, capitalized English label.
 */
export function defaultLabelFor(group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return 'Chest'
    case 'back':
      return 'Back'
    case 'shoulders':
      return 'Shoulders'
    case 'biceps':
      return 'Biceps'
    case 'triceps':
      return 'Triceps'
    case 'forearms':
      return 'Forearms'
    case 'core':
      return 'Core'
    case 'glutes':
      return 'Glutes'
    case 'quads':
      return 'Quads'
    case 'hamstrings':
      return 'Hamstrings'
    case 'calves':
      return 'Calves'
    case 'fullBody':
      return 'Full body'
  }
}

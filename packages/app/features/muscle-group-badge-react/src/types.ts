/**
 * Public types for `<MuscleGroupBadge>`.
 *
 * @module
 */

/** Standard anatomical muscle groups recognized by the badge. */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'fullBody'

/** Display variant. */
export type MuscleGroupBadgeVariant = 'default' | 'compact'

/** Props for {@link MuscleGroupBadge}. */
export interface MuscleGroupBadgeProps {
  /** The muscle group represented by this badge. */
  group: MuscleGroup
  /** Override the auto-derived translated label. */
  label?: string
  /** Visual variant. */
  variant?: MuscleGroupBadgeVariant
  /** Display size. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional accent color override (CSS color). */
  accentColor?: string
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}

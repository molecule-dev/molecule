/**
 * Translation types for the course resource locale bond.
 *
 * @module
 */

/** Translation keys for the course resource locale package. */
export type ResourceCourseTranslationKey =
  | 'resourceCourse.error.courseNotFound'
  | 'resourceCourse.error.notCourseStaff'
  | 'resourceCourse.error.notEnrolled'

/** Translation record mapping course resource keys to translated strings. */
export type ResourceCourseTranslations = Record<ResourceCourseTranslationKey, string>

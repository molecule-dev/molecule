/**
 * Course resource type definitions.
 *
 * Models a learning structure consisting of courses, modules within a course,
 * module items inside each module, and per-user enrollments. Designed to back
 * LMS, language-learning, virtual-classroom, and student-portal flagships.
 *
 * @module
 */

/**
 * Roles a user may hold within a single course enrollment.
 *
 * `instructor` and `ta` are course staff and may modify course content.
 * `student` and `observer` are read-only consumers.
 */
export type EnrollmentRole = 'student' | 'instructor' | 'ta' | 'observer'

/**
 * Lifecycle states for a course enrollment.
 */
export type EnrollmentStatus = 'active' | 'invited' | 'completed' | 'dropped'

/**
 * Supported kinds for content blocks within a module.
 *
 * Concrete payload shapes are stored as opaque JSON keyed by the kind so the
 * package stays decoupled from any particular media implementation.
 */
export type ModuleItemKind = 'video' | 'reading' | 'quiz' | 'assignment'

/**
 * A course — the top-level container in the hierarchy.
 */
export interface Course {
  /** Unique identifier (UUID). */
  id: string
  /** Owning organisation when multi-tenancy is enabled, otherwise the platform org id. */
  org_id: string
  /** Human-readable course title. */
  title: string
  /** Optional rich-text description of the course. */
  description: string | null
  /** Optional URL-friendly slug, unique within an org. */
  slug: string | null
  /** Course lifecycle: `draft` is invisible to students. */
  status: 'draft' | 'published' | 'archived'
  /** ID of the user who created the course (typically the lead instructor). */
  created_by: string
  /** ISO-8601 timestamp the course was created. */
  created_at: string
  /** ISO-8601 timestamp the course was last updated. */
  updated_at: string
}

/**
 * A module — an ordered grouping of items within a course.
 */
export interface Module {
  /** Unique identifier (UUID). */
  id: string
  /** Owning course id. */
  course_id: string
  /** Human-readable module title. */
  title: string
  /** Sort order within the course; lower comes first. */
  sort_order: number
  /** ISO-8601 timestamp the module was created. */
  created_at: string
  /** ISO-8601 timestamp the module was last updated. */
  updated_at: string
}

/**
 * A module item — an individual content block (video, reading, quiz, assignment).
 *
 * The `payload` shape varies by `kind` and is stored as opaque JSON; consumers
 * are expected to validate it according to their domain (a quiz package, a
 * video package, etc.).
 */
export interface ModuleItem {
  /** Unique identifier (UUID). */
  id: string
  /** Owning module id. */
  module_id: string
  /** Kind of content block. */
  kind: ModuleItemKind
  /** Opaque payload — shape determined by `kind`. */
  payload: unknown
  /** Sort order within the module; lower comes first. */
  sort_order: number
  /** ISO-8601 timestamp the item was created. */
  created_at: string
  /** ISO-8601 timestamp the item was last updated. */
  updated_at: string
}

/**
 * An enrollment — a user's participation in a course in a given role.
 */
export interface Enrollment {
  /** Unique identifier (UUID). */
  id: string
  /** Enrolled user id. */
  user_id: string
  /** Course the user is enrolled in. */
  course_id: string
  /** Role the user holds in this course. */
  role: EnrollmentRole
  /** Enrollment lifecycle status. */
  status: EnrollmentStatus
  /** ISO-8601 timestamp the user was enrolled. */
  enrolled_at: string
  /** ISO-8601 timestamp the enrollment was last updated. */
  updated_at: string
}

/** Input shape for {@link createCourse}. */
export type CreateCourseInput = Pick<Course, 'org_id' | 'title' | 'created_by'> &
  Partial<Pick<Course, 'description' | 'slug' | 'status'>>

/** Input shape for course updates. */
export type UpdateCourseInput = Partial<Pick<Course, 'title' | 'description' | 'slug' | 'status'>>

/** Input shape for {@link createModule}. */
export type CreateModuleInput = Pick<Module, 'course_id' | 'title' | 'sort_order'>

/** Input shape for module updates. */
export type UpdateModuleInput = Partial<Pick<Module, 'title' | 'sort_order'>>

/** Input shape for {@link createModuleItem}. */
export type CreateModuleItemInput = Pick<
  ModuleItem,
  'module_id' | 'kind' | 'payload' | 'sort_order'
>

/** Input shape for module-item updates. */
export type UpdateModuleItemInput = Partial<Pick<ModuleItem, 'kind' | 'payload' | 'sort_order'>>

/** Input shape for {@link createEnrollment}. */
export type CreateEnrollmentInput = Pick<Enrollment, 'user_id' | 'course_id' | 'role'> &
  Partial<Pick<Enrollment, 'status'>>

/** Input shape for enrollment updates. */
export type UpdateEnrollmentInput = Partial<Pick<Enrollment, 'role' | 'status'>>

/**
 * Error thrown when a course referenced by id does not exist.
 *
 * Carries the requested course id and the i18n key callers should display
 * (defaults are pre-populated for the framework-default locale).
 */
export class CourseNotFoundError extends Error {
  /** Stable i18n key for this error. */
  readonly errorKey = 'resourceCourse.error.courseNotFound'
  /** The id that was looked up. */
  readonly courseId: string
  constructor(courseId: string) {
    super(`Course not found: ${courseId}`)
    this.name = 'CourseNotFoundError'
    this.courseId = courseId
  }
}

/**
 * Error thrown when a user is not course staff (instructor or active TA).
 */
export class NotCourseStaffError extends Error {
  /** Stable i18n key for this error. */
  readonly errorKey = 'resourceCourse.error.notCourseStaff'
  /** The user id whose access was denied. */
  readonly userId: string
  /** The course id access was denied to. */
  readonly courseId: string
  constructor(userId: string, courseId: string) {
    super(`User ${userId} is not staff for course ${courseId}`)
    this.name = 'NotCourseStaffError'
    this.userId = userId
    this.courseId = courseId
  }
}

/**
 * Error thrown when a user is not actively enrolled in a course.
 */
export class NotEnrolledError extends Error {
  /** Stable i18n key for this error. */
  readonly errorKey = 'resourceCourse.error.notEnrolled'
  /** The user id whose access was denied. */
  readonly userId: string
  /** The course id access was denied to. */
  readonly courseId: string
  constructor(userId: string, courseId: string) {
    super(`User ${userId} is not enrolled in course ${courseId}`)
    this.name = 'NotEnrolledError'
    this.userId = userId
    this.courseId = courseId
  }
}

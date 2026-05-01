/**
 * Course resource service — DataStore-backed CRUD plus the access helpers
 * lifted from `_lmsAccess.ts`.
 *
 * All persistence goes through the abstract `@molecule/api-database`
 * interface; no raw SQL appears here so the package works against any bonded
 * database driver.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import {
  type Course,
  CourseNotFoundError,
  type CreateCourseInput,
  type CreateEnrollmentInput,
  type CreateModuleInput,
  type CreateModuleItemInput,
  type Enrollment,
  type Module,
  type ModuleItem,
  NotCourseStaffError,
  NotEnrolledError,
  type UpdateCourseInput,
  type UpdateEnrollmentInput,
  type UpdateModuleInput,
  type UpdateModuleItemInput,
} from './types.js'

/** Database table for {@link Course} records. */
export const COURSES_TABLE = 'courses'
/** Database table for {@link Module} records. */
export const COURSE_MODULES_TABLE = 'course_modules'
/** Database table for {@link ModuleItem} records. */
export const COURSE_MODULE_ITEMS_TABLE = 'course_module_items'
/** Database table for {@link Enrollment} records. */
export const COURSE_ENROLLMENTS_TABLE = 'course_enrollments'

// ---------------------------------------------------------------------------
// Course CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new course.
 *
 * @param input - Required course fields plus optional description / slug / status.
 * @returns The persisted course record.
 */
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const result = await dbCreate<Course>(COURSES_TABLE, {
    org_id: input.org_id,
    title: input.title,
    description: input.description ?? null,
    slug: input.slug ?? null,
    status: input.status ?? 'draft',
    created_by: input.created_by,
  })
  return result.data!
}

/**
 * Reads a course by id.
 *
 * @param courseId - The course id.
 * @returns The course, or `null` when no such course exists.
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  const course = await findById<Course>(COURSES_TABLE, courseId)
  return course ?? null
}

/**
 * Reads a course by id, throwing {@link CourseNotFoundError} when missing.
 *
 * @param courseId - The course id.
 * @returns The course.
 * @throws {CourseNotFoundError} When the course does not exist.
 */
export async function requireCourse(courseId: string): Promise<Course> {
  const course = await getCourse(courseId)
  if (!course) throw new CourseNotFoundError(courseId)
  return course
}

/**
 * Updates a course.
 *
 * @param courseId - The course id.
 * @param patch - Partial fields to update.
 * @returns The updated course, or `null` when not found.
 */
export async function updateCourse(
  courseId: string,
  patch: UpdateCourseInput,
): Promise<Course | null> {
  const result = await updateById<Course>(COURSES_TABLE, courseId, patch)
  return result.data ?? null
}

/**
 * Deletes a course by id.
 *
 * @param courseId - The course id.
 * @returns `true` if a row was deleted.
 */
export async function deleteCourse(courseId: string): Promise<boolean> {
  const result = await deleteById(COURSES_TABLE, courseId)
  return (result.affected ?? 0) > 0
}

/**
 * Lists courses for an org, ordered most-recent first.
 *
 * @param orgId - The owning org id.
 * @param options - Optional pagination and status filter.
 * @param options.limit - Maximum number of results (default 20).
 * @param options.offset - Number of results to skip (default 0).
 * @param options.status - Restrict to courses with this lifecycle status.
 * @returns Paginated courses.
 */
export async function listCourses(
  orgId: string,
  options: { limit?: number; offset?: number; status?: Course['status'] } = {},
): Promise<{ data: Course[]; total: number; limit: number; offset: number }> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0
  const where = [
    { field: 'org_id', operator: '=' as const, value: orgId },
    ...(options.status ? [{ field: 'status', operator: '=' as const, value: options.status }] : []),
  ]
  const [data, total] = await Promise.all([
    findMany<Course>(COURSES_TABLE, {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    }),
    count(COURSES_TABLE, where),
  ])
  return { data, total, limit, offset }
}

// ---------------------------------------------------------------------------
// Module CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a module within a course.
 *
 * @param input - Required module fields.
 * @returns The persisted module.
 */
export async function createModule(input: CreateModuleInput): Promise<Module> {
  const result = await dbCreate<Module>(COURSE_MODULES_TABLE, {
    course_id: input.course_id,
    title: input.title,
    sort_order: input.sort_order,
  })
  return result.data!
}

/**
 * Reads a module by id.
 *
 * @param moduleId - The module id.
 * @returns The module, or `null` when missing.
 */
export async function getModule(moduleId: string): Promise<Module | null> {
  const module_ = await findById<Module>(COURSE_MODULES_TABLE, moduleId)
  return module_ ?? null
}

/**
 * Updates a module.
 *
 * @param moduleId - The module id.
 * @param patch - Partial fields to update.
 * @returns The updated module, or `null` when not found.
 */
export async function updateModule(
  moduleId: string,
  patch: UpdateModuleInput,
): Promise<Module | null> {
  const result = await updateById<Module>(COURSE_MODULES_TABLE, moduleId, patch)
  return result.data ?? null
}

/**
 * Deletes a module.
 *
 * @param moduleId - The module id.
 * @returns `true` if a row was deleted.
 */
export async function deleteModule(moduleId: string): Promise<boolean> {
  const result = await deleteById(COURSE_MODULES_TABLE, moduleId)
  return (result.affected ?? 0) > 0
}

/**
 * Lists modules for a course in `sort_order` ascending.
 *
 * @param courseId - The owning course id.
 * @returns The modules.
 */
export async function listModules(courseId: string): Promise<Module[]> {
  return findMany<Module>(COURSE_MODULES_TABLE, {
    where: [{ field: 'course_id', operator: '=', value: courseId }],
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })
}

// ---------------------------------------------------------------------------
// Module Item CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a module item.
 *
 * @param input - Required module-item fields.
 * @returns The persisted module item.
 */
export async function createModuleItem(input: CreateModuleItemInput): Promise<ModuleItem> {
  const result = await dbCreate<ModuleItem>(COURSE_MODULE_ITEMS_TABLE, {
    module_id: input.module_id,
    kind: input.kind,
    payload: input.payload,
    sort_order: input.sort_order,
  })
  return result.data!
}

/**
 * Reads a module item by id.
 *
 * @param itemId - The item id.
 * @returns The module item, or `null` when missing.
 */
export async function getModuleItem(itemId: string): Promise<ModuleItem | null> {
  const item = await findById<ModuleItem>(COURSE_MODULE_ITEMS_TABLE, itemId)
  return item ?? null
}

/**
 * Updates a module item.
 *
 * @param itemId - The item id.
 * @param patch - Partial fields to update.
 * @returns The updated module item, or `null` when not found.
 */
export async function updateModuleItem(
  itemId: string,
  patch: UpdateModuleItemInput,
): Promise<ModuleItem | null> {
  const result = await updateById<ModuleItem>(COURSE_MODULE_ITEMS_TABLE, itemId, patch)
  return result.data ?? null
}

/**
 * Deletes a module item.
 *
 * @param itemId - The item id.
 * @returns `true` if a row was deleted.
 */
export async function deleteModuleItem(itemId: string): Promise<boolean> {
  const result = await deleteById(COURSE_MODULE_ITEMS_TABLE, itemId)
  return (result.affected ?? 0) > 0
}

/**
 * Lists module items for a module in `sort_order` ascending.
 *
 * @param moduleId - The owning module id.
 * @returns The module items.
 */
export async function listModuleItems(moduleId: string): Promise<ModuleItem[]> {
  return findMany<ModuleItem>(COURSE_MODULE_ITEMS_TABLE, {
    where: [{ field: 'module_id', operator: '=', value: moduleId }],
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })
}

// ---------------------------------------------------------------------------
// Enrollment CRUD
// ---------------------------------------------------------------------------

/**
 * Creates an enrollment. Idempotent — when a row already exists for the
 * (`user_id`, `course_id`) pair the existing record is returned unchanged.
 *
 * @param input - Enrollment fields.
 * @returns The new or existing enrollment.
 */
export async function createEnrollment(input: CreateEnrollmentInput): Promise<Enrollment> {
  const existing = await findOne<Enrollment>(COURSE_ENROLLMENTS_TABLE, [
    { field: 'user_id', operator: '=', value: input.user_id },
    { field: 'course_id', operator: '=', value: input.course_id },
  ])
  if (existing) return existing
  const result = await dbCreate<Enrollment>(COURSE_ENROLLMENTS_TABLE, {
    user_id: input.user_id,
    course_id: input.course_id,
    role: input.role,
    status: input.status ?? 'active',
  })
  return result.data!
}

/**
 * Updates an enrollment.
 *
 * @param enrollmentId - The enrollment id.
 * @param patch - Partial fields to update.
 * @returns The updated enrollment, or `null` when not found.
 */
export async function updateEnrollment(
  enrollmentId: string,
  patch: UpdateEnrollmentInput,
): Promise<Enrollment | null> {
  const result = await updateById<Enrollment>(COURSE_ENROLLMENTS_TABLE, enrollmentId, patch)
  return result.data ?? null
}

/**
 * Deletes an enrollment by id.
 *
 * @param enrollmentId - The enrollment id.
 * @returns `true` if a row was deleted.
 */
export async function deleteEnrollment(enrollmentId: string): Promise<boolean> {
  const result = await deleteById(COURSE_ENROLLMENTS_TABLE, enrollmentId)
  return (result.affected ?? 0) > 0
}

/**
 * Reads a user's enrollment in a course (if any).
 *
 * @param userId - The user id.
 * @param courseId - The course id.
 * @returns The enrollment, or `null` when the user is not enrolled.
 */
export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  return findOne<Enrollment>(COURSE_ENROLLMENTS_TABLE, [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'course_id', operator: '=', value: courseId },
  ])
}

/**
 * Lists enrollments in a course, optionally filtered by role.
 *
 * @param courseId - The course id.
 * @param options - Optional role filter.
 * @param options.role - Restrict to enrollments with this role.
 * @param options.status - Restrict to enrollments with this lifecycle status.
 * @returns The enrollments.
 */
export async function listEnrollments(
  courseId: string,
  options: { role?: Enrollment['role']; status?: Enrollment['status'] } = {},
): Promise<Enrollment[]> {
  const where = [
    { field: 'course_id', operator: '=' as const, value: courseId },
    ...(options.role ? [{ field: 'role', operator: '=' as const, value: options.role }] : []),
    ...(options.status ? [{ field: 'status', operator: '=' as const, value: options.status }] : []),
  ]
  return findMany<Enrollment>(COURSE_ENROLLMENTS_TABLE, {
    where,
    orderBy: [{ field: 'enrolled_at', direction: 'asc' }],
  })
}

// ---------------------------------------------------------------------------
// Access helpers (lifted from _lmsAccess.ts)
// ---------------------------------------------------------------------------

/**
 * True when the user is the course's lead instructor or an active staff
 * enrollment (instructor or TA).
 *
 * @param userId - The user id.
 * @param courseId - The course id.
 * @returns Whether the user is course staff.
 */
export async function isCourseStaff(userId: string, courseId: string): Promise<boolean> {
  const course = await getCourse(courseId)
  if (!course) return false
  if (course.created_by === userId) return true
  const staff = await findOne<Enrollment>(COURSE_ENROLLMENTS_TABLE, [
    { field: 'course_id', operator: '=', value: courseId },
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'active' },
  ])
  if (!staff) return false
  return staff.role === 'instructor' || staff.role === 'ta'
}

/**
 * True when the user has any active enrollment in the course (any role).
 *
 * @param userId - The user id.
 * @param courseId - The course id.
 * @returns Whether the user is enrolled.
 */
export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await findOne<Enrollment>(COURSE_ENROLLMENTS_TABLE, [
    { field: 'course_id', operator: '=', value: courseId },
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'active' },
  ])
  return enrollment !== null
}

/**
 * Asserts the user is course staff. Throws when the course is missing or
 * the user does not hold a staff role.
 *
 * @param userId - The user id.
 * @param courseId - The course id.
 * @throws {CourseNotFoundError} When the course does not exist.
 * @throws {NotCourseStaffError} When the user is not course staff.
 */
export async function assertCourseStaff(userId: string, courseId: string): Promise<void> {
  const course = await getCourse(courseId)
  if (!course) throw new CourseNotFoundError(courseId)
  if (await isCourseStaff(userId, courseId)) return
  throw new NotCourseStaffError(userId, courseId)
}

/**
 * Asserts the user is actively enrolled in the course (any role). Throws
 * when the course is missing or the user has no active enrollment.
 *
 * @param userId - The user id.
 * @param courseId - The course id.
 * @throws {CourseNotFoundError} When the course does not exist.
 * @throws {NotEnrolledError} When the user is not enrolled.
 */
export async function assertEnrolled(userId: string, courseId: string): Promise<void> {
  const course = await getCourse(courseId)
  if (!course) throw new CourseNotFoundError(courseId)
  if (await isEnrolled(userId, courseId)) return
  throw new NotEnrolledError(userId, courseId)
}

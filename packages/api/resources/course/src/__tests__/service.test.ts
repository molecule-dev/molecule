/**
 * Unit tests for the course service.
 *
 * Mocks `@molecule/api-database` so the suite exercises business logic
 * (CRUD shapes, idempotency, access helpers) without any database bond.
 *
 * @module
 */

const {
  mockCount,
  mockCreate,
  mockDeleteById,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockUpdateById,
} = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteById: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  assertCourseStaff,
  assertEnrolled,
  COURSE_ENROLLMENTS_TABLE,
  COURSE_MODULE_ITEMS_TABLE,
  COURSE_MODULES_TABLE,
  COURSES_TABLE,
  createCourse,
  createEnrollment,
  createModule,
  createModuleItem,
  deleteCourse,
  getCourse,
  getEnrollment,
  isCourseStaff,
  isEnrolled,
  listCourses,
  listEnrollments,
  listModuleItems,
  listModules,
  requireCourse,
  updateCourse,
  updateEnrollment,
  updateModule,
  updateModuleItem,
} from '../service.js'
import { CourseNotFoundError, NotCourseStaffError, NotEnrolledError } from '../types.js'

const ORG_ID = 'org-1'
const COURSE_ID = 'course-1'
const USER_ID = 'user-1'
const INSTRUCTOR_ID = 'instructor-1'

function aCourse(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: COURSE_ID,
    org_id: ORG_ID,
    title: 'Algebra 101',
    description: null,
    slug: null,
    status: 'draft',
    created_by: INSTRUCTOR_ID,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function anEnrollment(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'enr-1',
    user_id: USER_ID,
    course_id: COURSE_ID,
    role: 'student',
    status: 'active',
    enrolled_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

describe('@molecule/api-resource-course service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('table constants', () => {
    it('exports stable table names', () => {
      expect(COURSES_TABLE).toBe('courses')
      expect(COURSE_MODULES_TABLE).toBe('course_modules')
      expect(COURSE_MODULE_ITEMS_TABLE).toBe('course_module_items')
      expect(COURSE_ENROLLMENTS_TABLE).toBe('course_enrollments')
    })
  })

  describe('course CRUD', () => {
    it('createCourse defaults description/slug to null and status to draft', async () => {
      mockCreate.mockResolvedValue({ data: aCourse(), affected: 1 })
      const created = await createCourse({
        org_id: ORG_ID,
        title: 'Algebra 101',
        created_by: INSTRUCTOR_ID,
      })
      expect(mockCreate).toHaveBeenCalledWith(COURSES_TABLE, {
        org_id: ORG_ID,
        title: 'Algebra 101',
        description: null,
        slug: null,
        status: 'draft',
        created_by: INSTRUCTOR_ID,
      })
      expect(created.id).toBe(COURSE_ID)
    })

    it('createCourse honors provided optional fields', async () => {
      mockCreate.mockResolvedValue({ data: aCourse({ status: 'published' }), affected: 1 })
      await createCourse({
        org_id: ORG_ID,
        title: 'Bio 200',
        created_by: INSTRUCTOR_ID,
        description: 'Intro biology',
        slug: 'bio-200',
        status: 'published',
      })
      expect(mockCreate).toHaveBeenCalledWith(COURSES_TABLE, {
        org_id: ORG_ID,
        title: 'Bio 200',
        description: 'Intro biology',
        slug: 'bio-200',
        status: 'published',
        created_by: INSTRUCTOR_ID,
      })
    })

    it('getCourse returns null when missing', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await getCourse(COURSE_ID)).toBeNull()
    })

    it('getCourse returns the course', async () => {
      mockFindById.mockResolvedValue(aCourse())
      const course = await getCourse(COURSE_ID)
      expect(course?.id).toBe(COURSE_ID)
    })

    it('requireCourse throws CourseNotFoundError when missing', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(requireCourse(COURSE_ID)).rejects.toBeInstanceOf(CourseNotFoundError)
    })

    it('requireCourse returns when found', async () => {
      mockFindById.mockResolvedValue(aCourse())
      await expect(requireCourse(COURSE_ID)).resolves.toMatchObject({ id: COURSE_ID })
    })

    it('updateCourse returns null when not found', async () => {
      mockUpdateById.mockResolvedValue({ data: null, affected: 0 })
      expect(await updateCourse(COURSE_ID, { title: 'New' })).toBeNull()
    })

    it('updateCourse returns the updated course', async () => {
      mockUpdateById.mockResolvedValue({ data: aCourse({ title: 'New' }), affected: 1 })
      const updated = await updateCourse(COURSE_ID, { title: 'New' })
      expect(updated?.title).toBe('New')
      expect(mockUpdateById).toHaveBeenCalledWith(COURSES_TABLE, COURSE_ID, { title: 'New' })
    })

    it('deleteCourse returns true when a row was deleted', async () => {
      mockDeleteById.mockResolvedValue({ data: null, affected: 1 })
      expect(await deleteCourse(COURSE_ID)).toBe(true)
    })

    it('deleteCourse returns false when no row matched', async () => {
      mockDeleteById.mockResolvedValue({ data: null, affected: 0 })
      expect(await deleteCourse(COURSE_ID)).toBe(false)
    })

    it('listCourses paginates and filters by status when provided', async () => {
      mockFindMany.mockResolvedValue([aCourse()])
      mockCount.mockResolvedValue(1)
      const result = await listCourses(ORG_ID, { status: 'published', limit: 5, offset: 10 })
      expect(result).toEqual({ data: [aCourse()], total: 1, limit: 5, offset: 10 })
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.where).toEqual([
        { field: 'org_id', operator: '=', value: ORG_ID },
        { field: 'status', operator: '=', value: 'published' },
      ])
      expect(options.limit).toBe(5)
      expect(options.offset).toBe(10)
    })

    it('listCourses defaults pagination and omits status filter when absent', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const result = await listCourses(ORG_ID)
      expect(result).toEqual({ data: [], total: 0, limit: 20, offset: 0 })
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.where).toEqual([{ field: 'org_id', operator: '=', value: ORG_ID }])
    })
  })

  describe('module + module-item CRUD', () => {
    it('createModule writes the module row', async () => {
      mockCreate.mockResolvedValue({ data: { id: 'mod-1' }, affected: 1 })
      await createModule({ course_id: COURSE_ID, title: 'Week 1', sort_order: 0 })
      expect(mockCreate).toHaveBeenCalledWith(COURSE_MODULES_TABLE, {
        course_id: COURSE_ID,
        title: 'Week 1',
        sort_order: 0,
      })
    })

    it('updateModule returns null when not found', async () => {
      mockUpdateById.mockResolvedValue({ data: null, affected: 0 })
      expect(await updateModule('mod-1', { title: 'x' })).toBeNull()
    })

    it('listModules orders by sort_order asc', async () => {
      mockFindMany.mockResolvedValue([])
      await listModules(COURSE_ID)
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.orderBy).toEqual([{ field: 'sort_order', direction: 'asc' }])
    })

    it('createModuleItem stores opaque payload by kind', async () => {
      mockCreate.mockResolvedValue({ data: { id: 'item-1' }, affected: 1 })
      const payload = { url: 'https://example.com/video.mp4' }
      await createModuleItem({
        module_id: 'mod-1',
        kind: 'video',
        payload,
        sort_order: 0,
      })
      expect(mockCreate).toHaveBeenCalledWith(COURSE_MODULE_ITEMS_TABLE, {
        module_id: 'mod-1',
        kind: 'video',
        payload,
        sort_order: 0,
      })
    })

    it('updateModuleItem patches fields', async () => {
      mockUpdateById.mockResolvedValue({ data: { id: 'item-1' }, affected: 1 })
      await updateModuleItem('item-1', { sort_order: 5 })
      expect(mockUpdateById).toHaveBeenCalledWith(COURSE_MODULE_ITEMS_TABLE, 'item-1', {
        sort_order: 5,
      })
    })

    it('listModuleItems orders by sort_order asc', async () => {
      mockFindMany.mockResolvedValue([])
      await listModuleItems('mod-1')
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.orderBy).toEqual([{ field: 'sort_order', direction: 'asc' }])
    })
  })

  describe('enrollment CRUD', () => {
    it('createEnrollment is idempotent — returns existing row when present', async () => {
      const existing = anEnrollment()
      mockFindOne.mockResolvedValue(existing)
      const result = await createEnrollment({
        user_id: USER_ID,
        course_id: COURSE_ID,
        role: 'student',
      })
      expect(result).toBe(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('createEnrollment creates a new row when none exists', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: anEnrollment(), affected: 1 })
      await createEnrollment({
        user_id: USER_ID,
        course_id: COURSE_ID,
        role: 'student',
      })
      expect(mockCreate).toHaveBeenCalledWith(COURSE_ENROLLMENTS_TABLE, {
        user_id: USER_ID,
        course_id: COURSE_ID,
        role: 'student',
        status: 'active',
      })
    })

    it('createEnrollment honors a custom status', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: anEnrollment({ status: 'invited' }), affected: 1 })
      await createEnrollment({
        user_id: USER_ID,
        course_id: COURSE_ID,
        role: 'instructor',
        status: 'invited',
      })
      expect(mockCreate).toHaveBeenCalledWith(COURSE_ENROLLMENTS_TABLE, {
        user_id: USER_ID,
        course_id: COURSE_ID,
        role: 'instructor',
        status: 'invited',
      })
    })

    it('updateEnrollment returns null when not found', async () => {
      mockUpdateById.mockResolvedValue({ data: null, affected: 0 })
      expect(await updateEnrollment('enr-1', { role: 'ta' })).toBeNull()
    })

    it('getEnrollment looks up by user_id + course_id', async () => {
      mockFindOne.mockResolvedValue(anEnrollment())
      await getEnrollment(USER_ID, COURSE_ID)
      expect(mockFindOne).toHaveBeenCalledWith(COURSE_ENROLLMENTS_TABLE, [
        { field: 'user_id', operator: '=', value: USER_ID },
        { field: 'course_id', operator: '=', value: COURSE_ID },
      ])
    })

    it('listEnrollments filters by role and status when provided', async () => {
      mockFindMany.mockResolvedValue([])
      await listEnrollments(COURSE_ID, { role: 'ta', status: 'active' })
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.where).toEqual([
        { field: 'course_id', operator: '=', value: COURSE_ID },
        { field: 'role', operator: '=', value: 'ta' },
        { field: 'status', operator: '=', value: 'active' },
      ])
    })

    it('listEnrollments without filters only filters by course_id', async () => {
      mockFindMany.mockResolvedValue([])
      await listEnrollments(COURSE_ID)
      const [, options] = mockFindMany.mock.calls[0] as [string, Record<string, unknown>]
      expect(options.where).toEqual([{ field: 'course_id', operator: '=', value: COURSE_ID }])
    })
  })

  describe('isCourseStaff / isEnrolled', () => {
    it('isCourseStaff returns false when course is missing', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(false)
    })

    it('isCourseStaff returns true for the course creator', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: USER_ID }))
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(true)
      expect(mockFindOne).not.toHaveBeenCalled()
    })

    it('isCourseStaff returns true for an active instructor enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ user_id: USER_ID, role: 'instructor' }))
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(true)
    })

    it('isCourseStaff returns true for an active TA enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ user_id: USER_ID, role: 'ta' }))
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(true)
    })

    it('isCourseStaff returns false for a student enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ role: 'student' }))
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(false)
    })

    it('isCourseStaff returns false for an observer enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ role: 'observer' }))
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(false)
    })

    it('isCourseStaff returns false when no enrollment exists and the user is not the creator', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(null)
      expect(await isCourseStaff(USER_ID, COURSE_ID)).toBe(false)
    })

    it('isEnrolled returns true for an active enrollment', async () => {
      mockFindOne.mockResolvedValue(anEnrollment())
      expect(await isEnrolled(USER_ID, COURSE_ID)).toBe(true)
    })

    it('isEnrolled returns false when no active enrollment exists', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await isEnrolled(USER_ID, COURSE_ID)).toBe(false)
    })
  })

  describe('assertCourseStaff', () => {
    it('throws CourseNotFoundError when the course is missing', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(assertCourseStaff(USER_ID, COURSE_ID)).rejects.toBeInstanceOf(
        CourseNotFoundError,
      )
    })

    it('resolves silently when the user is the course creator', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: USER_ID }))
      await expect(assertCourseStaff(USER_ID, COURSE_ID)).resolves.toBeUndefined()
    })

    it('resolves silently for an active TA enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ role: 'ta' }))
      await expect(assertCourseStaff(USER_ID, COURSE_ID)).resolves.toBeUndefined()
    })

    it('throws NotCourseStaffError for a student', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ role: 'student' }))
      await expect(assertCourseStaff(USER_ID, COURSE_ID)).rejects.toBeInstanceOf(
        NotCourseStaffError,
      )
    })

    it('throws NotCourseStaffError when there is no enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(null)
      await expect(assertCourseStaff(USER_ID, COURSE_ID)).rejects.toBeInstanceOf(
        NotCourseStaffError,
      )
    })
  })

  describe('assertEnrolled', () => {
    it('throws CourseNotFoundError when the course is missing', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(assertEnrolled(USER_ID, COURSE_ID)).rejects.toBeInstanceOf(CourseNotFoundError)
    })

    it('resolves silently for an active enrollment in any role', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(anEnrollment({ role: 'student' }))
      await expect(assertEnrolled(USER_ID, COURSE_ID)).resolves.toBeUndefined()
    })

    it('throws NotEnrolledError when the user has no active enrollment', async () => {
      mockFindById.mockResolvedValue(aCourse({ created_by: 'someone-else' }))
      mockFindOne.mockResolvedValue(null)
      await expect(assertEnrolled(USER_ID, COURSE_ID)).rejects.toBeInstanceOf(NotEnrolledError)
    })
  })

  describe('typed errors carry context', () => {
    it('CourseNotFoundError exposes courseId and i18n key', () => {
      const err = new CourseNotFoundError(COURSE_ID)
      expect(err.courseId).toBe(COURSE_ID)
      expect(err.errorKey).toBe('resourceCourse.error.courseNotFound')
      expect(err.name).toBe('CourseNotFoundError')
    })

    it('NotCourseStaffError exposes user/course ids and i18n key', () => {
      const err = new NotCourseStaffError(USER_ID, COURSE_ID)
      expect(err.userId).toBe(USER_ID)
      expect(err.courseId).toBe(COURSE_ID)
      expect(err.errorKey).toBe('resourceCourse.error.notCourseStaff')
    })

    it('NotEnrolledError exposes user/course ids and i18n key', () => {
      const err = new NotEnrolledError(USER_ID, COURSE_ID)
      expect(err.userId).toBe(USER_ID)
      expect(err.courseId).toBe(COURSE_ID)
      expect(err.errorKey).toBe('resourceCourse.error.notEnrolled')
    })
  })
})

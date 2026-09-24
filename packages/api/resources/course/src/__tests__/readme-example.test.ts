/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import { describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import {
  assertCourseStaff,
  createCourse,
  createEnrollment,
  isEnrolled,
  NotCourseStaffError,
} from '../index.js'

describe('README @example', () => {
  it('creates a draft course, enrolls a student and refuses them staff access', async () => {
    const course = {
      id: 'course-1',
      org_id: 'org-1',
      title: 'Algebra 101',
      description: null,
      slug: null,
      status: 'draft',
      created_by: 'user-instructor',
      created_at: '2026-09-24T00:00:00.000Z',
      updated_at: '2026-09-24T00:00:00.000Z',
    }
    const enrollment = {
      id: 'enr-1',
      user_id: 'user-student',
      course_id: 'course-1',
      role: 'student',
      status: 'active',
      enrolled_at: '2026-09-24T00:00:00.000Z',
      updated_at: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.create
      .mockResolvedValueOnce({ data: course, affected: 1 })
      .mockResolvedValueOnce({ data: enrollment, affected: 1 })
    fakeStore.findOne
      .mockResolvedValueOnce(null) // not enrolled yet
      .mockResolvedValueOnce(enrollment) // isEnrolled
      .mockResolvedValueOnce(enrollment) // isCourseStaff: active student row
    fakeStore.findById.mockResolvedValue(course)

    setStore(store)

    const instructorId = 'user-instructor'
    const studentId = 'user-student'
    const created = await createCourse({
      org_id: 'org-1',
      title: 'Algebra 101',
      created_by: instructorId,
    })
    expect(created.status).toBe('draft')
    expect(fakeStore.create).toHaveBeenNthCalledWith(1, 'courses', {
      org_id: 'org-1',
      title: 'Algebra 101',
      description: null,
      slug: null,
      status: 'draft',
      created_by: 'user-instructor',
    })

    await createEnrollment({ user_id: studentId, course_id: created.id, role: 'student' })
    expect(fakeStore.create).toHaveBeenNthCalledWith(2, 'course_enrollments', {
      user_id: 'user-student',
      course_id: 'course-1',
      role: 'student',
      status: 'active',
    })
    expect(await isEnrolled(studentId, created.id)).toBe(true)

    await expect(assertCourseStaff(studentId, created.id)).rejects.toBeInstanceOf(
      NotCourseStaffError,
    )
  })
})

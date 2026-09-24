/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router with their gate middlewares and driven over HTTP. Only the postgresql
 * driver is replaced by an in-test DataStore, and the app's global auth
 * middleware by a session chosen per request.
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

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { defaultGradeScale, getCourseAverage, requestHandlerMap as Grade } from '../index.js'

setStore(store)

const router = express.Router()
router.post('/grades', Grade.requireAdmin, Grade.create)
router.get('/grades', Grade.authenticate, Grade.list)
router.get('/grades/:id', Grade.authenticate, Grade.read)
router.patch('/grades/:id', Grade.requireAdmin, Grade.update)
router.delete('/grades/:id', Grade.requireAdmin, Grade.del)
router.get('/enrollments/:enrollmentId/grade-average', Grade.authenticate, Grade.courseAverage)
router.get('/users/:userId/gpa', Grade.requireSelfOrAdmin, Grade.gpa)
router.get('/users/:userId/transcript', Grade.requireSelfOrAdmin, Grade.transcript)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-admin: 1` signs in an instructor.
app.use((req, res, next) => {
  res.locals.session =
    req.header('x-test-admin') === '1'
      ? { userId: 'teacher-1', isAdmin: true }
      : { userId: 'student-1' }
  next()
})
app.use(router)

let baseUrl = ''
let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

const gradeBody = {
  enrollmentId: 'enr-1',
  assignmentId: 'asg-1',
  userId: 'student-1',
  courseId: 'course-1',
  scorePoints: 45,
  maxPoints: 50,
}

describe('README @example', () => {
  it('lets an instructor post a grade (201) with letter null when no scale is sent', async () => {
    fakeStore.create.mockImplementationOnce(
      async (_table: string, data: Record<string, unknown>) => ({
        data: { id: 'g-1', ...data },
        affected: 1,
      }),
    )

    const response = await fetch(`${baseUrl}/grades`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-admin': '1' },
      body: JSON.stringify(gradeBody),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ id: 'g-1', ...gradeBody, letter: null })
  })

  it('blocks a student from posting a grade before anything is written', async () => {
    fakeStore.create.mockClear()

    const response = await fetch(`${baseUrl}/grades`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(gradeBody),
    })

    // `requireAdmin` rejects via next(message); with no app error handler Express answers 500.
    expect(response.ok).toBe(false)
    expect(fakeStore.create).not.toHaveBeenCalled()
  })

  it('computes the course average server-side with the default scale', async () => {
    fakeStore.findMany.mockResolvedValueOnce([
      { ...gradeBody, id: 'g-1', scorePoints: 45, maxPoints: 50 },
      { ...gradeBody, id: 'g-2', assignmentId: 'asg-2', scorePoints: 45, maxPoints: 50 },
    ])

    const average = await getCourseAverage('enr-1', defaultGradeScale)

    expect(average?.averagePercent).toBe(90)
    expect(average?.letter).toBe('A-')
    expect(average?.gradeCount).toBe(2)
  })
})

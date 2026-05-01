/**
 * Grade route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/** Route array for grade CRUD plus aggregate endpoints (course average, GPA, transcript). */
export const routes = [
  { method: 'post', path: '/grades', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/grades', handler: 'list' },
  { method: 'get', path: '/grades/:id', handler: 'read' },
  { method: 'patch', path: '/grades/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/grades/:id', handler: 'del', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/enrollments/:enrollmentId/grade-average',
    handler: 'courseAverage',
  },
  { method: 'get', path: '/users/:userId/gpa', handler: 'gpa' },
  { method: 'get', path: '/users/:userId/transcript', handler: 'transcript' },
] as const

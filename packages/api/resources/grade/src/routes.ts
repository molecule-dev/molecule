/**
 * Grade route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * A grade's `userId` is the *student*, not the actor allowed to mutate it, so the
 * `update`/`del` routes are gated by the `requireAdmin` grade-management
 * authorizer (a real `requestHandlerMap` key — see `authorizers/index.ts` — so
 * the injector preserves it; the previously declared global `'authenticate'`
 * string was silently dropped by the route scanner, leaving these routes open to
 * any authenticated user, including students editing their own grades). Each
 * handler additionally re-checks authorization internally, so the gate holds even
 * if a consumer wires the routes without applying these middlewares.
 *
 * @module
 */

/** Route array for grade CRUD plus aggregate endpoints (course average, GPA, transcript). */
export const routes = [
  { method: 'post', path: '/grades', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/grades', handler: 'list' },
  { method: 'get', path: '/grades/:id', handler: 'read' },
  { method: 'patch', path: '/grades/:id', handler: 'update', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/grades/:id', handler: 'del', middlewares: ['requireAdmin'] },
  {
    method: 'get',
    path: '/enrollments/:enrollmentId/grade-average',
    handler: 'courseAverage',
  },
  { method: 'get', path: '/users/:userId/gpa', handler: 'gpa' },
  { method: 'get', path: '/users/:userId/transcript', handler: 'transcript' },
] as const

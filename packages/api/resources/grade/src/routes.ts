/**
 * Grade route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * A grade's `userId` is the *student*, not the actor allowed to mutate it, so the
 * `create`/`update`/`del` routes are gated by the `requireAdmin` grade-management
 * authorizer (a real `requestHandlerMap` key — see `authorizers/index.ts` — so
 * the injector preserves it; the previously declared global `'authenticate'`
 * string was silently dropped by the route scanner, leaving these routes open to
 * any authenticated user, including students posting/editing their own grades).
 *
 * The READ side is just as sensitive — academic records are PII (e.g.
 * FERPA-protected) — so it is gated too, never left open: `list`/`read`/
 * `courseAverage` require an authenticated session (`authenticate`) and scope
 * per-row to the caller (a student sees only their own grades; an admin sees
 * all), and the per-student `gpa`/`transcript` routes use `requireSelfOrAdmin`
 * (only the student or a grade admin). All three gate middlewares are real
 * `requestHandlerMap` keys so the injector preserves them.
 *
 * Each handler additionally re-checks authorization internally (reads
 * `res.locals.session.userId`, fails closed, and re-scopes), so the gate holds
 * even if a consumer wires the routes without applying these middlewares.
 *
 * @module
 */

/** Route array for grade CRUD plus aggregate endpoints (course average, GPA, transcript). */
export const routes = [
  { method: 'post', path: '/grades', handler: 'create', middlewares: ['requireAdmin'] },
  { method: 'get', path: '/grades', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/grades/:id', handler: 'read', middlewares: ['authenticate'] },
  { method: 'patch', path: '/grades/:id', handler: 'update', middlewares: ['requireAdmin'] },
  { method: 'delete', path: '/grades/:id', handler: 'del', middlewares: ['requireAdmin'] },
  {
    method: 'get',
    path: '/enrollments/:enrollmentId/grade-average',
    handler: 'courseAverage',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/users/:userId/gpa',
    handler: 'gpa',
    middlewares: ['requireSelfOrAdmin'],
  },
  {
    method: 'get',
    path: '/users/:userId/transcript',
    handler: 'transcript',
    middlewares: ['requireSelfOrAdmin'],
  },
] as const

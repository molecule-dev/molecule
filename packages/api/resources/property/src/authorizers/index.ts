/**
 * Property authorizers.
 *
 * Authentication and ownership are enforced **inside each mutating handler**, not
 * by route middleware alone. The `authenticate` token in `routes.ts` is a
 * convenience for stacks that wire it up, but the scaffolder may strip route
 * middleware, so handlers must fail closed on their own: every mutating handler
 * (`create`, `update`, `del`, `createUnit`, `createPhoto`, `createAmenity`) reads
 * `res.locals.session.userId` and returns 401 when it is absent. Mutations that
 * target an existing property additionally enforce `property.ownerId === userId`,
 * returning 403 otherwise, so the catalog is tenant-scoped — a user can only
 * mutate properties they created. Read routes (`list`, `read`, `listUnits`,
 * `listPhotos`, `listAmenities`) remain public.
 *
 * @module
 */

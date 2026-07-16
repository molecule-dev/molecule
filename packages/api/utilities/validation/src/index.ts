/**
 * Programmatic Zod-validation helpers for molecule API code, plus two
 * dependency-free string validators.
 *
 * - `getValidProps({ name, schema, props })` — validate resource props;
 *   throws a plain `Error` whose message lists each failure as
 *   `Name.field: message` (the convention api-resource-* handlers surface
 *   to clients).
 * - `validate(schema, data)` — parse or throw the raw `ZodError`.
 * - `safeParse(schema, data)` — non-throwing discriminated union.
 * - `isEmail(value)` / `isUuid(value)` — regex checks, no Zod involved.
 *
 * @example
 * ```ts
 * import { getValidProps, isEmail } from '@molecule/api-utilities-validation'
 * import { z } from 'zod'
 *
 * const schema = z.object({ email: z.string(), name: z.string().min(1) })
 * const requestBody: unknown = { email: 'ada@example.com', name: 'Ada' }
 *
 * const props = getValidProps({ name: 'User', schema, props: requestBody })
 * // throws Error('User.name: Too small: expected string to have >=1 characters')
 * // on bad input; returns typed props on success
 * if (!isEmail(props.email)) throw new Error('User.email: invalid')
 * ```
 *
 * @remarks
 * This is the PROGRAMMATIC validation toolkit (call it inside handlers and
 * services). For validating Express request body/params/query as middleware
 * with structured 400 responses, use `@molecule/api-middleware-validation`
 * instead — the two packages both export a `validate`, so avoid importing
 * both into one module without aliasing. Zod is a direct dependency (v4);
 * schemas you pass in must come from the same zod major.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './getValidProps.js'
export * from './isEmail.js'
export * from './isUuid.js'

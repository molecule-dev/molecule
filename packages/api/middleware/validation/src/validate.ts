/**
 * Express middleware factory for Zod-based request validation.
 *
 * @module
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodType } from 'zod'

import { t } from '@molecule/api-i18n'

import type { ValidationError, ValidationSchema } from './types.js'

/**
 * Creates an Express middleware that validates the request body, params,
 * and/or query against the provided Zod schemas.
 *
 * On success the parsed (and possibly coerced/defaulted) values replace the
 * original request properties and `next()` is called.
 *
 * On failure a `400` JSON response is returned with structured error details.
 *
 * @param schema - Object mapping request parts (`body`, `params`, `query`) to Zod schemas.
 * @returns Express middleware function.
 *
 * @example
 * ```typescript
 * import { validate } from '@molecule/api-middleware-validation'
 * import { z } from 'zod'
 *
 * router.post('/posts', validate({
 *   body: z.object({ title: z.string().min(1) }),
 *   query: z.object({ draft: z.coerce.boolean().default(false) }),
 * }), handler)
 * ```
 */
export function validate(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = []

    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body)
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as Record<string, string>
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as Record<string, string>
      }
    } catch (error) {
      if (error instanceof ZodError) {
        for (const issue of error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })
        }
        res.status(400).json({
          error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
          errors,
        })
        return
      }
      throw error
    }

    next()
  }
}

/**
 * Convenience wrapper that validates only the request body.
 *
 * @param schema - Zod schema for `req.body`.
 * @returns Express middleware function.
 */
export function validateBody<T extends ZodType>(schema: T): RequestHandler {
  return validate({ body: schema })
}

/**
 * Convenience wrapper that validates only URL params.
 *
 * @param schema - Zod schema for `req.params`.
 * @returns Express middleware function.
 */
export function validateParams<T extends ZodType>(schema: T): RequestHandler {
  return validate({ params: schema })
}

/**
 * Convenience wrapper that validates only query string parameters.
 *
 * @param schema - Zod schema for `req.query`.
 * @returns Express middleware function.
 */
export function validateQuery<T extends ZodType>(schema: T): RequestHandler {
  return validate({ query: schema })
}

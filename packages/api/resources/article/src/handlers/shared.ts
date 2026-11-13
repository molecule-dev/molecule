/**
 * Pieces every article handler shares.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import type { MoleculeResponse, Response } from '@molecule/api-resource'

/**
 * The signed-in user's id, if any.
 *
 * @param res - The response (the session is on `res.locals`).
 * @returns The user id, or undefined.
 */
export const sessionUserId = (res: MoleculeResponse): string | undefined =>
  (res.locals.session as { userId?: string } | undefined)?.userId

/**
 * Answer 401.
 *
 * @returns The structured unauthorized response.
 */
export const unauthorized = (): Response => ({
  statusCode: 401,
  body: {
    error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
    errorKey: 'resource.error.unauthorized',
  },
})

/**
 * Answer 404 for a missing article.
 *
 * @returns The structured not-found response.
 */
export const notFound = (): Response => ({
  statusCode: 404,
  body: {
    error: t('article.error.notFound', undefined, { defaultValue: 'Article not found' }),
    errorKey: 'article.error.notFound',
  },
})

/**
 * Answer 403 for a change only the author may make.
 *
 * @returns The structured forbidden response.
 */
export const forbidden = (): Response => ({
  statusCode: 403,
  body: {
    error: t('article.error.notAuthor', undefined, {
      defaultValue: 'Only the author can change this article',
    }),
    errorKey: 'article.error.notAuthor',
  },
})

/**
 * Answer 500 after logging.
 *
 * @param key - The i18n key (`article.error.*`).
 * @param fallback - The English message.
 * @returns The structured failure response.
 */
export const failed = (key: string, fallback: string): Response => ({
  statusCode: 500,
  body: { error: t(key, undefined, { defaultValue: fallback }), errorKey: key },
})

/**
 * Answer 400 for input that failed validation.
 *
 * @param issues - The schema's issues.
 * @returns The structured validation response.
 */
export const invalid = (
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Response => ({
  statusCode: 400,
  body: {
    error: issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join(', '),
    errorKey: 'article.error.validationFailed',
  },
})

/**
 * A query-string number, or undefined.
 *
 * @param value - The raw query value.
 * @returns The integer, or undefined when absent or not a number.
 */
export const queryInt = (value: unknown): number | undefined => {
  const n = parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : undefined
}

/**
 * A query-string string, or undefined.
 *
 * @param value - The raw query value.
 * @returns The trimmed string, or undefined when absent or empty.
 */
export const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/**
 * Pieces every article handler shares.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import type { MoleculeResponse } from '@molecule/api-resource'

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
 * @param res - The response.
 */
export const unauthorized = (res: MoleculeResponse): void => {
  res.status(401).json({
    error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
    errorKey: 'resource.error.unauthorized',
  })
}

/**
 * Answer 404 for a missing article.
 *
 * @param res - The response.
 */
export const notFound = (res: MoleculeResponse): void => {
  res.status(404).json({
    error: t('article.error.notFound', undefined, { defaultValue: 'Article not found' }),
    errorKey: 'article.error.notFound',
  })
}

/**
 * Answer 403 for a change only the author may make.
 *
 * @param res - The response.
 */
export const forbidden = (res: MoleculeResponse): void => {
  res.status(403).json({
    error: t('article.error.notAuthor', undefined, {
      defaultValue: 'Only the author can change this article',
    }),
    errorKey: 'article.error.notAuthor',
  })
}

/**
 * Answer 500 after logging.
 *
 * @param res - The response.
 * @param key - The i18n key (`article.error.*`).
 * @param fallback - The English message.
 */
export const failed = (res: MoleculeResponse, key: string, fallback: string): void => {
  res.status(500).json({ error: t(key, undefined, { defaultValue: fallback }), errorKey: key })
}

/**
 * Answer 400 for input that failed validation.
 *
 * @param res - The response.
 * @param issues - The schema's issues.
 */
export const invalid = (
  res: MoleculeResponse,
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): void => {
  res.status(400).json({
    error: issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join(', '),
    errorKey: 'article.error.validationFailed',
  })
}

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

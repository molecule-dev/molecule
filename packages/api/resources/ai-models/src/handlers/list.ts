/**
 * `GET /ai/models` — returns the catalog of available AI models.
 *
 * Filters the central `MODELS` list to only those whose provider is currently
 * bonded under the `'ai'` category AND are not `disabled` (a retired model is
 * never listed for selection, though `getModel` still prices it). No further
 * projection is applied — every `ModelDefinition` field is fine to expose to
 * authenticated clients today.
 *
 * Secure-by-default: this handler enforces authentication IN the handler
 * (`res.locals.session.userId`) and fails closed with `401` for an
 * unauthenticated request. It does NOT rely on the `'authenticate'` route
 * middleware alone, because the codegen that emits generated apps can strip
 * declared middleware — leaving the configured-model catalog (provider mix,
 * pricing, capabilities) disclosed to anonymous callers. The in-handler check
 * holds regardless of what happens to the route middleware.
 *
 * @module
 */

import { getAll } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { MODELS } from '../models.js'
import type { ListModelsResponse } from '../types.js'

/**
 * Returns models whose `provider` has a bond registered under the `'ai'`
 * category. When no AI providers are bonded the response is `{ models: [] }`,
 * which signals a misconfigured server rather than masking the issue.
 *
 * Fails closed with `401` when there is no authenticated session, so the model
 * catalog is never disclosed to an unauthenticated caller even if the route's
 * `'authenticate'` middleware is dropped by codegen.
 *
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const bondedProviders = new Set(getAll('ai').keys())
  const models = MODELS.filter((m) => bondedProviders.has(m.provider) && !m.disabled)
  const response: ListModelsResponse = { models: [...models] }
  res.json(response)
}

/**
 * Instantiate template handler.
 *
 * Resolves the template snapshot against caller-supplied variables and
 * returns the materialised payload. Callers are responsible for persisting
 * the payload into whatever resource the template targets.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { instantiateById } from '../service.js'
import { instantiateSchema } from '../validation.js'

/**
 * Instantiates a template by ID. The response includes the resolved
 * payload, the merged variable map, and any unresolved variable names.
 *
 * @param req - Request with `id` path param and `{ variables? }` body.
 * @param res - Response object.
 */
export async function instantiate(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id } = req.params
  if (!id) {
    res.status(400).json({
      error: t('template.error.missingId', undefined, { defaultValue: 'Template ID is required' }),
      errorKey: 'template.error.missingId',
    })
    return
  }

  const parsed = instantiateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'template.error.validationFailed' })
    return
  }

  try {
    const result = await instantiateById(id, parsed.data.variables ?? {})
    if (!result) {
      res.status(404).json({
        error: t('template.error.notFound', undefined, { defaultValue: 'Template not found' }),
        errorKey: 'template.error.notFound',
      })
      return
    }
    res.json(result)
  } catch (error) {
    logger.error('Failed to instantiate template', { userId, id, error })
    res.status(500).json({
      error: t('template.error.instantiateFailed', undefined, {
        defaultValue: 'Failed to instantiate template',
      }),
      errorKey: 'template.error.instantiateFailed',
    })
  }
}

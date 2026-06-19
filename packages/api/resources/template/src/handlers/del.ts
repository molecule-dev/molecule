/**
 * Delete template handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canEditTemplate } from '../authorizers/index.js'
import { deleteTemplate, getTemplate } from '../service.js'

/**
 * Deletes a template by ID.
 *
 * @param req - Request with `id` path param.
 * @param res - Response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  try {
    const existing = await getTemplate(id)
    if (!existing) {
      res.status(404).json({
        error: t('template.error.notFound', undefined, { defaultValue: 'Template not found' }),
        errorKey: 'template.error.notFound',
      })
      return
    }
    // Ownership is enforced HERE (not via route middleware the scaffolder may strip):
    // only the template's creator may delete it. Defense-in-depth fail-closed gate.
    if (!canEditTemplate(existing, userId)) {
      res.status(403).json({
        error: t('template.error.forbidden', undefined, {
          defaultValue: 'You do not have permission to modify this template',
        }),
        errorKey: 'template.error.forbidden',
      })
      return
    }

    const removed = await deleteTemplate(id)
    if (!removed) {
      res.status(404).json({
        error: t('template.error.notFound', undefined, { defaultValue: 'Template not found' }),
        errorKey: 'template.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete template', { userId, id, error })
    res.status(500).json({
      error: t('template.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete template',
      }),
      errorKey: 'template.error.deleteFailed',
    })
  }
}

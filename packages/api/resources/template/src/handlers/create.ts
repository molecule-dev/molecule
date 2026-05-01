/**
 * Create template handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createTemplate } from '../service.js'
import { createTemplateSchema } from '../validation.js'

/**
 * Creates a new template entry. Returns `409 Conflict` if a row already
 * exists for the same `(resourceType, slug)` pair.
 *
 * @param req - Request with creation body.
 * @param res - Response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createTemplateSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'template.error.validationFailed' })
    return
  }

  try {
    const tpl = await createTemplate({ ...parsed.data, createdBy: userId })
    res.status(201).json(tpl)
  } catch (error) {
    if ((error as { code?: string }).code === 'conflict') {
      res.status(409).json({
        error: t('template.error.conflict', undefined, {
          defaultValue: 'Template with that slug already exists',
        }),
        errorKey: 'template.error.conflict',
      })
      return
    }
    logger.error('Failed to create template', { userId, error })
    res.status(500).json({
      error: t('template.error.createFailed', undefined, {
        defaultValue: 'Failed to create template',
      }),
      errorKey: 'template.error.createFailed',
    })
  }
}

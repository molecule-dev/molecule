/**
 * Update template handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canEditTemplate } from '../authorizers/index.js'
import { getTemplate, updateTemplate } from '../service.js'
import { updateTemplateSchema } from '../validation.js'

/**
 * Updates a template's mutable fields. `version` is bumped automatically.
 *
 * @param req - Request with `id` path param and patch body.
 * @param res - Response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = updateTemplateSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'template.error.validationFailed' })
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
    // only the template's creator may edit it. Defense-in-depth fail-closed gate.
    if (!canEditTemplate(existing, userId)) {
      res.status(403).json({
        error: t('template.error.forbidden', undefined, {
          defaultValue: 'You do not have permission to modify this template',
        }),
        errorKey: 'template.error.forbidden',
      })
      return
    }

    const tpl = await updateTemplate(id, parsed.data)
    if (!tpl) {
      res.status(404).json({
        error: t('template.error.notFound', undefined, { defaultValue: 'Template not found' }),
        errorKey: 'template.error.notFound',
      })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('Failed to update template', { userId, id, error })
    res.status(500).json({
      error: t('template.error.updateFailed', undefined, {
        defaultValue: 'Failed to update template',
      }),
      errorKey: 'template.error.updateFailed',
    })
  }
}

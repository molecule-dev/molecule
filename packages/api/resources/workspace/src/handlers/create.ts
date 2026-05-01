/**
 * Create workspace handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createWorkspace } from '../service.js'
import { createWorkspaceSchema } from '../validation.js'

/**
 * Creates a new workspace owned by the current user.
 *
 * @param req - The request with the workspace creation body (`name`, optional `slug`).
 * @param res - The response object.
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

  const parsed = createWorkspaceSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'workspace.error.validationFailed' })
    return
  }

  try {
    const workspace = await createWorkspace(userId, parsed.data)
    res.status(201).json(workspace)
  } catch (error) {
    logger.error('Failed to create workspace', { userId, error })
    res.status(500).json({
      error: t('workspace.error.createFailed', undefined, {
        defaultValue: 'Failed to create workspace',
      }),
      errorKey: 'workspace.error.createFailed',
    })
  }
}

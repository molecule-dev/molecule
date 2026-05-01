/**
 * Update workspace handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { assertMember, updateWorkspace } from '../service.js'
import { updateWorkspaceSchema } from '../validation.js'

/**
 * Updates a workspace's mutable fields. Caller must be at least an admin.
 *
 * @param req - The request with `:id` param and patch body.
 * @param res - The response object.
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
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  const parsed = updateWorkspaceSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'workspace.error.validationFailed' })
    return
  }

  try {
    await assertMember(id, userId, 'admin')
    const workspace = await updateWorkspace(id, parsed.data)
    res.json(workspace)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Insufficient role for this workspace' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to update workspace', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.updateFailed', undefined, {
        defaultValue: 'Failed to update workspace',
      }),
      errorKey: 'workspace.error.updateFailed',
    })
  }
}

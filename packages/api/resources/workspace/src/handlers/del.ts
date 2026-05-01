/**
 * Delete workspace handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { assertMember, deleteWorkspace } from '../service.js'

/**
 * Soft-deletes a workspace. Caller must be the owner.
 *
 * @param req - The request with `:id` param.
 * @param res - The response object.
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
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  try {
    await assertMember(id, userId, 'owner')
    await deleteWorkspace(id)
    res.status(204).end()
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Only the owner can delete the workspace' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to delete workspace', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete workspace',
      }),
      errorKey: 'workspace.error.deleteFailed',
    })
  }
}

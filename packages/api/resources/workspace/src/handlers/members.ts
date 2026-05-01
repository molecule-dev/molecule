/**
 * Workspace member handlers.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { assertMember, listMembers, removeMember, updateMemberRole } from '../service.js'
import { updateMemberRoleSchema } from '../validation.js'

/**
 * Lists members of a workspace. Caller must be a member.
 *
 * @param req - The request with `:id` (workspace id) param.
 * @param res - The response object.
 */
export async function listAll(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    await assertMember(id, userId)
    const members = await listMembers(id)
    res.json({ data: members })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Not a member of this workspace' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to list members', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.listMembersFailed', undefined, {
        defaultValue: 'Failed to list members',
      }),
      errorKey: 'workspace.error.listMembersFailed',
    })
  }
}

/**
 * Updates a member's role. Caller must be at least an admin.
 *
 * @param req - The request with `:id` (workspace) and `:userId` params and body `{ role }`.
 * @param res - The response object.
 */
export async function updateRole(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const callerId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!callerId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id, userId } = req.params
  if (!id || !userId) {
    res.status(400).json({
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  const parsed = updateMemberRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'workspace.error.validationFailed' })
    return
  }

  try {
    await assertMember(id, callerId, 'admin')
    const member = await updateMemberRole(id, userId, parsed.data.role)
    res.json(member)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Insufficient role for this workspace' }),
        errorKey: code,
      })
      return
    }
    if (code === 'workspace.error.lastOwner') {
      res.status(409).json({
        error: t(code, undefined, { defaultValue: 'Cannot demote the last owner' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to update member role', { callerId, id, userId, error })
    res.status(500).json({
      error: t('workspace.error.updateRoleFailed', undefined, {
        defaultValue: 'Failed to update member role',
      }),
      errorKey: 'workspace.error.updateRoleFailed',
    })
  }
}

/**
 * Removes a member from a workspace. Caller must be at least an admin
 * (or removing themself). Refuses to remove the last owner.
 *
 * @param req - The request with `:id` (workspace) and `:userId` params.
 * @param res - The response object.
 */
export async function remove(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const callerId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!callerId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id, userId } = req.params
  if (!id || !userId) {
    res.status(400).json({
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  try {
    if (callerId !== userId) {
      await assertMember(id, callerId, 'admin')
    } else {
      await assertMember(id, callerId)
    }
    await removeMember(id, userId)
    res.status(204).end()
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Insufficient role for this workspace' }),
        errorKey: code,
      })
      return
    }
    if (code === 'workspace.error.lastOwner') {
      res.status(409).json({
        error: t(code, undefined, { defaultValue: 'Cannot remove the last owner' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to remove member', { callerId, id, userId, error })
    res.status(500).json({
      error: t('workspace.error.removeMemberFailed', undefined, {
        defaultValue: 'Failed to remove member',
      }),
      errorKey: 'workspace.error.removeMemberFailed',
    })
  }
}

/**
 * Workspace invite handlers.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import {
  acceptInvite as acceptInviteService,
  assertMember,
  inviteMember,
  listPendingInvites,
  revokeInvite,
} from '../service.js'
import { acceptInviteSchema, inviteMemberSchema } from '../validation.js'

/**
 * Creates a pending invite for a workspace. Caller must be at least an admin.
 *
 * @param req - The request with `:id` (workspace id) param and body `{ email, role? }`.
 * @param res - The response object.
 */
export async function invite(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = inviteMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'workspace.error.validationFailed' })
    return
  }

  try {
    const caller = await assertMember(id, userId, 'admin')
    const result = await inviteMember(id, parsed.data.email, caller.role, parsed.data.role)
    res.status(201).json(result)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Insufficient role to invite members' }),
        errorKey: code,
      })
      return
    }
    if (code === 'workspace.error.cannotGrantHigherRole') {
      res.status(403).json({
        error: t(code, undefined, {
          defaultValue: 'Cannot invite with a role higher than your own',
        }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to invite member', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.inviteFailed', undefined, {
        defaultValue: 'Failed to invite member',
      }),
      errorKey: 'workspace.error.inviteFailed',
    })
  }
}

/**
 * Lists pending invites for a workspace. Caller must be at least an admin.
 *
 * @param req - The request with `:id` (workspace id) param.
 * @param res - The response object.
 */
export async function listInvites(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    await assertMember(id, userId, 'admin')
    const invites = await listPendingInvites(id)
    res.json({ data: invites })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember' || code === 'workspace.error.insufficientRole') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Insufficient role for this workspace' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to list invites', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.listInvitesFailed', undefined, {
        defaultValue: 'Failed to list invites',
      }),
      errorKey: 'workspace.error.listInvitesFailed',
    })
  }
}

/**
 * Accepts an invite using its single-use token. The current user joins
 * the invite's workspace with the invite's role.
 *
 * @param req - The request with body `{ token }`.
 * @param res - The response object.
 */
export async function accept(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = acceptInviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('workspace.error.invalidInvite', undefined, { defaultValue: 'Invalid invite' }),
      errorKey: 'workspace.error.invalidInvite',
    })
    return
  }

  try {
    const membership = await acceptInviteService(parsed.data.token, userId)
    res.status(200).json(membership)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.invalidInvite') {
      res.status(400).json({
        error: t(code, undefined, { defaultValue: 'Invalid or expired invite' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to accept invite', { userId, error })
    res.status(500).json({
      error: t('workspace.error.acceptFailed', undefined, {
        defaultValue: 'Failed to accept invite',
      }),
      errorKey: 'workspace.error.acceptFailed',
    })
  }
}

/**
 * Revokes a pending invite. Caller must be at least an admin of the
 * workspace the invite belongs to.
 *
 * @param req - The request with `:id` (workspace) and `:inviteId` params.
 * @param res - The response object.
 */
export async function revoke(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id, inviteId } = req.params
  if (!id || !inviteId) {
    res.status(400).json({
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  try {
    await assertMember(id, userId, 'admin')
    await revokeInvite(id, inviteId)
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
    logger.error('Failed to revoke invite', { userId, id, inviteId, error })
    res.status(500).json({
      error: t('workspace.error.revokeFailed', undefined, {
        defaultValue: 'Failed to revoke invite',
      }),
      errorKey: 'workspace.error.revokeFailed',
    })
  }
}

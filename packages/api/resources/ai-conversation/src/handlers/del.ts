import { getAnalytics } from '@molecule/api-bond'
import { deleteById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { ensureProjectAccess } from '../authorizers/authUser.js'
import type { Conversation } from '../types.js'

const analytics = getAnalytics()

/**
 * Deletes ONE conversation and all its messages for a given project: the one named by
 * `?conversationId=`, when it belongs to the project. With no id it deletes the project's only
 * conversation, and answers 400 when there are several rather than guessing which to delete.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function clear(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // Defense-in-depth: fail closed even if the route middleware was dropped, so a
  // non-owner can never clear another tenant's conversation (IDOR).
  if (!(await ensureProjectAccess(req, res))) {
    return
  }

  const projectId = req.params.projectId as string
  const raw = (req.query as Record<string, unknown> | undefined)?.conversationId
  const requested = typeof raw === 'string' && raw ? raw : null

  try {
    let conversation: Conversation | null
    if (requested !== null) {
      conversation = await findOne<Conversation>('conversations', [
        { field: 'id', operator: '=', value: requested },
        { field: 'projectId', operator: '=', value: projectId },
      ])
    } else {
      const candidates = await findMany<Conversation>('conversations', {
        where: [{ field: 'projectId', operator: '=', value: projectId }],
        limit: 2,
      })
      if (candidates.length > 1) {
        res.status(400).json({
          error: t('conversation.error.idRequired'),
          errorKey: 'conversation.error.idRequired',
        })
        return
      }
      conversation = candidates[0] ?? null
    }

    if (!conversation) {
      res.status(204).end()
      return
    }

    await deleteById('conversations', conversation.id)
    analytics
      .track({
        name: 'conversation.cleared',
        properties: { projectId, conversationId: conversation.id },
      })
      .catch(() => {})
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to clear conversation', { projectId, error })
    res.status(500).json({
      error: t('conversation.error.clearFailed'),
      errorKey: 'conversation.error.clearFailed',
    })
  }
}

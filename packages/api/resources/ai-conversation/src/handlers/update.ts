import { getAnalytics } from '@molecule/api-bond'
import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { ensureProjectAccess } from '../authorizers/authUser.js'
import type { AIContext, Conversation } from '../types.js'

const analytics = getAnalytics()

/**
 * Updates a conversation's AI context (system prompt, model, tool state).
 * @param req - The request object.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // Defense-in-depth: fail closed even if a route middleware was dropped, so a
  // non-owner can never mutate another tenant's conversation context (IDOR).
  if (!(await ensureProjectAccess(req, res))) {
    return
  }

  const projectId = req.params.projectId as string
  const { aiContext } = req.body as { aiContext?: AIContext }

  try {
    const conversation = await findOne<Conversation>('conversations', [
      { field: 'projectId', operator: '=', value: projectId },
    ])

    if (!conversation) {
      res
        .status(404)
        .json({ error: t('conversation.error.notFound'), errorKey: 'conversation.error.notFound' })
      return
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }
    if (aiContext !== undefined) data.aiContext = JSON.stringify(aiContext)

    const result = await updateById<Conversation>('conversations', conversation.id, data)
    analytics
      .track({
        name: 'conversation.context_updated',
        properties: { projectId, conversationId: conversation.id },
      })
      .catch(() => {})
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update conversation', { projectId, error })
    res.status(500).json({
      error: t('conversation.error.updateFailed'),
      errorKey: 'conversation.error.updateFailed',
    })
  }
}

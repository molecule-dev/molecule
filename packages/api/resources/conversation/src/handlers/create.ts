import type { ChatMessage as AIChatMessage, ChatParams } from '@molecule/api-ai'
import { getProvider as getAIProvider } from '@molecule/api-ai'
import { getAnalytics } from '@molecule/api-bond'
import { create as dbCreate, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const analytics = getAnalytics()
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ChatMessage, Conversation, SendMessageInput } from '../types.js'

/**
 * Sends a message to a conversation and streams the AI response via SSE.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function chat(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const projectId = req.params.projectId as string
  const input = req.body as SendMessageInput

  logger.debug('Chat message received', { projectId })

  if (!input.message) {
    res.status(400).json({
      error: t('conversation.error.messageRequired'),
      errorKey: 'conversation.error.messageRequired',
    })
    return
  }

  // Find or create conversation for this project
  let conversation = await findOne<Conversation>('conversations', [
    { field: 'projectId', operator: '=', value: projectId },
  ])

  const userMessage: ChatMessage = {
    role: 'user',
    content: input.message,
    timestamp: new Date().toISOString(),
  }

  if (!conversation) {
    const result = await dbCreate<Conversation>('conversations', {
      projectId,
      messages: JSON.stringify([userMessage]),
      aiContext: JSON.stringify({}),
    })
    conversation = result.data!
  } else {
    const messages = [...conversation.messages, userMessage]
    await updateById('conversations', conversation.id, {
      messages: JSON.stringify(messages),
      updatedAt: new Date().toISOString(),
    })
    conversation.messages = messages
  }

  analytics
    .track({
      name: 'conversation.message_sent',
      properties: { projectId, conversationId: conversation.id },
    })
    .catch(() => {})

  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  // Send the conversation ID so the client can track it
  res.write(`data: ${JSON.stringify({ type: 'conversation', id: conversation.id })}\n\n`)

  const aiProvider = getAIProvider()
  if (!aiProvider) {
    logger.warn('AI provider not configured')
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: t('conversation.error.aiNotConfigured'), errorKey: 'conversation.error.aiNotConfigured' })}\n\n`,
    )
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
    return
  }

  // Build AI message history from conversation
  const aiMessages: AIChatMessage[] = conversation.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const chatParams: ChatParams = {
    messages: aiMessages,
    system: conversation.aiContext?.system,
    model: input.model,
    stream: true,
  }

  let aborted = false
  req.on?.('close', () => {
    aborted = true
  })

  let assistantText = ''
  const toolCalls: ChatMessage['toolCalls'] = []

  try {
    for await (const event of aiProvider.chat(chatParams)) {
      if (aborted) break

      switch (event.type) {
        case 'text':
          assistantText += event.content
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'tool_use':
          toolCalls!.push({
            id: event.id,
            name: event.name,
            input: event.input,
          })
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'done':
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'error':
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : t('conversation.error.unknownAiError')
    const errorKey =
      err instanceof Error ? 'conversation.error.streamError' : 'conversation.error.unknownAiError'
    logger.error('AI streaming error', { conversationId: conversation.id, error: message })
    analytics
      .track({ name: 'conversation.ai_error', properties: { conversationId: conversation.id } })
      .catch(() => {})
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ type: 'error', message, errorKey })}\n\n`)
    }
  }

  // Save assistant message to conversation
  if (assistantText || toolCalls!.length > 0) {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantText,
      timestamp: new Date().toISOString(),
      ...(toolCalls!.length > 0 ? { toolCalls } : {}),
    }
    const updatedMessages = [...conversation.messages, assistantMessage]
    await updateById('conversations', conversation.id, {
      messages: JSON.stringify(updatedMessages),
      updatedAt: new Date().toISOString(),
    })
  }

  if (!aborted) {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  }
}

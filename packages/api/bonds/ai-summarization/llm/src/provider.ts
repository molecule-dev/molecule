/**
 * Default (`llm`) AI summarization provider.
 *
 * Composes the swappable `ai` chat bond (`@molecule/api-ai`) with a summarizer
 * system prompt built from the requested format / length / focus. It has no
 * vendor of its own — whatever LLM the app bonds under `ai` powers it, so
 * summarization is prompt orchestration over the bonded model, not a separate
 * vendor integration.
 *
 * @module
 */

import {
  type AIProvider,
  type ChatParams,
  getProviderByName as getAIProviderByName,
  requireProvider as requireAIProvider,
  type TokenUsage,
} from '@molecule/api-ai'
import type {
  AISummarizationProvider,
  SummarizeInput,
  SummarizeResult,
} from '@molecule/api-ai-summarization'
import { t } from '@molecule/api-i18n'

/**
 * Collects a non-streaming chat completion into a single string + usage.
 *
 * Shared shape for AI-composed providers (summarization, translation, …):
 * iterate the provider's event stream, concatenate `text` events, capture the
 * final `done` event's usage, and surface an `error` event as a thrown error.
 *
 * @param ai - The resolved AI provider to drive.
 * @param params - Chat parameters (the caller forces non-streaming).
 * @returns The concatenated text and the final token usage (when reported).
 */
async function complete(
  ai: AIProvider,
  params: ChatParams,
): Promise<{ text: string; usage?: TokenUsage }> {
  let text = ''
  let usage: TokenUsage | undefined
  for await (const event of ai.chat(params)) {
    if (event.type === 'text') {
      text += event.content
    } else if (event.type === 'done') {
      usage = event.usage
    } else if (event.type === 'error') {
      throw new Error(
        t(
          'ai-summarization.error.aiFailed',
          { message: event.message },
          { defaultValue: 'AI summarization failed: {{message}}' },
        ),
      )
    }
  }
  return { text, usage }
}

/**
 * Builds the summarizer system prompt from the requested shape/length/focus.
 *
 * @param input - The summarize controls.
 * @returns A system prompt string for the AI chat call.
 */
function buildSystemPrompt(input: SummarizeInput): string {
  const format = input.format ?? 'paragraph'
  const shape =
    format === 'bullets'
      ? 'a concise bulleted list'
      : format === 'tldr'
        ? 'a single-sentence TL;DR'
        : 'a concise paragraph'

  const lines = [`You are an expert summarizer. Produce ${shape} summary of the user's text.`]
  if (typeof input.maxLength === 'number' && input.maxLength > 0) {
    lines.push(`Keep it to roughly ${input.maxLength} words max.`)
  }
  if (input.focus) {
    lines.push(`Focus on: ${input.focus}`)
  }
  lines.push('Return only the summary, with no preamble, labels, or commentary.')
  return lines.join('\n')
}

/**
 * Default AI summarization provider.
 *
 * Composes the bonded `ai` chat provider (`@molecule/api-ai`) — an AI provider
 * MUST be bonded first (`bond('ai', <provider>)`), or `summarize()` throws. Bond
 * it with `bond('ai-summarization', provider)`; swap in a custom
 * `AISummarizationProvider` to replace it without touching call sites.
 */
export const provider: AISummarizationProvider = {
  name: 'llm',
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const ai = input.provider ? getAIProviderByName(input.provider) : requireAIProvider()
    if (!ai) {
      throw new Error(
        t(
          'ai-summarization.error.aiProviderMissing',
          { provider: input.provider ?? '' },
          {
            defaultValue: 'AI provider "{{provider}}" is not bonded. Bond it before summarizing.',
          },
        ),
      )
    }

    const params: ChatParams = {
      messages: [{ role: 'user', content: input.text }],
      system: buildSystemPrompt(input),
      model: input.model,
      stream: false,
      signal: input.signal,
    }

    const { text, usage } = await complete(ai, params)
    return { summary: text.trim(), usage }
  },
}

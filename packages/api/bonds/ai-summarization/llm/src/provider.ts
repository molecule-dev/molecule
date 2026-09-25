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

    const sentences = input.sentences ?? (input.format === 'tldr' ? 1 : undefined)
    if (!input.maxWords && !sentences) {
      const params: ChatParams = {
        messages: [{ role: 'user', content: input.text }],
        system: buildSystemPrompt(input),
        model: input.model,
        stream: false,
        signal: input.signal,
      }
      const { text, usage } = await complete(ai, params)
      return { summary: text.trim(), usage }
    }
    return summarizeCapped(ai, input, sentences ?? 1)
  },
}

/** Words that never end a finished sentence — a summary ending on one was cut. */
const FUNCTION_WORDS = new Set(
  'a an the and or but nor of to in on at by for with from into onto as than that which who whose whom is are was were be been its their his her our your my each every this these those so if then'.split(
    ' ',
  ),
)

/**
 * Words in a string, the way a reader counts them.
 *
 * @param s - Any text.
 * @returns The number of whitespace-separated words.
 */
export function countWords(s: string): number {
  const t = s.trim()
  return t ? t.split(/\s+/).length : 0
}

/**
 * Strips what models wrap a summary in: reasoning blocks, a "TL;DR:" or
 * "Summary:" label, surrounding quotes or bold, and line breaks.
 *
 * @param raw - The model's answer.
 * @returns The bare summary text.
 */
export function cleanSummary(raw: string): string {
  let s = raw.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/^(?:\*\*)?(?:tl;?\s?dr|summary)(?:\*\*)?\s*[:\-–—]\s*/i, '')
  s = s.replace(/^(\*\*|__|["“'‘])+/, '').replace(/(\*\*|__|["”'’])+$/, '')
  // A summary is plain text: markdown the model added (`code`, **bold**, _em_,
  // [links](url)) would show literally wherever the summary is displayed.
  s = s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`/g, '')
  return s.trim()
}

/**
 * The first `n` complete sentences of a text. A trailing fragment with no
 * terminal punctuation is dropped, never kept or given a full stop.
 *
 * @param s - Cleaned summary text.
 * @param n - How many sentences to keep.
 * @returns Those sentences, or `''` when the text holds no complete sentence.
 */
export function firstSentences(s: string, n: number): string {
  const parts = s.split(/(?<=[.!?]["')\]”’]*)\s+(?=["'(“‘]?[A-Z0-9])/)
  // Only the leading run of complete sentences counts: a fragment ends it.
  const out: string[] = []
  for (const p of parts) {
    if (!/[.!?]["')\]”’]*$/.test(p) || out.length === n) break
    out.push(p)
  }
  return out.join(' ')
}

/**
 * Whether a summary meets the caps and reads as finished: at most `maxWords`
 * words, terminal punctuation, and a last word that is not a function word.
 *
 * @param s - Candidate summary.
 * @param maxWords - The hard word cap, if any.
 * @returns `true` when the summary can be published as is.
 */
export function meetsCap(s: string, maxWords?: number): boolean {
  if (!s || !/[.!?]["')\]”’]*$/.test(s)) return false
  if (maxWords && countWords(s) > maxWords) return false
  const last = s
    .replace(/[.!?"')\]”’]+$/, '')
    .split(/\s+/)
    .pop()
    ?.toLowerCase()
  return !!last && !FUNCTION_WORDS.has(last)
}

/**
 * Summarize under hard caps: ask, keep whole sentences, re-ask when it runs
 * long, and never slice a sentence to fit.
 *
 * @param ai - The resolved AI provider.
 * @param input - The request.
 * @param sentences - Sentence cap.
 * @returns The summary, whether it met the caps, the calls made and summed usage.
 */
async function summarizeCapped(
  ai: AIProvider,
  input: SummarizeInput,
  sentences: number,
): Promise<SummarizeResult> {
  const cap = input.maxWords
  const attempts = Math.max(1, input.attempts ?? 3)
  const shape = sentences === 1 ? 'one sentence' : `at most ${sentences} sentences`
  // Models treat a stated maximum as the target and land on it exactly, so ask
  // for a length well under the cap; the cap itself is enforced below.
  const target = cap ? Math.max(5, Math.round(cap * 0.7)) : undefined
  const system = [
    `Summarize the user's text in ${shape}${cap ? ` of about ${target} words (never more than ${cap})` : ''}, stating what the text does or says.`,
    input.focus ? `Focus on: ${input.focus}` : '',
    'Reply with the summary only: no preamble, no label, no quotes, no markdown.',
  ]
    .filter(Boolean)
    .join('\n')
  const messages: ChatParams['messages'] = [{ role: 'user', content: input.text }]
  const candidates: string[] = []
  let usage: TokenUsage | undefined
  for (let i = 0; i < attempts; i++) {
    // No temperature (several current models reject it) and a generous output
    // budget: a model that reasons before answering can spend a small budget
    // entirely on hidden reasoning and return no text at all.
    const r = await complete(ai, {
      messages,
      system,
      model: input.model,
      maxTokens: Math.max(2048, (cap ?? 60) * 16),
      stream: false,
      signal: input.signal,
    })
    usage = addUsage(usage, r.usage)
    const cleaned = cleanSummary(r.text)
    const kept = firstSentences(cleaned, sentences)
    if (kept) candidates.push(kept)
    if (meetsCap(kept, cap)) return { summary: kept, withinCap: true, attempts: i + 1, usage }
    messages.push({ role: 'assistant', content: cleaned || '(no answer)' })
    messages.push({
      role: 'user',
      content: kept
        ? `That is ${countWords(kept)} words. Rewrite it as ${shape}${cap ? ` of at most ${cap} words` : ''}, ending with a full stop. Reply with the summary only.`
        : `Reply with the summary only, as ${shape}${cap ? ` of at most ${cap} words` : ''}.`,
    })
  }
  // Every attempt ran long: the first single sentence that fits, else the shortest answer.
  for (const c of candidates) {
    const one = firstSentences(c, 1)
    if (meetsCap(one, cap)) return { summary: one, withinCap: true, attempts, usage }
  }
  const shortest = [...candidates].sort((a, b) => countWords(a) - countWords(b))[0]
  if (!shortest) {
    throw new Error(
      t(
        'ai-summarization.error.noText',
        { attempts },
        { defaultValue: 'The AI provider returned no usable summary after {{attempts}} attempts.' },
      ),
    )
  }
  return { summary: shortest, withinCap: false, attempts, usage }
}

/**
 * Sums two usage records.
 *
 * @param a - Running total.
 * @param b - This call's usage.
 * @returns The sum (or whichever is defined).
 */
function addUsage(a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined {
  if (!a) return b
  if (!b) return a
  return {
    ...a,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  }
}

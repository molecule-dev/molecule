/**
 * Context-usage helpers shared by every framework's chat panel: the labels of
 * the usage breakdown (the `Request composition` table) and the merge of
 * usage samples that feeds the token history chart.
 *
 * The context-usage categories come from `@molecule/app-ai-chat`'s
 * {@link ContextCategoryId} union. Their display names used to live in the
 * React component as an English table looked up as a runtime-built
 * `ide.chat.context.category.<id>` default — invisible to the i18n gate, so a
 * category with no key in the locale bond silently rendered English for every
 * non-English user. Here each category is one literal `t()` call, chosen by a
 * switch exhaustive over the union, so a category added to `app-ai-chat`
 * fails to compile until it has a label — and the gate can verify every key
 * the call can produce exists in the bond.
 *
 * @module
 */

import type { ContextCategoryId, ContextUsage } from '@molecule/app-ai-chat'
import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * The localized name of one context-usage category (the
 * `ide.chat.context.category.<id>` keys), through the CALLER's translate
 * function so a framework port and a live locale switch both get their own
 * text. One literal `t()` call per {@link ContextCategoryId}, chosen by a
 * switch exhaustive over the union: a new category in `app-ai-chat` fails to
 * compile until it has a case here.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param id - The category id.
 * @returns The localized category name.
 */
export function contextCategoryLabel(t: TranslateFunction, id: ContextCategoryId): string {
  switch (id) {
    case 'system':
      return t('ide.chat.context.category.system', undefined, {
        defaultValue: 'System instructions',
      })
    case 'summary':
      return t('ide.chat.context.category.summary', undefined, {
        defaultValue: 'Previous summary',
      })
    case 'toolDefinitions':
      return t('ide.chat.context.category.toolDefinitions', undefined, {
        defaultValue: 'Tool definitions',
      })
    case 'serverTools':
      return t('ide.chat.context.category.serverTools', undefined, {
        defaultValue: 'Provider tools',
      })
    case 'userText':
      return t('ide.chat.context.category.userText', undefined, {
        defaultValue: 'User messages',
      })
    case 'assistantText':
      return t('ide.chat.context.category.assistantText', undefined, {
        defaultValue: 'Assistant messages',
      })
    case 'reasoning':
      return t('ide.chat.context.category.reasoning', undefined, { defaultValue: 'Reasoning' })
    case 'toolCalls':
      return t('ide.chat.context.category.toolCalls', undefined, {
        defaultValue: 'Tool arguments',
      })
    case 'toolResults':
      return t('ide.chat.context.category.toolResults', undefined, {
        defaultValue: 'Tool results',
      })
    case 'images':
      return t('ide.chat.context.category.images', undefined, { defaultValue: 'Images' })
    case 'attachments':
      return t('ide.chat.context.category.attachments', undefined, {
        defaultValue: 'Attachments',
      })
    case 'structuralOverhead':
      return t('ide.chat.context.category.structuralOverhead', undefined, {
        defaultValue: 'Request structure',
      })
  }
}

/** The most samples {@link mergeContextHistory} keeps: the first one and the newest 127. */
const CONTEXT_HISTORY_LIMIT = 128

/**
 * Merges usage samples into a conversation's history without counting one
 * request twice. Samples are keyed by `requestId` (or `at` when a sample has
 * no request id; a sample with neither is dropped). A later sample for the same
 * request replaces the earlier one, so a request's final usage replaces its
 * pre-dispatch estimate, except that an estimate never replaces usage the
 * provider reported (`composition.actualInputTokens`): a slow history response
 * can arrive after the final usage it predates. The result is sorted by `at`
 * and bounded to 128 samples, keeping the first so the chart's origin survives a
 * long conversation.
 *
 * @param history - The samples already held.
 * @param incoming - The samples that just arrived.
 * @returns The merged samples, oldest first.
 *
 * @example
 * ```ts
 * setContextHistory((previous) => mergeContextHistory(previous, [effect.usage]))
 * ```
 */
export function mergeContextHistory(
  history: ContextUsage[],
  incoming: ContextUsage[],
): ContextUsage[] {
  const samples = new Map<string, ContextUsage>()
  for (const usage of [...history, ...incoming]) {
    if (!usage.requestId && !usage.at) continue
    const key = usage.requestId ?? usage.at ?? ''
    const previous = samples.get(key)
    if (
      previous?.composition?.actualInputTokens != null &&
      usage.composition?.actualInputTokens == null
    )
      continue
    samples.set(key, usage)
  }
  const result = [...samples.values()].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  return result.length > CONTEXT_HISTORY_LIMIT
    ? [result[0], ...result.slice(-(CONTEXT_HISTORY_LIMIT - 1))]
    : result
}

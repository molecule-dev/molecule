/**
 * Label helpers for the context-usage breakdown (the `Request composition`
 * table), shared by every framework's chat panel.
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

import type { ContextCategoryId } from '@molecule/app-ai-chat'
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

import { describe, expect, it } from 'vitest'

import type { ContextCategoryId } from '@molecule/app-ai-chat'
import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * {@link contextCategoryLabel} — the Request-composition table's category
 * names (the `ide.chat.context.category.<id>` keys) — travels through the
 * CALLER's translate function with a LITERAL key per category. A
 * key-returning marker translator proves those literal keys (the parity gate
 * can only check literal keys — the runtime-built
 * `ide.chat.context.category.${id}` this helper replaced was invisible to it,
 * which is how a category could miss its bond key for years), and a
 * default-returning translator proves the English name.
 *
 * @module
 */
import { contextCategoryLabel } from '../components/context-usage-utilities.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that returns the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (_key, _values, opts) => opts?.defaultValue ?? ''

/** Every category id in `@molecule/app-ai-chat`'s {@link ContextCategoryId} union. */
const CATEGORY_IDS: readonly ContextCategoryId[] = [
  'system',
  'summary',
  'toolDefinitions',
  'serverTools',
  'userText',
  'assistantText',
  'reasoning',
  'toolCalls',
  'toolResults',
  'images',
  'attachments',
  'structuralOverhead',
]

describe('contextCategoryLabel (ide.chat.context.category.<id>)', () => {
  it('routes every context category through its literal key', () => {
    for (const id of CATEGORY_IDS) {
      expect(contextCategoryLabel(keyT, id)).toBe(`@@ide.chat.context.category.${id}@@`)
    }
  })

  it('renders each category name as the English default', () => {
    expect(contextCategoryLabel(enT, 'system')).toBe('System instructions')
    expect(contextCategoryLabel(enT, 'summary')).toBe('Previous summary')
    expect(contextCategoryLabel(enT, 'toolDefinitions')).toBe('Tool definitions')
    expect(contextCategoryLabel(enT, 'serverTools')).toBe('Provider tools')
    expect(contextCategoryLabel(enT, 'userText')).toBe('User messages')
    expect(contextCategoryLabel(enT, 'assistantText')).toBe('Assistant messages')
    expect(contextCategoryLabel(enT, 'reasoning')).toBe('Reasoning')
    expect(contextCategoryLabel(enT, 'toolCalls')).toBe('Tool arguments')
    expect(contextCategoryLabel(enT, 'toolResults')).toBe('Tool results')
    expect(contextCategoryLabel(enT, 'images')).toBe('Images')
    expect(contextCategoryLabel(enT, 'attachments')).toBe('Attachments')
    expect(contextCategoryLabel(enT, 'structuralOverhead')).toBe('Request structure')
  })
})

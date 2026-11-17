import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * {@link tipText} — the auto-tip sentences (the `ide.chat.tip.<id>` keys) —
 * travels through the CALLER's translate function with a LITERAL key per tip
 * id. A key-returning marker translator proves those literal keys (the parity
 * gate can only check literal keys — the runtime-built
 * `ide.chat.tip.${tip.id}` key this helper replaced was invisible to it), and
 * an interpolating default-returning translator proves the English sentence,
 * `{{agentName}}` included, matches the tip table's own `text`.
 *
 * @module
 */
import { CHAT_TIPS, ENTRY_TIP, tipText, VIEWER_TIP } from '../components/chat-tips-utilities.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that interpolates the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (key, values, opts) =>
  (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )

describe('tipText (ide.chat.tip.<id>)', () => {
  it('routes every tip — entry, rotation and viewer — through its literal key', () => {
    for (const tip of [ENTRY_TIP, ...CHAT_TIPS, VIEWER_TIP]) {
      expect(tipText(keyT, tip)).toBe(`@@ide.chat.tip.${tip.id}@@`)
    }
  })

  it('renders each tip as the English default, with {{agentName}} interpolated', () => {
    for (const tip of [ENTRY_TIP, ...CHAT_TIPS, VIEWER_TIP]) {
      expect(tipText(enT, tip, { agentName: 'Nova' })).toBe(
        tip.text.replace(/\{\{\s*agentName\s*\}\}/g, 'Nova'),
      )
    }
  })

  it('keeps an unknown placeholder visible rather than dropping it', () => {
    expect(tipText(enT, ENTRY_TIP, {})).toContain('{{agentName}}')
  })
})

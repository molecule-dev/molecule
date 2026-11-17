import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * The notification-sound vocabulary travels through the CALLER's translate
 * function with LITERAL keys: {@link soundEventLabel} (the
 * `ide.chat.soundEvent.<event>` keys), {@link soundEventDescription} (the
 * `ide.chat.soundEventDesc.<event>` keys) and {@link soundModeLabel} (the
 * `ide.chat.soundMode.<mode>` keys). A key-returning marker translator proves
 * the literal key each event/mode produces (the parity gate can only check
 * literal keys — the runtime-built `ide.chat.soundEvent.${event}` these
 * helpers replaced was invisible to it), and a default-returning translator
 * proves the English matches the {@link SOUND_MODE_LABELS} table where one
 * exists.
 *
 * @module
 */
import {
  SOUND_EVENTS,
  SOUND_MODE_LABELS,
  soundEventDescription,
  soundEventLabel,
  soundModeLabel,
} from '../components/chat-settings-utilities.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that interpolates the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (key, values, opts) =>
  (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )

describe('soundEventLabel (ide.chat.soundEvent.<event>)', () => {
  it('routes every sound event through its literal key', () => {
    for (const event of SOUND_EVENTS) {
      expect(soundEventLabel(keyT, event)).toBe(`@@ide.chat.soundEvent.${event}@@`)
    }
  })
})

describe('soundEventDescription (ide.chat.soundEventDesc.<event>)', () => {
  it('routes every sound event through its literal key', () => {
    for (const event of SOUND_EVENTS) {
      expect(soundEventDescription(keyT, event, { agentName: 'the assistant' })).toBe(
        `@@ide.chat.soundEventDesc.${event}@@`,
      )
    }
  })

  it('interpolates {{agentName}} in the English defaults that use it', () => {
    expect(soundEventDescription(enT, 'done', { agentName: 'Nova' })).toBe(
      'Nova finished responding',
    )
    expect(soundEventDescription(enT, 'commit_suggestion', { agentName: 'Nova' })).toBe(
      'Nova is suggesting files to commit',
    )
  })
})

describe('soundModeLabel (ide.chat.soundMode.<mode>)', () => {
  it('routes every sound mode through its literal key', () => {
    for (const mode of ['off', 'whenNotFocused', 'always'] as const) {
      expect(soundModeLabel(keyT, mode)).toBe(`@@ide.chat.soundMode.${mode}@@`)
    }
  })

  it('renders the SOUND_MODE_LABELS English (the /sounds state suffix)', () => {
    for (const mode of ['off', 'whenNotFocused', 'always'] as const) {
      expect(soundModeLabel(enT, mode)).toBe(SOUND_MODE_LABELS[mode])
    }
  })
})

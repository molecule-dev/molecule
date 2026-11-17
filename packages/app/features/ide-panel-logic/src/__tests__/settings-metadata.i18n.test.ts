import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * The `/settings` card's labels travel through the CALLER's translate function
 * with LITERAL keys: {@link settingLabel} for the
 * `ide.chat.settings.<id>.label` keys and {@link settingDescription} for the
 * `ide.chat.settings.<id>.desc` keys. A key-returning marker translator proves
 * the literal key each setting id produces (the parity gate can only check
 * literal keys), and a default-returning translator proves the English is the
 * canonical metadata's own `label`/`description` text — the card, the label
 * switches and the shared registry cannot drift apart.
 *
 * @module
 */
import { settingDescription, settingLabel, SETTINGS } from '../settings-metadata.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that returns the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (_key, _values, opts) => opts?.defaultValue ?? ''

describe('settingLabel (ide.chat.settings.<id>.label)', () => {
  it('routes every canonical setting through its literal label key', () => {
    for (const setting of SETTINGS) {
      expect(settingLabel(keyT, setting.id)).toBe(`@@ide.chat.settings.${setting.id}.label@@`)
    }
  })

  it('renders the metadata label as the English default', () => {
    for (const setting of SETTINGS) {
      expect(settingLabel(enT, setting.id)).toBe(setting.label)
    }
  })
})

describe('settingDescription (ide.chat.settings.<id>.desc)', () => {
  it('routes every canonical setting through its literal description key', () => {
    for (const setting of SETTINGS) {
      expect(settingDescription(keyT, setting.id, { agentName: 'the assistant' })).toBe(
        `@@ide.chat.settings.${setting.id}.desc@@`,
      )
    }
  })

  it('renders the metadata description as the English default, with {{agentName}}', () => {
    for (const setting of SETTINGS) {
      expect(settingDescription(enT, setting.id, { agentName: 'the assistant' })).toBe(
        setting.description,
      )
    }
  })
})

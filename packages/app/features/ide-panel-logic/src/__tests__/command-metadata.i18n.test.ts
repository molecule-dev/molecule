import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * Every English sentence the command registry renders goes through the
 * CALLER's translate function with a LITERAL key: {@link commandDescription}
 * for the `ide.chat.cmd.<id>.desc` descriptions and
 * {@link commandCategoryLabel} for the `ide.chat.help.category.<key>`
 * headings. A key-returning marker translator proves the literal key each id
 * produces (the i18n parity gate can only check literal keys — a runtime-built
 * `ide.chat.cmd.${id}.desc` is invisible to it), and a default-returning
 * translator proves the English is the registry's own `description`/`label`
 * text, so the table and the label switch can never drift apart.
 *
 * @module
 */
import {
  COMMAND_CATEGORIES,
  commandCategoryLabel,
  commandDescription,
  COMMANDS,
} from '../command-metadata.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that returns the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (_key, _values, opts) => opts?.defaultValue ?? ''

describe('commandDescription (ide.chat.cmd.<id>.desc)', () => {
  it('routes every registry command through its literal key', () => {
    for (const command of COMMANDS) {
      expect(commandDescription(keyT, command.id)).toBe(`@@ide.chat.cmd.${command.id}.desc@@`)
    }
  })

  it('renders the registry description as the English default, with {{agentName}}', () => {
    for (const command of COMMANDS) {
      expect(commandDescription(enT, command.id, { agentName: 'the assistant' })).toBe(
        command.description,
      )
    }
  })
})

describe('commandCategoryLabel (ide.chat.help.category.<key>)', () => {
  it('routes every command category through its literal key', () => {
    for (const category of COMMAND_CATEGORIES) {
      expect(commandCategoryLabel(keyT, category.key)).toBe(
        `@@ide.chat.help.category.${category.key}@@`,
      )
    }
  })

  it('renders the category heading as the English default', () => {
    for (const category of COMMAND_CATEGORIES) {
      expect(commandCategoryLabel(enT, category.key)).toBe(category.label)
    }
  })
})

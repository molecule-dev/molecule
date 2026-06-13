/**
 * Tests for the registry-driven `/help` text builder.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { COMMAND_CATEGORIES, COMMANDS } from '../components/chat-commands.js'
import { buildHelpText } from '../components/chat-help-utilities.js'

describe('buildHelpText', () => {
  const help = buildHelpText()

  it('enumerates EVERY command from the registry (no command missing)', () => {
    for (const cmd of COMMANDS) {
      expect(help).toContain(cmd.label)
    }
  })

  it('lists every command category heading that has commands', () => {
    for (const category of COMMAND_CATEGORIES) {
      const hasCommands = COMMANDS.some((c) => c.category === category.key)
      if (hasCommands) expect(help).toContain(category.label)
    }
  })

  it('explains the three conversation modes', () => {
    expect(help).toMatch(/Discovery/)
    expect(help).toMatch(/Plan/)
    expect(help).toMatch(/Execute/)
  })

  it('includes the efficiency tips (@mentions, /, /plan, /undo, /compact)', () => {
    expect(help).toContain('@filename')
    expect(help).toContain('/plan')
    expect(help).toContain('/undo')
    expect(help).toContain('/compact')
  })

  it('reflects new registry entries automatically (cannot drift)', () => {
    const custom = buildHelpText(
      [
        {
          id: 'frobnicate',
          label: '/frobnicate',
          description: 'do the thing',
          category: 'support',
        },
      ],
      COMMAND_CATEGORIES,
    )
    expect(custom).toContain('/frobnicate')
    expect(custom).toContain('do the thing')
  })
})

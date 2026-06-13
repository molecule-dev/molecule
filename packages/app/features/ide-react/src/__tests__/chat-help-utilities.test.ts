/**
 * Tests for the registry-driven `/help` text builder.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { DEFAULT_AGENT_IDENTITY } from '@molecule/app-react'

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
    const custom = buildHelpText(DEFAULT_AGENT_IDENTITY, [
      {
        id: 'frobnicate',
        label: '/frobnicate',
        description: 'do the thing',
        category: 'support',
      },
    ])
    expect(custom).toContain('/frobnicate')
    expect(custom).toContain('do the thing')
  })

  // PKG1 (molecule.dev-leaks-in-core): the shared package must NOT hardcode a
  // product's agent/product name. With the neutral default identity the help
  // copy reads "the assistant" / "the IDE" and contains no product tell.
  it('uses the neutral default identity — no Synthase / Molecule.dev product tell', () => {
    expect(help).not.toMatch(/Synthase/)
    expect(help).not.toMatch(/Molecule\.dev/)
    expect(help).toContain('the assistant')
    expect(help).toContain('the IDE')
  })

  it('interpolates a host-supplied agent + product name into the help copy', () => {
    const custom = buildHelpText({ agentName: 'Fable', productName: 'Acme Studio' })
    expect(custom).toContain('Fable')
    expect(custom).toContain('Acme Studio')
    // No stray, un-substituted interpolation tokens leak into the rendered copy.
    expect(custom).not.toContain('{{agentName}}')
    expect(custom).not.toContain('{{productName}}')
  })
})

/**
 * Tests for the `/help` high-level-guide text builder.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { buildHelpText } from '../components/chat-help-utilities.js'

describe('buildHelpText', () => {
  const help = buildHelpText()

  it('does NOT relist the slash commands (typing / does that better — P2-12)', () => {
    // The high-level guide intentionally dropped the per-command relist and the
    // "── Commands ──" section; commands not referenced by a mode/tip are absent.
    expect(help).not.toContain('── Commands ──')
    expect(help).not.toContain('/share')
    expect(help).not.toContain('/clear')
    expect(help).not.toContain('/explain')
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

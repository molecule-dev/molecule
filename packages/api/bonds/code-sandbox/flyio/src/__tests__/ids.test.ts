/**
 * Tests for sandbox-id composition, Fly app naming, and the Machine-state
 * mapping — including the suspend → `sleeping` mapping this bond exists for.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { appNameForProject, isFailedState, mapMachineState, parseSandboxId, toSandboxId } =
  await import('../ids.js')

const { shellQuote, renderEnvExports } = await import('../utilities.js')

describe('sandbox ids', () => {
  it('round-trips an app and Machine id', () => {
    const id = toSandboxId('mol-sandbox-abc', '148e21eb1d1489')
    expect(id).toBe('mol-sandbox-abc:148e21eb1d1489')
    expect(parseSandboxId(id)).toEqual({ app: 'mol-sandbox-abc', machineId: '148e21eb1d1489' })
  })

  it('rejects a bare Machine id — it cannot address a Machine', () => {
    expect(() => parseSandboxId('148e21eb1d1489')).toThrow(/expected "<app>:<machineId>"/)
  })

  it('rejects ids missing either half', () => {
    expect(() => parseSandboxId(':m1')).toThrow()
    expect(() => parseSandboxId('app:')).toThrow()
    expect(() => parseSandboxId('')).toThrow()
  })
})

describe('appNameForProject', () => {
  it('builds a DNS-safe app name from a uuid project id', () => {
    expect(appNameForProject('mol-sandbox', 'a3f1c0de-0000-4000-8000-000000000001')).toBe(
      'mol-sandbox-a3f1c0de-0000-4000-8000-000000000001',
    )
  })

  it('lowercases and collapses characters that are illegal in a DNS label', () => {
    expect(appNameForProject('Mol_Sandbox', 'Proj ID/42')).toBe('mol-sandbox-proj-id-42')
  })

  it('stays within the 63-character app-name limit with no trailing hyphen', () => {
    const name = appNameForProject('mol-sandbox', 'x'.repeat(200))
    expect(name.length).toBeLessThanOrEqual(63)
    expect(name.endsWith('-')).toBe(false)
  })

  it('throws when a project id has no DNS-safe characters', () => {
    expect(() => appNameForProject('mol-sandbox', '///')).toThrow(/no DNS-safe characters/)
  })
})

describe('mapMachineState', () => {
  it('maps suspended and suspending to sleeping — the scale-to-zero mapping', () => {
    expect(mapMachineState('suspended')).toBe('sleeping')
    expect(mapMachineState('suspending')).toBe('sleeping')
  })

  it('maps started to running', () => {
    expect(mapMachineState('started')).toBe('running')
  })

  it('maps in-flight transitions to creating', () => {
    for (const state of [
      'creating',
      'starting',
      'restarting',
      'updating',
      'replacing',
      'migrated',
    ]) {
      expect(mapMachineState(state)).toBe('creating')
    }
  })

  it('maps every remaining documented state to stopped', () => {
    for (const state of [
      'created',
      'stopped',
      'stopping',
      'destroying',
      'destroyed',
      'failed',
      'launch_failed',
      'replaced',
    ]) {
      expect(mapMachineState(state)).toBe('stopped')
    }
  })

  it('falls back to stopped for an unrecognized future state', () => {
    expect(mapMachineState('some_new_state')).toBe('stopped')
  })

  it('exposes failure separately, since the core union has no error status', () => {
    expect(isFailedState('failed')).toBe(true)
    expect(isFailedState('launch_failed')).toBe(true)
    expect(isFailedState('stopped')).toBe(false)
    expect(isFailedState('started')).toBe(false)
  })
})

describe('shell quoting', () => {
  it('neutralizes command substitution, backticks and semicolons', () => {
    expect(shellQuote('/workspace/$(rm -rf /)')).toBe(`'/workspace/$(rm -rf /)'`)
    expect(shellQuote('a`whoami`b')).toBe("'a`whoami`b'")
    expect(shellQuote('a; rm -rf /')).toBe(`'a; rm -rf /'`)
  })

  it('escapes embedded single quotes so the quoting cannot be broken out of', () => {
    // A single quote is closed, escaped, and reopened: it's -> 'it'\''s'
    expect(shellQuote("it's")).toBe("'it'" + String.raw`\'` + "'s'")
    expect(shellQuote("a'b")).toBe("'a'" + String.raw`\'` + "'b'")
    // Round-trips through a real shell parse: the payload never escapes the quotes.
    expect(shellQuote("'; rm -rf /; '")).not.toMatch(/^'[^']*'$/)
    expect(shellQuote("'; rm -rf /; '").startsWith("''")).toBe(true)
  })
})

describe('renderEnvExports', () => {
  it('renders quoted export statements in order', () => {
    expect(renderEnvExports({ NODE_ENV: 'production', TOKEN: "a'b" })).toEqual([
      "export NODE_ENV='production'",
      'export TOKEN=' + shellQuote("a'b"),
    ])
  })

  it('returns nothing for no environment', () => {
    expect(renderEnvExports(undefined)).toEqual([])
  })

  it('throws on a name that is not a shell identifier rather than dropping it', () => {
    expect(() => renderEnvExports({ 'BAD-NAME': 'x' })).toThrow(/Invalid environment variable name/)
    expect(() => renderEnvExports({ '1LEADING': 'x' })).toThrow()
    expect(() => renderEnvExports({ 'A=B': 'x' })).toThrow()
  })
})

/**
 * The supplied suite's own budget, written back onto a run whose config sets different numbers
 * ({@link suiteRunBudgetCommand}, and the `suiteBudget` hook `exec_command` asks before it runs).
 *
 * The failure this exists for is xr-molecule-flash-m169 (+39:53): a standalone
 * `playwright.config.ts` with `timeout: 60_000` earned a green local proof, and the official
 * grader — on the suite's own 15 s — then failed five tests, two of them at 17.6 s and 19.4 s.
 */

import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend, SuiteBudgetPin } from '../types.js'
import { suiteRunBudgetCommand, suiteRunConfigCommand } from '../utilities.js'

describe('suiteRunBudgetCommand', () => {
  it('writes the suite’s own flags on the runner’s own arguments', () => {
    const out = suiteRunBudgetCommand('npx playwright test', ['--timeout=15000', '--workers=1'])
    expect(out.command).toBe('npx playwright test --timeout=15000 --workers=1')
    expect(out.placed).toEqual(['--timeout=15000', '--workers=1'])
    expect(out.unplaced).toEqual([])
  })

  it('writes them before a redirect and a pipe, never after the runner’s statement', () => {
    const out = suiteRunBudgetCommand('npx playwright test 2>&1 | tail -5', ['--timeout=15000'])
    expect(out.command).toBe('npx playwright test --timeout=15000 2>&1 | tail -5')
  })

  it('rewrites the value a flag already carries, in either spelling', () => {
    expect(
      suiteRunBudgetCommand('npx playwright test --timeout=60000', ['--timeout=15000']).command,
    ).toBe('npx playwright test --timeout=15000')
    expect(
      suiteRunBudgetCommand('npx playwright test --timeout 60000', ['--timeout=15000']).command,
    ).toBe('npx playwright test --timeout 15000')
  })

  it('adds its own flag beside a value it cannot rewrite (last flag wins)', () => {
    // The percentage is not a number Playwright measures in ms: rewriting it would be a different
    // setting, not the suite's, so the suite's own flag is written beside it and wins as the last.
    const out = suiteRunBudgetCommand('npx playwright test --timeout=50%', ['--timeout=15000'])
    expect(out.command).toBe('npx playwright test --timeout=50% --timeout=15000')
    expect(out.placed).toEqual(['--timeout=15000'])
  })

  it('touches only the LAST suite statement', () => {
    const out = suiteRunBudgetCommand('npx playwright test --workers=4; npm run build', [
      '--timeout=15000',
    ])
    expect(out.command).toContain('npx playwright test --workers=4 --timeout=15000')
    expect(out.command).not.toContain('npm run build --timeout')
  })

  it('reports a flag it cannot place instead of claiming a pin it did not make', () => {
    const nested = "sh -c 'npx playwright test'"
    const out = suiteRunBudgetCommand(nested, ['--timeout=15000'])
    expect(out.command).toBe(nested)
    expect(out.placed).toEqual([])
    expect(out.unplaced).toEqual(['--timeout=15000'])
  })
})

describe('suiteRunConfigCommand', () => {
  it('rewrites the config the run already names, in either spelling', () => {
    expect(
      suiteRunConfigCommand(
        'npx playwright test --config ./e2e.config.ts',
        '/workspace/.mol/d.mjs',
      ),
    ).toEqual({
      command: 'npx playwright test --config /workspace/.mol/d.mjs',
      placed: true,
    })
    expect(
      suiteRunConfigCommand('npx playwright test --config=./e2e.config.ts', '/workspace/.mol/d.mjs')
        .command,
    ).toBe('npx playwright test --config=/workspace/.mol/d.mjs')
    expect(
      suiteRunConfigCommand('npx playwright test -c ./e2e.config.ts', '/workspace/.mol/d.mjs')
        .command,
    ).toBe('npx playwright test -c /workspace/.mol/d.mjs')
  })

  it('quotes the value it replaces as it was written, and survives a quoted path', () => {
    expect(
      suiteRunConfigCommand(
        'npx playwright test --config "../my app/pw.config.ts"',
        '/w/.mol/d.mjs',
      ).command,
    ).toBe('npx playwright test --config "/w/.mol/d.mjs"')
  })

  it('adds the config when the run names none, before a pipe and never after it', () => {
    expect(
      suiteRunConfigCommand('npx playwright test 2>&1 | tail -5', '/w/.mol/d.mjs').command,
    ).toBe('npx playwright test --config=/w/.mol/d.mjs 2>&1 | tail -5')
  })

  it('reports a runner it cannot place instead of claiming a config it did not write', () => {
    const nested = "sh -c 'npx playwright test --config ./x.ts'"
    expect(suiteRunConfigCommand(nested, '/w/.mol/d.mjs')).toEqual({
      command: nested,
      placed: false,
    })
  })

  it('does not touch a config on a command after the suite run', () => {
    const out = suiteRunConfigCommand(
      'npx playwright test; npm run build --config x',
      '/w/.mol/d.mjs',
    )
    expect(out.command).toBe('npx playwright test --config=/w/.mol/d.mjs; npm run build --config x')
  })
})

describe('exec_command — suiteBudget', () => {
  function mockBackend(): ExecutionBackend {
    return {
      projectRoot: '/workspace',
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 }),
    }
  }

  const pin: SuiteBudgetPin = {
    flags: ['--timeout=15000'],
    note:
      'This run uses the suite’s own budget: `--timeout=15000` is on it, replacing what your ' +
      'config sets (`timeout` 60 s).',
  }

  it('puts the flags on the run and the sentence in the result', async () => {
    const backend = mockBackend()
    const budget = vi.fn().mockResolvedValue(pin)
    const tools = buildTools(backend, { suiteBudget: budget })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    const result = (await exec?.execute({
      command: 'npx playwright test',
    })) as Record<string, unknown>

    // The platform's own trace flag is already on the command when the budget is read.
    expect(budget).toHaveBeenCalledWith(
      expect.stringContaining('npx playwright test'),
      '/workspace',
    )
    const ran = String((backend.run as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(ran).toMatch(/npx playwright test\b.*--timeout=15000/)
    expect(String(result.note)).toContain('uses the suite’s own budget')
    expect(result.suiteBudget).toEqual({ pinned: ['--timeout=15000'] })
  })

  it('changes nothing when the consumer answers null (a config that spreads the base)', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { suiteBudget: vi.fn().mockResolvedValue(null) })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    const result = (await exec?.execute({ command: 'npx playwright test' })) as Record<
      string,
      unknown
    >

    const ran = String((backend.run as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(ran).not.toContain('--timeout=')
    expect(String(result.note ?? '')).not.toContain('uses the suite’s own budget')
    expect(result.suiteBudget).toBeUndefined()
  })

  it('points the run at the derived config and records every pinned value', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, {
      suiteBudget: vi.fn().mockResolvedValue({
        ...pin,
        config: '/workspace/.mol/pw-derived.abc.config.mjs',
        values: {
          timeout: '15000',
          'expect.timeout': '5000',
          actionTimeout: '5000',
          navigationTimeout: '10000',
        },
        drift: {
          timeout: { used: '30_000', suite: '15_000' },
          'expect.timeout': { used: '10_000', suite: '5_000' },
        },
      } satisfies SuiteBudgetPin),
    })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    const result = (await exec?.execute({
      command:
        'BASE_URL=http://localhost:5173 npx playwright test --config /workspace/e2e-conduit.config.ts',
    })) as Record<string, unknown>

    const ran = String((backend.run as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(ran).toContain('--config /workspace/.mol/pw-derived.abc.config.mjs')
    expect(ran).not.toContain('--config /workspace/e2e-conduit.config.ts')
    expect(result.suiteBudget).toEqual({
      pinned: ['--timeout=15000'],
      config: '/workspace/.mol/pw-derived.abc.config.mjs',
      values: {
        timeout: '15000',
        'expect.timeout': '5000',
        actionTimeout: '5000',
        navigationTimeout: '10000',
      },
    })
  })

  it('reports the settings it could NOT carry as residual drift', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, {
      suiteBudget: vi.fn().mockResolvedValue({
        ...pin,
        config: '/workspace/.mol/pw-derived.abc.config.mjs',
        values: { actionTimeout: '5000' },
        drift: {
          timeout: { used: '30_000', suite: '15_000' },
          actionTimeout: { used: '10_000', suite: '5_000' },
          navigationTimeout: { used: '20_000', suite: '10_000' },
        },
      } satisfies SuiteBudgetPin),
    })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    const result = (await exec?.execute({ command: 'npx playwright test' })) as Record<
      string,
      unknown
    >

    expect(result.suiteBudget).toMatchObject({
      drift: { navigationTimeout: { used: '20_000', suite: '10_000' } },
    })
    // The pinned ones are not drift: this run carries the suite's values for them.
    expect(
      (result.suiteBudget as { drift: Record<string, unknown> }).drift?.timeout,
    ).toBeUndefined()
  })

  it('leaves a derived config a nested runner cannot take as residual drift, with no values', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, {
      suiteBudget: vi.fn().mockResolvedValue({
        flags: [],
        note: 'derived',
        config: '/workspace/.mol/pw-derived.abc.config.mjs',
        values: { actionTimeout: '5000' },
        drift: { actionTimeout: { used: '10_000', suite: '5_000' } },
      } satisfies SuiteBudgetPin),
    })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    const result = (await exec?.execute({
      command: "sh -c 'npx playwright test'",
    })) as Record<string, unknown>

    expect(result.suiteBudget).toEqual({
      drift: { actionTimeout: { used: '10_000', suite: '5_000' } },
    })
  })

  it('leaves a non-Playwright command alone and never asks', async () => {
    const backend = mockBackend()
    const budget = vi.fn().mockResolvedValue(pin)
    const tools = buildTools(backend, { suiteBudget: budget })
    const exec = tools.find((tool) => tool.name === 'exec_command')

    await exec?.execute({ command: 'npm run build' })

    expect(budget).not.toHaveBeenCalled()
  })
})

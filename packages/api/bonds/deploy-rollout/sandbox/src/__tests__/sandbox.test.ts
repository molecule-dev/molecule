/**
 * The sandbox adapter: create/gate/join/leave/drain/destroy over an injected
 * `SandboxProvider`, with no real sandbox.
 */
import { describe, expect, it, vi } from 'vitest'

import type { Sandbox, SandboxProvider } from '@molecule/api-code-sandbox'

import type { SandboxInstance } from '../sandbox.js'
import { createSandboxInstanceProvider, sigtermNodeProcessesCommand } from '../sandbox.js'

/** The smallest Sandbox the adapter touches. */
const sandbox = (id: string, opts: { exitCode?: number } = {}): Sandbox =>
  ({
    id,
    status: 'running',
    previewUrl: '',
    start: vi.fn(),
    stop: vi.fn(),
    sleep: vi.fn(),
    wake: vi.fn(),
    exec: vi.fn(async () => ({
      stdout: '',
      stderr: opts.exitCode ? 'drain failed' : '',
      exitCode: opts.exitCode ?? 0,
    })),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }) as unknown as Sandbox

const provider = (): SandboxProvider =>
  ({
    name: 'fake',
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(async () => []),
    destroy: vi.fn(async () => {}),
  }) as unknown as SandboxProvider

describe('createSandboxInstanceProvider', () => {
  it('creates through the caller launch and joins/leaves with the callbacks', async () => {
    const sandboxes = sandbox('s1')
    const join = vi.fn(async () => {})
    const leave = vi.fn(async () => {})
    const instanceProvider = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({ sandbox: sandboxes, upstreamUrl: 'http://127.0.0.1:4000' }),
      readinessProbe: async () => true,
      join,
      leave,
    })

    const instance = await instanceProvider.create(0)
    expect(instance.id).toBe('s1')
    expect(instance.upstreamUrl).toBe('http://127.0.0.1:4000')
    expect(await instanceProvider.waitReady(instance, 10)).toBe(true)
    await instanceProvider.join(instance)
    await instanceProvider.leave(instance)
    expect(join).toHaveBeenCalledWith(instance)
    expect(leave).toHaveBeenCalledWith(instance)
  })

  it('delegates waitReady to a caller-provided blocking gate', async () => {
    const gate = vi.fn(async () => true)
    const instanceProvider = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({ sandbox: sandbox('s1'), upstreamUrl: 'http://127.0.0.1:4000' }),
      waitReady: gate,
    })
    const instance = await instanceProvider.create(0)
    expect(await instanceProvider.waitReady(instance)).toBe(true)
    expect(gate).toHaveBeenCalledWith(instance)
  })

  it('drains with a SIGTERM command bounded by drainMs and destroys through the provider', async () => {
    const base = provider()
    const s = sandbox('s1')
    const instanceProvider = createSandboxInstanceProvider({
      provider: base,
      launch: async () => ({ sandbox: s, upstreamUrl: 'http://127.0.0.1:4000' }),
    })
    const instance = await instanceProvider.create(0)
    await instanceProvider.drain(instance, 25_000)
    expect(s.exec).toHaveBeenCalledWith(
      sigtermNodeProcessesCommand(25_000),
      expect.objectContaining({ timeout: 40_000 }),
    )
    await instanceProvider.destroy(instance)
    expect(base.destroy).toHaveBeenCalledWith('s1')
  })

  it('reports a drain command that exits non-zero', async () => {
    const instanceProvider = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({
        sandbox: sandbox('s1', { exitCode: 2 }),
        upstreamUrl: 'http://127.0.0.1:4000',
      }),
    })
    const instance = await instanceProvider.create(0)
    await expect(instanceProvider.drain(instance, 1_000)).rejects.toThrow(/exited 2/)
  })

  it('uses a caller-provided drain command', async () => {
    const s = sandbox('s1')
    const instanceProvider = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({ sandbox: s, upstreamUrl: 'http://127.0.0.1:4000' }),
      drainCommand: (drainMs) => `kill -TERM 1; sleep ${drainMs / 1000}`,
    })
    const instance = await instanceProvider.create(0)
    await instanceProvider.drain(instance, 1_000)
    expect(s.exec).toHaveBeenCalledWith(
      'kill -TERM 1; sleep 1',
      expect.objectContaining({ timeout: 16_000 }),
    )
  })

  it('exposes list only when the caller can enumerate', async () => {
    const withList = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({ sandbox: sandbox('s1'), upstreamUrl: '' }),
      list: async () => [
        {
          id: 's1',
          upstreamUrl: 'http://x',
          sandbox: sandbox('s1'),
        } satisfies SandboxInstance,
      ],
    })
    expect((await withList.list?.())?.map((instance) => instance.id)).toEqual(['s1'])

    const withoutList = createSandboxInstanceProvider({
      provider: provider(),
      launch: async () => ({ sandbox: sandbox('s1'), upstreamUrl: '' }),
    })
    expect(withoutList.list).toBeUndefined()
  })
})

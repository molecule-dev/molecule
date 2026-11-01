import { describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

function fixture() {
  const stored = new Map<string, string>(),
    calls: string[] = [],
    info = { sandboxId: 'sandbox', state: 'running', lifecycle: { autoResume: false } }
  async function read(path: string): Promise<string>
  async function read(
    path: string,
    opts: { format: 'bytes'; requestTimeoutMs?: number },
  ): Promise<Uint8Array>
  async function read(
    path: string,
    opts?: { format: 'bytes'; requestTimeoutMs?: number },
  ): Promise<string | Uint8Array> {
    calls.push('files:' + path)
    return opts ? new TextEncoder().encode('durable bytes') : 'durable bytes'
  }
  const native: E2BSandboxLike = {
    sandboxId: 'sandbox',
    readDescriptor: () => JSON.stringify({ sandboxId: 'sandbox', opaque: 'private handle' }),
    commands: {
      run: async () => {
        calls.push('exec')
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    },
    files: { read, write: async () => {}, list: async () => [], remove: async () => {} },
    getHost: () => '',
    setTimeout: async () => {
      calls.push('keepalive')
    },
    kill: async () => {
      calls.push('kill')
    },
  }
  const client: E2BSandboxClientLike = {
    create: async () => native,
    connect: async () => {
      calls.push('connect')
      return native
    },
    getInfo: async () => {
      calls.push('describe')
      return info
    },
    list: async () => [],
    readHandle: (serialized) => {
      calls.push('local-handle')
      expect(JSON.parse(serialized).sandboxId).toBe('sandbox')
      return { sandboxId: 'sandbox', readFile: (path) => read(path, { format: 'bytes' }) }
    },
  }
  const store = {
    get: async (id: string) => stored.get(id) || null,
    set: async (id: string, value: string) => {
      stored.set(id, value)
    },
  }
  const a = new E2BSandboxProvider({ apiKey: 'fixture', readHandleStore: store }, client),
    b = new E2BSandboxProvider({ apiKey: 'fixture', readHandleStore: store }, client)
  return { a, b, info, calls, client, stored, store }
}
describe('passive sandbox files', () => {
  it('reconstructs API B file access from persisted facts without connect, resume, exec or keepalive', async () => {
    const f = fixture()
    await f.a.get('sandbox')
    f.calls.length = 0
    const handle = await f.b.readOnly('sandbox')
    expect(handle).not.toBeNull()
    expect(
      new TextDecoder().decode(await handle!.readFileBytes!('/workspace/.mol/test-runs/meta.json')),
    ).toBe('durable bytes')
    expect(f.calls).toEqual([
      'describe',
      'local-handle',
      'describe',
      'files:/workspace/.mol/test-runs/meta.json',
    ])
  })
  it('refuses paused and traffic-auto-resuming sandboxes before any file GET', async () => {
    const f = fixture()
    await f.a.get('sandbox')
    f.calls.length = 0
    f.info.state = 'paused'
    expect(await f.b.readOnly('sandbox')).toBeNull()
    f.info.state = 'running'
    f.info.lifecycle.autoResume = true
    expect(await f.b.readOnly('sandbox')).toBeNull()
    expect(f.calls).toEqual(['describe', 'describe'])
  })
  it('rechecks lifecycle immediately before every read', async () => {
    const f = fixture()
    await f.a.get('sandbox')
    const handle = await f.b.readOnly('sandbox')
    f.calls.length = 0
    f.info.state = 'paused'
    await expect(handle!.readFileBytes!('/workspace/file')).rejects.toThrow(
      'Passive sandbox files unavailable',
    )
    expect(f.calls).toEqual(['describe'])
  })
  it('keeps failed probes and missing read credentials unavailable instead of connecting', async () => {
    const f = fixture()
    expect(await f.b.readOnly('sandbox')).toBeNull()
    expect(f.calls).toEqual(['describe'])
    f.client.getInfo = vi.fn().mockRejectedValue(new Error('control plane unavailable'))
    await expect(f.b.readOnly('sandbox')).rejects.toThrow('control plane unavailable')
    expect(f.calls).not.toContain('connect')
  })
  it('rejects a persisted handle for another sandbox', async () => {
    const f = fixture()
    await f.a.get('sandbox')
    f.client.readHandle = () => ({ sandboxId: 'foreign', readFile: async () => new Uint8Array() })
    await expect(f.b.readOnly('sandbox')).rejects.toThrow('identity mismatch')
  })
  it('does not lose an authorized sandbox when optional descriptor persistence fails', async () => {
    const f = fixture()
    f.store.set = async () => {
      throw new Error('store unavailable')
    }
    expect(await f.a.get('sandbox')).not.toBeNull()
    expect(await f.a.readOnly('sandbox')).not.toBeNull()
    expect(await f.b.readOnly('sandbox')).toBeNull()
    expect(f.calls.filter((c) => c === 'connect')).toHaveLength(1)
  })
  it('normalizes only a native missing file, retaining real outages as errors', async () => {
    const f = fixture()
    await f.a.get('sandbox')
    f.client.readHandle = () => ({
      sandboxId: 'sandbox',
      readFile: async () => {
        throw Object.assign(new Error('absent'), { name: 'NotFoundError' })
      },
    })
    const handle = await f.b.readOnly('sandbox')
    await expect(handle!.readFileBytes!('/workspace/absent')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    f.client.readHandle = () => ({
      sandboxId: 'sandbox',
      readFile: async () => {
        throw new Error('outage')
      },
    })
    const unavailable = await f.b.readOnly('sandbox')
    await expect(unavailable!.readFileBytes!('/workspace/absent')).rejects.toThrow('outage')
  })
})

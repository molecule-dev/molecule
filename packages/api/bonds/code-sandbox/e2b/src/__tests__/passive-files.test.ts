import { FileNotFoundError, NotFoundError, TimeoutError } from 'e2b'
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
    isRunning: async () => true,
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
  return { a, b, info, calls, client, native, stored, store }
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
  describe.each(['live', 'restored'] as const)('%s handle', (kind) => {
    async function failingRead(error: Error) {
      const f = fixture()
      await f.a.get('sandbox')
      if (kind === 'live') vi.spyOn(f.native.files, 'read').mockRejectedValue(error)
      else
        f.client.readHandle = () => ({
          sandboxId: 'sandbox',
          readFile: async () => {
            throw error
          },
        })
      const handle = await (kind === 'live' ? f.a : f.b).readOnly('sandbox')
      f.calls.length = 0
      return { f, read: () => handle!.readFileBytes!('/workspace/absent') }
    }

    it.each([
      { name: 'NotFoundError', ErrorClass: NotFoundError },
      { name: 'FileNotFoundError', ErrorClass: FileNotFoundError },
      {
        name: 'future subclass',
        ErrorClass: class FutureNotFoundError extends FileNotFoundError {},
      },
    ])('normalizes the SDK $name family to ENOENT', async ({ ErrorClass: errorClass }) => {
      const native = new errorClass('absent')
      const { f, read } = await failingRead(native)
      await expect(read()).rejects.toMatchObject({
        code: 'ENOENT',
        cause: native,
        message: 'Sandbox file not found: /workspace/absent',
      })
      expect(f.calls).toEqual(['describe'])
    })

    it.each([
      Object.assign(new Error('permission denied'), { code: 'EACCES', statusCode: 403 }),
      new TimeoutError('read timed out'),
      Object.assign(new Error('service unavailable'), { statusCode: 503 }),
      Object.assign(new Error('lookalike'), { name: 'NotFoundError' }),
    ])('retains non-missing errors unchanged: %s', async (native) => {
      const { read } = await failingRead(native)
      await expect(read()).rejects.toBe(native)
    })

    it('uses the client classifier when the client owns another SDK copy', async () => {
      const native = new Error('file 404 from another SDK instance')
      const { f, read } = await failingRead(native)
      f.client.isFileNotFound = vi.fn((error) => error === native)
      await expect(read()).rejects.toMatchObject({ code: 'ENOENT', cause: native })
      expect(f.client.isFileNotFound).toHaveBeenCalledWith(native)
    })

    it('preserves an error the client classifier rejects', async () => {
      const native = new NotFoundError('not a file 404 in this client')
      const { f, read } = await failingRead(native)
      f.client.isFileNotFound = vi.fn(() => false)
      await expect(read()).rejects.toBe(native)
      expect(f.client.isFileNotFound).toHaveBeenCalledWith(native)
    })
  })
})

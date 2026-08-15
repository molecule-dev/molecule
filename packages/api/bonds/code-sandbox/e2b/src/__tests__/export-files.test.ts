import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

/** A fake SDK sandbox that records commands and serves a canned tar read. */
function fakeSandbox(sandboxId: string, tarBytes = new Uint8Array([1, 2, 3])) {
  const commands: string[] = []
  const writes: Array<{ path: string; size: number }> = []
  const sbx: E2BSandboxLike = {
    sandboxId,
    commands: {
      async run(cmd) {
        commands.push(cmd)
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    },
    files: {
      // Overloads: text read and binary read share one implementation.
      read: (async (_path: string, opts?: { format: 'bytes' }) =>
        opts?.format === 'bytes' ? tarBytes : '') as E2BSandboxLike['files']['read'],
      async write(path, data) {
        const size =
          typeof data === 'string'
            ? data.length
            : data instanceof Blob
              ? data.size
              : (data as ArrayBuffer | Uint8Array).byteLength
        writes.push({ path, size })
        return {}
      },
      async list() {
        return []
      },
      async remove() {},
    },
    getHost: (port) => `${port}-${sandboxId}.e2b.app`,
    async setTimeout() {},
    async kill() {},
  }
  return { sbx, commands, writes }
}

function providerFor(sbx: E2BSandboxLike): E2BSandboxProvider {
  const client: E2BSandboxClientLike = {
    async create() {
      return sbx
    },
    async connect() {
      return sbx
    },
    async list() {
      return []
    },
  }
  return new E2BSandboxProvider({ apiKey: 'test' }, client)
}

describe('E2B exportFiles / importFiles archive rooting', () => {
  it('roots the archive at the last path segment (tar -C <parent> <name>)', async () => {
    const { sbx, commands } = fakeSandbox('sbx-1')
    const sandbox = await providerFor(sbx).get('sbx-1')
    expect(sandbox?.exportFiles).toBeDefined()
    const chunks: Uint8Array[] = []
    for await (const chunk of await sandbox!.exportFiles!('/workspace/my-app')) chunks.push(chunk)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual(new Uint8Array([1, 2, 3]))
    const tar = commands.find((c) => c.startsWith('tar cf '))
    expect(tar).toBeDefined()
    // Entries must be `my-app/…`, never `./…` — importFiles(<parent>) and every
    // strip-1 unpacker depend on it.
    expect(tar).toMatch(/ -C '\/workspace' 'my-app'$/)
    expect(tar).not.toMatch(/ -C \/workspace\/my-app \./)
  })

  it('handles a trailing slash and a top-level directory', async () => {
    const { sbx, commands } = fakeSandbox('sbx-2')
    const sandbox = await providerFor(sbx).get('sbx-2')
    await sandbox!.exportFiles!('/workspace/')
    expect(commands.find((c) => c.startsWith('tar cf '))).toMatch(/ -C '\/' 'workspace'$/)
  })

  it('refuses to export the filesystem root or a relative path', async () => {
    const { sbx } = fakeSandbox('sbx-3')
    const sandbox = await providerFor(sbx).get('sbx-3')
    await expect(sandbox!.exportFiles!('/')).rejects.toThrow(/absolute directory/)
    await expect(sandbox!.exportFiles!('workspace')).rejects.toThrow(/absolute directory/)
  })

  it('shell-quotes the path so a name with spaces or quotes stays one argument', async () => {
    const { sbx, commands } = fakeSandbox('sbx-4')
    const sandbox = await providerFor(sbx).get('sbx-4')
    await sandbox!.exportFiles!("/workspace/it's odd")
    expect(commands.find((c) => c.startsWith('tar cf '))).toContain(
      `-C '/workspace' 'it'\\''s odd'`,
    )
  })

  it('importFiles extracts at the given path with ownership/mode bits dropped', async () => {
    const { sbx, commands, writes } = fakeSandbox('sbx-5')
    const sandbox = await providerFor(sbx).get('sbx-5')
    await sandbox!.importFiles!(
      '/workspace',
      (async function* () {
        yield new Uint8Array([9, 9])
      })(),
    )
    expect(writes).toHaveLength(1)
    expect(writes[0].size).toBe(2)
    const extract = commands.find((c) => c.includes('tar xf '))
    expect(extract).toContain("-C '/workspace' --no-same-owner --no-same-permissions")
  })
})

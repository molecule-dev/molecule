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

describe('E2B importFiles spools the archive', () => {
  it('spools a large archive into the sandbox in pieces — never the whole archive in memory at once', async () => {
    const { sbx, commands, writes } = fakeSandbox('sbx-6')
    const sandbox = await providerFor(sbx).get('sbx-6')
    const piece = new Uint8Array(3 * 1024 * 1024)
    await sandbox!.importFiles!(
      '/workspace',
      (async function* () {
        for (let i = 0; i < 6; i++) yield piece // 18 MB in 3 MB chunks
      })(),
    )
    // Pieces of exactly 8 MB (chunks are sliced at the piece boundary, R93-B9),
    // then the 2 MB rest, then one extract.
    expect(writes.map((w) => w.size)).toEqual([8 * 1024 * 1024, 8 * 1024 * 1024, 2 * 1024 * 1024])
    expect(commands.filter((c) => /\.piece > \//.test(c)).length).toBe(1)
    expect(commands.filter((c) => /\.piece >> \//.test(c)).length).toBe(2)
    expect(commands.filter((c) => c.includes('tar xf ')).length).toBe(1)
    // The spool file is removed afterwards, success or not.
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })

  it('an empty archive still extracts (an empty tar) and leaves no spool file', async () => {
    const { sbx, commands } = fakeSandbox('sbx-7')
    const sandbox = await providerFor(sbx).get('sbx-7')
    await sandbox!.importFiles!('/workspace', (async function* () {})())
    expect(commands.some((c) => c.startsWith(': > /tmp/mol-import-'))).toBe(true)
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })
})

describe('E2B readFileBytes / writeFileBytes', () => {
  it('reads exact bytes through the file API, never command stdout', async () => {
    const bytes = new Uint8Array(300_000).map((_, i) => i % 251)
    const { sbx, commands } = fakeSandbox('sbx-b1', bytes)
    const sandbox = await providerFor(sbx).get('sbx-b1')
    const read = await sandbox!.readFileBytes!('/tmp/archive.tar.gz')
    expect(read).toEqual(bytes)
    expect(commands).toHaveLength(0)
  })

  it('writes exact bytes through the file API', async () => {
    const { sbx, writes, commands } = fakeSandbox('sbx-b2')
    const sandbox = await providerFor(sbx).get('sbx-b2')
    await sandbox!.writeFileBytes!('/tmp/part', new Uint8Array(4096))
    expect(writes).toEqual([{ path: '/tmp/part', size: 4096 }])
    expect(commands).toHaveLength(0)
  })
})

describe('R93: bounded pieces, failures that must fail, export cleanup', () => {
  const failing = (sandboxId: string, match: (cmd: string) => boolean, exitCode = 2) => {
    const made = fakeSandbox(sandboxId)
    made.sbx.commands.run = async (cmd: string) => {
      made.commands.push(cmd)
      return match(cmd)
        ? { stdout: '', stderr: 'boom', exitCode }
        : { stdout: '', stderr: '', exitCode: 0 }
    }
    return made
  }

  it('one 20 MB chunk is spooled as 8 + 8 + 4 MB pieces, never one write', async () => {
    const { sbx, writes } = fakeSandbox('sbx-p1')
    const sandbox = await providerFor(sbx).get('sbx-p1')
    await sandbox!.importFiles!(
      '/workspace',
      (async function* () {
        yield new Uint8Array(20 * 1024 * 1024)
      })(),
    )
    expect(writes.map((w) => w.size)).toEqual([8 * 1024 * 1024, 8 * 1024 * 1024, 4 * 1024 * 1024])
  })

  it('a failed spool and a failed extract both fail the import, and the spool file is still removed', async () => {
    const spool = failing('sbx-p2', (c) => c.includes('.piece >'), 1)
    const s1 = await providerFor(spool.sbx).get('sbx-p2')
    await expect(
      s1!.importFiles!(
        '/workspace',
        (async function* () {
          yield new Uint8Array(10)
        })(),
      ),
    ).rejects.toThrow(/spooling the archive failed/)
    expect(spool.commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
    const extract = failing('sbx-p3', (c) => c.includes('tar xf '))
    const s2 = await providerFor(extract.sbx).get('sbx-p3')
    await expect(
      s2!.importFiles!(
        '/workspace',
        (async function* () {
          yield new Uint8Array(10)
        })(),
      ),
    ).rejects.toThrow(/tar extract failed/)
    expect(extract.commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })

  it('exportFiles removes its archive when the tar or the read fails, and names it uniquely', async () => {
    const tarFails = failing('sbx-e1', (c) => c.startsWith('tar cf '))
    const s1 = await providerFor(tarFails.sbx).get('sbx-e1')
    await expect(s1!.exportFiles!('/workspace/app')).rejects.toThrow(/tar create failed/)
    expect(tarFails.commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-export-/)
    const readFails = fakeSandbox('sbx-e2')
    readFails.sbx.files.read = (async () => {
      throw new Error('read failed')
    }) as typeof readFails.sbx.files.read
    const s2 = await providerFor(readFails.sbx).get('sbx-e2')
    await expect(s2!.exportFiles!('/workspace/app')).rejects.toThrow('read failed')
    expect(readFails.commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-export-/)
    const two = fakeSandbox('sbx-e3')
    const s3 = await providerFor(two.sbx).get('sbx-e3')
    await s3!.exportFiles!('/workspace/app')
    await s3!.exportFiles!('/workspace/app')
    const tars = two.commands.filter((c) => c.startsWith('tar cf ')).map((c) => c.split(' ')[2])
    expect(new Set(tars).size).toBe(2)
  })
})

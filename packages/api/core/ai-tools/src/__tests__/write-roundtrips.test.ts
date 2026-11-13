import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { afterAll, describe, expect, it } from 'vitest'

import { createSandboxBackend } from '../backends/sandbox.js'
import { buildTools } from '../tools.js'
import type { ExecutionBackend, ToolBuildConfig } from '../types.js'

const exec = promisify(execFile)
const scratch = await mkdtemp(join(tmpdir(), 'file-roundtrips-'))
afterAll(() => rm(scratch, { recursive: true, force: true }))

/** Real shell/file operations behind one counted, optionally delayed transport. */
async function fixture(latency = 0) {
  const root = await mkdtemp(join(scratch, 'app-'))
  const calls: Array<{ kind: string; ms: number }> = []
  const invoke = async <T>(kind: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    await new Promise((resolve) => setTimeout(resolve, latency))
    try {
      return await fn()
    } finally {
      calls.push({ kind, ms: performance.now() - start })
    }
  }
  const sandbox = {
    readFile: (path: string) => invoke('read', () => readFile(path, 'utf8')),
    writeFile: (path: string, content: string) =>
      invoke('write', async () => {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, content)
      }),
    deleteFile: (path: string) => rm(path),
    readDir: async () => [],
    exec: (command: string) =>
      invoke('exec', async () => {
        try {
          const out = await exec('sh', ['-c', command], {
            cwd: root,
            env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') },
            maxBuffer: 10 * 1024 * 1024,
          })
          return { ...out, exitCode: 0 }
        } catch (error) {
          const out = error as { stdout: string; stderr: string; code: number }
          return { stdout: out.stdout ?? '', stderr: out.stderr ?? '', exitCode: out.code ?? 1 }
        }
      }),
  }
  const backend = createSandboxBackend(sandbox, root)
  const legacy: ExecutionBackend = { ...backend }
  delete legacy.readFileForUpdate
  delete legacy.writeFileAndCheck
  const tool = (name: string, fast = true, config: ToolBuildConfig = {}) =>
    buildTools(fast ? backend : legacy, { symlinkGuards: true, ...config }).find(
      (t) => t.name === name,
    )!
  return { root, calls, sandbox, backend, legacy, tool }
}

describe('write/edit sandbox round trips and exact results', () => {
  it.each(['write_file', 'edit_file'])('%s uses two calls instead of four', async (name) => {
    const f = await fixture(100)
    const path = join(f.root, 'invoice.json')
    const input =
      name === 'write_file'
        ? { path, content: '{"paid":true}\n' }
        : { path, old_string: 'false', new_string: 'true' }
    await writeFile(path, '{"paid":false}\n')
    const start = performance.now()
    const bad = await f.tool(name, false).execute(input)
    const legacyMs = performance.now() - start
    const oldCalls = f.calls.splice(0)
    expect(oldCalls.map((c) => c.kind)).toEqual(['exec', 'read', 'write', 'exec'])
    await writeFile(path, '{"paid":false}\n')
    const fastStart = performance.now()
    const good = await f.tool(name).execute(input)
    const fastMs = performance.now() - fastStart
    expect(good).toEqual(bad)
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'exec'])
    if (process.env.WRITE_ROUNDTRIP_REPORT === '1')
      console.log(
        JSON.stringify({ name, latencyMs: 100, legacyMs, fastMs, oldCalls, calls: f.calls }),
      )
  })

  it.each([
    ['write_file', 'created', null, '{"amount":12}\n'],
    ['write_file', 'modified', '{"amount":10}\n', '{"amount":12}\n'],
    ['write_file', 'syntax', '{}\n', '{"amount":}\n'],
    ['write_file', 'redaction', '{}\n', '{"token":"[REDACTED]"}\n'],
    ['edit_file', 'modified', '{"amount":10}\n', '12'],
    ['edit_file', 'syntax', '{"amount":10}\n', ''],
    ['edit_file', 'redaction', '{"amount":10}\n', '"[REDACTED]"'],
    ['edit_file', 'unchanged', '{"amount":10}\n', '10'],
  ] as const)('%s %s is byte-identical, including callbacks', async (name, kind, old, next) => {
    const f = await fixture()
    const path = join(f.root, 'nested/invoice.json')
    const input =
      name === 'write_file' ? { path, content: next } : { path, old_string: '10', new_string: next }
    const run = async (fast: boolean) => {
      await rm(dirname(path), { force: true, recursive: true })
      if (old !== null) {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, old)
      }
      const events: unknown[] = []
      const result = await f
        .tool(name, fast, {
          onFileDiff: (e) => events.push(['diff', e]),
          onFileChange: (e) => events.push(['change', e]),
        })
        .execute(input)
      // An absent file reads as null — that value is compared across runs.
      const final = await readFile(path, 'utf8').catch((_error) => null)
      return { json: JSON.stringify(result), events, final }
    }
    const legacy = await run(false)
    f.calls.splice(0)
    expect(await run(true)).toEqual(legacy)
    if (kind === 'syntax') expect(legacy.json).toContain('syntaxError')
    if (kind === 'redaction') expect(legacy.json).toContain('Refused:')
    if (kind === 'created') expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'write', 'exec'])
  })

  it.each(['write_file', 'edit_file'])(
    '%s refuses an outside symlink before reading',
    async (name) => {
      const f = await fixture()
      const outside = join(scratch, `outside-${name}.json`)
      await writeFile(outside, '{"amount":10}\n')
      const path = join(f.root, 'invoice.json')
      await symlink(outside, path)
      const input = { path, content: '{}', old_string: '10', new_string: '12' }
      const legacy = await f.tool(name, false).execute(input)
      f.calls.splice(0)
      expect(await f.tool(name).execute(input)).toEqual(legacy)
      expect(f.calls.map((c) => c.kind)).toEqual(['exec'])
      expect(await readFile(outside, 'utf8')).toBe('{"amount":10}\n')
    },
  )

  it.each(['write_file', 'edit_file'])(
    '%s keeps formatter output, diff, excerpt and syntax',
    async (name) => {
      const f = await fixture()
      const path = join(f.root, 'invoice.json')
      const run = async (fast: boolean) => {
        await writeFile(path, '{"amount":10}\n')
        return f
          .tool(name, fast, {
            onAfterWrite: async (p) => writeFile(p, '{\n  "amount": 12\n}\n'),
          })
          .execute({ path, content: '{"amount":12}', old_string: '10', new_string: '12' })
      }
      expect(await run(true)).toEqual(await run(false))
    },
  )

  it.each(['write_file', 'edit_file'])('%s parses after its change callback', async (name) => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    const run = async (fast: boolean) => {
      await writeFile(path, '{"amount":10}\n')
      return f
        .tool(name, fast, {
          onFileChange: () => writeFileSync(path, '{"amount":}\n'),
        })
        .execute({ path, content: '{"amount":12}', old_string: '10', new_string: '12' })
    }
    const legacy = await run(false)
    expect(legacy).toHaveProperty('syntaxError')
    expect(await run(true)).toEqual(legacy)
  })

  it('retains large native reads/writes instead of truncated transport content', async () => {
    const f = await fixture()
    const path = join(f.root, 'large.json')
    const old = JSON.stringify({ text: 'ü'.repeat(50_000) })
    const next = JSON.stringify({ text: 'ø'.repeat(50_000) })
    await writeFile(path, old)
    const legacy = await f.tool('write_file', false).execute({ path, content: next })
    await writeFile(path, old)
    f.calls.splice(0)
    expect(await f.tool('write_file').execute({ path, content: next })).toEqual(legacy)
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'read', 'write', 'exec'])
    expect(await readFile(path, 'utf8')).toBe(next)
  })

  it('discards incomplete read envelopes and rechecks safety before the native read', async () => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    await writeFile(path, '{"amount":10}\n')
    const run = f.backend.run
    let cut = true
    f.backend.run = async (command, opts) => {
      const result = await run(command, opts)
      if (cut) {
        cut = false
        return { ...result, stdout: result.stdout.slice(0, -5) }
      }
      return result
    }
    expect(
      await f.tool('edit_file').execute({ path, old_string: '10', new_string: '12' }),
    ).toMatchObject({ ok: true })
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'exec', 'read', 'write', 'exec'])
    expect(await readFile(path, 'utf8')).toBe('{"amount":12}\n')
  })

  it('never replays a write after a transport failure', async () => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    await writeFile(path, '{}')
    const run = f.backend.run
    f.backend.run = async (command, opts) => {
      const result = await run(command, opts)
      if (result.stdout.startsWith('MOL_FILE_WRITTEN')) throw new Error('transport disconnected')
      return result
    }
    expect(await f.tool('write_file').execute({ path, content: '{"paid":true}' })).toMatchObject({
      error: expect.stringContaining('transport disconnected'),
    })
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'exec'])
    expect(await readFile(path, 'utf8')).toBe('{"paid":true}')
  })

  it('rechecks a truncated parse envelope without repeating its acknowledged write', async () => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    await writeFile(path, '{}')
    const run = f.backend.run
    f.backend.run = async (command, opts) => {
      const result = await run(command, opts)
      return result.stdout.startsWith('MOL_FILE_WRITTEN')
        ? { ...result, stdout: 'MOL_FILE_WRITTEN\n{"stderr":' }
        : result
    }
    expect(await f.tool('write_file').execute({ path, content: '{"paid":}' })).toHaveProperty(
      'syntaxError',
    )
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'exec', 'exec'])
  })

  it('does not replay an unacknowledged write with a successful exit code', async () => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    await writeFile(path, '{}')
    const run = f.backend.run
    f.backend.run = async (command, opts) => {
      const result = await run(command, opts)
      return result.stdout.startsWith('MOL_FILE_WRITTEN') ? { ...result, stdout: '' } : result
    }
    expect(await f.tool('write_file').execute({ path, content: '{"paid":true}' })).toMatchObject({
      error: expect.stringContaining('not retrying an uncertain write'),
    })
    expect(f.calls.map((c) => c.kind)).toEqual(['exec', 'exec'])
    expect(await readFile(path, 'utf8')).toBe('{"paid":true}')
  })

  it.each([
    ['invoice.ts', 'export const amount: number = 12\n', false],
    ['invoice.ts', 'export const View = () => <b className="paid">paid</b>\n', true],
    ['invoice.mjs', 'export const amount = (\n', true],
  ] as const)('keeps the real parser verdict for %s', async (name, content, invalid) => {
    const f = await fixture()
    // The TypeScript parse check requires `esbuild` from the project, as a real app has it in its own
    // node_modules. The fixture lives under the OS temp dir, where nothing resolves it, so without this link
    // the check reports "no parser" and the invalid case passed only when TMPDIR sat inside a checkout.
    await mkdir(join(f.root, 'node_modules'), { recursive: true })
    await symlink(
      dirname(createRequire(import.meta.url).resolve('esbuild/package.json')),
      join(f.root, 'node_modules', 'esbuild'),
    )
    const path = join(f.root, name)
    const run = async (fast: boolean) => {
      await writeFile(path, 'export const amount = 10\n')
      return f.tool('write_file', fast).execute({ path, content })
    }
    const legacy = await run(false)
    expect(await run(true)).toEqual(legacy)
    if (invalid) expect(legacy).toHaveProperty('syntaxError')
    else expect(legacy).not.toHaveProperty('syntaxError')
  })

  it('keeps quotes, shell metacharacters, newlines and Unicode literal in paths and content', async () => {
    const f = await fixture()
    const path = join(f.root, "in'voice $(printf bad)\n新.json")
    const content = '{"title":"💡 invoïce\\npaid"}\n'
    const legacy = await f.tool('write_file', false).execute({ path, content })
    await rm(path)
    expect(await f.tool('write_file').execute({ path, content })).toEqual(legacy)
    expect(await readFile(path, 'utf8')).toBe(content)
  })

  it.each(['write_file', 'edit_file'])('%s preserves native UTF-8 BOM decoding', async (name) => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    const nativeRead = f.sandbox.readFile
    // E2B's text API uses Response.text(), which strips an initial UTF-8 BOM;
    // an exec's JSON envelope keeps a BOM embedded inside its content field.
    f.sandbox.readFile = async (p) => new Response(await nativeRead(p)).text()
    const run = async (fast: boolean) => {
      await writeFile(path, '\ufeff{"amount":10}\n')
      const events: unknown[] = []
      const result = await f.tool(name, fast, { onFileDiff: (e) => events.push(e) }).execute({
        path,
        content: '{"amount":12}\n',
        old_string: '10',
        new_string: '12',
      })
      return { result, events, text: await readFile(path, 'utf8') }
    }
    const legacy = await run(false)
    expect(legacy.events).toMatchObject([{ oldContent: '{"amount":10}\n' }])
    expect(await run(true)).toEqual(legacy)
  })

  it.each([
    ['write_file', 'read'],
    ['edit_file', 'read'],
    ['write_file', 'write'],
    ['edit_file', 'write'],
  ] as const)('%s keeps a host %sFile wrapper', async (name, wrapped) => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    if (wrapped === 'read') {
      const read = f.backend.readFile
      f.backend.readFile = async (p) => (await read(p)).replace('10', '11')
      f.legacy.readFile = f.backend.readFile
    } else {
      const write = f.backend.writeFile
      f.backend.writeFile = (p, content) => write(p, content.replace('12', '99'))
      f.legacy.writeFile = f.backend.writeFile
    }
    const run = async (fast: boolean) => {
      await writeFile(path, '{"amount":10}\n')
      const events: unknown[] = []
      const result = await f.tool(name, fast, { onFileDiff: (e) => events.push(e) }).execute({
        path,
        content: '{"amount":12}\n',
        old_string: wrapped === 'read' ? '11' : '10',
        new_string: '12',
      })
      return { result, events, text: await readFile(path, 'utf8') }
    }
    expect(await run(true)).toEqual(await run(false))
  })

  it('leaves relative-path interpretation to the native file API', async () => {
    const f = await fixture()
    const path = join(f.root, 'invoice.json')
    await writeFile(path, '{"amount":10}\n')
    await f.backend.readFileForUpdate!(path, f.root)
    // A file API's relative base need not equal the command channel's cwd.
    expect(await f.backend.readFileForUpdate!('invoice.json')).toEqual({ realPath: '' })
    expect(await f.backend.writeFileAndCheck!('invoice.json', '{}', 'true')).toBeNull()
    expect(await readFile(path, 'utf8')).toBe('{"amount":10}\n')
  })

  it('uses native operations when the sandbox has no exec capability', async () => {
    const f = await fixture()
    const { exec: _exec, ...files } = f.sandbox
    const backend = createSandboxBackend(files, f.root)
    expect(backend.readFileForUpdate).toBeUndefined()
    expect(backend.writeFileAndCheck).toBeUndefined()
    const tool = buildTools(backend).find((t) => t.name === 'write_file')!
    expect(await tool.execute({ path: 'notes.md', content: 'Invoice paid\n' })).toMatchObject({
      ok: true,
      totalLines: 2,
    })
    expect(f.calls.map((c) => c.kind)).toEqual(['read', 'write'])
  })
})

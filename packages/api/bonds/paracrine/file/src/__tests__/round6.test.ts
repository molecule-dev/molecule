import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParacrineMessage } from '@molecule/api-paracrine'

import { createProvider } from '../provider.js'
import { IMPORT_MAIN, waitForLegacyImport } from './test-helpers.js'

const LATENCY_CHILD = fileURLToPath(new URL('./fixtures/import-latency-child.mjs', import.meta.url))

interface ChildResult {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

const runChild = (args: string[], preload?: string): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const env = { ...process.env }
    if (preload !== undefined) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${preload}`
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => (stdout += chunk))
    child.stderr.on('data', (chunk: string) => (stderr += chunk))
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
  })

const legacyMessage = async (message: ParacrineMessage): Promise<void> => {
  const mailbox = join(root, 'messages', message.to)
  await mkdir(mailbox, { recursive: true })
  await writeFile(join(mailbox, `${message.id}.json`), JSON.stringify(message))
}

const message = (id: string, to = 'b'): ParacrineMessage => ({
  id,
  from: 'a',
  to,
  body: id,
  sentAt: '2026-01-01T00:00:00.000Z',
})

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-round6-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('detached published-JSON import', () => {
  it('imports all five notes across repeated open, claim, acknowledge and close cycles', async () => {
    for (let index = 0; index < 5; index += 1) {
      await legacyMessage(message(`legacy-five-${index}`))
    }

    const seen = new Set<string>()
    for (let index = 0; index < 12; index += 1) {
      const store = createProvider({ rootDir: root })
      const claimed = await store.claimPending('b', { limit: 1 })
      for (const claim of claimed.claims) seen.add(claim.message.id)
      await store.acknowledgeClaims(claimed.claims, 'b')
      store.close()
      await new Promise((resolve) => setTimeout(resolve, 25))
    }

    expect([...seen].sort()).toEqual([
      'legacy-five-0',
      'legacy-five-1',
      'legacy-five-2',
      'legacy-five-3',
      'legacy-five-4',
    ])
    await waitForLegacyImport(root)
  })

  it('keeps a hook fast while its 1,150 ms legacy read runs in the import process', async () => {
    await legacyMessage(message('legacy-slow'))
    const preload = join(root, 'slow-read.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'\nimport { syncBuiltinESMExports } from 'node:module'\nconst original = fs.readFileSync\nfs.readFileSync = function (path, ...args) {\n  if (String(path).endsWith('legacy-slow.json')) {\n    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1150)\n  }\n  return original.call(this, path, ...args)\n}\nsyncBuiltinESMExports()\n`,
    )
    const output = join(root, 'latency.json')
    const run = await runChild([LATENCY_CHILD, root, output], preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    const result = JSON.parse(await readFile(output, 'utf8')) as {
      duration: number
      claims: unknown[]
    }
    expect(result.duration).toBeLessThan(500)
    expect(result.claims).toEqual([])

    await waitForLegacyImport(root)
    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual(['legacy-slow.json'])
    store.close()
  }, 15_000)

  it('starts the worker without reusing eval-only host arguments', async () => {
    await legacyMessage(message('legacy-eval-host'))
    const moduleUrl = new URL('../../dist/index.js', import.meta.url).href
    const script = [
      `const { createProvider } = await import(${JSON.stringify(moduleUrl)})`,
      'const provider = createProvider({ rootDir: process.argv[1] })',
      "await provider.pending('b')",
      'provider.close()',
    ].join('\n')
    const run = await runChild(['--input-type=module', '--eval', script, root])
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })

    await waitForLegacyImport(root)
    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual(['legacy-eval-host.json'])
    store.close()
  })

  it('resumes a mid-batch SIGKILL without loss, duplicates, or committed re-reads', async () => {
    for (let index = 0; index < 70; index += 1) {
      await legacyMessage(message(`legacy-${String(index).padStart(3, '0')}`))
    }
    const firstLog = join(root, 'first-reads.log')
    const killedPreload = join(root, 'kill-import.mjs')
    await writeFile(
      killedPreload,
      `import fs from 'node:fs'\nimport { syncBuiltinESMExports } from 'node:module'\nconst originalRead = fs.readFileSync\nfs.readFileSync = function (path, ...args) {\n  if (String(path).includes(${JSON.stringify(join(root, 'messages'))}) && String(path).endsWith('.json')) {\n    fs.appendFileSync(${JSON.stringify(firstLog)}, String(path) + '\\n')\n    const result = originalRead.call(this, path, ...args)\n    if (String(path).endsWith('legacy-040.json')) process.kill(process.pid, 'SIGKILL')\n    return result\n  }\n  return originalRead.call(this, path, ...args)\n}\nsyncBuiltinESMExports()\n`,
    )

    const killed = await runChild([IMPORT_MAIN, root], killedPreload)
    expect(killed.signal).toBe('SIGKILL')
    const firstRead = (await readFile(firstLog, 'utf8')).trim().split('\n')
    expect(firstRead).toHaveLength(41)
    expect(basename(firstRead[40])).toBe('legacy-040.json')
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const progress = db.prepare("SELECT value FROM migration WHERE key = 'legacy'").get() as {
      value: string
    }
    expect(JSON.parse(progress.value)).toMatchObject({
      mailbox: 'b',
      fileAfter: 'legacy-031.json',
    })
    expect(db.prepare('SELECT COUNT(*) AS count FROM messages').get()).toEqual({ count: 32 })
    db.close()

    const resumedLog = join(root, 'resumed-reads.log')
    const resumePreload = join(root, 'resume-import.mjs')
    await writeFile(
      resumePreload,
      `import fs from 'node:fs'\nimport { syncBuiltinESMExports } from 'node:module'\nconst original = fs.readFileSync\nfs.readFileSync = function (path, ...args) {\n  if (String(path).includes(${JSON.stringify(join(root, 'messages'))}) && String(path).endsWith('.json')) {\n    fs.appendFileSync(${JSON.stringify(resumedLog)}, String(path) + '\\n')\n  }\n  return original.call(this, path, ...args)\n}\nsyncBuiltinESMExports()\n`,
    )
    const resumed = await runChild([IMPORT_MAIN, root], resumePreload)
    expect(resumed, resumed.stderr).toMatchObject({ code: 0, signal: null })
    const reread = (await readFile(resumedLog, 'utf8'))
      .trim()
      .split('\n')
      .map((name) => basename(name))
    expect(reread).toHaveLength(38)
    expect(reread[0]).toBe('legacy-032.json')
    expect(reread.some((name) => name <= 'legacy-031.json')).toBe(false)

    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toHaveLength(70)
    store.close()
    const verified = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(verified.prepare('SELECT COUNT(*) AS count FROM messages').get()).toEqual({ count: 70 })
    expect(verified.prepare('SELECT COUNT(*) AS count FROM deliveries').get()).toEqual({
      count: 70,
    })
    verified.close()
  }, 15_000)

  it('runs one import for two hooks and two simultaneous import processes', async () => {
    for (let index = 0; index < 40; index += 1) {
      await legacyMessage(message(`legacy-concurrent-${String(index).padStart(2, '0')}`))
    }
    const readLog = join(root, 'concurrent-reads.log')
    const preload = join(root, 'observe-import.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'\nimport { syncBuiltinESMExports } from 'node:module'\nconst original = fs.readFileSync\nfs.readFileSync = function (path, ...args) {\n  if (String(path).includes(${JSON.stringify(join(root, 'messages'))}) && String(path).endsWith('.json')) {\n    fs.appendFileSync(${JSON.stringify(readLog)}, String(path) + '\\n')\n    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)\n  }\n  return original.call(this, path, ...args)\n}\nsyncBuiltinESMExports()\n`,
    )
    const pendingChild = fileURLToPath(new URL('./fixtures/pending-child.mjs', import.meta.url))
    const outputs = [join(root, 'pending-a.json'), join(root, 'pending-b.json')]
    const runs = await Promise.all([
      ...outputs.map((output) => runChild([pendingChild, root, 'b', output], preload)),
      runChild([IMPORT_MAIN, root], preload),
      runChild([IMPORT_MAIN, root], preload),
    ])
    for (const run of runs) expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    for (const output of outputs) {
      expect(JSON.parse(await readFile(output, 'utf8')) as string[]).toHaveLength(40)
    }
    const imported = (await readFile(readLog, 'utf8'))
      .trim()
      .split('\n')
      .map((name) => basename(name))
      .sort()
    const expected = Array.from(
      { length: 40 },
      (_, index) => `legacy-concurrent-${String(index).padStart(2, '0')}.json`,
    ).sort()
    expect(imported).toEqual(expected)
  }, 20_000)
})

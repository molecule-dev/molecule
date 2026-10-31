/**
 * CLI tests — the harness-agnostic half of the store.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PARACRINE_BROADCAST } from '@molecule/api-paracrine'

import { runCli } from '../cli.js'
import { createProvider } from '../provider.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-cli-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('paracrine send/recv/ack/reads', () => {
  it('a CLI send is a bonded receive, and a bonded ack is a CLI reads', async () => {
    const [sentLine] = await runCli(
      ['send', '--from', 'codex-1', '--to', 'bench-1', '--subject', 'images', 'ok to delete?'],
      { rootDir: root },
    )
    const sent = JSON.parse(sentLine) as { id: string }
    expect(sent.id).toBeTruthy()

    const store = createProvider({ rootDir: root })
    const received = await store.receive({ for: 'bench-1' })
    expect(received[0]?.body).toBe('ok to delete?')

    await store.ack(sent.id, 'bench-1')
    const [readLine] = await runCli(['reads', sent.id], { rootDir: root })
    expect(JSON.parse(readLine)).toMatchObject({ by: 'bench-1' })
  })

  it('recv --unread drops acked messages; --text renders for humans', async () => {
    await runCli(['send', '--from', 'a', '--to', 'b', 'first'], { rootDir: root })
    await runCli(['send', '--from', 'a', '--to', 'b', 'second'], { rootDir: root })
    const unread = await runCli(['recv', '--for', 'b', '--unread'], { rootDir: root })
    expect(unread.map((line) => JSON.parse(line).body)).toEqual(['first', 'second'])

    const first = JSON.parse((await runCli(['recv', '--for', 'b'], { rootDir: root }))[0]) as {
      id: string
    }
    await runCli(['ack', '--for', 'b', first.id], { rootDir: root })
    const after = await runCli(['recv', '--for', 'b', '--unread'], { rootDir: root })
    expect(after.map((line) => JSON.parse(line).body)).toEqual(['second'])

    const text = await runCli(['recv', '--for', 'b', '--text'], { rootDir: root })
    expect(text.join('\n')).toContain('second')
  })

  it('supports broadcast addressing and subject-prefix filtering', async () => {
    await runCli(
      ['send', '--from', 'a', '--to', PARACRINE_BROADCAST, '--subject', 'freeze', 'lifted'],
      { rootDir: root },
    )
    const narrowed = await runCli(['recv', '--for', 'anyone', '--prefix', 'freeze'], {
      rootDir: root,
    })
    expect(JSON.parse(narrowed[0]).body).toBe('lifted')
  })

  it('the executable suppresses only the node:sqlite ExperimentalWarning', async () => {
    const preload = join(root, 'warnings.mjs')
    await writeFile(
      preload,
      `setImmediate(() => {
  process.emitWarning('SQLite is an experimental feature and might change at any time', 'ExperimentalWarning')
  process.emitWarning('SQLite plugin has its own warning', 'ExperimentalWarning')
  process.emitWarning('another experimental feature', 'ExperimentalWarning')
  process.emitWarning('ordinary warning')
})\n`,
    )
    const cli = fileURLToPath(new URL('../../dist/cli-main.js', import.meta.url))
    const run = spawnSync(process.execPath, ['--import', preload, cli, 'recv', '--for', 'b'], {
      encoding: 'utf8',
      env: { ...process.env, PARACRINE_DIR: root },
    })
    expect(run.status).toBe(0)
    expect(run.stderr).not.toContain(
      'SQLite is an experimental feature and might change at any time',
    )
    expect(run.stderr).toContain('SQLite plugin has its own warning')
    expect(run.stderr).toContain('another experimental feature')
    expect(run.stderr).toContain('ordinary warning')
  })

  it('usage errors name the fix and exit through the caller', async () => {
    await expect(runCli(['send', '--from', 'a', '--to', 'b'], { rootDir: root })).rejects.toThrow(
      /body is required/,
    )
    await expect(runCli(['nope'], { rootDir: root })).rejects.toThrow(/^usage:/)
  })
})

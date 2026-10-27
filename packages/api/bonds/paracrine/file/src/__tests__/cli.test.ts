/**
 * CLI tests — the harness-agnostic half of the store.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

  it('usage errors name the fix and exit through the caller', async () => {
    await expect(runCli(['send', '--from', 'a', '--to', 'b'], { rootDir: root })).rejects.toThrow(
      /body is required/,
    )
    await expect(runCli(['nope'], { rootDir: root })).rejects.toThrow(/^usage:/)
  })
})

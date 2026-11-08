/** Native byte-counted reads preserve the log's own leading blank lines. */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseRunningLogRead, RUNNING_LOG_READ_BYTES, runningLogReadCommand } from '../utilities.js'

describe('the contiguous running log byte boundary', () => {
  it.each(['\nRunning\n✘ member failed\n', '\n\n  \t\n✘ member failed\n'])(
    'preserves every leading byte: %j',
    (log) => {
      const dir = mkdtempSync(join(tmpdir(), 'running-log-bytes-'))
      try {
        const file = join(dir, 'task.log')
        writeFileSync(file, log)
        const read = parseRunningLogRead(
          execFileSync('sh', ['-c', runningLogReadCommand(file)], { encoding: 'utf8' }),
        )
        expect(read).toEqual({ text: log, bytes: Buffer.byteLength(log) })
        expect(Buffer.byteLength(read!.text)).toBe(read!.bytes)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )

  it('retains a real clipped window and rejects a missing size header', () => {
    const tail = 'x'.repeat(RUNNING_LOG_READ_BYTES)
    expect(parseRunningLogRead(`${tail.length + 100}\n${tail}`)).toEqual({
      text: tail,
      bytes: tail.length + 100,
    })
    expect(parseRunningLogRead('not a size\nlog')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'

import { failureBlocks, failureCausesNote, failuresByCause } from '../utilities.js'

const heading = (n: number, title = 'keeps a saved preference', project = 'chromium') =>
  `  ${n}) [${project}] › preferences.spec.ts:12:3 › Preferences › ${title}`
const attempt = (n: number, error: string, retry = 0, title?: string, project?: string) =>
  `${heading(n, title, project)}\n\n${retry ? `    Retry #${retry} ───────────────────\n\n` : ''}${error}\n`
const error = (selector: string) =>
  `    TimeoutError: page.click: Timeout 5000ms exceeded.\n    Call log:\n      - waiting for locator('${selector}')\n`

describe('a native retry belongs to its test', () => {
  it('merges separately streamed retry blocks and keeps the first attempt error and locator', () => {
    const log = attempt(1, error('.save')) + attempt(1, error('.different'), 1) + '  1 failed\n'
    expect(failureBlocks(log)).toHaveLength(1)
    expect(failureBlocks(log)[0]).toContain('Retry #1')
    const causes = failuresByCause(log)
    expect(causes).toHaveLength(1)
    expect(causes[0].tests).toHaveLength(1)
    expect(causes[0].message).toContain("locator('.save')")
    expect(JSON.stringify(causes)).not.toContain('.different')
    const note = failureCausesNote(log, [], undefined, [], [], '')!
    expect(note).toContain('1 failure in this run')
    expect(note).not.toMatch(/`Retry #|2 failures/)
  })

  it('uses a retry error only when the first attempt has no error body', () => {
    const log = attempt(1, '') + attempt(1, error('.save'), 1) + attempt(1, error('.other'), 2)
    expect(failuresByCause(log)).toMatchObject([
      { message: expect.stringContaining("locator('.save')"), tests: [expect.anything()] },
    ])
    expect(JSON.stringify(failuresByCause(log))).not.toContain('.other')
  })

  it('does not mistake an errorless first attempt call log for its error', () => {
    const log =
      attempt(1, "    Call log:\n      - waiting for locator('.first')\n") +
      attempt(1, error('.save'), 1)
    expect(failuresByCause(log)).toMatchObject([
      { message: expect.stringContaining("locator('.save')"), tests: [expect.anything()] },
    ])
    expect(failuresByCause(log)[0].message).toContain('TimeoutError')
  })

  it('keeps several tests distinct when their retries interleave', () => {
    const log =
      attempt(1, error('.save')) +
      attempt(2, error('.cancel'), 0, 'cancels an edit') +
      attempt(1, error('.save'), 1) +
      attempt(2, error('.cancel'), 1, 'cancels an edit') +
      '  2 failed\n'
    expect(failureBlocks(log)).toHaveLength(2)
    expect(failuresByCause(log)).toHaveLength(2)
    expect(failureCausesNote(log, [], undefined, [], [], '')).toContain('2 failures in this run')
  })

  it('does not merge identical test titles from different browser projects', () => {
    const log = attempt(1, error('.save')) + attempt(2, error('.save'), 1, undefined, 'webkit')
    expect(failureBlocks(log)).toHaveLength(2)
  })

  it('keeps a later independent first attempt separate from a retry', () => {
    const log = attempt(1, error('.save')) + '  1 failed\n' + attempt(1, error('.cancel'))
    expect(failureBlocks(log)).toHaveLength(2)
    expect(failuresByCause(log)).toHaveLength(2)
  })

  it('does not count a flaky-then-passed retry as an application failure', () => {
    const log =
      attempt(1, error('.save')) +
      '  1 flaky\n    [chromium] › preferences.spec.ts:12:3 › Preferences › keeps a saved preference\n' +
      '  4 passed (2s)\n'
    expect(failuresByCause(log)).toEqual([])
    expect(failureCausesNote(log)).toBeNull()
  })

  it('uses one attempt consistently for the signature and expected/received evidence', () => {
    const log =
      attempt(
        1,
        '    Error: expect(locator).toHaveValue(expected) failed\n    Locator: locator("textarea")\n    Expected: "first"\n    Received: ""\n',
      ) +
      attempt(
        1,
        '    Error: expect(locator).toHaveValue(expected) failed\n    Locator: locator("input")\n    Expected: "second"\n    Received: "old"\n',
        1,
      )
    expect(failuresByCause(log)).toHaveLength(1)
    expect(failuresByCause(log)[0].evidence).toEqual(['Expected: "first"', 'Received: ""'])
  })
})

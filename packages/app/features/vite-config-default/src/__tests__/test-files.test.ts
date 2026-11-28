/**
 * `passesWithNoTestFiles`: a plain run of an app with no unit tests passes, and a run that names
 * files still fails when none match.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { passesWithNoTestFiles } from '../test-files.js'

describe('passesWithNoTestFiles', () => {
  it.each([[['run']], [['run', '--reporter=verbose']], [['run', '--maxWorkers', '4']], [[]]])(
    'passes a run that names no files (%j)',
    async (argv) => {
      expect(await passesWithNoTestFiles(argv, true)).toBe(true)
    },
  )

  it.each([
    [['run', 'src/missing.test.ts']],
    [['src/orders']],
    [['run', '--reporter', 'verbose', 'x']],
  ])('fails a run that names files (%j)', async (argv) => {
    expect(await passesWithNoTestFiles(argv, true)).toBe(false)
  })

  it('keeps vitest’s own default outside vitest', async () => {
    expect(await passesWithNoTestFiles(['run'], false)).toBe(false)
  })
})

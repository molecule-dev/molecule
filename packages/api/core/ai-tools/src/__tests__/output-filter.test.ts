import { describe, expect, it } from 'vitest'

import { outputFilterAfterRunner } from '../output-filter.js'

/** The runner this suite is about: a direct Hurl invocation (`npx`/`timeout` are taken away). */
const isHurl = (segment: { program: string }): boolean => segment.program === 'hurl'

describe('outputFilterAfterRunner — the command cut its own failure detail', () => {
  it('reads m147’s `| tail -6` and hands back the same command without it', () => {
    const command = 'hurl --variable uid=1 --test /tmp/t.hurl 2>&1 | tail -6'
    const filter = outputFilterAfterRunner(command, isHurl)
    expect(filter).not.toBeNull()
    expect(filter!.stage).toBe('tail -6')
    expect(filter!.pipe).toBe('| tail -6')
    // A slice of the original, not a re-typing: the variable value, the redirect and the spacing
    // the runner was sent with all survive.
    expect(filter!.command).toBe('hurl --variable uid=1 --test /tmp/t.hurl 2>&1')
  })

  it('reads every cutting filter, and keeps a `cd`/`timeout`/`npx` prefix intact', () => {
    for (const stage of ['head -20', 'grep -i error', 'sed -n 1,40p', 'awk /x/', 'cut -c1-80']) {
      const filter = outputFilterAfterRunner(
        `cd api && timeout 280 npx hurl --test hurl/*.hurl 2>&1 | ${stage}`,
        isHurl,
      )
      expect(filter?.stage, stage).toBe(stage)
      expect(filter?.command, stage).toBe('cd api && timeout 280 npx hurl --test hurl/*.hurl 2>&1')
    }
  })

  it('is null for a filter that does not drop lines, a filter BEFORE the runner, and a chain', () => {
    // `tee`/`sort`/`wc` re-shape output without hiding a failure.
    expect(outputFilterAfterRunner('hurl --test x.hurl 2>&1 | tee run.log', isHurl)).toBeNull()
    expect(outputFilterAfterRunner('hurl --test x.hurl | sort', isHurl)).toBeNull()
    // Something else was piped, not the run.
    expect(
      outputFilterAfterRunner('cat run.log | tail -20 && hurl --test x.hurl', isHurl),
    ).toBeNull()
    // A chain: cutting the middle stage out would leave a dangling pipe.
    expect(outputFilterAfterRunner('hurl --test x.hurl | grep -i error | wc -l', isHurl)).toBeNull()
    // No pipe at all, and a runner that never appears.
    expect(outputFilterAfterRunner('hurl --test x.hurl', isHurl)).toBeNull()
    expect(outputFilterAfterRunner('npx playwright test | tail -20', isHurl)).toBeNull()
    expect(outputFilterAfterRunner('', isHurl)).toBeNull()
  })
})

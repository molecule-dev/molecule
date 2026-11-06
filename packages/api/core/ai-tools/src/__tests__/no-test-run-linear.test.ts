import { describe, expect, it } from 'vitest'

import { commandRunsNoTests } from '../no-test-run.js'

describe('runner classification with long ordinary lines', () => {
  it.each([
    {
      prefix: '#' + 'x'.repeat(55 * 1024),
      runner: 'hurl --test health.hurl',
      informational: false,
      name: 'comment before a suite',
    },
    {
      prefix: 'echo ' + 'x'.repeat(55 * 1024),
      runner: 'hurl --help',
      informational: true,
      name: 'ordinary output before help',
    },
  ])(
    'does not retry the heredoc prefix at every character ($name)',
    ({ prefix, runner, informational }) => {
      const start = performance.now()
      expect(commandRunsNoTests(prefix + '\n' + runner)).toBe(informational)
      // This is a complexity regression, with ample margin for shared CI: the bad scan takes
      // seconds on this input, while boundary-anchored scanning takes milliseconds.
      expect(performance.now() - start).toBeLessThan(500)
    },
  )

  it('still removes heredoc data after shell separators before classifying the actual runner', () => {
    expect(commandRunsNoTests(`echo ready; cat <<'EOF'\nplaywright test\nEOF\nhurl --help`)).toBe(
      true,
    )
    expect(commandRunsNoTests(`echo ready && cat <<'EOF'\nhurl --help\nEOF\nplaywright test`)).toBe(
      false,
    )
  })
})

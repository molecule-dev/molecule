import { describe, expect, it } from 'vitest'

import { commandRunsNoTests } from '../no-test-run.js'

/**
 * X1 xr-molecule-flash-m79 (+18:47) held a CONFIG CHECK: a Playwright config written to `/tmp`,
 * copied beside the suite and used with `--list`, came back `held: true, status: not_run` with a
 * ~4 KB `suiteNote` telling the model to send the same command with `--max-failures=15`, plus an
 * env block about variables "this run left unset". The model never got its list, dropped the
 * approach, and its next command was held again too. These are the classifier's cases: the
 * command that runs no test, and the ones that do.
 */

/** m79's command, verbatim — the config check that was held (`.agent-scratch-m79/chat.json`). */
const M79_LIST = `cd /workspace/fixtures/realworld/specs/e2e && cat > /tmp/pw.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test'
import base from './playwright.base'

export default defineConfig({
  ...base,
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    ...((base as any).use ?? {}),
    baseURL: 'http://localhost:5173',
    trace: 'off',
  },
})
EOF
cp /tmp/pw.config.ts playwright.local.config.ts && npx playwright test -c playwright.local.config.ts --list 2>&1 | tail -5`

describe('a command that invokes a runner only to print (flash-m79)', () => {
  it('reads the held command as running no test', () => {
    expect(commandRunsNoTests(M79_LIST)).toBe(true)
  })

  it.each([
    ['playwright --list', 'cd /workspace/my-app/app && npx playwright test --list'],
    ['playwright --list behind a pipe', 'npx playwright test --list 2>&1 | tail -5'],
    ['playwright --help', 'npx playwright test --help'],
    ['playwright -h', 'npx playwright test -h'],
    ['playwright --version', 'npx playwright test --version'],
    ['playwright show-report', 'npx playwright show-report'],
    ['playwright show-trace', 'npx playwright show-trace trace.zip'],
    ['playwright codegen', 'npx playwright codegen http://localhost:5173'],
    ['playwright install', 'npx playwright install --with-deps chromium'],
    ['playwright merge-reports', 'npx playwright merge-reports --reporter html ./blob-report'],
    ['vitest --list', 'npx vitest --list'],
    ['vitest list', 'npx vitest list'],
    ['vitest --help', 'npx vitest run --help'],
    ['hurl --help', 'hurl --help'],
    ['hurl -h', 'hurl -h'],
    ['hurl --version', 'hurl --version'],
  ])('runs no test: %s', (_label, command) => {
    expect(commandRunsNoTests(command)).toBe(true)
  })

  it.each([
    ['a whole run', 'npx playwright test'],
    [
      'a whole run with a config',
      'cd /workspace/my-app/app && npx playwright test -c playwright.local.config.ts',
    ],
    ['a capped diagnosis', 'npx playwright test --max-failures=15'],
    ['a narrowed run', 'npx playwright test e2e/home.spec.ts --grep "signup"'],
    ['a run after an install', 'npx playwright install chromium && npx playwright test'],
    ['a run after a list', 'npx playwright test --list && npx playwright test'],
    ['a vitest run', 'npx vitest run src/'],
    ['a hurl run', 'hurl --test --jobs 1 hurl/*.hurl'],
    ['a hurl run named by file', 'bash run-api-tests-hurl.sh'],
    ['the project test script', 'npm test'],
    ['a command with no runner at all', 'ls -la && cat playwright.config.ts'],
    [
      'a script that lists, written by the command',
      "cat > /tmp/run.sh <<'EOF'\nnpx playwright test --list\nEOF\necho written",
    ],
  ])('still runs tests: %s', (_label, command) => {
    expect(commandRunsNoTests(command)).toBe(false)
  })

  it('reads --list as a value, not a flag', () => {
    // A `--list` the command passes as another option's value, or as part of a longer word, is
    // not the runner's own flag; only the whole token counts.
    expect(commandRunsNoTests('npx playwright test --grep --list-failures')).toBe(false)
    expect(commandRunsNoTests('npx playwright test --grep list')).toBe(false)
  })

  /**
   * X1 xr-molecule-flash-m197 (+05:18): the version probe in front of the suite's own script made
   * the whole command read as "installs/prints and runs nothing" — a 13/13 Hurl pass was never
   * counted as a run. A program this module cannot place is not "only printing": it may be the
   * suite's own script, so the command is not a print-only command.
   */
  it('does not read a probe beside a program it cannot place as “only prints”', () => {
    const command =
      'cd /workspace/fixtures/realworld/specs/api && hurl --version | head -2 && ' +
      'HOST=http://localhost:4000 ./run-api-tests-hurl.sh 2>&1 | tail -60'
    expect(commandRunsNoTests(command)).toBe(false)
    // The probe with nothing but output plumbing beside it still runs no test.
    expect(commandRunsNoTests('hurl --version | head -2')).toBe(true)
    expect(commandRunsNoTests('npx playwright test --list 2>&1 | tail -5')).toBe(true)
  })

  it('answers for the empty and non-command input without claiming anything', () => {
    expect(commandRunsNoTests('')).toBe(false)
    expect(commandRunsNoTests('   ')).toBe(false)
    expect(commandRunsNoTests(undefined as unknown as string)).toBe(false)
  })
})

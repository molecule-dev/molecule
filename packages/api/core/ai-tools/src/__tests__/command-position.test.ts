import { describe, expect, it } from 'vitest'

import { commandSegments, runsInCommandPosition } from '../command-position.js'
import { commandRunsNoTests } from '../no-test-run.js'
import { isPlaywrightRunCommand, isSuiteRunCommand } from '../utilities.js'

/**
 * X1 xr-molecule-flash-m81 (+20:03), verbatim from the run's transcript: the executor set the
 * whole Playwright suite running in the background and, while it ran, went to read the Hurl
 * runner — which the platform answered by HOLDING it ("a Playwright suite is already running
 * against this app and database … wait for it"), for a command that writes nothing and runs
 * nothing. The hurl pattern matched the runner script's NAME as an argument of `head`.
 */
const M81_READ =
  'cd /workspace/fixtures/realworld/specs/api && ls && head -30 run-api-tests-hurl.sh'

/** How molecule-dev's KIND_COMMANDS names the Hurl runner (`suite-proof.ts`). */
const HURL_INVOCATION = /^hurl\s+[^|\n]*(?:--test|\.hurl)|^run-api-tests[\w-]*\.sh\b/

/** How molecule-dev's KIND_COMMANDS names the Playwright runner. */
const PLAYWRIGHT_INVOCATION = /^playwright\s+test\b/

/**
 * Every way a command READS a runner script or a runner's name: the program the shell runs is
 * the reader, and the runner is its argument. None of these measures anything.
 */
const READER_FORMS: ReadonlyArray<[string, string]> = [
  ['head', 'head -30 run-api-tests-hurl.sh'],
  ['tail', 'tail -20 run-api-tests-hurl.sh'],
  ['cat', 'cat run-api-tests-hurl.sh'],
  ['less', 'less run-api-tests-hurl.sh'],
  ['grep', 'grep -n "hurl --test" run-api-tests-hurl.sh'],
  ['the stream editor’s print form', "sed -n '1,60p' run-api-tests-hurl.sh"],
  ['awk', "awk 'NR<40' run-api-tests-hurl.sh"],
  ['wc', 'wc -l run-api-tests-hurl.sh'],
  ['ls', 'ls -l run-api-tests-hurl.sh'],
  ['file', 'file run-api-tests-hurl.sh'],
  ['stat', 'stat run-api-tests-hurl.sh'],
  ['git show', 'git show HEAD:run-api-tests-hurl.sh'],
  ['git diff', 'git diff HEAD -- run-api-tests-hurl.sh'],
  ['git log', 'git log -p -- run-api-tests-hurl.sh'],
]

describe('commandSegments — which word a segment actually runs (flash-m81)', () => {
  it('reads m81’s command as three reads: cd, ls, head — no Hurl run', () => {
    expect(commandSegments(M81_READ).map((segment) => segment.program)).toEqual([
      'cd',
      'ls',
      'head',
    ])
    expect(commandSegments(M81_READ).at(-1)?.args).toEqual(['-30', 'run-api-tests-hurl.sh'])
  })

  it('keeps a pipeline’s stages apart, and the wrapper words out of the program', () => {
    expect(
      commandSegments('npx playwright test --list 2>&1 | tail -5').map((s) => s.program),
    ).toEqual(['playwright', 'tail'])
    expect(
      commandSegments(
        'BASE_URL=http://x nice -n 10 timeout 280 /tmp/h/node_modules/.bin/playwright test',
      ).map((s) => s.program),
    ).toEqual(['playwright'])
    expect(commandSegments('vitest run').map((s) => s.program)).toEqual(['vitest'])
  })

  it('opens a `sh -c` string, and the package runners that run the next word', () => {
    expect(
      commandSegments(`sh -c 'cd api && hurl --test hurl/*.hurl'`).map((s) => s.program),
    ).toEqual(['cd', 'hurl'])
    expect(commandSegments('bun x playwright test').map((s) => s.program)).toEqual(['playwright'])
    expect(commandSegments('bunx @usebruno/cli run suite').map((s) => s.program)).toEqual([
      '@usebruno/cli',
    ])
    // `yarn test` is the program itself, not a package runner.
    expect(commandSegments('yarn test').map((s) => s.program)).toEqual(['yarn'])
  })

  it('leaves a `|` inside a quoted pattern with the command it belongs to', () => {
    expect(commandSegments('grep -n "testMatch\\|testDir" e2e/playwright.base.ts')).toHaveLength(1)
  })

  it('answers the runner question for every segment at once', () => {
    expect(runsInCommandPosition('cd api && hurl --test hurl/*.hurl', HURL_INVOCATION)).toBe(true)
    expect(runsInCommandPosition(M81_READ, HURL_INVOCATION)).toBe(false)
    expect(runsInCommandPosition('cd e2e && npx playwright test', PLAYWRIGHT_INVOCATION)).toBe(true)
    expect(runsInCommandPosition('head -5 pw.sh', PLAYWRIGHT_INVOCATION)).toBe(false)
  })
})

describe('a runner named as an argument is not an invocation (flash-m81)', () => {
  it.each(READER_FORMS)('%s reading the runner script is no Hurl run', (_label, command) => {
    expect(runsInCommandPosition(command, HURL_INVOCATION)).toBe(false)
    expect(runsInCommandPosition(command, PLAYWRIGHT_INVOCATION)).toBe(false)
  })

  it.each(READER_FORMS)('%s invoking no runner runs no test', (_label, command) => {
    expect(commandRunsNoTests(command)).toBe(false)
  })

  it('reads a Playwright run named in an argument as no run either', () => {
    for (const command of [
      'head -30 run-tests.sh && grep -n "npx playwright test" e2e/README.md',
      'git show HEAD:e2e/run-tests.sh | grep playwright',
    ]) {
      expect(isPlaywrightRunCommand(command), command).toBe(false)
      expect(isSuiteRunCommand(command), command).toBe(false)
    }
  })

  it('still names the run when the wrapper is real', () => {
    for (const command of [
      'bash run-api-tests-hurl.sh',
      './run-api-tests-hurl.sh',
      'HOST=http://localhost:4000 bash ./run-api-tests-hurl.sh',
      'hurl --test --jobs 1 hurl/*.hurl',
      'cd specs/api && hurl articles.hurl',
    ]) {
      expect(runsInCommandPosition(command, HURL_INVOCATION), command).toBe(true)
    }
    for (const command of [
      'npx playwright test',
      'timeout 280 /workspace/node_modules/.bin/playwright test > /tmp/run.log 2>&1',
      'cd e2e && npx playwright test --grep-invert "login"',
    ]) {
      expect(runsInCommandPosition(command, PLAYWRIGHT_INVOCATION), command).toBe(true)
      expect(isPlaywrightRunCommand(command), command).toBe(true)
    }
  })
})

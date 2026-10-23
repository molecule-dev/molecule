/**
 * A compound browser command keeps the FIRST walk's progressive output.
 *
 * xr-molecule-flash-l21 (+21:27) chained two Playwright walks — a whole-directory `specs` walk
 * followed by `auth.spec.ts` — and the launcher rewrote only the LAST one. The first walk kept its
 * own `--reporter=line` and its `| tail -5`, so the log held `2 failed`, `65 skipped`,
 * `72 passed (3.6m)` and two failure NAMES: no `✓`/`✘` marks, no error body. The second binary
 * then did not exist (`…/app/node_modules/.bin/playwright: not found`), the machine report was
 * never written, and diagnosing the first walk's failures needed another 3.6-minute run.
 *
 * These tests drive the composed launcher (`streamingBackgroundCommand`) and then RUN its output
 * against disposable offline stub runners — one that prints a failure body and progress, one that
 * cannot start — to prove the first walk's body survives in the log. Nothing here touches a real
 * app, database, network or credential.
 */

import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { streamingBackgroundCommand, stripTrailingSuiteFilters } from '../utilities.js'

/** Directories created by one test, removed after it. */
let scratch: string | null = null

afterEach(() => {
  if (scratch !== null) rmSync(scratch, { recursive: true, force: true })
  scratch = null
})

/** A fresh empty directory under the system temp dir. */
function scratchDir(): string {
  scratch = mkdtempSync(join(tmpdir(), 'mol-compound-browser-'))
  return scratch
}

/** Write an executable stub program. */
function stub(dir: string, name: string, body: string): string {
  const path = join(dir, name)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `#!/bin/sh\n${body}\n`, 'utf8')
  chmodSync(path, 0o755)
  return path
}

/** Run a command exactly as the launcher would, and return everything it printed. */
function run(command: string, cwd: string): { output: string; status: number | null } {
  const result = spawnSync('sh', ['-c', command], { cwd, encoding: 'utf8' })
  return { output: `${result.stdout}${result.stderr}`, status: result.status }
}

/** The progressive lines a `list` reporter writes, with one failure's own error under it. */
const FIRST_WALK = [
  'Running 138 tests using 4 workers',
  '  ✓  1 [chromium] › home.spec.ts:3:1 › loads the feed (210ms)',
  '  ✘  2 [chromium] › social.spec.ts:40:1 › follows a user (1.2s)',
  '    Error: expect(locator).toHaveText() failed',
  '    Expected: "1 follower"',
  '    Received: "0 followers"',
  '  ✓  3 [chromium] › profile.spec.ts:8:1 › shows the profile (180ms)',
  '  ✓  4 [chromium] › settings.spec.ts:5:1 › saves settings (240ms)',
  '  2 failed',
  '  65 skipped',
  '  72 passed (3.6m)',
].join('\n')

/** The failure's own error, which the old `| tail -5` cut out of the log. */
const FIRST_BODY = 'Error: expect(locator).toHaveText() failed'

/** A second walk's own failure body, distinct from the first. */
const SECOND_WALK = [
  'Running 3 tests using 1 worker',
  '  ✘  1 [chromium] › auth.spec.ts:12:3 › signs in (900ms)',
  '    Error: expect(page).toHaveURL() failed',
  '    Expected: "/home"',
  '    Received: "/login"',
  '  1 failed',
].join('\n')

const SECOND_BODY = 'Error: expect(page).toHaveURL() failed'

/** The observed command's own shape: a whole-directory walk, then one spec through an absolute bin. */
function observedShape(first: string, second: string, app: string, specs: string): string {
  return (
    `cd ${app} && BASE_URL=http://127.0.0.1:4173 TEST_MODE=fullstack ${first} test ` +
    '--config e2e-suite.config.ts --retries=0 --reporter=line specs 2>&1 | tail -5; echo START; ' +
    `cd ${specs} && BASE_URL=http://127.0.0.1:4173 TEST_MODE=fullstack ${second} test ` +
    `--config ${app}/e2e-suite.config.ts --retries=0 --reporter=line auth.spec.ts 2>&1 | tail -40`
  )
}

describe('compound browser commands', () => {
  it('rewrites the observed two-walk command on BOTH invocations, never the last alone', () => {
    const observed =
      'cd /workspace/my-app/app && BASE_URL=http://127.0.0.1:4173 TEST_MODE=fullstack ' +
      'npx playwright test --config e2e-suite.config.ts --retries=0 --reporter=line specs ' +
      '2>&1 | tail -5; echo START; cd /workspace/fixtures/realworld/specs/e2e && ' +
      'BASE_URL=http://127.0.0.1:4173 TEST_MODE=fullstack ' +
      '/workspace/my-app/app/node_modules/.bin/playwright test ' +
      '--config /workspace/my-app/app/e2e-suite.config.ts --retries=0 --reporter=line ' +
      'auth.spec.ts 2>&1 | tail -40'
    expect(streamingBackgroundCommand(observed)).toEqual({
      command:
        'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd /workspace/my-app/app && ' +
        'BASE_URL=http://127.0.0.1:4173 TEST_MODE=fullstack npx playwright test ' +
        '--config e2e-suite.config.ts --retries=0 --reporter=list specs 2>&1; echo START; ' +
        'cd /workspace/fixtures/realworld/specs/e2e && BASE_URL=http://127.0.0.1:4173 ' +
        'TEST_MODE=fullstack /workspace/my-app/app/node_modules/.bin/playwright test ' +
        '--config /workspace/my-app/app/e2e-suite.config.ts --retries=0 --reporter=list ' +
        'auth.spec.ts 2>&1',
      changes: [
        'Dropped the trailing `| tail -5`: it holds all output back until the command ends, ' +
          'and wait_for_task returns the end of the log anyway.',
        'Dropped the trailing `| tail -40`: it holds all output back until the command ends, ' +
          'and wait_for_task returns the end of the log anyway.',
        'Switched the test reporters to `--reporter=list`: `list` writes each test result as it ' +
          'finishes and is the shape the platform reads back from a background run, and it is ' +
          'the only printing reporter — two of them write every result into the log twice ' +
          '(X1 flash-m83).',
        'Each failure’s own error is now written into the log as that test fails, not only in ' +
          'the summary at the end — so a run that is still walking already says what its ' +
          'failures are, and you need not wait for it to end to start on them.',
        'Switched the earlier test run’s reporters to `--reporter=list`: `list` writes each test ' +
          'result as it finishes and is the shape the platform reads back, and it is the only ' +
          'printing reporter — two of them write every result into the log twice (X1 flash-m83).',
      ],
    })
  })

  it('keeps the first walk’s failure body when the second binary cannot start', () => {
    const dir = scratchDir()
    const app = join(dir, 'app')
    const specs = join(dir, 'specs')
    mkdirSync(app, { recursive: true })
    mkdirSync(specs, { recursive: true })
    const first = stub(join(dir, 'bin'), 'playwright', `cat <<'OUT'\n${FIRST_WALK}\nOUT\nexit 1`)
    const missing = join(dir, 'missing-bin', 'playwright')
    const command = observedShape(first, missing, app, specs)

    // Red: the command as the executor sent it keeps only the tally of the first walk.
    const raw = run(command, app)
    expect(raw.output).toContain('72 passed (3.6m)')
    expect(raw.output).toContain('START')
    expect(raw.output).not.toContain(FIRST_BODY)

    // Green: the launched command keeps the first walk's progress and error body, and the second
    // run's failure to start is still reported — a missing binary stays failed, not a pass.
    const { command: launched } = streamingBackgroundCommand(command)
    const green = run(launched, app)
    expect(green.output).toContain('✘  2 [chromium] › social.spec.ts:40:1 › follows a user')
    expect(green.output).toContain(FIRST_BODY)
    expect(green.output).toContain('START')
    expect(green.output).toMatch(/not found|No such file or directory/)
    expect(green.status).not.toBe(0)
  })

  it('keeps both walks’ failure bodies when two distinct runners both run', () => {
    const dir = scratchDir()
    const app = join(dir, 'app')
    const specs = join(dir, 'specs')
    mkdirSync(app, { recursive: true })
    mkdirSync(specs, { recursive: true })
    const first = stub(join(dir, 'bin'), 'playwright', `cat <<'OUT'\n${FIRST_WALK}\nOUT\nexit 1`)
    const second = stub(
      join(dir, 'second-bin'),
      'playwright',
      `cat <<'OUT'\n${SECOND_WALK}\nOUT\nexit 1`,
    )
    const command = observedShape(first, second, app, specs)

    const raw = run(command, app)
    expect(raw.output).not.toContain(FIRST_BODY)
    expect(raw.output).toContain(SECOND_BODY)

    const { command: launched } = streamingBackgroundCommand(command)
    const green = run(launched, app)
    expect(green.output).toContain(FIRST_BODY)
    expect(green.output).toContain(SECOND_BODY)
  })

  it('leaves a plain single runner exactly as it already behaved', () => {
    const dir = scratchDir()
    const app = join(dir, 'app')
    mkdirSync(app, { recursive: true })
    const first = stub(join(dir, 'bin'), 'playwright', `cat <<'OUT'\n${FIRST_WALK}\nOUT\nexit 1`)
    const command = `${first} test --reporter=line e2e/auth.spec.ts 2>&1 | tail -5`

    expect(run(command, app).output).not.toContain(FIRST_BODY)
    const { command: launched } = streamingBackgroundCommand(command)
    expect(launched).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; ' +
        `${first} test --reporter=list e2e/auth.spec.ts --retries=0 2>&1`,
    )
    expect(run(launched, app).output).toContain(FIRST_BODY)
  })

  it('keeps a Hurl walk and the browser/status steps that follow it readable', () => {
    const dir = scratchDir()
    const app = join(dir, 'app')
    mkdirSync(app, { recursive: true })
    const hurl = stub(
      join(dir, 'bin'),
      'hurl',
      [
        "cat <<'OUT'",
        '  ✘  auth.hurl:14: body assertion failed',
        '    expected: <h1>Feed</h1>',
        '    actual:   <h1>Login</h1>',
        '------------------------------------------------------------------------',
        'Executed files:    13',
        'Executed requests: 154 (11.9/s)',
        'Failed files:      1',
        'OUT',
        'exit 1',
      ].join('\n'),
    )
    const browser = stub(join(dir, 'bin'), 'playwright', `cat <<'OUT'\n${SECOND_WALK}\nOUT\nexit 1`)
    const command =
      `${hurl} --test fixtures/realworld/specs/hurl 2>&1 | tail -2; cd ${app} && ` +
      `${browser} test --reporter=line e2e/auth.spec.ts 2>&1 | tail -20; echo EXIT $?`

    const raw = run(command, app)
    expect(raw.output).not.toContain('expected: <h1>Feed</h1>')
    expect(raw.output).toContain('EXIT 0')

    const { command: launched } = streamingBackgroundCommand(command)
    const green = run(launched, app)
    expect(green.output).toContain('expected: <h1>Feed</h1>')
    expect(green.output).toContain(SECOND_BODY)
    // The status is now the run's own, not the dropped tail's.
    expect(green.output).toContain('EXIT 1')
  })
})

describe('compound browser commands — preserved shapes', () => {
  it('still refuses a duplicate-only chain, with or without output filters', () => {
    for (const command of [
      'npx playwright test --reporter=list; npx playwright test --reporter=list',
      'npx playwright test --reporter=list | tail -5; npx playwright test --reporter=list | tail -5',
    ]) {
      const result = streamingBackgroundCommand(command)
      expect(result.error).toContain('runs the suite twice')
      // Nothing is launched, and no filter survives in the command the refusal quotes back.
      expect(result.command).not.toContain('tail -')
    }
    // Distinct walks select different suites or targets: they run as written.
    expect(
      streamingBackgroundCommand(
        'npx playwright test --reporter=line specs; npx playwright test --reporter=dot auth.spec.ts',
      ).error,
    ).toBeUndefined()
  })

  it('keeps a pipe the parse cannot prove is output-only, and still normalises that run', () => {
    const cases: ReadonlyArray<[string, string]> = [
      [
        'npx playwright test --reporter=line specs 2>&1 | tee /tmp/a.log; npx playwright test --reporter=dot auth.spec.ts',
        '| tee /tmp/a.log',
      ],
      [
        'npx playwright test --reporter=line specs 2>&1 | xargs echo; npx playwright test --reporter=dot auth.spec.ts',
        '| xargs echo',
      ],
      [
        "npx playwright test --reporter=line specs 2>&1 | sed -i 's/a/b/' /tmp/f; npx playwright test --reporter=dot auth.spec.ts",
        "| sed -i 's/a/b/' /tmp/f",
      ],
      [
        'npx playwright test --reporter=line specs > /tmp/a.log 2>&1; npx playwright test --reporter=dot auth.spec.ts',
        '> /tmp/a.log 2>&1',
      ],
    ]
    for (const [command, kept] of cases) {
      const { command: out } = streamingBackgroundCommand(command)
      expect(out).toContain(kept)
      expect(out).toContain('--reporter=list specs')
      expect(out).toContain('--reporter=list auth.spec.ts')
    }
  })

  it('leaves a custom or file-only reporter set exactly as written', () => {
    // No printing reporter in the set: the earlier walk's own artifact is not this tool's to move.
    expect(
      streamingBackgroundCommand(
        'npx playwright test --reporter=json specs; npx playwright test --reporter=html auth.spec.ts',
      ).command,
    ).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; npx playwright test --reporter=json specs; ' +
        'npx playwright test --reporter=html auth.spec.ts --retries=0',
    )
    // A printing reporter beside a file reporter: only the printer moves, the artifact stays.
    expect(
      streamingBackgroundCommand(
        'npx playwright test --reporter=json,line specs; npx playwright test --reporter=json,dot auth.spec.ts',
      ).command,
    ).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; npx playwright test --reporter=json,list ' +
        'specs; npx playwright test --reporter=json,list auth.spec.ts --retries=0',
    )
  })

  it('preserves every non-reporter setting, target and exclusion', () => {
    const settings =
      'npx playwright test --config a.config.ts --project=chromium --workers=2 --timeout=45000 ' +
      '--grep "checkout" specs 2>&1 | tail -5; npx playwright test --config b.config.ts ' +
      '--project=firefox --grep-invert "checkout" e2e/auth.spec.ts 2>&1 | tail -20'
    const { command } = streamingBackgroundCommand(settings)
    expect(command).toContain(
      '--config a.config.ts --project=chromium --workers=2 --timeout=45000 --grep "checkout" specs',
    )
    expect(command).toContain(
      '--config b.config.ts --project=firefox --grep-invert "checkout" e2e/auth.spec.ts',
    )
    expect(command).not.toContain('tail -')
  })

  it('preserves heredocs, writes, &&/||, groups and quoted punctuation', () => {
    const INLINE = 'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; '
    const tail = ' npx playwright test --reporter=list auth.spec.ts --retries=0'
    // A heredoc body and the line after it are left where they are; the run after them is rewritten.
    expect(
      streamingBackgroundCommand(
        "cat > cfg.ts <<'EOF'\nx\nEOF\nnpx playwright test --reporter=line 2>&1 | tail -5; " +
          'npx playwright test --reporter=dot auth.spec.ts',
      ).command,
    ).toBe(
      `${INLINE}cat > cfg.ts <<'EOF'\nx\nEOF\nnpx playwright test --reporter=list 2>&1;${tail}`,
    )
    // A write on the way in, and a read after the walk, both survive.
    expect(
      streamingBackgroundCommand(
        'printf "x\\n" > /tmp/a && npx playwright test --reporter=line specs 2>&1 | tail -5; ' +
          'cat /tmp/a; npx playwright test --reporter=dot auth.spec.ts',
      ).command,
    ).toBe(
      `${INLINE}printf "x\\n" > /tmp/a && npx playwright test --reporter=list specs 2>&1; ` +
        `cat /tmp/a;${tail}`,
    )
    // `&&` and `||` keep their places.
    expect(
      streamingBackgroundCommand(
        'cd app && npx playwright test --reporter=line specs 2>&1 || echo FAILED; ' +
          'npx playwright test --reporter=dot auth.spec.ts',
      ).command,
    ).toBe(
      `${INLINE}cd app && npx playwright test --reporter=list specs 2>&1 || echo FAILED;${tail}`,
    )
    // A group keeps its closer; the statement after it keeps its place.
    expect(
      streamingBackgroundCommand(
        '( npx playwright test --reporter=line specs 2>&1 | tail -5 ); echo done; ' +
          'npx playwright test --reporter=dot auth.spec.ts',
      ).command,
    ).toBe(`${INLINE}( npx playwright test --reporter=list specs 2>&1 ); echo done;${tail}`)
    // Quoted punctuation is never split: the pattern stays one argument.
    expect(
      streamingBackgroundCommand(
        'npx playwright test --reporter=line -g "signs in|logs out" specs 2>&1 | tail -5',
      ).command,
    ).toBe(
      `${INLINE}npx playwright test --reporter=list -g "signs in|logs out" specs --retries=0 2>&1`,
    )
  })

  it('treats --list, --help and --dry-run as non-runs', () => {
    for (const command of [
      'npx playwright test --list 2>&1 | tail -5',
      'npx playwright --help',
      'npx playwright test --dry-run',
      'npx vitest --help',
      'hurl --help',
    ]) {
      expect(streamingBackgroundCommand(command)).toEqual({ command, changes: [] })
    }
    // A real walk beside a `--list` is still a run; the list is not given a reporter.
    expect(
      streamingBackgroundCommand(
        'npx playwright test --reporter=line specs; npx playwright test --list specs',
      ).command,
    ).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; npx playwright test --reporter=list ' +
        'specs; npx playwright test --list specs',
    )
  })

  it('wires the machine JSON report to the LAST invocation only', () => {
    const { command, reportPath } = streamingBackgroundCommand(
      'npx playwright test --reporter=line specs; npx playwright test --reporter=line auth.spec.ts',
      undefined,
      '/tmp/run-report.json',
    )
    expect(reportPath).toBe('/tmp/run-report.json')
    const statements = command.replace(/^(?:export [^;]+; )+/, '').split('; ')
    expect(statements).toHaveLength(2)
    const [first, last] = statements
    expect(first).toContain('--reporter=list specs')
    expect(first).not.toContain('json')
    expect(last).toContain('--reporter=list,json')
    // The report belongs to one walk: its counts never describe the earlier one.
    expect(command.match(/--reporter=[\w,]*json/g)).toHaveLength(1)
  })
})

describe('stripTrailingSuiteFilters across several runs', () => {
  it('drops each run’s own output-only suffix, and only those', () => {
    expect(
      stripTrailingSuiteFilters(
        'npx vitest run 2>&1 | grep failed; npx playwright test 2>&1 | tail -5',
      ),
    ).toEqual({
      command: 'npx vitest run 2>&1; npx playwright test 2>&1',
      dropped: '| grep failed | tail -5',
    })
    // A later statement's filter belongs to that statement, not to the run before it.
    expect(stripTrailingSuiteFilters('npx playwright test 2>&1; tail -5')).toEqual({
      command: 'npx playwright test 2>&1; tail -5',
      dropped: '',
    })
  })
})

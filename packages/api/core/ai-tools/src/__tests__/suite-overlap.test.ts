/**
 * The ONE rule behind "may a second suite run start now?" (../suite-overlap.ts), and the command
 * readings the two sites that ask it share.
 *
 * xr-molecule-flash-m89 (2026-10-16) is why this is a module rather than a line in each caller:
 * its +19:59 `wait_for_task` named the failing test and told the executor to "Start on them now,
 * while the run keeps walking", the executor sent that re-run 23 s later, and molecule-dev's
 * suite-overlap hold answered "A playwright suite is already running against this app and
 * database … Wait for it." The note and the hold now call {@link suiteRunInTheWay} — and read the
 * app a command measures with the same {@link suiteCommandTarget} — so neither can promise a run
 * the other refuses.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { commandSegments } from '../command-position.js'
import {
  isDiagnosisRun,
  namesSuiteConfig,
  scopedRerunCommand,
  suiteCommandTarget,
  type SuiteRunInFlight,
  suiteRunInTheWay,
  withoutHeredocs,
  withSuiteConfig,
} from '../suite-overlap.js'

const URL = 'https://loopcheck-m89.apps.mlcl.dev'
/** The run in flight, and the app it measures: the sandbox's own, which every localhost spelling keys to. */
const local = { command: 'npx playwright test --max-failures=15', target: 'local' }

const run = (
  over: Partial<SuiteRunInFlight> & { id?: string },
): SuiteRunInFlight & { id?: string } => ({
  runsSuite: true,
  target: 'local',
  ...over,
})

describe('suiteRunInTheWay — the one rule', () => {
  it('is in the way when a suite is already walking against the same app and database', () => {
    const busy = run({ id: 'mol-bg-1' })
    expect(suiteRunInTheWay({ target: 'local' }, [busy])).toBe(busy)
  })

  it('is not in the way when the runs measure different apps', () => {
    // A local run and one against the deployment write to different databases, so holding one for
    // the other is pure loss (flash-m68 held a Hurl run for 44 s over a killed local run).
    expect(
      suiteRunInTheWay({ target: suiteCommandTarget(`HOST=${URL} bash run-api-tests-hurl.sh`) }, [
        run({ target: 'local' }),
      ]),
    ).toBeNull()
  })

  it('is not in the way when the run in flight is no suite', () => {
    // A unit runner measures the code with its own database; nothing about it collides with a
    // browser walk of the app.
    expect(suiteRunInTheWay({ target: 'local' }, [run({ runsSuite: false })])).toBeNull()
  })

  it('is not in the way when the command being judged STOPS that run first', () => {
    // xr-molecule-flash-m87 sent `kill 19408 … ; … npx playwright test …`: the kill comes first,
    // and the hold refused the whole command — nothing ran, not the kill and not the run.
    expect(suiteRunInTheWay({ target: 'local' }, [run({ stoppedByCommand: true })])).toBeNull()
  })

  it('names the first run in flight that is in the way', () => {
    const busy = run({ id: 'mol-bg-2', target: 'local' })
    expect(suiteRunInTheWay({ target: 'local' }, [run({ runsSuite: false }), busy, run({})])).toBe(
      busy,
    )
  })

  it('keys every localhost spelling, and every deployed URL, the same way', () => {
    expect(suiteCommandTarget(local.command)).toBe('local')
    expect(suiteCommandTarget('BASE_URL=http://localhost:5173 npx playwright test')).toBe('local')
    expect(suiteCommandTarget('BASE_URL=http://127.0.0.1:4000 npx playwright test')).toBe('local')
    expect(suiteCommandTarget(`BASE_URL=${URL} npx playwright test`)).toBe(
      suiteCommandTarget(`curl -sf ${URL}/health && npx playwright test`),
    )
    expect(suiteCommandTarget(`HOST=${URL} bash run-api-tests-hurl.sh`)).not.toBe('local')
  })
})

describe('the readings the note and the hold share', () => {
  it('reads the host out of the command, not out of a heredoc the command writes', () => {
    // A script the command WRITES is data: the note hands a re-run to a run whose own command
    // wrote a file naming another host, and neither may read that as the app it measures.
    expect(
      suiteCommandTarget(
        `cat > /tmp/seed.sh <<'EOF'\nHOST=http://example.com\nEOF\nnpx playwright test`,
      ),
    ).toBe('local')
    // The header is kept: a `HOST=` assignment in front of the command stays readable.
    expect(suiteCommandTarget(`HOST=${URL} bash run.sh <<'EOF'\nnpx playwright test\nEOF`)).toBe(
      'loopcheck-m89.apps.mlcl.dev',
    )
    expect(withoutHeredocs("cat > a.sh <<'EOF'\nhurl --test x.hurl\nEOF\nls")).not.toContain('hurl')
  })

  it('narrows a whole-suite command to the tests the run named, keeping its own invocation', () => {
    const whole = `cd /workspace/.mol-scratch/e2e && BASE_URL=http://localhost:5173 npx --no-install playwright test --max-failures=15 --reporter=list --retries=0`
    // The reporter printed the location relative to the runner's own directory, and Playwright
    // matches file arguments against ABSOLUTE paths — so the composed command resolves it there.
    // Sent back verbatim it printed "No tests found" (xr-molecule-flash-m118 +16:34).
    expect(
      scopedRerunCommand(whole, ['../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53']),
    ).toBe(
      'cd /workspace/.mol-scratch/e2e && BASE_URL=http://localhost:5173 npx --no-install ' +
        'playwright test /workspace/fixtures/realworld/specs/e2e/null-fields.spec.ts:53 ' +
        '--retries=0 --max-failures=15 --reporter=list',
    )
    // A unit runner is left exactly as it is: there is no Playwright invocation to narrow.
    expect(scopedRerunCommand('npx vitest run', ['a.test.ts:9'])).toBe('npx vitest run')
  })

  it('drops a spec file its own locations are already inside (m118)', () => {
    // xr-molecule-flash-m118 (+45:24): the model's command named `url-navigation.spec.ts`, and the
    // hold's composed re-run kept the bare file beside the 14 `file:line`s — the whole file plus
    // fourteen duplicates, estimated "~297s". A location inside a named file supersedes it.
    const whole =
      'cd /workspace/fixtures/realworld/specs/e2e && BASE_URL=http://localhost:4173 ' +
      'npx playwright test url-navigation.spec.ts --max-failures=15'
    expect(
      scopedRerunCommand(whole, [
        '/workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts:13',
        'url-navigation.spec.ts:23',
        'specs/e2e/url-navigation.spec.ts:234:7',
      ]),
    ).toBe(
      'cd /workspace/fixtures/realworld/specs/e2e && BASE_URL=http://localhost:4173 ' +
        'npx playwright test /workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts:13 ' +
        'url-navigation.spec.ts:23 specs/e2e/url-navigation.spec.ts:234:7 --retries=0 ' +
        '--max-failures=15',
    )
  })

  it('drops every bare spec file once the re-run names its failures (m134 +20:0x)', () => {
    // Two named files, failures in one of them: a bare file left in re-admits all its tests.
    const whole = 'npx playwright test specs/e2e/auth.spec.ts specs/e2e/editor.spec.ts --workers=1'
    expect(scopedRerunCommand(whole, ['specs/e2e/editor.spec.ts:41'])).toBe(
      'npx playwright test specs/e2e/editor.spec.ts:41 --retries=0 --workers=1',
    )
    // xr-molecule-flash-m134: four named files, 8 failures in two of them → only the 8 locations.
    const m134 =
      'npx playwright test --config e2e-run/playwright.config.ts articles.spec.ts comments.spec.ts ' +
      'settings.spec.ts social.spec.ts --max-failures=15'
    const rerun = scopedRerunCommand(m134, [
      'fixtures/realworld/specs/e2e/settings.spec.ts:20',
      'fixtures/realworld/specs/e2e/articles.spec.ts:207',
    ])
    for (const file of [
      'articles.spec.ts ',
      'comments.spec.ts',
      'settings.spec.ts ',
      'social.spec.ts',
    ]) {
      expect(rerun).not.toMatch(new RegExp(`\\s${file.trim().replace('.', '\\.')}(\\s|$)`))
    }
    expect(rerun).toContain('settings.spec.ts:20')
    expect(rerun).toContain('articles.spec.ts:207')
    expect(rerun).toContain('--config e2e-run/playwright.config.ts')
  })

  it('inverts the request’s excluded tests out of the narrowed re-run, as real argv', () => {
    // xr-molecule-flash-m101's own suite and invocation (its trailing `| tail -60` is already
    // dropped by streamingBackgroundCommand, which is what runByTask records).
    const whole =
      'cd /workspace/fixtures/realworld/specs/e2e && TEST_MODE=fullstack baseURL=http://localhost:5173 ' +
      'npx playwright test --config playwright.run.config.ts --reporter=list 2>&1'
    const composed = scopedRerunCommand(
      whole,
      ['navigation.spec.ts:200', 'social.spec.ts:115'],
      ['should require login to post comment'],
    )
    // The composed command parses back into the words a shell would hand Playwright — the
    // quoting helper's work is only real if the real parser agrees.
    const playwright = commandSegments(composed).find((s) => s.program === 'playwright')!
    expect(playwright.args).toEqual([
      'test',
      'navigation.spec.ts:200',
      'social.spec.ts:115',
      '--retries=0',
      '--grep-invert',
      "'should require login to post comment'",
      '--config',
      'playwright.run.config.ts',
      '--reporter=list',
      '2>&1',
    ])
    // A command that already filters by title keeps its own flag rather than gaining a second.
    const already = `${whole} --grep-invert 'some other test'`
    expect(
      scopedRerunCommand(already, ['a.spec.ts:1'], ['should require login to post comment']),
    ).toBe(already.replace('playwright test', 'playwright test a.spec.ts:1 --retries=0'))
  })
})

/**
 * xr-molecule-flash-m113 (+19:09 → +20:34): the fix-round re-run dropped the
 * `--config playwright.conduit.config.ts` both earlier runs carried. Playwright started with no
 * base URL, all 10 failures were `page.goto: Cannot navigate to invalid URL`, and the platform's
 * own suggested re-run — composed from that command — had no `--config` either, so following it
 * reproduced the mistake. The composed commands carry the config of the run they narrow.
 */
describe('a composed re-run carries the config its run was measured under (m113)', () => {
  /** The command the model sent at 07:06:17Z. */
  const m113 = (config = ''): string =>
    'cd /workspace/my-app && TEST_MODE=fullstack BASE_URL=http://localhost:5173 timeout 900 ' +
    `npx playwright test${config ? ` --config ${config}` : ''} specs/e2e/articles.spec.ts ` +
    'specs/e2e/comments.spec.ts --reporter=line --max-failures=10'
  const locations = ['specs/e2e/articles.spec.ts:32', 'specs/e2e/helpers/auth.ts:4']

  it('adds the config to the run’s own statement, and never a second one', () => {
    expect(withSuiteConfig(m113(), 'playwright.conduit.config.ts')).toContain(
      "npx playwright test --config 'playwright.conduit.config.ts' specs/e2e/",
    )
    // A command that already names a config keeps exactly one.
    const own = m113('playwright.conduit.config.ts')
    expect(withSuiteConfig(own, 'playwright.conduit.config.ts')).toBe(own)
    expect(
      (withSuiteConfig(own, 'playwright.conduit.config.ts').match(/--config/g) ?? []).length,
    ).toBe(1)
    // `-c` and `--config=` are the same statement's config.
    expect(namesSuiteConfig('npx playwright test -c pw.ts')).toBe(true)
    expect(namesSuiteConfig('npx playwright test --config=pw.ts')).toBe(true)
    // Everything chained after the run is left as it was.
    expect(
      withSuiteConfig('cd /w && npx playwright test a.spec.ts 2>&1 | tail -20', 'pw.config.ts'),
    ).toBe("cd /w && npx playwright test --config 'pw.config.ts' a.spec.ts 2>&1 | tail -20")
    // No Playwright run, nothing to add.
    expect(withSuiteConfig('npx vitest run', 'pw.config.ts')).toBe('npx vitest run')
  })

  it('narrows the command with the same config the run lacked', () => {
    const composed = scopedRerunCommand(m113(), locations, [], 'playwright.conduit.config.ts')
    expect(composed).toContain("--config 'playwright.conduit.config.ts'")
    expect(composed).toContain('specs/e2e/articles.spec.ts:32')
    // …while a command that already carried it does not gain a second.
    const own = scopedRerunCommand(m113('playwright.conduit.config.ts'), locations)
    expect((own.match(/--config/g) ?? []).length).toBe(1)
  })
})

/**
 * xr-molecule-flash-m118 (+15:26 → +16:34 → +16:46) and m124 (+18:38): every composed re-run
 * handed the executor the reporter's own relative form (`../../fixtures/…/articles.spec.ts:32`),
 * and Playwright matches each file argument as a regex against the ABSOLUTE path of every test
 * file it collects — so the obedient re-run printed "No tests found". The platform's own
 * `testRunNote` explained the mistake the platform's own note had made.
 *
 * Playwright 1.63, measured with `--list` on a project whose config sets an absolute `testDir`
 * (the supplied-suite shape): from the config's directory,
 * `playwright test --list ../../fixtures/realworld/specs/e2e/articles.spec.ts:3` lists 0 tests,
 * the absolute path lists 1, and `fixtures/realworld/specs/e2e/articles.spec.ts:3` (the leading
 * `../` segments dropped) lists 1 as well.
 */
describe('a composed re-run names its locations the way Playwright matches them (m118, m124)', () => {
  /** The command m118's run was started with, and the failure its list reporter printed. */
  const m118Whole =
    'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd /workspace/.mol-scratch/e2e && ' +
    'TEST_MODE=fullstack BASE_URL=http://localhost:5173 npx playwright test ' +
    '--trace=retain-on-failure --max-failures=15 --config playwright.config.ts --reporter=list'
  const m118At = '../../fixtures/realworld/specs/e2e/articles.spec.ts:32'

  it('resolves the fail-fast note’s location against the run’s own directory (m118)', () => {
    expect(scopedRerunCommand(m118Whole, [m118At])).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd /workspace/.mol-scratch/e2e && ' +
        'TEST_MODE=fullstack BASE_URL=http://localhost:5173 npx playwright test ' +
        '/workspace/fixtures/realworld/specs/e2e/articles.spec.ts:32 --retries=0 ' +
        '--trace=retain-on-failure --max-failures=15 --config playwright.config.ts --reporter=list',
    )
  })

  it('resolves the “Re-run just these” locations from a run started outside the suite (m124)', () => {
    // The +10:40 wait note's re-run, composed from a run started in the app directory while the
    // suite lives under `/workspace/fixtures/` — every location printed as `../../fixtures/…`.
    const whole =
      'cd /workspace/my-app/app && BASE_URL=http://localhost:5173 npx playwright test ' +
      '--reporter=list --max-failures=15'
    const composed = scopedRerunCommand(whole, [
      '../../fixtures/realworld/specs/e2e/auth.spec.ts:19',
      // The finding's own spelling: `articles.spec.ts:50` (file:line, no column).
      '../../fixtures/realworld/specs/e2e/articles.spec.ts:50',
    ])
    expect(composed).toContain(
      'playwright test /workspace/fixtures/realworld/specs/e2e/auth.spec.ts:19 ' +
        '/workspace/fixtures/realworld/specs/e2e/articles.spec.ts:50 --retries=0',
    )
    expect(composed).not.toContain('..')
  })

  it('falls back to the tool’s cwd when the command does not cd anywhere', () => {
    const composed = scopedRerunCommand(
      'npx playwright test --reporter=list',
      [m118At],
      [],
      null,
      '/workspace/.mol-scratch/e2e',
    )
    expect(composed).toBe(
      'npx playwright test /workspace/fixtures/realworld/specs/e2e/articles.spec.ts:32 ' +
        '--retries=0 --reporter=list',
    )
    // A relative cwd is not an anchor: nothing is guessed, and the location keeps only its
    // suffix — which the absolute path still contains (measured with Playwright 1.63).
    expect(
      scopedRerunCommand('npx playwright test --reporter=list', [m118At], [], null, 'app'),
    ).toBe(
      'npx playwright test fixtures/realworld/specs/e2e/articles.spec.ts:32 --retries=0 ' +
        '--reporter=list',
    )
  })

  it('strips the leading dot segments when the run’s directory is unknown', () => {
    // A command whose `cd` is a variable reaches no useful directory; the composed location is
    // still one Playwright matches, and a location that is already absolute or a suffix is left
    // exactly as it was.
    expect(scopedRerunCommand('cd $ROOT && npx playwright test --reporter=list', [m118At])).toBe(
      'cd $ROOT && npx playwright test fixtures/realworld/specs/e2e/articles.spec.ts:32 ' +
        '--retries=0 --reporter=list',
    )
    expect(
      scopedRerunCommand('cd /w && npx playwright test', [
        '/workspace/fixtures/realworld/specs/e2e/a.spec.ts:1',
        'fixtures/realworld/specs/e2e/b.spec.ts:2',
      ]),
    ).toBe(
      'cd /w && npx playwright test /workspace/fixtures/realworld/specs/e2e/a.spec.ts:1 ' +
        'fixtures/realworld/specs/e2e/b.spec.ts:2 --retries=0',
    )
  })
})

/**
 * xr-molecule-flash-m170 (+33:16): an inverted `--grep-invert` that only names the request's own
 * excluded test is the proof's scope, not a diagnosis — the same reading molecule-dev's
 * `invertDecision` takes. Any other narrowing still makes the run a diagnosis.
 */
describe('isDiagnosisRun — the request’s approved exclusion is not a narrowing (m170)', () => {
  const APPROVED = ['should require login to post comment']

  it('reads an inversion of the approved title as the whole proof scope', () => {
    for (const flag of [
      "--grep-invert 'should require login to post comment'",
      '--grep-invert="SHOULD REQUIRE LOGIN TO POST COMMENT"',
      "-G 'should require login to post comment'",
    ])
      expect(
        isDiagnosisRun(`BASE_URL=${URL} npx playwright test ${flag}`, {
          approvedExclusions: APPROVED,
        }),
      ).toBe(false)
  })

  it('keeps every other narrowing a diagnosis, inversion or not', () => {
    const approved = { approvedExclusions: APPROVED }
    expect(isDiagnosisRun('npx playwright test --grep "favorite"', approved)).toBe(true)
    expect(isDiagnosisRun('npx playwright test articles.spec.ts:32', approved)).toBe(true)
    expect(
      isDiagnosisRun(
        "npx playwright test --grep-invert 'should require login to post comment' --grep favorites",
        approved,
      ),
    ).toBe(true)
    expect(
      isDiagnosisRun("npx playwright test --grep-invert 'should show an error'", approved),
    ).toBe(true)
  })

  it('treats the same inversion as a diagnosis when no approved titles are given', () => {
    expect(isDiagnosisRun("npx playwright test --grep-invert 'should require login'")).toBe(true)
  })
})

/**
 * xr-molecule-flash-m173 (+12:18): the narrowed re-run the mid-run note hands over kept the
 * run's own `> /tmp/pw-full.log`, so following the platform's advice would have overwritten the
 * full walk's log — and with it the other 11 failures' error reports the walk had already
 * printed there.
 */
describe('a composed re-run never writes over the log it was built from (m173)', () => {
  const M173 = 'npx playwright test --reporter=list > /tmp/pw-full.log 2>&1; echo EXIT $?'

  it('moves the redirect to a fresh sibling and keeps 2>&1 untouched', () => {
    const rerun = scopedRerunCommand(M173, ['e2e/settings.spec.ts:20:3'])
    expect(rerun).toContain('> /tmp/pw-full.log.rerun.log 2>&1')
    expect(rerun).not.toContain('> /tmp/pw-full.log 2>&1')
    // Still a real re-run of the one test, and the chain that reports its exit code survives.
    expect(rerun).toContain('playwright test e2e/settings.spec.ts:20:3 --retries=0')
    expect(rerun).toContain('; echo EXIT $?')
  })

  it('touches no redirect aimed at a device, and no stderr-only redirect', () => {
    expect(
      scopedRerunCommand('npx playwright test > /dev/null 2> /tmp/err.log', ['a.spec.ts:1']),
    ).toContain('> /dev/null 2> /tmp/err.log')
  })

  it('leaves a command that redirects nothing exactly as it rewrote it before', () => {
    expect(scopedRerunCommand('npx playwright test --reporter=list', ['a.spec.ts:1'])).toBe(
      'npx playwright test a.spec.ts:1 --retries=0 --reporter=list',
    )
  })
})

/**
 * xr-molecule-flash-m428 (+31:03): the suggested "Re-run just these" named fourteen failing
 * `file:line`s and still carried the original positional `/workspace/fixtures/realworld/specs/e2e`
 * after `--config playwright.config.ts`. Playwright OR-s positional arguments into one selection,
 * so the directory re-admitted every spec the re-run was supposed to skip. The composed command now
 * replaces every positional selection — file, directory or regex filter — and keeps every option
 * and its value.
 */
describe('a composed re-run replaces every positional selection (m428)', () => {
  const M428 =
    'npx playwright test --config playwright.config.ts /workspace/fixtures/realworld/specs/e2e ' +
    '--max-failures=15 --reporter=list'
  const LOCATIONS = [
    '/workspace/fixtures/realworld/specs/e2e/auth.spec.ts:19',
    '/workspace/fixtures/realworld/specs/e2e/articles.spec.ts:50',
  ]

  it('drops the suite directory and keeps the config and the flags', () => {
    expect(scopedRerunCommand(M428, LOCATIONS)).toBe(
      'npx playwright test /workspace/fixtures/realworld/specs/e2e/auth.spec.ts:19 ' +
        '/workspace/fixtures/realworld/specs/e2e/articles.spec.ts:50 --retries=0 ' +
        '--config playwright.config.ts --max-failures=15 --reporter=list',
    )
  })

  it('drops a quoted directory, a regex filter and every other original selection', () => {
    expect(
      scopedRerunCommand(
        "npx playwright test --config playwright.config.ts '/workspace/fixtures/realworld/specs/e2e' --reporter=list",
        ['/workspace/fixtures/realworld/specs/e2e/auth.spec.ts:7'],
      ),
    ).toBe(
      'npx playwright test /workspace/fixtures/realworld/specs/e2e/auth.spec.ts:7 --retries=0 ' +
        '--config playwright.config.ts --reporter=list',
    )
    expect(
      scopedRerunCommand("npx playwright test specs/ auth.spec.ts 'settings|social' --workers=1", [
        'specs/e2e/auth.spec.ts:2',
      ]),
    ).toBe('npx playwright test specs/e2e/auth.spec.ts:2 --retries=0 --workers=1')
  })

  it('replaces the selection whichever launcher runs the suite', () => {
    expect(
      scopedRerunCommand(
        'node /workspace/node_modules/.bin/playwright test --config playwright.config.ts ' +
          './specs/e2e --reporter=list',
        ['specs/e2e/auth.spec.ts:2'],
      ),
    ).toBe(
      'node /workspace/node_modules/.bin/playwright test specs/e2e/auth.spec.ts:2 --retries=0 ' +
        '--config playwright.config.ts --reporter=list',
    )
    expect(
      scopedRerunCommand(
        'npx --no-install playwright test -c playwright.config.ts ./specs/e2e --reporter=list',
        ['specs/e2e/auth.spec.ts:2'],
      ),
    ).toBe(
      'npx --no-install playwright test specs/e2e/auth.spec.ts:2 --retries=0 ' +
        '-c playwright.config.ts --reporter=list',
    )
  })

  it('keeps every option value, however much it looks like a selection', () => {
    const whole =
      'npx --no-install playwright test --config playwright.config.ts --project chromium ' +
      "--project firefox --output test-results --grep 'auth flow' " +
      '--last-failed-file /tmp/last-run.json ./specs/e2e --reporter=list'
    expect(scopedRerunCommand(whole, ['specs/e2e/auth.spec.ts:2'])).toBe(
      'npx --no-install playwright test specs/e2e/auth.spec.ts:2 --retries=0 ' +
        '--config playwright.config.ts --project chromium --project firefox ' +
        "--output test-results --grep 'auth flow' --last-failed-file /tmp/last-run.json " +
        '--reporter=list',
    )
  })

  it('preserves the original selection with no locations, and other runners unchanged', () => {
    const untouched = scopedRerunCommand(M428, [])
    expect(untouched).toContain('/workspace/fixtures/realworld/specs/e2e')
    expect(untouched).toContain('--config playwright.config.ts')
    expect(scopedRerunCommand('npx vitest run specs/e2e', ['a.test.ts:9'])).toBe(
      'npx vitest run specs/e2e',
    )
  })
})

/**
 * The matcher itself, not a text reading of it: Playwright's own CLI collects the fixture's four
 * tests. The original positional directory selects all four (the m428 hazard); the composed
 * command selects only the failed line.
 */
describe('the composed selection is what Playwright matches (m428)', () => {
  const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'playwright-selection')
  const playwrightCli = join(
    dirname(createRequire(import.meta.url).resolve('playwright/package.json')),
    'cli.js',
  )
  const list = (argv: readonly string[]): string => {
    const result = spawnSync(process.execPath, [playwrightCli, ...argv, '--list'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    return `${result.stdout ?? ''}${result.stderr ?? ''}`
  }
  const unquote = (word: string): string => word.replace(/^(['"])(.*)\1$/, '$2')

  it('runs the composed command and lists only the failed test', () => {
    const whole =
      'npx playwright test --config playwright.config.ts ./specs/e2e --max-failures=15 --reporter=list'
    // Control: the original positional directory on its own admits the whole suite.
    expect(
      list([
        'test',
        '--config',
        'playwright.config.ts',
        './specs/e2e',
        '--max-failures=15',
        '--reporter=list',
      ]),
    ).toContain('Total: 4 tests in 3 files')
    const composed = scopedRerunCommand(whole, ['./specs/e2e/auth.pw.ts:2'], [], null, fixture)
    expect(composed).not.toContain(' ./specs/e2e ')
    const words = commandSegments(composed).find(
      (segment) => segment.program === 'playwright',
    )?.args
    expect(words).toBeDefined()
    const narrowed = list((words ?? []).map(unquote))
    expect(narrowed).toContain('auth one')
    expect(narrowed).toContain('Total: 1 test in 1 file')
    expect(narrowed).not.toContain('comments one')
    expect(narrowed).not.toContain('settings one')
  }, 30_000)
})

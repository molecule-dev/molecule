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
import { describe, expect, it } from 'vitest'

import {
  scopedRerunCommand,
  suiteCommandTarget,
  type SuiteRunInFlight,
  suiteRunInTheWay,
  withoutHeredocs,
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
    expect(
      scopedRerunCommand(whole, ['../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53']),
    ).toBe(
      'cd /workspace/.mol-scratch/e2e && BASE_URL=http://localhost:5173 npx --no-install ' +
        'playwright test ../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53 --retries=0 ' +
        '--max-failures=15 --reporter=list',
    )
    // A unit runner is left exactly as it is: there is no Playwright invocation to narrow.
    expect(scopedRerunCommand('npx vitest run', ['a.test.ts:9'])).toBe('npx vitest run')
  })
})

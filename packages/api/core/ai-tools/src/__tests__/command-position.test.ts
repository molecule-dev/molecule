import { describe, expect, it } from 'vitest'

import {
  commandSegments,
  locatedCommandSegments,
  runsInCommandPosition,
} from '../command-position.js'
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

/**
 * The RealWorld suite's own Hurl runner, VERBATIM from X1 xr-molecule-flash-m89's conversation
 * (`cat run-api-tests-hurl.sh`, +17:12): the tree the platform had fetched three hours earlier.
 * A runner script is a shell command, so the reader is handed its whole TEXT — and the second
 * line opens a command substitution INSIDE double quotes, which the flat (quote, depth) walk in
 * `splitSegments` could not model: the `"$( … "` nested quote closed the outer one, the `)`
 * landed inside that stray quote, and the substitution count was left at 1 for the rest of the
 * script. Every newline from there on was swallowed into one segment, program `$(dirname `, so
 * `hurl --test` was never in command position and the script classified as NOTHING.
 */
const REALWORLD_HURL_RUNNER = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  'DIR="$(cd "$(dirname "$0")" && pwd)"',
  'HOST="${HOST:-http://localhost:8000}"',
  'UID_VAL="${UID_VAL:-$(date +%s)$$}"',
  '',
  'echo "Running Hurl tests against $HOST with uid=$UID_VAL"',
  '',
  'FILES=("$@")',
  'if [ ${#FILES[@]} -eq 0 ]; then',
  '  FILES=("$DIR"/hurl/*.hurl)',
  'fi',
  '',
  'hurl --test \\',
  '  --jobs 1 \\',
  '  --variable "host=$HOST" \\',
  '  --variable "uid=$UID_VAL" \\',
  '  "${FILES[@]}"',
].join('\n')

describe('a `"$( … )"` nests, and the line after it still splits (flash-m89)', () => {
  it('reads the script’s own `hurl --test` in command position', () => {
    expect(runsInCommandPosition(REALWORLD_HURL_RUNNER, HURL_INVOCATION)).toBe(true)
    expect(commandSegments(REALWORLD_HURL_RUNNER).map((s) => s.program)).toContain('hurl')
    // …and nothing before it is misread as the run: `set`, the three assignments, the `if`.
    expect(
      commandSegments(REALWORLD_HURL_RUNNER).filter((s) => /^hurl\b/.test(s.program)),
    ).toHaveLength(1)
  })

  it('keeps a separator inside the substitution with the substitution', () => {
    expect(
      commandSegments('cd "$(dirname "$0")" && hurl --test hurl/*.hurl').map((s) => s.program),
    ).toEqual(['cd', 'hurl'])
    // The `&&` inside `$( … )` belongs to the substitution, not to this command.
    const withSubstitution = commandSegments('BASE="$(cd a && pwd)" && hurl --test x.hurl')
    expect(withSubstitution).toHaveLength(2)
    expect(withSubstitution.at(-1)?.program).toBe('hurl')
  })

  it('opens no substitution inside single quotes, where nothing expands', () => {
    expect(commandSegments("echo '$(a && b)' && hurl --test x.hurl").map((s) => s.program)).toEqual(
      ['echo', 'hurl'],
    )
  })
})

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

/**
 * X1 xr-molecule-flash-m101 (+15:43): all three of the run's suite invocations were
 * `npx --prefix /workspace/my-app/app playwright test` — the model wanted the app's own Playwright,
 * since the suite lives in `fixtures/`. The wrapper walk consumed the VALUE of `--prefix` as the
 * program (`app`), so no gate that keys on "a suite ran" saw a run: the deploy was held with "the
 * Playwright suite has never run" after two full runs, and the same blindness covered the
 * first-deploy hold, stale-proof, cut-run and the in-flight overlap. The wrapper skips the package
 * manager's own options before taking the program now, with the value-taking flags read from the
 * versions the sandbox image ships (npm 10.9.9's `npm exec --help` and `npm config ls -l`, pnpm
 * 10.34.7's `pnpm help exec` / `pnpm dlx --help`, Yarn 4.18.1's `yarn dlx --help`).
 */
const PACKAGE_MANAGER_FORMS: ReadonlyArray<[string, string]> = [
  ['a bare npx', 'npx playwright test'],
  ['npx -y', 'npx -y playwright test'],
  ['npx --prefix=<dir>', 'npx --prefix=/x playwright test'],
  ['npx --prefix <dir>', 'npx --prefix /workspace/my-app/app playwright test'],
  ['npx -p <package>', 'npx -p @playwright/test playwright test'],
  ['npm exec --prefix <dir>', 'npm exec --prefix /x playwright test'],
  ['npm exec --prefix <dir> --', 'npm exec --prefix x -- playwright test'],
]

describe('the package manager’s own options are skipped, never read as the program (flash-m101)', () => {
  it.each(PACKAGE_MANAGER_FORMS)(
    '%s runs `playwright test`, like a bare npx',
    (_label, command) => {
      expect(commandSegments(command)[0]).toMatchObject({ program: 'playwright', args: ['test'] })
      expect(commandSegments(command).map((s) => s.program)).toEqual(
        commandSegments('npx playwright test').map((s) => s.program),
      )
      expect(isPlaywrightRunCommand(command)).toBe(true)
      expect(isSuiteRunCommand(command)).toBe(true)
    },
  )

  it('reads the shape flashed first: `npx --prefix <app dir> playwright test`', () => {
    // Verbatim from xr-molecule-flash-m101's three invocations.
    const command =
      'cd /workspace/my-app/app && npx --prefix /workspace/my-app/app playwright test --reporter=line'
    expect(commandSegments(command).at(-1)).toMatchObject({
      program: 'playwright',
      args: ['test', '--reporter=line'],
    })
    expect(isPlaywrightRunCommand(command)).toBe(true)
  })

  it('leaves a program that is not a runner alone: `npx --prefix x eslint .` is no run', () => {
    expect(commandSegments('npx --prefix x eslint .')[0]).toMatchObject({
      program: 'eslint',
      args: ['.'],
    })
    expect(isPlaywrightRunCommand('npx --prefix x eslint .')).toBe(false)
    expect(isSuiteRunCommand('npx --prefix x eslint .')).toBe(false)
  })

  it('reads npm’s `-c` as a command of its own, and pnpm’s `-c` as a switch', () => {
    // npm: `-c <command>` is the command string, with `--package`'s bin on PATH.
    expect(commandSegments(`npx -c 'playwright test'`)[0]).toMatchObject({
      program: 'playwright',
      args: ['test'],
    })
    expect(commandSegments(`npx -p @playwright/test -c 'playwright test'`)[0]).toMatchObject({
      program: 'playwright',
      args: ['test'],
    })
    // pnpm: `-c, --shell-mode` takes no value, so the command follows it.
    expect(commandSegments('pnpm exec -c playwright test')[0]).toMatchObject({
      program: 'playwright',
      args: ['test'],
    })
  })

  it('skips the value flags of every package runner the sandbox image ships', () => {
    expect(commandSegments('npx --package @playwright/test playwright test')[0]?.program).toBe(
      'playwright',
    )
    expect(
      commandSegments('npm exec --package @playwright/test -- playwright test')[0]?.program,
    ).toBe('playwright')
    expect(commandSegments('npm exec -w app -- playwright test')[0]?.program).toBe('playwright')
    expect(commandSegments('pnpm exec playwright test')[0]?.program).toBe('playwright')
    expect(commandSegments('pnpm dlx --package @playwright/test playwright test')[0]?.program).toBe(
      'playwright',
    )
    expect(commandSegments('yarn dlx -p @playwright/test playwright test')[0]?.program).toBe(
      'playwright',
    )
    expect(commandSegments('yarn dlx playwright test')[0]?.program).toBe('playwright')
    expect(commandSegments('bun x playwright test')[0]?.program).toBe('playwright')
    expect(commandSegments('bunx --package @playwright/test playwright test')[0]?.program).toBe(
      'playwright',
    )
  })
})

/**
 * X1 xr-molecule-flash-m103 (+28:08), verbatim: the deploy result's "whole-suite command against
 * this URL" put `APP_BASE=<deployed>` in front of `cd`, where a shell binds it to that one
 * statement — the runner never saw it, and the suite fell back to its local default.
 */
const M103_COMMAND =
  'APP_BASE=https://loopcheck-xr-molecule-flash-m103.apps.mlcl.dev cd /workspace/my-app/app && ' +
  'rm -f e2e/playwright.base.ts && TEST_MODE=fullstack npx playwright test --max-failures=15 ' +
  '--workers=4 --retries=0 > /tmp/mol-e2e.log 2>&1'

describe('locatedCommandSegments — where an assignment for the RUNNER belongs (m103)', () => {
  it('points at the runner, after its own assignments and before its wrapper', () => {
    const located = locatedCommandSegments(M103_COMMAND)
    const runner = located.find((entry) => entry.segment?.program === 'playwright')
    expect(runner).toBeDefined()
    const at = runner?.assignmentOffset ?? -1
    // The insertion point is right after `TEST_MODE=fullstack` and right before `npx`.
    expect(M103_COMMAND.slice(0, at)).toMatch(/TEST_MODE=fullstack $/)
    expect(M103_COMMAND.slice(at)).toMatch(/^npx playwright test\b/)
    expect(runner?.assignments).toEqual(['TEST_MODE=fullstack'])
    // The assignment in front of `cd` belongs to `cd`, not to the runner.
    const cd = located.find((entry) => entry.segment?.program === 'cd')
    expect(cd?.assignments).toEqual([
      'APP_BASE=https://loopcheck-xr-molecule-flash-m103.apps.mlcl.dev',
    ])
  })

  it('reports assignment-only statements, which later statements of the command read', () => {
    const located = locatedCommandSegments('U=https://x.test; BASE_URL=$U npx playwright test')
    expect(located[0]?.segment).toBeNull()
    expect(located[0]?.assignments).toEqual(['U=https://x.test'])
    expect(located[1]?.assignments).toEqual(['BASE_URL=$U'])
    expect(located[1]?.segment?.program).toBe('playwright')
  })

  it('clears offsets for a statement inside a `sh -c` string: they are not offsets here', () => {
    const located = locatedCommandSegments(`sh -c 'cd app && npx playwright test'`)
    expect(located.map((entry) => entry.segment?.program)).toEqual(['cd', 'playwright'])
    expect(located.map((entry) => entry.assignmentOffset)).toEqual([null, null])
    expect(located.map((entry) => entry.start)).toEqual([null, null])
    expect(located.map((entry) => entry.end)).toEqual([null, null])
    expect(located.map((entry) => entry.programOffset)).toEqual([null, null])
  })
})

/**
 * X1 xr-molecule-flash-m105 (+08:12): a heredoc body read as shell. Its first line,
 * `import { defineConfig, devices } from '@playwright/test'`, joins back as
 * `import defineConfig, devices from '@playwright/test'` (grouping braces dropped), so locating a
 * statement by searching for that re-joined text found nothing — in a command whose real
 * statements sat at known offsets all along.
 */
describe('locatedCommandSegments — a heredoc body is data, not statements (m105)', () => {
  const M105 = `cat > /workspace/.mol-scratch/realworld-e2e/playwright.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test'
import { baseConfig } from './playwright.base'

export default defineConfig({
  ...baseConfig,
  reporter: [['list']],
})
EOF
cd /workspace/.mol-scratch/realworld-e2e && TEST_MODE=fullstack npx --prefix /workspace/my-app/app playwright test --config playwright.config.ts 2>&1 | tail -60`

  it('reads only the command’s own statements, never a line of the body', () => {
    expect(locatedCommandSegments(M105).map((entry) => entry.segment?.program)).toEqual([
      'cat',
      'cd',
      'playwright',
      'tail',
    ])
  })

  it('places the run and the stage after it at their real offsets', () => {
    const located = locatedCommandSegments(M105)
    const run = located.find((entry) => entry.segment?.program === 'playwright')
    const tail = located.find((entry) => entry.segment?.program === 'tail')
    expect(run?.start).not.toBeNull()
    // The statement begins at its own first word — the assignment the shell binds to the run.
    expect(M105.slice(run?.start ?? 0)).toMatch(/^TEST_MODE=fullstack npx\b/)
    expect(M105.slice(run?.assignmentOffset ?? 0)).toMatch(/^npx\b/)
    // `end` is one past the run's own last word — where an option of the run belongs.
    expect(M105.slice(0, run?.end ?? 0)).toMatch(/--config playwright\.config\.ts 2>&1$/)
    // `programOffset` is the word actually in command position, after `npx` and its value flag.
    expect(M105.slice(run?.programOffset ?? 0)).toMatch(/^playwright test\b/)
    // The stages are one pipeline: the separator is the parse's own answer, not a text search.
    expect(tail?.separator).toBe('|')
    expect(M105.slice(0, tail?.start ?? 0)).toMatch(/\| $/)
  })

  it('keeps grouping braces off the words but keeps every offset exact', () => {
    // The body's first line is the one that used to defeat the search; the real statement is
    // written with a quoted program word, which joins back without its quotes.
    const command = `cat > c.ts <<'EOF'\nimport { a } from 'x'\nEOF\n"npx" playwright test 2>&1`
    const run = locatedCommandSegments(command).find(
      (entry) => entry.segment?.program === 'playwright',
    )
    expect(run?.programOffset).toBe(command.indexOf('playwright test'))
    expect(run?.end).toBe(command.length)
  })
})

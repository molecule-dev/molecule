import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import {
  commandSegments,
  commandSubstitutions,
  executedCommands,
  locatedCommandSegments,
  runsInCommandPosition,
  statementArgumentEnd,
  statementBoundary,
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

/** m260's actual authored wrapper: the apostrophe is in a shell comment. */
const M260_HURL_WRAPPER = `#!/usr/bin/env bash
# Local smoke run of the supplied Hurl suite against this app's API.
# HOST is the API origin; the .hurl files add /api themselves.
set -euo pipefail
HOST="\${HOST:-http://localhost:4000}" /workspace/fixtures/realworld/specs/api/run-api-tests-hurl.sh "$@"
`

describe('shell comments are not commands, quotes or heredoc openers (m260)', () => {
  it('recognizes the real supplied runner after the wrapper’s apostrophe', () => {
    expect(commandSegments(M260_HURL_WRAPPER).map((entry) => entry.program)).toEqual([
      'set',
      'run-api-tests-hurl.sh',
    ])
    expect(runsInCommandPosition(M260_HURL_WRAPPER, HURL_INVOCATION)).toBe(true)
  })

  it.each([
    '# comment; hurl --test fake.hurl',
    'echo ok;# comment; hurl --test fake.hurl',
    'echo ok # \' " $( ( > ignored; hurl --test fake.hurl',
  ])('never invents a runner from %s', (command) => {
    expect(runsInCommandPosition(command, HURL_INVOCATION)).toBe(false)
  })

  it.each([
    '# app\'s " $( ( <<FAKE\n',
    'echo ok;# <<FAKE\n',
    'echo "$(printf x # ) \' " $(\n)"\n',
    "cat <<'DOC' # app's $( <<FAKE\nhurl --test fake.hurl\nDOC\n",
  ])('keeps the next real runner visible after %s', (prefix) => {
    const command = `${prefix}hurl --test real.hurl`
    const runs = commandSegments(command).filter((entry) => entry.program === 'hurl')
    expect(runs.map((entry) => entry.args)).toEqual([['--test', 'real.hurl']])
    expect(parseComposed(command).ok).toBe(true)
  })

  it.each([
    `echo '#'`,
    `echo "#"`,
    String.raw`echo \#literal`,
    'echo https://example.test/#fragment',
    String.raw`echo word\ #literal`,
    String.raw`echo word\;#literal`,
    'echo word\\\n#literal',
    'echo ${value:- # literal}',
    `echo "$(printf '%s' '#literal')"`,
  ])('keeps a literal hash in %s', (prefix) => {
    const command = `${prefix}; hurl --test real.hurl`
    expect(runsInCommandPosition(command, HURL_INVOCATION)).toBe(true)
    expect(parseComposed(command).ok).toBe(true)
  })

  it('preserves offsets, assignments and redirect depth despite comment punctuation', () => {
    const command =
      "# unmatched ) ( ' $( > fake\nHOST=x hurl --test real.hurl > real.log # > ignored\n"
    const run = locatedCommandSegments(command).find((entry) => entry.segment?.program === 'hurl')
    expect(run).toMatchObject({
      start: command.indexOf('HOST=x'),
      programOffset: command.indexOf('hurl --test'),
      assignmentOffset: command.indexOf('hurl --test'),
      end: command.indexOf(' # > ignored'),
      assignments: ['HOST=x'],
      redirectTarget: 'real.log',
    })
  })

  it('places a flag outside a substitution whose comment contains fake openers', () => {
    const command = `(hurl --test real.hurl "$(printf x # $(\n)")`
    const composed = withOptionAtArgumentEnd(command, 'hurl', '--very-verbose')
    expect(composed).toBe(command.slice(0, -1) + ' --very-verbose)')
    expect(parseComposed(composed ?? '').ok).toBe(true)
  })
})

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
    // The `&&` inside `$( … )` belongs to the substitution, not to this command — and the
    // assignment it feeds sets a variable rather than running anything, so only `hurl` is a
    // statement here (the substitution's own words were once read as a command of their own).
    const withSubstitution = commandSegments('BASE="$(cd a && pwd)" && hurl --test x.hurl')
    expect(withSubstitution).toHaveLength(1)
    expect(withSubstitution[0]?.program).toBe('hurl')
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
 * X0 xr-molecule-flash-m204 (+38:15): an `env NAME=value … <cmd>` prefix binds a variable for the
 * command exactly like a bare `NAME=value <cmd>`, but the parse reported the runner statement's
 * assignments as EMPTY. Every reader built on it therefore disagreed with the command: `runTarget`
 * saw `BASE_URL` written and not bound, answered `local`, and two green deployed walks were
 * refused ("Not yet … your last Playwright run tested the local app") — 5.2 min of a 60-min cap.
 */
describe('locatedCommandSegments — an `env` prefix binds for the program it wraps (m204)', () => {
  const runnerOf = (
    command: string,
  ): ReturnType<typeof locatedCommandSegments>[number] | undefined =>
    locatedCommandSegments(command).find((entry) => entry.segment?.program === 'playwright')

  it('reports the NAME=value words after env as the runner statement’s own', () => {
    expect(
      runnerOf('env BASE_URL=https://x.apps.mlcl.dev npx playwright test')?.assignments,
    ).toEqual(['BASE_URL=https://x.apps.mlcl.dev'])
  })

  it('steps over env’s own options: -i, -u NAME, and their long forms', () => {
    expect(
      runnerOf('env -i PATH=$PATH BASE_URL=http://127.0.0.1:4173 npx playwright test')?.assignments,
    ).toEqual(['PATH=$PATH', 'BASE_URL=http://127.0.0.1:4173'])
    expect(
      runnerOf(
        'env -u BASE_URL -C /workspace --ignore-environment TEST_MODE=fullstack npx playwright test',
      )?.assignments,
    ).toEqual(['TEST_MODE=fullstack'])
    expect(
      runnerOf('env --unset=FOO --chdir=/workspace TEST_MODE=fullstack npx playwright test')
        ?.assignments,
    ).toEqual(['TEST_MODE=fullstack'])
  })

  it('finds the program through wrappers in any order and nesting', () => {
    expect(
      runnerOf(
        'cd /workspace && timeout 600 env TEST_MODE=fullstack ' +
          'BASE_URL=https://x.apps.mlcl.dev npx playwright test',
      )?.assignments,
    ).toEqual(['TEST_MODE=fullstack', 'BASE_URL=https://x.apps.mlcl.dev'])
    expect(runnerOf('nice -n 5 env A=1 npx playwright test')?.assignments).toEqual(['A=1'])
    expect(runnerOf('stdbuf -oL env A=1 npx playwright test')?.assignments).toEqual(['A=1'])
    expect(runnerOf('nohup env A=1 npx playwright test')?.assignments).toEqual(['A=1'])
    expect(runnerOf('time env A=1 npx playwright test')?.assignments).toEqual(['A=1'])
  })

  it('keeps leading assignments first, in the order the shell binds them', () => {
    expect(runnerOf('A=1 env B=2 npx playwright test')?.assignments).toEqual(['A=1', 'B=2'])
  })

  it('drops what env -i clears, and keeps what it sets', () => {
    // `env -i` replaces the environment: a word bound before it never reaches the program, so a
    // reader must not attribute it to the run (the unsafe direction — it would accept a local run
    // as the deployed proof).
    expect(runnerOf('BASE_URL=https://outer.test env -i npx playwright test')?.assignments).toEqual(
      [],
    )
    expect(
      runnerOf('BASE_URL=https://outer.test env -i BASE_URL=https://x npx playwright test')
        ?.assignments,
    ).toEqual(['BASE_URL=https://x'])
  })

  it('passes an outer env prefix into a sh -c string', () => {
    const located = locatedCommandSegments(
      `env BASE_URL=https://x.apps.mlcl.dev sh -c 'npx playwright test'`,
    )
    expect(located.map((entry) => entry.segment?.program)).toEqual(['playwright'])
    expect(located[0]?.assignments).toEqual(['BASE_URL=https://x.apps.mlcl.dev'])
  })

  it('places a setting written for the program AFTER env, where env -i cannot clear it', () => {
    const command = 'cd app && env -i PATH=$PATH npx playwright test'
    const at = runnerOf(command)?.assignmentOffset ?? -1
    expect(command.slice(0, at)).toMatch(/env -i PATH=\$PATH $/)
    expect(command.slice(at)).toMatch(/^npx playwright test\b/)
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

/**
 * X1 xr-molecule-flash-m129 (+34:29), reconstructed from the finding: the platform's production
 * walk, sent whole in a subshell. The platform appended `--trace=retain-on-failure
 * --reporter=list` at the end of the command text — after the `)` that closed the group — and the
 * backgrounded script died at once with `Syntax error: word unexpected` (exit 2, 76 ms).
 */
const M129_SUBSHELL_RUN =
  `cd /workspace && (MOL_LOCAL_WALK_BASE='http://127.0.0.1:4173'; ` +
  `if [ -d /workspace/my-app/app ]; then ( cd /workspace/my-app/app || exit 1; ` +
  `npm run build && touch /workspace/my-app/app/dist/.mol-walk-stamp ); fi; ` +
  `if [ "$MOL_LOCAL_WALK_BASE" = 'http://127.0.0.1:4173' ]; then ` +
  `( cd /workspace/my-app/app || exit 1; ` +
  `for _i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.5; done ); fi; ` +
  `cd /workspace/.mol-scratch/e2e-shim && TEST_MODE=fullstack APP_BASE=http://127.0.0.1:4173 ` +
  `/workspace/node_modules/.bin/playwright test ` +
  `/workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts:111 ` +
  `/workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts:137 ` +
  `--retries=0 --grep-invert 'Home|Article' --config=playwright.config.ts 2>&1)`

/**
 * Whether the shell PARSES a composed command, without running it (`bash -n`).
 *
 * Every command this platform composes from the executor's own is a shell word: a flag spliced at
 * the wrong offset is not a weaker rewrite, it is a command that dies before the runner starts
 * (m129 +34:29). The parse is the assertion, so a composed command is never shipped unparsed.
 *
 * @param command - The composed command.
 * @returns The parse's exit status and its stderr.
 */
function parseComposed(command: string): { ok: boolean; status: number | null; stderr: string } {
  const result = spawnSync('bash', ['-n', '-c', command], { encoding: 'utf8' })
  return { ok: result.status === 0, status: result.status, stderr: String(result.stderr ?? '') }
}

/** The offset {@link statementArgumentEnd} answers for the statement running `program`. */
function optionOffsetFor(command: string, program: string): number | null {
  const located = locatedCommandSegments(command).find(
    (entry) => entry.segment?.program === program,
  )
  return statementArgumentEnd(command, located?.start ?? null, located?.end ?? null)
}

/** The command with `word` written at {@link statementArgumentEnd}'s answer, or null. */
function withOptionAtArgumentEnd(command: string, program: string, word: string): string | null {
  const at = optionOffsetFor(command, program)
  return at === null ? null : `${command.slice(0, at)} ${word}${command.slice(at)}`
}

describe('statementArgumentEnd — an option belongs inside the runner’s own arguments', () => {
  it('writes the flag before the `2>&1)` that ended the m129 subshell run', () => {
    const composed = withOptionAtArgumentEnd(M129_SUBSHELL_RUN, 'playwright', '--reporter=list')
    expect(composed).not.toBeNull()
    // The m129 failure shape: the word after the group closer, which the shell cannot parse.
    expect(M129_SUBSHELL_RUN).toMatch(/--config=playwright\.config\.ts 2>&1\)$/)
    expect(composed).toMatch(/--config=playwright\.config\.ts --reporter=list 2>&1\)$/)
    expect(parseComposed(composed ?? '').ok).toBe(true)
    // The shape the platform shipped instead is the control: it is a syntax error, so the test
    // would fail without the fix rather than pass on a command that never had a `)`.
    expect(parseComposed(`${M129_SUBSHELL_RUN} --reporter=list`).status).not.toBe(0)
  })

  it('places the flag inside a plain subshell, a brace group, a pipeline and a redirect', () => {
    const shapes: ReadonlyArray<[string, RegExp]> = [
      [
        '( npx playwright test --config=playwright.config.ts 2>&1 )',
        /--config=playwright\.config\.ts --reporter=list 2>&1 \)$/,
      ],
      [
        '{ cd app && npx playwright test --config=playwright.config.ts; }',
        /--config=playwright\.config\.ts --reporter=list; \}$/,
      ],
      [
        'cd app && npx playwright test --config=playwright.config.ts 2>&1 | tail -5',
        /--config=playwright\.config\.ts --reporter=list 2>&1 \| tail -5$/,
      ],
      [
        'cd app && npx playwright test --config=playwright.config.ts > /tmp/run.log 2>&1',
        /--config=playwright\.config\.ts --reporter=list > \/tmp\/run\.log 2>&1$/,
      ],
    ]
    for (const [command, expected] of shapes) {
      const composed = withOptionAtArgumentEnd(command, 'playwright', '--reporter=list')
      expect(composed, command).not.toBeNull()
      expect(composed, command).toMatch(expected)
      const parsed = parseComposed(composed ?? '')
      expect(parsed.ok, `${command}\n${parsed.stderr}`).toBe(true)
    }
  })

  it('writes the flag after a command substitution argument, never inside it', () => {
    const command = 'npx playwright test --config=playwright.config.ts $(cat e2e/args.txt)'
    const composed = withOptionAtArgumentEnd(command, 'playwright', '--reporter=list')
    expect(composed).toBe(
      'npx playwright test --config=playwright.config.ts $(cat e2e/args.txt) --reporter=list',
    )
    expect(parseComposed(composed ?? '').ok).toBe(true)
  })

  it('keeps a `}` that closes a `${…}` expansion which is an argument', () => {
    // The closer is the argument's last character, not the shell's group punctuation.
    const command = 'npx playwright test --config=playwright.config.ts --grep=${PATTERN}'
    const composed = withOptionAtArgumentEnd(command, 'playwright', '--reporter=list')
    expect(composed).toBe(`${command} --reporter=list`)
    expect(parseComposed(composed ?? '').ok).toBe(true)
  })

  it('places it before a redirect whose descriptor is its own word (`2 > log`)', () => {
    const command = 'npx playwright test --config=playwright.config.ts 2 > /tmp/run.log'
    const composed = withOptionAtArgumentEnd(command, 'playwright', '--reporter=list')
    expect(composed).toBe(
      'npx playwright test --config=playwright.config.ts --reporter=list 2 > /tmp/run.log',
    )
    expect(parseComposed(composed ?? '').ok).toBe(true)
  })

  it('answers null for a statement inside a nested `sh -c` string, which has no offsets here', () => {
    const command = `sh -c 'npx playwright test --config=playwright.config.ts 2>&1'`
    expect(optionOffsetFor(command, 'playwright')).toBeNull()
  })

  it('answers null when the statement was never placed in this command', () => {
    expect(statementArgumentEnd('npx playwright test', null, 18)).toBeNull()
    expect(statementArgumentEnd('npx playwright test', 0, null)).toBeNull()
  })
})

/**
 * X1 xr-molecule-flash-m418 (+23:31): a heredoc config followed by a parenthesized Playwright
 * pipeline ending `2>&1 | tail -25)`. The tokenizer attaches a group's closer to the stage's last
 * word, so the parse's own statement end sat past the `)`: a caller cutting that stage out of the
 * command deleted the subshell's closer, and the background runner refused the rewritten command
 * with `end of file unexpected (expecting ")")`.
 */
describe('statementBoundary — where a stage’s own text ends, and the group it leaves', () => {
  /** The boundary {@link statementBoundary} answers for the statement running `program`. */
  const boundaryFor = (command: string, program: string) => {
    const located = locatedCommandSegments(command).find(
      (entry) => entry.segment?.program === program,
    )
    return statementBoundary(command, located?.start ?? null, located?.end ?? null)
  }

  it('stops a stage before the `)` of the subshell it sits in (m418)', () => {
    const command = '(npx playwright test 2>&1 | tail -25)'
    const tail = locatedCommandSegments(command).find((entry) => entry.segment?.program === 'tail')
    // The parse's own sentence takes the closer: this is why {@link statementArgumentEnd} had to
    // step over it, and why the cut needs the same answer.
    expect(command.slice(tail?.start ?? 0, tail?.end ?? 0)).toBe('tail -25)')
    const boundary = boundaryFor(command, 'tail')
    expect(boundary).not.toBeNull()
    expect(command.slice(0, boundary?.textEnd)).toBe('(npx playwright test 2>&1 | tail -25')
    expect(boundary?.leavesGroupOpen).toBe(false)
    // The shell's own reading keeps both closers of a nested subshell.
    const nested = '((npx playwright test 2>&1 | tail -25))'
    expect(nested.slice(0, boundaryFor(nested, 'tail')?.textEnd)).toBe(
      '((npx playwright test 2>&1 | tail -25',
    )
    // Whitespace before the closer is not part of the last word either.
    const spaced = '(npx playwright test 2>&1 | tail -25 )'
    expect(spaced.slice(0, boundaryFor(spaced, 'tail')?.textEnd)).toBe(
      '(npx playwright test 2>&1 | tail -25',
    )
  })

  it('keeps a `)` that is quoted text or a substitution’s argument', () => {
    const quoted = "(npx playwright test --grep 'a)b' 2>&1 | tail -5)"
    expect(quoted.slice(0, boundaryFor(quoted, 'tail')?.textEnd)).toBe(
      "(npx playwright test --grep 'a)b' 2>&1 | tail -5",
    )
    const substitution = '(npx playwright test --grep "$(cat x)" 2>&1 | tail -5)'
    expect(substitution.slice(0, boundaryFor(substitution, 'tail')?.textEnd)).toBe(
      '(npx playwright test --grep "$(cat x)" 2>&1 | tail -5',
    )
    // A subshell the STAGE opens is the stage's own text, closer included.
    const own = 'npx playwright test 2>&1 | (tail -5)'
    const ownTail = locatedCommandSegments(own).find((entry) => entry.segment?.program === 'tail')
    expect(boundaryFor(own, 'tail')).toEqual({
      textEnd: ownTail?.end ?? -1,
      leavesGroupOpen: false,
    })
  })

  it('names a stage that opens a group it does not close', () => {
    // The `}` follows a `;`, so it is a later statement — outside this stage's own text.
    const command = 'npx playwright test 2>&1 | { cat; }'
    expect(boundaryFor(command, 'cat')?.leavesGroupOpen).toBe(true)
    expect(boundaryFor('npx playwright test 2>&1 | (tail -5)', 'tail')?.leavesGroupOpen).toBe(false)
  })

  it('answers null for a statement with no offsets in this command', () => {
    expect(statementBoundary('npx playwright test', null, 18)).toBeNull()
    expect(statementBoundary('npx playwright test', 0, null)).toBeNull()
    // A statement inside a nested `sh -c` string sits at offsets of THAT string.
    const nested = "sh -c 'npx playwright test 2>&1 | tail -5)'"
    expect(boundaryFor(nested, 'tail')).toBeNull()
  })
})

describe('executedCommands — the commands a shell actually runs (m331)', () => {
  const programs = (command: string): string[] =>
    executedCommands(command).map((entry) => entry.program)

  it('reads a pipe inside a quoted pattern as data, not as a separator', () => {
    expect(programs('grep -E "USER CALLS|ENV|BUTTON|passed|failed" app.log')).toEqual(['grep'])
    expect(programs("awk '/ENV|printenv/' app.log")).toEqual(['awk'])
  })

  it('reports a launcher that runs alone, which commandSegments leaves out', () => {
    expect(programs('ls | env')).toEqual(['ls', 'env'])
    expect(programs('env')).toEqual(['env'])
    expect(programs('sudo env -0')).toEqual(['env'])
  })

  it('opens a `sh -c` body, a command substitution and a backtick substitution', () => {
    expect(programs("bash -c 'ls; printenv'")).toEqual(['ls', 'printenv'])
    expect(programs('echo "$(printenv | head -1)"')).toEqual(['echo', 'printenv', 'head'])
    expect(programs('echo `env`')).toEqual(['echo', 'env'])
  })

  it('keeps a quoted or escaped substitution literal, and a redirect out of command position', () => {
    expect(programs("printf '%s\\n' '$(env)'")).toEqual(['printf'])
    expect(programs('echo \\$(env)')).toEqual(['echo'])
    expect(programs('env > out.txt')).toEqual(['env'])
  })

  it('unwraps launchers and assignments to the program they run', () => {
    expect(programs('cd app && env -u KEY npx playwright test')).toEqual(['cd', 'playwright'])
    expect(programs("env -i PATH=/usr/bin sh -c 'npm test'")).toEqual(['npm'])
  })
})

/**
 * X1 xr-molecule-flash-l07 (+16:27): the assignment `UID_VAL=h$(date +%s)` was read as TWO words
 * because the word reader stopped at the space inside a command substitution. `+%s)` then stood
 * in command position, the supplied Hurl runner behind it was invisible, and a completed 13-file
 * /154-request run read as "Hurl has never run" — the first deploy was refused over it.
 *
 * The words below are the shell's own words: a substitution, its whitespace and its nesting are
 * part of the word that carries them. Nothing here is evaluated; the scanner only finds where a
 * word ends.
 */
describe('a command substitution inside a word keeps that word whole (flash-l07)', () => {
  const ACTUAL =
    'cd /workspace/fixtures/realworld/specs/api && HOST=http://localhost:4000 ' +
    'UID_VAL=h$(date +%s) ./run-api-tests-hurl.sh 2>&1 | tail -60'
  const RUNNER = './run-api-tests-hurl.sh'

  it('reads the supplied runner in command position, assignment attached', () => {
    expect(commandSegments(ACTUAL).map((segment) => segment.program)).toEqual([
      'cd',
      'run-api-tests-hurl.sh',
      'tail',
    ])
    const run = locatedCommandSegments(ACTUAL).find(
      (entry) => entry.segment?.program === 'run-api-tests-hurl.sh',
    )
    // The program is its basename; the offsets below still name the word as written.
    expect(run?.segment?.text).toBe('run-api-tests-hurl.sh 2>&1')
    expect(run?.assignments).toEqual(['HOST=http://localhost:4000', 'UID_VAL=h$(date +%s)'])
  })

  it('places programOffset and assignmentOffset on the words it reports', () => {
    const run = locatedCommandSegments(ACTUAL).find(
      (entry) => entry.segment?.program === 'run-api-tests-hurl.sh',
    )
    const programOffset = run?.programOffset ?? -1
    const assignmentOffset = run?.assignmentOffset ?? -1
    // Both offsets land exactly where their word starts in the command.
    expect(ACTUAL.slice(programOffset, programOffset + RUNNER.length)).toBe(RUNNER)
    expect(assignmentOffset).toBe(ACTUAL.indexOf(RUNNER))
    expect(ACTUAL.slice(run?.start ?? 0, assignmentOffset)).toBe(
      'HOST=http://localhost:4000 UID_VAL=h$(date +%s) ',
    )
    // …and the statement ends where the shell's own words end.
    expect(ACTUAL.slice(assignmentOffset, run?.end ?? 0)).toBe('./run-api-tests-hurl.sh 2>&1')
  })

  it.each([
    'UID_VAL=h$(date +%s)',
    'UID_VAL="h$(date +%s)"',
    "UID_VAL='h$(date +%s)'",
    'UID_VAL=h"$(date +%s)"',
    'UID_VAL=h$(date +%s)$(date +%N)',
    'UID_VAL=h$(date $(printf +%s))',
    'UID_VAL=h`date +%s`',
    'UID_VAL="${UID_VAL:-$(date +%s)$$}"',
  ])('keeps %s one word, whatever its quoting and nesting', (assignment) => {
    const command = `cd specs && ${assignment} ./run-api-tests-hurl.sh 2>&1 | tail -5`
    expect(commandSegments(command).map((segment) => segment.program)).toEqual([
      'cd',
      'run-api-tests-hurl.sh',
      'tail',
    ])
    const run = locatedCommandSegments(command).find(
      (entry) => entry.segment?.program === 'run-api-tests-hurl.sh',
    )
    expect(run?.assignments).toContain(assignment)
    expect(command.slice(run?.programOffset ?? 0)).toMatch(/^\.\/run-api-tests-hurl\.sh/)
  })

  it('keeps each assignment whole behind an `env` wrapper too', () => {
    const command = 'env HOST=x UID_VAL=h$(date +%s) ./run-api-tests-hurl.sh 2>&1'
    const run = locatedCommandSegments(command).find(
      (entry) => entry.segment?.program === 'run-api-tests-hurl.sh',
    )
    expect(run?.assignments).toEqual(['HOST=x', 'UID_VAL=h$(date +%s)'])
    expect(command.slice(run?.programOffset ?? 0)).toBe('./run-api-tests-hurl.sh 2>&1')
  })

  it('keeps the word whole inside a nested `sh -c` string', () => {
    const command = "bash -c 'UID_VAL=h$(date +%s) ./run-api-tests-hurl.sh 2>&1'"
    expect(commandSegments(command).map((segment) => segment.program)).toEqual([
      'run-api-tests-hurl.sh',
    ])
    // A nested statement's positions are positions in the nested string, not in this command.
    expect(locatedCommandSegments(command)[0]?.programOffset).toBeNull()
  })

  it('runs the substitution as its own command without inventing an outer run', () => {
    expect(executedCommands(ACTUAL).map((entry) => entry.program)).toEqual([
      'cd',
      'run-api-tests-hurl.sh',
      'tail',
      'date',
    ])
    expect(executedCommands('echo "$(date +%s)"').map((entry) => entry.program)).toEqual([
      'echo',
      'date',
    ])
  })

  it('still runs nothing when the runner is only read, printed or mentioned', () => {
    for (const command of [
      'head -30 run-api-tests-hurl.sh',
      'cat run-api-tests-hurl.sh',
      'grep -n "UID_VAL=h$(date +%s)" run-api-tests-hurl.sh',
      'echo "UID_VAL=h$(date +%s) ./run-api-tests-hurl.sh"',
      "printf '%s\\n' 'UID_VAL=h$(date +%s) ./run-api-tests-hurl.sh'",
      "cat <<'EOF'\nUID_VAL=h$(date +%s) ./run-api-tests-hurl.sh\nEOF",
    ]) {
      expect(commandSegments(command).map((segment) => segment.program)).not.toContain(
        'run-api-tests-hurl.sh',
      )
    }
  })

  it('keeps the literal control unchanged', () => {
    const command = 'HOST=http://localhost:4000 UID_VAL=h123 ./run-api-tests-hurl.sh 2>&1'
    expect(commandSegments(command).map((segment) => segment.program)).toEqual([
      'run-api-tests-hurl.sh',
    ])
  })
})

describe('commandSubstitutions exposes existing parse scopes', () => {
  it('keeps a quoted closing parenthesis inside the executable body', () => {
    expect(commandSubstitutions('echo "$(printf ")"; rm -f file)"')).toEqual([
      'printf ")"; rm -f file',
    ])
  })

  it('includes assignment-only and prefixed-assignment substitutions', () => {
    expect(commandSubstitutions('A=$(rm -f a)')).toEqual(['rm -f a'])
    expect(commandSubstitutions('A=$(rm -f a) true')).toEqual(['rm -f a'])
  })

  it('keeps sibling bodies separate and nested bodies inside their parent', () => {
    const command = 'echo "$(cd app; echo "$(rm -f nested)")$(rm -f sibling)"'
    const bodies = commandSubstitutions(command)
    expect(bodies).toEqual(['cd app; echo "$(rm -f nested)"', 'rm -f sibling'])
    expect(commandSubstitutions(bodies[0]!)).toEqual(['rm -f nested'])
  })

  it('reads executable backticks and ignores inert or escaped substitutions', () => {
    expect(commandSubstitutions('echo `rm -f file`')).toEqual(['rm -f file'])
    expect(commandSubstitutions("echo '$(rm -f file)' '`rm -f file`'")).toEqual([])
    expect(commandSubstitutions(String.raw`echo \$(rm -f file) \`rm -f file\``)).toEqual([])
  })

  it('ignores substitutions written in comments or quoted heredoc data', () => {
    expect(commandSubstitutions('# $(rm -f file)\necho ok')).toEqual([])
    expect(commandSubstitutions("cat <<'EOF'\n$(rm -f file)\nEOF")).toEqual([])
  })
})

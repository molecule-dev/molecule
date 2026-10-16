/**
 * The runner invocations that print information and run no test — the one classifier every
 * site asks before it treats a command as a test run.
 *
 * A Playwright CLI has subcommands and flags that never start a test: `playwright test --list`
 * prints the tests it would run and exits, `show-report`/`show-trace` open a saved report,
 * `codegen` records one, `install` fetches browsers, `merge-reports` joins blobs, and
 * `--help`/`--version` print and exit. Vitest lists with `vitest list` / `--list` and hurl
 * prints with `--help`/`--version`, the same way.
 *
 * Every check in the platform read such a command as a whole-suite run, because each one
 * matched the runner's NAME. X1 xr-molecule-flash-m79's first Playwright command was a config
 * check — a config written to `/tmp`, `cp`'d beside the suite and used with `--list` — and it
 * came back HELD, `status: not_run`, with a ~4 KB `suiteNote` telling it to send the same
 * command with `--max-failures=15` ("uncapped it walks every test … 8–13 minutes"), beside an
 * environment block saying the run "ran on their defaults" and an import note about a path the
 * `cp` had already fixed. Nothing ran. The model gave up on the approach, wrote a second
 * config, and its next command was held again (flash-m74's "same command three times" shape):
 * two holds, zero tests, and the config check it asked for never answered.
 *
 * So the classifiers live here, in one place, and callers ask them instead of their own
 * regexes: {@link commandRunsNoTests} answers for a whole command, and the runner-specific
 * sites (molecule-dev's suite checks, `streamingBackgroundCommand`, `isSuiteRunCommand`) route
 * through it. A command that runs no test is never held, never noted, and never rewritten
 * (`--retries`, `--reporter`) as if it were a run.
 *
 * What counts as an invocation is COMMAND POSITION, read by `@molecule/api-ai-tools`'
 * `commandSegments`: `npx playwright test --list`, `hurl --help` and `bash run.sh` invoke the
 * runner, while a runner named as an argument (`grep -n playwright e2e/README.md`,
 * `head -30 run-api-tests-hurl.sh`) invokes nothing at all. X1 xr-molecule-flash-m81 (+20:03)
 * read a runner script with `head -30` and the suite-overlap hold answered "a Playwright suite is
 * already running … wait for it", for a command that runs nothing.
 *
 * @module
 */

import { commandSegments } from './command-position.js'

/** The runners whose runs the platform watches — the ones a "run" claim can be about. */
type Runner = 'playwright' | 'vitest' | 'hurl'

/**
 * The runners by the word in command position. A runner spelled as a FILE's name is not one:
 * `-c playwright.local.config.ts` names a config, and `node playwright.js` runs node.
 */
const RUNNERS: Readonly<Record<string, Runner>> = {
  playwright: 'playwright',
  vitest: 'vitest',
  hurl: 'hurl',
}

/** Playwright's subcommands that start no test. */
const PLAYWRIGHT_INFO_SUBCOMMANDS: readonly string[] = [
  'show-report',
  'show-trace',
  'codegen',
  'install',
  'merge-reports',
]

/** Vitest's subcommand that prints what a run would collect. */
const VITEST_LIST_SUBCOMMAND = 'list'

/**
 * The flags that put a runner in an information mode: it prints and exits. `-h` is `--help`
 * for all three (hurl's manual documents `-h, --help`; Playwright's and Vitest's CLIs follow
 * the same convention), and the value-taking flags beside them are why each is matched as a
 * whole token — hurl's `-H` is a header, not help.
 */
const NO_RUN_FLAGS: Readonly<Record<Runner, readonly RegExp[]>> = {
  playwright: [
    /(?:^|\s)--list(?=\s|$)/,
    /(?:^|\s)--dry-run(?=\s|$)/,
    /(?:^|\s)--help(?=\s|$)/,
    /(?:^|\s)-h(?=\s|$)/,
    /(?:^|\s)--version(?=\s|$)/,
  ],
  vitest: [
    /(?:^|\s)--list(?=\s|$)/,
    /(?:^|\s)--help(?=\s|$)/,
    /(?:^|\s)-h(?=\s|$)/,
    /(?:^|\s)--version(?=\s|$)/,
  ],
  hurl: [/(?:^|\s)--help(?=\s|$)/, /(?:^|\s)-h(?=\s|$)/, /(?:^|\s)--version(?=\s|$)/],
}

/**
 * A heredoc body is data a command writes, not what it runs: a `playwright test --list` inside
 * the config a command writes is not a run of this command either way. The pattern consumes the
 * writer's own line prefix, the same shape `outputRedirectTarget` reads.
 */
const HEREDOC = /[^\n;&|]*<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g

/**
 * Whether this runner's invocation — the text from just after its name to the end of its
 * segment ({@link commandSegments}) — only prints.
 *
 * @param runner - The runner the segment invokes.
 * @param after - Everything after the runner's name in that segment.
 * @returns True when the invocation starts no test.
 */
function informational(runner: Runner, after: string): boolean {
  const first = after.trimStart().split(/\s+/)[0] ?? ''
  if (runner === 'playwright' && PLAYWRIGHT_INFO_SUBCOMMANDS.includes(first)) return true
  if (runner === 'vitest' && first === VITEST_LIST_SUBCOMMAND) return true
  return NO_RUN_FLAGS[runner].some((re) => re.test(after))
}

/**
 * Whether a shell command invokes a test runner and EVERY such invocation only prints — so the
 * command runs no test at all.
 *
 * A runner counts only where a shell would RUN it ({@link commandSegments}): the word in command
 * position of a segment, after its wrapper prefixes. A runner named in an argument is not an
 * invocation — `head -30 run-api-tests-hurl.sh` and `grep -n playwright e2e/README.md` name a
 * file to read, and a `--list` written inside a file the command writes is not a flag anyone runs
 * with (flash-m81).
 *
 * A command that invokes no runner is NOT one of these (false): "the command runs no test" is
 * then true for `ls`, which is not the question any caller is asking. The question is whether
 * the runner invocation each caller read as a run is one.
 *
 * A command that also runs tests is false however it is spelled: `npx playwright install &&
 * npx playwright test` installs and runs, so a caller that sees `playwright test` in it is
 * reading a real run.
 *
 * @param command - The shell command as the executor sent it.
 * @returns True when the command invokes a runner only to print.
 */
export function commandRunsNoTests(command: string): boolean {
  if (typeof command !== 'string' || !command.trim()) return false
  let invocations = 0
  for (const segment of commandSegments(command.replace(HEREDOC, ' '))) {
    const runner = RUNNERS[segment.program]
    if (!runner) continue
    invocations += 1
    if (!informational(runner, segment.args.join(' '))) return false
  }
  return invocations > 0
}

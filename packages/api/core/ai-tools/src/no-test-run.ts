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
 * matched the runner's NAME. A first Playwright command that was a config
 * check — a config written to `/tmp`, `cp`'d beside the suite and used with `--list` — and it
 * came back HELD, `status: not_run`, with a ~4 KB `suiteNote` telling it to send the same
 * command with `--max-failures=15` ("uncapped it walks every test … 8–13 minutes"), beside an
 * environment block saying the run "ran on their defaults" and an import note about a path the
 * `cp` had already fixed. Nothing ran. The model gave up on the approach, wrote a second
 * config, and its next command was held again ("same command three times" shape):
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
 * `head -30 run-api-tests-hurl.sh`) invokes nothing at all. Reading a runner script with
 * `head -30` has had the suite-overlap hold answer "a Playwright suite is
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
 * The programs that start no test — the shell's own bookkeeping (`cd`, `export`, `echo`), and the
 * readers, printers and file commands an executor uses to look at what is already there (`cat`,
 * `ls`, `cp`, `tail`, …).
 *
 * A segment whose program is neither a runner nor one of these is a program this reader cannot
 * account for: the suite's own script (`./run-api-tests-hurl.sh`), a wrapper the executor wrote,
 * anything that may itself start a suite. {@link commandRunsNoTests} answers false for a command
 * carrying one — "every invocation only prints" is not a claim an unknown step can support.
 * A command like
 * `hurl --version | head -2 && HOST=http://localhost:4000 ./run-api-tests-hurl.sh 2>&1 | tail -60`
 * ran a suite that passed 13/13, and the supplied script was the one segment nobody could place:
 * the
 * whole command read as a version probe, so every "has the suite run?" reader said no for the
 * rest of the run and the early deploy was held to the end of the list.
 */
const NO_TEST_PROGRAMS: ReadonlySet<string> = new Set([
  '[',
  '[[',
  ':',
  'awk',
  'base64',
  'basename',
  'case',
  'cat',
  'cd',
  'chmod',
  'chown',
  'column',
  'comm',
  'cp',
  'cut',
  'date',
  'df',
  'diff',
  'dirname',
  'do',
  'done',
  'du',
  'echo',
  'egrep',
  'else',
  'env',
  'esac',
  'export',
  'expr',
  'false',
  'fgrep',
  'fi',
  'file',
  'fold',
  'for',
  'grep',
  'head',
  'hostname',
  'id',
  'if',
  'jq',
  'kill',
  'less',
  'ln',
  'ls',
  'md5sum',
  'mkdir',
  'mktemp',
  'more',
  'mv',
  'nl',
  'od',
  'paste',
  'printf',
  'pwd',
  'readlink',
  'realpath',
  'rev',
  'rm',
  'rmdir',
  'seq',
  'set',
  'sha256sum',
  'sleep',
  'sort',
  'stat',
  'tac',
  'tail',
  'tee',
  'test',
  'then',
  'touch',
  'tr',
  'true',
  'type',
  'uname',
  'uniq',
  'unset',
  'until',
  'wait',
  'wc',
  'which',
  'while',
  'whoami',
  'xxd',
])

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
 * with.
 *
 * A command that invokes no runner is NOT one of these (false): "the command runs no test" is
 * then true for `ls`, which is not the question any caller is asking. The question is whether
 * the runner invocation each caller read as a run is one.
 *
 * A command that also runs tests is false however it is spelled: `npx playwright install &&
 * npx playwright test` installs and runs, so a caller that sees `playwright test` in it is
 * reading a real run. So is a command carrying a segment this reader cannot place (a script it
 * does not know, which may start a suite): only the runners and the {@link NO_TEST_PROGRAMS}
 * table can be accounted for, and "only prints" is a claim about the WHOLE command.
 *
 * @param command - The shell command as the executor sent it.
 * @returns True when the command invokes a runner only to print.
 */
export function commandRunsNoTests(command: string): boolean {
  if (typeof command !== 'string' || !command.trim()) return false
  let invocations = 0
  for (const segment of commandSegments(command.replace(HEREDOC, ' '))) {
    // An own key only: `constructor` is a program name (`constructor --version`) and a
    // prototype key is not a runner.
    const runner = Object.hasOwn(RUNNERS, segment.program) ? RUNNERS[segment.program] : undefined
    if (runner === undefined) {
      // A program this reader cannot place may start a suite of its own; only a known
      // non-test program lets the command keep reading as "prints only".
      if (!NO_TEST_PROGRAMS.has(segment.program)) return false
      continue
    }
    invocations += 1
    if (!informational(runner, segment.args.join(' '))) return false
  }
  return invocations > 0
}

/**
 * Command position: which program a shell segment actually RUNS, and which words are only
 * arguments to something else.
 *
 * Every classifier that read a command as "this runs the suite" matched the runner's NAME
 * anywhere in the text, so a runner named in an argument was read as an invocation: X1
 * xr-molecule-flash-m81 (+20:03) sent
 * `cd /workspace/fixtures/realworld/specs/api && ls && head -30 run-api-tests-hurl.sh` — two
 * reads of a file that was already there — and the suite-overlap hold answered "a Playwright
 * suite is already running against this app and database … wait for it", costing a minute of
 * forced idling on a command that writes nothing and runs nothing. `cat`, `grep`, `sed -n`,
 * `wc`, `ls` and `git show` of a runner script are the same shape.
 *
 * So this parser answers it in one place, for every caller: split the command at its pipeline
 * and statement separators, take each segment's word in command position — after the wrapper
 * prefixes a shell puts in front of it (`HOST=x sudo nice -n 10 npx`, `bash`, `timeout 280`) —
 * and let the caller match its runner against THAT segment's text, never against the raw
 * command. `{@link commandSegments}` returns the segments, and
 * {@link runsInCommandPosition} asks one anchored pattern of them all.
 *
 * Not command position, and therefore not an invocation: a runner named as an argument
 * (`head -30 run-api-tests-hurl.sh`, `grep -n playwright e2e/README.md`,
 * `git show HEAD:run-api-tests.sh`), and a runner named in a heredoc body — a file a command
 * WRITES is not a command it runs, so the bodies are blanked to spaces before anything is split
 * ({@link blankHeredocBodies}); offsets stay exact, because the blanking preserves every position.
 *
 * The parser also answers WHERE each statement sits ({@link locatedCommandSegments}): `start`,
 * `end`, `programOffset` and `assignmentOffset` are the offsets a caller splices at. They are
 * token positions from this walk, never a search for re-joined text — the words are joined back
 * with single spaces for matching, so `command.indexOf(segment.text)` fails on irregular spacing,
 * on grouping braces, and on anything a heredoc body shifts (xr-molecule-flash-m105 +08:12).
 *
 * @module
 */

/** One statement or pipeline stage of a shell command: what it runs, and with what. */
export interface CommandSegment {
  /**
   * The word in command position, its directory removed (`/usr/bin/hurl` → `hurl`): the program
   * the shell would run once whatever wrappers stood in front of it are taken away. When a
   * wrapper runs a tool's own CLI by file, this is the tool's name — `node
   * <path>/node_modules/.bin/playwright test` is a `playwright` invocation, not a `node` one.
   */
  program: string
  /** The words after it, as written — quotes kept, so a quoted `"a|b"` is one word. */
  args: readonly string[]
  /** The program and its arguments as one line — what a runner pattern is matched against. */
  text: string
  /**
   * The seconds the segment's own `timeout` wrapper allows the command it runs
   * (`timeout 280 hurl --test …` → 280), or null when it carries none.
   */
  timeoutSeconds: number | null
}

/** A command's words, quotes kept whole — the same reading a printed-source check uses. */
const WORD = /"(?:\\.|[^"\\])*"|'[^']*'|\S+/g

/** Shell words that stand alone: grouping, never an argument. */
const GROUPING = new Set(['(', ')', '{', '}'])

/**
 * A redirection written as ONE word, its target attached: `2>&1`, `>out.log`, `&>/dev/null`,
 * `<<'EOF'`. Matched against a word of the statement, so a redirect's target written as its own
 * word is {@link REDIRECT_OPERATOR}'s case instead.
 */
const REDIRECT_WORD = /^(?:\d*|&)(?:<<<|<<-?|>>?\|?|<>|>&|<&)(?:&?\d+|-|[^\s;&|()<>]*)?$/

/** A redirection operator on its own, whose target is the word after it (`> out.log`). */
const REDIRECT_OPERATOR = /^(?:\d*|&)(?:<<<|<<-?|>>?\|?|<>|>&|<&)$/

/** How deep a `sh -c '<command>'` is opened before the parser leaves it alone. */
const MAX_NESTING = 3

/** How many wrapper words one segment may carry before the parser gives up on it. */
const MAX_WRAPPERS = 32

/**
 * Words that run in front of the real program: a scheduler, a privilege wrapper, a process
 * launcher, or a name that simply runs the next word (`command ls`, `exec ls`). All of them
 * leave what runs unchanged, so all of them are stripped.
 */
const LAUNCHERS: ReadonlySet<string> = new Set([
  'command',
  'doas',
  'env',
  'exec',
  'ionice',
  'nice',
  'nohup',
  'setsid',
  'stdbuf',
  'sudo',
  'time',
  'timeout',
])

/** The shells whose `-c '<command>'` argument is a command of its own. */
const SHELLS: ReadonlySet<string> = new Set(['ash', 'bash', 'dash', 'ksh', 'sh', 'zsh'])

/**
 * Node, which is a wrapper only when the script it runs IS a tool's own CLI — never in general:
 * `node script.mjs` RUNS that script, so the parser's answer for it stays `node`.
 *
 * The Playwright runner is spelled this way whenever a project reaches it by file instead of by
 * the `.bin` shim: xr-molecule-flash-m179 (+17:51) ran
 * `node /workspace/node_modules/.bin/playwright test` after `npx playwright test` in every
 * earlier call, and no reader recognised it — the run got no `--trace`, no suite-budget pin and
 * no proof credit, and the platform spent the rest of the turn re-walking a suite it had already
 * walked green.
 */
const NODE: ReadonlySet<string> = new Set(['node'])

/**
 * The Playwright CLI, as the path operand of a `node` invocation: the package's `.bin` shim, or
 * the `cli.js` a package installs (`playwright/cli.js`, `@playwright/test/cli.js`).
 */
const PLAYWRIGHT_CLI =
  /(?:^|\/)node_modules\/(?:\.bin\/playwright|(?:playwright|@playwright\/test)\/cli\.(?:js|mjs|cjs))$/

/**
 * The runner a `node` script operand IS, or null when the operand is any other script.
 *
 * @param word - The script operand, as written.
 * @returns The runner's name (`playwright`), or null.
 */
function nodeScriptRunner(word: string): string | null {
  return PLAYWRIGHT_CLI.test(unquoted(word)) ? 'playwright' : null
}

/**
 * Node's own value-taking options: the ones that consume the word after them, so the script
 * operand is not mistaken for a value (`node -r tsx/cli.js …`). Node also accepts `--flag=value`.
 */
const NODE_VALUE_FLAGS: ReadonlySet<string> = new Set([
  '-e',
  '--eval',
  '-p',
  '--print',
  '-r',
  '--require',
  '--import',
  '--loader',
  '--experimental-loader',
  '--input-type',
  '--conditions',
  '--title',
])

/**
 * The word a `node` invocation runs as its script: the first operand after node's own options,
 * with `--` ending the options. Null when node runs no file (`node --test`, `node -e '<code>'`).
 *
 * A wrong guess here is harmless: the operand is then checked against {@link PLAYWRIGHT_CLI}, so
 * an ordinary script (`node probe.mjs`) is never read as a runner.
 *
 * @param words - The segment's words.
 * @param from - The index just after `node`.
 * @returns The script operand's index, or null.
 */
function nodeScriptIndex(words: readonly string[], from: number): number | null {
  let at = from
  for (let guard = 0; guard < MAX_WRAPPERS && at < words.length; guard++) {
    const word = words[at] ?? ''
    if (!word.startsWith('-')) return at
    const flag = unquoted(word)
    // `--` ends node's options; the script is the next word.
    if (flag === '--') return at + 1 < words.length ? at + 1 : null
    at += flag.includes('=') || !NODE_VALUE_FLAGS.has(flag) ? 1 : 2
  }
  return null
}

/** Package runners that run the program named after them (`npx playwright test`). */
const PACKAGE_RUNNERS: ReadonlySet<string> = new Set(['bunx', 'npx', 'pnpx'])

/** Package managers whose sub-command runs a package's binary (`bun x`, `pnpm dlx`, `npm exec`). */
const PACKAGE_RUNNER_HEADS: ReadonlySet<string> = new Set(['bun', 'npm', 'pnpm', 'yarn'])

/**
 * The sub-commands that run a package's binary, after a {@link PACKAGE_RUNNER_HEADS} word. Its
 * other sub-commands are the program itself, not a wrapper: `yarn test` and `bun run build` run
 * a script of the project's, and nothing is stripped from them.
 */
const PACKAGE_RUNNER_SUBCOMMANDS: ReadonlySet<string> = new Set(['dlx', 'exec', 'x'])

/**
 * npm's value-taking options: `npm exec`'s own (`-p/--package`, `-c/--call`, `-w/--workspace`,
 * `--prefix`) and the string-valued configs `npm config ls -l` lists in the sandbox image, which
 * npm accepts on the command line of any invocation.
 */
const NPM_VALUE_FLAGS: readonly string[] = [
  '-c',
  '--call',
  '-p',
  '--package',
  '-w',
  '--workspace',
  '--prefix',
  '--registry',
  '--cache',
  '--userconfig',
  '--globalconfig',
  '--loglevel',
  '--logs-dir',
  '--script-shell',
  '--shell',
  '--tag',
  '--otp',
  '--scope',
  '--location',
  '--user-agent',
  '--which',
  '--viewer',
  '--proxy',
  '--https-proxy',
  '--cert',
  '--key',
  '--ca',
  '--cafile',
  '--editor',
  '--message',
  '--node-options',
  '--save-prefix',
  '--preid',
  '--access',
  '--also',
  '--audit-level',
  '--auth-type',
  '--before',
  '--browser',
  '--cidr',
  '--cpu',
  '--depth',
  '--expect-result-count',
  '--expect-results',
  '--install-strategy',
  '--libc',
  '--local-address',
  '--lockfile-version',
  '--only',
  '--os',
  '--pack-destination',
  '--provenance-file',
  '--replace-registry-host',
  '--sbom-format',
  '--sbom-type',
  '--searchexclude',
  '--searchopts',
  '--tag-version-prefix',
]

/** pnpm dlx's value-taking options (`pnpm dlx --help`); its `-c` is the boolean shell-mode. */
const PNPM_DLX_VALUE_FLAGS: readonly string[] = ['--allow-build', '--package', '--reporter']

/**
 * The package manager's OWN options that take their value from the next word — read from the
 * versions the sandbox image (`node:22-trixie-slim`) ships: npm 10.9.9 (`npm exec --help`, and
 * every string-valued key of `npm config ls -l`), pnpm 10.34.7 (`pnpm help exec`,
 * `pnpm dlx --help`) and Yarn 4.18.1 (`yarn dlx --help`). A flag absent here is skipped as a
 * boolean, which is what every documented switch is.
 *
 * The table is keyed per manager because the same short flag means different things in two of
 * them: `-c` is npm's `--call <command>` (a value, and a command of its own —
 * {@link PACKAGE_RUNNER_CALL_FLAGS}) but pnpm's `--shell-mode` (a switch), and `-w` is npm's
 * `--workspace <name>` (a value) but pnpm's `--workspace-root` (a switch).
 */
const PACKAGE_RUNNER_VALUE_FLAGS: Readonly<Record<string, readonly string[]>> = {
  // npm exec's documented options, plus the config flags npm accepts on any invocation.
  npx: NPM_VALUE_FLAGS,
  'npm exec': NPM_VALUE_FLAGS,
  'npm x': NPM_VALUE_FLAGS,
  // `npx --prefix /app playwright test` is how flash-m101's run reached the app's own Playwright.
  bunx: ['-p', '--package'],
  'bun x': ['-p', '--package'],
  pnpx: PNPM_DLX_VALUE_FLAGS,
  'pnpm dlx': PNPM_DLX_VALUE_FLAGS,
  'pnpm x': PNPM_DLX_VALUE_FLAGS,
  'pnpm exec': [
    '-C',
    '--dir',
    '--loglevel',
    '--resume-from',
    '--reporter',
    '--filter',
    '--filter-prod',
    '--changed-files-ignore-pattern',
    '--workspace-concurrency',
    '--prefix',
  ],
  'yarn dlx': ['-p', '--package'],
  'yarn exec': [],
  'yarn x': [],
}

/**
 * The package-runner options whose VALUE is itself a command (`npm exec -c '<command>'`), so it is
 * parsed as one: `npx -c 'playwright test'` runs Playwright, and its program is not the word after
 * the flag.
 */
const PACKAGE_RUNNER_CALL_FLAGS: Readonly<Record<string, readonly string[]>> = {
  npx: ['-c', '--call'],
  'npm exec': ['-c', '--call'],
  'npm x': ['-c', '--call'],
}

/** Wrapper flags that are followed by their own value (`sudo -u root`, `timeout -k 5`). */
const WRAPPER_VALUE_FLAGS: Readonly<Record<string, readonly string[]>> = {
  env: ['-S', '--split-string', '-u', '--unset', '-C', '--chdir'],
  ionice: ['-c', '--class', '-n', '--classdata', '-p', '--pid', '-P', '--pgid', '-u', '--uid'],
  nice: ['-n', '--adjustment'],
  stdbuf: ['-e', '-i', '-o'],
  sudo: [
    '-C',
    '--chdir',
    '-g',
    '--group',
    '-p',
    '--prompt',
    '-r',
    '--role',
    '-t',
    '--type',
    '-u',
    '--user',
    '-U',
    '--other-user',
  ],
  time: ['-f', '--format', '-o', '--output'],
  timeout: ['-k', '--kill-after', '-s', '--signal'],
}

/** An environment assignment (`HOST=…`, `BASE_URL="…"`): it runs nothing of its own. */
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

/** A wrapper's own duration — `timeout 280 …`, `timeout 1m …` — which is not a flag. */
const DURATION = /^\d+(?:\.\d+)?[smhd]?$/

/** The seconds a `timeout` duration word names (`280`, `1m`, `1.5h`), or null when it is none. */
const DURATION_UNITS: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600, d: 86_400 }

/**
 * The seconds a duration word stands for.
 *
 * @param word - A duration (`280`, `20s`, `1m`).
 * @returns The seconds, or null when the word is not a duration.
 */
export function durationSeconds(word: string): number | null {
  if (!DURATION.test(word)) return null
  const [, number = '', unit = 's'] = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(word) ?? []
  const scale = DURATION_UNITS[unit] ?? 1
  const seconds = Number(number) * scale
  return Number.isFinite(seconds) ? seconds : null
}

/**
 * A word without its shell quotes.
 *
 * @param word - One word of a segment.
 * @returns The word with a leading and a trailing quote character removed.
 */
function unquoted(word: string): string {
  return word.replace(/^['"]|['"]$/g, '')
}

/**
 * A word's program name: quotes removed, directory removed (`/usr/bin/hurl` → `hurl`). A scoped
 * package keeps its scope — the `/` in `@usebruno/cli` is part of the name, not a directory.
 *
 * @param word - One word of a segment.
 * @returns The bare name.
 */
function programName(word: string): string {
  const bare = unquoted(word)
  if (bare.startsWith('@')) return bare
  const parts = bare.split('/')
  return parts[parts.length - 1] ?? ''
}

/**
 * How many of a wrapper's own words follow it — its flags, and each value flag's value.
 *
 * @param words - The segment's words.
 * @param from - The index just after the wrapper.
 * @param wrapper - The wrapper's program name.
 * @returns The count of words the wrapper owns.
 */
function flagWords(words: readonly string[], from: number, wrapper: string): number {
  const withValue = WRAPPER_VALUE_FLAGS[wrapper] ?? []
  let count = 0
  while (from + count < words.length && (words[from + count] ?? '').startsWith('-')) {
    const flag = words[from + count] ?? ''
    // `--flag=value` carries its value inside the same word.
    count += !flag.includes('=') && withValue.includes(flag) ? 2 : 1
  }
  return count
}

/**
 * How many words a package runner (`npx`, `npm exec`, `pnpm dlx`, `yarn dlx`) owns before the
 * program it runs — its own options, and each value flag's value — plus the command string of a
 * `-c '<command>'`, which is a command of its own rather than the program word.
 *
 * A `--` ends the options: `npm exec --prefix x -- playwright test` runs `playwright` with `test`,
 * so the terminator is consumed and the walk stops there.
 *
 * @param words - The segment's words.
 * @param from - The index just after the runner (or after `npm exec`).
 * @param key - The runner's table key (`npm`, `npx`, `pnpm exec`, `yarn dlx`, …).
 * @returns The count of words the runner owns, and the `-c` command string when it carries one.
 */
function packageRunnerOptions(
  words: readonly string[],
  from: number,
  key: string,
): { count: number; nested: string | null } {
  const withValue = PACKAGE_RUNNER_VALUE_FLAGS[key] ?? []
  const callFlags = PACKAGE_RUNNER_CALL_FLAGS[key] ?? []
  let count = 0
  while (from + count < words.length) {
    const word = words[from + count] ?? ''
    if (!word.startsWith('-')) break
    // `--` ends the runner's options; the program is the next word.
    if (word === '--') return { count: count + 1, nested: null }
    const flag = unquoted(word)
    // `--flag=value` carries its value inside the same word.
    if (word.includes('=')) {
      count += 1
      continue
    }
    if (callFlags.includes(flag)) {
      const value = words[from + count + 1]
      return { count: count + 2, nested: value === undefined ? null : unquoted(value) }
    }
    count += withValue.includes(flag) ? 2 : 1
  }
  return { count, nested: null }
}

/**
 * The `-c '<command>'` string a shell was handed, or null when the shell was given a FILE
 * (`bash run.sh`) — the wrapper walk then steps past its flags instead.
 *
 * @param words - The segment's words.
 * @param from - The index just after the shell's name.
 * @returns The command string unquoted, or null.
 */
function nestedCommand(words: readonly string[], from: number): string | null {
  for (let i = from; i < words.length; i++) {
    const word = words[i] ?? ''
    if (!word.startsWith('-')) return null
    // A flag cluster holding `c` is `-c` (`bash -lc '…'`, `sh -ec '…'`).
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(word) || word === '--command') {
      const next = words[i + 1]
      return next === undefined ? null : unquoted(next)
    }
  }
  return null
}

/**
 * Where the program starts in one segment's words, the bound the segment puts on itself, and the
 * environment it binds for the program it runs.
 *
 * `bound` is every `NAME=value` word the walk steps over between the segment's start and its
 * program: the leading words, and the ones behind an `env` wrapper (`env -i PATH=$PATH
 * BASE_URL=https://… npx playwright test`). A shell passes those to the program in exactly the
 * same way — `env` is the POSIX form of the leading-word form — so a reader that only saw the
 * leading ones called a deployed walk local (X0 xr-molecule-flash-m204 +38:15: two green deployed
 * walks were refused, 5.2 min).
 *
 * @param words - The segment's words, quotes kept.
 * @returns The index of the word in command position (one past the end when the segment runs
 *   nothing), the command string of a `sh -c '<command>'` this segment turns out to be, the
 *   seconds its own `timeout` wrapper allows that command (`timeout 280 hurl …` → 280) or null,
 *   every `NAME=value` word bound for the program in the order the shell binds them, and the word
 *   index an assignment for the program belongs at when an `env` wrapper sits in front of it
 *   (`env -i … <here>npx`; a value written before `env -i` is cleared, so it must go after).
 *   `program` names what runs when that is not the word itself's name — `node <path>/playwright`
 *   is a `playwright` invocation, not a `node` one ({@link nodeScriptRunner}).
 */
function commandStart(words: readonly string[]): {
  at: number
  nested: string | null
  timeoutSeconds: number | null
  program: string | null
  bound: readonly string[]
  envInsert: number | null
  envReset: boolean
} {
  let at = 0
  let timeoutSeconds: number | null = null
  const bound: string[] = []
  let envInsert: number | null = null
  let envReset = false
  for (let guard = 0; guard < MAX_WRAPPERS && at < words.length; guard++) {
    const word = words[at] ?? ''
    if (ENV_ASSIGNMENT.test(word)) {
      bound.push(word)
      at += 1
      // Still the env wrapper's own region: an assignment for the program goes after it.
      if (envInsert !== null) envInsert = at
      continue
    }
    const name = programName(word)
    // `! cmd` inverts an exit status: what runs is still the word after it.
    if (name === '!') {
      at += 1
      continue
    }
    if (SHELLS.has(name)) {
      const nested = nestedCommand(words, at + 1)
      if (nested !== null)
        return { at, nested, timeoutSeconds, program: null, bound, envInsert, envReset }
      at += 1 + flagWords(words, at + 1, name)
      continue
    }
    if (PACKAGE_RUNNERS.has(name)) {
      const runner = packageRunnerOptions(words, at + 1, name)
      if (runner.nested !== null)
        return {
          at,
          nested: runner.nested,
          timeoutSeconds,
          program: null,
          bound,
          envInsert,
          envReset,
        }
      at += 1 + runner.count
      continue
    }
    if (
      PACKAGE_RUNNER_HEADS.has(name) &&
      PACKAGE_RUNNER_SUBCOMMANDS.has(unquoted(words[at + 1] ?? ''))
    ) {
      const subcommand = unquoted(words[at + 1] ?? '')
      const runner = packageRunnerOptions(words, at + 2, `${name} ${subcommand}`)
      if (runner.nested !== null)
        return {
          at,
          nested: runner.nested,
          timeoutSeconds,
          program: null,
          bound,
          envInsert,
          envReset,
        }
      at += 2 + runner.count
      continue
    }
    if (name === 'yarn' && unquoted(words[at + 1] ?? '') === 'playwright') {
      // Yarn classic runs the binary named after it (`yarn playwright test`); Yarn 2+ spells the
      // same thing `yarn exec`/`yarn dlx` ({@link PACKAGE_RUNNER_SUBCOMMANDS}). Only the runner's
      // own name is read through it — `yarn test` is the project's own script, not a binary.
      at += 1
      continue
    }
    if (NODE.has(name)) {
      // `node <path>/playwright test` is a Playwright invocation; `node probe.mjs` runs the
      // project's own script and stays a `node` statement (`program: null`).
      const script = nodeScriptIndex(words, at + 1)
      const runner = script === null ? null : nodeScriptRunner(words[script] ?? '')
      return runner === null
        ? { at, nested: null, timeoutSeconds, program: null, bound, envInsert, envReset }
        : {
            at: script ?? at,
            nested: null,
            timeoutSeconds,
            program: runner,
            bound,
            envInsert,
            envReset,
          }
    }
    if (!LAUNCHERS.has(name))
      return { at, nested: null, timeoutSeconds, program: null, bound, envInsert, envReset }
    const from = at
    at += 1 + flagWords(words, at + 1, name)
    // Past `env` and its own options: an assignment for the program written here survives
    // `env -i`, which clears everything before it.
    if (name === 'env') {
      envInsert = at
      // `env -i` clears the environment it inherited: the words bound before it are NOT the
      // environment the program runs in, so a reader must not attribute them to the run.
      if (
        words.slice(from + 1, at).some((flag) => flag === '-i' || flag === '--ignore-environment')
      )
        envReset = true
    }
    if (envReset) bound.length = 0
    if (name === 'timeout' && DURATION.test(words[at] ?? '')) {
      timeoutSeconds = durationSeconds(words[at] ?? '')
      at += 1
    }
  }
  return { at, nested: null, timeoutSeconds, program: null, bound, envInsert, envReset }
}

/**
 * One open nesting a shell word can be inside: a single-quoted string, a double-quoted string, or
 * a command substitution's parentheses (`$(`), which open a command of their own.
 */
type Nesting = 'single' | 'double' | 'sub'

/**
 * A command with every heredoc BODY blanked to spaces, so its length and every offset in it are
 * unchanged.
 *
 * A heredoc body is data the command writes, not a command it runs: `cat > playwright.config.ts
 * <<'EOF' … import { defineConfig, devices } from '@playwright/test' … EOF` writes a file and runs
 * `cat`. Read as shell, though, every line of the body is a statement — and the words joined back
 * for matching are not the words written, so a caller that placed a statement by searching for
 * them found nothing, in a command whose real statements sat all along. On X1
 * xr-molecule-flash-m105 (+08:12) the body's `import { defineConfig, devices } …` alone made
 * `suiteRunPipedAfterRunner` answer "piped" for a run with no pipe left, and the run's exit code
 * was dropped for the rest of the session.
 *
 * The body runs from the line after the operator to the line whose whole content is the delimiter
 * (leading TABS stripped for `<<-`, as `man bash` defines it); the terminator line is blanked too,
 * and its newline kept, so the statements around it still split at the same places. Newlines
 * inside the body are kept for the same reason. `<<<` is a herestring, not a heredoc, and a `<<`
 * inside quotes or a comment opens nothing.
 *
 * @param command - The shell command.
 * @returns The command with the bodies blanked to spaces, the same length as the input.
 */
function blankHeredocBodies(command: string): string {
  if (!command.includes('<<')) return command
  const chars = command.split('')
  /** Overwrite a range with spaces, keeping its newlines so statements still split there. */
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to; i++) if (chars[i] !== '\n') chars[i] = ' '
  }
  let lineStart = 0
  while (lineStart < command.length) {
    const lineEndRaw = command.indexOf('\n', lineStart)
    const lineEnd = lineEndRaw < 0 ? command.length : lineEndRaw
    const openers: Array<{ delimiter: string; stripTabs: boolean }> = []
    let quote: string | null = null
    for (let i = lineStart; i < lineEnd; i++) {
      const char = command[i] ?? ''
      if (quote !== null) {
        if (char === quote) quote = null
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      // A `#` that starts a word opens a comment: the rest of the line is not shell words.
      if (char === '#' && (i === lineStart || /\s/.test(command[i - 1] ?? ''))) break
      if (char !== '<' || command[i + 1] !== '<') continue
      // `<<<` is a herestring: it opens no body.
      if (command[i + 2] === '<') {
        i += 2
        continue
      }
      let at = i + 2
      const stripTabs = command[at] === '-'
      if (stripTabs) at += 1
      while (command[at] === ' ' || command[at] === '\t') at += 1
      let delimiter: string
      const opener = command[at]
      if (opener === '"' || opener === "'") {
        const close = command.indexOf(opener, at + 1)
        const wordEnd = close < 0 || close > lineEnd ? lineEnd : close
        delimiter = command.slice(at + 1, wordEnd)
        at = wordEnd + 1
      } else {
        let wordEnd = at
        while (wordEnd < lineEnd && !/\s/.test(command[wordEnd] ?? '')) wordEnd += 1
        delimiter = command.slice(at, wordEnd)
        at = wordEnd
      }
      if (delimiter !== '') openers.push({ delimiter, stripTabs })
      i = at - 1
    }
    if (openers.length === 0) {
      if (lineEndRaw < 0) break
      lineStart = lineEnd + 1
      continue
    }
    // The bodies follow the line that opened them, in the order the operators were written.
    let cursor = lineEndRaw < 0 ? command.length : lineEnd + 1
    for (const heredoc of openers) {
      let bodyEnd = command.length
      let after = command.length
      let from = cursor
      while (from < command.length) {
        const nl = command.indexOf('\n', from)
        const line = command.slice(from, nl < 0 ? command.length : nl)
        const compared = heredoc.stripTabs ? line.replace(/^\t+/, '') : line
        if (compared === heredoc.delimiter) {
          bodyEnd = from
          after = nl < 0 ? command.length : nl + 1
          break
        }
        if (nl < 0) break
        from = nl + 1
      }
      blank(cursor, bodyEnd)
      blank(bodyEnd, after)
      cursor = after
    }
    lineStart = cursor
  }
  return chars.join('')
}

/**
 * A command's statements and pipeline stages, split where the shell splits them — inside quotes
 * and inside a command substitution, a `|`, `;` or `&&` belongs to that command, not to this one.
 *
 * A single `&` separates only when it backgrounds a command: the one in a redirect (`2>&1`,
 * `&>log`) is part of the word it sits in.
 *
 * The nestings are a STACK, not a (quote, depth) pair, because they interleave: a command
 * substitution opened inside a double quote can itself hold double quotes, and each of those can
 * hold another substitution. `DIR="$(cd "$(dirname "$0")" && pwd)"` is exactly that shape — it
 * opens `"`, `$(`, `"`, `$(`, `"` in order — and every runner script of the RealWorld kind has it.
 * A flat walk read that first inner `"` as the CLOSE of the outer one, so the `)` that ends the
 * outer substitution landed inside a quote that was never opened, the depth was left standing at
 * 1, and every newline in the rest of the script was swallowed: the script's own `hurl --test`
 * never reached command position, and X1 xr-molecule-flash-m89 saw seven passing Hurl runs the
 * platform could not see (the runner is read from the tree's own script TEXT —
 * `molecule-dev/api/src/ai/supplied-tree-guard.ts` — so a script that does not classify records
 * no runner, and every run of it reads as nothing).
 *
 * @param command - The shell command.
 * @returns Each statement's text, the offset its first character sits at, and the separator that
 *   ended it (`|`, `&&`, `;`, a newline, … — '' after the last one), in order, with empty ones
 *   dropped.
 */
function splitSegments(command: string): Array<{
  text: string
  start: number
  after: string
  before: string
  /**
   * The group depth before each character of `text`, aligned with it, and -1 for a character
   * inside a quote or a command substitution — neither writes to the command's own stdout.
   */
  depths: readonly number[]
}> {
  const source = blankHeredocBodies(command)
  const parts: Array<{ text: string; start: number; after: string; depths: number[] }> = []
  let buffer = ''
  /** The offset in the command of the current buffer's first character. */
  let bufferStart = 0
  /** How many `( … )` / `{ … }` groups are open at the current position. */
  let groupDepth = 0
  /** The depth each character of `buffer` was written at, aligned with it (-1 when quoted). */
  let depths: number[] = []
  /**
   * Append shell text to the statement being read, recording the depth it was written at.
   * Text inside a quote or a command substitution is recorded as -1: a `>` there is a literal
   * character or a nested command's business, never the outer command's redirect.
   */
  const put = (text: string, depth = groupDepth): void => {
    for (let n = 0; n < text.length; n++) depths.push(depth)
    buffer += text
  }
  /** Close the statement being read at `after`. */
  const end = (after: string): void => {
    parts.push({ text: buffer, start: bufferStart, after, depths })
    buffer = ''
    depths = []
  }
  /** The nestings this position sits inside, outermost first. */
  const stack: Nesting[] = []
  for (let i = 0; i < source.length; i++) {
    const char = source[i] ?? ''
    const next = source[i + 1]
    const top = stack[stack.length - 1]

    // A single-quoted string expands nothing at all: no escape, no substitution, and no quote
    // but its own ends it.
    if (top === 'single') {
      put(char, -1)
      if (char === "'") stack.pop()
      continue
    }
    // A command substitution, wherever a shell opens one — inside double quotes too, and never
    // inside single quotes (handled above). The `(` is consumed here so the depth is counted once.
    if (char === '$' && next === '(') {
      stack.push('sub')
      put('$(', -1)
      i += 1
      continue
    }
    // Inside double quotes: a `"` closes them, a backslash escapes the next character (so
    // `"\$("` opens nothing), and everything else is literal — a `'`, a `|`, a newline included.
    if (top === 'double') {
      if (char === '"') stack.pop()
      else if (char === '\\' && next !== undefined) {
        put(char + next, -1)
        i += 1
        continue
      }
      put(char, -1)
      continue
    }
    if (char === '"') {
      stack.push('double')
      put(char, -1)
      continue
    }
    if (char === "'") {
      stack.push('single')
      put(char, -1)
      continue
    }
    // Inside a substitution or a subshell of one: its own parentheses nest, its `|`/`;`/`&&`
    // belong to the nested command, and its newlines are that command's too.
    if (top === 'sub') {
      if (char === '(') stack.push('sub')
      else if (char === ')') stack.pop()
      put(char, -1)
      continue
    }
    if (char === '\\' && next !== undefined) {
      // An escaped character is a literal (`\>` writes no file).
      put(char + next, -1)
      i += 1
      continue
    }
    // Grouping belongs to the shell, not to a word: a statement written inside `( … )` or
    // `{ … }` writes through that group, so the depth travels with every character a caller
    // reading a redirect may ask about.
    if (char === '(' || char === '{') {
      put(char)
      groupDepth += 1
      continue
    }
    if (char === ')' || char === '}') {
      groupDepth = Math.max(0, groupDepth - 1)
      put(char)
      continue
    }
    if ((char === '&' && next === '&') || (char === '|' && next === '|')) {
      end(char + next)
      i += 1
      bufferStart = i + 1
      continue
    }
    if (char === ';' || char === '|' || char === '\n') {
      end(char)
      bufferStart = i + 1
      continue
    }
    if (char === '&' && source[i - 1] !== '>' && next !== '>') {
      end('&')
      bufferStart = i + 1
      continue
    }
    put(char)
  }
  end('')
  const out: Array<{
    text: string
    start: number
    after: string
    before: string
    depths: readonly number[]
  }> = []
  // The separator of the last part, kept across the empty ones so a statement's own separator
  // survives the blank lines around it (`a &&\n b` and a heredoc's blanked body alike).
  let lastAfter: string | null = null
  for (const part of parts) {
    const trimStart = part.text.length - part.text.trimStart().length
    const text = part.text.trim()
    if (text === '') {
      lastAfter = part.after
      continue
    }
    out.push({
      text,
      start: part.start + trimStart,
      after: part.after,
      before: lastAfter ?? '',
      depths: part.depths.slice(trimStart),
    })
    lastAfter = part.after
  }
  return out
}

/** A redirect's target word: a quoted one keeps its spaces (`tee 'out file.txt'`). */
const REDIRECT_TARGET_WORD = String.raw`(?:'[^']*'|"[^"]*"|[^\s;&|]+)`

/**
 * A `>`, `>>` or `&>` redirect written at a statement's own level, with the word it writes to.
 * The lookbehind is what keeps `2>&1` out: the `>` of a descriptor redirect follows a digit.
 */
const REDIRECT_AND_TARGET = new RegExp(
  String.raw`(?<![0-9&>])(?:&>|1?>>?)\s*(${REDIRECT_TARGET_WORD})`,
  'g',
)

/** A word with one layer of MATCHING shell quotes removed (`'out file.txt'` → `out file.txt`). */
function unquotedWord(word: string): string {
  return word.replace(/^(['"])(.*)\1$/, '$2')
}

/**
 * The file a statement sends its own output to, when it redirects it at the command's own level.
 *
 * Three shapes are deliberately not one: a redirect inside a `( … )` / `{ … }` group (it writes
 * through that group, not through the command's own shell), a statement that feeds a heredoc's
 * file (`cat > cfg.ts <<'EOF'` writes a config), and `/dev/null` or a descriptor (`2>&1`).
 *
 * @param text - The statement's text, as the tokenizer split it.
 * @param depths - The depth each character of `text` was written at: the open-group count, 0 at
 *   the command's own level, -1 inside a quote or a command substitution.
 * @param program - The word in command position (`tee` writes through its own file argument).
 * @param args - The statement's words after the program.
 * @returns The target with one layer of quotes removed, or null.
 */
function redirectTargetOf(
  text: string,
  depths: readonly number[],
  program: string,
  args: readonly string[],
): string | null {
  // A heredoc's own file is a config the command WRITES, never where the run's output goes
  // (X1 flash-m44).
  if (/(?:^|\s)<<(?![<])-?/.test(text)) return null
  // `| tee file` is a statement of its own: the pipe is a statement separator here.
  if (program === 'tee') {
    const target = args.find((arg) => !arg.startsWith('-'))
    return target === undefined ? null : unquotedWord(target)
  }
  let last: string | null = null
  for (const match of text.matchAll(REDIRECT_AND_TARGET)) {
    const word = unquotedWord(match[1] ?? '')
    // Only the command's own level counts: not a group's redirect (depth > 0), and not one
    // written inside a quote or a command substitution (depth -1).
    if ((depths[match.index ?? 0] ?? 0) !== 0) continue
    if (word === '/dev/null' || word.startsWith('&')) continue
    last = word
  }
  return last
}

/**
 * One segment's words: quotes kept whole, grouping parentheses dropped, and a `(` written
 * against the first word taken off it (`(npx playwright test)`).
 *
 * @param text - One segment's text.
 * @returns The words.
 */
function segmentWords(text: string): string[] {
  const words = text.match(WORD) ?? []
  const cleaned = words.filter((word) => !GROUPING.has(word))
  const first = cleaned[0]
  if (first !== undefined) {
    const bare = first.replace(/^[({]+/, '')
    if (bare === '') cleaned.shift()
    else cleaned[0] = bare
  }
  return cleaned
}

/** {@link WORD} anchored at an offset, for walking a statement's raw words. */
const WORD_AT = new RegExp(WORD.source, 'y')

/**
 * A statement's own leading `NAME=value` words, and where they end.
 *
 * The shell binds these to the command the statement runs, so they are the environment THAT
 * program sees — which is why a caller writing a variable for a run has to write it here and not
 * at the start of the whole command.
 *
 * @param text - One statement's text.
 * @returns The assignments as written, and the offset in `text` just before the word that runs.
 */
function leadingAssignments(text: string): { words: string[]; end: number } {
  const words: string[] = []
  let at = 0
  for (let guard = 0; guard < MAX_WRAPPERS; guard++) {
    while (at < text.length && /\s/.test(text[at] ?? '')) at += 1
    // Grouping in front of the statement (`(npx …)`, `{ …`): not a word the shell assigns with.
    if (text[at] === '(' || text[at] === '{') {
      at += 1
      continue
    }
    WORD_AT.lastIndex = at
    const match = WORD_AT.exec(text)
    if (!match || !ENV_ASSIGNMENT.test(match[0])) return { words, end: at }
    words.push(match[0])
    at += match[0].length
  }
  return { words, end: at }
}

/**
 * The segments of a command, each with its program and arguments — the answer every classifier
 * that reads a command as "this runs the suite" is asking for.
 *
 * @param command - The shell command.
 * @returns One entry per statement or pipeline stage that runs something, in order.
 */
export function commandSegments(command: string): CommandSegment[] {
  return locatedSegmentsOf(command, 0).flatMap((located) =>
    located.segment === null ? [] : [located.segment],
  )
}

/**
 * Where a statement's word sits in its own raw text, as {@link segmentWords} counts the words.
 *
 * The words are matched for READING (quotes whole, grouping braces dropped, a leading `(` taken
 * off the first word); a caller that writes into the statement needs the offset it was written
 * at. Both come from this one walk, so the two can never disagree about which word is which.
 *
 * @param text - One statement's text.
 * @param index - The word's index in {@link segmentWords}'s list.
 * @returns The word's offset in `text`, or null when there is no such word.
 */
function wordOffset(text: string, index: number): number | null {
  const placement = new RegExp(WORD.source, 'g')
  let kept = 0
  let first = true
  for (let match = placement.exec(text); match !== null; match = placement.exec(text)) {
    if (GROUPING.has(match[0])) continue
    if (first) {
      first = false
      const bare = match[0].replace(/^[({]+/, '')
      // `segmentWords` shifts a first word that was nothing but grouping away, so the NEXT word
      // is not stripped and is counted from zero.
      if (bare === '') continue
      if (kept === index) return match.index + (match[0].length - bare.length)
      kept += 1
      continue
    }
    if (kept === index) return match.index
    kept += 1
  }
  return null
}

/**
 * One statement of a shell command, with where it sits and the variables it sets for itself.
 *
 * `commandSegments` answers WHAT runs; this answers where, and what the shell binds to it — the
 * two things a caller that WRITES into a command needs. The platform composes a run from the
 * executor's own command in more than one place, and a value written for the runner belongs in
 * the runner's own statement: `APP_BASE=https://… cd app && npx playwright test` sets the variable
 * for `cd` alone, so the Playwright config falls back to the local app while the command line
 * still names the deployed host (xr-molecule-flash-m103 +28:08).
 */
export interface LocatedCommandSegment {
  /**
   * What the statement runs, or null when it only sets variables (`BASE=http://…` on its own):
   * that shape persists in the shell, so a caller following assignments across `;`/`&&` has to
   * see it.
   */
  segment: CommandSegment | null
  /** The statement's own leading `NAME=value` words, as written (`TEST_MODE=fullstack`). */
  assignments: readonly string[]
  /**
   * The offset in the command of the statement's first word, or null for a segment inside a
   * nested `sh -c '<command>'` string — its positions are offsets in THAT string, not in this
   * command, so nothing may be spliced at them.
   */
  start: number | null
  /**
   * The offset in the command just before the word the statement runs — after its own leading
   * `NAME=value` words and their whitespace. A `NAME=value` written here is in the environment of
   * the program the statement runs (`… TEST_MODE=fullstack <here>npx playwright test`). Null
   * inside a nested `sh -c` string, for the same reason as {@link start}.
   */
  assignmentOffset: number | null
  /**
   * The offset in the command one past the statement's last word — where an option of this
   * statement's program belongs, before whatever closes it. Null inside a nested `sh -c` string.
   */
  end: number | null
  /**
   * The offset in the command of the word in command position — the program, once every wrapper
   * in front of it is taken away (`npx --prefix /app <here>playwright test`). Null inside a
   * nested `sh -c` string, and for a statement that only sets variables.
   */
  programOffset: number | null
  /**
   * The separator the shell split at immediately before this statement — `|`, `||`, `&&`, `;`,
   * a newline or `&` — or '' when it is the first statement of the command. It is the parse's own
   * answer, so it is known even where the offsets are not, and a caller deciding whether two
   * statements are one pipeline (`|`, never `;`) asks it instead of reading the text between them.
   */
  separator: string
  /**
   * The separator that ENDED this statement — `&` when the shell backgrounds it (so the process
   * writes its own output, not the command's), '' for the last statement of a command.
   */
  terminator: string
  /**
   * The file this statement sends its own output to (`> out.log`, `>> log`, `&> run.log`,
   * `| tee file`), or null. Only a redirect written at the command's own level counts: one
   * inside a `( … )` / `{ … }` group writes through that group, and one that feeds a heredoc's
   * file (`cat > cfg.ts <<'EOF'`) is writing a config (X1 flash-m44, flash-m136).
   */
  redirectTarget: string | null
}

/**
 * Every statement of a command, with its own assignments and where it sits — assignment-only
 * statements included, because the variables those persist are exactly what a later statement of
 * the same command reads.
 *
 * @param command - The shell command.
 * @returns One entry per statement or pipeline stage, in order.
 */
export function locatedCommandSegments(command: string): LocatedCommandSegment[] {
  return locatedSegmentsOf(command, 0)
}

/**
 * How many `$( … )` and `${ … }` expansions a piece of shell text has open at its end.
 *
 * Quotes are honoured (a `'$('` expands nothing, and `"$("` opens one), and a backslash escapes
 * the next character. Only `$(`/`${` are counted: a bare `(` or `{` opens a group whose closer is
 * the statement's own punctuation and may be stepped over, while an expansion opened inside the
 * statement is an argument in progress, and its closer must not be crossed.
 *
 * @param text - The statement's text, up to (not including) the position being asked about.
 * @returns The open parentheses and braces.
 */
function substitutionDepth(text: string): { parens: number; braces: number } {
  let parens = 0
  let braces = 0
  let quote: '"' | "'" | null = null
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? ''
    if (quote === "'") {
      if (char === "'") quote = null
      continue
    }
    if (char === '\\') {
      i += 1
      continue
    }
    if (char === "'" && quote === null) {
      quote = "'"
      continue
    }
    if (char === '"') {
      quote = quote === '"' ? null : '"'
      continue
    }
    if (char === '$' && text[i + 1] === '(') {
      parens += 1
      i += 1
      continue
    }
    if (char === '$' && text[i + 1] === '{') {
      braces += 1
      i += 1
      continue
    }
    if (char === ')' && parens > 0) parens -= 1
    else if (char === '}' && braces > 0) braces -= 1
  }
  return { parens, braces }
}

/**
 * Where an option of a statement's program belongs: one past the statement's last ARGUMENT.
 *
 * A flag written "at the end of the command" is not the runner's: a statement can end on a
 * redirection (`… 2>&1`), and a statement can sit inside a group whose closer belongs to the
 * shell, not to the words (`( … )`, `{ …; }`). Appending after that closer is a different shell
 * word that the group has already closed — `… --config=x 2>&1) --reporter=list` is
 * `sh: Syntax error: word unexpected`, which killed a backgrounded walk at once and pushed the
 * model off the platform's runner shape (xr-molecule-flash-m129 +34:29). Write the option where
 * the program's own arguments end and the rest of the statement still parses:
 * `… --config=x --reporter=list 2>&1)`.
 *
 * The statement must be one {@link locatedCommandSegments} placed in THIS command: a statement
 * inside a nested `sh -c '<command>'` string has no offsets here (its positions are positions in
 * that string), so null is returned rather than a splice into the outer text.
 *
 * @param command - The shell command.
 * @param start - The statement's first character ({@link LocatedCommandSegment.start}).
 * @param end - One past the statement's last character ({@link LocatedCommandSegment.end}).
 * @returns The offset to write the option at, or null when the statement cannot be placed here.
 */
export function statementArgumentEnd(
  command: string,
  start: number | null,
  end: number | null,
): number | null {
  if (start === null || end === null) return null
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null
  if (start < 0 || end > command.length || end < start) return null
  let at = end
  // Group closers are the shell's words, not the program's: `… 2>&1)` and `… ; }` end the
  // statement with punctuation no option can follow. A `)` that closes a `$(` opened INSIDE the
  // statement is not one of those — it is the last character of an argument
  // (`… $(cat e2e/args.txt)`), and crossing it would write the option inside the substitution.
  for (;;) {
    let cursor = at
    while (cursor > start && /\s/.test(command[cursor - 1] ?? '')) cursor -= 1
    const closer = command[cursor - 1]
    if (closer !== ')' && closer !== '}') {
      at = cursor
      break
    }
    const open = substitutionDepth(command.slice(start, cursor - 1))
    if ((closer === ')' && open.parens > 0) || (closer === '}' && open.braces > 0)) {
      at = cursor
      break
    }
    at = cursor - 1
  }
  const words = [...command.slice(start, at).matchAll(new RegExp(WORD.source, 'g'))].map((m) => ({
    text: m[0],
    index: start + (m.index ?? 0),
  }))
  // A trailing redirection belongs to the statement but is not an argument of its program. An
  // option written after it would still parse, but the option belongs with the program's own
  // words (`… --flag 2>&1`, not `… 2>&1 --flag`), so every redirect suffix is stepped over.
  while (words.length > 0) {
    const last = words[words.length - 1]
    if (last === undefined) break
    if (GROUPING.has(last.text) || REDIRECT_WORD.test(last.text)) {
      at = last.index
      words.pop()
      continue
    }
    const operator = words[words.length - 2]
    if (operator !== undefined && REDIRECT_OPERATOR.test(operator.text)) {
      at = operator.index
      words.pop()
      words.pop()
      // `2 > out.log` spells the same redirect as `2>out.log`: the descriptor is the word before
      // the operator, and an option written between them would turn it into an argument.
      const descriptor = words[words.length - 1]
      if (descriptor !== undefined && /^\d+$/.test(descriptor.text)) {
        at = descriptor.index
        words.pop()
      }
      continue
    }
    break
  }
  while (at > start && /\s/.test(command[at - 1] ?? '')) at -= 1
  return at
}

/**
 * {@link locatedCommandSegments}'s recursion, so a `sh -c '<command>'` is opened as far as
 * {@link MAX_NESTING} allows. A nested statement's offsets are cleared: they are positions in
 * the nested string, not in the command this walk started from.
 *
 * @param command - The shell command.
 * @param depth - How many `sh -c` strings this command already sits inside.
 * @returns The located statements.
 */
function locatedSegmentsOf(command: string, depth: number): LocatedCommandSegment[] {
  if (typeof command !== 'string' || depth > MAX_NESTING) return []
  const out: LocatedCommandSegment[] = []
  for (const part of splitSegments(command)) {
    const words = segmentWords(part.text)
    const start = commandStart(words)
    const leading = leadingAssignments(part.text)
    // Every `NAME=value` bound for the program the statement runs: its leading words AND the ones
    // an `env` wrapper carries (`env -i PATH=$PATH BASE_URL=… npx playwright test`). A shell binds
    // both to the program the same way, so one list holds both — a reader that saw only the
    // leading ones read a deployed walk as local (X0 xr-molecule-flash-m204 +38:15). `env -i`
    // clears what it inherited, so after it the wrapper's own words are the whole environment.
    const assignments = [
      ...new Set(start.envReset ? start.bound : [...leading.words, ...start.bound]),
    ]
    /** Every offset in this statement is an offset in the command it was written in. */
    const placed = {
      start: part.start,
      end: part.start + part.text.length,
      // After the statement's own leading `NAME=value` words — or, when an `env` wrapper stands
      // there, after that wrapper and its own options/assignments, because `env -i` clears what
      // comes before it (`env -i … <here>npx playwright test`).
      assignmentOffset:
        start.envInsert === null
          ? part.start + leading.end
          : part.start + (wordOffset(part.text, start.envInsert) ?? leading.end),
      programOffset:
        words[start.at] === undefined ? null : part.start + (wordOffset(part.text, start.at) ?? 0),
    }
    // The runner the word RUNS names, when that is not the word's own name (`node <path>/playwright`
    // is a `playwright` invocation, xr-molecule-flash-m179).
    const program =
      words[start.at] === undefined ? '' : (start.program ?? programName(words[start.at] ?? ''))
    const args = words.slice(start.at + 1)
    const redirectTarget = redirectTargetOf(part.text, part.depths, program, args)
    if (start.nested !== null) {
      const inner = locatedSegmentsOf(start.nested, depth + 1)
      for (let i = 0; i < inner.length; i += 1) {
        const entry = inner[i]
        if (!entry) continue
        out.push({
          ...entry,
          // The variables this statement bound before the shell reached it are the nested
          // command's too: `env BASE_URL=… sh -c '… npx playwright test …'` passes them down.
          assignments: [...new Set([...assignments, ...entry.assignments])],
          // A nested statement's positions are positions in the nested string, not in this
          // command. The FIRST one keeps this statement's own separator: the shell reads the
          // nested string where this statement stands.
          start: null,
          end: null,
          assignmentOffset: null,
          programOffset: null,
          // `sh -c '…' &` backgrounds the command inside the string too.
          terminator: part.after === '&' ? '&' : entry.terminator,
          // A redirect written OUTSIDE the string (`sh -c '…' > run.log`) carries the nested
          // command's output, so the first nested statement holds it — unless that statement
          // redirects on its own, which takes the output away from the outer file.
          redirectTarget:
            i === 0 && entry.redirectTarget === null ? redirectTarget : entry.redirectTarget,
          separator: i === 0 ? part.before : entry.separator,
        })
      }
      continue
    }
    const word = words[start.at]
    if (word === undefined) {
      // Only wrappers and assignments: nothing this statement runs, but the variables it sets
      // persist in the shell the rest of the command runs in.
      if (assignments.length > 0)
        out.push({
          segment: null,
          assignments,
          ...placed,
          programOffset: null,
          separator: part.before,
          terminator: part.after,
          redirectTarget,
        })
      continue
    }
    out.push({
      segment: {
        program,
        args,
        text: [program, ...args].join(' '),
        timeoutSeconds: start.timeoutSeconds,
      },
      assignments,
      ...placed,
      separator: part.before,
      terminator: part.after,
      redirectTarget,
    })
  }
  return out
}

/**
 * The bound a command puts on its own run: the largest `timeout <N>` any of its segments runs
 * under (`timeout 280 hurl --test …` → 280), or null when it carries none.
 *
 * This is the bound `man timeout` enforces by KILLING the command — so a run that used it did not
 * finish, whatever the pipeline's own exit status says. It is read here, from the same parse every
 * other command reader uses, rather than matched as text: `timeout` in an argument
 * (`grep -n 'timeout 280' notes.md`) bounds nothing, and `-k 5` is the grace before the kill, not
 * the bound ({@link WRAPPER_VALUE_FLAGS}).
 *
 * @param command - The shell command.
 * @returns The seconds the command allows itself, or null.
 */
export function commandTimeoutSeconds(command: string): number | null {
  let bound: number | null = null
  for (const segment of commandSegments(command)) {
    if (segment.timeoutSeconds === null) continue
    bound = bound === null ? segment.timeoutSeconds : Math.max(bound, segment.timeoutSeconds)
  }
  return bound
}

/**
 * The command with the `timeout <N>` wrapper lifted off the statements `which` selects, and the
 * largest bound that was lifted.
 *
 * The platform moves a run to the background precisely because its own bound cannot fit this
 * tool's ceiling, and a background task has no ceiling — its wait is bounded by `wait_for_task`
 * and the turn's deadline. The `timeout N` an executor wrote to fit the ceiling therefore keeps
 * killing the run at N in the background, where nothing needed it: X1 xr-molecule-flash-m143
 * (+24:45) wrote `timeout 280` for a 31-test walk, the tool backgrounded it, and the prefix stopped
 * the walk with no tally — then the cut sentence told the executor to "run it in the background",
 * which is where it already was.
 *
 * The wrapper is found by the same parse every other command reader uses ({@link commandStart}):
 * `timeout` in an argument bounds nothing, and the wrapper's own flags (`-k`/`--kill-after`,
 * `-s`/`--signal`) are stepped over, so `timeout -k 5 280 …` is `280`.
 *
 * @param command - The shell command.
 * @param which - The statements to lift the wrapper from (a suite run, for the background path).
 * @returns The rewritten command, and the largest lifted bound (null when nothing was lifted).
 */
export function withoutTimeoutWrapper(
  command: string,
  which: (segment: CommandSegment) => boolean,
): { command: string; seconds: number | null } {
  if (typeof command !== 'string' || !command.trim()) return { command, seconds: null }
  /** The spans to remove, as offsets in the command — applied back to front. */
  const removals: Array<{ start: number; end: number }> = []
  let seconds: number | null = null
  for (const located of locatedSegmentsOf(command, 0)) {
    const segment = located.segment
    if (segment === null || segment.timeoutSeconds === null) continue
    // A statement inside a nested `sh -c '…'` has no offsets here: its positions are positions in
    // that string, so nothing may be spliced at them.
    if (located.start === null || located.programOffset === null) continue
    if (!which(segment)) continue
    // Every word in front of the program: the assignments and the wrappers. The duration belongs
    // to the wrapper, so the walk has to see the words, not just the parse's total bound.
    const prefix = command.slice(located.start, located.programOffset)
    const words: Array<{ text: string; start: number; end: number }> = []
    const at = new RegExp(WORD.source, 'g')
    for (let match = at.exec(prefix); match !== null; match = at.exec(prefix)) {
      words.push({
        text: match[0],
        start: located.start + match.index,
        end: located.start + match.index + match[0].length,
      })
    }
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]
      if (word === undefined || programName(word.text) !== 'timeout') continue
      // The wrapper's own flags, then the duration — the same walk {@link commandStart} makes.
      const withValue = WRAPPER_VALUE_FLAGS.timeout ?? []
      let next = i + 1
      while (next < words.length && (words[next]?.text ?? '').startsWith('-')) {
        const flag = unquoted(words[next]?.text ?? '')
        next += !flag.includes('=') && withValue.includes(flag) ? 2 : 1
      }
      const duration = words[next]
      const bound = duration === undefined ? null : durationSeconds(unquoted(duration.text))
      if (duration === undefined || bound === null) continue
      seconds = seconds === null ? bound : Math.max(seconds, bound)
      // The whitespace between the duration and the program goes too, so the command does not
      // carry a double space where the wrapper stood.
      let end = duration.end
      while (end < command.length && /\s/.test(command[end] ?? '')) end += 1
      removals.push({ start: word.start, end })
      i = next
    }
  }
  if (removals.length === 0) return { command, seconds: null }
  let out = command
  for (const removal of removals.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, removal.start) + out.slice(removal.end)
  }
  return { command: out, seconds }
}

/**
 * Whether any segment of the command runs a program whose command-position text matches
 * `pattern` — the one question a runner-kind table asks.
 *
 * The pattern is matched against `program` and its arguments as one line, so it must be
 * anchored at `^`; it must not carry the `g` flag (a pattern shared between calls would then
 * carry its own match position from one segment to the next).
 *
 * @param command - The shell command.
 * @param pattern - An anchored pattern for the runner's invocation.
 * @returns True when a segment in command position matches.
 */
export function runsInCommandPosition(command: string, pattern: RegExp): boolean {
  return commandSegments(command).some((segment) => {
    pattern.lastIndex = 0
    return pattern.test(segment.text)
  })
}

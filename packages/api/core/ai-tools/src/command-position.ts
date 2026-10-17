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
 * WRITES is the caller's business, so a command with a heredoc goes through the caller's own
 * stripper first (`withoutHeredocs`, in `./suite-overlap.js`).
 *
 * @module
 */

/** One statement or pipeline stage of a shell command: what it runs, and with what. */
export interface CommandSegment {
  /**
   * The word in command position, its directory removed (`/usr/bin/hurl` → `hurl`): the program
   * the shell would run once whatever wrappers stood in front of it are taken away.
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
  'sudo',
  'time',
  'timeout',
])

/** The shells whose `-c '<command>'` argument is a command of its own. */
const SHELLS: ReadonlySet<string> = new Set(['ash', 'bash', 'dash', 'ksh', 'sh', 'zsh'])

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
 * Where the program starts in one segment's words, and the bound the segment puts on itself.
 *
 * @param words - The segment's words, quotes kept.
 * @returns The index of the word in command position (one past the end when the segment runs
 *   nothing), the command string of a `sh -c '<command>'` this segment turns out to be, and the
 *   seconds its own `timeout` wrapper allows that command (`timeout 280 hurl …` → 280) or null.
 */
function commandStart(words: readonly string[]): {
  at: number
  nested: string | null
  timeoutSeconds: number | null
} {
  let at = 0
  let timeoutSeconds: number | null = null
  for (let guard = 0; guard < MAX_WRAPPERS && at < words.length; guard++) {
    const word = words[at] ?? ''
    if (ENV_ASSIGNMENT.test(word)) {
      at += 1
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
      if (nested !== null) return { at, nested, timeoutSeconds }
      at += 1 + flagWords(words, at + 1, name)
      continue
    }
    if (PACKAGE_RUNNERS.has(name)) {
      const runner = packageRunnerOptions(words, at + 1, name)
      if (runner.nested !== null) return { at, nested: runner.nested, timeoutSeconds }
      at += 1 + runner.count
      continue
    }
    if (
      PACKAGE_RUNNER_HEADS.has(name) &&
      PACKAGE_RUNNER_SUBCOMMANDS.has(unquoted(words[at + 1] ?? ''))
    ) {
      const subcommand = unquoted(words[at + 1] ?? '')
      const runner = packageRunnerOptions(words, at + 2, `${name} ${subcommand}`)
      if (runner.nested !== null) return { at, nested: runner.nested, timeoutSeconds }
      at += 2 + runner.count
      continue
    }
    if (!LAUNCHERS.has(name)) return { at, nested: null, timeoutSeconds }
    at += 1 + flagWords(words, at + 1, name)
    if (name === 'timeout' && DURATION.test(words[at] ?? '')) {
      timeoutSeconds = durationSeconds(words[at] ?? '')
      at += 1
    }
  }
  return { at, nested: null, timeoutSeconds }
}

/**
 * One open nesting a shell word can be inside: a single-quoted string, a double-quoted string, or
 * a command substitution's parentheses (`$(`), which open a command of their own.
 */
type Nesting = 'single' | 'double' | 'sub'

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
 * @returns Each segment's text, in order, with empty ones dropped.
 */
function splitSegments(command: string): string[] {
  const parts: string[] = []
  let buffer = ''
  /** The nestings this position sits inside, outermost first. */
  const stack: Nesting[] = []
  for (let i = 0; i < command.length; i++) {
    const char = command[i] ?? ''
    const next = command[i + 1]
    const top = stack[stack.length - 1]

    // A single-quoted string expands nothing at all: no escape, no substitution, and no quote
    // but its own ends it.
    if (top === 'single') {
      buffer += char
      if (char === "'") stack.pop()
      continue
    }
    // A command substitution, wherever a shell opens one — inside double quotes too, and never
    // inside single quotes (handled above). The `(` is consumed here so the depth is counted once.
    if (char === '$' && next === '(') {
      stack.push('sub')
      buffer += '$('
      i += 1
      continue
    }
    // Inside double quotes: a `"` closes them, a backslash escapes the next character (so
    // `"\$("` opens nothing), and everything else is literal — a `'`, a `|`, a newline included.
    if (top === 'double') {
      if (char === '"') stack.pop()
      else if (char === '\\' && next !== undefined) {
        buffer += char + next
        i += 1
        continue
      }
      buffer += char
      continue
    }
    if (char === '"') {
      stack.push('double')
      buffer += char
      continue
    }
    if (char === "'") {
      stack.push('single')
      buffer += char
      continue
    }
    // Inside a substitution or a subshell of one: its own parentheses nest, its `|`/`;`/`&&`
    // belong to the nested command, and its newlines are that command's too.
    if (top === 'sub') {
      if (char === '(') stack.push('sub')
      else if (char === ')') stack.pop()
      buffer += char
      continue
    }
    if (char === '\\' && next !== undefined) {
      buffer += char + next
      i += 1
      continue
    }
    if ((char === '&' && next === '&') || (char === '|' && next === '|')) {
      parts.push(buffer)
      buffer = ''
      i += 1
      continue
    }
    if (char === ';' || char === '|' || char === '\n') {
      parts.push(buffer)
      buffer = ''
      continue
    }
    if (char === '&' && command[i - 1] !== '>' && next !== '>') {
      parts.push(buffer)
      buffer = ''
      continue
    }
    buffer += char
  }
  parts.push(buffer)
  return parts.map((part) => part.trim()).filter(Boolean)
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

/**
 * The segments of a command, each with its program and arguments — the answer every classifier
 * that reads a command as "this runs the suite" is asking for.
 *
 * @param command - The shell command.
 * @returns One entry per statement or pipeline stage that runs something, in order.
 */
export function commandSegments(command: string): CommandSegment[] {
  return segmentsOf(command, 0)
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
  for (const segment of segmentsOf(command, 0)) {
    if (segment.timeoutSeconds === null) continue
    bound = bound === null ? segment.timeoutSeconds : Math.max(bound, segment.timeoutSeconds)
  }
  return bound
}

/**
 * {@link commandSegments}'s recursion, so a `sh -c '<command>'` is opened as far as
 * {@link MAX_NESTING} allows.
 *
 * @param command - The shell command.
 * @param depth - How many `sh -c` strings this command already sits inside.
 * @returns The segments.
 */
function segmentsOf(command: string, depth: number): CommandSegment[] {
  if (typeof command !== 'string' || depth > MAX_NESTING) return []
  const out: CommandSegment[] = []
  for (const text of splitSegments(command)) {
    const words = segmentWords(text)
    if (words.length === 0) continue
    const start = commandStart(words)
    if (start.nested !== null) {
      out.push(...segmentsOf(start.nested, depth + 1))
      continue
    }
    const word = words[start.at]
    // Only wrappers and assignments: nothing this segment runs.
    if (word === undefined) continue
    const program = programName(word)
    const args = words.slice(start.at + 1)
    out.push({
      program,
      args,
      text: [program, ...args].join(' '),
      timeoutSeconds: start.timeoutSeconds,
    })
  }
  return out
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

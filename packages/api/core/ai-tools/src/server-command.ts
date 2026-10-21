/**
 * "This command starts a server, and a server never exits" — ONE reading of a server launch,
 * shared by the `exec_command` refusal, the over-budget advice, and the platform's own-server note
 * (`molecule-dev/api/src/ai/own-server-note.ts` imports {@link SERVER_PROGRAM} and
 * {@link BACKGROUNDED} from here), so every surface that names a server names the same commands.
 *
 * X1 xr-molecule-flash-m167 (+19:16 → +24:04) wrote `/tmp/probe.mts` whose body imports the app's
 * `api/src/server.ts` and calls its `create(0)`, then ran it in the FOREGROUND:
 * `npx tsx --env-file=.env /tmp/probe.mts 2>&1 | tail -15`. The scaffold's `create()` calls
 * `server.listen(port)` and returns the server, so the process never exits — and behind `| tail`
 * it printed nothing until it did. The tool waited its whole 290 s budget and answered with "run
 * a smaller unit", advice about the wrong axis for a process that was never going to return.
 *
 * A server started in the background is a different thing: it is the launch the platform records
 * and hands a task id for, and the over-budget advice below keeps it off the foreground budget.
 *
 * @module
 */

import { type ForegroundBrowserProbe, standaloneBrowserLeak } from './browser-probe.js'
import type { CommandSegment } from './command-position.js'
import { commandSegments } from './command-position.js'
import { withoutHeredocs } from './suite-overlap.js'

/**
 * A background launch: a single `&` (not `&&`, not a `2>&1`) or an explicit detacher. A
 * backgrounded launch never holds the tool, so every reading here stops at it.
 */
export const BACKGROUNDED = /(?:^|[^&>])&(?!&|>)|\b(?:nohup|setsid)\b/

/**
 * A program that SERVES: the scaffold's entry (`server.ts`/`server.js`), a package manager's
 * `start`/`dev`/`serve`/`preview` script, a Vite dev or preview server, `next start|dev`, or a
 * Python WSGI server. Matched against a command segment's own text, and against a script's SOURCE
 * when the command only names the script file — but NEVER against an inline program's code
 * (`node -e …`, `python3 -c …`), where this text is the user's program rather than a file being
 * run: `require('…/node_modules/vite')` imports a module, it does not start a dev server
 * (xr-molecule-flash-m391 +13:13, refused as "node starts a server" for exactly that line).
 */
export const SERVER_PROGRAM =
  /\bserver\.[cm]?[jt]s\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:start|dev|serve|preview)\b|\bvite\s+(?:preview|dev|serve)\b|\bvite(?![.\w-])(?!\s+(?:build|optimize)\b)|\bnext\s+(?:start|dev)\b|\b(?:uvicorn|gunicorn)\b|\bflask\s+run\b|\bpython\d?\s+-m\s+http\.server\b/

/** Programs that run a script FILE, so the file's own source decides whether it serves. */
const SCRIPT_RUNNERS: ReadonlySet<string> = new Set([
  'bun',
  'deno',
  'node',
  'nodejs',
  'tsx',
  'ts-node',
])

/** Programs that serve by themselves, read against {@link SERVER_PROGRAM}. */
const SERVER_PROGRAMS: ReadonlySet<string> = new Set([
  'bun',
  'deno',
  'flask',
  'gunicorn',
  'next',
  'node',
  'nodejs',
  'python',
  'python3',
  'tsx',
  'ts-node',
  'uvicorn',
  'vite',
])

/** A file a script runner executes. */
const SCRIPT_FILE = /\.(?:[cm]?[jt]s|tsx)$/

/** A test file is a test, even when it imports the server to exercise it. */
const TEST_FILE = /(?:^|\/)__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/

/** Package-manager scripts that keep serving instead of finishing. */
const SERVE_SCRIPTS = /^(?:start|dev|serve|preview)$/

/** Test runners: their command line names a suite, never a server to leave running. */
const TEST_RUNNERS = /^(?:hurl|jest|mocha|playwright|vitest)$/

/** A script's SOURCE that binds a listener even when it does not name a server file. */
const STARTS_LISTENING = /\b(?:server|app)\.listen\s*\(/

/** `python`, `python3`, `python3.12` — the interpreters whose inline flag is `-c`. */
const PYTHON_PROGRAM = /^python(?:3(?:\.\d+)?)?$/

/**
 * A flag that puts a Node-family runner's program on the COMMAND LINE instead of in a file:
 * `node -e`, `node -p`, `node -pe`, `--eval=`, `--print=`.
 */
const NODE_INLINE_FLAG = /^(?:-[A-Za-z]*[ep]|--(?:eval|print)(?:=|$))/

/** Python's inline flag: `python3 -c '…'` (a combination such as `-Bc` included). */
const PYTHON_INLINE_FLAG = /^-[A-Za-z]*c$/

/** A program read from stdin (`node -`, `python3 -`), whose heredoc body the command no longer carries. */
const STDIN_PROGRAM = '-'

/** The value attached to an inline interpreter flag (`--eval=code`). */
const ATTACHED_INLINE_FLAG = /^--(?:eval|print)=(.*)$/s

/**
 * What actually starts a server inside an INLINE program: a listener bind (`.listen(`, Python's
 * `.serve_forever(`), or a Python server runner invoked (`.run(`). Matched against the code with
 * comments and string/template literals blanked, so a path, an import specifier or a comment that
 * merely mentions one is text.
 */
const INLINE_SERVER_START =
  /\.listen\s*\(|\.serve_forever\s*\(|\b(?:app|uvicorn|gunicorn)\.run\s*\(/

/**
 * The code an INLINE program carries, when the statement runs one.
 *
 * @param segment - One statement of the command.
 * @returns The program's code (empty for stdin), or null when the statement names no inline program.
 */
function inlineProgram(segment: CommandSegment): string | null {
  if (!SERVER_PROGRAMS.has(segment.program)) return null
  const args = segment.args.map(bare)
  const flag = PYTHON_PROGRAM.test(segment.program) ? PYTHON_INLINE_FLAG : NODE_INLINE_FLAG
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ''
    if (arg === STDIN_PROGRAM) return ''
    const attached = ATTACHED_INLINE_FLAG.exec(arg)
    if (attached !== null) return attached[1] ?? ''
    if (flag.test(arg)) return args[index + 1] ?? ''
  }
  return null
}

/**
 * Source with comments and string/template literals blanked to spaces, so a `.listen(` written
 * inside one never reads as a call. A small lexer, not a parser, and one-directional on purpose:
 * its only possible mistake is to DROP a signal, which leaves the command on its normal bounded
 * execution — never to invent one, which would refuse a command that starts nothing.
 *
 * @param source - An inline program's own code.
 * @returns The same code with comments and literals blanked.
 */
function withoutCommentsAndStrings(source: string): string {
  let out = ''
  let index = 0
  while (index < source.length) {
    const char = source[index] ?? ''
    const next = source[index + 1] ?? ''
    if (char === '/' && (next === '/' || next === '*')) {
      const block = next === '*'
      out += '  '
      index += 2
      while (
        index < source.length &&
        (block ? !(source[index] === '*' && source[index + 1] === '/') : source[index] !== '\n')
      ) {
        out += ' '
        index += 1
      }
      if (block && index < source.length) {
        out += '  '
        index += 2
      }
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      out += ' '
      index += 1
      while (index < source.length) {
        const inner = source[index] ?? ''
        out += ' '
        index += 1
        if (inner === '\\') {
          if (index < source.length) {
            out += ' '
            index += 1
          }
          continue
        }
        if (inner === quote) break
      }
      continue
    }
    out += char
    index += 1
  }
  return out
}

/** A word with its shell quotes taken off (`'src/server.ts'` → `src/server.ts`). */
function bare(word: string): string {
  const match = /^(['"])(.*)\1$/s.exec(word)
  return match?.[2] ?? word
}

/**
 * Whether one parsed statement starts a server: a package manager's serving script, or a program
 * that IS a server, named in command position (so `cat server.ts` is a read, not a launch).
 *
 * An inline program is read by its CODE, not by its text: the argument is the program, so a module
 * path or an import specifier that happens to spell `vite` or `server.ts` starts nothing, while a
 * listener bind in that code still does. Anything ambiguous — an import of a module that might
 * listen at load — stays on normal bounded execution rather than being refused on a guess.
 *
 * @param segment - One statement of the command.
 * @returns True when the statement starts a server that does not exit.
 */
function runsServerProgram(segment: CommandSegment): boolean {
  if (TEST_RUNNERS.test(segment.program)) return false
  if (/^(?:npm|pnpm|yarn|bun)$/.test(segment.program)) {
    const words = segment.args.map(bare)
    const script = words[0] === 'run' ? words[1] : words[0]
    if (script !== undefined && SERVE_SCRIPTS.test(script)) return true
  }
  if (!SERVER_PROGRAMS.has(segment.program)) return false
  const inline = inlineProgram(segment)
  if (inline !== null) return INLINE_SERVER_START.test(withoutCommentsAndStrings(inline))
  return SERVER_PROGRAM.test(segment.text)
}

/**
 * The script file a runner statement executes, when it names one.
 *
 * @param segment - One statement of the command.
 * @returns The script's path as written, or null when the statement runs no script file.
 */
function scriptPath(segment: CommandSegment): string | null {
  if (!SCRIPT_RUNNERS.has(segment.program)) return null
  // An inline program (`node -e …`) is code, not a file to read.
  if (inlineProgram(segment) !== null) return null
  for (const arg of segment.args) {
    const word = bare(arg)
    if (word.startsWith('-')) continue
    if (SCRIPT_FILE.test(word) && !TEST_FILE.test(word)) return word
  }
  return null
}

/**
 * Whether a command, read from its TEXT alone, starts a server that stays up in the foreground.
 *
 * The over-budget reader's shape: at that point the command has already run, and only its text is
 * left to say whether "run a smaller unit" was ever the right advice. An inline program is read
 * from the code it carries, so a string or comment that mentions a server is not a launch.
 *
 * @param command - The command as the executor sent it.
 * @returns True when a foreground statement of the command starts a server.
 */
export function startsServerProgram(command: string): boolean {
  const text = withoutHeredocs(command)
  if (BACKGROUNDED.test(text)) return false
  return commandSegments(text).some((segment) => runsServerProgram(segment))
}

/** A foreground command that starts a server, as the refusal names it. */
export interface ForegroundServer {
  /** The program (and script, when there is one) that serves. */
  readonly program: string
}

/**
 * A FOREGROUND command that starts a server, including one that only names a script whose SOURCE
 * imports the app's server and calls its `create()`/`listen()` — and, for an inline program
 * (`node -e …`, `python3 -c …`), only when that code itself binds a listener. An inline import or
 * a path that merely names a server program starts nothing and runs.
 *
 * The script read is best-effort: a path the backend will not answer for is a command this reading
 * cannot classify, never a refusal. A backgrounded launch, a test runner and a test file are all
 * left alone.
 *
 * @param command - The command as the executor sent it.
 * @param readScript - Reads a script file the command names (`backend.readFile`).
 * @returns The serving program, or null when the command starts no server in the foreground.
 */
export async function foregroundServerCommand(
  command: string,
  readScript: (path: string) => Promise<string>,
): Promise<ForegroundServer | null> {
  const text = withoutHeredocs(command)
  if (BACKGROUNDED.test(text)) return null
  for (const segment of commandSegments(text)) {
    if (runsServerProgram(segment)) return { program: segment.program }
    const script = scriptPath(segment)
    if (script === null) continue
    let source: string
    try {
      source = await readScript(script)
    } catch (_error) {
      // A script the backend cannot read is not classified: the refusal must never be a guess.
      continue
    }
    if (SERVER_PROGRAM.test(source) || STARTS_LISTENING.test(source)) {
      return { program: `${segment.program} ${script}` }
    }
  }
  return null
}

/**
 * A FOREGROUND command that directly runs a standalone script which launches a browser and never
 * closes it — the same never-returns lifecycle class as {@link foregroundServerCommand}, read from
 * the script's SOURCE by {@link standaloneBrowserLeak}.
 *
 * The boundaries are the server preflight's, so the two readers cannot disagree about what they are
 * allowed to touch: a backgrounded launch, a test runner and a test file are left alone, and a
 * script the backend will not answer for is a command this reading cannot classify, never a
 * refusal. A Playwright suite is owned by its runner's browser fixture and is never read here.
 *
 * @param command - The command as the executor sent it.
 * @param readScript - Reads a script file the command names (`backend.readFile`).
 * @returns The leaked probe's variable and script path, or null when the command is not one.
 */
export async function foregroundBrowserProbe(
  command: string,
  readScript: (path: string) => Promise<string>,
): Promise<ForegroundBrowserProbe | null> {
  const text = withoutHeredocs(command)
  if (BACKGROUNDED.test(text)) return null
  for (const segment of commandSegments(text)) {
    const script = scriptPath(segment)
    if (script === null) continue
    let source: string
    try {
      source = await readScript(script)
    } catch (_error) {
      // A script the backend cannot read is not classified: the refusal must never be a guess.
      continue
    }
    const leak = standaloneBrowserLeak(source)
    if (leak !== null) return { ...leak, script }
  }
  return null
}

/**
 * The refusal for a foreground command that starts a server: why it would never return, and the
 * two shapes that do work — a background launch, or a probe of the API already running.
 *
 * @param server - The serving program, from {@link foregroundServerCommand}.
 * @param budgetSeconds - The tool's budget, which a foreground server would consume whole.
 * @returns The refusal sentence.
 */
export function serverCommandRefusal(server: ForegroundServer, budgetSeconds: number): string {
  return (
    `\`${server.program}\` starts a server, and a server never exits: run in the foreground it ` +
    `would hold this tool for its whole ${budgetSeconds} s budget and return nothing. Start it ` +
    'with `run_in_background: true` and collect it with `wait_for_task`, or probe the API already ' +
    'running on :4000 with a command that finishes.'
  )
}

/**
 * The closing advice on an over-budget message for a command recognised as a server start: there
 * is no tally to split, and the run has to leave the foreground budget to keep serving.
 */
export const SERVER_OVER_BUDGET_ADVICE =
  'A server is not a bigger unit to split: it never exits, so stopped here it reports nothing. ' +
  'Start it with `run_in_background: true` (it keeps serving and hands back a task id to ' +
  '`wait_for_task`), or probe the API already running on :4000.'

/**
 * "This command starts a server, and a server never exits" — ONE reading of a server launch,
 * shared by the `exec_command` refusal, the over-budget advice, and the platform's own-server note
 * (`molecule-dev/api/src/ai/own-server-note.ts` imports {@link SERVER_PROGRAM} and
 * {@link BACKGROUNDED} from here), so every surface that names a server names the same commands.
 *
 * A probe wrote `/tmp/probe.mts` whose body imports the app's
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
 * (refused as "node starts a server" for exactly that line).
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

/** Node inline-program flags; the shell parser already separated their arguments. */
const NODE_INLINE_FLAG = /^(?:-[A-Za-z]*[ep]|--(?:eval|print)(?:=|$))/
/** Python inline programs use -c, including combined interpreter flags. */
const PYTHON_INLINE_FLAG = /^-[A-Za-z]*c$/
/**
 * Inline/stdin programs have no server filename to classify. Their source is arbitrary
 * code; the normal bounded command runner, rather than another partial JS/Python
 * parser, owns their execution. Named script and package-server checks remain below.
 * @param segment - One parsed shell statement.
 * @returns Whether the interpreter reads an inline/stdin program.
 */
function isInlineProgram(segment: CommandSegment): boolean {
  const flag = /^python(?:3(?:\.\d+)?)?$/.test(segment.program)
    ? PYTHON_INLINE_FLAG
    : NODE_INLINE_FLAG
  return segment.args.some((word) => {
    const arg = bare(word)
    return arg === '-' || flag.test(arg)
  })
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
 * Inline/stdin programs use normal bounded execution: their code is not a server filename.
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
  if (isInlineProgram(segment)) return false
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
  if (isInlineProgram(segment)) return null
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
 * left to say whether "run a smaller unit" was ever the right advice. Inline/stdin programs
 * remain unclassified and use the normal bounded command runner.
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
 * imports the app's server and calls its `create()`/`listen()`. Inline/stdin programs
 * (`node -e …`, `python3 -c …`) use normal bounded execution: interpreting arbitrary
 * program text is outside this filename/script preflight's contract.
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

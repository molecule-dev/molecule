/**
 * An inline interpreter program (`python3 -c`, `python3 - <<EOF`, `node -e`) that only touches local
 * files — work that takes milliseconds or never ends, never minutes of honest progress.
 *
 * xr-molecule-flash-m200 (+03:45, 2026-10-19) spent 291 s of a 60-minute cap on
 * `python3 - <<'EOF' … re.findall(r'([^{}]*:before[^{}]*)\{content:"[^"]*"\}', s) … EOF` rewriting a
 * minified CSS file whose first rule is one ~25 KB selector list: the pattern's two unbounded
 * `[^{}]*` around a literal backtrack cubically, printed nothing, and was stopped by the tool's
 * full 290 s budget. The step was also unnecessary. Nothing in the tool distinguished that program
 * — a local text transform that either finishes at once or is stuck — from a build that is genuinely
 * slow, so it was given a build's budget and a build's advice ("run it in the background"), which
 * only turns a hang into a longer hang.
 *
 * So an inline interpreter program with no network, install, test-runner, build or server verb gets
 * a short budget ({@link INLINE_SCRIPT_BUDGET_MS}), and a cut says what happened: a runaway
 * transform, not slow work ({@link inlineScriptRunawaySentence}).
 *
 * @module
 */

import { commandSegments } from './command-position.js'
import { startsServerProgram } from './server-command.js'
import { isSuiteRunCommand } from './utilities.js'

/**
 * How long an inline interpreter program that only reads and writes local files may run.
 *
 * Such work finishes in milliseconds; if it has not finished in twenty seconds it never will
 * (a backtracking regex on a large file, a loop waiting on something that is not coming), so this
 * is a runaway detector, not a performance budget.
 */
export const INLINE_SCRIPT_BUDGET_MS = 20_000

/** The interpreters a model writes an inline program in. */
const INLINE_INTERPRETERS: ReadonlySet<string> = new Set([
  'python',
  'node',
  'nodejs',
  'perl',
  'ruby',
  'php',
])

/** `python3`, `python3.12`, `python` — every spelling of the same interpreter in command position. */
const PYTHON = /^python(?:3(?:\.\d+)?)?$/

/**
 * A flag that makes the interpreter read its PROGRAM from the command line (or stdin) instead of a
 * script file: `-c`, `-e`, `--eval`, `--print`.
 */
const INLINE_FLAG = /^(?:-[A-Za-z]*[ce]|--(?:eval|print)(?:=|$))/

/** A heredoc operator whose delimiter follows it: `<<'EOF'`, `<<EOF`, `<<-EOF`. Not a here-string. */
const HEREDOC = /^<<-?\s*['"]?[A-Za-z_]/

/**
 * Effects that make an inline program something OTHER than a local text transform, so it keeps the
 * tool's full budget: the network, an install, a test runner, a build, a container. Matched against
 * the whole command, heredoc body included — a `urllib` import inside the program is exactly the
 * case this list exists for.
 *
 * Every listed word is a false NEGATIVE when it appears in a comment or a string (the program keeps
 * the long budget and the old advice). That is the safe direction: this list must never shrink the
 * budget of a command that reaches outside the box.
 */
const EXTERNAL_EFFECT =
  /\b(?:curl|wget|aria2c|rsync|scp|sftp|ftp|ssh|urllib3?|httpx|aiohttp|axios|requests|fetch|XMLHttpRequest|socket|net\.connect|https?:\/\/|npm|npx|pnpm|yarn|bun|pip3?|conda|cargo|gem|composer|playwright|vitest|jest|hurl|vite|tsc|webpack|esbuild|rollup|docker|cmake|gradle|mvn|make)\b|\bgit\s+(?:clone|pull|push|fetch|remote|ls-remote|submodule)\b|\b(?:http\.server|flask|fastapi|uvicorn|gunicorn)\b/i

/**
 * Whether one parsed statement runs an interpreter program written inline.
 *
 * The heredoc body is already blanked by the parser, so `python3 - <<'EOF'` reads as the program
 * `python3` with the arguments `-` and `<<'EOF'` — the two shapes a program on stdin is written in.
 *
 * @param segment - One statement of the command.
 * @returns The interpreter's name when the statement is an inline program, otherwise null.
 */
function inlineProgram(segment: { program: string; args: readonly string[] }): string | null {
  const name = segment.program.replace(/^.*\//, '')
  if (!PYTHON.test(name) && !INLINE_INTERPRETERS.has(name)) return null
  const args = segment.args.map((arg) => arg.replace(/^(["'])(.*)\1$/, '$2'))
  const inline = args.some((arg) => arg === '-' || HEREDOC.test(arg) || INLINE_FLAG.test(arg))
  return inline ? name : null
}

/**
 * The interpreter of an INLINE program that only reads and writes local files — the shape that gets
 * {@link INLINE_SCRIPT_BUDGET_MS} instead of the tool's command budget.
 *
 * An inline program with any external effect keeps the full budget: no network, install, test
 * runner, build or server verb may appear anywhere in the command ({@link EXTERNAL_EFFECT}), and
 * the command must not be a suite run or a foreground server (the platform's own classifiers).
 *
 * @param command - The command as the executor sent it.
 * @returns The interpreter's name (`python3`, `node`, …), or null when this is not the shape.
 */
export function inlineLocalScriptCommand(command: string): string | null {
  if (typeof command !== 'string' || !command.trim()) return null
  if (EXTERNAL_EFFECT.test(command)) return null
  if (isSuiteRunCommand(command) || startsServerProgram(command)) return null
  for (const segment of commandSegments(command)) {
    const interpreter = inlineProgram(segment)
    if (interpreter !== null) return interpreter
  }
  return null
}

/**
 * What a cut inline program's result says instead of the background advice: the work never was
 * slow, it is stuck, and re-running it — here or in the background — cannot help.
 *
 * @param interpreter - The interpreter the program ran under (`python3`, `node`, …).
 * @param seconds - The short budget it was stopped at, in seconds.
 * @returns The sentence the result carries.
 */
export function inlineScriptRunawaySentence(interpreter: string, seconds: number): string {
  return (
    `${interpreter} ran ${seconds} s without finishing on a local text transform — that is a ` +
    'runaway (e.g. regex backtracking on a large file), not slow work; do not move it to the ' +
    'background. Rewrite the transform (a non-backtracking pattern, or a plain string split), ' +
    'or check whether the step is needed at all.'
  )
}

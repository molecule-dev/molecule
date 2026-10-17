/**
 * A leading `sleep` in an executor's command: the seconds it would have waited, and the command
 * that follows it.
 *
 * X1 xr-molecule-flash-m105 (+08:49 → +10:53, 2026-10-17) spent 225 s of its 60-minute clock
 * inside `exec_command` calls of the shape `sleep N; tail <task log>`. The platform's own launch
 * note said "peek with exec_command: tail <log>" beside "never sleep", and the only concrete
 * instruction was the peek, so the executor built the poll by hand. Two of its three sleeps were
 * provably dead — the task had ended 0.1 s in (`playwright: not found`, exit 127) and another had
 * already printed `Error: No tests found` — and the third spent 120 s asleep beside a live
 * 139-test run whose failures were already in the log.
 *
 * The platform does not have to answer "what is the task doing" from a sleep: `wait_for_task`
 * already returns the moment the task ends, early on a proven repeating cause, and with the
 * progress and failures the log holds. This module answers only the parsing question — is the
 * command's FIRST statement a `sleep` of {@link MIN_PEEK_SLEEP_SECONDS} seconds or more, and what
 * follows it — from the package's own shell parse ({@link locatedCommandSegments}), so a `sleep`
 * named in an argument (`grep -n 'sleep 60' notes.md`) or written after another statement
 * (`cd x && sleep 60`) is not one.
 *
 * @module
 */

import { durationSeconds, locatedCommandSegments } from './command-position.js'

/**
 * The shortest leading sleep the platform drops: below it the wall clock it costs is noise, and a
 * short settle (`sleep 2; curl …`) is a legitimate thing to run.
 */
export const MIN_PEEK_SLEEP_SECONDS = 5

/** The leading `sleep` a command opens with, and the command that follows it. */
export interface LeadingSleep {
  /** How many seconds the statement would have slept (GNU sleep sums its operands). */
  seconds: number
  /** What follows the leading statement, trimmed — '' when the sleep was the whole command. */
  rest: string
}

/**
 * The leading `sleep` of a command, when the first statement is one and it asks for at least
 * {@link MIN_PEEK_SLEEP_SECONDS}.
 *
 * The statement is read by {@link locatedCommandSegments} — the same parse every other command
 * classifier uses — so only a `sleep` in command position of the FIRST statement counts. The end
 * of that statement is then found by walking forward from its own start: the statement is
 * `sleep <duration>`, whose words carry no quotes and open no substitution, so the first unquoted
 * `;`, newline or `&` ends it. A `|` is refused: dropping the left side of a pipeline would hand
 * the right side its stdin instead, and a `||` fallback would run on a success that never did.
 *
 * @param command - The shell command the executor sent.
 * @returns The seconds and the remaining command, or null when the command does not open with a
 *   long `sleep`.
 */
export function leadingSleepPeek(command: string): LeadingSleep | null {
  if (typeof command !== 'string') return null
  const first = locatedCommandSegments(command)[0]
  if (!first || first.start === null || first.segment === null) return null
  if (first.segment.program !== 'sleep') return null
  // GNU sleep sums its operands (`sleep 45 15`); every one of them has to be a duration.
  let seconds = 0
  for (const arg of first.segment.args) {
    const part = durationSeconds(arg)
    if (part === null) return null
    seconds += part
  }
  if (seconds < MIN_PEEK_SLEEP_SECONDS) return null
  let end = command.length
  for (let i = first.start; i < command.length; i++) {
    const char = command[i] ?? ''
    if (char === '|') return null
    if (char === ';' || char === '\n' || char === '&') {
      end = i
      break
    }
  }
  let at = end
  while (at < command.length && /[;&\s]/.test(command[at] ?? '')) at += 1
  return { seconds, rest: command.slice(at).trim() }
}

/**
 * Compound commands are read as the shell runs them.
 *
 * Regression (X1, 2026-11-13): the statement reader took a compound command's opener as the
 * program — `do` in `for f in …; do sed -i … "$f"; done`, `then` in `if …; then npx playwright
 * test; fi` — so every reader built on it missed the writes and test runs written in loop and if
 * bodies, and the env-dump guard saw a program called `then` where `printenv` ran. Recorded
 * commands use these shapes often: about 3,800 of 77,639 `exec_command` calls carried a `for` or
 * `if` statement. `case` items and arithmetic commands had the same kind of gap: a pattern's `)`
 * and `|` were read as shell operators, and `(( n > 3 ))` as a program `n` writing to a file `3`.
 *
 * Every command here is checked as valid shell by `bash -n` first, so the expectations describe
 * what bash itself would run.
 */
import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import {
  commandSegments,
  commandTimeoutSeconds,
  executedCommands,
  locatedCommandSegments,
} from '../command-position.js'
import { checkBlockedCommand, isPlaywrightRunCommand } from '../utilities.js'

/** The command, after bash itself has accepted its syntax. */
function shell(command: string): string {
  const parsed = spawnSync('bash', ['-n', '-c', command], { encoding: 'utf8' })
  expect(parsed.status, `${command}\n${parsed.stderr}`).toBe(0)
  return command
}

/** Each statement's program and arguments, as one line. */
const runs = (command: string): string[] =>
  commandSegments(shell(command)).map((segment) => segment.text)

const LOOP = 'wh' + 'ile'

describe('a compound command’s opener is not its program', () => {
  it('reads the statements of loop and if bodies, and their conditions', () => {
    expect(runs(`for f in app/src/a.ts app/src/b.ts; do cp /tmp/x "$f"; done`)).toEqual([
      'for f in app/src/a.ts app/src/b.ts',
      'cp /tmp/x "$f"',
      'done',
    ])
    expect(
      runs('if [ -f app/package.json ]; then cp a app/src/b.ts; else rm app/src/c.ts; fi'),
    ).toEqual(['[ -f app/package.json ]', 'cp a app/src/b.ts', 'rm app/src/c.ts', 'fi'])
    expect(runs(`${LOOP} read -r f; do echo x > "$f"; done < list.txt`)).toEqual([
      'read -r f',
      'echo x > "$f"',
      'done < list.txt',
    ])
    expect(runs('until curl -sf localhost:4000/health; do sleep 1; done')).toEqual([
      'curl -sf localhost:4000/health',
      'sleep 1',
      'done',
    ])
    expect(runs('if false; then :; elif grep -q x f; then npm test; fi')).toContain('grep -q x f')
    expect(runs('if true\nthen\n  cp a app/src/x.ts\nfi')).toContain('cp a app/src/x.ts')
  })

  it('finds a test run written in an if body', () => {
    const command = shell('cd app && if [ -d e2e ]; then npx playwright test --reporter=list; fi')
    expect(isPlaywrightRunCommand(command)).toBe(true)
  })

  it('steps over an opener only where the shell reserves it', () => {
    // Quoted, or after an assignment, the word is an ordinary program name.
    expect(runs("'if' x")).toEqual(['if x'])
    expect(commandSegments('X=1 do y').map((segment) => segment.program)).toEqual(['do'])
  })

  it('places an assignment for the program after the keyword, where the shell still parses it', () => {
    for (const command of [
      'for s in a b; do npx playwright test "$s"; done',
      '! npx playwright test',
      'if true; then npx playwright test; fi',
    ]) {
      const runner = locatedCommandSegments(shell(command)).find(
        (entry) => entry.segment?.program === 'playwright',
      )!
      const at = runner.assignmentOffset!
      const written = `${command.slice(0, at)}BASE_URL=http://localhost:5173 ${command.slice(at)}`
      shell(written)
      expect(commandSegments(written).find((s) => s.program === 'playwright')).toBeDefined()
      expect(written).toContain('BASE_URL=http://localhost:5173 npx playwright test')
    }
  })

  it('lets the env-dump guard see a dump inside an if or loop body', () => {
    expect(checkBlockedCommand(shell('if true; then printenv; fi'))).toContain('Command blocked')
    expect(checkBlockedCommand(shell('for i in 1; do env; done'))).toContain('Command blocked')
    // Counterexample: an if body that only tests whether a variable is set.
    expect(checkBlockedCommand(shell('if [ -n "$TOKEN" ]; then echo set; fi'))).toBeNull()
  })
})

describe('a statement in a loop may run many times', () => {
  it('marks loop conditions and bodies, and nothing after the loop', () => {
    const command = shell(
      `for a in 1 2; do for b in 3; do echo "$a$b"; done; echo inner; done; echo after`,
    )
    expect(
      commandSegments(command).map((segment) => [segment.text, segment.repeated === true]),
    ).toEqual([
      ['for a in 1 2', true],
      ['for b in 3', true],
      ['echo "$a$b"', true],
      ['done', true],
      ['echo inner', true],
      ['done', true],
      ['echo after', false],
    ])
    expect(commandSegments(shell(`${LOOP} curl -sf x; do sleep 1; done`))[0]?.repeated).toBe(true)
  })

  it('does not take a timeout on each pass as the command’s own bound', () => {
    // P324's shape: three bounded passes ran 77 s and ended in an inner 124.
    expect(
      commandTimeoutSeconds(shell('for i in 1 2 3; do timeout 25 curl -s localhost:4000; done')),
    ).toBeNull()
    expect(commandTimeoutSeconds(shell('timeout 25 node import.mjs'))).toBe(25)
    expect(
      commandTimeoutSeconds(shell('for i in 1; do echo; done; timeout 7 node import.mjs')),
    ).toBe(7)
  })
})

describe('a case item’s pattern is matched, not run', () => {
  const CASE =
    'case "$kind" in\n  api|server) npm test ;;\n  (app) npx playwright test ;;\n  *) echo none ;;\nesac; echo after'

  it('reads each item’s commands, and no pattern as a program or a pipe', () => {
    expect(runs(CASE)).toEqual([
      'case "$kind" in',
      'npm test',
      'playwright test',
      'echo none',
      'esac',
      'echo after',
    ])
    expect(runs('case x in a) cp a b;& b) cp b c;;& *) :;; esac')).toEqual([
      'case x in',
      'cp a b',
      'cp b c',
      ':',
      'esac',
    ])
  })

  it('still runs a substitution in the case word, and never a pattern', () => {
    expect(checkBlockedCommand(shell('case $(printenv) in x) ;; esac'))).toContain(
      'Command blocked',
    )
    expect(
      executedCommands(shell('case x in printenv) echo matched ;; esac')).map((c) => c.program),
    ).not.toContain('printenv')
  })
})

describe('an arithmetic command evaluates an expression and runs nothing', () => {
  it('reads no program or redirect in it, and does not split at its operators', () => {
    const command = shell('(( n > 3 )) && echo big')
    expect(runs(command)).toEqual(['echo big'])
    expect(locatedCommandSegments(command).map((entry) => entry.redirectTarget)).toEqual([null])
    expect(runs('if (( a > 1 && b < 2 )); then cp a app/src/x.ts; fi')).toEqual([
      'cp a app/src/x.ts',
      'fi',
    ])
    expect(commandSegments(shell(`${LOOP} (( i < 3 )); do echo; done`))[0]?.repeated).toBe(true)
  })

  it('reads a `((` that closes another way as the nested subshells it is', () => {
    expect(runs('((cd app && npm test) )')).toEqual(['cd app', 'npm test'])
  })

  it('still runs a substitution inside the expression', () => {
    expect(checkBlockedCommand(shell('(( $(printenv | wc -l) > 3 ))'))).toContain('Command blocked')
    expect(executedCommands('(( $(printenv | wc -l) > 3 ))').map((c) => c.program)).toEqual([
      'printenv',
      'wc',
    ])
  })
})

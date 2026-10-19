/**
 * The short budget for an inline local transform needs the WHOLE command to be that shape.
 *
 * xr-molecule-flash-m254 (+12:48, 2026-10-20) sent `python3 - <<'EOF' … EOF` and then, in the same
 * command, `node /workspace/.mol-scratch/smoke.mjs 2>&1 | tail -25` — the agent's Playwright UI
 * walk. The classifier returned the interpreter on the FIRST inline program and ignored the rest,
 * so the walk got 20 s as a "runaway transform" and the result blamed the python. A script FILE is
 * not proven local (the `playwright` import is inside it, not in the command text), so the chain
 * must keep the tool's full budget.
 */

import { describe, expect, it } from 'vitest'

import { inlineLocalScriptCommand } from '../index.js'

/** m254's command shape, verbatim: the local transform and the script-file walk in one chain. */
const M254_COMMAND =
  "cd /workspace && python3 - <<'EOF'\n" +
  "s = open('index.html').read().replace('before', 'after')\n" +
  "open('index.html', 'w').write(s)\n" +
  'EOF\n' +
  'cd /workspace/my-app && node /workspace/.mol-scratch/smoke.mjs 2>&1 | tail -25'

describe('inlineLocalScriptCommand — every statement must be proven local', () => {
  it('refuses m254’s heredoc chained with a script file and its pipeline', () => {
    expect(inlineLocalScriptCommand(M254_COMMAND)).toBeNull()
  })

  it('refuses a script file in the pipeline of an otherwise local inline program', () => {
    const command = "python3 - <<'EOF'\nx = 1\nEOF\n| node smoke.mjs"
    expect(inlineLocalScriptCommand(command)).toBeNull()
  })

  it('keeps a lone local heredoc on the short budget', () => {
    const command = "cd app/public && python3 - <<'EOF'\nimport re\nEOF"
    expect(inlineLocalScriptCommand(command)).toBe('python3')
  })

  it('keeps safe utility chains on the short budget', () => {
    const chained =
      "cd /workspace && python3 - <<'EOF'\nx = 1\nEOF\n" +
      'ls -la && head -5 out.txt | grep -n x | tail -1 && wc -l out.txt'
    expect(inlineLocalScriptCommand(chained)).toBe('python3')

    // The m200 shape itself: a heredoc's output piped through a file utility.
    const piped = "cd app && python3 - <<'EOF'\nx = 1\nEOF\n| sort | head -3"
    expect(inlineLocalScriptCommand(piped)).toBe('python3')
  })

  it('refuses every script-FILE interpreter, even behind an inline program', () => {
    for (const statement of [
      'node smoke.mjs',
      'python3 transform.py',
      'bash deploy.sh',
      'perl fix.pl',
      'ruby task.rb',
    ]) {
      const command = `python3 - <<'EOF'\nx = 1\nEOF\n${statement}`
      expect(inlineLocalScriptCommand(command)).toBeNull()
    }
  })

  it('refuses a program the local set does not cover', () => {
    // `tar` is local in fact, but nothing here proves that — an unknown program keeps the budget.
    const command = "python3 - <<'EOF'\nx = 1\nEOF\ntar -xf bundle.tar"
    expect(inlineLocalScriptCommand(command)).toBeNull()
  })

  it('keeps a command with no inline program out of the short budget', () => {
    expect(inlineLocalScriptCommand('cd app && cat a.txt | head -3')).toBeNull()
  })
})

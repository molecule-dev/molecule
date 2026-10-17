import { describe, expect, it } from 'vitest'

import { leadingSleepPeek, MIN_PEEK_SLEEP_SECONDS } from '../sleep-peek.js'

// X1 xr-molecule-flash-m105 (+08:49 → +10:53): 225 s of run clock inside
// `exec_command` calls of the shape `sleep N; <read a background task's log>`.
// The parser is the half that decides which of those commands the platform may
// answer without sleeping; the exec wrapper is the half that answers them.
describe('leadingSleepPeek', () => {
  it('reads the 120 s peek at a live 139-test run (m105 +10:53)', () => {
    expect(leadingSleepPeek('sleep 120; tail -c 3000 /tmp/rw-e2e.log')).toEqual({
      seconds: 120,
      rest: 'tail -c 3000 /tmp/rw-e2e.log',
    })
  })

  it('reads the 45 s peek at a task that had already died (m105 +08:49)', () => {
    expect(leadingSleepPeek('sleep 45; tail -30 /tmp/rw-e2e.log')).toEqual({
      seconds: 45,
      rest: 'tail -30 /tmp/rw-e2e.log',
    })
  })

  it('keeps the greps that followed the 60 s sleep (m105 +09:38)', () => {
    const command =
      'sleep 60; grep -cE "✓" /tmp/rw-e2e.log; grep -E "✘|passed|failed|Error" /tmp/rw-e2e.log'
    expect(leadingSleepPeek(command)).toEqual({
      seconds: 60,
      rest: 'grep -cE "✓" /tmp/rw-e2e.log; grep -E "✘|passed|failed|Error" /tmp/rw-e2e.log',
    })
  })

  it('reads a leading sleep that is the whole command', () => {
    expect(leadingSleepPeek('sleep 30')).toEqual({ seconds: 30, rest: '' })
  })

  it('reads a sleep written with a path, a suffix or several operands', () => {
    expect(leadingSleepPeek('/bin/sleep 10; tail -f log')?.seconds).toBe(10)
    expect(leadingSleepPeek('sleep 1m; tail -f log')?.seconds).toBe(60)
    // GNU sleep sums its operands.
    expect(leadingSleepPeek('sleep 45 15; tail -f log')?.seconds).toBe(60)
  })

  it('takes an `&&` or a newline as the separator, as a shell does', () => {
    expect(leadingSleepPeek('sleep 5 && tail log')?.rest).toBe('tail log')
    expect(leadingSleepPeek('sleep 5\ntail log')?.rest).toBe('tail log')
  })

  it('leaves a short settle alone', () => {
    expect(leadingSleepPeek('sleep 3; curl localhost:4000/health')).toBeNull()
    expect(MIN_PEEK_SLEEP_SECONDS).toBe(5)
  })

  it('is not fooled by a sleep that is not in command position', () => {
    // The sleep runs after `cd`, so the command does not OPEN with it.
    expect(leadingSleepPeek('cd /workspace/app && sleep 60; tail -30 /tmp/x.log')).toBeNull()
    // …and a sleep named as an argument runs nothing at all.
    expect(leadingSleepPeek("grep -n 'sleep 60' notes.md")).toBeNull()
    expect(leadingSleepPeek('echo sleep 60')).toBeNull()
  })

  it('refuses a pipeline: dropping its left side would hand the right side its stdin', () => {
    expect(leadingSleepPeek('sleep 60 | tail -30 /tmp/x.log')).toBeNull()
    expect(leadingSleepPeek('sleep 60 || tail -30 /tmp/x.log')).toBeNull()
  })
})

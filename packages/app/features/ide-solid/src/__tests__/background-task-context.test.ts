/**
 * Background-task id → command, and the `wait_for_task` label it feeds.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/background-task-context.test.ts`
 * with the same test names and the same assertions: the transcript's
 * `exec_command` calls are collected into the map the cards read, and the
 * `wait_for_task` label names the command once the card knows it (falling back
 * to the opaque task id when it does not).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'
import { toolLabel } from '@molecule/app-ide-panel-logic/panels'

import { backgroundTaskCommands } from '../context/background-task-commands.js'

/**
 * English passthrough translator — the text the package's former static `t`
 * returned for `en`, so these direct-call expectations stay plain English while
 * following the caller-supplied-translate-function contract.
 */
const t: TranslateFunction = (key, values, opts) =>
  opts?.defaultValue
    ? Object.entries(values ?? {}).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        opts.defaultValue,
      )
    : key

describe('backgroundTaskCommands', () => {
  it('maps a background exec_command task id to its command', () => {
    const map = backgroundTaskCommands([
      {
        toolCalls: [
          {
            name: 'exec_command',
            input: { command: 'npm run build', run_in_background: true },
            output: { taskId: 'mol-bg-abc-123' },
          },
          { name: 'exec_command', input: { command: 'ls' }, output: { stdout: '' } },
          { name: 'read_file', input: { path: 'a' }, output: { taskId: 'mol-bg-x-1' } },
        ],
      },
      {},
    ])
    expect([...map]).toEqual([['mol-bg-abc-123', 'npm run build']])
  })
})

describe('toolLabel — wait_for_task', () => {
  it('names the command being waited on once the card knows it', () => {
    expect(
      toolLabel(t, 'wait_for_task', { taskId: 'mol-bg-abc-123', command: 'npm run build' }),
    ).toBe('Wait for `npm run build`')
  })

  it('falls back to the task id when the starting command is not in the transcript', () => {
    expect(toolLabel(t, 'wait_for_task', { taskId: 'mol-bg-abc-123' })).toBe(
      'Wait for background task `mol-bg-abc-123`',
    )
  })
})

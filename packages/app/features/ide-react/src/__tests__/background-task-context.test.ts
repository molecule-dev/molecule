import { describe, expect, it } from 'vitest'

import { backgroundTaskCommands } from '../components/background-task-context.js'
import { toolLabel } from '../components/tool-call-utilities.js'

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
    expect(toolLabel('wait_for_task', { taskId: 'mol-bg-abc-123', command: 'npm run build' })).toBe(
      'Wait for `npm run build`',
    )
  })

  it('falls back to the task id when the starting command is not in the transcript', () => {
    expect(toolLabel('wait_for_task', { taskId: 'mol-bg-abc-123' })).toBe(
      'Wait for background task `mol-bg-abc-123`',
    )
  })
})

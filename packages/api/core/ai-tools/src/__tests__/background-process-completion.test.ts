import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools } from '../tools.js'

describe('background command completion through a real shell', () => {
  it.each([
    { command: 'true &', code: 0 },
    { command: '(sleep 0.15; exit 7) &', code: 7 },
    { command: '(sleep 0.15; exit 7) & # keep the child status', code: 7 },
    { command: "sh -c 'exit 7' & # the outer shell owns this child", code: 7 },
    { command: "sh -c 'true &'", code: 0 },
    { command: 'printf "%s" "&"', code: 0 },
  ])(
    'returns the process status for $command without requiring log markers',
    async ({ command, code }) => {
      const root = await mkdtemp(join(tmpdir(), 'molecule-background-'))
      let taskId: string | undefined
      try {
        const tools = buildTools(createLocalBackend(root), { symlinkGuards: true })
        const started = (await tools
          .find((tool) => tool.name === 'exec_command')!
          .execute({ command, run_in_background: true })) as { taskId: string }
        taskId = started.taskId
        expect(taskId).toMatch(/^mol-bg-/)
        const result = (await tools
          .find((tool) => tool.name === 'wait_for_task')!
          .execute({ taskId, timeout: 1000 })) as { status: string; exitCode: number | null }
        expect(result.status).toBe('completed')
        expect(result.exitCode).toBe(code)
      } finally {
        if (taskId) {
          for (const suffix of ['.sh', '.pid', '.exit', '.log']) {
            await rm(`/tmp/${taskId}${suffix}`, { force: true })
          }
        }
        await rm(root, { recursive: true, force: true })
      }
    },
  )
})

import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { streamingBackgroundCommand } from '../utilities.js'

describe('explicit repeated test commands', () => {
  it('keeps every requested execution in a background command', () => {
    const prepared = streamingBackgroundCommand('npx playwright test; npx playwright test')
    expect(prepared.error).toBeUndefined()
    expect(prepared.command.match(/playwright test/g)).toHaveLength(2)
  })
  it('allows a caller to repeat a suite to measure intermittent failures', async () => {
    const run = vi.fn(async () => ({ exitCode: 0, stdout: '2 passed', stderr: '' }))
    const backend: ExecutionBackend = {
      projectRoot: '/workspace',
      run,
      readFile: async () => '',
      writeFile: async () => {},
      deleteFile: async () => {},
      readDir: async () => [],
    }
    const tool = buildTools(backend).find((candidate) => candidate.name === 'exec_command')!
    const result = await tool.execute({ command: 'npx playwright test; npx playwright test' })
    expect(result).not.toHaveProperty('error')
    expect(run).toHaveBeenCalled()
  })
})

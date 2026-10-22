import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { MAX_OUTPUT_SIZE } from '../utilities.js'

/** A backend whose command printed `stdout`; nothing else is touched. */
function backend(stdout: string): ExecutionBackend {
  return {
    projectRoot: '/workspace/my-app',
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout, stderr: '', exitCode: 0 }),
  }
}

function execTool(execution: ExecutionBackend) {
  return buildTools(execution, { blockDangerousCommands: false }).find(
    (tool) => tool.name === 'exec_command',
  )!
}

/**
 * A stdout over the tool's cap. `truncateMiddle` keeps the head and the tail, so a file
 * named in the middle of it is exactly what the executor never receives
 * (xr-molecule-flash-m420: a clipped multi-file `cat` was recorded as a whole read).
 */
const PRINTED = 'export const a = 1\n'.repeat(7_000)

describe('exec_command output completeness fact', () => {
  it('marks a stdout the middle cut holed', async () => {
    expect(PRINTED.length).toBeGreaterThan(MAX_OUTPUT_SIZE)
    const result = (await execTool(backend(PRINTED)).execute({
      command: 'cat app/src/a.ts',
    })) as { stdout?: string; stdoutTruncated?: boolean }
    expect(result.stdoutTruncated).toBe(true)
    expect(String(result.stdout)).toContain('middle truncated')
    expect(String(result.stdout).length).toBeLessThan(PRINTED.length)
  })

  it('says nothing when the stdout is delivered whole', async () => {
    const result = await execTool(backend('export const a = 1\n')).execute({
      command: 'cat app/src/a.ts',
    })
    expect(result).not.toHaveProperty('stdoutTruncated')
  })
})

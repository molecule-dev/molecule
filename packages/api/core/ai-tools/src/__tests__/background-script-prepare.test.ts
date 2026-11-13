import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

function fixture() {
  const events: string[] = []
  const files = new Map<string, string>()
  const backend: ExecutionBackend = {
    projectRoot: '/workspace',
    readFile: async (path) => files.get(path) ?? '',
    writeFile: async (path, content) => {
      events.push(path.endsWith('.stop') ? 'write stop script' : 'write')
      files.set(path, content)
    },
    deleteFile: async () => {},
    readDir: async () => [],
    run: vi.fn(async () => {
      events.push('launch')
      return { stdout: '', stderr: '', exitCode: 0 }
    }),
  }
  return { backend, files, events }
}

describe('background command preparation without a file-method override', () => {
  it('prepares the written script before launch', async () => {
    const f = fixture()
    const prepare = vi.fn(async (path: string, content: string) => {
      expect(f.files.get(path)).toBe(content)
      f.events.push('prepare')
      f.files.set(path, `export BILLING_MODE=test\n${content}`)
    })
    const command = buildTools(f.backend, { prepareBackgroundScript: prepare }).find(
      (tool) => tool.name === 'exec_command',
    )!
    const result = await command.execute({ command: 'printf billing', run_in_background: true })
    expect(result).toMatchObject({ taskId: expect.any(String) })
    expect(f.events).toEqual(['write', 'write stop script', 'prepare', 'launch'])
    expect(prepare).toHaveBeenCalledOnce()
  })

  it('refuses launch when preparation fails', async () => {
    const f = fixture()
    const command = buildTools(f.backend, {
      prepareBackgroundScript: async () => {
        throw new Error('invalid command script')
      },
    }).find((tool) => tool.name === 'exec_command')!
    expect(
      await command.execute({ command: 'printf billing', run_in_background: true }),
    ).toMatchObject({ error: expect.stringContaining('invalid command script') })
    expect(f.backend.run).not.toHaveBeenCalled()
  })

  it('never prepares a model file write', async () => {
    const f = fixture()
    const prepare = vi.fn(async () => {})
    const write = buildTools(f.backend, { prepareBackgroundScript: prepare }).find(
      (tool) => tool.name === 'write_file',
    )!
    expect(await write.execute({ path: 'invoice.txt', content: 'paid' })).toMatchObject({
      ok: true,
    })
    expect(prepare).not.toHaveBeenCalled()
  })
})

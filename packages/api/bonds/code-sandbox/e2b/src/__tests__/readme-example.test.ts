/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `e2b` SDK (the network) is
 * mocked; the provider's own logic runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-code-sandbox'

import { createProvider } from '../index.js'

const sdk = vi.hoisted(() => {
  const files = new Map<string, string>()
  const killed: string[] = []
  const created: Array<{ template: string; opts: Record<string, unknown> }> = []
  const sandbox = {
    sandboxId: 'sbx-1',
    commands: {
      run: vi.fn(async (cmd: string, _opts?: Record<string, unknown>) => {
        const source = files.get(cmd.replace(/^node /, '')) ?? ''
        const printed = /console\.log\('(.*)'\)/.exec(source)?.[1] ?? ''
        const result = { stdout: `${printed}\n`, stderr: '', exitCode: 0 }
        return { pid: 1, ...result, wait: async () => result }
      }),
    },
    files: {
      write: vi.fn(async (path: string, content: string) => {
        files.set(path, content)
        return {}
      }),
    },
    getHost: (port: number) => `${port}-sbx-1.e2b.app`,
    setTimeout: async () => undefined,
    kill: async () => undefined,
    isRunning: async () => true,
  }
  return { files, killed, created, sandbox }
})

vi.mock('e2b', () => ({
  Sandbox: {
    create: async (template: string, opts: Record<string, unknown>) => {
      sdk.created.push({ template, opts })
      return sdk.sandbox
    },
    kill: async (id: string) => {
      sdk.killed.push(id)
      return true
    },
  },
  SandboxNotFoundError: class SandboxNotFoundError extends Error {},
  Volume: {},
}))

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('creates a sandbox from the template, runs a file, exposes a preview URL, and destroys it', async () => {
    process.env.E2B_API_KEY = 'e2b_test_key'
    process.env.E2B_TEMPLATE_ID = 'molecule-superset'
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        apiKey: process.env.E2B_API_KEY,
        templateId: process.env.E2B_TEMPLATE_ID,
        defaultPreviewPort: 5173,
      }),
    )

    const sandbox = await requireProvider().create({ projectId: 'proj_123' })
    try {
      await sandbox.writeFile('/workspace/hello.js', "console.log('hello from e2b')")
      const result = await sandbox.exec('node /workspace/hello.js', { timeout: 30_000 })
      if (result.exitCode !== 0) throw new Error(`sandbox exec failed: ${result.stderr}`)
      console.log(result.stdout)
      console.log(sandbox.getPreviewUrl(5173))
    } finally {
      await requireProvider().destroy(sandbox.id)
    }

    expect(log).toHaveBeenNthCalledWith(1, 'hello from e2b\n')
    expect(log).toHaveBeenNthCalledWith(2, 'https://5173-sbx-1.e2b.app')
    expect(sdk.created[0]).toMatchObject({
      template: 'molecule-superset',
      opts: {
        apiKey: 'e2b_test_key',
        metadata: { projectId: 'proj_123' },
        lifecycle: { onTimeout: { action: 'pause', keepMemory: true } },
      },
    })
    expect(sdk.sandbox.commands.run).toHaveBeenCalledWith(
      'node /workspace/hello.js',
      expect.objectContaining({ timeoutMs: 30_000 }),
    )
    expect(sdk.killed).toEqual(['sbx-1'])
  })
})

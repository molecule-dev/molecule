/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the E2B bond with only the
 * `e2b` SDK (the network) mocked.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  const files = new Map<string, string>()
  const killed: string[] = []
  const created: Array<{ template: string; opts: Record<string, unknown> }> = []
  const sandbox = {
    sandboxId: 'sbx-1',
    commands: {
      run: vi.fn(async (cmd: string) => {
        const path = cmd.replace(/^node /, '')
        const source = files.get(path) ?? ''
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
    setTimeout: async () => {},
    kill: async () => {},
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

import { createProvider } from '@molecule/api-code-sandbox-e2b'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds E2B, runs a file in the sandbox, exposes a preview URL, and destroys it', async () => {
    setProvider(createProvider({ apiKey: 'e2b_test_key', defaultPreviewPort: 5173 }))

    const projectId = 'proj_123'
    const sandbox = await requireProvider().create({ projectId })
    try {
      await sandbox.writeFile('/workspace/hello.js', "console.log('hello from the sandbox')")
      const result = await sandbox.exec('node /workspace/hello.js', { timeout: 30_000 })
      if (result.exitCode !== 0) throw new Error(`sandbox exec failed: ${result.stderr}`)
      expect(result.stdout).toBe('hello from the sandbox\n')
      expect(sandbox.getPreviewUrl(5173)).toBe('https://5173-sbx-1.e2b.app')
    } finally {
      await requireProvider().destroy(sandbox.id)
    }

    expect(sdk.created[0]?.opts).toMatchObject({ apiKey: 'e2b_test_key', metadata: { projectId } })
    expect(sdk.sandbox.commands.run).toHaveBeenCalledWith(
      'node /workspace/hello.js',
      expect.objectContaining({ timeoutMs: 30_000 }),
    )
    expect(sdk.killed).toEqual(['sbx-1'])
  })
})

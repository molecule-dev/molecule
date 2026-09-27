import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox, SandboxProvider } from '@molecule/api-code-sandbox'
import { setProvider } from '@molecule/api-code-sandbox'

import { createProvider, RUNTIME_ALLOWED_HOSTS } from '../provider.js'

/** A scripted fake sandbox: exec results queue in order; everything is recorded. */
function fakeSandbox(
  over: Partial<Sandbox> = {},
): Sandbox & { execs: Array<{ cmd: string; env: Record<string, string> }> } {
  const execs: Array<{ cmd: string; env: Record<string, string> }> = []
  const execResults: Array<{ exitCode: number; stdout: string; stderr: string }> = []
  const handle = {
    id: 'sbx-test-1',
    status: 'running' as const,
    previewUrl: '',
    execs,
    execResults,
    appliedNetwork: null as string[] | null,
    async applyNetwork(allowOut: string[]) {
      this.appliedNetwork = allowOut
    },
    async exec(command: string, opts?: { env?: Record<string, string>; timeout?: number }) {
      execs.push({ cmd: command, env: opts?.env ?? {} })
      return execResults.shift() ?? { exitCode: 0, stdout: '', stderr: '' }
    },
    async writeFile() {},
    ...over,
  }
  return handle as never
}

/** Wire a fake sandbox provider with a queue of exec outcomes. */
function wireProvider(
  handle: ReturnType<typeof fakeSandbox>,
  destroy = vi.fn().mockResolvedValue(undefined),
) {
  const provider: SandboxProvider = {
    name: 'fake',
    async create() {
      return handle
    },
    async destroy(id: string) {
      await destroy(id)
    },
  } as never
  setProvider(provider)
  return { destroy }
}

const SPEC = {
  repoUrl: 'https://github.com/acme/widgets',
  instructions: 'Fix the failing test.',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('api-agent-runtime-claude-code', () => {
  it('creates a bare sandbox, applies deny-by-default egress, and destroys it on success', async () => {
    const handle = fakeSandbox()
    // clone, (no branch), npm install, claude, git diff
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' }, // probe: allowed host reachable
      { exitCode: 1, stdout: '', stderr: '' }, // probe: denied host blocked
      { exitCode: 0, stdout: '', stderr: '' }, // clone
      { exitCode: 0, stdout: '', stderr: '' }, // npm install
      {
        exitCode: 0,
        stdout: '{"result":"done","usage":{"input_tokens":10,"output_tokens":5}}',
        stderr: '',
      },
      { exitCode: 0, stdout: 'diff --git a/f b/f\n+++ b/f\n', stderr: '' },
    )
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: {
        GITHUB_TOKEN: 'test-fake-gh-token-value',
        ANTHROPIC_API_KEY: 'test-fake-anthropic-key',
      },
    })
    expect(artifact.exitStatus).toBe('completed')
    expect(artifact.patch).toContain('diff --git')
    // The sandbox is destroyed BEFORE the artifact is returned.
    expect(destroy).toHaveBeenCalledWith('sbx-test-1')
    // Egress was deny-by-default with the runtime hosts.
    expect(handle.appliedNetwork).toEqual(expect.arrayContaining(RUNTIME_ALLOWED_HOSTS))
    // Credentials rode ONLY the clone exec — the probes and install carry none.
    expect(handle.execs[2].env.GITHUB_TOKEN).toBe('test-fake-gh-token-value')
    expect(handle.execs[0].env).toEqual({})
  })

  it('refuses to inject credentials when the egress probe contradicts the policy', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(
      { exitCode: 1, stdout: '', stderr: '' }, // allowed host probe FAILS
    )
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: 'test-fake-gh-token-value' },
    })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('Egress pre-flight failed')
    // No clone was attempted: no credential ever entered the sandbox.
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
  })

  it('refuses when a NON-allowed host is reachable (egress not deny-by-default)', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' }, // allowed host OK
      { exitCode: 0, stdout: '', stderr: '' }, // example.com REACHABLE — bad
    )
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: 'test-fake-gh-token-value' },
    })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('not deny-by-default')
  })

  it('destroys the sandbox on failure too, and redacts the token from logs', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 1, stdout: '', stderr: '' },
      {
        exitCode: 128,
        stdout: '',
        stderr:
          'fatal: could not read Username for ' +
          ['https://x-access-token:', 'test-fake-gh-token-value', '@github.com'].join(''),
      },
    )
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: 'test-fake-gh-token-value' },
    })
    expect(destroy).toHaveBeenCalled()
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).not.toContain('test-fake-gh-token-value')
    expect(artifact.logs).toContain('[REDACTED]')
  })

  it('propagates the model flag and passes instructions by file, never argv', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 1, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '{}', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
    )
    wireProvider(handle)
    await createProvider().run(
      { ...SPEC, model: 'claude-opus-5-5' },
      {
        env: { ANTHROPIC_API_KEY: 'test-fake-anthropic-key' },
      },
    )
    const agentCmd = handle.execs.find((e) => e.cmd.includes('claude -p'))!.cmd
    expect(agentCmd).toContain("--model 'claude-opus-5-5'")
    expect(agentCmd).not.toContain('Fix the failing test')
    expect(agentCmd).toContain('cat /workspace/prompt.md')
  })

  it('reports cancelled when the signal fires before a phase', async () => {
    const handle = fakeSandbox()
    const { destroy } = wireProvider(handle)
    const controller = new AbortController()
    controller.abort()
    const artifact = await createProvider().run(SPEC, {
      env: {},
      signal: controller.signal,
    })
    expect(artifact.exitStatus).toBe('cancelled')
    // Aborted BEFORE any phase: no sandbox was ever created, so nothing to destroy.
    expect(destroy).not.toHaveBeenCalled()
  })
})

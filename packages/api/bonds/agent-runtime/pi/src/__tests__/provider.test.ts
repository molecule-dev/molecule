import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox, SandboxProvider } from '@molecule/api-code-sandbox'
import { setProvider } from '@molecule/api-code-sandbox'

import { DEFAULT_MODEL_MAP, PI_PROVIDERS, resolvePiModel } from '../models.js'
import { createProvider, provider, RUNTIME_ALLOWED_HOSTS } from '../provider.js'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const successRun = fixture('success-synthetic.jsonl')
const errorRun = fixture('error-401-v1.0.0.jsonl')

type ExecResult = { exitCode: number; stdout: string; stderr: string }

/** A scripted fake sandbox: exec results queue in order; everything is recorded. */
function fakeSandbox(over: Partial<Sandbox> = {}): Sandbox & {
  execs: Array<{ cmd: string; env: Record<string, string> }>
  execResults: ExecResult[]
  appliedNetwork: string[] | null
  written: Array<{ path: string; content: string }>
} {
  const execs: Array<{ cmd: string; env: Record<string, string> }> = []
  const execResults: ExecResult[] = []
  const written: Array<{ path: string; content: string }> = []
  const handle = {
    id: 'sbx-test-1',
    status: 'running' as const,
    previewUrl: '',
    execs,
    execResults,
    written,
    appliedNetwork: null as string[] | null,
    async applyNetwork(allowOut: string[]) {
      this.appliedNetwork = allowOut
    },
    async exec(command: string, opts?: { env?: Record<string, string>; timeout?: number }) {
      execs.push({ cmd: command, env: opts?.env ?? {} })
      return execResults.shift() ?? { exitCode: 0, stdout: '', stderr: '' }
    },
    async writeFile(path: string, content: string) {
      written.push({ path, content })
    },
    ...over,
  }
  return handle as never
}

/** Wire a fake sandbox provider. */
function wireProvider(
  handle: ReturnType<typeof fakeSandbox>,
  destroy = vi.fn().mockResolvedValue(undefined),
) {
  const create = vi.fn().mockResolvedValue(handle)
  const sandboxProvider: SandboxProvider = {
    name: 'fake',
    create,
    async destroy(id: string) {
      await destroy(id)
    },
  } as never
  setProvider(sandboxProvider)
  return { destroy, create }
}

const ok = (stdout = ''): ExecResult => ({ exitCode: 0, stdout, stderr: '' })
const fail = (stderr = ''): ExecResult => ({ exitCode: 1, stdout: '', stderr })

/** Queue the setup phases: egress probes, clone, node check, install. */
function queueSetup(handle: ReturnType<typeof fakeSandbox>): void {
  handle.execResults.push(ok(), fail(), ok(), ok(), ok())
}

const SPEC = {
  repoUrl: 'https://github.com/acme/widgets',
  instructions: 'Fix the failing test.',
}
const ENV = {
  GITHUB_TOKEN: 'test-fake-gh-token-value',
  ANTHROPIC_API_KEY: 'test-fake-anthropic-key',
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('api-agent-runtime-pi', () => {
  it('runs pi in a bare sandbox behind probed egress, sums usage, and destroys the sandbox', async () => {
    const handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(successRun), ok('1 file changed\ndiff --git a/f b/f\n+++ b/f\n'))
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })

    expect(artifact.exitStatus).toBe('completed')
    expect(artifact.patch).toBe('diff --git a/f b/f\n+++ b/f\n')
    expect(artifact.usage).toEqual({
      inputTokens: 2900,
      outputTokens: 140,
      cacheReadTokens: 1100,
      cacheCreationTokens: 1100,
    })
    expect(destroy).toHaveBeenCalledWith('sbx-test-1')
    // Deny-by-default egress: the model host FIRST (it is the probed host), then the tooling hosts.
    expect(handle.appliedNetwork?.[0]).toBe('api.anthropic.com')
    expect(handle.appliedNetwork).toEqual(expect.arrayContaining([...RUNTIME_ALLOWED_HOSTS]))
    expect(handle.appliedNetwork).not.toContain('pi.dev')
    expect(handle.execs[0].env).toEqual({})

    const install = handle.execs.find((e) => e.cmd.includes('npm install -g'))!
    expect(install.cmd).toBe(
      "npm install -g --ignore-scripts '@earendil-works/pi-coding-agent@1.0.0'",
    )
    expect(install.env).toEqual({})

    const agent = handle.execs.find((e) => e.cmd.includes('| pi '))!
    expect(agent.cmd).toBe(
      "cd /workspace/repo && cat /workspace/prompt.md | pi --mode json --no-session --offline --no-approve --model 'anthropic/claude-sonnet-5-5'",
    )
    // Only the model provider's key + the quiet flags reach the agent — never the GitHub token.
    expect(agent.env).toEqual({
      PI_OFFLINE: '1',
      PI_SKIP_VERSION_CHECK: '1',
      PI_TELEMETRY: '0',
      ANTHROPIC_API_KEY: 'test-fake-anthropic-key',
    })
    // Instructions by file, never argv.
    expect(handle.written).toEqual([
      { path: '/workspace/prompt.md', content: 'Fix the failing test.' },
    ])
    expect(artifact.logs).toContain('[pi] edit src/math.ts')
  })

  it('reports failed when pi exits 0 but the model call failed (real 401 stream)', async () => {
    const handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(errorRun), ok(''))
    wireProvider(handle)
    const artifact = await createProvider().run(
      { ...SPEC, model: 'anthropic/claude-haiku-4-5' },
      { env: ENV },
    )
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('401')
  })

  it('reports failed when the stream ends before agent_settled', async () => {
    const handle = fakeSandbox()
    queueSetup(handle)
    const cut = successRun.split('\n').slice(0, 9).join('\n')
    handle.execResults.push(ok(cut), ok(''))
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('ended before agent_settled')
  })

  it('reports cancelled for an aborted assistant response, failed for exhausted retries', async () => {
    const aborted = successRun.replace('"stopReason":"stop"', '"stopReason":"aborted"')
    let handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(aborted), ok(''))
    wireProvider(handle)
    expect((await createProvider().run(SPEC, { env: ENV })).exitStatus).toBe('cancelled')

    const retried = successRun.replace(
      '{"type":"agent_settled"}',
      '{"type":"auto_retry_end","success":false,"finalError":"529 overloaded"}\n{"type":"agent_settled"}',
    )
    handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(retried), ok(''))
    wireProvider(handle)
    expect((await createProvider().run(SPEC, { env: ENV })).exitStatus).toBe('failed')
  })

  it('fails the run when Pi reports a different model answered', async () => {
    const handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(successRun), ok(''))
    wireProvider(handle)
    const artifact = await createProvider().run({ ...SPEC, model: 'claude-opus-5-5' }, { env: ENV })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('not the requested anthropic/claude-opus-5-5')
  })

  it('maps catalog ids, passes the provider key by Pi name, and honours config', async () => {
    const handle = fakeSandbox()
    queueSetup(handle)
    handle.execResults.push(ok(''), ok(''))
    wireProvider(handle)
    await createProvider({
      approveProjectFiles: true,
      tools: ['read', 'bash', 'edit', 'write', 'grep'],
      cliPackage: '@earendil-works/pi-coding-agent@1.0.1',
    }).run(
      { ...SPEC, model: 'deepseek-v4-pro' },
      { env: { GITHUB_TOKEN: 'test-fake-gh-token-value', DEEPSEEK_API_KEY: 'test-fake-ds-key' } },
    )
    expect(handle.appliedNetwork?.[0]).toBe('api.deepseek.com')
    const agent = handle.execs.find((e) => e.cmd.includes('| pi '))!
    expect(agent.cmd).toContain("--approve --model 'deepseek/deepseek-v4-pro'")
    expect(agent.cmd).toContain("--tools 'read,bash,edit,write,grep'")
    expect(agent.env.DEEPSEEK_API_KEY).toBe('test-fake-ds-key')
    expect(
      handle.execs.some((e) => e.cmd.includes("'@earendil-works/pi-coding-agent@1.0.1'")),
    ).toBe(true)
  })

  it('refuses an unmapped bare model id or a missing key before creating a sandbox', async () => {
    const handle = fakeSandbox()
    const { create } = wireProvider(handle)
    const unmapped = await createProvider().run({ ...SPEC, model: 'sonnet' }, { env: ENV })
    expect(unmapped.exitStatus).toBe('failed')
    expect(unmapped.logs).toContain('has no Pi mapping')

    const noKey = await createProvider().run(
      { ...SPEC, model: 'gpt-5.5' },
      { env: { GITHUB_TOKEN: 'test-fake-gh-token-value' } },
    )
    expect(noKey.exitStatus).toBe('failed')
    expect(noKey.logs).toContain('OPENAI_API_KEY is missing')
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses to inject credentials when the egress probe contradicts the policy', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(ok(), ok()) // example.com REACHABLE — not deny-by-default
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('not deny-by-default')
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
  })

  it('fails plainly on an old Node, and redacts the token from a failed clone', async () => {
    let handle = fakeSandbox()
    handle.execResults.push(ok(), fail(), ok(), fail())
    wireProvider(handle)
    const oldNode = await createProvider().run(SPEC, { env: ENV })
    expect(oldNode.logs).toContain('Node.js >= 22.19')

    handle = fakeSandbox()
    handle.execResults.push(ok(), fail(), {
      exitCode: 128,
      stdout: '',
      stderr: ['fatal: https://x-access-token:', 'test-fake-gh-token-value', '@github.com'].join(
        '',
      ),
    })
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(destroy).toHaveBeenCalled()
    expect(artifact.logs).not.toContain('test-fake-gh-token-value')
    expect(artifact.logs).toContain('[REDACTED]')
  })

  it('reports cancelled when the signal fires before a phase', async () => {
    const handle = fakeSandbox()
    const { destroy } = wireProvider(handle)
    const controller = new AbortController()
    controller.abort()
    const artifact = await createProvider().run(SPEC, { env: ENV, signal: controller.signal })
    expect(artifact.exitStatus).toBe('cancelled')
    expect(destroy).not.toHaveBeenCalled()
  })

  it('exposes a typed provider named pi', () => {
    expect(provider.name).toBe('pi')
    expect(typeof provider.run).toBe('function')
  })
})

describe('resolvePiModel', () => {
  it('maps catalog ids, accepts qualified ids with a thinking suffix, and refuses the rest', () => {
    expect(resolvePiModel('minimax-m3', DEFAULT_MODEL_MAP, PI_PROVIDERS)).toMatchObject({
      provider: 'minimax',
      model: 'MiniMax-M3',
      access: { keyEnv: 'MINIMAX_API_KEY', host: 'api.minimax.io' },
    })
    expect(
      resolvePiModel('openrouter/qwen/qwen3-coder', DEFAULT_MODEL_MAP, PI_PROVIDERS),
    ).toMatchObject({ provider: 'openrouter', model: 'qwen/qwen3-coder' })
    expect(
      resolvePiModel('anthropic/claude-opus-5-5:high', DEFAULT_MODEL_MAP, PI_PROVIDERS).qualified,
    ).toBe('anthropic/claude-opus-5-5:high')
    expect(() => resolvePiModel('glm-5.3', DEFAULT_MODEL_MAP, PI_PROVIDERS)).toThrow(
      /no Pi mapping/,
    )
    expect(() => resolvePiModel('zai/glm-5.3', DEFAULT_MODEL_MAP, PI_PROVIDERS)).toThrow(
      /provider "zai"/,
    )
  })
})

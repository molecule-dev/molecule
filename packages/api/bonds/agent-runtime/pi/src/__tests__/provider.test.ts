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

/** A well-formed fake token: matches the runtime's GITHUB_TOKEN shape gate. */
const GH_TOKEN = `ghp_${'a'.repeat(36)}`

type ExecResult = { exitCode: number; stdout: string; stderr: string }

/**
 * A scripted fake sandbox. Egress probes (the `node -e "fetch('https://<host>/…')"`
 * pre-flight) are auto-answered from `probeExit` — default: every allowlisted
 * host connects, the example.com canary is blocked — so tests queue results
 * only for the post-probe execs (askpass stage, clone, node check, install…).
 */
function fakeSandbox(
  over: Partial<Sandbox> = {},
  probeExit?: (host: string) => number | undefined,
): Sandbox & {
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
      if (command.includes(`fetch('https://`)) {
        const host = /fetch\('https:\/\/([^/]+)\//.exec(command)![1]
        return {
          exitCode: probeExit?.(host) ?? (host === 'example.com' ? 1 : 0),
          stdout: '',
          stderr: '',
        }
      }
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

/** Queue the setup phases AFTER the (auto-answered) egress probes: with a token, askpass stage → clone → helper cleanup → node check → install. */
function queueSetup(handle: ReturnType<typeof fakeSandbox>): void {
  handle.execResults.push(ok(), ok(), ok(), ok(), ok())
}

/** The probe execs recorded so far (shape: the `node -e "fetch(…)"` pre-flight). */
const probeExecs = (handle: ReturnType<typeof fakeSandbox>): typeof handle.execs =>
  handle.execs.filter((e) => e.cmd.includes(`fetch('https://`))

const SPEC = {
  repoUrl: 'https://github.com/acme/widgets',
  instructions: 'Fix the failing test.',
}
const ENV = {
  GITHUB_TOKEN: GH_TOKEN,
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
    // The canary is probed alongside EVERY allowed host (not a sample).
    expect(probeExecs(handle)).toHaveLength(
      1 /* model host */ + RUNTIME_ALLOWED_HOSTS.length + 1 /* canary */,
    )
    expect(probeExecs(handle).some((e) => e.cmd.includes('example.com'))).toBe(true)
    // The token rides the askpass helper only: base64 in the stage argv, never
    // plaintext in a clone URL/argv, never in an exec env.
    const stage = handle.execs.find((e) => e.cmd.includes('base64 -d > /tmp/.mol-git-askpass-'))!
    expect(stage).toBeTruthy()
    expect(stage.cmd).not.toContain(GH_TOKEN)
    const clone = handle.execs.find((e) => e.cmd.includes('git clone'))!
    expect(clone.cmd).toContain('GIT_ASKPASS=')
    expect(clone.cmd).toContain('GIT_TERMINAL_PROMPT=0')
    expect(clone.cmd).toContain("'https://github.com/acme/widgets'")
    expect(clone.cmd).not.toContain(GH_TOKEN)
    expect(clone.cmd).not.toContain('x-access-token:')
    expect(clone.env).toEqual({})
    expect(handle.execs.some((e) => e.cmd.startsWith('rm -f /tmp/.mol-git-askpass-'))).toBe(true)

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

  it('refuses a repoUrl that is not an https GitHub repo URL, before any sandbox', async () => {
    const handle = fakeSandbox()
    const { create, destroy } = wireProvider(handle)
    for (const repoUrl of [
      'http://github.com/acme/widgets',
      'https://gitlab.com/acme/widgets',
      'https://github.com/acme/widgets/extra/deep',
      "https://github.com/acme/widgets'; touch /tmp/pwned",
    ]) {
      const artifact = await createProvider().run({ ...SPEC, repoUrl }, { env: ENV })
      expect(artifact.exitStatus).toBe('failed')
      expect(artifact.logs).toContain('repoUrl must be an https GitHub repo URL')
    }
    expect(create).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
    expect(handle.execs).toHaveLength(0)
  })

  it('refuses a GITHUB_TOKEN without a GitHub token shape, before any exec', async () => {
    const handle = fakeSandbox()
    wireProvider(handle)
    for (const bad of ['short', 'test-fake-gh-token-value', 'x; curl evil', 'ghp_short']) {
      const artifact = await createProvider().run(SPEC, {
        env: { GITHUB_TOKEN: bad, ANTHROPIC_API_KEY: 'test-fake-anthropic-key' },
      })
      expect(artifact.exitStatus).toBe('failed')
      expect(artifact.logs).toContain('does not look like a GitHub token')
    }
    expect(handle.execs).toHaveLength(0)
  })

  it('refuses an allowedHosts entry that is not a bare hostname, before any exec', async () => {
    const handle = fakeSandbox()
    wireProvider(handle)
    for (const allowedHosts of [
      ["evil.com/'; curl evil"],
      ['sub..host'],
      ["host'); touch /tmp/pwned"],
    ]) {
      const artifact = await createProvider().run({ ...SPEC, allowedHosts }, { env: ENV })
      expect(artifact.exitStatus).toBe('failed')
      expect(artifact.logs).toContain('is not a bare hostname')
    }
    expect(handle.execs).toHaveLength(0)
  })

  it('refuses the run when the sandbox provider cannot enforce per-run egress (M-3)', async () => {
    const { applyNetwork: _omitted, ...bare } = fakeSandbox()
    const handle = bare as unknown as ReturnType<typeof fakeSandbox>
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('cannot enforce per-run egress')
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
    expect(handle.execs.some((e) => e.cmd.includes('| pi '))).toBe(false)
  })

  it('probes EVERY allowed host, not just the first', async () => {
    const handle = fakeSandbox(undefined, (host) => (host === 'api.anthropic.com' ? 1 : undefined))
    wireProvider(handle)
    const artifact = await createProvider().run(
      { ...SPEC, allowedHosts: ['api.example-app.com'] },
      { env: ENV },
    )
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('was not reachable')
    const probed = probeExecs(handle).map((e) => e.cmd)
    expect(probed).toEqual(
      expect.arrayContaining([
        expect.stringContaining("fetch('https://api.anthropic.com/')"),
        expect.stringContaining("fetch('https://api.example-app.com/')"),
        expect.stringContaining("fetch('https://example.com/')"),
      ]),
    )
    expect(probeExecs(handle)).toHaveLength(
      1 + RUNTIME_ALLOWED_HOSTS.length + 1 + 1, // model host + runtime hosts + caller host + canary
    )
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
      { env: { GITHUB_TOKEN: GH_TOKEN, DEEPSEEK_API_KEY: 'test-fake-ds-key' } },
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
      { env: { GITHUB_TOKEN: GH_TOKEN } },
    )
    expect(noKey.exitStatus).toBe('failed')
    expect(noKey.logs).toContain('OPENAI_API_KEY is missing')
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses to inject credentials when the egress probe contradicts the policy', async () => {
    const handle = fakeSandbox(undefined, (host) => (host === 'example.com' ? 0 : undefined))
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('not deny-by-default')
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
  })

  it('fails plainly on an old Node, and redacts the token from a failed clone', async () => {
    let handle = fakeSandbox()
    // askpass stage, clone, cleanup — then the node check fails.
    handle.execResults.push(ok(), ok(), ok(), fail())
    wireProvider(handle)
    const oldNode = await createProvider().run(SPEC, { env: ENV })
    expect(oldNode.logs).toContain('Node.js >= 22.19')

    handle = fakeSandbox()
    handle.execResults.push(
      ok(), // askpass stage
      {
        exitCode: 128,
        stdout: '',
        stderr: ['fatal: https://x-access-token:', GH_TOKEN, '@github.com'].join(''),
      },
    )
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, { env: ENV })
    expect(destroy).toHaveBeenCalled()
    expect(artifact.logs).not.toContain(GH_TOKEN)
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

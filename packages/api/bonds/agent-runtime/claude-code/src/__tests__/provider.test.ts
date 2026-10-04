import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox, SandboxProvider } from '@molecule/api-code-sandbox'
import { setProvider } from '@molecule/api-code-sandbox'

import { createProvider, RUNTIME_ALLOWED_HOSTS } from '../provider.js'

/** A well-formed fake token: matches the runtime's GITHUB_TOKEN shape gate. */
const GH_TOKEN = `ghp_${'a'.repeat(36)}`
const ANTHROPIC_KEY = 'test-fake-anthropic-key'

type ExecResult = { exitCode: number; stdout: string; stderr: string }

/**
 * A scripted fake sandbox. Egress probes (the `node -e "fetch('https://<host>/…')"`
 * pre-flight) are auto-answered from `probeExit` — default: every allowlisted
 * host connects, the example.com canary is blocked — so tests queue results
 * only for the post-probe execs (askpass stage, clone, install, agent, diff).
 */
function fakeSandbox(
  over: Partial<Sandbox> = {},
  probeExit?: (host: string) => number | undefined,
): Sandbox & { execs: Array<{ cmd: string; env: Record<string, string> }> } {
  const execs: Array<{ cmd: string; env: Record<string, string> }> = []
  const execResults: ExecResult[] = []
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
    async writeFile() {},
    ...over,
  }
  return handle as never
}

/** Wire a fake sandbox provider; returns the destroy spy. */
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

/** The probe execs recorded so far (shape: the `node -e "fetch(…)"` pre-flight). */
const probeExecs = (handle: ReturnType<typeof fakeSandbox>): typeof handle.execs =>
  handle.execs.filter((e) => e.cmd.includes(`fetch('https://`))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('api-agent-runtime-claude-code', () => {
  it('creates a bare sandbox, applies deny-by-default egress, and destroys it on success', async () => {
    const handle = fakeSandbox()
    // Post-probe execs, in order: askpass stage, clone, helper cleanup,
    // npm install, claude (JSON), git diff.
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
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
        GITHUB_TOKEN: GH_TOKEN,
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
      },
    })
    expect(artifact.exitStatus).toBe('completed')
    expect(artifact.patch).toContain('diff --git')
    // The sandbox is destroyed BEFORE the artifact is returned.
    expect(destroy).toHaveBeenCalledWith('sbx-test-1')
    // Egress was deny-by-default with the runtime hosts.
    expect(handle.appliedNetwork).toEqual(expect.arrayContaining(RUNTIME_ALLOWED_HOSTS))
    // The canary was probed alongside EVERY allowed host (not a sample).
    expect(probeExecs(handle)).toHaveLength(RUNTIME_ALLOWED_HOSTS.length + 1)
    expect(probeExecs(handle).some((e) => e.cmd.includes('example.com'))).toBe(true)
    // The token rides the askpass helper only: the stage exec carries it
    // BASE64-ENCODED (never plaintext), the clone URL/argv carry none.
    const stage = handle.execs.find((e) => e.cmd.includes('base64 -d > /tmp/.mol-git-askpass-'))!
    expect(stage).toBeTruthy()
    expect(stage.cmd).not.toContain(GH_TOKEN)
    const clone = handle.execs.find((e) => e.cmd.includes('git clone'))!
    expect(clone.cmd).toContain('GIT_ASKPASS=')
    expect(clone.cmd).toContain('GIT_TERMINAL_PROMPT=0')
    expect(clone.cmd).toContain("'https://github.com/acme/widgets'")
    expect(clone.cmd).not.toContain(GH_TOKEN)
    expect(clone.cmd).not.toContain('x-access-token:')
    expect(clone.env).toEqual({}) // no credential rides the exec env either
    // The helper is removed after the clone phase.
    expect(handle.execs.some((e) => e.cmd.startsWith('rm -f /tmp/.mol-git-askpass-'))).toBe(true)
    // The agent exec env carries exactly the whitelisted model + repo keys.
    const agent = handle.execs.find((e) => e.cmd.includes('claude -p'))!
    expect(agent.env).toEqual({ ANTHROPIC_API_KEY: ANTHROPIC_KEY, GITHUB_TOKEN: GH_TOKEN })
  })

  it('refuses to inject credentials when an ALLOWED host is not reachable', async () => {
    const handle = fakeSandbox(undefined, (host) => (host === 'api.anthropic.com' ? 1 : undefined))
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: GH_TOKEN },
    })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('Egress pre-flight failed')
    expect(artifact.logs).toContain('was not reachable')
    // No clone was attempted: no credential ever entered the sandbox.
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
  })

  it('refuses when a NON-allowed host is reachable (egress not deny-by-default)', async () => {
    const handle = fakeSandbox(undefined, (host) => (host === 'example.com' ? 0 : undefined))
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: GH_TOKEN },
    })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('not deny-by-default')
  })

  it('probes EVERY allowed host, not just the first', async () => {
    const handle = fakeSandbox(undefined, (host) =>
      host === 'cdn.example-app.com' ? 1 : undefined,
    )
    wireProvider(handle)
    const artifact = await createProvider().run(
      { ...SPEC, allowedHosts: ['api.example-app.com', 'cdn.example-app.com'] },
      { env: { GITHUB_TOKEN: GH_TOKEN } },
    )
    // The run failed on the SECOND caller host, proving it was probed.
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('cdn.example-app.com')
    expect(artifact.logs).toContain('was not reachable')
    expect(probeExecs(handle).map((e) => e.cmd)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("fetch('https://api.example-app.com/')"),
        expect.stringContaining("fetch('https://cdn.example-app.com/')"),
        expect.stringContaining("fetch('https://example.com/')"),
      ]),
    )
    expect(probeExecs(handle)).toHaveLength(RUNTIME_ALLOWED_HOSTS.length + 2 + 1)
  })

  it('refuses a repoUrl that is not an https GitHub repo URL, before any sandbox', async () => {
    const handle = fakeSandbox()
    const create = vi.fn().mockResolvedValue(handle)
    const destroy = vi.fn().mockResolvedValue(undefined)
    setProvider({ name: 'fake', create, destroy } as never)
    for (const repoUrl of [
      'http://github.com/acme/widgets',
      'https://gitlab.com/acme/widgets',
      'https://github.com/acme/widgets/extra/deep',
      'https://github.com/acme/widgets?token=x; curl evil',
      "https://github.com/acme/widgets'; touch /tmp/pwned",
      'https://github.com/../acme/widgets',
    ]) {
      const artifact = await createProvider().run(
        { ...SPEC, repoUrl },
        {
          env: { GITHUB_TOKEN: GH_TOKEN },
        },
      )
      expect(artifact.exitStatus).toBe('failed')
      expect(artifact.logs).toContain('repoUrl must be an https GitHub repo URL')
    }
    // Refused BEFORE a sandbox ever existed: nothing created, nothing probed.
    expect(create).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
    expect(handle.execs).toHaveLength(0)
  })

  it('refuses a GITHUB_TOKEN without a GitHub token shape, before any exec', async () => {
    const handle = fakeSandbox()
    wireProvider(handle)
    for (const GITHUB_TOKEN of ['short', 'test-fake-gh-token-value', 'x; curl evil', 'ghp_short']) {
      const artifact = await createProvider().run(SPEC, { env: { GITHUB_TOKEN } })
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
      ['host with spaces'],
      ["host'); touch /tmp/pwned"],
    ]) {
      const artifact = await createProvider().run(
        { ...SPEC, allowedHosts },
        { env: { GITHUB_TOKEN: GH_TOKEN } },
      )
      expect(artifact.exitStatus).toBe('failed')
      expect(artifact.logs).toContain('is not a bare hostname')
    }
    expect(handle.execs).toHaveLength(0)
  })

  it('refuses the run when the sandbox provider cannot enforce per-run egress (M-3)', async () => {
    // A provider whose handle has NO applyNetwork (docker/flyio-shaped).
    const { applyNetwork: _omitted, ...bare } = fakeSandbox()
    const handle = bare as unknown as ReturnType<typeof fakeSandbox>
    wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: GH_TOKEN, ANTHROPIC_API_KEY: ANTHROPIC_KEY },
    })
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).toContain('cannot enforce per-run egress')
    // No credential ever entered the sandbox: no askpass, no clone, no install, no agent.
    expect(handle.execs.some((e) => e.cmd.includes('git clone'))).toBe(false)
    expect(handle.execs.some((e) => e.cmd.includes('npm install'))).toBe(false)
    expect(handle.execs.some((e) => e.cmd.includes('claude -p'))).toBe(false)
  })

  it('destroys the sandbox on failure too, and redacts the token from logs', async () => {
    const handle = fakeSandbox()
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' }, // askpass stage
      {
        exitCode: 128,
        stdout: '',
        stderr:
          'fatal: could not read Username for ' +
          ['https://x-access-token:', GH_TOKEN, '@github.com'].join(''),
      },
    )
    const { destroy } = wireProvider(handle)
    const artifact = await createProvider().run(SPEC, {
      env: { GITHUB_TOKEN: GH_TOKEN },
    })
    expect(destroy).toHaveBeenCalled()
    expect(artifact.exitStatus).toBe('failed')
    expect(artifact.logs).not.toContain(GH_TOKEN)
    expect(artifact.logs).toContain('[REDACTED]')
  })

  it('propagates the model flag and passes instructions by file, never argv', async () => {
    const handle = fakeSandbox()
    // No GitHub token → no askpass: clone, install, agent, diff.
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '{}', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
    )
    wireProvider(handle)
    await createProvider().run(
      { ...SPEC, model: 'claude-opus-5-5' },
      {
        env: { ANTHROPIC_API_KEY: ANTHROPIC_KEY },
      },
    )
    const agentCmd = handle.execs.find((e) => e.cmd.includes('claude -p'))!.cmd
    expect(agentCmd).toContain("--model 'claude-opus-5-5'")
    expect(agentCmd).not.toContain('Fix the failing test')
    expect(agentCmd).toContain('cat /workspace/prompt.md')
  })

  it('installs the CLI at a PINNED version, quoted', async () => {
    const handle = fakeSandbox()
    // No GitHub token → clone, install; agent + diff auto-answer.
    handle.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
    )
    wireProvider(handle)
    await createProvider().run(SPEC, { env: { ANTHROPIC_API_KEY: ANTHROPIC_KEY } })
    const install = handle.execs.find((e) => e.cmd.includes('npm install -g'))!.cmd
    expect(install).toMatch(/^npm install -g '@anthropic-ai\/claude-code@\d+\.\d+\.\d+'$/)
    expect(install).not.toContain('@latest')
  })

  it('passes ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN through ONLY when supplied', async () => {
    const withBoth = fakeSandbox()
    // No GitHub token → clone, install, agent, diff.
    withBoth.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '{}', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
    )
    wireProvider(withBoth)
    await createProvider().run(SPEC, {
      env: {
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        ANTHROPIC_BASE_URL: 'https://broker.example/mcp',
        ANTHROPIC_AUTH_TOKEN: 'test-fake-broker-token',
        ARBITRARY_KEY: 'must-not-passthrough',
      },
    })
    const agent = withBoth.execs.find((e) => e.cmd.includes('claude -p'))!
    expect(agent.env.ANTHROPIC_BASE_URL).toBe('https://broker.example/mcp')
    expect(agent.env.ANTHROPIC_AUTH_TOKEN).toBe('test-fake-broker-token')
    expect(agent.env).not.toHaveProperty('ARBITRARY_KEY')

    const without = fakeSandbox()
    // No GitHub token → clone, install, agent, diff.
    without.execResults.push(
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
      { exitCode: 0, stdout: '{}', stderr: '' },
      { exitCode: 0, stdout: '', stderr: '' },
    )
    wireProvider(without)
    await createProvider().run(SPEC, { env: { ANTHROPIC_API_KEY: ANTHROPIC_KEY } })
    const agent2 = without.execs.find((e) => e.cmd.includes('claude -p'))!
    expect(agent2.env).not.toHaveProperty('ANTHROPIC_BASE_URL')
    expect(agent2.env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN')
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

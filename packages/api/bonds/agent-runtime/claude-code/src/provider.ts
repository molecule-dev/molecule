/**
 * Claude Code agent runtime — unattended runs in an ephemeral cloud sandbox.
 *
 * One call = one sandbox created for the run and destroyed before the artifact
 * returns. The sandbox holds nothing worth stealing: no platform env, no vault,
 * no project scaffold (created through the sandbox bond's minimal path, never
 * the project env-materialization). Credentials ride only the two exec calls
 * that need them (clone, agent), never the sandbox-wide environment. Egress is
 * deny-by-default where the sandbox can enforce it, and the run verifies —
 * not assumes — the policy before any credential arrives. The only return
 * channel is the artifact: a unified diff + credential-redacted logs.
 *
 * @module
 */

import type {
  AgentRunArtifact,
  AgentRunOptions,
  AgentRunSpec,
  AgentRuntimeProvider,
} from '@molecule/api-agent-run'
import { redactSecrets } from '@molecule/api-ai-tools'
import type { Sandbox } from '@molecule/api-code-sandbox'
import { requireProvider as requireSandboxProvider } from '@molecule/api-code-sandbox'

import type { ClaudeCodeRuntimeConfig } from './types.js'

/** Hosts the runtime's own tooling needs, always allowed on top of the spec's. */
export const RUNTIME_ALLOWED_HOSTS = [
  'api.anthropic.com',
  'github.com',
  'api.github.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'registry.npmjs.org',
] as const

/** Where the repo is cloned inside the sandbox. */
const REPO_DIR = '/workspace/repo'

/** Where the task instructions are written (stdin to the CLI, never argv). */
const PROMPT_PATH = '/workspace/prompt.md'

/** A sandbox handle that can enforce a per-run egress policy (E2B today). */
type NetworkCapableSandbox = Sandbox & {
  applyNetwork?: (allowOut: string[]) => Promise<void>
}

/** Result shape of `claude -p --output-format json` (fields we consume). */
interface ClaudeJsonResult {
  is_error?: boolean
  result?: string
  modelUsage?: Record<
    string,
    {
      inputTokens?: number
      outputTokens?: number
      cacheReadInputTokens?: number
      cacheCreationInputTokens?: number
    }
  >
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

/**
 * Probe that egress is deny-by-default BEFORE any credential enters the
 * sandbox: an allowed host must connect (any HTTP status counts — the policy
 * question is reachability, not the response) and a NOT-allowed host must fail
 * to connect. Observation, never attestation.
 *
 * @param handle - The run's sandbox.
 * @param allowedHosts - The effective allowlist.
 * @returns A promise that rejects when the probe contradicts the policy or cannot run.
 * @throws {Error} When the probe contradicts the policy or cannot run.
 */
async function assertEgress(handle: Sandbox, allowedHosts: string[]): Promise<void> {
  const probe = async (host: string): Promise<boolean> => {
    const r = await handle.exec(
      `node -e "fetch('https://${host}/').then(r => process.exit(0)).catch(() => process.exit(1))" --input-type=module 2>/dev/null`,
      { timeout: 15_000 },
    )
    return r.exitCode === 0
  }
  const allowed = allowedHosts[0]
  const denied = 'example.com'
  const [allowedOk, deniedBlocked] = await Promise.all([probe(allowed), probe(denied)])
  if (!allowedOk) {
    throw new Error(
      `Egress pre-flight failed: ${allowed} is on the run's allowlist but was not reachable — refusing to inject credentials into a sandbox whose network is not what the run assumed.`,
    )
  }
  if (deniedBlocked) {
    throw new Error(
      `Egress pre-flight failed: ${denied} is NOT on the run's allowlist but was reachable — egress is not deny-by-default. Refusing to inject credentials.`,
    )
  }
}

/**
 * Claude Code agent runtime backed by an ephemeral cloud sandbox.
 */
export class ClaudeCodeAgentRuntime implements AgentRuntimeProvider {
  readonly name = 'claude-code'

  private readonly defaults: Required<Omit<ClaudeCodeRuntimeConfig, 'cliPackage'>> & {
    cliPackage: string
  }

  /**
   * Create the runtime.
   *
   * @param config - CLI package, default model, budgets.
   */
  constructor(config: ClaudeCodeRuntimeConfig = {}) {
    this.defaults = {
      timeoutMs: config.timeoutMs ?? 600_000,
      cliPackage: config.cliPackage ?? '@anthropic-ai/claude-code@latest',
      defaultModel: config.defaultModel ?? 'claude-sonnet-5-5',
      setupSlackMs: config.setupSlackMs ?? 240_000,
    }
  }

  /**
   * Execute one unattended agent run in a fresh ephemeral sandbox.
   *
   * @param spec - The task.
   * @param opts - Per-run credentials (used ONLY by the exec calls that need
   *   them), log sink, cancellation signal.
   * @returns Artifacts: patch, redacted logs, usage, sandbox id, compute time.
   */
  async run(spec: AgentRunSpec, opts: AgentRunOptions): Promise<AgentRunArtifact> {
    const provider = requireSandboxProvider()
    const totalBudgetMs = spec.timeoutMs ?? this.defaults.timeoutMs
    const sandboxBudgetMs = totalBudgetMs + this.defaults.setupSlackMs
    const started = Date.now()
    const logs: string[] = []
    const log = (line: string): void => {
      logs.push(line)
      try {
        opts.onLog?.(line)
      } catch (_error) {
        // Intentional noop: a throwing log sink must not fail the run.
      }
    }

    const allowOut = [...new Set([...RUNTIME_ALLOWED_HOSTS, ...(spec.allowedHosts ?? [])])]
    const abortCheck = (): void => {
      if (opts.signal?.aborted) throw new CANCELLED()
    }

    let sandboxId: string | undefined
    // Any exit from here destroys the sandbox FIRST — credentials die with it.
    try {
      abortCheck()
      const handle: NetworkCapableSandbox = await provider.create({
        // NOT a project id: no env-materialization, no scaffold, no vault —
        // the sandbox boots from the bare template and stays bare.
        projectId: `agent-run-${Date.now().toString(36)}`,
        env: {},
        labels: { 'molecule.agent-run': '1' },
      })
      sandboxId = handle.id

      // Egress policy + OBSERVED proof of it, before any credential exists here.
      if (typeof handle.applyNetwork === 'function') {
        await handle.applyNetwork(allowOut)
        await assertEgress(handle, allowOut)
      }
      abortCheck()

      // Clone with the credential carried by THIS command's env only. The
      // token travels by URL (git-over-https needs it there); logs are
      // redacted before leaving the bond, and the env dies with the sandbox.
      const cloneUrl = cloneUrlWithToken(spec.repoUrl, opts.env.GITHUB_TOKEN ?? '')
      const clone = await handle.exec(`git clone --depth 1 ${cloneUrl} ${REPO_DIR}`, {
        env: { GITHUB_TOKEN: opts.env.GITHUB_TOKEN ?? '' },
        timeout: Math.min(180_000, sandboxBudgetMs),
      })
      if (clone.exitCode !== 0) {
        throw new Error(
          `clone failed: ${redact(clone.stderr || clone.stdout, opts.env).slice(0, 300)}`,
        )
      }
      if (spec.baseBranch) {
        const co = await handle.exec(
          `cd ${REPO_DIR} && git fetch --depth 1 origin ${shellQuote(spec.baseBranch)} && git checkout ${shellQuote(spec.baseBranch)}`,
          { env: { GITHUB_TOKEN: opts.env.GITHUB_TOKEN ?? '' }, timeout: 120_000 },
        )
        if (co.exitCode !== 0) {
          throw new Error(
            `checkout ${spec.baseBranch} failed: ${redact(co.stderr, opts.env).slice(0, 200)}`,
          )
        }
      }
      abortCheck()

      // Install the agent CLI at run start, from the egress-allowed npm registry.
      const install = await handle.exec(`npm install -g ${this.defaults.cliPackage}`, {
        timeout: Math.min(300_000, sandboxBudgetMs),
      })
      if (install.exitCode !== 0) {
        throw new Error(`claude CLI install failed: ${redactSecrets(install.stderr).slice(0, 300)}`)
      }
      abortCheck()

      // The task travels by FILE + stdin, never argv, never the environment.
      await handle.writeFile(PROMPT_PATH, spec.instructions)
      const deadlineMs = Math.max(30_000, totalBudgetMs - (Date.now() - started))
      const agent = await handle.exec(
        `cd ${REPO_DIR} && cat ${PROMPT_PATH} | claude -p --output-format json ${spec.model ? modelFlag(spec.model) : modelFlag(this.defaults.defaultModel)} --dangerously-skip-permissions`,
        {
          env: {
            ANTHROPIC_API_KEY: opts.env.ANTHROPIC_API_KEY ?? '',
            GITHUB_TOKEN: opts.env.GITHUB_TOKEN ?? '',
          },
          timeout: deadlineMs,
        },
      )
      abortCheck()

      const cli = parseClaudeJson(agent.stdout)
      log(redact((cli.result ?? agent.stdout).slice(-4000), opts.env))

      // Artifacts, collected INSIDE the sandbox, shipped out as text.
      const stage = await handle.exec(
        `cd ${REPO_DIR} && git add -A && (git diff --cached --stat && git diff --cached)`,
        { timeout: 60_000 },
      )
      const patch = extractPatch(stage.stdout)

      return {
        exitStatus: cli.is_error || agent.exitCode !== 0 ? 'failed' : 'completed',
        patch,
        logs: redact(logs.join('\n'), opts.env),
        usage: firstUsage(cli),
        sandboxId,
        computeMs: Date.now() - started,
      }
    } catch (error) {
      const cancelled = error instanceof CANCELLED
      const timedOut = !cancelled && isTimeoutError(error)
      return {
        exitStatus: cancelled ? 'cancelled' : timedOut ? 'timeout' : 'failed',
        patch: '',
        logs: redact(
          `${logs.join('\n')}\n[agent-run] ${cancelled ? 'cancelled by caller' : timedOut ? 'task budget exhausted' : 'run failed'}: ${error instanceof Error ? error.message : String(error)}`,
          opts.env,
        ),
        sandboxId,
        computeMs: Date.now() - started,
      }
    } finally {
      if (sandboxId) {
        // The destroy failure is tolerated on purpose: the artifact is already
        // out of the sandbox, and E2B pauses the sandbox at its timeout anyway.
        await provider.destroy(sandboxId).catch((_error: unknown) => undefined)
      }
    }
  }
}

/** Internal cancellation marker. */
class CANCELLED extends Error {
  constructor() {
    super('cancelled')
  }
}

/**
 * Redact the run's own secrets FIRST (the token appears inside clone URLs,
 * which generic pattern-matching does not catch), then the generic
 * credential-shaped patterns.
 *
 * @param text - Raw output.
 * @param env - The run's credential env — every VALUE is a secret.
 * @returns Redacted text.
 */
function redact(text: string, env: AgentRunOptions['env']): string {
  let out = text
  for (const value of Object.values(env)) {
    if (value && value.length >= 8) out = out.split(value).join('[REDACTED]')
  }
  return redactSecrets(out)
}

/**
 * Whether the error looks like a timeout.
 *
 * @param error - The error to inspect.
 * @returns True when the message names a timeout.
 */
function isTimeoutError(error: unknown): boolean {
  const m = error instanceof Error ? error.message : String(error)
  return /timed? ?out|timeout|ETIMEDOUT/i.test(m)
}

/**
 * Inject the run's token into an https GitHub URL (git-over-https needs the
 * credential in the URL). Callers MUST redact() any output that can carry it.
 *
 * @param repoUrl - The https repo URL.
 * @param token - The run's GitHub token.
 * @returns The credentialed URL.
 */
function cloneUrlWithToken(repoUrl: string, token: string): string {
  if (!token) return repoUrl
  return repoUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`)
}

/**
 * Quote a shell argument.
 *
 * @param value - Raw value.
 * @returns Single-quoted value.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Map a catalog model id to the CLI's --model flag. Claude CLI accepts
 * `claude-sonnet-5-5` style ids directly.
 *
 * @param model - Catalog model id.
 * @returns The flag, or '' for default.
 */
function modelFlag(model: string): string {
  return model ? `--model ${shellQuote(model)}` : ''
}

/**
 * Parse the CLI's JSON result defensively.
 *
 * @param stdout - Raw CLI stdout.
 * @returns Parsed fields, or {} when the output is not the expected JSON.
 */
function parseClaudeJson(stdout: string): ClaudeJsonResult {
  const start = stdout.indexOf('{')
  if (start === -1) return {}
  try {
    return JSON.parse(stdout.slice(start)) as ClaudeJsonResult
  } catch (_error) {
    // The CLI can print progress lines before the JSON; unparseable output
    // degrades to "no usage reported" rather than failing the run.
    return {}
  }
}

/**
 * First model usage found in the CLI result, normalized to the core's shape.
 *
 * @param cli - Parsed CLI result.
 * @returns Usage when reported.
 */
function firstUsage(cli: ClaudeJsonResult): AgentRunArtifact['usage'] {
  if (cli.modelUsage) {
    const entry = Object.values(cli.modelUsage).find(
      (u) => (u.inputTokens ?? 0) + (u.outputTokens ?? 0) > 0,
    )
    if (entry) {
      return {
        inputTokens: entry.inputTokens ?? 0,
        outputTokens: entry.outputTokens ?? 0,
        cacheReadTokens: entry.cacheReadInputTokens,
        cacheCreationTokens: entry.cacheCreationInputTokens,
      }
    }
  }
  const u = cli.usage
  if (u && (u.input_tokens ?? 0) + (u.output_tokens ?? 0) > 0) {
    return {
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheReadTokens: u.cache_read_input_tokens,
      cacheCreationTokens: u.cache_creation_input_tokens,
    }
  }
  return undefined
}

/**
 * Split `git diff --cached` output into stats + patch body.
 *
 * @param stdout - The staged diff output.
 * @returns Just the unified diff (the stats lines precede the diff header and are dropped).
 */
function extractPatch(stdout: string): string {
  const at = stdout.indexOf('diff --git ')
  // git apply REJECTS a patch whose final line has no trailing newline — keep it.
  return at === -1 ? '' : stdout.slice(at).replace(/\n*$/, '\n')
}

/**
 * Create a Claude Code agent runtime.
 *
 * @param config - CLI package, default model, budgets.
 * @returns An `AgentRuntimeProvider` running the Claude Code CLI in ephemeral sandboxes.
 */
export function createProvider(config?: ClaudeCodeRuntimeConfig): AgentRuntimeProvider {
  return new ClaudeCodeAgentRuntime(config)
}

/** Lazily-initialized provider singleton (uses the bonded sandbox provider). */
let _provider: AgentRuntimeProvider | null = null
/**
 * The provider implementation (wire with the agent-run core's `setProvider`).
 */
export const provider: AgentRuntimeProvider = new Proxy({} as AgentRuntimeProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})

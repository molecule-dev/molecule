/**
 * Claude Code agent runtime — unattended runs in an ephemeral cloud sandbox.
 *
 * One call = one sandbox created for the run and destroyed before the artifact
 * returns. The sandbox holds nothing worth stealing: no platform env, no vault,
 * no project scaffold (created through the sandbox bond's minimal path, never
 * the project env-materialization). Credentials ride only the two exec calls
 * that need them (clone: an in-sandbox GIT_ASKPASS helper; agent: the model
 * key), never the sandbox-wide environment and never a shell-interpolated
 * argv. Caller input (repoUrl, token shape, allowedHosts) is validated before
 * any exec. Egress is deny-by-default where the sandbox can enforce it — a
 * provider that cannot enforce it is REFUSED, not skipped — and the run
 * verifies, not assumes, the policy before any credential arrives. The only
 * return channel is the artifact: a unified diff + credential-redacted logs.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

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

/** The host the egress probe dials to prove deny-by-default (never allowed). */
const EGRESS_CANARY_HOST = 'example.com'

/**
 * The only repo URLs a run may clone. The REST route applies this same gate;
 * the bond is a published package any consumer can call directly, so the gate
 * lives here too — before the URL can reach a shell.
 */
const GITHUB_REPO_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/

/**
 * The GitHub token shapes this runtime accepts: classic (`ghp`/`gho`/`ghu`/
 * `ghs`) and fine-grained (`github_pat`) prefixes followed by at least 20 more
 * token characters. A non-empty value that does not match is refused BEFORE
 * any exec — a malformed credential must never reach the sandbox, and a
 * caller-shaped string must never reach a shell unquoted.
 */
const GITHUB_TOKEN_RE = /^(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}$/

/**
 * A host that may be spliced into the probe's `fetch('https://<host>/')`
 * string literal: bare hostnames only. Validated for EVERY allowlist entry
 * before the probe exec — the host comes from the caller, and a quote or
 * shell metacharacter in it would be code execution inside the sandbox.
 */
const PROBE_HOST_RE = /^[a-z0-9.-]+$/i

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
 * sandbox: EVERY allowed host must connect (any HTTP status counts — the
 * policy question is reachability, not the response; a sample of one would
 * hide a caller-authored entry that silently cannot connect) and a NOT-allowed
 * canary host must fail to connect. Observation, never attestation. Every
 * host is validated by {@link assertProbeSafeHosts} before this runs.
 *
 * @param handle - The run's sandbox.
 * @param allowedHosts - The effective allowlist (validated, deduplicated).
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
  const [canaryReached, ...allowedResults] = await Promise.all([
    probe(EGRESS_CANARY_HOST),
    ...allowedHosts.map(probe),
  ])
  const failedHost = allowedHosts.find((_, i) => !allowedResults[i])
  if (failedHost) {
    throw new Error(
      `Egress pre-flight failed: ${failedHost} is on the run's allowlist but was not reachable — refusing to inject credentials into a sandbox whose network is not what the run assumed.`,
    )
  }
  if (canaryReached) {
    throw new Error(
      `Egress pre-flight failed: ${EGRESS_CANARY_HOST} is NOT on the run's allowlist but was reachable — egress is not deny-by-default. Refusing to inject credentials.`,
    )
  }
}

/**
 * Refuse any allowlist entry that is not a bare hostname (empty, `..`, a path,
 * a quote, shell metacharacters) BEFORE the sandbox exists — such a value in
 * the probe's fetch string is caller-controlled code, not a host.
 *
 * @param hosts - The effective allowlist (runtime + caller entries).
 * @throws {Error} When any entry is not a bare hostname.
 */
function assertProbeSafeHosts(hosts: string[]): void {
  for (const host of hosts) {
    if (!PROBE_HOST_RE.test(host) || host.includes('..')) {
      throw new Error(
        `allowedHosts entry ${JSON.stringify(host.slice(0, 100))} is not a bare hostname — refusing the run before it can reach the egress probe.`,
      )
    }
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
      // PINNED EXACTLY (audit 2026-10-04, supply chain): `@latest` let npm's
      // choice of the day ship whatever code into the run sandbox. The pin's
      // postinstall (`node install.cjs`) materializes the native `claude`
      // binary the `bin` field points at, so `--ignore-scripts` would leave
      // NO working CLI — lifecycle scripts stay enabled and the version is
      // pinned instead. Bump deliberately, after verifying the release.
      cliPackage: config.cliPackage ?? '@anthropic-ai/claude-code@2.1.289',
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

      // Caller input is validated BEFORE any sandbox or exec exists (M-1):
      // the REST route applies this gate, but the bond is a published package
      // any consumer can call directly, and every one of these values would
      // otherwise reach a shell command inside the sandbox.
      if (!GITHUB_REPO_URL_RE.test(spec.repoUrl)) {
        throw new Error(
          `repoUrl must be an https GitHub repo URL (https://github.com/owner/repo), got: ${JSON.stringify(spec.repoUrl.slice(0, 100))}`,
        )
      }
      if (opts.env.GITHUB_TOKEN && !GITHUB_TOKEN_RE.test(opts.env.GITHUB_TOKEN)) {
        throw new Error(
          'GITHUB_TOKEN does not look like a GitHub token (expected ghp_/gho_/ghu_/ghs_/github_pat_ followed by at least 20 more characters) — refusing the run rather than placing a malformed credential into the sandbox.',
        )
      }
      assertProbeSafeHosts(allowOut)

      const handle: NetworkCapableSandbox = await provider.create({
        // NOT a project id: no env-materialization, no scaffold, no vault —
        // the sandbox boots from the bare template and stays bare.
        projectId: `agent-run-${Date.now().toString(36)}`,
        env: {},
        labels: { 'molecule.agent-run': '1' },
      })
      sandboxId = handle.id

      // Egress policy + OBSERVED proof of it, before any credential exists
      // here. A provider that cannot enforce a per-run policy is refused
      // outright (M-3): an unimplemented capability is `inconclusive`, never
      // safe, and this run is about to hold live credentials.
      if (typeof handle.applyNetwork !== 'function') {
        throw new Error('sandbox provider cannot enforce per-run egress; refusing agent run')
      }
      await handle.applyNetwork(allowOut)
      await assertEgress(handle, allowOut)
      abortCheck()

      // Clone with the credential carried by an in-sandbox GIT_ASKPASS helper
      // (M-1, the house pattern from audit H-3 2026-09-17): git answers its
      // credential prompt by executing the helper, so the token never rides
      // the clone URL or the git argv. The helper is staged at an unguessable
      // 0700 path (base64-delivered, so the token is not plaintext in the
      // staging argv either), used for the clone + branch fetch, and removed
      // before the agent starts. Logs are redacted before leaving the bond.
      const token = opts.env.GITHUB_TOKEN ?? ''
      const askpass = token ? buildAskpassHelper(token) : null
      const gitEnvPrefix = askpass
        ? `GIT_ASKPASS=${shellQuote(askpass.path)} GIT_TERMINAL_PROMPT=0 `
        : ''
      if (askpass) {
        const staged = await handle.exec(askpass.stageCommand, { timeout: 5_000 })
        if (staged.exitCode !== 0) {
          throw new Error('failed to stage the git credential helper inside the sandbox')
        }
      }
      try {
        const clone = await handle.exec(
          `${gitEnvPrefix}git clone --depth 1 ${shellQuote(spec.repoUrl)} ${REPO_DIR}`,
          { timeout: Math.min(180_000, sandboxBudgetMs) },
        )
        if (clone.exitCode !== 0) {
          throw new Error(
            `clone failed: ${redact(clone.stderr || clone.stdout, opts.env).slice(0, 300)}`,
          )
        }
        if (spec.baseBranch) {
          const co = await handle.exec(
            `cd ${REPO_DIR} && ${gitEnvPrefix}git fetch --depth 1 origin ${shellQuote(spec.baseBranch)} && git checkout ${shellQuote(spec.baseBranch)}`,
            { timeout: 120_000 },
          )
          if (co.exitCode !== 0) {
            throw new Error(
              `checkout ${spec.baseBranch} failed: ${redact(co.stderr, opts.env).slice(0, 200)}`,
            )
          }
        }
      } finally {
        if (askpass) {
          await handle
            .exec(askpass.cleanupCommand, { timeout: 5_000 })
            .catch((_error: unknown) => undefined)
        }
      }
      abortCheck()

      // Install the agent CLI at run start, from the egress-allowed npm
      // registry. The package spec is quoted — it is config, not shell syntax.
      const install = await handle.exec(`npm install -g ${shellQuote(this.defaults.cliPackage)}`, {
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
          // WHITELISTED env: only these keys reach the CLI — an arbitrary
          // opts.env key (or anything the orchestrator adds later) does not
          // pass through by itself. ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN
          // are the CLI's documented key-alternative auth variables, so they
          // pass through ONLY when the caller supplied them.
          env: {
            ANTHROPIC_API_KEY: opts.env.ANTHROPIC_API_KEY ?? '',
            ...(opts.env.ANTHROPIC_BASE_URL
              ? { ANTHROPIC_BASE_URL: opts.env.ANTHROPIC_BASE_URL }
              : {}),
            ...(opts.env.ANTHROPIC_AUTH_TOKEN
              ? { ANTHROPIC_AUTH_TOKEN: opts.env.ANTHROPIC_AUTH_TOKEN }
              : {}),
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

/** The basic-auth username git prompts for against an https GitHub remote. */
const GIT_TOKEN_USERNAME = 'x-access-token'

/** The in-sandbox credential helper spec (staged → used → removed). */
interface AskpassHelper {
  /** Unguessable in-sandbox path (128 bits of random hex — never derived from ids). */
  path: string
  /** Writes the helper + chmod 700. The base64 payload CONTAINS the token — exec it, never log it. */
  stageCommand: string
  /** Idempotent removal. */
  cleanupCommand: string
}

/**
 * Build an in-sandbox `GIT_ASKPASS` helper carrying the run's GitHub token
 * (M-1, audit 2026-10-04; the house pattern from audit H-3 2026-09-17). Git
 * invokes the helper to answer its credential prompts, so the token NEVER
 * appears in the clone URL or the git argv — argv is visible to every process
 * list a concurrent process in the sandbox can read. The script is delivered
 * base64-encoded so the token is not plaintext in the staging exec's
 * (sub-second) argv either.
 *
 * @param token - The run's GitHub token (validated by the caller).
 * @returns The helper spec: stage before the git command, remove after.
 */
function buildAskpassHelper(token: string): AskpassHelper {
  const path = `/tmp/.mol-git-askpass-${randomBytes(16).toString('hex')}`
  const script = [
    '#!/bin/sh',
    'case "$1" in',
    `  Username*) printf %s ${shellQuote(GIT_TOKEN_USERNAME)} ;;`,
    `  *) printf %s ${shellQuote(token)} ;;`,
    'esac',
    '',
  ].join('\n')
  const b64 = Buffer.from(script, 'utf8').toString('base64')
  return {
    path,
    stageCommand: `printf %s '${b64}' | base64 -d > ${path} && chmod 700 ${path}`,
    cleanupCommand: `rm -f ${path}`,
  }
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

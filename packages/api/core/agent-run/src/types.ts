/**
 * Agent run type definitions.
 *
 * Defines the abstract contract for running a coding agent UNATTENDED in an
 * ephemeral, isolated environment. Bond a concrete runtime — a cloud sandbox
 * running the Claude Code CLI (`@molecule/api-agent-runtime-claude-code`),
 * later other CLIs — to enable agent runs in your application.
 *
 * @module
 */

/**
 * The task an agent runtime executes in its isolated environment.
 *
 * Everything here is TASK material. Credentials are NOT part of the spec —
 * they travel separately ({@link AgentRunOptions.env}) so the caller can keep
 * them out of any store that persists specs, and inject them per run.
 */
export interface AgentRunSpec {
  /** The repository to clone and work in, as an https URL. The credential authorizes it. */
  repoUrl: string
  /** Branch to check out before the agent starts. Default: the repo's default branch. */
  baseBranch?: string
  /** What the agent should do, in plain language the CLI's model can act on. */
  instructions: string
  /**
   * Hard wall-clock budget for the WHOLE run (clone → agent → artifact), in
   * milliseconds. The runtime cancels the work at the deadline; default 600000
   * (10 minutes). The credential's TTL should be about this long.
   */
  timeoutMs?: number
  /**
   * Egress allowlist for the run, as hostnames. Enforced deny-by-default when
   * the runtime's sandbox supports network policy. The runtime ALWAYS adds the
   * hosts its own tooling needs (the model API, github.com, the npm registry) —
   * this list is for task-specific extras.
   */
  allowedHosts?: string[]
  /** Model id the CLI runs on. Interpreted by the runtime; default is its own. */
  model?: string
}

/**
 * Per-run credentials and machine material, injected into the isolated
 * environment and destroyed with it.
 *
 * Deliberately separate from {@link AgentRunSpec}: the spec is storable and
 * loggable, this is not. Least scope is the CALLER's duty — a GitHub
 * fine-grained token scoped to the ONE repo with contents:read/write and an
 * expiry ≈ {@link AgentRunSpec.timeoutMs}, never an account-wide token.
 */
export interface AgentRunOptions {
  /** Environment variables the agent's process sees (tokens, keys). Never logged. */
  env: Record<string, string>
  /** Reports streaming log output. Implementations must not block it. */
  onLog?: (line: string) => void
  /** Cooperative cancellation: polled between phases, checked at the deadline. */
  signal?: AbortSignal
}

/**
 * Token usage the agent's model reported, for cost metering.
 */
export interface AgentRunUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
}

/**
 * What a completed run hands back. ARTIFACTS ONLY — the isolated environment
 * itself (and every credential in it) is destroyed before this reaches the
 * caller, and the runtime redacts anything credential-shaped from logs.
 */
export interface AgentRunArtifact {
  /** Whether the agent CLI exited successfully. */
  exitStatus: 'completed' | 'failed' | 'cancelled' | 'timeout'
  /** Unified diff of every change the agent left in the working tree. May be empty. */
  patch: string
  /** The agent CLI's output, credential-redacted. */
  logs: string
  /** Model token usage the CLI reported, when it reports usage. */
  usage?: AgentRunUsage
  /** The isolated environment's provider id, for audit — destroyed before return. */
  sandboxId?: string
  /** Wall-clock milliseconds the run held its sandbox. */
  computeMs?: number
}

/**
 * Agent runtime provider interface.
 *
 * Implement this in a bond package: provision an ISOLATED environment (an
 * ephemeral cloud sandbox — never a long-lived host), install the agent CLI at
 * run start, run the task, and return artifacts. The implementer owns the
 * environment's lifetime: created for the run, destroyed before the artifact
 * is returned.
 */
export interface AgentRuntimeProvider {
  /** Runtime name (e.g. 'claude-code'). */
  readonly name: string

  /**
   * Execute one unattended agent run.
   *
   * @param spec - The task (repo, instructions, budget).
   * @param opts - Per-run credentials, log sink, cancellation.
   * @returns The artifacts: patch, redacted logs, usage, cost facts.
   */
  run(spec: AgentRunSpec, opts: AgentRunOptions): Promise<AgentRunArtifact>
}

/**
 * Configuration for the agent runtime provider.
 */
export interface AgentRunConfig {
  /** Default wall-clock budget when a spec passes none, in milliseconds. */
  timeoutMs?: number
}

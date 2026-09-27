/**
 * Claude Code agent runtime for molecule.dev.
 *
 * Runs the Claude Code CLI unattended inside an EPHEMERAL cloud sandbox that
 * is created for the run and destroyed before the artifact returns — the
 * sandbox holds nothing worth stealing, so a full-permission agent plus a
 * prompt injection leaks nothing.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-agent-run'
 * import { provider as claudeCode } from '@molecule/api-agent-runtime-claude-code'
 *
 * setProvider(claudeCode)
 *
 * const artifact = await requireProvider().run(
 *   {
 *     repoUrl: 'https://github.com/acme/widgets',
 *     instructions: 'Fix the failing test in src/math.test.ts.',
 *     timeoutMs: 600_000,
 *   },
 *   {
 *     env: {
 *       GITHUB_TOKEN: fineGrainedToken,     // ONE repo, contents:read/write, TTL ≈ timeout
 *       ANTHROPIC_API_KEY: platformKey,
 *     },
 *     onLog: (line) => process.stdout.write(line + '\n'),
 *   },
 * )
 * if (artifact.patch) {
 *   // HOST-side apply: scan, review, then git apply — never trust the sandbox.
 * }
 * ```
 *
 * @remarks
 * - **Isolation contract (enforced here, not aspirational):** the sandbox is
 *   created through the code-sandbox bond's MINIMAL path — no platform env, no
 *   vault, no project scaffold; credentials ride ONLY the exec calls that need
 *   them (clone, agent); egress is deny-by-default where the sandbox supports
 *   network policy and is PROBED before any credential is injected (an allowed
 *   host must connect, a non-allowed host must not — otherwise the run is
 *   refused); the sandbox is destroyed on every exit path before the artifact
 *   is returned.
 * - **Credentials are the caller's responsibility to scope.** Pass a GitHub
 *   FINE-GRAINED token scoped to the ONE repo with contents:read/write and an
 *   expiry ≈ `timeoutMs`. An account-wide token turns the isolation into
 *   theater.
 * - **The artifact is the only return channel**: a unified diff (`patch`) and
 *   redacted `logs`. The host applies the patch — scan it for secrets first
 *   (the runtime redacts its own credential values and generic secret shapes,
 *   but the AGENT can invent new secrets: scan host-side).
 * - **The Claude Code CLI is installed at run start** from the npm registry
 *   (`@anthropic-ai/claude-code@latest` by default) — nothing agent-shaped
 *   persists between runs.
 * - `ANTHROPIC_API_KEY` must be in `opts.env` — the model API is called from
 *   the sandbox with the run's key, which is why the egress allowlist always
 *   includes `api.anthropic.com`.
 * - Cancellation is cooperative: a signalled abort destroys the sandbox at the
 *   next phase boundary and the artifact reports `exitStatus: 'cancelled'`.
 *   The task budget (`timeoutMs`) reports `'timeout'`.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

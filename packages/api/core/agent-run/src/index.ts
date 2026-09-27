/**
 * Agent run core interface for molecule.dev.
 *
 * Defines the abstract contract for running a coding agent UNATTENDED in an
 * ephemeral, isolated environment — an ephemeral cloud sandbox that holds
 * nothing worth stealing, so even a full-permission agent plus a prompt
 * injection leaks nothing. Bond a concrete runtime
 * (`@molecule/api-agent-runtime-claude-code`) to enable agent runs.
 *
 * @module
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
 *       GITHUB_TOKEN: fineGrainedTokenScopedToThisRepo, // contents:read/write, TTL ≈ timeout
 *       ANTHROPIC_API_KEY: platformKey,
 *     },
 *     onLog: (line) => logStream.write(line),
 *   },
 * )
 * // artifact.patch is a unified diff. The CALLER (never the sandbox) applies it.
 * ```
 *
 * @remarks
 * - **The containment model is the contract.** The runtime MUST run each run
 *   in an environment created for it and destroyed before the artifact
 *   returns; MUST inject credentials only through the run's environment and
 *   only for the run's lifetime; MUST redact credential-shaped text from
 *   logs; and MUST return ARTIFACTS ONLY (a patch + logs) — never a shell,
 *   never filesystem access, never the environment itself.
 * - **Least scope is the CALLER's duty.** The runtime cannot validate that a
 *   GitHub token is scoped to one repo or TTL'd to the task — pass a
 *   fine-grained token scoped to the ONE repo with contents:read/write and an
 *   expiry ≈ `timeoutMs`. An account-wide or org-wide token turns the
 *   isolation into theater.
 * - **The host keeps apply authority.** Callers should treat `patch` as
 *   untrusted content: scan it for secrets, review it, and apply it host-side
 *   (the runtime bond never pushes to the repo itself unless the caller
 *   explicitly supplies push-capable credentials AND asks for it — the
 *   default contract is patch-only).
 * - **Egress is deny-by-default where the sandbox can enforce it.** The
 *   runtime always allows the hosts its own tooling needs (the model API,
 *   github.com, the npm registry) plus the spec's `allowedHosts`; everything
 *   else is denied when the sandbox supports network policy.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

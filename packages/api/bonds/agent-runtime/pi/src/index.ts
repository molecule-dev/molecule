/**
 * Pi coding-agent runtime for molecule.dev.
 *
 * Runs Pi (`@earendil-works/pi-coding-agent`, MIT) unattended inside an
 * EPHEMERAL cloud sandbox that is created for the run and destroyed before the
 * artifact returns. Pi is provider-neutral, so one runtime runs any catalog
 * model whose provider Pi supports — Anthropic, OpenAI, Google, xAI, DeepSeek,
 * Moonshot, MiniMax, OpenRouter — on that provider's own key and price.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-agent-run'
 * import { provider as pi } from '@molecule/api-agent-runtime-pi'
 *
 * setProvider(pi)
 *
 * const artifact = await requireProvider().run(
 *   {
 *     repoUrl: 'https://github.com/acme/widgets',
 *     instructions: 'Fix the failing test in src/math.test.ts.',
 *     model: 'deepseek-v4-pro',          // catalog id → deepseek/deepseek-v4-pro
 *     timeoutMs: 600_000,
 *   },
 *   {
 *     env: {
 *       GITHUB_TOKEN: fineGrainedToken,    // ONE repo, contents:read/write, TTL ≈ timeout
 *       DEEPSEEK_API_KEY: platformKey,     // the key of the model's provider
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
 * - **Isolation contract (same as the Claude Code runtime):** the sandbox is
 *   created through the code-sandbox bond's MINIMAL path; credentials ride
 *   ONLY the exec calls that need them — the GitHub token the clone, the
 *   model provider's key the agent; egress is deny-by-default where the
 *   sandbox supports network policy and is PROBED before any credential is
 *   injected; the sandbox is destroyed on every exit path. Never run Pi on the
 *   API host: it has no permission prompts and no sandbox of its own.
 * - **Pass the model provider's key under Pi's env var name** —
 *   `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`,
 *   `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `MINIMAX_API_KEY` or
 *   `OPENROUTER_API_KEY`. A missing key fails the run before any sandbox is
 *   created. Only that one key enters the agent's environment.
 * - **Models are resolved to a fully qualified Pi `provider/id`.** Pi's
 *   `--model` fuzzy-matches, so a bare id could silently pick another model.
 *   Catalog ids in `DEFAULT_MODEL_MAP` are mapped; anything else must be
 *   passed as `provider/id` (e.g. `openrouter/qwen/qwen3-coder`) or added via
 *   `createProvider({ modelMap })` — an unmapped bare id is refused. Pi's
 *   thinking suffix works too (`anthropic/claude-opus-5-5:high`). The run is
 *   marked `failed` if Pi reports that a different model answered.
 * - **Pi's exit code does not mean success.** In `--mode json` a failed or
 *   aborted model call still exits 0, so `exitStatus` comes from the event
 *   stream: the last assistant `stopReason` (`error` → `failed`, `aborted` →
 *   `cancelled`), a retry sequence that gave up (`failed`), and the stream
 *   ending before `agent_settled` (`failed`, or `timeout` at the deadline).
 * - **Project-local Pi files are ignored by default** (`--no-approve`): a
 *   repo's `.pi/settings.json`, `.pi/mcp.json`, `.pi/extensions` and
 *   `.pi/SYSTEM.md` do not load. `createProvider({ approveProjectFiles: true })`
 *   loads them — repo-supplied extensions are executable code, so enable it
 *   only for repositories you trust. `AGENTS.md` / `CLAUDE.md` always load.
 * - **No background network calls**: the CLI runs with `--offline`,
 *   `PI_SKIP_VERSION_CHECK=1` and `PI_TELEMETRY=0`, so the egress allowlist is
 *   just the model provider's API host, GitHub and the npm registry — never
 *   add `pi.dev`.
 * - The CLI is installed at run start, pinned EXACTLY
 *   (`@earendil-works/pi-coding-agent@1.0.0`, with `--ignore-scripts`); its
 *   transitive dependencies are not pinned by npm. The sandbox image needs
 *   Node.js ≥ 22.19 — the run fails with that message otherwise.
 * - Default tools are `read`, `bash`, `edit`, `write` — no `grep`/`find`/`ls`
 *   (the model searches with `bash`). Pass
 *   `createProvider({ tools: ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'] })`
 *   to add them. Pi has no sub-agents and no plan mode.
 * - `usage` sums every assistant response plus context-compaction summaries
 *   (Pi compacts long runs automatically, and those calls are billed too).
 * - Cancellation is cooperative: a signalled abort destroys the sandbox at the
 *   next phase boundary and the artifact reports `exitStatus: 'cancelled'`.
 *
 * @module
 */
export * from './browser-guard.js'
export * from './events.js'
export * from './models.js'
export * from './provider.js'
export * from './types.js'

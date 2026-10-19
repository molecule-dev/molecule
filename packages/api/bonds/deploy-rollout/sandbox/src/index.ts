/**
 * Sandbox provider bond for the deploy-rollout core.
 *
 * One adapter over `@molecule/api-code-sandbox`, so E2B, Docker and Fly sandboxes
 * share one rolling-deploy implementation. The deploy supplies its launch recipe and
 * readiness gate; the bond supplies the lifecycle.
 *
 * @example
 * ```typescript
 * import { runRollout, setProvider } from '@molecule/api-deploy-rollout'
 * import { provider } from '@molecule/api-deploy-rollout-default'
 * import { createSandboxInstanceProvider } from '@molecule/api-deploy-rollout-sandbox'
 *
 * setProvider(provider)
 * await runRollout({
 *   provider: createSandboxInstanceProvider({
 *     provider: sandboxProvider,
 *     launch: (index) => launchReplica(index),
 *     join: (instance) => upsertUpstream(instance.upstreamUrl ?? ''),
 *   }),
 *   current: oldInstances,
 *   policy: { replicas: 2 },
 * })
 * ```
 *
 * @remarks
 * - **The launch recipe stays the deploy's.** Building, copying and booting an app
 *   inside a sandbox is app knowledge; this bond never guesses it.
 * - **Readiness falls back.** `/health/ready` first, `/health` on 404/405, so an app
 *   scaffolded before the lifecycle bond still gates correctly.
 * - **Drain is a SIGTERM**, bounded, through the sandbox's own exec channel.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './sandbox.js'

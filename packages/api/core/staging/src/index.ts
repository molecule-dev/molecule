/**
 * Staging environment management core interface for molecule.dev.
 *
 * Defines the abstract `StagingDriver` interface for ephemeral branch-per-feature
 * environments. Driver packages (e.g. `@molecule/api-staging-docker-compose`)
 * implement this interface. The CLI orchestrates lifecycle operations.
 *
 * @example
 * ```typescript
 * import { branchToSlug, getProvider, setProvider } from '@molecule/api-staging'
 * import type { StagingDriverConfig, StagingEnvironment } from '@molecule/api-staging'
 * import { provider } from '@molecule/api-staging-docker-compose'
 *
 * // Startup: bond the driver. getProvider() returns null (it does NOT throw) when unbonded.
 * setProvider(provider)
 * const driver = getProvider()
 * if (!driver) throw new Error('No staging driver bonded')
 *
 * const prerequisites = await driver.checkPrerequisites()
 * if (!prerequisites.met) throw new Error(`Missing: ${prerequisites.missing.join(', ')}`)
 *
 * const branch = 'feature/login-form'
 * const slug = branchToSlug(branch) // 'feature-login-form' — never pass a raw branch name
 * const env: StagingEnvironment = {
 *   slug,
 *   branch,
 *   type: 'staging',
 *   name: `staging-${slug}`,
 *   createdAt: new Date().toISOString(),
 *   driver: driver.name,
 * }
 * const config: StagingDriverConfig = { name: 'my-app', projectPath: process.cwd() }
 *
 * const urls = await driver.up(env, config)
 * console.log(`API: ${urls.api}, App: ${urls.app}`)
 *
 * const health = await driver.health(env, config) // { healthy, api: { status }, app: { status } }
 * await driver.down(env, config) // tear down containers + this env's generated files
 * ```
 *
 * @remarks
 * - `getProvider()` returns `null` when no driver is bonded — it does not throw. Check it.
 * - Build `env.slug` with `branchToSlug(branch)`: drivers reject slugs outside `[a-z0-9-]`
 *   (a raw `feature/x` branch name throws).
 * - This core does NOT persist environments or allocate ports — the `mlcl stage` CLI (and
 *   `@molecule/api-staging-state`) does. Calling `driver.up()` directly lets the driver pick
 *   ports itself.
 * - `health()` never throws for a missing environment; it reports `healthy: false`.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Slugify utility
export * from './slugify.js'

// Provider exports
export * from './provider.js'

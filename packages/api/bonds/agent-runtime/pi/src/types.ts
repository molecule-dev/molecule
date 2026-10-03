/**
 * Configuration types for the Pi agent runtime.
 *
 * @module
 */

import type { AgentRunConfig } from '@molecule/api-agent-run'

/**
 * How the sandbox reaches one Pi model provider: the environment variable Pi
 * reads its key from, and the API host the egress allowlist must open.
 */
export interface PiProviderAccess {
  /** Environment variable Pi reads the provider's key from, e.g. `ANTHROPIC_API_KEY`. */
  keyEnv: string
  /** API hostname Pi calls for this provider, e.g. `api.anthropic.com`. */
  host: string
}

/**
 * Options for {@link createProvider}.
 */
export interface PiRuntimeConfig extends AgentRunConfig {
  /**
   * npm package spec for the Pi CLI, installed at run start from the
   * egress-allowed npm registry. Always an EXACT version. Default
   * `@earendil-works/pi-coding-agent@1.0.0`.
   */
  cliPackage?: string
  /**
   * Model used when a spec names none. A catalog id (`claude-sonnet-5-5`) found
   * in the model map, or a fully qualified Pi `provider/id`. Default
   * `claude-sonnet-5-5`.
   */
  defaultModel?: string
  /**
   * Extra entries for the catalog-id → Pi `provider/id` map, merged over
   * {@link DEFAULT_MODEL_MAP}.
   */
  modelMap?: Record<string, string>
  /**
   * Extra Pi providers (or overrides), merged over {@link PI_PROVIDERS}. A run
   * on a provider found in neither is refused before any sandbox is created.
   */
  providers?: Record<string, PiProviderAccess>
  /**
   * Trust the repository's project-local Pi files (`.pi/settings.json`,
   * `.pi/mcp.json`, `.pi/extensions`, `.pi/SYSTEM.md`, project skills) for the
   * run — `--approve` instead of the default `--no-approve`. Repo-supplied
   * extensions are executable code; enable only for repositories you trust.
   * Default false.
   */
  approveProjectFiles?: boolean
  /**
   * Tool selection passed as `--tools`. Default: Pi's own default
   * (`read`, `bash`, `edit`, `write`).
   */
  tools?: string[]
  /**
   * Extra seconds granted to the ENVIRONMENT beyond the task budget — the
   * clone + CLI install happen before the agent starts, and the artifact
   * collection happens after. Default 240000 (4 minutes).
   */
  setupSlackMs?: number
}

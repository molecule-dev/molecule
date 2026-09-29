/**
 * Configuration types for the Claude Code agent runtime.
 *
 * @module
 */

import type { AgentRunConfig } from '@molecule/api-agent-run'

/**
 * Options for {@link createProvider}.
 */
export interface ClaudeCodeRuntimeConfig extends AgentRunConfig {
  /**
   * npm package spec for the Claude Code CLI, installed at run start from the
   * egress-allowed npm registry. Default `@anthropic-ai/claude-code@latest`.
   */
  cliPackage?: string
  /**
   * Model id passed to the CLI when a spec names none. This is a CATALOG id
   * (`claude-sonnet-5-5`); the runtime maps catalog ids to the CLI's model
   * argument. Default `claude-sonnet-5-5`.
   */
  defaultModel?: string
  /**
   * Extra seconds granted to the ENVIRONMENT beyond the task budget — the
   * clone + CLI install happen before the agent starts, and the artifact
   * collection happens after. Default 240000 (4 minutes).
   */
  setupSlackMs?: number
}

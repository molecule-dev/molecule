/**
 * Shared AI agent tools with backend abstraction.
 *
 * Provides a unified tool set that works with both Docker sandboxes (Synthase)
 * and local filesystems (polish pipeline, CLI tools).
 *
 * @example
 * ```typescript
 * import { buildTools, createLocalBackend, buildAgentPrompt } from '@molecule/api-ai-tools'
 *
 * const backend = createLocalBackend('/path/to/project')
 * const tools = buildTools(backend, { include: ['read_file', 'write_file', 'edit_file', 'search_files', 'exec_command'] })
 * const systemPrompt = buildAgentPrompt({ agentName: 'My Agent', projectRoot: '/path/to/project', tools: tools.map(t => t.name) })
 * ```
 *
 * @module
 */

export * from './backends/local.js'
export * from './backends/sandbox.js'
export * from './schemas.js'
export * from './system-prompt.js'
export * from './tools.js'
export * from './types.js'
export * from './utilities.js'

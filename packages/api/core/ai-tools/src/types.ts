/**
 * Core types for the shared AI agent tool system.
 *
 * @module
 */

/**
 * Abstraction over the execution environment.
 * Implemented by SandboxBackend (Docker) and LocalBackend (host filesystem).
 */
export interface ExecutionBackend {
  /** The root directory for all operations (e.g. '/workspace' or '/Users/.../project'). */
  readonly projectRoot: string

  /** Read a file's content as UTF-8 string. */
  readFile(path: string): Promise<string>

  /** Write content to a file. Creates parent directories as needed. */
  writeFile(path: string, content: string): Promise<void>

  /** Delete a file. */
  deleteFile(path: string): Promise<void>

  /** List entries in a directory. */
  readDir(path: string): Promise<Array<{ name: string; type: 'file' | 'directory' }>>

  /**
   * Run a shell command. Returns stdout, stderr, and exit code.
   * Backends implement this safely (sandbox.exec for Docker, execFile for local).
   */
  run(
    command: string,
    opts?: { cwd?: string; timeout?: number },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

/**
 * Configuration for building the tool set.
 * Allows consumers to customize security, callbacks, and tool selection.
 */
export interface ToolBuildConfig {
  /** Which tools to include. Defaults to all. */
  include?: string[]

  /** Which tools to exclude. Applied after include. */
  exclude?: string[]

  /** Whether to validate paths stay within projectRoot. Default: true. */
  pathGuards?: boolean

  /** Whether to check symlinks resolve within projectRoot. Default: false (sandbox-only). */
  symlinkGuards?: boolean

  /** Whether to redact secrets in file reads and command output. Default: true. */
  redactSecrets?: boolean

  /** Whether to block dangerous shell commands (env dumps, /proc access). Default: false. */
  blockDangerousCommands?: boolean

  /** Post-write hook (e.g. auto-format via Prettier/ESLint). Called after every write_file/edit_file. */
  onAfterWrite?: (path: string) => Promise<void>

  /** Diff tracking callback. Called before writes with old/new content. */
  onFileDiff?: (event: FileDiffEvent) => void

  /** Structural change callback. Called on create_directory, delete_file, rename_file. */
  onFileChange?: (event: FileChangeEvent) => void
}

/**
 * Payload emitted when a tracked file changes contents.
 */
export interface FileDiffEvent {
  path: string
  oldContent: string | null
  newContent: string
}

/**
 * Payload emitted when a file is created, modified, or deleted structurally.
 */
export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted'
  path: string
}

/** Metadata for a discovered skill (used in PromptContext). */
export interface SkillEntry {
  /** Skill name. */
  name: string
  /** Short description. */
  description: string
  /** Relative path to the SKILL.md file. */
  path: string
}

/**
 * Context for building a composable system prompt.
 */
export interface PromptContext {
  /** Agent identity (e.g. 'Synthase', 'Polish Agent'). */
  agentName: string

  /** Project root path. */
  projectRoot: string

  /** Names of available tools (for the tool listing section). */
  tools: string[]

  /** Project-specific rules (AGENTS.md or CLAUDE.md content). */
  projectDocs?: string

  /** Additional skill/reference content to inject. */
  skills?: string[]

  /** Discovered skills to list in the prompt (use load_skill to read on demand). */
  discoveredSkills?: SkillEntry[]

  /** Custom sections to append to the prompt. */
  customSections?: string[]
}

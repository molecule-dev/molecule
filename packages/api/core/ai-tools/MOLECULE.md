# @molecule/api-ai-tools

Shared AI agent tools with backend abstraction.

Provides a unified tool set that works with both Docker sandboxes (Synthase)
and local filesystems (polish pipeline, CLI tools).

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-tools
```

## Usage

```typescript
import { buildTools, createLocalBackend, buildAgentPrompt } from '@molecule/api-ai-tools'

const backend = createLocalBackend('/path/to/project')
const tools = buildTools(backend, { include: ['read_file', 'write_file', 'edit_file', 'search_files', 'exec_command'] })
const systemPrompt = buildAgentPrompt({ agentName: 'My Agent', projectRoot: '/path/to/project', tools: tools.map(t => t.name) })
```

## API

### Interfaces

#### `ExecutionBackend`

Abstraction over the execution environment.
Implemented by SandboxBackend (Docker) and LocalBackend (host filesystem).

```typescript
interface ExecutionBackend {
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

  /** Run a shell command. Returns stdout, stderr, and exit code.
   * Backends implement this safely (sandbox.exec for Docker, execFile for local). */
  run(
    command: string,
    opts?: { cwd?: string; timeout?: number },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>
}
```

#### `FileChangeEvent`

```typescript
interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted'
  path: string
}
```

#### `FileDiffEvent`

```typescript
interface FileDiffEvent {
  path: string
  oldContent: string | null
  newContent: string
}
```

#### `PromptContext`

Context for building a composable system prompt.

```typescript
interface PromptContext {
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
```

#### `SkillEntry`

Metadata for a discovered skill (used in PromptContext).

```typescript
interface SkillEntry {
  /** Skill name. */
  name: string
  /** Short description. */
  description: string
  /** Relative path to the SKILL.md file. */
  path: string
}
```

#### `ToolBuildConfig`

Configuration for building the tool set.
Allows consumers to customize security, callbacks, and tool selection.

```typescript
interface ToolBuildConfig {
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
```

#### `ToolSchema`

```typescript
interface ToolSchema {
  name: string
  description: string
  parameters: JSONSchema
}
```

### Types

#### `DiscoveredSkill` *(deprecated)*

Re-export SkillEntry as DiscoveredSkill for backwards compatibility.

```typescript
type DiscoveredSkill = SkillEntry
```

### Functions

#### `buildAgentPrompt(ctx)`

Build a coding-focused system prompt from composable sections.

Returns a string that includes:
- Agent identity
- Available tools listing
- Coding best practices
- Tool argument formatting guidance
- Project docs (if provided)
- Discovered skills listing (if provided)
- Inline skills (if provided)
- Custom sections (if provided)

```typescript
function buildAgentPrompt(ctx: PromptContext): string
```

#### `buildTools(backend, config)`

Build a complete set of AI agent tools bound to an execution backend.

```typescript
function buildTools(backend: ExecutionBackend, config?: ToolBuildConfig): AITool[]
```

- `backend` — The execution environment (sandbox or local filesystem)
- `config` — Optional configuration for security, callbacks, and tool selection

**Returns:** Array of AITool objects ready to pass to an AI provider

#### `checkBlockedCommand(command)`

Check if a command is blocked for security reasons. Returns error message or null if allowed.

```typescript
function checkBlockedCommand(command: string): string | null
```

#### `createLocalBackend(projectRoot)`

Create an ExecutionBackend that operates on the local filesystem.

```typescript
function createLocalBackend(projectRoot: string): ExecutionBackend
```

- `projectRoot` — Absolute path to the project root directory

#### `createSandboxBackend(sandbox, projectRoot)`

Create an ExecutionBackend that delegates to a Docker sandbox instance.
The sandbox.exec method is inherently safe — it runs inside an isolated Docker container.

```typescript
function createSandboxBackend(sandbox: SandboxLike, projectRoot?: string): ExecutionBackend
```

- `sandbox` — A running Sandbox instance from
- `projectRoot` — Root directory inside the sandbox (default: '/workspace')

#### `discoverSkills(backend)`

Discover skills from a project directory.

Scans `.agents/skills/` and `.claude/skills/` for SKILL.md files.
Reads the YAML frontmatter of each to extract `name:` and `description:` fields.

```typescript
function discoverSkills(backend: ExecutionBackend): Promise<SkillEntry[]>
```

- `backend` — Execution backend to use for filesystem access

**Returns:** Array of discovered skills with name, description, and path

#### `isValidGlob(pattern)`

Validate that a glob/include pattern is safe (no shell metacharacters).
Only allows alphanumeric, *, ?, ., _, -, / characters.

```typescript
function isValidGlob(pattern: string): boolean
```

#### `redactSecrets(s)`

Redact values of common secret/credential patterns in text output.

```typescript
function redactSecrets(s: string): string
```

#### `resolvePath(path, projectRoot)`

Normalize a path to be absolute within the project root.
Empty string and '/' both resolve to projectRoot.
Rejects paths that escape via traversal or absolute paths outside root.

```typescript
function resolvePath(path: string, projectRoot: string): string
```

#### `shellQuote(s)`

Shell-safe quoting using single quotes. Unlike JSON.stringify (double quotes),
single-quoted strings prevent command substitution ($(), backticks) and variable expansion.

```typescript
function shellQuote(s: string): string
```

#### `stripControlChars(s)`

Strip C0 control chars (except tab, newline, CR) that break PostgreSQL JSONB
and can cause rendering issues.

```typescript
function stripControlChars(s: string): string
```

#### `truncate(s, maxLength)`

Truncate a string to a max length with a truncation notice.

```typescript
function truncate(s: string, maxLength: number): string
```

### Constants

#### `MAX_FIND_RESULTS`

Max find results.

```typescript
const MAX_FIND_RESULTS: 100
```

#### `MAX_OUTPUT_SIZE`

Max command output size (100KB per stream).

```typescript
const MAX_OUTPUT_SIZE: number
```

#### `MAX_READ_SIZE`

Max file size for read_file (5MB).

```typescript
const MAX_READ_SIZE: number
```

#### `MAX_SEARCH_RESULTS`

Max search results.

```typescript
const MAX_SEARCH_RESULTS: 50
```

#### `MAX_WRITE_SIZE`

Max content size for write_file (10MB).

```typescript
const MAX_WRITE_SIZE: number
```

#### `TOOL_SCHEMAS`

```typescript
const TOOL_SCHEMAS: Record<string, ToolSchema>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0

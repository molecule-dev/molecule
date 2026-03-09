/**
 * Sandbox provider interface.
 *
 * Provides isolated container environments for running user projects.
 * Implement this in a bond package (e.g., `@molecule/api-sandbox-docker`).
 *
 * @module
 */

/**
 * Configuration for creating a new sandbox.
 */
export interface SandboxConfig {
  projectId: string
  image?: string
  env?: Record<string, string>
  /** Docker volume name to mount at /sandbox/project for persistent storage. */
  volumeName?: string
  resources?: {
    cpu: number
    memoryMB: number
    diskMB: number
  }
}

/**
 * Result of executing a command in a sandbox.
 */
export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Options for command execution.
 */
export interface ExecOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

/**
 * Handle to a spawned long-running process with streaming I/O.
 */
export interface SpawnHandle {
  /** Write data to the process's stdin. */
  write(data: string): void
  /** Register a callback for stdout data. */
  onStdout(cb: (data: string) => void): void
  /** Register a callback for stderr data. */
  onStderr(cb: (data: string) => void): void
  /** Register a callback for when the process exits. */
  onClose(cb: () => void): void
  /** Kill the spawned process. */
  kill(): void
}

/**
 * Directory entry from readDir.
 */
export interface DirEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  /** If this entry is a symlink, the target path it points to. */
  symlinkTarget?: string
}

/**
 * File change event from watching.
 */
export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete'
  path: string
}

/**
 * A running sandbox instance.
 */
export interface Sandbox {
  id: string
  status: 'creating' | 'running' | 'sleeping' | 'stopped'
  previewUrl: string

  start(): Promise<void>
  stop(): Promise<void>
  sleep(): Promise<void>
  wake(): Promise<void>

  exec(command: string, opts?: ExecOptions): Promise<ExecResult>

  /** Spawn a persistent process with streaming I/O. Optional — not all providers support this. */
  spawn?(command: string, opts?: ExecOptions): Promise<SpawnHandle>

  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDir(path: string): Promise<DirEntry[]>
  deleteFile(path: string): Promise<void>

  getPreviewUrl(port?: number): string
  onFileChange(cb: (event: FileChangeEvent) => void): () => void
}

/**
 * Sandbox provider interface.
 *
 * Each bond package (Docker, Firecracker, etc.) implements
 * this interface to manage sandbox lifecycle.
 */
export interface SandboxProvider {
  readonly name: string

  create(config: SandboxConfig): Promise<Sandbox>
  get(id: string): Promise<Sandbox | null>
  list(userId: string): Promise<Sandbox[]>
  destroy(id: string): Promise<void>

  /** Create a named volume for persistent sandbox storage. Optional — not all providers support volumes. */
  createVolume?(name: string): Promise<void>
  /** Remove a named volume. Optional. */
  removeVolume?(name: string): Promise<void>
  /** Check if a named volume exists. Optional. */
  volumeExists?(name: string): Promise<boolean>
}

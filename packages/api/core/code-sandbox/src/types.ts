/**
 * Sandbox provider interface.
 *
 * Provides isolated container environments for running user projects.
 * Implement this in a bond package (e.g., `@molecule/api-code-sandbox-docker`).
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
  /**
   * Extra provider-level labels merged into the container's labels (additive;
   * does not replace the provider's own `managed`/`projectId`/`volumeName`
   * labels). Lets callers tag containers for out-of-band recovery — e.g. a
   * production runtime applying `molecule.production=<projectId>` so its
   * long-lived containers are distinguishable from dev sandboxes and
   * recoverable across control-plane restarts.
   */
  labels?: Record<string, string>
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
  /** List a directory. THROWS when the path does not exist — an empty array means "exists and is empty", never "missing". */
  readDir(path: string): Promise<DirEntry[]>
  deleteFile(path: string): Promise<void>

  getPreviewUrl(port?: number): string
  onFileChange(cb: (event: FileChangeEvent) => void): () => void
}

/**
 * Whether a provider can prove that sandbox egress is actually restricted.
 *
 * `filtered` and `open` are OBSERVATIONS, not configuration state — the whole
 * point is that a provider must go and check rather than report back what it was
 * told. `inconclusive` is for when the check itself could not run (no API
 * credentials, a probe image missing); it must never be conflated with
 * `filtered`, because "I could not look" and "I looked and it is safe" are the
 * distinction a caller's security decision rests on.
 */
export type EgressFilterState = 'filtered' | 'open' | 'inconclusive'

/**
 * The result of proving a sandbox's egress restrictions.
 */
export interface EgressVerdict {
  state: EgressFilterState
  /** Human-readable explanation — shown to operators, so name the mechanism checked. */
  detail: string
  /** Provider-specific remediation, when the verdict is not `filtered`. */
  remediation?: string
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

  /**
   * PROVE that untrusted code in a sandbox cannot reach the network freely.
   *
   * Every provider isolates egress differently — an iptables chain on a Docker
   * host, a cloud firewall or private-network policy for a microVM platform — so
   * only the provider can verify its own mechanism. A consumer asks for the
   * verdict and decides what to do about it; it must never reach for a specific
   * mechanism itself.
   *
   * That "must never" is the reason this method exists. molecule.dev had this
   * check written directly against Docker in its application layer: it ran a
   * throwaway container on the sandbox bridge and attempted raw sockets to public
   * IPs. Correct for Docker, and completely untranslatable to any other provider
   * — which turned a provider swap into an application rewrite and stranded a
   * hard boot assertion that production depends on. The check belongs here.
   *
   * IMPLEMENTATIONS MUST OBSERVE, NOT ATTEST. Returning `filtered` because a
   * config flag says so defeats the purpose: the failure this replaced was
   * exactly that — a one-time operator attestation that a reboot silently
   * invalidated while everything kept booting happily. If the check cannot be
   * performed, return `inconclusive` and say why.
   *
   * Optional: a provider with no egress isolation at all should leave it
   * unimplemented, so a caller can tell "unsupported" from "verified open".
   *
   * @returns What was observed about egress filtering.
   */
  verifyEgress?(): Promise<EgressVerdict>
}

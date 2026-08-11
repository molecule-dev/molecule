/**
 * Configuration + narrow structural shims for the E2B code-sandbox bond.
 *
 * The bond talks to E2B through the official `e2b` SDK; these types capture only
 * the slice of that SDK surface the provider touches, plus the bond's own
 * configuration. Keeping them structural (rather than importing the SDK's own
 * types) keeps the provider testable with a fake client and documents exactly
 * which SDK methods this bond depends on.
 *
 * @module
 */

/** Bond configuration. All fields have safe defaults; see {@link createProvider}. */
export interface E2BConfig {
  /**
   * E2B API key. Falls back to `E2B_API_KEY` in the environment. Required — the
   * provider throws on first use if neither is set.
   */
  apiKey?: string
  /**
   * The golden template id every sandbox boots from. Falls back to
   * `E2B_TEMPLATE_ID`, then E2B's `base` template. This is the caller's OWN
   * identifier for the superset template (fleet node_modules + postgres +
   * warmed vite deps), built out of band by the template pipeline.
   */
  templateId?: string
  /**
   * Default port the preview URL points at (the app's Vite dev server).
   * `getPreviewUrl()` uses this when no port is given.
   */
  defaultPreviewPort?: number
  /**
   * Default sandbox lifetime before E2B auto-pauses it, in milliseconds. The
   * control plane extends this per-heartbeat; this is only the initial ceiling.
   */
  defaultTimeoutMs?: number
  /**
   * Egress allow-list (domains / CIDRs) applied to every sandbox at create
   * time; everything else is denied (`denyOut: [ALL_TRAFFIC]`). Wildcards like
   * `*.npmjs.org` are supported. Empty/omitted means the bond does NOT
   * constrain egress — prod must supply this or `verifyEgress` observes `open`
   * and the control plane refuses to boot (Rule 18).
   *
   * Verified against a live E2B sandbox: with `denyOut: [ALL_TRAFFIC]`, a
   * non-allowlisted host AND a raw destination IP are both blocked — a stronger
   * boundary than a DNS-only policy.
   */
  defaultAllowOut?: string[]
}

/** Result of an E2B command run (subset of the SDK's `CommandResult`). */
export interface E2BCommandResultLike {
  stdout: string
  stderr: string
  exitCode: number
}

/** Subset of the SDK's `Filesystem` the bond uses. */
export interface E2BFilesystemLike {
  read(path: string): Promise<string>
  /** Binary read (`format: 'bytes'`) — used by `exportFiles` to stream a tar out. */
  read(path: string, opts: { format: 'bytes' }): Promise<Uint8Array>
  /** Accepts text or binary; `importFiles` writes a tar blob in. */
  write(path: string, data: string | Uint8Array | ArrayBuffer | Blob): Promise<unknown>
  list(path: string): Promise<Array<{ name: string; type?: string; size?: number }>>
  remove(path: string): Promise<void>
}

/** Subset of the SDK's `Commands` the bond uses. */
export interface E2BCommandsLike {
  run(
    cmd: string,
    opts?: { cwd?: string; timeoutMs?: number; envs?: Record<string, string> },
  ): Promise<E2BCommandResultLike>
}

/** Subset of the SDK's `Sandbox` instance the bond uses. */
export interface E2BSandboxLike {
  sandboxId: string
  commands: E2BCommandsLike
  files: E2BFilesystemLike
  getHost(port: number): string
  setTimeout(ms: number): Promise<void>
  kill(): Promise<void>
  pause?(): Promise<string>
  betaPause?(): Promise<string>
  isRunning(): Promise<boolean>
  updateNetwork?(opts: { allowOut?: string[]; denyOut?: string[] }): Promise<void>
}

/** Subset of the SDK's `Sandbox` static surface the bond uses. */
export interface E2BSandboxClientLike {
  create(templateId: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
  connect(sandboxId: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
  list(
    opts?: Record<string, unknown>,
  ): Promise<Array<{ sandboxId: string }> | { sandboxes?: Array<{ sandboxId: string }> }>
  kill?(sandboxId: string, opts?: Record<string, unknown>): Promise<boolean>
}

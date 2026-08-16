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
   *
   * E2B caps this per account: 1 hour on Hobby, 24 hours on Pro. A value above
   * the account's cap is rejected at create time, so raising it is a decision
   * about the account, not just the config.
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

/**
 * Handle to a command started with `background: true` (the SDK's `CommandHandle`).
 *
 * The handle is what makes a backgrounded start HONEST: it carries the pid, and
 * `wait()` resolves with the real exit code once the started process exits —
 * even when it left a detached child behind. A launcher therefore learns whether
 * its command was accepted instead of being handed a fabricated success.
 */
export interface E2BCommandHandleLike {
  /** The started process's pid inside the sandbox. */
  pid: number
  /** Output accumulated so far — readable before {@link E2BCommandHandleLike.wait} settles. */
  stdout?: string
  /** Error output accumulated so far. */
  stderr?: string
  /** Set once the process's exit is known; absent while it is still streaming. */
  exitCode?: number
  /**
   * Resolve when the started process exits. Rejects with the SDK's
   * `CommandExitError` (carrying `.result`) on a non-zero exit, and with a
   * timeout error when `timeoutMs` elapses first.
   */
  wait(): Promise<E2BCommandResultLike>
  /** Write to the process's stdin (requires `stdin: true` at start). */
  sendStdin(data: string | Uint8Array): Promise<void>
  /** Kill the process. */
  kill(): Promise<boolean>
  /** Stop streaming without killing the process. */
  disconnect?(): Promise<void>
}

/** Options accepted by the SDK's `commands.run`. */
export interface E2BCommandRunOpts {
  cwd?: string
  timeoutMs?: number
  envs?: Record<string, string>
  /** Keep stdin open so {@link E2BCommandHandleLike.sendStdin} works. */
  stdin?: boolean
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
}

/** Subset of the SDK's `Commands` the bond uses. */
export interface E2BCommandsLike {
  /**
   * Start a command and return a handle immediately. The bond always uses this
   * form: waiting inline blocks until the whole process GROUP ends, which never
   * happens for a launch that leaves a dev server running.
   */
  run(cmd: string, opts: E2BCommandRunOpts & { background: true }): Promise<E2BCommandHandleLike>
  /** Run a command to completion (the SDK's default). */
  run(cmd: string, opts?: E2BCommandRunOpts & { background?: false }): Promise<E2BCommandResultLike>
}

/**
 * Subset of the SDK's `Pty` module the bond uses.
 *
 * A PTY is a different mechanism from a command, not a flag on one: it has its
 * own create/input/resize/kill endpoints, and only it gives the sandbox side a
 * controlling terminal (job control, so Ctrl-C becomes SIGINT; a negotiated
 * width, so tools format to the real panel size).
 */
export interface E2BPtyLike {
  create(opts: {
    cols: number
    rows: number
    onData: (data: Uint8Array) => void
    cwd?: string
    envs?: Record<string, string>
    timeoutMs?: number
  }): Promise<E2BCommandHandleLike>
  sendInput(pid: number, data: Uint8Array): Promise<void>
  resize(pid: number, size: { cols: number; rows: number }): Promise<void>
  kill(pid: number): Promise<boolean>
}

/** Subset of the SDK's `Sandbox` instance the bond uses. */
export interface E2BSandboxLike {
  sandboxId: string
  commands: E2BCommandsLike
  /** Present on SDK builds that support pseudo-terminals; absent means no PTY. */
  pty?: E2BPtyLike
  files: E2BFilesystemLike
  getHost(port: number): string
  setTimeout(ms: number): Promise<void>
  kill(): Promise<void>
  /**
   * Suspend the sandbox (FS + memory snapshot). Resolves `false` when the API
   * answered 409 because it was ALREADY paused — which is a success, not a
   * failure, and the reason this is not typed as `void`.
   */
  pause?(): Promise<boolean>
  /** Deprecated alias of {@link E2BSandboxLike.pause}; same endpoint. */
  betaPause?(): Promise<boolean>
  isRunning(): Promise<boolean>
  updateNetwork?(opts: { allowOut?: string[]; denyOut?: string[] }): Promise<void>
}

/**
 * Subset of the SDK's `SandboxInfo` the bond reads.
 *
 * This is what a sandbox looks like when you only LOOK at it. `connect` — which
 * is how a handle is obtained — RESUMES a paused sandbox and extends its
 * deadline, so it can never be used to answer "is this thing asleep?".
 */
export interface E2BSandboxInfoLike {
  sandboxId: string
  templateId?: string
  /** `'running'` or `'paused'`; anything else is treated as running. */
  state?: string
  /** Caller metadata supplied at create (the bond puts `projectId` here). */
  metadata?: Record<string, string>
  /** When the sandbox last started running. */
  startedAt?: Date | string
  /** When the sandbox's current deadline expires. */
  endAt?: Date | string
  /** Volumes mounted into the sandbox, when the account uses them. */
  volumeMounts?: Array<{ name: string; path: string }>
}

/** Subset of the SDK's `Sandbox` static surface the bond uses. */
export interface E2BSandboxClientLike {
  create(templateId: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
  connect(sandboxId: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
  list(
    opts?: Record<string, unknown>,
  ): Promise<
    | Array<{ sandboxId: string; state?: string }>
    | { sandboxes?: Array<{ sandboxId: string; state?: string }> }
  >
  kill?(sandboxId: string, opts?: Record<string, unknown>): Promise<boolean>
  /**
   * Read a sandbox's record WITHOUT connecting to it — the only lookup that does
   * not resume a paused sandbox. Throws `SandboxNotFoundError` on a 404.
   */
  getInfo?(sandboxId: string, opts?: Record<string, unknown>): Promise<E2BSandboxInfoLike>
  /**
   * Whether an error means "this sandbox does not exist", as opposed to "the
   * lookup failed". The distinction cannot be recovered from the error's shape by
   * a consumer, and getting it wrong is what makes a control plane treat a
   * provider outage as a destroyed sandbox.
   */
  isNotFound?(error: unknown): boolean
}

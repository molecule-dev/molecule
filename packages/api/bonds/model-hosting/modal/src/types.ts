/**
 * Modal model hosting configuration and runner types.
 *
 * @module
 */

/** Result of one CLI / Python run. */
export interface RunResult {
  /** Exit code (`null` when killed). */
  code: number | null
  /** Standard output. */
  stdout: string
  /** Standard error. */
  stderr: string
}

/**
 * Runs one command (the `modal` CLI or `python3`) with extra environment.
 * Swappable for tests, or to run Modal from a sidecar.
 */
export type ModalRunner = (
  bin: string,
  args: string[],
  opts: { env: Record<string, string>; cwd?: string; input?: string },
) => Promise<RunResult>

/** Configuration for the Modal model hosting provider. */
export interface ModalConfig {
  /** Modal token id. Defaults to `MODAL_TOKEN_ID`. */
  tokenId?: string
  /** Modal token secret. Defaults to `MODAL_TOKEN_SECRET`. */
  tokenSecret?: string
  /** Workspace name, for endpoint URLs. Defaults to `MODAL_WORKSPACE`. */
  workspace?: string
  /** Modal environment to deploy to. Defaults to `MODAL_ENVIRONMENT`, then the workspace default. */
  environment?: string
  /**
   * The environment's web suffix, when it has one (`<workspace>-<suffix>--<label>.modal.run`).
   * Defaults to `MODAL_ENVIRONMENT_SUFFIX`; empty for the default environment.
   */
  environmentSuffix?: string
  /** Proxy auth token id, for `access: 'private'` calls. Defaults to `MODAL_PROXY_TOKEN_ID`. */
  proxyTokenId?: string
  /** Proxy auth token secret. Defaults to `MODAL_PROXY_TOKEN_SECRET`. */
  proxyTokenSecret?: string
  /** `modal` CLI binary. Default `'modal'`. */
  modalBin?: string
  /** Python binary with the `modal` package installed (for `scale`). Default `'python3'`. */
  pythonBin?: string
  /**
   * Add a Python interpreter to a registry image that has none
   * (`Image.from_registry(…, add_python=…)`), e.g. `'3.12'`. Default: not added.
   */
  addPython?: string
  /** Seconds the server may take to start listening before Modal gives up. Default 600. */
  startupTimeoutSeconds?: number
  /** Custom runner (tests). */
  runner?: ModalRunner
  /** How often `deploy` probes the health path, in ms. Default 5000. */
  pollIntervalMs?: number
}

/** One app as `modal app list --json` reports it (only the fields we read). */
export interface ModalAppRow {
  /** The app's `ap-…` id. */
  app_id?: string
  /** The app name (what `modal.App(name)` set). */
  description?: string
  /** `deployed`, `stopped`, `ephemeral`, `disabled`, … */
  state?: string
  /** ISO timestamp, when reported. */
  created_at?: string
}

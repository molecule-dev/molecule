/**
 * The Modal CLI / Python bridge. Modal has no REST deploy API (verified
 * 2026-09-30 against modal-client's own sources, github.com/modal-labs/
 * modal-client py/modal/cli/app.py + py/modal/config.py): apps deploy with
 * `modal deploy`, list with `modal app list --json`, stop with `modal app
 * stop`, and their autoscaler changes through
 * `modal.Function.from_name(...).update_autoscaler(...)` (py/modal/_functions.py
 * `def update_autoscaler(*, min_containers, max_containers, buffer_containers,
 * scaledown_window)`). The CLI reads `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET`
 * (config.py) and `MODAL_ENVIRONMENT`.
 *
 * @module
 */

import type { ModalAppRow, ModalConfig, ModalRunner, RunResult } from './types.js'

/**
 * Resolves config with env fallbacks.
 *
 * @param config - Explicit config.
 * @param env - The process environment (swappable for tests).
 * @returns Every setting filled.
 */
export function resolveModalConfig(
  config: ModalConfig,
  env: NodeJS.ProcessEnv = process.env,
): Required<
  Pick<ModalConfig, 'modalBin' | 'pythonBin' | 'pollIntervalMs' | 'startupTimeoutSeconds'>
> & {
  tokenId?: string
  tokenSecret?: string
  workspace?: string
  environment?: string
  environmentSuffix?: string
  proxyTokenId?: string
  proxyTokenSecret?: string
  addPython?: string
  runner?: ModalRunner
} {
  return {
    tokenId: config.tokenId ?? env.MODAL_TOKEN_ID,
    tokenSecret: config.tokenSecret ?? env.MODAL_TOKEN_SECRET,
    workspace: config.workspace ?? env.MODAL_WORKSPACE,
    environment: config.environment ?? env.MODAL_ENVIRONMENT,
    environmentSuffix: config.environmentSuffix ?? env.MODAL_ENVIRONMENT_SUFFIX,
    proxyTokenId: config.proxyTokenId ?? env.MODAL_PROXY_TOKEN_ID,
    proxyTokenSecret: config.proxyTokenSecret ?? env.MODAL_PROXY_TOKEN_SECRET,
    addPython: config.addPython,
    modalBin: config.modalBin ?? 'modal',
    pythonBin: config.pythonBin ?? 'python3',
    startupTimeoutSeconds: config.startupTimeoutSeconds ?? 600,
    pollIntervalMs: config.pollIntervalMs ?? 5000,
    runner: config.runner,
  }
}

/**
 * The web URL for a label: `https://<workspace>[-<suffix>]--<label>.modal.run`
 * (modal.com/docs/guide/webhook-urls, 2026-09-30 — the source part carries the
 * environment suffix when the environment has one).
 *
 * @param cfg - Resolved config.
 * @param label - The `label=` the app deployed with.
 * @returns The endpoint base URL.
 */
export function endpointUrl(
  cfg: { workspace?: string; environmentSuffix?: string },
  label: string,
): string {
  if (!cfg.workspace) return ''
  const source = cfg.environmentSuffix ? `${cfg.workspace}-${cfg.environmentSuffix}` : cfg.workspace
  return `https://${source}--${label}.modal.run`
}

/**
 * Talks to Modal by running its CLI / Python bridge.
 */
export class ModalClient {
  private readonly cfg: ReturnType<typeof resolveModalConfig>
  private readonly run: ModalRunner

  /**
   * Creates the client.
   *
   * @param config - Modal configuration; env vars fill anything omitted.
   * @param runner - Command runner; defaults to `node:child_process` execFile.
   */
  constructor(config: ModalConfig = {}, runner?: ModalRunner) {
    this.cfg = resolveModalConfig(config)
    this.run =
      runner ??
      config.runner ??
      (async (bin, args, opts) => {
        const { execFile } = await import('node:child_process')
        const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
          (resolve, reject) => {
            execFile(
              bin,
              args,
              {
                env: { ...process.env, ...opts.env },
                cwd: opts.cwd,
                maxBuffer: 32 * 1024 * 1024,
                timeout: 15 * 60_000,
              },
              (error, stdout, stderr) => {
                const code = error ? ((error as { code?: number }).code ?? 1) : 0
                if (error && code === 0) reject(error)
                else resolve({ code, stdout: String(stdout), stderr: String(stderr) })
              },
            )
          },
        )
        return result satisfies RunResult
      })
  }

  /**
   * The env every Modal command runs with: the token, and the environment when
   * one is configured.
   */
  commandEnv(): Record<string, string> {
    const env: Record<string, string> = {}
    if (this.cfg.tokenId) env.MODAL_TOKEN_ID = this.cfg.tokenId
    if (this.cfg.tokenSecret) env.MODAL_TOKEN_SECRET = this.cfg.tokenSecret
    if (this.cfg.environment) env.MODAL_ENVIRONMENT = this.cfg.environment
    return env
  }

  /**
   * Deploys `app.py` source from `dir` (`modal deploy`).
   *
   * @param dir - Directory holding `app.py`.
   * @param app - The app name, for the error message.
   */
  async deploy(dir: string, app: string): Promise<void> {
    const r = await this.run(this.cfg.modalBin, ['deploy', 'app.py'], {
      env: this.commandEnv(),
      cwd: dir,
    })
    if (r.code !== 0) {
      throw new Error(
        `model-hosting (modal): deploy of "${app}" failed (exit ${r.code})\n${r.stderr.trim() || r.stdout.trim()}`,
      )
    }
  }

  /**
   * Lists the apps in the configured environment.
   *
   * @returns The rows with a parsed `description` (the app name).
   */
  async listApps(): Promise<ModalAppRow[]> {
    const r = await this.run(this.cfg.modalBin, ['app', 'list', '--json'], {
      env: this.commandEnv(),
    })
    if (r.code !== 0) {
      throw new Error(`model-hosting (modal): app list failed (exit ${r.code})\n${r.stderr.trim()}`)
    }
    const parsed: unknown = JSON.parse(r.stdout)
    return Array.isArray(parsed) ? (parsed as ModalAppRow[]) : []
  }

  /**
   * Stops an app. Modal has no delete: a stopped app keeps its name but serves
   * nothing and bills nothing. Stopping an already-stopped app is fine.
   *
   * @param app - The app name.
   */
  async stopApp(app: string): Promise<void> {
    const r = await this.run(this.cfg.modalBin, ['app', 'stop', app], { env: this.commandEnv() })
    if (r.code !== 0 && !/not found|already|no app/i.test(r.stderr + r.stdout)) {
      throw new Error(
        `model-hosting (modal): stopping "${app}" failed (exit ${r.code})\n${r.stderr.trim()}`,
      )
    }
  }

  /**
   * Changes an app's autoscaler bounds on the live function, without a
   * redeploy (`Function.update_autoscaler`, verified in modal-client
   * py/modal/_functions.py). Concurrency is a decorator and needs a redeploy.
   *
   * @param app - The app name.
   * @param fn - The function name in the generated app (`'serve'`).
   * @param scaling - The bounds to set.
   */
  async updateAutoscaler(
    app: string,
    fn: string,
    scaling: { minInstances: number; maxInstances: number; idleTimeoutSeconds: number },
  ): Promise<void> {
    const expr =
      `import modal; f = modal.Function.from_name(${JSON.stringify(app)}, ${JSON.stringify(fn)}); ` +
      `f.update_autoscaler(min_containers=${scaling.minInstances}, max_containers=${scaling.maxInstances}, scaledown_window=${scaling.idleTimeoutSeconds})`
    const r = await this.run(this.cfg.pythonBin, ['-c', expr], { env: this.commandEnv() })
    if (r.code !== 0) {
      throw new Error(
        `model-hosting (modal): scaling "${app}" failed (exit ${r.code})\n${r.stderr.trim() || r.stdout.trim()}`,
      )
    }
  }
}

/**
 * The generated app's single web function name.
 */
export const MODAL_FUNCTION_NAME = 'serve'

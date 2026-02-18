/**
 * Docker implementation of SandboxProvider.
 *
 * Uses the Docker Engine API via HTTP to manage containers.
 * Each sandbox runs as an isolated Docker container with resource limits.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  DirEntry,
  ExecOptions,
  ExecResult,
  FileChangeEvent,
  Sandbox,
  SandboxConfig,
  SandboxProvider,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

import type { DockerConfig } from './types.js'

const DEFAULT_IMAGE = 'node:22-slim'
const LABEL_PREFIX = 'molecule-sandbox'

/**
 * Docker-based implementation of `SandboxProvider`. Each sandbox runs as an isolated
 * Docker container with configurable CPU/memory limits. Communicates with the Docker
 * Engine API over a Unix socket.
 */
class DockerSandboxProvider implements SandboxProvider {
  readonly name = 'docker'
  private socketPath: string
  private baseImage: string
  private labelPrefix: string
  private previewUrlTemplate: string
  private defaultCpu: number
  private defaultMemoryMB: number

  constructor(config: DockerConfig = {}) {
    this.socketPath = config.socketPath ?? process.env.DOCKER_SOCKET_PATH ?? '/var/run/docker.sock'
    this.baseImage = config.baseImage ?? DEFAULT_IMAGE
    this.labelPrefix = config.labelPrefix ?? LABEL_PREFIX
    this.previewUrlTemplate = config.previewUrlTemplate ?? 'http://localhost:{port}'
    this.defaultCpu = config.defaultCpu ?? 1
    this.defaultMemoryMB = config.defaultMemoryMB ?? 512
  }

  /**
   * Creates a new Docker container as a sandbox with the specified resource limits,
   * environment variables, and exposed ports (4000 for API, 5173 for Vite preview).
   * @param config - The sandbox configuration including project ID, image, env vars, and resource limits.
   * @returns A `Sandbox` object wrapping the created container.
   */
  async create(config: SandboxConfig): Promise<Sandbox> {
    const cpu = config.resources?.cpu ?? this.defaultCpu
    const memoryMB = config.resources?.memoryMB ?? this.defaultMemoryMB
    const image = config.image ?? this.baseImage

    const env = Object.entries(config.env ?? {}).map(([k, v]) => `${k}=${v}`)

    const body = {
      Image: image,
      Env: env,
      Labels: {
        [`${this.labelPrefix}.projectId`]: config.projectId,
        [`${this.labelPrefix}.managed`]: 'true',
      },
      HostConfig: {
        NanoCPUs: cpu * 1e9,
        Memory: memoryMB * 1024 * 1024,
        PublishAllPorts: true,
      },
      ExposedPorts: {
        '4000/tcp': {},
        '5173/tcp': {},
      },
    }

    const createRes = (await this.dockerApi('/containers/create', 'POST', body)) as { Id: string }

    return this.buildSandbox(createRes.Id, config.projectId)
  }

  /**
   * Retrieves an existing sandbox by its Docker container ID.
   * @param id - The Docker container ID.
   * @returns A `Sandbox` wrapping the container, or `null` if the container does not exist.
   */
  async get(id: string): Promise<Sandbox | null> {
    try {
      const info = (await this.dockerApi(`/containers/${id}/json`)) as {
        Id: string
        Config: { Labels: Record<string, string> }
      }
      const projectId = info.Config.Labels[`${this.labelPrefix}.projectId`] ?? ''
      return this.buildSandbox(info.Id, projectId)
    } catch (error) {
      logger.debug('Failed to get sandbox container', { id, error })
      return null
    }
  }

  /**
   * Lists all sandbox containers managed by this provider (filtered by the `managed=true` label).
   * @param _userId - Reserved for future per-user filtering; currently returns all managed containers.
   * @returns An array of `Sandbox` objects for each managed container.
   */
  async list(_userId: string): Promise<Sandbox[]> {
    const filters = JSON.stringify({
      label: [`${this.labelPrefix}.managed=true`],
    })
    const containers = (await this.dockerApi(
      `/containers/json?all=true&filters=${encodeURIComponent(filters)}`,
    )) as Array<{
      Id: string
      Labels: Record<string, string>
    }>

    return containers.map((c) =>
      this.buildSandbox(c.Id, c.Labels[`${this.labelPrefix}.projectId`] ?? ''),
    )
  }

  /**
   * Force-removes a Docker container by ID. Silently succeeds if already removed.
   * @param id - The Docker container ID to destroy.
   */
  async destroy(id: string): Promise<void> {
    try {
      await this.dockerApi(`/containers/${id}?force=true`, 'DELETE')
    } catch (error) {
      logger.debug('Failed to destroy sandbox container (may already be removed)', { id, error })
    }
  }

  /**
   * Builds a `Sandbox` object that wraps a Docker container with methods for
   * start/stop/exec/file operations. All file operations are implemented via `docker exec`.
   * @param containerId - The Docker container ID.
   * @param _projectId - The project ID label (stored for metadata reference).
   * @returns A `Sandbox` with lifecycle and file system methods bound to the container.
   */
  private buildSandbox(containerId: string, _projectId: string): Sandbox {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const provider = this

    return {
      id: containerId,
      status: 'stopped',
      previewUrl: provider.previewUrlTemplate.replace('{port}', '5173'),

      async start() {
        await provider.dockerApi(`/containers/${containerId}/start`, 'POST')
        this.status = 'running'
      },

      async stop() {
        await provider.dockerApi(`/containers/${containerId}/stop`, 'POST')
        this.status = 'stopped'
      },

      async sleep() {
        await provider.dockerApi(`/containers/${containerId}/stop`, 'POST')
        this.status = 'sleeping'
      },

      async wake() {
        await provider.dockerApi(`/containers/${containerId}/start`, 'POST')
        this.status = 'running'
      },

      async exec(command: string, opts?: ExecOptions): Promise<ExecResult> {
        const execCreate = (await provider.dockerApi(`/containers/${containerId}/exec`, 'POST', {
          Cmd: ['sh', '-c', command],
          AttachStdout: true,
          AttachStderr: true,
          WorkingDir: opts?.cwd ?? '/app',
          Env: opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
        })) as { Id: string }

        const output = (await provider.dockerApi(`/exec/${execCreate.Id}/start`, 'POST', {
          Detach: false,
          Tty: false,
        })) as string

        const inspectRes = (await provider.dockerApi(`/exec/${execCreate.Id}/json`)) as {
          ExitCode: number
        }

        return {
          stdout: output,
          stderr: '',
          exitCode: inspectRes.ExitCode,
        }
      },

      async readFile(path: string): Promise<string> {
        const result = await this.exec(`cat ${JSON.stringify(path)}`)
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.readFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to read ${path}: ${result.stderr}` },
            ),
          )
        return result.stdout
      },

      async writeFile(path: string, content: string): Promise<void> {
        const b64 = Buffer.from(content).toString('base64')
        const result = await this.exec(
          `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`,
        )
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.writeFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to write ${path}: ${result.stderr}` },
            ),
          )
      },

      async readDir(path: string): Promise<DirEntry[]> {
        const result = await this.exec(
          `ls -la --time-style=+%s ${JSON.stringify(path)} | tail -n +2`,
        )
        if (result.exitCode !== 0) return []

        return result.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const parts = line.split(/\s+/)
            const isDir = line.startsWith('d')
            const size = parseInt(parts[4] ?? '0', 10)
            const name = parts.slice(6).join(' ')
            return {
              name,
              type: isDir ? ('directory' as const) : ('file' as const),
              size: isDir ? undefined : size,
            }
          })
      },

      async deleteFile(path: string): Promise<void> {
        const result = await this.exec(`rm -f ${JSON.stringify(path)}`)
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.deleteFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to delete ${path}: ${result.stderr}` },
            ),
          )
      },

      getPreviewUrl(port?: number): string {
        return provider.previewUrlTemplate.replace('{port}', String(port ?? 5173))
      },

      onFileChange(_cb: (event: FileChangeEvent) => void): () => void {
        let active = true
        const poll = async (): Promise<void> => {
          while (active) {
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
        poll().catch(() => {})
        return () => {
          active = false
        }
      },
    }
  }

  /**
   * Makes an HTTP request to the Docker Engine API (v1.43) via the Unix socket.
   * @param path - The API endpoint path (e.g. `/containers/create`).
   * @param method - The HTTP method (defaults to `'GET'`).
   * @param body - Optional JSON request body.
   * @returns The parsed JSON response, or raw text for non-JSON responses.
   */
  private async dockerApi(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const url = `http://localhost/v1.43${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      // @ts-expect-error -- Node fetch supports unix socket via undici
      dispatcher: undefined,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(
        t(
          'codeSandbox.docker.error.apiError',
          { method, path, status: String(response.status), error: text },
          { defaultValue: `Docker API ${method} ${path}: ${response.status} ${text}` },
        ),
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    return response.text()
  }
}

/**
 * Creates a new `DockerSandboxProvider` instance with the given configuration.
 * @param config - Optional Docker-specific configuration (socket path, base image, resource defaults).
 * @returns A `SandboxProvider` that manages Docker containers as sandboxes.
 */
export function createProvider(config?: DockerConfig): SandboxProvider {
  return new DockerSandboxProvider(config)
}

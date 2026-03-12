/**
 * Docker implementation of SandboxProvider.
 *
 * Uses the Docker Engine API via HTTP to manage containers.
 * Each sandbox runs as an isolated Docker container with resource limits.
 *
 * @module
 */

import http from 'http'

import { getLogger } from '@molecule/api-bond'
import type {
  DirEntry,
  ExecOptions,
  ExecResult,
  FileChangeEvent,
  Sandbox,
  SandboxConfig,
  SandboxProvider,
  SpawnHandle,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

import type { Socket } from 'net'

import type { DockerConfig } from './types.js'

const DEFAULT_IMAGE = 'node:22-slim'

/**
 * Shell-safe single-quote escaping for file paths. Prevents command injection
 * via `$()`, backticks, or other shell metacharacters inside double quotes.
 * @param s - The string to escape for shell use.
 * @returns A single-quoted shell-safe string.
 */
function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
const LABEL_PREFIX = 'molecule-sandbox'

/**
 * Parses Docker's multiplexed binary stream from a raw socket.
 * Each frame: 8-byte header [streamType(1), 0, 0, 0, size(4 BE uint32)] + payload.
 * Buffers partial frames across data events.
 */
/** Maximum single frame size in Docker multiplexed stream (50 MB). */
const MAX_MUX_FRAME_SIZE = 50 * 1024 * 1024

/** Parses Docker multiplexed binary stream frames into stdout/stderr callbacks. */
class DockerMuxParser {
  private buffer = Buffer.alloc(0)
  private stdoutCb: ((data: string) => void) | null = null
  private stderrCb: ((data: string) => void) | null = null

  /**
   * Registers a callback for stdout data events.
   * @param cb - The callback invoked with each stdout data chunk.
   */
  onStdout(cb: (data: string) => void): void {
    this.stdoutCb = cb
  }

  /**
   * Registers a callback for stderr data events.
   * @param cb - The callback invoked with each stderr data chunk.
   */
  onStderr(cb: (data: string) => void): void {
    this.stderrCb = cb
  }

  /** Clear internal buffer (e.g. on connection close). */
  clear(): void {
    this.buffer = Buffer.alloc(0)
  }

  /**
   * Feeds a buffer chunk into the parser, extracting complete frames.
   * @param chunk - The raw data chunk from the Docker stream.
   */
  feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length >= 8) {
      const streamType = this.buffer[0]
      const frameSize = this.buffer.readUInt32BE(4)
      if (frameSize > MAX_MUX_FRAME_SIZE) {
        this.buffer = Buffer.alloc(0)
        throw new Error(
          `Docker stream frame size ${frameSize} exceeds ${MAX_MUX_FRAME_SIZE} byte limit`,
        )
      }
      if (this.buffer.length < 8 + frameSize) break
      const payload = this.buffer.subarray(8, 8 + frameSize).toString('utf-8')
      this.buffer = this.buffer.subarray(8 + frameSize)
      if (streamType === 1) this.stdoutCb?.(payload)
      else if (streamType === 2) this.stderrCb?.(payload)
    }
  }
}

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
    this.defaultMemoryMB = config.defaultMemoryMB ?? 1024
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

    const labels: Record<string, string> = {
      [`${this.labelPrefix}.projectId`]: config.projectId,
      [`${this.labelPrefix}.managed`]: 'true',
    }

    const memoryBytes = memoryMB * 1024 * 1024
    const hostConfig: Record<string, unknown> = {
      NanoCPUs: cpu * 1e9,
      Memory: memoryBytes,
      MemorySwap: memoryBytes, // Equal to Memory = no swap; prevents host swap exhaustion
      PublishAllPorts: true,
      Init: true, // Use tini init to reap zombie processes
      PidsLimit: 512,
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETGID', 'SETUID'],
    }

    // Mount a named Docker volume at /workspace for persistent storage.
    // Docker copies image contents (molecule/, node_modules/) into empty volumes.
    if (config.volumeName) {
      labels[`${this.labelPrefix}.volumeName`] = config.volumeName
      hostConfig.Binds = [`${config.volumeName}:/workspace`]
    }

    const body = {
      Image: image,
      Env: env,
      Labels: labels,
      HostConfig: hostConfig,
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
   * Force-removes a Docker container by ID and its associated volume (if any).
   * Silently succeeds if already removed.
   * @param id - The Docker container ID to destroy.
   */
  async destroy(id: string): Promise<void> {
    // Read volume name from container labels before removing
    let volumeName: string | undefined
    try {
      const info = (await this.dockerApi(`/containers/${id}/json`)) as {
        Config: { Labels: Record<string, string> }
      }
      volumeName = info.Config.Labels[`${this.labelPrefix}.volumeName`]
    } catch {
      // Container may already be gone
    }

    try {
      await this.dockerApi(`/containers/${id}?force=true`, 'DELETE')
    } catch (error) {
      logger.debug('Failed to destroy sandbox container (may already be removed)', { id, error })
    }

    // Clean up the associated volume
    if (volumeName) {
      try {
        await this.dockerApi(`/volumes/${volumeName}`, 'DELETE')
        logger.debug('Removed sandbox volume', { volumeName })
      } catch (error) {
        logger.debug('Failed to remove sandbox volume (may already be removed)', {
          volumeName,
          error,
        })
      }
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
        // Wrap the command in a timeout if specified to enforce time limits
        const timeoutMs = opts?.timeout
        // Use single-quote shell escaping — JSON.stringify produces double quotes which
        // still allow $(), backtick, and ! expansion inside sh -c.
        const shellQuote = (s: string): string => "'" + s.replace(/'/g, "'\\''") + "'"
        const wrappedCommand = timeoutMs
          ? `timeout ${Math.ceil(timeoutMs / 1000)} sh -c ${shellQuote(command)}`
          : command

        const execCreate = (await provider.dockerApi(`/containers/${containerId}/exec`, 'POST', {
          Cmd: ['sh', '-c', wrappedCommand],
          AttachStdout: true,
          AttachStderr: true,
          WorkingDir: opts?.cwd ?? '/workspace',
          Env: opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
        })) as { Id: string }

        const rawBuf = await provider.dockerApiRaw(`/exec/${execCreate.Id}/start`, 'POST', {
          Detach: false,
          Tty: false,
        })

        // Docker multiplexed stream: each frame has an 8-byte header
        // [stream_type(1), 0, 0, 0, size(4 bytes big-endian)] + payload
        const stdoutChunks: Buffer[] = []
        const stderrChunks: Buffer[] = []
        let offset = 0
        while (offset + 8 <= rawBuf.length) {
          const streamType = rawBuf[offset]
          const frameSize = rawBuf.readUInt32BE(offset + 4)
          offset += 8
          const end = Math.min(offset + frameSize, rawBuf.length)
          const payload = rawBuf.subarray(offset, end)
          if (streamType === 2) {
            stderrChunks.push(payload)
          } else {
            stdoutChunks.push(payload)
          }
          offset = end
        }

        const inspectRes = (await provider.dockerApi(`/exec/${execCreate.Id}/json`)) as {
          ExitCode: number
        }

        return {
          stdout: Buffer.concat(stdoutChunks).toString(),
          stderr: Buffer.concat(stderrChunks).toString(),
          exitCode: inspectRes.ExitCode,
        }
      },

      async readFile(path: string): Promise<string> {
        const result = await this.exec(`cat ${shellQuote(path)}`)
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
        const result = await this.exec(`echo ${shellQuote(b64)} | base64 -d > ${shellQuote(path)}`)
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
        // Append trailing slash so ls follows symlinks (e.g. /workspace -> /sandbox/project)
        const dirPath = path.endsWith('/') ? path : `${path}/`
        const result = await this.exec(
          `ls -la --time-style=+%s ${shellQuote(dirPath)} | tail -n +2`,
        )
        if (result.exitCode !== 0) return []

        return result.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((line) => {
            // Skip . and .. entries
            const name = line.split(/\s+/).slice(6).join(' ')
            return name !== '.' && name !== '..'
          })
          .map((line) => {
            const parts = line.split(/\s+/)
            const isDir = line.startsWith('d')
            const isSymlink = line.startsWith('l')
            const size = parseInt(parts[4] ?? '0', 10)
            const rawName = parts.slice(6).join(' ')
            // Symlinks show as "name -> target" in ls -la
            const arrowIdx = rawName.indexOf(' -> ')
            const name = isSymlink && arrowIdx !== -1 ? rawName.slice(0, arrowIdx) : rawName
            const symlinkTarget =
              isSymlink && arrowIdx !== -1 ? rawName.slice(arrowIdx + 4) : undefined
            return {
              name,
              type: isDir ? ('directory' as const) : ('file' as const),
              size: isDir ? undefined : size,
              ...(symlinkTarget ? { symlinkTarget } : {}),
            }
          })
      },

      async deleteFile(path: string): Promise<void> {
        const result = await this.exec(`rm -f ${shellQuote(path)}`)
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

      async spawn(command: string, opts?: ExecOptions): Promise<SpawnHandle> {
        const execCreate = (await provider.dockerApi(`/containers/${containerId}/exec`, 'POST', {
          Cmd: ['sh', '-c', command],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: false,
          WorkingDir: opts?.cwd ?? '/workspace',
          Env: opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
        })) as { Id: string }

        const socket = await provider.dockerExecUpgrade(execCreate.Id)
        const parser = new DockerMuxParser()
        let closeCb: (() => void) | null = null

        // Kill idle spawn sockets after 10 minutes to prevent descriptor leaks
        socket.setTimeout(600_000)
        socket.on('timeout', () => {
          socket.destroy()
        })

        socket.on('data', (chunk: Buffer) => {
          try {
            parser.feed(chunk)
          } catch (err) {
            logger.debug('Spawn parser error, destroying socket', {
              error: err instanceof Error ? err.message : err,
            })
            socket.destroy()
          }
        })
        socket.on('close', () => {
          parser.clear()
          closeCb?.()
        })
        socket.on('error', (err: Error) => {
          logger.debug('Spawn socket error', { error: err.message })
          parser.clear()
          closeCb?.()
        })

        return {
          write(data: string): void {
            if (!socket.destroyed) socket.write(data)
          },
          onStdout(cb: (data: string) => void): void {
            parser.onStdout(cb)
          },
          onStderr(cb: (data: string) => void): void {
            parser.onStderr(cb)
          },
          onClose(cb: () => void): void {
            closeCb = cb
          },
          kill(): void {
            if (!socket.destroyed) socket.destroy()
          },
        }
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

  // ---------------------------------------------------------------------------
  // Volume management
  // ---------------------------------------------------------------------------

  /**
   * Create a named Docker volume. No-op if it already exists.
   * @param name - The Docker volume name to create.
   */
  async createVolume(name: string): Promise<void> {
    try {
      await this.dockerApi('/volumes/create', 'POST', { Name: name })
    } catch (error) {
      // 409 Conflict means the volume already exists — idempotent success
      if (error instanceof Error && error.message.includes('409')) return
      throw error
    }
  }

  /**
   * Remove a named Docker volume. Silently succeeds if already removed.
   * @param name - The Docker volume name to remove.
   */
  async removeVolume(name: string): Promise<void> {
    try {
      await this.dockerApi(`/volumes/${name}`, 'DELETE')
    } catch (error) {
      logger.debug('Failed to remove volume', { name, error })
    }
  }

  /**
   * Check if a named Docker volume exists.
   * @param name - The Docker volume name to check.
   * @returns `true` if the volume exists, `false` otherwise.
   */
  async volumeExists(name: string): Promise<boolean> {
    try {
      await this.dockerApi(`/volumes/${name}`)
      return true
    } catch {
      return false
    }
  }

  /**
   * Makes an HTTP request to the Docker Engine API via the Unix socket.
   * @param path - The API endpoint path (e.g. `/containers/create`).
   * @param method - The HTTP method (defaults to `'GET'`).
   * @param body - Optional JSON request body.
   * @returns The parsed JSON response, or raw text for non-JSON responses.
   */
  private async dockerApi(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const opts: http.RequestOptions = {
        socketPath: this.socketPath,
        path: `/v1.44${path}`,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
      }

      const req = http.request(opts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString()
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                t(
                  'codeSandbox.docker.error.apiError',
                  { method, path, status: String(res.statusCode), error: text },
                  { defaultValue: `Docker API ${method} ${path}: ${res.statusCode} ${text}` },
                ),
              ),
            )
            return
          }
          try {
            resolve(JSON.parse(text))
          } catch {
            resolve(text)
          }
        })
        res.on('error', reject)
      })
      // Timeout to prevent hanging on unresponsive Docker daemon
      req.setTimeout(30_000, () => {
        req.destroy(new Error(`Docker API timeout: ${method} ${path}`))
      })
      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  /**
   * Like `dockerApi` but returns the raw response Buffer without parsing.
   * Used for exec start responses which return a multiplexed binary stream.
   * @param path - The API endpoint path.
   * @param method - The HTTP method (defaults to `'GET'`).
   * @param body - Optional JSON request body.
   * @returns The raw response buffer.
   */
  private async dockerApiRaw(path: string, method = 'GET', body?: unknown): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const opts: http.RequestOptions = {
        socketPath: this.socketPath,
        path: `/v1.44${path}`,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
      }

      const MAX_RAW_RESPONSE = 50 * 1024 * 1024 // 50 MB cap on exec output
      let totalSize = 0

      const req = http.request(opts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => {
          totalSize += chunk.length
          if (totalSize > MAX_RAW_RESPONSE) {
            req.destroy(
              new Error(`Docker exec output exceeded ${MAX_RAW_RESPONSE / (1024 * 1024)}MB limit`),
            )
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                t(
                  'codeSandbox.docker.error.apiError',
                  { method, path, status: String(res.statusCode), error: buf.toString() },
                  {
                    defaultValue: `Docker API ${method} ${path}: ${res.statusCode} ${buf.toString()}`,
                  },
                ),
              ),
            )
            return
          }
          resolve(buf)
        })
        res.on('error', reject)
      })
      // Longer timeout for exec responses (commands can take minutes)
      req.setTimeout(600_000, () => {
        req.destroy(new Error(`Docker exec timeout: ${method} ${path}`))
      })
      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  /**
   * Starts a Docker exec instance and upgrades the HTTP connection to a raw
   * bidirectional socket. Docker hijacks the connection (101 Switching Protocols)
   * when stdin is attached, giving us a raw TCP socket for streaming I/O.
   * @param execId - The exec instance ID from the create step.
   * @returns The raw socket for stdin writes and multiplexed stdout/stderr reads.
   */
  private dockerExecUpgrade(execId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ Detach: false, Tty: false })
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: `/v1.44/exec/${execId}/start`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Connection: 'Upgrade',
            Upgrade: 'tcp',
          },
        },
        (res) => {
          // Fallback: if Docker doesn't upgrade (e.g. old version), reject
          reject(new Error(`Expected 101 upgrade, got ${res.statusCode}`))
        },
      )

      req.on('upgrade', (_res, socket: Socket, head) => {
        // Process any initial data that arrived with the upgrade response
        if (head.length > 0) {
          socket.unshift(head)
        }
        resolve(socket)
      })

      req.on('error', reject)
      req.write(body)
      req.end()
    })
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

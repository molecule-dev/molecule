/**
 * Docker sandbox provider configuration.
 *
 * @module
 */

/**
 * Configuration for docker.
 */
export interface DockerConfig {
  /** Docker socket path. Defaults to /var/run/docker.sock. */
  socketPath?: string
  /** Docker host URL (alternative to socketPath). */
  host?: string
  /** Docker API port. */
  port?: number
  /** Base image for sandbox containers. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /** Default disk allocation (MB). */
  defaultDiskMB?: number
  /** Network name for sandbox containers. */
  network?: string
  /** Container label prefix for identification. */
  labelPrefix?: string
  /** Preview URL template. Use {port} placeholder. */
  previewUrlTemplate?: string
}

/**
 * Container Info interface.
 */
export interface ContainerInfo {
  id: string
  name: string
  status: string
  ports: Array<{ host: number; container: number }>
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  DOCKER_HOST?: string
  DOCKER_SOCKET_PATH?: string
}

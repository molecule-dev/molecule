/**
 * Docker sandbox provider configuration.
 *
 * @module
 */

/**
 * Configuration for docker.
 */
export interface DockerConfig {
  /** Docker unix-socket path. Defaults to /var/run/docker.sock (or DOCKER_SOCKET_PATH). The only supported daemon transport — remote TCP daemons are not supported. */
  socketPath?: string
  /** NOT IMPLEMENTED — reserved. The provider always connects via the unix socket; this field is ignored. */
  host?: string
  /** NOT IMPLEMENTED — reserved. Ignored; see `host`. */
  port?: number
  /** Base image for sandbox containers. Defaults to node:22-slim. Must already be present on the host — the provider never pulls images. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /** NOT IMPLEMENTED — no disk quota is applied to sandbox containers; this field is ignored. */
  defaultDiskMB?: number
  /** IGNORED — the sandbox network is controlled exclusively by the SANDBOX_DOCKER_NETWORK env var (default molecule-sandbox, auto-created with ICC disabled). */
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
  DOCKER_SOCKET_PATH?: string
}

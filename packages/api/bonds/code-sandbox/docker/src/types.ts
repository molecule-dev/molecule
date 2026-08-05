/**
 * Docker sandbox provider configuration.
 *
 * @module
 */

/**
 * Configuration for docker.
 */
export interface DockerConfig {
  /**
   * Docker unix-socket path. Defaults to `/var/run/docker.sock` (or the
   * `DOCKER_SOCKET_PATH` env var). This is the default transport; it is ignored
   * when a TCP endpoint is selected via `host`/`port` or a `tcp://` `DOCKER_HOST`.
   */
  socketPath?: string
  /**
   * Connect to a remote/TCP Docker daemon at this host instead of the unix
   * socket. When set, the provider issues all Docker Engine API calls over
   * plain TCP to `host:port` (`port` defaults to 2375) and `socketPath` is
   * ignored. Also honored via `DOCKER_HOST` (`tcp://host:port`). Plain
   * (unencrypted) TCP only — for a TLS-protected daemon (2376) front it with a
   * local socket proxy and point `socketPath` at that.
   */
  host?: string
  /** TCP port for `host` (default 2375). Ignored unless `host` (or a `tcp://` `DOCKER_HOST`) selects a TCP endpoint. */
  port?: number
  /** Base image for sandbox containers. Defaults to node:22-slim. Must already be present on the host — the provider never pulls images. */
  baseImage?: string
  /** Default CPU allocation (cores). */
  defaultCpu?: number
  /** Default memory allocation (MB). */
  defaultMemoryMB?: number
  /**
   * Docker network the sandbox containers attach to (sets each container's
   * `NetworkMode`). Overrides the `SANDBOX_DOCKER_NETWORK` env var. Defaults to
   * the ICC-off isolated `molecule-sandbox` network, auto-created on first use so
   * tenants are L2-isolated by default. Setting it to the shared `bridge` gives NO
   * cross-tenant isolation and is refused in production. [C1-1]
   */
  network?: string
  /** Container label prefix for identification. */
  labelPrefix?: string
  /** Preview URL template. Use {port} placeholder. */
  previewUrlTemplate?: string
  /**
   * Docker repository holding sandbox TEMPLATES — one tag per template id.
   * Defaults to `molecule-sandbox-template` (or `SANDBOX_TEMPLATE_REPOSITORY`).
   *
   * Deliberately NOT the base image's repository. Sharing one repository between
   * the base image and every template makes `docker images <repo>` and any
   * cleanup written against it operate on both, and the only thing standing
   * between a template sweep and the base image is a tag-prefix convention.
   */
  templateRepository?: string
  /**
   * Registry host for sharing templates across hosts, e.g. `registry.example.com`
   * (or `SANDBOX_TEMPLATE_REGISTRY`). When unset, `publishTemplate`/`fetchTemplate`
   * throw with an actionable message: the daemon CAN talk to a registry, so the
   * capability is present and only the address is missing.
   */
  templateRegistry?: string
  /**
   * Base64-encoded Docker `X-Registry-Auth` value for {@link DockerConfig.templateRegistry}
   * (or `SANDBOX_TEMPLATE_REGISTRY_AUTH`). Defaults to an empty credential set,
   * which is what an anonymous or already-logged-in daemon needs.
   */
  templateRegistryAuth?: string
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
 * Environment variables the Docker sandbox provider reads.
 */
export interface ProcessEnv {
  /** Unix-socket path for the Docker daemon (default `/var/run/docker.sock`). Overridden by `config.socketPath`. */
  DOCKER_SOCKET_PATH?: string
  /** Docker daemon endpoint, docker-client style: `tcp://host:port` or `unix:///path/to/docker.sock`. Overridden by `config.host`/`config.socketPath`. */
  DOCKER_HOST?: string
  /** Docker network sandbox containers attach to (default `molecule-sandbox`, ICC-off). Overridden by `config.network`. [C1-1] */
  SANDBOX_DOCKER_NETWORK?: string
  /** Docker repository holding sandbox templates (default `molecule-sandbox-template`). Overridden by `config.templateRepository`. */
  SANDBOX_TEMPLATE_REPOSITORY?: string
  /** Registry host for sharing templates across hosts. Overridden by `config.templateRegistry`. */
  SANDBOX_TEMPLATE_REGISTRY?: string
  /** Base64 `X-Registry-Auth` value for `SANDBOX_TEMPLATE_REGISTRY`. Overridden by `config.templateRegistryAuth`. */
  SANDBOX_TEMPLATE_REGISTRY_AUTH?: string
}

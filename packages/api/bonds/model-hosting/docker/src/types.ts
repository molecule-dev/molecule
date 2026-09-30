/**
 * Self-hosted Docker model hosting configuration and wire types.
 *
 * @module
 */

/** One Engine API response. */
export interface DockerResponse {
  /** HTTP status. */
  status: number
  /** Raw body text. */
  body: string
}

/** Sends one Engine API request (swappable for tests or a TLS remote). */
export type DockerTransport = (
  method: string,
  path: string,
  body?: unknown,
) => Promise<DockerResponse>

/** Configuration for the Docker model hosting provider. */
export interface DockerModelHostingConfig {
  /** Engine socket. Defaults to `DOCKER_SOCKET`, then `/var/run/docker.sock`. */
  socketPath?: string
  /** Engine API version prefix. Default `'v1.47'`. */
  apiVersion?: string
  /** Host name the endpoint URLs use. Defaults to `MODEL_HOST_PUBLIC_HOST`, then `'localhost'`. */
  publicHost?: string
  /** Address published ports bind to. Default `'127.0.0.1'` (this machine only). */
  bindAddress?: string
  /** GPUs per container when a GPU is asked for: a count, or `'all'`. Default `1`. */
  gpus?: number | 'all'
  /** Custom transport (tests, a TCP/TLS engine). */
  transport?: DockerTransport
  /** How often `deploy` probes the health path, in ms. Default 2000. */
  pollIntervalMs?: number
}

/** The fields of `GET /containers/{id}/json` read here. */
export interface ContainerInspect {
  Id: string
  Name?: string
  Created?: string
  State?: { Status?: string; Running?: boolean; Error?: string }
  Config?: { Labels?: Record<string, string>; Image?: string }
  HostConfig?: { DeviceRequests?: Array<{ Count?: number }> | null }
  NetworkSettings?: { Ports?: Record<string, Array<{ HostIp?: string; HostPort?: string }> | null> }
}

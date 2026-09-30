/**
 * Docker Engine API over its Unix socket (`node:http`, which reaches a socket;
 * the global fetch cannot).
 *
 * Verified 2026-09-30 against the Engine API v1.47 OpenAPI spec
 * (https://docs.docker.com/reference/api/engine/version/v1.47.yaml):
 * `POST /images/create?fromImage=&tag=`; `POST /containers/create?name=` →
 * `{Id, Warnings}`; `ContainerConfig.{Image, Env, Cmd, ExposedPorts {"<port>/tcp": {}}, Labels}`;
 * `HostConfig.{PortBindings {"<port>/tcp": [{HostIp, HostPort}]}, RestartPolicy,
 * DeviceRequests [{Driver: "nvidia", Count: -1, Capabilities: [["gpu"]]}], NanoCpus, Memory}`;
 * `POST /containers/{id}/start|stop`; `GET /containers/{id}/json` (`State.Status`,
 * `State.Running`, `NetworkSettings.Ports`); `DELETE /containers/{id}?force=true`;
 * `GET /containers/json?all=true&filters={"label":["k=v"]}`.
 *
 * @module
 */

import { request } from 'node:http'

import type { DockerResponse, DockerTransport } from './types.js'

/** A Docker Engine API error, carrying the HTTP status. */
export class DockerApiError extends Error {
  /** HTTP status. */
  readonly status: number

  /**
   * Creates the error.
   *
   * @param message - What failed.
   * @param status - HTTP status.
   */
  constructor(message: string, status: number) {
    super(message)
    this.name = 'DockerApiError'
    this.status = status
  }
}

/**
 * The default transport: HTTP over the engine's Unix socket.
 *
 * @param socketPath - The socket.
 * @param apiVersion - Version prefix, e.g. `'v1.47'`.
 * @returns A transport.
 */
export function socketTransport(socketPath: string, apiVersion: string): DockerTransport {
  return (method, path, body) =>
    new Promise<DockerResponse>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body)
      const req = request(
        {
          socketPath,
          path: `/${apiVersion}${path}`,
          method,
          headers: {
            host: 'docker',
            ...(payload
              ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
              : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
          )
          res.on('error', reject)
        },
      )
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
}

/**
 * Sends one request and parses JSON; `null` on 404, throws on other errors.
 *
 * @param transport - The transport.
 * @param method - HTTP method.
 * @param path - Path after the version prefix.
 * @param body - JSON body.
 * @returns The parsed body (or raw text when not JSON), or `null` on 404.
 */
export async function dockerCall<T>(
  transport: DockerTransport,
  method: string,
  path: string,
  body?: unknown,
): Promise<T | null> {
  const res = await transport(method, path, body)
  if (res.status === 404) return null
  if (res.status >= 400) {
    let message = res.body.slice(0, 300)
    try {
      message = (JSON.parse(res.body) as { message?: string }).message ?? message
    } catch (_error) {
      // Not JSON (a streamed pull, an empty body) — keep the raw text.
    }
    throw new DockerApiError(
      `Docker ${method} ${path} failed (${res.status}): ${message}`,
      res.status,
    )
  }
  if (!res.body) return null
  try {
    return JSON.parse(res.body) as T
  } catch (_error) {
    // Streaming endpoints (image pull) answer newline-delimited JSON; callers ignore the body.
    return res.body as unknown as T
  }
}

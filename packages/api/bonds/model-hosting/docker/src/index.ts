/**
 * Self-hosted model hosting for molecule.dev — run a model server container
 * on a Docker engine you run (your GPU box, a rented bare-metal server), with
 * NVIDIA GPUs through the NVIDIA container runtime.
 *
 * The self-hosted option beside the paid hosts (Cloud Run, Modal, RunPod,
 * Koyeb): same contract, your hardware, no per-second bill. Also a local
 * stand-in for tests and development.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-model-hosting'
 * import { provider } from '@molecule/api-model-hosting-docker'
 *
 * setProvider(provider) // uses /var/run/docker.sock and http://localhost:<port>
 *
 * const endpoint = await requireProvider().deploy({
 *   name: 'laya',
 *   image: 'ghcr.io/acme/laya-serve:0.3.1',
 *   port: 8000,
 *   healthPath: '/health',
 *   accelerator: { kind: 'cpu' },
 *   region: 'local',
 *   scaling: { minInstances: 1, maxInstances: 1, idleTimeoutSeconds: 0 },
 *   access: 'public',
 * })
 * endpoint.url // http://localhost:49153
 * ```
 *
 * @remarks
 * - **One always-on container per endpoint** named `molecule-model-<name>`
 *   (that name is the endpoint id), restarted unless stopped. There is no
 *   scale to zero: `minInstances` must be ≥ 1 on `deploy`; `scale(id,
 *   { minInstances: 0, … })` stops it and `minInstances ≥ 1` starts it again.
 *   `maxInstances` and `idleTimeoutSeconds` are ignored.
 * - **GPUs need the NVIDIA Container Toolkit** on the host (`DeviceRequests`
 *   with driver `nvidia`). One GPU per container by default; `gpus: 'all'` in
 *   the config for every GPU. `minVramGb` is not checked — the host has what
 *   it has.
 * - **Ports bind to 127.0.0.1 by default**, on a port the engine picks
 *   (`endpoint.url` reads it back). Set `bindAddress: '0.0.0.0'` and
 *   `publicHost` (or `MODEL_HOST_PUBLIC_HOST`) to reach it from another
 *   machine — and then put TLS in front: URLs here are plain `http://`.
 * - **No endpoint auth of its own.** For `access: 'private'` set
 *   `serverEnforcesAuth: true` and pass the server's key in `secretEnv`;
 *   `authHeaders()` returns `{}`. `secretEnv` becomes container env
 *   (visible to anyone who can `docker inspect`).
 * - **Access to the Docker socket is root on that machine.** Run this only in
 *   a process that is allowed to be.
 * - `deploy` replaces an existing container of the same name (force-remove,
 *   then create) and waits until `healthPath` answers 2xx. A failed image pull
 *   throws `DockerApiError` with the registry's message.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

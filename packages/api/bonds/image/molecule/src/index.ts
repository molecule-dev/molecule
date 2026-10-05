/**
 * molecule.dev hosted image transformation provider for `@molecule/api-image`.
 *
 * Resize, crop, rotate, flip, flop, thumbnail, optimize and format-convert
 * images on molecule.dev — billed to your molecule project, no vendor
 * account, self-hosted upstream. It is an ordinary bond: swap it for
 * `@molecule/api-image-sharp` (in-process, no network) without changing code
 * that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, thumbnail, optimize } from '@molecule/api-image'
 * import { provider as image } from '@molecule/api-image-molecule'
 *
 * setProvider(image) // reads MOLECULE_API_KEY from the environment
 *
 * const thumb = await thumbnail(buffer, 256)
 * const smaller = await optimize(buffer, { format: 'webp', quality: 80 })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:image`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Limits mirrored locally: 8 MB per image, 6 pipeline operations —
 *   oversized calls are refused with 413 and never leave the process.
 * - **Each core method is ONE hosted round trip.** Chaining `resize` then
 *   `optimize` sends the image twice; use the raw provider's `transform()`
 *   (cast or import the class) to run a multi-op pipeline in one call.
 * - `getMetadata` is NOT hosted — every transform response already carries
 *   the final image's width/height/format/bytes; a metadata-only read is
 *   refused with 400.
 * - Metered per image and billed to the project; the upstream is molecule's
 *   own compute, so the real cost is 0 — requests still count against the
 *   project's rate limit and free-tier allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { ImageProvider } from '@molecule/api-image'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: ImageProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: ImageProvider = new Proxy({} as ImageProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})

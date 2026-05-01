/**
 * Framework-neutral HTTP handlers for wallet-pass delivery.
 *
 * Both handlers expose the same minimal request/response contract used by
 * `@molecule/api-qr-code`, so Express, Fastify, Koa, Hono, etc. plug in
 * with a tiny adapter. The handlers DO NOT contain any user-visible text
 * (only opaque error envelopes), and they never log private key material.
 *
 * @module
 */

import { createApplePass } from './createApplePass.js'
import { createGoogleWalletJwt } from './createGoogleWalletJwt.js'
import {
  PKPASS_CONTENT_TYPE,
  type ApplePassAssets,
  type ApplePassCertificates,
  type ApplePassData,
  type GoogleWalletClass,
  type GoogleWalletObject,
  type GoogleWalletServiceAccount,
} from './types.js'

/**
 * Minimal request shape consumed by the wallet-pass handlers.
 */
export interface WalletPassRequest {
  /** Path params; both handlers expect `passId`. */
  params: { passId: string }
}

/**
 * Minimal response shape consumed by the wallet-pass handlers.
 */
export interface WalletPassResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
  /** Issue a redirect (302). */
  redirect: (url: string) => void
}

/**
 * Resolver that loads pass payload + signing material for a given passId.
 * The handler stays decoupled from the storage layer (DataStore, files,
 * cache, etc.) by accepting the resolver as a closure.
 */
export type ApplePassResolver = (
  passId: string,
) => Promise<
  | {
      passData: ApplePassData
      certificates: ApplePassCertificates
      assets?: ApplePassAssets
    }
  | undefined
>

/**
 * Resolver that loads Google Wallet pass class + object + signing service
 * account for a given passId.
 */
export type GoogleWalletPassResolver = (
  passId: string,
) => Promise<
  | {
      passClass: GoogleWalletClass
      passObject: GoogleWalletObject
      serviceAccount: GoogleWalletServiceAccount
      origins?: string[]
    }
  | undefined
>

/**
 * Options for {@link createApplePassHandler}.
 */
export interface CreateApplePassHandlerOptions {
  /** Loader that turns `passId` into the pass payload + signing material. */
  resolve: ApplePassResolver
  /** Optional file-name template for the `Content-Disposition` header. */
  fileName?: (passId: string) => string
}

/**
 * Build a `(req, res) => Promise<void>` handler for
 * `GET /wallet/apple/:passId` returning the signed `.pkpass` blob.
 *
 * @param options - Resolver + optional file-name builder.
 * @returns Handler.
 *
 * @example
 * ```ts
 * import { createApplePassHandler } from '@molecule/api-wallet-pass'
 *
 * const handle = createApplePassHandler({
 *   resolve: async (passId) => loadPassFromDataStore(passId),
 * })
 *
 * router.get('/wallet/apple/:passId', async (req, res, next) => {
 *   try {
 *     await handle(
 *       { params: { passId: req.params.passId } },
 *       {
 *         setHeader: (n, v) => res.setHeader(n, v),
 *         setStatus: (s) => { res.status(s) },
 *         sendBuffer: (b) => { res.end(b) },
 *         sendJson: (j) => { res.json(j) },
 *         redirect: (u) => { res.redirect(302, u) },
 *       },
 *     )
 *   } catch (err) { next(err) }
 * })
 * ```
 */
export function createApplePassHandler(
  options: CreateApplePassHandlerOptions,
): (req: WalletPassRequest, res: WalletPassResponse) => Promise<void> {
  const fileName = options.fileName ?? ((id: string) => `${id}.pkpass`)

  return async function handle(req, res) {
    const passId = decodeId(req.params?.passId)
    if (!passId) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing path parameter `:passId`.' })
      return
    }

    const resolved = await options.resolve(passId)
    if (!resolved) {
      res.setStatus(404)
      res.sendJson({ error: 'Pass not found.' })
      return
    }

    const buffer = await createApplePass(
      resolved.passData,
      resolved.certificates,
      resolved.assets,
    )

    res.setHeader('Content-Type', PKPASS_CONTENT_TYPE)
    res.setHeader('Content-Length', String(buffer.byteLength))
    res.setHeader('Content-Disposition', `attachment; filename="${fileName(passId)}"`)
    res.setStatus(200)
    res.sendBuffer(buffer)
  }
}

/**
 * Options for {@link createGoogleWalletPassHandler}.
 */
export interface CreateGoogleWalletPassHandlerOptions {
  /** Loader that turns `passId` into pass class + object + signing creds. */
  resolve: GoogleWalletPassResolver
  /** Override the Google Wallet save-link prefix (used by tests). */
  saveUrlPrefix?: string
}

/**
 * Build a `(req, res) => Promise<void>` handler for
 * `GET /wallet/google/:passId` issuing a 302 redirect to the
 * `https://pay.google.com/gp/v/save/<jwt>` URL.
 *
 * @param options - Resolver + optional save-URL prefix override.
 * @returns Handler.
 */
export function createGoogleWalletPassHandler(
  options: CreateGoogleWalletPassHandlerOptions,
): (req: WalletPassRequest, res: WalletPassResponse) => Promise<void> {
  const saveUrlPrefix = options.saveUrlPrefix ?? 'https://pay.google.com/gp/v/save/'

  return async function handle(req, res) {
    const passId = decodeId(req.params?.passId)
    if (!passId) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing path parameter `:passId`.' })
      return
    }

    const resolved = await options.resolve(passId)
    if (!resolved) {
      res.setStatus(404)
      res.sendJson({ error: 'Pass not found.' })
      return
    }

    const jwt = createGoogleWalletJwt(
      resolved.passClass,
      resolved.passObject,
      resolved.serviceAccount,
      resolved.origins,
    )

    res.redirect(`${saveUrlPrefix}${jwt}`)
  }
}

/**
 * Decode a path-segment value safely. Frameworks sometimes leave
 * URL-encoded sequences (`%2F`, `%3D`) intact for handlers.
 *
 * @param raw - Raw route param value.
 * @returns Decoded value, or `undefined` if missing/invalid.
 */
function decodeId(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

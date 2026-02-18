/**
 * Framework-agnostic HTTP types for molecule.dev resource handlers.
 *
 * These are structural subtypes of Express types — Express objects satisfy them
 * without adapters. Allows resource handlers to be used with any HTTP framework
 * (Express, Fastify, Hono, etc.) by depending on these interfaces instead of Express directly.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Framework-agnostic HTTP request interface. Structurally compatible with Express's
 * `Request` — Express objects satisfy this interface without adapters, but the type
 * doesn't depend on Express, allowing use with Fastify, Hono, or Lambda.
 */
export interface MoleculeRequest {
  body: any
  params: Record<string, string>
  query: Record<string, any>
  headers: Record<string, string | string[] | undefined>
  cookies?: Record<string, string>
  on?(event: string, listener: (...args: unknown[]) => void): void
}

/**
 * Framework-agnostic HTTP response interface. Structurally compatible with Express's
 * `Response` — includes `status()`, `json()`, `send()`, `set()`, cookie methods,
 * streaming (`write`), and `locals` for per-request data sharing.
 */
export interface MoleculeResponse {
  status(code: number): this
  json(body: unknown): void
  send(body: unknown): void
  end(): void
  set(headers: Record<string, string>): void
  setHeader(name: string, value: string): void
  cookie(name: string, value: string, options?: Record<string, unknown>): void
  write(chunk: string | Buffer): boolean
  flushHeaders?(): void
  locals: Record<string, any>
}

/**
 * Framework-agnostic next function. Call with no arguments to pass to the next
 * middleware, or with an error to trigger error-handling middleware.
 *
 * @param err - Optional error to forward to error-handling middleware.
 */
export type MoleculeNextFunction = (err?: unknown) => void

/**
 * Framework-agnostic middleware function signature matching Express's
 * `(req, res, next) => void` pattern.
 */
export type MoleculeRequestHandler = (
  req: MoleculeRequest,
  res: MoleculeResponse,
  next: MoleculeNextFunction,
) => void | Promise<void>

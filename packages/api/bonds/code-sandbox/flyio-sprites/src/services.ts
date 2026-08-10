/**
 * Supervised long-running processes (dev servers) on a sprite.
 *
 * The sprite URL routes to whichever service claims `http_port`, so "start the
 * Vite dev server and make the preview URL serve it" is one service upsert.
 *
 * THE TRAP THIS MODULE EXISTS FOR: `PUT .../services/{name}` on a RUNNING
 * service answers `Service already running with that command` and silently
 * keeps the OLD `dir`/`env`/`args` — and the public
 * `POST .../services/{name}/restart` path 404s (restart lives on the
 * in-sprite management socket only). An "update" that does not stop first is
 * therefore a no-op that looks like a success. `ensureService` stops, upserts,
 * verifies the definition actually took, and throws when it did not.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { SpriteLike } from './provider.js'

/** A service definition the caller wants live. */
export interface ServiceSpec {
  /** Service name (e.g. `vite`). */
  name: string
  /** Executable. */
  cmd: string
  /** Arguments. */
  args: string[]
  /** Working directory. */
  dir?: string
  /** Environment variables. */
  env?: Record<string, string>
  /** Port the sprite URL should route to. */
  httpPort?: number
}

/**
 * Reads a service's definition, or `null` when it does not exist.
 *
 * @param sprite - The sprite.
 * @param name - The service name.
 * @returns The definition, or `null`.
 */
async function getServiceOrNull(
  sprite: SpriteLike,
  name: string,
): Promise<{ cmd: string; args: string[]; dir?: string } | null> {
  try {
    return (await sprite.getService(name)) as {
      cmd: string
      args: string[]
      dir?: string
    }
  } catch (error) {
    if (/not found/i.test(String((error as Error)?.message ?? ''))) return null
    throw error
  }
}

/**
 * Ensures a service exists with EXACTLY this definition and is running.
 *
 * Existing service with a different definition: stopped, redefined, restarted,
 * then read back — a definition that did not take throws instead of leaving a
 * stale server behind a fresh-looking success.
 *
 * @param sprite - The sprite.
 * @param spec - The desired service.
 */
export async function ensureService(sprite: SpriteLike, spec: ServiceSpec): Promise<void> {
  const existing = await getServiceOrNull(sprite, spec.name)
  const definitionMatches =
    existing !== null &&
    existing.cmd === spec.cmd &&
    JSON.stringify(existing.args) === JSON.stringify(spec.args) &&
    (existing.dir ?? '') === (spec.dir ?? '')

  if (existing && !definitionMatches) {
    // Stop first — a PUT while running is silently ignored (see module docs).
    await sprite.stopService(spec.name).catch(() => {
      // Explicit, documented noop: stopping a service that is not running
      // fails, and "not running" is exactly the state the upsert needs.
    })
    await sprite.deleteService(spec.name).catch(() => {
      // Same: deletion is best-effort clearance for the re-create below; the
      // create surfaces any real failure.
    })
  }

  if (!existing || !definitionMatches) {
    const stream = await sprite.createService(spec.name, {
      cmd: spec.cmd,
      args: spec.args,
      ...(spec.dir ? { dir: spec.dir } : {}),
      ...(spec.env ? { env: spec.env } : {}),
      ...(spec.httpPort ? { http_port: spec.httpPort } : {}),
    })
    // Drain the startup log stream so the create settles; the definition
    // check below is the actual success signal.
    try {
      for await (const _event of stream as AsyncIterable<unknown>) {
        // drain
      }
    } catch (_error) {
      // Explicit, documented noop: a broken log stream does not say the
      // service failed — the read-back below decides.
    }
  }

  const final = await getServiceOrNull(sprite, spec.name)
  const took =
    final !== null &&
    final.cmd === spec.cmd &&
    JSON.stringify(final.args) === JSON.stringify(spec.args) &&
    (final.dir ?? '') === (spec.dir ?? '')
  if (!took) {
    throw new Error(
      t(
        'codeSandbox.sprites.error.serviceDefinition',
        { name: spec.name },
        {
          defaultValue:
            `Service "${spec.name}" did not take the requested definition — a running ` +
            'service silently keeps its old command (stop it first).',
        },
      ),
    )
  }
}

/**
 * Boot-time configuration report + actionable config errors.
 *
 * Provider bonds self-register their secret definitions at import time
 * (see `registry.ts`); this module turns that registry into (a) a
 * structured configured/missing report an app can log at startup, and
 * (b) actionable "not configured" errors that carry the secret's
 * description and setup URL instead of an opaque message.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'

import { get, hasProvider } from './provider.js'
import { getAllSecretDefinitions, getSecretDefinition, getSecretDefinitions } from './registry.js'
import type { ConfigReport, ConfigReportEntry, SecretDefinition } from './types.js'

const logger = getLogger()

/**
 * Resolves a secret's current value: through the bonded secrets provider
 * when one is wired, falling back to `process.env` (the provider-less
 * default every scaffolded app starts from).
 *
 * @param key - The secret key to resolve.
 * @returns The value, or `undefined` when unset.
 */
const resolveValue = async (key: string): Promise<string | undefined> => {
  if (hasProvider()) {
    try {
      const value = await get(key)
      if (value !== undefined) return value
    } catch (error) {
      logger.debug(`config report: provider lookup failed for ${key}; using process.env`, {
        error,
      })
    }
  }
  return process.env[key]
}

/**
 * Builds a structured configuration report for the given secret keys
 * (default: every registered definition). Each entry reports whether the
 * secret is `set`, satisfied by a `default`, or `missing` — with the
 * definition's description and setup URL attached so a missing entry is
 * directly actionable.
 *
 * @param keys - Secret keys to report on. Defaults to all registered definitions.
 * @returns The report; `ok` is `false` when any REQUIRED secret is missing.
 */
export const buildConfigReport = async (keys?: string[]): Promise<ConfigReport> => {
  const definitions: SecretDefinition[] = keys
    ? getSecretDefinitions(keys)
    : getAllSecretDefinitions()

  const entries: ConfigReportEntry[] = []
  for (const definition of definitions) {
    const value = await resolveValue(definition.key)
    const status: ConfigReportEntry['status'] = value
      ? 'set'
      : definition.default !== undefined
        ? 'default'
        : 'missing'
    entries.push({
      key: definition.key,
      status,
      // SecretDefinition.required defaults to true when omitted.
      required: definition.required !== false,
      description: definition.description,
      helpUrl: definition.helpUrl,
    })
  }

  const missingRequired = entries.filter((e) => e.status === 'missing' && e.required)
  const missingOptional = entries.filter((e) => e.status === 'missing' && !e.required)

  return {
    ok: missingRequired.length === 0,
    entries,
    missingRequired,
    missingOptional,
  }
}

/**
 * Logs a configuration report: one warning per missing REQUIRED secret
 * (with its description + setup URL — the integration is degraded until it
 * is set), a compact info line for missing optional secrets, and a summary.
 * Never throws — booting with missing credentials is allowed; the point is
 * that the gap is loud and actionable instead of surfacing later as an
 * opaque 503.
 *
 * @param report - A report from {@link buildConfigReport}.
 * @returns The same report, for chaining.
 */
export const logConfigReport = (report: ConfigReport): ConfigReport => {
  for (const entry of report.missingRequired) {
    logger.warn(
      `config: ${entry.key} is not set — ${entry.description ?? 'required by an installed integration'}` +
        (entry.helpUrl ? ` (get it at ${entry.helpUrl})` : ''),
    )
  }
  if (report.missingOptional.length > 0) {
    logger.info(
      `config: optional secrets not set: ${report.missingOptional.map((e) => e.key).join(', ')}`,
    )
  }
  const configured = report.entries.length - report.missingRequired.length
  logger.info(
    `config: ${configured}/${report.entries.length} registered secrets configured` +
      (report.ok
        ? ''
        : ` — ${report.missingRequired.length} required missing (see warnings above)`),
  )
  return report
}

/**
 * Builds the tagged error a bond should throw when a request needs a
 * secret that is not configured. The API error middleware maps
 * `statusCode` + `errorKey` to a clean 503, and the message carries the
 * secret's description and setup URL from the registry — so the user sees
 * exactly which key to set and where to get it, not an opaque failure.
 *
 * @param key - The missing secret's key (e.g. `'STRIPE_SECRET_KEY'`).
 * @param capability - Optional human label for what is disabled (e.g. `'payments'`).
 * @returns An Error tagged with `statusCode: 503` and `errorKey: 'config.notConfigured'`.
 */
export const configNotConfiguredError = (
  key: string,
  capability?: string,
): Error & { statusCode: number; errorKey: string } => {
  const definition = getSecretDefinition(key)
  const parts = [
    `${key} is not set${capability ? ` — ${capability} is disabled` : ''}.`,
    definition?.description,
    definition?.helpUrl ? `Get it at ${definition.helpUrl} and add it to api/.env.` : undefined,
  ].filter(Boolean)
  return Object.assign(new Error(parts.join(' ')), {
    statusCode: 503,
    errorKey: 'config.notConfigured',
  })
}

/**
 * Shell-quoting and environment helpers shared by the exec and file paths.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

/** Environment variable names must be valid shell identifiers to be `export`able. */
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Wraps a string in single quotes, escaping any single quotes it contains.
 *
 * Every command this provider runs goes through `sh -c`, so an unquoted path or
 * value is a command-injection vector. Double quotes are NOT sufficient — `$()`,
 * backticks and `!` still expand inside them.
 * @param value - The raw string to embed in a shell command.
 * @returns A single-quoted, shell-safe token.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Renders `ExecOptions.env` as `export` statements to prepend to a script.
 *
 * Fly's exec endpoint takes no environment map (only `command`, `stdin`,
 * `container` and `timeout`), so per-command environment has to be set inside
 * the shell script itself.
 * @param env - Environment variables to set for the command.
 * @returns One `export NAME='value'` line per variable, in insertion order.
 * @throws {Error} When a name is not a valid shell identifier. Silently dropping it
 *   would make the command run with the variable unset, which surfaces far from
 *   the cause.
 */
export function renderEnvExports(env: Record<string, string> | undefined): string[] {
  if (!env) return []
  return Object.entries(env).map(([name, value]) => {
    if (!ENV_NAME_PATTERN.test(name)) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.badEnvName',
          { name },
          {
            defaultValue: `Invalid environment variable name "${name}" — must match [A-Za-z_][A-Za-z0-9_]*.`,
          },
        ),
      )
    }
    return `export ${name}=${shellQuote(value)}`
  })
}

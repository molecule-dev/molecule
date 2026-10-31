/**
 * URL sanitization for errors and logs.
 *
 * @module
 */

/** URL userinfo, including the trailing `@` that separates it from the host. */
const URL_USERINFO = /((?:[a-z][a-z\d+.-]*:)?\/\/)[^/?#\s]*@/gi

/** Query or fragment parameters whose values are credentials. */
const CREDENTIAL_URL_PARAMETER =
  /([?&#](?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|code|password|api[_-]?key|client[_-]?secret)=)[^&#\s]*/gi

/**
 * Redacts credentials from a URL or from text containing one, while preserving its scheme,
 * host, path and non-credential parameters. Both absolute and relative URLs are supported;
 * userinfo is replaced as a whole and credential-valued query/fragment parameters keep their
 * names with `[REDACTED]` as their value. A string without URL credentials is returned unchanged.
 *
 * @param value - A URL, error message or log argument that may contain a credential URL.
 * @returns The input with URL userinfo and credential parameter values redacted.
 */
export const redactUrlCredentials = (value: string): string =>
  value
    .replace(URL_USERINFO, (_match, prefix: string) => `${prefix}[REDACTED]@`)
    .replace(CREDENTIAL_URL_PARAMETER, (_match, prefix: string) => `${prefix}[REDACTED]`)

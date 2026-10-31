/**
 * URL sanitization for errors and logs.
 *
 * @module
 */

import { redactCredentials } from '@molecule/app-logger'

/**
 * Redacts credentials from a URL or from text containing one, while preserving its scheme,
 * host, path and non-credential parameters. Both absolute and relative URLs are supported;
 * userinfo is replaced as a whole and credential-valued query/fragment parameters keep their
 * names with `[REDACTED]` as their value. A string without URL credentials is returned unchanged.
 *
 * The implementation is the logger core's shared deep scrubber; this named view keeps the
 * existing `HttpError.redactUrlCredentials` API without maintaining a second classification rule.
 *
 * @param value - A URL, error message or log argument that may contain a credential URL.
 * @returns The input with URL userinfo and credential parameter values redacted.
 */
export const redactUrlCredentials = (value: string): string => redactCredentials(value)

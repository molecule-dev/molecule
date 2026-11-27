/**
 * Read displayable server validation messages without coupling to an HTTP
 * transport. Port of `@molecule/app-ui-react`'s `formSubmitError`.
 *
 * @module
 */

/**
 * Narrows a response envelope without depending on a transport's error class.
 *
 * @param value - Any value.
 * @returns The value as a record when it is an object, else undefined.
 */
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * Reads auth/HTTP response bodies, field-error dictionaries and ordinary
 * failures. Server text is rendered as text by Form; malformed or empty
 * bodies use the fallback.
 *
 * @param error - A rejected submission or a controlled server error.
 * @param fallback - The already translated generic failure message.
 * @returns Nonempty messages suitable for a visible error list.
 */
export function formSubmitErrorMessages(error: unknown, fallback: string): string[] {
  const failure = record(error)
  const body = record(failure?.body ?? record(failure?.response)?.data ?? failure?.data ?? error)
  const errors = body?.errors
  const text = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0
  const messages = Array.isArray(errors)
    ? errors.filter(text)
    : Object.entries(record(errors) ?? {}).flatMap(([field, value]) =>
        (Array.isArray(value) ? value : [value])
          .filter(text)
          .map((message) => `${field} ${message}`),
      )
  if (messages.length) return messages
  // A failure that carries a response came from the transport, and its own message is a status line written for
  // logs ("Request failed with status 401."): the body speaks for the server. Molecule API routes answer a refused
  // request with `{ error }`, already translated for the user.
  const sources = record(failure?.response)
    ? [body?.error, body?.message]
    : [body?.error, body?.message, failure?.message, error]
  return [sources.find(text) ?? fallback]
}

/**
 * Recognizes an API that wanted the login/register body inside an envelope.
 *
 * An API that reads `req.body.user.email` answers a flat `{ email, password }` with a
 * validation error naming every field as missing, although the request carried each one. That
 * answer is the whole evidence: the fields the error names are exactly fields this request sent,
 * non-empty, at the top level of the body. A run on 2026-11-10 (xr-molecule-flash-l2105) shipped
 * that configuration — the profile body and the answer were mapped through `user`, the
 * login/register bodies were not — and the deployed sign-up failed with "can't be blank" for
 * every field.
 *
 * Internal: used by `client.ts` for a one-time warning, not exported from the package.
 *
 * @module
 */

/** What a validator says about a field that never arrived. */
const MISSING = /\b(?:blank|required|missing|empty|must be (?:present|provided|given))\b/i

/** Keys of an error answer that carry its message rather than name a field. */
const MESSAGE_KEYS = new Set(['error', 'errors', 'errorKey', 'message', 'statusCode', 'status'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The fields a failed login/register answer reports as missing or blank, when every one of them
 * was sent non-empty at the top level of the request body; otherwise an empty list. A field the
 * answer rejects for another reason ("has already been taken") is a real error, never this.
 *
 * Reads `{ errors: { field: … } }` (and `{ errors: [{ field|path|param: … }] }`), or a flat
 * `{ field: [ … ] }` answer.
 *
 * @param sent - The body the client sent, as given (no request mapper configured).
 * @param body - The parsed (credential-redacted) error answer.
 * @returns The named fields, sorted, or `[]` when the answer does not show the mismatch.
 */
export function fieldsSentButReportedMissing(sent: unknown, body: unknown): string[] {
  if (!isRecord(sent) || !isRecord(body)) return []
  // field → what the answer says about it
  const named = new Map<string, string>()
  const say = (field: string, text: unknown): void => {
    const words = Array.isArray(text) ? text.filter((t) => typeof t === 'string').join(' ') : text
    named.set(field, `${named.get(field) ?? ''} ${typeof words === 'string' ? words : ''}`.trim())
  }
  const errors = body.errors
  if (isRecord(errors)) for (const [key, text] of Object.entries(errors)) say(key, text)
  else if (Array.isArray(errors)) {
    for (const item of errors) {
      if (!isRecord(item)) continue
      const field = item.field ?? item.path ?? item.param
      const text = item.message ?? item.msg
      if (typeof field === 'string') say(field, text)
      else if (Array.isArray(field) && typeof field[0] === 'string') say(field[0], text)
    }
  } else {
    for (const [key, value] of Object.entries(body))
      if (!MESSAGE_KEYS.has(key) && (Array.isArray(value) || typeof value === 'string'))
        say(key, value)
  }
  if (!named.size) return []
  for (const [field, text] of named) {
    if (!MISSING.test(text)) return []
    const value = sent[field]
    if (value === undefined || value === null || value === '') return []
  }
  return [...named.keys()].sort()
}

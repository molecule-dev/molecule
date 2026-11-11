/** Retained l2407 ErrorMessages.tsx:15-22, before its first deployed walk. */
export function flattenErrors(payload: unknown): string[] {
  const errors = (payload as { errors?: Record<string, unknown> } | null)?.errors
  if (!errors) return []
  return Object.entries(errors).flatMap(([field, messages]) => {
    const list = Array.isArray(messages) ? messages.map(String) : [String(messages)]
    return list.map((message) => (field === 'error' ? message : `${field} ${message}`))
  })
}

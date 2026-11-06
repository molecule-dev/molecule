/**
 * Compact a failure while prioritizing its actionable diagnostic lines over call-log bulk.
 * @param text - One complete failure's diagnostic text.
 * @param limit - Character budget, including an explicit truncation notice.
 * @returns Bounded text that preserves the message, locator and expected/received labels.
 */
export function boundedFailureText(text: string, limit: number): string {
  // eslint-disable-next-line no-control-regex -- runner errors contain terminal formatting
  const plain = text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
  if (plain.length <= limit) return plain
  const notice = '\n… [failure details truncated]'
  const lines = plain.split('\n')
  const groups = [
    /\b(?:\w*Error|AssertionError):/,
    /^\s*Locator:/,
    /^\s*[-+]?\s*Expected\b/,
    /^\s*[-+]?\s*Received\b/,
    /^\s*(?:- )?waiting for\b/,
  ]
  const selected = new Set<number>()
  for (const pattern of groups) {
    const index = lines.findIndex((line) => pattern.test(line))
    if (index >= 0) selected.add(index)
  }
  const indexes = [...selected].sort((a, b) => a - b)
  // Keep every diagnostic label even when one value is itself enormous.
  const lineLimit = Math.max(
    1,
    Math.floor((limit - notice.length) / Math.max(1, indexes.length)) - 1,
  )
  const critical = indexes
    .map((index) => {
      const line = lines[index]!
      return line.length <= lineLimit ? line : line.slice(0, Math.max(0, lineLimit - 1)) + '…'
    })
    .join('\n')
  const room = Math.max(0, limit - critical.length - notice.length - 1)
  const context = lines
    .filter((_, index) => !selected.has(index))
    .join('\n')
    .trim()
    .slice(0, room)
  return critical + (context ? '\n' + context : '') + notice
}

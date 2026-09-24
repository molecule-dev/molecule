/**
 * The word model attribution compares on: letters and digits only, lowercase,
 * so markdown (`**bold**`, `## heading`, `[text](url)`) and the terminal's
 * re-wrapping of an export compare equal to the published prose.
 *
 * @module
 */

/** How many consecutive words make one comparison unit. */
export const SHINGLE = 3

/**
 * A text's words, as attribution compares them.
 *
 * @param text - Any text: markdown, rendered prose, a file's content.
 * @returns Its words, lowercase, in order.
 */
export function words(text: string): string[] {
  const plain = text
    .normalize('NFKC')
    // A markdown link or image keeps its text, not its URL.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
  return (plain.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) as string[]
}

/**
 * The `size`-word sequences of a word list, as strings.
 *
 * @param ws - The words.
 * @param size - Sequence length.
 * @returns One key per starting position.
 */
export function shingles(ws: readonly string[], size = SHINGLE): string[] {
  const out: string[] = []
  for (let i = 0; i + size <= ws.length; i++) out.push(ws.slice(i, i + size).join(' '))
  return out
}

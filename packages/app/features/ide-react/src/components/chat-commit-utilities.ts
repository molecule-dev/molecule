/**
 * Helpers for rendering commit messages in the chat timeline.
 *
 * @module
 */

/**
 * Strips a trailing `Co-authored-by:` attribution trailer (and the blank line
 * that separates it from the message body, per git trailer convention) from a
 * commit message **for display only**.
 *
 * The agent co-authors every commit it makes (e.g. molecule.dev appends
 * `Co-authored-by: Synthase <synthase@molecule.dev>` after a blank line so the
 * commit is truthfully attributed). That trailer belongs in the real git commit
 * object — it must NOT leak into the user-facing commit displays (the commit-bar
 * status line and the expanded commit-card label), where it is noise the user
 * never wrote. Both surfaces show the message returned by the commit endpoint,
 * which is the full message including the trailer, so they call this first.
 *
 * Cuts from the blank line preceding the first `Co-authored-by:` line through the
 * end of the string, so any number of stacked co-author trailers (and any body
 * paragraphs above the blank line) are handled. Case-insensitive so both the
 * `Co-authored-by:` and `Co-Authored-By:` spellings are stripped. Messages with
 * no such trailer are returned unchanged.
 *
 * @param message - The full commit message, possibly including a co-author trailer.
 * @returns The commit message with any trailing co-author trailer removed.
 */
export function stripCommitCoauthorTrailer(message: string): string {
  return message.replace(/\s*\nCo-authored-by:[\s\S]*$/i, '')
}

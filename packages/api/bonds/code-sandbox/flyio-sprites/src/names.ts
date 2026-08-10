/**
 * Sprite naming for provider-owned sandboxes.
 *
 * A sprite name is the sandbox id — the provider never mints a separate id,
 * because the Sprites API addresses everything by name and a second identifier
 * would just be a mapping table waiting to drift.
 *
 * @module
 */

/** Longest name the Sprites API accepts (observed limit; kept conservative). */
const MAX_NAME_LENGTH = 63

/**
 * Builds the sprite name for a project id under the given prefix.
 *
 * Lowercases and collapses everything outside `[a-z0-9-]` to `-` so a UUID (or
 * any caller-supplied id) always yields a valid DNS-label-shaped name, then
 * bounds the length.
 *
 * @param prefix - The provider's name prefix (e.g. `mol-`).
 * @param projectId - The caller's project id.
 * @returns The sprite name.
 * @throws {Error} When the sanitized project id is empty — a name that is only
 *   the prefix would collide across every such project.
 */
export function spriteNameFor(prefix: string, projectId: string): string {
  const sanitized = projectId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!sanitized) {
    throw new Error(`Cannot derive a sprite name from project id ${JSON.stringify(projectId)}.`)
  }
  return `${prefix}${sanitized}`.slice(0, MAX_NAME_LENGTH)
}

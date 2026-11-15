/**
 * Safe resolution of a user's profile avatar for rendering in the chat timeline
 * (SOC1).
 *
 * The IDE chat renders the signed-in user's real avatar — an inline
 * `data:image/*` URI or a remote `http(s)` URL from the user's profile metadata
 * — in place of a generic person glyph on their own messages. This module is the
 * single, package-owned source of truth for deciding whether a stored avatar
 * value is a SAFE, renderable `<img src>`.
 *
 * It lives in the package (not the host) on purpose: the package owns the render,
 * so it must own the safety gate — a host that wires {@link ChatPanelProps.userAvatar}
 * gets correct, attack-resistant behavior for free and does not need to ship its
 * own copy. The host stays decoupled: it passes whatever string it has, and this
 * helper — not the host — decides what reaches the DOM.
 *
 * Safety: only `data:image/*` URIs and `http(s)` URLs are accepted, so a
 * `javascript:` (or other-scheme) value can never become an `<img src>`, and an
 * oversized blob is rejected. Anything else resolves to `null`, which signals the
 * caller to fall back to the generic icon.
 *
 * @module
 */

/** Maximum avatar source length we will render inline (~256 KB data-URI). */
export const MAX_AVATAR_SRC_LENGTH = 262_144

/** Image data-URI MIME types we treat as renderable avatars. */
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|avif);/i

/** Remote URL schemes we treat as renderable avatars. */
const HTTP_URL_RE = /^https?:\/\//i

/**
 * Resolve a stored avatar value to a safe `<img>` src, or `null` to fall back to
 * the generic icon.
 *
 * @param avatar - The avatar value from user metadata (data-URI, URL, or absent).
 * @returns A safe image src string, or `null` when there is no renderable avatar.
 */
export function resolveUserAvatar(avatar?: string | null): string | null {
  if (typeof avatar !== 'string') return null
  const src = avatar.trim()
  if (!src || src.length > MAX_AVATAR_SRC_LENGTH) return null
  if (!DATA_IMAGE_RE.test(src) && !HTTP_URL_RE.test(src)) return null
  return src
}

/**
 * Whether a stored avatar value is renderable (vs. needing the icon fallback).
 *
 * @param avatar - The avatar value from user metadata.
 * @returns `true` when {@link resolveUserAvatar} would return a src.
 */
export function hasRenderableAvatar(avatar?: string | null): boolean {
  return resolveUserAvatar(avatar) !== null
}

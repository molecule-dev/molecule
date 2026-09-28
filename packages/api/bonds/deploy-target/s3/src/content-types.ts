/**
 * `Content-Type` for a published file, by extension.
 *
 * @module
 */

/** Extension (lowercase, with the dot) → `Content-Type`. */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.xml': 'application/xml',
  '.rss': 'application/rss+xml',
  '.atom': 'application/atom+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
}

/**
 * The `Content-Type` a file is served with: the caller's, else by extension,
 * else `application/octet-stream`.
 *
 * @param path - Site-relative path.
 * @param given - A content type the caller supplied, if any.
 * @returns The content type.
 */
export function contentTypeFor(path: string, given?: string): string {
  if (given && given.trim()) return given.trim()
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return 'application/octet-stream'
  return CONTENT_TYPES[name.slice(dot).toLowerCase()] ?? 'application/octet-stream'
}

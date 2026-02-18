/**
 * Filesystem utility functions for molecule.dev.
 *
 * @module
 */

/**
 * Format a byte count as a human-readable file size string (e.g., '1.5 MB').
 * @param bytes - The size in bytes.
 * @returns A formatted string with the appropriate unit (B, KB, MB, GB, TB).
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

/**
 * Extract the file extension from a path, without the leading dot.
 * @param path - The file path or filename.
 * @returns The lowercase extension (e.g., 'txt'), or empty string if none.
 */
export function getExtension(path: string): string {
  const parts = path.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * Get the filename without its extension from a path.
 * @param path - The file path.
 * @returns The base filename without extension (e.g., 'readme' from '/docs/readme.md').
 */
export function getBasename(path: string): string {
  const name = path.split('/').pop() || ''
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(0, dotIndex) : name
}

/**
 * Get the directory portion of a file path.
 * @param path - The file path.
 * @returns The parent directory path (e.g., '/docs' from '/docs/readme.md').
 */
export function getDirname(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

/**
 * Join multiple path segments into a single normalized path.
 * Collapses duplicate slashes and removes trailing slashes.
 * @param segments - The path segments to join.
 * @returns The joined and normalized path.
 */
export function joinPath(...segments: string[]): string {
  return segments.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

/**
 * Infer a MIME type from a file extension. Supports common image, document,
 * text, media, and archive formats. Falls back to 'application/octet-stream'.
 * @param path - The file path or extension to look up.
 * @returns The inferred MIME type string.
 */
export function getMimeType(path: string): string {
  const ext = getExtension(path)
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'text/typescript',
    // Media
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // Archives
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * `@molecule/app-share`
 * Utility functions for share module.
 */

/**
 * Pre-built social media share URL generators. Each method returns a URL that
 * opens the platform's share dialog with the provided content pre-filled.
 */
export const socialUrls = {
  /**
   * Create a Twitter/X share URL with pre-filled text and optional URL.
   * @param text - The tweet text content.
   * @param url - Optional URL to include in the tweet.
   * @returns A Twitter intent URL that opens the compose dialog.
   */
  twitter: (text: string, url?: string): string => {
    const params = new URLSearchParams({ text })
    if (url) params.set('url', url)
    return `https://twitter.com/intent/tweet?${params.toString()}`
  },

  /**
   * Create a Facebook share URL for a given page.
   * @param url - The URL to share on Facebook.
   * @returns A Facebook sharer URL that opens the share dialog.
   */
  facebook: (url: string): string => {
    const params = new URLSearchParams({ u: url })
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
  },

  /**
   * Create a LinkedIn share URL for a given page.
   * @param url - The URL to share on LinkedIn.
   * @returns A LinkedIn sharing URL that opens the share dialog.
   */
  linkedin: (url: string): string => {
    const params = new URLSearchParams({ url })
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
  },

  /**
   * Create a WhatsApp share URL with pre-filled text.
   * @param text - The message text (may include URLs).
   * @returns A WhatsApp URL that opens a new message with the text.
   */
  whatsapp: (text: string): string => {
    const params = new URLSearchParams({ text })
    return `https://wa.me/?${params.toString()}`
  },

  /**
   * Create a Telegram share URL for a given page.
   * @param url - The URL to share on Telegram.
   * @param text - Optional accompanying text message.
   * @returns A Telegram share URL that opens the share dialog.
   */
  telegram: (url: string, text?: string): string => {
    const params = new URLSearchParams({ url })
    if (text) params.set('text', text)
    return `https://t.me/share/url?${params.toString()}`
  },

  /**
   * Create a mailto: URL for sharing via email.
   * @param subject - The email subject line.
   * @param body - The email body content.
   * @returns A mailto: URL that opens the default email client.
   */
  email: (subject: string, body: string): string => {
    const params = new URLSearchParams({ subject, body })
    return `mailto:?${params.toString()}`
  },
} as const

/**
 * Infer a MIME type from a file extension. Supports common image, document,
 * text, media, and archive formats. Falls back to 'application/octet-stream'.
 * @param filename - The filename or path to extract the extension from.
 * @returns The inferred MIME type string.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
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
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    // Media
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    // Archives
    zip: 'application/zip',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

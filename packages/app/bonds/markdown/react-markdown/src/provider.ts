/**
 * Markdown provider implementation using simple regex-based parsing.
 *
 * @module
 */

import type {
  MarkdownOptions,
  MarkdownProvider,
  RenderedMarkdown,
  TocEntry,
} from '@molecule/app-markdown'

import type { ReactMarkdownConfig } from './types.js'

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param text - Raw text to escape.
 * @returns Escaped HTML string.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generates a URL-friendly slug from heading text.
 *
 * @param text - Heading text to slugify.
 * @returns Slug string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

/**
 * Extracts table of contents entries from markdown headings.
 *
 * @param markdown - Raw markdown string.
 * @returns Array of TOC entries.
 */
function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    entries.push({
      id: slugify(text),
      text,
      level,
    })
  }

  return entries
}

/**
 * Converts markdown text to HTML using regex-based parsing.
 *
 * @param markdown - Raw markdown string.
 * @param options - Rendering options.
 * @returns HTML string.
 */
function markdownToHtml(markdown: string, options?: MarkdownOptions): string {
  const linkTarget = options?.linkTarget ?? '_self'
  let html = markdown

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h6 id="${id}">${escapeHtml(text)}</h6>`
  })
  html = html.replace(/^#####\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h5 id="${id}">${escapeHtml(text)}</h5>`
  })
  html = html.replace(/^####\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h4 id="${id}">${escapeHtml(text)}</h4>`
  })
  html = html.replace(/^###\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h3 id="${id}">${escapeHtml(text)}</h3>`
  })
  html = html.replace(/^##\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h2 id="${id}">${escapeHtml(text)}</h2>`
  })
  html = html.replace(/^#\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h1 id="${id}">${escapeHtml(text)}</h1>`
  })

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ''
    return `<pre><code${langAttr}>${escapeHtml(code.trimEnd())}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Images (must come before links to avoid matching `![...]` as `[...]`)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="${linkTarget}">$1</a>`)

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')

  // Line breaks
  if (options?.breaks) {
    html = html.replace(/\n/g, '<br />\n')
  }

  // Paragraphs (lines not already wrapped in tags)
  html = html.replace(/^(?!<[a-z])((?!<).+)$/gm, '<p>$1</p>')

  return html
}

/**
 * Creates a react-markdown-compatible provider instance.
 *
 * @param config - Optional provider configuration.
 * @returns A configured MarkdownProvider.
 */
export function createProvider(config?: ReactMarkdownConfig): MarkdownProvider {
  const defaultSanitize = config?.sanitize ?? true
  const defaultGfm = config?.gfm ?? true

  return {
    name: 'react-markdown',

    render(markdown: string, options?: MarkdownOptions): RenderedMarkdown {
      const mergedOptions: MarkdownOptions = {
        sanitize: defaultSanitize,
        gfm: defaultGfm,
        ...options,
      }

      const html = markdownToHtml(markdown, mergedOptions)
      const toc = extractToc(markdown)

      return {
        html,
        toc: toc.length > 0 ? toc : undefined,
      }
    },
  }
}

/** Default react-markdown provider instance. */
export const provider: MarkdownProvider = createProvider()

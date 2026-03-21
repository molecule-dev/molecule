/**
 * Markdown content renderer for AI chat messages.
 *
 * Handles the subset of Markdown that Claude commonly produces:
 * fenced code blocks, headers, ordered/unordered lists, bold, italic,
 * and inline code. No external dependencies.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { memo, useMemo, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { StreamingIndicator } from './StreamingIndicator.js'

// ---------------------------------------------------------------------------
// Segmentation — split on fenced code blocks first
// ---------------------------------------------------------------------------

type Segment = { type: 'code'; lang: string; content: string } | { type: 'text'; content: string }

/**
 * Splits raw markdown text into alternating prose and fenced code block segments.
 * @param text - The raw markdown string to split.
 * @returns An array of text and code segments.
 */
function splitSegments(text: string): Segment[] {
  const out: Segment[] = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', content: text.slice(last, m.index) })
    out.push({ type: 'code', lang: m[1] ?? '', content: m[2].trimEnd() })
    last = m.index + m[0].length
  }

  if (last < text.length) out.push({ type: 'text', content: text.slice(last) })
  return out
}

// ---------------------------------------------------------------------------
// Inline rendering — bold, italic, inline code
// ---------------------------------------------------------------------------

const INLINE_RE = /(`[^`\n]+`|\*\*(?:[^*]|\*(?!\*))+\*\*|\*[^*\n]+\*)/g

/**
 * Renders inline markdown formatting (bold, italic, inline code) as React nodes.
 * @param text - The text containing inline markdown tokens.
 * @returns A ReactNode with formatted inline elements.
 */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let last = 0
  let k = 0

  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok[0] === '`') {
      parts.push(
        <code
          key={k++}
          style={{
            fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
            fontSize: '0.875em',
            background: 'rgba(128,128,128,0.15)',
            borderRadius: '3px',
            padding: '1px 4px',
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={k++}>{tok.slice(1, -1)}</em>)
    }
    last = m.index! + m[0].length
  }

  if (last < text.length) parts.push(text.slice(last))
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return <>{parts}</>
}

// ---------------------------------------------------------------------------
// Prose block rendering — headers, lists, paragraphs
// ---------------------------------------------------------------------------

/**
 * Renders a prose text segment as structured HTML (headers, lists, paragraphs).
 * @param root0 - Component props.
 * @param root0.content - The raw prose text to parse and render.
 * @param root0.segIdx - The segment index used for generating stable React keys.
 * @returns The rendered prose block element.
 */
function Prose({ content, segIdx }: { content: string; segIdx: number }): JSX.Element {
  const lines = content.split('\n')
  const els: JSX.Element[] = []
  let k = segIdx * 10000
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line — paragraph separator
    if (!line.trim()) {
      i++
      continue
    }

    // Headers
    const hm = line.match(/^(#{1,3}) (.+)/)
    if (hm) {
      const lvl = hm[1].length
      els.push(
        <p
          key={k++}
          style={{
            fontWeight: 600,
            fontSize: lvl === 1 ? '1.05em' : '1em',
            marginBottom: '4px',
            marginTop: i > 0 ? '10px' : 0,
          }}
        >
          {renderInline(hm[2])}
        </p>,
      )
      i++
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: JSX.Element[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^[-*] /, ''))}</li>)
        i++
      }
      els.push(
        <ul key={k++} style={{ paddingLeft: '18px', marginBottom: '6px', listStyleType: 'disc' }}>
          {items}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: JSX.Element[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>)
        i++
      }
      els.push(
        <ol
          key={k++}
          style={{ paddingLeft: '18px', marginBottom: '6px', listStyleType: 'decimal' }}
        >
          {items}
        </ol>,
      )
      continue
    }

    // Paragraph — collect consecutive non-special lines
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3} /.test(lines[i]) &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    if (para.length) {
      els.push(
        <p key={k++} style={{ whiteSpace: 'pre-wrap', marginBottom: '6px' }}>
          {renderInline(para.join('\n'))}
        </p>,
      )
    }
  }

  return <>{els}</>
}

// ---------------------------------------------------------------------------
// Code block with language label + copy button
// ---------------------------------------------------------------------------

/**
 * Renders a fenced code block with a language label and copy-to-clipboard button.
 * @param root0 - Component props.
 * @param root0.lang - The code language identifier for the header label.
 * @param root0.content - The code content to display.
 * @returns The rendered code block element.
 */
function CodeBlock({ lang, content }: { lang: string; content: string }): JSX.Element {
  const cm = getClassMap()
  const [copied, setCopied] = useState(false)

  /** Copies the code block content to clipboard and shows a brief confirmation. */
  function handleCopy(): void {
    void navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cm.surfaceSecondary}
      style={{ borderRadius: '6px', marginBottom: '10px', overflow: 'hidden' }}
    >
      {/* Header: language label + copy button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '3px 10px',
          borderBottom: '1px solid rgba(128,128,128,0.15)',
          fontSize: '11px',
          opacity: 0.75,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--vscode-editor-font-family, monospace)',
            letterSpacing: '0.3px',
          }}
        >
          {lang || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: '11px',
            padding: '2px 6px',
            opacity: 0.75,
          }}
        >
          {copied ? '\u2713 Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          overflowX: 'auto',
          fontSize: '12px',
          lineHeight: 1.6,
          fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
          whiteSpace: 'pre',
        }}
      >
        <code>{content}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface MarkdownContentProps {
  /** The raw markdown text to render. */
  text: string
  /** When true, appends a blinking cursor at the end (streaming indicator). */
  isStreaming?: boolean
}

/**
 * Renders a subset of Markdown as React elements.
 * Handles fenced code blocks (with copy button), headers, lists,
 * bold/italic, and inline code.
 * @param root0 - Component props.
 * @param root0.text - The raw markdown text to render.
 * @param root0.isStreaming - Whether to show a streaming indicator at the end.
 * @returns The rendered markdown content element.
 */
export const MarkdownContent = memo(function MarkdownContent({
  text,
  isStreaming,
}: MarkdownContentProps): JSX.Element {
  const segments = useMemo(() => (text ? splitSegments(text) : []), [text])

  if (!text) {
    return <>{isStreaming && <StreamingIndicator />}</>
  }

  return (
    <div style={{ fontSize: '13px', lineHeight: 1.6, marginTop: '6px' }}>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} lang={seg.lang} content={seg.content} />
        ) : (
          <Prose key={i} content={seg.content} segIdx={i} />
        ),
      )}
      {isStreaming && <StreamingIndicator inline />}
    </div>
  )
})

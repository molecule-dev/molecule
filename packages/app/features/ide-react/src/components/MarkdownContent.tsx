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
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { StreamingIndicator } from './StreamingIndicator.js'

/**
 * Renders a single markdown link `[label](href)`. A ROUTE link — any app-internal path, whether
 * written with a leading slash (`/transactions`) or without (`transactions`, `courses/:id`) — is a
 * page in the live preview: when an `onNavigatePreview` handler is wired (the chat context), it
 * renders as a button that navigates the PREVIEW to that route on click (the path is normalized to
 * a leading `/`), so the agent's "your app is ready" handoff can list clickable pages the user
 * jumps straight to. Only a genuinely EXTERNAL link — one with a URL scheme (`http(s):`, `mailto:`)
 * or protocol-relative (`//host`) — opens in a new tab; a bare route must never open a new tab. A
 * route link with no handler (e.g. a help card), or a parameterized route (`/courses/:id`) that has
 * no concrete destination, renders as plain text rather than a broken/IDE-navigating link. A
 * `#anchor` can't address a preview page, so it stays an inert anchor.
 *
 * @param root0 - Component props.
 * @param root0.label - The link's visible text.
 * @param root0.href - The link target (an app route — slash-prefixed or bare — or an absolute URL).
 * @param root0.onNavigatePreview - Navigates the preview to a route path; enables route links.
 * @returns The rendered link node.
 */
function LinkToken({
  label,
  href,
  onNavigatePreview,
}: {
  label: string
  href: string
  onNavigatePreview?: (path: string) => void
}): JSX.Element {
  const linkStyle = {
    color: 'var(--mol-color-primary, #4070e0)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  } as const

  // External = a URL scheme (http:, https:, mailto:, tel:, …) or protocol-relative (//host).
  // Everything else is an app route for the preview — INCLUDING bare paths the agent emits
  // WITHOUT a leading slash (`courses/:id`), which used to fall through to a new-tab anchor (the
  // "opens a new tab instead of the preview" bug). A `#anchor` can't address a preview page.
  const isExternal = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')
  const isAnchor = href.startsWith('#')

  if (!isExternal && !isAnchor) {
    // Normalize to a root-relative path so the handler always receives a clean `/route`.
    const path = href.startsWith('/') ? href : `/${href}`
    // A parameterized route (`/courses/:id`, a `*` splat) has no concrete destination — navigating
    // the preview to a literal `:id` just 404s, so it's a useless "get started" link. Render the
    // label as plain text instead. (The handoff prompt also tells the agent to list concrete,
    // parameter-free landing pages — this is the renderer-side safety net.)
    const isParameterized = path.split('/').some((seg) => seg.startsWith(':') || seg === '*')
    if (isParameterized || !onNavigatePreview) return <>{label}</>
    return (
      <button
        type="button"
        data-mol-id="chat-preview-link"
        onClick={() => onNavigatePreview(path)}
        title={t(
          'ide.chat.previewLinkTitle',
          { path },
          { defaultValue: 'Open {{path}} in the preview' },
        )}
        style={{
          ...linkStyle,
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {label}
    </a>
  )
}

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

// Order matters: link `[text](url)` is matched before bold/italic so a label/url containing
// `*` isn't mis-split. The url stops at whitespace or the closing paren.
const INLINE_RE = /(`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*[^*\n]+\*)/g

/**
 * Renders inline markdown formatting (bold, italic, inline code, links) as React nodes.
 * @param text - The text containing inline markdown tokens.
 * @param onNavigatePreview - Optional handler so a `[label](/route)` link navigates the preview.
 * @returns A ReactNode with formatted inline elements.
 */
function renderInline(text: string, onNavigatePreview?: (path: string) => void): ReactNode {
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
    } else if (tok[0] === '[') {
      // [label](href)
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      if (lm) {
        parts.push(
          <LinkToken key={k++} label={lm[1]} href={lm[2]} onNavigatePreview={onNavigatePreview} />,
        )
      } else {
        parts.push(tok)
      }
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
function Prose({
  content,
  segIdx,
  onNavigatePreview,
}: {
  content: string
  segIdx: number
  onNavigatePreview?: (path: string) => void
}): JSX.Element {
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
          {renderInline(hm[2], onNavigatePreview)}
        </p>,
      )
      i++
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: JSX.Element[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^[-*] /, ''), onNavigatePreview)}</li>,
        )
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
        items.push(
          <li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''), onNavigatePreview)}</li>,
        )
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
          {renderInline(para.join('\n'), onNavigatePreview)}
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
  /**
   * Current activity/status label (e.g. a verification step like "Type-checking
   * the app"). When set WHILE streaming, the trailing indicator switches from a
   * bare inline cursor to a labeled block below the finalized text — so the
   * post-response check phase is never an unlabeled spinner. This is the window
   * after the model's text is done but `isStreaming` is still true because the
   * server is running type-check / lint / runtime probes.
   */
  statusLabel?: string | null
  /** Turn start (ms) for the labeled indicator's elapsed timer. */
  statusStartedAt?: number
  /**
   * Navigates the live preview to a route path. When provided, a `[label](/route)` markdown
   * link renders as a clickable button that jumps the preview to that page (instead of opening
   * a new tab or navigating the IDE) — so the agent's "your app is ready" handoff can list the
   * app's pages as one-click links.
   */
  onNavigatePreview?: (path: string) => void
  /**
   * Suppress this component's OWN trailing streaming indicators (the inline end-of-text cursor
   * and the labeled verification block). The chat owns a single, persistent activity indicator
   * for the whole turn, so the per-message ones here would just duplicate it AND flicker on/off
   * as each message finalizes (the cause of the jumpy scroll). `isStreaming` is still honored
   * for the live throttled parse — only the spinner is hidden.
   */
  hideStreamingIndicator?: boolean
}

/**
 * Renders a subset of Markdown as React elements.
 * Handles fenced code blocks (with copy button), headers, lists,
 * bold/italic, and inline code.
 * @param root0 - Component props.
 * @param root0.text - The raw markdown text to render.
 * @param root0.isStreaming - Whether to show a streaming indicator at the end.
 * @param root0.statusLabel - Current status label; shown as a labeled block while streaming.
 * @param root0.statusStartedAt - Turn start (ms) for the labeled indicator's timer.
 * @returns The rendered markdown content element.
 */
export const MarkdownContent = memo(function MarkdownContent({
  text,
  isStreaming,
  statusLabel,
  statusStartedAt,
  onNavigatePreview,
  hideStreamingIndicator,
}: MarkdownContentProps): JSX.Element {
  // Markdown is parsed + rendered LIVE while streaming (not deferred until the
  // stream finalizes). The page freezes that originally motivated deferring it
  // were caused by stale Vite pre-bundle caches serving a duplicate React, NOT
  // by this parse.
  //
  // One real concern from that era remains: `text` grows on every ~50ms flush, so
  // re-parsing the FULL content on every flush is O(content²) over a long stream
  // (a big plan / file content streamed into chat) — sustained main-thread CPU.
  // We keep it live but THROTTLE the parse input to ~120ms (≈8 renders/sec, still
  // visually live) so the per-flush re-parse work is bounded. On finalize we parse
  // the complete text immediately so the last tokens never lag.
  const PARSE_THROTTLE_MS = 120
  const [parseText, setParseText] = useState(text)
  const lastParseAtRef = useRef(0)
  useEffect(() => {
    if (!isStreaming) {
      setParseText(text) // finalized (or non-streaming) — parse the full, stable text now
      return
    }
    const elapsed = Date.now() - lastParseAtRef.current
    if (elapsed >= PARSE_THROTTLE_MS) {
      lastParseAtRef.current = Date.now()
      setParseText(text)
      return
    }
    // Leading+trailing throttle: schedule the pending update so continuous
    // streaming still refreshes ~every PARSE_THROTTLE_MS (a plain debounce here
    // would defer ALL rendering to the end — the very bug we're removing).
    const id = setTimeout(() => {
      lastParseAtRef.current = Date.now()
      setParseText(text)
    }, PARSE_THROTTLE_MS - elapsed)
    return () => clearTimeout(id)
  }, [text, isStreaming])
  const segments = useMemo(() => (parseText ? splitSegments(parseText) : []), [parseText])

  // A real status label (verification step) makes the trailing indicator a
  // labeled block; otherwise it's the bare end-of-text cursor used during
  // token-by-token streaming.
  const hasStatus = statusLabel != null && statusLabel.trim() !== ''

  if (!text) {
    return (
      <>
        {isStreaming && !hideStreamingIndicator && (
          <StreamingIndicator
            label={hasStatus ? statusLabel! : undefined}
            startedAt={statusStartedAt}
          />
        )}
      </>
    )
  }

  if (isStreaming) {
    return (
      <>
        <div
          style={{ fontSize: '13px', lineHeight: 1.6, marginTop: '6px', wordBreak: 'break-word' }}
        >
          {/* Live markdown — parsed segments render as they stream in. An
              incomplete construct (e.g. an unclosed ``` fence) falls back to
              prose via splitSegments until its closer arrives, then upgrades. */}
          {segments.map((seg, i) =>
            seg.type === 'code' ? (
              <CodeBlock key={i} lang={seg.lang} content={seg.content} />
            ) : (
              <Prose
                key={i}
                content={seg.content}
                segIdx={i}
                onNavigatePreview={onNavigatePreview}
              />
            ),
          )}
          {/* Bare end-of-text cursor only while the MODEL is still generating
              tokens (no status label yet). Once the text is done and the server
              is verifying, `statusLabel` is set and we show the labeled block
              below instead — never an unlabeled spinner. Suppressed when the host
              owns a single turn-level indicator (hideStreamingIndicator). */}
          {!hideStreamingIndicator && !hasStatus && <StreamingIndicator inline />}
        </div>
        {!hideStreamingIndicator && hasStatus && (
          <StreamingIndicator label={statusLabel!} startedAt={statusStartedAt} />
        )}
      </>
    )
  }

  return (
    <div style={{ fontSize: '13px', lineHeight: 1.6, marginTop: '6px' }}>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} lang={seg.lang} content={seg.content} />
        ) : (
          <Prose key={i} content={seg.content} segIdx={i} onNavigatePreview={onNavigatePreview} />
        ),
      )}
    </div>
  )
})

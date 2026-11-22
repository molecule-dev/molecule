/**
 * Markdown content renderer for AI chat messages.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `MarkdownContent` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input. Handles the subset of Markdown that Claude commonly
 * produces — fenced code blocks (with a language label and copy button),
 * headers, ordered/unordered lists, bold, italic, inline code and
 * `[label](href)` links. No external dependencies.
 *
 * Model output is prompt-injectable, so `[label](href)` links obey the same
 * scheme allowlist as React's component: only `http:`, `https:` and `mailto:`
 * (plus protocol-relative `//host`) become anchors; every other scheme
 * renders as inert text. A route link (slash-prefixed or bare) renders as a
 * button that navigates the live preview when `onNavigatePreview` is wired;
 * a parameterized route (`/courses/:id`) or a route with no handler renders as
 * plain text. A `#anchor` stays an anchor.
 *
 * Markdown is parsed LIVE while streaming, throttled to ~120ms so the
 * per-flush re-parse work stays bounded (a leading+trailing throttle: the
 * pending update is scheduled, never debounced away); on finalize the full
 * text parses at once. The trailing indicator is the bare inline cursor only
 * while the model is generating — once `statusLabel` is set it becomes the
 * labeled verification block below the text, and either is suppressed by
 * `hideStreamingIndicator` (the chat owns one turn-level indicator).
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`. Styling uses `getClassMap()`; the inline
 * styles are the ones React writes, so the rendered attributes are identical.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNodeChild,
  watch,
} from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { StreamingIndicator } from './StreamingIndicator.js'

/**
 * The only URL schemes that may become an `<a href>` anchor. Model output is
 * prompt-injectable (the agent reads imported repos, shared projects, scraped
 * content), and browsers percent-decode hrefs before executing them, so a
 * `[x](javascript:fetch%28…%29)` link must never reach the DOM as an anchor —
 * any other scheme renders as inert text (same policy as the markdown bonds'
 * `isSafeUrl`).
 */
const EXTERNAL_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

/**
 * Whether `href` may become an `<a href>` anchor at all. A URL whose scheme is
 * NOT on the allowlist (`javascript:`, `data:`, `vbscript:`, …) must render as
 * inert text. A href with NO scheme (app routes, `#anchor`, `//host`) carries
 * nothing executable, so it is allowed through this gate.
 *
 * Browsers strip tab/CR/LF anywhere in a URL (and leading C0 controls/space)
 * BEFORE scheme parsing, so `java\tscript:…` executes as `javascript:`. This
 * gate strips those characters first and reads the scheme the way the browser
 * will.
 *
 * @param href - The raw href from model output.
 * @returns True when the href may render as an anchor.
 */
export function isAllowedLinkHref(href: string): boolean {
  const withoutBreaks = href.replace(/[\t\r\n]/g, '')
  // A URL parser skips LEADING C0 controls and spaces before the scheme: do the
  // same, so `"\u0000javascript:..."` cannot slip past the allowlist.
  let start = 0
  while (start < withoutBreaks.length && withoutBreaks.charCodeAt(start) <= 0x20) start += 1
  const cleaned = withoutBreaks.slice(start)
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(cleaned)?.[1]?.toLowerCase()
  return scheme == null || EXTERNAL_LINK_SCHEMES.has(scheme)
}

/** One fenced code block or one run of prose. */
type Segment = { type: 'code'; lang: string; content: string } | { type: 'text'; content: string }

/**
 * Splits raw markdown text into alternating prose and fenced code block segments.
 *
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

// Order matters: link `[text](url)` is matched before bold/italic so a label/url containing
// `*` isn't mis-split. The url stops at whitespace or the closing paren.
const INLINE_RE = /(`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*[^*\n]+\*)/g

/** One inline node: plain text, an inline element, or a resolved link. */
type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'button'; label: string; path: string }
  | { kind: 'anchor'; label: string; href: string }

/**
 * The inline style of a markdown link (anchor or preview button): the theme
 * primary, underlined, in the text flow.
 */
const LINK_STYLE = {
  color: 'var(--mol-color-primary, #4070e0)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
} as const

/**
 * Resolves one `[label](href)` token to the node React's `LinkToken` renders:
 * inert text for an unapproved scheme, a preview button for a concrete route
 * with a handler, an anchor for an allowlisted or protocol-relative href (and a
 * `#anchor`), text otherwise.
 *
 * @param label - The link's label.
 * @param href - The raw href.
 * @param onNavigatePreview - Optional handler that navigates the live preview.
 * @returns The inline node to render.
 */
function resolveLink(
  label: string,
  href: string,
  onNavigatePreview?: (path: string) => void,
): InlineNode {
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(href)?.[1]?.toLowerCase()
  const allowlisted = isAllowedLinkHref(href)
  const isExternal = (scheme != null && allowlisted) || href.startsWith('//')
  const isAnchor = href.startsWith('#')

  // Unapproved scheme → inert text: no anchor (model output must not be able to mint a
  // `javascript:` href) and no preview button (a `data:`/`ftp:` string is not an app route).
  if (scheme != null && !allowlisted) return { kind: 'text', text: label }

  if (!isExternal && !isAnchor) {
    // Normalize to a root-relative path so the handler always receives a clean `/route`.
    const path = href.startsWith('/') ? href : `/${href}`
    // A parameterized route (`/courses/:id`, a `*` splat) has no concrete destination — navigating
    // the preview to a literal `:id` just 404s, so it renders the label as plain text.
    const isParameterized = path.split('/').some((seg) => seg.startsWith(':') || seg === '*')
    if (isParameterized || !onNavigatePreview) return { kind: 'text', text: label }
    return { kind: 'button', label, path }
  }
  return { kind: 'anchor', label, href }
}

/**
 * Parses a run of text into inline markdown nodes (code, links, bold, italic).
 *
 * @param text - The text containing inline markdown tokens.
 * @param onNavigatePreview - Optional handler so a `[label](/route)` link navigates the preview.
 * @returns The inline nodes, in order.
 */
function parseInline(text: string, onNavigatePreview?: (path: string) => void): InlineNode[] {
  const out: InlineNode[] = []
  let last = 0

  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    const tok = m[0]
    if (tok[0] === '`') {
      out.push({ kind: 'code', text: tok.slice(1, -1) })
    } else if (tok[0] === '[') {
      // [label](href)
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      out.push(lm ? resolveLink(lm[1], lm[2], onNavigatePreview) : { kind: 'text', text: tok })
    } else if (tok.startsWith('**')) {
      out.push({ kind: 'strong', text: tok.slice(2, -2) })
    } else {
      out.push({ kind: 'em', text: tok.slice(1, -1) })
    }
    last = at + tok.length
  }

  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

/** One rendered prose block: a header, a list, or a paragraph. */
type Block =
  | { kind: 'header'; level: number; nodes: InlineNode[]; marginTop: string }
  | { kind: 'ul'; items: InlineNode[][] }
  | { kind: 'ol'; items: InlineNode[][] }
  | { kind: 'para'; nodes: InlineNode[] }

/**
 * A header line: one to three `#`s, a space and its text. The paragraph loop ends at exactly
 * the lines this matches. When it also ended at `## ` alone (a header marker whose text has not
 * streamed in yet), neither branch took that line and the parse never returned.
 */
const HEADER_RE = /^(#{1,3}) (.+)/

/**
 * Parses a prose segment into blocks (headers, lists, paragraphs), the way
 * React's `Prose` walks its lines.
 *
 * @param content - The segment's text.
 * @param onNavigatePreview - Optional handler for route links inside the blocks.
 * @returns The blocks, in order.
 */
function parseBlocks(content: string, onNavigatePreview?: (path: string) => void): Block[] {
  const lines = content.split('\n')
  const out: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Blank line — paragraph separator
    if (!line.trim()) {
      i++
      continue
    }

    // Headers
    const hm = line.match(HEADER_RE)
    if (hm) {
      out.push({
        kind: 'header',
        level: hm[1].length,
        nodes: parseInline(hm[2], onNavigatePreview),
        marginTop: i > 0 ? '10px' : '0px',
      })
      i++
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: InlineNode[][] = []
      while (i < lines.length && /^[-*] /.test(lines[i] ?? '')) {
        items.push(parseInline((lines[i] ?? '').replace(/^[-*] /, ''), onNavigatePreview))
        i++
      }
      out.push({ kind: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: InlineNode[][] = []
      while (i < lines.length && /^\d+\. /.test(lines[i] ?? '')) {
        items.push(parseInline((lines[i] ?? '').replace(/^\d+\. /, ''), onNavigatePreview))
        i++
      }
      out.push({ kind: 'ol', items })
      continue
    }

    // Paragraph — collect consecutive non-special lines
    const para: string[] = []
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() &&
      !HEADER_RE.test(lines[i] ?? '') &&
      !/^[-*] /.test(lines[i] ?? '') &&
      !/^\d+\. /.test(lines[i] ?? '')
    ) {
      para.push(lines[i] ?? '')
      i++
    }
    if (para.length)
      out.push({ kind: 'para', nodes: parseInline(para.join('\n'), onNavigatePreview) })
  }

  return out
}

/** The `inline code` style, exactly as React writes it. */
const INLINE_CODE_STYLE = {
  fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
  fontSize: '0.875em',
  background: 'rgba(128, 128, 128, 0.15)',
  borderRadius: '3px',
  padding: '1px 4px',
} as const

/** The preview link button's style: the link style, reset to sit in the text flow. */
const LINK_BUTTON_STYLE = {
  ...LINK_STYLE,
  background: 'none',
  border: 'none',
  padding: '0px',
  font: 'inherit',
  cursor: 'pointer',
} as const

/** The message wrapper's style (streaming and finalized share it). */
const ROOT_STYLE = {
  fontSize: '13px',
  lineHeight: '1.6',
  marginTop: '6px',
  wordBreak: 'break-word',
} as const

/**
 * Renders one inline node list as Vue children.
 *
 * @param nodes - The inline nodes.
 * @param titleFor - Builds the preview button's translated title.
 * @param onNavigatePreview - Handler that navigates the preview.
 * @returns The Vue children.
 */
function renderInline(
  nodes: InlineNode[],
  titleFor: (path: string) => string,
  onNavigatePreview?: (path: string) => void,
): VNodeChild[] {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case 'code':
        return h('code', { key: i, style: INLINE_CODE_STYLE }, node.text)
      case 'strong':
        return h('strong', { key: i }, node.text)
      case 'em':
        return h('em', { key: i }, node.text)
      case 'button':
        return h(
          'button',
          {
            key: i,
            type: 'button',
            'data-mol-id': 'chat-preview-link',
            onClick: () => onNavigatePreview?.(node.path),
            title: titleFor(node.path),
            style: LINK_BUTTON_STYLE,
          },
          node.label,
        )
      case 'anchor':
        return h(
          'a',
          {
            key: i,
            href: node.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: LINK_STYLE,
          },
          node.label,
        )
      default:
        return node.text
    }
  })
}

/**
 * Renders one prose segment's blocks (headers, lists, paragraphs).
 *
 * @param blocks - The parsed blocks.
 * @param titleFor - Builds the preview button's translated title.
 * @param onNavigatePreview - Handler that navigates the preview.
 * @returns The block elements.
 */
function renderBlocks(
  blocks: Block[],
  titleFor: (path: string) => string,
  onNavigatePreview?: (path: string) => void,
): VNodeChild[] {
  return blocks.map((block, i) => {
    if (block.kind === 'header') {
      return h(
        'p',
        {
          key: i,
          style: {
            fontWeight: '600',
            fontSize: block.level === 1 ? '1.05em' : '1em',
            marginBottom: '4px',
            marginTop: block.marginTop,
          },
        },
        renderInline(block.nodes, titleFor, onNavigatePreview),
      )
    }
    if (block.kind === 'ul' || block.kind === 'ol') {
      return h(
        block.kind,
        {
          key: i,
          style: {
            paddingLeft: '18px',
            marginBottom: '6px',
            listStyleType: block.kind === 'ul' ? 'disc' : 'decimal',
          },
        },
        block.items.map((item, j) =>
          h('li', { key: j }, renderInline(item, titleFor, onNavigatePreview)),
        ),
      )
    }
    return h(
      'p',
      { key: i, style: { whiteSpace: 'pre-wrap', marginBottom: '6px' } },
      renderInline(block.nodes, titleFor, onNavigatePreview),
    )
  })
}

/** Props for {@link MarkdownContent} — the React prop names, React's own contract. */
export interface MarkdownContentProps {
  /** The raw markdown text to render. */
  text: string
  /** When true, appends a blinking cursor at the end (streaming indicator). */
  isStreaming?: boolean
  /**
   * Current activity/status label (e.g. a verification step like "Type-checking
   * the app"). When set WHILE streaming, the trailing indicator switches from a
   * bare inline cursor to a labeled block below the finalized text.
   */
  statusLabel?: string | null
  /** Turn start (ms) for the labeled indicator's elapsed timer. */
  statusStartedAt?: number
  /**
   * Navigates the live preview to a route path. When provided, a `[label](/route)`
   * markdown link renders as a clickable button that jumps the preview to that page.
   */
  onNavigatePreview?: (path: string) => void
  /**
   * Suppress this component's OWN trailing streaming indicators. The chat owns a
   * single, persistent activity indicator for the whole turn.
   */
  hideStreamingIndicator?: boolean
}

/**
 * Renders a fenced code block with a language label and copy-to-clipboard
 * button. Its `copied` state is per block instance, as in React.
 */
const MarkdownCodeBlock = defineComponent({
  name: 'MarkdownCodeBlock',
  props: {
    lang: { type: String, required: true },
    content: { type: String, required: true },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the code block content to clipboard and shows a brief confirmation. */
    function handleCopy(): void {
      void copyTextWithFallback(props.content).then((ok) => {
        if (!ok) return
        copied.value = true
        clearTimeout(timer)
        timer = setTimeout(() => {
          copied.value = false
        }, 1500)
      })
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNodeChild =>
      h(
        'div',
        {
          class: cm.surfaceSecondary,
          style: { borderRadius: '6px', marginBottom: '10px', overflow: 'hidden' },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3px 10px',
                borderBottom: '1px solid rgba(128,128,128,0.15)',
                fontSize: '11px',
                opacity: '0.75',
              },
            },
            [
              h(
                'span',
                {
                  style: {
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                    letterSpacing: '0.3px',
                  },
                },
                props.lang || 'text',
              ),
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'chat-code-copy',
                  onClick: handleCopy,
                  class: cm.touchTargetCompact,
                  style: {
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontSize: '11px',
                    padding: '2px 6px',
                    opacity: '0.75',
                  },
                },
                copied.value
                  ? t('ide.chat.code.copied', undefined, { defaultValue: '✓ Copied' })
                  : t('ide.chat.code.copy', undefined, { defaultValue: 'Copy' }),
              ),
            ],
          ),
          h(
            'pre',
            {
              style: {
                margin: '0px',
                padding: '10px 12px',
                overflowX: 'auto',
                fontSize: '12px',
                lineHeight: '1.6',
                fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
                whiteSpace: 'pre',
              },
            },
            [h('code', props.content)],
          ),
        ],
      )
  },
})

/**
 * Renders a subset of Markdown as Vue nodes. Handles fenced code blocks (with
 * copy button), headers, lists, bold/italic, inline code and links.
 */
export const MarkdownContent = defineComponent({
  name: 'MarkdownContent',
  props: {
    /** The raw markdown text to render. */
    text: { type: String, required: true },
    /** When true, appends a blinking cursor at the end (streaming indicator). */
    isStreaming: { type: Boolean, required: false, default: undefined },
    /** Current activity/status label; a labeled block replaces the bare cursor. */
    statusLabel: {
      type: String as PropType<string | null | undefined>,
      required: false,
      default: undefined,
    },
    /** Turn start (ms) for the labeled indicator's elapsed timer. */
    statusStartedAt: {
      type: Number as PropType<number | undefined>,
      required: false,
      default: undefined,
    },
    /** Navigates the live preview to a route path. */
    onNavigatePreview: {
      type: Function as PropType<((path: string) => void) | undefined>,
      required: false,
      default: undefined,
    },
    /** Suppresses this component's own trailing streaming indicators. */
    hideStreamingIndicator: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const { t } = useTranslation()

    // Markdown is parsed + rendered LIVE while streaming (not deferred until the
    // stream finalizes), with the parse input THROTTLED to ~120ms so the
    // per-flush re-parse work is bounded; on finalize the complete text parses
    // immediately so the last tokens never lag.
    const PARSE_THROTTLE_MS = 120
    const parseText = ref(props.text)
    let lastParseAt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    watch(
      [() => props.text, () => props.isStreaming],
      ([text, isStreaming]) => {
        clearTimeout(timer)
        timer = undefined
        if (!isStreaming) {
          parseText.value = text // finalized (or non-streaming) — parse the full, stable text now
          return
        }
        const elapsed = Date.now() - lastParseAt
        if (elapsed >= PARSE_THROTTLE_MS) {
          lastParseAt = Date.now()
          parseText.value = text
          return
        }
        // Leading+trailing throttle: schedule the pending update so continuous
        // streaming still refreshes ~every PARSE_THROTTLE_MS (a plain debounce
        // here would defer ALL rendering to the end).
        timer = setTimeout(() => {
          lastParseAt = Date.now()
          parseText.value = text
        }, PARSE_THROTTLE_MS - elapsed)
      },
      { immediate: true },
    )
    onUnmounted(() => clearTimeout(timer))

    const segments = computed(() => (parseText.value ? splitSegments(parseText.value) : []))

    return (): VNodeChild => {
      const { text, isStreaming, onNavigatePreview, hideStreamingIndicator } = props
      // A real status label (verification step) makes the trailing indicator a
      // labeled block; otherwise it's the bare end-of-text cursor.
      const hasStatus = props.statusLabel != null && props.statusLabel.trim() !== ''
      /** Builds the preview button's translated title (read here so a locale switch re-renders). */
      const titleFor = (path: string): string =>
        t('ide.chat.previewLinkTitle', { path }, { defaultValue: 'Open {{path}} in the preview' })

      if (!text) {
        return isStreaming && !hideStreamingIndicator
          ? h(StreamingIndicator, {
              label: hasStatus ? props.statusLabel : undefined,
              startedAt: props.statusStartedAt,
            })
          : null
      }

      const content: VNodeChild[] = segments.value.map((seg, i) =>
        seg.type === 'code'
          ? h(MarkdownCodeBlock, { key: i, lang: seg.lang, content: seg.content })
          : renderBlocks(parseBlocks(seg.content, onNavigatePreview), titleFor, onNavigatePreview),
      )

      if (!isStreaming) {
        return h('div', { style: ROOT_STYLE }, content)
      }

      return [
        h('div', { style: ROOT_STYLE }, [
          ...content,
          // Bare end-of-text cursor only while the MODEL is still generating
          // tokens (no status label yet); suppressed when the host owns a single
          // turn-level indicator.
          !hideStreamingIndicator && !hasStatus ? h(StreamingIndicator, { inline: true }) : null,
        ]),
        !hideStreamingIndicator && hasStatus
          ? h(StreamingIndicator, {
              label: props.statusLabel,
              startedAt: props.statusStartedAt,
            })
          : null,
      ]
    }
  },
})

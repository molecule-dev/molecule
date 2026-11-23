/**
 * Markdown content renderer for AI chat messages.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `MarkdownContent` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input. Handles the subset of Markdown that Claude
 * commonly produces — fenced code blocks (with a language label and copy
 * button), headers, ordered/unordered lists, bold, italic, inline code and
 * `[label](href)` links. No external dependencies.
 *
 * Model output is prompt-injectable, so `[label](href)` links obey the same
 * scheme allowlist as React's component: only `http:`, `https:` and `mailto:`
 * (plus protocol-relative `//host`) become anchors; every other scheme renders
 * as inert text. A route link (slash-prefixed or bare) renders as a button
 * that navigates the live preview when `onNavigatePreview` is wired; a
 * parameterized route (`/courses/:id`) or a route with no handler renders as
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
 * React's root is a `div` for text but a fragment (an indicator, or nothing at
 * all) for an empty message, so the template's nodes render in front of the
 * host (`placeContentBefore`) and the host leaves the DOM: the rendered tree is
 * React's, with no wrapper element of its own. Parsing produces a
 * flat view model (`InlineView`, `BlockView`, `SegmentView`) so the template
 * renders real elements instead of string HTML. All styling is inline through
 * `styleText`, serialized the way React's inline style lands in the DOM
 * (`border: medium`, `padding: 0px`, spaced `rgba()`); the code block reads
 * `getClassMap()`'s tokens. The component is a part (React renders it inside
 * ChatPanel without exporting it), so it lives in `src/parts/` and is exported
 * under the React name.
 *
 * @module
 */

import {
  Component,
  computed,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  signal,
  type SimpleChanges,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { StreamingIndicator } from './streaming-indicator.component.js'

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

/** The parse throttle window React uses (approximately 8 renders a second while streaming). */
const PARSE_THROTTLE_MS = 120

/** One fenced code block or one run of prose. */
interface Segment {
  /** `code` for a fence, `text` for prose. */
  type: 'code' | 'text'
  /** The fence's language tag (`''` when it carries none). */
  lang: string
  /** The fence's body, or the prose run. */
  content: string
}

/**
 * Splits raw markdown text into alternating prose and fenced code block
 * segments.
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
    if (m.index > last) out.push({ type: 'text', lang: '', content: text.slice(last, m.index) })
    out.push({ type: 'code', lang: m[1] ?? '', content: m[2].trimEnd() })
    last = m.index + m[0].length
  }

  if (last < text.length) out.push({ type: 'text', lang: '', content: text.slice(last) })
  return out
}

// Order matters: link `[text](url)` is matched before bold/italic so a label/url containing
// `*` isn't mis-split. The url stops at whitespace or the closing paren.
const INLINE_RE = /(`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*[^*\n]+\*)/g

/**
 * One inline node, exactly one field set: plain text, an inline element, a
 * preview-link button or an anchor. Flat fields keep the template free of
 * union narrowing.
 */
interface InlineView {
  /** Plain text content. */
  text: string | null
  /** Inline code content. */
  code: string | null
  /** Bold content. */
  strong: string | null
  /** Italic content. */
  em: string | null
  /** Preview button label. */
  buttonLabel: string | null
  /** Preview button route (normalized to a leading `/`). */
  buttonPath: string | null
  /** Anchor label. */
  anchorLabel: string | null
  /** Anchor href. */
  anchorHref: string | null
}

/** One prose block, exactly one shape: a header, a list, or a paragraph. */
interface BlockView {
  /** The header level (1–3), or null when this block is not a header. */
  headerLevel: number | null
  /** Whether this block is an ordered list; null when it is not a list. */
  ordered: boolean | null
  /** Header/paragraph inline nodes. */
  nodes: InlineView[]
  /** List item inline nodes, one entry per item. */
  items: InlineView[][]
  /** The header's top margin (`0px` for a first line, `10px` otherwise). */
  marginTop: string
}

/** One rendered segment: a code block, or a run of prose blocks. */
interface SegmentView {
  /** The fence's language tag; null when this segment is prose. */
  codeLang: string | null
  /** The fence's body (empty for prose). */
  codeContent: string
  /** The prose blocks (empty for a fence). */
  blocks: BlockView[]
}

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
): InlineView {
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(href)?.[1]?.toLowerCase()
  const allowlisted = isAllowedLinkHref(href)
  const isExternal = (scheme != null && allowlisted) || href.startsWith('//')
  const isAnchor = href.startsWith('#')

  // Unapproved scheme → inert text: no anchor (model output must not be able to mint a
  // `javascript:` href) and no preview button (a `data:`/`ftp:` string is not an app route).
  if (scheme != null && !allowlisted) return textView(label)

  if (!isExternal && !isAnchor) {
    // Normalize to a root-relative path so the handler always receives a clean `/route`.
    const path = href.startsWith('/') ? href : `/${href}`
    // A parameterized route (`/courses/:id`, a `*` splat) has no concrete destination — navigating
    // the preview to a literal `:id` just 404s, so it renders the label as plain text.
    const isParameterized = path.split('/').some((seg) => seg.startsWith(':') || seg === '*')
    if (isParameterized || !onNavigatePreview) return textView(label)
    return {
      text: null,
      code: null,
      strong: null,
      em: null,
      buttonLabel: label,
      buttonPath: path,
      anchorLabel: null,
      anchorHref: null,
    }
  }
  return {
    text: null,
    code: null,
    strong: null,
    em: null,
    buttonLabel: null,
    buttonPath: null,
    anchorLabel: label,
    anchorHref: href,
  }
}

/**
 * A plain-text inline node.
 *
 * @param text - The text.
 * @returns The node.
 */
function textView(text: string): InlineView {
  return {
    text,
    code: null,
    strong: null,
    em: null,
    buttonLabel: null,
    buttonPath: null,
    anchorLabel: null,
    anchorHref: null,
  }
}

/**
 * One marked inline node (inline code, bold or italic).
 *
 * @param kind - The mark.
 * @param text - The content inside the marks.
 * @returns The node.
 */
function markView(kind: 'code' | 'strong' | 'em', text: string): InlineView {
  return {
    text: null,
    code: kind === 'code' ? text : null,
    strong: kind === 'strong' ? text : null,
    em: kind === 'em' ? text : null,
    buttonLabel: null,
    buttonPath: null,
    anchorLabel: null,
    anchorHref: null,
  }
}

/**
 * Parses a run of text into inline markdown nodes (code, links, bold, italic).
 *
 * @param text - The text containing inline markdown tokens.
 * @param onNavigatePreview - Optional handler so a `[label](/route)` link navigates the preview.
 * @returns The inline nodes, in order.
 */
function parseInline(text: string, onNavigatePreview?: (path: string) => void): InlineView[] {
  const out: InlineView[] = []
  let last = 0

  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0
    if (at > last) out.push(textView(text.slice(last, at)))
    const tok = m[0]
    if (tok[0] === '`') {
      out.push(markView('code', tok.slice(1, -1)))
    } else if (tok[0] === '[') {
      // [label](href)
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      out.push(lm ? resolveLink(lm[1], lm[2], onNavigatePreview) : textView(tok))
    } else if (tok.startsWith('**')) {
      out.push(markView('strong', tok.slice(2, -2)))
    } else {
      out.push(markView('em', tok.slice(1, -1)))
    }
    last = at + tok.length
  }

  if (last < text.length) out.push(textView(text.slice(last)))
  return out
}

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
function parseBlocks(content: string, onNavigatePreview?: (path: string) => void): BlockView[] {
  const lines = content.split('\n')
  const out: BlockView[] = []
  let i = 0
  /** A block with no shape set. */
  const empty = (): BlockView => ({
    headerLevel: null,
    ordered: null,
    nodes: [],
    items: [],
    marginTop: '0px',
  })

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
      const block = empty()
      block.headerLevel = hm[1].length
      block.nodes = parseInline(hm[2], onNavigatePreview)
      block.marginTop = i > 0 ? '10px' : '0px'
      out.push(block)
      i++
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const block = empty()
      block.ordered = false
      while (i < lines.length && /^[-*] /.test(lines[i] ?? '')) {
        block.items.push(parseInline((lines[i] ?? '').replace(/^[-*] /, ''), onNavigatePreview))
        i++
      }
      out.push(block)
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const block = empty()
      block.ordered = true
      while (i < lines.length && /^\d+\. /.test(lines[i] ?? '')) {
        block.items.push(parseInline((lines[i] ?? '').replace(/^\d+\. /, ''), onNavigatePreview))
        i++
      }
      out.push(block)
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
    if (para.length) {
      const block = empty()
      block.nodes = parseInline(para.join('\n'), onNavigatePreview)
      out.push(block)
    }
  }

  return out
}

/**
 * One segment's view model.
 *
 * @param seg - The parsed segment.
 * @param onNavigatePreview - Optional handler for route links inside the prose.
 * @returns The view.
 */
function segmentView(seg: Segment, onNavigatePreview?: (path: string) => void): SegmentView {
  return seg.type === 'code'
    ? { codeLang: seg.lang, codeContent: seg.content, blocks: [] }
    : { codeLang: null, codeContent: '', blocks: parseBlocks(seg.content, onNavigatePreview) }
}

/**
 * The component's inline-style texts that never change, serialized once with
 * `styleText` in the exact form React's inline style lands in the DOM
 * (`border: medium` is React's `border: none`; colors keep their spaces).
 */
const STYLES = {
  /** The message wrapper (streaming and finalized share it). */
  root: styleText({ fontSize: 13, lineHeight: 1.6, marginTop: '6px', wordBreak: 'break-word' }),
  /** Inline `code`. */
  inlineCode: styleText({
    fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
    fontSize: '0.875em',
    background: 'rgba(128, 128, 128, 0.15)',
    borderRadius: '3px',
    padding: '1px 4px',
  }),
  /** A markdown link (anchor). */
  link: styleText({
    color: 'var(--mol-color-primary, #4070e0)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  }),
  /** The preview link button: the link style, reset to sit in the text flow. */
  linkButton: styleText({
    color: 'var(--mol-color-primary, #4070e0)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    background: 'none',
    border: 'medium',
    padding: 0,
    font: 'inherit',
    cursor: 'pointer',
  }),
  /** The fenced block's container. */
  codeBlock: styleText({ borderRadius: '6px', marginBottom: '10px', overflow: 'hidden' }),
  /** The fenced block's header strip. */
  codeHeader: styleText({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 10px',
    borderBottom: '1px solid rgba(128, 128, 128, 0.15)',
    fontSize: 11,
    opacity: 0.75,
  }),
  /** The fence's language label. */
  lang: styleText({
    fontFamily: 'var(--vscode-editor-font-family, monospace)',
    letterSpacing: '0.3px',
  }),
  /** The copy button: chrome on the code, not a CTA. */
  copyButton: styleText({
    background: 'none',
    border: 'medium',
    cursor: 'pointer',
    color: 'inherit',
    fontSize: 11,
    padding: '2px 6px',
    opacity: 0.75,
  }),
  /** The fence's code body. */
  pre: styleText({
    margin: 0,
    padding: '10px 12px',
    overflowX: 'auto',
    fontSize: 12,
    lineHeight: 1.6,
    fontFamily: 'var(--vscode-editor-font-family, "SF Mono", Consolas, monospace)',
    whiteSpace: 'pre',
  }),
  /** A bulleted list. */
  ul: styleText({ paddingLeft: '18px', marginBottom: '6px', listStyleType: 'disc' }),
  /** A numbered list. */
  ol: styleText({ paddingLeft: '18px', marginBottom: '6px', listStyleType: 'decimal' }),
  /** A paragraph. */
  para: styleText({ whiteSpace: 'pre-wrap', marginBottom: '6px' }),
} as const

/**
 * Renders one inline node list as real elements (code, bold, italic, links).
 * React's root is the inline run itself, with no element of its own, so the
 * template's nodes render in front of the host (`placeContentBefore`) and the
 * host leaves the DOM.
 */
@Component({
  selector: 'span[mol-markdown-inline]',
  standalone: true,
  // The inputs are declared as plain fields listed here: this package's
  // partially-compiled JIT linking does not register `input()` signal inputs.
  inputs: ['nodes', 'onNavigatePreview'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@for (node of nodes; track $index) {@if (node.code !== null) {<code [attr.style]="s.inlineCode">{{ node.code }}</code>} @else if (node.strong !== null) {<strong>{{ node.strong }}</strong>} @else if (node.em !== null) {<em>{{ node.em }}</em>} @else if (node.buttonLabel !== null) {<button type="button" data-mol-id="chat-preview-link" (click)="navigate(node.buttonPath)" [attr.title]="linkTitle(node.buttonPath)" [attr.style]="s.linkButton">{{ node.buttonLabel }}</button>} @else if (node.anchorLabel !== null) {<a [attr.href]="node.anchorHref" target="_blank" rel="noopener noreferrer" [attr.style]="s.link">{{ node.anchorLabel }}</a>} @else {{{ node.text }}}}`,
})
class MarkdownInline {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the inline run in front of the host and keeps the host out of the DOM. */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The inline nodes to render. */
  nodes: InlineView[] = []

  /** Navigates the live preview to a route path, when the host wires it. */
  onNavigatePreview?: (path: string) => void

  /** Reactive translation, read in the injection context. */
  protected readonly t = useTranslation().t

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * The preview button's translated title (read per change-detection pass, so
   * a locale switch re-renders it).
   * @param path - The button node's normalized route, or null for a non-button node.
   * @returns The translated title, or null.
   */
  protected linkTitle(path: string | null): string | null {
    return path == null
      ? null
      : this.t(
          'ide.chat.previewLinkTitle',
          { path },
          { defaultValue: 'Open {{path}} in the preview' },
        )
  }

  /**
   * Navigates the preview to one button node's route.
   * @param path - The button node's normalized route, or null for a non-button node.
   */
  protected navigate(path: string | null): void {
    if (path != null) this.onNavigatePreview?.(path)
  }
}

/**
 * Renders a subset of Markdown as Angular elements. Handles fenced code blocks
 * (with copy button), headers, lists, bold/italic, inline code and links.
 * React renders it under the React name `MarkdownContent` (this class's name).
 */
@Component({
  selector: 'div[mol-markdown-content]',
  standalone: true,
  imports: [MarkdownInline, StreamingIndicator],
  inputs: [
    'text',
    'isStreaming',
    'statusLabel',
    'statusStartedAt',
    'onNavigatePreview',
    'hideStreamingIndicator',
  ],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (text) {<div [attr.style]="s.root">@for (seg of segments(); track $index; let i = $index) {@if (seg.codeLang !== null) {<div [class]="cm.surfaceSecondary" [attr.style]="s.codeBlock"><div [attr.style]="s.codeHeader"><span [attr.style]="s.lang">{{ seg.codeLang || 'text' }}</span><button type="button" data-mol-id="chat-code-copy" (click)="handleCopy(i, seg.codeContent)" [class]="cm.touchTargetCompact" [attr.style]="s.copyButton">{{ copyLabel(i) }}</button></div><pre [attr.style]="s.pre"><code>{{ seg.codeContent }}</code></pre></div>} @else {@for (block of seg.blocks; track $index) {@if (block.headerLevel !== null) {<p [attr.style]="headerStyle(block)"><span mol-markdown-inline [nodes]="block.nodes" [onNavigatePreview]="onNavigatePreview"></span></p>} @else if (block.ordered !== null) {@if (block.ordered) {<ol [attr.style]="s.ol">@for (item of block.items; track $index) {<li><span mol-markdown-inline [nodes]="item" [onNavigatePreview]="onNavigatePreview"></span></li>}</ol>} @else {<ul [attr.style]="s.ul">@for (item of block.items; track $index) {<li><span mol-markdown-inline [nodes]="item" [onNavigatePreview]="onNavigatePreview"></span></li>}</ul>}} @else {<p [attr.style]="s.para"><span mol-markdown-inline [nodes]="block.nodes" [onNavigatePreview]="onNavigatePreview"></span></p>}}}}@if (isStreaming && !hideStreamingIndicator && !hasStatus()) {<div mol-streaming-indicator [inline]="true"></div>}</div>@if (isStreaming && !hideStreamingIndicator && hasStatus()) {<div mol-streaming-indicator [label]="statusLabel ?? undefined" [startedAt]="statusStartedAt"></div>}} @else if (isStreaming && !hideStreamingIndicator) {<div mol-streaming-indicator [label]="hasStatus() ? statusLabel ?? undefined : undefined" [startedAt]="statusStartedAt"></div>}`,
})
export class MarkdownContent implements OnChanges, OnDestroy {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the markdown's nodes in front of the host and keeps the host out of
   * the DOM: React's root is the content `<div>`, the indicator, or nothing.
   */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The raw markdown text to render. */
  text = ''

  /** When true, appends a blinking cursor at the end (streaming indicator). */
  isStreaming = false

  /**
   * Current activity/status label (e.g. a verification step like
   * "Type-checking the app"). When set WHILE streaming, the trailing indicator
   * switches from a bare inline cursor to a labeled block below the finalized
   * text.
   */
  statusLabel: string | null | undefined = undefined

  /** Turn start (ms) for the labeled indicator's elapsed timer. */
  statusStartedAt: number | undefined = undefined

  /**
   * Navigates the live preview to a route path. When provided, a
   * `[label](/route)` markdown link renders as a clickable button that jumps
   * the preview to that page.
   */
  onNavigatePreview?: (path: string) => void

  /**
   * Suppress this component's OWN trailing streaming indicators. The chat owns
   * a single, persistent activity indicator for the whole turn.
   */
  hideStreamingIndicator = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The bonded translation function (re-renders on a locale switch). */
  protected readonly t = useTranslation().t

  /** The static style texts. */
  protected readonly s = STYLES

  /** The throttled parse input (React's `parseText` state). */
  private readonly parseText = signal('')

  /** The last time the parse input moved (React's `lastParseAtRef`). */
  private lastParseAt = 0

  /** The pending trailing-throttle update, if any. */
  private parseTimer: ReturnType<typeof setTimeout> | undefined

  /** Which code blocks currently show their copy confirmation. */
  private readonly copiedBlocks = signal<ReadonlySet<number>>(new Set())

  /** The pending confirmation resets, by block index. */
  private readonly copyTimers = new Map<number, ReturnType<typeof setTimeout>>()

  /** Bumped when the navigation handler changes, so the parsed links re-resolve. */
  private readonly handlerVersion = signal(0)

  /** The parsed segments of the current parse input. */
  protected readonly segments = computed(() => {
    // Re-resolve the routes when the host swaps its preview handler (React
    // re-renders the links with the new prop).
    this.handlerVersion()
    return this.parseText()
      ? splitSegments(this.parseText()).map((seg) => segmentView(seg, this.onNavigatePreview))
      : []
  })

  /**
   * Applies React's parse throttle: live while streaming, throttled to ~120ms
   * (leading + trailing), full and immediate once finalized.
   * @param changes - The inputs that moved.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['onNavigatePreview']) this.handlerVersion.update((version) => version + 1)
    clearTimeout(this.parseTimer)
    this.parseTimer = undefined
    if (!this.isStreaming) {
      this.parseText.set(this.text) // finalized (or non-streaming) — parse the full, stable text now
      return
    }
    const elapsed = Date.now() - this.lastParseAt
    if (elapsed >= PARSE_THROTTLE_MS) {
      this.lastParseAt = Date.now()
      this.parseText.set(this.text)
      return
    }
    // Leading+trailing throttle: schedule the pending update so continuous
    // streaming still refreshes ~every PARSE_THROTTLE_MS (a plain debounce here
    // would defer ALL rendering to the end).
    this.parseTimer = setTimeout(() => {
      this.lastParseAt = Date.now()
      this.parseText.set(this.text)
    }, PARSE_THROTTLE_MS - elapsed)
  }

  /** Clears the pending parse and copy timers. */
  ngOnDestroy(): void {
    clearTimeout(this.parseTimer)
    for (const id of this.copyTimers.values()) clearTimeout(id)
    this.copyTimers.clear()
  }

  /**
   * Whether a real status label makes the trailing indicator a labeled block.
   * @returns True for a non-blank `statusLabel`.
   */
  protected hasStatus(): boolean {
    const label = this.statusLabel
    return label != null && label.trim() !== ''
  }

  /**
   * One header block's inline style (the level picks the size, the first line
   * no top margin).
   * @param block - The header block.
   * @returns The style attribute text.
   */
  protected headerStyle(block: BlockView): string | null {
    return styleText({
      fontWeight: '600',
      fontSize: block.headerLevel === 1 ? '1.05em' : '1em',
      marginBottom: '4px',
      marginTop: block.marginTop,
    })
  }

  /**
   * The copy button's visible label for one block.
   * @param index - The block's segment index.
   * @returns The translated label.
   */
  protected copyLabel(index: number): string {
    return this.copiedBlocks().has(index)
      ? this.t('ide.chat.code.copied', undefined, { defaultValue: '✓ Copied' })
      : this.t('ide.chat.code.copy', undefined, { defaultValue: 'Copy' })
  }

  /**
   * Copies one code block to the clipboard and shows a brief confirmation.
   * @param index - The block's segment index.
   * @param content - The block's text.
   */
  protected handleCopy(index: number, content: string): void {
    void copyTextWithFallback(content).then((copied) => {
      if (!copied) return
      this.copiedBlocks.update((prev) => new Set(prev).add(index))
      const existing = this.copyTimers.get(index)
      if (existing !== undefined) clearTimeout(existing)
      this.copyTimers.set(
        index,
        setTimeout(() => {
          this.copiedBlocks.update((prev) => {
            const next = new Set(prev)
            next.delete(index)
            return next
          })
        }, 1500),
      )
    })
  }
}

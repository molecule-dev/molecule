<!--
  MarkdownContent: the Svelte counterpart of `@molecule/app-ide-react`'s
  `MarkdownContent` (see that file for the design notes) — the chat message
  renderer. Same props (React names), same DOM for the same input. Handles the
  subset of Markdown that Claude commonly produces: fenced code blocks (with a
  language label and copy button), headers, ordered/unordered lists, bold,
  italic, inline code and `[label](href)` links. No external dependencies.

  Model output is prompt-injectable, so links obey the same scheme allowlist as
  React's component: only `http:`, `https:` and `mailto:` (plus
  protocol-relative `//host`) become anchors; every other scheme renders as
  inert text. A route link (slash-prefixed or bare) renders as a button that
  navigates the live preview when `onNavigatePreview` is wired; a parameterized
  route (`/courses/:id`) or a route with no handler renders as plain text. A
  `#anchor` stays an anchor.

  Markdown is parsed LIVE while streaming, throttled to ~120ms so the per-flush
  re-parse work stays bounded (a leading+trailing throttle: the pending update
  is scheduled, never debounced away); on finalize the full text parses at
  once. The trailing indicator is the bare inline cursor only while the model
  is generating — once `statusLabel` is set it becomes the labeled verification
  block below the text, and either is suppressed by `hideStreamingIndicator`
  (the chat owns one turn-level indicator).

  The component is a part (React renders it inside ChatPanel without exporting
  it), so it lives in `src/parts/`. Styling uses `getClassMap()`; the constant
  inline styles are static `style` attributes, already serialized the way React
  writes them into the DOM (`border: medium` for React's `border: none`, spaced
  `rgba()`, `background: none` spelled literally) — Svelte's own dynamic
  `style` values are re-parsed through `CSSStyleDeclaration.cssText`, which
  drops `background: none`, so only the per-header style is dynamic.
-->
<script module lang="ts">
  import * as ideMarkdownContent from './markdown-content.js'

  /** Re-exported from the plain-TS module (parts/markdown-content.ts). */
  export const isAllowedLinkHref = ideMarkdownContent.isAllowedLinkHref

  /** One fenced code block or one run of prose. */
  type Segment = { type: 'code'; lang: string; content: string } | { type: 'text'; content: string }

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

  /** One rendered prose block: a header, a list, or a paragraph. */
  type Block =
    | { kind: 'header'; level: number; nodes: InlineNode[]; marginTop: string }
    | { kind: 'ul'; items: InlineNode[][] }
    | { kind: 'ol'; items: InlineNode[][] }
    | { kind: 'para'; nodes: InlineNode[] }

  /**
   * Resolves one `[label](href)` token to the node React's `LinkToken`
   * renders: inert text for an unapproved scheme, a preview button for a
   * concrete route with a handler, an anchor for an allowlisted or
   * protocol-relative href (and a `#anchor`), text otherwise.
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
      // A parameterized route (`/courses/:id`, a `*` splat) has no concrete destination —
      // navigating the preview to a literal `:id` just 404s, so it renders the label as text.
      const isParameterized = path.split('/').some((seg) => seg.startsWith(':') || seg === '*')
      if (isParameterized || !onNavigatePreview) return { kind: 'text', text: label }
      return { kind: 'button', label, path }
    }
    return { kind: 'anchor', label, href }
  }

  /**
   * Parses a run of text into inline markdown nodes (code, links, bold,
   * italic).
   *
   * @param text - The text containing inline markdown tokens.
   * @param onNavigatePreview - Optional handler so a route link navigates the preview.
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

  /** Props for `MarkdownContent` — the React prop names, React's own contract. */
  export interface MarkdownContentProps {
    /** The raw markdown text to render. */
    text: string
    /** When true, appends a blinking cursor at the end (streaming indicator). */
    isStreaming?: boolean
    /**
     * Current activity/status label (e.g. a verification step like
     * "Type-checking the app"). When set WHILE streaming, the trailing
     * indicator switches from a bare inline cursor to a labeled block below
     * the finalized text.
     */
    statusLabel?: string | null
    /** Turn start (ms) for the labeled indicator's elapsed timer. */
    statusStartedAt?: number
    /**
     * Navigates the live preview to a route path. When provided, a
     * `[label](/route)` markdown link renders as a clickable button that jumps
     * the preview to that page.
     */
    onNavigatePreview?: (path: string) => void
    /**
     * Suppress this component's OWN trailing streaming indicators. The chat
     * owns a single, persistent activity indicator for the whole turn.
     */
    hideStreamingIndicator?: boolean
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'

  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import StreamingIndicator from './StreamingIndicator.svelte'

  let {
    text,
    isStreaming,
    statusLabel,
    statusStartedAt,
    onNavigatePreview,
    hideStreamingIndicator,
  }: MarkdownContentProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  // Markdown is parsed + rendered LIVE while streaming (not deferred until the
  // stream finalizes), with the parse input THROTTLED to ~120ms so the
  // per-flush re-parse work is bounded; on finalize the complete text parses
  // immediately so the last tokens never lag.
  const PARSE_THROTTLE_MS = 120
  // Undefined until the parse effect first runs, so the FIRST render already
  // shows the full text (React seeds its parse state from the text prop).
  let parseText = $state<string | undefined>(undefined)
  let lastParseAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  // The copy confirmation is PER BLOCK, as React's `CodeBlock` state is.
  const copied = $state<Record<number, boolean>>({})
  const copyTimers = new SvelteMap<number, ReturnType<typeof setTimeout>>()

  $effect(() => {
    const next = text
    const streaming = isStreaming
    clearTimeout(timer)
    timer = undefined
    if (!streaming) {
      parseText = next // finalized (or non-streaming) — parse the full, stable text now
      return
    }
    const elapsed = Date.now() - lastParseAt
    if (elapsed >= PARSE_THROTTLE_MS) {
      lastParseAt = Date.now()
      parseText = next
      return
    }
    // Leading+trailing throttle: schedule the pending update so continuous
    // streaming still refreshes ~every PARSE_THROTTLE_MS (a plain debounce
    // here would defer ALL rendering to the end).
    timer = setTimeout(() => {
      lastParseAt = Date.now()
      parseText = next
    }, PARSE_THROTTLE_MS - elapsed)
  })

  onDestroy(() => {
    clearTimeout(timer)
    for (const id of copyTimers.values()) clearTimeout(id)
    copyTimers.clear()
  })

  /** The parse input: the throttled text once it first moves, else the live prop. */
  const currentParse = $derived(parseText ?? text)

  /** The parsed segments of the current parse input. */
  const segments = $derived(currentParse ? splitSegments(currentParse) : [])

  // A real status label (verification step) makes the trailing indicator a
  // labeled block; otherwise it's the bare end-of-text cursor.
  const hasStatus = $derived(statusLabel != null && statusLabel.trim() !== '')

  /**
   * Builds the preview button's translated title (read here so a locale switch
   * re-renders).
   *
   * @param path - The normalized preview route.
   * @returns The translated title.
   */
  function titleFor(path: string): string {
    return t(
      'ide.chat.previewLinkTitle',
      { path },
      { defaultValue: 'Open {{path}} in the preview' },
    )
  }

  /**
   * Copies one code block to the clipboard and shows a brief confirmation.
   *
   * @param index - The block's segment index.
   * @param content - The block's text.
   */
  function handleCopy(index: number, content: string): void {
    void copyTextWithFallback(content).then((ok) => {
      if (!ok) return
      copied[index] = true
      const existing = copyTimers.get(index)
      if (existing !== undefined) clearTimeout(existing)
      copyTimers.set(
        index,
        setTimeout(() => {
          copied[index] = false
        }, 1500),
      )
    })
  }

  /**
   * One header block's inline style (the level picks the size, the first line
   * no top margin).
   *
   * @param block - The header block.
   * @returns The style attribute text.
   */
  function headerStyle(block: Extract<Block, { kind: 'header' }>): string {
    return `font-weight: 600; font-size: ${block.level === 1 ? '1.05em' : '1em'}; margin-bottom: 4px; margin-top: ${block.marginTop}`
  }
</script>

{#snippet inlineNodes(nodes: InlineNode[])}
  {#each nodes as node, k (k)}
    {#if node.kind === 'code'}
      <code
        style="background: rgba(128, 128, 128, 0.15); border-radius: 3px; font-family: var(--vscode-editor-font-family, &quot;SF Mono&quot;, Consolas, monospace); font-size: 0.875em; padding: 1px 4px"
        >{node.text}</code
      >
    {:else if node.kind === 'strong'}
      <strong>{node.text}</strong>
    {:else if node.kind === 'em'}
      <em>{node.text}</em>
    {:else if node.kind === 'button'}
      <button
        type="button"
        data-mol-id="chat-preview-link"
        onclick={() => onNavigatePreview?.(node.path)}
        title={titleFor(node.path)}
        style="background: none; border: medium; color: var(--mol-color-primary, #4070e0); cursor: pointer; font: inherit; padding: 0px; text-decoration: underline; text-underline-offset: 2px"
        >{node.label}</button
      >
    {:else if node.kind === 'anchor'}
      <a
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        style="color: var(--mol-color-primary, #4070e0); text-decoration: underline; text-underline-offset: 2px"
        >{node.label}</a
      >
    {:else}{node.text}{/if}
  {/each}
{/snippet}

{#snippet proseBlocks(blocks: Block[])}
  {#each blocks as block, j (j)}
    {#if block.kind === 'header'}
      <p style={headerStyle(block)}>{@render inlineNodes(block.nodes)}</p>
    {:else if block.kind === 'ul'}
      <ul style="list-style-type: disc; margin-bottom: 6px; padding-left: 18px">
        {#each block.items as item, j2 (j2)}<li>{@render inlineNodes(item)}</li>{/each}
      </ul>
    {:else if block.kind === 'ol'}
      <ol style="list-style-type: decimal; margin-bottom: 6px; padding-left: 18px">
        {#each block.items as item, j2 (j2)}<li>{@render inlineNodes(item)}</li>{/each}
      </ol>
    {:else}
      <p style="margin-bottom: 6px; white-space: pre-wrap">{@render inlineNodes(block.nodes)}</p>
    {/if}
  {/each}
{/snippet}

{#snippet messageBody()}
  {#each segments as seg, i (i)}
    {#if seg.type === 'code'}
      <div
        class={cm.surfaceSecondary}
        style="border-radius: 6px; margin-bottom: 10px; overflow: hidden"
      >
        <div
          style="align-items: center; border-bottom: 1px solid rgba(128, 128, 128, 0.15); display: flex; font-size: 11px; justify-content: space-between; opacity: 0.75; padding: 3px 10px"
        >
          <span
            style="font-family: var(--vscode-editor-font-family, monospace); letter-spacing: 0.3px"
            >{seg.lang || 'text'}</span
          >
          <button
            type="button"
            data-mol-id="chat-code-copy"
            onclick={() => handleCopy(i, seg.content)}
            class={cm.touchTargetCompact}
            style="background: none; border: medium; color: inherit; cursor: pointer; font-size: 11px; opacity: 0.75; padding: 2px 6px"
          >
            {copied[i]
              ? t('ide.chat.code.copied', undefined, { defaultValue: '✓ Copied' })
              : t('ide.chat.code.copy', undefined, { defaultValue: 'Copy' })}
          </button>
        </div>
        <pre
          style="font-family: var(--vscode-editor-font-family, &quot;SF Mono&quot;, Consolas, monospace); font-size: 12px; line-height: 1.6; margin: 0px; overflow-x: auto; padding: 10px 12px; white-space: pre"><code
            >{seg.content}</code
          ></pre>
      </div>
    {:else}
      {@render proseBlocks(parseBlocks(seg.content, onNavigatePreview))}
    {/if}
  {/each}
{/snippet}

{#if !text}
  {#if isStreaming && !hideStreamingIndicator}
    <StreamingIndicator
      label={hasStatus ? (statusLabel ?? undefined) : undefined}
      startedAt={statusStartedAt}
    />
  {/if}
{:else if isStreaming}
  <div style="font-size: 13px; line-height: 1.6; margin-top: 6px; word-break: break-word">
    <!-- Live markdown — parsed segments render as they stream in. An
        incomplete construct (an unclosed ``` fence) falls back to prose via
        splitSegments until its closer arrives, then upgrades. -->
    {@render messageBody()}
    <!-- Bare end-of-text cursor only while the MODEL is still generating
        tokens (no status label yet); suppressed when the host owns a single
        turn-level indicator. -->
    {#if !hideStreamingIndicator && !hasStatus}<StreamingIndicator inline />{/if}
  </div>
  {#if !hideStreamingIndicator && hasStatus}
    <StreamingIndicator label={statusLabel ?? undefined} startedAt={statusStartedAt} />
  {/if}
{:else}
  <div style="font-size: 13px; line-height: 1.6; margin-top: 6px; word-break: break-word">
    {@render messageBody()}
  </div>
{/if}

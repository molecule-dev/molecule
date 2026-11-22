// @vitest-environment jsdom

/**
 * `MarkdownContent`'s live-parse throttle — a port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.parse-throttle.test.tsx`
 * with the same test names and the same behavioral assertions, mounted
 * through Svelte 5's own `mount`/`flushSync`. Two timing guarantees matter to
 * the chat and both are pinned here:
 *
 * - while `isStreaming`, incoming text is re-parsed on a ~120ms throttle (so a
 *   fast token stream does not re-parse the whole message on every flush) — the
 *   pending text appears when the throttle window elapses, not synchronously;
 * - FINALIZING (a non-streaming update, or the stream ending) parses the full,
 *   stable text in that same render, with no timer of its own — the last tokens
 *   and the final message are never a frame apart.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import MarkdownContentHost from './MarkdownContentHost.svelte'

/** The mount alive right now, torn down before the next one. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
 * Mounts the message the way ChatPanel does.
 *
 * @param props - The initial `text` and `isStreaming` props.
 * @returns The mount instance and its container.
 */
function render(props: { text: string; isStreaming?: boolean }): {
  instance: Record<string, unknown>
  container: HTMLElement
} {
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(MarkdownContentHost, { target, props }) as Record<string, unknown>
  flushSync()
  instance = mounted
  container = target
  return { instance: mounted, container: target }
}

describe('MarkdownContent live parse', () => {
  it('throttles the parse while streaming and finalizes in the same render', () => {
    vi.useFakeTimers()
    const mounted = render({ text: 'first line', isStreaming: true })
    expect(mounted.container.textContent).toContain('first line')

    // A flush that lands inside the throttle window is NOT parsed synchronously;
    // it is scheduled, so continuous streaming refreshes at the throttle rate.
    ;(mounted.instance.setText as (next: string) => void)('first line and more')
    flushSync()
    expect(mounted.container.textContent).not.toContain('first line and more')
    vi.advanceTimersByTime(120)
    flushSync()
    expect(mounted.container.textContent).toContain('first line and more')

    // Finalizing needs no timer: the full text is parsed in that render.
    ;(mounted.instance.setText as (next: string) => void)('first line and more, final')
    ;(mounted.instance.setStreaming as (next: boolean) => void)(false)
    flushSync()
    expect(mounted.container.textContent).toContain('first line and more, final')
  })

  it('parses a non-streaming text change immediately', () => {
    vi.useFakeTimers()
    const mounted = render({ text: 'static' })
    expect(mounted.container.textContent).toContain('static')

    ;(mounted.instance.setText as (next: string) => void)('static, updated')
    flushSync()
    expect(mounted.container.textContent).toContain('static, updated')
  })

  it('keeps refreshing while the stream continues past one window', () => {
    vi.useFakeTimers()
    const mounted = render({ text: 'a', isStreaming: true })
    ;(mounted.instance.setText as (next: string) => void)('a b')
    flushSync()
    vi.advanceTimersByTime(120)
    flushSync()
    expect(mounted.container.textContent).toContain('a b')

    ;(mounted.instance.setText as (next: string) => void)('a b c')
    flushSync()
    vi.advanceTimersByTime(120)
    flushSync()
    expect(mounted.container.textContent).toContain('a b c')
  })
})

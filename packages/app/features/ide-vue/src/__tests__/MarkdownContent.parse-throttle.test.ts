// @vitest-environment jsdom
/**
 * `MarkdownContent`'s live-parse throttle — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.parse-throttle.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Vue's own `createApp`. Two timing guarantees matter to the chat and both are
 * pinned here:
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, shallowReactive, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent, type MarkdownContentProps } from '../parts/MarkdownContent.js'

/** The live props the host passes down; reassigning them is the test's `rerender`. */
type LiveProps = Partial<MarkdownContentProps> & Pick<MarkdownContentProps, 'text'>

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Renders the message and hands back its host plus a `rerender`.
 *
 * @param initial - The first props.
 * @returns The host element and the prop mutator.
 */
function renderMessage(initial: LiveProps): {
  host: HTMLElement
  rerender: (next: LiveProps) => Promise<void>
} {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const props = shallowReactive<LiveProps>({ ...initial })
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(MarkdownContent, { ...props }),
    }),
  )
  mounted.app = app
  app.mount(host)
  return {
    host,
    rerender: async (next: LiveProps): Promise<void> => {
      Object.assign(props, next)
      await nextTick()
    },
  }
}

describe('MarkdownContent live parse', () => {
  it('throttles the parse while streaming and finalizes in the same render', async () => {
    vi.useFakeTimers()
    const { host, rerender } = renderMessage({ text: 'first line', isStreaming: true })
    expect(host.textContent).toContain('first line')

    // A flush that lands inside the throttle window is NOT parsed synchronously;
    // it is scheduled, so continuous streaming refreshes at the throttle rate.
    await rerender({ text: 'first line and more', isStreaming: true })
    expect(host.textContent).not.toContain('first line and more')
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(host.textContent).toContain('first line and more')

    // Finalizing needs no timer: the full text is parsed in that render.
    await rerender({ text: 'first line and more, final', isStreaming: false })
    expect(host.textContent).toContain('first line and more, final')
  })

  it('parses a non-streaming text change immediately', async () => {
    vi.useFakeTimers()
    const { host, rerender } = renderMessage({ text: 'static' })
    expect(host.textContent).toContain('static')

    await rerender({ text: 'static, updated' })
    expect(host.textContent).toContain('static, updated')
  })

  it('keeps refreshing while the stream continues past one window', async () => {
    vi.useFakeTimers()
    const { host, rerender } = renderMessage({ text: 'a', isStreaming: true })
    await rerender({ text: 'a b', isStreaming: true })
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(host.textContent).toContain('a b')

    await rerender({ text: 'a b c', isStreaming: true })
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(host.textContent).toContain('a b c')
  })
})

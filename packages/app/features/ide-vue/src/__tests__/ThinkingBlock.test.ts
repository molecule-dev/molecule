// @vitest-environment jsdom
/**
 * `ThinkingBlock` rendered for real: the disclosure label (streaming, a recorded
 * duration, or the brief default), the collapsed-by-default body, the manual
 * toggle, and the auto-scroll as streamed thinking arrives.
 *
 * Vue port of `@molecule/app-ide-react`'s `ThinkingBlock` behaviour (unit U2 of
 * the ChatPanel port): the same DOM for the same input, the same behaviour.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ThinkingBlock, type ThinkingBlockProps } from '../parts/ThinkingBlock.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Mounts the block with the given props.
 *
 * @param props - The ThinkingBlock props to render with.
 * @returns The host element the block mounted into.
 */
function renderThinking(props: Partial<ThinkingBlockProps>): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: (): VNodeChild =>
      h(ThinkingBlock, { content: 'pondering', ...props } as ThinkingBlockProps),
  })
  mounted.app = app
  app.mount(host)
  return host
}

describe('ThinkingBlock', () => {
  it('shows the brief default and stays collapsed for a finished short thought', () => {
    const host = renderThinking({ content: 'pondering', durationMs: 999 })
    expect(host.textContent).toContain('Thought briefly')
    expect(host.textContent).not.toContain('pondering')
  })

  it('names a recorded duration in seconds', () => {
    const host = renderThinking({ content: 'pondering', durationMs: 5400 })
    expect(host.textContent).toContain('Thought for 5 seconds')
    expect(host.textContent).not.toContain('pondering')
  })

  it('auto-expands and labels itself while streaming', () => {
    const host = renderThinking({ content: 'pondering', isStreaming: true })
    expect(host.textContent).toContain('Thinking')
    expect(host.textContent).toContain('pondering')
  })

  it('opens and closes through its disclosure button', async () => {
    const host = renderThinking({ content: 'pondering', durationMs: 5400 })
    const button = host.querySelector('button') as HTMLElement
    expect(button).not.toBeNull()
    expect(host.textContent).not.toContain('pondering')

    button.click()
    await nextTick()
    expect(host.textContent).toContain('pondering')

    button.click()
    await nextTick()
    expect(host.textContent).not.toContain('pondering')
  })

  it('lets a manual collapse win over the streaming default', async () => {
    const host = renderThinking({ content: 'pondering', isStreaming: true })
    const button = host.querySelector('button') as HTMLElement
    button.click()
    await nextTick()
    expect(host.textContent).not.toContain('pondering')
    expect(host.textContent).toContain('Thinking')
  })

  it('pins the scroll position to the bottom as streamed content grows', async () => {
    const content = ref('first')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: (): VNodeChild =>
        h(ThinkingBlock, { content: content.value, isStreaming: true } as ThinkingBlockProps),
    })
    mounted.app = app
    app.mount(host)

    const body = Array.from(host.querySelectorAll('div')).find(
      (element) => element.style.whiteSpace === 'pre-wrap',
    ) as HTMLElement
    expect(body).toBeDefined()
    Object.defineProperty(body, 'scrollHeight', { value: 180, configurable: true })

    content.value = 'first and second'
    await nextTick()
    expect(body.scrollTop).toBe(180)
  })
})

// @vitest-environment jsdom
/**
 * `ThinkingBlock` rendered for real: the disclosure label (streaming, a recorded
 * duration, or the brief default), the collapsed-by-default body, the manual
 * toggle, and the auto-scroll as streamed thinking arrives.
 *
 * Solid port of `@molecule/app-ide-react`'s `ThinkingBlock` behaviour (unit U2
 * of the ChatPanel port): the same DOM for the same input, the same behaviour.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ThinkingBlockProps } from '../parts/ThinkingBlock.jsx'
import { ThinkingBlock } from '../parts/ThinkingBlock.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the block with the given props.
 *
 * @param props - The ThinkingBlock props to render with (content is required).
 * @returns The host element the block mounted into.
 */
function renderThinking(props: ThinkingBlockProps): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(() => <ThinkingBlock {...props} />, container)
  return container
}

describe('ThinkingBlock', () => {
  it('shows the brief default and stays collapsed for a finished short thought', () => {
    const container = renderThinking({ content: 'pondering', durationMs: 999 })
    expect(container.textContent).toContain('Thought briefly')
    expect(container.textContent).not.toContain('pondering')
  })

  it('names a recorded duration in seconds', () => {
    const container = renderThinking({ content: 'pondering', durationMs: 5400 })
    expect(container.textContent).toContain('Thought for 5 seconds')
    expect(container.textContent).not.toContain('pondering')
  })

  it('auto-expands and labels itself while streaming', () => {
    const container = renderThinking({ content: 'pondering', isStreaming: true })
    expect(container.textContent).toContain('Thinking')
    expect(container.textContent).toContain('pondering')
  })

  it('opens and closes through its disclosure button', () => {
    const container = renderThinking({ content: 'pondering', durationMs: 5400 })
    const button = container.querySelector('button') as HTMLElement
    expect(button).not.toBeNull()
    expect(container.textContent).not.toContain('pondering')

    button.click()
    expect(container.textContent).toContain('pondering')

    button.click()
    expect(container.textContent).not.toContain('pondering')
  })

  it('lets a manual collapse win over the streaming default', () => {
    const container = renderThinking({ content: 'pondering', isStreaming: true })
    const button = container.querySelector('button') as HTMLElement
    button.click()
    expect(container.textContent).not.toContain('pondering')
    expect(container.textContent).toContain('Thinking')
  })

  it('pins the scroll position to the bottom as streamed content grows', () => {
    const [content, setContent] = createSignal('first')
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => <ThinkingBlock content={content()} isStreaming={true} />,
      container,
    )

    const body = Array.from(container.querySelectorAll('div')).find(
      (element) => element.style.whiteSpace === 'pre-wrap',
    ) as HTMLElement
    expect(body).toBeDefined()
    Object.defineProperty(body, 'scrollHeight', { value: 180, configurable: true })

    setContent('first and second')
    expect(body.scrollTop).toBe(180)
  })
})

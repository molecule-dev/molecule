// @vitest-environment jsdom

/**
 * `ThinkingBlock` rendered for real: the auto-expanded streaming state, the
 * collapsed finished state with its duration label, the reader's manual
 * toggle taking over, and the open block scrolling to its latest thinking.
 *
 * Svelte port of `@molecule/app-ide-react`'s `ThinkingBlock` behaviour (the
 * React component has no test of its own; its contract is the source file),
 * mounted on the part itself since the Svelte ChatPanel's timeline dispatch
 * (unit U4) is not there yet.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ThinkingBlockProps } from '../parts/ThinkingBlock.svelte'
import ThinkingBlock from '../parts/ThinkingBlock.svelte'

/** The mount this file last created, torn down after each test. */
let mounted: Record<string, unknown> | undefined

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (mounted) await unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the thinking block with the given props.
 *
 * @param props - The block's props.
 * @returns The host element the block mounted into.
 */
function render(props: ThinkingBlockProps): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted = mount(ThinkingBlock, { target: host, props })
  flushSync()
  return host
}

/**
 * The thinking block's disclosure button.
 *
 * @param host - The mounted host.
 * @returns The button element.
 */
function toggleButton(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector('button')
  expect(button, 'the disclosure button should render').not.toBeNull()
  return button as HTMLButtonElement
}

describe('ThinkingBlock — the streaming state', () => {
  it('opens itself while streaming and shows the thinking content', () => {
    const host = render({ content: 'Weighing the options', isStreaming: true })
    expect(host.textContent).toContain('Thinking')
    expect(host.textContent).toContain('Weighing the options')
    // The chevron points right once open.
    expect(host.querySelector('polyline')?.parentElement?.getAttribute('style')).toContain(
      'rotate(90deg)',
    )
  })

  it('lets the reader collapse it while the reply still streams', () => {
    const host = render({ content: 'Still thinking', isStreaming: true })
    toggleButton(host).click()
    flushSync()
    expect(host.textContent).toContain('Thinking')
    expect(host.textContent).not.toContain('Still thinking')
  })
})

describe('ThinkingBlock — the finished state', () => {
  it('stays collapsed and names the duration it took', () => {
    const host = render({ content: 'Settled content', durationMs: 2000 })
    expect(host.textContent).toContain('Thought for 2 seconds')
    expect(host.textContent).not.toContain('Settled content')
    toggleButton(host).click()
    flushSync()
    expect(host.textContent).toContain('Settled content')
  })

  it('says it thought briefly when no duration was recorded', () => {
    const host = render({ content: 'Quick', durationMs: undefined })
    expect(host.textContent).toContain('Thought briefly')
  })

  it('treats a zero duration as a brief thought, like React', () => {
    const host = render({ content: 'Quick', durationMs: 0 })
    expect(host.textContent).toContain('Thought briefly')
  })

  it('opens on the first toggle and closes on the second', () => {
    const host = render({ content: 'Toggle me' })
    const button = toggleButton(host)
    button.click()
    flushSync()
    expect(host.textContent).toContain('Toggle me')
    button.click()
    flushSync()
    expect(host.textContent).not.toContain('Toggle me')
  })
})

describe('ThinkingBlock — scrolling', () => {
  it('scrolls the open content to its bottom as thinking streams in', () => {
    // jsdom ignores a real scrollTop write on an unlaid-out element, so record
    // the assignment the effect makes (React's `scrollTop = scrollHeight`).
    let assigned: number | null = null
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 123,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => assigned ?? 0,
      set: (value: number) => {
        assigned = value
      },
    })
    const host = render({ content: 'First line\nSecond line', isStreaming: true })
    expect(host.querySelector('div'), 'the open content should render').not.toBeNull()
    expect(assigned).toBe(123)
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight
    delete (HTMLElement.prototype as { scrollTop?: number }).scrollTop
  })

  it('scrolls when the reader opens a finished block', () => {
    let assigned: number | null = null
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => assigned ?? 0,
      set: (value: number) => {
        assigned = value
      },
    })
    const host = render({ content: 'Thought so' })
    expect(assigned, 'nothing scrolls while collapsed').toBeNull()
    toggleButton(host).click()
    flushSync()
    expect(assigned).toBe(200)
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight
    delete (HTMLElement.prototype as { scrollTop?: number }).scrollTop
  })
})

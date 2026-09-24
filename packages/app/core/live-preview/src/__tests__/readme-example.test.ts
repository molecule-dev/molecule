// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real iframe bond in a DOM
 * (jsdom never fetches the frame's page, so nothing is mocked).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-live-preview-iframe'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('loads on loadNonce, tracks reported navigation and refreshes the current page', () => {
    setProvider(provider)

    const preview = requireProvider()
    const frame = document.createElement('iframe')
    document.body.append(frame)

    const bar: Array<[string, boolean]> = []
    const loads: string[] = []
    let loadedNonce = -1
    const unsubscribe = preview.subscribe((state) => {
      if (state.loadNonce !== loadedNonce) {
        loadedNonce = state.loadNonce
        frame.src = state.url
        loads.push(frame.src)
      }
      bar.push([state.currentUrl, state.canGoBack])
    })

    window.addEventListener('message', (event: MessageEvent<{ type?: string; url?: string }>) => {
      if (event.source !== frame.contentWindow || event.data?.type !== 'molecule:navigate') return
      if (event.data.url) preview.recordNavigation(event.data.url)
    })

    preview.setUrl('http://localhost:5173/')
    expect(bar.at(-1)).toEqual(['http://localhost:5173/', false])

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'molecule:navigate', url: 'http://localhost:5173/settings' },
        source: frame.contentWindow,
      }),
    )
    expect(bar.at(-1)).toEqual(['http://localhost:5173/settings', true])

    // A message from anywhere else is ignored.
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'molecule:navigate', url: 'http://evil.example.com/' },
      }),
    )
    expect(preview.getState().currentUrl).toBe('http://localhost:5173/settings')

    const notifications = bar.length
    preview.setUrl('http://localhost:5173/')
    expect(bar).toHaveLength(notifications)

    preview.refresh()
    expect(loads).toEqual(['http://localhost:5173/', 'http://localhost:5173/settings'])

    unsubscribe()
    preview.refresh()
    expect(loads).toHaveLength(2)
  })
})

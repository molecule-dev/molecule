import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback, hasProvider, writeText } from '@molecule/app-clipboard'

import { setupAppClipboardWeb } from '../setup.js'

/**
 * Gives the page a Clipboard API whose `writeText` behaves as given.
 *
 * @param writeTextImpl - The page's `navigator.clipboard.writeText`.
 */
function stubClipboard(writeTextImpl: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(writeTextImpl) },
  })
}

describe('setupAppClipboardWeb()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bonds a clipboard provider, so writeText() works in a default app', async () => {
    // The failure this guards: no default bond wired the clipboard, so writeText()
    // threw "No provider set", and components called navigator.clipboard themselves.
    expect(hasProvider()).toBe(false)
    await expect(writeText('x')).rejects.toThrow(/No provider set/)

    setupAppClipboardWeb()

    expect(hasProvider()).toBe(true)
    const calls: string[] = []
    stubClipboard(async (text) => {
      calls.push(text)
    })
    await writeText('https://example.com/share/1')
    expect(calls).toEqual(['https://example.com/share/1'])
  })

  it('copies through the selection fallback where the Clipboard API refuses', async () => {
    setupAppClipboardWeb()
    // An iframe without the clipboard-write permission rejects the write.
    stubClipboard(async () => {
      throw new DOMException('Write permission denied.', 'NotAllowedError')
    })
    const copied: string[] = []
    const execCommand = vi.fn((command: string) => {
      // The fallback copies the text it put in a hidden field for the command.
      const field = document.body.querySelector('textarea')
      if (command === 'copy' && field) copied.push(field.value)
      return command === 'copy'
    })
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

    await expect(copyTextWithFallback('secret-token')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(copied).toEqual(['secret-token'])
  })

  it('reports false, without throwing, where no copy is possible', async () => {
    setupAppClipboardWeb()
    stubClipboard(async () => {
      throw new DOMException('Write permission denied.', 'NotAllowedError')
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => false),
    })

    await expect(copyTextWithFallback('x')).resolves.toBe(false)
  })
})

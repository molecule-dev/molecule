import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createWebClipboardProvider, provider } from '../provider.js'

const nav = navigator as Navigator & { clipboard?: unknown }
let original: unknown

beforeEach(() => {
  original = nav.clipboard
})
afterEach(() => {
  Object.defineProperty(nav, 'clipboard', { value: original, configurable: true })
})

function setClipboard(value: unknown): void {
  Object.defineProperty(nav, 'clipboard', { value, configurable: true })
}

describe('web clipboard provider', () => {
  it('writes and reads text through navigator.clipboard', async () => {
    const writeText = vi.fn(async () => {})
    const readText = vi.fn(async () => 'hello')
    setClipboard({ writeText, readText })
    await provider.writeText('npx mlcl create my-app')
    expect(writeText).toHaveBeenCalledWith('npx mlcl create my-app')
    expect(await provider.readText()).toBe('hello')
    expect(await provider.read()).toEqual({ text: 'hello' })
    expect(await provider.hasContent()).toBe(true)
    const caps = await provider.getCapabilities()
    expect(caps.supported).toBe(true)
    expect(caps.canRead).toBe(true)
    expect(caps.canWriteImage).toBe(false)
  })

  it('falls back to selection-and-copy when the API is missing or rejects', async () => {
    setClipboard(undefined)
    const exec = vi.fn(() => true)
    ;(document as Document & { execCommand: typeof exec }).execCommand = exec
    await provider.writeText('fallback')
    expect(exec).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()

    setClipboard({ writeText: vi.fn(async () => Promise.reject(new Error('not focused'))) })
    exec.mockClear()
    await provider.writeText('again')
    expect(exec).toHaveBeenCalledWith('copy')

    const strict = createWebClipboardProvider({ legacyCopyFallback: false })
    setClipboard(undefined)
    await expect(strict.writeText('x')).rejects.toThrow(/not available/)
  })

  it('rejects reads where the API is missing and reports it in the capabilities', async () => {
    setClipboard(undefined)
    await expect(provider.readText()).rejects.toThrow(/not available/)
    expect(await provider.read()).toEqual({})
    expect(await provider.hasContent()).toBe(false)
    expect(await provider.getAvailableTypes()).toEqual([])
    expect((await provider.getCapabilities()).canRead).toBe(false)
  })

  it('writes HTML with a text part and clears by writing nothing', async () => {
    const writeText = vi.fn(async () => {})
    setClipboard({ writeText })
    await provider.writeHtml('<b>bold</b>')
    // No ClipboardItem in this environment: the text part is what gets written.
    expect(writeText).toHaveBeenCalledWith('bold')
    await provider.clear()
    expect(writeText).toHaveBeenLastCalledWith('')
  })
})

import { describe, expect, it } from 'vitest'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { OcrProvider } from '../types.js'

const fake: OcrProvider = {
  name: 'test',
  async recognize() {
    return { text: 'hi', pages: [{ pageNumber: 1, text: 'hi' }] }
  },
}

describe('ocr bond slot', () => {
  it('starts unbonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow('OCR provider not configured')
  })

  it('bonds and requires a provider', () => {
    setProvider(fake)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(fake)
    expect(getProvider()).toBe(fake)
  })
})

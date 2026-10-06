import { describe, expect, it } from 'vitest'

import { LSP_MAX_DOCUMENT_CHARS, lspCanCarry } from '../provider.js'

describe('lspCanCarry', () => {
  it('sends ordinary source files', () => {
    expect(lspCanCarry('export const a = 1\n')).toBe(true)
    expect(lspCanCarry('x'.repeat(LSP_MAX_DOCUMENT_CHARS))).toBe(true)
  })

  it('keeps a document the language-server socket would refuse (over 1 MB) off the wire', () => {
    expect(lspCanCarry('x'.repeat(LSP_MAX_DOCUMENT_CHARS + 1))).toBe(false)
    // Even at three bytes a character the cap stays under the socket's 1 MB limit.
    expect(LSP_MAX_DOCUMENT_CHARS * 3).toBeLessThan(1024 * 1024)
  })
})

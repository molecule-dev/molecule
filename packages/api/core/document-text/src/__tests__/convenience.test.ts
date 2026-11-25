import { describe, expect, it } from 'vitest'

import { extractDocumentText, getProvider, hasProvider, setProvider } from '../provider.js'
import type { DocumentTextProvider, DocumentTextResult } from '../types.js'

const fakeResult: DocumentTextResult = {
  text: 'hello',
  pages: [{ pageNumber: 1, text: 'hello' }],
  pageCount: 1,
  truncated: false,
  pagesOmitted: 0,
}

const fakeProvider: DocumentTextProvider = {
  name: 'fake',
  extract: async () => fakeResult,
}

describe('document-text core convenience', () => {
  it('throws a named error when no provider is bonded', async () => {
    expect(hasProvider()).toBe(false)
    expect(() => getProvider()).toThrow(/setProvider\(\) first/)
    await expect(extractDocumentText({ data: new Uint8Array([1]) })).rejects.toThrow(
      /Document text provider not configured/,
    )
  })

  it('delegates to the bonded provider through extractDocumentText', async () => {
    setProvider(fakeProvider)
    expect(hasProvider()).toBe(true)
    const result = await extractDocumentText({ data: new Uint8Array([1]) }, { maxPages: 1 })
    expect(result).toEqual(fakeResult)
  })
})

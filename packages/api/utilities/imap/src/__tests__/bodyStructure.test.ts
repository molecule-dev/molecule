/**
 * Unit tests for the BODYSTRUCTURE flattener and part classifiers.
 */

import { describe, expect, it } from 'vitest'

import { classifyTextPart, flattenBodyStructure, isAttachmentPart } from '../bodyStructure.js'

describe('flattenBodyStructure', () => {
  it('returns [] for undefined', () => {
    expect(flattenBodyStructure(undefined)).toEqual([])
  })

  it('returns a single leaf for a non-multipart message', () => {
    const parts = flattenBodyStructure({ part: '1', type: 'text/plain', size: 42 })
    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({ part: '1', type: 'text/plain', size: 42, inline: false })
  })

  it('flattens a multipart/alternative into two leaves', () => {
    const parts = flattenBodyStructure({
      type: 'multipart/alternative',
      childNodes: [
        { part: '1', type: 'text/plain' },
        { part: '2', type: 'text/html' },
      ],
    })
    expect(parts.map((p) => p.part)).toEqual(['1', '2'])
    expect(parts.map((p) => p.type)).toEqual(['text/plain', 'text/html'])
  })

  it('extracts filename from disposition parameters', () => {
    const parts = flattenBodyStructure({
      type: 'multipart/mixed',
      childNodes: [
        { part: '1', type: 'text/plain' },
        {
          part: '2',
          type: 'application/pdf',
          disposition: 'attachment',
          dispositionParameters: { filename: 'spec.pdf' },
        },
      ],
    })
    expect(parts[1]).toMatchObject({
      filename: 'spec.pdf',
      disposition: 'attachment',
      inline: false,
    })
  })

  it('falls back to legacy `parameters.name` when disposition has no filename', () => {
    const parts = flattenBodyStructure({
      part: '1',
      type: 'application/pdf',
      parameters: { name: 'legacy.pdf' },
    })
    expect(parts[0].filename).toBe('legacy.pdf')
  })

  it('strips angle brackets from Content-ID', () => {
    const parts = flattenBodyStructure({
      part: '1',
      type: 'image/png',
      id: '<inline@1>',
      disposition: 'inline',
    })
    expect(parts[0].contentId).toBe('inline@1')
    expect(parts[0].inline).toBe(true)
  })
})

describe('classifyTextPart', () => {
  it('classifies text/plain bodies', () => {
    expect(
      classifyTextPart({
        part: '1',
        type: 'text/plain',
        size: 0,
        inline: false,
      }),
    ).toBe('text')
  })

  it('classifies text/html bodies', () => {
    expect(classifyTextPart({ part: '2', type: 'text/html', size: 0, inline: false })).toBe('html')
  })

  it('skips text parts that are attachments (filename present)', () => {
    expect(
      classifyTextPart({
        part: '1',
        type: 'text/plain',
        size: 0,
        inline: false,
        filename: 'log.txt',
      }),
    ).toBeUndefined()
  })

  it('returns undefined for non-text parts', () => {
    expect(
      classifyTextPart({ part: '1', type: 'image/png', size: 0, inline: false }),
    ).toBeUndefined()
  })
})

describe('isAttachmentPart', () => {
  it('flags attachment-disposition parts', () => {
    expect(
      isAttachmentPart({
        part: '2',
        type: 'application/pdf',
        size: 1,
        inline: false,
        disposition: 'attachment',
      }),
    ).toBe(true)
  })

  it('flags parts that have a filename', () => {
    expect(
      isAttachmentPart({
        part: '2',
        type: 'application/pdf',
        size: 1,
        inline: false,
        filename: 'a.pdf',
      }),
    ).toBe(true)
  })

  it('flags parts that have a Content-ID (inline cid: references)', () => {
    expect(
      isAttachmentPart({
        part: '3',
        type: 'image/png',
        size: 1,
        inline: true,
        contentId: 'avatar@1',
      }),
    ).toBe(true)
  })

  it('rejects plain text/html bodies', () => {
    expect(isAttachmentPart({ part: '1', type: 'text/plain', size: 0, inline: false })).toBe(false)
  })
})

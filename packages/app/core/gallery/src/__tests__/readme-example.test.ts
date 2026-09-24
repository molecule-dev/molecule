/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the PhotoSwipe bond with the
 * `photoswipe` library (which needs a real browser to render) mocked the same
 * way the bond's own tests mock it.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  /** Stand-in for the PhotoSwipe lightbox class. */
  class MockPhotoSwipe {
    static instances: MockPhotoSwipe[] = []

    options: { dataSource?: unknown; index?: number; zoom?: boolean; counter?: boolean }
    currIndex: number
    listeners: Record<string, Array<() => void>> = {}

    init = vi.fn()
    close = vi.fn(() => {
      this.emit('close')
      this.emit('destroy')
    })

    constructor(options: MockPhotoSwipe['options']) {
      this.options = options
      this.currIndex = options.index ?? 0
      MockPhotoSwipe.instances.push(this)
    }

    on(event: string, fn: () => void): void {
      ;(this.listeners[event] ||= []).push(fn)
    }

    emit(event: string): void {
      for (const fn of this.listeners[event] ?? []) fn()
    }
  }
  return { MockPhotoSwipe }
})

vi.mock('photoswipe', () => ({ default: mocks.MockPhotoSwipe }))

import { provider } from '@molecule/app-gallery-photoswipe'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('opens the PhotoSwipe lightbox at the clicked item and fires onClose on close', () => {
    setProvider(provider)

    const photos = [
      {
        src: '/photos/sunset.jpg',
        thumbnail: '/photos/sunset-thumb.jpg',
        width: 1200,
        height: 800,
        alt: 'Sunset over the bay',
      },
      { src: '/photos/harbor.jpg', width: 1200, height: 900, alt: 'Harbor at dawn' },
    ]
    const onClose = vi.fn()
    const gallery = requireProvider().createGallery({ items: photos, onClose })

    gallery.open(1)
    const lightbox = mocks.MockPhotoSwipe.instances[0]
    expect(lightbox?.init).toHaveBeenCalledTimes(1)
    expect(lightbox?.options).toEqual({
      dataSource: [
        expect.objectContaining({ src: '/photos/sunset.jpg', msrc: '/photos/sunset-thumb.jpg' }),
        expect.objectContaining({ src: '/photos/harbor.jpg', alt: 'Harbor at dawn' }),
      ],
      index: 1,
      zoom: true,
      counter: true,
    })
    expect(gallery.getCurrentIndex()).toBe(1)

    gallery.close()
    expect(lightbox?.close).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

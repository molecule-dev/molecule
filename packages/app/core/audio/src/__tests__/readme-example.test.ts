/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Howler bond with the
 * `howler` SDK mocked (node has no audio backend).
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const { MockHowl, howl, handlers } = vi.hoisted(() => {
  const handlers: Record<string, Array<() => void>> = {}
  const howl = {
    play: vi.fn(() => 1),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn((value?: number) => (typeof value === 'number' ? howl : 0)),
    volume: vi.fn((value?: number) => (typeof value === 'number' ? howl : 0.8)),
    duration: vi.fn(() => 180),
    playing: vi.fn(() => false),
    off: vi.fn(),
    unload: vi.fn(),
    on: vi.fn((event: string, callback: () => void) => {
      ;(handlers[event] ||= []).push(callback)
      return howl
    }),
  }
  const MockHowl = vi.fn(function () {
    return howl
  })
  return { MockHowl, howl, handlers }
})

vi.mock('howler', () => ({ Howl: MockHowl, Howler: { volume: vi.fn() } }))

import { provider } from '@molecule/app-audio-howler'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('creates a Howler-backed player, plays on the gesture, and reports the end', () => {
    setProvider(provider)

    let finished = false
    const player = requireProvider().createPlayer({
      src: '/audio/track.mp3',
      volume: 0.8,
      onProgress: (time, duration) => console.log(`${time}s / ${duration}s`),
      onEnd: () => {
        finished = true
      },
    })
    expect(MockHowl).toHaveBeenCalledWith(
      expect.objectContaining({ src: ['/audio/track.mp3'], volume: 0.8, autoplay: false }),
    )

    const onPlayClick = (): void => player.play()
    onPlayClick()
    expect(howl.play).toHaveBeenCalledTimes(1)
    player.seek(30)
    expect(howl.seek).toHaveBeenCalledWith(30)
    player.setVolume(0.5)
    expect(howl.volume).toHaveBeenCalledWith(0.5)
    expect(player.getDuration()).toBe(180)

    handlers.end?.forEach((handler) => handler())
    expect(finished).toBe(true)

    player.destroy()
    expect(howl.unload).toHaveBeenCalledTimes(1)
  })
})

/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

// The outside world: Howler needs a real browser audio backend, so it is mocked
// the same way index.test.ts does — a stateful fake `Howl` plus global `Howler`.
const fake = vi.hoisted(() => {
  const handlers: Record<string, Array<() => void>> = {}
  const howl = {
    play: vi.fn(() => 1),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn((value?: number) => (typeof value === 'number' ? howl : 0)),
    volume: vi.fn(() => 0.9),
    duration: vi.fn(() => 1800),
    playing: vi.fn(() => false),
    off: vi.fn(),
    unload: vi.fn(),
    on: vi.fn((event: string, callback: () => void) => {
      ;(handlers[event] ||= []).push(callback)
      return howl
    }),
  }
  const Howl = vi.fn(function () {
    return howl
  })
  return { handlers, howl, Howl, Howler: { volume: vi.fn() } }
})

vi.mock('howler', () => ({ Howl: fake.Howl, Howler: fake.Howler }))

import { requireProvider, setProvider } from '@molecule/app-audio'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds Howler and plays, seeks, ends and destroys a player', () => {
    setProvider(createProvider({ html5: true, volume: 0.8 }))
    expect(fake.Howler.volume).toHaveBeenCalledWith(0.8)

    const progress: Array<[number, number]> = []
    const onEnd = vi.fn()
    const player = requireProvider().createPlayer({
      src: ['/audio/episode-12.webm', '/audio/episode-12.mp3'],
      volume: 0.9,
      onProgress: (time, duration) => progress.push([time, duration]),
      onEnd,
    })

    expect(fake.Howl).toHaveBeenCalledWith({
      src: ['/audio/episode-12.webm', '/audio/episode-12.mp3'],
      autoplay: false,
      loop: false,
      volume: 0.9,
      html5: true,
    })

    fake.handlers.load?.forEach((handler) => handler())
    expect(progress).toEqual([[0, 1800]])
    expect(player.getDuration()).toBe(1800)

    player.play()
    expect(fake.howl.play).toHaveBeenCalledTimes(1)
    player.seek(30)
    expect(fake.howl.seek).toHaveBeenCalledWith(30)

    fake.handlers.end?.forEach((handler) => handler())
    expect(onEnd).toHaveBeenCalledTimes(1)

    player.destroy()
    expect(fake.howl.unload).toHaveBeenCalledTimes(1)
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AudioPlayer` — a port of
 * `@molecule/app-audio-player-react/src/__tests__/audio-player.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * Media-element effects (timeupdate, play/pause) don't fire under a static
 * render, so these tests cover the initial static chrome — as React's do.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Mirror the real Button: consume variant/size, forward everything else
// (aria-label, data-mol-id, onClick, …) onto the <button> like `{...rest}`.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    onClick?: () => void
    'aria-label'?: string
    'data-mol-id'?: string
  }) => (
    <button
      data-button=""
      onClick={() => props.onClick?.()}
      aria-label={props['aria-label']}
      data-mol-id={props['data-mol-id']}
    >
      {props.children}
    </button>
  ),
}))

import { AudioPlayer } from '../AudioPlayer.jsx'
import type { AudioPlayerProps } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders an {@link AudioPlayer} and returns the markup it produced.
 *
 * @param props - The player props.
 * @returns The rendered markup.
 */
const renderPlayer = (props: AudioPlayerProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <AudioPlayer {...props} />, container))
  return container.innerHTML
}

describe('AudioPlayer', () => {
  it('renders an <audio> element carrying the src', () => {
    const markup = renderPlayer({ src: 'track.mp3' })
    expect(markup).toContain('<audio')
    expect(markup).toContain('src="track.mp3"')
  })

  it('renders the title and subtitle when present and omits the header otherwise', () => {
    const withHeader = renderPlayer({ src: 's', title: 'Episode 1', subtitle: 'My Podcast' })
    expect(withHeader).toContain('Episode 1')
    expect(withHeader).toContain('My Podcast')
    const without = renderPlayer({ src: 's' })
    expect(without).not.toContain('<header')
  })

  it('renders the visualizer slot', () => {
    const markup = renderPlayer({ src: 's', visualizer: <canvas data-viz="" /> })
    expect(markup).toContain('data-viz=""')
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('shows the unmuted glyph by default and the muted glyph when defaultMuted', () => {
    expect(renderPlayer({ src: 's' })).toContain('🔊')
    expect(renderPlayer({ src: 's', defaultMuted: true })).toContain('🔇')
  })

  it('gives the play/pause control an accessible name and data-mol-id, and hides the glyph', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('data-mol-id="audio-player-toggle"')
    // Idle → the toggle plays, so its accessible name is "Play".
    expect(markup).toContain('aria-label="Play"')
    // The emoji glyph is decorative once the button is labelled.
    expect(markup).toContain('aria-hidden="true"')
  })

  it('gives the mute control an accessible name reflecting state + a data-mol-id', () => {
    const unmuted = renderPlayer({ src: 's' })
    expect(unmuted).toContain('data-mol-id="audio-player-mute"')
    expect(unmuted).toContain('aria-label="Mute"')
    const muted = renderPlayer({ src: 's', defaultMuted: true })
    expect(muted).toContain('aria-label="Unmute"')
  })

  it('gives the seek control a data-mol-id alongside its aria-label', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('data-mol-id="audio-player-seek"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('forwards className', () => {
    const markup = renderPlayer({ src: 's', className: 'ap-cls' })
    expect(markup).toContain('ap-cls')
  })

  it('renders a captions track on the audio element', () => {
    const markup = renderPlayer({
      src: 's',
      captions: 'captions.vtt',
      captionsLang: 'en',
      captionsLabel: 'English',
    })
    expect(markup).toContain('<track')
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('src="captions.vtt"')
    expect(markup).toContain('srclang="en"')
    expect(markup).toContain('label="English"')
  })

  it('labels the captions track through i18n when captionsLabel is absent', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('label="Captions"')
  })

  it('shows a polite caption line only when a captions file is given', () => {
    const withCaptions = renderPlayer({ src: 's', captions: 'c.vtt' })
    expect(withCaptions).toMatch(/<p aria-live="polite" data-mol-id="audio-player-captions"/)
    const without = renderPlayer({ src: 's' })
    expect(without).not.toContain('audio-player-captions')
  })
})

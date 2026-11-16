// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `AudioPlayer` — a port of
 * `@molecule/app-audio-player-react/src/__tests__/audio-player.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * Media-element effects (timeupdate, play/pause) don't fire under a static
 * render, so these tests cover the initial static chrome — as React's do.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use.
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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` marker the React tests mock `@molecule/app-ui-react` with:
// a button carrying its children and every pass-through attribute.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  return { Button }
})

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import { AudioPlayer } from '../components.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Renders an {@link AudioPlayer} and returns the markup it produced.
 *
 * @param props - The player props.
 * @returns The rendered markup.
 */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(AudioPlayer, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
  return markup
}

describe('AudioPlayer', () => {
  it('renders an <audio> element carrying the src', () => {
    const markup = render({ src: 'track.mp3' })
    expect(markup).toContain('<audio')
    expect(markup).toContain('src="track.mp3"')
  })

  it('renders the title and subtitle when present and omits the header otherwise', () => {
    const withHeader = render({ src: 's', title: 'Episode 1', subtitle: 'My Podcast' })
    expect(withHeader).toContain('Episode 1')
    expect(withHeader).toContain('My Podcast')
    const without = render({ src: 's' })
    expect(without).not.toContain('<header')
  })

  it('renders the visualizer slot', () => {
    const markup = render({ src: 's', visualizer: raw('<canvas data-viz></canvas>') })
    expect(markup).toContain('data-viz')
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('shows the unmuted glyph by default and the muted glyph when defaultMuted', () => {
    expect(render({ src: 's' })).toContain('🔊')
    expect(render({ src: 's', defaultMuted: true })).toContain('🔇')
  })

  it('gives the play/pause control an accessible name and data-mol-id, and hides the glyph', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('data-mol-id="audio-player-toggle"')
    // Idle → the toggle plays, so its accessible name is "Play".
    expect(markup).toContain('aria-label="Play"')
    // The emoji glyph is decorative once the button is labelled.
    expect(markup).toContain('aria-hidden="true"')
  })

  it('gives the mute control an accessible name reflecting state + a data-mol-id', () => {
    const unmuted = render({ src: 's' })
    expect(unmuted).toContain('data-mol-id="audio-player-mute"')
    expect(unmuted).toContain('aria-label="Mute"')
    const muted = render({ src: 's', defaultMuted: true })
    expect(muted).toContain('aria-label="Unmute"')
  })

  it('gives the seek control a data-mol-id alongside its aria-label', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('data-mol-id="audio-player-seek"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('forwards className', () => {
    const markup = render({ src: 's', className: 'ap-cls' })
    expect(markup).toContain('ap-cls')
  })

  it('renders a captions track on the audio element', () => {
    const markup = render({
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
    const markup = render({ src: 's' })
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('label="Captions"')
  })

  it('shows a polite caption line only when a captions file is given', () => {
    const withCaptions = render({ src: 's', captions: 'c.vtt' })
    expect(withCaptions).toMatch(/<p aria-live="polite" data-mol-id="audio-player-captions"/)
    const without = render({ src: 's' })
    expect(without).not.toContain('audio-player-captions')
  })
})

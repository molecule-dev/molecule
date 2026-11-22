// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AudioPlayer` — a port of
 * `@molecule/app-audio-player-react/src/__tests__/audio-player.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * Media-element effects (timeupdate, play/pause) don't fire under a static
 * render, so these tests cover the initial static chrome — as React's do.
 *
 * @module
 */

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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Mirror the real Button: consume variant/size, forward everything else
// (aria-label, data-mol-id, onClick, …) onto the <button> like `{...rest}`.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      props: { variant: String, size: String },
      setup(props, { attrs, slots }) {
        void props
        return () => h('button', { 'data-button': '', ...attrs }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { AudioPlayer } from '../AudioPlayer.js'
import type { AudioPlayerProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders an {@link AudioPlayer} and returns the markup it produced.
 *
 * @param props - The player props.
 * @param slots - Same-named slots for the node-valued props.
 * @returns The rendered markup.
 */
const render = (props: AudioPlayerProps, slots?: Record<string, () => VNodeChild[]>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AudioPlayer, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
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
    const markup = render({ src: 's' }, { visualizer: () => [h('canvas', { 'data-viz': '' })] })
    expect(markup).toContain('data-viz=""')
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

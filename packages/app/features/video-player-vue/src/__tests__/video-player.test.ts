// @vitest-environment jsdom
/**
 * Unit tests for the Vue `VideoPlayer` — a port of
 * `@molecule/app-video-player-react/src/__tests__/video-player.test.tsx`:
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
// `position`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Mirror the real Button: consume variant/size, forward everything else
// (aria-label, onClick, …) onto the <button> like `{...rest}`.
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

import { createApp, defineComponent, h } from 'vue'

import type { VideoPlayerProps } from '../types.js'
import { VideoPlayer } from '../VideoPlayer.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link VideoPlayer} and returns the markup it produced.
 *
 * @param props - The player props.
 * @returns The rendered markup.
 */
const render = (props: VideoPlayerProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(VideoPlayer, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('VideoPlayer', () => {
  it('renders a <video> with the src and poster', () => {
    const markup = render({ src: 'clip.mp4', poster: 'poster.jpg' })
    expect(markup).toContain('<video')
    expect(markup).toContain('src="clip.mp4"')
    expect(markup).toContain('poster="poster.jpg"')
  })

  it('renders a captions track when captionsSrc is supplied', () => {
    const markup = render({ src: 's', captionsSrc: 'caps.vtt', captionsLang: 'fr' })
    expect(markup).toContain('<track')
    expect(markup).toContain('src="caps.vtt"')
    expect(markup).toContain('srclang="fr"')
    expect(markup).toContain('label="Captions"')
  })

  it('renders a captions track without a captionsSrc, named through i18n', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('<track')
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('srclang="en"')
    expect(markup).toContain('label="Captions"')
  })

  it('names the captions track through captionsLabel', () => {
    const markup = render({ src: 's', captionsSrc: 'caps.vtt', captionsLabel: 'English' })
    expect(markup).toContain('label="English"')
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

  it('renders the mute and fullscreen control buttons', () => {
    const markup = render({ src: 's' })
    expect(markup).toContain('aria-label="Mute"')
    expect(markup).toContain('aria-label="Fullscreen"')
    expect(markup).toContain('🔊')
  })

  it('shows the muted glyph when defaultMuted is set', () => {
    const markup = render({ src: 's', defaultMuted: true })
    expect(markup).toContain('🔇')
  })

  it('forwards className', () => {
    const markup = render({ src: 's', className: 'vp-cls' })
    expect(markup).toContain('vp-cls')
  })
})

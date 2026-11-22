// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `VideoPlayer` — a port of
 * `@molecule/app-video-player-react/src/__tests__/video-player.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * Media-element effects (timeupdate, play/pause) don't fire under a static
 * render, so these tests cover the initial static chrome — as React's do.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React package's own tests use.
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { flushSync, mount, unmount } from 'svelte'

import { VideoPlayer } from '../components.js'
import type { VideoPlayerProps } from '../types.js'

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
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(VideoPlayer, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
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

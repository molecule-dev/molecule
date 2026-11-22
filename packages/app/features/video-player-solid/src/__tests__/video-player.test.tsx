// @vitest-environment jsdom
/**
 * Unit tests for the Solid `VideoPlayer` — a port of
 * `@molecule/app-video-player-react/src/__tests__/video-player.test.tsx`:
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
// (aria-label, onClick, …) onto the <button> like `{...rest}`.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; onClick?: () => void; 'aria-label'?: string }) => (
    <button data-button="" onClick={() => props.onClick?.()} aria-label={props['aria-label']}>
      {props.children}
    </button>
  ),
}))

import type { VideoPlayerProps } from '../types.js'
import { VideoPlayer } from '../VideoPlayer.jsx'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a {@link VideoPlayer} and returns the markup it produced.
 *
 * @param props - The player props.
 * @returns The rendered markup.
 */
const renderPlayer = (props: VideoPlayerProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <VideoPlayer {...props} />, container))
  return container.innerHTML
}

describe('VideoPlayer', () => {
  it('renders a <video> with the src and poster', () => {
    const markup = renderPlayer({ src: 'clip.mp4', poster: 'poster.jpg' })
    expect(markup).toContain('<video')
    expect(markup).toContain('src="clip.mp4"')
    expect(markup).toContain('poster="poster.jpg"')
  })

  it('renders a captions track when captionsSrc is supplied', () => {
    const markup = renderPlayer({ src: 's', captionsSrc: 'caps.vtt', captionsLang: 'fr' })
    expect(markup).toContain('<track')
    expect(markup).toContain('src="caps.vtt"')
    expect(markup).toContain('srclang="fr"')
    expect(markup).toContain('label="Captions"')
  })

  it('renders a captions track without a captionsSrc, named through i18n', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('<track')
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('srclang="en"')
    expect(markup).toContain('label="Captions"')
  })

  it('names the captions track through captionsLabel', () => {
    const markup = renderPlayer({ src: 's', captionsSrc: 'caps.vtt', captionsLabel: 'English' })
    expect(markup).toContain('label="English"')
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

  it('renders the mute and fullscreen control buttons', () => {
    const markup = renderPlayer({ src: 's' })
    expect(markup).toContain('aria-label="Mute"')
    expect(markup).toContain('aria-label="Fullscreen"')
    expect(markup).toContain('🔊')
  })

  it('shows the muted glyph when defaultMuted is set', () => {
    const markup = renderPlayer({ src: 's', defaultMuted: true })
    expect(markup).toContain('🔇')
  })

  it('forwards className', () => {
    const markup = renderPlayer({ src: 's', className: 'vp-cls' })
    expect(markup).toContain('vp-cls')
  })
})

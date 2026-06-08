import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    ['aria-label']: ariaLabel,
  }: {
    children?: ReactNode
    'aria-label'?: string
  }) => createElement('button', { 'data-button': '', 'aria-label': ariaLabel }, children),
}))

const { VideoPlayer } = await import('../VideoPlayer.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

// Media-element effects don't fire under SSR — these cover the initial chrome.
describe('VideoPlayer', () => {
  it('renders a <video> with the src and poster', () => {
    const markup = html(createElement(VideoPlayer, { src: 'clip.mp4', poster: 'poster.jpg' }))
    expect(markup).toContain('<video')
    expect(markup).toContain('src="clip.mp4"')
    expect(markup).toContain('poster="poster.jpg"')
  })

  it('renders a captions track when captionsSrc is supplied', () => {
    const markup = html(
      createElement(VideoPlayer, { src: 's', captionsSrc: 'caps.vtt', captionsLang: 'fr' }),
    )
    expect(markup).toContain('<track')
    expect(markup).toContain('src="caps.vtt"')
    expect(markup).toContain('srcLang="fr"')
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', () => {
    const markup = html(createElement(VideoPlayer, { src: 's' }))
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', () => {
    const markup = html(createElement(VideoPlayer, { src: 's' }))
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('renders the mute and fullscreen control buttons', () => {
    const markup = html(createElement(VideoPlayer, { src: 's' }))
    expect(markup).toContain('aria-label="Mute"')
    expect(markup).toContain('aria-label="Fullscreen"')
    expect(markup).toContain('🔊')
  })

  it('shows the muted glyph when defaultMuted is set', () => {
    const markup = html(createElement(VideoPlayer, { src: 's', defaultMuted: true }))
    expect(markup).toContain('🔇')
  })

  it('forwards className', () => {
    const markup = html(createElement(VideoPlayer, { src: 's', className: 'vp-cls' }))
    expect(markup).toContain('vp-cls')
  })
})

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
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
}))

const { AudioPlayer } = await import('../AudioPlayer.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

// Media-element effects (timeupdate, play/pause) don't fire under SSR, so
// these tests cover the initial static chrome.
describe('AudioPlayer', () => {
  it('renders an <audio> element carrying the src', () => {
    const markup = html(createElement(AudioPlayer, { src: 'track.mp3' }))
    expect(markup).toContain('<audio')
    expect(markup).toContain('src="track.mp3"')
  })

  it('renders the title and subtitle when present and omits the header otherwise', () => {
    const withHeader = html(
      createElement(AudioPlayer, { src: 's', title: 'Episode 1', subtitle: 'My Podcast' }),
    )
    expect(withHeader).toContain('Episode 1')
    expect(withHeader).toContain('My Podcast')
    const without = html(createElement(AudioPlayer, { src: 's' }))
    expect(without).not.toContain('<header')
  })

  it('renders the visualizer slot', () => {
    const markup = html(
      createElement(AudioPlayer, {
        src: 's',
        visualizer: createElement('canvas', { 'data-viz': '' }),
      }),
    )
    expect(markup).toContain('data-viz=""')
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', () => {
    const markup = html(createElement(AudioPlayer, { src: 's' }))
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', () => {
    const markup = html(createElement(AudioPlayer, { src: 's' }))
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('shows the unmuted glyph by default and the muted glyph when defaultMuted', () => {
    expect(html(createElement(AudioPlayer, { src: 's' }))).toContain('🔊')
    expect(html(createElement(AudioPlayer, { src: 's', defaultMuted: true }))).toContain('🔇')
  })

  it('forwards className', () => {
    const markup = html(createElement(AudioPlayer, { src: 's', className: 'ap-cls' }))
    expect(markup).toContain('ap-cls')
  })
})

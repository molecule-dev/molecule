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
  // Mirror the real Button: consume variant/size, forward everything else
  // (aria-label, data-mol-id, onClick, …) onto the <button> like `{...rest}`.
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...rest
  }: { children?: ReactNode } & Record<string, unknown>) =>
    createElement('button', { 'data-button': '', ...rest }, children),
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

  it('gives the play/pause control an accessible name and data-mol-id, and hides the glyph', () => {
    const markup = html(createElement(AudioPlayer, { src: 's' }))
    expect(markup).toContain('data-mol-id="audio-player-toggle"')
    // Idle → the toggle plays, so its accessible name is "Play".
    expect(markup).toContain('aria-label="Play"')
    // The emoji glyph is decorative once the button is labelled.
    expect(markup).toContain('aria-hidden="true"')
  })

  it('gives the mute control an accessible name reflecting state + a data-mol-id', () => {
    const unmuted = html(createElement(AudioPlayer, { src: 's' }))
    expect(unmuted).toContain('data-mol-id="audio-player-mute"')
    expect(unmuted).toContain('aria-label="Mute"')
    const muted = html(createElement(AudioPlayer, { src: 's', defaultMuted: true }))
    expect(muted).toContain('aria-label="Unmute"')
  })

  it('gives the seek control a data-mol-id alongside its aria-label', () => {
    const markup = html(createElement(AudioPlayer, { src: 's' }))
    expect(markup).toContain('data-mol-id="audio-player-seek"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('forwards className', () => {
    const markup = html(createElement(AudioPlayer, { src: 's', className: 'ap-cls' }))
    expect(markup).toContain('ap-cls')
  })
})

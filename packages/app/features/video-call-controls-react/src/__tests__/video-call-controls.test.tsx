import { createElement } from 'react'
import type { ReactNode } from 'react'
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
    ['aria-pressed']: ariaPressed,
  }: {
    children?: ReactNode
    'aria-pressed'?: boolean
  }) => createElement('button', { 'data-button': '', 'aria-pressed': ariaPressed }, children),
}))

const { ParticipantTile } = await import('../ParticipantTile.js')
const { VideoCallControls } = await import('../VideoCallControls.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('ParticipantTile', () => {
  it('renders the participant name', () => {
    const markup = html(createElement(ParticipantTile, { name: 'Alice' }))
    expect(markup).toContain('Alice')
  })

  it('appends " (you)" when isLocal is true', () => {
    const local = html(createElement(ParticipantTile, { name: 'Alice', isLocal: true }))
    expect(local).toContain('(you)')
    const remote = html(createElement(ParticipantTile, { name: 'Alice' }))
    expect(remote).not.toContain('(you)')
  })

  it('renders the videoSlot, falling back to avatarSlot when video is absent', () => {
    const withVideo = html(
      createElement(ParticipantTile, {
        name: 'A',
        videoSlot: createElement('video', { 'data-video': '' }),
        avatarSlot: createElement('img', { 'data-avatar': '' }),
      }),
    )
    expect(withVideo).toContain('data-video=""')
    expect(withVideo).not.toContain('data-avatar')
    const withAvatar = html(
      createElement(ParticipantTile, {
        name: 'A',
        avatarSlot: createElement('img', { 'data-avatar': '' }),
      }),
    )
    expect(withAvatar).toContain('data-avatar=""')
  })

  it('shows the muted indicator only when audio is disabled', () => {
    expect(html(createElement(ParticipantTile, { name: 'A', audioEnabled: false }))).toContain(
      'aria-label="Muted"',
    )
    expect(html(createElement(ParticipantTile, { name: 'A' }))).not.toContain('aria-label="Muted"')
  })

  it('shows the hand-raised indicator only when handRaised is set', () => {
    expect(html(createElement(ParticipantTile, { name: 'A', handRaised: true }))).toContain(
      'aria-label="Hand raised"',
    )
    expect(html(createElement(ParticipantTile, { name: 'A' }))).not.toContain(
      'aria-label="Hand raised"',
    )
  })

  it('applies the speaking outline only when speaking is set', () => {
    const speaking = html(createElement(ParticipantTile, { name: 'A', speaking: true }))
    expect(speaking).toContain('outline:3px solid #22c55e')
    const quiet = html(createElement(ParticipantTile, { name: 'A' }))
    expect(quiet).not.toContain('outline:3px solid')
  })

  it('forwards className', () => {
    const markup = html(createElement(ParticipantTile, { name: 'A', className: 'tile-cls' }))
    expect(markup).toContain('tile-cls')
  })
})

describe('VideoCallControls', () => {
  const base = {
    audioEnabled: true,
    onToggleAudio: () => {},
    videoEnabled: true,
    onToggleVideo: () => {},
    onLeave: () => {},
  }

  it('renders the mute, camera, and leave controls', () => {
    const markup = html(createElement(VideoCallControls, base))
    expect(markup).toContain('Leave')
    // mute + camera + leave = 3 buttons
    expect(markup.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the screen-share button only when onToggleScreenShare is supplied', () => {
    const withShare = html(
      createElement(VideoCallControls, { ...base, onToggleScreenShare: () => {} }),
    )
    expect(withShare.match(/data-button=""/g) ?? []).toHaveLength(4)
    const without = html(createElement(VideoCallControls, base))
    expect(without.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the extraControls slot', () => {
    const markup = html(
      createElement(VideoCallControls, {
        ...base,
        extraControls: createElement('span', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-extra=""')
  })

  it('sets aria-pressed to reflect the muted / camera-off state', () => {
    const muted = html(createElement(VideoCallControls, { ...base, audioEnabled: false }))
    expect(muted).toContain('aria-pressed="true"')
    const live = html(createElement(VideoCallControls, base))
    expect(live).toContain('aria-pressed="false"')
  })

  it('forwards className', () => {
    const markup = html(createElement(VideoCallControls, { ...base, className: 'vcc-cls' }))
    expect(markup).toContain('vcc-cls')
  })
})

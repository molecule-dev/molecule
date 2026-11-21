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

// The bonded i18n provider's `t`: by default it returns the call's own English
// fallback (the suite asserts the rendered English); a test swaps in a marker
// implementation to prove a string really goes through `t`, key and all.
const i18n = vi.hoisted(() => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: i18n.t }),
}))

/**
 * Runs `assert` with `t` replaced by a marker implementation that renders each
 * key as `«key»`, then restores the English fallback implementation.
 *
 * @param assert - The assertions to run.
 */
const withMarkedTranslations = (assert: () => void): void => {
  const original = i18n.t
  i18n.t = (key: string) => `«${key}»`
  try {
    assert()
  } finally {
    i18n.t = original
  }
}

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

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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

  it('renders the muted indicator label through t', () => {
    withMarkedTranslations(() => {
      const markup = html(createElement(ParticipantTile, { name: 'A', audioEnabled: false }))
      expect(markup).toContain('aria-label="«call.aria.muted»"')
    })
  })

  it('renders the hand-raised indicator label through t', () => {
    withMarkedTranslations(() => {
      const markup = html(createElement(ParticipantTile, { name: 'A', handRaised: true }))
      expect(markup).toContain('aria-label="«call.aria.handRaised»"')
    })
  })

  it('renders the local suffix through t', () => {
    withMarkedTranslations(() => {
      const markup = html(createElement(ParticipantTile, { name: 'Alice', isLocal: true }))
      expect(markup).toContain('«call.label.you»')
    })
  })

  it('applies the success-tone speaking ring only when speaking is set', () => {
    const speaking = html(createElement(ParticipantTile, { name: 'A', speaking: true }))
    expect(speaking).toContain('outline:3px solid currentColor')
    expect(speaking).toContain('textTone')
    const quiet = html(createElement(ParticipantTile, { name: 'A' }))
    expect(quiet).not.toContain('outline:3px')
    expect(quiet).not.toContain('textTone')
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

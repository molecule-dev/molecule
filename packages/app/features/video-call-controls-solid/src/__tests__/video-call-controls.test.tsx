// @vitest-environment jsdom
/**
 * Unit tests for the Solid video-call controls — a port of
 * `@molecule/app-video-call-controls-react/src/__tests__/video-call-controls.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The Button mock renders the marker attribute and forwards `aria-pressed`,
// the same observable contract the React suite's Button mock has.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (await import('./mock-button.jsx')).MockButton,
}))

const { ParticipantTile } = await import('../ParticipantTile.jsx')
const { VideoCallControls } = await import('../VideoCallControls.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and returns the markup it
 * produced.
 *
 * @param view - The element to render.
 * @returns The rendered markup.
 */
const html = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('ParticipantTile', () => {
  it('renders the participant name', () => {
    const markup = html(() => <ParticipantTile name="Alice" />)
    expect(markup).toContain('Alice')
  })

  it('appends " (you)" when isLocal is true', () => {
    const local = html(() => <ParticipantTile name="Alice" isLocal />)
    expect(local).toContain('(you)')
    const remote = html(() => <ParticipantTile name="Alice" />)
    expect(remote).not.toContain('(you)')
  })

  it('renders the videoSlot, falling back to avatarSlot when video is absent', () => {
    const withVideo = html(() => (
      <ParticipantTile
        name="A"
        videoSlot={<video data-video="" />}
        avatarSlot={<img data-avatar="" />}
      />
    ))
    expect(withVideo).toContain('data-video=""')
    expect(withVideo).not.toContain('data-avatar')
    const withAvatar = html(() => <ParticipantTile name="A" avatarSlot={<img data-avatar="" />} />)
    expect(withAvatar).toContain('data-avatar=""')
  })

  it('shows the muted indicator only when audio is disabled', () => {
    expect(html(() => <ParticipantTile name="A" audioEnabled={false} />)).toContain(
      'aria-label="Muted"',
    )
    expect(html(() => <ParticipantTile name="A" />)).not.toContain('aria-label="Muted"')
  })

  it('shows the hand-raised indicator only when handRaised is set', () => {
    expect(html(() => <ParticipantTile name="A" handRaised />)).toContain(
      'aria-label="Hand raised"',
    )
    expect(html(() => <ParticipantTile name="A" />)).not.toContain('aria-label="Hand raised"')
  })

  it('renders the muted indicator label through t', () => {
    withMarkedTranslations(() => {
      expect(html(() => <ParticipantTile name="A" audioEnabled={false} />)).toContain(
        'aria-label="«call.aria.muted»"',
      )
    })
  })

  it('renders the hand-raised indicator label through t', () => {
    withMarkedTranslations(() => {
      expect(html(() => <ParticipantTile name="A" handRaised />)).toContain(
        'aria-label="«call.aria.handRaised»"',
      )
    })
  })

  it('renders the local suffix through t', () => {
    withMarkedTranslations(() => {
      expect(html(() => <ParticipantTile name="Alice" isLocal />)).toContain('«call.label.you»')
    })
  })

  it('applies the success-tone speaking ring only when speaking is set', () => {
    const speaking = html(() => <ParticipantTile name="A" speaking />)
    expect(speaking).toMatch(/outline:\s*3px solid currentcolor/i)
    expect(speaking).toContain('textTone')
    const quiet = html(() => <ParticipantTile name="A" />)
    expect(quiet).not.toMatch(/outline:\s*3px/)
    expect(quiet).not.toContain('textTone')
  })

  it('forwards className', () => {
    const markup = html(() => <ParticipantTile name="A" className="tile-cls" />)
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
    const markup = html(() => <VideoCallControls {...base} />)
    expect(markup).toContain('Leave')
    // mute + camera + leave = 3 buttons
    expect(markup.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the screen-share button only when onToggleScreenShare is supplied', () => {
    const withShare = html(() => <VideoCallControls {...base} onToggleScreenShare={() => {}} />)
    expect(withShare.match(/data-button=""/g) ?? []).toHaveLength(4)
    const without = html(() => <VideoCallControls {...base} />)
    expect(without.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the extraControls slot', () => {
    const markup = html(() => (
      <VideoCallControls {...base} extraControls={<span data-extra="" />} />
    ))
    expect(markup).toContain('data-extra=""')
  })

  it('sets aria-pressed to reflect the muted / camera-off state', () => {
    const muted = html(() => <VideoCallControls {...base} audioEnabled={false} />)
    expect(muted).toContain('aria-pressed="true"')
    const live = html(() => <VideoCallControls {...base} />)
    expect(live).toContain('aria-pressed="false"')
  })

  it('forwards className', () => {
    const markup = html(() => <VideoCallControls {...base} className="vcc-cls" />)
    expect(markup).toContain('vcc-cls')
  })
})

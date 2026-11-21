// @vitest-environment jsdom
/**
 * Unit tests of the Angular video-call controls — the port of
 * `@molecule/app-video-call-controls-react`'s own suite. The React suite
 * renders the components with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `page`),
// so tests can assert which cm.* class was applied without a real bond.
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({ t: i18n.t }),
}))

// Button renders the marker attribute and projects its content; `aria-pressed`
// arrives as a plain attribute on the host button, the same observable contract
// the React suite's Button mock has.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: [
        'variant',
        'color',
        'size',
        'loading',
        'loadingText',
        'fullWidth',
        'className',
        'style',
        'testId',
        'disabled',
        'type',
      ],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button color. */
        color?: string
        /** Button size. */
        size?: string
        /** Busy state. */
        loading?: boolean
        /** Busy label. */
        loadingText?: string
        /** Full-width flag. */
        fullWidth?: boolean
        /** Extra classes. */
        className?: string
        /** Inline style. */
        style?: Record<string, unknown>
        /** `data-testid`. */
        testId?: string
        /** Disabled flag. */
        disabled?: boolean
        /** Type attribute. */
        type?: string
      },
    ),
  }
})

const { ParticipantTile } = await import('../participant-tile.component.js')
const { VideoCallControls } = await import('../video-call-controls.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts a {@link ParticipantTile} with the given props and projected content.
 *
 * @param props - The component props.
 * @param content - Projected content (the `[slot=…]` elements).
 * @returns The rendered markup.
 */
const tile = async (props: Record<string, unknown>, content = ''): Promise<string> => {
  const m = await mount(
    `<div mol-participant-tile [name]="p['name']" [audioEnabled]="p['audioEnabled']" [handRaised]="p['handRaised']" [speaking]="p['speaking']" [isLocal]="p['isLocal']" [className]="p['className']">${content}</div>`,
    ParticipantTile as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m.host.innerHTML
}

/**
 * Mounts a {@link VideoCallControls} with the given props and projected content.
 *
 * @param props - The component props.
 * @param content - Projected content (the extra controls).
 * @returns The rendered markup.
 */
const bar = async (props: Record<string, unknown>, content = ''): Promise<string> => {
  const m = await mount(
    `<div mol-video-call-controls [audioEnabled]="p['audioEnabled']" [videoEnabled]="p['videoEnabled']" [screenSharing]="p['screenSharing']" [onToggleAudio]="p['onToggleAudio']" [onToggleVideo]="p['onToggleVideo']" [onToggleScreenShare]="p['onToggleScreenShare']" [onLeave]="p['onLeave']" [className]="p['className']">${content}</div>`,
    VideoCallControls as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m.host.innerHTML
}

describe('ParticipantTile', () => {
  it('renders the participant name', async () => {
    const markup = await tile({ name: 'Alice' })
    expect(markup).toContain('Alice')
  })

  it('appends " (you)" when isLocal is true', async () => {
    const local = await tile({ name: 'Alice', isLocal: true })
    expect(local).toContain('(you)')
    const remote = await tile({ name: 'Alice' })
    expect(remote).not.toContain('(you)')
  })

  it('renders the videoSlot, falling back to avatarSlot when video is absent', async () => {
    const withVideo = await tile(
      { name: 'A' },
      '<video slot="videoSlot" data-video></video><img slot="avatarSlot" data-avatar>',
    )
    expect(withVideo).toContain('data-video=""')
    expect(withVideo).not.toContain('data-avatar')
    const withAvatar = await tile({ name: 'A' }, '<img slot="avatarSlot" data-avatar>')
    expect(withAvatar).toContain('data-avatar=""')
  })

  it('shows the muted indicator only when audio is disabled', async () => {
    expect(await tile({ name: 'A', audioEnabled: false })).toContain('aria-label="Muted"')
    expect(await tile({ name: 'A' })).not.toContain('aria-label="Muted"')
  })

  it('shows the hand-raised indicator only when handRaised is set', async () => {
    expect(await tile({ name: 'A', handRaised: true })).toContain('aria-label="Hand raised"')
    expect(await tile({ name: 'A' })).not.toContain('aria-label="Hand raised"')
  })

  it('renders the muted indicator label through t', async () => {
    const original = i18n.t
    i18n.t = (key: string) => `«${key}»`
    try {
      expect(await tile({ name: 'A', audioEnabled: false })).toContain(
        'aria-label="«call.aria.muted»"',
      )
    } finally {
      i18n.t = original
    }
  })

  it('renders the hand-raised indicator label through t', async () => {
    const original = i18n.t
    i18n.t = (key: string) => `«${key}»`
    try {
      expect(await tile({ name: 'A', handRaised: true })).toContain(
        'aria-label="«call.aria.handRaised»"',
      )
    } finally {
      i18n.t = original
    }
  })

  it('renders the local suffix through t', async () => {
    const original = i18n.t
    i18n.t = (key: string) => `«${key}»`
    try {
      expect(await tile({ name: 'Alice', isLocal: true })).toContain('«call.label.you»')
    } finally {
      i18n.t = original
    }
  })

  it('applies the success-tone speaking ring only when speaking is set', async () => {
    expect(await tile({ name: 'A', speaking: true })).toMatch(/outline:\s*3px solid currentColor/)
    expect(await tile({ name: 'A', speaking: true })).toContain('textTone')
    expect(await tile({ name: 'A' })).not.toMatch(/outline:\s*3px/)
    expect(await tile({ name: 'A' })).not.toContain('textTone')
  })

  it('forwards className', async () => {
    const markup = await tile({ name: 'A', className: 'tile-cls' })
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

  it('renders the mute, camera, and leave controls', async () => {
    const markup = await bar(base)
    expect(markup).toContain('Leave')
    // mute + camera + leave = 3 buttons
    expect(markup.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the screen-share button only when onToggleScreenShare is supplied', async () => {
    const withShare = await bar({ ...base, onToggleScreenShare: () => {} })
    expect(withShare.match(/data-button=""/g) ?? []).toHaveLength(4)
    const without = await bar(base)
    expect(without.match(/data-button=""/g) ?? []).toHaveLength(3)
  })

  it('renders the extraControls slot', async () => {
    const markup = await bar(base, '<span slot="extraControls" data-extra></span>')
    expect(markup).toContain('data-extra=""')
  })

  it('sets aria-pressed to reflect the muted / camera-off state', async () => {
    const muted = await bar({ ...base, audioEnabled: false })
    expect(muted).toContain('aria-pressed="true"')
    const live = await bar(base)
    expect(live).toContain('aria-pressed="false"')
  })

  it('forwards className', async () => {
    const markup = await bar({ ...base, className: 'vcc-cls' })
    expect(markup).toContain('vcc-cls')
  })
})

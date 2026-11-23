// @vitest-environment jsdom
/**
 * Unit tests of `SocialShareButtons` — the port of
 * `@molecule/app-social-share-buttons-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Flipped on by the literal-key tests: the mock's `t` then answers with the
// key itself, so the test sees exactly which key the component asked for.
const marker = vi.hoisted(() => ({ on: false }))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => {
      if (marker.on) return `[${key}]`
      return opts?.defaultValue ?? key
    },
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element projecting its content.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Default,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size'],
      host: { 'data-button': '', '[attr.type]': 'type' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
        /** The button's `type` attribute. */
        type = 'button'
      },
    ),
  }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { SocialShareButtons } = await import('../social-share-buttons.component.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

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
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
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

/**
 * Mounts `SocialShareButtons` with the given props through the app-style host
 * template and returns the host.
 *
 * @param props - The row's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-social-share-buttons [url]="p['url']" [title]="p['title']" [platforms]="p['platforms']" [size]="p['size']" [className]="p['className']"></div>`,
    SocialShareButtons as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SocialShareButtons', () => {
  it('renders the default platform set (twitter, linkedin, facebook, copy)', async () => {
    const m = await render({ url: 'https://x.test/post' })
    expect(m.host.innerHTML).toContain('twitter.com/intent/tweet')
    expect(m.host.innerHTML).toContain('linkedin.com/sharing')
    expect(m.host.innerHTML).toContain('facebook.com/sharer')
    // the 3 link platforms render as <a>; copy renders as a bare button
    expect(m.host.innerHTML.match(/<a /g) ?? []).toHaveLength(3)
  })

  it('encodes the url into each share link', async () => {
    const m = await render({ url: 'https://x.test/a b' })
    expect(m.host.innerHTML).toContain(encodeURIComponent('https://x.test/a b'))
  })

  it('honours a custom platform list and order', async () => {
    const m = await render({ url: 'https://x.test', platforms: ['reddit', 'email'] })
    expect(m.host.innerHTML).toContain('reddit.com/submit')
    expect(m.host.innerHTML).toContain('mailto:')
    expect(m.host.innerHTML).not.toContain('twitter.com')
  })

  it('renders the copy platform as a button with an aria-label', async () => {
    const m = await render({ url: 'https://x.test', platforms: ['copy'] })
    expect(m.host.innerHTML).toContain('<button')
    expect(m.host.innerHTML).toContain('aria-label="Copy"')
  })

  it('forwards className', async () => {
    const m = await render({ url: 'https://x.test', className: 'ssb-cls' })
    expect(m.host.innerHTML).toContain('ssb-cls')
  })

  it('copies the url when the copy button is clicked', async () => {
    const m = await render({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = m.host.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // the copy promise settles, then the copied signal re-renders on a tick
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await m.setProps({})
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).toContain('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const m = await render({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = m.host.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await m.setProps({})
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).not.toContain('Copied!')
    expect(button.textContent).toContain('⧉')
  })
})

describe('SocialShareButtons platform label keys', () => {
  /** The English name each platform's label falls back to (the bond's en.ts text). */
  const ENGLISH: Record<string, string> = {
    twitter: 'Twitter',
    x: 'X',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    reddit: 'Reddit',
    email: 'Email',
    copy: 'Copy',
  }

  /** Every platform the component's union can take, in its order. */
  const PLATFORMS = ['twitter', 'x', 'linkedin', 'facebook', 'reddit', 'email', 'copy'] as const

  it('resolves every platform label through its literal key', async () => {
    // One literal `share.<platform>` key per platform: the rendered aria-label
    // is the key the mock answered with, so a marker here proves the component
    // asked for that exact literal key (a runtime-built key would miss).
    marker.on = true
    try {
      const m = await render({ url: 'https://x.test', platforms: [...PLATFORMS] })
      for (const p of PLATFORMS) {
        expect(m.host.innerHTML).toContain(`aria-label="[share.${p}]"`)
      }
    } finally {
      marker.on = false
    }
  })

  it('falls back to the English platform name when no translation is loaded', async () => {
    const m = await render({ url: 'https://x.test', platforms: [...PLATFORMS] })
    // the inline English default is the platform's name — the bond's en.ts text
    for (const p of PLATFORMS) {
      expect(m.host.innerHTML).toContain(`aria-label="${ENGLISH[p]}"`)
    }
  })
})

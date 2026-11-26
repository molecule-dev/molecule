// @vitest-environment jsdom
/**
 * Unit tests of `AudioPlayer` — the port of
 * `@molecule/app-audio-player-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * Media-element effects (timeupdate, play/pause) don't fire under a static
 * render, so these tests cover the initial static chrome — as React's do.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-angular')
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

// The `data-button` marker the React tests mock `@molecule/app-ui-react` with:
// a button carrying its children. Everything else in the UI package (the
// slot reconciliation helpers) stays real.
vi.mock('@molecule/app-ui-angular', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-ui-angular')
  return {
    ...actual,
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size'],
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
      },
    ),
  }
})

const { AudioPlayer } = await import('../audio-player.component.js')

/** A mounted spec host: its rendered markup and a teardown. */
interface Mounted {
  /** The element the spec host rendered into. */
  readonly host: HTMLElement
  /** The component host element's outer markup. */
  markup(): string
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const apps: Array<() => Promise<void>> = []
/** Distinguishes each spec host so Angular generates a distinct component id. */
let specHostCount = 0

afterEach(async () => {
  for (const destroy of apps.splice(0)) await destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts the component through a JIT host template, the way an Angular app
 * would write it.
 *
 * @param projected - Content projected into the component (node props).
 * @param props - The prop values the template binds.
 * @param siblings - Wrap the player in fixed `<i>a</i>` / `<i>b</i>` neighbours.
 * @returns The mounted host.
 */
async function mount(
  projected = '',
  props: Record<string, unknown> = {},
  siblings = false,
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${specHostCount++}`,
    standalone: true,
    imports: [AudioPlayer],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `${siblings ? '<i>a</i>' : ''}<div mol-audio-player [src]="p['src']" [title]="p['title']" [subtitle]="p['subtitle']" [captions]="p['captions']" [captionsLang]="p['captionsLang']" [captionsLabel]="p['captionsLabel']" [defaultMuted]="p['defaultMuted']" [autoPlay]="p['autoPlay']" [className]="p['className']">${projected}</div>${siblings ? '<i>b</i>' : ''}`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  apps.push(async () => {
    appRef.destroy()
    host.remove()
  })
  return {
    host,
    markup: () => host.innerHTML,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => undefined,
  }
}

describe('AudioPlayer', () => {
  it('renders an <audio> element carrying the src', async () => {
    const markup = (await mount('', { src: 'track.mp3' })).markup()
    expect(markup).toContain('<audio')
    expect(markup).toContain('src="track.mp3"')
  })

  it('renders the title and subtitle when present and omits the header otherwise', async () => {
    const withHeader = (
      await mount('', { src: 's', title: 'Episode 1', subtitle: 'My Podcast' })
    ).markup()
    expect(withHeader).toContain('Episode 1')
    expect(withHeader).toContain('My Podcast')
    const without = (await mount('', { src: 's' })).markup()
    expect(without).not.toContain('<header')
  })

  it('renders the visualizer slot', async () => {
    const markup = (
      await mount(
        '<ng-container ngProjectAs="[slot=visualizer]"><canvas data-viz></canvas></ng-container>',
        { src: 's' },
      )
    ).markup()
    expect(markup).toContain('data-viz')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of the visualizer slot', async () => {
    const m = await mount(`@for (x of p['xs']; track x) {<b slot="visualizer">{{ x }}</b>}`, {
      src: 's',
      xs: ['a', 'c'],
    })
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(shown()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(shown()).toEqual(['a', 'c'])
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', async () => {
    const markup = (await mount('', { src: 's' })).markup()
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', async () => {
    const markup = (await mount('', { src: 's' })).markup()
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('shows the unmuted glyph by default and the muted glyph when defaultMuted', async () => {
    expect((await mount('', { src: 's' })).markup()).toContain('🔊')
    expect((await mount('', { src: 's', defaultMuted: true })).markup()).toContain('🔇')
  })

  it('gives the play/pause control an accessible name and data-mol-id, and hides the glyph', async () => {
    const markup = (await mount('', { src: 's' })).markup()
    expect(markup).toContain('data-mol-id="audio-player-toggle"')
    // Idle → the toggle plays, so its accessible name is "Play".
    expect(markup).toContain('aria-label="Play"')
    // The emoji glyph is decorative once the button is labelled.
    expect(markup).toContain('aria-hidden="true"')
  })

  it('gives the mute control an accessible name reflecting state + a data-mol-id', async () => {
    const unmuted = (await mount('', { src: 's' })).markup()
    expect(unmuted).toContain('data-mol-id="audio-player-mute"')
    expect(unmuted).toContain('aria-label="Mute"')
    const muted = (await mount('', { src: 's', defaultMuted: true })).markup()
    expect(muted).toContain('aria-label="Unmute"')
  })

  it('gives the seek control a data-mol-id alongside its aria-label', async () => {
    const markup = (await mount('', { src: 's' })).markup()
    expect(markup).toContain('data-mol-id="audio-player-seek"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('forwards className', async () => {
    const markup = (await mount('', { src: 's', className: 'ap-cls' })).markup()
    expect(markup).toContain('ap-cls')
  })

  it('renders a captions track on the audio element', async () => {
    const markup = (
      await mount('', {
        src: 's',
        captions: 'captions.vtt',
        captionsLang: 'en',
        captionsLabel: 'English',
      })
    ).markup()
    expect(markup).toContain('<track')
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('src="captions.vtt"')
    expect(markup).toContain('srclang="en"')
    expect(markup).toContain('label="English"')
  })

  it('labels the captions track through i18n when captionsLabel is absent', async () => {
    const markup = (await mount('', { src: 's' })).markup()
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('label="Captions"')
  })

  it('shows a polite caption line only when a captions file is given', async () => {
    const withCaptions = (await mount('', { src: 's', captions: 'c.vtt' })).markup()
    expect(withCaptions).toMatch(/<p aria-live="polite" data-mol-id="audio-player-captions"/)
    const without = (await mount('', { src: 's' })).markup()
    expect(without).not.toContain('audio-player-captions')
  })

  it('shows and removes the title wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(`@if (p['on']) {<span slot="title" data-title>Episode</span>}`, {
      src: 's',
      on: false,
    })
    const title = (): HTMLElement | null => m.host.querySelector('[data-title]')
    // No title or subtitle: React renders no header.
    expect(title()).toBeNull()
    expect(m.host.querySelector('header')).toBeNull()
    await m.setProps({ on: true })
    // The title arrives: the header and its span render in the same pass.
    expect(title()).not.toBeNull()
    expect(title()?.isConnected).toBe(true)
    expect(m.host.querySelector('header')).not.toBeNull()
    await m.setProps({ on: false })
    expect(title()).toBeNull()
    expect(m.host.querySelector('header')).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `@if (p['on']) {<b slot="visualizer" data-viz>viz</b>}`,
      { src: 's', on: true },
      true,
    )
    // The consumer's children are exactly React's: the two neighbours and the
    // player (its root, so the host element itself), with no extra host or capture.
    const shape = (): string =>
      Array.from(m.host.childNodes)
        .filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''),
        )
        .map((n) => (n.nodeType === 1 ? (n as Element).tagName : '#text'))
        .join(',')
    const viz = (): HTMLElement | null => m.host.querySelector('[data-viz]')
    expect(shape()).toBe('I,DIV,I')
    // The projected visualizer renders bare in the player, no capture span around it.
    expect(viz()?.parentElement?.tagName).toBe('DIV')
    await m.setProps({ on: false })
    expect(shape()).toBe('I,DIV,I')
    expect(viz()).toBeNull()
  })
})

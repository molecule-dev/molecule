// @vitest-environment jsdom
/**
 * Unit tests of `VideoPlayer` — the port of
 * `@molecule/app-video-player-react`'s own suite. The React suite renders the
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
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
// style helpers) stays real.
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

const { VideoPlayer } = await import('../video-player.component.js')

/** A mounted spec host: its rendered markup and a teardown. */
interface Mounted {
  /** The host element's inner markup. */
  markup(): string
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
 * @param props - The prop values the template binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${specHostCount++}`,
    standalone: true,
    imports: [VideoPlayer],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-video-player [src]="p['src']" [poster]="p['poster']" [captionsSrc]="p['captionsSrc']" [captionsLang]="p['captionsLang']" [captionsLabel]="p['captionsLabel']" [autoPlay]="p['autoPlay']" [defaultMuted]="p['defaultMuted']" [className]="p['className']"></div>`,
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
  apps.push(async () => {
    appRef.destroy()
    host.remove()
  })
  return { markup: () => host.innerHTML, destroy: async () => undefined }
}

describe('VideoPlayer', () => {
  it('renders a <video> with the src and poster', async () => {
    const markup = (await mount({ src: 'clip.mp4', poster: 'poster.jpg' })).markup()
    expect(markup).toContain('<video')
    expect(markup).toContain('src="clip.mp4"')
    expect(markup).toContain('poster="poster.jpg"')
  })

  it('renders a captions track when captionsSrc is supplied', async () => {
    const markup = (await mount({ src: 's', captionsSrc: 'caps.vtt', captionsLang: 'fr' })).markup()
    expect(markup).toContain('<track')
    expect(markup).toContain('src="caps.vtt"')
    expect(markup).toContain('srclang="fr"')
    expect(markup).toContain('label="Captions"')
  })

  it('renders a captions track without a captionsSrc, named through i18n', async () => {
    const markup = (await mount({ src: 's' })).markup()
    expect(markup).toContain('<track')
    expect(markup).toContain('kind="captions"')
    expect(markup).toContain('srclang="en"')
    expect(markup).toContain('label="Captions"')
  })

  it('names the captions track through captionsLabel', async () => {
    const markup = (
      await mount({ src: 's', captionsSrc: 'caps.vtt', captionsLabel: 'English' })
    ).markup()
    expect(markup).toContain('label="English"')
  })

  it('shows the play glyph and a 0:00 / 0:00 time display initially', async () => {
    const markup = (await mount({ src: 's' })).markup()
    expect(markup).toContain('▶')
    expect(markup).toContain('0:00 / 0:00')
  })

  it('renders the seek range input with its aria-label', async () => {
    const markup = (await mount({ src: 's' })).markup()
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Seek"')
  })

  it('renders the mute and fullscreen control buttons', async () => {
    const markup = (await mount({ src: 's' })).markup()
    expect(markup).toContain('aria-label="Mute"')
    expect(markup).toContain('aria-label="Fullscreen"')
    expect(markup).toContain('🔊')
  })

  it('shows the muted glyph when defaultMuted is set', async () => {
    const markup = (await mount({ src: 's', defaultMuted: true })).markup()
    expect(markup).toContain('🔇')
  })

  it('forwards className', async () => {
    const markup = (await mount({ src: 's', className: 'vp-cls' })).markup()
    expect(markup).toContain('vp-cls')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests of `TransportBar` — the port of
 * `@molecule/app-feature-transport-bar-react`'s own suite. The React suite
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The i18n mock the React tests install through `I18nProvider`: `t` resolves
// to the inline English default.
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

const { TransportBar } = await import('../transport-bar.component.js')

/** A mounted spec host: its rendered markup and a teardown. */
interface Mounted {
  /** The component host element's outer markup. */
  markup(): string
  /** The host element (the root `<div mol-transport-bar>`). */
  host(): HTMLElement
  /** Merges props and re-renders, React's `rerender`. */
  update(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The apps and hosts mounted in one test, torn down in `afterEach`. */
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
 * @param options - The mount's props, projected content and template usage.
 * @param options.props - The prop values the template binds.
 * @param options.projected - Content projected into the component (node props).
 * @param options.timeTemplate - Bind a `<ng-template>` as the `timeDisplay` input.
 * @returns The mounted host.
 */
async function mount(
  options: {
    props?: Record<string, unknown>
    projected?: string
    timeTemplate?: boolean
  } = {},
): Promise<Mounted> {
  const props = options.props ?? {}
  const projected = options.projected ?? ''
  const timeBinding = options.timeTemplate ? 'tpl' : `p['timeDisplay']`
  const timeTemplate = options.timeTemplate
    ? '<ng-template #tpl><span data-mol-id="custom-time">0:00 / 1:23</span></ng-template>'
    : ''
  const Host = Component({
    selector: `mol-transport-spec-host-${specHostCount++}`,
    standalone: true,
    imports: [TransportBar],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-transport-bar [isPlaying]="p['isPlaying']" [isRecording]="p['isRecording']" [canStop]="p['canStop']" [canSkip]="p['canSkip']" [loop]="p['loop']" [onPlayToggle]="p['onPlayToggle']" [onStop]="p['onStop']" [onSkipBack]="p['onSkipBack']" [onSkipForward]="p['onSkipForward']" [onRecordToggle]="p['onRecordToggle']" [onLoopToggle]="p['onLoopToggle']" [timeDisplay]="${timeBinding}" [className]="p['className']">${projected}</div>${timeTemplate}`,
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
  const wrapper = ref.location.nativeElement as HTMLElement
  document.body.appendChild(wrapper)
  appRef.attachView(ref.hostView)
  appRef.tick()
  apps.push(async () => {
    appRef.destroy()
    wrapper.remove()
  })
  return {
    markup: () => wrapper.innerHTML,
    host: () => wrapper.querySelector('div[mol-transport-bar]') as HTMLElement,
    update: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => undefined,
  }
}

/**
 * Reads one element of the bar by its `data-mol-id`.
 *
 * @param mounted - The mounted host.
 * @param id - The element's `data-mol-id`.
 * @returns The element, or null when React renders none.
 */
const byMolId = (mounted: Mounted, id: string): HTMLElement | null =>
  mounted.host().querySelector(`[data-mol-id="${id}"]`)

describe('TransportBar', () => {
  it('renders a toolbar region with translated aria-label', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(mounted.host().getAttribute('role')).toBe('toolbar')
    expect(mounted.host().getAttribute('aria-label')).toBe('Playback transport controls')
  })

  it('always renders play-toggle and stop buttons', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(byMolId(mounted, 'transport-bar-play-toggle')).not.toBeNull()
    expect(byMolId(mounted, 'transport-bar-stop')).not.toBeNull()
  })

  it('shows play label + paused state when isPlaying is false', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    const btn = byMolId(mounted, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Play')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('paused')
  })

  it('shows pause label + playing state when isPlaying is true', async () => {
    const mounted = await mount({
      props: { isPlaying: true, onPlayToggle: () => {}, onStop: () => {} },
    })
    const btn = byMolId(mounted, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Pause')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('playing')
  })

  it('fires onPlayToggle when play button is clicked', async () => {
    const onPlayToggle = vi.fn()
    const mounted = await mount({ props: { isPlaying: false, onPlayToggle, onStop: () => {} } })
    byMolId(mounted, 'transport-bar-play-toggle')!.click()
    expect(onPlayToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onStop when stop button is clicked', async () => {
    const onStop = vi.fn()
    const mounted = await mount({ props: { isPlaying: false, onPlayToggle: () => {}, onStop } })
    byMolId(mounted, 'transport-bar-stop')!.click()
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop when canStop is false', async () => {
    const mounted = await mount({
      props: { isPlaying: false, canStop: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    const stop = byMolId(mounted, 'transport-bar-stop') as HTMLButtonElement
    expect(stop.disabled).toBe(true)
  })

  it('omits skip buttons when no skip handlers are provided', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(byMolId(mounted, 'transport-bar-skip-back')).toBeNull()
    expect(byMolId(mounted, 'transport-bar-skip-forward')).toBeNull()
  })

  it('renders skip buttons when handlers are provided and fires them on click', async () => {
    const onSkipBack = vi.fn()
    const onSkipForward = vi.fn()
    const mounted = await mount({
      props: {
        isPlaying: false,
        onPlayToggle: () => {},
        onStop: () => {},
        onSkipBack,
        onSkipForward,
      },
    })
    const back = byMolId(mounted, 'transport-bar-skip-back')!
    const fwd = byMolId(mounted, 'transport-bar-skip-forward')!
    expect(back.getAttribute('aria-label')).toBe('Skip backward')
    expect(fwd.getAttribute('aria-label')).toBe('Skip forward')
    back.click()
    fwd.click()
    expect(onSkipBack).toHaveBeenCalledTimes(1)
    expect(onSkipForward).toHaveBeenCalledTimes(1)
  })

  it('disables skip buttons when canSkip is false', async () => {
    const mounted = await mount({
      props: {
        isPlaying: false,
        canSkip: false,
        onPlayToggle: () => {},
        onStop: () => {},
        onSkipBack: () => {},
        onSkipForward: () => {},
      },
    })
    const back = byMolId(mounted, 'transport-bar-skip-back') as HTMLButtonElement
    const fwd = byMolId(mounted, 'transport-bar-skip-forward') as HTMLButtonElement
    expect(back.disabled).toBe(true)
    expect(fwd.disabled).toBe(true)
  })

  it('renders the record button only when onRecordToggle is provided', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(byMolId(mounted, 'transport-bar-record-toggle')).toBeNull()
    mounted.update({ onRecordToggle: () => {} })
    expect(byMolId(mounted, 'transport-bar-record-toggle')).not.toBeNull()
  })

  it('toggles record button label + state based on isRecording', async () => {
    const mounted = await mount({
      props: {
        isPlaying: false,
        isRecording: false,
        onPlayToggle: () => {},
        onStop: () => {},
        onRecordToggle: () => {},
      },
    })
    let btn = byMolId(mounted, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Record')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('idle')

    mounted.update({ isRecording: true })
    btn = byMolId(mounted, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Stop recording')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('recording')
  })

  it('renders the loop button only when onLoopToggle is provided', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(byMolId(mounted, 'transport-bar-loop-toggle')).toBeNull()
    mounted.update({ onLoopToggle: () => {} })
    expect(byMolId(mounted, 'transport-bar-loop-toggle')).not.toBeNull()
  })

  it('toggles loop button label + state based on loop', async () => {
    const mounted = await mount({
      props: {
        isPlaying: false,
        loop: false,
        onPlayToggle: () => {},
        onStop: () => {},
        onLoopToggle: () => {},
      },
    })
    let btn = byMolId(mounted, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Enable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('off')

    mounted.update({ loop: true })
    btn = byMolId(mounted, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Disable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('on')
  })

  it('fires onRecordToggle and onLoopToggle on click', async () => {
    const onRecordToggle = vi.fn()
    const onLoopToggle = vi.fn()
    const mounted = await mount({
      props: {
        isPlaying: false,
        onPlayToggle: () => {},
        onStop: () => {},
        onRecordToggle,
        onLoopToggle,
      },
    })
    byMolId(mounted, 'transport-bar-record-toggle')!.click()
    byMolId(mounted, 'transport-bar-loop-toggle')!.click()
    expect(onRecordToggle).toHaveBeenCalledTimes(1)
    expect(onLoopToggle).toHaveBeenCalledTimes(1)
  })

  it('keeps a consumer list in order when an item is inserted in the middle of timeDisplay', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {}, xs: [1, 3] },
      projected: "@for (x of p['xs']; track x) {<b>{{ x }}</b>}",
    })
    const slot = byMolId(mounted, 'transport-bar-time-display')!
    const texts = (): string[] =>
      Array.from(slot.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    mounted.update({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    mounted.update({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders the time-display slot via the timeDisplay prop', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      timeTemplate: true,
    })
    const slot = byMolId(mounted, 'transport-bar-time-display')
    expect(slot).not.toBeNull()
    expect(slot?.querySelector('[data-mol-id="custom-time"]')?.textContent).toBe('0:00 / 1:23')
  })

  it('renders children as the time-display slot when timeDisplay is omitted', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      projected: '<span data-mol-id="child-time">0:42</span>',
    })
    const slot = byMolId(mounted, 'transport-bar-time-display')
    expect(slot?.querySelector('[data-mol-id="child-time"]')?.textContent).toBe('0:42')
  })

  it('prefers timeDisplay over children when both are supplied', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      projected: '<span data-mol-id="child-time">child</span>',
      timeTemplate: true,
    })
    const slot = byMolId(mounted, 'transport-bar-time-display')!
    expect(slot.querySelector('[data-mol-id="custom-time"]')).not.toBeNull()
    expect(slot.querySelector('[data-mol-id="child-time"]')).toBeNull()
  })

  it('omits the time-display slot when nothing is provided', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
    })
    expect(byMolId(mounted, 'transport-bar-time-display')).toBeNull()
  })

  it('shows and removes the timeDisplay wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const mounted = await mount({
      props: { isPlaying: false, onPlayToggle: () => {}, onStop: () => {}, on: false },
      projected: `@if (p['on']) {<span slot="timeDisplay" data-time>0:00</span>}`,
    })
    expect(byMolId(mounted, 'transport-bar-time-display')).toBeNull()
    mounted.update({ on: true })
    const time = byMolId(mounted, 'transport-bar-time-display')
    const content = mounted.host().querySelector('[data-time]')
    expect(time).not.toBeNull()
    expect(content).not.toBeNull()
    // React renders `{timeDisplay ?? children}` bare inside the wrapper.
    expect(content?.parentElement).toBe(time)
    mounted.update({ on: false })
    expect(byMolId(mounted, 'transport-bar-time-display')).toBeNull()
    expect(mounted.host().querySelector('[data-time]')).toBeNull()
  })
})

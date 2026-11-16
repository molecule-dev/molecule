// @vitest-environment jsdom
/**
 * Unit tests of the Angular `EmptyState` and `CtaCard` — the port of
 * `@molecule/app-empty-state-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
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
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond.
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

const { CtaCard } = await import('../cta-card.component.js')
const { EmptyState } = await import('../empty-state.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Mounted spec hosts so far: Angular derives a component id from the definition. */
let hostCount = 0

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
    host: { 'data-spec-host': String(++hostCount) },
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
  await appRef.whenStable()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      await appRef.whenStable()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('EmptyState', () => {
  const emptyState = (content = ''): string =>
    `<section mol-empty-state [title]="p['title']" [description]="p['description']" [icon]="p['icon']" [action]="p['action']" [dataMolId]="p['dataMolId']" [className]="p['className']" [iconWrapperClassName]="p['iconWrapperClassName']">${content}</section>`

  it('renders the title inside an <h3>', async () => {
    const m = await render(emptyState(), EmptyState, { title: 'No comments yet' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', async () => {
    const withIcon = await render(emptyState('<i slot="icon" data-icon></i>'), EmptyState, {
      title: 'T',
    })
    expect(withIcon.host.innerHTML).toContain('data-icon')
    const without = await render(emptyState(), EmptyState, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', async () => {
    const withDescription = await render(emptyState(), EmptyState, {
      title: 'T',
      description: 'desc-x',
    })
    expect(withDescription.host.innerHTML).toContain('desc-x')
    const without = await render(emptyState(), EmptyState, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('<p')
  })

  it('renders the action node', async () => {
    const m = await render(emptyState('<button slot="action" data-act></button>'), EmptyState, {
      title: 'T',
    })
    expect(m.host.innerHTML).toContain('data-act')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', async () => {
    const m = await render(emptyState('<i slot="icon"></i>'), EmptyState, {
      title: 'T',
      dataMolId: 'empty-x',
      className: 'es-cls',
      iconWrapperClassName: 'icon-cls',
    })
    expect(m.host.innerHTML).toContain('data-mol-id="empty-x"')
    expect(m.host.innerHTML).toContain('es-cls')
    expect(m.host.innerHTML).toContain('icon-cls')
  })
})

describe('CtaCard', () => {
  const ctaCard = (content = ''): string =>
    `<section mol-cta-card [title]="p['title']" [eyebrow]="p['eyebrow']" [description]="p['description']" [action]="p['action']" [media]="p['media']" [layout]="p['layout']" [dataMolId]="p['dataMolId']" [className]="p['className']">${content}</section>`

  it('renders the title inside an <h3>', async () => {
    const m = await render(ctaCard(), CtaCard, { title: 'Connect your bank' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', async () => {
    const withEyebrow = await render(ctaCard(), CtaCard, { title: 'T', eyebrow: 'NEW' })
    expect(withEyebrow.host.innerHTML).toContain('NEW')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', async () => {
    const withDescription = await render(ctaCard(), CtaCard, {
      title: 'T',
      description: 'desc-x',
    })
    expect(withDescription.host.innerHTML).toContain('desc-x')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', async () => {
    const withAction = await render(ctaCard('<button slot="action" data-act></button>'), CtaCard, {
      title: 'T',
    })
    expect(withAction.host.innerHTML).toContain('data-act')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', async () => {
    const withMedia = await render(ctaCard('<img slot="media" data-media />'), CtaCard, {
      title: 'T',
    })
    expect(withMedia.host.innerHTML).toContain('data-media')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(ctaCard(), CtaCard, {
      title: 'T',
      dataMolId: 'cta-x',
      className: 'cta-cls',
    })
    expect(m.host.innerHTML).toContain('data-mol-id="cta-x"')
    expect(m.host.innerHTML).toContain('cta-cls')
  })
})

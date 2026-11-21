// @vitest-environment jsdom
/**
 * Unit tests of `ProgressBar` / `ProgressCard` — the port of
 * `@molecule/app-progress-bar-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

const { ProgressBar } = await import('../progress-bar.component.js')
const { ProgressCard } = await import('../progress-card.component.js')

/** A mounted spec host: its DOM, a change-detection flush, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs another change-detection pass. */
  flush(): void
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
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
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

/** The component's own host element (the outer `div`). */
const componentEl = (host: HTMLElement, selector: string): HTMLElement => {
  const el = host.querySelector(selector)
  if (!el) throw new Error(`no ${selector} host rendered`)
  return el as HTMLElement
}

const mounted: Mounted[] = []

/**
 * Mounts a component and remembers it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

/** The `ProgressBar` host template, binding every input. */
const BAR = `<div mol-progress-bar [value]="p['value']" [max]="p['max']" [label]="p['label']" [valueLabel]="p['valueLabel']" [labelledBy]="p['labelledBy']" [describedBy]="p['describedBy']" [size]="p['size']" [color]="p['color']" [className]="p['className']"></div>`

/** The `ProgressCard` host template, binding the inputs and projecting `projected` content. */
const card = (projected = ''): string =>
  `<div mol-progress-card [title]="p['title']" [description]="p['description']" [value]="p['value']" [max]="p['max']" [valueLabel]="p['valueLabel']" [color]="p['color']" [className]="p['className']">${projected}</div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, {
      value: 50,
      label: 'Storage',
      valueLabel: '50%',
    })
    expect(m.host.innerHTML).toContain('Storage')
    expect(m.host.innerHTML).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 50 })
    expect(m.host.innerHTML).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 30, max: 60 })
    expect(m.host.innerHTML).toContain('role="progressbar"')
    expect(m.host.innerHTML).toContain('aria-valuenow="30"')
    expect(m.host.innerHTML).toContain('aria-valuemin="0"')
    expect(m.host.innerHTML).toContain('aria-valuemax="60"')
  })

  it('names the track with the default t() label when no label prop is given', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 50 })
    expect(m.host.innerHTML).toContain('aria-label="Progress"')
    expect(m.host.innerHTML).not.toContain('<span')
  })

  it('names the track with the rendered label via aria-labelledby', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 50, label: 'Storage' })
    const markup = m.host.innerHTML
    const id = /<span[^>]* id="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${id}"`)
    expect(markup).not.toContain('aria-label="Progress"')
  })

  it('lets the labelledBy prop win over the rendered label and the default name', async () => {
    const labelled = await render(BAR, ProgressBar as Type<unknown>, {
      value: 50,
      label: 'Storage',
      labelledBy: 'ext-title',
    })
    expect(labelled.host.innerHTML).toContain('aria-labelledby="ext-title"')
    expect(labelled.host.innerHTML).not.toContain('aria-label="Progress"')
    expect(labelled.host.innerHTML).not.toContain('<span id=')

    const bare = await render(BAR, ProgressBar as Type<unknown>, {
      value: 50,
      labelledBy: 'ext-title',
    })
    expect(bare.host.innerHTML).toContain('aria-labelledby="ext-title"')
    expect(bare.host.innerHTML).not.toContain('aria-label="Progress"')
  })

  it('forwards describedBy as aria-describedby', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, {
      value: 50,
      describedBy: 'ext-desc',
    })
    expect(m.host.innerHTML).toContain('aria-describedby="ext-desc"')
  })

  it('lets a locale bond translate the default accessible name', async () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: { 'progressBar.label': 'Avance' },
        },
      ]),
    )
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 50 })
    expect(m.host.innerHTML).toContain('aria-label="Avance"')
  })

  it('sets the fill width to value/max as a percentage', async () => {
    const full = await render(BAR, ProgressBar as Type<unknown>, { value: 25, max: 100 })
    expect(full.host.innerHTML).toContain('width: 25%')
    const half = await render(BAR, ProgressBar as Type<unknown>, { value: 50, max: 200 })
    expect(half.host.innerHTML).toContain('width: 25%')
  })

  it('clamps the fill width to the 0–100 range', async () => {
    const high = await render(BAR, ProgressBar as Type<unknown>, { value: 500, max: 100 })
    expect(high.host.innerHTML).toContain('width: 100%')
    const low = await render(BAR, ProgressBar as Type<unknown>, { value: -10, max: 100 })
    expect(low.host.innerHTML).toContain('width: 0%')
  })

  it('renders 0% width when max is 0', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 10, max: 0 })
    expect(m.host.innerHTML).toContain('width: 0%')
  })

  it('forwards className', async () => {
    const m = await render(BAR, ProgressBar as Type<unknown>, { value: 10, className: 'pb-cls' })
    expect(componentEl(m.host, '[mol-progress-bar]').getAttribute('class')).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', async () => {
    const m = await render(card(), ProgressCard as Type<unknown>, { title: 'Budget', value: 40 })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Budget')
  })

  it('renders the description and icon when present', async () => {
    const m = await render(
      card('<ng-container ngProjectAs="[slot=icon]"><i slot="icon" data-icon></i></ng-container>'),
      ProgressCard as Type<unknown>,
      { title: 'T', value: 40, description: 'desc-x' },
    )
    expect(m.host.innerHTML).toContain('desc-x')
    expect(m.host.innerHTML).toContain('data-icon')
  })

  it('renders the valueLabel', async () => {
    const m = await render(card(), ProgressCard as Type<unknown>, {
      title: 'T',
      value: 40,
      valueLabel: '40%',
    })
    expect(m.host.innerHTML).toContain('40%')
  })

  it('renders the inner ProgressBar', async () => {
    const m = await render(card(), ProgressCard as Type<unknown>, { title: 'T', value: 40 })
    expect(m.host.innerHTML).toContain('role="progressbar"')
  })

  it('names the bar by the title and describes it by the description', async () => {
    const plain = await render(card(), ProgressCard as Type<unknown>, {
      title: 'Budget',
      value: 40,
    })
    const markup = plain.host.innerHTML
    const titleId = /<h3[^>]* id="([^"]+)"/.exec(markup)?.[1]
    expect(titleId).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${titleId}"`)
    expect(markup).not.toContain('aria-describedby')

    const described = await render(card(), ProgressCard as Type<unknown>, {
      title: 'T',
      value: 40,
      description: '8.5 GB of 10 GB',
    })
    const descMarkup = described.host.innerHTML
    const descId = /<p[^>]* id="([^"]+)"/.exec(descMarkup)?.[1]
    expect(descId).toBeTruthy()
    expect(descMarkup).toContain(`aria-describedby="${descId}"`)
  })

  it('renders the children slot below the bar', async () => {
    const m = await render(card('<div data-extra></div>'), ProgressCard as Type<unknown>, {
      title: 'T',
      value: 40,
    })
    expect(m.host.innerHTML).toContain('data-extra')
  })

  it('forwards className onto the Card', async () => {
    const m = await render(card(), ProgressCard as Type<unknown>, {
      title: 'T',
      value: 40,
      className: 'pc-cls',
    })
    expect(componentEl(m.host, '[mol-progress-card]').getAttribute('class')).toContain('pc-cls')
  })
})

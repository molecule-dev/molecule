// @vitest-environment jsdom
/**
 * Unit tests of `JobListingRow` — the port of
 * `@molecule/app-job-listing-row-react/src/__tests__/job-listing-row.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same mocked tree through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup strings.
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

const { JobListingRow } = await import('../job-listing-row.component.js')

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
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-job-listing-row [title]="p['title']" [company]="p['company']" [location]="p['location']" [type]="p['type']" [salary]="p['salary']" [postedAt]="p['postedAt']" [onClick]="p['onClick']" [className]="p['className']"></div>`,
    JobListingRow as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/** The row's open button: the transparent native button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('button[data-mol-id="job-listing-row-open"]')!

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('JobListingRow', () => {
  it('renders the title inside an <h3>', async () => {
    const m = await render({ title: 'Senior Engineer' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Senior Engineer')
  })

  it('renders company, location, type, salary, and postedAt when present', async () => {
    const m = await render({
      title: 'T',
      company: 'Acme',
      location: 'Remote',
      type: 'Full-time',
      salary: '$120k',
      postedAt: '2d ago',
    })
    expect(m.host.innerHTML).toContain('Acme')
    expect(m.host.innerHTML).toContain('Remote')
    expect(m.host.innerHTML).toContain('Full-time')
    expect(m.host.innerHTML).toContain('$120k')
    expect(m.host.innerHTML).toContain('2d ago')
  })

  it('renders the leading and actions slots', async () => {
    const m = await mount(
      `<div mol-job-listing-row [title]="p['title']"><span slot="leading" data-leading>AC</span><span slot="actions" data-actions></span></div>`,
      JobListingRow as Type<unknown>,
      { title: 'T' },
    )
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-leading=""')
    expect(m.host.innerHTML).toContain('data-actions=""')
  })

  it('renders the tags slot', async () => {
    const m = await mount(
      `<div mol-job-listing-row [title]="p['title']"><span slot="tags" data-tags></span></div>`,
      JobListingRow as Type<unknown>,
      { title: 'T' },
    )
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied', async () => {
    const clickable = await render({ title: 'T', onClick: () => {} })
    expect(clickable.host.innerHTML).toContain('cursorPointer')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('cursorPointer')
  })

  it('without onClick there is no open button', async () => {
    const clickable = await render({ title: 'T', onClick: () => {} })
    expect(clickable.host.innerHTML).toContain('<button type="button"')
    expect(clickable.host.innerHTML).toContain('data-mol-id="job-listing-row-open"')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('<button')
  })

  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'Senior Engineer', onClick })
    openButton(m.host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const m = await mount(
      `<div mol-job-listing-row [title]="p['title']" [onClick]="p['onClick']"><span slot="tags" data-tag>Remote</span><button type="button" slot="actions" data-actions>Apply</button></div>`,
      JobListingRow as Type<unknown>,
      { title: 'T', onClick },
    )
    mounted.push(m)
    m.host.querySelector<HTMLElement>('[data-actions]')!.click()
    m.host.querySelector<HTMLElement>('[data-tag]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const m = await render({ title: 'Senior Frontend Engineer', onClick: () => {} })
    const labelId = openButton(m.host).getAttribute('aria-labelledby') ?? ''
    expect(labelId).not.toBe('')
    const heading = document.getElementById(labelId)
    expect(heading?.tagName.toLowerCase()).toBe('h3')
    expect(heading?.textContent?.trim()).toBe('Senior Frontend Engineer')
  })

  it('forwards className', async () => {
    const m = await render({ title: 'T', className: 'jlr-cls' })
    expect(m.host.querySelector('div[mol-job-listing-row]')?.getAttribute('class')).toContain(
      'jlr-cls',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of tags', async () => {
    const m = await mount(
      `<div mol-job-listing-row [title]="p['title']"><ng-container ngProjectAs="[slot=tags]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></div>`,
      JobListingRow as Type<unknown>,
      { title: 'T', xs: ['a', 'c'] },
    )
    mounted.push(m)
    const labels = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(labels()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the company wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-job-listing-row [title]="p['title']">@if (p['on']) {<b slot="company" data-company>Acme</b>}</div>`,
      JobListingRow as Type<unknown>,
      { title: 'T', on: false },
    )
    mounted.push(m)
    // React: `{company && <span>{company}</span>}` — no wrapper for an empty slot.
    expect(m.host.querySelector('[data-company]')).toBeNull()
    await m.setProps({ on: true })
    const projected = m.host.querySelector('[data-company]')
    expect(projected?.parentElement?.tagName.toLowerCase()).toBe('span')
    expect(projected?.textContent).toBe('Acme')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-company]')).toBeNull()
  })
})

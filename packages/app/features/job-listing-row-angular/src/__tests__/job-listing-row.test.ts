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
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    expect(
      clickable.host.querySelector('div[mol-job-listing-row]')?.getAttribute('class'),
    ).toContain('cursorPointer')
    const plain = await render({ title: 'T' })
    expect(
      plain.host.querySelector('div[mol-job-listing-row]')?.getAttribute('class'),
    ).not.toContain('cursorPointer')
  })

  it('forwards className', async () => {
    const m = await render({ title: 'T', className: 'jlr-cls' })
    expect(m.host.querySelector('div[mol-job-listing-row]')?.getAttribute('class')).toContain(
      'jlr-cls',
    )
  })
})

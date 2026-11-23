// @vitest-environment jsdom
/**
 * Unit tests of `FileDropzone` — the port of
 * `@molecule/app-file-dropzone-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
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

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { FileDropzone } = await import('../file-dropzone.component.js')

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
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [FileDropzone as Type<unknown>],
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template binding every prop, as an app would write it. */
const TEMPLATE =
  `<div mol-file-dropzone [onFiles]="p['onFiles']" [accept]="p['accept']" [multiple]="p['multiple']" [maxSize]="p['maxSize']" [onRejected]="p['onRejected']" [disabled]="p['disabled']" [className]="p['className']">` +
  `<!-- projected content goes here --></div>`

/** The host template with the given projected markup. */
const templateWith = (projected: string): string =>
  `<div mol-file-dropzone [onFiles]="p['onFiles']" [accept]="p['accept']" [multiple]="p['multiple']" [maxSize]="p['maxSize']" [onRejected]="p['onRejected']" [disabled]="p['disabled']" [className]="p['className']">${projected}</div>`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(TEMPLATE, { onFiles: () => {}, ...props })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('FileDropzone', () => {
  it('renders the default upload copy', async () => {
    const m = await render()
    expect(m.host.innerHTML).toContain('Drop files here or click to browse')
  })

  it('renders custom children in place of the default copy', async () => {
    const m = await mount(templateWith('<span data-custom="">My uploader</span>'), {
      onFiles: () => {},
    })
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-custom=""')
    expect(m.host.innerHTML).not.toContain('Drop files here')
  })

  it('renders the accept hint when an accept filter is given', async () => {
    const m = await render({ accept: '.pdf' })
    expect(m.host.innerHTML).toContain('Accepts:')
    expect(m.host.innerHTML).toContain('.pdf')
  })

  it('exposes a button role and a hidden file input carrying accept + multiple', async () => {
    const m = await render({ accept: 'image/*', multiple: true })
    expect(m.host.innerHTML).toContain('role="button"')
    expect(m.host.innerHTML).toContain('type="file"')
    expect(m.host.innerHTML).toContain('accept="image/*"')
    expect(m.host.innerHTML).toContain('multiple')
  })

  it('reflects the disabled state via aria-disabled', async () => {
    const m = await render({ disabled: true })
    expect(m.host.innerHTML).toContain('aria-disabled="true"')
  })

  it('forwards className', async () => {
    const m = await render({ className: 'fd-cls' })
    expect(m.host.innerHTML).toContain('fd-cls')
  })
})

describe('FileDropzone (keyboard activation)', () => {
  /** Renders the dropzone and returns its interactive wrapper + hidden input. */
  async function mountZone(props: Record<string, unknown> = {}): Promise<{
    zone: HTMLElement
    input: HTMLInputElement
  }> {
    const m = await render(props)
    const zone = m.host.querySelector<HTMLElement>('[data-mol-id="file-dropzone"]')
    const input = m.host.querySelector<HTMLInputElement>('input[type="file"]')
    if (!zone || !input) throw new Error('dropzone or input not found')
    return { zone, input }
  }

  /** Dispatches a cancelable bubbling keydown on the zone. */
  const keydown = (zone: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    zone.dispatchEvent(event)
    return event
  }

  it('is a keyboard-focusable button', async () => {
    const { zone } = await mountZone()
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('tabindex')).toBe('0')
  })

  it('opens the file dialog when Enter is pressed (and prevents default)', async () => {
    const { zone, input } = await mountZone()
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, 'Enter')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the file dialog when Space is pressed (and prevents default)', async () => {
    const { zone, input } = await mountZone()
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, ' ')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not open on other keys', async () => {
    const { zone, input } = await mountZone()
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Tab')
    keydown(zone, 'a')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('does not open when disabled', async () => {
    const { zone, input } = await mountZone({ disabled: true })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Enter')
    keydown(zone, ' ')
    expect(clickSpy).not.toHaveBeenCalled()
  })
})

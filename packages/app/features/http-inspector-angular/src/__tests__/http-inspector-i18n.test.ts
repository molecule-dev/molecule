// @vitest-environment jsdom
/**
 * i18n tests of `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * with a `t` that marks every key. A default that bypassed t() would show up
 * as plain English; the `translate="no"` attributes carrying protocol tokens
 * and example inputs are asserted in the rendered markup.
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

// Proxy ClassMap echoing each accessed member back as its token — the same
// mock the React tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

// The UI markers, carrying the inputs the component binds. The rest
// attributes the component writes on each host (`translate`, the bound
// aria-labels) stay on the host here, the way Angular renders host
// attributes; the real components move them onto the native element.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'disabled'],
      host: { '[disabled]': 'disabled' },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
    Input: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-input]',
      standalone: true,
      inputs: ['type', 'value', 'placeholder', 'className'],
      outputs: ['change'],
      template:
        '<input data-input [attr.value]="value ?? null" [attr.placeholder]="placeholder" />',
    })(
      class MockInput {
        /** Controlled value. */
        value?: string
        /** Placeholder text. */
        placeholder?: string
        /** Fires the native input event (the component listens for it). */
        readonly change = new EventEmitter<Event>()
      },
    ),
    Select: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-select]',
      standalone: true,
      inputs: ['value', 'options'],
      outputs: ['valueChange'],
      template: `<select data-select [attr.data-value]="value">
        @for (option of options ?? []; track option.value) {
          <option [attr.value]="option.value">{{ option.label }}</option>
        }
      </select>`,
    })(
      class MockSelect {
        /** Controlled value. */
        value?: string
        /** The options to render. */
        options?: { value: string; label: string }[]
        /** Fires the selected option's value. */
        readonly valueChange = new EventEmitter<string>()
      },
    ),
    Textarea: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['value', 'rows', 'placeholder'],
      outputs: ['change'],
      template: '<textarea data-textarea [attr.placeholder]="placeholder ?? null"></textarea>',
    })(
      class MockTextarea {
        /** Fires the native input event (the component listens for it). */
        readonly change = new EventEmitter<Event>()
      },
    ),
  }
})

const { HttpInspector } = await import('../http-inspector.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The spec-host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The rendered inspector root element. */
  readonly picker: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the inspector through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props the host binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const template =
    `<div mol-http-inspector` +
    ` [method]="p['method']"` +
    ` [onMethodChange]="p['onMethodChange']"` +
    ` [url]="p['url']"` +
    ` [onUrlChange]="p['onUrlChange']"` +
    ` [headers]="p['headers']"` +
    ` [onHeadersChange]="p['onHeadersChange']"` +
    ` [body]="p['body']"` +
    ` [onBodyChange]="p['onBodyChange']"` +
    ` [onSend]="p['onSend']"` +
    ` [sending]="p['sending']"` +
    ` [response]="p['response']"` +
    ` [className]="p['className']"></div>`
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [HttpInspector as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
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
  const picker = host.querySelector('[mol-http-inspector]') as HTMLElement
  return {
    host,
    picker,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Renders the inspector with the given props.
 *
 * @param props - The inspector props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const base = {
  method: 'GET' as const,
  onMethodChange: () => {},
  url: 'https://api.test/v1',
  onUrlChange: () => {},
  headers: [{ key: 'Accept', value: 'application/json' }],
  onHeadersChange: () => {},
  body: '',
  onBodyChange: () => {},
  onSend: () => {},
}

describe('HttpInspector i18n', () => {
  it('takes the method and URL labels through i18n', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="«httpInspector.methodLabel»"')
    expect(markup).toContain('aria-label="«httpInspector.urlLabel»"')
  })

  it('takes the header and value placeholders through i18n', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('placeholder="«httpInspector.headerPlaceholder»"')
    expect(markup).toContain('placeholder="«httpInspector.valuePlaceholder»"')
  })

  it('marks the method options as never translatable', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('translate="no"')
    expect(markup).toContain('<option value="GET">GET</option>')
  })

  it('marks the example URL and body placeholders as never translatable', async () => {
    const m = await render({ ...base, method: 'POST', headers: [], body: '{}' })
    const markup = m.host.innerHTML
    // The select, the URL field and the body textarea each carry it once.
    expect((markup.match(/translate="no"/g) ?? []).length).toBe(3)
    expect(markup).toContain('placeholder="https://api.example.com/v1/resources"')
    // The textarea mock renders the JSON example, HTML-escaped in markup.
    expect(markup).toContain('placeholder="{&quot;key&quot;: &quot;value&quot;}"')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests of `HttpInspector` — the port of
 * `@molecule/app-http-inspector-react`'s own suite: the same test names and the
 * same behavioral assertions. The React suite renders the component with
 * mocked UI dependencies and asserts the markup; this port mounts the same
 * mocked tree through Angular's real renderer (the same `createApplication` +
 * JIT host approach the conformance kit's Angular adapter uses) and asserts
 * the same markup strings.
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

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React package's own tests use.
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
        // A tone class carries its tone, so a test can tell `bgTone('success')`
        // from `bgTone('error')` — the real ClassMap gives each its own class.
        if (token === 'bgTone' || token === 'textTone' || token === 'borderTone')
          return (tone: unknown) => `${token}-${String(tone)}`
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

// The UI markers the React tests mock `@molecule/app-ui-react` with. Each mock
// carries the inputs/outputs the component binds, the way the real Angular UI
// components do.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'disabled'],
      host: { '[disabled]': 'disabled' },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
    Input: Component({
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
      changeDetection: ChangeDetectionStrategy.Default,
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
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['value', 'rows', 'placeholder'],
      outputs: ['change'],
      template: '<textarea data-textarea></textarea>',
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

describe('HttpInspector', () => {
  it('renders the method selector and URL input', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="HTTP method"')
    expect(markup).toContain('aria-label="URL"')
    expect(markup).toContain('value="https://api.test/v1"')
  })

  it('renders the Send button', async () => {
    const m = await render(base)
    expect(m.host.innerHTML).toContain('Send')
  })

  it('renders an input pair per header plus an add-header button', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('value="Accept"')
    expect(markup).toContain('value="application/json"')
    expect(markup).toContain('Add header')
  })

  it('renders the body textarea only for methods that allow a body', async () => {
    expect((await render(base)).host.innerHTML).not.toContain('data-textarea')
    expect((await render({ ...base, method: 'POST' })).host.innerHTML).toContain('data-textarea=""')
  })

  it('renders the response panel when a response is supplied', async () => {
    const m = await render({
      ...base,
      response: { statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' },
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('200 OK')
    expect(markup).toContain('42ms')
    expect(markup).toContain('{"ok":true}')
  })

  it('tones the status badge by status class', async () => {
    const badge = async (statusCode: number): Promise<HTMLElement> =>
      Array.from(
        (await render({ ...base, response: { statusCode, body: '' } })).picker.querySelectorAll(
          'span',
        ),
      ).find((span) => (span.textContent ?? '').trim() === String(statusCode)) as HTMLElement
    expect((await badge(204)).className).toContain('bgTone-success')
    expect((await badge(302)).className).toContain('bgTone-info')
    expect((await badge(404)).className).toContain('bgTone-warning')
    expect((await badge(500)).className).toContain('bgTone-error')
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect((await badge(204)).className).toContain('textOnTone')
    expect((await badge(204)).style.backgroundColor).toBe('')
  })

  it('forwards className', async () => {
    const m = await render({ ...base, className: 'hi-cls' })
    expect(m.picker.getAttribute('class') ?? '').toContain('hi-cls')
  })
})

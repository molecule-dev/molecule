// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `HttpInspector`'s labels and placeholders — the
 * port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-locale-switch.test.tsx`:
 * the same test name and assertion. The component's `t` reads the reactive
 * locale, so the view re-renders on the switch. This test bonds a provider
 * with an `en` and a `fr` table for the keys the component renders, renders it
 * in `en`, switches to `fr`, and asserts the markup now shows the French
 * values.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

// The UI markers, carrying the inputs the component binds. The rest
// attributes the component writes on each host (`translate`, the bound
// aria-labels) stay on the host here, the way Angular renders host
// attributes; the real components move them onto the native element.
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

/** A mounted spec host: its DOM, a change-detection tick, and a teardown. */
interface Mounted {
  /** The spec-host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The rendered inspector root element. */
  readonly picker: HTMLElement
  /** Runs one change-detection pass. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the inspector through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @returns The mounted host.
 */
async function mount(): Promise<Mounted> {
  const template =
    `<div mol-http-inspector` +
    ` [method]="p['method']"` +
    ` [url]="p['url']"` +
    ` [headers]="p['headers']"` +
    ` [body]="p['body']"` +
    ` [onMethodChange]="p['onMethodChange']"` +
    ` [onUrlChange]="p['onUrlChange']"` +
    ` [onHeadersChange]="p['onHeadersChange']"` +
    ` [onBodyChange]="p['onBodyChange']"` +
    ` [onSend]="p['onSend']"></div>`
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [HttpInspector as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = {
        method: 'POST',
        url: 'https://api.test/v1',
        headers: [{ key: 'Accept', value: 'application/json' }],
        body: '{}',
        onMethodChange: () => {},
        onUrlChange: () => {},
        onHeadersChange: () => {},
        onBodyChange: () => {},
        onSend: () => {},
      }
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
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'httpInspector.methodLabel': 'HTTP method',
        'httpInspector.urlLabel': 'URL',
        'httpInspector.headerPlaceholder': 'Header',
        'httpInspector.valuePlaceholder': 'Value',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'httpInspector.methodLabel': 'Méthode HTTP',
        'httpInspector.urlLabel': 'URL',
        'httpInspector.headerPlaceholder': 'En-tête',
        'httpInspector.valuePlaceholder': 'Valeur',
      },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HttpInspector locale switch', () => {
  it('renders the labels in French after setLocale', async () => {
    const m = await mount()
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="HTTP method"')
    expect(markup).toContain('aria-label="URL"')
    expect(markup).toContain('placeholder="Header"')
    expect(markup).toContain('placeholder="Value"')

    // The switch itself: the labels must follow it at once.
    await provider.setLocale('fr')
    m.tick()

    const french = m.host.innerHTML
    expect(french).toContain('aria-label="Méthode HTTP"')
    expect(french).toContain('aria-label="URL"')
    expect(french).toContain('placeholder="En-tête"')
    expect(french).toContain('placeholder="Valeur"')
  })
})

// @vitest-environment jsdom
/**
 * i18n tests of `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * with a `t` that marks every key. A default that bypassed t() would show up as
 * plain English; the generated embed code — code, not prose — carries HTML's
 * `translate="no"`.
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

// The clipboard core, mocked so a copy succeeds without a browser clipboard.
vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

// Proxy ClassMap echoing each accessed member back as its token — the same
// mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English. The
// three control keys are the literals React calls — a key built in code
// (`embedSnippet.controls.${name}`) would render an untranslated default here.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

// The button marker, carrying the id and the click the component binds.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'disabled'],
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { EmbedSnippet } = await import('../embed-snippet.component.js')

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** A mounted spec host: its DOM, a change-detection flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection (zoneless: a signal write alone does not flush). */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [EmbedSnippet as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<section
      mol-embed-snippet
      [template]="p['template']"
      [controls]="p['controls']"
      [values]="p['values']"
      [language]="p['language']"
      [heading]="p['heading']"
      [eyebrow]="p['eyebrow']"
      [feedbackMs]="p['feedbackMs']"
      [molId]="p['molId']"
      [className]="p['className']"
      [onChange]="p['onChange']"
      [onCopy]="p['onCopy']"
    ></section>`,
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
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts `EmbedSnippet` with the given props.
 *
 * @param props - The component's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('EmbedSnippet i18n', () => {
  it('marks the generated embed code as never translatable', async () => {
    const m = await render({ template: TEMPLATE })
    const pre = m.host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(pre?.getAttribute('translate')).toBe('no')
    // The code is the caller's template, not the component's prose: it does not
    // go through t(), so it stays exactly as substituted.
    expect(pre?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('takes the copy button label through i18n', async () => {
    const m = await render({ template: TEMPLATE })
    const button = m.host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    // Angular's default whitespace handling pads the interpolation: trim.
    expect(button.textContent?.trim()).toBe('«embedSnippet.copy»')
    button.click()
    // The "Copied!" swap happens in the clipboard promise's continuation; the
    // zoneless app flushes on the next tick.
    await Promise.resolve()
    await Promise.resolve()
    m.tick()
    expect(button.textContent?.trim()).toBe('«embedSnippet.copied»')
  })

  it('takes the heading and eyebrow through i18n, and the props still override', async () => {
    const marked = await render({ template: TEMPLATE })
    expect(marked.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '«embedSnippet.heading»',
    )
    expect(marked.host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '«embedSnippet.eyebrow»',
    )

    const overridden = await render({
      template: TEMPLATE,
      heading: '3D Model',
      eyebrow: 'Share this view',
    })
    expect(
      overridden.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent,
    ).toBe('3D Model')
    expect(
      overridden.host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent,
    ).toBe('Share this view')
  })

  it('takes the control captions and the region label through i18n', async () => {
    const m = await render({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-control-width"]')?.textContent,
    ).toContain('«embedSnippet.controls.width»')
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-control-height"]')?.textContent,
    ).toContain('«embedSnippet.controls.height»')
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-control-theme"]')?.textContent,
    ).toContain('«embedSnippet.controls.theme»')
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-input-width"]')?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.width»')
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-input-theme"]')?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.theme»')
    expect(m.host.querySelector('[data-mol-id="embed-snippet"]')?.getAttribute('aria-label')).toBe(
      '«embedSnippet.aria.region»',
    )
  })
})

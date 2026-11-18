// @vitest-environment jsdom
/**
 * Locale-switch test of `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-locale.test.tsx`:
 * switching the bonded provider's locale re-renders every translated label,
 * while the generated embed code — marked `translate="no"` — keeps the caller's
 * template untouched.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
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

import { getProvider } from '@molecule/app-i18n'

import { EmbedSnippet } from '../embed-snippet.component.js'

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

afterEach(async () => {
  await getProvider().setLocale('en')
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet> locale switch', () => {
  it('switching the locale changes the translated labels', async () => {
    const m = await mount({ template: TEMPLATE })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent?.trim(),
    ).toBe('Copy')

    // The kit's pseudo locale: the bonded provider brackets every translated
    // string, so a label that skipped t() would stay plain.
    await getProvider().setLocale('en-XA')
    m.tick()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '⟦Embed code⟧',
    )
    expect(m.host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '⟦Copy embed code⟧',
    )
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent?.trim(),
    ).toBe('⟦Copy⟧')
    // The embed code is code, not prose: the switch leaves it as written.
    expect(m.host.querySelector('[data-mol-id="embed-snippet-code"]')?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
    expect(
      m.host.querySelector('[data-mol-id="embed-snippet-code"]')?.getAttribute('translate'),
    ).toBe('no')
  })
})

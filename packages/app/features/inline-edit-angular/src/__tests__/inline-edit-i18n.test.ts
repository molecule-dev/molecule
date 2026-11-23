// @vitest-environment jsdom
/**
 * The Angular `InlineEdit`'s editor field label goes through i18n — a port of
 * `@molecule/app-inline-edit-react`'s `inline-edit-i18n.test.tsx`: the same
 * test names and behavioral assertions, mounted through Angular's real
 * renderer in jsdom.
 *
 * The label used to be a plain-English fallback (`placeholder ?? 'Edit'`) on a
 * string the read state never renders, so the pseudo-locale check — which
 * records a family's first case only — could not see it. This suite mocks the
 * i18n binding the way the bonded provider behaves (every key maps to a marked
 * string) and asserts the label is the marked key, not English, and that an
 * explicit `placeholder` still wins.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English. The UI components' own reads
// (`locale()`, `direction()`) come back as plain signals of the English defaults.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
    locale: () => 'en',
    direction: () => 'ltr',
    locales: () => [],
    setLocale: async () => {},
    formatNumber: () => '',
    formatDate: () => '',
  }),
}))

import { InlineEdit } from '../inline-edit.component.js'

/** A mounted spec host: its DOM, a change-detection tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + any templates).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-i18n-spec-host',
    standalone: true,
    imports: [InlineEdit],
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
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template for the props the label tests need. */
const TEMPLATE = `<mol-inline-edit
  [value]="p['value']"
  [variant]="p['variant']"
  [placeholder]="p['placeholder']"
  [onSubmit]="p['onSubmit']"
></mol-inline-edit>`

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts the editor, opens it the way a user does (a click on the read state),
 * and returns the host markup once the editor is open.
 *
 * @param props - Props over the component.
 * @returns The host's markup with the editor open.
 */
const openEditor = async (props: Record<string, unknown>): Promise<string> => {
  const m = await mount(TEMPLATE, { onSubmit: () => {}, ...props })
  mounted.push(m)
  const trigger = m.host.querySelector('[role="button"]')
  if (!trigger) throw new Error('no read-state trigger rendered')
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  m.tick()
  return m.host.innerHTML
}

describe('InlineEdit i18n label', () => {
  it('labels the editor field through i18n by default', async () => {
    const markup = await openEditor({ value: 'Hello world' })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('labels the textarea editor through i18n by default', async () => {
    const markup = await openEditor({ value: 'Some text', variant: 'textarea' })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('keeps an explicit placeholder as the field label', async () => {
    const markup = await openEditor({ value: 'Hello world', placeholder: 'Add a title' })
    expect(markup).toContain('aria-label="Add a title"')
    expect(markup).not.toContain('«inlineEdit.aria.edit»')
  })
})

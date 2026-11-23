// @vitest-environment jsdom
/**
 * The Angular `BulkActionToolbar`'s own text goes through i18n — the port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar-i18n.test.tsx`:
 * the same test name and assertion, with the Angular binding's
 * `useTranslation` mocked instead of React's.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `flex-center-between-md`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the Angular unit tests use. (Members
// are explicit because a Proxy's function-for-every-token shape breaks
// Angular's classMap binding, which rejects function values.)
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    flex: (args: Record<string, unknown>) =>
      `flex-${args.align ?? ''}-${args.justify ?? ''}-${args.gap ?? ''}${args.wrap ? `-wrap` : ''}`,
    sp: (side: string, n: number) => `sp-${side}${n}`,
    textSize: (size: string) => `text-${size}`,
    fontWeight: (weight: string) => `fw-${weight}`,
    button: (args: Record<string, unknown>) =>
      `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`,
    buttonIconLeft: 'cm-buttonIconLeft',
    buttonIconRight: 'cm-buttonIconRight',
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
  }),
}))

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { BulkActionToolbar } = await import('../bulk-action-toolbar.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Distinguishes each fresh spec host so Angular never collides on ids. */
let specHostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  specHostCount += 1
  const specHost = specHostCount
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [BulkActionToolbar],
    changeDetection: ChangeDetectionStrategy.Default,
    host: { 'data-spec-host': String(specHost) },
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  // Two ticks: view queries resolve during the first, and bindings that read
  // them re-render with their value on the second.
  appRef.tick()
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

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('BulkActionToolbar i18n', () => {
  it('takes the toolbar label through i18n by default', async () => {
    const m = await mount(
      `<div mol-bulk-action-toolbar [count]="p['count']" [actions]="p['actions']"></div>`,
      { count: 1, actions },
    )
    mounted.push(m)
    const toolbar = m.host.querySelector('[role="region"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('«bulkActions.aria.toolbar»')
    expect(toolbar?.getAttribute('aria-label')).not.toBe('Bulk actions')
  })
})

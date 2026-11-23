// @vitest-environment jsdom
/**
 * Unit tests of `BulkActionToolbar` — the port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar.test.tsx`.
 * The React suite renders the component with a mocked ClassMap and asserts
 * the markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings, over the
 * real Angular `Button` and the bonded simple i18n provider.
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
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `cm-flex`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use, extended so `cm.button(…)`
// echoes its variant/color/size arguments. (Members are explicit because a
// Proxy's function-for-every-token shape breaks Angular's classMap binding,
// which rejects function values.)
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

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

const { BulkActionToolbar } = await import('../bulk-action-toolbar.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Re-renders after the test mutated the props object. */
  tick(): void
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
/** Distinguishes each fresh spec host so Angular never collides on ids. */
let specHostCount = 0

async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  specHostCount += 1
  const specHost = specHostCount
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [BulkActionToolbar],
    changeDetection: ChangeDetectionStrategy.Eager,
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
    tick: () => {
      // The props object changed outside a binding: mark the host for the zoneless check.
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

/** The toolbar host element the component rendered (the region div). */
const toolbarOf = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[role="region"]')
  if (!el) throw new Error('no toolbar rendered')
  return el
}

/** Mounts the toolbar with the given props and returns its host element. */
const render = async (props: Record<string, unknown>): Promise<HTMLElement> => {
  const m = await mount(
    `<div mol-bulk-action-toolbar [count]="p['count']" [actions]="p['actions']" [onClearSelection]="p['onClearSelection']" [position]="p['position']" [className]="p['className']"></div>`,
    props,
  )
  mounted.push(m)
  return m.host
}

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('BulkActionToolbar', () => {
  it('renders nothing when the selection count is 0', async () => {
    const host = await render({ count: 0, actions })
    expect(host.querySelector('[role="region"]')).toBeNull()
    expect(host.textContent).not.toContain('Archive')
  })

  it('renders the selection count when count > 0', async () => {
    const host = await render({ count: 3, actions })
    expect(host.textContent).toContain('3 selected')
  })

  it('renders a button per action', async () => {
    const host = await render({ count: 1, actions })
    expect(host.textContent).toContain('Archive')
    expect(host.textContent).toContain('Delete')
  })

  it('colors destructive actions with the error variant', async () => {
    const host = await render({ count: 1, actions })
    const markup = host.innerHTML
    expect(markup).toContain('btn-solid-error-sm')
    expect(markup).toContain('btn-ghost-primary-sm')
  })

  it('disables an action flagged disabled', async () => {
    const host = await render({
      count: 1,
      actions: [{ id: 'x', label: 'X', onClick: () => {}, disabled: true }],
    })
    expect(host.querySelector('button')?.hasAttribute('disabled')).toBe(true)
  })

  it('renders the clear button only when onClearSelection is supplied', async () => {
    const withClear = await render({ count: 1, actions, onClearSelection: () => {} })
    expect(withClear.textContent).toContain('Clear')
    const without = await render({ count: 1, actions })
    expect(without.textContent).not.toContain('Clear')
  })

  it('leaves no element behind when it is removed while it renders nothing', async () => {
    const props: Record<string, unknown> = { shown: true, count: 2 }
    const m = await mount(
      `@if (p['shown']) {<div mol-bulk-action-toolbar [count]="p['count']" [actions]="[]"></div>}`,
      props,
    )
    mounted.push(m)
    expect(m.host.querySelector('[role="region"]')).not.toBeNull()
    props['count'] = 0
    m.tick()
    expect(m.host.querySelector('[role="region"]')).toBeNull()
    props['shown'] = false
    m.tick()
    expect(m.host.querySelector('[role="region"]')).toBeNull()
    // Not even the empty host element is left in the page.
    expect(m.host.querySelector('*')).toBeNull()
  })

  it('exposes a labelled region role and forwards className', async () => {
    const host = await render({ count: 1, actions, className: 'bat-cls' })
    const toolbar = toolbarOf(host)
    expect(toolbar.getAttribute('role')).toBe('region')
    expect(toolbar.getAttribute('aria-label')).toBe('Bulk actions')
    expect(toolbar.getAttribute('class')).toContain('bat-cls')
  })
})

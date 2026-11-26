// @vitest-environment jsdom
/**
 * Unit tests of `DrawingToolbar` — the port of
 * `@molecule/app-drawing-toolbar-react/src/__tests__/drawing-toolbar.test.tsx`.
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
// `stack-1`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use, extended so `cm.button(…)`
// echoes its variant/color/size arguments. (Members are explicit because a
// Proxy's function-for-every-token shape breaks Angular's classMap binding,
// which rejects function values.)
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    flex: (args: Record<string, unknown>) => `flex-${args.align ?? ''}-${args.gap ?? ''}`,
    stack: (n: number) => `stack-${n}`,
    button: (args: Record<string, unknown>) => `btn-${args.variant}-${args.color}-${args.size}`,
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

const { DrawingToolbar } = await import('../drawing-toolbar.component.js')

/** A mounted spec host: its DOM and a teardown. */
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
    imports: [DrawingToolbar],
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts the toolbar with the given props and returns its host element.
 *
 * @param props - The toolbar props.
 * @param extrasHtml - Projected `[slot=extras]` markup (empty for none).
 * @returns The host element.
 */
const render = async (props: Record<string, unknown>, extrasHtml = ''): Promise<HTMLElement> => {
  const m = await mount(
    `<div mol-drawing-toolbar [tools]="p['tools']" [selectedId]="p['selectedId']" [onSelect]="p['onSelect']" [orientation]="p['orientation']" [className]="p['className']">${extrasHtml}</div>`,
    props,
  )
  mounted.push(m)
  return m.host
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const tools = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
]

describe('DrawingToolbar', () => {
  it('renders a button per tool', async () => {
    const host = await render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(host.innerHTML.match(/<button\b/g) ?? []).toHaveLength(2)
  })

  it('marks the selected tool aria-pressed', async () => {
    const host = await render({ tools, selectedId: 'pen', onSelect: () => {} })
    expect(host.innerHTML.match(/aria-pressed="true"/g) ?? []).toHaveLength(1)
  })

  it('gives each tool button an aria-label', async () => {
    const host = await render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(host.innerHTML).toContain('aria-label="Select"')
    expect(host.innerHTML).toContain('aria-label="Pen"')
  })

  it('renders the extras slot', async () => {
    const host = await render(
      { tools, selectedId: 'select', onSelect: () => {} },
      '<span slot="extras" data-extras></span>',
    )
    expect(host.innerHTML).toContain('data-extras=""')
  })

  it('exposes a labelled toolbar role', async () => {
    const host = await render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(host.innerHTML).toContain('role="toolbar"')
    expect(host.innerHTML).toContain('aria-label="Drawing tools"')
  })

  it('forwards className', async () => {
    const host = await render({
      tools,
      selectedId: 'select',
      onSelect: () => {},
      className: 'dt-cls',
    })
    expect(host.innerHTML).toContain('dt-cls')
  })
})

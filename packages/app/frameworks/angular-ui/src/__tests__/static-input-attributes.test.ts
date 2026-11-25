// @vitest-environment jsdom
/**
 * An input written as a static attribute reaches the component AND stays on the host element in
 * Angular, where React's component takes the prop and renders it on its inner control, or not at
 * all. So `<div mol-input id="email">` once gave the wrapper and its `<input>` the same id (a
 * `<label for>` then targeted the wrapper) and `<div mol-alert title="Saved">` put a browser
 * tooltip on the whole alert. Each host now removes those attributes; these cases write every
 * such input statically and check the DOM is React's.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => {
  // The class map's variant factories (called with options); every other property is a class token.
  const factories = new Set([
    'accordion',
    'alert',
    'alertLeftAccent',
    'avatar',
    'badge',
    'button',
    'card',
    'cardPadding',
    'checkbox',
    'container',
    'flex',
    'fontWeight',
    'grid',
    'h',
    'input',
    'label',
    'minH',
    'minW',
    'modal',
    'pagination',
    'position',
    'progress',
    'progressBar',
    'progressColor',
    'progressHeight',
    'radio',
    'radioGroupLayout',
    'select',
    'separator',
    'skeleton',
    'sp',
    'spacer',
    'spinner',
    'stack',
    'switchBase',
    'switchThumb',
    'tabsContent',
    'tabsList',
    'tabsTrigger',
    'textSize',
    'toast',
    'toastContainer',
    'textarea',
    'w',
  ])
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    getClassMap: () => {
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_t, prop) {
          if (prop === 'cn') {
            return (...cls: unknown[]) =>
              cls
                .flat(Infinity)
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          if (factories.has(token)) return (..._args: unknown[]) => token
          return token
        },
      }
      return new Proxy({}, handler)
    },
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

// Partial: the real binding's `RoutedView` (AuthGuard's routed page) and the rest stay real.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
    locale: () => 'en',
    locales: () => ['en'],
    setLocale: () => Promise.resolve(),
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
  useAuth: () => ({ status: () => 'authenticated' }),
  useTheme: () => ({ theme: () => 'light', setTheme: () => undefined }),
}))

const ui = await import('../index.js')

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Mounts a host component carrying the case's template; the case's data are fields on it.
 *
 * @param template - The host template, written as an app writes the components.
 * @param imports - The standalone components the template uses.
 * @param props - Fields the template reads.
 * @returns The element the host rendered into.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports,
    template,
  })(class StaticInputAttributesHost {})
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return root
}

/**
 * The component's host: the first element child of the test host.
 *
 * @param root - The test host's element.
 * @returns The component host element.
 */
function hostOf(root: HTMLElement): HTMLElement {
  const host = root.firstElementChild
  if (!(host instanceof HTMLElement)) throw new Error('component host not found')
  return host
}

/** Form controls: React puts `id` on the inner control, which a `<label for>` names. */
const idCases: Array<[string, string, Type<unknown>[], string, Record<string, unknown>?]> = [
  ['Input', '<div mol-input id="field-id" label="Email"></div>', [ui.Input], 'input'],
  ['Textarea', '<div mol-textarea id="field-id" label="Notes"></div>', [ui.Textarea], 'textarea'],
  [
    'Select',
    '<div mol-select id="field-id" label="Plan" [options]="options"></div>',
    [ui.Select],
    'select',
    { options: [{ value: 'free', label: 'Free' }] },
  ],
  ['Checkbox', '<div mol-checkbox id="field-id" label="Agree"></div>', [ui.Checkbox], 'input'],
  [
    'FloatingInput',
    '<span mol-floating-input id="field-id" placeholder="Search"></span>',
    [ui.FloatingInput],
    'input',
  ],
]

/** Components whose `title` is their heading: React renders it as text, never as the attribute. */
const titleCases: Array<[string, string, Type<unknown>[]]> = [
  ['Alert', '<div mol-alert title="Static title">Body</div>', [ui.Alert]],
  ['EmptyState', '<div mol-empty-state title="Static title"></div>', [ui.EmptyState]],
  ['PageHeader', '<div mol-page-header title="Static title"></div>', [ui.PageHeader]],
  ['Toast', '<div mol-toast title="Static title"></div>', [ui.Toast]],
]

describe('static input attributes', () => {
  it.each(idCases)(
    '%s puts a static id on its control, not on its host',
    async (_name, template, imports, control, props) => {
      const root = await mount(template, imports, props)
      expect(hostOf(root).hasAttribute('id')).toBe(false)
      expect(root.querySelectorAll('[id="field-id"]')).toHaveLength(1)
      expect(root.querySelector(`${control}#field-id`)).not.toBeNull()
    },
  )

  it.each(titleCases)(
    '%s renders a static title as its heading, with no title attribute',
    async (_name, template, imports) => {
      const root = await mount(template, imports)
      expect(hostOf(root).hasAttribute('title')).toBe(false)
      expect(root.querySelector('[title]')).toBeNull()
      expect(root.textContent).toContain('Static title')
    },
  )

  it('Table puts a static id and title on its table, not on its wrapper', async () => {
    const root = await mount(
      '<div mol-table id="people" title="People" [columns]="columns" [data]="rows"></div>',
      [ui.Table],
      { columns: [{ key: 'name', header: 'Name' }], rows: [{ id: 'r1', name: 'Ada' }] },
    )
    const host = hostOf(root)
    expect(host.hasAttribute('id')).toBe(false)
    expect(host.hasAttribute('title')).toBe(false)
    const table = root.querySelector('table')
    expect(table?.getAttribute('id')).toBe('people')
    expect(table?.getAttribute('title')).toBe('People')
  })

  it('Table puts a rest aria attribute on its table, as React spreads it', async () => {
    const root = await mount(
      '<div mol-table aria-label="People" [columns]="columns" [data]="rows"></div>',
      [ui.Table],
      { columns: [{ key: 'name', header: 'Name' }], rows: [{ id: 'r1', name: 'Ada' }] },
    )
    expect(hostOf(root).hasAttribute('aria-label')).toBe(false)
    expect(root.querySelector('table')?.getAttribute('aria-label')).toBe('People')
  })

  it('OptimisticToggleButton renders no value attribute for a static value', async () => {
    const root = await mount(
      '<button mol-optimistic-toggle-button value="true" activeLabel="On" inactiveLabel="Off" [commit]="commit"></button>',
      [ui.OptimisticToggleButton],
      { commit: async (): Promise<boolean> => true },
    )
    const button = hostOf(root)
    expect(button.hasAttribute('value')).toBe(false)
    expect(button.textContent).toContain('On')
  })
})

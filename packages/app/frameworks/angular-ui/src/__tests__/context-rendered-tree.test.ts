// @vitest-environment jsdom
/**
 * Context follows the rendered tree: a provider whose host is out of the page still provides to its
 * children and to nothing else, and each context is found by its own consumers only.
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

vi.mock('@molecule/app-ui', () => {
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
const { useToast } = ui

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts a host component carrying the case's template; the case's props are fields on it.
 *
 * @param template - The host template, written as an app writes the components.
 * @param imports - The standalone components the template uses.
 * @param props - Extra fields (data props, callbacks) the template reads.
 * @returns The host instance.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<unknown> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports,
    template,
  })(class ContextHost {})
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return ref.instance
}

const { usePanelClose } = ui

/** Reads both contexts the way an app component does, from its own host. */
function probe(selector: string): Type<unknown> {
  return Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector,
    standalone: true,
    template: '',
  })(
    class ContextProbe {
      readonly toast = useToast()
      readonly close = usePanelClose()
      constructor() {
        probes.set(selector, this)
      }
    },
  ) as Type<unknown>
}
const probes = new Map<string, { toast: ReturnType<typeof useToast>; close: () => void }>()

describe('context through the rendered tree', () => {
  it('PanelCloseProvider gives its close to its children and not to a sibling under the same parent', async () => {
    const closed: string[] = []
    await mount(
      `<section><mol-panel-close-provider [close]="close"><div data-in></div></mol-panel-close-provider><div data-out></div></section>`,
      [ui.PanelCloseProvider, probe('div[data-in]'), probe('div[data-out]')],
      { close: () => closed.push('closed') },
    )
    // React's provider renders no element: the two probes are siblings in the page.
    expect(Array.from(document.querySelector('section')!.children, (el) => el.tagName)).toEqual([
      'DIV',
      'DIV',
    ])
    probes.get('div[data-out]')!.close()
    expect(closed).toEqual([])
    probes.get('div[data-in]')!.close()
    expect(closed).toEqual(['closed'])
  })

  it('ToastProvider gives its toasts to its children and not to a sibling under the same parent', async () => {
    await mount(
      `<section><mol-toast-provider><div data-in></div></mol-toast-provider><div data-out></div></section>`,
      [ui.ToastProvider, probe('div[data-in]'), probe('div[data-out]')],
    )
    expect(probes.get('div[data-in]')!.toast.addToast({ id: 'in', title: 'In', duration: 0 })).toBe(
      'in',
    )
    expect(() =>
      probes.get('div[data-out]')!.toast.addToast({ title: 'Out', duration: 0 }),
    ).toThrow(/useToast must be used within a ToastProvider/)
  })

  it('a consumer finds its own context through another provider in between', async () => {
    await mount(
      `<mol-toast-provider><div mol-form-field name="email" label="Email"><div data-in></div></div></mol-toast-provider>`,
      [ui.ToastProvider, ui.FormField, probe('div[data-in]')],
    )
    expect(
      probes.get('div[data-in]')!.toast.addToast({ id: 'through', title: 'T', duration: 0 }),
    ).toBe('through')
    appRef!.tick()
    expect(document.getElementById('through')?.textContent).toContain('T')
  })

  it('a provider inside a closing panel does not hide the panel from its consumers', async () => {
    const closed: string[] = []
    await mount(
      `<mol-panel-close-provider [close]="close"><mol-toast-provider><div data-in></div></mol-toast-provider></mol-panel-close-provider>`,
      [ui.PanelCloseProvider, ui.ToastProvider, probe('div[data-in]')],
      { close: () => closed.push('closed') },
    )
    probes.get('div[data-in]')!.close()
    expect(closed).toEqual(['closed'])
  })
})

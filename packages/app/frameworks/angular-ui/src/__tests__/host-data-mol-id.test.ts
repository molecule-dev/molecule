// @vitest-environment jsdom
/**
 * A `data-mol-id` an app binds on a component's host (`[attr.data-mol-id]`) reaches the element the
 * component renders it on after the first change detection, and follows a change. React spreads it
 * onto that element in the same render; a component that only stored it until a later pass left the
 * element without its automation id (2026-11-19: the quick-search dialog's `data-mol-id`).
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
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

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Mounts a host whose template binds `[attr.data-mol-id]="id()"` on the component, and runs one
 * change detection.
 *
 * @param template - The host template.
 * @param imports - The component it renders.
 * @returns Runs change detection again, and sets the bound id (then runs it).
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
): Promise<{ tick: () => void; setId: (id: string) => void }> {
  const Host = Component({ selector: 'div[data-test-host]', standalone: true, imports, template })(
    class HostDataMolIdHost {
      readonly id = signal('host-id')
      readonly options = [{ value: 'free', label: 'Free' }]
      readonly rows = [{ id: 'r1', name: 'Ada' }]
      readonly columns = [{ key: 'name', header: 'Name' }]
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const app = appRef
  const ref = createComponent(Host, { environmentInjector: app.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  app.attachView(ref.hostView)
  app.tick()
  return {
    tick: () => app.tick(),
    setId: (id) => {
      ref.instance.id.set(id)
      app.tick()
    },
  }
}

/**
 * Each component, the template that binds the id on its host, the element that carries it, and the
 * element to hover first when, as in React, that element renders only while shown.
 */
const cases: Array<[string, string, Type<unknown>[], string, string?]> = [
  [
    'Modal',
    '<mol-modal [open]="true" title="T" [attr.data-mol-id]="id()">body</mol-modal>',
    [ui.Modal],
    '[role="dialog"]',
  ],
  [
    'Tooltip',
    '<mol-tooltip content="Tip" [attr.data-mol-id]="id()"><button>Share</button></mol-tooltip>',
    [ui.Tooltip],
    '[role="tooltip"]',
    'button',
  ],
  ['Input', '<div mol-input name="email" [attr.data-mol-id]="id()"></div>', [ui.Input], 'input'],
  ['Switch', '<mol-switch [attr.data-mol-id]="id()"></mol-switch>', [ui.Switch], 'button'],
  ['Checkbox', '<div mol-checkbox [attr.data-mol-id]="id()"></div>', [ui.Checkbox], 'input'],
  [
    'Textarea',
    '<div mol-textarea name="notes" [attr.data-mol-id]="id()"></div>',
    [ui.Textarea],
    'textarea',
  ],
  [
    'Table',
    '<div mol-table [data]="rows" [columns]="columns" [attr.data-mol-id]="id()"></div>',
    [ui.Table],
    'table',
  ],
  [
    'Select',
    '<div mol-select [options]="options" [attr.data-mol-id]="id()"></div>',
    [ui.Select],
    'select',
  ],
]

describe('a data-mol-id bound on the host', () => {
  it.each(cases)(
    '%s puts it on its element after the first pass, and follows a change',
    async (_name, template, imports, target, reveal) => {
      const { tick, setId } = await mount(template, imports)
      if (reveal) {
        document
          .querySelector(reveal)
          ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
        // The shown state attaches the portal on the next pass (the Tooltip suite's hover cases
        // tick twice too).
        tick()
        tick()
      }
      const marked = (): Element[] => [...document.querySelectorAll('[data-mol-id^="host-id"]')]
      expect(marked().map((el) => [el.getAttribute('data-mol-id'), el.matches(target)])).toEqual([
        ['host-id', true],
      ])

      setId('host-id-2')
      expect(marked().map((el) => [el.getAttribute('data-mol-id'), el.matches(target)])).toEqual([
        ['host-id-2', true],
      ])
    },
  )
})

// @vitest-environment jsdom
/**
 * `BaseProps.disabled` disables the controls a component renders: a disabled Tabs, Accordion or
 * Dropdown takes no input, and a disabled Card never calls `onClick`.
 *
 * The counterpart of `@molecule/app-ui-react/src/__tests__/disabled-controls.test.tsx`: each
 * case mounts an Angular host component written the way an app writes the kit's components.
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

vi.mock('@molecule/app-ui', async (importOriginal) => {
  // The class map's variant factories (called with options); every other property is a class token.
  const factories = new Set([
    'accordion',
    'accordionTriggerBase',
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
  vi.restoreAllMocks()
})

/**
 * Mounts a host component carrying the case's template; the case's props are fields on it.
 *
 * @param template - The host template, written as an app writes the components.
 * @param imports - The standalone components the template uses.
 * @param props - Extra fields (data props, callbacks) the template reads.
 * @returns The running application.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<ApplicationRef> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports,
    template,
  })(class DisabledControlsHost {})
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return appRef
}

const tabs = [
  { value: 'a', label: 'A', content: 'A body' },
  { value: 'b', label: 'B', content: 'B body' },
]
const accordionItems = [{ value: 'a', header: 'A', content: 'Body' }]
const dropdownItems = [{ value: 'a', label: 'A' }]

const keydown = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('disabled controls', () => {
  it('a disabled Tabs disables every tab, and a click or an arrow key changes nothing', async () => {
    const onChange = vi.fn()
    await mount(
      `<div mol-tabs [disabled]="true" [items]="tabs" (change)="onChange($event)"></div>`,
      [ui.Tabs],
      { tabs, onChange },
    )
    const tabElements = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))
    expect(tabElements.every((tab) => tab.hasAttribute('disabled'))).toBe(true)
    tabElements[1].click()
    keydown(tabElements[0], 'ArrowRight')
    appRef!.tick()
    expect(onChange).not.toHaveBeenCalled()
    expect(tabElements[0].getAttribute('aria-selected')).toBe('true')
  })

  it('a disabled Accordion disables every header, and a click opens nothing', async () => {
    const onChange = vi.fn()
    await mount(
      `<div mol-accordion [disabled]="true" [items]="items" (change)="onChange($event)"></div>`,
      [ui.Accordion],
      { items: accordionItems, onChange },
    )
    const header = document.querySelector<HTMLElement>('button')!
    expect(header.hasAttribute('disabled')).toBe(true)
    header.click()
    appRef!.tick()
    expect(onChange).not.toHaveBeenCalled()
    expect(header.getAttribute('aria-expanded')).toBe('false')
  })

  it('a disabled Dropdown disables its trigger and never opens', async () => {
    const onOpenChange = vi.fn()
    await mount(
      `<mol-dropdown [disabled]="true" [items]="items" (openChange)="onOpenChange($event)"><button slot="trigger" type="button">Options</button></mol-dropdown>`,
      [ui.Dropdown],
      { items: dropdownItems, onOpenChange },
    )
    const trigger = Array.from(document.querySelectorAll<HTMLElement>('button')).find(
      (button) => button.textContent === 'Options',
    )!
    expect(trigger.hasAttribute('disabled')).toBe(true)
    trigger.click()
    keydown(trigger, 'Enter')
    appRef!.tick()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('a disabled Dropdown with a text trigger is announced disabled and leaves the tab order', async () => {
    const onOpenChange = vi.fn()
    await mount(
      `<mol-dropdown [disabled]="true" [items]="items" (openChange)="onOpenChange($event)">Options</mol-dropdown>`,
      [ui.Dropdown],
      { items: dropdownItems, onOpenChange },
    )
    const trigger = document.querySelector<HTMLElement>('[role="button"]')!
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.tabIndex).toBe(-1)
    trigger.click()
    keydown(trigger, 'Enter')
    appRef!.tick()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('a disabled interactive Card is announced disabled and a click or Enter never calls onClick', async () => {
    const onClick = vi.fn()
    await mount(
      `<div mol-card [interactive]="true" [disabled]="true" [onClick]="onClick">Clickable card</div>`,
      [ui.Card],
      { onClick },
    )
    const card = document.querySelector<HTMLElement>('[role="button"]')!
    expect(card.getAttribute('aria-disabled')).toBe('true')
    expect(card.tabIndex).toBe(-1)
    expect(card.hasAttribute('disabled')).toBe(false)
    card.click()
    keydown(card, 'Enter')
    appRef!.tick()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a disabled plain Card never calls onClick', async () => {
    const onClick = vi.fn()
    await mount(
      `<div mol-card testId="plain-card" [disabled]="true" [onClick]="onClick">Plain card</div>`,
      [ui.Card],
      { onClick },
    )
    document.querySelector<HTMLElement>('[data-testid="plain-card"]')!.click()
    appRef!.tick()
    expect(onClick).not.toHaveBeenCalled()
  })
})

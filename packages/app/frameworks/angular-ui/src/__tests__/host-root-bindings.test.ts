// @vitest-environment jsdom
/**
 * What an app binds on the tag of a component whose host leaves the page lands where React's
 * `{...rest}` spread puts it, and follows the binding when it changes: Modal's dialog, the
 * LanguagePicker and SidebarUserCard trigger buttons, Tooltip's box (not its trigger wrapper), and
 * the dialog of ConfirmDialog and PromptDialog (each passes the binding to the Modal it composes).
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

import { provideDomPlacement } from '@molecule/app-angular'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => {
  // The class map's variant factories (called with options); every other property is a class token
  // (the list declared-props.test.ts keeps).
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

// Partial: the real placement module and the rest stay real.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
    locale: () => 'en',
    locales: () => [{ code: 'en', name: 'English' }],
    setLocale: () => Promise.resolve(),
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
  useAuth: () => ({ status: () => 'authenticated', user: () => ({ name: 'Ada' }) }),
  useTheme: () => ({ theme: () => 'light', setTheme: () => undefined }),
}))

const ui = await import('../index.js')

/** The consumer's fields its template binds on the tag. */
interface Consumer {
  /** The value bound as `[attr.data-probe]`. */
  v: string
  /** The listener events the tag received, as `type@tag of currentTarget`. */
  events: string[]
}

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Mounts a consumer template, then returns a function that changes its bound value.
 *
 * @param template - The consumer template.
 * @param imports - The components it uses.
 * @returns The consumer and a setter that re-renders it with a new `v`.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
): Promise<{ consumer: Consumer; setV: (v: string) => void }> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-consumer]',
    standalone: true,
    imports,
    template,
  })(
    class TagBindingsConsumer implements Consumer {
      v = 'one'
      events: string[] = []
      /**
       * Records a listener call.
       *
       * @param event - The event.
       */
      on(event: Event): void {
        this.events.push(`${event.type}@${(event.currentTarget as Element).tagName.toLowerCase()}`)
      }
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, {
    environmentInjector: appRef.injector,
  }) as ComponentRef<Consumer>
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    consumer: ref.instance,
    setV: (v) => {
      ref.instance.v = v
      ref.changeDetectorRef.markForCheck()
      appRef!.tick()
    },
  }
}

/** @returns The one element that carries `data-probe`, with its value. */
const probed = (): { tag: string; role: string | null; value: string | null } | null => {
  const all = document.querySelectorAll('[data-probe]')
  if (all.length !== 1) return null
  const el = all[0]!
  return {
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    value: el.getAttribute('data-probe'),
  }
}

describe('bindings on the tag of a component whose host leaves the page', () => {
  it('Modal: an attribute, a class and a listener on the tag land on the dialog, and the attribute follows', async () => {
    const { consumer, setV } = await mount(
      `<mol-modal [open]="true" [attr.data-probe]="v" class="probe-mark" (keydown)="on($event)"><p>Body</p></mol-modal>`,
      [ui.Modal],
    )
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'one' })
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.classList.contains('probe-mark')).toBe(true)
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(consumer.events).toEqual(['keydown@div'])
    setV('two')
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'two' })
  })

  it('LanguagePicker: an attribute on the tag lands on the trigger button and follows', async () => {
    const { setV } = await mount(`<mol-language-picker [attr.data-probe]="v" />`, [
      ui.LanguagePicker,
    ])
    expect(probed()).toEqual({ tag: 'button', role: null, value: 'one' })
    setV('two')
    expect(probed()).toEqual({ tag: 'button', role: null, value: 'two' })
  })

  it('SidebarUserCard: an attribute on the tag lands on the trigger button and follows', async () => {
    const { setV } = await mount(`<mol-sidebar-user-card [attr.data-probe]="v" />`, [
      ui.SidebarUserCard,
    ])
    expect(probed()).toEqual({ tag: 'button', role: null, value: 'one' })
    setV('two')
    expect(probed()).toEqual({ tag: 'button', role: null, value: 'two' })
  })

  it('Tooltip: an attribute on the tag lands on the tooltip box, not the trigger wrapper, and follows', async () => {
    const { setV } = await mount(
      `<mol-tooltip content="Copy link" [attr.data-probe]="v"><button>Share</button></mol-tooltip>`,
      [ui.Tooltip],
    )
    const share = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Share',
    )!
    share.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    appRef!.tick()
    appRef!.tick()
    expect(probed()).toEqual({ tag: 'div', role: 'tooltip', value: 'one' })
    setV('two')
    expect(probed()).toEqual({ tag: 'div', role: 'tooltip', value: 'two' })
  })

  it('ConfirmDialog: an attribute on the tag reaches the dialog through its Modal and follows', async () => {
    const { setV } = await mount(
      `<mol-confirm-dialog [open]="true" title="Delete?" [attr.data-probe]="v" />`,
      [ui.ConfirmDialog],
    )
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'one' })
    setV('two')
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'two' })
  })

  it('PromptDialog: an attribute on the tag reaches the dialog through its Modal and follows', async () => {
    const { setV } = await mount(
      `<mol-prompt-dialog [open]="true" title="Name?" [attr.data-probe]="v" />`,
      [ui.PromptDialog],
    )
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'one' })
    setV('two')
    expect(probed()).toEqual({ tag: 'div', role: 'dialog', value: 'two' })
  })

  it('counterexample: a data-mol-id on the Modal tag is merged by the Modal itself, once, on the dialog', async () => {
    await mount(`<mol-modal [open]="true" data-mol-id="m1"><p>Body</p></mol-modal>`, [ui.Modal])
    const marked = document.querySelectorAll('[data-mol-id="m1"]')
    expect(marked.length).toBe(1)
    expect(marked[0]!.getAttribute('role')).toBe('dialog')
  })
})

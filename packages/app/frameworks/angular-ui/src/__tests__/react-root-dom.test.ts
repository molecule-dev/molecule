// @vitest-environment jsdom
/**
 * React's DOM at the port's own place: a port whose React root is a fragment,
 * an element or a portal renders exactly React's nodes between its consumer's
 * siblings — no host element and no capture span of its own.
 *
 * Each case mounts the port between `<i>a</i>` and `<i>b</i>` in a consumer
 * template, compares the consumer's children with React's markup (comments,
 * Angular's anchors, ignored), then toggles the input the port's presence
 * depends on once and compares again.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
  ViewChild,
  type WritableSignal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    // Tokens the port templates CALL as functions; every other token is read as
    // a plain class string (Angular's class binding rejects a function value).
    const CALLABLE = new Set([
      'alert',
      'avatar',
      'button',
      'checkbox',
      'cn',
      'flex',
      'fontWeight',
      'h',
      'input',
      'label',
      'minH',
      'minW',
      'modal',
      'position',
      'sp',
      'stack',
      'switchBase',
      'switchThumb',
      'textSize',
      'toast',
      'toastContainer',
      'w',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>()
  const { signal } = await import('@angular/core')
  // The auth status the mounted guards read, exported so a case can flip it.
  const status = signal<'loading' | 'authenticated'>('loading')
  return {
    ...real,
    __authStatus: status,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? '',
      locale: () => 'en',
      locales: () => [{ code: 'en', name: 'English' }],
      setLocale: async () => {},
    }),
    useRouter: () => ({
      location: () => ({ pathname: '/', search: '', hash: '' }),
      navigate: () => undefined,
    }),
    useAuth: () => ({
      status: () => status(),
      isAuthenticated: () => status() === 'authenticated',
    }),
  }
})

const { __authStatus: authStatus } = (await import('@molecule/app-angular')) as unknown as {
  __authStatus: WritableSignal<'loading' | 'authenticated'>
}

const { AuthGuard } = await import('../components/auth-guard.component.js')
const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')
const { LanguagePicker } = await import('../components/language-picker.component.js')
const { Modal } = await import('../components/modal.component.js')
const { MoleculeButton } = await import('../components/molecule/button.component.js')
const { PanelCloseProvider } = await import('../components/panel-close.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')
const { ResponsiveAppShell, ResponsiveAppShellDrawer } =
  await import('../components/responsive-app-shell.component.js')
const { Switch } = await import('../components/switch.component.js')
const { ToastContainer, ToastProvider } = await import('../components/toast.component.js')

const apps: ApplicationRef[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
  authStatus.set('loading')
})

/**
 * The consumer's children as React's markup: element tags with their text,
 * comments (Angular's block anchors and placeholders) and whitespace left out.
 *
 * @param parent - The element whose children are read.
 * @returns The markup.
 */
function shape(parent: Element): string {
  const out: string[] = []
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) continue
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).data.replace(/\s+/g, ' ').trim()
      if (text) out.push(text)
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const element = node as Element
    const tag = element.tagName.toLowerCase()
    out.push(`<${tag}>${shape(element)}</${tag}>`)
  }
  return out.join('')
}

/**
 * Mounts `template` in a consumer host whose props are `p`.
 *
 * @param template - The consumer template, reading `p['name']`.
 * @param imports - The standalone components the template uses.
 * @param props - Its initial props.
 * @returns The host root element and a one-pass setter.
 */
async function mount(template: string, imports: Type<unknown>[], props: Record<string, unknown>) {
  const Host = Component({
    selector: 'react-root-host',
    standalone: true,
    imports,
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class ReactRootHost {
      p: Record<string, unknown> = props
    },
  )
  const app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  apps.push(app)
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: app.injector,
  })
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  return {
    root,
    set(next: Record<string, unknown>): void {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}

/** The port between two consumer siblings. */
const around = (port: string): string => `<i>a</i>${port}<i>b</i>`

describe('MoleculeButton (React root: one <button>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-button [loading]="p['loading']">Save</mol-button>`),
      [MoleculeButton],
      { loading: false },
    )
    expect(shape(m.root)).toBe('<i>a</i><button>Save</button><i>b</i>')
    m.set({ loading: true })
    expect(shape(m.root)).toBe('<i>a</i><button><span></span>Save</button><i>b</i>')
  })
})

describe('Switch (React root: a fragment of input and label)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(around(`<mol-switch label="L"></mol-switch>`), [Switch], {})
    expect(shape(m.root)).toBe(
      '<i>a</i><input></input><label><button><span></span></button><span>L</span></label><i>b</i>',
    )
    m.set({})
    expect(shape(m.root)).toBe(
      '<i>a</i><input></input><label><button><span></span></button><span>L</span></label><i>b</i>',
    )
  })
})

describe('PanelCloseProvider (a context provider that renders only its children)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<mol-panel-close-provider [close]="p['close']"><p>panel</p></mol-panel-close-provider>`,
      ),
      [PanelCloseProvider],
      { close: () => undefined },
    )
    expect(shape(m.root)).toBe('<i>a</i><p>panel</p><i>b</i>')
    m.set({ close: () => undefined })
    expect(shape(m.root)).toBe('<i>a</i><p>panel</p><i>b</i>')
  })
})

describe('AuthGuard (React root: a fragment, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(around(`<mol-auth-guard><p>page</p></mol-auth-guard>`), [AuthGuard], {})
    expect(shape(m.root)).toBe('<i>a</i><div>Loading...</div><i>b</i>')
    authStatus.set('authenticated')
    m.set({})
    expect(shape(m.root)).toBe('<i>a</i><p>page</p><i>b</i>')
  })
})

describe('Modal (React root: a portal, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-modal [open]="p['open']" title="T">Body</mol-modal>`),
      [Modal],
      { open: false },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    m.set({ open: true })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe('ConfirmDialog (React root: a composed Modal portal)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-confirm-dialog [open]="p['open']" title="T"></mol-confirm-dialog>`),
      [ConfirmDialog],
      { open: false },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ open: true })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe('PromptDialog (React root: a composed Modal portal)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-prompt-dialog [open]="p['open']" title="T"></mol-prompt-dialog>`),
      [PromptDialog],
      { open: false },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ open: true })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe('LanguagePicker (React root: a trigger plus a Modal portal)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-language-picker></mol-language-picker>`),
      [LanguagePicker],
      {},
    )
    expect(shape(m.root)).toBe('<i>a</i><button><svg></svg><span>English</span></button><i>b</i>')
    m.set({})
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('ToastContainer (React root: a portal)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-toast-container></mol-toast-container>`),
      [ToastContainer],
      {},
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(document.body.lastElementChild?.className).toBe('toastContainer')
  })
})

describe('ToastProvider (React root: children bare plus a portal)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<mol-toast-provider><p>page</p></mol-toast-provider>`),
      [ToastProvider],
      {},
    )
    expect(shape(m.root)).toBe('<i>a</i><p>page</p><i>b</i>')
    m.set({})
    expect(shape(m.root)).toBe('<i>a</i><p>page</p><i>b</i>')
    expect(document.body.querySelector('[class="toastContainer"]')).not.toBeNull()
  })
})

describe('ResponsiveAppShell.Drawer (React root: a portal, or nothing)', () => {
  /**
   * Mounts the shell with the drawer, with a handle on the shell root.
   *
   * @returns The host root and an opener.
   */
  const mountShell = async () => {
    const Host = Component({
      selector: 'react-root-shell-host',
      standalone: true,
      imports: [ResponsiveAppShell, ResponsiveAppShellDrawer],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-responsive-app-shell><i>a</i><mol-responsive-app-shell-drawer><b>nav</b></mol-responsive-app-shell-drawer><i>b</i></div>`,
    })(
      class ShellHost {
        /** The shell root, to open its drawer. */
        shell?: InstanceType<typeof ResponsiveAppShell>
      },
    )
    ViewChild(ResponsiveAppShell)(Host.prototype, 'shell')
    const app = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    apps.push(app)
    const ref = createComponent(Host, { environmentInjector: app.injector })
    const root = ref.location.nativeElement as HTMLElement
    document.body.appendChild(root)
    app.attachView(ref.hostView)
    app.tick()
    return {
      root,
      open(): void {
        ref.instance.shell!.drawerOpen.set(true)
        app.tick()
      },
    }
  }

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mountShell()
    const shell = m.root.firstElementChild as Element
    expect(shape(shell)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    m.open()
    expect(shape(shell)).toBe('<i>a</i><i>b</i>')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

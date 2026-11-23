// @vitest-environment jsdom
/**
 * Accessible-name wiring for the framework dialogs and the Tabs
 * `aria-controls` contract (axe `aria-dialog-name` / `aria-valid-attr-value`),
 * mirroring `@molecule/app-ui-react`'s `dialog-name-and-controls` test:
 *
 * - ConfirmDialog and PromptDialog label their dialog element with the
 *   rendered title (and PromptDialog its rendered description) instead of
 *   leaving `<div role="dialog">` unnamed;
 * - SidebarUserCard's settings drawer (a title-less Modal) is named with the
 *   localized `sidebarUserCard.drawer` label;
 * - a Tabs tab only carries `aria-controls` when its panel is actually
 *   rendered (the active tab, when its item has content), and the value
 *   resolves to that panel's id.
 *
 * angular-ui ships `@Component`-decorated classes; each component renders
 * through a spec host with real Angular (JIT compiler, zoneless change
 * detection) so the projected slots, bindings and the Modal's rest-attribute
 * move all run exactly as in an app.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // The variant factories the templates CALL (`modal({ size })`,
    // `tabsList({ … })`, …); every other token is a plain string — what
    // Angular's `[class]` binding requires (a function fails its styling
    // assertion).
    const FACTORIES = new Set([
      'cn',
      'stack',
      'flex',
      'textSize',
      'fontWeight',
      'sp',
      'w',
      'h',
      'minW',
      'modal',
      'button',
      'input',
      'tabsList',
      'tabsTrigger',
      'tabsContent',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        const token = String(prop)
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && FACTORIES.has(prop)) {
          const fn = (..._args: unknown[]) => token
          fn.toString = () => token
          return fn
        }
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

// The drawer label test reads a TRANSLATED value, so the stub resolves keys
// through a small table before falling back to the defaultValue.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      ({ 'sidebarUserCard.drawer': 'Konto' })[key] ?? opts?.defaultValue ?? '',
    locale: () => 'en',
  }),
  useAuth: () => ({ user: () => ({ id: 'u1', name: 'Ada', email: 'ada@example.com' }) }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
}))

const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')
const { SidebarUserCard } = await import('../components/sidebar-user-card.component.js')
const { Tabs } = await import('../components/tabs.component.js')

const TABS_ITEMS = [
  { value: 'account', label: 'Account', content: 'Account settings' },
  { value: 'profile', label: 'Profile', content: 'Profile settings' },
]

/** Renders the two dialogs over their projected slots. */
const DialogsHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-dialogs',
  standalone: true,
  imports: [ConfirmDialog, PromptDialog],
  template: `
    <mol-confirm-dialog [open]="true">
      <div slot="title">Delete vault?</div>
      <span slot="description">This action cannot be undone.</span>
    </mol-confirm-dialog>
    <mol-prompt-dialog
      [open]="true"
      [onSubmit]="noop"
      [description]="'The slug updates automatically.'"
    >
      <div slot="title">Rename board</div>
    </mol-prompt-dialog>
    <mol-prompt-dialog [open]="true" [onSubmit]="noop">
      <div slot="title">Rename board</div>
    </mol-prompt-dialog>
  `,
})(
  class SpecDialogsHost {
    /** No-op submit callback (never invoked here). */
    noop = (): void => {}
  },
)

/** Renders a ConfirmDialog with no projected description. */
const NoDescriptionConfirmHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-confirm-no-description',
  standalone: true,
  imports: [ConfirmDialog],
  template: `<mol-confirm-dialog [open]="true">
    <div slot="title">Delete vault?</div>
  </mol-confirm-dialog>`,
})(class SpecNoDescriptionHost {})

/** Renders the two dialogs with no title input and a projected title the consumer does not pass. */
const NoTitleHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-dialogs-no-title',
  standalone: true,
  imports: [ConfirmDialog, PromptDialog],
  template: `
    <mol-confirm-dialog [open]="true" [description]="'This action cannot be undone.'">
      @if (showTitle) {
        <div slot="title">Delete vault?</div>
      }
    </mol-confirm-dialog>
    <mol-prompt-dialog [open]="true" [onSubmit]="noop">
      @if (showTitle) {
        <div slot="title">Rename board</div>
      }
    </mol-prompt-dialog>
  `,
})(
  class SpecNoTitleHost {
    /** Whether the consumer passes the title (it does not). */
    showTitle = false
    /** No-op submit callback (never invoked here). */
    noop = (): void => {}
  },
)

/** Renders the Tabs over an items array with and without content. */
const TabsHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-tabs',
  standalone: true,
  imports: [Tabs],
  template: `<div mol-tabs [items]="items"></div>`,
})(
  class SpecTabsHost {
    /** The tabs under test. */
    items: Array<Record<string, unknown>> = TABS_ITEMS
  },
)

/** Renders the account card with a settings panel body. */
const SidebarHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-sidebar',
  standalone: true,
  imports: [SidebarUserCard],
  template: `<mol-sidebar-user-card><div>panel body</div></mol-sidebar-user-card>`,
})(class SpecSidebarHost {})

let appRef: ApplicationRef
const views: Array<{ destroy: () => void }> = []

beforeEach(async () => {
  if (!appRef)
    appRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
  document.body.innerHTML = ''
})

afterEach(() => {
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a spec host component into the body and runs one change-detection
 * pass (the components' view-init wiring — portals, rest-attribute moves —
 * runs during it).
 * @param component - The spec host component type.
 * @returns The host element.
 */
async function mountHost(component: Type<unknown>): Promise<HTMLElement> {
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  views.push(ref)
  appRef.tick()
  await Promise.resolve()
  return host
}

describe('dialog and drawer accessible names', () => {
  it("ConfirmDialog's dialog aria-labelledby resolves to the title text", async () => {
    await mountHost(DialogsHost)
    const dialogs = [...document.querySelectorAll('[role="dialog"]')]
    expect(dialogs.length).toBe(3)
    const dialog = dialogs[0]!
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Delete vault?')
  })

  it("ConfirmDialog's dialog aria-describedby resolves to the description text", async () => {
    await mountHost(DialogsHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][0]!
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('This action cannot be undone.')
  })

  it('ConfirmDialog carries no aria-describedby without a description', async () => {
    await mountHost(NoDescriptionConfirmHost)
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it("PromptDialog's dialog aria-labelledby resolves to the title text", async () => {
    await mountHost(DialogsHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][1]!
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Rename board')
  })

  it("PromptDialog's dialog aria-describedby resolves to the rendered description", async () => {
    await mountHost(DialogsHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][1]!
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('The slug updates automatically.')
  })

  it('ConfirmDialog points its dialog at no heading when the title renders nothing', async () => {
    await mountHost(NoTitleHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][0]!
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    const heading = dialog.querySelector('h2')
    expect(heading).not.toBeNull()
    expect(heading!.id).toBe('')
  })

  it('PromptDialog points its dialog at no heading when the title renders nothing', async () => {
    await mountHost(NoTitleHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][1]!
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    const heading = dialog.querySelector('h2')
    expect(heading).not.toBeNull()
    expect(heading!.id).toBe('')
  })

  it('PromptDialog carries no aria-describedby without a description', async () => {
    await mountHost(DialogsHost)
    const dialog = [...document.querySelectorAll('[role="dialog"]')][2]!
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it('the SidebarUserCard drawer has the translated label', async () => {
    const host = await mountHost(SidebarHost)
    const trigger = host.querySelector('[data-mol-id="sidebar-user-card"]') as HTMLElement
    expect(trigger).not.toBeNull()
    trigger.click()
    appRef.tick()
    await Promise.resolve()
    const drawer = document.querySelector('[role="dialog"]') as HTMLElement
    expect(drawer).not.toBeNull()
    expect(drawer.getAttribute('aria-label')).toBe('Konto')
  })
})

describe('Tabs aria-controls', () => {
  it('the active tab with content has an aria-controls that resolves to the rendered panel', async () => {
    await mountHost(TabsHost)
    const active = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'Account',
    ) as HTMLElement
    const controls = active.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    const panel = document.getElementById(controls!)
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.textContent).toContain('Account settings')
  })

  it('a tab whose panel is not rendered has no aria-controls', async () => {
    await mountHost(TabsHost)
    const inactive = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'Profile',
    ) as HTMLElement
    expect(inactive.getAttribute('aria-controls')).toBeNull()
  })

  it('an active tab without content has no aria-controls', async () => {
    const NoContentHost = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-tabs-no-content',
      standalone: true,
      imports: [Tabs],
      template: `<div mol-tabs [items]="items" [value]="'b'"></div>`,
    })(
      class SpecTabsNoContentHost {
        /** One tab with content, one without; the content-less tab is active. */
        items: Array<Record<string, unknown>> = [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B' },
        ]
      },
    )
    await mountHost(NoContentHost)
    const active = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'B',
    ) as HTMLElement
    expect(active.getAttribute('aria-controls')).toBeNull()
    expect(document.querySelector('[role="tabpanel"]')).toBeNull()
  })

  it('no tab carries aria-controls when no item has content', async () => {
    const EmptyHost = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-tabs-empty',
      standalone: true,
      imports: [Tabs],
      template: `<div mol-tabs [items]="items"></div>`,
    })(
      class SpecTabsEmptyHost {
        /** Tabs without content. */
        items: Array<Record<string, unknown>> = TABS_ITEMS.map(({ value, label }) => ({
          value,
          label,
        }))
      },
    )
    await mountHost(EmptyHost)
    for (const tab of document.querySelectorAll('[role="tab"]'))
      expect(tab.getAttribute('aria-controls')).toBeNull()
  })
})

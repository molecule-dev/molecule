// @vitest-environment jsdom
/**
 * Render tests for the node-valued props React passes as props (the Angular
 * form is a `string | number | TemplateRef<unknown>` input) and for the
 * inputs added to make those parity props reachable.
 *
 * Each case mounts the component the way an app does, feeding the prop the
 * React component renders, and asserts the rendered text — the same shape
 * React's own render tests use, so a binding that stops rendering the value
 * fails here rather than only in a type test.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => {
  /**
   * The ClassMap stand-in: tokens the templates CALL resolve to functions,
   * every other token to its own name.
   *
   * @returns The proxied ClassMap.
   */
  const getClassMap = (): unknown => {
    const CALLABLE = new Set([
      'alert',
      'alertLeftAccent',
      'button',
      'cn',
      'flex',
      'fontWeight',
      'h',
      'input',
      'label',
      'minH',
      'modal',
      'position',
      'sp',
      'stack',
      'textSize',
      'w',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  }
  return { ...(await importOriginal<Record<string, unknown>>()), getClassMap }
})

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  return {
    ...actual,
    // The guard case renders the loading branch; the other components here
    // never read auth state.
    useAuth: () => ({ status: signal('loading'), isAuthenticated: signal(false) }),
    useRouter: () => ({
      location: signal({ pathname: '/', search: '', hash: '' }),
      params: signal({}),
      query: signal({}),
      navigate: () => {},
      navigateTo: () => {},
      back: () => {},
      forward: () => {},
      isActive: () => false,
    }),
    useTranslation: () => ({
      t: (_key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? _key,
      locale: () => 'en',
      locales: () => [{ code: 'en', name: 'English' }],
      setLocale: async () => {},
    }),
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { AuthGuard } = await import('../components/auth-guard.component.js')
const { ConfirmButton } = await import('../components/confirm-button.component.js')
const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')
const { LoadErrorBanner } = await import('../components/load-error-banner.component.js')
const { OptimisticToggleButton } =
  await import('../components/optimistic-toggle-button.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')
const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
} = await import('../components/responsive-app-shell.component.js')

/**
 * Mounts a spec host.
 *
 * @param host - The host component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The fixture.
 */
function render<T>(host: Type<T>, configure?: (instance: T) => void): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(host)
  fixture.detectChanges()
  if (configure) configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

/** jsdom's `matchMedia`, controllable per test. */
let viewportMatches = false

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: viewportMatches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
  viewportMatches = false
})

describe('ConfirmDialog node props', () => {
  it('renders the title, description and labels given as inputs', () => {
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-confirm-node',
      standalone: true,
      imports: [ConfirmDialog],
      template: `<mol-confirm-dialog
        [open]="true"
        [title]="title"
        [description]="description"
        [confirmLabel]="confirmLabel"
        [cancelLabel]="cancelLabel"
      ></mol-confirm-dialog>`,
    })(
      class ConfirmNodeHost {
        /** React's `title` node prop. */
        title = 'Delete vault?'
        /** React's `description` node prop. */
        description = 'This cannot be undone.'
        /** React's `confirmLabel` node prop. */
        confirmLabel = 'Delete'
        /** React's `cancelLabel` node prop. */
        cancelLabel = 'Keep it'
      },
    )
    render(Host)
    expect(within(document.body).getByText('Delete vault?')).toBeTruthy()
    expect(within(document.body).getByText('This cannot be undone.')).toBeTruthy()
    expect(within(document.body).getByText('Delete')).toBeTruthy()
    expect(within(document.body).getByText('Keep it')).toBeTruthy()
  })
})

describe('PromptDialog node props', () => {
  it('renders the title, description and labels given as inputs', () => {
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-prompt-node',
      standalone: true,
      imports: [PromptDialog],
      template: `<mol-prompt-dialog
        [open]="true"
        [title]="title"
        [description]="description"
        [confirmLabel]="confirmLabel"
        [cancelLabel]="cancelLabel"
        [onSubmit]="noop"
      ></mol-prompt-dialog>`,
    })(
      class PromptNodeHost {
        /** React's `title` node prop. */
        title = 'Rename board'
        /** React's `description` node prop. */
        description = 'The slug updates automatically.'
        /** React's `confirmLabel` node prop. */
        confirmLabel = 'Save'
        /** React's `cancelLabel` node prop. */
        cancelLabel = 'Back'
        /** The submit callback. */
        noop = (): void => {}
      },
    )
    render(Host)
    expect(within(document.body).getByText('Rename board')).toBeTruthy()
    expect(within(document.body).getByText('The slug updates automatically.')).toBeTruthy()
    expect(within(document.body).getByText('Save')).toBeTruthy()
    expect(within(document.body).getByText('Back')).toBeTruthy()
  })
})

describe('LoadErrorBanner node props', () => {
  it('renders the message, detail and retry label given as inputs', () => {
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-banner-node',
      standalone: true,
      imports: [LoadErrorBanner],
      template: `<div
        mol-load-error-banner
        [message]="'Could not load decks.'"
        [detail]="'HTTP 503'"
        [retryLabel]="retryLabel"
        [onRetry]="noop"
      ></div>`,
    })(
      class BannerNodeHost {
        /** React's `retryLabel` node prop. */
        retryLabel = 'Try again'
        /** The retry callback. */
        noop = (): void => {}
      },
    )
    render(Host)
    expect(within(document.body).getByText('Could not load decks.')).toBeTruthy()
    expect(within(document.body).getByText('HTTP 503')).toBeTruthy()
    expect(within(document.body).getByText('Try again')).toBeTruthy()
  })
})

describe('OptimisticToggleButton node props', () => {
  it('renders both labels given as inputs and switches on save', () => {
    const commit = vi.fn(async (desired: boolean) => desired)
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-optimistic-node',
      standalone: true,
      imports: [OptimisticToggleButton],
      template: `<button
        mol-optimistic-toggle-button
        [value]="false"
        [commit]="commit"
        [activeLabel]="'Unstar'"
        [inactiveLabel]="'Star'"
      ></button>`,
    })(
      class OptimisticNodeHost {
        /** The save callback. */
        commit = commit
      },
    )
    const fixture = render(Host)
    expect(within(document.body).getByText('Star')).toBeTruthy()
    fireEvent.click(within(document.body).getByText('Star'))
    fixture.detectChanges()
    expect(commit).toHaveBeenCalledWith(true)
    expect(within(document.body).getByText('Unstar')).toBeTruthy()
  })
})

describe('ConfirmButton node labels', () => {
  it('renders the label inputs and walks idle → armed → pending → idle', async () => {
    const onConfirm = vi.fn(async () => {})
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-confirm-button-node',
      standalone: true,
      imports: [ConfirmButton],
      template: `<button
        mol-confirm-button
        [label]="'Delete'"
        [confirmLabel]="'Sure?'"
        [pendingLabel]="'Working…'"
        [onConfirm]="onConfirm"
        [disarmSeconds]="0"
      ></button>`,
    })(
      class ConfirmButtonNodeHost {
        /** The confirm callback. */
        onConfirm = onConfirm
      },
    )
    const fixture = render(Host)
    expect(within(document.body).getByText('Delete')).toBeTruthy()
    fireEvent.click(within(document.body).getByText('Delete'))
    fixture.detectChanges()
    expect(within(document.body).getByText('Sure?')).toBeTruthy()
    fireEvent.click(within(document.body).getByText('Sure?'))
    fixture.detectChanges()
    expect(within(document.body).getByText('Working…')).toBeTruthy()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await fixture.whenStable()
    fixture.detectChanges()
    expect(within(document.body).getByText('Delete')).toBeTruthy()
  })
})

describe('AuthGuard loadingFallback', () => {
  it('renders the fallback input instead of the default loading tag', () => {
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-guard-node',
      standalone: true,
      imports: [AuthGuard],
      template: `<mol-auth-guard [loadingFallback]="'Please wait'"></mol-auth-guard>`,
    })(class GuardNodeHost {})
    render(Host)
    expect(within(document.body).getByText('Please wait')).toBeTruthy()
    expect(document.body.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
  })
})

describe('ResponsiveAppShell node props', () => {
  it('renders the top bar brand/actions and the mobile drawer header/footer', () => {
    const Host = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-shell-node',
      standalone: true,
      imports: [
        ResponsiveAppShell,
        ResponsiveAppShellTopBar,
        ResponsiveAppShellSidebar,
        ResponsiveAppShellDrawer,
        ResponsiveAppShellContent,
      ],
      template: `<div mol-responsive-app-shell>
        <header
          mol-responsive-app-shell-topbar
          [brand]="'Timetrack'"
          [actions]="'Sign in'"
        ></header>
        <aside mol-responsive-app-shell-sidebar [footer]="'Sidebar footer'">
          <a href="/dashboard">Dashboard</a>
        </aside>
        <mol-responsive-app-shell-drawer [header]="'Menu'" [footer]="'Drawer footer'">
          <a href="/dashboard">Dashboard</a>
        </mol-responsive-app-shell-drawer>
        <main mol-responsive-app-shell-content>Page</main>
      </div>`,
    })(class ShellNodeHost {})
    const fixture = render(Host)
    expect(within(document.body).getByText('Timetrack')).toBeTruthy()
    expect(within(document.body).getByText('Sign in')).toBeTruthy()
    // Below the breakpoint the drawer is the nav; open it from the top bar.
    fireEvent.click(document.body.querySelector('[data-mol-id="shell-drawer-open"]') as Element)
    fixture.detectChanges()
    expect(within(document.body).getByText('Menu')).toBeTruthy()
    expect(within(document.body).getByText('Drawer footer')).toBeTruthy()
  })
})

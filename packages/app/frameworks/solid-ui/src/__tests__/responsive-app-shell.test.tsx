// @vitest-environment jsdom
/**
 * Render tests for the `ResponsiveAppShell` family, ported from
 * `@molecule/app-ui-react`: the mobile shell (top bar + dialog drawer) and the
 * desktop shell (sidebar) mount per the 768px breakpoint, and the drawer
 * implements the dialog a11y contract (focus trap/restore, Escape, backdrop,
 * scroll lock, route-change auto-close).
 *
 * Solid has no re-render API to simulate a navigation, so the mocked
 * `useLocation` returns a reactive signal the tests advance — the same
 * observation the reference makes through `rerender`. Same inputs, same DOM,
 * same expected values.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// matchMedia mock. jsdom has no `window.matchMedia`; the shell reads it
// synchronously when it is created, so tests set `matches` BEFORE rendering.
// `setDesktop` + `fireViewportChange` simulate crossing 768px.
// ---------------------------------------------------------------------------
let matches = false
const changeListeners = new Set<(event: { matches: boolean }) => void>()

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes
                .flat(Infinity)
                .map((c) => (typeof c === 'function' ? c() : c))
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => {
  const { shellLocation } = await import('./responsive-app-shell-location-fixture.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useLocation: () => shellLocation,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { setShellLocation } from './responsive-app-shell-location-fixture.js'

const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
  useIsDesktop,
} = await import('../components/ResponsiveAppShell.jsx')

const disposers: Array<() => void> = []

/**
 * Sets the viewport class the mocked matchMedia reports.
 *
 * @param next - Whether the viewport is desktop-wide.
 */
function setDesktop(next: boolean): void {
  matches = next
}

/** Fires the `change` listeners every mounted matchMedia subscription holds. */
function fireViewportChange(): void {
  for (const listener of [...changeListeners]) listener({ matches })
}

beforeEach(() => {
  setDesktop(false)
  changeListeners.clear()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.add(cb)
      },
      removeEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.delete(cb)
      },
    }),
  })
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  setShellLocation({ pathname: '/dashboard', search: '', hash: '', key: 'key-0' })
})

/**
 * Mounts a Solid view into a fresh container.
 *
 * @param view - The view to render.
 * @returns The container the view rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** Fresh nav links, created per mount (Solid renders real DOM nodes). */
function nav(): JSX.Element {
  return (
    <>
      <a href="/dashboard">Dashboard</a>
      <a href="/projects">Projects</a>
      <a href="/reports">Reports</a>
    </>
  )
}

/**
 * The canonical shell composition.
 *
 * @param props - Whether the top bar is mobile-only.
 * @returns The composed shell.
 */
function Shell(props: { mobileOnlyTopBar?: boolean }): JSX.Element {
  return (
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar
        brand={<span>Timetrack</span>}
        mobileOnly={props.mobileOnlyTopBar}
      />
      <ResponsiveAppShell.Sidebar>{nav()}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer>{nav()}</ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <p>Page body</p>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

/** The mobile shell's menu trigger. */
function trigger(): HTMLElement {
  return within(document.body).getByRole('button', { name: 'Open navigation menu' })
}

/** The drawer's close button. */
function closeButton(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-mol-id="shell-drawer-close"]')
  if (!element) throw new Error('expected the drawer close button')
  return element
}

describe('ResponsiveAppShell on mobile (<768px)', () => {
  it('renders top bar + content, with the sidebar unmounted and the drawer closed by default', () => {
    mount(() => <Shell />)
    expect(within(document.body).getByRole('banner')).toBeDefined()
    expect(within(document.body).getByRole('main')).toBeDefined()
    expect(within(document.body).getByText('Page body')).toBeDefined()
    // Desktop chrome must not exist — not even CSS-hidden.
    expect(within(document.body).queryByRole('complementary')).toBeNull()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
    // The trigger is present, wired to the (absent) panel, and reports closed.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().getAttribute('aria-controls')).toBeTruthy()
  })

  it('the trigger opens the drawer dialog, moves focus into it, and reports expanded', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())

    const dialog = within(document.body).getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Primary navigation')
    expect(dialog.getAttribute('data-mol-id')).toBe('shell-drawer')
    // A nav landmark lives INSIDE the dialog, carrying the consumer's links.
    expect(within(dialog).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(dialog).getByRole('link', { name: 'Projects' })).toBeDefined()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    // Focus moved into the panel, and the trigger's aria-controls resolves to
    // the panel's actual id.
    expect(document.activeElement).toBe(closeButton())
    expect(dialog.id).toBe(trigger().getAttribute('aria-controls'))
    // Body scroll locks while the drawer is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Escape closes the drawer, unlocks scroll, and restores focus to the trigger', () => {
    mount(() => <Shell />)
    // fireEvent.click does not move focus — a real user's pointer click does,
    // so focus the trigger first to make the restore assertion meaningful.
    trigger().focus()
    fireEvent.click(trigger())
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(within(document.body).queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger())
  })

  it('unmounting the shell with the drawer open returns focus to the element focused before it opened', () => {
    // Focused outside the shell, so the restore target survives the shell's removal (a click
    // through fireEvent does not move focus to the trigger).
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    mount(() => <Shell />)
    fireEvent.click(trigger())
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    for (const dispose of disposers.splice(0)) dispose()

    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('a backdrop click closes the drawer but a click inside the panel does not', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    const dialog = within(document.body).getByRole('dialog')

    // Click on a link inside the panel — the panel stops propagation.
    fireEvent.click(within(dialog).getByText('Dashboard'))
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    // Click on the fixed backdrop wrapper (the panel's parent).
    const wrapper = dialog.parentElement
    if (!wrapper) throw new Error('expected the drawer wrapper')
    fireEvent.click(wrapper)
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('the close button closes the drawer', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    fireEvent.click(within(document.body).getByRole('button', { name: 'Close navigation menu' }))
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('Tab wraps from the last link back to the first tab stop (focus trap)', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    const dialog = within(document.body).getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    const last = links[links.length - 1]
    if (!last) throw new Error('expected the drawer links')
    last.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(closeButton())
  })

  it('Shift+Tab from the first tab stop wraps to the last link', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    closeButton().focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    const dialog = within(document.body).getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    expect(document.activeElement).toBe(links[links.length - 1])
  })

  it('closes on SPA navigation so it never covers the next page', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    setShellLocation({ pathname: '/projects', search: '', hash: '', key: 'key-1' })

    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('closes on a same-route #top navigation — hash-only changes dismiss too', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    // The fleet's safe-target pattern appends a hash to the CURRENT path:
    // pathname and search are unchanged, only the router key moves.
    setShellLocation({ pathname: '/dashboard', search: '', hash: '#top', key: 'key-2' })

    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('carries the fleet data-mol-id defaults for locators', () => {
    mount(() => <Shell />)
    expect(document.querySelector('[data-mol-id="shell-root"]')).toBeDefined()
    expect(document.querySelector('[data-mol-id="shell-topbar"]')).toBeDefined()
    expect(trigger().getAttribute('data-mol-id')).toBe('shell-drawer-open')
    expect(document.querySelector('[data-mol-id="shell-content"]')).toBeDefined()
  })
})

describe('ResponsiveAppShell on desktop (>=768px)', () => {
  it('renders the sidebar nav landmarks + content, with no trigger and no drawer', () => {
    setDesktop(true)
    mount(() => <Shell />)

    const aside = within(document.body).getByRole('complementary')
    expect(aside.getAttribute('data-mol-id')).toBe('shell-sidebar')
    const navLandmark = within(aside).getByRole('navigation')
    expect(navLandmark.getAttribute('aria-label')).toBe('Primary navigation')
    expect(within(aside).getByRole('link', { name: 'Reports' })).toBeDefined()
    expect(within(document.body).getByRole('main')).toBeDefined()

    // Mobile chrome must not exist — the drawer is inert on desktop.
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('does not render the top bar when mobileOnly is set', () => {
    setDesktop(true)
    mount(() => <Shell mobileOnlyTopBar />)
    expect(within(document.body).queryByRole('banner')).toBeNull()
  })

  it('still renders the top bar on mobile when mobileOnly is set', () => {
    mount(() => <Shell mobileOnlyTopBar />)
    expect(within(document.body).getByRole('banner')).toBeDefined()
  })

  it('applies the sidebarWidth preset to the sidebar geometry', () => {
    setDesktop(true)
    mount(() => (
      <ResponsiveAppShell sidebarWidth="lg">
        <ResponsiveAppShell.Sidebar>{nav()}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>
    ))
    expect(within(document.body).getByRole('complementary').style.width).toBe('256px')
  })

  it('accepts an exact pixel sidebarWidth', () => {
    setDesktop(true)
    mount(() => (
      <ResponsiveAppShell sidebarWidth={300}>
        <ResponsiveAppShell.Sidebar>{nav()}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>
    ))
    expect(within(document.body).getByRole('complementary').style.width).toBe('300px')
  })
})

describe('ResponsiveAppShell across the breakpoint', () => {
  it('swaps the shell wholesale when the viewport crosses 768px', () => {
    mount(() => <Shell />)
    expect(trigger()).toBeDefined()

    setDesktop(true)
    fireViewportChange()

    expect(within(document.body).queryByRole('complementary')).not.toBeNull()
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(within(document.body).queryByRole('banner')).not.toBeNull()

    setDesktop(false)
    fireViewportChange()

    expect(within(document.body).queryByRole('complementary')).toBeNull()
    expect(trigger()).toBeDefined()
  })

  it('an open drawer closes on desktop-crossing resize and does not resurface back on mobile', () => {
    mount(() => <Shell />)
    fireEvent.click(trigger())
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    setDesktop(true)
    fireViewportChange()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    setDesktop(false)
    fireViewportChange()
    // The logical open state was dropped at the crossing — no surprise drawer.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })
})

describe('ResponsiveAppShell contract', () => {
  it('exposes the sub-components both as dot-properties and named exports', () => {
    expect(ResponsiveAppShell.TopBar).toBe(ResponsiveAppShellTopBar)
    expect(ResponsiveAppShell.Sidebar).toBe(ResponsiveAppShellSidebar)
    expect(ResponsiveAppShell.Drawer).toBe(ResponsiveAppShellDrawer)
    expect(ResponsiveAppShell.Content).toBe(ResponsiveAppShellContent)
  })

  it('throws a directive error when a sub-component renders outside the shell', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => mount(() => <ResponsiveAppShellTopBar />)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
      expect(() => mount(() => <ResponsiveAppShellDrawer>x</ResponsiveAppShellDrawer>)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('hides the menu trigger when no Drawer is composed', () => {
    mount(() => (
      <ResponsiveAppShell>
        <ResponsiveAppShell.TopBar />
        <ResponsiveAppShell.Sidebar>{nav()}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>
    ))
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
  })
})

describe('useIsDesktop', () => {
  it('reads matchMedia synchronously on first render and follows change events', () => {
    setDesktop(true)
    mount(() => <span data-probe>{useIsDesktop() ? 'desktop' : 'mobile'}</span>)
    const probe = document.querySelector('[data-probe]')
    if (!probe) throw new Error('expected the probe')
    expect(probe.textContent).toBe('desktop')

    setDesktop(false)
    fireViewportChange()
    expect(probe.textContent).toBe('mobile')
  })

  it('returns false (mobile shell) in non-browser environments', () => {
    const original = window.matchMedia
    Reflect.deleteProperty(window, 'matchMedia')
    try {
      mount(() => <span data-probe>{useIsDesktop() ? 'desktop' : 'mobile'}</span>)
      const probe = document.querySelector('[data-probe]')
      if (!probe) throw new Error('expected the probe')
      expect(probe.textContent).toBe('mobile')
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: original,
      })
    }
  })
})

// @vitest-environment jsdom
import type { Context, JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as SolidBinding from '@molecule/app-solid'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `headerBar`), so tests can assert which cm.* call was applied without a
// real bond — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Flex: (props: { children?: JSX.Element }) => <div data-flex="">{props.children}</div>,
  ThemeToggle: () => <button type="button" data-theme-toggle="" />,
  // UserMenu takes its settings panel as CHILDREN (the real API) — render them
  // so the documented @example composition can be exercised through AppHeader.
  UserMenu: (props: { children?: JSX.Element }) => <div data-user-menu="">{props.children}</div>,
}))

// Real Solid contexts so the header's default theme-toggle can probe for
// provider presence. `useContext` returns `undefined` when a Provider is
// absent (it does NOT throw), which is exactly what makes the header degrade
// gracefully instead of crashing the real hook-calling ThemeToggle. The brand
// link is the binding's real `Link`, over the real router context.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidBinding>()
  const { createContext } = await import('solid-js')
  return {
    ThemeContext: createContext<unknown>(),
    I18nContext: createContext<unknown>(),
    Link: actual.Link,
    RouterContext: actual.RouterContext,
  }
})

const { AppHeader } = await import('../AppHeader.jsx')
const { ThemeContext, I18nContext } = (await import('@molecule/app-solid')) as unknown as {
  ThemeContext: Context<unknown>
  I18nContext: Context<unknown>
}
const { RouterContext } = await import('@molecule/app-solid')
const { UserMenu } = (await import('@molecule/app-ui-solid')) as unknown as {
  UserMenu: (props: { children?: JSX.Element }) => JSX.Element
}

const disposers: Array<() => void> = []

/** The router every mount sits inside (a wired app always has one). */
let router = createMemoryRouter({ initialEntries: ['/settings'] })

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  router = createMemoryRouter({ initialEntries: ['/settings'] })
})

/** Render with Solid's browser renderer, inside the router, and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => <RouterContext.Provider value={router}>{view()}</RouterContext.Provider>,
      container,
    ),
  )
  return container
}

/**
 * Wrap a view in both Theme + I18n providers (the state a real wired app has).
 * Takes the view as a thunk and creates it INSIDE the providers: Solid's JSX
 * instantiates a component eagerly at the call site, so a node built outside
 * would render above the providers and miss their contexts.
 */
const withProviders = (view: () => JSX.Element): JSX.Element => (
  <ThemeContext.Provider value={{}}>
    <I18nContext.Provider value={{}}>{view()}</I18nContext.Provider>
  </ThemeContext.Provider>
)

describe('AppHeader', () => {
  it('renders the appName and the logo image', () => {
    const container = mount(() => <AppHeader appName="Acme" />)
    expect(container.innerHTML).toContain('Acme')
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.innerHTML).toContain('src="/logo.svg"')
  })

  it('honours a custom logoSrc and logoSize', () => {
    const container = mount(() => <AppHeader appName="Acme" logoSrc="/brand.png" logoSize={48} />)
    expect(container.innerHTML).toContain('src="/brand.png"')
    expect(container.innerHTML).toContain('width="48"')
  })

  it('links the brand to "/" by default and to a custom brandTo', () => {
    expect(mount(() => <AppHeader appName="Acme" />).innerHTML).toContain('href="/"')
    expect(mount(() => <AppHeader appName="Acme" brandTo="/home" />).innerHTML).toContain(
      'href="/home"',
    )
  })

  it('navigates in-app when the brand link is clicked plainly', () => {
    const container = mount(() => <AppHeader appName="Acme" />)
    container.querySelector('a')?.click()
    expect(router.getLocation().pathname).toBe('/')
  })

  it('mounts without Theme/I18n providers WITHOUT throwing', () => {
    expect(() => mount(() => <AppHeader appName="Acme" />)).not.toThrow()
    // The header still renders (brand is present) — it just degrades the toggle.
    expect(mount(() => <AppHeader appName="Acme" />).innerHTML).toContain('Acme')
  })

  it('omits the default theme toggle when Theme/I18n providers are absent', () => {
    expect(
      mount(() => <AppHeader appName="Acme" />).querySelector('[data-theme-toggle]'),
    ).toBeNull()
  })

  it('omits the default toggle when only ONE of the two providers is present', () => {
    const onlyTheme = mount(() => (
      <ThemeContext.Provider value={{}}>
        <AppHeader appName="Acme" />
      </ThemeContext.Provider>
    ))
    expect(onlyTheme.querySelector('[data-theme-toggle]')).toBeNull()
    const onlyI18n = mount(() => (
      <I18nContext.Provider value={{}}>
        <AppHeader appName="Acme" />
      </I18nContext.Provider>
    ))
    expect(onlyI18n.querySelector('[data-theme-toggle]')).toBeNull()
  })

  it('renders the default theme toggle once BOTH providers are mounted', () => {
    expect(
      mount(() => withProviders(() => <AppHeader appName="Acme" />)).querySelector(
        '[data-theme-toggle]',
      ),
    ).not.toBeNull()
  })

  it('hides the toggle when themeToggle is null even with providers, and honours a custom node', () => {
    expect(
      mount(() =>
        withProviders(() => <AppHeader appName="Acme" themeToggle={null} />),
      ).querySelector('[data-theme-toggle]'),
    ).toBeNull()
    expect(
      mount(() => <AppHeader appName="Acme" themeToggle={<span data-custom-toggle="" />} />)
        .innerHTML,
    ).toContain('data-custom-toggle=""')
  })

  it('renders the documented UserMenu-as-userMenu composition (children API, no renderPanel)', () => {
    // Mirrors the module @example: UserMenu receives its settings panel as
    // CHILDREN — proving the documented prop shape is the real one.
    const container = mount(() => (
      <AppHeader
        appName="Bearing"
        userMenu={
          <UserMenu>
            <div data-settings-panel="">Settings</div>
          </UserMenu>
        }
      />
    ))
    expect(container.innerHTML).toContain('data-user-menu=""')
    expect(container.innerHTML).toContain('data-settings-panel=""')
  })

  it('renders the userMenu and extraActions slots', () => {
    const container = mount(() => (
      <AppHeader
        appName="Acme"
        userMenu={<div data-user-menu="" />}
        extraActions={<div data-extra="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-user-menu=""')
    expect(container.innerHTML).toContain('data-extra=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => (
      <AppHeader appName="Acme" dataMolId="hdr-x" className="hdr-cls" />
    ))
    expect(container.innerHTML).toContain('data-mol-id="hdr-x"')
    expect(container.innerHTML).toContain('hdr-cls')
  })
})

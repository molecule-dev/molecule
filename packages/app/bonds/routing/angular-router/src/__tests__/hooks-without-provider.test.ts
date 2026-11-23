// @vitest-environment jsdom
/**
 * The React routing bond's `hooks-without-provider.test.tsx`, carried to the Angular
 * Router bond: `useMoleculeRouter`, `useMoleculeQuery`, `useMoleculeNavigate` and
 * `useIsActive` work inside any booted Angular application that has Angular's `Router`,
 * with or without `provideMoleculeRouter`.
 *
 * Every case boots a REAL Angular Router through {@link bootApp}. "MemoryRouter" is
 * Angular's native memory history (`provideLocationMocks()`); the `it.each` rows run the
 * same page on Angular's browser history and on its memory history — the two routers
 * Angular has, where React had a package and a native router of each kind. The
 * "outside any router" rows call the hooks outside any booted injector, which is how an
 * Angular application fails to have a router at all.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRouter, navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import {
  createAngularRouter,
  provideMoleculeRouter,
  type RouteDefinition,
  useIsActive,
  useMoleculeNavigate,
  useMoleculeQuery,
  useMoleculeRouter,
} from '../index.js'
import { bootApp, type BootedApp } from './angular-app.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()
const OUTSIDE_ROUTER =
  "`useMoleculeRouter` must be called in an injection context of an Angular app that provides the router. Add `provideRouter(routes)` to the app's providers."

/**
 * Serializes a value for an assertion.
 *
 * @param value - Anything JSON can hold.
 * @returns Its JSON text.
 */
const json = (value: unknown): string => JSON.stringify(value)

/** A page that shows only the query, so a case can read it from the document. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-query-probe',
  standalone: true,
  template: '<output aria-label="query">{{ json(query()) }}</output>',
})
class QueryProbeComponent {
  readonly query = useMoleculeQuery()
  /** Serializes a value for the assertion. */
  json = json
}

/** A page whose navigate function and location the case drives together. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-navigate-probe',
  standalone: true,
  template: '',
})
class NavigateProbeComponent {
  readonly navigate = useMoleculeNavigate()
  private readonly router = useMoleculeRouter()
  private readonly location = signal(this.router.getLocation())

  constructor() {
    inject(DestroyRef).onDestroy(
      this.router.subscribe(() => this.location.set(this.router.getLocation())),
    )
  }

  /** The committed path, as React Router's `useLocation` reports it. */
  path(): { pathname: string; search: string } {
    const { pathname, search } = this.location()
    return { pathname, search }
  }
}

/** A page that asks three active-path questions at once. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-active-probe',
  standalone: true,
  template: '',
})
class ActiveProbeComponent {
  readonly partial = useIsActive('/settings', false)
  readonly exact = useIsActive('/settings', true)
  readonly other = useIsActive('/other')
}

/** An app root with an outlet that holds the router a consumer gets without a provider. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-router-probe',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RouterProbeComponent {
  readonly router = useMoleculeRouter()
}

/** The settings page the `it.each` rows drive through all four hooks. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-settings',
  standalone: true,
  template: `
    <output aria-label="query">{{ json(query()) }}</output>
    <output aria-label="active">{{ activeLabel() }}</output>
    <output aria-label="location">{{ locationLabel() }}</output>
    <output aria-label="state">{{ json(state()) }}</output>
    <button (click)="profileTab()">Profile tab</button>
    <button (click)="preferences()">Preferences</button>
  `,
})
class SettingsComponent {
  readonly query = useMoleculeQuery()
  readonly active = useIsActive('/settings', false)
  readonly navigate = useMoleculeNavigate()
  private readonly router = useMoleculeRouter()
  private readonly location = signal(this.router.getLocation())

  constructor() {
    inject(DestroyRef).onDestroy(
      this.router.subscribe(() => this.location.set(this.router.getLocation())),
    )
  }

  /** Serializes a value for the assertion. */
  json = json

  /** The active flag as text, the way React's case read `String(active)`. */
  activeLabel(): string {
    return String(this.active())
  }

  /** The committed `pathname + search + hash`. */
  locationLabel(): string {
    const { pathname, search, hash } = this.location()
    return pathname + search + hash
  }

  /** The committed entry's application state (Angular's own keys stripped). */
  state(): unknown {
    return this.location().state
  }

  /** Switches to the profile tab through the hook's navigate. */
  profileTab(): void {
    void this.navigate('?tab=profile', { state: { source: 'tabs' } })
  }

  /** Navigates to an absolute page through the router's own navigate. */
  preferences(): void {
    void this.router.navigate('/preferences?tab=notifications#email')
  }
}

/** The Angular routers this bond runs over: the browser history and the memory one. */
const routers = [
  { name: 'Angular Router with the browser history', memory: false },
  { name: 'Angular Router with a memory history', memory: true },
] as const

const booted: BootedApp[] = []

/**
 * Boots one application and remembers it for teardown.
 *
 * @param options - What the application boots with.
 * @returns The booted application.
 */
const boot = async (options: Parameters<typeof bootApp>[0]): Promise<BootedApp> => {
  const app = await bootApp(options)
  booted.push(app)
  return app
}

/**
 * Reads the text of one labelled output in a booted page.
 *
 * @param app - The booted application.
 * @param label - The output's `aria-label`.
 * @returns Its text, or `null` when the page rendered none.
 */
const output = (app: BootedApp, label: string): string | null =>
  app.host.querySelector(`[aria-label="${label}"]`)?.textContent ?? null

/**
 * Clicks the button with the given label.
 *
 * @param app - The booted application.
 * @param label - The button's text.
 */
const click = (app: BootedApp, label: string): void => {
  const button = [...app.host.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!button) throw new Error(`no button named "${label}"`)
  button.click()
}

afterEach(() => {
  for (const app of booted.splice(0)) app.teardown()
  setRouter(originalBond)
})

describe('routing hooks without provideMoleculeRouter', () => {
  it('reads a settings page query under MemoryRouter', async () => {
    const app = await boot({ memory: true, initialPath, root: QueryProbeComponent })

    expect(output(app, 'query')).toBe('{"tab":"billing"}')
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    const app = await boot({ memory: true, initialPath, root: NavigateProbeComponent })
    const probe = app.componentRef.instance as NavigateProbeComponent

    await probe.navigate('/preferences?tab=profile')
    await app.settle()

    expect(probe.path().pathname).toBe('/preferences')
    expect(probe.path().search).toBe('?tab=profile')
  })

  it('checks exact and partial active paths under MemoryRouter', async () => {
    const app = await boot({ memory: true, initialPath, root: ActiveProbeComponent })
    const probe = app.componentRef.instance as ActiveProbeComponent

    expect([probe.partial(), probe.exact(), probe.other()]).toEqual([true, false, false])
  })

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    const app = await boot({
      memory: true,
      initialPath,
      routes: [
        { path: 'settings/:account', component: RouterProbeComponent },
        { path: '**', component: RouterProbeComponent },
      ],
      root: RouterProbeComponent,
    })
    const router = (app.componentRef.instance as RouterProbeComponent).router

    expect(router.getQuery()).toEqual({ tab: 'billing' })
    expect(router.getHash()).toBe('#payment')
    expect(router.getParams()).toEqual({ account: 'team' })
    await router.navigate('/settings/personal?tab=security', { state: { source: 'tabs' } })
    await app.settle()
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getParams()).toEqual({ account: 'personal' })
    expect(router.getLocation().state).toEqual({ source: 'tabs' })
  })

  it.each(routers)('switches settings tabs under $name with all four hooks', async ({ memory }) => {
    const app = await boot({ memory, initialPath, root: SettingsComponent })

    expect(output(app, 'query')).toBe('{"tab":"billing"}')
    expect(output(app, 'active')).toBe('true')
    expect(output(app, 'location')).toBe(initialPath)

    click(app, 'Profile tab')
    await app.settle()
    expect(output(app, 'query')).toBe('{"tab":"profile"}')
    expect(output(app, 'state')).toBe('{"source":"tabs"}')
    expect(output(app, 'location')).toBe('/settings/team?tab=profile')
    expect(output(app, 'active')).toBe('true')

    click(app, 'Preferences')
    await app.settle()
    expect(output(app, 'query')).toBe('{"tab":"notifications"}')
    expect(output(app, 'active')).toBe('false')
    expect(output(app, 'location')).toBe('/preferences?tab=notifications#email')
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const app = await boot({ memory: true, initialPath, root: RouterProbeComponent })
    const bonded = createAngularRouter(app.router, app.location)
    setRouter(bonded)
    const first = app.componentRef
    const secondHost = document.createElement('mol-test-router-probe')
    document.body.appendChild(secondHost)
    const second = app.appRef.bootstrap(RouterProbeComponent, secondHost)
    // One molecule router per Angular Router (React gives every component its own), so
    // the two fallback consumers share one — and neither is the global bond.
    expect((first.instance as RouterProbeComponent).router).not.toBe(bonded)
    expect((second.instance as RouterProbeComponent).router).toBe(
      (first.instance as RouterProbeComponent).router,
    )
    expect(getRouter()).toBe(bonded)

    await (first.instance as RouterProbeComponent).router.navigate('/settings?tab=profile')
    await app.settle()
    expect((first.instance as RouterProbeComponent).router.getQuery()).toEqual({ tab: 'profile' })
    expect(getRouter()).toBe(bonded)
    first.destroy()
    second.destroy()
    secondHost.remove()
    expect(getRouter()).toBe(bonded)
    bonded.destroy()
  })
})

describe('provideMoleculeRouter compatibility', () => {
  it('drives the bonded router with its named routes and onRouterReady', async () => {
    const routes: RouteDefinition[] = [{ name: 'settings', path: '/settings/:account' }]
    const onRouterReady = vi.fn()
    const app = await boot({
      memory: true,
      initialPath,
      providers: [provideMoleculeRouter({ routes, onRouterReady })],
      root: RouterProbeComponent,
    })
    const router = (app.componentRef.instance as RouterProbeComponent).router

    expect(router).toBe(onRouterReady.mock.lastCall?.[0])
    expect(router).toBe(getRouter())
    expect(router.getRoutes()).toEqual(routes)
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    await app.settle()
    expect(router).toBe(onRouterReady.mock.lastCall?.[0])
    expect(router).toBe(getRouter())
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getRoutes()).toEqual(routes)

    coreNavigate('/settings/work?tab=profile')
    await app.settle()
    expect(router.getLocation().pathname).toBe('/settings/work')
    expect(router.getQuery()).toEqual({ tab: 'profile' })
    expect(router).toBe(getRouter())
    expect(router).toBe(onRouterReady.mock.lastCall?.[0])
  })
})

describe('routing hooks outside any router', () => {
  it.each([
    ['useMoleculeRouter', () => useMoleculeRouter()],
    ['useMoleculeQuery', () => useMoleculeQuery()],
    ['useMoleculeNavigate', () => useMoleculeNavigate()],
    ['useIsActive', () => useIsActive('/settings')],
  ] as const)('%s names the router to mount', (_name, useHook) => {
    expect(useHook).toThrow(OUTSIDE_ROUTER)
    // The key travels with the error, so whatever shows it can translate it.
    expect(useHook).toThrow(
      expect.objectContaining({
        i18nKey: 'routing.angularRouter.error.useMoleculeRouterOutsideRouter',
      }),
    )
  })
})

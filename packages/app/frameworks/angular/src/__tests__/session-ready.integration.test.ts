// @vitest-environment jsdom

/**
 * The `SessionReady` boundary against the real restoring auth client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page load.
 * Pages that rendered before it answered read `user === null`: returning visitors lost a follow
 * test to a Follow button whose handler checked `!user` (a no-op or a redirect to `/login`) on
 * the profile page the suite opened with `page.goto`.
 *
 * React's provider render hold (`MoleculeProvider`/`AuthProvider` with `awaitSession`) is the
 * `SessionReady` boundary here; the provider-level bootstrap hold has no render, and is covered
 * by `await-session.integration.test.ts`. Where React relies on a framework-only mechanism
 * (StrictMode's double effect), the port asserts what a caller observes instead.
 *
 * @module
 */

import '@angular/compiler'
import {
  ApplicationInitStatus,
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import { useAuth } from '../hooks/use-auth.js'
import { useTheme } from '../hooks/use-theme.js'
import { useTranslation } from '../hooks/use-translation.js'
import { provideAuth, provideMolecule } from '../providers.js'
import { SessionReady } from '../session-ready.js'
import type { MoleculeModuleConfig } from '../types.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const validToken = [btoa('{}'), btoa(JSON.stringify({ exp: 4_102_444_800 })), 'signature'].join('.')

/** The signed-in action a test installs on the Follow button. */
let activeOnFollow: ((id: string) => void) | undefined

/**
 * In-memory storage for one browser document.
 *
 * @param initial - Entries the previous document left behind.
 * @returns The storage adapter.
 */
function memoryStorage(initial: Record<string, string> = {}): StorageAdapter {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

/** Open a fresh client using the session storage from the previous document. */
function cachedVisitor(accessToken: string): AuthClient<UserProfile> {
  const storage = memoryStorage()
  const previous = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  previous.setSession({ accessToken, user: reader })
  previous.destroy()
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return client
}

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(initialize = true): {
  client: AuthClient<UserProfile>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((input) =>
      String(input).endsWith('/users/me')
        ? new Promise<Response>((resolve) => {
            respond = resolve
          })
        : Promise.resolve(
            Response.json({ accessToken: 'new-token', user: { ...reader, id: 'new-reader' } }),
          ),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  if (initialize) void client.initialize()
  return {
    client,
    answer: async () => {
      respond?.(
        new Response(JSON.stringify({ user: reader }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      await client.whenRestored!()
    },
  }
}

/** The page a first click must not reach while the session is undecided. */
@Component({
  selector: 'app-test-session-page',
  template: '<h1>{{ line() }}</h1>',
})
class SessionPageComponent {
  readonly auth = useAuth<UserProfile>()

  /**
   * The rendered session line.
   *
   * @returns The signed-in or signed-out line.
   */
  line(): string {
    return this.auth.status() === 'authenticated'
      ? `Signed in as ${this.auth.user()?.name}`
      : 'Signed out'
  }
}

/** The handler shape the runs wrote: a signed-in action that bails out when `user` is null. */
@Component({
  selector: 'app-test-follow-button',
  template: '<button type="button" (click)="follow()">Follow</button>',
})
class FollowButtonComponent {
  readonly auth = useAuth<UserProfile>()

  /** Runs the signed-in action when the session holds a user. */
  follow(): void {
    const user = this.auth.user()
    if (!user) return
    activeOnFollow?.(user.id)
  }
}

/** An unauthenticated public page. */
@Component({
  selector: 'app-test-public-page',
  template: '<p>Public page</p>',
})
class PublicPageComponent {}

/** A synchronous server shell. */
@Component({
  selector: 'app-test-server-page',
  template: '<p>Server page</p>',
})
class ServerPageComponent {}

/** A page whose content is held until the session is decided. */
@Component({
  selector: 'app-test-session-page-host',
  imports: [SessionReady, SessionPageComponent],
  template: `
    <mol-session-ready>
      <app-test-session-page />
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class SessionPageHostComponent {}

/** A public page whose content is held until the session is decided. */
@Component({
  selector: 'app-test-public-host',
  imports: [SessionReady],
  template: `
    <mol-session-ready>
      <p>Public page</p>
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class PublicHostComponent {}

/** A synchronous server shell whose content is held until the session is decided. */
@Component({
  selector: 'app-test-server-host',
  imports: [SessionReady],
  template: `
    <mol-session-ready>
      <p>Server page</p>
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class ServerHostComponent {}

/** The signed-in action held behind the session boundary. */
@Component({
  selector: 'app-test-follow-host',
  imports: [SessionReady, FollowButtonComponent],
  template: `
    <mol-session-ready>
      <app-test-follow-button />
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class FollowHostComponent {}

/** A fallback that renders the provided theme and translations. */
@Component({
  selector: 'app-test-theme-fallback-host',
  imports: [SessionReady],
  template: `
    <mol-session-ready>
      <p>Public page</p>
      <p slot="fallback">{{ line() }}</p>
    </mol-session-ready>
  `,
})
class ThemeFallbackHostComponent {
  readonly theme = useTheme()
  readonly translation = useTranslation()

  /**
   * The themed, translated fallback line.
   *
   * @returns The line React's fallback renders.
   */
  line(): string {
    return `${this.theme.theme().name}: ${this.translation.t('restoring')}`
  }
}

/** A child that reads the restored user. */
@Component({
  selector: 'app-test-session-name',
  template: '<p>{{ line() }}</p>',
})
class SessionNameComponent {
  readonly auth = useAuth<UserProfile>()

  /**
   * The rendered name line.
   *
   * @returns The signed-in or signed-out line.
   */
  line(): string {
    return this.auth.user() ? `Signed in as ${this.auth.user()?.name}` : 'Signed out'
  }
}

/** The name child behind the session boundary. */
@Component({
  selector: 'app-test-session-name-host',
  imports: [SessionReady, SessionNameComponent],
  template: `
    <mol-session-ready>
      <app-test-session-name />
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class SessionNameHostComponent {}

/** The returning operator's first signed-in action. */
@Component({
  selector: 'app-test-inventory-action',
  template: '<button type="button" (click)="reserve()">Reserve stock</button>',
})
class InventoryActionComponent {
  readonly auth = useAuth<UserProfile>()

  /** Runs the signed-in action only once the session is decided. */
  reserve(): void {
    const user = this.auth.user()
    if (this.auth.status() !== 'authenticated' || !user) return
    activeOnFollow?.(user.id)
  }
}

/** The inventory action held behind the session boundary. */
@Component({
  selector: 'app-test-inventory-action-host',
  imports: [SessionReady, InventoryActionComponent],
  template: `
    <mol-session-ready>
      <app-test-inventory-action />
      <p slot="fallback">Restoring</p>
    </mol-session-ready>
  `,
})
class InventoryActionHostComponent {}

/**
 * A mounted profile draft whose input seeds from the restored user, the way
 * React's `defaultValue={user?.name}` seeds an uncontrolled control.
 */
@Component({
  selector: 'app-test-profile-draft',
  template: '<input aria-label="Display name" [value]="seed" />',
})
class ProfileDraftComponent {
  private readonly auth = useAuth<UserProfile>()
  /** The name the control mounts with. */
  readonly seed = this.auth.user()?.name ?? ''
}

/**
 * The profile draft behind the session boundary.
 *
 * Angular constructs projected content eagerly, so `<mol-session-ready>` alone
 * would build the draft before the hold lifts; a host that gates on the same
 * `status()` contract defers construction the way React's provider does, and
 * the draft then seeds from the restored user.
 */
@Component({
  selector: 'app-test-profile-draft-host',
  imports: [ProfileDraftComponent],
  template: `
    @if (auth.status() === 'loading') {
      <p>Restoring profile</p>
    } @else {
      <app-test-profile-draft />
    }
  `,
})
class ProfileDraftHostComponent {
  readonly auth = useAuth<UserProfile>()
}

/**
 * A profile control seeded once at mount from the restored user, so a later
 * user change cannot overwrite an unsaved draft (React's `defaultValue`).
 */
@Component({
  selector: 'app-test-profile-name-input',
  template: '<input aria-label="Profile name" [value]="seed" />',
})
class ProfileNameInputComponent {
  private readonly auth = useAuth<UserProfile>()
  /** The name the control mounts with. */
  readonly seed = this.auth.user()?.name ?? ''
}

/**
 * The seeded profile control behind a status gate, so it is constructed once
 * the restore has been decided (see {@link ProfileDraftHostComponent}).
 */
@Component({
  selector: 'app-test-profile-name-input-host',
  imports: [ProfileNameInputComponent],
  template: `
    @if (auth.status() === 'loading') {
      <p>Restoring</p>
    } @else {
      <app-test-profile-name-input />
    }
  `,
})
class ProfileNameInputHostComponent {
  readonly auth = useAuth<UserProfile>()
}

/**
 * The two providers React's `%s` table names, in Angular's form: `provideAuth`
 * and `provideMolecule` register the client the same way; the session hold is
 * the boundary or the provider's `awaitSession` bootstrap, so each row is the
 * same app wiring with its own provider function.
 *
 * @param provider - Which React provider the row stands in for.
 * @param client - The auth client to register.
 * @returns The environment providers for the row.
 */
function authProviders(
  provider: 'auth' | 'molecule',
  client: AuthClient<UserProfile>,
): EnvironmentProviders {
  return provider === 'auth' ? provideAuth(client) : provideMolecule({ auth: client })
}

/**
 * Mounts one component under an explicit provider list and renders it once.
 *
 * @param component - The component to mount.
 * @param providers - The environment providers the component reads.
 * @returns The mounted fixture.
 */
function mountWith<T>(
  component: Type<T>,
  providers: (Provider | EnvironmentProviders)[],
): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Mounts one component under one molecule configuration and renders it once.
 *
 * @param component - The component to mount.
 * @param config - The providers `provideMolecule` registers.
 * @returns The mounted fixture.
 */
function mount<T>(component: Type<T>, config: MoleculeModuleConfig): ComponentFixture<T> {
  return mountWith(component, [provideMolecule(config)])
}

/**
 * The fixture's rendered text.
 *
 * @param fixture - The mounted fixture.
 * @returns Its text content.
 */
const text = (fixture: ComponentFixture<unknown>): string => fixture.nativeElement.textContent ?? ''

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  for (const client of clients.splice(0)) client.destroy()
  activeOnFollow = undefined
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('the session boundary', () => {
  it.each(['auth', 'molecule'] as const)(
    '%s provider waits by default so a returning inventory operator can use the first action',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const changed = vi.fn()
      activeOnFollow = changed
      const fixture = mountWith(InventoryActionHostComponent, [authProviders(provider, client)])
      expect(fixture.nativeElement.querySelector('button')).toBeNull()
      await answer()
      fixture.detectChanges()
      const reserve = fixture.nativeElement.querySelector('button') as HTMLButtonElement
      reserve.click()
      expect(changed).toHaveBeenCalledExactlyOnceWith(reader.id)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider seeds a mounted profile form from the restored user by default',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const fixture = mountWith(ProfileDraftHostComponent, [authProviders(provider, client)])
      expect(fixture.nativeElement.querySelector('input')).toBeNull()
      expect(text(fixture)).toContain('Restoring profile')
      await answer()
      fixture.detectChanges()
      const draft = fixture.nativeElement.querySelector('input') as HTMLInputElement
      expect(draft.value).toBe(reader.name)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider renders a cached visitor on the first render without entry initialization',
    (provider) => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)
      const client = cachedVisitor(validToken)
      const fixture = mountWith(SessionPageComponent, [authProviders(provider, client)])
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Signed in as Reader')
      expect(fetchSpy).not.toHaveBeenCalled()
    },
  )

  it.each(['login', 'register'] as const)(
    'keeps the page mounted after %s wins a pending restore',
    async (method) => {
      const { client, answer } = returningVisitor()
      const fixture = mount(ProfileNameInputHostComponent, { auth: client })
      await client[method]({ email: 'new@example.test', password: 'password' })
      fixture.detectChanges()
      const input = fixture.nativeElement.querySelector(
        'input[aria-label="Profile name"]',
      ) as HTMLInputElement
      input.value = 'Unsaved draft'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      fixture.detectChanges()
      await answer()
      client.setUser({ ...reader, id: 'new-reader', name: 'Updated' })
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('input[aria-label="Profile name"]')).toBe(input)
      expect(input.value).toBe('Unsaved draft')
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    },
  )

  it('waits for one current-user read when the previous document stored only the token', async () => {
    let respond!: (response: Response) => void
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    const storage = memoryStorage()
    storage.setItem('molecule:auth:accessToken', validToken)
    const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
    clients.push(client)
    const fixture = mount(SessionPageHostComponent, { auth: client })
    expect(fixture.nativeElement.querySelector('h1')).toBeNull()
    expect(text(fixture)).toContain('Restoring')
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      '/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: `Bearer ${validToken}` }),
      }),
    )
    respond(Response.json({ user: reader }))
    await client.whenRestored!()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Signed in as Reader')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('renders a cached opaque-token session before a current-user read and verifies it once', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn(async () => Response.json({ user: reader }))
    vi.stubGlobal('fetch', fetchSpy)
    const client = cachedVisitor('opaque-token')
    const fixture = mount(SessionPageHostComponent, { auth: client })
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Signed in as Reader')
    expect(fetchSpy).not.toHaveBeenCalled()

    await Promise.all([client.initialize(), client.initialize()])
    await client.initialize()
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      '/users/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('provides theme and translations to its session fallback', async () => {
    const { client, answer } = returningVisitor()
    const i18n = createSimpleI18nProvider()
    i18n.addTranslations('en', { restoring: 'Translated restore' })
    const theme: ThemeProviderType = {
      getTheme: () => lightTheme,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
      getThemes: () => [lightTheme],
    }
    const fixture = mount(ThemeFallbackHostComponent, { auth: client, theme, i18n })
    expect(text(fixture)).toContain(`${lightTheme.name}: Translated restore`)
    await answer()
    fixture.detectChanges()
    expect(text(fixture)).toContain('Public page')
  })

  it('allows an explicit ungated synchronous server shell without starting restoration', () => {
    const { client } = returningVisitor(false)
    TestBed.configureTestingModule({
      imports: [ServerPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMolecule({ auth: client, awaitSession: false }),
      ],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    expect(initStatus.done).toBe(true)
    const fixture = TestBed.createComponent(ServerPageComponent)
    fixture.detectChanges()
    expect(text(fixture)).toContain('Server page')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('server-renders the fallback while a cookie restore is pending', async () => {
    const { client, answer } = returningVisitor(false)
    const fixture = mount(ServerHostComponent, { auth: client })
    expect(text(fixture)).toContain('Restoring')
    await answer()
    fixture.detectChanges()
    expect(text(fixture)).toContain('Server page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lazily restores exactly once under StrictMode without initialize()', async () => {
    // Angular has no StrictMode replay of a mount effect: the observable
    // contract is one lazy restore, started by the first read, never two.
    const { client, answer } = returningVisitor(false)
    const fixture = mount(PublicHostComponent, { auth: client })
    expect(text(fixture)).not.toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
    await answer()
    fixture.detectChanges()
    expect(text(fixture)).toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('releases a sign-out during the hold and ignores the late restored user', async () => {
    const { client, answer } = returningVisitor()
    const fixture = mount(PublicHostComponent, { auth: client })
    expect(text(fixture)).not.toContain('Public page')
    await client.logout()
    fixture.detectChanges()
    expect(text(fixture)).toContain('Public page')
    await answer()
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('releases a hung restore instead of leaving a blank page forever', async () => {
    vi.useFakeTimers()
    const { client } = returningVisitor()
    const fixture = mount(PublicHostComponent, { auth: client })
    expect(text(fixture)).not.toContain('Public page')
    await vi.advanceTimersByTimeAsync(10_000)
    fixture.detectChanges()
    expect(text(fixture)).toContain('Public page')
    expect(client.getState().status).toBe('unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows no page until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    activeOnFollow = onFollow
    const fixture = mount(FollowHostComponent, { auth: client })
    expect(fixture.nativeElement.querySelector('button')).toBeNull()

    await answer()
    fixture.detectChanges()
    const follow = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    follow.click()
    expect(onFollow).toHaveBeenCalledWith('reader')
  })

  it('an explicit opt-out permits an early click, so the shell owns its action readiness', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    activeOnFollow = onFollow
    const fixture = mount(FollowButtonComponent, { auth: client, awaitSession: false })
    const follow = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    follow.click()
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders an anonymous visitor as signed out immediately without a hold', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const fixture = mount(SessionPageHostComponent, { auth: client })
    expect(text(fixture)).not.toContain('Restoring')
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Signed out')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.ts does before the first render.
    void client.initialize()
    const fixture = mount(PublicHostComponent, { auth: client })
    expect(text(fixture)).toContain('Restoring')
    await client.whenRestored!()
    fixture.detectChanges()
    expect(client.getState().status).toBe('unavailable')
    expect(text(fixture)).toContain('Public page')
  })

  it('renders at once when no auth client is given', () => {
    TestBed.configureTestingModule({
      imports: [PublicPageComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ awaitSession: true })],
    })
    const fixture = TestBed.createComponent(PublicPageComponent)
    fixture.detectChanges()
    expect(text(fixture)).toContain('Public page')
  })
})

describe('SessionReady', () => {
  it('renders its fallback, then the children with the restored user', async () => {
    const { client, answer } = returningVisitor()
    const fixture = mount(SessionNameHostComponent, { auth: client, awaitSession: false })
    expect(text(fixture)).toContain('Restoring')
    expect(text(fixture)).not.toContain('Signed out')
    await answer()
    fixture.detectChanges()
    expect(text(fixture)).toContain('Signed in as Reader')
  })
})

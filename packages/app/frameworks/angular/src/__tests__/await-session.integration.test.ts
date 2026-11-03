// @vitest-environment jsdom

/**
 * `provideMolecule awaitSession` against the real restoring auth client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page
 * load. Until it answers, the auth binding reports `user === null` everywhere, so a public
 * page's signed-in action (`if (!user) return`, a redirect to `/login`) treats a signed-in
 * visitor as signed out. Angular creates the root component — the first page — only after
 * app initializers settle, so the hold is an initializer: with `awaitSession` bootstrap
 * waits for the restore, and every component's first render reads the decided session.
 *
 * @module
 */

import '@angular/compiler'
import { ApplicationInitStatus, Component, inject } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { provideMolecule } from '../providers.js'
import { MoleculeAuthService } from '../services/auth.service.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []

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

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(): { client: AuthClient<UserProfile>; answer: () => Promise<void> } {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  // As the scaffold's main.ts does, before bootstrap.
  void client.initialize()
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

/**
 * The handler shape the failing runs wrote: a signed-in action that bails out when `user`
 * is null, read through the package's own auth service.
 */
@Component({
  selector: 'app-test-follow',
  template: '<button type="button" (click)="follow()">Follow</button>',
})
class FollowComponent {
  private readonly auth = inject(MoleculeAuthService)

  onFollow: (user: unknown) => void = () => undefined

  follow(): void {
    const user = this.auth.user
    if (!user) return
    this.onFollow(user)
  }
}

/** A page that reads no auth — the "no auth client given" case must still render it. */
@Component({
  selector: 'app-test-public',
  template: '<p>Public page</p>',
})
class PublicPageComponent {}

/** Let every pending microtask (promise resolutions, the init status) run one round. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('provideMolecule awaitSession', () => {
  it('holds bootstrap until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    let done = false
    void initStatus.donePromise.then(() => {
      done = true
    })
    await tick()
    // Bootstrap (and so the page) is held while the restore is in flight.
    expect(done).toBe(false)
    expect(client.getState().status).toBe('loading')

    await answer()
    await initStatus.donePromise
    expect(done).toBe(true)
    expect(client.getState().status).toBe('authenticated')
    expect(fetch).toHaveBeenCalledTimes(1)

    const fixture = TestBed.createComponent(FollowComponent)
    fixture.componentInstance.onFollow = onFollow
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button')!.click()
    expect(onFollow).toHaveBeenCalledWith(reader)
  })

  it('without it, bootstrap finishes before the restore and the same click is lost', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client })],
    })
    // No hold: bootstrap completes while the restore is still in flight.
    await TestBed.inject(ApplicationInitStatus).donePromise
    expect(client.getState().status).toBe('loading')

    const fixture = TestBed.createComponent(FollowComponent)
    fixture.componentInstance.onFollow = onFollow
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button')!.click()
    await answer()
    expect(client.getState().status).toBe('authenticated')
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('bootstraps a visitor with no session to restore without waiting on a request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.ts does, before bootstrap.
    void client.initialize()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    await initStatus.donePromise
    expect(initStatus.done).toBe(true)
    expect(client.getState().status).toBe('unauthenticated')
    expect(fetchSpy).not.toHaveBeenCalled()
    const fixture = TestBed.createComponent(FollowComponent)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy()
  })

  it('completes bootstrap when the restore cannot reach the server', async () => {
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
    // As the scaffold's main.ts does, before bootstrap.
    void client.initialize()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    await initStatus.donePromise
    expect(initStatus.done).toBe(true)
    expect(client.getState().status).toBe('unavailable')
    const fixture = TestBed.createComponent(FollowComponent)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy()
  })

  it('ignores the option when no auth client is given', async () => {
    TestBed.configureTestingModule({
      imports: [PublicPageComponent],
      providers: [provideMolecule({ awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    await initStatus.donePromise
    expect(initStatus.done).toBe(true)
    const fixture = TestBed.createComponent(PublicPageComponent)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('p')!.textContent).toBe('Public page')
  })

  it('does not hold a cached session behind its background verification', async () => {
    document.cookie = 'mol_auth=1; path=/'
    let respond!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            respond = resolve
          }),
      ),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage({
        'molecule:auth:accessToken': 'opaque-token',
        'molecule:auth:user': JSON.stringify(reader),
      }),
      autoRefresh: false,
    })
    clients.push(client)
    void client.initialize()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    let done = false
    void initStatus.donePromise.then(() => {
      done = true
    })
    await tick()
    expect(client.getState().status).toBe('authenticated')
    expect(done).toBe(true)
    const fixture = TestBed.createComponent(FollowComponent)
    const onFollow = vi.fn()
    fixture.componentInstance.onFollow = onFollow
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button')!.click()
    expect(onFollow).toHaveBeenCalledWith(reader)
    respond(new Response(JSON.stringify({ user: reader }), { status: 200 }))
    await client.whenRestored!()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('releases bootstrap as soon as status is decided while the restore is still pending', async () => {
    const { client, answer } = returningVisitor()
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    let done = false
    void initStatus.donePromise.then(() => {
      done = true
    })
    await tick()
    expect(done).toBe(false)
    client.setSession({ accessToken: 'replacement-token', user: reader })
    await tick()
    expect(done).toBe(true)
    await answer()
  })

  it('starts an omitted initialize call and releases a timed out restore', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
      requestTimeout: 20,
    })
    clients.push(client)
    TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [provideMolecule({ auth: client, awaitSession: true })],
    })
    const initStatus = TestBed.inject(ApplicationInitStatus)
    await initStatus.donePromise
    expect(client.getState().status).toBe('unavailable')
    expect(fetch).toHaveBeenCalledTimes(1)
    const fixture = TestBed.createComponent(FollowComponent)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy()
  })
})

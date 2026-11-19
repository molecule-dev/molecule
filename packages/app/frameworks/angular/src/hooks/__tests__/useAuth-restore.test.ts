// @vitest-environment jsdom

/**
 * `useAuth` during a session restore, in Angular's idiom: a public page keeps
 * rendering while the restore is undecided and only its three-way branch moves,
 * and the hook's documentation teaches that three-way decision instead of a
 * boolean signed-out branch.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
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

import { provideMolecule } from '../../providers.js'
import { useAuth } from '../use-auth.js'

/** The user profile this suite stands in for. */
type Reader = UserProfile

/** The stored session the client restores. */
const user: UserProfile = { id: 'reader', name: 'Reader' }

/**
 * An in-memory adapter that can carry a stored session into a new client.
 *
 * @returns The storage adapter.
 */
function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
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

/**
 * A token whose lifetime does not require a refresh during this test.
 *
 * @returns The JWT.
 */
function createJWT(): string {
  return [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('test-signature'),
  ].join('.')
}

/**
 * A new client with a token and profile persisted by an earlier client.
 *
 * @returns The restoring client.
 */
function createStoredSessionClient(): AuthClient<UserProfile> {
  const storage = createStorage()
  const earlier = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  earlier.setSession({ accessToken: createJWT(), user })
  return createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
}

/**
 * A public page and a signed-in section making the documented three-way
 * decision.
 */
@Component({
  selector: 'app-test-library-page',
  template: `
    <h1>Public library</h1>
    <output data-testid="session-status">{{ auth.status() }}</output>
    <section>
      @if (auth.status() === 'loading') {
        Restoring session
      } @else if (auth.status() === 'unauthenticated') {
        Redirect to sign in
      } @else {
        Signed in as {{ auth.user()?.name }}
      }
    </section>
  `,
})
class LibraryPageComponent {
  readonly auth = useAuth<Reader>()
}

/**
 * A response for the client's real fetch boundary.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * The JSDoc block immediately before an exported declaration.
 *
 * @param source - The file's source.
 * @param marker - Text the declaration contains.
 * @returns The doc block.
 */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`Missing ${marker}`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

/**
 * Mounts the public page against a client.
 *
 * @param client - The auth client to register.
 * @returns The mounted page.
 */
function renderPage(client: AuthClient<Reader>): ComponentFixture<LibraryPageComponent> {
  TestBed.configureTestingModule({
    imports: [LibraryPageComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(LibraryPageComponent)
  fixture.detectChanges()
  return fixture
}

/**
 * The text content of one element, if it exists.
 *
 * @param fixture - The mounted page.
 * @param selector - The element selector.
 * @returns The text, or `null` when the element is absent.
 */
function textOf(fixture: ComponentFixture<unknown>, selector: string): string | null {
  const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null
  return element ? element.textContent : null
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('useAuth during session restore', () => {
  it('keeps public content visible and does not redirect before a restore is rejected', async () => {
    let answerRestore!: (response: Response) => void
    const fetchBoundary = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          answerRestore = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const client = createJWTAuthClient<Reader>({ storage: 'memory', autoRefresh: false })

    const fixture = renderPage(client)

    expect(textOf(fixture, 'h1')).toBe('Public library')
    expect(textOf(fixture, '[data-testid="session-status"]')).toBe('loading')
    expect(textOf(fixture, 'section')).toContain('Restoring session')
    expect(textOf(fixture, 'section')).not.toContain('Redirect to sign in')

    answerRestore(jsonResponse({ error: 'expired' }, 401))
    await client.whenRestored?.()
    fixture.detectChanges()

    expect(textOf(fixture, 'h1')).toBe('Public library')
    expect(textOf(fixture, '[data-testid="session-status"]')).toBe('unauthenticated')
    expect(textOf(fixture, 'section')).toContain('Redirect to sign in')
  })

  it.each([
    ['a 5xx', () => Promise.resolve(jsonResponse({ error: 'down' }, 503))],
    ['a network error', () => Promise.reject(new Error('network down'))],
  ] as const)('keeps a stored session signed in after %s', async (_label, answer) => {
    const fetchBoundary = vi.fn<typeof fetch>(answer)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createStoredSessionClient()
    const fixture = renderPage(client)

    expect(textOf(fixture, '[data-testid="session-status"]')).toBe('authenticated')
    expect(textOf(fixture, 'section')).toContain('Signed in as Reader')

    await client.validateSession?.()
    fixture.detectChanges()

    expect(fetchBoundary).toHaveBeenCalledOnce()
    expect(textOf(fixture, 'h1')).toBe('Public library')
    expect(textOf(fixture, '[data-testid="session-status"]')).toBe('unavailable')
    expect(textOf(fixture, 'section')).toContain('Signed in as Reader')
    expect(client.getAccessToken()).not.toBeNull()
  })
})

describe('useAuth restore guidance', () => {
  it('teaches the three-way decision instead of a boolean signed-out branch', () => {
    const hookSource = readFileSync(join(import.meta.dirname, '../use-auth.ts'), 'utf8')
    const moduleSource = readFileSync(join(import.meta.dirname, '../../index.ts'), 'utf8')
    const hookDoc = docFor(hookSource, 'export function useAuth<')
    const quickStart = moduleSource.slice(0, moduleSource.indexOf('@remarks'))

    for (const doc of [hookDoc, quickStart]) {
      expect(doc).toContain("status === 'loading'")
      expect(doc).toContain("status === 'unauthenticated'")
      expect(doc).toContain("'unavailable'")
      expect(doc).toContain('401/403')
      expect(doc).not.toContain('if (isAuthenticated)')
      expect(doc).not.toContain('if (!isAuthenticated)')
    }
  })
})

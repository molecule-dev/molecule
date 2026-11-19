// @vitest-environment jsdom

/**
 * Local sign-out through the Angular auth binding: the same client sequence the
 * React header performs (`setAccessToken(null)` then `setUser(null)`) must
 * leave every consumer signed out, and a reload from the same storage must not
 * restore the session.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type StorageAdapter, type UserProfile } from '@molecule/app-auth'

import { useAuth, useAuthClient } from '../hooks/use-auth.js'
import { provideMolecule } from '../providers.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }

/**
 * An in-memory {@link StorageAdapter} — one reload reads what sign-out left.
 *
 * @returns The adapter.
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
 * The header React renders: a sign-in link while signed out, the user and a
 * sign-out button while signed in, and the live auth status in both.
 */
@Component({
  selector: 'app-test-header',
  template: `
    @if (!auth.isAuthenticated()) {
      <a href="/login">Sign in</a>
      <output aria-label="Auth status">{{ auth.status() }}</output>
    } @else {
      <span>Signed in as {{ auth.user()?.name }}</span>
      <button type="button" (click)="signOut()">Sign out</button>
      <output aria-label="Auth status">{{ auth.status() }}</output>
    }
  `,
})
class HeaderComponent {
  readonly auth = useAuth<UserProfile>()
  private readonly client = useAuthClient<UserProfile>()

  /**
   * The exact sequence React's header runs: drop the token, then the user.
   */
  signOut(): void {
    this.client.setAccessToken(null)
    this.auth.setUser(null)
  }
}

/**
 * The rendered auth status.
 *
 * @param fixture - The mounted header.
 * @returns The status text.
 */
function renderedStatus(fixture: ComponentFixture<HeaderComponent>): string {
  return String(
    (fixture.nativeElement.querySelector('[aria-label="Auth status"]') as HTMLElement | null)
      ?.textContent,
  )
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

describe('useAuth local sign-out', () => {
  it('renders signed out after the setAccessToken(null) + setUser(null) sequence and stays signed out on reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
    })
    const fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
    expect(String(fixture.nativeElement.textContent)).toContain('Signed in as Reader')
    expect(renderedStatus(fixture)).toBe('authenticated')

    const signOutButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    signOutButton.click()
    fixture.detectChanges()

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/login')
    expect(fixture.nativeElement.querySelector('button')).toBeNull()
    expect(renderedStatus(fixture)).toBe('unauthenticated')
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getUser()).toBeNull()
    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')

    const reloaded = createJWTAuthClient({ storage, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(reloaded.getAccessToken()).toBeNull()
    expect(reloaded.getRefreshToken()).toBeNull()
    expect(fetchBoundary).not.toHaveBeenCalled()
  })
})

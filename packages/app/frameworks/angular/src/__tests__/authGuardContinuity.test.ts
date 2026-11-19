// @vitest-environment jsdom

/**
 * A guarded route shell in the Angular binding: the form a visitor is typing in
 * must survive an unsuccessful sign-in (same element, same draft, the API's
 * errors shown, no loading marker), and the shell must transition to the
 * signed-in heading on success.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection, signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AuthError } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../hooks/use-auth.js'
import { provideMolecule } from '../providers.js'

/**
 * The API's structured error rendered the way React's page renders it.
 *
 * @param error - The rejected login error.
 * @returns `field message; field message` text, or an empty string.
 */
function failureText(error: unknown): string {
  const body = (error as Partial<AuthError> | null)?.body as
    { errors?: Record<string, string[]> } | undefined
  return Object.entries(body?.errors ?? {})
    .map(([field, messages]) => `${field} ${messages.join(', ')}`)
    .join('; ')
}

/**
 * A form whose local draft and failure must survive an unsuccessful sign-in.
 */
@Component({
  selector: 'app-test-login-page',
  template: `
    <form aria-label="Sign in" (submit)="submit($event)">
      <input aria-label="Email" [value]="email()" (input)="updateEmail($event)" />
      <button type="submit">Sign in</button>
      @if (auth.isLoading()) {
        <span role="status">Signing in</span>
      }
      @if (failure()) {
        <p role="alert">{{ failure() }}</p>
      }
    </form>
  `,
})
class LoginPageComponent {
  readonly auth = useAuth()
  readonly email = signal('')
  readonly failure = signal('')

  /**
   * Runs one sign-in and keeps the API's failure text in view.
   *
   * @param event - The native submit event.
   */
  async submit(event: Event): Promise<void> {
    event.preventDefault()
    this.failure.set('')
    try {
      await this.auth.login({ email: this.email(), password: 'test-password' })
    } catch (error) {
      this.failure.set(failureText(error))
    }
  }

  /**
   * Copies the email input's value into the draft.
   *
   * @param event - The native input event.
   */
  updateEmail(event: Event): void {
    const target = event.target
    if (target instanceof HTMLInputElement) this.email.set(target.value)
  }
}

/**
 * A route shell that waits only while the initial session decision is unknown.
 */
@Component({
  selector: 'app-test-guarded-shell',
  imports: [LoginPageComponent],
  template: `
    @if (auth.status() === 'loading') {
      <p role="status">Restoring session</p>
    } @else if (auth.status() === 'authenticated') {
      <h1>Signed in as {{ auth.user()?.email }}</h1>
    } @else {
      <app-test-login-page />
    }
  `,
})
class GuardedShellComponent {
  readonly auth = useAuth<{ id: string; email: string }>()
}

/**
 * Use the browser response parsing path, including the API's structured error.
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
 * Lets pending promises land, then renders one change detection.
 *
 * @param fixture - The mounted shell.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

/**
 * The text of the one live status marker, if any.
 *
 * @param fixture - The mounted shell.
 * @returns The status text, or `null`.
 */
function statusText(fixture: ComponentFixture<unknown>): string | null {
  const element = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement | null
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
})

describe('auth route guard continuity', () => {
  it('keeps the same form through a failed login, renders its API errors, and transitions on success', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createJWTAuthClient({
      baseURL: 'https://api.example.test',
      storage: 'memory',
      autoRefresh: false,
    })
    await client.initialize()
    expect(client.getState()).toMatchObject({ initialized: true, status: 'unauthenticated' })
    expect(fetchBoundary).not.toHaveBeenCalled()

    TestBed.configureTestingModule({
      imports: [GuardedShellComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
    })
    const fixture = TestBed.createComponent(GuardedShellComponent)
    fixture.detectChanges()
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement
    expect(form.getAttribute('aria-label')).toBe('Sign in')
    const email = fixture.nativeElement.querySelector('input') as HTMLInputElement
    email.value = 'reader@example.test'
    email.dispatchEvent(new Event('input', { bubbles: true }))

    let rejectLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        rejectLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('form')).toBe(form)
    expect(fixture.nativeElement.querySelector('input')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(statusText(fixture)).toBe('Signing in')

    rejectLogin(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await settle(fixture)
    expect(
      (fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null)?.textContent,
    ).toBe('credentials is invalid')
    expect(fixture.nativeElement.querySelector('form')).toBe(form)
    expect(fixture.nativeElement.querySelector('input')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull()

    let acceptLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        acceptLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('form')).toBe(form)
    expect(statusText(fixture)).toBe('Signing in')
    acceptLogin(
      jsonResponse({
        user: { id: 'reader', email: 'reader@example.test' },
        accessToken: 'test-access-token',
      }),
    )
    await settle(fixture)
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement | null)?.textContent).toBe(
      'Signed in as reader@example.test',
    )
    expect(fixture.nativeElement.querySelector('form')).toBeNull()
    expect(client.getState().status).toBe('authenticated')
  })
})

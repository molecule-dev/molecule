// @vitest-environment jsdom

/**
 * A disposable scaffold's auth journey, driven through the SHARED packages a
 * generated Angular app actually imports: the real `createJWTAuthClient`, the
 * package's `provideMolecule`, `useAuth`/`useAuthClient` and `useForm` with the
 * real native forms provider. Only the HTTP boundary (`fetch`) is controlled.
 *
 * The journey is the one a scaffold user takes, in order:
 *   1. sign up with the app's OWN typed registration fields through the API's
 *      `{ user: … }` envelope — exactly ONE registration mutation;
 *   2. fail a sign-in with the API's structured 401 body and keep the typed
 *      form on screen (no remount, no lost input);
 *   3. edit the profile, watch a delayed session revalidation land while the
 *      user is still typing, reset to the server values, and save the LATEST
 *      DOM values.
 *
 * Each "control" case at the bottom drives a deliberately broken variant of
 * the same UI and asserts the failure the journey above rules out, so the
 * positive assertions are shown to have teeth.
 *
 * @module
 */

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
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AuthError, AuthResult, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createNativeFormProvider } from '@molecule/app-forms'

import { useAuth, useAuthClient } from '../hooks/use-auth.js'
import { useForm } from '../hooks/use-forms.js'
import { provideMolecule } from '../providers.js'

/** The app's profile: the base identity plus the fields its pages read. */
interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/** The app's OWN registration fields, typed through the client's second generic. */
interface AppRegisterFields {
  username: string
}

/** The user the API puts on the wire inside `{ props }` / `{ user }`. */
interface WireUser {
  username: string
  email: string
  name?: string | null
  bio?: string | null
  token?: string
}

const formProvider = createNativeFormProvider()

/** Whether the mounted sign-up page also calls the client directly (the m390 control). */
let duplicateSignup = false
/** Whether the mounted settings page submits the first render's values (the stale control). */
let staleSubmit = false

/**
 * A JSON `Response`, so the client parses it through its real browser path.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response the stubbed `fetch` resolves with.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * The disposable app's auth client: a RealWorld-shaped API — the app's own
 * `username` field at the top level of `register()`, the payload nested under
 * `{ user }` on the wire, and the wire user adapted to {@link AppUser}.
 *
 * @returns A real `createJWTAuthClient` instance.
 */
function createDisposableClient() {
  return createJWTAuthClient<AppUser, AppRegisterFields>({
    baseURL: 'https://api.example.test',
    loginEndpoint: '/users/log-in',
    registerEndpoint: '/users',
    profileEndpoint: '/users/me',
    currentUserEndpoint: '/users/me',
    logoutEndpoint: '/users/log-out',
    storage: 'memory',
    autoRefresh: false,
    requestBody: (kind, payload) => ({ user: payload }),
    mapAuthResponse: (data): AuthResult<AppUser> => {
      const answer = data as { user?: WireUser; props?: WireUser; accessToken?: string }
      const wire = answer.user ?? answer.props
      if (!wire) throw new Error('The API answer carried no user')
      return {
        accessToken: answer.accessToken ?? wire.token,
        user: {
          id: wire.username,
          email: wire.email,
          name: wire.name ?? undefined,
          bio: wire.bio ?? undefined,
          username: wire.username,
        },
      }
    },
  })
}

type Client = ReturnType<typeof createDisposableClient>

interface SignupValues extends Record<string, unknown> {
  email: string
  password: string
  username: string
}

/**
 * The scaffold's sign-up page: `useAuth().register` for the ONE mutation and
 * `useForm` for the fields — the shared pair a generated app is expected to use.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-signup-page',
  template: `
    <form aria-label="Create account" (submit)="runSubmit($event)">
      <input
        aria-label="Email"
        [value]="form.formState().values.email"
        (input)="form.register('email').onChange($event)"
      />
      <input
        aria-label="Username"
        [value]="form.formState().values.username"
        (input)="form.register('username').onChange($event)"
      />
      <input
        aria-label="Password"
        type="password"
        [value]="form.formState().values.password"
        (input)="form.register('password').onChange($event)"
      />
      <button type="submit" [disabled]="form.isSubmitting()">Create account</button>
      @if (form.isSubmitting()) {
        <span role="status">Creating account</span>
      }
      @if (failure()) {
        <p role="alert">{{ failure() }}</p>
      }
    </form>
  `,
})
class SignupPageComponent {
  readonly auth = useAuth<AppUser, AppRegisterFields>()
  readonly client = useAuthClient<AppUser, AppRegisterFields>()
  readonly failure = signal('')
  readonly form = useForm<SignupValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '', username: '' },
  })

  /**
   * Runs the one registration a submit is allowed to make.
   *
   * @param event - The native submit event.
   */
  runSubmit(event: Event): void {
    void this.form.handleSubmit(async (values) => {
      this.failure.set('')
      try {
        await this.auth.register(values)
        if (duplicateSignup) {
          // CONTROL: the m390 pattern — the API's own resource helper AND the
          // auth client both create the account. The second call is the 409.
          await this.client.register(values)
        }
      } catch (error) {
        const body = (error as AuthError).body as
          { errors?: Record<string, string[]>; error?: string } | undefined
        this.failure.set(
          error instanceof Error
            ? `${error.message}${body?.error ? ` (${body.error})` : ''}`
            : 'Sign-up failed',
        )
      }
    })(event)
  }
}

interface LoginValues extends Record<string, unknown> {
  email: string
  password: string
}

/**
 * The scaffold's sign-in page. It renders from the form controller (so the
 * same DOM nodes must survive a rejected request) and renders the API's own
 * error body, not a generic message.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-login-page',
  template: `
    <form aria-label="Sign in" (submit)="runSubmit($event)">
      <input
        aria-label="Email"
        [value]="form.formState().values.email"
        (input)="form.register('email').onChange($event)"
      />
      <input
        aria-label="Password"
        type="password"
        [value]="form.formState().values.password"
        (input)="form.register('password').onChange($event)"
      />
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
  readonly auth = useAuth<AppUser>()
  readonly failure = signal('')
  readonly form = useForm<LoginValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '' },
  })

  /**
   * Signs in and renders the API's own error body on a rejection.
   *
   * @param event - The native submit event.
   */
  runSubmit(event: Event): void {
    void this.form.handleSubmit(async (values) => {
      this.failure.set('')
      try {
        await this.auth.login(values)
      } catch (error) {
        const body = (error as AuthError).body as
          { errors?: Record<string, string[]>; error?: string } | undefined
        this.failure.set(
          Object.entries(body?.errors ?? {})
            .map(([field, messages]) => `${field} ${messages.join(', ')}`)
            .join('; ') ||
            body?.error ||
            'Sign-in failed',
        )
      }
    })(event)
  }
}

interface SettingsValues extends Record<string, unknown> {
  name: string
  bio: string
}

/** The typed profile the settings form is seeded from. */
const seededUser: AppUser = {
  id: 'reader',
  email: 'reader@example.test',
  name: 'Reader',
  bio: 'First bio',
  username: 'reader',
}

/**
 * The scaffold's settings page: a form seeded from the signed-in user, reset
 * to the server's values, and saved through the shared client so every page
 * reading `useAuth().user` sees the new profile at once.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-settings-page',
  template: `
    <p role="status" data-testid="settings-saved">{{ savedLine() }}</p>
    <form aria-label="Settings" (submit)="runSubmit($event)">
      <input
        aria-label="Name"
        [value]="form.formState().values.name"
        (input)="form.register('name').onChange($event)"
      />
      <textarea
        aria-label="Bio"
        [value]="form.formState().values.bio"
        (input)="form.register('bio').onChange($event)"
      ></textarea>
      <button type="submit">Save</button>
      <button type="button" (click)="resetForm()">Reset</button>
    </form>
  `,
})
class SettingsPageComponent {
  readonly auth = useAuth<AppUser>()
  readonly client = useAuthClient<AppUser, AppRegisterFields>()
  readonly saved = signal('')
  // CONTROL: the values from the FIRST render, which is what reading a
  // closed-over snapshot instead of the form's live values does.
  private readonly captured = {
    name: this.auth.user()?.name ?? '',
    bio: this.auth.user()?.bio ?? '',
  }
  readonly form = useForm<SettingsValues>({
    createForm: formProvider.createForm,
    defaultValues: {
      name: this.auth.user()?.name ?? '',
      bio: this.auth.user()?.bio ?? '',
    },
  })

  /**
   * The rendered save status line.
   *
   * @returns `Saved <name>` or `Not saved`.
   */
  savedLine(): string {
    return this.saved() ? `Saved ${this.saved()}` : 'Not saved'
  }

  /**
   * Saves the live form values (or, for the control, the captured first render).
   *
   * @param event - The native submit event.
   */
  runSubmit(event: Event): void {
    void this.form.handleSubmit(async (values) => {
      await this.client.updateProfile(staleSubmit ? this.captured : values)
      this.saved.set(values.name)
    })(event)
  }

  /** Restores the server's values in the form. */
  resetForm(): void {
    this.form.reset({
      name: this.client.getUser()?.name ?? '',
      bio: this.client.getUser()?.bio ?? '',
    })
  }
}

/** The authenticated shell, read from the same client every page uses. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-profile-summary',
  template: '<p data-testid="profile-name">{{ name() }}</p>',
})
class ProfileSummaryComponent {
  readonly auth = useAuth<AppUser>()

  /**
   * The rendered profile name.
   *
   * @returns The signed-in user's name, or `anonymous`.
   */
  name(): string {
    return this.auth.user()?.name ?? 'anonymous'
  }
}

/** The settings page beside the summary, both reading the same client. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-profile-shell',
  imports: [ProfileSummaryComponent, SettingsPageComponent],
  template: '<app-test-profile-summary /><app-test-settings-page />',
})
class ProfileShellComponent {}

/** CONTROL: a guard that remounts the page whenever a request starts. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-remounting-guard',
  imports: [LoginPageComponent],
  template: `
    @if (auth.isLoading()) {
      <app-test-login-page />
    } @else {
      <app-test-login-page />
    }
  `,
})
class RemountingGuardComponent {
  readonly auth = useAuth<AppUser>()
}

/**
 * Mounts one component under one client and renders it once.
 *
 * @param component - The component to mount.
 * @param client - The auth client the module provides.
 * @returns The mounted fixture.
 */
function mount<T>(component: Type<T>, client: Client): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Reads one labelled control.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @returns The element.
 */
function control<T extends HTMLElement>(fixture: ComponentFixture<unknown>, label: string): T {
  return fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as T
}

/**
 * Types into a native input, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function typeField(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const input = control<HTMLInputElement>(fixture, label)
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/**
 * Submits one labelled form.
 *
 * @param fixture - The mounted fixture.
 * @param label - The form's aria-label.
 */
function submit(fixture: ComponentFixture<unknown>, label: string): void {
  control<HTMLFormElement>(fixture, label).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
}

/**
 * Lets pending promises land, then renders one change detection.
 *
 * @param fixture - The mounted fixture.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  duplicateSignup = false
  staleSubmit = false
  vi.unstubAllGlobals()
})

describe('disposable scaffold auth journey', () => {
  it('registers with the app’s own typed fields through the envelope, exactly once', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    const fixture = mount(SignupPageComponent, client)
    await settle(fixture)

    typeField(fixture, 'Email', 'reader@example.test')
    typeField(fixture, 'Username', 'reader')
    typeField(fixture, 'Password', 'long-password')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )

    const form = control<HTMLFormElement>(fixture, 'Create account')
    submit(fixture, 'Create account')
    await settle(fixture)

    // One submit is one mutation.
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    const [url, init] = fetchBoundary.mock.calls[0]
    expect(String(url)).toBe('https://api.example.test/users')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      user: { email: 'reader@example.test', password: 'long-password', username: 'reader' },
    })
    // The form stays mounted (with its values) while the request is in flight.
    expect(control(fixture, 'Create account')).toBe(form)
    expect(control<HTMLInputElement>(fixture, 'Username').value).toBe('reader')

    answer(
      jsonResponse(
        {
          props: { username: 'reader', email: 'reader@example.test', name: 'Reader' },
          user: { username: 'reader', email: 'reader@example.test', name: 'Reader' },
          accessToken: 'access-token',
        },
        201,
      ),
    )
    await settle(fixture)

    expect(client.getState().status).toBe('authenticated')
    expect(client.getState().user).toMatchObject({ id: 'reader', name: 'Reader' })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
  })

  it('renders a rejected sign-in’s API body without remounting the form or losing input', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    const fixture = mount(LoginPageComponent, client)
    await settle(fixture)

    const form = control<HTMLFormElement>(fixture, 'Sign in')
    const email = control<HTMLInputElement>(fixture, 'Email')
    typeField(fixture, 'Email', 'reader@example.test')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    submit(fixture, 'Sign in')
    await settle(fixture)
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('Signing in')
    expect(control(fixture, 'Email')).toBe(email)

    answer(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await settle(fixture)

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toBe(
      'credentials is invalid',
    )
    // The SAME nodes, with the typed value still in them.
    expect(control(fixture, 'Sign in')).toBe(form)
    expect(control(fixture, 'Email')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull()
  })

  it('edits, revalidates while typing, resets, and saves the latest DOM values', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })
    const fixture = mount(ProfileShellComponent, client)
    await settle(fixture)

    expect(fixture.nativeElement.querySelector('[data-testid="profile-name"]').textContent).toBe(
      'Reader',
    )
    const name = control<HTMLInputElement>(fixture, 'Name')
    const bio = control<HTMLTextAreaElement>(fixture, 'Bio')
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    typeField(fixture, 'Name', 'Reader Edited')
    typeField(fixture, 'Bio', 'Typed while the check was running')

    // A delayed session revalidation lands MID-TYPING. The answer is the same
    // data the client already holds — it must not reset the form.
    let revalidation!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        revalidation = resolve
      }),
    )
    const validation = client.validateSession?.() ?? Promise.resolve()
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    revalidation(
      jsonResponse({
        props: { ...seededUser, username: 'reader' },
        accessToken: 'access-token',
      }),
    )
    await validation
    await settle(fixture)

    expect(control<HTMLInputElement>(fixture, 'Name').value).toBe('Reader Edited')
    expect(control<HTMLTextAreaElement>(fixture, 'Bio').value).toBe(
      'Typed while the check was running',
    )

    // Reset restores the SERVER's values, in the DOM.
    const resetButton = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement
    resetButton.click()
    fixture.detectChanges()
    expect(control<HTMLInputElement>(fixture, 'Name').value).toBe('Reader')
    expect(control<HTMLTextAreaElement>(fixture, 'Bio').value).toBe('First bio')

    // Type again and save: the request carries the DOM values, and every
    // reader of `useAuth().user` sees the saved profile without a reload.
    typeField(fixture, 'Name', 'Latest Name')
    typeField(fixture, 'Bio', 'Latest bio')
    let saved!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        saved = resolve
      }),
    )
    submit(fixture, 'Settings')
    await settle(fixture)
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    const [, init] = fetchBoundary.mock.calls[1]
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Latest Name', bio: 'Latest bio' })

    saved(
      jsonResponse({
        props: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
        user: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
        accessToken: 'access-token',
      }),
    )
    await settle(fixture)

    expect(client.getUser()?.name).toBe('Latest Name')
    expect(fixture.nativeElement.querySelector('[data-testid="profile-name"]').textContent).toBe(
      'Latest Name',
    )
    expect(fixture.nativeElement.querySelector('[data-testid="settings-saved"]').textContent).toBe(
      'Saved Latest Name',
    )
  })
})

describe('known-bad controls (the journey’s guards have teeth)', () => {
  it('detects duplicate registration: the API helper plus the auth client create twice', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    duplicateSignup = true
    const fixture = mount(SignupPageComponent, client)
    await settle(fixture)

    typeField(fixture, 'Email', 'reader@example.test')
    typeField(fixture, 'Username', 'reader')
    typeField(fixture, 'Password', 'long-password')

    fetchBoundary
      .mockResolvedValueOnce(
        jsonResponse(
          {
            props: { username: 'reader', email: 'reader@example.test' },
            user: { username: 'reader', email: 'reader@example.test' },
            accessToken: 'access-token',
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { errorKey: 'user.error.usernameUnavailable', error: 'already registered' },
          409,
        ),
      )

    submit(fixture, 'Create account')
    await settle(fixture)

    // The detector the journey asserts against: TWO registrations went out and
    // the second answered 409. This is the failure "exactly once" prevents.
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(fetchBoundary.mock.calls[1][1]?.method).toBe('POST')
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'already registered',
    )
  })

  it('detects a loading-state remount: the typed form is replaced and its input lost', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    fetchBoundary.mockReturnValue(new Promise<Response>(() => undefined))
    const client = createDisposableClient()
    const fixture = mount(RemountingGuardComponent, client)
    await settle(fixture)

    const email = control<HTMLInputElement>(fixture, 'Email')
    typeField(fixture, 'Email', 'reader@example.test')
    submit(fixture, 'Sign in')
    await settle(fixture)

    // The old body-loss failure: the node is gone and the typed value with it.
    const after = control<HTMLInputElement>(fixture, 'Email')
    expect(after).not.toBe(email)
    expect(after.value).toBe('')
  })

  it('detects a stale submission: the request carries values from before the edit', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })
    staleSubmit = true
    const fixture = mount(SettingsPageComponent, client)
    await settle(fixture)

    typeField(fixture, 'Name', 'Latest Name')
    typeField(fixture, 'Bio', 'Latest bio')
    fetchBoundary.mockResolvedValueOnce(
      jsonResponse({ props: { ...seededUser, name: 'Latest Name' } }),
    )

    submit(fixture, 'Settings')
    await settle(fixture)

    const [, init] = fetchBoundary.mock.calls[0]
    // The client reads the response body; the assertion is about what was SENT.
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Reader', bio: 'First bio' })
  })
})

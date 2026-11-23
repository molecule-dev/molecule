// @vitest-environment jsdom

/**
 * Signed-in account edits through the Angular binding, over the real JWT auth
 * client: `useAuth.updateProfile` uses the configured profile transport and
 * publishes the saved user before a form remount, a rejected save keeps the
 * previous shared user, and `useProfileForm` owns the page's controlled values
 * across late account hydration.
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

import type { AuthClient } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../hooks/use-auth.js'
import { useProfileForm } from '../hooks/use-profile-form.js'
import { provideMolecule } from '../providers.js'

interface Account {
  memberKey: string
  displayName: string
  timezone: string
}

/** The account's controlled form values. */
interface AccountValues {
  displayName: string
  timezone: string
}

const initial: Account = { memberKey: 'employee-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...initial, displayName: 'Saved name' }
const clients: AuthClient<Account>[] = []

/**
 * The auth client, the profile transport's request bodies and the client's
 * storage, wired the way a page wires them.
 *
 * @returns The client and what the transport recorded.
 */
function setup(): { client: AuthClient<Account>; writes: unknown[]; items: Map<string, string> } {
  let server = { ...initial }
  const writes: unknown[] = []
  const items = new Map<string, string>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        const body = JSON.parse(String(options.body)) as { account: Partial<Account> }
        writes.push(body)
        server = { ...server, ...body.account }
      }
      return Response.json({ account: server })
    }),
  )
  const client = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/employees/current',
    profileEndpoint: '/employees/current',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (account) => ({ account }),
    mapAuthResponse: (data) => ({ user: (data as { account: Account }).account }),
    storage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value)
      },
      removeItem: (key) => {
        items.delete(key)
      },
    },
  })
  client.setSession({ accessToken: 'employee-token', user: initial })
  clients.push(client)
  return { client, writes, items }
}

/**
 * Configures a fresh testing module around one client and creates a component.
 *
 * @param component - The component to mount.
 * @param client - The auth client the module provides.
 * @returns The mounted fixture.
 */
function mount<T>(component: Type<T>, client: AuthClient<Account>): ComponentFixture<T> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  return TestBed.createComponent(component)
}

/**
 * Reads one element from the fixture's DOM.
 *
 * @param fixture - The mounted fixture.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function query<T extends HTMLElement>(fixture: ComponentFixture<unknown>, selector: string): T {
  return fixture.nativeElement.querySelector(selector) as T
}

/**
 * Types into a native input, the way a person does.
 *
 * @param input - The input element.
 * @param value - The typed value.
 */
function type(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
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

/**
 * Polls until the predicate holds, rendering between attempts.
 *
 * @param fixture - The mounted fixture.
 * @param predicate - The condition to reach.
 */
async function waitFor(
  fixture: ComponentFixture<unknown>,
  predicate: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition was not met')
    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()
  }
}

/** Exposes the `useAuth` instance a page's actions run through. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-auth-host',
  template: '',
})
class AuthHostComponent {
  readonly auth = useAuth<Account>()
}

/** A form that seeds its draft from the shared user once, at mount. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-account-editor',
  template: '<input aria-label="Account name" [value]="name" />',
})
class AccountEditorComponent {
  private readonly auth = useAuth<Account>()
  readonly name = this.auth.user()?.displayName ?? ''
}

/** A form that loads the server itself on each visit. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-server-account-editor',
  template: '<input aria-label="Account name" [value]="name()" />',
})
class ServerAccountEditorComponent {
  readonly name = signal('')

  /**
   * Loads the account from the server, the way a server-owned page does.
   */
  ngOnInit(): void {
    void fetch('/employees/current')
      .then((response) => response.json())
      .then((body: { account: Account }) => this.name.set(body.account.displayName))
  }
}

/** The managed profile form: controlled values over the shared account. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-managed-account-editor',
  template: `
    <form aria-label="Account" (submit)="form.formProps.onSubmit($event)">
      <input
        aria-label="Account name"
        [value]="form.formState().values.displayName"
        (input)="form.register('displayName').onChange($event)"
      />
      <input
        aria-label="Timezone"
        [value]="form.formState().values.timezone"
        (input)="form.register('timezone').onChange($event)"
      />
      <button type="submit" [disabled]="!form.ready() || form.isSubmitting()">Save</button>
    </form>
  `,
})
class ManagedAccountEditorComponent {
  readonly form = useProfileForm<Account, AccountValues>({
    defaultValues: { displayName: '', timezone: '' },
    toValues: (user) => ({ displayName: user.displayName, timezone: user.timezone }),
    toPatch: (changes) => changes,
  })
}

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
})

describe('signed-in account edits', () => {
  it('useAuth saves through the configured profile transport before a form remount', async () => {
    const { client, writes, items } = setup()
    const host = mount(AuthHostComponent, client)
    host.detectChanges()
    expect(host.componentInstance.auth.updateProfile).toBeTypeOf('function')
    const action = host.componentInstance.auth.updateProfile
    expect(action).toBeTypeOf('function')
    const answer = await action({ displayName: saved.displayName })

    expect(answer).toEqual(saved)
    expect(host.componentInstance.auth.user()).toEqual(saved)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    const storedUser = items.get('molecule:auth:user')
    expect(storedUser).toBeDefined()
    expect(JSON.parse(String(storedUser))).toEqual(saved)
    expect(host.componentInstance.auth.updateProfile).toBe(action)
    host.destroy()
    const editor = mount(AccountEditorComponent, client)
    editor.detectChanges()
    expect(query<HTMLInputElement>(editor, '[aria-label="Account name"]').value).toBe(
      saved.displayName,
    )
  })

  it('a rejected useAuth profile save keeps the previous shared user', async () => {
    const { client } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Invalid name' }, { status: 422 })),
    )
    const host = mount(AuthHostComponent, client)
    host.detectChanges()
    expect(host.componentInstance.auth.updateProfile).toBeTypeOf('function')
    await expect(
      host.componentInstance.auth.updateProfile({ displayName: '' }),
    ).rejects.toHaveProperty('status', 422)
    expect(host.componentInstance.auth.user()).toEqual(initial)
  })

  it('counterexample: a custom save followed by setUser keeps the next form correct', async () => {
    const { client } = setup()
    const host = mount(AuthHostComponent, client)
    host.detectChanges()
    const response = await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    const body = (await response.json()) as { account: Account }
    host.componentInstance.auth.setUser(body.account)
    host.destroy()
    const editor = mount(AccountEditorComponent, client)
    editor.detectChanges()
    expect(query<HTMLInputElement>(editor, '[aria-label="Account name"]').value).toBe(
      saved.displayName,
    )
  })

  it('counterexample: a form that loads the server on each visit can own its values', async () => {
    const { client } = setup()
    await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    const editor = mount(ServerAccountEditorComponent, client)
    editor.detectChanges()
    await waitFor(
      editor,
      () =>
        query<HTMLInputElement>(editor, '[aria-label="Account name"]').value === saved.displayName,
    )
    expect(client.getUser()).toEqual(initial)
  })

  it('useProfileForm preserves a typed field through late account hydration and saves it for the next visit', async () => {
    const { client, writes } = setup()
    client.setUser({ ...initial, timezone: '' })
    const view = mount(ManagedAccountEditorComponent, client)
    view.detectChanges()
    await settle(view)
    const nameInput = query<HTMLInputElement>(view, '[aria-label="Account name"]')
    type(nameInput, saved.displayName)
    view.detectChanges()
    client.setUser(initial)
    await settle(view)
    expect(query<HTMLInputElement>(view, '[aria-label="Account name"]').value).toBe(
      saved.displayName,
    )
    expect(query<HTMLInputElement>(view, '[aria-label="Timezone"]').value).toBe('UTC')
    query<HTMLFormElement>(view, 'form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await waitFor(view, () => client.getUser()?.displayName === saved.displayName)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    view.destroy()
    const next = mount(ManagedAccountEditorComponent, client)
    next.detectChanges()
    await settle(next)
    expect(query<HTMLInputElement>(next, '[aria-label="Account name"]').value).toBe(
      saved.displayName,
    )
  })
})

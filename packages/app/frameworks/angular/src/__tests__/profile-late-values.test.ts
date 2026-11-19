// @vitest-environment jsdom

/**
 * Late auth records and profile writes through the Angular binding.
 *
 * The same inputs and expected values React's `profile-late-values.test.tsx`
 * pins, over the shared auth and forms clients: a record that lands after the
 * person started typing must not undo their edits, an untouched populated list
 * must not create a mutation, and a pristine empty list must hydrate.
 *
 * @module
 */

import '@angular/compiler'
import { Component, computed, provideZonelessChangeDetection, signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useForm } from '../hooks/use-forms.js'
import { useProfileForm } from '../hooks/use-profile-form.js'
import { provideMolecule } from '../providers.js'

const loaded = {
  id: 'reader-1',
  username: 'reader',
  email: 'reader@example.test',
  bio: 'Server bio',
  image: 'server.png',
  tags: ['old'],
}
type User = typeof loaded
type Fields = Omit<User, 'id'>
const defaults: Fields = { username: '', email: '', bio: '', image: '', tags: [] }

/** One held promise a test releases by hand. */
function deferred<T>(): { resolve: (value: T) => void; promise: Promise<T> } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { resolve, promise }
}

const clients: AuthClient<User>[] = []

/**
 * The auth client, its memory storage and the profile transport's recorded
 * patches, wired the way a page wires them.
 *
 * @param initial - The user the previous document left in the session.
 * @returns The client, the recorded writes and the transport spy.
 */
function setup(initial?: User) {
  const storage = new Map<string, string>()
  const client = createJWTAuthClient<User>({
    autoRefresh: false,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value)
      },
      removeItem: (key) => {
        storage.delete(key)
      },
    },
  })
  if (initial) client.setSession({ accessToken: 'opaque-token', user: initial })
  clients.push(client)
  const writes: Partial<User>[] = []
  const mutations = vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    writes.push(patch)
    const saved = { ...loaded, ...client.getUser(), ...patch }
    client.setUser(saved)
    return saved
  })
  return { client, writes, mutations }
}

/** The defaults the settings component is mounted with. */
let activeDefaults: Fields = { ...defaults }
/** The validation the settings component is mounted with. */
let activeValidate: ((values: Fields) => Promise<Partial<Record<keyof Fields, string>>>) | undefined

/** The managed profile form React's `Settings` component renders. */
@Component({
  selector: 'app-test-settings-page',
  template: `
    <form aria-label="Settings" (submit)="form.formProps.onSubmit($event)">
      <input
        aria-label="Username"
        [value]="form.formState().values.username"
        (input)="form.register('username').onChange($event)"
      />
      <input
        aria-label="Email"
        [value]="form.formState().values.email"
        (input)="form.register('email').onChange($event)"
      />
      <textarea
        aria-label="Bio"
        [value]="form.formState().values.bio"
        (input)="form.register('bio').onChange($event)"
      ></textarea>
      <input
        aria-label="Image"
        [value]="form.formState().values.image"
        (input)="form.register('image').onChange($event)"
      />
      <output aria-label="Tags">{{ tagsJson() }}</output>
      <output aria-label="Errors">{{ errorsJson() }}</output>
      <button type="button" (click)="form.setValue('tags', [])">Clear tags</button>
      <button type="submit" [disabled]="!form.ready() || form.isSubmitting()">Save</button>
    </form>
  `,
})
class SettingsComponent {
  readonly form = useProfileForm<User, Fields>({
    defaultValues: activeDefaults,
    toValues: ({ username, email, bio, image, tags }) => ({
      username,
      email,
      bio,
      image,
      tags,
    }),
    toPatch: (changes) => changes,
    validate: activeValidate,
  })

  /**
   * The tags field as rendered text.
   *
   * @returns The JSON of the tags value.
   */
  tagsJson(): string {
    return JSON.stringify(this.form.getValue('tags'))
  }

  /**
   * The form errors as rendered text.
   *
   * @returns The JSON of the error map.
   */
  errorsJson(): string {
    return JSON.stringify(this.form.formState().errors)
  }
}

/**
 * Configures a fresh testing module around one client and creates the settings page.
 *
 * @param client - The auth client the module provides.
 * @returns The mounted fixture.
 */
function mount(client: AuthClient<User>): ComponentFixture<SettingsComponent> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(SettingsComponent)
  fixture.detectChanges()
  return fixture
}

/**
 * Reads one labelled control's value.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @returns The input's current value.
 */
const value = (fixture: ComponentFixture<unknown>, label: string): string =>
  (fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLInputElement).value

/**
 * Types into a native input, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function typeField(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const input = fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as
    HTMLInputElement | HTMLTextAreaElement
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/** Types the bio and image edits the shared helpers assert on. */
function typeEdits(fixture: ComponentFixture<unknown>): void {
  typeField(fixture, 'Bio', 'Typed bio')
  typeField(fixture, 'Image', 'typed.png')
}

/** Asserts the typed edits are still in the controls. */
function expectEdits(fixture: ComponentFixture<unknown>): void {
  expect(value(fixture, 'Bio')).toBe('Typed bio')
  expect(value(fixture, 'Image')).toBe('typed.png')
}

/** Submits the settings form. */
function save(fixture: ComponentFixture<unknown>): void {
  const form = fixture.nativeElement.querySelector('[aria-label="Settings"]') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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

/**
 * Submits and asserts the recorded write carries the typed edits and no blanks.
 *
 * @param fixture - The mounted fixture.
 * @param api - What {@link setup} returned.
 */
async function expectSaved(
  fixture: ComponentFixture<unknown>,
  api: ReturnType<typeof setup>,
): Promise<void> {
  save(fixture)
  await waitFor(fixture, () => api.writes.length === 1)
  expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expect(api.writes[0].username).not.toBe('')
  expect(api.writes[0].email).not.toBe('')
  expectEdits(fixture)
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
  activeDefaults = { ...defaults }
  activeValidate = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Settings late records and profile writes', () => {
  it('hydrates the first user after typing', async () => {
    const api = setup()
    const fixture = mount(api.client)
    typeEdits(fixture)
    api.client.setUser(loaded)
    await settle(fixture)
    expectEdits(fixture)
    expect(value(fixture, 'Username')).toBe('reader')
    expect(value(fixture, 'Email')).toBe('reader@example.test')
    await expectSaved(fixture, api)
  })

  it('retains edits through repeated same-user hydration', async () => {
    const api = setup()
    const fixture = mount(api.client)
    typeEdits(fixture)
    api.client.setUser(loaded)
    await settle(fixture)
    fixture.detectChanges()
    api.client.setUser({ ...loaded })
    await settle(fixture)
    expectEdits(fixture)
    await expectSaved(fixture, api)
  })

  it.each(['before submit', 'during validation', 'after submit'] as const)(
    'keeps edits when a profile response lands %s',
    async (when) => {
      const api = setup(loaded)
      const response = deferred<User>()
      const validation = deferred<Partial<Record<keyof Fields, string>>>()
      activeValidate = when === 'during validation' ? () => validation.promise : undefined
      const fixture = mount(api.client)
      const request = response.promise.then((user) => api.client.setUser(user))
      typeEdits(fixture)
      if (when !== 'before submit') save(fixture)
      if (when === 'after submit') await waitFor(fixture, () => api.writes.length === 1)
      response.resolve({ ...loaded, username: 'background-name' })
      await request
      await settle(fixture)
      expectEdits(fixture)
      if (when === 'during validation') {
        validation.resolve({})
        await settle(fixture)
      }
      if (when === 'before submit') await expectSaved(fixture, api)
      else {
        await waitFor(fixture, () => api.writes.length === 1)
        expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
      }
      fixture.destroy()
    },
  )

  it('keeps cleared tags through a late record and submits the clear', async () => {
    const api = setup(loaded)
    activeDefaults = { ...defaults, tags: ['old'] }
    const fixture = mount(api.client)
    await settle(fixture)
    const clearTags = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement
    clearTags.click()
    fixture.detectChanges()
    typeEdits(fixture)
    api.client.setUser({ ...loaded, tags: ['restored'] })
    await settle(fixture)
    expect(fixture.nativeElement.querySelector('[aria-label="Tags"]').textContent).toBe('[]')
    await expectSaved(fixture, api)
    expect(api.writes[0].tags).toEqual([])
  })

  it('keeps an unchanged field submit error through a selective refresh', async () => {
    const api = setup(loaded)
    const validation = deferred<Partial<Record<keyof Fields, string>>>()
    activeValidate = () => validation.promise
    const fixture = mount(api.client)
    await settle(fixture)
    save(fixture)
    api.client.setUser({ ...loaded, bio: 'Background bio' })
    await settle(fixture)
    validation.resolve({ username: 'Rejected name' })
    await waitFor(
      fixture,
      () =>
        fixture.nativeElement.querySelector('[aria-label="Errors"]').textContent ===
        '{"username":"Rejected name"}',
    )
    expect(api.mutations).not.toHaveBeenCalled()
  })

  it('sends no blank fields while loading and saves after hydration', async () => {
    const api = setup()
    const fixture = mount(api.client)
    typeEdits(fixture)
    expect(
      (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
    ).toBe(true)
    save(fixture)
    await settle(fixture)
    expect(api.mutations).not.toHaveBeenCalled()
    api.client.setUser(loaded)
    await settle(fixture)
    expectEdits(fixture)
    await expectSaved(fixture, api)
  })
})

it('a native me() read started before save cannot restore the old profile or controls', async () => {
  const api = setup(loaded)
  api.mutations.mockRestore()
  const staleRead = deferred<Response>()
  const patches: Partial<User>[] = []
  const fetchMock = vi.fn<typeof fetch>(async (input, options) => {
    if (String(input).endsWith('/users/me')) return staleRead.promise
    const patch = JSON.parse(String(options?.body)) as Partial<User>
    patches.push(patch)
    return new Response(JSON.stringify({ user: { ...loaded, ...patch } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  const fixture = mount(api.client)
  const read = api.client.validateSession!()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  typeEdits(fixture)
  save(fixture)
  await waitFor(fixture, () => api.client.getUser()?.bio === 'Typed bio')
  await waitFor(
    fixture,
    () =>
      !(fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
  )
  expect(patches).toHaveLength(1)
  expect(patches[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expectEdits(fixture)
  staleRead.resolve(
    new Response(JSON.stringify({ user: loaded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await read
  await settle(fixture)
  expectEdits(fixture)
  expect(api.client.getUser()?.bio).toBe('Typed bio')
})

it('an untouched populated list does not create a profile mutation', async () => {
  const api = setup(loaded)
  activeDefaults = { ...defaults, tags: ['old'] }
  const fixture = mount(api.client)
  await settle(fixture)
  expect(fixture.nativeElement.querySelector('[aria-label="Tags"]').textContent).toBe('["old"]')
  save(fixture)
  await settle(fixture)
  expect(api.mutations).not.toHaveBeenCalled()
})

it('a pristine empty default list hydrates from the late populated user record', async () => {
  const api = setup()
  const fixture = mount(api.client)
  expect(fixture.nativeElement.querySelector('[aria-label="Tags"]').textContent).toBe('[]')
  api.client.setUser(loaded)
  await settle(fixture)
  expect(fixture.nativeElement.querySelector('[aria-label="Tags"]').textContent).toBe('["old"]')
})

it('a real list edit still sends the new list', async () => {
  const api = setup(loaded)
  activeDefaults = { ...defaults, tags: ['old'] }
  const fixture = mount(api.client)
  await settle(fixture)
  const clearTags = fixture.nativeElement.querySelector(
    'button[type="button"]',
  ) as HTMLButtonElement
  clearTags.click()
  fixture.detectChanges()
  save(fixture)
  await waitFor(fixture, () => api.writes.length === 1)
  expect(api.writes).toEqual([{ tags: [] }])
})

it('the base form submits loaded fields with typed edits', async () => {
  const onSubmit = vi.fn()

  /** The base form: defaults plus externally loaded values, keeping dirty fields. */
  @Component({
    selector: 'app-test-base-settings',
    template: `
      <form aria-label="Settings" (submit)="runSubmit($event)">
        <textarea
          aria-label="Bio"
          [value]="form.formState().values.bio"
          (input)="form.register('bio').onChange($event)"
        ></textarea>
        <input
          aria-label="Image"
          [value]="form.formState().values.image"
          (input)="form.register('image').onChange($event)"
        />
      </form>
    `,
  })
  class BaseSettingsComponent {
    readonly user = signal<User | undefined>(undefined)
    readonly form = useForm<Fields>(
      computed(() => ({
        defaultValues: defaults,
        values: this.user(),
        resetOptions: { keepDirtyValues: true },
      })),
    )

    /**
     * Submits the current form values.
     *
     * @param event - The native submit event.
     */
    runSubmit(event: Event): void {
      void this.form.handleSubmit(onSubmit)(event)
    }
  }

  TestBed.configureTestingModule({
    imports: [BaseSettingsComponent],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(BaseSettingsComponent)
  fixture.detectChanges()

  typeEdits(fixture)
  fixture.componentInstance.user.set(loaded)
  await settle(fixture)
  expectEdits(fixture)
  await settle(fixture)
  save(fixture)
  await settle(fixture)
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      username: 'reader',
      email: 'reader@example.test',
      bio: 'Typed bio',
      image: 'typed.png',
    }),
  )
})

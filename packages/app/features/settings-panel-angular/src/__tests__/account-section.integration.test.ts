// @vitest-environment jsdom
/**
 * Unit tests of `AccountSection` — the port of
 * `@molecule/app-settings-panel-react`'s integration suite. The React suite
 * renders the section with mocked UI dependencies, a fake HTTP client and a
 * REAL JWT auth client, then drives it like a user; this port mounts the same
 * tree through Angular's real renderer (the `createApplication` + JIT host
 * approach the conformance kit's Angular adapter uses), mocking the same
 * seams: the ClassMap (a token-echo proxy), the UI components (passthrough
 * elements) and the binding's `useHttpClient` / `useTranslation` (the fake
 * client and the English defaults), with the binding's real `AUTH_CLIENT`
 * token providing the real auth client.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  computed,
  createComponent,
  type EventEmitter,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `sectionHeading`), so tests can assert markup without a real bond. Members
// the ClassMap API exposes as functions return the token string when called;
// everything else IS the token string (a `[class]` binding needs a string).
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const callable = new Set(['sp', 'stack', 'textSize', 'fontWeight', 'maxW'])
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
        if (callable.has(token)) return (..._args: unknown[]) => token
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The UI components the section composes, as passthrough elements — the same
// observable contracts the React suite's mocks have.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, ElementRef, EventEmitter, viewChild } = await import('@angular/core')
  return {
    Flex: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-flex]',
      standalone: true,
      inputs: ['direction', 'justify', 'align', 'wrap', 'gap', 'className', 'style', 'testId'],
      host: { 'data-flex': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockFlex {
        /** Flex direction. */
        direction?: string
        /** Main-axis justification. */
        justify?: string
        /** Cross-axis alignment. */
        align?: string
        /** Wrapping behavior. */
        wrap?: string
        /** Gap. */
        gap?: number | string
        /** Extra classes. */
        className?: string
        /** Inline style object. */
        style?: Record<string, unknown>
        /** `data-testid`. */
        testId?: string
      },
    ),
    Input: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-input]',
      standalone: true,
      inputs: ['type', 'size', 'value', 'name', 'id', 'required', 'disabled', 'placeholder'],
      outputs: ['change'],
      template: `<input
        [attr.type]="type"
        [attr.id]="id"
        [attr.name]="name"
        [attr.value]="value"
        (input)="onInput($event)"
        #mockInput
      />`,
    })(
      class MockInput {
        /** Input type. */
        type?: string
        /** Input size. */
        size?: string
        /** Controlled value. */
        value?: string
        /** Field name. */
        name?: string
        /** Explicit id. */
        id?: string
        /** Marks the input required. */
        required?: boolean
        /** Disables the input. */
        disabled?: boolean
        /** Placeholder text. */
        placeholder?: string

        /** Fires the raw input event (React's text-input onChange). */
        change: EventEmitter<Event> = new EventEmitter()

        /** The native input (React's controlled property restore target). */
        readonly mockInput = viewChild('mockInput', { read: ElementRef })

        /**
         * Restores the controlled value every check (React's re-render writes
         * the `value` property).
         */
        ngDoCheck(): void {
          const query = this.mockInput()
          const input = query?.nativeElement as HTMLInputElement | undefined
          if (input && this.value !== undefined && input.value !== String(this.value)) {
            input.value = String(this.value)
          }
        }

        /**
         * Emits the native input event.
         * @param event - The native input event.
         */
        onInput(event: Event): void {
          this.change.emit(event)
        }
      },
    ),
    Spinner: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-spinner]',
      standalone: true,
      inputs: ['size', 'color', 'label', 'className'],
      host: { role: 'status', 'data-spinner': '' },
      template: '',
    })(
      class MockSpinner {
        /** Spinner size. */
        size?: string
        /** Spinner color. */
        color?: string
        /** Accessible label. */
        label?: string
        /** Extra classes. */
        className?: string
      },
    ),
  }
})

// Real binding hooks/tokens, with the two seams the React suite mocks
// overridden: the HTTP client (the fake below) and translation (defaults).
const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useHttpClient: () => http,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})

import { provideAuth, provideDomPlacement, useAuth, useProfileForm } from '@molecule/app-angular'
import type { AuthClient, AuthProfileConstraint, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { AccountSection } from '../account-section.component.js'

const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value)
    },
    removeItem: (key: string): void => {
      values.delete(key)
    },
  }
}
function clientFor<T extends AuthProfileConstraint<T>>(user: T): AuthClient<T> {
  const client = createJWTAuthClient<T>({
    storage: storage(),
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: token, user })
  return client
}
function publishUpdates<T extends object>(client: AuthClient<T>): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    const saved = { ...(client.getUser() as object), ...patch } as T
    client.setUser(saved)
    return saved
  })
}
const control = (label: string): HTMLInputElement => {
  const htmlFor = [...document.querySelectorAll('label')]
    .find((l) => l.textContent === label)
    ?.getAttribute('for')
  if (!htmlFor) throw new Error(`no label "${label}"`)
  return document.getElementById(htmlFor) as HTMLInputElement
}
const field = control
const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const second = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }

/** Drains microtasks and a macrotask, then refreshes the Angular app. */
async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await current?.flush()
}

/** The mounted account section host. */
let current: { flush(): Promise<void>; destroy(): Promise<void> } | null = null

/**
 * Mounts `AccountSection` under a REAL auth client through a JIT host. The
 * host lives in a disposable container (the kit's mount shape): the binding
 * parks hook lanes at the container's site while it stays connected, so the
 * teardown must REMOVE it for the next mount to start fresh.
 * @param client - The auth client.
 */
async function mountAccount(client: AuthClient<unknown>): Promise<void> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideAuth(client)],
  })
  const ref: ComponentRef<unknown> = createComponent(AccountSection as Type<unknown>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(host)
  appRef.attachView(ref.hostView)
  const tick = async (): Promise<void> => {
    appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    appRef.tick()
  }
  await tick()
  current = {
    flush: tick,
    destroy: async () => {
      appRef.destroy()
      container.remove()
    },
  }
}

/** Types like a user: prototype setter, then a bubbling input event. */
async function type(fieldEl: HTMLInputElement, value: string): Promise<void> {
  const proto = Object.getPrototypeOf(fieldEl) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(fieldEl, value)
  else fieldEl.value = value
  fieldEl.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
}

/** Blurs like a user: blur, then a bubbling focusout (the section saves on it). */
async function blur(fieldEl: HTMLInputElement): Promise<void> {
  fieldEl.blur()
  fieldEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  await flush()
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
  http.get.mockReturnValue(new Promise(() => {}))
})
afterEach(async () => {
  if (current) await current.destroy()
  current = null
  // The binding parks hook lanes at their DOM site (the body) while the page
  // lives; wiping the body drops them so the next mount starts fresh, like a
  // fresh React render.
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  setI18nProvider(createSimpleI18nProvider())
})

describe('AccountSection actual caller', () => {
  it('keeps a dirty name while a same-account background read refreshes pristine email', async () => {
    const client = clientFor<UserProfile>(first)
    await mountAccount(client)
    await type(field('Name'), 'Typed name')
    await client.setUser({ ...first, name: 'Server name', email: 'fresh@example.test' })
    await flush()
    expect(field('Email').value).toBe('fresh@example.test')
    expect(field('Name').value).toBe('Typed name')
  })

  it('resets controls when the authenticated account changes', async () => {
    const client = clientFor<UserProfile>(first)
    await mountAccount(client)
    expect(field('Name').value).toBe('Alice')
    await client.setSession({ accessToken: token, user: second })
    await flush()
    expect(field('Name').value).toBe('Bob')
    expect(field('Email').value).toBe('bob@example.test')
  })

  it('submits only the changed field through the configured bonded profile transport on blur', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await mountAccount(client)
    await type(field('Name'), 'Alice edited')
    await blur(field('Name'))
    expect(update).toHaveBeenCalledWith({ name: 'Alice edited' })
    expect(http.patch).not.toHaveBeenCalled()
    expect(field('Name').value).toBe('Alice edited')
  })

  it('saves a changed name for a name-only account that has no email', async () => {
    const client = clientFor<UserProfile>({ id: 'phone-account', name: 'Pat' })
    const update = publishUpdates(client)
    await mountAccount(client)
    expect(field('Email').value).toBe('')
    await type(field('Name'), 'Pat renamed')
    await blur(field('Name'))
    expect(update).toHaveBeenCalledWith({ name: 'Pat renamed' })
    expect(client.getUser()).toEqual({ id: 'phone-account', name: 'Pat renamed' })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('refuses a malformed non-empty email with a field error, then saves the corrected one', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await mountAccount(client)
    await type(field('Email'), 'not-an-email')
    await blur(field('Email'))
    const alert = document.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('Invalid email address')
    expect(field('Email').getAttribute('aria-invalid')).toBe('true')
    expect(update).not.toHaveBeenCalled()

    await type(field('Email'), 'alice@new.example.test')
    await blur(field('Email'))
    expect(update).toHaveBeenCalledWith({ email: 'alice@new.example.test' })
  })

  it('shows the malformed-email error in the active locale', async () => {
    setI18nProvider(
      createSimpleI18nProvider('fr', [
        {
          code: 'fr',
          name: 'Français',
          translations: { 'forms.invalidEmail': 'Adresse e-mail invalide' },
        },
      ]),
    )
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await mountAccount(client)
    await type(field('Email'), 'not-an-email')
    await blur(field('Email'))
    const alert = document.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('Adresse e-mail invalide')
    expect(update).not.toHaveBeenCalled()
  })

  it('never sends a blank email: clearing it keeps the stored address while the name saves', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await mountAccount(client)
    await type(field('Email'), '')
    await type(field('Name'), 'Alice cleared')
    await blur(field('Name'))
    expect(update).toHaveBeenCalledWith({ name: 'Alice cleared' })
    expect(update).toHaveBeenCalledTimes(1)
    expect(client.getUser()?.email).toBe('alice@example.test')
  })
})

interface HandleUser {
  handle: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}
type ContactValues = { displayName: string; avatarUrl: string }

/** The ContactForm port: a custom-aliased profile over `useProfileForm`. */
const ContactHost = Component({
  selector: 'mol-contact-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<form aria-label="Contact" (submit)="form.formProps.onSubmit($event)">
      <input aria-label="Display name" [value]="displayName()" (input)="edit('displayName', $event)" />
      <input aria-label="Avatar URL" [value]="avatarUrl()" (input)="edit('avatarUrl', $event)" />
      <button type="submit">Save contact</button>
      <output aria-label="Contact client">{{ clientUser()?.handle }}</output>
    </form>`,
})(
  class ContactHost {
    /** The shared profile lifecycle over handle-keyed accounts. */
    form = useProfileForm<HandleUser, ContactValues>({
      defaultValues: { displayName: '', avatarUrl: '' },
      getIdentity: (user) => user.handle,
      toValues: (user) => ({
        displayName: user.displayName ?? '',
        avatarUrl: user.avatarUrl ?? '',
      }),
      toPatch: (changes) => ({
        ...('displayName' in changes ? { displayName: changes.displayName || null } : {}),
        ...('avatarUrl' in changes ? { avatarUrl: changes.avatarUrl || null } : {}),
      }),
    })

    /** The signed-in user (React's direct `client.getUser()` render). */
    auth = useAuth<HandleUser>()

    /** The name field's registration (its onChange tracks edits). */
    nameReg = this.form.register('displayName')
    /** The avatar field's registration. */
    avatarReg = this.form.register('avatarUrl')

    /** The current class map is unused here; values come from the form state. */
    readonly displayName = computed(() => {
      void this.form.formState()
      return this.form.getValue('displayName')
    })

    /** The avatar field's controlled value. */
    readonly avatarUrl = computed(() => {
      void this.form.formState()
      return this.form.getValue('avatarUrl')
    })

    /** The signed-in user as a signal read for the template. */
    readonly clientUser = computed(() => this.auth.user())

    /**
     * Forwards one field's edit to its registration.
     * @param name - The field to edit.
     * @param event - The native input event.
     */
    edit(name: 'displayName' | 'avatarUrl', event: Event): void {
      ;(name === 'displayName' ? this.nameReg : this.avatarReg).onChange(event)
    }
  },
)

/** Mounts one standalone component with the given providers. */
async function mountComponent(
  component: Type<unknown>,
  client: AuthClient<unknown>,
): Promise<void> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideAuth(client)],
  })
  const ref: ComponentRef<unknown> = createComponent(component, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(host)
  appRef.attachView(ref.hostView)
  const tick = async (): Promise<void> => {
    appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    appRef.tick()
  }
  await tick()
  current = {
    flush: tick,
    destroy: async () => {
      appRef.destroy()
      container.remove()
    },
  }
}

/** The active control lookup: by aria-label, or by a button's text content. */
const ariaControl = (label: string): HTMLElement => {
  const el =
    document.querySelector(`[aria-label="${label}"]`) ??
    [...document.querySelectorAll('button')].find((b) => b.textContent === label)
  if (!el) throw new Error(`no element "${label}"`)
  return el as HTMLElement
}

describe('representative non-X1 custom aliases and custom-form counterexample', () => {
  it('clears nullable aliases and switches handle-keyed accounts without an id', async () => {
    const alice: HandleUser = {
      handle: 'alice',
      email: 'alice@example.test',
      displayName: 'Alice',
      avatarUrl: 'alice.png',
    }
    const client = clientFor<HandleUser>(alice)
    const update = publishUpdates(client)
    await mountComponent(ContactHost, client)
    await type(ariaControl('Display name') as HTMLInputElement, '')
    await type(ariaControl('Avatar URL') as HTMLInputElement, '')
    ;(ariaControl('Save contact') as HTMLButtonElement).click()
    await flush()
    expect(update).toHaveBeenCalledWith({ displayName: null, avatarUrl: null })
    await client.setSession({
      accessToken: token,
      user: {
        handle: 'robert',
        email: 'robert@example.test',
        displayName: 'Robert',
        avatarUrl: null,
      },
    })
    await flush()
    expect((ariaControl('Display name') as HTMLInputElement).value).toBe('Robert')
    expect((ariaControl('Avatar URL') as HTMLInputElement).value).toBe('')
    expect(ariaControl('Contact client').textContent).toBe('robert')
  })

  it('keeps a non-profile newsletter form local and does not call profile transport', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    const NewsletterHost = Component({
      selector: 'mol-newsletter-host',
      standalone: true,
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<form aria-label="Newsletter" (submit)="submit($event)">
          <input aria-label="Weekly digest" type="checkbox" [checked]="digest()" (change)="toggle($event)" />
          <button type="submit">Save newsletter</button>
          @if (saved()) {
            <output aria-label="Newsletter state">{{ digest() }}</output>
          }
        </form>`,
    })(
      class NewsletterHost {
        /** The checkbox's local state. */
        readonly digest = signal(false)
        /** Whether the form was saved. */
        readonly saved = signal(false)

        /**
         * Toggles the digest.
         * @param event - The native change event.
         */
        toggle(event: Event): void {
          this.digest.set((event.target as HTMLInputElement).checked)
        }

        /**
         * Saves locally (no profile transport).
         * @param event - The native submit event.
         */
        submit(event: Event): void {
          event.preventDefault()
          this.saved.set(true)
        }
      },
    ) as Type<unknown>
    await mountComponent(NewsletterHost, client)
    ;(ariaControl('Weekly digest') as HTMLInputElement).click()
    ;(ariaControl('Save newsletter') as HTMLButtonElement).click()
    await flush()
    expect(ariaControl('Newsletter state').textContent).toBe('true')
    expect(update).not.toHaveBeenCalled()
    expect(http.patch).not.toHaveBeenCalled()
  })
})

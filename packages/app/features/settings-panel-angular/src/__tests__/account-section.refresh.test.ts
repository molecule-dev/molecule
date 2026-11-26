// @vitest-environment jsdom
/**
 * Unit tests of `AccountSection`'s configured session refresh — the port of
 * `@molecule/app-settings-panel-react`'s refresh suite. The same seams are
 * mocked as in the integration port (the ClassMap proxy, passthrough UI
 * components, the binding's `useHttpClient`/`useTranslation`), with a REAL
 * JWT auth client whose configured routes run through a stubbed `fetch`.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  type ComponentRef,
  createComponent,
  type EventEmitter,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (members the
// ClassMap API exposes as functions return the token when called).
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The UI components the section composes, as passthrough elements.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component, ElementRef, EventEmitter, viewChild } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Flex: Component({
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

import { provideAuth, provideDomPlacement } from '@molecule/app-angular'
import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'

import { AccountSection } from '../account-section.component.js'

const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }

/** The mounted section, with its disposable container. */
let current: { flush(): Promise<void>; destroy(): Promise<void> } | null = null
const cleanups: (() => void)[] = []

/**
 * Mounts `AccountSection` under a REAL auth client through a JIT host. The
 * host lives in a disposable container, so the binding's parked hook lanes
 * drop when the teardown removes it.
 * @param client - The auth client.
 */
async function mountAccount(client: ReturnType<typeof clientFor>): Promise<void> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideAuth(client)],
  })
  const ref: ComponentRef<unknown> = createComponent(AccountSection as Type<unknown>, {
    environmentInjector: appRef.injector,
  })
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(ref.location.nativeElement as HTMLElement)
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

/** Drains microtasks and a macrotask, then refreshes the Angular app. */
async function flush(): Promise<void> {
  await current?.flush()
}

const field = (label: 'Name' | 'Email'): HTMLInputElement => {
  const htmlFor = [...document.querySelectorAll('label')]
    .find((l) => l.textContent === label)
    ?.getAttribute('for')
  if (!htmlFor) throw new Error(`no label "${label}"`)
  return document.getElementById(htmlFor) as HTMLInputElement
}

function clientFor() {
  const client = createJWTAuthClient<UserProfile>({
    storage: 'memory',
    autoRefresh: false,
    currentUserEndpoint: '/configured-current',
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: 'account-token', user: first })
  cleanups.push(() => client.destroy())
  return client
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

function deferred() {
  let resolve!: (body: { props: UserProfile }) => void
  const promise = new Promise<{ props: UserProfile }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
})
afterEach(async () => {
  if (current) await current.destroy()
  current = null
  cleanups.splice(0).forEach((cleanup) => cleanup())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AccountSection configured session refresh', () => {
  it('refreshes pristine fields through the configured auth route without overwriting a dirty field', async () => {
    const body = { props: { ...first, name: 'Server name', email: 'fresh@example.test' } }
    http.get.mockResolvedValue({ data: body })
    const fetch = vi.fn(async () => Response.json(body))
    vi.stubGlobal('fetch', fetch)
    await mountAccount(clientFor())
    await type(field('Name'), 'Typed name')
    await flush()
    expect(field('Email').value).toBe('fresh@example.test')
    expect(field('Name').value).toBe('Typed name')
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/configured-current',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(http.get).not.toHaveBeenCalled()
  })

  it('keeps a cached profile editable and saves through auth when the refresh is unavailable', async () => {
    http.get.mockRejectedValue(new Error('refresh unavailable'))
    const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'GET') return Response.json({ error: 'Unavailable' }, { status: 503 })
      return Response.json({ props: { ...first, ...JSON.parse(String(options?.body)) } })
    })
    vi.stubGlobal('fetch', fetch)
    const client = clientFor()
    await mountAccount(client)
    await flush()
    expect(client.getState().status).toBe('unavailable')
    expect(field('Name').value).toBe('Alice')
    expect(document.querySelector('[role="alert"]')).toBeNull()
    await type(field('Name'), 'Alice edited')
    await blur(field('Name'))
    await flush()
    expect(client.getUser()?.name).toBe('Alice edited')
    expect(fetch).toHaveBeenLastCalledWith(
      '/configured-profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Alice edited' }) }),
    )
    expect(http.patch).not.toHaveBeenCalled()
  })

  it('a read started before saving cannot replace the saved user or the next form', async () => {
    const read = deferred()
    http.get.mockImplementation(() => read.promise.then((data) => ({ data })))
    const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'GET') return Response.json(await read.promise)
      const patch = JSON.parse(String(options?.body)) as Partial<UserProfile>
      return Response.json({ props: { ...first, ...patch } })
    })
    vi.stubGlobal('fetch', fetch)
    const client = clientFor()
    await mountAccount(client)
    await type(field('Name'), 'Alice edited')
    await blur(field('Name'))
    await flush()
    expect(client.getUser()?.name).toBe('Alice edited')
    await current?.destroy()
    current = null
    const fresh = { ...first, name: 'Alice edited' }
    http.get.mockResolvedValue({ data: { props: fresh } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ props: fresh })),
    )
    await mountAccount(client)
    expect(field('Name').value).toBe('Alice edited')
    await read.resolve({ props: first })
    await read.promise
    await flush()
    expect(client.getUser()?.name).toBe('Alice edited')
  })

  it('a pending read cannot publish the previous account after a session switch', async () => {
    const read = deferred()
    http.get.mockImplementation(() => read.promise.then((data) => ({ data })))
    const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'GET') return Response.json(await read.promise)
      const patch = JSON.parse(String(options?.body)) as Partial<UserProfile>
      return Response.json({ props: { ...first, ...patch } })
    })
    vi.stubGlobal('fetch', fetch)
    const client = clientFor()
    await mountAccount(client)
    const other = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }
    client.setSession({ accessToken: 'other-token', user: other })
    await flush()
    await read.resolve({ props: first })
    await read.promise
    await flush()
    expect(client.getUser()).toEqual(other)
    expect(field('Name').value).toBe('Bob')
  })

  it('counterexample: a provider without optional validation still edits its cached account', async () => {
    const client = clientFor()
    Reflect.deleteProperty(client, 'validateSession')
    http.get.mockReturnValue(new Promise(() => {}))
    const fetch = vi.fn(async () => Response.json({ props: { ...first, name: 'Alice edited' } }))
    vi.stubGlobal('fetch', fetch)
    await mountAccount(client)
    expect(field('Name').value).toBe('Alice')
    expect(fetch).not.toHaveBeenCalled()
    await type(field('Name'), 'Alice edited')
    await blur(field('Name'))
    await flush()
    expect(client.getUser()?.name).toBe('Alice edited')
    expect(fetch).toHaveBeenCalledOnce()
  })
})

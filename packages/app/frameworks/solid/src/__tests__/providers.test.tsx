// @vitest-environment jsdom

/**
 * The provider components: each provides its service to the tree below it under the context
 * its primitive reads, `MoleculeProvider` provides every service it is given in either form,
 * and a changed service reaches the tree.
 *
 * @module
 */

import { type Context, createComponent, createSignal, type JSX, useContext } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { ChatContext } from '../chat-context.js'
import { ChatProvider } from '../chat-provider.js'
import {
  AuthContext,
  EditorContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  PreviewContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
  WorkspaceContext,
} from '../context.js'
import {
  AuthProvider,
  EditorProvider,
  HttpProvider,
  I18nProvider,
  LoggerProvider,
  MoleculeProvider,
  PreviewProvider,
  RouterProvider,
  StateProvider,
  StorageProvider,
  ThemeProvider,
  WorkspaceProvider,
} from '../provider.jsx'

const disposers: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a tree.
 *
 * @param app - Renders the tree.
 * @returns The container.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Mounts `wrap` and returns what a child read from `context`.
 *
 * @param context - The context the child reads.
 * @param wrap - Renders the provider around the given child.
 * @returns The value the child read.
 */
function readUnder<T>(
  context: Context<T>,
  wrap: (child: () => JSX.Element) => JSX.Element,
): T | 'not read' {
  let seen: T | 'not read' = 'not read'
  const Child = (): JSX.Element => {
    seen = useContext(context)
    return null
  }
  mount(() => wrap(() => createComponent(Child, {})))
  return seen
}

/** Reads one context under a tree; a list of them holds contexts of different services. */
type ContextReader = (wrap: (child: () => JSX.Element) => JSX.Element) => unknown

/**
 * A {@link ContextReader} for one context (Solid's `Context<T>` is invariant, so a list cannot
 * hold the contexts themselves).
 *
 * @param context - The context to read.
 * @returns The reader.
 */
const reader =
  <T,>(context: Context<T>): ContextReader =>
  (wrap) =>
    readUnder(context, wrap)

/** A distinct stand-in for each service, so a test can tell them apart by identity. */
const service = (name: string): { name: string } => ({ name })

/**
 * The stand-in's name.
 *
 * @param value - A context value.
 * @returns Its `name`, or an empty string.
 */
function nameOf(value: unknown): string {
  return typeof value === 'object' && value !== null && 'name' in value ? String(value.name) : ''
}

/** Stand-ins typed as any service: these cases check identity only. */
type Stand = never

describe('per-service provider components', () => {
  const cases: [string, ContextReader, (value: Stand, child: () => JSX.Element) => JSX.Element][] =
    [
      [
        'StateProvider',
        reader(StateContext),
        (provider, child) =>
          createComponent(StateProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'ThemeProvider',
        reader(ThemeContext),
        (provider, child) =>
          createComponent(ThemeProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'RouterProvider',
        reader(RouterContext),
        (router, child) =>
          createComponent(RouterProvider, {
            router,
            get children() {
              return child()
            },
          }),
      ],
      [
        'I18nProvider',
        reader(I18nContext),
        (provider, child) =>
          createComponent(I18nProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'HttpProvider',
        reader(HttpContext),
        (client, child) =>
          createComponent(HttpProvider, {
            client,
            get children() {
              return child()
            },
          }),
      ],
      [
        'StorageProvider',
        reader(StorageContext),
        (provider, child) =>
          createComponent(StorageProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'LoggerProvider',
        reader(LoggerContext),
        (provider, child) =>
          createComponent(LoggerProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'ChatProvider',
        reader(ChatContext),
        (provider, child) =>
          createComponent(ChatProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'WorkspaceProvider',
        reader(WorkspaceContext),
        (provider, child) =>
          createComponent(WorkspaceProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'EditorProvider',
        reader(EditorContext),
        (provider, child) =>
          createComponent(EditorProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'PreviewProvider',
        reader(PreviewContext),
        (provider, child) =>
          createComponent(PreviewProvider, {
            provider,
            get children() {
              return child()
            },
          }),
      ],
      [
        'AuthProvider',
        reader(AuthContext),
        (client, child) =>
          createComponent(AuthProvider, {
            client,
            awaitSession: false,
            get children() {
              return child()
            },
          }),
      ],
    ]

  it.each(cases)('%s provides its service to the tree below it', (name, context, wrap) => {
    const value = service(name)
    expect(context((child) => wrap(value as Stand, child))).toBe(value)
  })
})

describe('MoleculeProvider', () => {
  const contexts: [string, ContextReader][] = [
    ['theme', reader(ThemeContext)],
    ['router', reader(RouterContext)],
    ['i18n', reader(I18nContext)],
    ['http', reader(HttpContext)],
    ['storage', reader(StorageContext)],
    ['logger', reader(LoggerContext)],
    ['chat', reader(ChatContext)],
    ['workspace', reader(WorkspaceContext)],
    ['editor', reader(EditorContext)],
    ['preview', reader(PreviewContext)],
    ['state', reader(StateContext)],
  ]
  const values = Object.fromEntries(contexts.map(([key]) => [key, service(key)])) as Record<
    string,
    Stand
  >

  it('provides every service it is given under the context its primitive reads', () => {
    for (const [key, context] of contexts) {
      expect(
        context((child) =>
          createComponent(MoleculeProvider, {
            ...values,
            get children() {
              return child()
            },
          }),
        ),
      ).toBe(values[key])
    }
  })

  it('provides the same services from the deprecated config form', () => {
    for (const [key, context] of contexts) {
      expect(
        context((child) =>
          createComponent(MoleculeProvider, {
            config: values,
            get children() {
              return child()
            },
          }),
        ),
      ).toBe(values[key])
    }
  })

  it('leaves a service it was not given unprovided', () => {
    expect(
      readUnder(ThemeContext, (child) =>
        createComponent(MoleculeProvider, {
          get children() {
            return child()
          },
        }),
      ),
    ).toBeUndefined()
  })

  it('gives the tree a changed service', () => {
    const first = service('first')
    const second = service('second')
    const [current, setCurrent] = createSignal<Stand>(first as Stand)
    const Name = (): JSX.Element => <p>{nameOf(useContext(ThemeContext))}</p>
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        get theme() {
          return current()
        },
        get children() {
          return createComponent(Name, {})
        },
      }),
    )
    expect(container.textContent).toBe('first')
    setCurrent(second as Stand)
    expect(container.textContent).toBe('second')
  })

  it('keeps the tree mounted while its services stay the same', () => {
    const theme = service('theme') as Stand
    const [label, setLabel] = createSignal('first')
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        theme,
        get children() {
          return <input aria-label={label()} />
        },
      }),
    )
    const input = container.querySelector('input')
    setLabel('second')
    expect(container.querySelector('input')).toBe(input)
    expect(input?.getAttribute('aria-label')).toBe('second')
  })
})

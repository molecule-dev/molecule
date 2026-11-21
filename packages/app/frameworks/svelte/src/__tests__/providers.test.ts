// @vitest-environment jsdom

/**
 * The provider components: each sets its service in Svelte context for the tree below it,
 * `MoleculeProvider` sets every service it is given, and a changed service reaches the tree.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import {
  getAuthClient,
  getHttpClient,
  getI18nProvider,
  getLoggerProvider,
  getRouter,
  getStateProvider,
  getStorageProvider,
  getThemeProvider,
  useChatProvider,
  useEditorProvider,
  usePreviewProvider,
  useWorkspaceProvider,
} from '../context.js'
import {
  AuthProvider,
  ChatProvider,
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
} from '../providers/index.js'
import type { ProviderProps } from '../types.js'
import ChangingTheme from './providers/ChangingTheme.svelte'
import ProviderHost from './providers/ProviderHost.svelte'

const stops: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const stop of stops.splice(0)) await stop()
  document.body.innerHTML = ''
})

/** A distinct stand-in for each service, so a test can tell them apart by name. */
const service = (name: string): { name: string } => ({ name })

/** Stand-ins typed as any service: these cases check identity only. */
type Stand = never

/**
 * The stand-in's name.
 *
 * @param value - A context value.
 * @returns Its `name`, or an empty string.
 */
function nameOf(value: unknown): string {
  return typeof value === 'object' && value !== null && 'name' in value ? String(value.name) : ''
}

/**
 * Mounts `provider` with `props` around a probe that reads the context with `read`.
 *
 * @param provider - The provider component.
 * @param props - Its props.
 * @param read - Reads a service during the probe's initialization.
 * @returns The text the probe rendered.
 */
function textUnder<Props extends ProviderProps>(
  provider: Component<Props>,
  props: Props,
  read: () => string,
): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount<
    { provider: Component<Props>; props: Props; read: () => string },
    Record<never, never>
  >(ProviderHost, { target: container, props: { provider, props, read } })
  flushSync()
  stops.push(async () => {
    await unmount(app)
    container.remove()
  })
  return container.textContent ?? ''
}

describe('per-service provider components', () => {
  const value = (name: string): Stand => service(name) as Stand
  const cases: [string, () => string][] = [
    [
      'StateProvider',
      () =>
        textUnder(StateProvider, { provider: value('StateProvider') }, () =>
          nameOf(getStateProvider()),
        ),
    ],
    [
      'ThemeProvider',
      () =>
        textUnder(ThemeProvider, { provider: value('ThemeProvider') }, () =>
          nameOf(getThemeProvider()),
        ),
    ],
    [
      'RouterProvider',
      () =>
        textUnder(RouterProvider, { router: value('RouterProvider') }, () => nameOf(getRouter())),
    ],
    [
      'I18nProvider',
      () =>
        textUnder(I18nProvider, { provider: value('I18nProvider') }, () =>
          nameOf(getI18nProvider()),
        ),
    ],
    [
      'HttpProvider',
      () =>
        textUnder(HttpProvider, { client: value('HttpProvider') }, () => nameOf(getHttpClient())),
    ],
    [
      'StorageProvider',
      () =>
        textUnder(StorageProvider, { provider: value('StorageProvider') }, () =>
          nameOf(getStorageProvider()),
        ),
    ],
    [
      'LoggerProvider',
      () =>
        textUnder(LoggerProvider, { provider: value('LoggerProvider') }, () =>
          nameOf(getLoggerProvider()),
        ),
    ],
    [
      'ChatProvider',
      () =>
        textUnder(ChatProvider, { provider: value('ChatProvider') }, () =>
          nameOf(useChatProvider()),
        ),
    ],
    [
      'WorkspaceProvider',
      () =>
        textUnder(WorkspaceProvider, { provider: value('WorkspaceProvider') }, () =>
          nameOf(useWorkspaceProvider()),
        ),
    ],
    [
      'EditorProvider',
      () =>
        textUnder(EditorProvider, { provider: value('EditorProvider') }, () =>
          nameOf(useEditorProvider()),
        ),
    ],
    [
      'PreviewProvider',
      () =>
        textUnder(PreviewProvider, { provider: value('PreviewProvider') }, () =>
          nameOf(usePreviewProvider()),
        ),
    ],
    [
      'AuthProvider',
      () =>
        textUnder(AuthProvider, { client: value('AuthProvider'), awaitSession: false }, () =>
          nameOf(getAuthClient()),
        ),
    ],
  ]

  it.each(cases)('%s provides its service to the tree below it', (name, run) => {
    expect(run()).toBe(name)
  })
})

describe('MoleculeProvider', () => {
  const names = [
    'state',
    'theme',
    'router',
    'i18n',
    'http',
    'storage',
    'logger',
    'chat',
    'workspace',
    'editor',
    'preview',
  ] as const
  const values = Object.fromEntries(names.map((name) => [name, service(name)])) as Record<
    (typeof names)[number],
    Stand
  >
  const readers: Record<(typeof names)[number], () => unknown> = {
    state: getStateProvider,
    theme: getThemeProvider,
    router: getRouter,
    i18n: getI18nProvider,
    http: getHttpClient,
    storage: getStorageProvider,
    logger: getLoggerProvider,
    chat: useChatProvider,
    workspace: useWorkspaceProvider,
    editor: useEditorProvider,
    preview: usePreviewProvider,
  }

  it.each(names)('provides %s under the context its store reads', (name) => {
    expect(textUnder(MoleculeProvider, values, () => nameOf(readers[name]()))).toBe(name)
  })

  it('leaves a service it was not given unprovided', () => {
    expect(() => textUnder(MoleculeProvider, {}, () => nameOf(getThemeProvider()))).toThrow()
  })

  it('gives the tree a changed service and keeps it mounted otherwise', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = mount(ChangingTheme, {
      target: container,
      props: { initial: service('first') as Stand, read: () => nameOf(getThemeProvider()) },
    })
    flushSync()
    stops.push(async () => {
      await unmount(app)
      container.remove()
    })
    expect(container.querySelector('p')?.textContent).toBe('first')
    const input = container.querySelector('input')
    app.relabel('second')
    flushSync()
    expect(container.querySelector('input')).toBe(input)
    expect(input?.getAttribute('aria-label')).toBe('second')
    app.swapTheme(service('replaced') as Stand)
    flushSync()
    expect(container.querySelector('p')?.textContent).toBe('replaced')
  })
})

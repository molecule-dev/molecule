// @vitest-environment jsdom

/**
 * `ReportModal` / `ShareModal` must be usable STANDALONE — mounted by the host,
 * outside `ChatPanel`.
 *
 * Both are opened from a host's toolbar, and hosts used to reach them only
 * through `ChatPanel`'s `openReportSignal` / `openShareSignal` props. Those
 * signals are observed INSIDE the panel, so in any phase where the host does not
 * mount a `ChatPanel` — molecule.dev's hibernating-sandbox screen is the real
 * case — the button bumped a counter nobody was watching and silently did
 * nothing. Neither action needs the chat, the editor, the preview, or a running
 * sandbox: both POST to the platform API. So both components are exported for a
 * host to mount directly, and this suite pins that contract:
 *
 *   • they resolve from the PACKAGE BARREL (a host can only import what the
 *     barrel exports — dropping them there is what would silently break it);
 *   • they render and submit with nothing but `projectId` + the bonded HTTP
 *     client — no workspace/editor/preview/chat provider in the tree;
 *   • they hit the endpoints the platform API actually serves.
 *
 * @module
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

// Deliberately the package BARREL, not the component paths — a host has no other
// way in, so this import IS half the contract under test.
import { buildShareUrl, formatReportConfirmation, ReportModal, ShareModal } from '../index.js'

/**
 * A ClassMap stub whose every member resolves to its key as a class token.
 *
 * @returns A stub {@link UIClassMap}.
 */
function buildStubClassMap(): UIClassMap {
  const token =
    (name: string) =>
    (..._args: unknown[]): string =>
      name
  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string' && c) out.push(c)
    }
    classes.forEach(walk)
    return out.join(' ')
  }
  return new Proxy(
    {},
    {
      get(_t, prop): unknown {
        if (prop === 'cn') return cn
        return token(String(prop))
      },
    },
  ) as unknown as UIClassMap
}

const post = vi.fn()

/**
 * An {@link HttpClient} whose `post` is observable — the only capability either
 * modal needs from its host.
 *
 * @returns A stub HTTP client.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: post as unknown as HttpClient['post'],
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * A minimal light theme provider so `useThemeMode` resolves.
 *
 * @returns A stub theme provider.
 */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/**
 * The ONLY providers a host needs for these two modals — deliberately no
 * workspace / editor / preview / chat provider, which is the whole point.
 *
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </ThemeProvider>
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setProvider(createSimpleI18nProvider('en'))
  post.mockReset()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ReportModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the report to the platform API', async () => {
    expect(typeof ReportModal).toBe('function')
    post.mockResolvedValue({ data: { ok: true, id: 'r1', url: 'https://issues.example/1' } })
    const onSubmitted = vi.fn()

    const { container } = render(
      <Wrap>
        <ReportModal
          projectId="p1"
          conversationId="c1"
          onClose={() => {}}
          onSubmitted={onSubmitted}
        />
      </Wrap>,
    )

    expect(container.querySelector('[data-mol-id="report-modal"]')).not.toBeNull()

    fireEvent.change(container.querySelector('[data-mol-id="report-title"]') as HTMLInputElement, {
      target: { value: 'Preview stays blank' },
    })
    fireEvent.change(
      container.querySelector('[data-mol-id="report-description"]') as HTMLTextAreaElement,
      { target: { value: 'It never comes back after hibernating.' } },
    )
    fireEvent.click(container.querySelector('[data-mol-id="report-submit"]') as HTMLButtonElement)

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    // The platform report route, carrying the conversation for context.
    expect(post.mock.calls[0][0]).toBe('/projects/p1/report?conversationId=c1')
    expect(post.mock.calls[0][1]).toMatchObject({
      title: 'Preview stays blank',
      description: 'It never comes back after hibernating.',
    })
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1))
  })

  it('hands the outcome to the host rather than showing its own success state', async () => {
    post.mockResolvedValue({ data: { ok: true, id: 'r1', url: 'https://issues.example/1' } })
    const onSubmitted = vi.fn()
    const { container } = render(
      <Wrap>
        <ReportModal projectId="p1" onClose={() => {}} onSubmitted={onSubmitted} />
      </Wrap>,
    )
    fireEvent.change(container.querySelector('[data-mol-id="report-title"]') as HTMLInputElement, {
      target: { value: 't' },
    })
    fireEvent.change(
      container.querySelector('[data-mol-id="report-description"]') as HTMLTextAreaElement,
      { target: { value: 'd' } },
    )
    fireEvent.click(container.querySelector('[data-mol-id="report-submit"]') as HTMLButtonElement)

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1))
    // Nothing in the modal itself reports success — a host that mounts it MUST
    // surface the confirmation, which is why the formatter is exported too.
    expect(container.textContent).not.toContain('Thanks')
    expect(formatReportConfirmation(onSubmitted.mock.calls[0][0]).defaultValue).toContain('Thanks')
  })
})

describe('ShareModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the link to the platform API', async () => {
    expect(typeof ShareModal).toBe('function')
    post.mockResolvedValue({ data: { slug: 's1', role: 'viewer' } })
    const onCreated = vi.fn()

    const { container } = render(
      <Wrap>
        <ShareModal projectId="p1" onClose={() => {}} onCreated={onCreated} />
      </Wrap>,
    )

    expect(container.querySelector('[data-mol-id="share-modal"]')).not.toBeNull()

    // The create control appears once the (empty) link list has loaded.
    const create = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-create"]')
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    fireEvent.click(create)

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][0]).toBe('/projects/p1/shares')
    expect(post.mock.calls[0][1]).toMatchObject({ role: 'viewer' })

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    // The created link renders inline as a full, copyable URL, so the host gets
    // the result (and the URL builder) to persist it somewhere.
    const field = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    expect(field.value).toContain('/share/s1')
    expect(buildShareUrl(onCreated.mock.calls[0][0], 'https://app.example')).toBe(
      'https://app.example/share/s1',
    )
  })
})

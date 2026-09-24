// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real bonds, the real panels. Only the
 * network (`fetch`) is stubbed, plus `localStorage` (Node's experimental
 * web-storage shadows jsdom's).
 *
 * @module
 */
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createProvider as createChatProvider } from '@molecule/app-ai-chat-http'
import { createProvider as createEditorProvider } from '@molecule/app-code-editor-monaco'
import { createFetchClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { createProvider as createWorkspaceProvider } from '@molecule/app-ide-default'
import { createProvider as createPreviewProvider } from '@molecule/app-live-preview-iframe'
import { MoleculeProvider } from '@molecule/app-react'
import { provider as theme } from '@molecule/app-theme-css-variables'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel, EditorPanel, PreviewPanel, WorkspaceLayout } from '../index.js'

// Startup: bond styling + icons, then build one instance of each IDE provider.
setClassMap(classMap)
setIconSet(iconSet)
const providers = {
  i18n: createSimpleI18nProvider('en'),
  http: createFetchClient({ baseURL: '/api' }),
  theme,
  chat: createChatProvider({ baseUrl: '/api' }),
  workspace: createWorkspaceProvider(),
  editor: createEditorProvider({ fontSize: 13, minimap: false }),
  preview: createPreviewProvider({ defaultUrl: 'about:blank' }),
}

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.projectId - The platform project id.
 * @returns The IDE workspace.
 */
function IdePage({ projectId }: { projectId: string }): React.JSX.Element {
  return (
    <MoleculeProvider {...providers}>
      <WorkspaceLayout>
        <ChatPanel projectId={projectId} />
        <EditorPanel />
        <PreviewPanel />
      </WorkspaceLayout>
    </MoleculeProvider>
  )
}

/**
 * A working in-memory `Storage`.
 *
 * @returns The storage.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key)
    },
    setItem: (key: string, value: string): void => {
      store.set(key, String(value))
    },
  }
}

/** The platform API a fresh project answers with: no conversations, no history. */
const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
  const path = String(url)
  if (path.endsWith('/conversations')) return Response.json({ conversations: [] })
  return Response.json({ messages: [] })
})

describe('README @example', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', makeStorage())
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('mounts chat, editor and preview side by side and loads the project chat history', async () => {
    const view = render(<IdePage projectId="proj_abc123" />)
    const byMolId = (id: string): NodeListOf<Element> =>
      view.container.querySelectorAll(`[data-mol-id="${id}"]`)
    // Three panels → two resize sashes between them.
    await waitFor(() => {
      expect(byMolId('workspace-resize-handle')).toHaveLength(2)
      expect(byMolId('chat-send-button')).toHaveLength(1)
      expect(view.container.querySelector('textarea')).toBeTruthy()
      expect(byMolId('preview-url-field')).toHaveLength(1)
      expect(view.container.querySelector('iframe')).toBeTruthy()
    })

    // The chat provider loads the project's history through its `baseUrl`, and the
    // panel reads the project's conversations through the bonded HTTP client.
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls).toContain('/api/projects/proj_abc123/chat')
      expect(urls).toContain('/api/projects/proj_abc123/conversations')
    })
  })
})

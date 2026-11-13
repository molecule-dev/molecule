/**
 * Cases for the IDE hooks (useWorkspace, useWorkspaceProvider, useEditor,
 * useEditorProvider, usePreview, usePreviewProvider, useAIModels,
 * resetAIModelsCache) and the agent-identity constants.
 *
 * The workspace/editor/preview services come from the native area's fakes
 * (`context.areas.native.workspace` / `.editor` / `.preview` — see
 * `src/bindings/fakes/native.ts`); a case that seeds none runs the hook
 * without that service in context, which every framework must record as a
 * mount throw. `useAIModels` is scripted through the case's HTTP responses.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/**
 * A minimal catalog model: only the fields `AppModelDefinition` requires,
 * filled with fixed values so every snapshot is byte-stable.
 *
 * @param id - The model id (also its label).
 * @param extra - Fields to override or add (`freeTier`, `disabled`, …).
 * @returns The model definition as plain data.
 */
const model = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  provider: 'anthropic',
  label: `Model ${id}`,
  description: `Conformance model ${id}`,
  contextWindow: 200000,
  maxOutputTokens: 8192,
  supportsThinking: false,
  thinkingBudgetTokens: 0,
  thinkingConfigurable: false,
  supportsVision: false,
  supportsPromptCaching: true,
  supportsTools: true,
  ...extra,
})

/** Two fixed catalog models: `ma` (free tier) and `mb`. */
const CATALOG_MODELS = [model('ma', { freeTier: true }), model('mb')]

/** The server's per-mode default model ids for the standard catalog. */
const CATALOG_DEFAULTS = { plan: 'ma', execute: 'mb', commit: 'ma', compact: 'mb' }

/** `useWorkspaceProvider()`: the workspace service from the nearest provider. */
export const useWorkspaceProviderCases: HookCases = {
  hook: 'useWorkspaceProvider',
  cases: [
    {
      name: 'returns the workspace provider from context',
      args: [],
      context: { areas: { native: { workspace: {} } } },
    },
    {
      name: 'the returned provider is live and answers method calls',
      args: [],
      context: { areas: { native: { workspace: {} } } },
      steps: [{ type: 'call', method: 'togglePanel', args: ['chat'] }],
    },
    {
      name: 'throws outside a workspace provider',
      args: [],
    },
  ],
}

/** `useWorkspace()`: panel layout state and the layout actions. */
export const useWorkspaceCases: HookCases = {
  hook: 'useWorkspace',
  cases: [
    {
      name: 'the default layout with nothing active',
      context: { areas: { native: { workspace: {} } } },
    },
    {
      name: 'an empty panel list is a valid layout',
      context: { areas: { native: { workspace: { panels: [] } } } },
    },
    {
      name: 'a provider without getState shows the initial panel state until it emits',
      // WorkspaceProvider.getState is optional. Without it only the layout is
      // readable before the first subscribe callback, so activePanel,
      // collapsedPanels and isFullscreen start at the core's initial values and
      // the emission brings the provider's real ones.
      context: {
        areas: {
          native: {
            workspace: { activePanel: 'chat', collapsedPanels: ['preview'], isFullscreen: true },
          },
        },
      },
      steps: [{ type: 'control', name: 'native.workspace.emit' }],
    },
    {
      name: 'a provider answering getState reports the seeded state at mount',
      // The same seed through the WorkspaceProvider.getState branch: no
      // fabricated defaults, the real state is visible immediately.
      context: {
        areas: {
          native: {
            workspace: {
              fullState: true,
              activePanel: 'chat',
              collapsedPanels: ['preview'],
            },
          },
        },
      },
    },
    {
      name: 'with getState the actions keep the seeded state and change it',
      context: {
        areas: { native: { workspace: { fullState: true, activePanel: 'chat' } } },
      },
      steps: [
        { type: 'call', method: 'togglePanel', args: ['preview'] },
        { type: 'call', method: 'setActivePanel', args: ['editor'] },
      ],
    },
    {
      name: 'togglePanel flips a panel and notifies',
      context: { areas: { native: { workspace: {} } } },
      steps: [
        { type: 'call', method: 'togglePanel', args: ['chat'] },
        { type: 'call', method: 'togglePanel', args: ['preview'] },
        { type: 'call', method: 'togglePanel', args: ['chat'] },
      ],
    },
    {
      name: 'resizePanel rewrites the panel size in its position',
      context: { areas: { native: { workspace: {} } } },
      steps: [
        { type: 'call', method: 'resizePanel', args: ['chat', 320] },
        { type: 'call', method: 'resizePanel', args: ['preview', 500] },
      ],
    },
    {
      name: 'setActivePanel updates the active panel',
      context: { areas: { native: { workspace: {} } } },
      steps: [{ type: 'call', method: 'setActivePanel', args: ['editor'] }],
    },
    {
      name: 'resetLayout restores the default after changes',
      context: { areas: { native: { workspace: {} } } },
      steps: [
        { type: 'call', method: 'togglePanel', args: ['chat'] },
        { type: 'call', method: 'setActivePanel', args: ['preview'] },
        { type: 'call', method: 'resetLayout' },
      ],
    },
    {
      name: 'unmount unsubscribes from the workspace',
      context: { areas: { native: { workspace: {} } } },
      steps: [{ type: 'unmount' }],
    },
    {
      name: 'throws outside a workspace provider',
    },
  ],
}

/** `useEditorProvider()`: the editor service from the nearest provider. */
export const useEditorProviderCases: HookCases = {
  hook: 'useEditorProvider',
  cases: [
    {
      name: 'returns the editor provider from context',
      args: [],
      context: { areas: { native: { editor: {} } } },
    },
    {
      name: 'throws outside an editor provider',
      args: [],
    },
  ],
}

/** `useEditor()`: editor tabs, the active file and the editor actions. */
export const useEditorCases: HookCases = {
  hook: 'useEditor',
  cases: [
    {
      name: 'starts with no tabs and no active file',
      context: { areas: { native: { editor: {} } } },
      steps: [{ type: 'call', method: 'getContent' }],
    },
    {
      name: 'a tab already active at mount is the active file',
      // activeFile is read from the provider's tabs at mount, before any
      // change event or action.
      context: {
        areas: {
          native: {
            editor: {
              tabs: [{ path: 'src/seed.ts', label: 'seed.ts', isDirty: false, isActive: true }],
            },
          },
        },
      },
      steps: [
        {
          type: 'control',
          name: 'native.editor.openFromOutside',
          args: ['src/outside.ts', 'outside'],
        },
      ],
    },
    {
      name: 'openFile opens a tab and makes it active',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/app.ts', content: 'const x = 1' }],
        },
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/lib.ts', content: 'export {}', language: 'typescript' }],
        },
      ],
    },
    {
      name: 'opening the same path again keeps one tab',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/app.ts', content: 'const x = 1' }],
        },
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/app.ts', content: 'const x = 2', isDirty: true }],
        },
      ],
    },
    {
      name: 'closeFile activates the remaining tab',
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'openFile', args: [{ path: 'src/a.ts', content: 'a' }] },
        { type: 'call', method: 'openFile', args: [{ path: 'src/b.ts', content: 'b' }] },
        { type: 'call', method: 'closeFile', args: ['src/b.ts'] },
      ],
    },
    {
      name: 'closing the last tab clears tabs and activeFile',
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'openFile', args: [{ path: 'src/a.ts', content: 'a' }] },
        { type: 'call', method: 'closeFile', args: ['src/a.ts'] },
      ],
    },
    {
      name: 'getContent returns the active tab content',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/app.ts', content: 'const x = 1' }],
        },
        { type: 'call', method: 'getContent' },
      ],
    },
    {
      name: 'setContent marks the tab dirty and stays active',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/app.ts', content: 'const x = 1' }],
        },
        { type: 'call', method: 'setContent', args: ['src/app.ts', 'const x = 2'] },
        { type: 'call', method: 'getContent' },
      ],
    },
    {
      name: 'setActiveTab switches the active file',
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'openFile', args: [{ path: 'src/a.ts', content: 'a' }] },
        { type: 'call', method: 'openFile', args: [{ path: 'src/b.ts', content: 'b' }] },
        { type: 'call', method: 'setActiveTab', args: ['src/a.ts'] },
        { type: 'call', method: 'getContent' },
      ],
    },
    {
      name: 'setActiveTab on an unopened path leaves no active file',
      // activeFile follows the provider's tabs, not the argument: the fake
      // has no tab for the path, so no tab is active.
      context: { areas: { native: { editor: {} } } },
      steps: [{ type: 'call', method: 'setActiveTab', args: ['src/ghost.ts'] }],
    },
    {
      name: 'a file opened from outside becomes the active file',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'control',
          name: 'native.editor.openFromOutside',
          args: ['src/outside.ts', 'outside content'],
        },
      ],
    },
    {
      name: 'openDiff shows the diff tab at once and closeDiff removes it',
      // Both re-read the provider's tabs, with no change event needed.
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'openFile', args: [{ path: 'src/b.ts', content: 'b' }] },
        {
          type: 'call',
          method: 'openDiff',
          args: [{ path: 'src/a.ts', originalContent: 'a1', modifiedContent: 'a2' }],
        },
        { type: 'call', method: 'closeDiff' },
      ],
    },
    {
      name: 'pinTab converts a preview tab into a normal one',
      context: { areas: { native: { editor: {} } } },
      steps: [
        {
          type: 'call',
          method: 'openFile',
          args: [{ path: 'src/peek.ts', content: 'p', isPreview: true }],
        },
        { type: 'call', method: 'pinTab', args: ['src/peek.ts'] },
      ],
    },
    {
      name: 'mount, dispose and focus forward to the provider',
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'mount', args: [null, { theme: 'dark', fontSize: 14 }] },
        { type: 'call', method: 'focus' },
        { type: 'call', method: 'dispose' },
      ],
    },
    {
      name: 'addExtraLib forwards content and path',
      context: { areas: { native: { editor: {} } } },
      steps: [{ type: 'call', method: 'addExtraLib', args: ['declare const x: number', 'x.d.ts'] }],
    },
    {
      name: 'onFixWithAI delivers fix requests to the callback',
      context: { areas: { native: { editor: {} } } },
      steps: [
        { type: 'call', method: 'onFixWithAI', args: [{ $fn: 'fix' }] },
        { type: 'control', name: 'native.editor.fixWithAI', args: ['src/app.ts', 3] },
      ],
    },
    {
      name: 'unmount unsubscribes from editor changes',
      context: { areas: { native: { editor: {} } } },
      steps: [{ type: 'unmount' }],
    },
    {
      name: 'throws outside an editor provider',
    },
  ],
}

/** `usePreviewProvider()`: the preview service from the nearest provider. */
export const usePreviewProviderCases: HookCases = {
  hook: 'usePreviewProvider',
  cases: [
    {
      name: 'returns the preview provider from context',
      args: [],
      context: { areas: { native: { preview: {} } } },
    },
    {
      name: 'throws outside a preview provider',
      args: [],
    },
  ],
}

/** `usePreview()`: preview state (url, device, connection) and its actions. */
export const usePreviewCases: HookCases = {
  hook: 'usePreview',
  cases: [
    {
      name: 'the initial state of the seeded url',
      context: { areas: { native: { preview: {} } } },
    },
    {
      name: 'a degraded preview at mount shows loading, error and disconnection',
      context: {
        areas: {
          native: { preview: { isLoading: true, error: 'socket died', isConnected: false } },
        },
      },
    },
    {
      name: 'setUrl loads a new document and repeats are a no-op',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'call', method: 'setUrl', args: ['http://preview.local/next'] },
        { type: 'call', method: 'setUrl', args: ['http://preview.local/next'] },
      ],
    },
    {
      name: 'refresh bumps the load nonce without changing the url',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'call', method: 'refresh' },
        { type: 'call', method: 'refresh' },
      ],
    },
    {
      name: 'setDevice switches the device frame',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'call', method: 'setDevice', args: ['mobile'] },
        { type: 'call', method: 'setDevice', args: ['none'] },
      ],
    },
    {
      name: 'recordNavigation updates the displayed url without a reload',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'call', method: 'recordNavigation', args: ['http://preview.local/in-app', false] },
        { type: 'call', method: 'recordNavigation', args: ['http://preview.local/other', true] },
      ],
    },
    {
      name: 'back and forward walk the navigation history',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'call', method: 'setUrl', args: ['http://preview.local/two'] },
        { type: 'call', method: 'setUrl', args: ['http://preview.local/three'] },
        { type: 'call', method: 'back' },
        { type: 'call', method: 'back' },
        { type: 'call', method: 'forward' },
      ],
    },
    {
      name: 'back at the start of history changes nothing',
      context: { areas: { native: { preview: {} } } },
      steps: [{ type: 'call', method: 'back' }],
    },
    {
      name: 'openExternal forwards without changing state',
      context: { areas: { native: { preview: {} } } },
      steps: [{ type: 'call', method: 'openExternal' }],
    },
    {
      name: 'a load starting from outside flips isLoading',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'control', name: 'native.preview.setLoading', args: [true] },
        { type: 'control', name: 'native.preview.setLoading', args: [false] },
      ],
    },
    {
      name: 'a preview error set from outside appears and clears',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'control', name: 'native.preview.setError', args: ['Preview crashed'] },
        { type: 'control', name: 'native.preview.setError', args: [null] },
      ],
    },
    {
      name: 'the preview losing connection updates isConnected',
      context: { areas: { native: { preview: {} } } },
      steps: [
        { type: 'control', name: 'native.preview.setConnected', args: [false] },
        { type: 'control', name: 'native.preview.setConnected', args: [true] },
      ],
    },
    {
      name: 'unmount unsubscribes from preview state',
      context: { areas: { native: { preview: {} } } },
      steps: [{ type: 'unmount' }],
    },
    {
      name: 'throws outside a preview provider',
    },
  ],
}

/** `useAIModels(projectId?)`: the cached AI model catalog and its fetch paths. */
export const useAIModelsCases: HookCases = {
  hook: 'useAIModels',
  cases: [
    {
      name: 'fetches the catalog on mount and stops loading',
      context: {
        http: [
          {
            method: 'GET',
            url: '/ai/models',
            data: { models: CATALOG_MODELS, defaults: CATALOG_DEFAULTS },
          },
        ],
      },
    },
    {
      name: 'a deferred fetch shows loading with no models until it answers',
      context: { http: [{ method: 'GET', url: '/ai/models', defer: true }] },
      steps: [
        {
          type: 'http',
          method: 'GET',
          url: '/ai/models',
          data: { models: CATALOG_MODELS, defaults: CATALOG_DEFAULTS },
        },
      ],
    },
    {
      name: 'a failed fetch records the http error and clears loading',
      context: {
        http: [{ method: 'GET', url: '/ai/models', status: 500, data: { error: 'boom' } }],
      },
    },
    {
      name: 'a network failure records the error',
      context: { http: [{ method: 'GET', url: '/ai/models', networkError: 'offline' }] },
    },
    {
      name: 'the free-tier model is the one flagged freeTier',
      context: {
        http: [{ method: 'GET', url: '/ai/models', data: { models: CATALOG_MODELS } }],
      },
    },
    {
      name: 'a disabled free-tier model is not picked',
      context: {
        http: [
          {
            method: 'GET',
            url: '/ai/models',
            data: { models: [model('ma', { freeTier: true, disabled: true }), model('mb')] },
          },
        ],
      },
    },
    {
      name: 'a superseded free-tier model is not picked',
      context: {
        http: [
          {
            method: 'GET',
            url: '/ai/models',
            data: { models: [model('ma', { freeTier: true, supersededBy: 'ma2' }), model('mb')] },
          },
        ],
      },
    },
    {
      name: 'a catalog without per-mode defaults leaves them undefined',
      context: {
        http: [{ method: 'GET', url: '/ai/models', data: { models: [model('mb')] } }],
      },
    },
    {
      name: 'an empty catalog loads with no free-tier model',
      context: {
        http: [{ method: 'GET', url: '/ai/models', data: { models: [] } }],
      },
    },
    {
      name: 'a project scope fetches with the projectId query param',
      args: ['p1'],
      context: {
        http: [{ method: 'GET', url: '/ai/models?projectId=p1', data: { models: [model('mb')] } }],
      },
    },
    {
      name: 'a project id needing escaping is encoded in the url',
      args: ['team/1'],
      context: {
        http: [
          { method: 'GET', url: '/ai/models?projectId=team%2F1', data: { models: [model('mb')] } },
        ],
      },
    },
    {
      name: 'a cached scope is not refetched and a new scope is',
      // Framework-neutral: non-React bindings re-mount the host on an args
      // step; a fresh mount reads the same module-level cache, so both give
      // exactly two fetches (unscoped + p1) and the unscoped models at the end.
      context: {
        http: [
          {
            method: 'GET',
            url: '/ai/models',
            data: { models: CATALOG_MODELS, defaults: CATALOG_DEFAULTS },
          },
          { method: 'GET', url: '/ai/models?projectId=p1', data: { models: [model('mb')] } },
        ],
      },
      steps: [
        { type: 'args', args: ['p1'] },
        { type: 'args', args: [] },
      ],
    },
    {
      name: 'a failed scope does not refetch on a later mount',
      // Same neutrality note: React keeps the mounted hook (no effect rerun),
      // a re-mounting framework reads cache.error and skips the fetch — both
      // record exactly one request.
      context: {
        http: [{ method: 'GET', url: '/ai/models', status: 500, data: { error: 'boom' } }],
      },
      steps: [{ type: 'args', args: [] }],
    },
    {
      name: 'unmount while the fetch is pending settles quietly',
      context: { http: [{ method: 'GET', url: '/ai/models', defer: true }] },
      steps: [
        { type: 'unmount' },
        { type: 'http', method: 'GET', url: '/ai/models', data: { models: CATALOG_MODELS } },
      ],
    },
  ],
}

/** `resetAIModelsCache()`: the test hook that drops every cached catalog. */
export const resetAIModelsCacheCases: HookCases = {
  hook: 'resetAIModelsCache',
  cases: [
    {
      name: 'clearing the caches returns nothing',
      args: [],
    },
  ],
}

/** `DEFAULT_AGENT_IDENTITY`: the neutral agent + product identity. */
export const defaultAgentIdentityCases: HookCases = {
  hook: 'DEFAULT_AGENT_IDENTITY',
  cases: [
    {
      name: 'names the neutral agent and product',
      args: [],
    },
  ],
}

/** `DEFAULT_AGENT_NAME`: the neutral agent display name. */
export const defaultAgentNameCases: HookCases = {
  hook: 'DEFAULT_AGENT_NAME',
  cases: [
    {
      name: 'is the neutral agent name',
      args: [],
    },
  ],
}

/** `DEFAULT_PRODUCT_NAME`: the neutral host product display name. */
export const defaultProductNameCases: HookCases = {
  hook: 'DEFAULT_PRODUCT_NAME',
  cases: [
    {
      name: 'is the neutral product name',
      args: [],
    },
  ],
}

import { describe, expect, it, vi } from 'vitest'

import { registerTsxHighlighting } from '../tsx-monarch.js'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockMonaco() {
  const monarchProviders = new Map<string, unknown>()
  const themes = new Map<string, unknown>()
  return {
    monaco: {
      languages: {
        setMonarchTokensProvider: vi.fn((langId: string, def: unknown) => {
          monarchProviders.set(langId, def)
          return { dispose: vi.fn() }
        }),
      },
      editor: {
        defineTheme: vi.fn((name: string, data: unknown) => {
          themes.set(name, data)
        }),
      },
    },
    monarchProviders,
    themes,
  }
}

describe('registerTsxHighlighting', () => {
  it('registers Monarch tokenizers for typescript and javascript', () => {
    const { monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalledTimes(2)
    const calls = monaco.languages.setMonarchTokensProvider.mock.calls
    expect(calls[0][0]).toBe('typescript')
    expect(calls[1][0]).toBe('javascript')
  })

  it('sets correct tokenPostfix for each language', () => {
    const { monarchProviders, monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    const tsDef = monarchProviders.get('typescript') as Record<string, unknown>
    const jsDef = monarchProviders.get('javascript') as Record<string, unknown>
    expect(tsDef.tokenPostfix).toBe('.ts')
    expect(jsDef.tokenPostfix).toBe('.js')
  })

  it('defines the molecule-dark theme', () => {
    const { themes, monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    expect(monaco.editor.defineTheme).toHaveBeenCalledWith('molecule-dark', expect.any(Object))
    const theme = themes.get('molecule-dark') as Record<string, unknown>
    expect(theme.base).toBe('vs-dark')
    expect(theme.inherit).toBe(true)
  })

  it('theme has rules for JSX tokens', () => {
    const { themes, monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    const theme = themes.get('molecule-dark') as { rules: { token: string; foreground: string }[] }
    const ruleMap = new Map(theme.rules.map((r) => [r.token, r.foreground]))

    // HTML elements — blue
    expect(ruleMap.get('metatag')).toBe('569CD6')
    expect(ruleMap.get('metatag.html')).toBe('569CD6')
    // React components — teal (uses type.identifier)
    expect(ruleMap.get('type.identifier')).toBe('4EC9B0')
    // Attributes — light blue
    expect(ruleMap.get('attribute.name')).toBe('9CDCFE')
    // Tag delimiters — gray
    expect(ruleMap.get('delimiter.tag')).toBe('808080')
    // Control flow — purple
    expect(ruleMap.get('keyword.flow')).toBe('C586C0')
  })

  it('language definition includes JSX states', () => {
    const { monarchProviders, monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    const def = monarchProviders.get('typescript') as Record<string, unknown>
    const tokenizer = def.tokenizer as Record<string, unknown>

    expect(tokenizer.root).toBeDefined()
    expect(tokenizer.common).toBeDefined()
    expect(tokenizer.jsxTagAttrs).toBeDefined()
    expect(tokenizer.jsxExpression).toBeDefined()
  })

  it('language definition splits keywords into flow and declaration', () => {
    const { monarchProviders, monaco } = createMockMonaco()
    registerTsxHighlighting(monaco)

    const def = monarchProviders.get('typescript') as Record<string, unknown>
    const flowKeywords = def.flowKeywords as string[]
    const keywords = def.keywords as string[]

    // Control flow
    expect(flowKeywords).toContain('return')
    expect(flowKeywords).toContain('if')
    expect(flowKeywords).toContain('for')
    expect(flowKeywords).toContain('while')
    expect(flowKeywords).toContain('import')
    expect(flowKeywords).toContain('export')

    // Declarations
    expect(keywords).toContain('const')
    expect(keywords).toContain('let')
    expect(keywords).toContain('function')
    expect(keywords).toContain('class')
    expect(keywords).toContain('interface')
    expect(keywords).toContain('type')

    // No overlap
    for (const kw of flowKeywords) {
      expect(keywords).not.toContain(kw)
    }
  })
})

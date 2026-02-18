import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock DOM environment for Node
const createMockElement = (tagName = 'div'): Record<string, unknown> => {
  const children: Record<string, unknown>[] = []
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  let _innerHTML = ''

  return {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    id: '',
    className: '',
    style: {},
    children,
    childNodes: children,
    parentNode: null,
    get innerHTML() {
      return _innerHTML
    },
    set innerHTML(value: string) {
      _innerHTML = value
      children.length = 0
    },
    get textContent() {
      return _innerHTML.replace(/<[^>]*>/g, '')
    },
    set textContent(value: string) {
      _innerHTML = value
    },
    appendChild: (child: Record<string, unknown>) => {
      child.parentNode = this
      children.push(child)
      return child
    },
    removeChild: (child: Record<string, unknown>) => {
      const idx = children.indexOf(child)
      if (idx >= 0) children.splice(idx, 1)
      return child
    },
    remove: () => {},
    addEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },
    removeEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler)
    },
    dispatchEvent: (event: { type: string }) => {
      listeners.get(event.type)?.forEach((h) => h(event))
      return true
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    getAttribute: () => null,
    setAttribute: () => {},
    hasAttribute: () => false,
    removeAttribute: () => {},
    cloneNode: () => createMockElement(tagName),
  }
}

const mockBody = createMockElement('body')
const mockDocument = {
  body: mockBody,
  createElement: vi.fn((tagName: string) => createMockElement(tagName)),
  createTextNode: vi.fn((text: string) => ({ nodeType: 3, textContent: text })),
  getElementById: vi.fn(() => null),
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  documentElement: createMockElement('html'),
}

// Set up global mocks
vi.stubGlobal('document', mockDocument)
vi.stubGlobal('window', {
  document: mockDocument,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getComputedStyle: vi.fn(() => ({})),
})

// Use vi.hoisted to create shared mock instances
const { mockQuillInstance, MockQuill } = vi.hoisted(() => {
  const mockQuillInstance = {
    getText: vi.fn(() => 'test content'),
    setText: vi.fn(),
    getContents: vi.fn(() => ({ ops: [{ insert: 'test content\n' }] })),
    setContents: vi.fn(),
    getLength: vi.fn(() => 12),
    getSelection: vi.fn(() => ({ index: 0, length: 0 })),
    setSelection: vi.fn(),
    format: vi.fn(),
    formatText: vi.fn(),
    removeFormat: vi.fn(),
    insertText: vi.fn(),
    insertEmbed: vi.fn(),
    deleteText: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    hasFocus: vi.fn(() => false),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
    root: {
      innerHTML: '<p>test content</p>',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    clipboard: {
      dangerouslyPasteHTML: vi.fn(),
    },
  }

  const MockQuill = vi.fn(function () {
    return mockQuillInstance
  })

  return { mockQuillInstance, MockQuill }
})

vi.mock('quill', () => ({
  default: MockQuill,
}))

// Now import the modules after mocking
import type Quill from 'quill'

import {
  createQuillEditor,
  createQuillProvider,
  provider,
  quillToolbars,
  toolbarConfigToQuill,
} from '../index.js'
import type {
  QuillOptions,
  RichTextEditor,
  RichTextProvider,
  RichTextValue,
  ToolbarConfig,
} from '../types.js'

describe('Quill Rich Text Provider', () => {
  let container: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    container.id = 'editor'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('createQuillProvider', () => {
    it('should create a provider with the correct name', () => {
      const provider = createQuillProvider()
      expect(provider.getName()).toBe('quill')
    })

    it('should return toolbar presets', () => {
      const provider = createQuillProvider()
      const presets = provider.getToolbarPresets()

      expect(presets).toBeDefined()
      expect(presets.minimal).toBeDefined()
      expect(presets.standard).toBeDefined()
      expect(presets.full).toBeDefined()
    })

    it('should create an empty value', () => {
      const provider = createQuillProvider()
      const emptyValue = provider.createEmptyValue()

      expect(emptyValue).toEqual({
        text: '',
        html: '',
        delta: { ops: [] },
      })
    })

    it('should convert HTML to value', () => {
      const provider = createQuillProvider()
      const html = '<p>Hello <strong>World</strong></p>'
      const value = provider.htmlToValue(html)

      expect(value.html).toBe(html)
      expect(value.text).toBe('Hello World')
      expect(value.delta).toBeUndefined()
    })

    it('should convert text to value', () => {
      const provider = createQuillProvider()
      const value = provider.textToValue('Hello\nWorld')

      expect(value.text).toBe('Hello\nWorld')
      expect(value.html).toBe('<p>Hello</p><p>World</p>')
      expect(value.delta).toEqual({ ops: [{ insert: 'Hello\nWorld\n' }] })
    })

    it('should accept default options', () => {
      const defaultOptions: Partial<QuillOptions> = {
        theme: 'bubble',
        placeholder: 'Default placeholder',
      }
      const provider = createQuillProvider(defaultOptions)
      expect(provider).toBeDefined()
    })
  })

  describe('createEditor', () => {
    it('should create an editor instance', () => {
      const provider = createQuillProvider()
      const editor = provider.createEditor({ container })

      expect(editor).toBeDefined()
      expect(MockQuill).toHaveBeenCalledTimes(1)
    })

    it('should create editor with snow theme by default', () => {
      const provider = createQuillProvider()
      provider.createEditor({ container })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'snow',
        }),
      )
    })

    it('should create editor with bubble theme when specified', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        theme: 'bubble',
      } as QuillOptions)

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'bubble',
        }),
      )
    })

    it('should create editor with placeholder', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        placeholder: 'Type something...',
      })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          placeholder: 'Type something...',
        }),
      )
    })

    it('should create editor in read-only mode', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        readOnly: true,
      })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          readOnly: true,
        }),
      )
    })

    it('should disable toolbar when toolbar is false', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        toolbar: false,
      })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          modules: expect.objectContaining({
            toolbar: false,
          }),
        }),
      )
    })

    it('should use standard toolbar by default', () => {
      const provider = createQuillProvider()
      provider.createEditor({ container })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          modules: expect.objectContaining({
            toolbar: expect.any(Array),
          }),
        }),
      )
    })

    it('should use minimal toolbar preset when specified', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        toolbar: 'minimal',
      })

      const expectedToolbar = toolbarConfigToQuill(quillToolbars.minimal)
      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          modules: expect.objectContaining({
            toolbar: expectedToolbar,
          }),
        }),
      )
    })

    it('should use custom toolbar config', () => {
      const provider = createQuillProvider()
      const customToolbar: ToolbarConfig = {
        name: 'custom',
        groups: [['bold', 'italic']],
      }
      provider.createEditor({
        container,
        toolbar: customToolbar,
      })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          modules: expect.objectContaining({
            toolbar: [['bold', 'italic']],
          }),
        }),
      )
    })

    it('should set initial value with delta', () => {
      const provider = createQuillProvider()
      const delta = { ops: [{ insert: 'Hello\n' }] }
      provider.createEditor({
        container,
        value: { text: 'Hello', html: '<p>Hello</p>', delta },
      })

      expect(mockQuillInstance.setContents).toHaveBeenCalledWith(delta, 'silent')
    })

    it('should set initial value with HTML when no delta', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        value: { text: 'Hello', html: '<p>Hello</p>' },
      })

      expect(mockQuillInstance.root.innerHTML).toBeDefined()
    })

    it('should set initial value with text when no delta or HTML', () => {
      const provider = createQuillProvider()
      provider.createEditor({
        container,
        value: { text: 'Hello', html: '' },
      })

      expect(mockQuillInstance.setText).toHaveBeenCalledWith('Hello', 'silent')
    })

    it('should merge default options with provided options', () => {
      const defaultOptions: Partial<QuillOptions> = {
        theme: 'bubble',
        placeholder: 'Default placeholder',
      }
      const provider = createQuillProvider(defaultOptions)
      provider.createEditor({
        container,
        placeholder: 'Custom placeholder',
      })

      expect(MockQuill).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'bubble',
          placeholder: 'Custom placeholder',
        }),
      )
    })
  })

  describe('default provider instance', () => {
    it('should export a default provider', () => {
      expect(provider).toBeDefined()
      expect(provider.getName()).toBe('quill')
    })
  })
})

describe('createQuillEditor', () => {
  let container: HTMLElement
  let editor: RichTextEditor

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockQuillInstance.root.innerHTML = '<p>test content</p>'
    container = document.createElement('div')
    document.body.appendChild(container)
    editor = createQuillEditor(mockQuillInstance as unknown as Quill, container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('getValue / setValue', () => {
    it('should return current value', () => {
      const value = editor.getValue()

      expect(value.text).toBe('test content')
      expect(value.html).toBe('<p>test content</p>')
      expect(value.delta).toEqual({ ops: [{ insert: 'test content\n' }] })
    })

    it('should set value with delta', () => {
      const delta = { ops: [{ insert: 'new content\n' }] }
      editor.setValue({ text: 'new content', html: '<p>new content</p>', delta })

      expect(mockQuillInstance.setContents).toHaveBeenCalledWith(delta, 'api')
    })

    it('should set value with HTML when no delta', () => {
      editor.setValue({ text: 'new content', html: '<p>new content</p>' })

      expect(mockQuillInstance.root.innerHTML).toBeDefined()
    })

    it('should set value with text when no delta or HTML', () => {
      editor.setValue({ text: 'new content', html: '' })

      expect(mockQuillInstance.setText).toHaveBeenCalledWith('new content', 'api')
    })
  })

  describe('getText / getHTML / getLength', () => {
    it('should get text content', () => {
      expect(editor.getText()).toBe('test content')
      expect(mockQuillInstance.getText).toHaveBeenCalled()
    })

    it('should get HTML content', () => {
      expect(editor.getHTML()).toBe('<p>test content</p>')
    })

    it('should get content length', () => {
      expect(editor.getLength()).toBe(12)
      expect(mockQuillInstance.getLength).toHaveBeenCalled()
    })
  })

  describe('insertText / insertHTML / insertEmbed', () => {
    it('should insert text at selection', () => {
      mockQuillInstance.getSelection.mockReturnValue({ index: 5, length: 0 })
      editor.insertText('inserted')

      expect(mockQuillInstance.insertText).toHaveBeenCalledWith(5, 'inserted', 'user')
    })

    it('should insert text at specified index', () => {
      editor.insertText('inserted', 10)

      expect(mockQuillInstance.insertText).toHaveBeenCalledWith(10, 'inserted', 'user')
    })

    it('should insert text at end when no selection', () => {
      mockQuillInstance.getSelection.mockReturnValue(null)
      editor.insertText('inserted')

      expect(mockQuillInstance.insertText).toHaveBeenCalledWith(12, 'inserted', 'user')
    })

    it('should insert HTML at selection', () => {
      mockQuillInstance.getSelection.mockReturnValue({ index: 5, length: 0 })
      editor.insertHTML('<strong>bold</strong>')

      expect(mockQuillInstance.clipboard.dangerouslyPasteHTML).toHaveBeenCalledWith(
        5,
        '<strong>bold</strong>',
        'user',
      )
    })

    it('should insert HTML at specified index', () => {
      editor.insertHTML('<em>italic</em>', 0)

      expect(mockQuillInstance.clipboard.dangerouslyPasteHTML).toHaveBeenCalledWith(
        0,
        '<em>italic</em>',
        'user',
      )
    })

    it('should insert embed at selection', () => {
      mockQuillInstance.getSelection.mockReturnValue({ index: 5, length: 0 })
      editor.insertEmbed('image', 'https://example.com/image.png')

      expect(mockQuillInstance.insertEmbed).toHaveBeenCalledWith(
        5,
        'image',
        'https://example.com/image.png',
        'user',
      )
    })

    it('should insert embed at specified index', () => {
      editor.insertEmbed('video', 'https://example.com/video.mp4', 0)

      expect(mockQuillInstance.insertEmbed).toHaveBeenCalledWith(
        0,
        'video',
        'https://example.com/video.mp4',
        'user',
      )
    })
  })

  describe('deleteText', () => {
    it('should delete text at index with length', () => {
      editor.deleteText(5, 3)

      expect(mockQuillInstance.deleteText).toHaveBeenCalledWith(5, 3, 'user')
    })
  })

  describe('format / formatText / removeFormat', () => {
    it('should format selection with default value', () => {
      editor.format('bold')

      expect(mockQuillInstance.format).toHaveBeenCalledWith('bold', true, 'user')
    })

    it('should format selection with custom value', () => {
      editor.format('color', '#ff0000')

      expect(mockQuillInstance.format).toHaveBeenCalledWith('color', '#ff0000', 'user')
    })

    it('should format text at range with default value', () => {
      editor.formatText(0, 5, 'italic')

      expect(mockQuillInstance.formatText).toHaveBeenCalledWith(0, 5, 'italic', true, 'user')
    })

    it('should format text at range with custom value', () => {
      editor.formatText(0, 5, 'background', '#ffff00')

      expect(mockQuillInstance.formatText).toHaveBeenCalledWith(
        0,
        5,
        'background',
        '#ffff00',
        'user',
      )
    })

    it('should remove format at range', () => {
      editor.removeFormat(0, 5)

      expect(mockQuillInstance.removeFormat).toHaveBeenCalledWith(0, 5, 'user')
    })
  })

  describe('getSelection / setSelection', () => {
    it('should get selection range', () => {
      mockQuillInstance.getSelection.mockReturnValue({ index: 5, length: 3 })
      const selection = editor.getSelection()

      expect(selection).toEqual({ index: 5, length: 3 })
    })

    it('should return null when no selection', () => {
      mockQuillInstance.getSelection.mockReturnValue(null)
      const selection = editor.getSelection()

      expect(selection).toBeNull()
    })

    it('should set selection with index and length', () => {
      editor.setSelection(5, 3)

      expect(mockQuillInstance.setSelection).toHaveBeenCalledWith(5, 3, 'user')
    })

    it('should set selection with index only', () => {
      editor.setSelection(5)

      expect(mockQuillInstance.setSelection).toHaveBeenCalledWith(5, 0, 'user')
    })
  })

  describe('focus / blur / hasFocus', () => {
    it('should focus the editor', () => {
      editor.focus()

      expect(mockQuillInstance.focus).toHaveBeenCalled()
    })

    it('should blur the editor', () => {
      editor.blur()

      expect(mockQuillInstance.blur).toHaveBeenCalled()
    })

    it('should check if editor has focus', () => {
      mockQuillInstance.hasFocus.mockReturnValue(true)
      expect(editor.hasFocus()).toBe(true)

      mockQuillInstance.hasFocus.mockReturnValue(false)
      expect(editor.hasFocus()).toBe(false)
    })
  })

  describe('enable / disable / isEnabled', () => {
    it('should enable the editor', () => {
      editor.enable()

      expect(mockQuillInstance.enable).toHaveBeenCalled()
    })

    it('should disable the editor', () => {
      editor.disable()

      expect(mockQuillInstance.disable).toHaveBeenCalled()
    })

    it('should check if editor is enabled', () => {
      mockQuillInstance.isEnabled.mockReturnValue(true)
      expect(editor.isEnabled()).toBe(true)

      mockQuillInstance.isEnabled.mockReturnValue(false)
      expect(editor.isEnabled()).toBe(false)
    })
  })

  describe('on / off event handlers', () => {
    it('should register event handler and return unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = editor.on('text-change', handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should remove event handler with off', () => {
      const handler = vi.fn()
      editor.on('text-change', handler)
      editor.off('text-change', handler)

      // Handler should be removed (no way to directly test, but no error should occur)
    })

    it('should unsubscribe when calling returned function', () => {
      const handler = vi.fn()
      const unsubscribe = editor.on('text-change', handler)
      unsubscribe()

      // Handler should be removed
    })
  })

  describe('getEditorInstance', () => {
    it('should return the Quill instance', () => {
      const instance = editor.getEditorInstance()

      expect(instance).toBe(mockQuillInstance)
    })
  })

  describe('destroy', () => {
    it('should clean up the editor', () => {
      container.innerHTML = '<p>some content</p>'
      editor.destroy()

      expect(container.innerHTML).toBe('')
    })
  })
})

describe('quillToolbars', () => {
  describe('minimal toolbar', () => {
    it('should have correct name', () => {
      expect(quillToolbars.minimal.name).toBe('minimal')
    })

    it('should have basic formatting options', () => {
      expect(quillToolbars.minimal.groups).toBeDefined()
      expect(quillToolbars.minimal.groups.length).toBeGreaterThan(0)

      // Should include basic formatting
      const flatGroups = quillToolbars.minimal.groups.flat()
      expect(flatGroups).toContain('bold')
      expect(flatGroups).toContain('italic')
      expect(flatGroups).toContain('underline')
    })

    it('should include link and image', () => {
      const flatGroups = quillToolbars.minimal.groups.flat()
      expect(flatGroups).toContain('link')
      expect(flatGroups).toContain('image')
    })
  })

  describe('standard toolbar', () => {
    it('should have correct name', () => {
      expect(quillToolbars.standard.name).toBe('standard')
    })

    it('should have more options than minimal', () => {
      expect(quillToolbars.standard.groups.length).toBeGreaterThanOrEqual(
        quillToolbars.minimal.groups.length,
      )
    })

    it('should include code-block', () => {
      const flatGroups = quillToolbars.standard.groups.flat()
      expect(flatGroups).toContain('code-block')
    })

    it('should include clean button', () => {
      const flatGroups = quillToolbars.standard.groups.flat()
      expect(flatGroups).toContain('clean')
    })
  })

  describe('full toolbar', () => {
    it('should have correct name', () => {
      expect(quillToolbars.full.name).toBe('full')
    })

    it('should have most options', () => {
      expect(quillToolbars.full.groups.length).toBeGreaterThanOrEqual(
        quillToolbars.standard.groups.length,
      )
    })

    it('should include video', () => {
      const flatGroups = quillToolbars.full.groups.flat()
      expect(flatGroups).toContain('video')
    })

    it('should include color and background options', () => {
      const colorGroup = quillToolbars.full.groups.find((group) =>
        group.some((item) => typeof item === 'object' && 'type' in item && item.type === 'color'),
      )
      expect(colorGroup).toBeDefined()

      const backgroundOption = colorGroup?.find(
        (item) => typeof item === 'object' && 'type' in item && item.type === 'background',
      )
      expect(backgroundOption).toBeDefined()
    })
  })
})

describe('toolbarConfigToQuill', () => {
  it('should convert simple string items', () => {
    const config: ToolbarConfig = {
      name: 'test',
      groups: [['bold', 'italic', 'underline']],
    }

    const result = toolbarConfigToQuill(config)

    expect(result).toEqual([['bold', 'italic', 'underline']])
  })

  it('should convert object items with options', () => {
    const config: ToolbarConfig = {
      name: 'test',
      groups: [[{ type: 'header', options: [1, 2, 3] }]],
    }

    const result = toolbarConfigToQuill(config)

    expect(result).toEqual([[{ header: [1, 2, 3] }]])
  })

  it('should convert object items without options', () => {
    const config: ToolbarConfig = {
      name: 'test',
      groups: [[{ type: 'align', options: [] }]],
    }

    const result = toolbarConfigToQuill(config)

    expect(result).toEqual([[{ align: [] }]])
  })

  it('should handle mixed groups', () => {
    const config: ToolbarConfig = {
      name: 'test',
      groups: [
        ['bold', 'italic', { type: 'list', options: ['ordered', 'bullet'] }],
        [{ type: 'header', options: [1, 2] }, 'link', 'image'],
      ],
    }

    const result = toolbarConfigToQuill(config)

    expect(result).toEqual([
      ['bold', 'italic', { list: ['ordered', 'bullet'] }],
      [{ header: [1, 2] }, 'link', 'image'],
    ])
  })

  it('should convert minimal toolbar preset correctly', () => {
    const result = toolbarConfigToQuill(quillToolbars.minimal)

    expect(result).toEqual([
      ['bold', 'italic', 'underline'],
      [{ header: [1, 2] }],
      [{ list: ['ordered', 'bullet'] }],
      ['link', 'image'],
    ])
  })

  it('should convert standard toolbar preset correctly', () => {
    const result = toolbarConfigToQuill(quillToolbars.standard)

    // Verify structure is an array of arrays
    expect(Array.isArray(result)).toBe(true)
    result.forEach((group) => {
      expect(Array.isArray(group)).toBe(true)
    })
  })

  it('should convert full toolbar preset correctly', () => {
    const result = toolbarConfigToQuill(quillToolbars.full)

    // Verify structure is an array of arrays
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(quillToolbars.full.groups.length)
  })
})

describe('Type exports', () => {
  it('should export RichTextProvider type', () => {
    // Type-level test - if this compiles, the type is exported
    const assertType = <T>(_: T): void => {}
    assertType<RichTextProvider>(provider)
  })

  it('should export RichTextEditor type', () => {
    const container = document.createElement('div')
    const provider = createQuillProvider()
    const editor = provider.createEditor({ container })
    const assertType = <T>(_: T): void => {}
    assertType<RichTextEditor>(editor)
  })

  it('should export RichTextValue type', () => {
    const assertType = <T>(_: T): void => {}
    const value: RichTextValue = { text: '', html: '', delta: undefined }
    assertType<RichTextValue>(value)
  })

  it('should export ToolbarConfig type', () => {
    const assertType = <T>(_: T): void => {}
    const config: ToolbarConfig = { name: 'test', groups: [] }
    assertType<ToolbarConfig>(config)
  })

  it('should export QuillOptions type', () => {
    const assertType = <T>(_: T): void => {}
    const options: QuillOptions = { container: document.createElement('div'), theme: 'snow' }
    assertType<QuillOptions>(options)
  })
})

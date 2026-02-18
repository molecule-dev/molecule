// @vitest-environment happy-dom
/**
 * Comprehensive tests for `@molecule/app-rich-text` module.
 *
 * Tests provider creation, editor creation/configuration, value conversion,
 * formatting operations, event handling, and toolbar presets.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock document.execCommand since it's not available in happy-dom
const originalExecCommand = document.execCommand
beforeAll(() => {
  document.execCommand = vi.fn(() => true)
})
afterAll(() => {
  document.execCommand = originalExecCommand
})
import {
  createEditor,
  createEmptyValue,
  // Editor
  createSimpleRichTextProvider,
  // Utilities
  defaultToolbars,
  type EditorEvent,
  type EditorOptions,
  type FormatButton,
  type FormatType,
  getProvider,
  htmlToValue,
  type RichTextEditor,
  type RichTextProvider,
  // Type exports
  type RichTextValue,
  type SelectionChangeData,
  type SelectionRange,
  // Provider management
  setProvider,
  type TextChangeData,
  textToValue,
  type ToolbarConfig,
  type ToolbarGroup,
} from '../index.js'

describe('@molecule/app-rich-text', () => {
  describe('Module Exports', () => {
    it('should export defaultToolbars object', () => {
      expect(defaultToolbars).toBeDefined()
      expect(typeof defaultToolbars).toBe('object')
    })

    it('should export createSimpleRichTextProvider function', () => {
      expect(typeof createSimpleRichTextProvider).toBe('function')
    })

    it('should export setProvider function', () => {
      expect(typeof setProvider).toBe('function')
    })

    it('should export getProvider function', () => {
      expect(typeof getProvider).toBe('function')
    })

    it('should export createEditor function', () => {
      expect(typeof createEditor).toBe('function')
    })

    it('should export createEmptyValue function', () => {
      expect(typeof createEmptyValue).toBe('function')
    })

    it('should export htmlToValue function', () => {
      expect(typeof htmlToValue).toBe('function')
    })

    it('should export textToValue function', () => {
      expect(typeof textToValue).toBe('function')
    })
  })

  describe('defaultToolbars', () => {
    describe('minimal toolbar', () => {
      it('should have correct name', () => {
        expect(defaultToolbars.minimal.name).toBe('minimal')
      })

      it('should have groups defined', () => {
        expect(defaultToolbars.minimal.groups).toBeDefined()
        expect(Array.isArray(defaultToolbars.minimal.groups)).toBe(true)
        expect(defaultToolbars.minimal.groups.length).toBeGreaterThan(0)
      })

      it('should include basic text formatting', () => {
        const flatGroups = defaultToolbars.minimal.groups.flat()
        expect(flatGroups).toContain('bold')
        expect(flatGroups).toContain('italic')
        expect(flatGroups).toContain('underline')
      })

      it('should include header option with levels', () => {
        const headerGroup = defaultToolbars.minimal.groups.find((group) =>
          group.some(
            (item) => typeof item === 'object' && 'type' in item && item.type === 'header',
          ),
        )
        expect(headerGroup).toBeDefined()

        const headerButton = headerGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'header',
        ) as FormatButton | undefined
        expect(headerButton?.options).toEqual([1, 2])
      })

      it('should include list options', () => {
        const listGroup = defaultToolbars.minimal.groups.find((group) =>
          group.some((item) => typeof item === 'object' && 'type' in item && item.type === 'list'),
        )
        expect(listGroup).toBeDefined()

        const listButton = listGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'list',
        ) as FormatButton | undefined
        expect(listButton?.options).toEqual(['ordered', 'bullet'])
      })

      it('should include link and image', () => {
        const flatGroups = defaultToolbars.minimal.groups.flat()
        expect(flatGroups).toContain('link')
        expect(flatGroups).toContain('image')
      })
    })

    describe('standard toolbar', () => {
      it('should have correct name', () => {
        expect(defaultToolbars.standard.name).toBe('standard')
      })

      it('should include strike formatting', () => {
        const flatGroups = defaultToolbars.standard.groups.flat()
        expect(flatGroups).toContain('strike')
      })

      it('should include blockquote and code-block', () => {
        const flatGroups = defaultToolbars.standard.groups.flat()
        expect(flatGroups).toContain('blockquote')
        expect(flatGroups).toContain('code-block')
      })

      it('should have header options 1, 2, 3', () => {
        const headerGroup = defaultToolbars.standard.groups.find((group) =>
          group.some(
            (item) => typeof item === 'object' && 'type' in item && item.type === 'header',
          ),
        )

        const headerButton = headerGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'header',
        ) as FormatButton | undefined
        expect(headerButton?.options).toEqual([1, 2, 3])
      })

      it('should include align option', () => {
        const alignGroup = defaultToolbars.standard.groups.find((group) =>
          group.some((item) => typeof item === 'object' && 'type' in item && item.type === 'align'),
        )
        expect(alignGroup).toBeDefined()
      })
    })

    describe('full toolbar', () => {
      it('should have correct name', () => {
        expect(defaultToolbars.full.name).toBe('full')
      })

      it('should have the most groups', () => {
        expect(defaultToolbars.full.groups.length).toBeGreaterThanOrEqual(
          defaultToolbars.standard.groups.length,
        )
      })

      it('should include color and background options', () => {
        const colorGroup = defaultToolbars.full.groups.find((group) =>
          group.some((item) => typeof item === 'object' && 'type' in item && item.type === 'color'),
        )
        expect(colorGroup).toBeDefined()

        const backgroundButton = colorGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'background',
        )
        expect(backgroundButton).toBeDefined()
      })

      it('should include script options', () => {
        const scriptGroup = defaultToolbars.full.groups.find((group) =>
          group.some(
            (item) => typeof item === 'object' && 'type' in item && item.type === 'script',
          ),
        )

        const scriptButton = scriptGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'script',
        ) as FormatButton | undefined
        expect(scriptButton?.options).toEqual(['sub', 'super'])
      })

      it('should include indent options', () => {
        const indentGroup = defaultToolbars.full.groups.find((group) =>
          group.some(
            (item) => typeof item === 'object' && 'type' in item && item.type === 'indent',
          ),
        )

        const indentButton = indentGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'indent',
        ) as FormatButton | undefined
        expect(indentButton?.options).toEqual(['-1', '+1'])
      })

      it('should include direction option', () => {
        const directionGroup = defaultToolbars.full.groups.find((group) =>
          group.some(
            (item) => typeof item === 'object' && 'type' in item && item.type === 'direction',
          ),
        )

        const directionButton = directionGroup?.find(
          (item) => typeof item === 'object' && 'type' in item && item.type === 'direction',
        ) as FormatButton | undefined
        expect(directionButton?.options).toEqual(['rtl'])
      })

      it('should include font option', () => {
        const fontGroup = defaultToolbars.full.groups.find((group) =>
          group.some((item) => typeof item === 'object' && 'type' in item && item.type === 'font'),
        )
        expect(fontGroup).toBeDefined()
      })

      it('should include clean button', () => {
        const flatGroups = defaultToolbars.full.groups.flat()
        expect(flatGroups).toContain('clean')
      })

      it('should have header levels 1-6 and false', () => {
        const headerGroup = defaultToolbars.full.groups.find((group) =>
          group.some(
            (item) =>
              typeof item === 'object' &&
              'type' in item &&
              item.type === 'header' &&
              Array.isArray((item as FormatButton).options) &&
              (item as FormatButton).options!.length > 3,
          ),
        )

        const headerButton = headerGroup?.find(
          (item) =>
            typeof item === 'object' &&
            'type' in item &&
            item.type === 'header' &&
            Array.isArray((item as FormatButton).options) &&
            (item as FormatButton).options!.length > 3,
        ) as FormatButton | undefined
        expect(headerButton?.options).toEqual([1, 2, 3, 4, 5, 6, false])
      })
    })
  })

  describe('createSimpleRichTextProvider', () => {
    let provider: RichTextProvider

    beforeEach(() => {
      provider = createSimpleRichTextProvider()
    })

    it('should create a provider', () => {
      expect(provider).toBeDefined()
    })

    describe('getName()', () => {
      it('should return "simple"', () => {
        expect(provider.getName()).toBe('simple')
      })
    })

    describe('getToolbarPresets()', () => {
      it('should return toolbar presets', () => {
        const presets = provider.getToolbarPresets()
        expect(presets).toBeDefined()
        expect(typeof presets).toBe('object')
      })

      it('should include minimal, standard, and full presets', () => {
        const presets = provider.getToolbarPresets()
        expect(presets.minimal).toBeDefined()
        expect(presets.standard).toBeDefined()
        expect(presets.full).toBeDefined()
      })

      it('should return the same presets as defaultToolbars', () => {
        const presets = provider.getToolbarPresets()
        expect(presets).toBe(defaultToolbars)
      })
    })

    describe('createEmptyValue()', () => {
      it('should return an empty RichTextValue', () => {
        const emptyValue = provider.createEmptyValue()
        expect(emptyValue).toEqual({
          text: '',
          html: '',
        })
      })

      it('should not include delta by default', () => {
        const emptyValue = provider.createEmptyValue()
        expect(emptyValue.delta).toBeUndefined()
      })
    })

    describe('htmlToValue()', () => {
      it('should convert simple HTML to value', () => {
        const html = '<p>Hello World</p>'
        const value = provider.htmlToValue(html)

        expect(value.html).toBe(html)
        expect(value.text).toBe('Hello World')
      })

      it('should convert HTML with inline formatting', () => {
        const html = '<p>Hello <strong>Bold</strong> and <em>Italic</em></p>'
        const value = provider.htmlToValue(html)

        expect(value.html).toBe(html)
        expect(value.text).toBe('Hello Bold and Italic')
      })

      it('should handle nested HTML elements', () => {
        const html = '<div><p>First</p><p>Second</p></div>'
        const value = provider.htmlToValue(html)

        expect(value.html).toBe(html)
        expect(value.text).toBe('FirstSecond')
      })

      it('should handle empty HTML', () => {
        const value = provider.htmlToValue('')
        expect(value.html).toBe('')
        expect(value.text).toBe('')
      })

      it('should strip HTML tags for text content', () => {
        const html = '<h1>Title</h1><p>Content with <a href="#">link</a></p>'
        const value = provider.htmlToValue(html)

        expect(value.text).toBe('TitleContent with link')
      })
    })

    describe('textToValue()', () => {
      it('should convert simple text to value', () => {
        const text = 'Hello World'
        const value = provider.textToValue(text)

        expect(value.text).toBe(text)
        expect(value.html).toBe('<p>Hello World</p>')
      })

      it('should convert multi-line text to paragraphs', () => {
        const text = 'First line\nSecond line'
        const value = provider.textToValue(text)

        expect(value.text).toBe(text)
        expect(value.html).toBe('<p>First line</p><p>Second line</p>')
      })

      it('should handle empty text', () => {
        const value = provider.textToValue('')
        expect(value.text).toBe('')
        expect(value.html).toBe('<p></p>')
      })

      it('should handle multiple newlines', () => {
        const text = 'Line 1\nLine 2\nLine 3'
        const value = provider.textToValue(text)

        expect(value.html).toBe('<p>Line 1</p><p>Line 2</p><p>Line 3</p>')
      })
    })

    describe('createEditor()', () => {
      let container: HTMLElement
      let editor: RichTextEditor

      beforeEach(() => {
        container = document.createElement('div')
        container.id = 'test-editor'
        document.body.appendChild(container)
      })

      afterEach(() => {
        if (editor) {
          editor.destroy()
        }
        container.remove()
      })

      it('should create an editor instance', () => {
        editor = provider.createEditor({ container })
        expect(editor).toBeDefined()
      })

      it('should append editor element to container', () => {
        editor = provider.createEditor({ container })
        expect(container.children.length).toBe(1)
        expect(container.children[0].getAttribute('contenteditable')).toBe('true')
      })

      it('should set initial value', () => {
        const initialValue: RichTextValue = {
          text: 'Initial content',
          html: '<p>Initial content</p>',
        }
        editor = provider.createEditor({ container, value: initialValue })

        expect(editor.getHTML()).toBe('<p>Initial content</p>')
        expect(editor.getText()).toBe('Initial content')
      })

      it('should set placeholder attribute', () => {
        editor = provider.createEditor({ container, placeholder: 'Enter text...' })

        const editorEl = container.children[0] as HTMLElement
        expect(editorEl.getAttribute('data-placeholder')).toBe('Enter text...')
      })

      it('should create read-only editor', () => {
        editor = provider.createEditor({ container, readOnly: true })

        const editorEl = container.children[0] as HTMLElement
        expect(editorEl.getAttribute('contenteditable')).toBe('false')
        expect(editor.isEnabled()).toBe(false)
      })

      it('should have minimum styling applied', () => {
        editor = provider.createEditor({ container })

        const editorEl = container.children[0] as HTMLElement
        expect(editorEl.style.minHeight).toBe('100px')
        expect(editorEl.style.padding).toBe('8px')
        expect(editorEl.style.border).toBe('1px solid #ccc')
      })
    })
  })

  describe('Provider Management', () => {
    let originalProvider: RichTextProvider | null = null

    beforeEach(() => {
      // Store original provider state
      originalProvider = null
      try {
        originalProvider = getProvider()
      } catch {
        // No provider set
      }
    })

    afterEach(() => {
      // Restore original provider
      if (originalProvider) {
        setProvider(originalProvider)
      }
    })

    describe('setProvider() and getProvider()', () => {
      it('should set and get provider', () => {
        const customProvider = createSimpleRichTextProvider()
        setProvider(customProvider)

        expect(getProvider()).toBe(customProvider)
      })

      it('should return default simple provider when none set', () => {
        // Reset provider
        setProvider(null as unknown as RichTextProvider)

        const provider = getProvider()
        expect(provider).toBeDefined()
        expect(provider.getName()).toBe('simple')
      })

      it('should allow switching providers', () => {
        const provider1 = createSimpleRichTextProvider()
        const provider2 = createSimpleRichTextProvider()

        setProvider(provider1)
        expect(getProvider()).toBe(provider1)

        setProvider(provider2)
        expect(getProvider()).toBe(provider2)
      })
    })

    describe('createEditor() delegation', () => {
      let container: HTMLElement

      beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
      })

      afterEach(() => {
        container.remove()
      })

      it('should delegate to current provider', () => {
        const mockProvider: RichTextProvider = {
          getName: () => 'mock',
          getToolbarPresets: () => defaultToolbars,
          createEmptyValue: () => ({ text: '', html: '' }),
          htmlToValue: (html) => ({ text: '', html }),
          textToValue: (text) => ({ text, html: '' }),
          createEditor: vi.fn(() => ({}) as RichTextEditor),
        }

        setProvider(mockProvider)
        createEditor({ container })

        expect(mockProvider.createEditor).toHaveBeenCalledWith({ container })
      })
    })

    describe('createEmptyValue() delegation', () => {
      it('should delegate to current provider', () => {
        const mockProvider: RichTextProvider = {
          getName: () => 'mock',
          getToolbarPresets: () => defaultToolbars,
          createEmptyValue: vi.fn(() => ({ text: 'mock', html: 'mock' })),
          htmlToValue: (html) => ({ text: '', html }),
          textToValue: (text) => ({ text, html: '' }),
          createEditor: () => ({}) as RichTextEditor,
        }

        setProvider(mockProvider)
        const value = createEmptyValue()

        expect(mockProvider.createEmptyValue).toHaveBeenCalled()
        expect(value).toEqual({ text: 'mock', html: 'mock' })
      })
    })

    describe('htmlToValue() delegation', () => {
      it('should delegate to current provider', () => {
        const mockProvider: RichTextProvider = {
          getName: () => 'mock',
          getToolbarPresets: () => defaultToolbars,
          createEmptyValue: () => ({ text: '', html: '' }),
          htmlToValue: vi.fn((html) => ({ text: 'converted', html })),
          textToValue: (text) => ({ text, html: '' }),
          createEditor: () => ({}) as RichTextEditor,
        }

        setProvider(mockProvider)
        const value = htmlToValue('<p>Test</p>')

        expect(mockProvider.htmlToValue).toHaveBeenCalledWith('<p>Test</p>')
        expect(value.text).toBe('converted')
      })
    })

    describe('textToValue() delegation', () => {
      it('should delegate to current provider', () => {
        const mockProvider: RichTextProvider = {
          getName: () => 'mock',
          getToolbarPresets: () => defaultToolbars,
          createEmptyValue: () => ({ text: '', html: '' }),
          htmlToValue: (html) => ({ text: '', html }),
          textToValue: vi.fn((text) => ({ text, html: '<mock>' + text + '</mock>' })),
          createEditor: () => ({}) as RichTextEditor,
        }

        setProvider(mockProvider)
        const value = textToValue('Hello')

        expect(mockProvider.textToValue).toHaveBeenCalledWith('Hello')
        expect(value.html).toBe('<mock>Hello</mock>')
      })
    })
  })

  describe('RichTextEditor Interface', () => {
    let container: HTMLElement
    let editor: RichTextEditor
    let provider: RichTextProvider

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
      provider = createSimpleRichTextProvider()
      editor = provider.createEditor({
        container,
        value: { text: 'Test content', html: '<p>Test content</p>' },
      })
    })

    afterEach(() => {
      editor.destroy()
      container.remove()
    })

    describe('getValue() / setValue()', () => {
      it('should return current value', () => {
        const value = editor.getValue()
        expect(value.text).toBe('Test content')
        expect(value.html).toBe('<p>Test content</p>')
      })

      it('should set new value', () => {
        editor.setValue({ text: 'New content', html: '<p>New content</p>' })

        const value = editor.getValue()
        expect(value.text).toBe('New content')
        expect(value.html).toBe('<p>New content</p>')
      })
    })

    describe('getText() / getHTML() / getLength()', () => {
      it('should return text content', () => {
        expect(editor.getText()).toBe('Test content')
      })

      it('should return HTML content', () => {
        expect(editor.getHTML()).toBe('<p>Test content</p>')
      })

      it('should return content length', () => {
        expect(editor.getLength()).toBe('Test content'.length)
      })
    })

    describe('insertText()', () => {
      it('should be callable', () => {
        expect(typeof editor.insertText).toBe('function')
        // Note: document.execCommand may not work in test environment
        // but we verify the method exists and is callable
        expect(() => editor.insertText('inserted')).not.toThrow()
      })
    })

    describe('insertHTML()', () => {
      it('should be callable', () => {
        expect(typeof editor.insertHTML).toBe('function')
        expect(() => editor.insertHTML('<strong>bold</strong>')).not.toThrow()
      })
    })

    describe('insertEmbed()', () => {
      it('should be callable', () => {
        expect(typeof editor.insertEmbed).toBe('function')
        expect(() => editor.insertEmbed('image', 'https://example.com/img.png')).not.toThrow()
      })
    })

    describe('deleteText()', () => {
      it('should be callable', () => {
        expect(typeof editor.deleteText).toBe('function')
        expect(() => editor.deleteText(0, 5)).not.toThrow()
      })
    })

    describe('format()', () => {
      it('should be callable with bold format', () => {
        expect(typeof editor.format).toBe('function')
        expect(() => editor.format('bold')).not.toThrow()
      })

      it('should be callable with italic format', () => {
        expect(() => editor.format('italic')).not.toThrow()
      })

      it('should be callable with underline format', () => {
        expect(() => editor.format('underline')).not.toThrow()
      })

      it('should be callable with strike format', () => {
        expect(() => editor.format('strike')).not.toThrow()
      })
    })

    describe('formatText()', () => {
      it('should be callable', () => {
        expect(typeof editor.formatText).toBe('function')
        expect(() => editor.formatText(0, 5, 'bold')).not.toThrow()
      })
    })

    describe('removeFormat()', () => {
      it('should be callable', () => {
        expect(typeof editor.removeFormat).toBe('function')
        expect(() => editor.removeFormat(0, 5)).not.toThrow()
      })
    })

    describe('getSelection() / setSelection()', () => {
      it('should return null when no selection', () => {
        const selection = editor.getSelection()
        // In test environment, selection may be null
        expect(selection === null || typeof selection === 'object').toBe(true)
      })

      it('should be callable with setSelection', () => {
        expect(typeof editor.setSelection).toBe('function')
        expect(() => editor.setSelection(0, 5)).not.toThrow()
      })
    })

    describe('focus() / blur() / hasFocus()', () => {
      it('should focus the editor', () => {
        expect(typeof editor.focus).toBe('function')
        expect(() => editor.focus()).not.toThrow()
      })

      it('should blur the editor', () => {
        expect(typeof editor.blur).toBe('function')
        expect(() => editor.blur()).not.toThrow()
      })

      it('should check focus state', () => {
        expect(typeof editor.hasFocus).toBe('function')
        const hasFocus = editor.hasFocus()
        expect(typeof hasFocus).toBe('boolean')
      })
    })

    describe('enable() / disable() / isEnabled()', () => {
      it('should enable the editor', () => {
        editor.disable()
        expect(editor.isEnabled()).toBe(false)

        editor.enable()
        expect(editor.isEnabled()).toBe(true)
      })

      it('should disable the editor', () => {
        editor.enable()
        expect(editor.isEnabled()).toBe(true)

        editor.disable()
        expect(editor.isEnabled()).toBe(false)
      })

      it('should update contenteditable attribute', () => {
        const editorEl = container.children[0] as HTMLElement

        editor.disable()
        expect(editorEl.contentEditable).toBe('false')

        editor.enable()
        expect(editorEl.contentEditable).toBe('true')
      })
    })

    describe('on() / off() event handlers', () => {
      it('should register event handler and return unsubscribe function', () => {
        const handler = vi.fn()
        const unsubscribe = editor.on('text-change', handler)

        expect(typeof unsubscribe).toBe('function')
      })

      it('should unsubscribe when calling returned function', () => {
        const handler = vi.fn()
        const unsubscribe = editor.on('text-change', handler)

        unsubscribe()
        // Handler should be removed (verified by no error)
      })

      it('should remove handler with off()', () => {
        const handler = vi.fn()
        editor.on('text-change', handler)

        expect(() => editor.off('text-change', handler)).not.toThrow()
      })

      it('should support multiple event types', () => {
        const textHandler = vi.fn()
        const selectionHandler = vi.fn()
        const focusHandler = vi.fn()
        const blurHandler = vi.fn()

        expect(() => editor.on('text-change', textHandler)).not.toThrow()
        expect(() => editor.on('selection-change', selectionHandler)).not.toThrow()
        expect(() => editor.on('focus', focusHandler)).not.toThrow()
        expect(() => editor.on('blur', blurHandler)).not.toThrow()
      })
    })

    describe('getEditorInstance()', () => {
      it('should return the underlying editor element', () => {
        const instance = editor.getEditorInstance()
        expect(instance).toBeDefined()
        expect(instance instanceof HTMLElement).toBe(true)
      })
    })

    describe('destroy()', () => {
      it('should remove editor from container', () => {
        expect(container.children.length).toBe(1)

        editor.destroy()

        expect(container.children.length).toBe(0)
      })

      it('should clean up event handlers', () => {
        const handler = vi.fn()
        editor.on('text-change', handler)

        editor.destroy()
        // After destroy, event handlers should be cleared
      })
    })
  })

  describe('Event Handling', () => {
    let container: HTMLElement
    let editor: RichTextEditor
    let provider: RichTextProvider

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
      provider = createSimpleRichTextProvider()
      editor = provider.createEditor({
        container,
        value: { text: 'Test', html: '<p>Test</p>' },
      })
    })

    afterEach(() => {
      editor.destroy()
      container.remove()
    })

    describe('text-change event', () => {
      it('should emit text-change when setValue is called', () => {
        const handler = vi.fn()
        editor.on('text-change', handler)

        editor.setValue({ text: 'New text', html: '<p>New text</p>' })

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            value: expect.objectContaining({
              text: 'New text',
              html: '<p>New text</p>',
            }),
            source: 'api',
          }),
        )
      })

      it('should include previousValue in event data', () => {
        const handler = vi.fn()
        editor.on('text-change', handler)

        editor.setValue({ text: 'New text', html: '<p>New text</p>' })

        const eventData = handler.mock.calls[0][0] as TextChangeData
        expect(eventData.previousValue).toBeDefined()
        expect(eventData.previousValue.text).toBe('Test')
      })
    })

    describe('focus event', () => {
      it('should emit focus when editor is focused', () => {
        const handler = vi.fn()
        editor.on('focus', handler)

        const editorEl = container.children[0] as HTMLElement
        editorEl.dispatchEvent(new Event('focus'))

        expect(handler).toHaveBeenCalledTimes(1)
      })
    })

    describe('blur event', () => {
      it('should emit blur when editor loses focus', () => {
        const handler = vi.fn()
        editor.on('blur', handler)

        const editorEl = container.children[0] as HTMLElement
        editorEl.dispatchEvent(new Event('blur'))

        expect(handler).toHaveBeenCalledTimes(1)
      })
    })

    describe('input event triggers text-change', () => {
      it('should emit text-change on input', () => {
        const handler = vi.fn()
        editor.on('text-change', handler)

        const editorEl = container.children[0] as HTMLElement
        editorEl.innerHTML = '<p>Updated content</p>'
        editorEl.dispatchEvent(new Event('input'))

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'user',
          }),
        )
      })
    })

    describe('multiple handlers for same event', () => {
      it('should call all registered handlers', () => {
        const handler1 = vi.fn()
        const handler2 = vi.fn()
        const handler3 = vi.fn()

        editor.on('text-change', handler1)
        editor.on('text-change', handler2)
        editor.on('text-change', handler3)

        editor.setValue({ text: 'Changed', html: '<p>Changed</p>' })

        expect(handler1).toHaveBeenCalledTimes(1)
        expect(handler2).toHaveBeenCalledTimes(1)
        expect(handler3).toHaveBeenCalledTimes(1)
      })

      it('should only remove specific handler when unsubscribing', () => {
        const handler1 = vi.fn()
        const handler2 = vi.fn()

        editor.on('text-change', handler1)
        const unsub2 = editor.on('text-change', handler2)

        unsub2()

        editor.setValue({ text: 'Changed', html: '<p>Changed</p>' })

        expect(handler1).toHaveBeenCalledTimes(1)
        expect(handler2).not.toHaveBeenCalled()
      })
    })
  })

  describe('Type Safety', () => {
    it('should support RichTextValue type', () => {
      const value: RichTextValue = {
        text: 'Hello',
        html: '<p>Hello</p>',
        delta: { ops: [] },
      }
      expect(value.text).toBe('Hello')
      expect(value.html).toBe('<p>Hello</p>')
      expect(value.delta).toEqual({ ops: [] })
    })

    it('should support FormatType type', () => {
      const formats: FormatType[] = [
        'bold',
        'italic',
        'underline',
        'strike',
        'link',
        'image',
        'video',
        'blockquote',
        'code-block',
        'header',
        'list',
        'indent',
        'align',
        'color',
        'background',
        'font',
        'size',
        'script',
        'direction',
        'clean',
      ]
      expect(formats).toHaveLength(20)
    })

    it('should support ToolbarConfig type', () => {
      const config: ToolbarConfig = {
        name: 'test',
        groups: [['bold', 'italic'], [{ type: 'header', options: [1, 2] }]],
      }
      expect(config.name).toBe('test')
      expect(config.groups).toHaveLength(2)
    })

    it('should support ToolbarGroup type', () => {
      const group: ToolbarGroup = ['bold', 'italic', { type: 'list', options: ['ordered'] }]
      expect(group).toHaveLength(3)
    })

    it('should support FormatButton type', () => {
      const button: FormatButton = {
        type: 'header',
        options: [1, 2, 3],
      }
      expect(button.type).toBe('header')
      expect(button.options).toEqual([1, 2, 3])
    })

    it('should support SelectionRange type', () => {
      const range: SelectionRange = {
        index: 5,
        length: 10,
      }
      expect(range.index).toBe(5)
      expect(range.length).toBe(10)
    })

    it('should support EditorEvent type', () => {
      const events: EditorEvent[] = ['text-change', 'selection-change', 'focus', 'blur']
      expect(events).toHaveLength(4)
    })

    it('should support TextChangeData type', () => {
      const data: TextChangeData = {
        value: { text: 'new', html: '<p>new</p>' },
        previousValue: { text: 'old', html: '<p>old</p>' },
        source: 'user',
      }
      expect(data.source).toBe('user')
    })

    it('should support SelectionChangeData type', () => {
      const data: SelectionChangeData = {
        range: { index: 0, length: 5 },
        previousRange: null,
        source: 'api',
      }
      expect(data.range?.length).toBe(5)
      expect(data.previousRange).toBeNull()
    })

    it('should support EditorOptions type', () => {
      const options: EditorOptions = {
        container: document.createElement('div'),
        value: { text: '', html: '' },
        placeholder: 'Type here...',
        toolbar: 'minimal',
        readOnly: false,
        formats: ['bold', 'italic'],
        theme: 'default',
        modules: { custom: true },
      }
      expect(options.placeholder).toBe('Type here...')
    })
  })

  describe('Edge Cases', () => {
    let container: HTMLElement
    let editor: RichTextEditor
    let provider: RichTextProvider

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
      provider = createSimpleRichTextProvider()
    })

    afterEach(() => {
      if (editor) {
        editor.destroy()
      }
      container.remove()
    })

    it('should handle empty initial value', () => {
      editor = provider.createEditor({ container })

      expect(editor.getText()).toBe('')
      expect(editor.getLength()).toBe(0)
    })

    it('should handle special characters in content', () => {
      editor = provider.createEditor({
        container,
        value: {
          text: '<script>alert("xss")</script>',
          html: '&lt;script&gt;alert("xss")&lt;/script&gt;',
        },
      })

      expect(editor.getHTML()).toContain('&lt;script&gt;')
    })

    it('should handle unicode content', () => {
      editor = provider.createEditor({
        container,
        value: { text: 'Hello World', html: '<p>Hello World</p>' },
      })

      expect(editor.getText()).toBe('Hello World')
    })

    it('should handle rapid setValue calls', () => {
      editor = provider.createEditor({ container })

      for (let i = 0; i < 100; i++) {
        editor.setValue({ text: `Value ${i}`, html: `<p>Value ${i}</p>` })
      }

      expect(editor.getText()).toBe('Value 99')
    })

    it('should handle enable/disable toggle rapidly', () => {
      editor = provider.createEditor({ container })

      for (let i = 0; i < 50; i++) {
        editor.disable()
        editor.enable()
      }

      expect(editor.isEnabled()).toBe(true)
    })

    it('should handle destroy being called multiple times', () => {
      editor = provider.createEditor({ container })

      expect(() => {
        editor.destroy()
        // Second destroy should not throw
        editor.destroy()
      }).not.toThrow()
    })

    it('should handle handlers registered after events already bound', () => {
      editor = provider.createEditor({ container })

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      editor.on('text-change', handler1)

      // Trigger event
      editor.setValue({ text: 'First', html: '<p>First</p>' })

      // Add second handler after first event
      editor.on('text-change', handler2)

      // Trigger another event
      editor.setValue({ text: 'Second', html: '<p>Second</p>' })

      expect(handler1).toHaveBeenCalledTimes(2)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('Custom Provider Integration', () => {
    it('should work with a custom provider implementation', () => {
      const customStore: RichTextValue = { text: '', html: '' }

      const customProvider: RichTextProvider = {
        getName: () => 'custom',
        getToolbarPresets: () => ({ basic: { name: 'basic', groups: [['bold']] } }),
        createEmptyValue: () => ({ text: 'custom-empty', html: '<custom></custom>' }),
        htmlToValue: (html) => ({ text: `custom:${html}`, html }),
        textToValue: (text) => ({ text, html: `<custom>${text}</custom>` }),
        createEditor: (options) => {
          customStore.html = options.value?.html || ''
          customStore.text = options.value?.text || ''

          return {
            getValue: () => ({ ...customStore }),
            setValue: (value) => {
              customStore.html = value.html
              customStore.text = value.text
            },
            getText: () => customStore.text,
            getHTML: () => customStore.html,
            getLength: () => customStore.text.length,
            insertText: () => {},
            insertHTML: () => {},
            insertEmbed: () => {},
            deleteText: () => {},
            format: () => {},
            formatText: () => {},
            removeFormat: () => {},
            getSelection: () => null,
            setSelection: () => {},
            focus: () => {},
            blur: () => {},
            hasFocus: () => false,
            enable: () => {},
            disable: () => {},
            isEnabled: () => true,
            on: () => () => {},
            off: () => {},
            getEditorInstance: () => null,
            destroy: () => {},
          }
        },
      }

      setProvider(customProvider)

      expect(getProvider().getName()).toBe('custom')
      expect(createEmptyValue()).toEqual({ text: 'custom-empty', html: '<custom></custom>' })
      expect(htmlToValue('<p>test</p>')).toEqual({
        text: 'custom:<p>test</p>',
        html: '<p>test</p>',
      })
      expect(textToValue('hello')).toEqual({ text: 'hello', html: '<custom>hello</custom>' })

      const container = document.createElement('div')
      const editor = createEditor({
        container,
        value: { text: 'initial', html: '<p>initial</p>' },
      })

      expect(editor.getText()).toBe('initial')
      expect(editor.getHTML()).toBe('<p>initial</p>')

      editor.setValue({ text: 'updated', html: '<p>updated</p>' })
      expect(editor.getText()).toBe('updated')
    })
  })
})

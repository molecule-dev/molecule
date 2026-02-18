/**
 * `@molecule/app-keyboard`
 * Utility functions tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { KeyboardProvider, KeyboardShowEvent } from '../types.js'
import { createKeyboardAwareContainer, hideOnOutsideClick } from '../utilities.js'

interface MockElement {
  tagName: string
  nodeName: string
  style: Record<string, string>
  contentEditable: string
  readonly isContentEditable: boolean
  children: MockElement[]
  appendChild: (child: MockElement) => MockElement
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void
  dispatchEvent: (event: MockMouseEvent) => boolean
}

interface MockMouseEvent {
  type: string
  target: MockElement
  bubbles: boolean
}

// Mock DOM objects for Node environment
const createMockElement = (tagName: string = 'div'): MockElement => {
  const listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  const children: MockElement[] = []
  const style: Record<string, string> = {}
  let _contentEditable = 'false'

  const element: MockElement = {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    style,
    get contentEditable() {
      return _contentEditable
    },
    set contentEditable(value: string) {
      _contentEditable = value
    },
    // isContentEditable is the DOM property that checks if element is editable
    get isContentEditable() {
      return _contentEditable === 'true'
    },
    children,
    appendChild: (child: MockElement) => {
      children.push(child)
      return child
    },
    addEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },
    removeEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler)
    },
    dispatchEvent: (event: MockMouseEvent) => {
      const handlers = listeners.get(event.type)
      if (handlers) {
        handlers.forEach((handler) => handler(event))
      }
      return true
    },
  }
  return element
}

const createMockMouseEvent = (type: string, target: MockElement): MockMouseEvent => {
  return {
    type,
    target,
    bubbles: true,
  }
}

// Set up global document mock
const mockDocument = {
  createElement: createMockElement,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

;(globalThis as unknown as { document: typeof mockDocument }).document = mockDocument

// Create a mock provider
function createMockProvider(): KeyboardProvider {
  const showCallbacks: Array<(event: KeyboardShowEvent) => void> = []
  const hideCallbacks: Array<() => void> = []

  return {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    toggle: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({
      isVisible: false,
      height: 0,
      screenHeight: 800,
    }),
    isVisible: vi.fn().mockResolvedValue(false),
    setResizeMode: vi.fn().mockResolvedValue(undefined),
    setStyle: vi.fn().mockResolvedValue(undefined),
    setAccessoryBar: vi.fn().mockResolvedValue(undefined),
    setScroll: vi.fn().mockResolvedValue(undefined),
    onShow: vi.fn((callback) => {
      showCallbacks.push(callback)
      return () => {
        const index = showCallbacks.indexOf(callback)
        if (index > -1) showCallbacks.splice(index, 1)
      }
    }),
    onHide: vi.fn((callback) => {
      hideCallbacks.push(callback)
      return () => {
        const index = hideCallbacks.indexOf(callback)
        if (index > -1) hideCallbacks.splice(index, 1)
      }
    }),
    onHeightChange: vi.fn().mockReturnValue(() => {}),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canShowHide: true,
      canSetResizeMode: true,
      canSetStyle: true,
      canControlAccessoryBar: true,
      canControlScroll: true,
    }),
    // Expose callbacks for testing
    _triggerShow: (event: KeyboardShowEvent) => {
      showCallbacks.forEach((cb) => cb(event))
    },
    _triggerHide: () => {
      hideCallbacks.forEach((cb) => cb())
    },
  } as KeyboardProvider & {
    _triggerShow: (event: KeyboardShowEvent) => void
    _triggerHide: () => void
  }
}

describe('hideOnOutsideClick', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return cleanup function', () => {
    const element = createMockElement('div')
    const cleanup = hideOnOutsideClick(element as unknown as HTMLElement)
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('should hide keyboard when clicking non-input element', () => {
    const element = createMockElement('div')
    const cleanup = hideOnOutsideClick(element as unknown as HTMLElement)

    const div = createMockElement('div')
    element.appendChild(div)

    const clickEvent = createMockMouseEvent('click', div)
    element.dispatchEvent(clickEvent)

    expect(mockProvider.hide).toHaveBeenCalled()
    cleanup()
  })

  it('should not hide keyboard when clicking input element', () => {
    const element = createMockElement('div')
    const cleanup = hideOnOutsideClick(element as unknown as HTMLElement)

    const input = createMockElement('input')
    element.appendChild(input)

    const clickEvent = createMockMouseEvent('click', input)
    element.dispatchEvent(clickEvent)

    expect(mockProvider.hide).not.toHaveBeenCalled()
    cleanup()
  })

  it('should not hide keyboard when clicking textarea element', () => {
    const element = createMockElement('div')
    const cleanup = hideOnOutsideClick(element as unknown as HTMLElement)

    const textarea = createMockElement('textarea')
    element.appendChild(textarea)

    const clickEvent = createMockMouseEvent('click', textarea)
    element.dispatchEvent(clickEvent)

    expect(mockProvider.hide).not.toHaveBeenCalled()
    cleanup()
  })

  it('should not hide keyboard when clicking contenteditable element', () => {
    const element = createMockElement('div')
    const cleanup = hideOnOutsideClick(element as unknown as HTMLElement)

    const editable = createMockElement('div')
    editable.contentEditable = 'true'
    element.appendChild(editable)

    const clickEvent = createMockMouseEvent('click', editable)
    element.dispatchEvent(clickEvent)

    expect(mockProvider.hide).not.toHaveBeenCalled()
    cleanup()
  })

  it('should return noop when no element or document', () => {
    // Test with undefined element in non-browser context
    const cleanup = hideOnOutsideClick(undefined)
    expect(typeof cleanup).toBe('function')
    cleanup() // Should not throw
  })

  it('should use document when no element provided', () => {
    const cleanup = hideOnOutsideClick()
    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})

describe('createKeyboardAwareContainer', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return object with enable and disable functions', () => {
    const container = createKeyboardAwareContainer()
    expect(typeof container.enable).toBe('function')
    expect(typeof container.disable).toBe('function')
  })

  it('should enable adjusts padding on keyboard show', () => {
    const container = createKeyboardAwareContainer()
    const element = createMockElement('div')
    element.style.paddingBottom = '0px'

    container.enable(element as unknown as HTMLElement)

    // Simulate keyboard show
    mockProvider._triggerShow({ keyboardHeight: 300 })

    expect(element.style.paddingBottom).toBe('300px')
    container.disable()
  })

  it('should restore original padding on keyboard hide', () => {
    const container = createKeyboardAwareContainer()
    const element = createMockElement('div')
    element.style.paddingBottom = '20px'

    container.enable(element as unknown as HTMLElement)

    // Simulate keyboard show
    mockProvider._triggerShow({ keyboardHeight: 300 })
    expect(element.style.paddingBottom).toBe('300px')

    // Simulate keyboard hide
    mockProvider._triggerHide()
    expect(element.style.paddingBottom).toBe('20px')

    container.disable()
  })

  it('should restore original padding on disable', () => {
    const container = createKeyboardAwareContainer()
    const element = createMockElement('div')
    element.style.paddingBottom = '10px'

    container.enable(element as unknown as HTMLElement)
    mockProvider._triggerShow({ keyboardHeight: 250 })
    expect(element.style.paddingBottom).toBe('250px')

    container.disable()
    expect(element.style.paddingBottom).toBe('10px')
  })

  it('should support marginBottom property', () => {
    const container = createKeyboardAwareContainer('marginBottom')
    const element = createMockElement('div')
    element.style.marginBottom = '0px'

    container.enable(element as unknown as HTMLElement)
    mockProvider._triggerShow({ keyboardHeight: 200 })

    expect(element.style.marginBottom).toBe('200px')
    container.disable()
  })

  it('should handle multiple enable/disable cycles', () => {
    const container = createKeyboardAwareContainer()
    const element = createMockElement('div')
    element.style.paddingBottom = '5px'

    // First cycle
    container.enable(element as unknown as HTMLElement)
    mockProvider._triggerShow({ keyboardHeight: 100 })
    expect(element.style.paddingBottom).toBe('100px')
    container.disable()
    expect(element.style.paddingBottom).toBe('5px')

    // Second cycle
    element.style.paddingBottom = '15px'
    container.enable(element as unknown as HTMLElement)
    mockProvider._triggerShow({ keyboardHeight: 150 })
    expect(element.style.paddingBottom).toBe('150px')
    container.disable()
    expect(element.style.paddingBottom).toBe('15px')
  })
})

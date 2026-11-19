// @vitest-environment jsdom

/**
 * A chat whose history fails to load still works, and the failure is logged so
 * an empty chat after a reload has a cause someone can find.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import { resetChatStoresForTests, useChat } from '../chat.js'
import { provideMolecule } from '../providers.js'
import { createTestLogger, createTestLoggerProvider } from './helpers/test-providers.js'

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe injects (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat history load failure', () => {
  it('logs the failure and leaves an empty, usable chat', async () => {
    const logger = createTestLogger()
    const warn = logger.warn
    setLoggerProvider(createTestLoggerProvider(logger))
    const loadHistory = vi
      .fn<ChatProvider['loadHistory']>()
      .mockRejectedValue(new Error('history endpoint returned 500'))
    const provider: ChatProvider = {
      name: 'failing-history',
      sendMessage: vi.fn<ChatProvider['sendMessage']>().mockResolvedValue(undefined),
      abort: vi.fn<ChatProvider['abort']>(),
      clearHistory: vi.fn<ChatProvider['clearHistory']>().mockResolvedValue(undefined),
      loadHistory,
    }

    /** Reads the chat whose history fails to load. */
    @Component({ selector: 'app-test-chat-history-probe', template: '' })
    class ChatHistoryProbeComponent {
      readonly chat = useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: true })
    }

    const fixture = mount(ChatHistoryProbeComponent, provideMolecule({ chat: provider }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loadHistory).toHaveBeenCalled()
    expect(fixture.componentInstance.chat.messages()).toEqual([])
    expect(warn).toHaveBeenCalledWith('Loading chat history failed', {
      error: expect.objectContaining({ message: 'history endpoint returned 500' }),
    })
  })
})

/**
 * The chat panel's conversation header: the conversation picker button, the
 * share / bug-report / settings / new-chat buttons and the searchable history
 * dropdown.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s conversation-selector header
 * (see that file for the design notes): the same DOM for the same input and the
 * same callbacks. The outer `ChatPanel` owns the conversation state (the list,
 * the search, the selection and the remount key), so it hands this section an
 * accessor-and-handler `state` on top of the shared `ctx`; every row, glyph and
 * style matches React's.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes, in Solid's kebab-case style form. All user-facing text goes through
 * `ctx.t`.
 *
 * @module
 */

import type { Accessor, JSX, Setter } from 'solid-js'
import { createEffect, createMemo, For, Show } from 'solid-js'

import { relativeTime } from '@molecule/app-ide-panel-logic'
import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'

import { Icon } from '../Icon.jsx'
import type { ChatPanelCtx, MutableRef } from './context.js'

/**
 * The outer panel's conversation state, as this section reads it — Solid
 * accessors and the handlers that change it. React keeps these in the panel
 * body; the port keeps them there too and passes them down.
 */
export interface ChatConversationHeaderState {
  /** Whether the history dropdown is open. */
  showDropdown: Accessor<boolean>
  /** Every conversation the last fetch returned, newest first. */
  conversations: Accessor<ConversationSummary[]>
  /** The dropdown's search text. */
  convSearch: Accessor<string>
  /** Sets the dropdown's search text. */
  setConvSearch: Setter<string>
  /** The open conversation's id, or null. */
  activeConversationId: Accessor<string | null>
  /** The conversation list narrowed by the search text. */
  filteredConversations: Accessor<ConversationSummary[]>
  /** The conversation the picker names, if it is in the list. */
  activeConversation: Accessor<ConversationSummary | undefined>
  /** The header row's ref, so the panel can close on an outside click. */
  dropdownRef: MutableRef<HTMLDivElement | null>
  /** The search field's ref, focused when the dropdown opens. */
  searchRef: MutableRef<HTMLInputElement | null>
  /** Opens or closes the dropdown (refreshing the list on open). */
  toggle: () => void
  /** Creates a conversation and opens it. */
  newChat: () => void
  /** Switches to an existing conversation. */
  selectConversation: (id: string) => void
  /** Asks the inner chat to open its `/share` modal. */
  openShare: () => void
  /** Asks the inner chat to open its `/report` modal. */
  openReport: () => void
  /** Asks the inner chat to open its `/settings` view. */
  openSettings: () => void
}

/** Props for {@link ChatConversationHeader}. */
export interface ChatConversationHeaderProps {
  /** The outer panel's shared state. */
  ctx: ChatPanelCtx
  /** The outer panel's conversation state and handlers. */
  state: ChatConversationHeaderState
}

/**
 * Renders the conversation selector header.
 * @param props - The outer ctx and its conversation state.
 * @returns The rendered header.
 */
export function ChatConversationHeader(props: ChatConversationHeaderProps): JSX.Element {
  const ctx = props.ctx
  const state = props.state
  const t = ctx.t
  const cm = ctx.cm

  // React keeps the search field's `value` ATTRIBUTE in step with the
  // controlled value (the DOM snapshot carries the attribute as well as the
  // live property); Solid's `value` prop writes only the property, so the
  // attribute is mirrored here — in the ref callback, which also covers a
  // remount while the dropdown reopens, and in an effect for later edits.
  createEffect(() => {
    const value = state.convSearch()
    // Read the value before the optional chain: with the dropdown closed the
    // ref is null, and a short-circuited argument would never subscribe.
    state.searchRef.current?.setAttribute('value', value)
  })

  // The search field's style as one reactive object: Solid hoists a literal
  // object's static keys into its template HTML, where the attribute keeps the
  // text as written and the first CSSOM write re-serializes it (jsdom drops
  // `background` in that path); returning the whole object from a memo applies
  // every declaration the way React's style object does.
  const searchStyle = createMemo<JSX.CSSProperties>(() => ({
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'inherit',
    // Deliberate iOS-zoom guard overriding cm.textSize('xs'): a focused input
    // below 16px makes iOS Safari zoom the page.
    ...(ctx.isNarrow() ? { 'font-size': '16px' } : {}),
  }))

  return (
    <div
      ref={(el) => {
        state.dropdownRef.current = el
      }}
      class={cm.cn(
        cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
        cm.sp('px', 2),
        cm.shrink0,
        cm.borderB,
      )}
      style={{
        position: 'relative',
        // Fixed 33px on fine pointers; on touch the header grows to fit the
        // cm.touchTarget (44px) header buttons instead of clipping them.
        height: ctx.isCoarse() ? undefined : '33px',
        'min-height': '33px',
        'z-index': 10,
      }}
    >
      {/* Conversation picker button */}
      <button
        /* mol-bespoke-button: conversation picker — the header title row, a full-width disclosure for the history dropdown */
        type="button"
        data-mol-id="chat-conversation-toggle"
        onClick={() => state.toggle()}
        class={cm.cn(cm.textSize('xs'), cm.textMuted)}
        onMouseEnter={(event) => {
          const span = event.currentTarget.querySelector('span')
          if (span) span.style.opacity = '1'
        }}
        onMouseLeave={(event) => {
          const span = event.currentTarget.querySelector('span')
          if (span) span.style.opacity = '0.7'
        }}
        style={{
          flex: 1,
          display: 'flex',
          'align-items': 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: '6px 6px 6px 0',
          'text-align': 'left',
          overflow: 'hidden',
          'border-radius': '4px',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          style={{
            display: 'block',
            'flex-shrink': '0',
            opacity: 0.5,
            transform: state.showDropdown() ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 100ms',
          }}
        >
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span
          style={{
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            opacity: 0.7,
          }}
        >
          {state.activeConversation()?.preview ??
            t('ide.chat.historyFallback', undefined, { defaultValue: 'Chat history' })}
        </span>
      </button>

      {/* Share button — opens the /share link modal. Hidden below the host's
          share capability (admin+ on molecule.dev), viewers included. */}
      <Show when={ctx.shareAllowed()}>
        <button
          type="button"
          data-mol-id="chat-share-button"
          onClick={() => state.openShare()}
          class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
          title={t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })}
          aria-label={t('ide.chat.share.openShare', undefined, {
            defaultValue: 'Share project',
          })}
          style={{ 'flex-shrink': 0, display: 'inline-flex', 'align-items': 'center' }}
        >
          <Icon name="share" size={14} aria-hidden="true" />
        </button>
      </Show>

      {/* Bug-report button — opens the /report modal */}
      <button
        type="button"
        data-mol-id="chat-report-button"
        onClick={() => state.openReport()}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
        title={t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' })}
        aria-label={t('ide.chat.report.openReport', undefined, {
          defaultValue: 'Report a bug',
        })}
        style={{ 'flex-shrink': 0, display: 'inline-flex', 'align-items': 'center' }}
      >
        <Icon name="bug" size={14} aria-hidden="true" />
      </button>

      {/* Settings button — opens the /settings view */}
      <button
        type="button"
        data-mol-id="chat-settings-button"
        onClick={() => state.openSettings()}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
        title={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
        aria-label={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
        style={{ 'flex-shrink': 0, display: 'inline-flex', 'align-items': 'center' }}
      >
        <Icon name="gear" size={14} aria-hidden="true" />
      </button>

      {/* New chat button — hidden for viewers (creating a conversation is editor work) */}
      <Show when={ctx.props.canEdit !== false}>
        <button
          type="button"
          data-mol-id="chat-new-conversation"
          onClick={() => state.newChat()}
          class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
          title={t('ide.chat.newChat', undefined, { defaultValue: 'New chat' })}
          style={{ 'flex-shrink': 0 }}
        >
          +
        </button>
      </Show>

      {/* Dropdown */}
      <Show when={state.showDropdown()}>
        <div
          class={cm.cn(cm.surface, cm.borderAll)}
          style={{
            position: 'absolute',
            top: '100%',
            left: '0px',
            right: '0px',
            'z-index': 100,
            // dvh on phones (vh ignores collapsing browser chrome); the fixed
            // 280px cap is desktop-only. (molecule-dev hides this header, but
            // other consumers render it.)
            'max-height': ctx.isNarrow() ? 'min(50dvh, 420px)' : '280px',
            'overflow-y': 'auto',
            'scrollbar-width': 'thin',
            'border-radius': '0 0 6px 6px',
            'box-shadow': '0 6px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '6px 10px',
              'border-bottom': '1px solid rgba(128,128,128,0.12)',
              position: 'sticky',
              top: '0px',
            }}
            class={cm.surface}
          >
            <input
              ref={(el) => {
                state.searchRef.current = el
                el.setAttribute('value', state.convSearch())
              }}
              value={state.convSearch()}
              onInput={(event) => state.setConvSearch(event.currentTarget.value)}
              placeholder={t('ide.chat.searchConversations', undefined, {
                defaultValue: 'Search conversations…',
              })}
              class={cm.textSize('xs')}
              style={searchStyle()}
            />
          </div>

          {/* Conversation list */}
          <Show when={state.filteredConversations().length === 0}>
            <div class={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ padding: '10px 12px' }}>
              {t('ide.chat.noConversations', undefined, {
                defaultValue: 'No conversations yet',
              })}
            </div>
          </Show>
          <For each={state.filteredConversations()}>
            {(conv) => (
              <button
                /* mol-bespoke-button: conversation row — full-width list item in the history dropdown */
                type="button"
                data-mol-id={`chat-conversation-${conv.id}`}
                onClick={() => state.selectConversation(conv.id)}
                class={cm.cn(
                  cm.w('full'),
                  conv.id === state.activeConversationId() ? cm.surfaceSecondary : '',
                )}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(128,128,128,0.1)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = ''
                }}
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'flex-start',
                  gap: '2px',
                  padding: '8px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  'text-align': 'left',
                }}
              >
                <span
                  class={cm.textSize('xs')}
                  style={{
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                    width: '100%',
                  }}
                >
                  {conv.preview ?? 'New conversation'}
                </span>
                <span class={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ opacity: 0.55 }}>
                  {relativeTime(conv.updatedAt)}
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

/**
 * The queued-message bar, anchored above the composer like the commit bar, so
 * the rows stay pinned instead of being pushed around beneath the streaming
 * output (which reflows as the response grows).
 *
 * Each queued message is one compact single-line row (truncated text + inline
 * edit/delete/send), so several queued messages never grow the footer. The bar
 * is hidden while a popup menu is open, matching the commit bar. Clicking edit
 * turns the row into the inline textarea editor from `chat:queued-edit`; Enter
 * saves (an emptied editor deletes the message) and Escape cancels.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s ChatPanel queued-messages
 * section: the same DOM for the same input and the same controls. The rows are
 * keyed by message id (React's `key={qm.id}`) so a rebuilt queue list keeps the
 * open editor on its row.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { batch, createMemo, mapArray, Show } from 'solid-js'

import type { ChatMessage } from '@molecule/app-ai-chat'

import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatQueuedMessages}. */
export interface ChatQueuedMessagesProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/** Props for one queued row (the summary and its editing twin). */
interface QueuedRowProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
  /** The queued message this row holds. */
  message: Accessor<ChatMessage>
}

/** Identity helper that type-checks a hand-written style object (as ChatComposer does). */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/**
 * Renders the queued-message bar.
 * @param props - The inner ctx.
 * @returns The bar while messages are queued and no popup is open, else nothing.
 */
export function ChatQueuedMessages(props: ChatQueuedMessagesProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const queuedById = createMemo(
    () => new Map(ctx.timeline.queuedMessages().map((message) => [message.id, message] as const)),
  )
  const queuedIds = createMemo(() => ctx.timeline.queuedMessages().map((message) => message.id))
  // Keyed by id (React's `key={qm.id}`): a rebuilt queue list keeps each row's
  // node, so switching one row into its editor does not disturb its siblings.
  const rows = mapArray(queuedIds, (id) => {
    const message = (): ChatMessage | undefined => queuedById().get(id)
    return (
      <Show when={message()}>
        {(qm) => (
          <Show
            when={ctx.queuedEdit.editingQueuedId() === qm().id}
            fallback={<QueuedRowSummary ctx={ctx} message={qm} />}
          >
            <QueuedRowEditor ctx={ctx} message={qm} />
          </Show>
        )}
      </Show>
    )
  })

  return (
    <Show
      when={
        ctx.timeline.queuedMessages().length > 0 &&
        !ctx.composer.commandMenu() &&
        !ctx.composer.modelPicker() &&
        !ctx.composer.effortPicker() &&
        !ctx.overlay.panelOverlay()
      }
    >
      <div
        style={styleOf({
          'border-top': '1px solid rgba(128,128,128,0.15)',
          padding: '6px 8px 6px 10px',
        })}
      >
        <div
          style={styleOf({
            display: 'flex',
            'align-items': 'center',
            gap: '4px',
            'margin-bottom': '3px',
          })}
        >
          <Icon
            name="clock"
            size={11}
            aria-hidden="true"
            style={styleOf({ opacity: '0.5', 'flex-shrink': '0' })}
          />
          <span
            class={cm.cn(cm.textMuted, cm.textSize('xs'))}
            style={styleOf({ 'font-style': 'italic' })}
          >
            {ctx.env.t(
              'ide.chat.queuedCount',
              { count: ctx.timeline.queuedMessages().length },
              { defaultValue: '{{count}} queued' },
            )}
          </span>
        </div>
        {/* Cap the height so many queued messages scroll in place rather than
            pushing the composer down; single-line rows keep it tight. */}
        <div
          style={styleOf({
            'max-height': '132px',
            'overflow-y': 'auto',
            'scrollbar-width': 'thin',
            display: 'flex',
            'flex-direction': 'column',
            gap: '2px',
          })}
        >
          {rows()}
        </div>
      </div>
    </Show>
  )
}

/**
 * One queued message's compact summary row: truncated text and the inline
 * edit/delete/send controls.
 * @param props - The inner ctx and the row's message.
 * @returns The summary row.
 */
function QueuedRowSummary(props: QueuedRowProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  return (
    <div
      style={styleOf({ display: 'flex', 'align-items': 'center', gap: '6px', 'min-width': '0px' })}
    >
      <span
        title={props.message().content}
        class={cm.textSize('sm')}
        style={styleOf({
          flex: '1',
          'min-width': '0px',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
          opacity: '0.8',
        })}
      >
        {props.message().content}
      </span>
      <button
        /* mol-bespoke-button: icon-only edit affordance — 22px (32px coarse) pencil on a dense queued-message row */
        type="button"
        title={ctx.env.t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' })}
        onClick={() => {
          // React batches both setters into the one event-handler commit, so
          // the editor mounts with its text already in place; Solid batches
          // them here to do the same (an unbatched count would mount the
          // editor before its `defaultValue` text was set).
          batch(() => {
            ctx.queuedEdit.setEditingQueuedId(props.message().id)
            ctx.queuedEdit.setEditingQueuedText(props.message().content)
          })
        }}
        style={styleOf({
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: ctx.env.isCoarse() ? '32px' : '22px',
          height: ctx.env.isCoarse() ? '32px' : '22px',
          'flex-shrink': '0',
          border: 'none',
          'border-radius': '4px',
          background: 'none',
          color: 'inherit',
          opacity: '0.5',
          cursor: 'pointer',
          padding: '0px',
          transition: 'opacity 100ms, background 100ms',
        })}
        onMouseEnter={(event) => {
          event.currentTarget.style.opacity = '1'
          event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = '0.5'
          event.currentTarget.style.background = 'none'
        }}
      >
        <Icon name="pencil" size={13} aria-hidden="true" />
      </button>
      <button
        /* mol-bespoke-button: icon-only delete affordance — 22px (32px coarse) trash on a dense queued-message row, theme error token */
        type="button"
        title={ctx.env.t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' })}
        onClick={() => ctx.chat.deleteQueuedMessage(props.message().id)}
        style={styleOf({
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: ctx.env.isCoarse() ? '32px' : '22px',
          height: ctx.env.isCoarse() ? '32px' : '22px',
          'flex-shrink': '0',
          border: 'none',
          'border-radius': '4px',
          background: 'none',
          // Theme ERROR token, not a per-theme literal — the token already
          // resolves per theme.
          color: 'var(--mol-color-error, #dc2626)',
          opacity: '0.6',
          cursor: 'pointer',
          padding: '0px',
          transition: 'opacity 100ms, background 100ms',
        })}
        onMouseEnter={(event) => {
          event.currentTarget.style.opacity = '1'
          event.currentTarget.style.background =
            'color-mix(in srgb, var(--mol-color-error, #dc2626) 12%, transparent)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = '0.6'
          event.currentTarget.style.background = 'none'
        }}
      >
        <Icon name="trash" size={13} aria-hidden="true" />
      </button>
      <Show when={!ctx.chat.isLoading()}>
        <button
          /* mol-bespoke-button: icon-only send affordance — 22px (32px coarse) arrow on a dense queued-message row, theme success token */
          type="button"
          title={ctx.env.t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' })}
          onClick={() => {
            const content = props.message().content
            ctx.chat.deleteQueuedMessage(props.message().id)
            void ctx.chat.sendMessage(content)
          }}
          style={styleOf({
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            width: ctx.env.isCoarse() ? '32px' : '22px',
            height: ctx.env.isCoarse() ? '32px' : '22px',
            'flex-shrink': '0',
            border: 'none',
            'border-radius': '4px',
            background: 'none',
            // Theme SUCCESS token, not a per-theme literal.
            color: 'var(--mol-color-success, #16a34a)',
            opacity: '0.7',
            cursor: 'pointer',
            padding: '0px',
            transition: 'opacity 100ms, background 100ms',
          })}
          onMouseEnter={(event) => {
            event.currentTarget.style.opacity = '1'
            event.currentTarget.style.background =
              'color-mix(in srgb, var(--mol-color-success, #16a34a) 14%, transparent)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.opacity = '0.7'
            event.currentTarget.style.background = 'none'
          }}
        >
          {/* Same up-arrow glyph as the composer's Send button. */}
          <svg width="13" height="13" viewBox="0 0 12 12" style={styleOf({ display: 'block' })}>
            <path
              d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </Show>
    </div>
  )
}

/**
 * One queued message's inline editor: the textarea seeded with the row's text
 * and the Cancel/Save pair (the dismissive one secondary, the confirming one
 * primary — the same pairing the rest of the app uses).
 * @param props - The inner ctx and the row's message.
 * @returns The editor rows.
 */
function QueuedRowEditor(props: QueuedRowProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  // React's `defaultValue` is read once when the editor mounts; the row's text
  // at that moment seeds the uncontrolled textarea.
  const editingText = ctx.queuedEdit.editingQueuedText()
  /** Saves the editor's text, or deletes the message when it was emptied. */
  const save = (): void => {
    const trimmed = ctx.queuedEdit.editingQueuedText().trim()
    if (trimmed) ctx.chat.editQueuedMessage(props.message().id, trimmed)
    else ctx.chat.deleteQueuedMessage(props.message().id)
    ctx.queuedEdit.setEditingQueuedId(null)
  }
  return (
    <div style={styleOf({ display: 'flex', 'flex-direction': 'column', gap: '6px' })}>
      <textarea
        ref={(element) => {
          // React's `defaultValue` only seeds the element; Solid has no typed
          // prop for it, so it is written once as the element is created. The
          // live text is the queued-edit slice's `editingQueuedText` (fed by
          // the input handler), so the textarea stays uncontrolled as React's.
          element.defaultValue = editingText
          ctx.queuedEdit.queuedEditRef.current = element
        }}
        aria-label={ctx.env.t('ide.chat.queuedEdit.label', undefined, {
          defaultValue: 'Edit queued message',
        })}
        onInput={(event) => ctx.queuedEdit.setEditingQueuedText(event.currentTarget.value)}
        onChange={(event) => ctx.queuedEdit.setEditingQueuedText(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            save()
          }
          if (event.key === 'Escape') ctx.queuedEdit.setEditingQueuedId(null)
        }}
        class={cm.cn(cm.surface, cm.textSize('sm'))}
        style={styleOf({
          width: '100%',
          'min-height': '52px',
          padding: '6px 8px',
          border: `1px solid ${ctx.env.isLight() ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
          'border-radius': '6px',
          resize: 'vertical',
          color: 'inherit',
          'font-family': 'inherit',
        })}
      />
      <div style={styleOf({ display: 'flex', gap: '6px', 'justify-content': 'flex-end' })}>
        {/* A Cancel/Save pair sitting side by side: the dismissive one is
            SECONDARY, the confirming one PRIMARY — the same pairing the rest of
            the app uses, instead of two hand-rolled frames separated only by a
            grey fill. */}
        <button
          type="button"
          data-mol-id="chat-queued-edit-cancel"
          onClick={() => ctx.queuedEdit.setEditingQueuedId(null)}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
            cm.touchTargetCompact,
          )}
        >
          {ctx.env.t('common.cancel', undefined, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="button"
          data-mol-id="chat-queued-edit-save"
          onClick={save}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
          )}
        >
          {ctx.env.t('common.save', undefined, { defaultValue: 'Save' })}
        </button>
      </div>
    </div>
  )
}

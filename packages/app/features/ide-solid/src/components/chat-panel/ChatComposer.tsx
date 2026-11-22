/**
 * The input container — the composer card with its hint row, plan / fast-mode
 * toggles, mic, attach, `@`, `/`, context ring and send/stop controls.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s section “Input container —
 * matches user message card style” (see that file for the design notes): the
 * same DOM for the same input, the same inline styles and the same callbacks.
 * The textarea is uncontrolled — the composer slice's `inputRef` holds the live
 * text, the element is seeded with the draft once — so a keystroke never
 * re-renders the panel.
 *
 * Every button reproduces React's own imperative hover affordance (it writes the
 * element's `style.opacity`), and every text read sits in an attribute or child
 * expression, so a locale or theme switch updates the DOM in place the way
 * React's whole-component re-render does.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'

import { ContextUsageIndicator } from '../../parts/ContextUsageIndicator.jsx'
import type { ChatInnerCtx } from './context.js'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background: none` serialize differently, and a
 * later dynamic declaration on the same element re-parses the raw text and can
 * drop a shorthand entirely. Calling through this identity function keeps every
 * declaration on the CSSOM path, so the rendered `style` attribute is the one
 * React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatComposer}. */
export interface ChatComposerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the input container.
 * @param props - The inner ctx.
 * @returns The composer container with its textarea and hint row.
 */
export function ChatComposer(props: ChatComposerProps): JSX.Element {
  const ctx = props.ctx

  return (
    <div
      class={ctx.env.cm.surfaceSecondary}
      hidden={ctx.env.transcriptOnly()}
      data-mol-id="chat-composer"
      // The container only moves focus to the textarea it holds; it is not a
      // control, and a keyboard user reaches that textarea with Tab.
      role="presentation"
      data-mol-viewer={ctx.props.canEdit === false ? '' : undefined}
      style={styleOf({
        // Round the TOP corners only (8px) so the composer reads as a
        // self-contained input with its own border on all sides, flush at the
        // bottom-left/right with the panel's bottom edge. Discovery rounds ALL
        // FOUR corners (the centered card is rounded on every side). The
        // composer's gradient-ring `::before` follows this via `border-radius:
        // inherit`.
        'border-radius': ctx.props.discovery ? '8px' : '8px 8px 0 0',
        padding: '8px 10px',
        cursor: 'text',
        // With the work tray open above, the composer is drawn OVER the tray's
        // lower edge (the tray tucks 8px under it).
        ...(ctx.timeline.workVisible() ? { position: 'relative', 'z-index': '1' } : {}),
        // View-only mode: the composer IS the team-chat box, so it wears the
        // team-message gold border (and the box is pre-filled with /teamsay).
        // Written as an always-present key: Solid's style diff removes a
        // dropped key with `removeProperty`, which jsdom re-serialises as the
        // border longhands instead of clearing them; an empty value clears.
        border: ctx.props.canEdit === false ? `1px solid ${NOTICE_TONE.gold.accent}` : '',
      })}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button')) {
          ctx.composer.textareaRef.current?.focus()
        }
      }}
    >
      <textarea
        ref={(element) => {
          ctx.composer.textareaRef.current = element
        }}
        data-mol-chat-input=""
        aria-label={ctx.env.t('ide.chat.inputLabel', undefined, {
          defaultValue: 'Write a message',
        })}
        // React's `defaultValue` only seeds the element: the live text is the
        // composer slice's `inputRef`.
        value={ctx.composer.initialDraft()}
        autocomplete="off"
        onInput={(event) => ctx.input.handleInputChange(event)}
        onChange={(event) => ctx.input.handleInputChange(event)}
        onPaste={(event) => ctx.attachments.handlePaste(event)}
        placeholder={
          ctx.props.canEdit === false
            ? ctx.env.t('ide.chat.placeholderViewer', undefined, {
                defaultValue: 'Message your team',
              })
            : ctx.env.t('ide.chat.placeholder', undefined, {
                defaultValue: 'Send a message...',
              })
        }
        rows={1}
        class={ctx.env.cm.textSize('sm')}
        style={styleOf({
          width: '100%',
          display: 'block',
          padding: '0px',
          color: 'inherit',
          resize: 'none',
          outline: 'none',
          // The <textarea> element fills its wrapper edge-to-edge with no border
          // or radius of its own — the gradient-bordered composer wrapper is the
          // visible frame. (P3-03/P3-23 act on that WRAPPER, not this element.)
          border: 'none',
          background: 'transparent',
          'font-family': 'inherit',
          'overflow-y': 'auto',
          'scrollbar-width': 'thin',
          'box-sizing': 'border-box',
          // Deliberate iOS-zoom guard, overriding cm.textSize('sm') (~14px): iOS
          // Safari zooms the whole page when a focused input's font is below
          // 16px, so phone-width / touch-first viewports must render at 16px.
          // Fine-pointer desktop keeps the compact 14px class untouched.
          ...(ctx.env.isNarrow() || ctx.env.isCoarse() ? { 'font-size': '16px' } : {}),
        })}
      />
      {/* Hint row: shortcuts · context ring · send */}
      <div
        style={styleOf({
          display: 'flex',
          'align-items': 'center',
          'margin-top': '6px',
          gap: '4px',
        })}
      >
        {/* Icon buttons — all use identical box model for vertical alignment:
            fixed flex-centered boxes (24×24 fine pointer, 40×32 coarse — wide
            for touch hit spacing but deliberately flat so the composer row
            doesn't balloon vertically) so text glyphs and SVGs align
            identically. Glyph sizes never change with the box. */}
        {/* Plan/Execute mode toggle — hidden for viewers: the mode drives
            Synthase, which a viewer can't run. */}
        <Show when={ctx.props.canEdit !== false}>
          <button
            /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
            type="button"
            onClick={() => {
              const previousMode = ctx.chat.mode()
              const newMode = previousMode === 'plan' ? 'execute' : 'plan'
              ctx.chat.setMode(newMode)
              ctx.env.http
                .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
                  mode: newMode,
                  conversationId: ctx.env.conversationId(),
                })
                .catch((error) => {
                  ctx.env.logger.warn('chat-panel: persisting chat-mode toggle failed; reverted', {
                    error,
                  })
                  ctx.chat.setMode(previousMode)
                })
              ctx.systemCards.addSystemCard(
                newMode === 'plan'
                  ? ctx.env.t('ide.chat.switchedToPlan', undefined, {
                      defaultValue: 'Switched to plan mode',
                    })
                  : ctx.env.t('ide.chat.switchedToExecute', undefined, {
                      defaultValue: 'Switched to execute mode',
                    }),
              )
            }}
            title={
              ctx.chat.mode() === 'plan'
                ? ctx.env.t('ide.chat.switchToExecute', undefined, {
                    defaultValue: 'Switch to execute mode',
                  })
                : ctx.env.t('ide.chat.switchToPlan', undefined, {
                    defaultValue: 'Switch to plan mode',
                  })
            }
            style={styleOf({
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              // Touch-first: grow the hit area to 40×40 (glyph size unchanged);
              // fine pointers keep the compact 24px box.
              width: ctx.env.isCoarse() ? '40px' : '24px',
              height: ctx.env.isCoarse() ? '32px' : '24px',
              background:
                ctx.chat.mode() === 'plan'
                  ? ctx.env.isLight()
                    ? 'rgba(217,119,6,0.14)'
                    : 'rgba(234,179,8,0.13)'
                  : 'none',
              border:
                ctx.chat.mode() === 'plan'
                  ? `1px solid ${
                      ctx.env.isLight() ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'
                    }`
                  : 'none',
              'border-radius': '3px',
              cursor: ctx.props.canEdit ? 'pointer' : 'not-allowed',
              color:
                ctx.chat.mode() === 'plan'
                  ? ctx.env.isLight()
                    ? '#d97706'
                    : '#eab308'
                  : 'inherit',
              opacity: !ctx.props.canEdit ? '0.4' : ctx.chat.mode() === 'plan' ? '1' : '0.4',
              padding: '0px',
              transition: 'opacity 100ms, color 100ms',
            })}
            onMouseEnter={(event) => {
              if (ctx.chat.mode() !== 'plan') event.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(event) => {
              if (ctx.chat.mode() !== 'plan') event.currentTarget.style.opacity = '0.4'
            }}
          >
            {/* Lightbulb icon (Primer Octicons) for plan mode */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </button>
        </Show>
        {/* Fast mode (⚡) toggle — rendered only when the current mode's model
            supports the provider's fast/priority speed tier. Persisted
            per-CONVERSATION (aiContext.fastMode): switching speed invalidates
            the provider prompt cache, so it's a conversation-level choice, not a
            per-message one. */}
        <Show when={ctx.pickers.fastModeAvailable() && ctx.props.canEdit !== false}>
          <button
            /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
            type="button"
            data-mol-id="chat-fast-mode-toggle"
            disabled={!ctx.props.canEdit}
            onClick={() => {
              const previousFastMode = ctx.chat.fastMode()
              const next = !previousFastMode
              ctx.chat.setFastMode(next)
              ctx.env.http
                .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
                  fastMode: next,
                  conversationId: ctx.env.conversationId(),
                })
                .catch((error) => {
                  ctx.env.logger.warn('chat-panel: persisting fast-mode toggle failed; reverted', {
                    error,
                  })
                  ctx.chat.setFastMode(previousFastMode)
                })
              ctx.systemCards.addSystemCard(
                next
                  ? ctx.env.t('ide.chat.fastModeOn', undefined, {
                      defaultValue: 'Fast mode on — faster responses at a higher rate',
                    })
                  : ctx.env.t('ide.chat.fastModeOff', undefined, {
                      defaultValue: 'Fast mode off',
                    }),
              )
            }}
            title={
              ctx.chat.fastMode()
                ? ctx.env.t('ide.chat.fastModeDisable', undefined, {
                    defaultValue: 'Turn off fast mode',
                  })
                : ctx.env.t('ide.chat.fastModeEnable', undefined, {
                    defaultValue: 'Fast mode — up to 2.5× faster output at a higher token rate',
                  })
            }
            style={styleOf({
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              width: ctx.env.isCoarse() ? '40px' : '24px',
              height: ctx.env.isCoarse() ? '32px' : '24px',
              background: ctx.chat.fastMode()
                ? ctx.env.isLight()
                  ? 'rgba(217,119,6,0.14)'
                  : 'rgba(234,179,8,0.13)'
                : 'none',
              border: ctx.chat.fastMode()
                ? `1px solid ${ctx.env.isLight() ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
                : 'none',
              'border-radius': '3px',
              cursor: 'pointer',
              color: ctx.chat.fastMode() ? (ctx.env.isLight() ? '#d97706' : '#eab308') : 'inherit',
              opacity: ctx.chat.fastMode() ? '1' : '0.4',
              padding: '0px',
              transition: 'opacity 100ms, color 100ms',
            })}
            onMouseEnter={(event) => {
              if (!ctx.chat.fastMode()) event.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(event) => {
              if (!ctx.chat.fastMode()) event.currentTarget.style.opacity = '0.4'
            }}
          >
            {/* Zap icon (Primer Octicons) for fast mode */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.504.43a.75.75 0 0 1 .584.859l-.828 4.211h4.49a.75.75 0 0 1 .573 1.234l-7.25 8.5a.75.75 0 0 1-1.32-.658l.828-4.211H2.09a.75.75 0 0 1-.573-1.234l7.25-8.5a.75.75 0 0 1 .737-.201Z" />
            </svg>
          </button>
        </Show>
        {/* Voice input button — ALWAYS rendered. When dictation can't work here,
            clicking shows the reason (voiceError) or opens the /mic picker with
            unusable engines disabled — it never just vanishes. */}
        <button
          /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
          type="button"
          data-mol-id="chat-mic-button"
          onClick={() => ctx.voice.toggleVoice()}
          title={
            ctx.voice.isListening()
              ? ctx.env.t('ide.chat.voiceStop', undefined, { defaultValue: 'Stop dictation' })
              : ctx.env.t('ide.chat.voice', undefined, { defaultValue: 'Dictate' })
          }
          style={styleOf({
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            width: ctx.env.isCoarse() ? '40px' : '24px',
            height: ctx.env.isCoarse() ? '32px' : '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: ctx.voice.isListening() ? 'rgb(239,68,68)' : 'inherit',
            opacity: ctx.voice.isListening() ? '1' : '0.4',
            padding: '0px',
            'border-radius': '3px',
            transition: 'opacity 100ms, color 100ms',
          })}
          onMouseEnter={(event) => {
            if (!ctx.voice.isListening()) event.currentTarget.style.opacity = '0.85'
          }}
          onMouseLeave={(event) => {
            if (!ctx.voice.isListening()) event.currentTarget.style.opacity = '0.4'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            style={styleOf({ display: 'block' })}
          >
            <rect
              x="6"
              y="1"
              width="4"
              height="8"
              rx="2"
              fill={ctx.voice.isListening() ? 'currentColor' : 'none'}
              stroke="currentColor"
              stroke-width="1.25"
            />
            <path
              d="M4 7v1a4 4 0 008 0V7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
            />
            <line
              x1="8"
              y1="12"
              x2="8"
              y2="15"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
            />
            <line
              x1="6"
              y1="15"
              x2="10"
              y2="15"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
            />
          </svg>
        </button>
        {/* Attachment button — hidden for viewers: attachments feed Synthase turns. */}
        <Show when={ctx.props.canEdit !== false}>
          <button
            /* mol-bespoke-button: icon-only composer affordance — shares the composer row's 24px / 40x32-coarse icon box model */
            type="button"
            onClick={() => ctx.attachments.fileInputRef.current?.click()}
            title={ctx.env.t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })}
            style={styleOf({
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              width: ctx.env.isCoarse() ? '40px' : '24px',
              height: ctx.env.isCoarse() ? '32px' : '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: '0.4',
              padding: '0px',
              'border-radius': '3px',
              transition: 'opacity 100ms',
            })}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = '0.4'
            }}
          >
            {/* Paperclip icon (Primer Octicons) */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={styleOf({ display: 'block' })}
            >
              <path d="M12.212 3.02a1.753 1.753 0 0 0-2.478.003l-5.83 5.83a3.007 3.007 0 0 0-.88 2.127c0 .795.315 1.551.88 2.116.567.567 1.333.89 2.126.89.79 0 1.548-.321 2.116-.89l5.48-5.48a.75.75 0 0 1 1.061 1.06l-5.48 5.48a4.492 4.492 0 0 1-3.177 1.33c-1.2 0-2.345-.487-3.187-1.33a4.483 4.483 0 0 1-1.32-3.177c0-1.195.475-2.341 1.32-3.186l5.83-5.83a3.25 3.25 0 0 1 5.553 2.297c0 .863-.343 1.691-.953 2.301L7.439 12.39c-.375.377-.884.59-1.416.593a1.998 1.998 0 0 1-1.412-.593 1.992 1.992 0 0 1 0-2.828l5.48-5.48a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-5.48 5.48a.492.492 0 0 0 0 .707.499.499 0 0 0 .352.154.51.51 0 0 0 .356-.154l5.833-5.827a1.755 1.755 0 0 0 0-2.481Z" />
            </svg>
          </button>
        </Show>
        {/* Viewers keep the / shortcut (viewer-safe commands + /teamsay) but not
            @ — file mentions only feed Synthase turns. */}
        <Show when={ctx.props.canEdit !== false}>
          <button
            /* mol-bespoke-button: glyph-only composer affordance — shares the composer row's 24px / 40x32-coarse icon box model */
            type="button"
            onClick={() => ctx.renderHandlers.insertMentionAtCaret()}
            title={ctx.env.t('ide.chat.mention', undefined, { defaultValue: 'Reference a file' })}
            style={styleOf({
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              width: ctx.env.isCoarse() ? '40px' : '24px',
              height: ctx.env.isCoarse() ? '32px' : '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: '0.4',
              padding: '0px',
              'border-radius': '3px',
              'font-family': 'inherit',
              'font-size': '15px',
              'line-height': '1',
              transition: 'opacity 100ms',
            })}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = '0.4'
            }}
          >
            <span style={styleOf({ position: 'relative', top: '0px' })}>@</span>
          </button>
        </Show>
        <button
          /* mol-bespoke-button: glyph-only composer affordance — shares the composer row's 24px / 40x32-coarse icon box model */
          type="button"
          onClick={() => ctx.renderHandlers.toggleSlashMenu()}
          title={ctx.env.t('ide.chat.slashCommands', undefined, {
            defaultValue: 'Slash commands',
          })}
          style={styleOf({
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            width: ctx.env.isCoarse() ? '40px' : '24px',
            height: ctx.env.isCoarse() ? '32px' : '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: '0.4',
            padding: '0px',
            'border-radius': '3px',
            'font-family': 'inherit',
            'font-size': '15px',
            'line-height': '1',
            transition: 'opacity 100ms',
          })}
          onMouseEnter={(event) => {
            event.currentTarget.style.opacity = '0.85'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.opacity = '0.4'
          }}
        >
          <svg
            width="9"
            height="13"
            viewBox="0 0 9 13"
            style={styleOf({ display: 'block', position: 'relative', top: '1px' })}
          >
            <line
              x1="8"
              y1="1"
              x2="1"
              y2="12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <Show when={ctx.props.canEdit !== false && ctx.contextUsage.contextUsage()}>
          {(usage) => (
            <ContextUsageIndicator
              usage={usage()}
              history={ctx.contextUsage.contextHistory()}
              compactions={ctx.contextUsage.contextCompactions()}
              projectId={ctx.props.projectId}
              conversationId={ctx.env.conversationId()}
              onOpenSettings={() => ctx.overlay.openPanelOverlay('settings')}
            />
          )}
        </Show>
        <div
          style={styleOf({
            // 'auto' pins the stop/send cluster right; the context ring (hidden
            // for viewers even when contextUsage exists) otherwise carries the
            // auto margin and this becomes a 4px gap.
            'margin-left':
              ctx.props.canEdit !== false && ctx.contextUsage.contextUsage() ? '4px' : 'auto',
            display: 'flex',
            gap: '4px',
            'align-items': 'center',
          })}
        >
          {/* Shown whenever ANY backend turn streams for this conversation — a
              local send (isLoading) OR a remote one this client doesn't own
              (isRemoteStreaming: another tab / teammate / server continuation),
              so a running turn can ALWAYS be stopped. */}
          <Show
            when={
              ctx.props.canEdit !== false && (ctx.chat.isLoading() || ctx.chat.isRemoteStreaming())
            }
          >
            <button
              type="button"
              data-mol-id="chat-stop-button"
              onClick={() => ctx.chat.handleAbort()}
              title={ctx.env.t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
              aria-label={ctx.env.t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
              // The composer's two action buttons (Stop, Send) are design-system
              // buttons in the ERROR and PRIMARY semantics — same radius, height
              // and states as every other action button in the panel. They were a
              // matched pair of hand-rolled 6px-radius frames with hardcoded
              // rgba(248,81,73,*) / rgba(96,160,240,*) and hand-written hover.
              class={ctx.env.cm.button({ variant: 'solid', color: 'error', size: 'xs' })}
              style={styleOf({
                // The composer's documented touch box: wide for hit spacing but
                // deliberately flat (40×32) so the row doesn't balloon. This is
                // the one thing the ClassMap can't express here, and the reason
                // this is NOT cm.touchTargetCompact — a 36px floor would out-grow
                // the neighbouring icon buttons.
                ...(ctx.env.isCoarse() ? { 'min-width': '40px', 'min-height': '32px' } : {}),
              })}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" style={styleOf({ display: 'block' })}>
                <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          </Show>
          <button
            type="button"
            data-mol-id="chat-send-button"
            onClick={() => void ctx.submit.handleSubmit()}
            title={ctx.env.t('ide.chat.send', undefined, { defaultValue: 'Send' })}
            aria-label={ctx.env.t('ide.chat.send', undefined, { defaultValue: 'Send' })}
            disabled={!ctx.composer.hasInput() && ctx.popups.attachedFiles().length === 0}
            // Stop's twin in the PRIMARY semantic. The real `disabled` attribute
            // above carries the muted/inert look via the CVA
            // (`disabled:opacity-50 disabled:pointer-events-none`), so the
            // hand-rolled cursor/opacity pair is gone with the rest.
            class={ctx.env.cm.button({ variant: 'solid', color: 'primary', size: 'xs' })}
            style={styleOf({
              // See the Stop button: the composer's documented flat 40×32 touch
              // box, which the ClassMap can't express.
              ...(ctx.env.isCoarse() ? { 'min-width': '40px', 'min-height': '32px' } : {}),
            })}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" style={styleOf({ display: 'block' })}>
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
        </div>
      </div>
    </div>
  )
}

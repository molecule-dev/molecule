/**
 * The input container — React's render section "Input container — matches user
 * message card style": the textarea, the glyph buttons and the hint row with
 * the context ring and send / stop control.
 *
 * The composer itself is uncontrolled: the textarea's live text is the
 * composer slice's `inputRef`, its `defaultValue` only seeds the element, and
 * every style below is written as an explicit `px` string because Vue, unlike
 * React, never adds a unit. The buttons reproduce React's own imperative
 * hover affordances (they write the element's `style.opacity`), so the markup
 * and the DOM after a pointer move are both React's.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'

import { ContextUsageIndicator } from '../../parts/ContextUsageIndicator.js'
import type { ChatCtx } from './context.js'

const logger = getLogger('chat-panel')

/**
 * Renders the input container.
 *
 * @param ctx - The panel context.
 * @returns The composer container with its textarea and hint row.
 */
export function renderChatInputContainer(ctx: ChatCtx): VNodeChild {
  const { props, env } = ctx
  const cm = env.cm
  const t = env.t
  const canEdit = props.canEdit
  const isLight = env.isLight.value
  const isNarrow = env.isNarrow.value
  const isCoarse = env.isCoarse.value
  const transcriptOnly = env.transcriptOnly.value
  const conversationId = env.conversationId.value
  const projectId = props.projectId
  const contextUsage = ctx.contextUsage.contextUsage.value
  const contextHistory = ctx.contextUsage.contextHistory.value
  const contextCompactions = ctx.contextUsage.contextCompactions.value
  const attachedFiles = ctx.popups.attachedFiles.value
  const workVisible = ctx.timeline.workVisible.value
  const mode = ctx.chat.mode.value
  const fastMode = ctx.chat.fastMode.value
  const fastModeAvailable = ctx.pickers.fastModeAvailable.value
  const isListening = ctx.voice.isListening.value
  const isLoading = ctx.chat.isLoading.value
  const isRemoteStreaming = ctx.chat.isRemoteStreaming.value
  const hasInput = ctx.composer.hasInput.value

  /** The two glyph buttons of the hint row: `@` (file mention) and `/` (commands). */
  const glyphButtons = [
    {
      sym: '@',
      nudgeY: 0,
      size: 15,
      title: t('ide.chat.mention', undefined, { defaultValue: 'Reference a file' }),
      onClick: ctx.renderHandlers.insertMentionAtCaret,
    },
    {
      sym: 'slash',
      nudgeY: 1,
      size: 15,
      title: t('ide.chat.slashCommands', undefined, { defaultValue: 'Slash commands' }),
      onClick: ctx.renderHandlers.toggleSlashMenu,
    },
  ] as const

  return h(
    'div',
    {
      className: cm.surfaceSecondary,
      hidden: transcriptOnly,
      'data-mol-id': 'chat-composer',
      // The container only moves focus to the textarea it holds; it is not a
      // control, and a keyboard user reaches that textarea with Tab.
      role: 'presentation',
      ...(canEdit === false ? { 'data-mol-viewer': '' } : {}),
      style: {
        // Round the TOP corners only (8px) so the composer reads as a self-contained
        // input with its own border on all sides, flush at the bottom-left/right with
        // the panel's bottom edge. Discovery rounds ALL FOUR corners (the centered
        // card is rounded on every side). The composer's gradient-ring `::before`
        // follows this via `border-radius: inherit`.
        borderRadius: props.discovery ? '8px' : '8px 8px 0 0',
        padding: '8px 10px',
        cursor: 'text',
        // With the work tray open above, the composer is drawn OVER the tray's
        // lower edge (the tray tucks 8px under it).
        ...(workVisible ? { position: 'relative', zIndex: 1 } : {}),
        // View-only mode: the composer IS the team-chat box, so it wears the
        // team-message gold border (and the box is pre-filled with /teamsay).
        ...(canEdit === false ? { border: `1px solid ${NOTICE_TONE.gold.accent}` } : {}),
      },
      onClick: (event: MouseEvent) => {
        if (!(event.target as HTMLElement).closest('button'))
          ctx.composer.textareaRef.current?.focus()
      },
    },
    [
      h('textarea', {
        ref: (element: unknown) => {
          ctx.composer.textareaRef.current = (element as HTMLTextAreaElement | null) ?? null
        },
        'data-mol-chat-input': '',
        'aria-label': t('ide.chat.inputLabel', undefined, { defaultValue: 'Write a message' }),
        // The draft seeds the ELEMENT's value, not its child text (React's
        // `defaultValue` on mount does the same): the composer slice's mount
        // effect writes `textarea.value`, so the seed never becomes part of the
        // text content a reader or a `textContent` query sees.
        autoComplete: 'off',
        onInput: ctx.input.handleInputChange,
        // React's onChange fires for the native `change` too (a blur whose value
        // it has not seen); the slice's tracker keeps that from repeating work.
        onChange: ctx.input.handleInputChange,
        onPaste: ctx.attachments.handlePaste,
        placeholder:
          canEdit === false
            ? t('ide.chat.placeholderViewer', undefined, { defaultValue: 'Message your team' })
            : t('ide.chat.placeholder', undefined, { defaultValue: 'Send a message...' }),
        rows: 1,
        className: cm.textSize('sm'),
        style: {
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
          fontFamily: 'inherit',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          boxSizing: 'border-box',
          // Deliberate iOS-zoom guard, overriding cm.textSize('sm') (~14px): iOS
          // Safari zooms the whole page when a focused input's font is below
          // 16px, so phone-width / touch-first viewports must render at 16px.
          // Fine-pointer desktop keeps the compact 14px class untouched.
          ...(isNarrow || isCoarse ? { fontSize: '16px' } : {}),
        },
      }),
      // Hint row: shortcuts · context ring · send
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: '6px',
            gap: '4px',
          },
        },
        [
          // Plan/Execute mode toggle — hidden for viewers: the mode drives
          // Synthase, which a viewer can't run.
          // mol-bespoke-button: icon-only composer toggle — shares the composer
          // row's 24px / 40x32-coarse icon box model.
          canEdit !== false
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    const currentMode = ctx.chat.mode.value
                    const newMode = currentMode === 'plan' ? 'execute' : 'plan'
                    ctx.chat.setMode(newMode)
                    ctx.env.http
                      .patch(`/projects/${projectId}/chat-mode`, {
                        mode: newMode,
                        conversationId,
                      })
                      .catch((error) => {
                        logger.warn('chat-panel: persisting chat-mode toggle failed; reverted', {
                          error,
                        })
                        ctx.chat.setMode(currentMode)
                      })
                    ctx.systemCards.addSystemCard(
                      newMode === 'plan'
                        ? t('ide.chat.switchedToPlan', undefined, {
                            defaultValue: 'Switched to plan mode',
                          })
                        : t('ide.chat.switchedToExecute', undefined, {
                            defaultValue: 'Switched to execute mode',
                          }),
                    )
                  },
                  title:
                    mode === 'plan'
                      ? t('ide.chat.switchToExecute', undefined, {
                          defaultValue: 'Switch to execute mode',
                        })
                      : t('ide.chat.switchToPlan', undefined, {
                          defaultValue: 'Switch to plan mode',
                        }),
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Touch-first: grow the hit area to 40×40 (glyph size unchanged);
                    // fine pointers keep the compact 24px box.
                    width: isCoarse ? '40px' : '24px',
                    height: isCoarse ? '32px' : '24px',
                    background:
                      mode === 'plan'
                        ? isLight
                          ? 'rgba(217,119,6,0.14)'
                          : 'rgba(234,179,8,0.13)'
                        : 'none',
                    border:
                      mode === 'plan'
                        ? `1px solid ${isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
                        : 'none',
                    borderRadius: '3px',
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    color: mode === 'plan' ? (isLight ? '#d97706' : '#eab308') : 'inherit',
                    opacity: !canEdit ? 0.4 : mode === 'plan' ? 1 : 0.4,
                    padding: '0px',
                    transition: 'opacity 100ms, color 100ms',
                  },
                  onMouseenter: (event: MouseEvent) => {
                    if (mode !== 'plan') {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.opacity = '0.85'
                    }
                  },
                  onMouseleave: (event: MouseEvent) => {
                    if (mode !== 'plan') {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.opacity = '0.4'
                    }
                  },
                },
                [
                  // Lightbulb icon (Primer Octicons) for plan mode
                  h(
                    'svg',
                    { width: '14', height: '14', viewBox: '0 0 16 16', fill: 'currentColor' },
                    [
                      h('path', {
                        d: 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z',
                      }),
                    ],
                  ),
                ],
              )
            : null,

          // Fast mode (⚡) toggle — rendered only when the current mode's model
          // supports the provider's fast/priority speed tier. Persisted
          // per-CONVERSATION (aiContext.fastMode): switching speed invalidates
          // the provider prompt cache, so it's a conversation-level choice,
          // not a per-message one.
          fastModeAvailable && canEdit !== false
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'chat-fast-mode-toggle',
                  disabled: !canEdit,
                  onClick: () => {
                    const currentFastMode = ctx.chat.fastMode.value
                    const next = !currentFastMode
                    ctx.chat.setFastMode(next)
                    ctx.env.http
                      .patch(`/projects/${projectId}/chat-mode`, {
                        fastMode: next,
                        conversationId,
                      })
                      .catch((error) => {
                        logger.warn('chat-panel: persisting fast-mode toggle failed; reverted', {
                          error,
                        })
                        ctx.chat.setFastMode(currentFastMode)
                      })
                    ctx.systemCards.addSystemCard(
                      next
                        ? t('ide.chat.fastModeOn', undefined, {
                            defaultValue: 'Fast mode on — faster responses at a higher rate',
                          })
                        : t('ide.chat.fastModeOff', undefined, {
                            defaultValue: 'Fast mode off',
                          }),
                    )
                  },
                  title: fastMode
                    ? t('ide.chat.fastModeDisable', undefined, {
                        defaultValue: 'Turn off fast mode',
                      })
                    : t('ide.chat.fastModeEnable', undefined, {
                        defaultValue: 'Fast mode — up to 2.5× faster output at a higher token rate',
                      }),
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isCoarse ? '40px' : '24px',
                    height: isCoarse ? '32px' : '24px',
                    background: fastMode
                      ? isLight
                        ? 'rgba(217,119,6,0.14)'
                        : 'rgba(234,179,8,0.13)'
                      : 'none',
                    border: fastMode
                      ? `1px solid ${isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
                      : 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    color: fastMode ? (isLight ? '#d97706' : '#eab308') : 'inherit',
                    opacity: fastMode ? 1 : 0.4,
                    padding: '0px',
                    transition: 'opacity 100ms, color 100ms',
                  },
                  onMouseenter: (event: MouseEvent) => {
                    if (!fastMode) {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.opacity = '0.85'
                    }
                  },
                  onMouseleave: (event: MouseEvent) => {
                    if (!fastMode) {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.opacity = '0.4'
                    }
                  },
                },
                [
                  // Zap icon (Primer Octicons) for fast mode
                  h(
                    'svg',
                    { width: '14', height: '14', viewBox: '0 0 16 16', fill: 'currentColor' },
                    [
                      h('path', {
                        d: 'M9.504.43a.75.75 0 0 1 .584.859l-.828 4.211h4.49a.75.75 0 0 1 .573 1.234l-7.25 8.5a.75.75 0 0 1-1.32-.658l.828-4.211H2.09a.75.75 0 0 1-.573-1.234l7.25-8.5a.75.75 0 0 1 .737-.201Z',
                      }),
                    ],
                  ),
                ],
              )
            : null,

          // Voice input button — ALWAYS rendered. When dictation can't work
          // here, clicking shows the reason (voiceError) or opens the /mic
          // picker with unusable engines disabled — it never just vanishes.
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-mic-button',
              onClick: ctx.voice.toggleVoice,
              title: isListening
                ? t('ide.chat.voiceStop', undefined, { defaultValue: 'Stop dictation' })
                : t('ide.chat.voice', undefined, { defaultValue: 'Dictate' }),
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isCoarse ? '40px' : '24px',
                height: isCoarse ? '32px' : '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isListening ? 'rgb(239,68,68)' : 'inherit',
                opacity: isListening ? 1 : 0.4,
                padding: '0px',
                borderRadius: '3px',
                transition: 'opacity 100ms, color 100ms',
              },
              onMouseenter: (event: MouseEvent) => {
                if (!isListening) {
                  const el = event.currentTarget as HTMLElement | null
                  if (el) el.style.opacity = '0.85'
                }
              },
              onMouseleave: (event: MouseEvent) => {
                if (!isListening) {
                  const el = event.currentTarget as HTMLElement | null
                  if (el) el.style.opacity = '0.4'
                }
              },
            },
            [
              h(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  viewBox: '0 0 16 16',
                  width: '16',
                  height: '16',
                  style: { display: 'block' },
                },
                [
                  h('rect', {
                    x: '6',
                    y: '1',
                    width: '4',
                    height: '8',
                    rx: '2',
                    fill: isListening ? 'currentColor' : 'none',
                    stroke: 'currentColor',
                    'stroke-width': '1.25',
                  }),
                  h('path', {
                    d: 'M4 7v1a4 4 0 008 0V7',
                    fill: 'none',
                    stroke: 'currentColor',
                    'stroke-width': '1.25',
                    'stroke-linecap': 'round',
                  }),
                  h('line', {
                    x1: '8',
                    y1: '12',
                    x2: '8',
                    y2: '15',
                    stroke: 'currentColor',
                    'stroke-width': '1.25',
                    'stroke-linecap': 'round',
                  }),
                  h('line', {
                    x1: '6',
                    y1: '15',
                    x2: '10',
                    y2: '15',
                    stroke: 'currentColor',
                    'stroke-width': '1.25',
                    'stroke-linecap': 'round',
                  }),
                ],
              ),
            ],
          ),

          // Attachment button — hidden for viewers: attachments feed Synthase turns.
          canEdit !== false
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: () => ctx.attachments.fileInputRef.current?.click(),
                  title: t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' }),
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isCoarse ? '40px' : '24px',
                    height: isCoarse ? '32px' : '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.4,
                    padding: '0px',
                    borderRadius: '3px',
                    transition: 'opacity 100ms',
                  },
                  onMouseenter: (event: MouseEvent) => {
                    const el = event.currentTarget as HTMLElement | null
                    if (el) el.style.opacity = '0.85'
                  },
                  onMouseleave: (event: MouseEvent) => {
                    const el = event.currentTarget as HTMLElement | null
                    if (el) el.style.opacity = '0.4'
                  },
                },
                [
                  // Paperclip icon (Primer Octicons)
                  h(
                    'svg',
                    {
                      width: '15',
                      height: '15',
                      viewBox: '0 0 16 16',
                      fill: 'currentColor',
                      style: { display: 'block' },
                    },
                    [
                      h('path', {
                        d: 'M12.212 3.02a1.753 1.753 0 0 0-2.478.003l-5.83 5.83a3.007 3.007 0 0 0-.88 2.127c0 .795.315 1.551.88 2.116.567.567 1.333.89 2.126.89.79 0 1.548-.321 2.116-.89l5.48-5.48a.75.75 0 0 1 1.061 1.06l-5.48 5.48a4.492 4.492 0 0 1-3.177 1.33c-1.2 0-2.345-.487-3.187-1.33a4.483 4.483 0 0 1-1.32-3.177c0-1.195.475-2.341 1.32-3.186l5.83-5.83a3.25 3.25 0 0 1 5.553 2.297c0 .863-.343 1.691-.953 2.301L7.439 12.39c-.375.377-.884.59-1.416.593a1.998 1.998 0 0 1-1.412-.593 1.992 1.992 0 0 1 0-2.828l5.48-5.48a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-5.48 5.48a.492.492 0 0 0 0 .707.499.499 0 0 0 .352.154.51.51 0 0 0 .356-.154l5.833-5.827a1.755 1.755 0 0 0 0-2.481Z',
                      }),
                    ],
                  ),
                ],
              )
            : null,

          // Viewers keep the / shortcut (viewer-safe commands + /teamsay) but not
          // @ — file mentions only feed Synthase turns.
          ...glyphButtons
            .filter(({ sym }) => canEdit !== false || sym !== '@')
            .map(({ sym, nudgeY, size: fontSize, title, onClick }) =>
              h(
                'button',
                {
                  // mol-bespoke-button: glyph-only composer affordance — shares
                  // the composer row's 24px / 40x32-coarse icon box model.
                  key: sym,
                  type: 'button',
                  onClick,
                  title,
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isCoarse ? '40px' : '24px',
                    height: isCoarse ? '32px' : '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.4,
                    padding: '0px',
                    borderRadius: '3px',
                    fontFamily: 'inherit',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1,
                    transition: 'opacity 100ms',
                  },
                  onMouseenter: (event: MouseEvent) => {
                    const el = event.currentTarget as HTMLElement | null
                    if (el) el.style.opacity = '0.85'
                  },
                  onMouseleave: (event: MouseEvent) => {
                    const el = event.currentTarget as HTMLElement | null
                    if (el) el.style.opacity = '0.4'
                  },
                },
                [
                  sym === 'slash'
                    ? h(
                        'svg',
                        {
                          width: '9',
                          height: '13',
                          viewBox: '0 0 9 13',
                          style: { display: 'block', position: 'relative', top: `${nudgeY}px` },
                        },
                        [
                          h('line', {
                            x1: '8',
                            y1: '1',
                            x2: '1',
                            y2: '12',
                            stroke: 'currentColor',
                            'stroke-width': '1.5',
                            'stroke-linecap': 'round',
                          }),
                        ],
                      )
                    : h('span', { style: { position: 'relative', top: `${nudgeY}px` } }, [sym]),
                ],
              ),
            ),

          canEdit !== false && contextUsage
            ? h(ContextUsageIndicator, {
                usage: contextUsage,
                history: contextHistory,
                compactions: contextCompactions,
                projectId,
                conversationId,
                onOpenSettings: () => ctx.overlay.openPanelOverlay('settings'),
              })
            : null,

          h(
            'div',
            {
              style: {
                // 'auto' pins the stop/send cluster right; the context ring
                // (hidden for viewers even when contextUsage exists) otherwise
                // carries the auto margin and this becomes a 4px gap.
                marginLeft: canEdit !== false && contextUsage ? '4px' : 'auto',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              },
            },
            [
              // Shown whenever ANY backend turn streams for this conversation —
              // a local send (isLoading) OR a remote one this client doesn't own
              // (isRemoteStreaming: another tab / teammate / server continuation),
              // so a running turn can ALWAYS be stopped.
              canEdit !== false && (isLoading || isRemoteStreaming)
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'chat-stop-button',
                      onClick: ctx.chat.handleAbort,
                      title: t('ide.chat.stop', undefined, { defaultValue: 'Stop' }),
                      'aria-label': t('ide.chat.stop', undefined, { defaultValue: 'Stop' }),
                      // The composer's two action buttons (Stop, Send) are
                      // design-system buttons in the ERROR and PRIMARY semantics
                      // — same radius, height and states as every other action
                      // button in the panel.
                      className: cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
                      style: {
                        // The composer's documented touch box: wide for hit
                        // spacing but deliberately flat (40×32) so the row
                        // doesn't balloon. This is the one thing the ClassMap
                        // can't express here, and the reason this is NOT
                        // cm.touchTargetCompact — a 36px floor would out-grow
                        // the neighbouring icon buttons.
                        ...(isCoarse ? { minWidth: '40px', minHeight: '32px' } : {}),
                      },
                    },
                    [
                      h(
                        'svg',
                        {
                          width: '12',
                          height: '12',
                          viewBox: '0 0 12 12',
                          style: { display: 'block' },
                        },
                        [
                          h('rect', {
                            x: '2',
                            y: '2',
                            width: '8',
                            height: '8',
                            rx: '1.5',
                            fill: 'currentColor',
                          }),
                        ],
                      ),
                    ],
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'chat-send-button',
                  onClick: () => {
                    void ctx.submit.handleSubmit()
                  },
                  title: t('ide.chat.send', undefined, { defaultValue: 'Send' }),
                  'aria-label': t('ide.chat.send', undefined, { defaultValue: 'Send' }),
                  disabled: !hasInput && attachedFiles.length === 0,
                  // Stop's twin in the PRIMARY semantic. The real `disabled`
                  // attribute above carries the muted/inert look via the CVA
                  // (`disabled:opacity-50 disabled:pointer-events-none`), so the
                  // hand-rolled cursor/opacity pair is gone with the rest.
                  className: cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  style: {
                    // See the Stop button: the composer's documented flat 40×32
                    // touch box, which the ClassMap can't express.
                    ...(isCoarse ? { minWidth: '40px', minHeight: '32px' } : {}),
                  },
                },
                [
                  h(
                    'svg',
                    {
                      width: '12',
                      height: '12',
                      viewBox: '0 0 12 12',
                      style: { display: 'block' },
                    },
                    [
                      h('path', {
                        d: 'M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10',
                        fill: 'none',
                        stroke: 'currentColor',
                        'stroke-width': '1.75',
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                      }),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

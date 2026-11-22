/**
 * The per-item timeline dispatch — React's render section "Every item renders
 * inside its own boundary": each timeline item kind to its row or card, every
 * one wrapped in a `ChatItemBoundary` so one malformed model-authored payload
 * costs one inline notice and every sibling keeps working.
 *
 * The same section also renders the live error banner that sits between the
 * transcript and the persistent activity slot: the resource-limit upgrade
 * banner (the host's CTA, built from the backend's `limitType`,
 * `billingAction` and `upgradeTier`), the calm gold view-only notice for a
 * read-only viewer's access denial, or the plain error line.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatMessage } from '@molecule/app-ai-chat'
import {
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import type { ChatTimelineItem, SystemCard } from '@molecule/app-ide-panel-logic/panels'
import { tipText, upgradeContextFromError } from '@molecule/app-ide-panel-logic/panels'
import { DEFAULT_AGENT_NAME } from '@molecule/app-vue'

import { ChatItemBoundary } from '../../parts/ChatItemBoundary.js'
import { CommitCardItem } from '../../parts/CommitCardItem.js'
import { HelpCard } from '../../parts/HelpCard.js'
import { MessageItem } from '../../parts/MessageItem.js'
import { NoticeCard, renderCardSegment, ResourceLimitBanner } from '../../parts/NoticeCard.js'
import { TipCard } from '../../parts/TipCard.js'
import { ActivityCard } from '../ActivityCard.js'
import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'

/**
 * Renders one system card: the `/help` guide, the clickable loaded-skills
 * notice, the tone-accented notice, or the plain muted inline line.
 *
 * @param ctx - The panel context (the ClassMap, translation and host builders).
 * @param card - The system card to render.
 * @returns The rendered card, or `null` for an unrecognized variant.
 */
function renderSystemCard(ctx: ChatCtx, card: SystemCard): VNodeChild {
  if (card.variant === 'help') {
    // The plan/upgrade blurb is app-specific (pricing, plan names), so the host
    // supplies it via buildHelpUpgradeSection — this shared package hardcodes
    // none. Read at render time (like the settings card's list).
    const upgradeSection = ctx.props.buildHelpUpgradeSection?.()
    return h(HelpCard, {
      key: card.id,
      isLight: ctx.env.isLight.value,
      agentName: ctx.props.agentName,
      productName: ctx.props.productName,
      upgradeLines: upgradeSection?.lines,
      upgradeAction: upgradeSection?.action ?? undefined,
    })
  }
  if (card.variant === 'skillsLoaded') {
    // "🧠 Loaded {{count}} skills" — styled like the plain phase notice, but
    // CLICKABLE: its onClick opens the `/skills` browser overlay, exactly what
    // typing /skills does, since the card is rebuilt from the recorded event.
    const cm = ctx.env.cm
    return h(
      'div',
      { key: card.id, style: { textAlign: 'center', marginBottom: `${TIMELINE_ITEM_GAP}px` } },
      [
        h(
          'button',
          {
            // mol-bespoke-button: skills-loaded notice — deliberately a plain
            // centered phase message that happens to be clickable; a button
            // frame would make it shout.
            type: 'button',
            'data-mol-id': 'chat-skills-loaded',
            onClick: () => ctx.overlay.openPanelOverlay('skills'),
            class: cm.cn(cm.textSize('xs'), cm.textMuted),
            style: {
              // Plain text like the build-phase notice — no border/fill/pill.
              background: 'none',
              border: 'none',
              margin: '0',
              padding: '6px 0',
              fontFamily: 'inherit',
              cursor: 'pointer',
            },
            // Underline on hover is the only clickability hint.
            onMouseenter: (event: MouseEvent) => {
              const el = event.currentTarget
              if (el instanceof HTMLElement) el.style.textDecoration = 'underline'
            },
            onMouseleave: (event: MouseEvent) => {
              const el = event.currentTarget
              if (el instanceof HTMLElement) el.style.textDecoration = 'none'
            },
          },
          card.text,
        ),
      ],
    )
  }
  // Every rich variant is handled above; what remains is the plain notice / tip
  // card (no variant). Render nothing for any future unhandled variant rather
  // than mis-rendering it as a plain card.
  if (card.variant !== undefined) return null

  const cm = ctx.env.cm
  // Only the ACCENT COLOUR + ICON change, by `tone`. Picking a tone (or
  // `emphasized`, or merely having an action) opts a card in; a card with none
  // of those stays a plain muted inline line.
  const tipTone: 'info' | 'gold' | 'upgrade' | 'success' | 'signup' | null =
    card.tone ?? (card.emphasized || card.action ? 'info' : null)

  if (tipTone) {
    // ONE shared treatment for every tone-accented notice — see NoticeCard.
    return h(NoticeCard, {
      key: card.id,
      tone: tipTone,
      text: card.text,
      content: card.content,
      action: card.action,
      icon: card.icon,
    })
  }

  // Plain muted inline notice (no tone / not emphasized / no action) — e.g. a
  // "Now using <model>" line. Centered for one-liners; left-aligned mono for
  // multi-line.
  const isMultiLine = card.text.includes('\n')
  return h(
    'div',
    {
      key: card.id,
      class: cm.cn(cm.textSize('xs'), cm.textMuted),
      style: {
        textAlign: isMultiLine ? 'left' : 'center',
        padding: isMultiLine ? '8px 12px' : '6px 0',
        marginBottom: `${TIMELINE_ITEM_GAP}px`,
        whiteSpace: isMultiLine ? 'pre-wrap' : undefined,
        fontFamily: isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
        lineHeight: isMultiLine ? '1.5' : undefined,
      },
    },
    card.content
      ? card.content.map((segment, index) => renderCardSegment(segment, index))
      : card.text,
  )
}

/**
 * Renders one chat message: a persisted commit record as a commit card, or the
 * message row itself.
 *
 * @param ctx - The panel context (the session, the editor and the model state).
 * @param msg - The message to render.
 * @returns The rendered message.
 */
function renderMessage(ctx: ChatCtx, msg: ChatMessage): VNodeChild {
  // Persisted commit records render as commit cards.
  if (msg.commitRecord) {
    const recordFiles: readonly (string | { path: string })[] = msg.commitRecord.files
    const files = recordFiles.map((file) => (typeof file === 'string' ? file : file.path))
    const hash = msg.commitRecord.hash
    return h(CommitCardItem, {
      key: msg.id,
      card: {
        id: msg.id,
        message: msg.commitRecord.message,
        files,
        timestamp: msg.timestamp,
        status: 'done',
        hash,
      },
      onRevert: ctx.props.canEdit === false ? undefined : ctx.git.handleRevertCommit,
    })
  }

  return h(MessageItem, {
    key: msg.id,
    msg,
    sendMessage: ctx.chat.sendMessage,
    handleAskUserResponse: ctx.chat.handleAskUserResponse,
    isLoading: ctx.chat.isLoading.value,
    streamingStatus: ctx.chat.streamingStatus.value,
    onNavigatePreview: ctx.props.onNavigatePreview,
    undoneTcIds: ctx.undo.undoneTcIds.value,
    handleUndoToggle: ctx.undo.handleUndoToggle,
    onFileOpen: ctx.props.onFileOpen,
    onFileDoubleClick: ctx.props.onFileDoubleClick,
    onFileDiff: ctx.props.onFileDiff,
    handleFileRevert: ctx.git.handleFileRevert,
    setInputAndCursorEnd: ctx.input.setInputAndCursorEnd,
    setModelPicker: ctx.composer.setModelPicker,
    chatMode: ctx.chat.liveModelMode.value,
    userAvatar: ctx.props.userAvatar,
    // Avatar/name clicks open the clicked AUTHOR's profile — MessageItem builds
    // the identity from the message's own author (teammates included).
    onProfileClick: ctx.props.onProfileClick,
    currentUserId: ctx.props.currentUserId,
    showTimestamp: ctx.timeline.shownTimestampIds.value.has(msg.id),
    discovery: ctx.props.discovery,
    buildUpgradeCta: ctx.props.buildUpgradeCta,
    agentName: ctx.props.agentName,
    canEdit: ctx.props.canEdit,
    onSkipToolCall: ctx.props.skipToolCall ? ctx.tests.handleSkipToolCall : undefined,
    skipToolCallReason:
      ctx.props.canEdit === false
        ? ctx.env.t('ide.chat.skipToolCallViewer', undefined, {
            defaultValue: 'Only editors can skip this.',
          })
        : null,
  })
}

/**
 * Renders one timeline item's body: its kind's row or card.
 *
 * @param ctx - The panel context.
 * @param item - The timeline item to render.
 * @returns The rendered item.
 */
function renderTimelineItemBody(ctx: ChatCtx, item: ChatTimelineItem): VNodeChild {
  if (item.kind === 'commit') {
    return h(CommitCardItem, {
      key: item.card.id,
      card: item.card,
      onRevert: ctx.props.canEdit === false ? undefined : ctx.git.handleRevertCommit,
    })
  }

  if (item.kind === 'activity') {
    return h(ActivityCard, {
      key: item.card.id,
      activity: item.card.activity,
      onActivityClick: ctx.props.onActivityClick,
    })
  }

  if (item.kind === 'tip') {
    // Translated HERE, not when the tip was queued: a locale switch re-renders
    // this row and re-translates it, and the `/` and `@` code segments render
    // from the translated sentence (TipCard splits the string on them), so a
    // translation can move them.
    return h(TipCard, {
      key: item.card.id,
      text: tipText(ctx.env.t, item.card.tip, {
        agentName: ctx.props.agentName ?? DEFAULT_AGENT_NAME,
      }),
      accent: item.card.accent,
      icon: item.card.icon,
      onDismiss: () => ctx.tips.dismissTip(item.card.id),
    })
  }

  if (item.kind === 'system') return renderSystemCard(ctx, item.card)

  return renderMessage(ctx, item.msg)
}

/**
 * The live error banner between the transcript and the activity slot: the
 * resource-limit upgrade banner, the viewer's gold view-only notice, or the
 * plain error line. Renders nothing without a live, non-stale error.
 *
 * @param ctx - The panel context (the session error, its metadata and the host CTA builder).
 * @returns The banner, or `null`.
 */
function renderTimelineErrorBanner(ctx: ChatCtx): VNodeChild {
  const error = ctx.chat.error.value
  if (!error || ctx.timeline.staleAnonymousLimit.value) return null
  const errorMeta = ctx.chat.errorMeta.value
  const cm = ctx.env.cm
  if (errorMeta?.limitType) {
    // The CTA routes/copy are the host's — ask buildUpgradeCta for the FULL
    // upgrade/sign-in button set. Hand it everything the backend said about the
    // refusal: `limitType`, `billingAction` and `upgradeTier`.
    return h(ResourceLimitBanner, {
      key: 'chat-error-banner',
      message: error,
      action: ctx.props.buildUpgradeCta?.(upgradeContextFromError(errorMeta)),
    })
  }
  if (ctx.timeline.isViewerAccessDenied.value) {
    // A viewer's denial is expected state, not an alarm: a brief, calm, gold
    // view-only notice that clears itself — never the persistent red banner.
    if (!ctx.timeline.viewerDeniedFlash.value) return null
    const accent = NOTICE_TONE.gold.accent
    return h(
      'div',
      {
        key: 'chat-error-banner',
        'data-mol-id': 'chat-viewer-denied-notice',
        class: cm.cn(cm.textSize('xs'), cm.textMuted),
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '8px',
          ...chatCardStyle(accent),
          borderRadius: '8px',
          lineHeight: '1.5',
        },
      },
      [
        h(Icon, {
          name: 'people',
          size: CHAT_CARD_ICON_SIZE,
          'aria-hidden': 'true',
          style: { flexShrink: '0', marginTop: '1px', color: accent },
        }),
        h('span', { style: { flex: '1' } }, [
          ctx.env.t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          }),
        ]),
      ],
    )
  }
  return h(
    'div',
    {
      key: 'chat-error-banner',
      class: cm.cn(
        cm.textSize('sm'),
        cm.sp('p', 2),
        cm.sp('mb', 2),
        cm.bgErrorSubtle,
        cm.textError,
      ),
      style: { borderRadius: '6px' },
    },
    error,
  )
}

/**
 * Renders the timeline's visible items, each inside its own boundary, then the
 * live error banner.
 *
 * @param ctx - The panel context (the timeline page, the cards and the error).
 * @returns The item boundaries and the error banner, in React's order.
 */
export function renderChatTimelineItems(ctx: ChatCtx): VNodeChild {
  const items = ctx.timeline.renderedTimeline.value.map((item) =>
    h(ChatItemBoundary, {
      key: item.kind === 'message' ? item.msg.id : item.card.id,
      onError: ctx.props.onRenderError,
      // The body is invoked from the boundary's child, so a synchronous throw
      // in the item's own branching is contained too.
      render: () => ctx.timeline.withTimelineTimestamp(item, renderTimelineItemBody(ctx, item)),
    }),
  )
  return [...items, renderTimelineErrorBanner(ctx)]
}

/**
 * The per-item timeline dispatch — React's render section “Every item renders
 * inside its own boundary” (unit U4): each timeline item kind to its row or
 * card, every one wrapped in a `ChatItemBoundary` so one malformed
 * model-authored payload costs one inline notice and every sibling keeps
 * working.
 *
 * The same section renders the live error banner that sits between the
 * transcript and the persistent activity slot: the resource-limit upgrade
 * banner (the host's CTA, built from the backend's whole refusal), the calm
 * gold view-only notice for a read-only viewer's access denial, or the plain
 * error line.
 *
 * The items are mapped over their ids, never over the item objects: the
 * timeline is rebuilt on every transcript change, so an item wrapper is a new
 * object each time while its id is stable. Each row also keeps its previous
 * item while the payload behind that id is unchanged, so a streaming reply
 * re-renders only its own row.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, mapArray, Match, Show, Switch } from 'solid-js'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import {
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import type { ChatTimelineItem, SystemCard } from '@molecule/app-ide-panel-logic/panels'
import { tipText, upgradeContextFromError } from '@molecule/app-ide-panel-logic/panels'

import { ChatItemBoundary } from '../../parts/ChatItemBoundary.jsx'
import { CommitCardItem } from '../../parts/CommitCardItem.jsx'
import { HelpCard } from '../../parts/HelpCard.jsx'
import { MessageItem } from '../../parts/MessageItem.jsx'
import { NoticeCard, renderCardSegment, ResourceLimitBanner } from '../../parts/NoticeCard.jsx'
import { TipCard } from '../../parts/TipCard.jsx'
import { ActivityCard } from '../ActivityCard.jsx'
import { ChatTimestamp } from '../ChatTimestamp.jsx'
import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatTimelineItems}. */
export interface ChatTimelineItemsProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * The React key of one timeline item: a message's id, or the card's id.
 * @param item - The timeline item.
 * @returns Its stable id.
 */
function itemId(item: ChatTimelineItem): string {
  return item.kind === 'message' ? item.msg.id : item.card.id
}

/**
 * The payload behind an item's id — its message or its card — the value whose
 * identity says whether the row's content actually changed.
 * @param item - The timeline item.
 * @returns The message or card object.
 */
function itemPayload(item: ChatTimelineItem): object {
  return item.kind === 'message' ? item.msg : item.card
}

/**
 * The loaded-skills notice's button reset: plain text like the build-phase
 * notice — no border, fill or pill. Kept as a value (not an inline object
 * literal) so the framework writes every declaration through the CSSOM, which
 * normalises the shorthands (`none` → `medium`, `0` → `0px`, `6px 0` →
 * `6px 0px`) exactly as React's style object does.
 */
const SKILLS_BUTTON_STYLE: Record<string, string> = {
  background: 'none',
  border: 'none',
  margin: '0',
  padding: '6px 0',
  'font-family': 'inherit',
  cursor: 'pointer',
}

/**
 * The shared card chrome as an inline style, with the radius written as `px`
 * (the React style object this is ported from takes the unitless number).
 * @param accent - The card's accent colour.
 * @returns The chrome's inline style fields.
 */
function cardChrome(accent: string): Record<string, string> {
  const { padding, border, background } = chatCardStyle(accent)
  return { padding, 'border-radius': '8px', border, background }
}

/**
 * Renders one system card: the `/help` guide, the clickable loaded-skills
 * notice, the tone-accented notice, or the plain muted inline line.
 * @param ctx - The inner panel's shared state.
 * @param card - The card to render.
 * @returns The rendered card, or `null` for an unrecognized variant.
 */
function renderSystemCard(ctx: ChatInnerCtx, card: SystemCard): JSX.Element {
  if (card.variant === 'help') {
    // The plan/upgrade blurb is app-specific (pricing, plan names), so the host
    // supplies it via buildHelpUpgradeSection — this shared package hardcodes
    // none. Read at render time (like the settings card's list).
    const upgradeSection = ctx.props.buildHelpUpgradeSection?.()
    return (
      <HelpCard
        isLight={ctx.env.isLight()}
        agentName={ctx.props.agentName ?? DEFAULT_AGENT_NAME}
        productName={ctx.props.productName ?? DEFAULT_PRODUCT_NAME}
        upgradeLines={upgradeSection?.lines}
        upgradeAction={upgradeSection?.action ?? undefined}
      />
    )
  }
  if (card.variant === 'skillsLoaded') {
    // "🧠 Loaded {{count}} skills" — styled like the plain "🔨 Building your
    // app" phase notice (centered, muted, xs, emoji baked into the text), but
    // CLICKABLE: its onClick is created HERE at render time — opening the
    // /skills browser overlay, exactly what typing /skills does — since the
    // card is rebuilt from the recorded card event on every load.
    const cm = ctx.env.cm
    return (
      <div style={{ 'text-align': 'center', 'margin-bottom': `${TIMELINE_ITEM_GAP}px` }}>
        <button
          /* mol-bespoke-button: skills-loaded notice — deliberately a plain centered phase message that happens to be clickable; a button frame would make it shout */
          type="button"
          data-mol-id="chat-skills-loaded"
          onClick={() => ctx.overlay.openPanelOverlay('skills')}
          class={cm.cn(cm.textSize('xs'), cm.textMuted)}
          style={SKILLS_BUTTON_STYLE}
          // Underline on hover is the only clickability hint (it otherwise reads
          // exactly like the plain phase message).
          onMouseEnter={(event: MouseEvent) => {
            const element = event.currentTarget as HTMLElement
            element.style.textDecoration = 'underline'
          }}
          onMouseLeave={(event: MouseEvent) => {
            const element = event.currentTarget as HTMLElement
            element.style.textDecoration = 'none'
          }}
        >
          {card.text}
        </button>
      </div>
    )
  }
  // Every rich variant is handled above; what remains is the plain notice / tip
  // card (no variant). Narrow to PlainSystemCard so the compiler knows
  // tone/content/emphasized exist here — and render nothing for any future
  // unhandled variant rather than mis-rendering it as a plain card.
  if (card.variant !== undefined) return null

  const cm = ctx.env.cm
  // Only the ACCENT COLOUR + ICON change, by `tone`. Picking a tone (or
  // `emphasized`, or merely having an action) opts a card in; a card with none
  // of those stays a plain muted inline line.
  const tipTone = card.tone ?? (card.emphasized || card.action ? 'info' : null)

  if (tipTone) {
    // ONE shared treatment for every tone-accented notice — see NoticeCard. The
    // resource-limit / upgrade banner renders through the same component, so
    // their icon + buttons stay in lockstep.
    return (
      <NoticeCard
        tone={tipTone}
        text={card.text}
        content={card.content}
        action={card.action}
        icon={card.icon}
      />
    )
  }

  // Plain muted inline notice (no tone / not emphasized / no action) — e.g. a
  // "Now using <model>" line. Centered for one-liners; left-aligned mono for
  // multi-line.
  const isMultiLine = card.text.includes('\n')
  return (
    <div
      class={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style={{
        'text-align': isMultiLine ? 'left' : 'center',
        padding: isMultiLine ? '8px 12px' : '6px 0',
        'margin-bottom': `${TIMELINE_ITEM_GAP}px`,
        'white-space': isMultiLine ? 'pre-wrap' : undefined,
        'font-family': isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
        'line-height': isMultiLine ? '1.5' : undefined,
      }}
    >
      {card.content
        ? card.content.map((segment, index) => renderCardSegment(segment, index))
        : card.text}
    </div>
  )
}

/**
 * One message row: a persisted commit record as a commit card, or the message
 * row itself. The message reaches it as an accessor, so the row's components
 * stay mounted as the message grows and their props update in place — React
 * reconciles the same row instead of rebuilding it, and a streaming reply's
 * throttled markdown parser must keep its state across updates.
 * @param props - The inner ctx and the message accessor.
 * @returns The rendered message.
 */
function MessageRow(props: { ctx: ChatInnerCtx; msg: () => ChatMessage }): JSX.Element {
  const ctx = props.ctx
  const commitRecord = createMemo(() => props.msg().commitRecord)
  return (
    <Switch>
      <Match when={commitRecord()}>
        {(record) => {
          const message = props.msg()
          const files = record().files.map((file: string | { path: string }) =>
            typeof file === 'string' ? file : file.path,
          )
          return (
            <CommitCardItem
              card={{
                id: message.id,
                message: record().message,
                files,
                timestamp: message.timestamp,
                status: 'done',
                hash: record().hash,
              }}
              onRevert={ctx.props.canEdit === false ? undefined : ctx.git.handleRevertCommit}
            />
          )
        }}
      </Match>
      <Match when={!commitRecord() ? props.msg() : undefined}>
        {(msg) => (
          <MessageItem
            msg={msg()}
            sendMessage={ctx.chat.sendMessage}
            handleAskUserResponse={ctx.chat.handleAskUserResponse}
            isLoading={ctx.chat.isLoading()}
            streamingStatus={ctx.chat.streamingStatus()}
            onNavigatePreview={ctx.props.onNavigatePreview}
            undoneTcIds={ctx.undo.undoneTcIds()}
            handleUndoToggle={ctx.undo.handleUndoToggle}
            onFileOpen={ctx.props.onFileOpen}
            onFileDoubleClick={ctx.props.onFileDoubleClick}
            onFileDiff={ctx.props.onFileDiff}
            handleFileRevert={ctx.git.handleFileRevert}
            setInputAndCursorEnd={ctx.input.setInputAndCursorEnd}
            setModelPicker={ctx.composer.setModelPicker}
            chatMode={ctx.chat.liveModelMode()}
            userAvatar={ctx.props.userAvatar}
            // Avatar/name clicks open the clicked AUTHOR's profile — MessageItem
            // builds the identity from the message's own author (teammates
            // included), so the host shows their view-only profile and the
            // viewer's editable own.
            onProfileClick={ctx.props.onProfileClick}
            currentUserId={ctx.props.currentUserId}
            showTimestamp={ctx.timeline.shownTimestampIds().has(msg().id)}
            discovery={ctx.props.discovery}
            buildUpgradeCta={ctx.props.buildUpgradeCta}
            agentName={ctx.props.agentName ?? DEFAULT_AGENT_NAME}
            canEdit={ctx.props.canEdit}
            onSkipToolCall={ctx.props.skipToolCall ? ctx.tests.handleSkipToolCall : undefined}
            skipToolCallReason={
              ctx.props.canEdit === false
                ? ctx.env.t('ide.chat.skipToolCallViewer', undefined, {
                    defaultValue: 'Only editors can skip this.',
                  })
                : null
            }
          />
        )}
      </Match>
    </Switch>
  )
}

/**
 * Renders one timeline item's body: its kind's row or card, each created once
 * and updated through its accessor.
 * @param props - The inner ctx and the item accessor.
 * @returns The rendered item.
 */
function TimelineItemBody(props: {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
  /** The row's item, or undefined when it left the rendered window. */
  item: () => ChatTimelineItem | undefined
}): JSX.Element {
  const ctx = props.ctx
  const commit = createMemo(() => {
    const item = props.item()
    return item?.kind === 'commit' ? item : undefined
  })
  const activity = createMemo(() => {
    const item = props.item()
    return item?.kind === 'activity' ? item : undefined
  })
  const tip = createMemo(() => {
    const item = props.item()
    return item?.kind === 'tip' ? item : undefined
  })
  const system = createMemo(() => {
    const item = props.item()
    return item?.kind === 'system' ? item : undefined
  })
  const message = createMemo(() => {
    const item = props.item()
    return item?.kind === 'message' ? item : undefined
  })
  return (
    <Switch>
      <Match when={commit()}>
        {(item) => (
          <CommitCardItem
            card={item().card}
            onRevert={ctx.props.canEdit === false ? undefined : ctx.git.handleRevertCommit}
          />
        )}
      </Match>
      <Match when={activity()}>
        {(item) => (
          <ActivityCard
            activity={item().card.activity}
            onActivityClick={ctx.props.onActivityClick}
          />
        )}
      </Match>
      <Match when={tip()}>
        {(item) => (
          // Translated HERE, not when the tip was queued: a locale switch
          // re-renders this row and re-translates it, and the `/` and `@` code
          // segments render from the translated sentence (TipCard splits the
          // string on them), so a translation can move them.
          <TipCard
            text={tipText(ctx.env.t, item().card.tip, {
              agentName: ctx.props.agentName ?? DEFAULT_AGENT_NAME,
            })}
            accent={item().card.accent}
            icon={item().card.icon}
            onDismiss={() => ctx.tips.dismissTip(item().card.id)}
          />
        )}
      </Match>
      <Match when={system()}>{(item) => renderSystemCard(ctx, item().card)}</Match>
      <Match when={message()}>{(item) => <MessageRow ctx={ctx} msg={() => item().msg} />}</Match>
    </Switch>
  )
}

/**
 * One row's content: its own-line timestamp when the plan shows one, then the
 * item's body. Both read their state reactively without re-creating the body.
 * @param props - The inner ctx, the row's item accessor and its stable id.
 * @returns The timestamp line and the item body.
 */
function TimelineRowContent(props: {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
  /** The row's item, or undefined when it left the rendered window. */
  item: () => ChatTimelineItem | undefined
  /** The row's stable id. */
  id: string
}): JSX.Element {
  const ctx = props.ctx
  return (
    <>
      <Show when={ctx.timeline.lineTimestampFor(props.id)}>
        {(slot) => (
          <ChatTimestamp timestamp={slot().timestamp} variant="line" align={slot().align} />
        )}
      </Show>
      <TimelineItemBody ctx={ctx} item={props.item} />
    </>
  )
}

/**
 * Renders one timeline row: its item's body and timestamp line, inside its own
 * error boundary. The row keeps its previous item while the payload behind its
 * id is unchanged, so only the row whose content moved is re-rendered.
 * @param props - The row's shared state, id and item lookup.
 * @returns The boundary-wrapped row.
 */
function TimelineRow(props: {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
  /** The row's stable id. */
  id: string
  /** The row's item, or undefined when it left the rendered window. */
  item: () => ChatTimelineItem | undefined
}): JSX.Element {
  const ctx = props.ctx
  let previous: ChatTimelineItem | undefined
  const item = createMemo<ChatTimelineItem | undefined>(() => {
    const next = props.item()
    if (
      previous &&
      next &&
      previous.kind === next.kind &&
      itemPayload(previous) === itemPayload(next)
    ) {
      return previous
    }
    previous = next
    return next
  })
  return (
    <ChatItemBoundary
      // Passed as a stable thunk so the boundary's own computation does not
      // subscribe to the host's prop: a prop change must not rebuild the row.
      onError={(error, info) => ctx.props.onRenderError?.(error, info)}
      render={() => <TimelineRowContent ctx={ctx} item={item} id={props.id} />}
    />
  )
}

/**
 * Renders the live error banner between the transcript and the activity slot:
 * the resource-limit upgrade banner, the viewer's gold view-only notice, or the
 * plain error line. Renders nothing without a live, non-stale error.
 * @param props - The inner panel's shared state.
 * @returns The banner, or nothing.
 */
function TimelineErrorBanner(props: { ctx: ChatInnerCtx }): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  return (
    <Show when={ctx.chat.error() && !ctx.timeline.staleAnonymousLimit() ? ctx.chat.error() : null}>
      {(error) => (
        <Switch
          fallback={
            <div
              class={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 2),
                cm.sp('mb', 2),
                cm.bgErrorSubtle,
                cm.textError,
              )}
              style={{ 'border-radius': '6px' }}
            >
              {error()}
            </div>
          }
        >
          <Match when={ctx.chat.errorMeta()?.limitType}>
            {/* The CTA routes/copy are the host's — ask buildUpgradeCta for the
                FULL upgrade/sign-in button set (none rendered if the host
                supplies nothing). Hand it EVERYTHING the backend said about the
                refusal: `limitType`, `billingAction` and `upgradeTier`. */}
            <ResourceLimitBanner
              message={error()}
              action={ctx.props.buildUpgradeCta?.(upgradeContextFromError(ctx.chat.errorMeta()))}
            />
          </Match>
          <Match when={ctx.timeline.isViewerAccessDenied()}>
            {/* A viewer's denial is expected state, not an alarm: a brief, calm,
                gold view-only notice that clears itself — never the persistent
                red banner. */}
            <Show when={ctx.timeline.viewerDeniedFlash()}>
              <div
                data-mol-id="chat-viewer-denied-notice"
                class={cm.cn(cm.textSize('xs'), cm.textMuted)}
                style={{
                  display: 'flex',
                  'align-items': 'flex-start',
                  gap: '8px',
                  'margin-bottom': '8px',
                  ...cardChrome(NOTICE_TONE.gold.accent),
                  'line-height': '1.5',
                }}
              >
                <Icon
                  name="people"
                  size={CHAT_CARD_ICON_SIZE}
                  aria-hidden="true"
                  style={{
                    'flex-shrink': '0',
                    'margin-top': '1px',
                    color: NOTICE_TONE.gold.accent,
                  }}
                />
                <span style={{ flex: '1 1 0%' }}>
                  {ctx.env.t('ide.chat.viewerReadOnly', undefined, {
                    defaultValue:
                      "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
                  })}
                </span>
              </div>
            </Show>
          </Match>
        </Switch>
      )}
    </Show>
  )
}

/**
 * Renders the timeline's items, each inside its own boundary, then the live
 * error banner.
 * @param props - The inner ctx.
 * @returns The item boundaries and the error banner, in React's order.
 */
export function ChatTimelineItems(props: ChatTimelineItemsProps): JSX.Element {
  const ctx = props.ctx
  const itemsById = createMemo(
    () => new Map(ctx.timeline.renderedTimeline().map((item) => [itemId(item), item] as const)),
  )
  const ids = createMemo(() => ctx.timeline.renderedTimeline().map(itemId))
  const rows = mapArray(ids, (id) => (
    <TimelineRow ctx={ctx} id={id} item={() => itemsById().get(id)} />
  ))
  return (
    <>
      {rows()}
      <TimelineErrorBanner ctx={ctx} />
    </>
  )
}

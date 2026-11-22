/**
 * `chat:timeline` — every timeline derivation (React's `chat:timeline` region,
 * ported by unit P5): the visible messages and the queued ones, the card event
 * conversion, the merged timeline, the rendered window, the timestamp plan and
 * line placement, the `/settings` list, the background-task commands and the
 * work card's visibility.
 *
 * Every derivation React recomputes with `useMemo` is a `createMemo` here, so it
 * follows the state it reads. React's render-time adjustment of the
 * viewer-denial flash is a signal the port re-arms whenever the denial (or the
 * error text) changes, before the banner that reads it re-renders.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

import type { CardEvent, ChatMessage } from '@molecule/app-ai-chat'
import {
  getCustomEventCardFactory,
  isAutoCommitEnabled,
  planChatTimestamps,
} from '@molecule/app-ide-panel-logic'
import type {
  ChatTimelineItem,
  SettingDescriptor,
  SystemCard,
  TaskListRow,
} from '@molecule/app-ide-panel-logic/panels'
import {
  buildChatTimeline,
  buildSettingsList,
  cardEventToSystemCard as toSystemCard,
  isStaleAnonymousLimit,
  isWorkVisible,
  nativeEffortName,
  planAwaitingUser,
  selectQueuedMessages,
  selectVisibleMessages,
  shouldShowTestsBar,
  summarizeSounds,
  timestampSlotFor,
} from '@molecule/app-ide-panel-logic/panels'

import { backgroundTaskCommands } from '../../context/background-task-commands.js'
import { latestPlan } from '../../parts/PlanCard.jsx'
import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices and sections read from `chat:timeline`. */
export interface ChatTimelineSlice {
  /** The messages the timeline renders (React's `selectVisibleMessages`). */
  visibleMessages: Accessor<ChatMessage[]>
  /** The queued messages, anchored above the composer. */
  queuedMessages: Accessor<ChatMessage[]>
  /** Builds a system card from a transcript card event. */
  cardEventToSystemCard: (cardEvent: CardEvent, id: string, timestamp: number) => SystemCard | null
  /** Whether an anonymous limit error is stale (the viewer signed in since). */
  staleAnonymousLimit: Accessor<boolean>
  /** Whether the viewer's chat error is an access-denied refusal. */
  isViewerAccessDenied: Accessor<boolean>
  /** Whether the brief view-only notice is showing. */
  viewerDeniedFlash: Accessor<boolean>
  /** The whole timeline, oldest first. */
  timeline: Accessor<ChatTimelineItem[]>
  /** The `/settings` rows, with the restored values. */
  computeSettingsList: () => SettingDescriptor[]
  /** A model id's display label, or its id. */
  modelLabel: (id: string) => string
  /** The timeline window the messages container renders. */
  renderedTimeline: Accessor<ChatTimelineItem[]>
  /** The item ids whose timestamp the plan shows. */
  shownTimestampIds: Accessor<Set<string>>
  /** Puts an item's own timestamp line above it when the plan shows one. */
  lineTimestampFor: (id: string) => { timestamp: number; align: 'left' | 'center' } | null
  /** Task id → the command it runs, for the Wait card. */
  bgCommands: Accessor<ReadonlyMap<string, string>>
  /** The latest task list the plan card renders. */
  plan: Accessor<TaskListRow[]>
  /** Whether a turn is running (a plan step only spins then). */
  planLive: Accessor<boolean>
  /** Whether the plan awaits the user's answer. */
  planAwaiting: Accessor<boolean>
  /** Whether the tests strip shows. */
  showTests: Accessor<boolean>
  /** Whether the files strip shows. */
  showFiles: Accessor<boolean>
  /** Whether the work card shows at all. */
  workVisible: Accessor<boolean>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:timeline`.
 * @param ctx - The inner ctx (the transcript, the cards and the model state the
 *   derivations read).
 * @returns The timeline slice.
 */
export function createChatTimeline(ctx: ChatInnerCtx): ChatTimelineSlice {
  // System cards built from card-messages, by card id. A card is rebuilt when
  // the visible transcript changes (the same point React rebuilds its timeline
  // memo), not on an unrelated notification: a custom factory runs (and logs)
  // as many times as React's, not once per state flush.
  const conversionCache = new Map<string, SystemCard | null>()
  // The visible transcript keeps its array identity while the same message
  // objects stay visible: a store flush that replaces the array without moving
  // a message must not rebuild the timeline — React's memoized view sees the
  // same dependency values.
  let previousVisible: ChatMessage[] = []
  const visibleMessages = createMemo(() => {
    const next = selectVisibleMessages(ctx.chat.messages())
    if (
      next.length === previousVisible.length &&
      next.every((message, index) => message === previousVisible[index])
    )
      return previousVisible
    conversionCache.clear()
    previousVisible = next
    return next
  })

  const queuedMessages = createMemo(() => selectQueuedMessages(visibleMessages()))

  /**
   * A model id's display label, or its id when the catalog has no entry.
   * @param id - The model's id.
   * @returns The label to render.
   */
  const modelLabel = (id: string): string =>
    ctx.models.AVAILABLE_MODELS().find((model) => model.id === id)?.label || id

  /**
   * Builds a system card from a card-message's recorded event, with this
   * panel's translate function, model catalog, region choices, custom-card
   * factory and logger — the one construction every framework shares.
   * @param cardEvent - The recorded card payload.
   * @param id - The card-message's id.
   * @param timestamp - The card-message's timestamp.
   * @returns The card to render, or `null` when it has nothing to show.
   */
  const cardEventToSystemCard = (
    cardEvent: CardEvent,
    id: string,
    timestamp: number,
  ): SystemCard | null => {
    const cached = conversionCache.get(id)
    if (cached !== undefined) return cached
    const converted = toSystemCard(cardEvent, id, timestamp, {
      t: ctx.env.t,
      models: ctx.models.AVAILABLE_MODELS(),
      modelRegions: ctx.models.modelRegions(),
      getFactory: getCustomEventCardFactory,
      logger: ctx.env.logger,
    })
    conversionCache.set(id, converted)
    return converted
  }

  const staleAnonymousLimit = createMemo(() =>
    isStaleAnonymousLimit(ctx.chat.errorMeta(), ctx.props.isAnonymous),
  )

  // A read-only viewer's access-denied chat error must never sit as the
  // persistent red banner — every legitimate viewer action is already gated
  // client-side, so this only fires when something slipped through to the
  // server (or an older tab raced a role change). Flash a calm, gold view-only
  // notice for a few seconds instead, then clear.
  const isViewerAccessDenied = createMemo(() => {
    if (ctx.props.canEdit !== false) return false
    const error = ctx.chat.error()
    return !!error && /access denied/i.test(error)
  })
  const [viewerDeniedFlash, setViewerDeniedFlash] = createSignal(isViewerAccessDenied())
  // Each change of the denial (or of the error text) while denied starts the
  // flash again: React sets this while rendering; here the signal is re-armed
  // before the banner that reads it re-renders.
  let deniedFlashSource = { isViewerAccessDenied: isViewerAccessDenied(), error: ctx.chat.error() }
  createEffect(
    on(
      () => [isViewerAccessDenied(), ctx.chat.error()],
      () => {
        const denied = isViewerAccessDenied()
        const error = ctx.chat.error()
        if (deniedFlashSource.isViewerAccessDenied === denied && deniedFlashSource.error === error)
          return
        deniedFlashSource = { isViewerAccessDenied: denied, error }
        if (denied) setViewerDeniedFlash(true)
      },
      { defer: false },
    ),
  )

  // Build a unified timeline so commit cards appear at the correct position.
  // A locale switch or a model-catalog change re-translates / re-labels every
  // card, as React's render does; the cache must not outlive them.
  createEffect(
    on(
      () => [ctx.env.locale(), ctx.models.AVAILABLE_MODELS(), ctx.models.modelRegions()],
      () => conversionCache.clear(),
      { defer: true },
    ),
  )

  const timeline = createMemo<ChatTimelineItem[]>(() => {
    const items = buildChatTimeline({
      visibleMessages: visibleMessages(),
      cardEventToSystemCard,
      commitCards: ctx.git.commitCards(),
      systemCards: ctx.popups.systemCards(),
      activityCards: ctx.activity.activityCards(),
      tipCards: ctx.tips.tipCards(),
      error: ctx.chat.error(),
      errorMeta: ctx.chat.errorMeta(),
      isStaleAnonymousLimit: staleAnonymousLimit(),
    })
    return items
  })

  /**
   * The live settings list for the `/settings` card, recomputed on every read so
   * it always reflects the current model / mode / effort / sounds.
   * @returns One descriptor per setting, in display order.
   */
  const computeSettingsList = (): SettingDescriptor[] => {
    const t = ctx.env.t
    const soundsSummary = summarizeSounds(ctx.sounds.soundsConfig())
    const notSet = t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' })
    // An unset per-mode model shows what the mode ACTUALLY resolves to
    // ("Default (<model>)"): the saved default model, else the server's
    // per-mode default — never the wrong mode's model (SYN11).
    const modeDefault = (mode: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: modelLabel(ctx.models.effectiveModelForMode(mode)) },
        { defaultValue: 'Default ({{model}})' },
      )
    // The auxiliary commit/compact jobs fall back to the server's own fast
    // default when unset — NOT the default model — so their unset label differs.
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: modelLabel(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    const savedChatModel = ctx.models.savedChatModel()
    const planModel = ctx.models.planModel()
    const executeModel = ctx.models.executeModel()
    const commitModel = ctx.models.commitModel()
    const compactModel = ctx.models.compactModel()
    const serverModelDefaults = ctx.models.serverModelDefaults()
    const effortByMode = ctx.models.effortByMode()
    const effortLevel = ctx.models.effortLevel()
    return buildSettingsList({
      model: savedChatModel ? modelLabel(savedChatModel) : notSet,
      planModel: planModel ? modelLabel(planModel) : modeDefault('plan'),
      executeModel: executeModel ? modelLabel(executeModel) : modeDefault('execute'),
      commitModel: commitModel ? modelLabel(commitModel) : auxDefault(serverModelDefaults?.commit),
      compactModel: compactModel
        ? modelLabel(compactModel)
        : auxDefault(serverModelDefaults?.compact),
      mode:
        ctx.chat.mode() === 'plan'
          ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
          : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
      // Per-mode effort, shown in each mode's MODEL-NATIVE values (a fixed-
      // reasoning model shows "fixed"). Falls back to the legacy single level.
      effort: t(
        'ide.chat.settings.effortValue',
        {
          plan: (() => {
            const model = ctx.models
              .AVAILABLE_MODELS()
              .find((entry) => entry.id === ctx.models.effectiveModelForMode('plan'))
            return (
              nativeEffortName(model, effortByMode.plan ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
          execute: (() => {
            const model = ctx.models
              .AVAILABLE_MODELS()
              .find((entry) => entry.id === ctx.models.effectiveModelForMode('execute'))
            return (
              nativeEffortName(model, effortByMode.execute ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
        },
        { defaultValue: 'plan: {{plan}} · execute: {{execute}}' },
      ),
      maxLoops: String(ctx.models.currentMaxLoops()),
      autoFix: ctx.models.autoFixEnabled()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      autoCommit: isAutoCommitEnabled(ctx.autoCommit.autoCommit())
        ? t(
            'ide.chat.settings.autoCommitEvery',
            { seconds: ctx.autoCommit.autoCommit().intervalSeconds },
            { defaultValue: 'Every {{seconds}}s' },
          )
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      hooks: t('ide.chat.settings.hooksValue', undefined, {
        defaultValue: 'In project settings',
      }),
      autoApproveCommands: ctx.models.autoApproveCommandsEnabled()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      sounds: t(
        'ide.chat.settings.soundsSummary',
        { enabled: soundsSummary.enabled, total: soundsSummary.total },
        { defaultValue: '{{enabled}} of {{total}} events enabled' },
      ),
      timestamps: ctx.prefs.timestampsVisible()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
    })
  }

  const renderedTimeline = createMemo(() => {
    const items = timeline()
    const cap = ctx.scroll.maxVisibleItems()
    return items.length > cap ? items.slice(-cap) : items
  })

  // Read by the once-registered scroll listener (declared with the other scroll
  // refs, before `timeline` exists) to decide whether scrolling near the top
  // should mount the next older page.
  ctx.scroll.hasHiddenEarlierRef.current = () => timeline().length > ctx.scroll.maxVisibleItems()

  const timestampSlots = createMemo(() => renderedTimeline().map(timestampSlotFor))
  const timestampSlotById = createMemo(
    () => new Map(timestampSlots().flatMap((slot) => (slot ? [[slot.id, slot] as const] : []))),
  )
  const shownTimestampIds = createMemo(() =>
    planChatTimestamps(timestampSlots(), {
      visible: ctx.prefs.timestampsVisible(),
      now: ctx.prefs.minuteNow(),
      locale: ctx.env.locale(),
    }),
  )

  /**
   * The item's own-line time, when the timestamp plan shows it above a Synthase
   * reply or an event card. Header-placed times render inside `MessageItem`.
   * @param id - The item's stable id.
   * @returns The line timestamp to render, or null.
   */
  const lineTimestampFor = (id: string): { timestamp: number; align: 'left' | 'center' } | null => {
    const slot = timestampSlotById().get(id)
    if (!slot || slot.placement !== 'line' || !shownTimestampIds().has(id)) return null
    return { timestamp: slot.timestamp, align: slot.align }
  }

  const bgCommands = createMemo(() => backgroundTaskCommands(ctx.chat.messages()))
  const plan = createMemo(() => latestPlan(ctx.chat.messages()))
  // A plan step only spins while a turn is running; otherwise it says it is
  // waiting on the person (an unanswered ask_user) or that the work stopped.
  const planLive = createMemo(() => ctx.chat.isLoading() || ctx.chat.isRemoteStreaming())
  const planAwaiting = createMemo(() => planAwaitingUser(ctx.chat.messages()))
  // Everything about the work in flight shares one card above the composer. The
  // tests strip also shows for a read-only viewer (watching is not editing); the
  // files strip does not (committing is editor work). Popups hide the card.
  const showTests = createMemo(() => {
    const nativeTests = ctx.props.nativeTests
    return (
      ctx.prefs.testsBarVisible() &&
      (nativeTests
        ? nativeTests.visible
        : shouldShowTestsBar(ctx.tests.testsRun(), ctx.tests.testsList()))
    )
  })
  const showFiles = createMemo(() => {
    const pendingFiles = ctx.git.pendingFiles()
    return ctx.props.canEdit !== false && pendingFiles != null && pendingFiles.length > 0
  })
  const workVisible = createMemo(() =>
    isWorkVisible({
      commandMenu: ctx.composer.commandMenu(),
      modelPicker: ctx.composer.modelPicker(),
      effortPicker: ctx.composer.effortPicker(),
      panelOverlay: ctx.overlay.panelOverlay(),
      plan: plan(),
      backgroundTasks: ctx.chat.backgroundTasks(),
      showTests: showTests(),
      showFiles: showFiles(),
    }),
  )

  return {
    visibleMessages,
    queuedMessages,
    cardEventToSystemCard,
    staleAnonymousLimit,
    isViewerAccessDenied,
    viewerDeniedFlash,
    timeline,
    computeSettingsList,
    modelLabel,
    renderedTimeline,
    shownTimestampIds,
    lineTimestampFor,
    bgCommands,
    plan,
    planLive,
    planAwaiting,
    showTests,
    showFiles,
    workVisible,
    effects: {
      // #effect chat:timeline:1 — clear the viewer-denial flash after a few seconds.
      1: () => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const run = (): void => {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
          }
          if (!isViewerAccessDenied()) return
          timer = setTimeout(() => setViewerDeniedFlash(false), 6000)
        }
        createEffect(on(() => [isViewerAccessDenied(), ctx.chat.error()], run, { defer: false }))
        onCleanup(() => {
          if (timer) clearTimeout(timer)
        })
      },
    },
  }
}

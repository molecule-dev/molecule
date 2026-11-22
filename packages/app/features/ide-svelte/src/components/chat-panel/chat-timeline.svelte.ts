/**
 * React's `chat:timeline` region of ChatPanel.tsx (lines 4882–5111): every
 * timeline derivation — the visible messages and the queued ones, the card
 * event conversion, the merged timeline, the visible page, the timestamp plan,
 * the settings list, the background-task commands, the plan and the work
 * card's visibility.
 *
 * Each derivation React recomputes with `useMemo` is a getter here, so it
 * follows the state it reads at call time; the render-time state React adjusts
 * during a render (the viewer-denial flash) is kept in `$state` and re-armed by
 * effect 1.
 *
 * Svelte cannot build a wrapping `Snippet` from a plain TypeScript module, so
 * React's `withTimelineTimestamp` is exposed as its DECISION — the timestamp
 * line the section renders above the item — and the section renders
 * `ChatTimestamp` itself.
 *
 * @module
 */

import { SvelteMap } from 'svelte/reactivity'

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
import { getLogger } from '@molecule/app-logger'

import { backgroundTaskCommands } from '../../context/background-task-commands.js'
import { latestPlan } from '../../parts/plan-card.js'
import type { ChatContext } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/**
 * A timeline item's own-line timestamp: the moment and the alignment the
 * `ChatTimestamp` line renders with (React's `withTimelineTimestamp` result).
 */
export interface TimelineTimestampLine {
  /** Epoch milliseconds of the item. */
  timestamp: number
  /** The line's text alignment. */
  align: 'left' | 'center'
}

/** The identifiers other slices and sections read from the `chat:timeline` slice. */
export interface ChatTimelineSlice {
  /** The messages the timeline renders (React's `selectVisibleMessages`). */
  readonly visibleMessages: ChatMessage[]
  /** The queued messages, anchored above the composer. */
  readonly queuedMessages: ChatMessage[]
  /** Whether an anonymous limit error is stale (the viewer signed in since). */
  readonly staleAnonymousLimit: boolean
  /** Whether the viewer's chat error is an access-denied refusal. */
  readonly isViewerAccessDenied: boolean
  /** Whether the brief view-only notice is showing. */
  readonly viewerDeniedFlash: boolean
  /** The whole timeline, oldest first. */
  readonly timeline: ChatTimelineItem[]
  /** The `/settings` rows, with the restored values. */
  readonly computeSettingsList: () => SettingDescriptor[]
  /** The timeline window the messages container renders. */
  readonly renderedTimeline: ChatTimelineItem[]
  /** The item ids whose timestamp the plan shows. */
  readonly shownTimestampIds: Set<string>
  /**
   * React's `withTimelineTimestamp`, as the DECISION: the line the section
   * renders above the item, or null when no line applies. Svelte cannot compose
   * a wrapping `Snippet` in a plain module, so the section renders
   * `ChatTimestamp` itself from this result.
   */
  readonly withTimelineTimestamp: (item: ChatTimelineItem) => TimelineTimestampLine | null
  /** The latest task list the plan card renders. */
  readonly plan: TaskListRow[]
  /** Whether a turn is running (a plan step only spins then). */
  readonly planLive: boolean
  /** Whether the plan awaits the user's answer. */
  readonly planAwaiting: boolean
  /** Whether the tests strip shows. */
  readonly showTests: boolean
  /** Whether the files strip shows. */
  readonly showFiles: boolean
  /** Whether the work card shows at all. */
  readonly workVisible: boolean

  /** React's mount I/O for the region: sync the background-task command map. */
  mount(): void

  /** React's `#effect chat:timeline:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** React's `bgCommands` — task id to command for the transcript's cards. */
  readonly bgCommands: ReadonlyMap<string, string>
}

/**
 * Creates the `chat:timeline` slice.
 *
 * @param ctx - The shared chat context (the transcript, the cards and the model state).
 * @returns The timeline derivations, the timestamp decision, the background-task map and effect 1.
 */
export function createChatTimeline(ctx: ChatContext): ChatTimelineSlice {
  // The session's transcript as a derived on the ARRAY ITSELF: the chat store
  // notifies on every session flush (a new state object each time), including
  // ones that leave `messages` untouched. React's hook hands the same array
  // reference through such a flush; a derived re-notifies only when the value
  // changes, so the timeline memo below is not rebuilt for a notification that
  // changed nothing.
  const liveMessages = $derived(ctx.chat.messages)

  /**
   * The messages the timeline may render (React's `selectVisibleMessages`).
   *
   * @returns The visible transcript.
   */
  const computeVisibleMessages = (): ChatMessage[] => selectVisibleMessages(liveMessages)

  /**
   * The queued messages, which render in the bar above the composer.
   *
   * @returns The queued subset, in queue order.
   */
  const computeQueuedMessages = (): ChatMessage[] => selectQueuedMessages(computeVisibleMessages())

  /**
   * Builds a system card from a card-message's recorded event, with this
   * panel's translate function, model catalog, region choices, custom-card
   * factory and logger — the one construction every framework shares.
   *
   * @param cardEvent - The recorded card payload.
   * @param id - The card-message's id.
   * @param timestamp - The card-message's timestamp.
   * @returns The card to render, or `null` when it has nothing to show.
   */
  const cardEventToSystemCard = (
    cardEvent: CardEvent,
    id: string,
    timestamp: number,
  ): SystemCard | null =>
    toSystemCard(cardEvent, id, timestamp, {
      t: ctx.env.t,
      models: ctx.models.AVAILABLE_MODELS,
      modelRegions: ctx.models.modelRegions,
      getFactory: getCustomEventCardFactory,
      logger,
    })

  /**
   * Whether a limit the backend raised for an anonymous caller is now stale.
   *
   * @returns True when the guest limit must not render.
   */
  const computeStaleAnonymousLimit = (): boolean =>
    isStaleAnonymousLimit(ctx.chat.errorMeta, ctx.props.isAnonymous)

  /**
   * Whether the chat's error is a read-only viewer's access-denied refusal —
   * the red banner never renders for that, a calm gold notice flashes instead.
   *
   * @returns True when the viewer's error is an access denial.
   */
  const computeIsViewerAccessDenied = (): boolean =>
    ctx.props.canEdit === false && !!ctx.chat.error && /access denied/i.test(ctx.chat.error)

  /** React's `viewerDeniedFlash` — whether the brief view-only notice shows. */
  let viewerDeniedFlash = $state(computeIsViewerAccessDenied())

  /** React's `deniedFlashSource` — the denial/error pair that started the flash. */
  let deniedFlashSource: { isViewerAccessDenied: boolean; error: string | null } = {
    isViewerAccessDenied: computeIsViewerAccessDenied(),
    error: ctx.chat.error,
  }

  /**
   * Builds the unified timeline so commit cards appear at the correct position.
   *
   * @returns The ordered timeline items.
   */
  const computeTimeline = (): ChatTimelineItem[] =>
    buildChatTimeline({
      visibleMessages: computeVisibleMessages(),
      cardEventToSystemCard,
      commitCards: ctx.git.commitCards,
      systemCards: ctx.popups.systemCards,
      activityCards: ctx.activity.activityCards,
      tipCards: ctx.tips.tipCards,
      error: ctx.chat.error,
      errorMeta: ctx.chat.errorMeta,
      isStaleAnonymousLimit: computeStaleAnonymousLimit(),
    })

  // React's `useMemo` over the same inputs: building the timeline converts
  // every card event through its factory, so recomputing it per render would
  // re-run a custom card's factory on each one (React runs it once per input
  // change). A derived is the memo: it re-runs only when an input notifies.
  const timelineMemo = $derived(computeTimeline())

  /**
   * The timeline window actually mounted (the newest `maxVisibleItems` items).
   *
   * @returns The rendered slice of the timeline.
   */
  const computeRenderedTimeline = (): ChatTimelineItem[] => {
    const timeline = timelineMemo
    return timeline.length > ctx.scroll.maxVisibleItems
      ? timeline.slice(-ctx.scroll.maxVisibleItems)
      : timeline
  }

  // React's memo over the window actually mounted, so the section's re-reads
  // reuse one list per input change instead of rebuilding the timeline.
  const renderedTimelineMemo = $derived(computeRenderedTimeline())

  // Read by the once-registered scroll listener to decide whether scrolling near
  // the top should mount the next older page.
  ctx.scroll.hasHiddenEarlierRef.current = () => timelineMemo.length > ctx.scroll.maxVisibleItems

  /**
   * The timestamp slot of every rendered item, in order.
   *
   * @returns One slot per rendered item (`null` when it carries none).
   */
  const timestampSlots = (): ReturnType<typeof timestampSlotFor>[] =>
    computeRenderedTimeline().map(timestampSlotFor)

  /**
   * The rendered items' timestamp slots, keyed by item id.
   *
   * @returns The slot map.
   */
  const timestampSlotById = (): SvelteMap<
    string,
    NonNullable<ReturnType<typeof timestampSlotFor>>
  > => new SvelteMap(timestampSlots().flatMap((slot) => (slot ? [[slot.id, slot] as const] : [])))

  /**
   * The ids whose timestamp the plan shows.
   *
   * @returns The shown ids.
   */
  const computeShownTimestampIds = (): Set<string> =>
    planChatTimestamps(timestampSlots(), {
      visible: ctx.prefs.timestampsVisible,
      now: ctx.prefs.minuteNow,
      locale: ctx.env.locale,
    })

  /**
   * React's `computeSettingsList`: the live `/settings` rows, recomputed on
   * every call so they always reflect the current model / mode / effort / sounds.
   *
   * @returns One descriptor per setting, in display order.
   */
  const computeSettingsList = (): SettingDescriptor[] => {
    const t = ctx.env.t
    const soundsSummary = summarizeSounds(ctx.sounds.soundsConfig)
    const notSet = t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' })
    const modelLabel = (id: string): string =>
      ctx.models.AVAILABLE_MODELS.find((model) => model.id === id)?.label || id
    // An unset per-mode model shows what the mode ACTUALLY resolves to.
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
    const savedChatModel = ctx.models.savedChatModel
    const planModel = ctx.models.planModel
    const executeModel = ctx.models.executeModel
    const commitModel = ctx.models.commitModel
    const compactModel = ctx.models.compactModel
    const serverModelDefaults = ctx.models.serverModelDefaults
    const effortByMode = ctx.models.effortByMode
    const effortLevel = ctx.models.effortLevel
    return buildSettingsList({
      model: savedChatModel ? modelLabel(savedChatModel) : notSet,
      planModel: planModel ? modelLabel(planModel) : modeDefault('plan'),
      executeModel: executeModel ? modelLabel(executeModel) : modeDefault('execute'),
      commitModel: commitModel ? modelLabel(commitModel) : auxDefault(serverModelDefaults?.commit),
      compactModel: compactModel
        ? modelLabel(compactModel)
        : auxDefault(serverModelDefaults?.compact),
      mode:
        ctx.chat.mode === 'plan'
          ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
          : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
      // Per-mode effort, in each mode's MODEL-NATIVE values (a fixed-reasoning
      // model shows "fixed"). Falls back to the legacy single level.
      effort: t(
        'ide.chat.settings.effortValue',
        {
          plan: (() => {
            const model = ctx.models.AVAILABLE_MODELS.find(
              (entry) => entry.id === ctx.models.effectiveModelForMode('plan'),
            )
            return (
              nativeEffortName(model, effortByMode.plan ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
          execute: (() => {
            const model = ctx.models.AVAILABLE_MODELS.find(
              (entry) => entry.id === ctx.models.effectiveModelForMode('execute'),
            )
            return (
              nativeEffortName(model, effortByMode.execute ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
        },
        { defaultValue: 'plan: {{plan}} · execute: {{execute}}' },
      ),
      maxLoops: String(ctx.models.currentMaxLoops),
      autoFix: ctx.models.autoFixEnabled
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      autoCommit: isAutoCommitEnabled(ctx.autoCommit.autoCommit)
        ? t(
            'ide.chat.settings.autoCommitEvery',
            { seconds: ctx.autoCommit.autoCommit.intervalSeconds },
            { defaultValue: 'Every {{seconds}}s' },
          )
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      hooks: t('ide.chat.settings.hooksValue', undefined, {
        defaultValue: 'In project settings',
      }),
      autoApproveCommands: ctx.models.autoApproveCommandsEnabled
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      sounds: t(
        'ide.chat.settings.soundsSummary',
        { enabled: soundsSummary.enabled, total: soundsSummary.total },
        { defaultValue: '{{enabled}} of {{total}} events enabled' },
      ),
      timestamps: ctx.prefs.timestampsVisible
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
    })
  }

  /**
   * React's `withTimelineTimestamp`, as the decision the section renders: the
   * line above a Synthase reply or an event card, when the plan shows it.
   * Header-placed times render inside MessageItem.
   *
   * @param item - The timeline item being rendered.
   * @returns The line to render, or null when no line applies.
   */
  const withTimelineTimestamp = (item: ChatTimelineItem): TimelineTimestampLine | null => {
    const id = item.kind === 'message' ? item.msg.id : item.card.id
    const slot = timestampSlotById().get(id)
    if (!slot || slot.placement !== 'line' || !computeShownTimestampIds().has(id)) return null
    return { timestamp: slot.timestamp, align: slot.align }
  }

  /**
   * Whether the tests status strip shows: the device preference AND, for a
   * host-owned strip, what the host says, else the shared run/list rule.
   *
   * @returns True when the tests strip renders.
   */
  const computeShowTests = (): boolean => {
    const nativeTests = ctx.props.nativeTests
    return (
      ctx.prefs.testsBarVisible &&
      (nativeTests
        ? nativeTests.visible
        : shouldShowTestsBar(ctx.tests.testsRun, ctx.tests.testsList))
    )
  }

  /**
   * Whether the changed-files strip shows (editor work, so never for a viewer).
   *
   * @returns True when the files strip renders.
   */
  const computeShowFiles = (): boolean => {
    const pendingFiles = ctx.git.pendingFiles
    return ctx.props.canEdit !== false && pendingFiles != null && pendingFiles.length > 0
  }

  // React's `bgCommands` is a memoized Map that the context publishes once; a
  // SvelteMap is mutated in place so the cards below see every later update.
  const bgCommands = new SvelteMap<string, string>()

  /** Recomputes the background-task command map in place. */
  const syncBgCommands = (): void => {
    const next = backgroundTaskCommands(ctx.chat.messages)
    bgCommands.clear()
    for (const [id, command] of next) bgCommands.set(id, command)
  }

  return {
    get visibleMessages(): ChatMessage[] {
      return computeVisibleMessages()
    },
    get queuedMessages(): ChatMessage[] {
      return computeQueuedMessages()
    },
    get staleAnonymousLimit(): boolean {
      return computeStaleAnonymousLimit()
    },
    get isViewerAccessDenied(): boolean {
      return computeIsViewerAccessDenied()
    },
    get viewerDeniedFlash(): boolean {
      return viewerDeniedFlash
    },
    get timeline(): ChatTimelineItem[] {
      return timelineMemo
    },
    computeSettingsList,
    get renderedTimeline(): ChatTimelineItem[] {
      return renderedTimelineMemo
    },
    get shownTimestampIds(): Set<string> {
      return computeShownTimestampIds()
    },
    withTimelineTimestamp,
    get plan(): TaskListRow[] {
      return latestPlan(ctx.chat.messages)
    },
    get planLive(): boolean {
      return ctx.chat.isLoading || ctx.chat.isRemoteStreaming
    },
    get planAwaiting(): boolean {
      return planAwaitingUser(ctx.chat.messages)
    },
    get showTests(): boolean {
      return computeShowTests()
    },
    get showFiles(): boolean {
      return computeShowFiles()
    },
    get workVisible(): boolean {
      return isWorkVisible({
        commandMenu: ctx.composer.commandMenu,
        modelPicker: ctx.composer.modelPicker,
        effortPicker: ctx.composer.effortPicker,
        panelOverlay: ctx.overlay.panelOverlay,
        plan: latestPlan(ctx.chat.messages),
        backgroundTasks: ctx.chat.backgroundTasks,
        showTests: computeShowTests(),
        showFiles: computeShowFiles(),
      })
    },
    mount(): void {
      // React's `useCommittedRef` keeps `hasHiddenEarlierRef` current during
      // render; it is assigned above. The background-task map is the one piece
      // React derives with `useMemo`, so its sync effect is registered here.
      $effect(() => {
        syncBgCommands()
      })
    },
    effects: {
      1: (): void => {
        // Clear the viewer-denial flash after a few seconds; each change while
        // denied restarts it (React's render-time state update, replayed here).
        $effect(() => {
          const denied = computeIsViewerAccessDenied()
          const error = ctx.chat.error
          if (
            deniedFlashSource.isViewerAccessDenied !== denied ||
            deniedFlashSource.error !== error
          ) {
            deniedFlashSource = { isViewerAccessDenied: denied, error }
            if (denied) viewerDeniedFlash = true
          }
          if (!denied) return
          const timer = setTimeout(() => {
            viewerDeniedFlash = false
          }, 6000)
          return () => clearTimeout(timer)
        })
      },
    },
    get bgCommands(): ReadonlyMap<string, string> {
      return bgCommands
    },
  }
}

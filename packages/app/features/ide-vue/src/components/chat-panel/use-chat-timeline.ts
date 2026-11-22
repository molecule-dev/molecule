/**
 * `chat:timeline` — every timeline derivation, ported from React's
 * `chat:timeline` region: the visible messages and the queued ones, the card
 * event conversion, the merged timeline, the visible page, the timestamp
 * plan, the settings list, the background-task commands and the work card's
 * visibility.
 *
 * Each derivation React recomputes with `useMemo` is a `computed` here, so it
 * follows the state it reads; the render-time state React adjusts during a
 * render (the viewer-denial flash) is kept in a ref and mirrored before this
 * component re-renders.
 *
 * @module
 */

import type { VNodeChild } from 'vue'
import { computed, type ComputedRef, h, onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

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
import { latestPlan } from '../../parts/PlanCard.js'
import { ChatTimestamp } from '../ChatTimestamp.js'
import type { ChatCtx, ChatEffect } from './context.js'

const logger = getLogger('chat-panel')

/** What the `chat:timeline` slice exposes. */
export interface ChatTimelineSlice {
  /** Converts one card event to the system card it renders as. */
  readonly cardEventToSystemCard: (
    event: CardEvent,
    id: string,
    timestamp: number,
  ) => SystemCard | null
  /** The whole timeline: messages, cards, commits, activities, tips and errors. */
  readonly timeline: ComputedRef<ChatTimelineItem[]>
  /** The latest task list (the work card's plan). */
  readonly plan: ComputedRef<TaskListRow[]>
  /** The page of the timeline actually rendered. */
  readonly renderedTimeline: ComputedRef<ChatTimelineItem[]>
  /** Puts the item's time on its own line above it, when the plan shows one. */
  readonly withTimelineTimestamp: (item: ChatTimelineItem, node: VNodeChild) => VNodeChild
  /** The items whose timestamp line is shown. */
  readonly shownTimestampIds: ComputedRef<ReadonlySet<string>>
  /** Whether a limit error is stale (the viewer has signed in since). */
  readonly staleAnonymousLimit: ComputedRef<boolean>
  /** Whether the error is a viewer denial. */
  readonly isViewerAccessDenied: ComputedRef<boolean>
  /** The viewer-denial flash flag. */
  readonly viewerDeniedFlash: Ref<boolean>
  /** The messages the transcript shows. */
  readonly visibleMessages: ComputedRef<ChatMessage[]>
  /** The live settings list the `/settings` card and overlay render. */
  readonly computeSettingsList: () => SettingDescriptor[]
  /** The queued messages (anchored above the composer). */
  readonly queuedMessages: ComputedRef<ChatMessage[]>
  /** Whether the work card is shown. */
  readonly workVisible: ComputedRef<boolean>
  /** Whether a turn is running (a plan step spins). */
  readonly planLive: ComputedRef<boolean>
  /** Whether the plan is waiting on the person. */
  readonly planAwaiting: ComputedRef<boolean>
  /** Whether the tests status strip is shown. */
  readonly showTests: ComputedRef<boolean>
  /** Whether the changed-files strip is shown. */
  readonly showFiles: ComputedRef<boolean>
  /** The commands a background task's Wait card names. */
  readonly bgCommands: ComputedRef<ReadonlyMap<string, string>>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:timeline:1` — clears the viewer-denial flash after a few seconds. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:timeline` slice.
 *
 * @param ctx - The panel context (the transcript, the cards and the model state).
 * @returns The timeline slice.
 */
export function createChatTimeline(ctx: ChatCtx): ChatTimelineSlice {
  const visibleMessages = computed(() => selectVisibleMessages(ctx.chat.messages.value))

  const queuedMessages = computed(() => selectQueuedMessages(visibleMessages.value))

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
      models: ctx.models.AVAILABLE_MODELS.value,
      modelRegions: ctx.models.modelRegions.value,
      getFactory: getCustomEventCardFactory,
      logger,
    })

  const staleAnonymousLimit = computed(() =>
    isStaleAnonymousLimit(ctx.chat.errorMeta.value, ctx.props.isAnonymous),
  )

  // A read-only viewer's access-denied chat error must never sit as the
  // persistent red banner — flash a calm, gold view-only notice instead.
  const isViewerAccessDenied = computed(
    () =>
      ctx.props.canEdit === false &&
      !!ctx.chat.error.value &&
      /access denied/i.test(ctx.chat.error.value),
  )
  const viewerDeniedFlash = ref(isViewerAccessDenied.value)
  // Each change of the denial (or of the error text) while denied starts the
  // flash again: React sets this while rendering; the watcher below runs before
  // this component re-renders, so the flash is already on for that pass.
  let deniedFlashSource = {
    isViewerAccessDenied: isViewerAccessDenied.value,
    error: ctx.chat.error.value,
  }
  watch(
    [isViewerAccessDenied, () => ctx.chat.error.value],
    () => {
      const denied = isViewerAccessDenied.value
      const error = ctx.chat.error.value
      if (deniedFlashSource.isViewerAccessDenied !== denied || deniedFlashSource.error !== error) {
        deniedFlashSource = { isViewerAccessDenied: denied, error }
        if (denied) viewerDeniedFlash.value = true
      }
    },
    { flush: 'pre' },
  )

  // Build a unified timeline so commit cards appear at the correct position.
  const timeline = computed(() =>
    buildChatTimeline({
      visibleMessages: visibleMessages.value,
      cardEventToSystemCard,
      commitCards: ctx.git.commitCards.value,
      systemCards: ctx.popups.systemCards.value,
      activityCards: ctx.activity.activityCards.value,
      tipCards: ctx.tips.tipCards.value,
      error: ctx.chat.error.value,
      errorMeta: ctx.chat.errorMeta.value,
      isStaleAnonymousLimit: staleAnonymousLimit.value,
    }),
  )

  /**
   * The live settings list for the `/settings` card, recomputed on every read so
   * it always reflects the current model / mode / effort / sounds.
   *
   * @returns One descriptor per setting, in display order.
   */
  const computeSettingsList = (): SettingDescriptor[] => {
    const t = ctx.env.t
    const soundsSummary = summarizeSounds(ctx.sounds.soundsConfig.value)
    const notSet = t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' })
    const modelLabel = (id: string): string =>
      ctx.models.AVAILABLE_MODELS.value.find((model) => model.id === id)?.label || id
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
    const savedChatModel = ctx.models.savedChatModel.value
    const planModel = ctx.models.planModel.value
    const executeModel = ctx.models.executeModel.value
    const commitModel = ctx.models.commitModel.value
    const compactModel = ctx.models.compactModel.value
    const serverModelDefaults = ctx.models.serverModelDefaults.value
    const effortByMode = ctx.models.effortByMode.value
    const effortLevel = ctx.models.effortLevel.value
    return buildSettingsList({
      model: savedChatModel ? modelLabel(savedChatModel) : notSet,
      planModel: planModel ? modelLabel(planModel) : modeDefault('plan'),
      executeModel: executeModel ? modelLabel(executeModel) : modeDefault('execute'),
      commitModel: commitModel ? modelLabel(commitModel) : auxDefault(serverModelDefaults?.commit),
      compactModel: compactModel
        ? modelLabel(compactModel)
        : auxDefault(serverModelDefaults?.compact),
      mode:
        ctx.chat.mode.value === 'plan'
          ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
          : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
      // Per-mode effort, shown in each mode's MODEL-NATIVE values (a fixed-
      // reasoning model shows "fixed"). Falls back to the legacy single level.
      effort: t(
        'ide.chat.settings.effortValue',
        {
          plan: (() => {
            const model = ctx.models.AVAILABLE_MODELS.value.find(
              (entry) => entry.id === ctx.models.effectiveModelForMode('plan'),
            )
            return (
              nativeEffortName(model, effortByMode.plan ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
          execute: (() => {
            const model = ctx.models.AVAILABLE_MODELS.value.find(
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
      maxLoops: String(ctx.models.currentMaxLoops.value),
      autoFix: ctx.models.autoFixEnabled.value
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      autoCommit: isAutoCommitEnabled(ctx.autoCommit.autoCommit.value)
        ? t(
            'ide.chat.settings.autoCommitEvery',
            { seconds: ctx.autoCommit.autoCommit.value.intervalSeconds },
            { defaultValue: 'Every {{seconds}}s' },
          )
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      hooks: t('ide.chat.settings.hooksValue', undefined, {
        defaultValue: 'In project settings',
      }),
      autoApproveCommands: ctx.models.autoApproveCommandsEnabled.value
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      sounds: t(
        'ide.chat.settings.soundsSummary',
        { enabled: soundsSummary.enabled, total: soundsSummary.total },
        { defaultValue: '{{enabled}} of {{total}} events enabled' },
      ),
      timestamps: ctx.prefs.timestampsVisible.value
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
    })
  }

  const renderedTimeline = computed(() =>
    timeline.value.length > ctx.scroll.maxVisibleItems.value
      ? timeline.value.slice(-ctx.scroll.maxVisibleItems.value)
      : timeline.value,
  )

  // Read by the once-registered scroll listener (declared with the other scroll
  // refs, before `timeline` exists) to decide whether scrolling near the top
  // should mount the next older page.
  ctx.scroll.hasHiddenEarlierRef.current = () =>
    timeline.value.length > ctx.scroll.maxVisibleItems.value

  const timestampSlots = computed(() => renderedTimeline.value.map(timestampSlotFor))
  const timestampSlotById = computed(
    () => new Map(timestampSlots.value.flatMap((slot) => (slot ? [[slot.id, slot] as const] : []))),
  )
  const shownTimestampIds = computed(() =>
    planChatTimestamps(timestampSlots.value, {
      visible: ctx.prefs.timestampsVisible.value,
      now: ctx.prefs.minuteNow.value,
      locale: ctx.env.locale.value,
    }),
  )

  /**
   * Puts the item's time on its own line above a Synthase reply or an event
   * card, when the timestamp plan shows it. Header-placed times render inside
   * MessageItem.
   *
   * @param item - The timeline item being rendered.
   * @param node - The item's rendered element tree.
   * @returns The tree, preceded by its timestamp line when one applies.
   */
  const withTimelineTimestamp = (item: ChatTimelineItem, node: VNodeChild): VNodeChild => {
    if (node === null) return node
    const id = item.kind === 'message' ? item.msg.id : item.card.id
    const slot = timestampSlotById.value.get(id)
    if (!slot || slot.placement !== 'line' || !shownTimestampIds.value.has(id)) return node
    return [
      h(ChatTimestamp, { timestamp: slot.timestamp, variant: 'line', align: slot.align }),
      node,
    ]
  }

  const bgCommands = computed(() => backgroundTaskCommands(ctx.chat.messages.value))
  const plan = computed(() => latestPlan(ctx.chat.messages.value))
  // A plan step only spins while a turn is running; otherwise it says it is
  // waiting on the person (an unanswered ask_user) or that the work stopped.
  const planLive = computed(() => ctx.chat.isLoading.value || ctx.chat.isRemoteStreaming.value)
  const planAwaiting = computed(() => planAwaitingUser(ctx.chat.messages.value))
  // The tests strip also shows for a read-only viewer (watching is not editing);
  // the files strip does not (committing is editor work). Popups hide the card.
  const showTests = computed(() => {
    const nativeTests = ctx.props.nativeTests
    return (
      ctx.prefs.testsBarVisible.value &&
      (nativeTests
        ? nativeTests.visible
        : shouldShowTestsBar(ctx.tests.testsRun.value, ctx.tests.testsList.value))
    )
  })
  const showFiles = computed(() => {
    const pendingFiles = ctx.git.pendingFiles.value
    return ctx.props.canEdit !== false && pendingFiles != null && pendingFiles.length > 0
  })
  const workVisible = computed(() =>
    isWorkVisible({
      commandMenu: ctx.composer.commandMenu.value,
      modelPicker: ctx.composer.modelPicker.value,
      effortPicker: ctx.composer.effortPicker.value,
      panelOverlay: ctx.overlay.panelOverlay.value,
      plan: plan.value,
      backgroundTasks: ctx.chat.backgroundTasks.value,
      showTests: showTests.value,
      showFiles: showFiles.value,
    }),
  )

  let deniedFlashTimer: ReturnType<typeof setTimeout> | undefined

  return {
    cardEventToSystemCard,
    timeline,
    plan,
    renderedTimeline,
    withTimelineTimestamp,
    shownTimestampIds,
    staleAnonymousLimit,
    isViewerAccessDenied,
    viewerDeniedFlash,
    visibleMessages,
    computeSettingsList,
    queuedMessages,
    workVisible,
    planLive,
    planAwaiting,
    showTests,
    showFiles,
    bgCommands,
    effects: {
      1: () => {
        // Clear the viewer-denial flash after a few seconds; each change while
        // denied restarts it.
        const run = (): void => {
          if (deniedFlashTimer) {
            clearTimeout(deniedFlashTimer)
            deniedFlashTimer = undefined
          }
          if (!isViewerAccessDenied.value) return
          deniedFlashTimer = setTimeout(() => {
            viewerDeniedFlash.value = false
          }, 6000)
        }
        onMounted(run)
        onUnmounted(() => {
          if (deniedFlashTimer) clearTimeout(deniedFlashTimer)
        })
        watch([isViewerAccessDenied, () => ctx.chat.error.value], run, { flush: 'post' })
      },
    },
  }
}

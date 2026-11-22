/**
 * React's `chat:timeline` region of ChatPanel.tsx (lines 4882–5111): every
 * timeline derivation — the visible and queued messages, the card-event
 * conversion, the merged timeline, the rendered page, the timestamp plan, the
 * live settings list, the background-task commands and the work card's
 * visibility.
 *
 * Each derivation React recomputes with `useMemo` is a `computed` here, so it
 * follows the state it reads. The render-time state React adjusts while
 * rendering (the viewer-denial flash) is a signal, re-armed by effect 1.
 *
 * Angular cannot build a wrapping `TemplateRef` from a plain slice, so React's
 * `withTimelineTimestamp(item, node)` is exposed as its DECISION — the
 * timestamp line that goes above the item — and the per-item dispatch (U4)
 * renders `ChatTimestamp` from it before the item, inside the same
 * `ChatItemBoundary`. See the package's timeline-dispatch contract note.
 *
 * @module
 */

import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  type Signal,
  signal,
} from '@angular/core'

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
import { latestPlan } from '../../parts/plan-card.component.js'
import { ChatActivity } from './chat-activity.slice.js'
import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatGit } from './chat-git.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatPrefs } from './chat-prefs.slice.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatTips } from './chat-tips.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** Where one item's time goes on its own line, when the plan shows it. */
export interface ChatTimelineTimestampLine {
  /** Epoch milliseconds the line shows. */
  timestamp: number
  /** The line's horizontal alignment. */
  align: 'left' | 'center'
}

/** The identifiers other slices and sections read from the `chat:timeline` slice. */
export interface ChatTimelineSlice {
  /** React's mount I/O for the region: effect 1's initial run. */
  mount(): void

  /** React's `#effect chat:timeline:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** Converts one recorded card event to the system card it renders as. */
  readonly cardEventToSystemCard: (
    event: CardEvent,
    id: string,
    timestamp: number,
  ) => SystemCard | null
  /** The messages the transcript shows. */
  readonly visibleMessages: Signal<ChatMessage[]>
  /** The queued messages (anchored above the composer). */
  readonly queuedMessages: Signal<ChatMessage[]>
  /** Whether a limit error is stale (the viewer has signed in since). */
  readonly staleAnonymousLimit: Signal<boolean>
  /** Whether the error is a viewer denial. */
  readonly isViewerAccessDenied: () => boolean
  /** The viewer-denial flash flag. */
  readonly viewerDeniedFlash: Signal<boolean>
  /** The whole timeline: messages, cards, commits, activities, tips and errors. */
  readonly timeline: Signal<ChatTimelineItem[]>
  /** The page of the timeline actually rendered. */
  readonly renderedTimeline: Signal<ChatTimelineItem[]>
  /** The items whose timestamp line is shown. */
  readonly shownTimestampIds: Signal<ReadonlySet<string>>
  /**
   * The timestamp line to render above the item, or null when it carries none
   * (header-placed times render inside the item's own row).
   */
  readonly withTimelineTimestamp: (item: ChatTimelineItem) => ChatTimelineTimestampLine | null
  /** The live settings list the `/settings` card and overlay render. */
  readonly computeSettingsList: () => SettingDescriptor[]
  /** A model's display label, or its id when the catalog does not know it. */
  readonly modelLabel: (id: string) => string
  /** The latest task list (the work card's plan). */
  readonly plan: Signal<TaskListRow[]>
  /** Whether a turn is running (a plan step spins). */
  readonly planLive: Signal<boolean>
  /** Whether the plan is waiting on the person. */
  readonly planAwaiting: Signal<boolean>
  /** Whether the tests status strip is shown. */
  readonly showTests: Signal<boolean>
  /** Whether the changed-files strip is shown. */
  readonly showFiles: Signal<boolean>
  /** The commands a background task's Wait card names. */
  readonly bgCommands: Signal<ReadonlyMap<string, string>>
  /** Whether the work card is shown. */
  readonly workVisible: Signal<boolean>
}

/**
 * React's `chat:timeline` slice: the timeline and everything derived beside it.
 */
@Injectable()
export class ChatTimeline implements ChatTimelineSlice {
  /** The shared state, read for the props (the transcript's gates). */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effect in. */
  private readonly injector = inject(Injector)

  /** Clears the denial-flash timer when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The messages the transcript shows (React's `selectVisibleMessages` memo). */
  readonly visibleMessages = computed<ChatMessage[]>(() =>
    selectVisibleMessages(this.state.slice(ChatChat).messages()),
  )

  /** The queued messages, in queue order. */
  readonly queuedMessages = computed<ChatMessage[]>(() =>
    selectQueuedMessages(this.visibleMessages()),
  )

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
  readonly cardEventToSystemCard = (
    cardEvent: CardEvent,
    id: string,
    timestamp: number,
  ): SystemCard | null => {
    const models = this.state.slice(ChatModels)
    return toSystemCard(cardEvent, id, timestamp, {
      t: this.state.env.t,
      models: models.AVAILABLE_MODELS(),
      modelRegions: models.modelRegions(),
      getFactory: getCustomEventCardFactory,
      logger,
    })
  }

  /** Whether a limit the backend raised for an anonymous caller is now stale. */
  readonly staleAnonymousLimit = computed(() =>
    isStaleAnonymousLimit(this.state.slice(ChatChat).errorMeta(), this.state.props().isAnonymous),
  )

  /**
   * Whether the chat's error is a read-only viewer's access-denied refusal —
   * the red banner never renders for that, a calm gold notice flashes instead.
   *
   * @returns True when the viewer's error is an access denial.
   */
  isViewerAccessDenied(): boolean {
    const error = this.state.slice(ChatChat).error()
    return this.state.props().canEdit === false && !!error && /access denied/i.test(error)
  }

  /** React's `viewerDeniedFlash` — whether the brief view-only notice shows. */
  readonly viewerDeniedFlash = signal(this.isViewerAccessDenied())

  /** React's `deniedFlashSource` — the denial/error pair that started the flash. */
  private deniedFlashSource: { isViewerAccessDenied: boolean; error: string | null } = {
    isViewerAccessDenied: this.isViewerAccessDenied(),
    error: null,
  }

  /** The armed denial-flash timer, or null (React's effect-local timer). */
  private deniedFlashTimer: ReturnType<typeof setTimeout> | null = null

  /** Builds the unified timeline so commit cards appear at the correct position. */
  readonly timeline = computed<ChatTimelineItem[]>(() =>
    buildChatTimeline({
      visibleMessages: this.visibleMessages(),
      cardEventToSystemCard: this.cardEventToSystemCard,
      commitCards: this.state.slice(ChatGit).commitCards(),
      systemCards: this.state.slice(ChatPopups).systemCards(),
      activityCards: this.state.slice(ChatActivity).activityCards(),
      tipCards: this.state.slice(ChatTips).tipCards(),
      error: this.state.slice(ChatChat).error(),
      errorMeta: this.state.slice(ChatChat).errorMeta(),
      isStaleAnonymousLimit: this.staleAnonymousLimit(),
    }),
  )

  /**
   * A model's display label, or its id when the catalog does not know it.
   *
   * @param id - The model's id.
   * @returns The label the settings rows show.
   */
  modelLabel(id: string): string {
    return (
      this.state
        .slice(ChatModels)
        .AVAILABLE_MODELS()
        .find((model) => model.id === id)?.label || id
    )
  }

  /**
   * The live settings list for the `/settings` card. Shared by the closeable
   * overlay and the legacy inline `settings` branch, so the two never drift.
   *
   * @returns One descriptor per setting, in display order.
   */
  computeSettingsList(): SettingDescriptor[] {
    const t = this.state.env.t
    const models = this.state.slice(ChatModels)
    const sounds = this.state.slice(ChatSounds)
    const prefs = this.state.slice(ChatPrefs)
    const autoCommit = this.state.slice(ChatAutoCommit)
    const chat = this.state.slice(ChatChat)
    const soundsSummary = summarizeSounds(sounds.soundsConfig())
    const notSet = t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' })
    // A bound alias: React's local `modelLabel` closes over its catalog, so it
    // stays callable as a plain function here too.
    const modelLabel = (id: string): string => this.modelLabel(id)
    // An unset per-mode model shows what the mode ACTUALLY resolves to.
    const modeDefault = (mode: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: modelLabel(models.effectiveModelForMode(mode)) },
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
    const savedChatModel = models.savedChatModel()
    const planModel = models.planModel()
    const executeModel = models.executeModel()
    const commitModel = models.commitModel()
    const compactModel = models.compactModel()
    const serverModelDefaults = models.serverModelDefaults()
    const effortByMode = models.effortByMode()
    const effortLevel = models.effortLevel()
    return buildSettingsList({
      model: savedChatModel ? modelLabel(savedChatModel) : notSet,
      planModel: planModel ? modelLabel(planModel) : modeDefault('plan'),
      executeModel: executeModel ? modelLabel(executeModel) : modeDefault('execute'),
      commitModel: commitModel ? modelLabel(commitModel) : auxDefault(serverModelDefaults?.commit),
      compactModel: compactModel
        ? modelLabel(compactModel)
        : auxDefault(serverModelDefaults?.compact),
      mode:
        chat.mode() === 'plan'
          ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
          : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
      // Per-mode effort, shown in each mode's MODEL-NATIVE values (a fixed-
      // reasoning model shows "fixed"). Falls back to the legacy single level.
      effort: t(
        'ide.chat.settings.effortValue',
        {
          plan: (() => {
            const model = models
              .AVAILABLE_MODELS()
              .find((entry) => entry.id === models.effectiveModelForMode('plan'))
            return (
              nativeEffortName(model, effortByMode.plan ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
          execute: (() => {
            const model = models
              .AVAILABLE_MODELS()
              .find((entry) => entry.id === models.effectiveModelForMode('execute'))
            return (
              nativeEffortName(model, effortByMode.execute ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
        },
        { defaultValue: 'plan: {{plan}} · execute: {{execute}}' },
      ),
      maxLoops: String(models.currentMaxLoops()),
      autoFix: models.autoFixEnabled()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      autoCommit: isAutoCommitEnabled(autoCommit.autoCommit())
        ? t(
            'ide.chat.settings.autoCommitEvery',
            { seconds: autoCommit.autoCommit().intervalSeconds },
            { defaultValue: 'Every {{seconds}}s' },
          )
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      hooks: t('ide.chat.settings.hooksValue', undefined, {
        defaultValue: 'In project settings',
      }),
      autoApproveCommands: models.autoApproveCommandsEnabled()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      sounds: t(
        'ide.chat.settings.soundsSummary',
        { enabled: soundsSummary.enabled, total: soundsSummary.total },
        { defaultValue: '{{enabled}} of {{total}} events enabled' },
      ),
      timestamps: prefs.timestampsVisible()
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
    })
  }

  /** The page of the timeline actually mounted (the newest `maxVisibleItems`). */
  readonly renderedTimeline = computed<ChatTimelineItem[]>(() => {
    const timeline = this.timeline()
    const maxVisibleItems = this.state.slice(ChatScroll).maxVisibleItems()
    return timeline.length > maxVisibleItems ? timeline.slice(-maxVisibleItems) : timeline
  })

  /** Each rendered item's timestamp slot, in order (null when it carries none). */
  private readonly timestampSlots = computed(() => this.renderedTimeline().map(timestampSlotFor))

  /** The rendered items' timestamp slots, keyed by item id. */
  private readonly timestampSlotById = computed(
    () =>
      new Map(this.timestampSlots().flatMap((slot) => (slot ? [[slot.id, slot] as const] : []))),
  )

  /** The ids whose timestamp the plan shows. */
  readonly shownTimestampIds = computed<ReadonlySet<string>>(() =>
    planChatTimestamps(this.timestampSlots(), {
      visible: this.state.slice(ChatPrefs).timestampsVisible(),
      now: this.state.slice(ChatPrefs).minuteNow(),
      locale: this.state.env.locale(),
    }),
  )

  /**
   * Puts the item's time on its own line above a Synthase reply or an event
   * card, when the timestamp plan shows it. Header-placed times render inside
   * the item's own row.
   *
   * @param item - The timeline item being rendered.
   * @returns The line to render above the item, or null for none.
   */
  readonly withTimelineTimestamp = (item: ChatTimelineItem): ChatTimelineTimestampLine | null => {
    const id = item.kind === 'message' ? item.msg.id : item.card.id
    const slot = this.timestampSlotById().get(id)
    if (!slot || slot.placement !== 'line' || !this.shownTimestampIds().has(id)) return null
    return { timestamp: slot.timestamp, align: slot.align }
  }

  /** The commands a background task's Wait card names. */
  readonly bgCommands = computed<ReadonlyMap<string, string>>(() =>
    backgroundTaskCommands(this.state.slice(ChatChat).messages()),
  )

  /** The latest task list (the work card's plan). */
  readonly plan = computed<TaskListRow[]>(() => latestPlan(this.state.slice(ChatChat).messages()))

  /** Whether a turn is running (a plan step spins). */
  readonly planLive = computed(
    () => this.state.slice(ChatChat).isLoading() || this.state.slice(ChatChat).isRemoteStreaming(),
  )

  /** Whether the plan is waiting on the person (an unanswered ask_user). */
  readonly planAwaiting = computed(() => planAwaitingUser(this.state.slice(ChatChat).messages()))

  /** Whether the tests status strip is shown (a viewer may watch tests run). */
  readonly showTests = computed(() => {
    const nativeTests = this.state.props().nativeTests
    return (
      this.state.slice(ChatPrefs).testsBarVisible() &&
      (nativeTests
        ? nativeTests.visible
        : shouldShowTestsBar(
            this.state.slice(ChatTests).testsRun(),
            this.state.slice(ChatTests).testsList(),
          ))
    )
  })

  /** Whether the changed-files strip is shown (committing is editor work). */
  readonly showFiles = computed(() => {
    const pendingFiles = this.state.slice(ChatGit).pendingFiles()
    return this.state.props().canEdit !== false && pendingFiles != null && pendingFiles.length > 0
  })

  /** Whether the work card is shown (popups hide it). */
  readonly workVisible = computed(() => {
    const composer = this.state.slice(ChatComposer)
    return isWorkVisible({
      commandMenu: composer.commandMenu(),
      modelPicker: composer.modelPicker(),
      effortPicker: composer.effortPicker(),
      panelOverlay: this.state.slice(ChatOverlay).panelOverlay(),
      plan: this.plan(),
      backgroundTasks: this.state.slice(ChatChat).backgroundTasks(),
      showTests: this.showTests(),
      showFiles: this.showFiles(),
    })
  })

  /** Wires the scroll slice's "are older items hidden above?" probe. */
  constructor() {
    // React's `useCommittedRef` keeps this probe current during render; a
    // closure over the computed does the same at call time.
    this.state.slice(ChatScroll).hasHiddenEarlierRef.current = () =>
      this.timeline().length > this.state.slice(ChatScroll).maxVisibleItems()
    this.destroyRef.onDestroy(() => {
      if (this.deniedFlashTimer) clearTimeout(this.deniedFlashTimer)
    })
  }

  /**
   * Mirrors React's render-time denial/error pair and (re-)arms the flash.
   */
  private syncViewerDeniedFlash(): void {
    const denied = this.isViewerAccessDenied()
    const error = this.state.slice(ChatChat).error()
    if (
      this.deniedFlashSource.isViewerAccessDenied !== denied ||
      this.deniedFlashSource.error !== error
    ) {
      this.deniedFlashSource = { isViewerAccessDenied: denied, error }
      if (denied) this.viewerDeniedFlash.set(true)
    }
    if (this.deniedFlashTimer) {
      clearTimeout(this.deniedFlashTimer)
      this.deniedFlashTimer = null
    }
    if (!denied) return
    this.deniedFlashTimer = setTimeout(() => {
      this.deniedFlashTimer = null
      this.viewerDeniedFlash.set(false)
    }, 6000)
  }

  /** React's mount I/O for the region: effect 1's initial run. */
  mount(): void {
    this.syncViewerDeniedFlash()
  }

  /** React's `#effect chat:timeline:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        void this.isViewerAccessDenied()
        void this.state.slice(ChatChat).error()
        if (skip) return
        this.syncViewerDeniedFlash()
      })
    },
  }
}

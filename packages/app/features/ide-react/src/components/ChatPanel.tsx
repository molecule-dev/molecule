/**
 * AI chat panel — Claude Code-style.
 *
 * Features:
 * - Conversation history dropdown with search + new chat
 * - Markdown rendering for assistant messages
 * - Thinking block with toggle (when backend sends thinking events)
 * - Compact tool-call rows (see ToolCallCard)
 * - @ file mention: type @ to attach a project file as context
 * - / command menu: /clear clears history
 * - Auto-resizing textarea (grows up to 200 px)
 * - Voice dictation via Web Speech API (hidden when unsupported)
 * - Commit button at bottom of messages; commit records appear inline
 * - Escape: close menus or abort the active stream
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type {
  CardEvent,
  ChatStreamEvent,
  ContextCompaction,
  ContextUsage,
} from '@molecule/app-ai-chat'
import type { AppModelDefinition } from '@molecule/app-ai-models'
import { formatTokenCount, partitionByDeprecation } from '@molecule/app-ai-models'
import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import {
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '@molecule/app-ai-voice'
import type {
  Activity,
  IdeClientAction,
  ReportResult,
  ShareLinkResult,
  ShareRole,
  TestFailure,
  TestSelection,
} from '@molecule/app-ide-panel-logic'
import {
  ACCEPTED_FILE_TYPES,
  allowanceResetCountdown,
  APP_VERSION,
  AUTO_COMMIT_DISABLED,
  autoCommitReducer,
  buildShareUrl,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  DEFAULT_SHARE_ROLE,
  fileToBase64,
  formatReportConfirmation,
  formatSize,
  getChatTimestampsVisible,
  getCustomEventCardFactory,
  isAutoCommitArmed,
  isAutoCommitEnabled,
  LOAD_EARLIER_THRESHOLD_PX,
  MAX_ATTACHMENT_SIZE,
  NOTICE_TONE,
  panelOverlayHeading,
  planChatTimestamps,
  relativeTime,
  resolveAutoCommitSeconds,
  setChatTimestampsVisible,
  SHARE_ROLES,
  streamingActivityLabel,
  TIMELINE_ITEM_GAP,
  USER_ACCENT_STYLE,
} from '@molecule/app-ide-panel-logic'
import type {
  ActivityCardEntry,
  AddSystemCardOptions,
  AttachedFile,
  ChatTimelineItem,
  CommandId,
  CommandMenu,
  CommitCard,
  ConversationSummary,
  EffortLevel,
  EffortMode,
  EffortPicker,
  FileEntry,
  FilePicker,
  ModelMode,
  ModelPicker,
  ModelSortColumn,
  ScriptInfo,
  ScriptRunResult,
  SettingDescriptor,
  SkillInfo,
  SortDirection,
  SoundEventType,
  SoundsConfig,
  SpeechRecognitionConstructor,
  SystemCard,
  TipCardEntry,
} from '@molecule/app-ide-panel-logic/panels'
import {
  AUTO_FIX_IDLE,
  autoFixCountdownReducer,
  availableModelRegions,
  buildChatTimeline,
  buildFileMentionBlock,
  buildHelpText,
  buildNewSkillTemplate,
  buildSettingsList,
  cachedPromptTokens,
  cardEventToSystemCard as toSystemCard,
  cardSegmentsAround,
  chatConversationStorageKey,
  ChatDictationController,
  chatDraftStorageKey,
  ChatTestsController,
  collectUndoTargets,
  COMMAND_CATEGORIES,
  type CommandDef,
  commandDescription,
  COMMANDS,
  composerKeyAction,
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  defaultEffortForModel,
  effectiveModeModelId,
  effortModeStatusLine,
  effortOptionsForModel,
  effortPickerVisibleOptions,
  ENTRY_TIP,
  estimateTurnTokens,
  filterCommandMenu,
  filterModelsByPickerQuery,
  findScriptByName,
  formatRunOutput,
  formatTokenTotal,
  getTestsBarVisible,
  initialUndoneToolCallIds,
  isRegistryCommandId,
  isStaleAnonymousLimit,
  isWorkVisible,
  limitRefusalFromError,
  loadProjectSkills,
  matchesSideChannelCommand,
  mergeContextHistory,
  mergeSoundsConfig,
  MIC_ENGINE_STORAGE_KEY,
  missingRequiredParams,
  MODEL_REGION_FLAGS,
  modelHasPeakPricing,
  modelPeakWindowLabels,
  modelPickerRowView,
  modelRegionLabel,
  modelUsageRate,
  modeSettingKey,
  nativeEffortName,
  newSkillPath,
  parseChatProjectSettings,
  parseEffortCommand,
  parseModelModeCommand,
  parseSkillMeta,
  parseSoundsConfig,
  pickerCurrentModelId,
  pickIdleTip,
  pickRelevantSkill,
  planAwaitingUser,
  playTone,
  rankFileMentionEntries,
  recentUserText,
  resolveEffortArg,
  resolveModelQuery,
  resolveRemovedModelFallback,
  routeComposerSubmit,
  runSucceeded,
  selectQueuedMessages,
  selectVisibleMessages,
  setTestsBarVisible,
  shouldShowIdleTip,
  shouldShowTestsBar,
  sortModels,
  SOUND_EVENTS,
  SOUND_MODE_LABELS,
  soundEventDescription,
  soundEventLabel,
  soundModeLabel,
  SOUNDS_STORAGE_KEY,
  streamEventEffects,
  summarizeSounds,
  timestampSlotFor,
  TIP_IDLE_MS,
  TIP_MIN_MESSAGES,
  tipText,
  upgradeContextFromError,
  VIEWER_TIP,
  viewerCommandAllowed,
  WEB_SPEECH_DEAD_STORAGE_KEY,
  wrapIdx,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_PRODUCT_NAME,
  useAIModels,
  useChat,
  useHttpClient,
  useThemeMode,
  useTranslation,
} from '@molecule/app-react'
import { useCommittedRef, useEffectEvent, useStableCallback } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'
import { SelectField } from '@molecule/app-ui-react/elements'

import { useChatTimestampsVisible, useMinuteNow } from '../hooks/useChatTimestampsVisible.js'
import { useTestsBarVisible } from '../hooks/useTestsBarVisible.js'
import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { ChatPanelProps } from '../types.js'
import { ActivityCard } from './ActivityCard.js'
import { AutoCommitBadge } from './AutoCommitBadge.js'
import { backgroundTaskCommands, BackgroundTaskCommandsContext } from './background-task-context.js'
import { BackgroundTasksStrip } from './BackgroundTasksStrip.js'
import { CommitCardItem } from './chat-panel/CommitCardItem.js'
import type { MessageItemProps } from './chat-panel/MessageItem.js'
import { MessageItem } from './chat-panel/MessageItem.js'
import { NoticeCard, renderCardSegment, ResourceLimitBanner } from './chat-panel/NoticeCard.js'
import { RegionFlag } from './chat-panel/RegionFlag.js'
import { ChatItemBoundary } from './ChatItemBoundary.js'
import { ChatTimestamp } from './ChatTimestamp.js'
import { ContextUsageIndicator } from './ContextUsageIndicator.js'
import { DockStrip } from './DockStrip.js'
import { HelpCard } from './HelpCard.js'
import { Icon } from './Icon.js'
import { latestPlan, PlanCard } from './PlanCard.js'
import { RelevantSkillSuggestion } from './RelevantSkillSuggestion.js'
import { ReportModal } from './ReportModal.js'
import { ScriptsCard } from './ScriptsCard.js'
import { SettingsCard } from './SettingsCard.js'
import { ShareModal } from './ShareModal.js'
import { SkillsCard } from './SkillsCard.js'
import { StreamingIndicator } from './StreamingIndicator.js'
import { TestsCard } from './TestsCard.js'
import { TestStatusBar } from './TestStatusBar.js'
import { TipCard } from './TipCard.js'
import { WorkCard } from './WorkCard.js'

// The row components now live in ./chat-panel/; re-export these two so this
// module's surface (and every importer of them here) is unchanged.
export { CommitCardItem }
export type { MessageItemProps }

const logger = getLogger('chat-panel')

// Processing region for a model, as an arbitrary region code ('us', 'cn',
// potentially 'eu' etc. later — deliberately NOT a closed union). The server
// reads `project.settings.modelRegions` (a Record<modelId, regionCode>) and
// dispatches to the provider it registered for that region; unknown codes fall
// back to the model's default region.
type ModelRegion = string

// ---------------------------------------------------------------------------
// Sound types
// ---------------------------------------------------------------------------
// The sound vocabulary (SOUND_EVENTS, SoundEventType/SoundMode, the English
// SOUND_MODE_LABELS and the soundEventLabel/soundEventDescription/
// soundModeLabel translators) lives in @molecule/app-ide-panel-logic's
// chat-settings-utilities, so every framework's panel shares one table and
// every label is a literal t() call the i18n gate can verify. The same module
// owns the mode cycle, the stored-preference parse, the focus-aware
// shouldPlaySound gate and the notification tone (playTone).

interface SoundsPicker {
  selectedIdx: number
}

// ---------------------------------------------------------------------------
// Helpers — formatting + activity labels live in `@molecule/app-ide-panel-logic`
// (chat-format-utilities / chat-ui-constants), shared with the non-React ports.
// ---------------------------------------------------------------------------

// estimateTurnTokens (and the per-message estimateStreamTokens it sums) live in
// ./chat-stream-utilities.js — they run on every stream flush, so each tool-input's
// length is cached there to stay O(1) per call (re-stringifying every write_file's
// full content per flush was an O(n²) freeze).

// ---------------------------------------------------------------------------
// ChatInner — owns useChat, messages, input, commit
// ---------------------------------------------------------------------------

/** Props for the inner chat surface (timeline + composer), remounted per conversation. */
export interface ChatInnerProps {
  projectId: string
  endpoint: string
  initialMessage?: string
  onInitialMessageSent?: () => void
  isPro?: boolean
  /** Whether the viewer is anonymous — see {@link ChatPanelProps.isAnonymous}. */
  isAnonymous?: boolean
  /** Whether the user may write shared project state — see {@link ChatPanelProps.canEdit}. */
  canEdit?: boolean
  /** Whether team messages are allowed — see {@link ChatPanelProps.canSendTeamMessages}. */
  canSendTeamMessages?: boolean
  /** Whether the user may manage public share links — see {@link ChatPanelProps.canShare}. */
  canShare?: boolean
  /** Whether the share dialog shows its links — see {@link ChatPanelProps.shareLinksAllowed}. */
  shareLinksAllowed?: boolean
  /** Re-fetches the share dialog's links — see {@link ChatPanelProps.shareLinksRefreshSignal}. */
  shareLinksRefreshSignal?: number
  /** Host sections inside the share dialog — see {@link ChatPanelProps.shareModalContent}. */
  shareModalContent?: ReactNode
  /** Host-supplied upgrade/sign-in CTA builder — see {@link ChatPanelProps.buildUpgradeCta}. */
  buildUpgradeCta?: ChatPanelProps['buildUpgradeCta']
  /** Host-supplied `/help` upgrade section builder — see {@link ChatPanelProps.buildHelpUpgradeSection}. */
  buildHelpUpgradeSection?: ChatPanelProps['buildHelpUpgradeSection']
  activeFile?: string | null
  openTabs?: string[]
  onFileOpen?: (path: string, opts?: { focus?: boolean }) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  onFileRevert?: (path: string, content: string) => Promise<void>
  onFileChange?: (path: string, content: string) => void
  onFileDeleted?: (path: string) => void
  onCommit?: () => void
  onConversationId?: (id: string) => void
  /** Called when an inline activity card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: Activity) => void
  /** See {@link ChatPanelProps.onRenderError}. */
  onRenderError?: ChatPanelProps['onRenderError']
  /** Called when a user avatar or author name in the chat timeline is clicked — see {@link ChatPanelProps.onProfileClick}. */
  onProfileClick?: ChatPanelProps['onProfileClick']
  /** The signed-in user's id — stamps author-less rows' identity. See {@link ChatPanelProps.currentUserId}. */
  currentUserId?: string
  /** Called on the `ready_to_build` stream event — discovery is done; boot the sandbox. */
  onReadyToBuild?: () => void
  /** True after the plan streams but while the sandbox is still booting (pre-kickoff) — drives the chat "waiting for environment" indicator. */
  awaitingSandboxBoot?: boolean
  /** Called on the `client_action` stream event — the agent wants a preview reload/navigate or a file opened. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done/error — host keeps the boot view up until the during-boot plan stream completes. */
  onTurnComplete?: () => void
  /** Called when the chat's loading state changes — see {@link ChatPanelProps.onLoadingChange}. */
  onLoadingChange?: (loading: boolean) => void
  /** Navigates the preview to a route path on a chat link click — see {@link ChatPanelProps.onNavigatePreview}. */
  onNavigatePreview?: (path: string) => void
  /** Registers the broadcast-chat-event handler with the host — see {@link ChatPanelProps.onRegisterPushHandler}. */
  onRegisterPushHandler?: ChatPanelProps['onRegisterPushHandler']
  /** Registers the history reconcile with the host — see {@link ChatPanelProps.onRegisterHistoryReconcile}. */
  onRegisterHistoryReconcile?: ChatPanelProps['onRegisterHistoryReconcile']
  /** Changing this value submits the current input draft (used by the prompt→chat morph). */
  autoSubmitSignal?: number
  /** Changing this value opens the `/settings` view (used by the header gear button). */
  openSettingsSignal?: number
  /** Shows a "manage your own models" row in the `/model` picker — see {@link ChatPanelProps.onManageCustomModels}. */
  onManageCustomModels?: (context?: { mode?: 'plan' | 'execute' }) => void
  /** Bump to re-read persisted model/settings — see {@link ChatPanelProps.modelSelectionSignal}. */
  modelSelectionSignal?: number
  /** Changing this value opens the `/report` bug-report modal (used by the header bug button). */
  openReportSignal?: number
  /** Changing this value opens the `/share` link modal (used by the header share button). */
  openShareSignal?: number
  /** Seeds the input with this text on mount (prompt→chat morph). */
  initialInputValue?: string
  pendingMessage?: string
  pendingMessageKey?: number
  /** When true, the pending message is sent on the user's behalf (e.g. the post-boot build kickoff) and is NOT rendered as a user bubble — phase cards convey what's happening instead. */
  pendingMessageSuppressUser?: boolean
  /** When true, the pending message was directly requested by the user (a "Fix with AI" button) — it bypasses (and clears) a prior user Stop. See {@link ChatPanelProps.pendingMessageUserInitiated}. */
  pendingMessageUserInitiated?: boolean
  /** File path edited by the user in the editor — triggers auto-deletion of queued autofix messages referencing this file. */
  userEditedFile?: string
  userEditedFileKey?: number
  gitStatusTick?: number
  /** True during the initial discovery phase — suppresses the onboarding/idle tip cards so no blue tip shows during discovery (mvp B1). */
  discovery?: boolean
  /** Signed-in user's avatar shown beside their own messages (SOC1) — see {@link ChatPanelProps.userAvatar}. */
  userAvatar?: string | null
  /** Display name of the AI coding agent — see {@link ChatPanelProps.agentName}. */
  agentName?: string
  /** Display name of the host product / IDE — see {@link ChatPanelProps.productName}. */
  productName?: string
  /** Host app/build version for /version — see {@link ChatPanelProps.version}. */
  version?: string
  /** Host-specific slash commands merged into the menu — see {@link ChatPanelProps.extraCommands}. */
  extraCommands?: readonly CommandDef[]
  /** Command-menu "Report a problem" URL — see {@link ChatPanelProps.feedbackUrl}. */
  feedbackUrl?: string
  /** Lists the project's tests for the Tests bar — see {@link ChatPanelProps.listTests}. */
  listTests?: ChatPanelProps['listTests']
  /** Runs the selected tests, streaming events — see {@link ChatPanelProps.runTests}. */
  runTests?: ChatPanelProps['runTests']
  /** Every test run in the project, streamed — see {@link ChatPanelProps.watchTestRuns}. */
  watchTestRuns?: ChatPanelProps['watchTestRuns']
  nativeTests?: ChatPanelProps['nativeTests']
  /** Whether this viewer may run tests — see {@link ChatPanelProps.canRunTests}. */
  canRunTests?: boolean
  /** Whether the environment that runs them is up — see {@link ChatPanelProps.testsAvailable}. */
  testsAvailable?: boolean
  /** Skips the executor's running tool call — see {@link ChatPanelProps.skipToolCall}. */
  skipToolCall?: ChatPanelProps['skipToolCall']
}

/**
 * Inner chat component that owns useChat state, message rendering, and input handling.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered chat inner component.
 */
function ChatInner({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  isPro,
  isAnonymous,
  canEdit,
  canSendTeamMessages = true,
  canShare,
  shareLinksAllowed,
  shareLinksRefreshSignal,
  shareModalContent,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  activeFile,
  openTabs,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onFileChange,
  onFileDeleted,
  onCommit,
  onConversationId,
  onActivityClick,
  onRenderError,
  onProfileClick,
  currentUserId,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
  onLoadingChange,
  onNavigatePreview,
  onRegisterPushHandler,
  onRegisterHistoryReconcile,
  autoSubmitSignal,
  openSettingsSignal,
  onManageCustomModels,
  modelSelectionSignal,
  openReportSignal,
  openShareSignal,
  initialInputValue,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  pendingMessageUserInitiated,
  userEditedFile,
  userEditedFileKey,
  gitStatusTick: externalGitStatusTick,
  discovery,
  userAvatar,
  agentName = DEFAULT_AGENT_NAME,
  productName = DEFAULT_PRODUCT_NAME,
  version,
  extraCommands,
  listTests,
  runTests,
  watchTestRuns,
  nativeTests,
  canRunTests,
  testsAvailable,
  skipToolCall,
  // feedbackUrl: prop kept for back-compat (callers still pass it), but no longer
  // consumed here — its only use was the command-menu footer link removed in P3-21.
}: ChatInnerProps): JSX.Element {
  // #region chat:env
  const { t, locale } = useTranslation()
  const cm = getClassMap()
  // Share-link management may be gated ABOVE canEdit by the host (molecule.dev
  // mints/lists/revokes at admin+) — every /share surface below uses this, so
  // an editor without the capability gets no dead modal.
  const transcriptOnly = canEdit === false && canSendTeamMessages === false
  const shareAllowed = canShare ?? canEdit !== false
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  // Phone-width / touch-first branches: popovers cap with dvh, hover-revealed
  // controls become visible-by-default, and compact hit areas grow — all scoped
  // so fine-pointer desktop rendering is byte-identical.
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  // One cap for every popup anchored above the composer (command menu, model /
  // sounds pickers, panel overlay, file picker). Phones use dvh — NOT vh, which
  // ignores the collapsing browser chrome and the on-screen keyboard, letting a
  // 70vh popup extend under both. 50dvh leaves the composer + a context sliver
  // visible; 420px bounds it on small tablets.
  const popupMaxHeight = isNarrow ? 'min(50dvh, 420px)' : '70vh'
  const http = useHttpClient()
  // If there's already a conversation (conversationId in the URL), always load
  // history — even when initialMessage is set. This prevents a refresh from
  // re-sending the initial prompt instead of restoring the existing conversation.
  const hasConversation = endpoint.includes('conversationId=')
  const conversationId = endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null
  // Kept in sync with `conversationId` so the (memoized) pushed-event handler reads the
  // current conversation without becoming a stale closure — see applyPushedStreamEvent.
  const conversationIdRef = useRef(conversationId)
  // #effect chat:env:1
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  // #endregion chat:env
  // #region chat:stream
  // Ref for sounds config so the onStreamEvent callback always reads the latest value.
  const soundsConfigRef = useRef<SoundsConfig>({ ...DEFAULT_SOUNDS_CONFIG })
  // #endregion chat:stream

  // #region chat:context-usage
  // ── Context usage tracking (ring indicator) ─────────────────────────────
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null)
  const [contextHistory, setContextHistory] = useState<ContextUsage[]>([])
  const [contextCompactions, setContextCompactions] = useState<ContextCompaction[]>([])
  // A different conversation source starts with an empty ring: reset while
  // rendering (React's pattern for state that follows a prop), before the
  // restore below refetches for it.
  const [contextSource, setContextSource] = useState({ endpoint, hasConversation, http })
  if (
    contextSource.endpoint !== endpoint ||
    contextSource.hasConversation !== hasConversation ||
    contextSource.http !== http
  ) {
    setContextSource({ endpoint, hasConversation, http })
    setContextUsage(null)
    setContextHistory([])
    setContextCompactions([])
  }

  // Restore context usage from the history endpoint on mount. Retries a few
  // times on failure: this used to be one-shot, so a single transient error at
  // mount (an API deploy restart, a rate-limit blip) silently cost the context
  // ring for the entire session — the state only ever refills from the next
  // turn's `done` event (observed live 2026-08-29: ring gone, server data fine,
  // reload fixed it).
  // #effect chat:context-usage:1
  useEffect(() => {
    if (!hasConversation) return
    let cancelled = false
    let attempt = 0
    const load = (): void => {
      http
        .get<{
          contextUsage?: ContextUsage
          contextHistory?: ContextUsage[]
          compactions?: ContextCompaction[]
        }>(endpoint)
        .then((res) => {
          if (cancelled) return
          const restored = res.data.contextUsage
          if (restored)
            setContextUsage((current) => {
              if (!current) return restored
              return mergeContextHistory([restored], [current]).at(-1) ?? current
            })
          setContextHistory((current) =>
            mergeContextHistory(res.data.contextHistory ?? [], current),
          )
          setContextCompactions((current) => {
            const entries = new Map(
              [...(res.data.compactions ?? []), ...current].map((entry) => [entry.at, entry]),
            )
            return [...entries.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-32)
          })
        })
        .catch((_error) => {
          // Transient failure — retry with backoff (bounded); after the budget,
          // the next turn's done event repopulates the ring.
          if (cancelled || attempt >= 3) return
          attempt++
          setTimeout(load, attempt * 4000)
        })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [endpoint, hasConversation, http])
  // #endregion chat:context-usage

  // #region chat:auto-fix
  // ── Auto-fix countdown state ──────────────────────────────────────────────
  // After the AI finishes, if verification found errors, show a countdown
  // before auto-sending a fix message. User can cancel/pause. The pending
  // errors and the countdown are one pure state machine
  // (autoFixCountdownReducer in @molecule/app-ide-panel-logic).
  const [autoFixState, dispatchAutoFix] = useReducer(autoFixCountdownReducer, AUTO_FIX_IDLE)
  const autoFixCountdown = autoFixState.countdown
  const autoFixIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Deferred pending message — stores auto-fix messages (preview errors, stuck)
  // that arrived while the AI was streaming. Sent after streaming ends, unless
  // verification already caught the same errors (to avoid duplicates).
  const deferredPendingRef = useRef<string | null>(null)
  // Tracks whether a deferred pending message should suppress its user bubble
  // (mirrors pendingMessageSuppressUser for the deferred-send path).
  const deferredPendingSuppressRef = useRef(false)
  // Mirrors pendingMessageUserInitiated for the deferred-send path, so a user's
  // own "Fix with AI" request keeps its stop-bypassing intent when deferred.
  const deferredPendingUserInitiatedRef = useRef(false)

  // Clear countdown interval on unmount
  // #effect chat:auto-fix:1
  useEffect(
    () => () => {
      if (autoFixIntervalRef.current) clearInterval(autoFixIntervalRef.current)
    },
    [],
  )
  // #endregion chat:auto-fix

  // #region chat:stream
  // Ref so the stream-event callback can push activity cards without depending
  // on the state setter. addActivityCard is declared further down (it reads the
  // chat's messages, which useChat — fed this callback — returns), so the ref is
  // filled once, in the first render, with that stable callback.
  const addActivityCardRef = useRef<((activity: Activity) => void) | null>(null)
  // (A teammate's broadcast `card` / `message` events are ingested by
  // useChat.applyRemoteEvent — applyPushedStreamEvent routes every pushed frame
  // through it before this panel's handler runs, so no append refs live here.)
  // True only while applying a teammate's broadcast through handleStreamEvent (see
  // applyPushedStreamEvent). addActivityCard reads it to mark a pushed activity card
  // `received` so this viewer renders but never re-persists it (activity cards keep their
  // own persisted store). Transcript cards (model/mode/skills/custom) are server-recorded
  // card-messages: a pushed one is appended ephemerally (never persisted by the client), so
  // it needs no `received` flag.
  const applyingPushedRef = useRef(false)
  // Stable callbacks that call the host's handlers of the latest committed render, so
  // handleStreamEvent (memoized) always calls the current ones.
  const notifyReadyToBuild = useStableCallback(() => onReadyToBuild?.())
  const forwardClientAction = useStableCallback((action: IdeClientAction) =>
    onClientAction?.(action),
  )
  const notifyTurnComplete = useStableCallback(() => onTurnComplete?.())

  const handleStreamEvent = useCallback(
    (event: { type: string; usage?: Partial<ContextUsage>; [key: string]: unknown }) => {
      const applyingPushed = applyingPushedRef.current
      // Capture verification errors to trigger countdown after stream ends —
      // SENDER-ONLY: a pushed frame from a teammate's turn must not arm this
      // client's auto-fix (the sender's client owns the follow-up; two clients
      // arming it would double-send the fix).
      // Also drop any deferred preview error — verification's countdown handles it.
      if (event.type === 'verification_result' && event.status === 'error') {
        if (!applyingPushed && event.output) deferredPendingRef.current = null
        dispatchAutoFix({
          type: 'verificationResult',
          status: 'error',
          output: event.output ? (event.output as string) : undefined,
          categories: (event.categories as string[]) ?? [],
          changedPaths: (event.changedPaths as string[]) ?? [],
          applyingPushed,
        })
      }
      // Clear pending verification if a new verification comes back clean
      if (event.type === 'verification_result' && event.status === 'ok') {
        dispatchAutoFix({ type: 'verificationResult', status: 'ok', applyingPushed })
      }
      // When stream ends, start countdown if there are pending verification errors
      if (event.type === 'done') {
        dispatchAutoFix({ type: 'done' })
      }
      // NOTE: pushed `card` / `message` events are ingested into the message store by
      // useChat.applyRemoteEvent (applyPushedStreamEvent calls it before this handler),
      // through the same append helpers as an own stream — no panel-side append here.
      // Apply every effect the event produces, in order (usage, compaction, activity,
      // ready-to-build, client action, turn complete, notification sound).
      for (const effect of streamEventEffects(event, {
        soundsConfig: soundsConfigRef.current,
        hasFocus: document.hasFocus(),
        applyingPushed,
      })) {
        switch (effect.type) {
          case 'contextUsage':
            setContextUsage((previous) => {
              if (!previous) return effect.usage
              if (effect.usage.requestId || effect.usage.at)
                return mergeContextHistory([previous], [effect.usage]).at(-1) ?? effect.usage
              return effect.done ? { ...previous, ...effect.usage } : effect.usage
            })
            setContextHistory((previous) => mergeContextHistory(previous, [effect.usage]))
            break
          case 'compaction':
            setContextCompactions((previous) =>
              [
                ...previous.filter((item) => item.at !== effect.compaction.at),
                effect.compaction,
              ].slice(-32),
            )
            break
          // Captured outbound side effect (email/sms/push/webhook/channel) — push an
          // inline activity card into the timeline. Non-text card, mirroring how
          // system cards are appended.
          case 'activityCard':
            addActivityCardRef.current?.(effect.activity)
            break
          // Discovery finished and the server selected a starting point — boot the
          // sandbox. SENDER-ONLY (the effect is only produced for the sender).
          case 'readyToBuild':
            notifyReadyToBuild()
            break
          // The agent asked the IDE to reload/navigate the preview, open a file, or drive
          // the preview bridge. Forward to the host (Workspace); not rendered in the
          // transcript.
          case 'clientAction':
            forwardClientAction(effect.action)
            break
          // Turn finished (done OR error) — let the host know. Used to keep the boot
          // view up until the parallel during-boot plan stream completes, so the
          // panel swap can't cut it off. Firing on error too prevents a failed
          // stream from stranding the boot view forever.
          case 'turnComplete':
            notifyTurnComplete()
            break
          case 'playSound':
            playTone(effect.variant)
            break
        }
      }
      // NOTE: the `model` (planner→executor) + `mode` ("Building your app") transcript markers
      // are no longer derived here. The server now RECORDS them (and the skills + custom
      // notices) as card-messages in the ONE transcript via recordCard, emitted as `card`
      // events and rendered from `cardEvent` (see cardEventToSystemCard) — so they persist and
      // reload identically, with no client-side "last shown" heuristic. The raw `mode` event
      // still drives the phase STATE (useChat's setMode); it just no longer spawns a card.
    },
    [notifyReadyToBuild, forwardClientAction, notifyTurnComplete],
  )
  // #endregion chat:stream

  // #region chat:auto-fix
  // Countdown timer effect — ticks down and auto-sends fix message. It restarts on every
  // second the countdown moves and whenever it pauses or resumes; nothing else about the
  // countdown changes the timer.
  const sendMessageRef = useRef<
    | ((
        msg: string,
        attachments?: undefined,
        options?: { suppressUserMessage?: boolean; automatic?: boolean; askUserAnswer?: boolean },
      ) => void)
    | null
  >(null)
  // One second of the countdown has passed. The last second sends the fix message.
  const onAutoFixSecond = useEffectEvent(() => {
    const countdown = autoFixState.countdown
    if (!countdown || countdown.paused) return
    if (countdown.secondsLeft > 1) {
      dispatchAutoFix({ type: 'tick' })
      return
    }
    dispatchAutoFix({ type: 'tick' })
    // An autonomous agent-turn dispatch never fires from a read-only client.
    if (canEdit === false) return
    sendMessageRef.current?.(`Fix these issues:\n\n${countdown.output}`, undefined, {
      automatic: true,
    })
  })
  const autoFixPaused = autoFixCountdown?.paused
  const autoFixSecondsLeft = autoFixCountdown?.secondsLeft
  // #effect chat:auto-fix:2
  useEffect(() => {
    if (autoFixIntervalRef.current) {
      clearInterval(autoFixIntervalRef.current)
      autoFixIntervalRef.current = null
    }
    if (autoFixSecondsLeft === undefined || autoFixPaused || autoFixSecondsLeft <= 0) return

    autoFixIntervalRef.current = setInterval(onAutoFixSecond, 1000)

    return () => {
      if (autoFixIntervalRef.current) {
        clearInterval(autoFixIntervalRef.current)
        autoFixIntervalRef.current = null
      }
    }
  }, [autoFixPaused, autoFixSecondsLeft])

  // Auto-pause countdown when user starts typing
  const handleAutoFixPauseOnInput = useCallback(() => {
    dispatchAutoFix({ type: 'pause' })
  }, [])
  // #endregion chat:auto-fix

  // Cancel countdown when file changes arrive (AI likely fixing things in a new turn)
  // #region chat:auto-commit
  // ── Auto-commit (/autocommit) ───────────────────────────────────────────────
  // Debounce-style countdown: every file change restarts the timer; when it hits
  // zero we fire the existing /commit path, then pause until the next change so a
  // clean tree is never re-committed. State machine lives in the pure reducer.
  const [autoCommit, dispatchAutoCommit] = useReducer(autoCommitReducer, AUTO_COMMIT_DISABLED)
  // Auto-commit persistence (project.settings.autoCommitSeconds). The cadence is
  // a first-class persisted setting, not a per-session toggle: the GET effect
  // hydrates it on load and a debounced PATCH mirrors changes back. `…LoadedRef`
  // gates persistence until the server value is known (so we never blindly
  // overwrite it), and `…PersistedRef` tracks the value we believe is on the
  // server so we only PATCH genuine changes (never the value we just hydrated).
  const [autoCommitLoaded, setAutoCommitLoaded] = useState(false)
  // Live canEdit for async callbacks (the settings hydrate) that must not
  // capture a stale role from mount time.
  const readCanEdit = useEffectEvent(() => canEdit)
  const autoCommitPersistedRef = useRef<number>(0)
  const autoCommitPatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // #endregion chat:auto-commit

  // #region chat:chat
  // Filled once, in the first render, after debouncedFetchPendingFiles is defined
  // below (it depends on state declared later), with a stable callback that calls
  // the latest committed one; lets the file-change callback refresh the
  // uncommitted-files bar LIVE while a turn is still streaming.
  const debouncedFetchPendingFilesRef = useRef<(() => void) | null>(null)

  const onFileChangeWrapped = useCallback(
    (path: string, content: string) => {
      // A file changed (AI write) — restart the auto-commit countdown if armed.
      dispatchAutoCommit({ type: 'reset' })
      // Keep the uncommitted-files bar live DURING the turn — it must track
      // files as they stream in, not appear only once the turn ends.
      debouncedFetchPendingFilesRef.current?.()
      if (autoFixCountdown) {
        const norm = path.replace(/^\/workspace\//, '')
        const isRelevant = autoFixCountdown.changedPaths.some(
          (p) => p.replace(/^\/workspace\//, '') === norm,
        )
        if (isRelevant) dispatchAutoFix({ type: 'cancel' })
      }
      // Make a saved plan available as a tab, but DON'T steal focus — the plan is
      // created automatically (often while the user is watching the preview) and is
      // already streamed into the chat, so opening it quietly (no pane switch) keeps
      // the user aware without yanking them off the preview.
      const cleanPath = path.replace(/^\/workspace\//, '')
      if (cleanPath.startsWith('.agents/plans/') && onFileOpen) {
        onFileOpen(cleanPath, { focus: false })
      }
      onFileChange?.(path, content)
    },
    [onFileChange, onFileOpen, autoFixCountdown],
  )

  const {
    messages,
    isLoading,
    isRemoteStreaming,
    noteRemoteStreamEvent,
    error,
    errorMeta,
    mode,
    fastMode,
    streamingStatus,
    backgroundTasks,
    setMode,
    setFastMode,
    sendMessage,
    abort,
    clearHistory,
    editQueuedMessage,
    deleteQueuedMessage,
    clearQueuedForFile,
    applyRemoteEvent,
    reconcileHistory,
    retryCountdown,
    cancelRetry,
  } = useChat({
    endpoint,
    projectId,
    agentName,
    // A read-only viewer never issues chat POSTs (no resume/retry) — a live turn
    // is watched via pushed frames + the reconcile poll instead.
    readOnly: canEdit === false,
    // ALWAYS load history on mount. A persisted conversation MUST restore on refresh,
    // even when an initialMessage / initialInputValue is also present. The old condition
    // suppressed the load whenever a fresh message was about to be auto-sent — but on a
    // refresh, a stale `mol_initial_prompt` resurrected from localStorage seeds
    // initialInputValue, and with the conversation id absent from the endpoint that made
    // this `false`, leaving the ENTIRE conversation unloaded ("everything gone but a card
    // or two"). Suppressing the load was never necessary: useChat.loadHistory refuses to
    // overwrite a non-empty message store (it returns early when the store already holds
    // the in-flight streaming placeholder, and merely adopts the server-assigned id
    // without clobbering it), so the endpoint-flip re-fire during a fresh-prompt stream is
    // already safe. For a brand-new chat the load is a cheap no-op (empty history). So
    // always load — the existing conversation can never be silently dropped again.
    loadOnMount: true,
    onFileChange: onFileChangeWrapped,
    onConversationId,
    onStreamEvent: handleStreamEvent,
  })

  // The mode a model CHANGE should target when the user hasn't scoped one
  // explicitly (no --plan/--execute flag, no picker-mode choice): the LIVE
  // conversation mode. Discovery runs in plan mode (aiContext.mode is 'plan'
  // throughout discovery), so it maps to 'plan' — changing the model while
  // discovering/planning changes the plan model, while building the execute
  // model. This replaces the old default of writing the legacy `chatModel`
  // (which silently moved BOTH modes).
  const liveModelMode: 'plan' | 'execute' = mode === 'plan' ? 'plan' : 'execute'

  // Target for a settings PATCH that changes agent behavior (model / effort /
  // max loops / region / auto-fix / auto-approve): name the OPEN conversation so
  // the server's shared setting card lands in the transcript members are
  // actually watching (a project can hold several conversations).
  const settingsPatchUrl = useCallback(
    () =>
      `/projects/${projectId}${
        conversationIdRef.current
          ? `?conversationId=${encodeURIComponent(conversationIdRef.current)}`
          : ''
      }`,
    [projectId],
  )

  // One stable callback that calls the latest committed sendMessage: the countdown
  // effect (through sendMessageRef, filled once here) and the handlers below use it.
  const sendLatestMessage = useStableCallback(sendMessage)
  useCommittedRef(sendMessageRef, sendMessage)

  // User Stop. A stop is a user decision the platform must not overrule — so
  // beyond killing the stream (useChat.abort also records the stop client-side
  // and, via chat-abort's userInitiated flag, server-side), drop every pending
  // automatic follow-up THIS panel holds: the deferred auto-fix message and the
  // verification auto-fix countdown. Without this, the deferred-send effect
  // fired the moment the Stop flipped isLoading off — restarting the executor
  // seconds after the user explicitly stopped it.
  const handleAbort = useCallback(() => {
    deferredPendingRef.current = null
    deferredPendingSuppressRef.current = false
    deferredPendingUserInitiatedRef.current = false
    dispatchAutoFix({ type: 'reset' })
    abort()
  }, [abort])

  // Surface the chat's loading state to the host (the authoritative "agent is actively
  // building" signal). The host drives the preview's "Building your app…" overlay from this,
  // so a half-built / blank preview during a long build shows progress, not a white screen.
  const reportLoadingChange = useEffectEvent((loading: boolean) => onLoadingChange?.(loading))
  // #effect chat:chat:1
  useEffect(() => {
    reportLoadingChange(isLoading)
  }, [isLoading])

  // Ref-stable callback for ToolCallCard's onAskUserResponse — avoids breaking
  // React.memo when sendMessage's identity changes (provider/endpoint deps).
  // Suppress the optimistic user bubble: the answer is reflected in the ask_user
  // card itself (a checkmark on the chosen option, or the custom text shown
  // in-card) rather than echoed as a separate message below it.
  const handleAskUserResponse = useCallback(
    (response: string) => {
      // `askUserAnswer` resolves the pending ask_user card in the store (sets its output to
      // the answer) so the chosen option STAYS checked across the discovery→IDE remount —
      // the live selection used to live only in ephemeral component state and vanished.
      sendLatestMessage(response, undefined, {
        suppressUserMessage: true,
        askUserAnswer: true,
      })
    },
    [sendLatestMessage],
  )
  // #endregion chat:chat

  // #region chat:git
  // ── Commit ─────────────────────────────────────────────────────────────────
  const [commitState, setCommitState] = useState<{
    status: 'committing' | 'committed' | 'error'
    message?: string
  } | null>(null)
  const [pendingFiles, setPendingFiles] = useState<
    { path: string; status: string; additions?: number; deletions?: number }[] | null
  >(null)
  const [commitBarExpanded, setCommitBarExpanded] = useState(false)
  const [commitCards, setCommitCards] = useState<CommitCard[]>([])
  // #endregion chat:git
  // #region chat:scroll
  /**
   * Number of timeline items rendered in the DOM. Starts at the most recent
   * page and grows as the user scrolls toward the top of the conversation
   * (auto-load of earlier history — no button to click).
   */
  const [maxVisibleItems, setMaxVisibleItems] = useState(60)
  // ── Input focus ────────────────────────────────────────────────────────────

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  // #endregion chat:scroll

  // #region chat:undo
  // ── Undo tracking ───────────────────────────────────────────────────────────
  // Tracks which tool calls are currently in the "undone" state so /undo can
  // flip them in bulk and individual undo buttons stay in sync.
  // Initialized from persisted isUndone flags on loaded messages.
  const [undoneTcIds, setUndoneTcIds] = useState<Set<string>>(() =>
    initialUndoneToolCallIds(messages),
  )

  // Re-sync when messages load from history (e.g. after page refresh): the
  // render in which the list goes from empty to non-empty reads the persisted
  // flags. Set while rendering, React's pattern for state that follows a prop.
  const [undoSyncCount, setUndoSyncCount] = useState(messages.length)
  if (undoSyncCount !== messages.length) {
    setUndoSyncCount(messages.length)
    // Only re-sync on bulk message loads (history), not on individual stream appends
    if (undoSyncCount === 0) {
      const ids = initialUndoneToolCallIds(messages)
      if (ids.size > 0) setUndoneTcIds(ids)
    }
  }

  /** Persist undo state to the server and update local tracking. */
  const persistUndoToggle = useCallback(
    (toolCallIds: string[], undone: boolean) => {
      http.post(`/projects/${projectId}/tool-call-undo`, { toolCallIds, undone }).catch((error) => {
        // Non-critical — undo state won't survive refresh but still works in-session
        logger.warn('chat-panel: persisting tool-call undo state failed', { error })
      })
    },
    [http, projectId],
  )

  const handleUndoToggle = useCallback(
    (tcId: string, undone: boolean) => {
      setUndoneTcIds((prev) => {
        const next = new Set(prev)
        if (undone) next.add(tcId)
        else next.delete(tcId)
        return next
      })
      persistUndoToggle([tcId], undone)
    },
    [persistUndoToggle],
  )
  // #endregion chat:undo

  // #region chat:composer
  // ── Input ──────────────────────────────────────────────────────────────────
  // The textarea is uncontrolled to avoid re-rendering the entire ChatInner on
  // every keystroke.  `inputRef` holds the current value; `hasInput` is a
  // boolean state used only by the submit button's disabled prop.
  const draftKey = chatDraftStorageKey(projectId)
  // The draft the composer mounts with, read once. It is also the textarea's
  // `defaultValue`, which only seeds the element: the live text is `inputRef`.
  const [initialDraft] = useState((): string => {
    // Seed from an explicit initial value (prompt→chat morph) first, else the
    // persisted draft.
    if (initialInputValue) return initialInputValue
    try {
      return sessionStorage.getItem(draftKey) ?? ''
    } catch (_error) {
      // sessionStorage unavailable (e.g. private browsing restrictions) — fall back to empty
      return ''
    }
  })
  const inputRef = useRef<string>(initialDraft)
  // The pickers that filter by the composer text (/command, /model, /effort). Each holds the
  // text it filters by; both writers of the composer keep it current.
  const [commandMenu, setCommandMenu] = useState<CommandMenu | null>(null)
  const [modelPicker, setModelPicker] = useState<ModelPicker | null>(null)
  const [effortPicker, setEffortPicker] = useState<EffortPicker | null>(null)
  const [hasInput, setHasInput] = useState(() => Boolean(initialDraft))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Transcripts the mic button's dictation inserted into the CURRENT draft —
  // one entry per final result, pruned on every draft edit so deleting the
  // dictated text (or clearing the composer by any path) un-marks it. At
  // submit, a send whose text still carries any entry is flagged
  // `viaDictation`: the mic badge in the conversation history.
  const dictatedSnippetsRef = useRef<string[]>([])
  /** Drop transcripts no longer present in the draft (called on every edit). */
  const pruneDictatedSnippets = useCallback(() => {
    const snippets = dictatedSnippetsRef.current
    if (snippets.length === 0) return
    const value = inputRef.current
    dictatedSnippetsRef.current = value ? snippets.filter((s) => value.includes(s)) : []
  }, [])

  /** Auto-resize the textarea to fit its content (max 200px). */
  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [])

  // Seed the textarea with the draft value on mount
  // #effect chat:composer:1
  useEffect(() => {
    const ta = textareaRef.current
    if (ta && inputRef.current) {
      ta.value = inputRef.current
      autoResize()
    }
  }, [autoResize])

  // Focus the input whenever a chat mounts (initial load, "New chat", or a
  // conversation switch — each remounts ChatInner via chatKey) so the user can
  // type immediately. Skipped on coarse pointers: focus there pops the
  // on-screen keyboard over half the workspace uninvited.
  // #effect chat:composer:2
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    // The textarea can mount with content already in it (defaultValue carries a
    // persisted draft, and a viewer's box holds the '/teamsay ' prefill) — a
    // fresh element's selection is (0,0), so without this the caret sits BEFORE
    // the text and typing lands in front of '/teamsay'.
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }, [])

  /** Update the ref, the DOM element, and the hasInput flag without re-rendering the parent. */
  const setInputValue = useCallback(
    (val: string) => {
      inputRef.current = val
      // An open picker filters by the new text (a keystroke re-opens its picker itself).
      setCommandMenu((m) => (m && m.text !== val ? { ...m, text: val } : m))
      setModelPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
      setEffortPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
      pruneDictatedSnippets()
      const ta = textareaRef.current
      if (ta && ta.value !== val) ta.value = val
      // A viewer's composer is pre-filled with '/teamsay ' — the BARE prefix is
      // not sendable content, so it must not light the Send button.
      const bareSideChannel = canEdit === false && /^\/(?:teamsay|t)$/i.test(val.trim())
      setHasInput(Boolean(val.trim()) && !bareSideChannel)
      autoResize()
      // Clear persisted draft when input is emptied (e.g. on submit)
      if (!val) {
        try {
          sessionStorage.removeItem(draftKey)
        } catch (_error) {
          /* sessionStorage unavailable — safe to ignore, draft simply persists */
        }
      }
    },
    [draftKey, autoResize, canEdit, pruneDictatedSnippets],
  )

  // Persist draft text to sessionStorage so it survives refresh (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistDraft = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const v = inputRef.current
        if (v) sessionStorage.setItem(draftKey, v)
        else sessionStorage.removeItem(draftKey)
      } catch (_error) {
        /* quota exceeded or sessionStorage unavailable — draft persistence is best-effort */
      }
    }, 500)
  }, [draftKey])
  // #endregion chat:composer

  // #region chat:popups
  // ── File picker ────────────────────────────────────────────────────────────
  const [filePicker, setFilePicker] = useState<FilePicker | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  // ── System cards (persistent inline notifications in chat history) ────────
  const [systemCards, setSystemCards] = useState<SystemCard[]>([])
  // Bug-report modal — `{ title }` (seed) when open, null when closed. Opened by
  // the /report and /bug commands and the header bug-report button.
  const [reportModal, setReportModal] = useState<{ title: string } | null>(null)
  // Share-link modal — `{ role }` (seed) when open, null when closed. Opened by
  // the /share command and the header share button.
  const [shareModal, setShareModal] = useState<{ role: ShareRole } | null>(null)
  // #endregion chat:popups

  // #region chat:sounds
  // ── Sounds picker (shown when /sounds is executed) ────────────────────────
  const [soundsPicker, setSoundsPicker] = useState<SoundsPicker | null>(null)
  // #endregion chat:sounds

  // #region chat:overlay
  // ── Panel overlay (/skills, /scripts, /settings — closeable popups) ──────────
  // These three commands open a closeable overlay above the composer (mirrors how
  // /model and /sounds own this popup region) instead of dropping an inline card
  // into the timeline. `panelOverlayQuery` seeds the skills/scripts search from a
  // `/skills <query>` / `/scripts <query>` invocation. Mutually exclusive with the
  // model + sounds pickers — only one popup owns the region at a time.
  const [panelOverlay, setPanelOverlay] = useState<
    'skills' | 'scripts' | 'settings' | 'tests' | null
  >(null)
  const [panelOverlayQuery, setPanelOverlayQuery] = useState('')
  // #endregion chat:overlay

  // #region chat:voice
  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  // The browser's Web Speech constructor, looked up once on mount.
  const [speechCtor] = useState<SpeechRecognitionConstructor | undefined>(() =>
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined,
  )
  const [isListening, setIsListening] = useState(false)
  // The mic button NEVER hides — when dictation can't work (e.g. Brave's
  // Web Speech stub with nothing wired to fall back to), clicking it shows
  // the reason via voiceError instead of the button silently vanishing.
  const [voiceError, setVoiceError] = useState<string | null>(null)
  // The same flag for rendering (the /mic picker's disabled native row): read
  // from the session once on mount, and set again wherever the ref is.
  const [webSpeechDead, setWebSpeechDead] = useState(() => {
    try {
      return sessionStorage.getItem(WEB_SPEECH_DEAD_STORAGE_KEY) === '1'
    } catch (_error) {
      // sessionStorage unavailable — same fallback as the ref below
      return false
    }
  })
  // Secondary (non-error) notice: "preparing dictation" while the model loads
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null)

  // ── Dictation engine picker (/mic) ─────────────────────────────────────────
  // When the app registers a voice-engine catalog, the USER chooses which
  // engine to use (and download) — on the first mic click, or anytime via
  // /mic. Without a catalog the legacy automatic behavior stands.
  const [voiceEngines] = useState<readonly VoiceEngineDef[]>(() => listVoiceEngines())
  // autoStart: opened from a mic click (start dictating right after choosing)
  // vs from /mic (just a settings change).
  const [micPicker, setMicPicker] = useState<{ autoStart: boolean } | null>(null)
  // The chosen engine's id for rendering (the picker's "current" row): read once
  // on mount from the same saved choice the effect below restores, and set again
  // wherever the chosen engine is.
  const [currentVoiceEngineId, setCurrentVoiceEngineId] = useState((): string | null => {
    if (voiceEngines.length === 0) return null
    try {
      const savedId = localStorage.getItem(MIC_ENGINE_STORAGE_KEY)
      return savedId && voiceEngines.some((e) => e.id === savedId) ? savedId : null
    } catch (_error) {
      // localStorage unavailable — no saved choice
      return null
    }
  })

  // What the voice region does lives in the shared ChatDictationController; React
  // keeps the state it renders and hands the controller the composer and popup
  // callbacks it needs, so the DOM and the effect order below do not move.
  const closeDictationPopups = useCallback(() => {
    setCommandMenu(null)
    setModelPicker(null)
    setEffortPicker(null)
    setSoundsPicker(null)
    setFilePicker(null)
    setPanelOverlay(null)
  }, [])
  const openDictationMicPicker = useCallback(() => {
    setMicPicker({ autoStart: true })
  }, [])
  const closeDictationMicPicker = useCallback(() => {
    setMicPicker(null)
  }, [])
  const readDictationInput = useCallback(() => inputRef.current, [])
  const pushDictatedSnippet = useCallback((transcript: string) => {
    dictatedSnippetsRef.current.push(transcript)
  }, [])
  const writeDictationInput = useStableCallback(setInputValue)
  const dictationTranscriptInserted = useStableCallback(autoResize)
  const dictationStart = useStableCallback(handleAutoFixPauseOnInput)
  const dictationTranslate = useStableCallback(t)
  const dictationRef = useRef<ChatDictationController | null>(null)
  if (dictationRef.current == null) {
    dictationRef.current = new ChatDictationController({
      translate: dictationTranslate,
      speechRecognitionConstructor: speechCtor,
      engines: voiceEngines,
      selectEngine: selectVoiceEngine,
      engineCoversLanguage: voiceEngineCoversLanguage,
      getVoiceProvider,
      readInput: readDictationInput,
      writeInput: writeDictationInput,
      pushDictatedSnippet,
      onTranscriptInserted: dictationTranscriptInserted,
      onDictationStart: dictationStart,
      closeSiblingPopups: closeDictationPopups,
      openMicPicker: openDictationMicPicker,
      closeMicPicker: closeDictationMicPicker,
      setListening: setIsListening,
      setVoiceError,
      setVoiceNotice,
      setWebSpeechDead,
      setCurrentVoiceEngineId,
    })
  }
  const dictation = dictationRef.current
  // #effect chat:voice:1
  useEffect(() => {
    dictation.mount()
  }, [dictation])
  // #effect chat:voice:2
  useEffect(() => {
    dictation.restoreSavedEngine()
  }, [dictation])

  /**
   * Why an engine can't be used here, or null when it can: 'browser' = the
   * native speech service is missing/proven dead in this browser; 'language'
   * = the engine doesn't cover the UI language.
   */
  const voiceEngineDisabledReason = useCallback(
    (def: VoiceEngineDef): 'browser' | 'language' | null =>
      dictation.voiceEngineDisabledReason(def, webSpeechDead),
    [dictation, webSpeechDead],
  )

  /**
   * Applies a picker choice: wires the engine, persists it, and (for a
   * mic-click-initiated pick) starts dictating immediately.
   */
  const chooseVoiceEngine = useCallback(
    (def: VoiceEngineDef, autoStart: boolean): void => {
      dictation.chooseVoiceEngine(def, autoStart)
    },
    [dictation],
  )

  const toggleVoice = useCallback(() => {
    dictation.toggleVoice(isListening)
  }, [dictation, isListening])

  // Stop recognition on unmount
  // #effect chat:voice:3
  useEffect(
    () => () => {
      dictation.dispose()
    },
    [dictation],
  )
  // #endregion chat:voice

  // #region chat:system-cards
  // The latest committed messages, for addActivityCard, which reads them without
  // adding messages to its dependency array (avoids re-creation on every
  // streaming chunk).
  const readMessages = useStableCallback(() => messages)
  // addSystemCard serves ONLY this session's LOCAL command cards — the `/help`,
  // `/settings`, `/scripts` browsers and command output. These are ephemeral chrome: never
  // persisted, never broadcast, so a reload or a collaborator never sees them. The
  // server-driven transcript notices (model / mode / skills / custom) do not come through
  // here — they are card-messages in the ONE transcript (recordCard → cardEventToSystemCard).
  const addSystemCard = useCallback((text: string, opts: AddSystemCardOptions = {}) => {
    // Stamped with the client clock, so the card lands where the user ran its command. The
    // variant's own fields are spread verbatim, so this never drifts from the union.
    const card = { id: crypto.randomUUID(), text, timestamp: Date.now(), ...opts }
    setSystemCards((prev) => [...prev, card])
    // Auto-scroll after the card renders so the user sees it immediately
    if (!userScrolledUpRef.current) {
      setTimeout(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [])

  // Check the unfiltered definitions at the send boundary. Removing a disabled
  // command from the menu must not reinterpret its raw text as an assistant send:
  // a host backend may still intercept that command or any of its aliases.
  const blockDisabledTeamMessage = useCallback(
    (message: string): boolean => {
      if (
        canSendTeamMessages !== false ||
        !matchesSideChannelCommand(
          extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS,
          message,
        )
      )
        return false
      addSystemCard(
        t('ide.chat.teamMessagesUnavailable', undefined, {
          defaultValue: 'Team messaging is unavailable in this workspace.',
        }),
      )
      return true
    },
    [canSendTeamMessages, extraCommands, addSystemCard, t],
  )

  // Apply a chat event broadcast by another project member (the chat push channel). The
  // originating member's SERVER already persisted everything; this client renders the
  // broadcast live and gets the durable copy on reload. EVERY frame of a remote turn
  // arrives here — text/thinking deltas, tool events, verification, cards, the user
  // message, done — and is ingested into the message store through useChat's
  // applyRemoteEvent (the same content applier as an own SSE stream), so watching a
  // teammate's turn looks exactly like running one. handleStreamEvent then handles the
  // panel-level concerns (context usage, sounds, activity cards) with the
  // applyingPushed flag gating the sender-only side effects (auto-fix, ready_to_build).
  const applyPushedStreamEvent = useCallback(
    (frameConversationId: string, event: ChatStreamEvent) => {
      // Only apply broadcasts for the conversation this panel has open.
      if (frameConversationId !== conversationIdRef.current) return
      // Store ingestion first, so the transcript is current before any panel
      // side effect reads it.
      applyRemoteEvent(event)
      // Flag the window so a pushed activity card is marked `received` (rendered, not
      // re-PUT) and sender-only side effects are skipped. handleStreamEvent is
      // synchronous, so the flag is set for exactly this event's handling.
      applyingPushedRef.current = true
      try {
        handleStreamEvent(event)
      } finally {
        applyingPushedRef.current = false
      }
      // A pushed event means a backend turn is live for this conversation. When it
      // isn't a turn this client owns (another tab, a teammate, a server-side
      // continuation), tell useChat so it confirms against the server's streaming
      // flag and keeps the Stop button visible + functional for the remote turn.
      noteRemoteStreamEvent()
    },
    [applyRemoteEvent, handleStreamEvent, noteRemoteStreamEvent],
  )

  // Register the pushed-event handler with the parent (Workspace) so it can deliver
  // broadcast chat events from other project members; deregister on unmount.
  // #effect chat:system-cards:1
  useEffect(() => {
    onRegisterPushHandler?.(applyPushedStreamEvent)
    return () => onRegisterPushHandler?.(null)
  }, [onRegisterPushHandler, applyPushedStreamEvent])

  // Register the history reconcile with the parent so it can converge this
  // panel on the persisted transcript whenever its push channel (re)connects —
  // a broadcast sent while that socket was down (a teammate's team note against
  // a backgrounded tab or a slept laptop) is otherwise lost until a page
  // lifecycle event happens to fire.
  // #effect chat:system-cards:2
  useEffect(() => {
    onRegisterHistoryReconcile?.(reconcileHistory)
    return () => onRegisterHistoryReconcile?.(null)
  }, [onRegisterHistoryReconcile, reconcileHistory])

  // Inject the user-message accent-stripe styles once (the gradient `::before` + its
  // keyframe can't live inline; gated on the row's data-mol-id, so no other row is
  // touched). Guarded by id so it injects a single time across the app.
  // #effect chat:system-cards:3
  useEffect(() => {
    const id = 'mol-chat-user-accent-style'
    if (typeof document === 'undefined' || document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = USER_ACCENT_STYLE
    document.head.appendChild(el)
  }, [])

  // ── System cards are now SESSION-EPHEMERAL ────────────────────────────────
  // The persisted, server-driven inline notices (model switch, "Building your app", "Loaded
  // N skills", the app's custom upgrade/guest/build cards) are no longer stored here — the
  // server RECORDS them as card-messages in the ONE message transcript (recordCard), and they
  // render from `cardEvent` via the timeline below (cardEventToSystemCard), so they survive a
  // reload as part of `messages` with no separate store, no client PUT, and no divergence.
  // The `systemCards` state that remains holds ONLY this session's local command cards (the
  // `/help` / `/settings` / `/scripts` browsers, command output) — transient, re-runnable
  // chrome that is intentionally NOT persisted (like terminal output) and never leaked to a
  // collaborator. The former load/PUT effects (and their `/system-cards` endpoint) are gone.
  // #endregion chat:system-cards

  // #region chat:activity
  // ── Activity cards (captured outbound side effects) ───────────────────────
  const [activityCards, setActivityCards] = useState<ActivityCardEntry[]>([])
  const addActivityCard = useCallback(
    (activity: Activity) => {
      // Captured synchronously here (NOT inside the setState updater, which React invokes
      // during reconciliation after applyPushedStreamEvent has reset the ref) so a pushed
      // card is reliably flagged received and excluded from this viewer's persist PUT.
      const received = applyingPushedRef.current || undefined
      // Place just before an actively-streaming message so the card isn't pinned
      // below the growing response (same heuristic as addSystemCard).
      let ts = new Date(activity.timestamp).getTime()
      if (Number.isNaN(ts)) ts = Date.now()
      const streaming = readMessages().find((m) => m.isStreaming)
      if (streaming && streaming.timestamp <= ts) {
        ts = streaming.timestamp - 1
      }
      setActivityCards((prev) =>
        prev.some((c) => c.id === activity.id)
          ? prev
          : [...prev, { id: activity.id, activity, timestamp: ts, received }],
      )
      if (!userScrolledUpRef.current) {
        setTimeout(() => {
          const el = messagesContainerRef.current
          if (el) el.scrollTop = el.scrollHeight
        }, 50)
      }
    },
    [readMessages],
  )
  // addActivityCard is stable, so the stream callback's ref is filled once.
  useCommittedRef(addActivityCardRef, addActivityCard)

  // Persist + restore the inline activity cards on the conversation (mirrors systemCards) so
  // the captured side effects the user saw live reappear on reload — live === stored. The
  // entries are fully serializable (id + activity data + timestamp), so unlike systemCards
  // there is no in-session callback to strip.
  const activityCardsLoadedConvRef = useRef<string | null>(null)
  const prevActivityCardsConvRef = useRef<string | null>(null)
  // #effect chat:activity:1
  useEffect(() => {
    const prevConv = prevActivityCardsConvRef.current
    prevActivityCardsConvRef.current = conversationId
    activityCardsLoadedConvRef.current = null
    if (!conversationId) return
    if (prevConv && prevConv !== conversationId) setActivityCards([])
    let cancelled = false
    void http
      .get<{ activityCards?: ActivityCardEntry[] }>(
        `/projects/${projectId}/conversations/${conversationId}/activity-cards`,
      )
      .then((res) => {
        if (cancelled) return
        const loaded = res.data?.activityCards ?? []
        // Merge by id so a card added before the fetch resolved is preserved.
        setActivityCards((prev) => {
          const byId = new Map<string, ActivityCardEntry>()
          for (const c of loaded) byId.set(c.id, c)
          for (const c of prev) byId.set(c.id, c)
          return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
        })
        activityCardsLoadedConvRef.current = conversationId
      })
      .catch((_error) => {
        // Best-effort restore (bound as _error per Rule 14): a failed activity-card fetch is
        // non-critical; allow newly-added cards to persist by marking this conversation loaded.
        if (!cancelled) activityCardsLoadedConvRef.current = conversationId
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, projectId, http, canEdit])
  // #effect chat:activity:2
  useEffect(() => {
    if (!conversationId || activityCardsLoadedConvRef.current !== conversationId) return
    if (canEdit === false) return
    void http
      .put(`/projects/${projectId}/conversations/${conversationId}/activity-cards`, {
        activityCards: activityCards.filter((c) => !c.received),
      })
      .catch((_error) => {
        // Best-effort save (bound as _error per Rule 14): the in-memory cards remain the
        // source of truth this session if the PUT fails.
      })
  }, [activityCards, conversationId, projectId, http, canEdit])
  // #endregion chat:activity

  // #region chat:tips
  // ── Auto-tips (dismissable onboarding hints) ──────────────────────────────
  // Two surfaces (see chat-tips-utilities): an ENTRY_TIP shown once on a fresh
  // conversation so a brand-new user always sees how to drive the agent, plus an
  // idle rotation that MAY surface more tips after the conversation has sat idle
  // for a while — gated by a cooldown and a random roll (see shouldShowIdleTip) so
  // the timeline never fills with tips. The idle clock resets on any message
  // activity. Dismissing a tip removes it; a shown tip never reappears (tracked in
  // shownTipIdsRef).
  const [tipCards, setTipCards] = useState<TipCardEntry[]>([])
  const lastTipAtRef = useRef<number>(0)
  const shownTipIdsRef = useRef<string[]>([])
  const entryTipShownRef = useRef(false)
  // Whether the viewer composer's "/teamsay " prefill already ran (see chat:input).
  const viewerPrefillDoneRef = useRef(false)
  const dismissTip = useCallback((id: string) => {
    setTipCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // Reset tips when switching to a *different* existing conversation. The null→id
  // transition (a brand-new conversation getting its server id) is NOT a switch.
  const prevConvIdRef = useRef<string | null>(conversationId)
  // #effect chat:tips:1
  useEffect(() => {
    if (prevConvIdRef.current === conversationId) return
    const switchedConversation = prevConvIdRef.current != null
    prevConvIdRef.current = conversationId
    if (switchedConversation) {
      setTipCards([])
      lastTipAtRef.current = 0
      shownTipIdsRef.current = []
      // Re-arm the entry tip so a freshly-started chat shows the onboarding hint.
      entryTipShownRef.current = false
      // Re-arm the viewer composer prefill ('/teamsay ') for the new conversation.
      viewerPrefillDoneRef.current = false
    }
  }, [conversationId])

  // Entry tip: the onboarding moment. Show ONE high-value hint as soon as a fresh
  // conversation opens (no server id yet AND no messages) — before the first
  // prompt — so a new user is never left with zero tips. It is dismissable like
  // any tip and never reappears for this conversation. Resuming an existing
  // conversation (conversationId set) is NOT a fresh start, so no entry tip there.
  // #effect chat:tips:2
  useEffect(() => {
    if (transcriptOnly) return
    // No onboarding tip during the initial discovery phase (mvp B1) — discovery is
    // its own guided Q&A; a blue tip there is noise.
    if (discovery) return
    if (conversationId != null || messages.length > 0) return
    // Once per conversation (the switch effect above re-arms it).
    if (entryTipShownRef.current) return
    entryTipShownRef.current = true
    shownTipIdsRef.current = [...shownTipIdsRef.current, ENTRY_TIP.id]
    // The entry stores the tip's KEY + English default, not the sentence: the
    // render translates it, so a locale switch re-translates this tip too.
    const entryCard = { id: crypto.randomUUID(), tip: ENTRY_TIP, timestamp: Date.now() }
    setTipCards((prev) => [...prev, entryCard])
  }, [conversationId, messages.length, discovery, transcriptOnly])

  // Viewer orientation tip: a read-only member's explainer — GOLD like the
  // team-only messages and led by the same `people` icon it explains, so the
  // badge on a team note is self-describing. A regular dismissable tip (never a
  // permanent composer note); shown once per panel mount, skipped in discovery
  // like the other tips (mvp B1). Gated on an EXPLICIT canEdit === false so
  // hosts that don't do roles never see it.
  const viewerTipShownRef = useRef(false)
  // #effect chat:tips:3
  useEffect(() => {
    if (transcriptOnly || canEdit !== false || discovery || viewerTipShownRef.current) return
    viewerTipShownRef.current = true
    // Same as the entry tip: the entry carries the tip's definition and the
    // render translates it, so a locale switch re-translates this tip too.
    const viewerCard = {
      id: crypto.randomUUID(),
      tip: VIEWER_TIP,
      timestamp: Date.now(),
      accent: NOTICE_TONE.gold.accent,
      icon: 'people' as const,
    }
    setTipCards((prev) => [...prev, viewerCard])
  }, [canEdit, discovery, transcriptOnly])

  // Surface an occasional idle tip. This effect re-runs on every message change, so
  // the idle timer is continually reset by activity; it only fires once the
  // conversation has been quiet for TIP_IDLE_MS — and even then only when the
  // cooldown + random roll allow, and never before TIP_MIN_MESSAGES (so never on the
  // first prompt). Skipped entirely while a message is streaming.
  const readMessageCount = useEffectEvent(() => messages.length)
  // #effect chat:tips:4
  useEffect(() => {
    // Public transcript viewers have no actionable composer onboarding.
    if (transcriptOnly) return
    // No idle tips during the initial discovery phase (mvp B1).
    if (discovery) return
    if (messages.some((m) => m.isStreaming) || messages.length < TIP_MIN_MESSAGES) return
    const armedAt = Date.now()
    const timer = setTimeout(() => {
      const show = shouldShowIdleTip(
        {
          messageCount: readMessageCount(),
          msSinceLastActivity: Date.now() - armedAt,
          msSinceLastTip: lastTipAtRef.current
            ? Date.now() - lastTipAtRef.current
            : Number.POSITIVE_INFINITY,
        },
        Math.random(),
      )
      if (!show) return
      const tip = pickIdleTip(shownTipIdsRef.current, Math.random())
      shownTipIdsRef.current = [...shownTipIdsRef.current, tip.id]
      lastTipAtRef.current = Date.now()
      // Same as the entry tip: key + English default now, sentence at render.
      const idleCard = { id: crypto.randomUUID(), tip, timestamp: Date.now() }
      setTipCards((prev) => [...prev, idleCard])
    }, TIP_IDLE_MS)
    return () => clearTimeout(timer)
  }, [messages, discovery, transcriptOnly])
  // #endregion chat:tips

  // #region chat:sounds
  // Notification sounds are a PER-DEVICE, per-user preference — localStorage,
  // never project settings. They used to persist via PATCH /projects settings
  // (shared with every member, and unreachable for read-only viewers, whose
  // PATCH 403s); the old project-level value is still read once as a migration
  // fallback when this device has no local preference yet.
  const [soundsConfig, setSoundsConfig] = useState<SoundsConfig>(() => {
    try {
      return parseSoundsConfig(localStorage.getItem(SOUNDS_STORAGE_KEY))
    } catch (_error) {
      // localStorage unavailable — fall through to the defaults.
    }
    return { ...DEFAULT_SOUNDS_CONFIG }
  })
  const soundsLocallySetRef = useRef(false)
  // #effect chat:sounds:1
  useEffect(() => {
    try {
      soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
    } catch (_error) {
      // localStorage unavailable — treat as unset; the project fallback may apply.
    }
  }, [])
  // #endregion chat:sounds

  // #region chat:prefs
  // ── Timestamps (/timestamps) ────────────────────────────────────────────────
  // A per-device display preference (localStorage, like sounds), off by default.
  // The minute clock re-plans which items show a time (see planChatTimestamps),
  // so labels advance and runs of identical labels regroup as time passes.
  const timestampsVisible = useChatTimestampsVisible()
  const testsBarVisible = useTestsBarVisible()
  const minuteNow = useMinuteNow()
  const applyTimestampsVisible = useCallback(
    (visible: boolean): void => {
      setChatTimestampsVisible(visible)
      addSystemCard(
        visible
          ? t('ide.chat.timestampsShown', undefined, { defaultValue: 'Timestamps shown.' })
          : t('ide.chat.timestampsHidden', undefined, { defaultValue: 'Timestamps hidden.' }),
      )
    },
    [addSystemCard, t],
  )
  // #endregion chat:prefs

  // #region chat:overlay
  const openPanelOverlay = useCallback(
    (variant: 'skills' | 'scripts' | 'settings' | 'tests', query = ''): void => {
      // Close any sibling popup so overlays never stack (matches how the model
      // picker / sounds picker each own this region exclusively).
      setModelPicker(null)
      setEffortPicker(null)
      setSoundsPicker(null)
      setCommandMenu(null)
      setPanelOverlayQuery(query)
      setPanelOverlay(variant)
    },
    [],
  )
  // #endregion chat:overlay

  // #region chat:tests
  // ── /test (the tests browser) ───────────────────────────────────────────────
  // The list and the in-flight run live in the shared ChatTestsController, not
  // inside TestsCard, for one reason: the card is an overlay the user closes. A
  // run that is streaming (a browser spec can take a minute) must survive that
  // close and still be there when they re-open it, and re-running /test must
  // re-list without killing it. So the card is presentational and the
  // controller owns the state; this panel subscribes to it and renders its
  // snapshot.
  // Whether a TURN is in flight — a fix is a real message, so it waits its turn.
  const readTestsBusy = useStableCallback(() => isLoading || isRemoteStreaming)
  const testsControllerRef = useRef<ChatTestsController | null>(null)
  if (testsControllerRef.current == null) {
    testsControllerRef.current = new ChatTestsController({
      isTurnInFlight: readTestsBusy,
      warn: (message, context) => {
        logger.warn(message, context)
      },
    })
  }
  const testsController = testsControllerRef.current
  const testsSnapshot = useSyncExternalStore(
    testsController.subscribe,
    testsController.snapshot,
    testsController.snapshot,
  )
  const testsList = testsSnapshot.list
  const testsStatus = testsSnapshot.status
  const testsRun = testsSnapshot.run
  // #effect chat:tests:1
  useEffect(() => {
    // React can reconnect effects on the same tree (StrictMode/Suspense).
    // Cleanup must not permanently silence discovery and run events.
    testsController.mount()
    return () => testsController.unmount()
  }, [testsController])

  // The list request alone: every state change follows the host's answer.
  const loadTests = useCallback(
    (list: NonNullable<typeof listTests>): Promise<void> => testsController.loadTests(list),
    [testsController],
  )
  const refreshTests = useCallback(
    (): Promise<void> => testsController.refreshTests({ listTests, testsAvailable }),
    [testsController, listTests, testsAvailable],
  )

  const startTestsRun = useCallback(
    (selection: TestSelection): void => {
      testsController.startTestsRun(selection, {
        listTests,
        runTests,
        canRunTests,
        canEdit,
        testsAvailable,
        translate: t,
      })
    },
    [testsController, listTests, runTests, canRunTests, canEdit, testsAvailable, t],
  )

  // Hand the failing tests to the agent as ONE ordinary user message — the same
  // move as the editor’s "Fix with AI" and the auto-fix loop: compose the
  // problem, send it through the normal path, let the turn answer. The overlay
  // closes so the person watches the turn they just started.
  const fixTests = useCallback(
    (failures: TestFailure[]): void => {
      testsController.fixTests(failures, {
        canEdit,
        closeOverlay: () => {
          setPanelOverlay(null)
        },
        sendMessage: sendLatestMessage,
      })
    },
    [testsController, canEdit, sendLatestMessage],
  )

  const cancelTestsRun = useCallback((): void => {
    testsController.cancelTestsRun()
  }, [testsController])

  // Every run in the project, however it was started, reaches the same bar and
  // browser: the host replays the runs it still holds, then streams new ones.
  // The effect event keeps the subscription from restarting (and replaying) each
  // time `refreshTests` changes identity.
  const refreshLatestTests = useEffectEvent(() => refreshTests())
  // #effect chat:tests:2
  useEffect(
    () => testsController.watchRuns(watchTestRuns, refreshLatestTests),
    [testsController, watchTestRuns],
  )

  // Skip the executor's in-flight tool call WITHOUT ending the turn — the
  // model is told the command did not run and carries on. The card owns its own
  // pressed state, so this just forwards the host's answer: `false` means the
  // call had already finished (a race the person did not cause), which the card
  // answers by returning the button to rest rather than reporting anything.
  const handleSkipToolCall = useCallback(
    async (toolCallId: string): Promise<boolean | void> =>
      testsController.handleSkipToolCall(toolCallId, { canEdit, skipToolCall }),
    [testsController, canEdit, skipToolCall],
  )

  // Skip the command the run is ON, leaving the run itself alive. The state
  // only records that the request went out — the run's own `result` for that
  // file is what moves the row, so a skip can never paint itself as a pass. A
  // host answering "there was nothing to skip" is a race the person did not
  // cause: the control goes away, no error line.
  const skipCurrentTest = useCallback((): void => {
    testsController.skipCurrentTest({ canEdit, canRunTests })
  }, [testsController, canEdit, canRunTests])

  /** Open the tests browser, re-listing so a spec just written shows up. */
  const openTestsBrowser = useCallback(
    (query = '', runAll = false): void => {
      openPanelOverlay('tests', query)
      void refreshTests().then(() => {
        if (runAll && testsController.isMounted()) startTestsRun({ kind: 'all' })
      })
    },
    [openPanelOverlay, refreshTests, startTestsRun, testsController],
  )
  // #endregion chat:tests

  // #region chat:sounds
  // Keep ref in sync so the streaming callback always sees latest config
  // #effect chat:sounds:2
  useEffect(() => {
    soundsConfigRef.current = soundsConfig
  }, [soundsConfig])

  /** Cycle a single sound event's mode and persist to this device. */
  const cycleSoundMode = useCallback(
    async (eventType: SoundEventType | 'all') => {
      const updated = cycleSoundsConfig(soundsConfig, eventType)
      setSoundsConfig(updated)
      // Per-device preference — localStorage, never a project PATCH (see the
      // state's comment; this also makes /sounds fully usable for viewers).
      try {
        localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(updated))
        soundsLocallySetRef.current = true
      } catch (_error) {
        // localStorage unavailable — the choice still applies for this session.
      }
    },
    [soundsConfig],
  )
  // #endregion chat:sounds

  // #region chat:skills
  // The persisted per-project default-loaded skill set (settings.defaultSkills). A
  // default skill's full body is injected by the backend into every system prompt;
  // the /skills browser shows a "Default" badge + a toggle to edit the set (P2-08).
  const [defaultSkillPaths, setDefaultSkillPaths] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )
  // P3-11: whether the user has an EXPLICIT saved defaultSkills set. When false
  // (unset), ALL initial/discovered skills are treated as default (badged here +
  // injected full-body by the backend) — seeded in the skill-load effect below.
  const defaultSkillsExplicitRef = useRef(false)
  // The same flag for rendering (the /skills browser's reset control), set
  // wherever the ref is.
  const [defaultSkillsExplicit, setDefaultSkillsExplicit] = useState(false)
  // #endregion chat:skills

  // #region chat:models
  // ── Current project settings (model + maxloops + sounds) ──────────────────
  // Project-scoped so any custom (bring-your-own AI) models the project has
  // configured are included alongside the platform catalog.
  const {
    models: AVAILABLE_MODELS,
    defaults: serverModelDefaults,
    freeTierModel,
    loading: modelsLoading,
  } = useAIModels(projectId)
  const FREE_TIER_MODEL = freeTierModel?.id ?? AVAILABLE_MODELS[0]?.id ?? ''
  const DEFAULT_MODEL = FREE_TIER_MODEL
  const isFreeTier = !isPro
  // The PERSISTED legacy chatModel only — unlike currentModel, never seeded
  // with the catalog default. The distinction matters: a seeded default is not
  // a user choice, and treating it as one made every plan-mode surface label
  // the free-tier EXECUTOR as the active model while the server planned with
  // its own plan default (prod 2026-08-13: UI said "DeepSeek V4 Flash" for a
  // plan turn DeepSeek V4 Pro served).
  const [savedChatModel, setSavedChatModel] = useState<string>('')
  // Per-mode model overrides (SYN5). Empty string = unset; resolveModeModel then
  // falls back to currentModel (the legacy single chatModel) for back-compat.
  const [planModel, setPlanModel] = useState<string>('')
  const [executeModel, setExecuteModel] = useState<string>('')
  // Auxiliary-job model overrides. Empty string = unset — the SERVER falls back
  // to its own fast default (never chatModel) for these.
  const [commitModel, setCommitModel] = useState<string>('')
  const [compactModel, setCompactModel] = useState<string>('')
  // Reasoning effort (SYN6) — applied by the backend at chat-call time. Effort
  // is PER-MODE (settings.effortByMode): plan and execute run different models
  // with different native effort scales. The single `effortLevel` is the legacy
  // fallback used when a mode has no explicit entry.
  // Empty = unset; the active model's own default applies (resolved per-model).
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('')
  const [effortByMode, setEffortByMode] = useState<Partial<Record<EffortMode, EffortLevel>>>({})
  // Per-model processing region (US default / native-China). Persisted as the
  // WHOLE map in settings.modelRegions, mirroring effortByMode's shape.
  const [modelRegions, setModelRegions] = useState<Record<string, ModelRegion>>({})
  const [currentMaxLoops, setCurrentMaxLoops] = useState<number>(100)
  const [autoFixEnabled, setAutoFixEnabled] = useState<boolean>(true)
  // Auto-approve destructive commands (skip the pre-tool "Proceed?" confirm). Off by
  // default — the gate is opt-out. Only the server-side hook gate reads it; this state
  // just drives the /autoapprove toggle + the settings row.
  const [autoApproveCommandsEnabled, setAutoApproveCommandsEnabled] = useState<boolean>(false)
  // Adopt the free-tier model id as soon as the catalog resolves, unless the
  // project-settings fetch already populated currentModel with a saved choice.
  const currentModel = savedChatModel || DEFAULT_MODEL

  // The model a conversation mode will ACTUALLY use, for every display surface
  // (picker pill, /model suffix, settings rows, fast-mode gating). Mirrors the
  // server's selection chain: per-mode setting → SAVED chatModel → the
  // server-sent per-mode default (owner account settings + tier already folded
  // in) → the catalog clamp.
  const effectiveModelForMode = useCallback(
    (m: 'plan' | 'execute'): string =>
      effectiveModeModelId(
        m,
        { planModel, executeModel, chatModel: savedChatModel },
        serverModelDefaults,
        isFreeTier,
        AVAILABLE_MODELS,
        FREE_TIER_MODEL,
      ),
    [
      planModel,
      executeModel,
      savedChatModel,
      serverModelDefaults,
      isFreeTier,
      AVAILABLE_MODELS,
      FREE_TIER_MODEL,
    ],
  )
  // #effect chat:models:2
  useEffect(() => {
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        const parsed = parseChatProjectSettings(s)
        if (parsed.chatModel !== undefined) {
          setSavedChatModel(parsed.chatModel)
        }
        if (parsed.planModel !== undefined) setPlanModel(parsed.planModel)
        if (parsed.executeModel !== undefined) setExecuteModel(parsed.executeModel)
        if (parsed.commitModel !== undefined) setCommitModel(parsed.commitModel)
        if (parsed.compactModel !== undefined) setCompactModel(parsed.compactModel)
        if (parsed.effortLevel !== undefined) {
          setEffortLevel(parsed.effortLevel)
        }
        if (parsed.effortByMode !== undefined) {
          setEffortByMode(parsed.effortByMode)
        }
        if (parsed.modelRegions !== undefined) {
          setModelRegions(parsed.modelRegions)
        }
        // Persisted per-project default-loaded skills (P2-06/P2-08).
        const savedDefaultSkills = s?.defaultSkills
        if (Array.isArray(savedDefaultSkills)) {
          // An explicit saved set wins over the "all initial skills" default (P3-11).
          defaultSkillsExplicitRef.current = true
          setDefaultSkillsExplicit(true)
          setDefaultSkillPaths(
            new Set(savedDefaultSkills.filter((p): p is string => typeof p === 'string')),
          )
        }
        // (The "Loaded {{count}} skills" announce marker is now read + maintained
        // server-side — see the skills_loaded emit in chat-handler — so the client no
        // longer hydrates it here.)
        if (parsed.maxToolLoops !== undefined) setCurrentMaxLoops(parsed.maxToolLoops)
        if (parsed.autoFix !== undefined) setAutoFixEnabled(parsed.autoFix)
        if (parsed.autoApproveCommands !== undefined) {
          setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
        }
        // Legacy migration only: sounds are per-device (localStorage) now — apply
        // the old project-level value only when this device has no local pref.
        if (s?.sounds && typeof s.sounds === 'object' && !soundsLocallySetRef.current) {
          setSoundsConfig((prev) => mergeSoundsConfig(prev, s.sounds))
        }
        // Restore the persisted auto-commit cadence in the paused state (it
        // re-arms on the next file change). Auto-commit is ON by default: a
        // project that never set `autoCommitSeconds` resolves to the default
        // cadence; an explicit 0 (the user turned it off) stays off. Never for
        // a read-only VIEWER: /commit is an editor action, so arming the
        // countdown on a viewer's client only produces a doomed dispatch (and
        // the denial card it minted) when it lapses.
        const savedAutoCommit = resolveAutoCommitSeconds(s?.autoCommitSeconds)
        autoCommitPersistedRef.current = savedAutoCommit
        if (savedAutoCommit > 0 && readCanEdit() !== false) {
          dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
        }
        setAutoCommitLoaded(true)
      })
      .catch((error) => {
        // Settings load failed: leave auto-commit off for this session — we
        // can't know whether the user explicitly disabled it, and committing
        // against an explicit off is worse than skipping the default-on. A
        // later explicit /autocommit still persists (we never silently lose a
        // user choice).
        logger.warn('chat-panel: project settings load failed; auto-commit left off this session', {
          error,
        })
        autoCommitPersistedRef.current = 0
        setAutoCommitLoaded(true)
      })
  }, [http, projectId])

  // Re-read the persisted agent-behavior settings when the host signals a
  // settings change: the provider modal's "Use" button, or a resource_change
  // broadcast saying ANOTHER member changed the project (model/effort/regions/
  // max-loops/auto-fix/auto-approve) — so this browser's pickers and toggles
  // match the change instead of rendering stale values under the shared setting
  // card. Deliberately does NOT touch auto-commit or skills (they carry local
  // in-session state the mount effect owns). Skips the initial 0 value.
  // #effect chat:models:3
  useEffect(() => {
    if (!modelSelectionSignal) return
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        const parsed = parseChatProjectSettings(s)
        if (parsed.chatModel !== undefined) {
          setSavedChatModel(parsed.chatModel)
        }
        if (parsed.planModel !== undefined) setPlanModel(parsed.planModel)
        if (parsed.executeModel !== undefined) setExecuteModel(parsed.executeModel)
        if (parsed.commitModel !== undefined) setCommitModel(parsed.commitModel)
        if (parsed.compactModel !== undefined) setCompactModel(parsed.compactModel)
        if (parsed.effortLevel !== undefined) setEffortLevel(parsed.effortLevel)
        if (parsed.effortByMode !== undefined) {
          setEffortByMode(parsed.effortByMode)
        }
        if (parsed.modelRegions !== undefined) {
          setModelRegions(parsed.modelRegions)
        }
        if (parsed.maxToolLoops !== undefined) setCurrentMaxLoops(parsed.maxToolLoops)
        if (parsed.autoFix !== undefined) setAutoFixEnabled(parsed.autoFix)
        if (parsed.autoApproveCommands !== undefined) {
          setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
        }
      })
      .catch((error) => {
        // Non-fatal: the change was persisted server-side; this view just won't
        // refresh until the next signal or full settings read.
        logger.debug('chat-panel: settings re-read after a change signal failed', { error })
      })
  }, [modelSelectionSignal, http, projectId])
  // #endregion chat:models

  // #region chat:auto-commit
  // Persist the auto-commit cadence to project.settings (debounced) so it
  // survives a reload/reconnect like every other setting. The reducer is the
  // live source of truth; this mirrors intervalSeconds (0 = off) back to the
  // server whenever the user changes it (/autocommit or the badge's cancel),
  // skipping the value just hydrated on load and gated until that load resolves.
  // #effect chat:auto-commit:1
  useEffect(() => {
    if (!autoCommitLoaded) return
    // A viewer never mirrors auto-commit state back to the project — the PATCH
    // is editor-gated server-side and their reducer stays disarmed anyway.
    if (canEdit === false) return
    const seconds = autoCommit.intervalSeconds
    if (autoCommitPersistedRef.current === seconds) return
    if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
    autoCommitPatchTimerRef.current = setTimeout(() => {
      autoCommitPatchTimerRef.current = null
      autoCommitPersistedRef.current = seconds
      http
        .patch(`/projects/${projectId}`, { settings: { autoCommitSeconds: seconds } })
        .catch((error) => {
          logger.warn('Failed to persist auto-commit cadence to server', { error })
        })
    }, 500)
    return () => {
      if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
    }
  }, [autoCommit.intervalSeconds, autoCommitLoaded, http, projectId, canEdit])
  // #endregion chat:auto-commit

  // #region chat:models
  // ── Removed-model recovery ──────────────────────────────────────────────────
  // If the saved chatModel is no longer in the catalog (a provider retired it,
  // or we pruned the entry), notify once and fall back to the free-tier model.
  // Guarded by a ref so re-renders don't keep firing the card / patching the
  // project. Tracks the removed id so a user could in theory hit this twice
  // for two different removed models in the same session.
  const removedModelNotifiedRef = useRef<string | null>(null)
  // #effect chat:models:4
  useEffect(() => {
    if (modelsLoading) return
    if (!currentModel) return
    if (AVAILABLE_MODELS.some((m) => m.id === currentModel)) return
    const removedId = currentModel
    if (removedModelNotifiedRef.current === removedId) return
    const decision = resolveRemovedModelFallback(removedId, AVAILABLE_MODELS, FREE_TIER_MODEL, t)
    removedModelNotifiedRef.current = removedId
    addSystemCard(decision.notice)
    if (!decision.fallback) return
    const fallback = decision.fallback
    setSavedChatModel(fallback)
    // Persisting the swap writes project settings — editor+ server-side, so a
    // viewer's tab keeps the in-memory switch (all this session needs) and
    // skips a PATCH that could only 403.
    if (canEdit !== false) {
      http.patch(settingsPatchUrl(), { settings: { chatModel: fallback } }).catch((error) => {
        // Persistence is best-effort; the in-memory switch is what matters.
        logger.warn('chat-panel: persisting the model fallback swap failed', { error })
      })
    }
  }, [
    modelsLoading,
    currentModel,
    AVAILABLE_MODELS,
    FREE_TIER_MODEL,
    addSystemCard,
    http,
    projectId,
    canEdit,
    t,
    settingsPatchUrl,
  ])
  // #endregion chat:models

  // #region chat:queued-edit
  // ── Queued message editing ──────────────────────────────────────────────────
  const [editingQueuedId, setEditingQueuedId] = useState<string | null>(null)
  const [editingQueuedText, setEditingQueuedText] = useState('')
  const queuedEditRef = useRef<HTMLTextAreaElement>(null)
  // Opening the editor is a user action, so moving focus into it is the
  // WAI-ARIA pattern — done here instead of with `autoFocus`.
  // #effect chat:queued-edit:1
  useEffect(() => {
    if (editingQueuedId) queuedEditRef.current?.focus()
  }, [editingQueuedId])
  // #endregion chat:queued-edit

  // #region chat:auto-send
  const sentInitialRef = useRef<string | null>(null)
  // #endregion chat:auto-send

  // #region chat:scroll
  // ── Auto-load earlier history on scroll-up ─────────────────────────────────
  // The timeline only mounts the most recent `maxVisibleItems` items; when the
  // user scrolls near the top, the next older page is mounted in and the scroll
  // position is anchored (see the layout effect below) so the reading place
  // stays put across the prepend. Replaces the old "Show earlier messages"
  // button (2026-10-11): paging happens as you approach the top, not on click.
  //
  // The once-registered `scroll` listener reads both values through refs —
  // `timeline` does not exist yet where the listener is declared, and the
  // listener must not re-register on every streamed item.
  /** scrollHeight captured when a page load was triggered; consumed by the anchor effect. */
  const pendingAnchorHeightRef = useRef<number | null>(null)
  /**
   * Whether older items are currently held back: filled once, where `timeline`
   * exists, with a stable callback that reads the latest committed timeline.
   */
  const hasHiddenEarlierRef = useRef<(() => boolean) | null>(null)

  // Keeps the viewport still across a prepend. Native scroll anchoring is
  // disabled on the container (overflowAnchor: 'none') so this is the only
  // mechanism adjusting the offset — otherwise both would fire and double-jump.
  // #effect chat:scroll:1
  useLayoutEffect(() => {
    const anchor = pendingAnchorHeightRef.current
    if (anchor === null) return
    pendingAnchorHeightRef.current = null
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTop += el.scrollHeight - anchor
  }, [maxVisibleItems])

  // "Should we stick to the bottom?" — derived ONLY from the actual scroll
  // position after a scroll event, never from touch direction or content size.
  //
  // Why the `scroll` event and not wheel/touch: a streaming burst GROWS the
  // content (scrollHeight rises) WITHOUT firing `scroll`, so growth alone can
  // never be mistaken for "the user scrolled up" — only a real move of the
  // viewport does. The autoscroll pins straight to the bottom (no smooth
  // animation), so its own programmatic `scroll` lands at distance 0 and keeps
  // the flag false. A user drag up past the threshold flips it true; dragging
  // back to the bottom flips it false and auto-scroll resumes. This replaces the
  // old wheel/touch detector whose touchmove LATCHED true on any downward drag
  // and only cleared on an up-swipe — a single tap after boot permanently killed
  // every auto-scroll, which is why the live response stayed out of view on
  // mobile.
  // #effect chat:scroll:2
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = (): void => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
      // Near the top with older history held back: mount the next page in. The
      // anchor effect above keeps the viewport still across the prepend.
      if (el.scrollTop <= LOAD_EARLIER_THRESHOLD_PX && hasHiddenEarlierRef.current?.()) {
        pendingAnchorHeightRef.current = el.scrollHeight
        setMaxVisibleItems((n) => n + 40)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  // #endregion chat:scroll

  // #region chat:git
  // ── Git status ─────────────────────────────────────────────────────────────
  const [gitStatusTick, setGitStatusTick] = useState(0)
  const refreshGitStatus = useCallback(() => setGitStatusTick((n) => n + 1), [])

  // Generation counters: a git request remembers the generation it started in and drops its
  // result when the counter has moved on. Ending a scope (another project, an unmount) moves it.
  const gitScopeRef = useRef(0)
  const endGitScope = useCallback(() => {
    gitScopeRef.current++
  }, [])
  // #effect chat:git:1
  const [gitProjectId, setGitProjectId] = useState(projectId)
  if (gitProjectId !== projectId) {
    setGitProjectId(projectId)
    setPendingFiles(null)
    setCommitState(null)
    setCommitCards([])
    setCommitBarExpanded(false)
  }
  useLayoutEffect(() => {
    endGitScope()
    return endGitScope
  }, [projectId, endGitScope])
  const gitStatusRequestRef = useRef(0)
  const dropGitStatusRequests = useCallback(() => {
    gitStatusRequestRef.current++
  }, [])
  const fetchPendingFiles = useCallback(() => {
    const scope = gitScopeRef.current
    const request = ++gitStatusRequestRef.current
    return http
      .get<{ files: { path: string; status: string; additions?: number; deletions?: number }[] }>(
        `/projects/${projectId}/git-status`,
      )
      .then((res) => {
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current)
          setPendingFiles(res.data.files.length > 0 ? res.data.files : null)
      })
      .catch((error) => {
        // Transient: the bar re-fetches on every turn boundary and file change.
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current) {
          logger.debug('chat-panel: git-status fetch failed; pending-files bar hidden', { error })
          setPendingFiles(null)
        }
      })
  }, [http, projectId])

  // Debounced version — coalesces rapid ticks (e.g. save → format, or an AI
  // write burst mid-turn) into a single fetch after the last write settles.
  const gitFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedFetchPendingFiles = useCallback(() => {
    if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
    gitFetchTimerRef.current = setTimeout(() => {
      gitFetchTimerRef.current = null
      fetchPendingFiles()
    }, 400)
  }, [fetchPendingFiles])
  // Expose to onFileChangeWrapped (declared earlier): AI writes streaming in
  // mid-turn refresh the bar live instead of waiting for the turn to end.
  useCommittedRef(debouncedFetchPendingFilesRef, debouncedFetchPendingFiles)

  // Fetch on turn boundaries and internal refreshGitStatus() calls. Deliberately
  // NOT gated on isLoading: mid-turn updates must go through (the live per-write
  // refresh is the debounced path above; this one settles the final state).
  // #effect chat:git:2
  useEffect(() => {
    fetchPendingFiles()
  }, [isLoading, gitStatusTick, fetchPendingFiles])
  // Fetch when the parent signals a file mutation (edit, rename, delete) —
  // debounced so save+format coalesces into one fetch after the final write.
  // #effect chat:git:3
  useEffect(() => {
    if (!externalGitStatusTick) return
    debouncedFetchPendingFiles()
  }, [externalGitStatusTick, debouncedFetchPendingFiles])

  // Startup repairs, another editor, or another client can commit without a
  // local file event. Reconcile on return and while the workspace is visible.
  // #effect chat:git:4
  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState !== 'hidden') void fetchPendingFiles()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = setInterval(refresh, 45_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(interval)
      if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
      dropGitStatusRequests()
    }
  }, [fetchPendingFiles, dropGitStatusRequests])
  // #endregion chat:git

  // #region chat:auto-commit
  // A user-side file mutation (edit/rename/delete) also restarts the auto-commit
  // countdown — the parent's externalGitStatusTick is the canonical "files moved"
  // signal. Skipped on the initial 0 so opening a project doesn't arm anything.
  // #effect chat:auto-commit:2
  useEffect(() => {
    if (!externalGitStatusTick) return
    dispatchAutoCommit({ type: 'reset' })
  }, [externalGitStatusTick])

  // Tick the auto-commit countdown once per second while it is armed (counting
  // down). When paused/disabled (remaining === null) no interval runs. The
  // countdown is HELD (frozen, no ticks) while the agent is still working — a
  // turn streaming from this client (isLoading), a teammate's remote turn
  // (isRemoteStreaming), or a pending verification auto-fix follow-up
  // (autoFixCountdown) — so a commit only ever fires once the agent and the
  // user are actually finished: the quiet period runs after the LATER of the
  // last file change and the turn's end, never mid-turn.
  const autoCommitArmed = isAutoCommitArmed(autoCommit)
  const autoCommitHeld = isLoading || isRemoteStreaming || autoFixCountdown !== null
  const executeCommandRef = useRef<((id: string) => unknown) | null>(null)
  // One second of the countdown has passed. The last second fires /commit and pauses the
  // countdown until the next file change; a viewer's countdown runs out and stays there.
  const onAutoCommitSecond = useEffectEvent(() => {
    if (autoCommit.remaining === null || autoCommitHeld) return
    if (autoCommit.remaining > 1 || canEdit === false) {
      dispatchAutoCommit({ type: 'tick' })
      return
    }
    void executeCommandRef.current?.('commit')
    dispatchAutoCommit({ type: 'fired' })
  })
  // #effect chat:auto-commit:3
  useEffect(() => {
    if (!autoCommitArmed || autoCommitHeld) return
    const id = setInterval(onAutoCommitSecond, 1000)
    return () => clearInterval(id)
  }, [autoCommitArmed, autoCommitHeld])
  // #endregion chat:auto-commit

  // #region chat:tests-bar
  // The tests bar hides itself on a project with no tests, so it has to LEARN
  // whether any exist without the person opening the browser first — otherwise
  // "shown by default" would mean "shown after you ask for it once", which is
  // not a default at all.
  //
  // Discovery runs when the environment comes up, and again when a turn ends
  // while we still know of none: that is the turn that wrote the project's
  // first spec. A project that already has tests never pays for the second
  // probe, because the effect returns the moment the list is non-empty.
  const turnInFlight = isLoading || isRemoteStreaming
  const testsDiscovery =
    testsBarVisible &&
    listTests !== undefined &&
    testsAvailable === true &&
    !turnInFlight &&
    !testsRun.running &&
    testsList.length === 0
      ? listTests
      : null
  // A discovery that starts shows "loading" in the render that starts it, unless a list is showing.
  const [testsDiscoverySeen, setTestsDiscoverySeen] = useState<{
    list: NonNullable<typeof listTests>
  } | null>(null)
  if ((testsDiscoverySeen?.list ?? null) !== testsDiscovery) {
    setTestsDiscoverySeen(testsDiscovery ? { list: testsDiscovery } : null)
    if (testsDiscovery && testsStatus !== 'ready') testsController.setStatus('loading')
  }
  // #effect chat:tests-bar:1
  useEffect(() => {
    if (testsDiscovery) void loadTests(testsDiscovery)
  }, [testsDiscovery, loadTests])
  // #endregion chat:tests-bar

  // #region chat:git
  // Wrap onFileRevert so undo/redo also refreshes git status
  const handleFileRevert = useCallback(
    async (path: string, content: string) => {
      await onFileRevert?.(path, content)
      refreshGitStatus()
    },
    [onFileRevert, refreshGitStatus],
  )
  // #endregion chat:git

  // #region chat:scroll
  // ── Auto-scroll ────────────────────────────────────────────────────────────
  // Debounced to batch rapid streaming updates. Uses direct scrollTop assignment
  // instead of scrollIntoView to avoid smooth-scroll animation timing issues
  // (intermediate onScroll events, unpredictable animation duration).
  // Skipped when the user has scrolled up via wheel/touch.
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // #effect chat:scroll:3
  useEffect(() => {
    if (userScrolledUpRef.current) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null
      const el = messagesContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 80)
  }, [messages, commitCards])

  // Re-pin to the bottom when the messages container RESIZES, not just when
  // messages change. A layout change that shrinks/grows the pane — the boot→IDE
  // swap removing the "synthesizing" view, the mobile soft keyboard opening/
  // closing, an orientation change — leaves the scroll offset stale, so the live
  // spinner + latest message end up below the fold and the user has to scroll
  // down to find them (reported on mobile after the boot view clears). Guarded by
  // the same userScrolledUp intent so it never yanks a user who deliberately
  // scrolled up to read history.
  // #effect chat:scroll:4
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (userScrolledUpRef.current) return
      el.scrollTop = el.scrollHeight
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Land at the latest message on MOUNT, after layout settles. This ChatPanel
  // REMOUNTS on the boot→IDE swap (the pre-IDE instance is a different element
  // than the full-IDE one; only the chat STORE persists), so it starts scrolled
  // to the top with history already present — the live spinner sits below the
  // fold until the user scrolls (reported on mobile right after the
  // "synthesizing" view clears). The debounced message effect can fire before
  // the mobile branch-swap transition finishes, and a stray transition
  // touch/scroll can spuriously set userScrolledUp; so force the bottom across
  // the settle window (double-rAF + a post-transition follow-up) and clear that
  // flag — a fresh mount has no legitimate "scrolled up" state to preserve.
  // #effect chat:scroll:5
  useEffect(() => {
    const toBottom = (): void => {
      userScrolledUpRef.current = false
      const el = messagesContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(toBottom))
    const t = setTimeout(toBottom, 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [])
  // #endregion chat:scroll

  // #region chat:auto-send
  // ── Auto-send initial message ──────────────────────────────────────────────
  // Skip if a conversation already exists (e.g. page refresh with router state preserved).
  // #effect chat:auto-send:1
  useEffect(() => {
    if (!initialMessage || hasConversation) return
    // A read-only VIEWER never auto-sends the initial prompt: the host sources
    // it from PROJECT-keyed localStorage, which survives a role demotion and a
    // shared browser — a stale entry would auto-POST an agent turn the server
    // 403s, surfacing a spurious red error on mount. Consume the ref so it is
    // never retried either.
    if (canEdit === false) {
      sentInitialRef.current = initialMessage
      return
    }
    if (sentInitialRef.current === initialMessage) return
    sentInitialRef.current = initialMessage
    if (blockDisabledTeamMessage(initialMessage)) {
      onInitialMessageSent?.()
      return
    }
    const sideChannel =
      canSendTeamMessages !== false &&
      matchesSideChannelCommand(
        extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS,
        initialMessage,
      )
    sendMessage(initialMessage, undefined, sideChannel ? { suppressUserMessage: true } : undefined)
    onInitialMessageSent?.()
  }, [
    initialMessage,
    hasConversation,
    sendMessage,
    onInitialMessageSent,
    extraCommands,
    canEdit,
    canSendTeamMessages,
    blockDisabledTeamMessage,
  ])

  // ── Auto-send pending message (e.g. "Fix with AI", preview errors) ──────
  // Defers sending while the AI is streaming to avoid queueing up auto-fix
  // messages during active work. Messages are sent once streaming ends.
  const lastPendingKeyRef = useRef(pendingMessageKey)

  // When a new pending message arrives, either send immediately or defer
  // #effect chat:auto-send:2
  useEffect(() => {
    if (!pendingMessage || pendingMessageKey === undefined) return
    // A read-only VIEWER never dispatches platform-composed sends (build
    // kickoffs, auto-fixes, preview-failure reports): the server 403s them
    // and the denial used to surface as a red error in the viewer's chat.
    // Consume the key so the same message isn't retried.
    if (canEdit === false) {
      lastPendingKeyRef.current = pendingMessageKey
      return
    }
    if (pendingMessageKey === lastPendingKeyRef.current) return
    lastPendingKeyRef.current = pendingMessageKey
    if (blockDisabledTeamMessage(pendingMessage)) return
    // A pending message is ALWAYS system-composed (an auto-fix prompt, a preview-failure
    // report, a "Fix with AI" request) — never text the user typed. So it must NEVER
    // render as a normal user bubble: either it's suppressed entirely (hidden build
    // kickoff) or it stays visible but flagged `automatic` so the chat shows it as sent
    // by Synthase on the user's behalf (distinct avatar + accent), not typed by the user.
    // Suppressed or not, a pending message is platform-composed, so it ALWAYS
    // carries `automatic` (+ `userInitiated` when a direct click requested it).
    // A suppressed send without `automatic` used to bypass the server's
    // user-stop gate — the hidden build kickoff resumed a plan turn ~37s
    // after an explicit Stop (prod 2026-08-13).
    const sendOpts = {
      ...(pendingMessageSuppressUser ? { suppressUserMessage: true } : {}),
      automatic: true,
      ...(pendingMessageUserInitiated ? { userInitiated: true } : {}),
    }
    if (isLoading) {
      // AI is busy — defer until streaming ends
      deferredPendingRef.current = pendingMessage
      deferredPendingSuppressRef.current = !!pendingMessageSuppressUser
      deferredPendingUserInitiatedRef.current = !!pendingMessageUserInitiated
    } else {
      deferredPendingRef.current = null
      sendMessage(pendingMessage, undefined, sendOpts)
    }
  }, [
    pendingMessage,
    pendingMessageKey,
    pendingMessageSuppressUser,
    pendingMessageUserInitiated,
    sendMessage,
    isLoading,
    canEdit,
    blockDisabledTeamMessage,
  ])

  // When streaming ends, send any deferred message. (A user Stop also ends
  // streaming, but handleAbort drops the deferred message first — and useChat's
  // stop guard would drop an autonomous automatic send anyway — so a stopped
  // turn is never auto-resumed by a fix that queued up mid-stream.)
  // #effect chat:auto-send:3
  useEffect(() => {
    if (!isLoading && deferredPendingRef.current) {
      const msg = deferredPendingRef.current
      const suppress = deferredPendingSuppressRef.current
      const userInitiated = deferredPendingUserInitiatedRef.current
      deferredPendingRef.current = null
      deferredPendingSuppressRef.current = false
      deferredPendingUserInitiatedRef.current = false
      // A viewer never dispatches platform-composed sends (same as the
      // immediate path above) — the refs are already drained, so it just drops.
      if (canEdit === false || blockDisabledTeamMessage(msg)) return
      // Same rule as the immediate path: a deferred pending message is system-composed —
      // always `automatic` (suppressed or visible), never a plain user bubble.
      sendMessage(msg, undefined, {
        ...(suppress ? { suppressUserMessage: true } : {}),
        automatic: true,
        ...(userInitiated ? { userInitiated: true } : {}),
      })
    }
  }, [isLoading, sendMessage, canEdit, blockDisabledTeamMessage])

  // ── Auto-delete queued autofix messages when user edits a relevant file ────
  const lastUserEditKeyRef = useRef(userEditedFileKey)
  // #effect chat:auto-send:4
  useEffect(() => {
    if (
      userEditedFile &&
      userEditedFileKey !== undefined &&
      userEditedFileKey !== lastUserEditKeyRef.current
    ) {
      lastUserEditKeyRef.current = userEditedFileKey
      clearQueuedForFile(userEditedFile)
    }
  }, [userEditedFile, userEditedFileKey, clearQueuedForFile])
  // #endregion chat:auto-send

  // #region chat:git
  // ── Commit ─────────────────────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    const scope = gitScopeRef.current
    // An older status response must not restore a pre-commit count.
    gitStatusRequestRef.current++
    setCommitState({ status: 'committing' })
    const cardId = `commit-${Date.now()}`
    setCommitCards((prev) => [
      ...prev,
      { id: cardId, message: '', files: [], timestamp: Date.now(), status: 'running' },
    ])
    try {
      const result = await http.post<{
        ok: boolean
        committed: boolean
        message?: string
        files?: string[]
        hash?: string
      }>(`/projects/${projectId}/commit`)
      if (scope !== gitScopeRef.current) return
      if (result.data.committed) {
        gitStatusRequestRef.current++
        const msg =
          result.data.message ?? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
        setCommitState({ status: 'committed', message: msg })
        setPendingFiles(null)
        setCommitBarExpanded(false)
        setCommitCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  message: msg,
                  files: result.data.files ?? [],
                  status: 'done' as const,
                  hash: result.data.hash,
                }
              : c,
          ),
        )
        onCommit?.()
        setTimeout(() => {
          if (scope === gitScopeRef.current) setCommitState(null)
        }, 3000)
      } else {
        setCommitCards((prev) => prev.filter((c) => c.id !== cardId))
        setCommitState(null)
        addSystemCard(
          result.data.message === 'No changes to commit'
            ? t('ide.chat.commitNoChanges', undefined, { defaultValue: 'No changes to commit.' })
            : result.data.message === 'A build is in progress'
              ? t('ide.chat.commitBuildInProgress', undefined, {
                  defaultValue: 'Wait for the build to finish before creating a Git commit.',
                })
              : t('ide.chat.commitError', undefined, { defaultValue: 'Failed to commit changes.' }),
        )
        void fetchPendingFiles()
        onCommit?.()
      }
    } catch (error) {
      if (scope !== gitScopeRef.current) return
      logger.warn('Commit request failed', { error })
      setCommitCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                status: 'error' as const,
                message: t('ide.chat.commitFailed', undefined, { defaultValue: 'Commit failed' }),
              }
            : c,
        ),
      )
      setCommitState({ status: 'error' })
      setTimeout(() => {
        if (scope === gitScopeRef.current) setCommitState(null)
      }, 3000)
    }
  }, [http, projectId, onCommit, addSystemCard, fetchPendingFiles, t])

  // ── Revert commit ────────────────────────────────────────────────────────
  /** Reverts a commit by hash. Returns the new revert commit's hash on success. */
  const handleRevertCommit = useCallback(
    async (hash: string): Promise<string | undefined> => {
      try {
        const result = await http.post<{
          ok: boolean
          message?: string
          hash?: string
          error?: string
        }>(`/projects/${projectId}/revert-commit`, { hash })
        if (result.data.ok) {
          onCommit?.()
          return result.data.hash
        }
      } catch (_error) {
        // network/server failure — caller receives `undefined` and can show its own error UI
      }
      return undefined
    },
    [http, projectId, onCommit],
  )
  // #endregion chat:git

  // #region chat:mention
  // ── File picker ────────────────────────────────────────────────────────────
  /** Cached flat file list from the sandbox — avoids re-fetching on every keystroke. */
  const allFilesRef = useRef<string[]>([])
  const allFilesFetchedRef = useRef(false)

  const openFilePicker = useCallback(
    async (query: string) => {
      // Fetch file list once, then reuse for subsequent keystrokes
      if (!allFilesFetchedRef.current) {
        try {
          const res = await http.get<{ files: string[] }>(`/projects/${projectId}/files-list`)
          // Normalize: strip /workspace/ prefix for display, keep as relative paths
          allFilesRef.current = (res.data.files ?? []).map((f) =>
            f.startsWith('/workspace/') ? f.slice('/workspace/'.length) : f,
          )
          allFilesFetchedRef.current = true
        } catch (_error) {
          // File list fetch failed — close the picker gracefully rather than showing stale entries
          setFilePicker(null)
          return
        }
      }

      const entries: FileEntry[] = allFilesRef.current.map((f) => ({
        name: f,
        type: 'file' as const,
      }))
      setFilePicker({ entries, query, selectedIdx: 0 })
    },
    [http, projectId],
  )

  /** Invalidate the cached file list when we know the tree changed. */
  // #effect chat:mention:1
  useEffect(() => {
    allFilesFetchedRef.current = false
  }, [externalGitStatusTick])

  const selectFileEntry = useCallback(
    (entry: FileEntry) => {
      const entryPath = '/' + entry.name
      setAttachedFiles((prev) =>
        prev.some((f) => f.path === entryPath)
          ? prev
          : [
              ...prev,
              {
                path: entryPath,
                filename: entry.name.split('/').pop() ?? entry.name,
                mediaType: 'text/plain',
                size: entry.size ?? 0,
              },
            ],
      )
      const prev = inputRef.current
      const before = prev.slice(0, mentionStart)
      const after = prev.slice(mentionStart + 1 + (filePicker?.query.length ?? 0))
      setInputValue(before + after)
      setFilePicker(null)
    },
    [filePicker?.query.length, mentionStart, setInputValue],
  )
  // #endregion chat:mention

  // #region chat:attachments
  const removeAttachment = useCallback((key: string) => {
    setAttachedFiles((prev) => {
      const removed = prev.find((f) => (f.path ?? f.filename) === key)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => (f.path ?? f.filename) !== key)
    })
  }, [])
  // #endregion chat:attachments

  // #region chat:skills
  // "Loaded this session" — the SINGLE source of truth for which skills the user
  // has opened via Load. Shared by BOTH the proactive suggestion (so a skill stops
  // being re-nudged once loaded) and the /skills browser's "Loaded" badge (P2-06).
  const [loadedSkillPaths, setLoadedSkillPaths] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )
  // (The default-loaded skill set and its "explicit" flag are declared above the
  // chat:models region, whose settings hydrate fills them.)

  /**
   * Loads a skill from the `/skills` browser (or the proactive suggestion): opens
   * its `SKILL.md` in the editor and marks it loaded for this session, then
   * confirms with a system card.
   *
   * Loading does NOT attach the skill as message context: the agent already sees
   * every skill's name + description in its system prompt and reads bodies on
   * demand, and persistent "always-loaded" injection is configured separately via
   * the default-skills set (the "Default" toggle in the `/skills` browser). So
   * "Load" simply opens the file and records it in {@link loadedSkillPaths} so the
   * proactive tip stops re-suggesting it and the browser shows a "Loaded" badge.
   */
  const loadSkill = useCallback(
    (skill: SkillInfo) => {
      // Record it as loaded-this-session (shared source of truth for the tip + the
      // /skills "Loaded" badge). Set is treated as immutable so consumers re-render.
      setLoadedSkillPaths((prev) => (prev.has(skill.path) ? prev : new Set(prev).add(skill.path)))
      // Open the skill in the editor (onFileOpen expects a project-relative path, no
      // leading slash). Loading a skill does NOT attach it as context — it just opens
      // it; the agent reads the skill file on demand, like every other harness.
      onFileOpen?.(skill.path, { focus: true })
      // Confirm with a compact card: "Loaded `<skill>` skill" — the name rendered as a
      // clickable monospace span that re-opens it in the editor. No attachment wording.
      // One translated sentence, split where its {{name}} lands, so each language
      // places the name itself.
      const loaded = (name: string): string =>
        t('ide.chat.skills.loaded', { name }, { defaultValue: 'Loaded {{name}} skill' })
      const content = cardSegmentsAround(loaded, {
        label: skill.name,
        code: true,
        onClick: () => onFileOpen?.(skill.path, { focus: true }),
      })
      addSystemCard(loaded(skill.name), content ? { content } : {})
    },
    [onFileOpen, addSystemCard, t],
  )

  /**
   * Creates a new project skill (the `/skills` browser's "New skill" form):
   * writes a starter `.agents/skills/<slug>/SKILL.md`
   * (name + description frontmatter), opens it in the editor for authoring, and
   * confirms with a system card. Resolves the created skill (so the browser can
   * list it without a re-fetch) or `null` if the write failed.
   */
  const createSkill = useCallback(
    async (name: string): Promise<SkillInfo | null> => {
      const display = name.trim()
      if (!display) return null
      const path = newSkillPath(display)
      const content = buildNewSkillTemplate(display)
      try {
        await http.put(`/projects/${projectId}/files/${path}`, { content })
      } catch (error) {
        logger.warn('Failed to create skill', { error })
        addSystemCard(
          t('ide.chat.skills.createError', undefined, {
            defaultValue: 'Could not create the skill — please try again.',
          }),
        )
        return null
      }
      // Open the new SKILL.md so the user can author it right away.
      onFileOpen?.(path, { focus: true })
      addSystemCard(
        t(
          'ide.chat.skills.created',
          { name: display },
          {
            defaultValue:
              'Created skill “{{name}}” — opened in the editor. Fill in its description and steps.',
          },
        ),
      )
      const meta = parseSkillMeta(path, content)
      return { path, name: meta.name, description: meta.description }
    },
    [onFileOpen, addSystemCard, t, http, projectId],
  )

  // ── Proactive "Relevant skill" suggestion (SYN4) ──────────────────────────
  // The auto-suggest half of /skills: once the conversation has a user message,
  // load the project's skills once and run a relevance pass over the recent
  // messages, offering the best match with a one-click Load just above the
  // composer. Dismissed (or already-loaded) skills are excluded so the hint is
  // never nagging.
  const [projectSkills, setProjectSkills] = useState<SkillInfo[]>([])
  const skillsLoadedRef = useRef(false)
  const [dismissedSkillPaths, setDismissedSkillPaths] = useState<readonly string[]>([])

  // #effect chat:skills:1
  useEffect(() => {
    // Hardened seed (the real cause of hollow stars): the skill file API can lag at
    // mount (the sandbox isn't serving `.agents` yet), so the very first
    // `loadProjectSkills` often resolves EMPTY or throws. We must NOT latch the guard
    // until a NON-EMPTY load succeeds — otherwise `defaultSkillPaths` stays empty
    // forever and every /skills star renders hollow even though "unset → all default".
    // On an empty/failed load we schedule a bounded retry so the seed eventually
    // captures the scaffolded skills.
    if (skillsLoadedRef.current) return
    let cancelled = false
    let attempts = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    // A handful of ~1.5s attempts outlasts the file-API warm-up without nagging if
    // the project genuinely has no skills.
    const SEED_RETRY_MS = 1500
    const SEED_MAX_ATTEMPTS = 5

    const scheduleRetry = (): void => {
      if (cancelled || attempts >= SEED_MAX_ATTEMPTS) return
      retryTimer = setTimeout(() => {
        void attempt()
      }, SEED_RETRY_MS)
    }

    const attempt = async (): Promise<void> => {
      if (cancelled || skillsLoadedRef.current) return
      attempts++
      try {
        const loaded = await loadProjectSkills(
          async () =>
            (await http.get<{ files: string[] }>(`/projects/${projectId}/files-list`)).data.files ??
            [],
          async (relativePath) =>
            (await http.get<{ content: string }>(`/projects/${projectId}/files/${relativePath}`))
              .data.content,
        )
        // Don't setState after unmount — the fetch resolving post-teardown would
        // otherwise schedule a React commit with no DOM behind it (leaked async).
        if (cancelled) return
        if (loaded.length === 0) {
          // Empty: the file API likely isn't serving `.agents` yet. Retry without
          // latching so a later attempt can still seed the scaffolded skills.
          scheduleRetry()
          return
        }
        // Latch ONLY on a successful, non-empty load — a retry can still run before this.
        skillsLoadedRef.current = true
        setProjectSkills(loaded)
        // P3-11: with no explicit saved set, ALL initial/discovered skills are
        // default — seed the badge set so the /skills browser reflects it (the
        // backend likewise injects every initial skill when defaultSkills is unset).
        if (!defaultSkillsExplicitRef.current) {
          setDefaultSkillPaths(new Set(loaded.map((s) => s.path)))
        }
        // NB: the "Loaded {{count}} skills" card is NO LONGER announced here. It is now
        // emitted server-side (a `skills_loaded` custom event), so it carries the monotonic
        // server timestamp and is shared across every collaborator on the project. This
        // effect only seeds the local /skills browser state.
      } catch (error) {
        // Best-effort — a failed skills fetch must never disrupt the chat. Retry a
        // few times (the file API may be warming up); after the cap, skip silently.
        logger.debug('Skill seed load failed; will retry if attempts remain', { error })
        if (!cancelled) scheduleRetry()
      }
    }

    void attempt()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [http, projectId])

  // The top-matching skill to nudge the user to load — null if it's already loaded (@-loaded
  // this session OR default-loaded / always-on in the prompt) so we never suggest context the
  // agent already has. See pickRelevantSkill for the no-parade + already-loaded rationale.
  const relevantSkill = useMemo<SkillInfo | null>(
    () =>
      pickRelevantSkill(projectSkills, recentUserText(messages), {
        dismissed: new Set(dismissedSkillPaths),
        attachedPaths: new Set(
          attachedFiles.map((f) => f.path).filter((p): p is string => p !== undefined),
        ),
        loaded: loadedSkillPaths,
        defaultLoaded: defaultSkillPaths,
      }),
    [
      projectSkills,
      attachedFiles,
      dismissedSkillPaths,
      loadedSkillPaths,
      defaultSkillPaths,
      messages,
    ],
  )

  const dismissRelevantSkill = useCallback((skill: SkillInfo) => {
    setDismissedSkillPaths((prev) => (prev.includes(skill.path) ? prev : [...prev, skill.path]))
  }, [])

  /**
   * Toggles a skill's membership in the persisted per-project default-loaded set
   * (`settings.defaultSkills`) and saves it. Optimistically updates local state,
   * then PATCHes the project (mirroring the other settings-patch paths); on failure
   * it rolls back so the badge/toggle reflect the server. The backend injects each
   * default skill's full body into the system prompt, so "default" means the skill
   * is always loaded for the agent (P2-06/P2-08).
   *
   * @param skill - The skill to toggle.
   * @param next - `true` to add it to the default set, `false` to remove it.
   */
  const toggleDefaultSkill = useCallback(
    (skill: SkillInfo, next: boolean) => {
      // Skills haven't loaded yet: the seeding effect fills `defaultSkillPaths`
      // (= every discovered skill) only AFTER `loadProjectSkills` resolves — a
      // sandbox exec that takes seconds. A toggle before that would read the
      // empty initial set as the base and persist a bogus 1-element explicit
      // array (and lock `defaultSkillsExplicitRef`), a one-way door out of the
      // unset→all default (P3-11). Ignore the click until skills exist.
      if (projectSkills.length === 0) return
      // While the set is still IMPLICIT (unset → ALL skills are default), the
      // effective current default set is EVERY loaded skill — so compute the base
      // from all skills, not the (possibly still-empty / not-yet-seeded) badge
      // set. That way toggling one OFF persists "all-minus-one", never the bogus
      // "[just-this-one]".
      const base = defaultSkillsExplicitRef.current
        ? defaultSkillPaths
        : new Set(projectSkills.map((s) => s.path))
      if (next === base.has(skill.path)) return
      // Any explicit toggle locks in an explicit set (persisted below), so the
      // "all initial skills" default no longer re-seeds it (P3-11).
      const previous = defaultSkillPaths
      const previousExplicit = defaultSkillsExplicitRef.current
      defaultSkillsExplicitRef.current = true
      setDefaultSkillsExplicit(true)
      const updated = new Set(base)
      if (next) updated.add(skill.path)
      else updated.delete(skill.path)
      setDefaultSkillPaths(updated)
      http
        .patch(`/projects/${projectId}`, { settings: { defaultSkills: [...updated] } })
        .catch((error) => {
          // Roll back the optimistic toggle (set + explicit flag) so the
          // badge/toggle reflect the server.
          logger.warn('Failed to persist default skills to server', { error })
          defaultSkillsExplicitRef.current = previousExplicit
          setDefaultSkillsExplicit(previousExplicit)
          setDefaultSkillPaths(previous)
        })
    },
    [defaultSkillPaths, http, projectId, projectSkills],
  )

  /**
   * Resets the per-project default-loaded skill set back to the IMPLICIT
   * "ALL skills are default" state (P3-11), undoing any explicit set the user
   * built via the per-row toggles. Clears the explicit flag, re-seeds the badge
   * set to every loaded skill, and PATCHes `settings.defaultSkills: null` so the
   * backend likewise treats it as unset → injects every skill's body. On failure
   * it rolls back local state (mirroring {@link toggleDefaultSkill}). This is the
   * only way back through the otherwise one-way door of the first explicit toggle.
   */
  const resetDefaultSkills = useCallback(() => {
    const previous = defaultSkillPaths
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = false
    setDefaultSkillsExplicit(false)
    setDefaultSkillPaths(new Set(projectSkills.map((s) => s.path)))
    http.patch(`/projects/${projectId}`, { settings: { defaultSkills: null } }).catch((error) => {
      // Roll back so the badge/toggle reflect the server.
      logger.warn('Failed to reset default skills on server', { error })
      defaultSkillsExplicitRef.current = previousExplicit
      setDefaultSkillsExplicit(previousExplicit)
      setDefaultSkillPaths(previous)
    })
  }, [defaultSkillPaths, http, projectId, projectSkills])
  // #endregion chat:skills

  // #region chat:scripts
  // Runs a saved script by name (the /run <name> command). Fetches the script
  // list to resolve the (possibly partial) name, runs the match, and reports the
  // captured output + exit status as a system card.
  const runSavedScript = useCallback(
    async (rawName: string, params: Record<string, string> = {}) => {
      try {
        const listed = await http.get<{ scripts: ScriptInfo[] }>(`/projects/${projectId}/scripts`)
        const scripts = listed.data.scripts ?? []
        const target = findScriptByName(scripts, rawName)
        if (!target) {
          addSystemCard(
            scripts.length
              ? t(
                  'ide.chat.scripts.runNotFound',
                  { name: rawName, names: scripts.map((s) => s.name).join(', ') },
                  { defaultValue: 'No script named “{{name}}”. Available: {{names}}' },
                )
              : t('ide.chat.scripts.runNone', undefined, {
                  defaultValue: 'No saved scripts yet. Open /scripts to create one.',
                }),
          )
          return
        }
        // A script with required options the command line didn't supply needs the
        // panel's form — open it filtered to this script so the user can fill them
        // in and Run, rather than failing the run for a missing value.
        if (missingRequiredParams(target, params).length > 0) {
          openPanelOverlay('scripts', target.name)
          addSystemCard(
            t(
              'ide.chat.scripts.runNeedsOptions',
              { name: target.name },
              {
                defaultValue:
                  '“{{name}}” needs options — opened /scripts so you can set them and Run.',
              },
            ),
          )
          return
        }
        const run = await http.post<ScriptRunResult>(
          `/projects/${projectId}/scripts/${encodeURIComponent(target.name)}/run`,
          Object.keys(params).length ? { params } : undefined,
        )
        const output = formatRunOutput(run.data)
        const status = runSucceeded(run.data)
          ? t(
              'ide.chat.scripts.cmdExitOk',
              { name: target.name },
              { defaultValue: '{{name}} exited 0' },
            )
          : t(
              'ide.chat.scripts.cmdExitFail',
              { name: target.name, code: run.data.exitCode },
              { defaultValue: '{{name}} exited with code {{code}}' },
            )
        addSystemCard(output ? `${status}\n${output}` : status)
      } catch (error) {
        logger.warn('Failed to run script via /run command', { error })
        addSystemCard(
          t('ide.chat.scripts.runError', undefined, { defaultValue: 'Failed to run the script.' }),
        )
      }
    },
    [http, projectId, t, addSystemCard, openPanelOverlay],
  )
  // #endregion chat:scripts

  // #region chat:attachments
  // ── File attachment handlers ──────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFileAttachments = useCallback(
    (files: File[]) => {
      setAttachmentError(null)
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setAttachmentError(
            t(
              'ide.chat.fileTooLarge',
              { maxSize: '20' },
              { defaultValue: 'File is too large. Maximum size is {{maxSize}}MB.' },
            ),
          )
          continue
        }
        const attachment: AttachedFile = {
          file,
          filename: file.name,
          mediaType: file.type || 'application/octet-stream',
          size: file.size,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        }
        setAttachedFiles((prev) => [...prev, attachment])
      }
    },
    [t],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFileAttachments(Array.from(e.target.files ?? []))
      e.target.value = ''
    },
    [addFileAttachments],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      const fileItems = items.filter((item) => item.kind === 'file')
      if (fileItems.length === 0) return

      e.preventDefault()
      const files: File[] = []
      for (const item of fileItems) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
      addFileAttachments(files)
    },
    [addFileAttachments],
  )

  const [isDragOver, setIsDragOver] = useState(false)

  const dragCounterRef = useRef(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragOver(false)
      addFileAttachments(Array.from(e.dataTransfer.files))
    },
    [addFileAttachments],
  )
  // #endregion chat:attachments

  // #region chat:input
  // ── Input change ───────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      inputRef.current = val
      pruneDictatedSnippets()
      setHasInput(Boolean(val.trim()))
      autoResize()
      persistDraft()

      // Pause auto-fix countdown when user starts typing
      handleAutoFixPauseOnInput()

      const cursor = e.target.selectionStart ?? val.length
      const before = val.slice(0, cursor)

      // Close button-driven pickers when user starts typing — popups are
      // one-at-a-time, and these aren't managed by the input-parsing below
      setSoundsPicker(null)
      setMicPicker(null)

      const atMatch = before.match(/@(\S*)$/)
      if (atMatch) {
        setMentionStart(cursor - atMatch[0].length)
        void openFilePicker(atMatch[1])
        setCommandMenu(null)
        return
      }
      setFilePicker(null)

      // Show model picker when typing "/model <filter>" — scoped to the mode a
      // --plan / --execute flag names, else to the LIVE conversation mode
      // (discovery = plan), so a plain pick changes the mode the user is in.
      const modelMatch = val.match(/^\/model\s+/i)
      if (modelMatch) {
        setModelPicker({
          selectedIdx: -1,
          mode: parseModelModeCommand(val)?.mode ?? liveModelMode,
          text: val,
        })
        setCommandMenu(null)
        return
      }
      setModelPicker(null)

      // Show the effort picker while typing "/effort ..." — same live behavior
      // as /model. Text after the command (minus the --plan/--execute flag)
      // filters the level list; "?" keeps the textual status path instead. A
      // dropdown-chosen mode survives further keystrokes unless a flag names one.
      if (/^\/effort\s/i.test(val)) {
        const typed = parseEffortCommand(val)
        if (typed && (typed.kind === 'menu' || (typed.kind === 'set' && typed.arg !== '?'))) {
          const typedMode = typed.mode
          setEffortPicker((p) => ({
            selectedIdx: -1,
            mode: typedMode ?? p?.mode ?? liveModelMode,
            text: val,
          }))
          setCommandMenu(null)
          return
        }
      }
      setEffortPicker(null)

      if (val.startsWith('/') && !val.includes(' ')) {
        setCommandMenu({ selectedIdx: -1, text: val })
      } else {
        setCommandMenu(null)
      }
    },
    [
      pruneDictatedSnippets,
      autoResize,
      persistDraft,
      handleAutoFixPauseOnInput,
      openFilePicker,
      liveModelMode,
    ],
  )

  // ── Execute command ────────────────────────────────────────────────────────
  /** Sets textarea value and moves cursor to the end. */
  const setInputAndCursorEnd = useCallback(
    (val: string) => {
      setInputValue(val)
      autoResize()
      setTimeout(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(val.length, val.length)
        }
      }, 0)
    },
    [setInputValue, autoResize],
  )

  // Viewer composer prefill: the box IS the team-chat input, so it starts with
  // "/teamsay " already typed (and handleSubmit re-fills it after each sent team
  // message). Once per mount, and never over text the user already has (the
  // done flag is declared with the tips state, whose switch effect re-arms it).
  // #effect chat:input:1
  useEffect(() => {
    if (transcriptOnly || canEdit !== false || viewerPrefillDoneRef.current) return
    viewerPrefillDoneRef.current = true
    if (!(inputRef.current as string).trim()) setInputAndCursorEnd('/teamsay ')
  }, [canEdit, setInputAndCursorEnd, conversationId, transcriptOnly])
  // #endregion chat:input

  // #region chat:model-actions
  /**
   * Select and apply a model by ID. When `mode` is given the choice persists to
   * that mode's per-mode field (`planModel` / `executeModel` /
   * `commitModel` / `compactModel`); otherwise it sets the legacy single
   * `chatModel`.
   */
  const selectModel = useCallback(
    async (modelId: string, displayName?: string, mode?: ModelMode) => {
      setModelPicker(null)
      setInputValue('')
      const name = displayName ?? modelId
      try {
        if (mode) {
          await http.patch(settingsPatchUrl(), {
            settings: { [modeSettingKey(mode)]: modelId },
          })
          if (mode === 'plan') setPlanModel(modelId)
          else if (mode === 'execute') setExecuteModel(modelId)
          else if (mode === 'commit') setCommitModel(modelId)
          else setCompactModel(modelId)
          addSystemCard(
            mode === 'plan'
              ? t(
                  'ide.chat.planModelSet',
                  { name },
                  { defaultValue: 'Plan-mode model set to {{name}}' },
                )
              : mode === 'execute'
                ? t(
                    'ide.chat.executeModelSet',
                    { name },
                    { defaultValue: 'Execute-mode model set to {{name}}' },
                  )
                : mode === 'commit'
                  ? t(
                      'ide.chat.commitModelSet',
                      { name },
                      { defaultValue: 'Commit-message model set to {{name}}' },
                    )
                  : t(
                      'ide.chat.compactModelSet',
                      { name },
                      { defaultValue: 'Compaction model set to {{name}}' },
                    ),
          )
        } else {
          await http.patch(settingsPatchUrl(), { settings: { chatModel: modelId } })
          setSavedChatModel(modelId)
          addSystemCard(
            t('ide.chat.modelSet', { name }, { defaultValue: 'Chat model set to {{name}}' }),
          )
        }
      } catch (error) {
        logger.warn('Failed to update chat model', { error })
        addSystemCard(
          t('ide.chat.modelError', undefined, {
            defaultValue: 'Failed to update chat model.',
          }),
        )
      }
    },
    [addSystemCard, http, setInputValue, settingsPatchUrl, t],
  )

  // Set a model's processing region (US / native-China). Mirrors the
  // effortByMode PATCH: shallow-merge on the server means we send the WHOLE
  // modelRegions map, not just the changed entry.
  const setModelRegion = useCallback(
    async (modelId: string, region: ModelRegion) => {
      if (modelRegions[modelId] === region) return
      const nextRegions = { ...modelRegions, [modelId]: region }
      setModelRegions(nextRegions)
      try {
        await http.patch(settingsPatchUrl(), {
          settings: { modelRegions: nextRegions },
        })
      } catch (error) {
        logger.warn('Failed to update model processing region', { error })
      }
    },
    [modelRegions, http, settingsPatchUrl],
  )

  // Persist a mode's reasoning effort (used by both the /effort <level> typed
  // path and the effort picker). Shallow-merge on the server means we send the
  // WHOLE effortByMode map, not just the changed entry.
  const applyEffortLevel = useCallback(
    async (targetMode: EffortMode, level: EffortLevel, targetModel?: AppModelDefinition) => {
      setEffortPicker(null)
      setInputValue('')
      try {
        const nextByMode = { ...effortByMode, [targetMode]: level }
        await http.patch(settingsPatchUrl(), { settings: { effortByMode: nextByMode } })
        setEffortByMode(nextByMode)
        addSystemCard(
          t(
            'ide.chat.effort.setMode',
            {
              mode: targetMode,
              level: nativeEffortName(targetModel, level) ?? level,
              model: targetModel?.label ?? '?',
            },
            { defaultValue: 'Reasoning effort for {{mode}} set to {{level}} ({{model}}).' },
          ),
        )
      } catch (error) {
        logger.warn('Failed to update reasoning effort level', { error })
        addSystemCard(
          t('ide.chat.effort.error', undefined, {
            defaultValue: 'Failed to update reasoning effort.',
          }),
        )
      }
    },
    [setInputValue, effortByMode, http, settingsPatchUrl, addSystemCard, t],
  )
  // #endregion chat:model-actions

  // #region chat:commands
  // The shared command registry UNION any host-provided commands (e.g.
  // molecule.dev's /deploy, /push, /invite, /teamsay), so the menu, grouping,
  // and dispatch all see one list and host commands never go missing. Deduped
  // by id with the host winning: a host may override a shared command (the id
  // is already routed to the host first, see `extraCommandIds`), and the menu
  // must then list it once, with the host's label and description. Declared
  // before executeCommand since it lives in that callback's dependency list.
  const allCommands = useMemo<readonly CommandDef[]>(() => {
    const overridden = new Set((extraCommands ?? []).map((c) => c.id))
    // Widened to CommandDef on purpose: the menu renders registry commands AND
    // host-added ones through one list, so the elements must read as plain
    // CommandDefs, not the registry's literal row types.
    const merged: CommandDef[] = [
      ...COMMANDS.filter((c) => !overridden.has(c.id)),
      ...(extraCommands ?? []),
    ]
    return merged.filter((command) => canSendTeamMessages !== false || !command.sideChannel)
  }, [extraCommands, canSendTeamMessages])
  const extraCommandIds = useMemo(
    () =>
      new Set(
        (extraCommands ?? [])
          .filter((command) => canSendTeamMessages !== false || !command.sideChannel)
          .map((c) => c.id),
      ),
    [extraCommands, canSendTeamMessages],
  )

  const executeCommand = useCallback(
    async (id: CommandId) => {
      setCommandMenu(null)
      // Any command closes every sibling popup (panel overlay, model/effort/
      // sounds/mic pickers) so popups are strictly one-at-a-time — the branches
      // below re-open their own.
      setPanelOverlay(null)
      setModelPicker(null)
      setEffortPicker(null)
      setSoundsPicker(null)
      setMicPicker(null)
      // Host-provided commands (e.g. molecule.dev's /deploy, /push, /invite,
      // /teamsay) have no client-side branch here — fill the input with the
      // command so the user can add any arguments, then Enter sends it to the
      // host's own handler (a server intercept, or the agent for /push).
      if (extraCommandIds.has(id)) {
        setInputAndCursorEnd(`/${id} `)
        return
      }
      // A read-only VIEWER may run only viewerSafe commands (read / view-only /
      // per-user preference). Everything else writes shared project state or
      // triggers a Synthase turn the server 403s, so surface a read-only note
      // instead of a dead control that silently fails. Default-deny: an
      // unflagged command is unavailable to viewers.
      if (!canEdit) {
        const def = allCommands.find((c) => c.id === id)
        if (def && !viewerCommandAllowed(def)) {
          addSystemCard(
            t('ide.chat.viewerReadOnlyCommand', undefined, {
              defaultValue:
                'You have view-only access, so this command is unavailable. Ask an editor to make changes.',
            }),
          )
          return
        }
      }
      if (id === 'clear') {
        setInputValue('')
        await clearHistory()
        setCommitCards([])
        setSystemCards([])
        setContextUsage(null)
        setMaxVisibleItems(60)
      } else if (id === 'model') {
        setInputAndCursorEnd('/model ')
        setModelPicker({ selectedIdx: -1, mode: liveModelMode, text: '/model ' })
      } else if (id === 'mic' || id === 'dictate') {
        setInputValue('')
        setMicPicker({ autoStart: false })
      } else if (id === 'maxloops') {
        setInputAndCursorEnd('/maxloops ')
      } else if (id === 'effort') {
        // Open the selectable level picker (mirrors /model) scoped to the live
        // conversation mode; its mode dropdown re-scopes in place.
        setInputValue('')
        setEffortPicker({ selectedIdx: -1, mode: liveModelMode, text: '' })
      } else if (id === 'autocommit') {
        // Prefill so the user types the cadence (seconds); 0 cancels.
        setInputAndCursorEnd('/autocommit ')
      } else if (id === 'help') {
        setInputValue('')
        // Render the rich, interactive HelpCard variant (real category hierarchy,
        // clickable command rows) — see the 'help' variant branch, which reads the
        // host-supplied upgrade blurb at render time. The plain-text buildHelpText()
        // is still computed and stored as the card's `text` so it remains the i18n
        // fallback (and the copy/screen-reader text) if the rich variant is ever off.
        // Per-user UI: the /help browser is this client's own command output, never
        // shared conversation context (addSystemCard cards are session-local).
        addSystemCard(buildHelpText({ agentName, productName }), { variant: 'help' })
      } else if (id === 'compact') {
        setInputValue('')
        addSystemCard(
          t('ide.chat.compacting', undefined, { defaultValue: 'Compacting conversation...' }),
        )
        try {
          const compactUrl = conversationId
            ? `/projects/${projectId}/compact?conversationId=${conversationId}`
            : `/projects/${projectId}/compact`
          const res = await http.post<{ compactedCount: number }>(compactUrl)
          if (res.data.compactedCount > 0) {
            addSystemCard(
              t(
                'ide.chat.compacted',
                { count: res.data.compactedCount },
                { defaultValue: 'Compacted {{count}} messages.' },
              ),
            )
          } else {
            addSystemCard(
              t('ide.chat.compactNotNeeded', undefined, {
                defaultValue: 'Context usage is low — no compaction needed.',
              }),
            )
          }
        } catch (error) {
          logger.warn('Failed to compact conversation', { error })
          addSystemCard(
            t('ide.chat.compactError', undefined, {
              defaultValue: 'Failed to compact conversation.',
            }),
          )
        }
      } else if (id === 'plan') {
        setInputValue('')
        const newMode = mode === 'plan' ? 'execute' : 'plan'
        setMode(newMode)
        http
          .patch(`/projects/${projectId}/chat-mode`, { mode: newMode, conversationId })
          .catch((error) => {
            logger.warn('chat-panel: persisting chat-mode change failed; reverted', { error })
            setMode(mode)
          })
        addSystemCard(
          newMode === 'plan'
            ? t('ide.chat.switchedToPlan', undefined, { defaultValue: 'Switched to plan mode' })
            : t('ide.chat.switchedToExecute', undefined, {
                defaultValue: 'Switched to execute mode',
              }),
        )
      } else if (id === 'cost') {
        setInputValue('')
        try {
          const usageUrl = conversationId
            ? `/projects/${projectId}/chat-usage?conversationId=${conversationId}`
            : `/projects/${projectId}/chat-usage`
          const res = await http.get<{
            inputTokens: number
            outputTokens: number
            cacheReadInputTokens?: number
            cacheCreationInputTokens?: number
            allowancePercent?: number | null
            allowanceResetAt?: number | null
            allowanceWindow?: 'daily' | 'billing-period'
            model: string
            streaming?: boolean
          }>(usageUrl)
          const d = res.data
          const fmt = formatTokenTotal
          // AI usage is shown as a UNITLESS share of the allowance — currency
          // never appears on AI-usage surfaces. The percent is the owner's
          // spend in their CURRENT window (the number the chat gate actually
          // enforces), so 100% here IS the block point; at/above it the card
          // switches to the used-up line with the window's reset countdown.
          //
          // `allowanceWindow` says which span that is: the unpaid tiers meter
          // over a rolling day, the paid ones over their billing period, which
          // refreshes monthly (a yearly subscriber included). Naming the wrong
          // one is not cosmetic — this card said "today's" to a Pro user whose
          // allowance is monthly, so the plan read as day-capped. An older API
          // omits the field; fall back to the daily framing that shipped with it
          // rather than promising a month we cannot confirm.
          const isMonthlyAllowance = d.allowanceWindow === 'billing-period'
          const allowanceLine =
            typeof d.allowancePercent === 'number'
              ? '\n' +
                (d.allowancePercent >= 100 && typeof d.allowanceResetAt === 'number'
                  ? isMonthlyAllowance
                    ? t(
                        'ide.chat.usageAllowanceUsedUpMonthlyLine',
                        { when: allowanceResetCountdown(t, d.allowanceResetAt) },
                        {
                          defaultValue:
                            'This month’s AI allowance is used up — refreshes {{when}}.',
                        },
                      )
                    : t(
                        'ide.chat.usageAllowanceUsedUpLine',
                        { when: allowanceResetCountdown(t, d.allowanceResetAt) },
                        {
                          defaultValue: "Today's AI allowance is used up — refreshes {{when}}.",
                        },
                      )
                  : // Neutral phrasing on purpose in both: the allowance belongs
                    // to the PROJECT (its owner's plan window) — "you've used"
                    // misattributed it to whichever teammate ran /cost.
                    isMonthlyAllowance
                    ? t(
                        'ide.chat.usageAllowanceMonthlyLine',
                        { percent: d.allowancePercent },
                        {
                          defaultValue: '~{{percent}}% of this month’s AI allowance used.',
                        },
                      )
                    : t(
                        'ide.chat.usageAllowanceTodayLine',
                        { percent: d.allowancePercent },
                        {
                          defaultValue: "~{{percent}}% of today's AI allowance used.",
                        },
                      ))
              : ''
          // `inputTokens` counts only the UNCACHED prompt: every bond normalizes
          // cache hits into their own bucket (on OpenAI-compatible APIs like
          // DeepSeek that means `prompt_tokens - prompt_tokens_details.cached_tokens`).
          // In a long agentic turn the cached share is most of the volume, so
          // omitting it made this card look wildly smaller than the provider
          // dashboard, which reports total tokens processed. Show it.
          const cachedTokens = cachedPromptTokens(d)
          const cachedLine =
            cachedTokens > 0
              ? '\n' +
                t(
                  'ide.chat.costCachedLine',
                  { cached: fmt(cachedTokens) },
                  {
                    defaultValue: 'Cached input: {{cached}} tokens (billed at a fraction of input)',
                  },
                )
              : ''
          // Mid-stream the totals include the in-progress response's running
          // usage (the server folds it in) — say so, since the figure is still
          // growing.
          const streamingLine = d.streaming
            ? '\n' +
              t('ide.chat.costStreamingNote', undefined, {
                defaultValue: 'Running total — includes the response currently streaming.',
              })
            : ''
          addSystemCard(
            t(
              'ide.chat.costSummary',
              {
                model: d.model,
                input: fmt(d.inputTokens),
                output: fmt(d.outputTokens),
              },
              {
                // Keep this in sync with the ide.chat.costSummary value in the
                // ide locale bond.
                defaultValue:
                  'Model: {{model}}\nInput: {{input}} tokens\nOutput: {{output}} tokens',
              },
            ) +
              cachedLine +
              allowanceLine +
              streamingLine,
          )
        } catch (error) {
          logger.warn('Failed to fetch chat usage data', { error })
          addSystemCard(
            t('ide.chat.costError', undefined, { defaultValue: 'Unable to fetch usage data.' }),
          )
        }
      } else if (id === 'undo') {
        setInputValue('')
        // Collect the last assistant turn's file-changing tool calls (skipping
        // already-undone ones) and their original content.
        const { fileOriginals, tcIdsToUndo } = collectUndoTargets(messages, undoneTcIds)
        if (fileOriginals.size === 0) {
          addSystemCard(
            t('ide.chat.undoNoChanges', undefined, { defaultValue: 'No file changes to undo.' }),
          )
          return
        }
        try {
          for (const [path, content] of fileOriginals) {
            await handleFileRevert(path, content)
          }
          // Mark these tool calls as undone so the ToolCallCard icons reflect the state
          setUndoneTcIds((prev) => {
            const next = new Set(prev)
            for (const tcId of tcIdsToUndo) next.add(tcId)
            return next
          })
          persistUndoToggle(tcIdsToUndo, true)
          addSystemCard(
            t(
              'ide.chat.undoComplete',
              { count: fileOriginals.size },
              { defaultValue: 'Reverted {{count}} file(s) from last AI turn.' },
            ),
          )
        } catch (error) {
          logger.warn('Failed to revert file changes for undo', { error })
          addSystemCard(
            t('ide.chat.undoError', undefined, { defaultValue: 'Failed to revert changes.' }),
          )
        }
      } else if (id === 'commit') {
        setInputValue('')
        await handleCommit()
      } else if (id === 'test') {
        setInputValue('')
        // Was: a natural-language "run npm test and report" message to the
        // agent — a whole turn spent to read output the platform can run
        // directly. Now it opens the tests browser, like /scripts.
        openTestsBrowser('')
      } else if (id === 'explain') {
        setInputAndCursorEnd('/explain ')
      } else if (id === 'lint') {
        setInputValue('')
        sendMessage(
          'Run `npm run lint` in both api/ and app/ workspaces. Report all errors and warnings found and fix them.',
        )
      } else if (id === 'autofix') {
        setInputValue('')
        const newValue = !autoFixEnabled
        try {
          await http.patch(settingsPatchUrl(), { settings: { autoFix: newValue } })
          setAutoFixEnabled(newValue)
          addSystemCard(
            newValue
              ? t('ide.chat.autoFixEnabled', undefined, {
                  defaultValue: 'Auto-fix enabled.',
                })
              : t('ide.chat.autoFixDisabled', undefined, {
                  defaultValue: 'Auto-fix disabled.',
                }),
          )
        } catch (error) {
          logger.warn('Failed to update auto-fix setting', { error })
          addSystemCard(
            t('ide.chat.autoFixError', undefined, {
              defaultValue: 'Failed to update auto-fix setting.',
            }),
          )
        }
      } else if (id === 'autoapprove') {
        setInputValue('')
        const newValue = !autoApproveCommandsEnabled
        try {
          await http.patch(settingsPatchUrl(), {
            settings: { autoApproveCommands: newValue },
          })
          setAutoApproveCommandsEnabled(newValue)
          addSystemCard(
            newValue
              ? t('ide.chat.autoApproveEnabled', undefined, {
                  defaultValue:
                    'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
                })
              : t('ide.chat.autoApproveDisabled', undefined, {
                  defaultValue: 'Auto-approve off — destructive commands ask before running.',
                }),
          )
        } catch (error) {
          logger.warn('Failed to update auto-approve setting', { error })
          addSystemCard(
            t('ide.chat.autoApproveError', undefined, {
              defaultValue: 'Failed to update auto-approve setting.',
            }),
          )
        }
      } else if (id === 'sounds') {
        setInputValue('')
        setSoundsPicker({ selectedIdx: -1 })
      } else if (id === 'timestamps') {
        setInputValue('')
        applyTimestampsVisible(!getChatTimestampsVisible())
      } else if (id === 'settings') {
        setInputValue('')
        // Opens the settings + command-reference card in a closeable overlay.
        openPanelOverlay('settings')
      } else if (id === 'skills') {
        setInputValue('')
        // Opens the skills browser in a closeable overlay. A query, if any, is
        // supplied via the /skills <query> path in handleSubmit.
        openPanelOverlay('skills')
      } else if (id === 'scripts') {
        setInputValue('')
        // Opens the scripts browser in a closeable overlay. A query, if any, is
        // supplied via the /scripts <query> path in handleSubmit.
        openPanelOverlay('scripts')
      } else if (id === 'run') {
        // /run needs a script name — prefill so the user can type it (the run is
        // dispatched from handleSubmit via runSavedScript).
        setInputAndCursorEnd('/run ')
      } else if (id === 'report' || id === 'bug') {
        setInputValue('')
        setReportModal({ title: '' })
      } else if (id === 'version') {
        setInputValue('')
        // P3-21: /version replaces the old command-menu footer version line.
        // Version is the host-supplied `version` prop (the real build version), falling
        // back to the package APP_VERSION constant; the same value drives the
        // slash-command menu's /version description (P4-08).
        addSystemCard(
          t(
            'ide.chat.version',
            // `||` (not `??`): the host-supplied version prop can be an EMPTY string
            // (useVersion before it resolves), which `??` would NOT fall back on —
            // leaving a bare "v". Fall back to APP_VERSION for empty AND null/undefined.
            { productName, version: version || APP_VERSION },
            { defaultValue: '{{productName}} v{{version}}' },
          ),
        )
      } else if (id === 'share') {
        setInputValue('')
        if (shareAllowed) setShareModal({ role: DEFAULT_SHARE_ROLE })
      }
    },
    [
      extraCommandIds,
      canEdit,
      setInputAndCursorEnd,
      allCommands,
      addSystemCard,
      t,
      setInputValue,
      clearHistory,
      liveModelMode,
      agentName,
      productName,
      conversationId,
      projectId,
      http,
      mode,
      setMode,
      messages,
      undoneTcIds,
      persistUndoToggle,
      handleFileRevert,
      handleCommit,
      openTestsBrowser,
      sendMessage,
      autoFixEnabled,
      settingsPatchUrl,
      autoApproveCommandsEnabled,
      applyTimestampsVisible,
      openPanelOverlay,
      version,
      shareAllowed,
    ],
  )
  // #endregion chat:commands

  // #region chat:auto-commit
  // When the auto-commit countdown reaches zero, fire the existing /commit path
  // (no new backend) and pause until the next file change re-arms it. /commit
  // itself no-ops on a clean tree, so a stray fire is harmless. Guarded by the
  // same hold as the tick interval (belt for the race where a turn starts on
  // the exact render the countdown hits zero): never commit mid-turn — the
  // effect re-runs when the hold clears and fires then.
  useCommittedRef(executeCommandRef, executeCommand)
  // #endregion chat:auto-commit

  // #region chat:submit
  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Stop voice recognition on submit
    dictation.stopForSubmit()

    const route = routeComposerSubmit(inputRef.current, {
      transcriptOnly,
      attachedCount: attachedFiles.length,
      canEdit,
      canSendTeamMessages,
      allCommands,
      extraCommands,
      readTestsBarVisible: getTestsBarVisible,
    })

    switch (route.kind) {
      case 'ignored':
        return
      case 'team-blocked':
        addSystemCard(
          t('ide.chat.teamMessagesUnavailable', undefined, {
            defaultValue: 'Team messaging is unavailable in this workspace.',
          }),
        )
        return
      case 'viewer-blocked':
        setInputValue('')
        addSystemCard(
          t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          }),
        )
        return
      case 'autofix':
        void executeCommand('autofix')
        return
      case 'autoapprove':
        void executeCommand('autoapprove')
        return
      case 'sounds':
        setInputValue('')
        // Sounds owns the popup region exclusively — close any open panel overlay.
        setPanelOverlay(null)
        setSoundsPicker({ selectedIdx: -1 })
        return
      case 'tests-bar':
        setInputValue('')
        setTestsBarVisible(route.visible)
        addSystemCard(
          route.visible
            ? t('ide.chat.testsBarShown', undefined, { defaultValue: 'Tests bar shown.' })
            : t('ide.chat.testsBarHidden', undefined, { defaultValue: 'Tests bar hidden.' }),
        )
        return
      case 'timestamps':
        setInputValue('')
        if (route.command.action === 'invalid') {
          addSystemCard(
            t('ide.chat.timestampsUsage', undefined, {
              defaultValue: 'Usage: /timestamps [on | off]',
            }),
          )
        } else {
          applyTimestampsVisible(
            route.command.action === 'toggle'
              ? !getChatTimestampsVisible()
              : route.command.action === 'on',
          )
        }
        return
      case 'settings':
        void executeCommand('settings')
        return
      case 'skills':
        setInputValue('')
        openPanelOverlay('skills', route.query)
        return
      case 'scripts':
        setInputValue('')
        openPanelOverlay('scripts', route.query)
        return
      case 'tests':
        setInputValue('')
        openTestsBrowser(route.query, route.runAll)
        return
      case 'run-script':
        setInputValue('')
        if (!route.name) {
          addSystemCard(
            t('ide.chat.scripts.runUsage', undefined, {
              defaultValue: 'Usage: /run <name> — run a saved script. Use /scripts to see them.',
            }),
          )
        } else {
          void runSavedScript(route.name, route.params)
        }
        return
      case 'report':
        setInputValue('')
        setReportModal({ title: route.title })
        return
      case 'share':
        setInputValue('')
        if (!shareAllowed) {
          addSystemCard(
            t('ide.chat.share.notAllowed', undefined, {
              defaultValue: 'Managing share links needs an admin role on this project.',
            }),
          )
          return
        }
        if (route.command.kind === 'invalid') {
          addSystemCard(
            t(
              'ide.chat.share.usage',
              { roles: SHARE_ROLES.join(', ') },
              {
                defaultValue:
                  'Usage: /share [role] — create a public link. Roles: {{roles}} (default viewer).',
              },
            ),
          )
        } else {
          setShareModal({ role: route.command.role })
        }
        return
      case 'autocommit':
        setInputValue('')
        if (route.seconds === null) {
          addSystemCard(
            t('ide.chat.autoCommit.usage', undefined, {
              defaultValue:
                'Usage: /autocommit <seconds> — auto-commit that many seconds after the last file change. /autocommit 0 cancels.',
            }),
          )
        } else if (route.seconds <= 0) {
          dispatchAutoCommit({ type: 'set', seconds: 0 })
          addSystemCard(
            t('ide.chat.autoCommit.cancelled', undefined, {
              defaultValue: 'Auto-commit cancelled.',
            }),
          )
        } else {
          dispatchAutoCommit({ type: 'set', seconds: route.seconds })
          addSystemCard(
            t(
              'ide.chat.autoCommit.enabled',
              { seconds: route.seconds },
              {
                defaultValue:
                  'Auto-commit on: committing {{seconds}}s after the last file change.\nSet to 0 to disable autocommit.',
              },
            ),
          )
        }
        return
      case 'model-mode':
        setInputValue('')
        // Model picker owns the popup region exclusively — close any open overlay.
        setPanelOverlay(null)
        setModelPicker({ selectedIdx: -1, mode: route.mode, text: '' })
        return
      case 'mic':
        setInputValue('')
        setPanelOverlay(null)
        setCommandMenu(null)
        setModelPicker(null)
        setEffortPicker(null)
        setSoundsPicker(null)
        setMicPicker({ autoStart: false })
        return
      case 'model': {
        const query = route.query
        if (!query) {
          // Examples come from the live catalog, never the translation: model ids
          // are not translatable, and a hardcoded list goes stale the day a newer
          // generation ships.
          const examples = partitionByDeprecation(AVAILABLE_MODELS)
            .current.slice(0, 3)
            .map((m) => m.id)
            .join(', ')
          addSystemCard(
            t(
              'ide.chat.modelUsage',
              { examples },
              { defaultValue: 'Usage: /model <model-name>  (e.g. {{examples}})' },
            ),
          )
        } else {
          // Resolve partial name to closest model
          const resolved = resolveModelQuery(query, AVAILABLE_MODELS)
          const name = resolved?.id ?? query
          // Block free-tier users from selecting paid models. Custom
          // (bring-your-own AI) models are exempt on every tier — the user pays
          // their own provider directly.
          if (isFreeTier && name !== FREE_TIER_MODEL && resolved?.provider !== 'custom') {
            addSystemCard(
              t(
                'ide.chat.modelUpgradeRequired',
                { model: resolved?.label ?? name },
                { defaultValue: '{{model}} is available on Pro. Upgrade to access all models.' },
              ),
              // The upgrade/sign-in button(s) are the host's (its own routes/copy).
              { action: buildUpgradeCta?.({}) ?? undefined },
            )
          } else {
            // Unscoped /model targets the CURRENT conversation mode (discovery =
            // plan), same as /effort — never the legacy both-modes chatModel.
            await selectModel(name, resolved?.label ?? name, liveModelMode)
          }
        }
        setInputValue('')
        setModelPicker(null)
        return
      }
      case 'effort': {
        const effortCmd = route.command
        setInputValue('')
        // Bare /effort (or a bare --plan/--execute flag) opens the selectable
        // level picker — same interaction as bare /model. The picker lists the
        // target mode's model's own levels; its mode dropdown re-scopes in place.
        if (effortCmd.kind === 'menu') {
          setPanelOverlay(null)
          setCommandMenu(null)
          setModelPicker(null)
          setSoundsPicker(null)
          setMicPicker(null)
          setEffortPicker({
            selectedIdx: -1,
            mode: effortCmd.mode ?? liveModelMode,
            text: inputRef.current,
          })
          return
        }
        // Resolve the model a given mode will actually use — mirrors the /model
        // picker + slash-suffix resolveModeModel logic (P2-10: each mode's
        // options come from ITS model's reasoning capabilities).
        const modelForMode = (m: EffortMode): AppModelDefinition | undefined => {
          return AVAILABLE_MODELS.find((model) => model.id === effectiveModelForMode(m))
        }
        const effectiveEffort = (m: EffortMode): EffortLevel | undefined =>
          effortByMode[m] ?? (effortLevel || undefined)
        const modeStatusLine = (m: EffortMode): string =>
          effortModeStatusLine(t, m, modelForMode(m), effectiveEffort(m))
        // Unscoped commands target the CURRENT conversation mode.
        const targetMode: EffortMode = (effortCmd.kind !== 'invalid' && effortCmd.mode) || mode
        const targetModel = modelForMode(targetMode)
        const targetOptions = effortOptionsForModel(targetModel)
        const targetModelLabel = targetModel?.label ?? '?'
        if (effortCmd.kind === 'invalid') {
          addSystemCard(
            t('ide.chat.effort.usage', undefined, {
              defaultValue:
                'Usage: /effort <level> (current mode), /effort --plan|--execute <level>, /effort ? for status.',
            }),
          )
        } else if (effortCmd.kind === 'query') {
          addSystemCard(
            [
              t('ide.chat.effort.header', undefined, {
                defaultValue: 'Reasoning effort per mode:',
              }),
              modeStatusLine('plan'),
              modeStatusLine('execute'),
            ].join('\n'),
          )
        } else {
          if (targetOptions.length === 0) {
            // Nothing to tune on this mode's model (fixed reasoning) — say so
            // instead of persisting a level that cannot take effect (P2-10).
            addSystemCard(
              t(
                'ide.chat.effort.fixedForModel',
                { mode: targetMode, model: targetModelLabel },
                {
                  defaultValue:
                    'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
                },
              ),
            )
            return
          }
          const level = resolveEffortArg(effortCmd.arg, targetOptions)
          if (level === null) {
            // Unknown value — the model doesn't offer it. Reject and name what IS
            // available (P2-10).
            addSystemCard(
              t(
                'ide.chat.effort.notSupportedForModel',
                {
                  level: effortCmd.arg,
                  model: targetModelLabel,
                  levels: targetOptions.map((o) => o.value).join(', '),
                },
                { defaultValue: "{{level}} isn't available for {{model}}. Available: {{levels}}" },
              ),
            )
            return
          }
          await applyEffortLevel(targetMode, level, targetModel)
        }
        return
      }
      case 'max-loops': {
        const n = route.loops
        try {
          await http.patch(settingsPatchUrl(), { settings: { maxToolLoops: n } })
          setCurrentMaxLoops(n)
          addSystemCard(
            t('ide.chat.maxLoopsSet', { n }, { defaultValue: 'Max tool iterations set to {{n}}' }),
          )
        } catch (err) {
          const refusal = limitRefusalFromError(err)
          if (refusal?.limitType === 'max_tool_loops') {
            addSystemCard(
              refusal.error ??
                t('ide.chat.maxLoopsReached', undefined, {
                  defaultValue: 'Max loops limit reached.',
                }),
              // Host owns the upgrade/sign-in button(s); forward the backend's whole
              // description of the refusal — `requiresSignup`, the `limitType` that
              // fired, the `billingAction` remedy it resolved, and `upgradeTier`
              // (null = no higher plan) — so the host picks the right one instead of
              // defaulting to "Upgrade".
              {
                action:
                  buildUpgradeCta?.({
                    requiresSignup: refusal.requiresSignup,
                    limitType: refusal.limitType,
                    billingAction: refusal.billingAction,
                    upgradeTier: refusal.upgradeTier,
                  }) ?? undefined,
              },
            )
          } else {
            addSystemCard(
              t('ide.chat.maxLoopsError', undefined, {
                defaultValue: 'Failed to update max tool iterations.',
              }),
            )
          }
        }
        setInputValue('')
        return
      }
      case 'explain':
        setInputValue('')
        sendMessage(route.prompt)
        return
      case 'lint':
        setInputValue('')
        sendMessage(route.prompt)
        return
      case 'side-channel':
        // The sent note must not survive as a draft: the keystroke-debounced
        // persistDraft already holds the full "/teamsay …" text, and the viewer
        // re-prefill below is non-empty so setInputValue never clears it — a
        // reload then reopened the already-SENT message in the composer. Cancel
        // any pending draft write and drop the stored draft; the mount prefill
        // recreates the bare prefix.
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        try {
          sessionStorage.removeItem(draftKey)
        } catch (_error) {
          /* sessionStorage unavailable — draft persistence is best-effort */
        }
        // A viewer's composer is the team-chat box — re-fill the /teamsay prefix
        // after each sent team message so the next one is one keystroke away.
        if (canEdit === false) setInputAndCursorEnd('/teamsay ')
        else setInputValue('')
        // sideChannel: a team note is a human-to-human message, not a turn — it
        // goes out immediately even while a turn streams (it used to queue
        // silently behind the sender's own active turn, and a viewer's note
        // used to tear down their remote-turn tracking).
        sendMessage(route.message, undefined, { suppressUserMessage: true, sideChannel: true })
        return
      case 'send': {
        let message = route.message
        const chatAttachments: Array<{
          mediaType: string
          data: string
          filename: string
          size: number
        }> = []

        if (attachedFiles.length > 0) {
          for (const f of attachedFiles) {
            if (f.path && !f.file) {
              // @-mentioned sandbox text file — fetch and embed inline
              // Strip leading / so the path annotation matches what the AI's read_file tool expects
              const displayPath = f.path.startsWith('/') ? f.path.slice(1) : f.path
              const ext = f.path.split('.').pop() ?? ''
              try {
                const res = await http.get<{ content: string }>(
                  `/projects/${projectId}/files${f.path}`,
                )
                message =
                  (message ? `${message}\n\n` : '') +
                  buildFileMentionBlock(displayPath, ext, res.data.content)
              } catch (_error) {
                // File unreadable (sandbox not responding, permission error, etc.) — include a
                // placeholder so the AI still sees which file was intended
                message =
                  (message ? `${message}\n\n` : '') + buildFileMentionBlock(displayPath, ext, null)
              }
            } else if (f.file) {
              // Binary file attachment — encode as base64
              const data = await fileToBase64(f.file)
              chatAttachments.push({
                mediaType: f.mediaType,
                data,
                filename: f.filename,
                size: f.size,
              })
            }
          }
        }

        // A send still carrying dictated text — any mic-button transcript survived
        // the live prune — is flagged `viaDictation` so history badges it with the
        // mic. Checked against the FINAL text (after /explain etc. rewrites it, the
        // synthesized prompt is not what was dictated, so no badge). The list is
        // consumed here; setInputValue('') below prunes it anyway.
        const viaDictation = dictatedSnippetsRef.current.some((s) => message.includes(s))
        dictatedSnippetsRef.current = []
        setInputValue('')
        setAttachedFiles([])
        setAttachmentError(null)
        sendMessage(
          message,
          chatAttachments.length > 0 ? chatAttachments : undefined,
          viaDictation ? { viaDictation: true } : undefined,
        )
        return
      }
    }
  }, [
    transcriptOnly,
    attachedFiles,
    canEdit,
    canSendTeamMessages,
    allCommands,
    extraCommands,
    setInputValue,
    dictation,
    sendMessage,
    addSystemCard,
    t,
    executeCommand,
    applyTimestampsVisible,
    openPanelOverlay,
    openTestsBrowser,
    runSavedScript,
    shareAllowed,
    AVAILABLE_MODELS,
    isFreeTier,
    FREE_TIER_MODEL,
    buildUpgradeCta,
    selectModel,
    liveModelMode,
    mode,
    effectiveModelForMode,
    effortByMode,
    effortLevel,
    applyEffortLevel,
    http,
    settingsPatchUrl,
    setInputAndCursorEnd,
    draftKey,
    projectId,
  ])
  // #endregion chat:submit

  // #region chat:signals
  // External auto-submit. When the signal changes, submit the current input —
  // used by the prompt → chat morph to send the prefilled prompt once the chat
  // has docked into place (handleSubmit clears the input as it sends).
  const lastAutoSubmitRef = useRef(autoSubmitSignal)
  // #effect chat:signals:1
  useEffect(() => {
    if (autoSubmitSignal !== undefined && autoSubmitSignal !== lastAutoSubmitRef.current) {
      lastAutoSubmitRef.current = autoSubmitSignal
      if ((inputRef.current as string).trim()) void handleSubmit()
    }
  }, [autoSubmitSignal, handleSubmit])

  // External "open settings" trigger from the header gear button. When the
  // signal changes, open the /settings view (same path as the slash command).
  const lastOpenSettingsRef = useRef(openSettingsSignal)
  // #effect chat:signals:2
  useEffect(() => {
    if (openSettingsSignal !== undefined && openSettingsSignal !== lastOpenSettingsRef.current) {
      lastOpenSettingsRef.current = openSettingsSignal
      void executeCommand('settings')
    }
  }, [openSettingsSignal, executeCommand])

  // External "open report" trigger from the header bug-report button. When the
  // signal changes, open the bug-report modal (same path as /report and /bug).
  const lastOpenReportRef = useRef(openReportSignal)
  // #effect chat:signals:3
  useEffect(() => {
    if (openReportSignal !== undefined && openReportSignal !== lastOpenReportRef.current) {
      lastOpenReportRef.current = openReportSignal
      setReportModal({ title: '' })
    }
  }, [openReportSignal])

  // External "open share" trigger from the header share button. When the signal
  // changes, open the share-link modal (same path as the /share command).
  const lastOpenShareRef = useRef(openShareSignal)
  // #effect chat:signals:4
  useEffect(() => {
    if (openShareSignal === undefined) return
    // A host without the share capability consumes the signal without opening.
    if (!shareAllowed) {
      lastOpenShareRef.current = openShareSignal
      return
    }
    if (openShareSignal === lastOpenShareRef.current) return
    lastOpenShareRef.current = openShareSignal
    setShareModal({ role: DEFAULT_SHARE_ROLE })
  }, [openShareSignal, shareAllowed])
  // #endregion chat:signals

  // ── Keyboard ───────────────────────────────────────────────────────────────
  // #region chat:pickers
  const filteredCmds = filterCommandMenu(allCommands, commandMenu, canEdit, shareAllowed)

  const filteredModels = useMemo(() => {
    if (!modelPicker) return []
    return filterModelsByPickerQuery(modelPicker.text, AVAILABLE_MODELS)
    // AVAILABLE_MODELS MUST be a dep: when a custom provider is edited (a model
    // renamed/added, a URL changed) the catalog refreshes in place, and without
    // this the picker keeps rendering the pre-edit snapshot — the new model
    // never appears and can't be selected. (The query is read from inputRef and
    // stays fresh because each keystroke re-sets modelPicker.)
  }, [modelPicker, AVAILABLE_MODELS])

  // ── Older models section ────────────────────────────────────────────────────
  // Deprecated entries fold into a collapsed "Older models ⌄" section under the
  // current models. The section auto-expands when the user's currentModel is in
  // it so they can see what's selected — they can still collapse it manually.
  const { current: currentModels, deprecated: deprecatedModels } = useMemo(
    () => partitionByDeprecation(filteredModels),
    [filteredModels],
  )
  const [showDeprecated, setShowDeprecated] = useState(false)
  // User-chosen sort for the `/model` picker (replaces the removed `/models`
  // table). Defaults to alphabetical, matching the old table's default sort.
  const [modelSort, setModelSort] = useState<{ column: ModelSortColumn; direction: SortDirection }>(
    { column: 'name', direction: 'asc' },
  )
  // Auto-expand when the user's saved model is deprecated, or when a search
  // query matched only deprecated entries. Checked once per list and model, in the
  // render that brings them, so the user can still collapse manually.
  const currentIsDeprecated = deprecatedModels.some((m) => m.id === currentModel)
  const onlyDeprecatedMatched = currentModels.length === 0 && deprecatedModels.length > 0
  const expandCheckKey = [
    currentModel,
    String(currentModels.length === 0),
    ...deprecatedModels.map((m) => m.id),
  ].join('|')
  const [expandCheckedFor, setExpandCheckedFor] = useState<string | null>(null)
  if (expandCheckedFor !== expandCheckKey) {
    setExpandCheckedFor(expandCheckKey)
    if (currentIsDeprecated || onlyDeprecatedMatched) setShowDeprecated(true)
  }
  // Effective processing region for any model: the per-model choice when it's
  // one of the model's available regions, else the model's default (first
  // available region). Drives the picker's flag pill AND the `region` sort
  // column.
  const effectiveModelRegion = useCallback(
    (m: AppModelDefinition): ModelRegion => {
      const available = availableModelRegions(m)
      const chosen = modelRegions[m.id]
      return chosen && available.includes(chosen) ? chosen : available[0]
    },
    [modelRegions],
  )
  // Which model's region menu (the region control's dropdown) is open, if any,
  // plus the viewport coords it opens at. The menu renders position:fixed just
  // BELOW the control (top = trigger bottom, right edges aligned) so the
  // picker's scroll container can't clip it and it never collides with the
  // control's tooltip (which sits above and is hidden while the menu is open).
  const [regionMenu, setRegionMenu] = useState<{
    modelId: string
    top: number
    right: number
  } | null>(null)
  /** Opens (or toggles closed) a model's region menu anchored to `trigger`. */
  const toggleRegionMenu = useCallback((modelId: string, trigger: HTMLElement) => {
    setRegionMenu((open) => {
      if (open?.modelId === modelId) return null
      const rect = trigger.getBoundingClientRect()
      return { modelId, top: rect.bottom + 2, right: window.innerWidth - rect.right }
    })
  }, [])
  // Any click outside the open region menu closes it. The opening click never
  // self-closes: this listener attaches AFTER that click (post-render), and
  // the control/menu handlers stopPropagation so their clicks never reach it.
  // Scroll/resize also close it — the menu is fixed-positioned, so its anchor
  // would drift away from it otherwise.
  // #effect chat:pickers:2
  useEffect(() => {
    if (!regionMenu) return
    const close = (): void => setRegionMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [regionMenu])
  // Closing the model picker closes any open region menu with it: checked each
  // time the picker changes, while rendering (React's pattern for state that
  // follows a prop).
  const [regionMenuPicker, setRegionMenuPicker] = useState(modelPicker)
  if (regionMenuPicker !== modelPicker) {
    setRegionMenuPicker(modelPicker)
    if (!modelPicker) setRegionMenu(null)
  }
  const visibleModels = useMemo(() => {
    // Sort WITHIN each partition so the current/deprecated split (and the
    // `idx >= currentModels.length` divider logic below) is preserved while the
    // chosen sort orders the rows the user actually sees.
    const sortedCurrent = sortModels(
      currentModels,
      modelSort.column,
      modelSort.direction,
      effectiveModelRegion,
    )
    if (!showDeprecated) return sortedCurrent
    const sortedDeprecated = sortModels(
      deprecatedModels,
      modelSort.column,
      modelSort.direction,
      effectiveModelRegion,
    )
    return [...sortedCurrent, ...sortedDeprecated]
  }, [showDeprecated, currentModels, deprecatedModels, modelSort, effectiveModelRegion])

  // ── Fast mode (⚡) availability ──────────────────────────────────────────────
  // The composer toggle renders only when the model that will serve the CURRENT
  // mode declares fast-tier pricing (`fastPricing` — e.g. Claude Opus 5). The
  // server re-checks per iteration, so this is presentation-only gating.
  const activeModeModelId = effectiveModelForMode(mode === 'plan' ? 'plan' : 'execute')
  const fastModeAvailable = Boolean(
    AVAILABLE_MODELS.find((m) => m.id === activeModeModelId)?.fastPricing,
  )

  // ── Model-picker mode dropdown ──────────────────────────────────────────────
  // Options for the picker's mode selector; each shows the model currently
  // active for that mode (persisted value, else its fallback labeling) so
  // re-scoping the open picker is informed. Cheap to recompute per render.
  const pickerModeOptions = ((): { value: ModelMode | ''; label: string }[] => {
    const label = (id: string): string => AVAILABLE_MODELS.find((m) => m.id === id)?.label || id
    // Name the model "default" resolves to when the server told us
    // ("Default (DeepSeek V4 Flash)") — a bare "Fast default" is not decodable.
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: label(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    // The named-default helper ("Default (<model>)") for a mode whose per-mode
    // value is unset — names what the mode ACTUALLY resolves to (saved default
    // model, else the server's per-mode default), never a vague phrase and
    // never the wrong mode's model.
    const modeDefault = (m: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: label(effectiveModelForMode(m)) },
        { defaultValue: 'Default ({{model}})' },
      )
    const rows: { value: ModelMode | ''; mode: string; model: string }[] = [
      {
        value: '',
        mode: t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' }),
        model: savedChatModel
          ? label(savedChatModel)
          : t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' }),
      },
      {
        value: 'plan',
        mode: t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' }),
        model: planModel ? label(planModel) : modeDefault('plan'),
      },
      {
        value: 'execute',
        mode: t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
        model: executeModel ? label(executeModel) : modeDefault('execute'),
      },
      {
        value: 'commit',
        mode: t('ide.chat.modelMode.commit', undefined, { defaultValue: 'Commit messages' }),
        model: commitModel ? label(commitModel) : auxDefault(serverModelDefaults?.commit),
      },
      {
        value: 'compact',
        mode: t('ide.chat.modelMode.compact', undefined, { defaultValue: 'Compaction' }),
        model: compactModel ? label(compactModel) : auxDefault(serverModelDefaults?.compact),
      },
    ]
    return rows.map((r) => ({
      value: r.value,
      label: t(
        'ide.chat.modelModeOption',
        { mode: r.mode, model: r.model },
        { defaultValue: '{{mode}} · {{model}}' },
      ),
    }))
  })()
  const modelSortOptions: { value: ModelSortColumn; label: string }[] = [
    { value: 'name', label: t('ide.chat.models.colName', undefined, { defaultValue: 'Model' }) },
    {
      value: 'context',
      label: t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' }),
    },
    {
      value: 'cost',
      label: t('ide.chat.models.colUsageRate', undefined, { defaultValue: 'Usage rate' }),
    },
    {
      value: 'cutoff',
      label: t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' }),
    },
    { value: 'free', label: t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' }) },
    {
      value: 'region',
      label: t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' }),
    },
  ]

  // The row that gets the "current" pill — the model the selected picker mode
  // actually uses (its per-mode value with the mode's REAL fallback chain), not
  // unconditionally the legacy chatModel. The generic (no-mode) picker edits
  // the default slot, so its pill is the SAVED default only — a seeded catalog
  // default is not a choice and must not masquerade as one.
  const currentPickerModelId = pickerCurrentModelId(
    modelPicker,
    effectiveModelForMode,
    { planModel, executeModel, commitModel, compactModel, chatModel: savedChatModel },
    serverModelDefaults,
  )

  // ── Effort picker derived state ─────────────────────────────────────────────
  // The model whose levels the open /effort picker lists — the model the
  // selected mode will actually run — plus its selectable options and the level
  // the "current" pill marks (the persisted per-mode value resolved per-model,
  // so an unset mode correctly pills the model's own default). Cheap to
  // recompute per render, mirroring pickerModeOptions above.
  const effortPickerModel = effortPicker
    ? AVAILABLE_MODELS.find((m) => m.id === effectiveModelForMode(effortPicker.mode))
    : undefined
  const effortPickerOptions = effortOptionsForModel(effortPickerModel)
  // Typed filter, mirroring filteredModels: the text after "/effort" (minus a
  // mode flag) narrows the rows, so "/effort xh" + Enter selects xhigh. Read
  // from inputRef — it stays fresh because each keystroke re-sets effortPicker.
  const effortPickerVisible = effortPicker
    ? effortPickerVisibleOptions(effortPicker.text, effortPickerOptions)
    : []
  const effortPickerCurrent = effortPicker
    ? nativeEffortName(
        effortPickerModel,
        effortByMode[effortPicker.mode] ?? (effortLevel || undefined),
      )
    : null
  // Mode dropdown rows ("Plan · <model>") — effort exists only for the two
  // conversation modes, each scoped to ITS model's native levels.
  const effortPickerModeOptions = (['plan', 'execute'] as const).map((m) => ({
    value: m,
    label: t(
      'ide.chat.modelModeOption',
      {
        mode:
          m === 'plan'
            ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
            : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
        model:
          AVAILABLE_MODELS.find((x) => x.id === effectiveModelForMode(m))?.label ??
          effectiveModelForMode(m),
      },
      { defaultValue: '{{mode}} · {{model}}' },
    ),
  }))

  const filteredEntries = useMemo(() => {
    if (!filePicker) return []
    return rankFileMentionEntries(filePicker.entries, filePicker.query, activeFile, openTabs)
  }, [filePicker, activeFile, openTabs])
  // #endregion chat:pickers

  // #region chat:keyboard
  // An effect event, so the native listener always calls the latest version.
  const handleNativeKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const action = composerKeyAction(e, {
      input: inputRef.current,
      soundsPicker,
      micOpen: micPicker !== null,
      effortPicker,
      effortPickerVisible,
      modelPicker,
      visibleModels,
      hasManageCustomModels: Boolean(onManageCustomModels),
      liveMode: liveModelMode,
      overlayOpen: panelOverlay !== null,
      filePicker,
      filteredEntries,
      commandMenu,
      filteredCmds,
      abortable: isLoading || isRemoteStreaming,
      isFreeTier,
      freeTierModelId: FREE_TIER_MODEL,
      models: AVAILABLE_MODELS,
      serverModelDefaults,
    })
    if (action.preventDefault) e.preventDefault()
    const effect = action.effect
    switch (effect.kind) {
      case 'none':
        return
      case 'close-sounds':
        setSoundsPicker(null)
        return
      case 'close-mic':
        setMicPicker(null)
        return
      case 'close-effort':
        setEffortPicker(null)
        return
      case 'close-model':
        setModelPicker(null)
        return
      case 'close-overlay':
        setPanelOverlay(null)
        return
      case 'close-file':
        setFilePicker(null)
        return
      case 'close-command':
        setCommandMenu(null)
        return
      case 'abort':
        // Same path as the Stop button: kill the stream AND drop the pending
        // automatic follow-ups (deferred auto-fix, verification countdown).
        handleAbort()
        return
      case 'sounds-move':
        setSoundsPicker((s) =>
          s ? { selectedIdx: wrapIdx(s.selectedIdx, effect.delta, SOUND_EVENTS.length + 1) } : null,
        )
        return
      case 'sounds-pick':
        void cycleSoundMode(effect.event)
        return
      case 'effort-move':
        setEffortPicker((p) =>
          p
            ? {
                ...p,
                selectedIdx: wrapIdx(p.selectedIdx, effect.delta, effortPickerVisible.length),
              }
            : null,
        )
        return
      case 'effort-pick':
        void applyEffortLevel(effect.mode, effect.level, effortPickerModel)
        return
      case 'model-move':
        setModelPicker((m) =>
          m
            ? {
                ...m,
                selectedIdx: wrapIdx(
                  m.selectedIdx,
                  effect.delta,
                  visibleModels.length + (onManageCustomModels ? 1 : 0),
                ),
              }
            : null,
        )
        return
      case 'model-manage':
        setModelPicker(null)
        setInputValue('')
        if (onManageCustomModels) onManageCustomModels({ mode: effect.mode })
        return
      case 'model-pick':
        if (!effect.locked) void selectModel(effect.model.id, effect.model.label, effect.mode)
        return
      case 'file-move':
        setFilePicker((p) =>
          p
            ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, effect.delta, filteredEntries.length) }
            : null,
        )
        return
      case 'file-pick':
        selectFileEntry(effect.entry)
        return
      case 'command-move':
        setCommandMenu((m) =>
          m
            ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, effect.delta, filteredCmds.length) }
            : null,
        )
        return
      case 'command-dismiss-submit':
        setCommandMenu(null)
        void handleSubmit()
        return
      case 'command-run':
        void executeCommand(effect.id)
        return
      case 'submit':
        void handleSubmit()
        return
    }
  })

  // Attach native keydown listener directly to the textarea element.
  // #effect chat:keyboard:1
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    // A key that is part of an IME composition (Enter accepting a Japanese, Chinese or Korean
    // candidate) must reach the input method, not send the message.
    const handler = (e: KeyboardEvent): void => {
      if (e.isComposing || e.keyCode === 229) return
      handleNativeKeyDown(e)
    }
    ta.addEventListener('keydown', handler)
    return () => ta.removeEventListener('keydown', handler)
  }, [])
  // #endregion chat:keyboard

  // #region chat:timeline
  const visibleMessages = useMemo(() => selectVisibleMessages(messages), [messages])

  const queuedMessages = useMemo(() => selectQueuedMessages(visibleMessages), [visibleMessages])

  // The CardEvent -> SystemCard construction itself lives in
  // @molecule/app-ide-panel-logic's chat-card-event-utilities, so every
  // framework's panel builds the same card; this wrapper supplies the panel's
  // translate function, model catalog, region choices, custom-card factory and logger.
  const cardEventToSystemCard = useCallback(
    (cardEvent: CardEvent, id: string, timestamp: number): SystemCard | null =>
      toSystemCard(cardEvent, id, timestamp, {
        t,
        models: AVAILABLE_MODELS,
        modelRegions,
        getFactory: getCustomEventCardFactory,
        logger,
      }),
    [t, AVAILABLE_MODELS, modelRegions],
  )

  const staleAnonymousLimit = isStaleAnonymousLimit(errorMeta, isAnonymous)

  // A read-only viewer's access-denied chat error must never sit as the
  // persistent red banner — every legitimate viewer action is already gated
  // client-side, so this only fires when something slipped through to the
  // server (or an older tab raced a role change). Flash a calm, gold
  // view-only notice for a few seconds instead, then clear.
  const isViewerAccessDenied = canEdit === false && !!error && /access denied/i.test(error)
  const [viewerDeniedFlash, setViewerDeniedFlash] = useState(isViewerAccessDenied)
  // Each change of the denial (or of the error text) while denied starts the
  // flash again: set while rendering, React's pattern for state that follows a
  // prop. The effect below clears it after a few seconds.
  const [deniedFlashSource, setDeniedFlashSource] = useState({ isViewerAccessDenied, error })
  if (
    deniedFlashSource.isViewerAccessDenied !== isViewerAccessDenied ||
    deniedFlashSource.error !== error
  ) {
    setDeniedFlashSource({ isViewerAccessDenied, error })
    if (isViewerAccessDenied) setViewerDeniedFlash(true)
  }
  // #effect chat:timeline:1
  useEffect(() => {
    if (!isViewerAccessDenied) return
    const timer = setTimeout(() => setViewerDeniedFlash(false), 6000)
    return () => clearTimeout(timer)
  }, [isViewerAccessDenied, error])

  // Build a unified timeline so commit cards appear at the correct position
  const timeline = useMemo<ChatTimelineItem[]>(
    () =>
      buildChatTimeline({
        visibleMessages,
        cardEventToSystemCard,
        commitCards,
        systemCards,
        activityCards,
        tipCards,
        error,
        errorMeta,
        isStaleAnonymousLimit: staleAnonymousLimit,
      }),
    [
      visibleMessages,
      cardEventToSystemCard,
      commitCards,
      systemCards,
      activityCards,
      tipCards,
      error,
      errorMeta,
      staleAnonymousLimit,
    ],
  )

  // The live settings list for the /settings card. Shared by the closeable
  // overlay and the legacy inline 'settings' branch (back-compat for any already
  // persisted inline card) so the two can never drift. Recomputed each render so
  // it always reflects the current model/mode/effort/sounds/etc.
  const computeSettingsList = (): SettingDescriptor[] => {
    const soundsSummary = summarizeSounds(soundsConfig)
    const notSet = t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' })
    const modelLabel = (id: string): string =>
      AVAILABLE_MODELS.find((m) => m.id === id)?.label || id
    // An unset per-mode model shows what the mode ACTUALLY resolves to
    // ("Default (<model>)"): the saved default model, else the server's
    // per-mode default — never the wrong mode's model (SYN11; the old
    // "Follows default model" phrasing implied plan follows the executor's
    // free-tier default while the server planned with its own plan default).
    const modeDefault = (m: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: modelLabel(effectiveModelForMode(m)) },
        { defaultValue: 'Default ({{model}})' },
      )
    // The auxiliary commit/compact jobs fall back to the server's own fast
    // default when unset — NOT the default model — so their unset label differs.
    // Name the resolved model when the server sent its defaults.
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: modelLabel(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    return buildSettingsList({
      model: savedChatModel ? modelLabel(savedChatModel) : notSet,
      planModel: planModel ? modelLabel(planModel) : modeDefault('plan'),
      executeModel: executeModel ? modelLabel(executeModel) : modeDefault('execute'),
      commitModel: commitModel ? modelLabel(commitModel) : auxDefault(serverModelDefaults?.commit),
      compactModel: compactModel
        ? modelLabel(compactModel)
        : auxDefault(serverModelDefaults?.compact),
      mode:
        mode === 'plan'
          ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
          : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
      // Per-mode effort, shown in each mode's MODEL-NATIVE values (a fixed-
      // reasoning model shows "fixed"). Falls back to the legacy single level.
      effort: t(
        'ide.chat.settings.effortValue',
        {
          plan: (() => {
            const model = AVAILABLE_MODELS.find((m) => m.id === effectiveModelForMode('plan'))
            return (
              nativeEffortName(model, effortByMode.plan ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
          execute: (() => {
            const model = AVAILABLE_MODELS.find((m) => m.id === effectiveModelForMode('execute'))
            return (
              nativeEffortName(model, effortByMode.execute ?? effortLevel) ??
              t('ide.chat.settings.effortFixed', undefined, { defaultValue: 'fixed' })
            )
          })(),
        },
        { defaultValue: 'plan: {{plan}} · execute: {{execute}}' },
      ),
      maxLoops: String(currentMaxLoops),
      autoFix: autoFixEnabled
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      autoCommit: isAutoCommitEnabled(autoCommit)
        ? t(
            'ide.chat.settings.autoCommitEvery',
            { seconds: autoCommit.intervalSeconds },
            { defaultValue: 'Every {{seconds}}s' },
          )
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      hooks: t('ide.chat.settings.hooksValue', undefined, {
        defaultValue: 'In project settings',
      }),
      autoApproveCommands: autoApproveCommandsEnabled
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
      sounds: t(
        'ide.chat.settings.soundsSummary',
        { enabled: soundsSummary.enabled, total: soundsSummary.total },
        { defaultValue: '{{enabled}} of {{total}} events enabled' },
      ),
      timestamps: timestampsVisible
        ? t('ide.chat.settings.on', undefined, { defaultValue: 'On' })
        : t('ide.chat.settings.off', undefined, { defaultValue: 'Off' }),
    })
  }

  const renderedTimeline =
    timeline.length > maxVisibleItems ? timeline.slice(-maxVisibleItems) : timeline
  // Read by the once-registered scroll listener (declared with the other scroll
  // refs, before `timeline` exists) to decide whether scrolling near the top
  // should mount the next older page.
  useCommittedRef(hasHiddenEarlierRef, () => timeline.length > maxVisibleItems)

  const timestampSlots = renderedTimeline.map(timestampSlotFor)
  const timestampSlotById = new Map(
    timestampSlots.flatMap((slot) => (slot ? [[slot.id, slot] as const] : [])),
  )
  const shownTimestampIds = planChatTimestamps(timestampSlots, {
    visible: timestampsVisible,
    now: minuteNow,
    locale,
  })

  /**
   * Puts the item's time on its own line above a Synthase reply or an event card,
   * when the timestamp plan shows it. Header-placed times render inside MessageItem.
   *
   * @param item - The timeline item being rendered.
   * @param node - The item's rendered element tree.
   * @returns The tree, preceded by its timestamp line when one applies.
   */
  const withTimelineTimestamp = (item: ChatTimelineItem, node: ReactNode): ReactNode => {
    if (node === null) return node
    const id = item.kind === 'message' ? item.msg.id : item.card.id
    const slot = timestampSlotById.get(id)
    if (!slot || slot.placement !== 'line' || !shownTimestampIds.has(id)) return node
    return (
      <>
        <ChatTimestamp timestamp={slot.timestamp} variant="line" align={slot.align} />
        {node}
      </>
    )
  }

  const bgCommands = useMemo(() => backgroundTaskCommands(messages), [messages])
  const plan = useMemo(() => latestPlan(messages), [messages])
  // A plan step only spins while a turn is running; otherwise it says it is waiting
  // on the person (an unanswered ask_user) or that the work stopped.
  const planLive = isLoading || isRemoteStreaming
  const planAwaiting = useMemo(() => planAwaitingUser(messages), [messages])
  // Everything about the work in flight shares one card above the composer. The
  // tests strip also shows for a read-only viewer (watching is not editing); the
  // files strip does not (committing is editor work). Popups hide the card.
  const showTests =
    testsBarVisible && (nativeTests ? nativeTests.visible : shouldShowTestsBar(testsRun, testsList))
  const showFiles = canEdit !== false && pendingFiles != null && pendingFiles.length > 0
  const workVisible = isWorkVisible({
    commandMenu,
    modelPicker,
    effortPicker,
    panelOverlay,
    plan,
    backgroundTasks,
    showTests,
    showFiles,
  })

  // #endregion chat:timeline
  // #region chat:render-handlers
  // Handlers attached by lists the render builds (`.map` rows, the composer's
  // glyph buttons, the host's tests status): stable callbacks that call the
  // latest committed version, so building a list never captures a function
  // that touches refs. A click always ran the committed render's handler, so
  // which version runs is unchanged.
  const stableExecuteCommand = useStableCallback(executeCommand)
  const stableSelectFileEntry = useStableCallback(selectFileEntry)
  const stableOpenTestsBrowser = useStableCallback(openTestsBrowser)
  const stableSetInputValue = useStableCallback(setInputValue)
  const stableAddSystemCard = useStableCallback(addSystemCard)
  const stableSelectModel = useStableCallback(selectModel)
  const stableSetModelRegion = useStableCallback(setModelRegion)
  // The composer's @ glyph: insert a mention at the caret and open the file picker.
  const insertMentionAtCaret = useStableCallback(() => {
    const val = inputRef.current as string
    const pos = textareaRef.current?.selectionStart ?? val.length
    const newVal = val.slice(0, pos) + '@' + val.slice(pos)
    setInputValue(newVal)
    autoResize()
    setMentionStart(pos)
    void openFilePicker('')
    setCommandMenu(null)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(pos + 1, pos + 1)
    }, 0)
  })
  // The composer's / glyph.
  const toggleSlashMenu = useStableCallback(() => {
    // TOGGLE the menu regardless of the composer's current text —
    // never clobbering it. With text present the menu opens in
    // showAll mode (every command listed; picking one replaces the
    // input via executeCommand's prefill). An empty box still gets
    // the type-ahead '/' so filtering-by-typing works as before.
    if (commandMenu) {
      setCommandMenu(null)
      if ((inputRef.current as string) === '/') {
        // Remove the slash this button added on open.
        setInputValue('')
        autoResize()
      }
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
      return
    }
    // Popups are one-at-a-time — close siblings first.
    setMicPicker(null)
    setModelPicker(null)
    setEffortPicker(null)
    setSoundsPicker(null)
    const cur = inputRef.current as string
    if (!cur) setInputAndCursorEnd('/')
    setCommandMenu({ selectedIdx: -1, showAll: cur !== '' && cur !== '/', text: cur || '/' })
  })
  // The modals' handlers: new functions on every render, as the inline ones
  // were, but created outside the `reportModal && …` / `shareModal && …`
  // branches, which otherwise make the compiler treat the setters as reactive.
  const closeReportModal = (): void => setReportModal(null)
  const handleReportSubmitted = (result: ReportResult): void => {
    setReportModal(null)
    const { key, defaultValue } = formatReportConfirmation(result)
    addSystemCard(t(key, { productName }, { defaultValue }), {
      action: result.url
        ? {
            label: t('ide.chat.report.viewIssue', undefined, {
              defaultValue: 'View issue',
            }),
            href: result.url,
          }
        : undefined,
    })
  }
  const closeShareModal = (): void => setShareModal(null)
  // #endregion chat:render-handlers
  // ── Render ─────────────────────────────────────────────────────────────────
  const root = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay — covers entire chat area */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(64,112,224,0.2)',
            border: '2px dashed rgba(64,112,224,0.5)',
            borderRadius: '6px',
            pointerEvents: 'none',
          }}
        >
          <span
            className={cm.textSize('sm')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              background: themeMode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
              color: themeMode === 'dark' ? '#1a1a1a' : '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            {t('ide.chat.dropFilesHere', undefined, { defaultValue: 'Drop files here' })}
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={messagesContainerRef}
        // A live log: a new message or card is announced as it is added. `additions` only, so a
        // reply that is still streaming (text changing inside an existing node) is not read out
        // token by token.
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('ide.chat.messagesLabel', undefined, {
          defaultValue: 'Conversation messages',
        })}
        className={cm.sp('p', 3)}
        // Symmetric padding on all four sides (P3-04) — the old asymmetric pr-1 hack
        // is gone. No scrollbar-gutter:stable reservation (it made the right padding
        // visibly larger than the left); the thin scrollbar just overlays when the
        // timeline overflows.
        // overflowAnchor off: prepending an older page above the viewport is
        // compensated by ChatPanel's own anchor effect — native scroll anchoring
        // must not adjust the offset on top of it (double correction = jump).
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          overflowAnchor: 'none',
        }}
      >
        {/* Empty-conversation hint — rendered ONLY when there is literally nothing
            else to show: no timeline items, no local/remote streaming, no sandbox-boot
            wait (the activity slot's own conditions), and no error banner — so it can
            never coexist with content. Height reserves the 28px always-in-layout
            activity slot below, so an empty conversation never grows a scrollbar. */}
        {!transcriptOnly &&
          timeline.length === 0 &&
          !isLoading &&
          !isRemoteStreaming &&
          !awaitingSandboxBoot &&
          !error && (
            <div
              data-mol-id="chat-empty-hint"
              className={cm.cn(cm.textSize('sm'), cm.textMuted)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                height: 'calc(100% - 28px)',
                minHeight: 120,
                textAlign: 'center',
              }}
            >
              <Icon name="logo-mark" size={28} aria-hidden="true" style={{ opacity: 0.5 }} />
              <span style={{ maxWidth: 320 }}>
                {/* Reuses the bond's existing key (translated in all locales)
                    rather than minting a new one. */}
                {t('ide.chat.emptyState', undefined, {
                  defaultValue: 'Describe what you want to build...',
                })}
              </span>
            </div>
          )}
        {/* Older history mounts in as the user scrolls near the top — see the
            auto-load-earlier section by the scroll refs. There is deliberately
            no "Show earlier" button: paging happens on scroll, not on click. */}
        {/* Every item renders inside its own boundary: the timeline is built from
            model-authored data, so one malformed payload must cost one inline
            notice, never the whole IDE. See ChatItemBoundary. */}
        {renderedTimeline.map((item) => (
          <ChatItemBoundary
            key={item.kind === 'message' ? item.msg.id : item.card.id}
            onError={onRenderError}
            render={() =>
              withTimelineTimestamp(
                item,
                (() => {
                  if (item.kind === 'commit')
                    return (
                      <CommitCardItem
                        key={item.card.id}
                        card={item.card}
                        onRevert={canEdit === false ? undefined : handleRevertCommit}
                      />
                    )

                  if (item.kind === 'activity')
                    return (
                      <ActivityCard
                        key={item.card.id}
                        activity={item.card.activity}
                        onActivityClick={onActivityClick}
                      />
                    )

                  if (item.kind === 'tip')
                    return (
                      <TipCard
                        key={item.card.id}
                        // Translated HERE, not when the tip was queued: a locale
                        // switch re-renders this row and re-translates it, and
                        // the `/` and `@` code segments render from the
                        // translated sentence (TipCard splits the string on
                        // them), so a translation can move them.
                        text={tipText(t, item.card.tip, { agentName })}
                        accent={item.card.accent}
                        icon={item.card.icon}
                        onDismiss={() => dismissTip(item.card.id)}
                      />
                    )

                  if (item.kind === 'system') {
                    if (item.card.variant === 'help') {
                      // The plan/upgrade blurb is app-specific (pricing, plan names), so the
                      // host supplies it via buildHelpUpgradeSection — this shared package
                      // hardcodes none. Read at render time (like the settings card's list).
                      const upgradeSection = buildHelpUpgradeSection?.()
                      return (
                        <HelpCard
                          key={item.card.id}
                          isLight={isLight}
                          agentName={agentName}
                          productName={productName}
                          upgradeLines={upgradeSection?.lines}
                          upgradeAction={upgradeSection?.action ?? undefined}
                        />
                      )
                    }
                    if (item.card.variant === 'skillsLoaded') {
                      // "🧠 Loaded {{count}} skills" — styled like the plain "🔨 Building your
                      // app" phase notice (centered, muted, xs, emoji baked into the text), but
                      // CLICKABLE: its onClick is created HERE at render time — opening the
                      // /skills browser overlay, exactly what typing /skills does — since the
                      // card is rebuilt from the recorded card event on every load.
                      return (
                        <div
                          key={item.card.id}
                          style={{ textAlign: 'center', marginBottom: TIMELINE_ITEM_GAP }}
                        >
                          <button
                            /* mol-bespoke-button: skills-loaded notice — deliberately a plain centered phase message that happens to be clickable; a button frame would make it shout */
                            type="button"
                            data-mol-id="chat-skills-loaded"
                            onClick={() => openPanelOverlay('skills')}
                            className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                            style={{
                              // Plain text like the build-phase notice — no border/fill/pill.
                              background: 'none',
                              border: 'none',
                              margin: 0,
                              padding: '6px 0',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            }}
                            // Underline on hover is the only clickability hint (it otherwise
                            // reads exactly like the plain phase message).
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none'
                            }}
                          >
                            {item.card.text}
                          </button>
                        </div>
                      )
                    }
                    // Every rich variant is handled above; what remains is the plain notice /
                    // tip card (no variant). Narrow to PlainSystemCard so the compiler knows
                    // tone/content/emphasized exist here — and render nothing for any future
                    // unhandled variant rather than mis-rendering it as a plain card.
                    if (item.card.variant !== undefined) return null

                    // ── Unified tip / notice card ────────────────────────────────────────────
                    // EVERY host notice (upgrade, sign-up, model-intro, pre-alpha, saved-script,
                    // build-degraded) renders through ONE structure so they look consistent: an
                    // icon, a tinted body with a uniform 1px border, and — for action cards — a row
                    // of accent buttons. Only the ACCENT COLOUR + ICON change, by `tone`. Picking a
                    // tone (or `emphasized`, or merely having an action) opts a card in; a card with
                    // none of those stays a plain muted inline line (e.g. a "Now using <model>"
                    // notice). `emphasized` without a tone → the neutral `info` tone.
                    const tipTone: 'info' | 'gold' | 'upgrade' | 'success' | 'signup' | null =
                      item.card.tone ?? (item.card.emphasized || item.card.action ? 'info' : null)

                    if (tipTone) {
                      // ONE shared treatment for every tone-accented notice — see NoticeCard.
                      // The resource-limit / upgrade banner renders through the same component,
                      // so their icon + buttons stay in lockstep.
                      return (
                        <NoticeCard
                          key={item.card.id}
                          tone={tipTone}
                          text={item.card.text}
                          content={item.card.content}
                          action={item.card.action}
                          icon={item.card.icon}
                        />
                      )
                    }

                    // Plain muted inline notice (no tone / not emphasized / no action) — e.g. a
                    // "Now using <model>" line. Centered for one-liners; left-aligned mono for
                    // multi-line.
                    const isMultiLine = item.card.text.includes('\n')
                    return (
                      <div
                        key={item.card.id}
                        className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                        style={{
                          textAlign: isMultiLine ? 'left' : 'center',
                          padding: isMultiLine ? '8px 12px' : '6px 0',
                          marginBottom: TIMELINE_ITEM_GAP,
                          whiteSpace: isMultiLine ? 'pre-wrap' : undefined,
                          fontFamily: isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
                          lineHeight: isMultiLine ? 1.5 : undefined,
                        }}
                      >
                        {item.card.content
                          ? item.card.content.map((seg, i) => renderCardSegment(seg, i))
                          : item.card.text}
                      </div>
                    )
                  }

                  const { msg } = item

                  // Persisted commit records render as commit cards
                  if (msg.commitRecord) {
                    const files = msg.commitRecord.files.map((f: string | { path: string }) =>
                      typeof f === 'string' ? f : f.path,
                    )
                    const hash = msg.commitRecord.hash
                    return (
                      <CommitCardItem
                        key={msg.id}
                        card={{
                          id: msg.id,
                          message: msg.commitRecord.message,
                          files,
                          timestamp: msg.timestamp,
                          status: 'done',
                          hash,
                        }}
                        onRevert={canEdit === false ? undefined : handleRevertCommit}
                      />
                    )
                  }

                  return (
                    <MessageItem
                      key={msg.id}
                      msg={msg}
                      sendMessage={sendMessage}
                      handleAskUserResponse={handleAskUserResponse}
                      isLoading={isLoading}
                      streamingStatus={streamingStatus}
                      onNavigatePreview={onNavigatePreview}
                      undoneTcIds={undoneTcIds}
                      handleUndoToggle={handleUndoToggle}
                      onFileOpen={onFileOpen}
                      onFileDoubleClick={onFileDoubleClick}
                      onFileDiff={onFileDiff}
                      handleFileRevert={handleFileRevert}
                      setInputAndCursorEnd={setInputAndCursorEnd}
                      setModelPicker={setModelPicker}
                      chatMode={liveModelMode}
                      userAvatar={userAvatar}
                      // Avatar/name clicks open the clicked AUTHOR's profile —
                      // MessageItem builds the identity from the message's own
                      // author (teammates included), so the host shows their
                      // view-only profile and the viewer's editable own.
                      onProfileClick={onProfileClick}
                      currentUserId={currentUserId}
                      showTimestamp={shownTimestampIds.has(msg.id)}
                      discovery={discovery}
                      buildUpgradeCta={buildUpgradeCta}
                      agentName={agentName}
                      canEdit={canEdit}
                      onSkipToolCall={skipToolCall ? handleSkipToolCall : undefined}
                      skipToolCallReason={
                        canEdit === false
                          ? t('ide.chat.skipToolCallViewer', undefined, {
                              defaultValue: 'Only editors can skip this.',
                            })
                          : null
                      }
                    />
                  )
                })(),
              )
            }
          />
        ))}

        {error &&
          !staleAnonymousLimit &&
          (errorMeta?.limitType ? (
            // The CTA routes/copy are the host's — ask buildUpgradeCta for the FULL
            // upgrade/sign-in button set (none rendered if the host supplies nothing).
            // Hand it EVERYTHING the backend said about the refusal: `limitType` (the
            // rule), `billingAction` (the remedy it resolved) and `upgradeTier` (null =
            // no higher plan). Dropping them left the host with only "is this a guest?"
            // to go on, so an empty balance — whose own recorded card says "Add funds" —
            // was answered here with "Upgrade".
            <ResourceLimitBanner
              message={error}
              action={buildUpgradeCta?.(upgradeContextFromError(errorMeta))}
            />
          ) : isViewerAccessDenied ? (
            // A viewer's denial is expected state, not an alarm: a brief, calm,
            // gold view-only notice (matching the viewer tip / team-note
            // treatment) that clears itself — never the persistent red banner.
            viewerDeniedFlash ? (
              <div
                data-mol-id="chat-viewer-denied-notice"
                className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 8,
                  ...chatCardStyle(NOTICE_TONE.gold.accent),
                  lineHeight: 1.5,
                }}
              >
                <Icon
                  name="people"
                  size={CHAT_CARD_ICON_SIZE}
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 1, color: NOTICE_TONE.gold.accent }}
                />
                <span style={{ flex: 1 }}>
                  {t('ide.chat.viewerReadOnly', undefined, {
                    defaultValue:
                      "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
                  })}
                </span>
              </div>
            ) : null
          ) : (
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 2),
                cm.sp('mb', 2),
                cm.bgErrorSubtle,
                cm.textError,
              )}
              style={{ borderRadius: '6px' }}
            >
              {error}
            </div>
          ))}

        {/* Persistent activity slot — the ONE indicator for everything the agent does.
            It is ALWAYS in the layout (a reserved min-height even when idle) and toggled by
            OPACITY, never mounted/unmounted, so it can never change the list height — a
            scrolled conversation no longer jumps as the spinner comes and goes. And it is a
            SINGLE slot for the whole turn (driven by isLoading), so it also never flickers as
            individual messages start + finalize (the per-message indicators that used to do
            that are gone). It shows the real current activity when known — the post-response
            verification status, or the streaming message's tool/thinking activity ("Reading
            X", "Writing the plan") — and otherwise rotates generic phrases, so the user ALWAYS
            sees that *something* is happening, with how long it's taken. It also covers the
            plan→build sandbox-boot wait (awaitingSandboxBoot), where no turn is streaming. */}
        {(() => {
          // A remote turn (a teammate's send, another tab, a server-side
          // continuation) shows the same live activity indicator as an own send —
          // watchers see Synthase working, not a frozen transcript.
          const showActivity = isLoading || awaitingSandboxBoot || isRemoteStreaming
          // A remote turn streams real messages into the same store, so it gets the
          // SAME activity treatment as an own send. Only the no-turn-at-all case
          // (awaitingSandboxBoot alone) is a sandbox-boot wait — labeling every
          // !isLoading render with the boot copy showed viewers "Waiting for the
          // development environment to finish starting…" over a running sandbox
          // for the whole remote turn (observed 2026-08-31).
          const streamingLike = isLoading || isRemoteStreaming
          const streamingMsg = streamingLike
            ? [...visibleMessages].reverse().find((m) => m.isStreaming)
            : undefined
          // Turn start = the last genuine user message, so the elapsed timer counts up across
          // the WHOLE turn instead of resetting at each new assistant message.
          let turnStartedAt: number | undefined
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i]
            if (m.role === 'user' && !m.hidden) {
              turnStartedAt = typeof m.timestamp === 'number' ? m.timestamp : undefined
              break
            }
          }
          // Token count is summed across the SAME whole turn (see estimateTurnTokens), so it
          // matches the elapsed timer's span: it climbs monotonically and only plateaus during
          // tool-execution gaps, rather than vanishing/restarting at each new assistant message.
          const turnTokens = estimateTurnTokens(messages)
          const label = streamingLike
            ? (streamingStatus ??
              (streamingMsg ? streamingActivityLabel(t, streamingMsg) : undefined))
            : t('ide.chat.awaitingSandbox', undefined, {
                defaultValue: 'Waiting for the development environment to finish starting…',
              })
          return (
            <div
              data-mol-id="chat-activity-slot"
              aria-hidden={!showActivity}
              style={{
                minHeight: '28px',
                opacity: showActivity ? 1 : 0,
                pointerEvents: showActivity ? 'auto' : 'none',
                transition: 'opacity 0.18s ease-out',
              }}
            >
              {showActivity && (
                <StreamingIndicator
                  label={label}
                  tokens={streamingLike ? turnTokens : undefined}
                  startedAt={streamingLike ? turnStartedAt : undefined}
                />
              )}
            </div>
          )
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Auto-fix countdown banner ── */}
      {autoFixCountdown && (
        <div
          className={cm.cn(cm.shrink0, cm.borderT)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            fontSize: 12,
            background: 'rgba(234,179,8,0.06)',
          }}
        >
          <Icon
            name="exclamation-triangle"
            size={14}
            aria-hidden="true"
            style={{ flexShrink: 0, color: '#d4a017' }}
          />
          <span style={{ flex: 1, opacity: 0.85 }}>
            {autoFixCountdown.paused
              ? t('ide.chat.autoFixPaused', undefined, { defaultValue: 'Auto-fix paused' })
              : t(
                  'ide.chat.autoFixCountdown',
                  { seconds: autoFixCountdown.secondsLeft },
                  { defaultValue: 'Auto-fixing in {{seconds}}s...' },
                )}
          </span>
          {autoFixCountdown.paused ? (
            <button
              type="button"
              data-mol-id="chat-autofix-resume"
              onClick={() => dispatchAutoFix({ type: 'resume' })}
              // This strip and the retry strip below it now share one button
              // treatment, so a user never sees four near-identical controls at
              // four slightly different sizes (they were 11px/4px-radius
              // hand-rolled frames with a hardcoded grey border). Semantics per
              // DESIGN.md's CTA table: Resume is the affirmative action
              // (primary), its sibling Pause is pause-like (warning), and the
              // Cancels are quiet dismissals (secondary).
              className={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
              )}
            >
              {t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })}
            </button>
          ) : (
            <button
              type="button"
              data-mol-id="chat-autofix-pause"
              onClick={() => dispatchAutoFix({ type: 'pause' })}
              className={cm.cn(
                cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
                cm.touchTargetCompact,
              )}
            >
              {t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })}
            </button>
          )}
          <button
            type="button"
            data-mol-id="chat-autofix-cancel"
            onClick={() => dispatchAutoFix({ type: 'cancel' })}
            className={cm.cn(
              cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
              cm.touchTargetCompact,
            )}
          >
            {t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })}
          </button>
        </div>
      )}

      {/* ── 5XX backoff-retry countdown banner (P4-13) ── Mirrors the auto-fix
          countdown above so the recovery UX reads the same: a cancelable countdown.
          useChat surfaces `retryCountdown` only while a 5XX auto-retry is pending
          (the error itself is held back until the retries are exhausted or the user
          cancels), so this banner and the error message below are never shown at once. */}
      {retryCountdown && (
        <div
          className={cm.cn(cm.shrink0, cm.borderT)}
          data-mol-id="chat-retry-countdown"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            fontSize: 12,
            background: 'rgba(234,179,8,0.06)',
          }}
        >
          <Icon
            name="exclamation-triangle"
            size={14}
            aria-hidden="true"
            style={{ flexShrink: 0, color: '#d4a017' }}
          />
          <span style={{ flex: 1, opacity: 0.85 }}>
            {t(
              'ide.chat.retryCountdown',
              { seconds: retryCountdown.secondsRemaining, attempt: retryCountdown.attempt },
              {
                defaultValue: 'Server error — retrying in {{seconds}}s… (attempt {{attempt}})',
              },
            )}
          </span>
          <button
            type="button"
            data-mol-id="chat-retry-cancel"
            onClick={cancelRetry}
            // The same button as the auto-fix strip's Cancel directly above it —
            // the two strips mirror each other, and DESIGN.md's rule is that one
            // action keeps one colour on every surface.
            className={cm.cn(
              cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
              cm.touchTargetCompact,
            )}
          >
            {t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })}
          </button>
        </div>
      )}

      {/* ── Input area ── */}
      <div className={cm.shrink0} style={{ position: 'relative' }}>
        {/* Proactive "Relevant skill" suggestion (SYN4) — one-click Load, just
            above the composer; appears only when the relevance pass matches. */}
        {relevantSkill && (
          <RelevantSkillSuggestion
            skill={relevantSkill}
            onLoad={loadSkill}
            onOpen={(s) => onFileOpen?.(s.path, { focus: true })}
            onDismiss={dismissRelevantSkill}
          />
        )}

        {/* Attachment error */}
        {attachmentError && (
          <div className={cm.cn(cm.textSize('xs'), cm.textError)} style={{ padding: '4px 10px' }}>
            {attachmentError}
          </div>
        )}

        {/* Dictation error (dead speech service / blocked microphone) */}
        {voiceError && (
          <div className={cm.cn(cm.textSize('xs'), cm.textError)} style={{ padding: '4px 10px' }}>
            {voiceError}
          </div>
        )}

        {/* Dictation notice (on-device model preparing on first use) */}
        {voiceNotice && (
          <div className={cm.cn(cm.textSize('xs'), cm.textMuted)} style={{ padding: '4px 10px' }}>
            {voiceNotice}
          </div>
        )}

        {/* File attachment chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 10px 0' }}>
            {attachedFiles.map((f) => {
              const key = f.path ?? f.filename
              return (
                <span
                  key={key}
                  className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '4px',
                    padding: '2px 6px',
                  }}
                >
                  {f.previewUrl && (
                    <img
                      src={f.previewUrl}
                      alt={f.filename}
                      style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 2 }}
                    />
                  )}
                  <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>
                    {f.path ? f.path.split('/').pop() : f.filename}
                  </span>
                  {f.size > 0 && (
                    <span className={cm.textMuted} style={{ fontSize: 10 }}>
                      {formatSize(f.size)}
                    </span>
                  )}
                  <button
                    /* mol-bespoke-button: attachment chip remove — icon-only x inside a 2px-padded chip, 32px coarse hit box */
                    type="button"
                    data-mol-id={`chat-attachment-remove-${key}`}
                    aria-label={t(
                      'ide.chat.removeAttachment',
                      { name: (f.path ? f.path.split('/').pop() : f.filename) ?? f.filename },
                      { defaultValue: 'Remove {{name}}' },
                    )}
                    onClick={() => removeAttachment(key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      opacity: 0.5,
                      lineHeight: 1,
                      padding: 0,
                      fontSize: '13px',
                      // Touch: a bare 13px '×' is untappable — give it a 32px box
                      // (the dense-row floor) without changing the fine-pointer chip.
                      ...(isCoarse
                        ? {
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 32,
                            minHeight: 32,
                          }
                        : {}),
                    }}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Hidden file input for the attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Command menu popup */}
        {commandMenu &&
          filteredCmds.length > 0 &&
          (() => {
            // Build flat index → command mapping while rendering grouped
            let flatIdx = 0
            // Determine which categories have commands in the filtered set
            const grouped = COMMAND_CATEGORIES.map(({ key, label }) => ({
              key,
              label,
              cmds: filteredCmds.filter((c) => c.category === key),
            })).filter((g) => g.cmds.length > 0)

            return (
              <div
                className={cm.cn(cm.surface, cm.borderAll)}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 0,
                  borderRadius: '6px 6px 0 0',
                  zIndex: 100,
                  boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: popupMaxHeight,
                }}
              >
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {grouped.map((group, gi) => (
                    <div key={group.key}>
                      {/* Category header */}
                      <div
                        className={cm.textMuted}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '6px 12px 2px',
                          ...(gi > 0 ? { borderTop: '1px solid rgba(128,128,128,0.12)' } : {}),
                        }}
                      >
                        {group.label}
                      </div>
                      {/* Commands in this group */}
                      {group.cmds.map((cmd) => {
                        const thisIdx = flatIdx++
                        // Inline state suffix
                        let suffix = ''
                        if (cmd.id === 'model') {
                          // Reflect the model the ACTIVE conversation mode will
                          // actually use — the full server chain (per-mode →
                          // saved default → server per-mode default → clamp),
                          // never a UI-seeded default (which mislabeled plan
                          // mode with the free-tier executor). Falls through to
                          // the free-tier id only before the catalog loads so
                          // the parentheses never render empty (P3-16).
                          const effId =
                            effectiveModelForMode(mode === 'plan' ? 'plan' : 'execute') ||
                            FREE_TIER_MODEL
                          const modelLabel =
                            AVAILABLE_MODELS.find((m) => m.id === effId)?.label ?? effId
                          suffix = modelLabel ? ` (${modelLabel})` : ''
                        } else if (cmd.id === 'maxloops') suffix = ` (${currentMaxLoops})`
                        else if (cmd.id === 'autofix')
                          suffix = ` (${autoFixEnabled ? 'on' : 'off'})`
                        else if (cmd.id === 'sounds') {
                          const modes = SOUND_EVENTS.map((e) => soundsConfig[e])
                          const allSame = modes.every((m) => m === modes[0])
                          suffix = ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
                        } else if (cmd.id === 'version') {
                          // Show the app's current version right in the /version
                          // description (P4-08) — same inline-suffix mechanism as the
                          // live state above. Uses the host-supplied `version` prop (the
                          // real build version), falling back to APP_VERSION; the same
                          // value feeds the /version command output.
                          // `||` not `??`: an empty-string version prop must still fall
                          // back to APP_VERSION (else the suffix is a bare "v").
                          suffix = ` (v${version || APP_VERSION})`
                        }
                        return (
                          <button
                            /* mol-bespoke-button: command menu row — full-width list item in the / popup */
                            key={cmd.id}
                            type="button"
                            onClick={() => void stableExecuteCommand(cmd.id as CommandId)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                thisIdx === commandMenu!.selectedIdx
                                  ? 'rgba(128,128,128,0.1)'
                                  : 'transparent'
                            }}
                            className={cm.w('full')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '5px 12px 5px 20px',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'inherit',
                              textAlign: 'left',
                              fontSize: '13px',
                              background:
                                thisIdx === commandMenu!.selectedIdx
                                  ? 'rgba(128,128,128,0.1)'
                                  : 'transparent',
                            }}
                          >
                            <span
                              className={cm.fontWeight('medium')}
                              style={{
                                fontFamily: 'monospace',
                                opacity: 0.9,
                                flexShrink: 0,
                                // Fixed label column so every description starts at
                                // the same x (widest label is '/autocommit' = 11ch).
                                // ClassMap can't express a fixed column width, so it's
                                // inline — matching this popup's existing convention.
                                minWidth: '12ch',
                              }}
                            >
                              {cmd.label}
                            </span>
                            <span className={cm.textMuted} style={{ fontSize: '12px' }}>
                              {isRegistryCommandId(cmd.id)
                                ? commandDescription(t, cmd.id, { agentName })
                                : cmd.description}
                              {suffix && (
                                <span
                                  style={{
                                    opacity: 1,
                                    color: 'var(--color-primary)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {suffix}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
                {/* Footer removed (P3-21): the "Report a problem" link is redundant
                    with /report (or /bug), and the version text is now surfaced
                    on demand via the /version command. */}
              </div>
            )
          })()}

        {/* Model picker popup */}
        {/* Dictation engine picker (/mic) — user chooses which engine to use
            (and download); unsupported engines render disabled with the reason,
            mirroring locked models in the /model picker. */}
        {micPicker && voiceEngines.length > 0 && (
          <div
            className={cm.cn(cm.surface, cm.borderAll)}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 0,
              borderRadius: '6px 6px 0 0',
              zIndex: 100,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: popupMaxHeight,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(128,128,128,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span className={cm.fontWeight('medium')} style={{ fontSize: '13px' }}>
                {t('ide.chat.voiceEngineTitle', undefined, { defaultValue: 'Dictation engine' })}
              </span>
              <span className={cm.textMuted} style={{ fontSize: '11px' }}>
                {t('ide.chat.voiceEnginePrivacy', undefined, {
                  defaultValue:
                    'Every option runs on your device — audio never leaves your browser.',
                })}
              </span>
            </div>
            {voiceEngines.map((def) => {
              const reason = voiceEngineDisabledReason(def)
              const disabled = reason !== null
              const isCurrent = currentVoiceEngineId === def.id
              const download = def.downloadMB
              const sizeLabel =
                download === undefined
                  ? t('ide.chat.voiceEngineNoDownload', undefined, { defaultValue: 'no download' })
                  : typeof download === 'number'
                    ? t(
                        'ide.chat.voiceEngineDownload',
                        { mb: download },
                        { defaultValue: '~{{mb}} MB download, then cached' },
                      )
                    : t(
                        'ide.chat.voiceEngineDownloadRange',
                        { min: download[0], max: download[1] },
                        { defaultValue: '~{{min}}–{{max}} MB download, then cached' },
                      )
              const accuracyLabel =
                def.accuracy === 3
                  ? t('ide.chat.voiceAccuracyBest', undefined, { defaultValue: 'best accuracy' })
                  : def.accuracy === 2
                    ? t('ide.chat.voiceAccuracyGood', undefined, { defaultValue: 'good accuracy' })
                    : t('ide.chat.voiceAccuracyBasic', undefined, {
                        defaultValue: 'basic accuracy',
                      })
              // Language coverage — names localized for free via the
              // browser's Intl.DisplayNames, so only the surrounding
              // templates need bond translations.
              let languageNames: string[] = []
              if (def.languages !== 'all') {
                try {
                  const displayNames = new Intl.DisplayNames([navigator.language || 'en'], {
                    type: 'language',
                  })
                  languageNames = def.languages.map((c) => displayNames.of(c) ?? c)
                } catch (_error) {
                  // Intl.DisplayNames unavailable/odd locale — fall back to codes
                  languageNames = [...def.languages]
                }
              }
              const languagesLabel =
                def.languages === 'all'
                  ? t('ide.chat.voiceLangsAll', undefined, { defaultValue: 'all languages' })
                  : languageNames.length === 1
                    ? t(
                        'ide.chat.voiceLangOnly',
                        { language: languageNames[0] },
                        { defaultValue: '{{language}} only' },
                      )
                    : t(
                        'ide.chat.voiceLangsCount',
                        { count: languageNames.length },
                        { defaultValue: '{{count}} languages' },
                      )
              // Full list on hover for the multi-language engines
              const languagesTitle = languageNames.length > 1 ? languageNames.join(', ') : undefined
              const kindLabel =
                def.kind === 'native'
                  ? t('ide.chat.voiceEngineNative', undefined, { defaultValue: 'browser native' })
                  : t('ide.chat.voiceEngineOnDevice', undefined, { defaultValue: 'on-device' })
              const reasonLabel =
                reason === 'browser'
                  ? t('ide.chat.voiceEngineNoBrowserSupport', undefined, {
                      defaultValue: 'not available in this browser',
                    })
                  : reason === 'language'
                    ? t('ide.chat.voiceEngineNoLanguageSupport', undefined, {
                        defaultValue: 'not available for your language',
                      })
                    : null
              return (
                <button
                  /* mol-bespoke-button: dictation engine row — full-width list item in the /mic popup */
                  key={def.id}
                  type="button"
                  data-mol-id={`chat-mic-engine-${def.id}`}
                  onClick={() => {
                    if (!disabled) chooseVoiceEngine(def, micPicker.autoStart)
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  className={cm.w('full')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '8px 12px',
                    border: 'none',
                    borderTop: '1px solid rgba(128,128,128,0.12)',
                    cursor: disabled ? 'default' : 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                    fontSize: '13px',
                    opacity: disabled ? 0.45 : 1,
                    background: 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <span
                      className={cm.fontWeight('medium')}
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {def.label}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: 3,
                        flexShrink: 0,
                        background: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
                        color: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)',
                      }}
                    >
                      {kindLabel}
                    </span>
                    <span style={{ flex: 1 }} />
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: 3,
                          flexShrink: 0,
                          background: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
                          color: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)',
                        }}
                      >
                        {t('ide.chat.voiceEngineCurrent', undefined, { defaultValue: 'current' })}
                      </span>
                    )}
                    {reasonLabel && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: 3,
                          flexShrink: 0,
                          background: isLight ? 'rgba(220,38,38,0.10)' : 'rgba(248,113,113,0.15)',
                          color: isLight ? 'rgb(220,38,38)' : 'rgb(248,113,113)',
                        }}
                      >
                        {reasonLabel}
                      </span>
                    )}
                  </div>
                  <span
                    className={cm.textMuted}
                    style={{ fontSize: '11px' }}
                    title={languagesTitle}
                  >
                    {sizeLabel} · {accuracyLabel} · {languagesLabel}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {modelPicker &&
          (modelsLoading || visibleModels.length > 0 || deprecatedModels.length > 0) && (
            <div
              className={cm.cn(cm.surface, cm.borderAll)}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 0,
                borderRadius: '6px 6px 0 0',
                zIndex: 100,
                boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: popupMaxHeight,
              }}
            >
              {/* Picker header — Mode + Sort controls. Layout rules (the old
                  version was visibly ragged: content-width selects at different
                  heights, ragged wrap on narrow panes):
                  - every control is exactly 24px tall (boxSizing border-box);
                  - each label+control group is a flex item that GROWS, so on
                    one row the two selects split the width proportionally and
                    line up edge-to-edge, and when the header wraps (~390px
                    pane) each group fills its own row instead of leaving a
                    ragged short select;
                  - labels never shrink, selects take all remaining group width. */}
              <div
                className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(128,128,128,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexShrink: 0,
                  flexWrap: 'wrap',
                }}
              >
                {/* Mode dropdown — re-scopes the OPEN picker in place. Each
                    option shows the mode's currently active model. The /model
                    --plan etc. flags merely preselect it. Wider flex-basis than
                    Sort because its option labels carry model names. */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: '1 1 190px',
                    minWidth: 0,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    {t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                  </span>
                  <SelectField
                    as="select"
                    data-mol-id="chat-model-mode-select"
                    aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                    value={modelPicker.mode ?? ''}
                    options={pickerModeOptions}
                    onValueChange={(selected) => {
                      const option = pickerModeOptions.find(({ value }) => value === selected)
                      if (!option) return
                      // Reset the highlighted row — the lock rules (and thus
                      // which rows are selectable) change with the mode.
                      setModelPicker((m) =>
                        m
                          ? {
                              ...m,
                              mode: option.value || undefined,
                              selectedIdx: -1,
                            }
                          : m,
                      )
                    }}
                    className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                    webStyle={{
                      borderRadius: 4,
                      // Extra right padding clears the native dropdown arrow so
                      // the selected label never runs underneath it.
                      padding: '2px 18px 2px 6px',
                      color: 'inherit',
                      cursor: 'pointer',
                      height: 24,
                      boxSizing: 'border-box',
                      // Fill the group; min-width 0 lets the select shrink below
                      // its option text, and ellipsis (honored by Chromium for
                      // selects) trims a long mode label gracefully instead of
                      // hard-clipping mid-glyph.
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  />
                </div>
                {/*
                  Sort control (replaces the old "Current: X" text — the active
                  model is now shown by the right-aligned per-row "current" pill
                  below). Reuses the removed `/models` table's sortModels helper.
                */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: '1 1 150px',
                    minWidth: 0,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    {t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
                  </span>
                  <SelectField
                    as="select"
                    data-mol-id="model-sort-column"
                    aria-label={t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
                    value={modelSort.column}
                    options={modelSortOptions}
                    onValueChange={(selected) => {
                      const option = modelSortOptions.find(({ value }) => value === selected)
                      if (option) setModelSort((s) => ({ ...s, column: option.value }))
                    }}
                    className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                    webStyle={{
                      borderRadius: 4,
                      // Extra right padding clears the native dropdown arrow so
                      // the selected label never runs underneath it.
                      padding: '2px 18px 2px 6px',
                      color: 'inherit',
                      cursor: 'pointer',
                      height: 24,
                      boxSizing: 'border-box',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  />
                  <Tooltip
                    content={t('ide.chat.modelSortDirection', undefined, {
                      defaultValue: 'Toggle sort direction',
                    })}
                    placement="top"
                  >
                    <button
                      /* mol-bespoke-button: icon-only sort-direction toggle — 24px square matched to the adjacent selects' height */
                      type="button"
                      data-mol-id="model-sort-direction"
                      aria-label={t('ide.chat.modelSortDirection', undefined, {
                        defaultValue: 'Toggle sort direction',
                      })}
                      onClick={() =>
                        setModelSort((s) => ({
                          ...s,
                          direction: s.direction === 'asc' ? 'desc' : 'asc',
                        }))
                      }
                      className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textMuted)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        padding: 0,
                        color: 'inherit',
                        cursor: 'pointer',
                        // Square button matching the selects' 24px height exactly.
                        height: 24,
                        width: 24,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <Icon
                        name={modelSort.direction === 'asc' ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        aria-hidden="true"
                        data-mol-id="model-sort-direction-glyph"
                      />
                    </button>
                  </Tooltip>
                </div>
              </div>
              {modelsLoading ? (
                <div className={cm.cn(cm.textSize('sm'), cm.textMuted)} style={{ padding: 12 }}>
                  {t('ide.chat.modelsLoading', undefined, { defaultValue: 'Loading models…' })}
                </div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {visibleModels.map((model, idx) => {
                    const isDeprecatedRow = idx >= currentModels.length
                    const dividerBefore =
                      idx === currentModels.length && deprecatedModels.length > 0
                    const row = modelPickerRowView({
                      model,
                      isLight,
                      isFreeTier,
                      mode: modelPicker.mode,
                      models: AVAILABLE_MODELS,
                      serverDefaults: serverModelDefaults,
                      freeTierModel: FREE_TIER_MODEL,
                      modelRegion: effectiveModelRegion(model),
                      t,
                    })
                    return (
                      <Fragment key={model.id}>
                        {dividerBefore && (
                          <button
                            /* mol-bespoke-button: older-models collapse row — full-width disclosure row inside the model list */
                            type="button"
                            onClick={() => setShowDeprecated((s) => !s)}
                            className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full'))}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderTop: '1px solid rgba(128,128,128,0.12)',
                              background: 'rgba(128,128,128,0.04)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {t(
                              'ide.chat.olderModelsCollapse',
                              { count: deprecatedModels.length },
                              { defaultValue: 'Older models ⌃ ({{count}})' },
                            )}
                          </button>
                        )}
                        <div
                          /* The row and its region control are SIBLINGS: the pill is a control, and a
                             control cannot sit inside the row button (axe nested-interactive), so it
                             overlays the row bottom-right from this positioning wrapper instead. */
                          style={{ position: 'relative' }}
                        >
                          <button
                            /* mol-bespoke-button: model row — full-width list item in the model picker */
                            type="button"
                            onClick={() => {
                              if (row.lockReason === 'paid') {
                                setModelPicker(null)
                                stableSetInputValue('')
                                stableAddSystemCard(
                                  t(
                                    'ide.chat.modelUpgradeRequired',
                                    { model: model.label },
                                    {
                                      defaultValue:
                                        '{{model}} is available on Pro. Upgrade to access all models.',
                                    },
                                  ),
                                  // Host owns the upgrade/sign-in button(s) (its routes/copy).
                                  { action: buildUpgradeCta?.({}) ?? undefined },
                                )
                              } else if (row.lockReason === 'mode') {
                                // Free-usable in a DIFFERENT mode — a plain
                                // one-liner, never the paid-upgrade pitch.
                                setModelPicker(null)
                                stableSetInputValue('')
                                stableAddSystemCard(
                                  row.usableMode === 'plan'
                                    ? t('ide.chat.modeOnlyPlan', undefined, {
                                        defaultValue:
                                          'On the free plan, this model is used in plan mode.',
                                      })
                                    : row.usableMode === 'execute'
                                      ? t('ide.chat.modeOnlyExecute', undefined, {
                                          defaultValue:
                                            'On the free plan, this model is used in execute mode.',
                                        })
                                      : t('ide.chat.modeOnlyCommit', undefined, {
                                          defaultValue:
                                            'On the free plan, this model is used for commit messages and compaction.',
                                        }),
                                )
                              } else {
                                void stableSelectModel(model.id, model.label, modelPicker.mode)
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (!row.locked)
                                e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                idx === modelPicker.selectedIdx && !row.locked
                                  ? 'rgba(128,128,128,0.1)'
                                  : 'transparent'
                            }}
                            // The provider color is the row's accent: an inset bar
                            // (DESIGN.md → "Accent bars"); the provider label below
                            // already carries the same color.
                            className={cm.cn(cm.w('full'), cm.accentCard({ tone: 'custom' }))}
                            style={{
                              ['--mol-accent' as string]: row.accent,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '2px',
                              padding: '8px 12px 8px 30px',
                              border: 'none',
                              borderTop: '1px solid rgba(128,128,128,0.12)',
                              cursor: row.locked ? 'default' : 'pointer',
                              color: 'inherit',
                              textAlign: 'left',
                              fontSize: '13px',
                              opacity: row.locked ? 0.45 : isDeprecatedRow ? 0.7 : 1,
                              background:
                                idx === modelPicker.selectedIdx && !row.locked
                                  ? 'rgba(128,128,128,0.1)'
                                  : 'transparent',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                width: '100%',
                              }}
                            >
                              {/* minWidth:0 + ellipsis so a long label yields to the
                                right-aligned current/lock pill instead of pushing
                                it past a narrow (390px) pane's edge. */}
                              <span
                                className={cm.fontWeight('medium')}
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {model.label}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: row.accent,
                                  opacity: 0.85,
                                  flexShrink: 0,
                                }}
                              >
                                {model.provider}
                              </span>
                              {model.id === currentPickerModelId && (
                                <span
                                  data-mol-id={`model-current-${model.id}`}
                                  className={cm.fontWeight('medium')}
                                  style={{
                                    // Right-aligned + primary-tinted so the active
                                    // model stands out more than the old flat grey.
                                    // The hex is only the var() fallback (theme token
                                    // wins); same color-mix idiom as TipCard/UserAvatar.
                                    marginLeft: 'auto',
                                    fontSize: '10px',
                                    color: 'var(--mol-color-primary, #6366f1)',
                                    background:
                                      'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                                    border:
                                      '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                  }}
                                >
                                  {t('ide.chat.currentBadge', undefined, {
                                    defaultValue: 'current',
                                  })}
                                </span>
                              )}
                              {row.lockReason === 'paid' && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    marginLeft: 'auto',
                                    background: 'rgba(128,128,128,0.2)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {t('ide.chat.proRequired', undefined, {
                                    defaultValue: 'Pro',
                                  })}
                                </span>
                              )}
                              {/* Free-tier model locked here only because it
                                belongs to a DIFFERENT mode — a muted "free in
                                <mode>" pill, never the paid "Pro" claim. */}
                              {row.lockReason === 'mode' && (
                                <span
                                  className={cm.textMuted}
                                  style={{
                                    fontSize: '10px',
                                    marginLeft: 'auto',
                                    background: 'rgba(128,128,128,0.2)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {row.freeInLabel}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', opacity: 0.7 }}>
                              {model.description}
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.65 }}>
                              {formatTokenCount(model.contextWindow)} ctx ·{' '}
                              {formatTokenCount(model.maxOutputTokens)} out ·{' '}
                              {row.isCustom ? (
                                <span
                                  title={t('ide.chat.models.usageRateYourKeyHint', undefined, {
                                    defaultValue: 'Billed to your own provider key, not your plan.',
                                  })}
                                >
                                  {t('ide.chat.models.usageRateYourKey', undefined, {
                                    defaultValue: 'your key',
                                  })}
                                </span>
                              ) : (
                                <span
                                  style={{ color: row.priceColor }}
                                  title={t('ide.chat.models.usageRateHint', undefined, {
                                    defaultValue:
                                      'How fast this model uses your AI allowance, relative to the most economical model',
                                  })}
                                >
                                  {t(
                                    'ide.chat.models.usageRateValue',
                                    { rate: row.usageRate },
                                    { defaultValue: '×{{rate}} usage' },
                                  )}
                                </span>
                              )}
                              {/* Peak hours: the rate above already reflects the
                                CURRENT multiplier, so without this the number
                                would change during the day with no explanation.
                                In-window says so plainly; out-of-window warns
                                that it will rise, since finding out later is the
                                surprise worth preventing. Windows are in the
                                user's own clock (modelPeakWindowLabels). */}
                              {!row.isCustom && modelHasPeakPricing(model, row.modelRegion) && (
                                <>
                                  {' · '}
                                  <span
                                    style={{
                                      color: row.peakNow > 1 ? row.priceColor : undefined,
                                      opacity: row.peakNow > 1 ? 1 : 0.8,
                                    }}
                                    title={t(
                                      'ide.chat.models.peakHint',
                                      {
                                        multiplier: model.peakPricing?.multiplier ?? 2,
                                        windows: modelPeakWindowLabels(model).join(', '),
                                      },
                                      {
                                        defaultValue:
                                          'This model costs ×{{multiplier}} between {{windows}}. It is the normal rate the rest of the day.',
                                      },
                                    )}
                                  >
                                    {row.peakNow > 1
                                      ? t(
                                          'ide.chat.models.peakNow',
                                          { multiplier: model.peakPricing?.multiplier ?? 2 },
                                          { defaultValue: 'peak ×{{multiplier}} now' },
                                        )
                                      : t(
                                          'ide.chat.models.peakLater',
                                          { multiplier: model.peakPricing?.multiplier ?? 2 },
                                          { defaultValue: '×{{multiplier}} at peak hours' },
                                        )}
                                  </span>
                                </>
                              )}
                              {/* Custom models synthesize an empty cutoff — skip the segment. */}
                              {model.knowledgeCutoff ? <> · {model.knowledgeCutoff}</> : null}
                            </span>
                            {row.badges.length > 0 && (
                              <span
                                style={{
                                  display: 'flex',
                                  gap: '4px',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  marginTop: '1px',
                                  // Full row width — the button column is
                                  // alignItems:flex-start, so without this the
                                  // line shrinks to content and the region
                                  // control's marginLeft:auto has no space to
                                  // push it to the right edge.
                                  width: '100%',
                                }}
                              >
                                {row.badges.map((b) => (
                                  <span
                                    key={b.label}
                                    style={{
                                      fontSize: '10px',
                                      color: b.fg,
                                      background: b.bg,
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    {b.label}
                                  </span>
                                ))}
                              </span>
                            )}
                          </button>
                          {/* Processing-region dropdown, anchored to the
                                  BOTTOM-RIGHT of the row (absolutely
                                  positioned against the row wrapper, out of the
                                  row button itself). Reads
                                  right-to-left: bare flag (pill-height, no
                                  chrome) on the far right, region name to its
                                  left, and a chevron-down to the left of THAT
                                  only when the region is changeable — click
                                  opens a menu of the model's available regions
                                  (arbitrary count — today US/China, but nothing
                                  here assumes two). Single-region models (e.g.
                                  kimi-k3, China-only) show name + flag only,
                                  non-interactive. Rendered as role=button/menu
                                  spans, not <button>, because the whole model
                                  row is itself a <button> and nesting buttons
                                  is invalid; stopPropagation keeps clicks from
                                  selecting the row. */}
                          {row.regionPill.show &&
                            (() => {
                              const {
                                interactive,
                                label: regionLabel,
                                hint,
                                options: modelRegionOptions,
                                region: modelRegion,
                              } = row.regionPill
                              const menuOpen = regionMenu?.modelId === model.id
                              // Trigger built once so the Tooltip wrap can
                              // be dropped while the menu is open (the
                              // menu replaces it — stacking a hover
                              // tooltip on an open menu is noise).
                              const trigger = (
                                <span
                                  role={interactive ? 'button' : undefined}
                                  tabIndex={interactive ? 0 : undefined}
                                  aria-label={hint}
                                  aria-haspopup={interactive ? 'menu' : undefined}
                                  aria-expanded={interactive ? menuOpen : undefined}
                                  data-mol-id={`model-region-${model.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!interactive) return
                                    toggleRegionMenu(model.id, e.currentTarget)
                                  }}
                                  onKeyDown={(e) => {
                                    if (!interactive) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      toggleRegionMenu(model.id, e.currentTarget)
                                    } else if (e.key === 'Escape' && menuOpen) {
                                      e.stopPropagation()
                                      setRegionMenu(null)
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    // Hover affordance beyond the tooltip
                                    // (same imperative idiom as the row
                                    // button's own hover background).
                                    if (interactive)
                                      e.currentTarget.style.background = 'rgba(128,128,128,0.25)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = menuOpen
                                      ? 'rgba(128,128,128,0.25)'
                                      : 'transparent'
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '1px 4px',
                                    borderRadius: 4,
                                    background: menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent',
                                    cursor: interactive ? 'pointer' : 'default',
                                  }}
                                >
                                  {interactive && (
                                    <Icon
                                      name="chevron-down"
                                      size={10}
                                      aria-hidden="true"
                                      className={cm.textMuted}
                                    />
                                  )}
                                  <span
                                    className={cm.textMuted}
                                    style={{ fontSize: '10px', lineHeight: '14px' }}
                                  >
                                    {regionLabel}
                                  </span>
                                  {/* Rectangular flag from the bonded flag
                                          set, sized to the capability pills'
                                          14px height. */}
                                  <RegionFlag
                                    code={MODEL_REGION_FLAGS[modelRegion] ?? modelRegion}
                                    height={14}
                                  />
                                </span>
                              )
                              return (
                                <span
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    bottom: 8,
                                    zIndex: 1,
                                  }}
                                >
                                  {menuOpen ? (
                                    trigger
                                  ) : (
                                    <Tooltip content={hint} placement="top">
                                      {trigger}
                                    </Tooltip>
                                  )}
                                  {/* The menu opens BELOW the trigger at
                                          fixed viewport coords (right edges
                                          aligned) so the picker's scroll
                                          container can't clip it; scroll/
                                          resize close it (see the effect). */}
                                  {menuOpen && regionMenu && (
                                    <span
                                      role="menu"
                                      aria-label={t('ide.chat.model.regionMenuLabel', undefined, {
                                        defaultValue: 'Processing region',
                                      })}
                                      className={cm.cn(cm.surface, cm.borderAll)}
                                      style={{
                                        position: 'fixed',
                                        top: regionMenu.top,
                                        right: regionMenu.right,
                                        borderRadius: 6,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        zIndex: 130,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: 112,
                                        padding: 2,
                                      }}
                                    >
                                      {modelRegionOptions.map((r) => {
                                        const rLabel = modelRegionLabel(t, r)
                                        // Each option carries ITS region's
                                        // usage multiplier so the cost of a
                                        // switch is visible before making it.
                                        const rRate = modelUsageRate(model, AVAILABLE_MODELS, r)
                                        const active = r === modelRegion
                                        return (
                                          <span
                                            key={r}
                                            role="menuitemradio"
                                            aria-checked={active}
                                            tabIndex={0}
                                            data-mol-id={`model-region-${model.id}-${r}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setRegionMenu(null)
                                              if (!active) void stableSetModelRegion(model.id, r)
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.stopPropagation()
                                                e.preventDefault()
                                                setRegionMenu(null)
                                                if (!active) void stableSetModelRegion(model.id, r)
                                              }
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!active)
                                                e.currentTarget.style.background =
                                                  'rgba(128,128,128,0.15)'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.background = active
                                                ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                                                : 'transparent'
                                            }}
                                            className={active ? cm.fontWeight('medium') : undefined}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 6,
                                              padding: '4px 8px',
                                              borderRadius: 4,
                                              cursor: active ? 'default' : 'pointer',
                                              fontSize: '11px',
                                              whiteSpace: 'nowrap',
                                              background: active
                                                ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                                                : 'transparent',
                                              color: active
                                                ? 'var(--mol-color-primary, #6366f1)'
                                                : 'inherit',
                                            }}
                                          >
                                            <RegionFlag
                                              code={MODEL_REGION_FLAGS[r] ?? r}
                                              height={12}
                                            />
                                            <span>{rLabel}</span>
                                            <span
                                              className={active ? undefined : cm.textMuted}
                                              style={{ fontSize: '10px' }}
                                            >
                                              (
                                              {t(
                                                'ide.chat.models.usageRateMultiplier',
                                                { rate: rRate },
                                                { defaultValue: '×{{rate}}' },
                                              )}
                                              )
                                            </span>
                                          </span>
                                        )
                                      })}
                                    </span>
                                  )}
                                </span>
                              )
                            })()}
                        </div>
                      </Fragment>
                    )
                  })}
                  {!showDeprecated && deprecatedModels.length > 0 && (
                    <button
                      /* mol-bespoke-button: older-models expand row — full-width disclosure row inside the model list */
                      type="button"
                      onClick={() => setShowDeprecated(true)}
                      className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full'))}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderTop: '1px solid rgba(128,128,128,0.12)',
                        background: 'rgba(128,128,128,0.04)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {t(
                        'ide.chat.olderModelsExpand',
                        { count: deprecatedModels.length },
                        { defaultValue: 'Older models ⌄ ({{count}})' },
                      )}
                    </button>
                  )}
                </div>
              )}
              {/* Host-provided seam to the BYO ("bring your own AI")
                  management surface — hidden when the host passes no callback.
                  Rendered as an ANCHORED footer action bar OUTSIDE the
                  scrolling list (flexShrink: 0 in the picker's column layout)
                  so it stays visible at any scroll position. Still the last
                  arrow-key index (visibleModels.length) — when selected, the
                  footer highlights — and Enter/click close the picker and
                  invoke the callback. Primary color-mix tint = the same idiom
                  as the per-row "current" pill (the hex is only the var()
                  fallback; the theme token wins). */}
              {onManageCustomModels && (
                <button
                  /* mol-bespoke-button: manage-custom-models footer — anchored full-width footer row of the model list, keyboard-indexed with the rows */
                  type="button"
                  data-mol-id="chat-model-manage-custom"
                  onClick={() => {
                    const manageMode =
                      modelPicker.mode === 'plan' || modelPicker.mode === 'execute'
                        ? modelPicker.mode
                        : liveModelMode
                    setModelPicker(null)
                    setInputValue('')
                    onManageCustomModels({ mode: manageMode })
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      modelPicker.selectedIdx === visibleModels.length
                        ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
                        : 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)'
                  }}
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.w('full'))}
                  style={{
                    flexShrink: 0,
                    padding: '9px 12px',
                    border: 'none',
                    borderTop:
                      '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                    color: 'var(--mol-color-primary, #6366f1)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    background:
                      modelPicker.selectedIdx === visibleModels.length
                        ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
                        : 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)',
                  }}
                >
                  {t('ide.chat.manageCustomModels', undefined, {
                    defaultValue: 'Add or manage your own models…',
                  })}
                </button>
              )}
            </div>
          )}

        {/* Effort picker popup — /effort's selectable per-mode level list.
            Mirrors the model picker's shell (header with a mode dropdown that
            re-scopes the open picker in place) with the sounds picker's simple
            row list. Levels are the selected mode's model's OWN native values
            (xhigh on Claude, 16K thinking tokens on budget-scaled models); a
            fixed-reasoning model lists nothing and says so instead. */}
        {effortPicker && (
          <div
            className={cm.cn(cm.surface, cm.borderAll)}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 0,
              borderRadius: '6px 6px 0 0',
              zIndex: 100,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: popupMaxHeight,
            }}
          >
            <div
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{
                padding: '6px 12px',
                borderBottom: '1px solid rgba(128,128,128,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flexShrink: 0 }}>
                {t('ide.chat.settings.effort.label', undefined, {
                  defaultValue: 'Reasoning effort',
                })}
              </span>
              {/* Mode dropdown — re-scopes the OPEN picker in place; each
                  option names the model that mode actually runs, since the
                  listed levels are that model's own. */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flex: '1 1 190px',
                  minWidth: 0,
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  {t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                </span>
                <SelectField
                  as="select"
                  data-mol-id="chat-effort-mode-select"
                  aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                  value={effortPicker.mode}
                  options={effortPickerModeOptions}
                  onValueChange={(selected) => {
                    const option = effortPickerModeOptions.find(({ value }) => value === selected)
                    if (!option) return
                    // Reset the highlighted row — the level list changes with
                    // the mode's model.
                    setEffortPicker((p) => (p ? { ...p, mode: option.value, selectedIdx: -1 } : p))
                  }}
                  className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                  webStyle={{
                    borderRadius: 4,
                    // Extra right padding clears the native dropdown arrow so
                    // the selected label never runs underneath it.
                    padding: '2px 18px 2px 6px',
                    color: 'inherit',
                    cursor: 'pointer',
                    height: 24,
                    boxSizing: 'border-box',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                />
              </div>
              <button
                /* mol-bespoke-button: icon-only picker close — header x, no label */
                type="button"
                data-mol-id="chat-effort-picker-close"
                onClick={() => setEffortPicker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '0 2px',
                  fontSize: '14px',
                  lineHeight: 1,
                  opacity: 0.6,
                  // Touch floor for this secondary header ✕ (36px, like the
                  // notice-card actions); fine pointers keep the slim header.
                  ...(isCoarse
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 36,
                        minHeight: 36,
                      }
                    : {}),
                }}
              >
                {'✕'}
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {effortPickerOptions.length === 0 ? (
                <div className={cm.cn(cm.textSize('sm'), cm.textMuted)} style={{ padding: 12 }}>
                  {t(
                    'ide.chat.effort.fixedForModel',
                    { mode: effortPicker.mode, model: effortPickerModel?.label ?? '?' },
                    {
                      defaultValue:
                        'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
                    },
                  )}
                </div>
              ) : (
                effortPickerVisible.map((option, idx) => (
                  <button
                    /* mol-bespoke-button: effort level row — full-width list item in the /effort popup */
                    key={option.value}
                    type="button"
                    data-mol-id={`chat-effort-level-${option.value}`}
                    onClick={() =>
                      void applyEffortLevel(effortPicker.mode, option.value, effortPickerModel)
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        idx === effortPicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
                    }}
                    className={cm.w('full')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      minHeight: '40px',
                      padding: '8px 12px',
                      border: 'none',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                      fontSize: '13px',
                      background:
                        idx === effortPicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                    }}
                  >
                    <span className={cm.fontWeight('medium')}>{option.value}</span>
                    {defaultEffortForModel(effortPickerModel) === option.value && (
                      <span className={cm.textMuted} style={{ fontSize: '10px' }}>
                        {t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' })}
                      </span>
                    )}
                    {effortPickerCurrent === option.value && (
                      <span
                        data-mol-id={`effort-current-${option.value}`}
                        className={cm.fontWeight('medium')}
                        style={{
                          // Right-aligned + primary-tinted, matching the model
                          // picker's "current" pill (hex is only the var()
                          // fallback; the theme token wins).
                          marginLeft: 'auto',
                          fontSize: '10px',
                          color: 'var(--mol-color-primary, #6366f1)',
                          background:
                            'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                          border:
                            '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                          padding: '1px 7px',
                          borderRadius: '999px',
                        }}
                      >
                        {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sounds picker popup */}
        {soundsPicker && (
          <div
            className={cm.cn(cm.surface, cm.borderAll)}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 0,
              borderRadius: '6px 6px 0 0',
              zIndex: 100,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: popupMaxHeight,
            }}
          >
            <div
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{
                padding: '5px 12px',
                borderBottom: '1px solid rgba(128,128,128,0.12)',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {t('ide.chat.notificationSounds', undefined, {
                  defaultValue: 'Notification sounds',
                })}
              </span>
              <button
                /* mol-bespoke-button: icon-only picker close — header x, no label */
                type="button"
                onClick={() => setSoundsPicker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '0 2px',
                  fontSize: '14px',
                  lineHeight: 1,
                  opacity: 0.6,
                  // Touch floor for this secondary header \u2715 (36px, like the
                  // notice-card actions); fine pointers keep the slim header.
                  ...(isCoarse
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 36,
                        minHeight: 36,
                      }
                    : {}),
                }}
              >
                {'\u2715'}
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* "All" row */}
              {(() => {
                const allModes = SOUND_EVENTS.map((e) => soundsConfig[e])
                const allSame = allModes.every((m) => m === allModes[0])
                const currentMode = allSame ? allModes[0] : null
                const badgeColor =
                  currentMode === 'always'
                    ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
                    : currentMode === 'whenNotFocused'
                      ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
                      : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
                const modeLabel = allSame
                  ? soundModeLabel(t, allModes[0])
                  : t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })
                return (
                  <button
                    /* mol-bespoke-button: sounds "All" row — full-width list item in the /sounds popup */
                    type="button"
                    onClick={() => void cycleSoundMode('all')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        soundsPicker.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent'
                    }}
                    className={cm.w('full')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '55px',
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                      fontSize: '13px',
                      background:
                        soundsPicker.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent',
                    }}
                  >
                    <span className={cm.fontWeight('medium')}>
                      {t('ide.chat.soundAll', undefined, { defaultValue: 'All' })}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: badgeColor.bg,
                        color: badgeColor.fg,
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {modeLabel}
                    </span>
                  </button>
                )
              })()}
              {/* Per-event rows */}
              {SOUND_EVENTS.map((eventType, idx) => {
                const rowIdx = idx + 1
                const mode = soundsConfig[eventType]
                const badgeColor =
                  mode === 'always'
                    ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
                    : mode === 'whenNotFocused'
                      ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
                      : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
                return (
                  <button
                    /* mol-bespoke-button: sounds per-event row — full-width list item in the /sounds popup */
                    key={eventType}
                    type="button"
                    onClick={() => void cycleSoundMode(eventType)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        soundsPicker.selectedIdx === rowIdx
                          ? 'rgba(128,128,128,0.1)'
                          : 'transparent'
                    }}
                    className={cm.w('full')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '55px',
                      padding: '8px 12px 8px 24px',
                      border: 'none',
                      borderTop: '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                      fontSize: '13px',
                      background:
                        soundsPicker.selectedIdx === rowIdx
                          ? 'rgba(128,128,128,0.1)'
                          : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{soundEventLabel(t, eventType)}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          background: badgeColor.bg,
                          color: badgeColor.fg,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          flexShrink: 0,
                        }}
                      >
                        {soundModeLabel(t, mode)}
                      </span>
                    </div>
                    <div
                      className={cm.textMuted}
                      style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}
                    >
                      {soundEventDescription(t, eventType, { agentName })}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {panelOverlay && (
          <Modal
            open
            onClose={() => setPanelOverlay(null)}
            showCloseButton={false}
            size="lg"
            aria-label={panelOverlayHeading(t, panelOverlay)}
            data-mol-id="chat-panel-overlay"
          >
            {/* Header bar — title on the left, ✕ on the right (mirrors the /sounds
                popup header). The title reuses each panel's existing heading key
                (Skills / Scripts / Settings), so no new i18n key is needed. */}
            <div
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{
                padding: '5px 12px',
                borderBottom: '1px solid rgba(128,128,128,0.12)',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span className={cm.fontWeight('medium')}>
                {panelOverlayHeading(t, panelOverlay)}
              </span>
              <button
                /* mol-bespoke-button: icon-only overlay close — header x, no label */
                type="button"
                data-mol-id="panel-overlay-close"
                aria-label={t('ide.chat.closeOverlay', undefined, { defaultValue: 'Close' })}
                onClick={() => setPanelOverlay(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '0 2px',
                  fontSize: '14px',
                  lineHeight: 1,
                  opacity: 0.6,
                  // Touch floor for this secondary header ✕ (36px, like the
                  // notice-card actions); fine pointers keep the slim header.
                  ...(isCoarse
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 36,
                        minHeight: 36,
                      }
                    : {}),
                }}
              >
                {'✕'}
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {panelOverlay === 'settings' && (
                <SettingsCard
                  settings={computeSettingsList()}
                  onRunCommand={(commandId) => void executeCommand(commandId)}
                  onPrefillInput={(input) => setInputAndCursorEnd(`${input} `)}
                  isLight={isLight}
                  agentName={agentName}
                  embedded
                />
              )}
              {panelOverlay === 'skills' && (
                <SkillsCard
                  projectId={projectId}
                  initialQuery={panelOverlayQuery}
                  onLoad={loadSkill}
                  onCreate={createSkill}
                  loadedSkillPaths={loadedSkillPaths}
                  defaultSkillPaths={defaultSkillPaths}
                  onToggleDefault={toggleDefaultSkill}
                  onResetDefault={resetDefaultSkills}
                  defaultsExplicit={defaultSkillsExplicit}
                  isLight={isLight}
                  embedded
                />
              )}
              {panelOverlay === 'scripts' && (
                <ScriptsCard
                  projectId={projectId}
                  initialQuery={panelOverlayQuery}
                  isLight={isLight}
                  agentName={agentName}
                  embedded
                />
              )}
              {panelOverlay === 'tests' && (
                <>
                  {nativeTests?.history}
                  <TestsCard
                    tests={testsList}
                    status={testsStatus}
                    run={testsRun}
                    agentName={agentName}
                    initialQuery={panelOverlayQuery}
                    canRun={(canRunTests ?? canEdit !== false) && canEdit !== false}
                    onRun={startTestsRun}
                    onCancel={cancelTestsRun}
                    onSkipCurrent={skipCurrentTest}
                    onFix={fixTests}
                    fixDisabledReason={
                      canEdit === false
                        ? t('ide.tests.viewerCannotRun', undefined, {
                            defaultValue: 'Only editors can run this project’s tests.',
                          })
                        : isLoading || isRemoteStreaming
                          ? t('ide.tests.fixBusy', undefined, {
                              defaultValue: 'Wait for the current turn to finish.',
                            })
                          : null
                    }
                    isLight={isLight}
                    embedded
                  />
                </>
              )}
            </div>
          </Modal>
        )}

        {/* File picker popup */}
        {filePicker &&
          filteredEntries.length > 0 &&
          (() => {
            const normalizeTabPath = (p: string): string =>
              p.startsWith('/workspace/')
                ? p.slice('/workspace/'.length)
                : p.startsWith('/')
                  ? p.slice(1)
                  : p
            const activeNorm = activeFile ? normalizeTabPath(activeFile) : null
            const openTabSet = new Set((openTabs ?? []).map(normalizeTabPath))
            return (
              <div
                className={cm.cn(cm.surface, cm.borderAll)}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 0,
                  borderRadius: '6px 6px 0 0',
                  overflow: 'hidden',
                  zIndex: 100,
                  boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
                  maxHeight: popupMaxHeight,
                  overflowY: 'auto',
                }}
              >
                {filteredEntries.map((entry, idx) => {
                  const fileName = entry.name.split('/').pop() ?? entry.name
                  const dirPath = entry.name.includes('/')
                    ? entry.name.slice(0, entry.name.lastIndexOf('/'))
                    : ''
                  const isActive = activeNorm === entry.name
                  const isOpenTab = !isActive && openTabSet.has(entry.name)
                  return (
                    <button
                      /* mol-bespoke-button: file picker row — full-width list item in the @ popup */
                      key={entry.name}
                      type="button"
                      onClick={() => stableSelectFileEntry(entry)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          idx === filePicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
                      }}
                      className={cm.w('full')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        border: 'none',
                        borderTop: idx > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
                        cursor: 'pointer',
                        color: 'inherit',
                        textAlign: 'left',
                        fontSize: '12px',
                        background:
                          idx === filePicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{fileName}</span>
                      {dirPath && (
                        <span
                          className={cm.textMuted}
                          style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}
                        >
                          {dirPath}
                        </span>
                      )}
                      {(isActive || isOpenTab) && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '10px',
                            opacity: 0.5,
                            flexShrink: 0,
                          }}
                        >
                          {isActive
                            ? t('ide.chat.activeFile', undefined, { defaultValue: 'active' })
                            : t('ide.chat.openTab', undefined, { defaultValue: 'open' })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })()}

        {/* Queued messages — anchored above the composer like the commit bar, so
            they stay pinned instead of being pushed around beneath the streaming
            output (which reflows as the response grows). Each queued message is one
            compact single-line row (truncated text + inline edit/delete/send), so
            several queued messages never grow the footer. Hidden while a popup menu
            is open, matching the commit bar. */}
        {queuedMessages.length > 0 &&
          !commandMenu &&
          !modelPicker &&
          !effortPicker &&
          !panelOverlay && (
            <div
              style={{
                borderTop: '1px solid rgba(128,128,128,0.15)',
                padding: '6px 8px 6px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <Icon
                  name="clock"
                  size={11}
                  aria-hidden="true"
                  style={{ opacity: 0.5, flexShrink: 0 }}
                />
                <span
                  className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                  style={{ fontStyle: 'italic' }}
                >
                  {t(
                    'ide.chat.queuedCount',
                    { count: queuedMessages.length },
                    { defaultValue: '{{count}} queued' },
                  )}
                </span>
              </div>
              {/* Cap the height so many queued messages scroll in place rather than
                pushing the composer down; single-line rows keep it tight. */}
              <div
                style={{
                  maxHeight: 132,
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {queuedMessages.map((qm) =>
                  editingQueuedId === qm.id ? (
                    <div key={qm.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        ref={queuedEditRef}
                        aria-label={t('ide.chat.queuedEdit.label', undefined, {
                          defaultValue: 'Edit queued message',
                        })}
                        defaultValue={editingQueuedText}
                        onChange={(e) => setEditingQueuedText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            const trimmed = editingQueuedText.trim()
                            if (trimmed) editQueuedMessage(qm.id, trimmed)
                            else deleteQueuedMessage(qm.id)
                            setEditingQueuedId(null)
                          }
                          if (e.key === 'Escape') setEditingQueuedId(null)
                        }}
                        className={cm.cn(cm.surface, cm.textSize('sm'))}
                        style={{
                          width: '100%',
                          minHeight: '52px',
                          padding: '6px 8px',
                          border: `1px solid ${isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '6px',
                          resize: 'vertical',
                          color: 'inherit',
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* A Cancel/Save pair sitting side by side: the dismissive
                            one is SECONDARY, the confirming one PRIMARY — the
                            same pairing the rest of the app uses, instead of two
                            hand-rolled frames separated only by a grey fill. */}
                        <button
                          type="button"
                          data-mol-id="chat-queued-edit-cancel"
                          onClick={() => setEditingQueuedId(null)}
                          className={cm.cn(
                            cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
                            cm.touchTargetCompact,
                          )}
                        >
                          {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
                        </button>
                        <button
                          type="button"
                          data-mol-id="chat-queued-edit-save"
                          onClick={() => {
                            const trimmed = editingQueuedText.trim()
                            if (trimmed) editQueuedMessage(qm.id, trimmed)
                            else deleteQueuedMessage(qm.id)
                            setEditingQueuedId(null)
                          }}
                          className={cm.cn(
                            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                            cm.touchTargetCompact,
                          )}
                        >
                          {t('common.save', undefined, { defaultValue: 'Save' })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={qm.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                    >
                      <span
                        title={qm.content}
                        className={cm.textSize('sm')}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: 0.8,
                        }}
                      >
                        {qm.content}
                      </span>
                      <button
                        /* mol-bespoke-button: icon-only edit affordance — 22px (32px coarse) pencil on a dense queued-message row */
                        type="button"
                        title={t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' })}
                        onClick={() => {
                          setEditingQueuedId(qm.id)
                          setEditingQueuedText(qm.content)
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isCoarse ? 32 : 22,
                          height: isCoarse ? 32 : 22,
                          flexShrink: 0,
                          border: 'none',
                          borderRadius: 4,
                          background: 'none',
                          color: 'inherit',
                          opacity: 0.5,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'opacity 100ms, background 100ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.5'
                          e.currentTarget.style.background = 'none'
                        }}
                      >
                        <Icon name="pencil" size={13} aria-hidden="true" />
                      </button>
                      <button
                        /* mol-bespoke-button: icon-only delete affordance — 22px (32px coarse) trash on a dense queued-message row, theme error token */
                        type="button"
                        title={t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' })}
                        onClick={() => deleteQueuedMessage(qm.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isCoarse ? 32 : 22,
                          height: isCoarse ? 32 : 22,
                          flexShrink: 0,
                          border: 'none',
                          borderRadius: 4,
                          background: 'none',
                          // Theme ERROR token, not a per-theme literal — the token
                          // already resolves per theme.
                          color: 'var(--mol-color-error, #dc2626)',
                          opacity: 0.6,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'opacity 100ms, background 100ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.background =
                            'color-mix(in srgb, var(--mol-color-error, #dc2626) 12%, transparent)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.6'
                          e.currentTarget.style.background = 'none'
                        }}
                      >
                        <Icon name="trash" size={13} aria-hidden="true" />
                      </button>
                      {!isLoading && (
                        <button
                          /* mol-bespoke-button: icon-only send affordance — 22px (32px coarse) arrow on a dense queued-message row, theme success token */
                          type="button"
                          title={t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' })}
                          onClick={() => {
                            const content = qm.content
                            deleteQueuedMessage(qm.id)
                            sendMessage(content)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: isCoarse ? 32 : 22,
                            height: isCoarse ? 32 : 22,
                            flexShrink: 0,
                            border: 'none',
                            borderRadius: 4,
                            background: 'none',
                            // Theme SUCCESS token, not a per-theme literal.
                            color: 'var(--mol-color-success, #16a34a)',
                            opacity: 0.7,
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'opacity 100ms, background 100ms',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.background =
                              'color-mix(in srgb, var(--mol-color-success, #16a34a) 14%, transparent)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7'
                            e.currentTarget.style.background = 'none'
                          }}
                        >
                          {/* Same up-arrow glyph as the composer's Send button. */}
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 12 12"
                            style={{ display: 'block' }}
                          >
                            <path
                              d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        {/* Tests status strip — sits directly ABOVE the commit bar and wears its
            chrome, so the two read as one stack over the composer. Shown by
            default so a run's status stays visible; hidden with `/test off`. Unlike the commit bar
            it renders for a VIEWER too: watching is not editing, and a viewer
            watching the preview move deserves the same explanation.

            A project with no tests yet gets no bar at all — there is nothing for
            it to account for, and it appears on its own as soon as discovery
            finds the first spec. */}
        {workVisible && (
          <WorkCard>
            {/* The plan and the background commands (a detached command outlives
                its tool call, so its own card goes green while it still runs). */}
            <PlanCard todos={plan} live={planLive} awaitingUser={planAwaiting} />
            <BackgroundTasksStrip tasks={backgroundTasks} />
            {showTests &&
              (nativeTests ? (
                nativeTests.renderStatus(() => stableOpenTestsBrowser(''))
              ) : (
                <TestStatusBar
                  run={testsRun}
                  agentName={agentName}
                  tests={testsList}
                  onOpen={() => openTestsBrowser('')}
                  onStop={testsRun.running && !testsRun.external ? cancelTestsRun : undefined}
                />
              ))}
            {/* Commit bar — anchored above the textarea (hidden when a popup menu is open).
            Hidden entirely for a read-only VIEWER: committing/reverting is editor work,
            so the bar is a dead control for them. */}
            {showFiles && pendingFiles != null && (
              <DockStrip
                molId="chat-commit-bar"
                toggleMolId="chat-commit-toggle"
                expanded={commitBarExpanded}
                onToggle={() => setCommitBarExpanded((v) => !v)}
                hideLabel
                label={t('ide.chat.showChangedFiles', undefined, {
                  defaultValue: 'Show changed files',
                })}
                actions={
                  <>
                    {/* When auto-commit is enabled, the GREEN commit button occupies this
                  slot (P3-15): a labeled "Commit" (click = commit now) that morphs
                  into the live "Auto-commit in Ns" countdown for the debounce's
                  final seconds. The blue button remains for auto-commit-off and for
                  the committing/committed status states. BOTH are disabled while the
                  agent is working (`autoCommitHeld`): the files bar updates live, but
                  committing mid-turn would stage a half-written tree and race the
                  chat stream's own conversation writes — so the commit waits until
                  the turn finishes. */}
                    {isAutoCommitEnabled(autoCommit) &&
                    commitState?.status !== 'committing' &&
                    commitState?.status !== 'committed' ? (
                      <AutoCommitBadge
                        state={autoCommit}
                        label={t(
                          'ide.chat.commitFileCount',
                          { count: pendingFiles.length },
                          {
                            count: pendingFiles.length,
                            defaultValue: 'Commit {{count}} files',
                            defaultValue_one: 'Commit {{count}} file',
                          },
                        )}
                        disabled={autoCommitHeld}
                        onCommitNow={() => {
                          // Pause the countdown before committing so a due auto-fire
                          // doesn't race the manual commit onto a freshly clean tree
                          // (which would drop a noisy "No changes to commit" card).
                          dispatchAutoCommit({ type: 'fired' })
                          void handleCommit()
                        }}
                        inline
                      />
                    ) : (
                      (() => {
                        const commitBusy =
                          commitState?.status === 'committing' ||
                          commitState?.status === 'committed' ||
                          autoCommitHeld
                        return (
                          <button
                            type="button"
                            data-mol-id="chat-commit-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (commitBusy) return
                              handleCommit()
                            }}
                            disabled={commitBusy}
                            // The SAME design-system button as the tests bar's action
                            // one strip above (and as the green AutoCommitBadge that
                            // replaces this one when auto-commit is on) — only the
                            // semantic colour differs. The CVA owns hover/active/focus
                            // and the disabled look, so there is nothing to hand-roll:
                            // this used to be an inline 12px/6px-radius button with
                            // hardcoded rgba(64,112,224,*) and hand-written hover, and
                            // it visibly mismatched the 13px/3px tests-bar button.
                            className={cm.cn(
                              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                              cm.touchTargetCompact,
                            )}
                          >
                            {commitState?.status === 'committing'
                              ? t('ide.chat.committing', undefined, {
                                  defaultValue: 'Committing...',
                                })
                              : commitState?.status === 'committed'
                                ? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
                                : t(
                                    'ide.chat.commitFileCount',
                                    { count: pendingFiles.length },
                                    {
                                      count: pendingFiles.length,
                                      defaultValue: 'Commit {{count}} files',
                                      defaultValue_one: 'Commit {{count}} file',
                                    },
                                  )}
                          </button>
                        )
                      })()
                    )}
                  </>
                }
              >
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {pendingFiles.map((f) => (
                    <button
                      /* mol-bespoke-button: pending file row — dense monospace row that opens a diff, one of a list */
                      key={f.path}
                      type="button"
                      onClick={() => onFileDiff?.(f.path)}
                      onMouseEnter={(e) => {
                        // Theme PRIMARY token, not a literal blue — the row sits in
                        // the same bar as the commit button, which is now primary.
                        e.currentTarget.style.color = 'var(--mol-color-primary, #4070e0)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = ''
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        padding: '1px 0',
                        // Touch: ~15px rows are untappable — 32px is the floor for
                        // these dense file rows.
                        ...(isCoarse ? { minHeight: 32 } : {}),
                        cursor: onFileDiff ? 'pointer' : 'default',
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        fontSize: 11,
                        color: 'inherit',
                        opacity: 0.7,
                        textAlign: 'left',
                        width: '100%',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                      className={cm.textMuted}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.path}</span>
                      {(!!f.additions || !!f.deletions) && (
                        <span
                          style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, opacity: 0.8 }}
                        >
                          {!!f.additions && (
                            <span style={{ color: '#3fb950' }}>+{f.additions}</span>
                          )}
                          {!!f.additions && !!f.deletions && ' '}
                          {!!f.deletions && (
                            <span style={{ color: '#f85149' }}>-{f.deletions}</span>
                          )}
                        </span>
                      )}
                      {onFileRevert && (
                        <span
                          /* mol-bespoke-button: icon-only per-file revert affordance — 18px (32px coarse) hit box on a dense file row */
                          role="button"
                          tabIndex={0}
                          title={t('ide.chat.revertFile', undefined, {
                            defaultValue: 'Revert to last commit',
                          })}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Revert file to last committed state (handles modified, new, and deleted files)
                            http
                              .post(`/projects/${projectId}/git-revert`, { path: f.path })
                              .then(() => {
                                refreshGitStatus()
                                // Refresh editor if the file is open — fetch fresh content for modified/restored,
                                // or close if it was a new file that got deleted
                                if (f.status === 'untracked' || f.status === 'added') {
                                  onFileDeleted?.(f.path)
                                } else {
                                  // Re-fetch file content from sandbox to update editor
                                  http
                                    .get<{ content: string }>(
                                      `/projects/${projectId}/files/${f.path}`,
                                    )
                                    .then((res) => onFileChange?.(f.path, res.data.content))
                                    .catch((error) => {
                                      logger.warn(
                                        `chat-panel: refreshing open file "${f.path}" after revert failed; editor shows pre-revert content`,
                                        { error },
                                      )
                                    })
                                }
                              })
                              .catch((error) => {
                                logger.warn(
                                  `chat-panel: git revert of "${f.path}" failed; file list unchanged`,
                                  { error },
                                )
                              })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                            e.currentTarget.style.opacity = '1'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.opacity = '0.5'
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // Touch: 32px hit box (dense-row floor); glyph unchanged.
                            width: isCoarse ? 32 : 18,
                            height: isCoarse ? 32 : 18,
                            borderRadius: 3,
                            flexShrink: 0,
                            cursor: 'pointer',
                            opacity: 0.5,
                            transition: 'opacity 100ms, background 100ms',
                            ...(!(f.additions || f.deletions) ? { marginLeft: 'auto' } : {}),
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="12"
                            height="12"
                            fill="currentColor"
                          >
                            <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </DockStrip>
            )}
          </WorkCard>
        )}

        {/* Input container — matches user message card style. data-mol-viewer
            marks view-only mode for HOST CSS: molecule-dev's composer ring
            (index.css :has(> textarea[data-mol-chat-input])) neutralizes the
            container's own border-color with !important and paints a ::before
            ring, so the gold view-mode border must be applied to the RING via
            this attribute — the inline border below only serves ring-less hosts. */}
        <div
          className={cm.surfaceSecondary}
          hidden={transcriptOnly}
          data-mol-id="chat-composer"
          // The container only moves focus to the textarea it holds; it is not
          // a control, and a keyboard user reaches that textarea with Tab.
          role="presentation"
          {...(canEdit === false ? { 'data-mol-viewer': '' } : {})}
          style={{
            // Round the TOP corners only (8px) so the composer reads as a self-contained
            // input with its own border on all sides, flush at the bottom-left/right with
            // the panel's bottom edge. Discovery rounds ALL FOUR corners (the centered
            // card is rounded on every side). The composer's gradient-ring `::before`
            // follows this via `border-radius: inherit`.
            borderRadius: discovery ? 8 : '8px 8px 0 0',
            padding: '8px 10px',
            cursor: 'text',
            // With the work tray open above, the composer is drawn OVER the tray's
            // lower edge (the tray tucks 8px under it).
            ...(workVisible ? { position: 'relative' as const, zIndex: 1 } : {}),
            // View-only mode: the composer IS the team-chat box, so it wears the
            // team-message gold border (and the box is pre-filled with /teamsay).
            ...(canEdit === false ? { border: `1px solid ${NOTICE_TONE.gold.accent}` } : {}),
          }}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) {
              textareaRef.current?.focus()
            }
          }}
        >
          <textarea
            ref={textareaRef}
            data-mol-chat-input=""
            aria-label={t('ide.chat.inputLabel', undefined, { defaultValue: 'Write a message' })}
            defaultValue={initialDraft}
            autoComplete="off"
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder={
              canEdit === false
                ? t('ide.chat.placeholderViewer', undefined, {
                    defaultValue: 'Message your team',
                  })
                : t('ide.chat.placeholder', undefined, { defaultValue: 'Send a message...' })
            }
            rows={1}
            className={cm.textSize('sm')}
            style={{
              width: '100%',
              display: 'block',
              padding: 0,
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
              ...(isNarrow || isCoarse ? { fontSize: 16 } : {}),
            }}
          />
          {/* Hint row: shortcuts · context ring · send */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '6px',
              gap: '4px',
            }}
          >
            {/* Icon buttons — all use identical box model for vertical alignment:
                fixed flex-centered boxes (24×24 fine pointer, 40×32 coarse — wide
                for touch hit spacing but deliberately flat so the composer row
                doesn't balloon vertically) so text glyphs and SVGs align
                identically. Glyph sizes never change with the box. */}
            {/* Plan/Execute mode toggle — hidden for viewers: the mode drives Synthase, which a viewer can't run. */}
            {canEdit !== false && (
              <button
                /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
                type="button"
                onClick={() => {
                  const newMode = mode === 'plan' ? 'execute' : 'plan'
                  setMode(newMode)
                  http
                    .patch(`/projects/${projectId}/chat-mode`, { mode: newMode, conversationId })
                    .catch((error) => {
                      logger.warn('chat-panel: persisting chat-mode toggle failed; reverted', {
                        error,
                      })
                      setMode(mode)
                    })
                  addSystemCard(
                    newMode === 'plan'
                      ? t('ide.chat.switchedToPlan', undefined, {
                          defaultValue: 'Switched to plan mode',
                        })
                      : t('ide.chat.switchedToExecute', undefined, {
                          defaultValue: 'Switched to execute mode',
                        }),
                  )
                }}
                title={
                  mode === 'plan'
                    ? t('ide.chat.switchToExecute', undefined, {
                        defaultValue: 'Switch to execute mode',
                      })
                    : t('ide.chat.switchToPlan', undefined, { defaultValue: 'Switch to plan mode' })
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Touch-first: grow the hit area to 40×40 (glyph size unchanged);
                  // fine pointers keep the compact 24px box.
                  width: isCoarse ? 40 : 24,
                  height: isCoarse ? 32 : 24,
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
                  padding: 0,
                  transition: 'opacity 100ms, color 100ms',
                }}
                onMouseEnter={(e) => {
                  if (mode !== 'plan') e.currentTarget.style.opacity = '0.85'
                }}
                onMouseLeave={(e) => {
                  if (mode !== 'plan') e.currentTarget.style.opacity = '0.4'
                }}
              >
                {/* Lightbulb icon (Primer Octicons) for plan mode */}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
              </button>
            )}
            {/* Fast mode (⚡) toggle — rendered only when the current mode's model
                supports the provider's fast/priority speed tier. Persisted
                per-CONVERSATION (aiContext.fastMode): switching speed invalidates
                the provider prompt cache, so it's a conversation-level choice,
                not a per-message one. */}
            {fastModeAvailable && canEdit !== false && (
              <button
                /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
                type="button"
                data-mol-id="chat-fast-mode-toggle"
                disabled={!canEdit}
                onClick={() => {
                  const next = !fastMode
                  setFastMode(next)
                  http
                    .patch(`/projects/${projectId}/chat-mode`, { fastMode: next, conversationId })
                    .catch((error) => {
                      logger.warn('chat-panel: persisting fast-mode toggle failed; reverted', {
                        error,
                      })
                      setFastMode(fastMode)
                    })
                  addSystemCard(
                    next
                      ? t('ide.chat.fastModeOn', undefined, {
                          defaultValue: 'Fast mode on — faster responses at a higher rate',
                        })
                      : t('ide.chat.fastModeOff', undefined, { defaultValue: 'Fast mode off' }),
                  )
                }}
                title={
                  fastMode
                    ? t('ide.chat.fastModeDisable', undefined, {
                        defaultValue: 'Turn off fast mode',
                      })
                    : t('ide.chat.fastModeEnable', undefined, {
                        defaultValue: 'Fast mode — up to 2.5× faster output at a higher token rate',
                      })
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isCoarse ? 40 : 24,
                  height: isCoarse ? 32 : 24,
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
                  padding: 0,
                  transition: 'opacity 100ms, color 100ms',
                }}
                onMouseEnter={(e) => {
                  if (!fastMode) e.currentTarget.style.opacity = '0.85'
                }}
                onMouseLeave={(e) => {
                  if (!fastMode) e.currentTarget.style.opacity = '0.4'
                }}
              >
                {/* Zap icon (Primer Octicons) for fast mode */}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.504.43a.75.75 0 0 1 .584.859l-.828 4.211h4.49a.75.75 0 0 1 .573 1.234l-7.25 8.5a.75.75 0 0 1-1.32-.658l.828-4.211H2.09a.75.75 0 0 1-.573-1.234l7.25-8.5a.75.75 0 0 1 .737-.201Z" />
                </svg>
              </button>
            )}
            {/* Voice input button — ALWAYS rendered. When dictation can't work
                here, clicking shows the reason (voiceError) or opens the /mic
                picker with unusable engines disabled — it never just vanishes. */}
            {
              <button
                /* mol-bespoke-button: icon-only composer toggle — shares the composer row's 24px / 40x32-coarse icon box model */
                type="button"
                data-mol-id="chat-mic-button"
                onClick={toggleVoice}
                title={
                  isListening
                    ? t('ide.chat.voiceStop', undefined, { defaultValue: 'Stop dictation' })
                    : t('ide.chat.voice', undefined, { defaultValue: 'Dictate' })
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isCoarse ? 40 : 24,
                  height: isCoarse ? 32 : 24,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isListening ? 'rgb(239,68,68)' : 'inherit',
                  opacity: isListening ? 1 : 0.4,
                  padding: 0,
                  borderRadius: '3px',
                  transition: 'opacity 100ms, color 100ms',
                }}
                onMouseEnter={(e) => {
                  if (!isListening) e.currentTarget.style.opacity = '0.85'
                }}
                onMouseLeave={(e) => {
                  if (!isListening) e.currentTarget.style.opacity = '0.4'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  style={{ display: 'block' }}
                >
                  <rect
                    x="6"
                    y="1"
                    width="4"
                    height="8"
                    rx="2"
                    fill={isListening ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M4 7v1a4 4 0 008 0V7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="12"
                    x2="8"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="15"
                    x2="10"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            }
            {/* Attachment button — hidden for viewers: attachments feed Synthase turns. */}
            {canEdit !== false && (
              <button
                /* mol-bespoke-button: icon-only composer affordance — shares the composer row's 24px / 40x32-coarse icon box model */
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isCoarse ? 40 : 24,
                  height: isCoarse ? 32 : 24,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  opacity: 0.4,
                  padding: 0,
                  borderRadius: '3px',
                  transition: 'opacity 100ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.4'
                }}
              >
                {/* Paperclip icon (Primer Octicons) */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style={{ display: 'block' }}
                >
                  <path d="M12.212 3.02a1.753 1.753 0 0 0-2.478.003l-5.83 5.83a3.007 3.007 0 0 0-.88 2.127c0 .795.315 1.551.88 2.116.567.567 1.333.89 2.126.89.79 0 1.548-.321 2.116-.89l5.48-5.48a.75.75 0 0 1 1.061 1.06l-5.48 5.48a4.492 4.492 0 0 1-3.177 1.33c-1.2 0-2.345-.487-3.187-1.33a4.483 4.483 0 0 1-1.32-3.177c0-1.195.475-2.341 1.32-3.186l5.83-5.83a3.25 3.25 0 0 1 5.553 2.297c0 .863-.343 1.691-.953 2.301L7.439 12.39c-.375.377-.884.59-1.416.593a1.998 1.998 0 0 1-1.412-.593 1.992 1.992 0 0 1 0-2.828l5.48-5.48a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-5.48 5.48a.492.492 0 0 0 0 .707.499.499 0 0 0 .352.154.51.51 0 0 0 .356-.154l5.833-5.827a1.755 1.755 0 0 0 0-2.481Z" />
                </svg>
              </button>
            )}
            {(
              [
                {
                  sym: '@',
                  nudgeY: 0,
                  size: 15,
                  title: t('ide.chat.mention', undefined, { defaultValue: 'Reference a file' }),
                  onClick: insertMentionAtCaret,
                },
                {
                  sym: 'slash',
                  nudgeY: 1,
                  size: 15,
                  title: t('ide.chat.slashCommands', undefined, {
                    defaultValue: 'Slash commands',
                  }),
                  onClick: toggleSlashMenu,
                },
              ] as const
            )
              // Viewers keep the / shortcut (viewer-safe commands + /teamsay) but not @ —
              // file mentions only feed Synthase turns.
              .filter(({ sym }) => canEdit !== false || sym !== '@')
              .map(({ sym, nudgeY, size: fontSize, title, onClick }) => (
                <button
                  /* mol-bespoke-button: glyph-only composer affordance — shares the composer row's 24px / 40x32-coarse icon box model */
                  key={sym}
                  type="button"
                  onClick={onClick}
                  title={title}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isCoarse ? 40 : 24,
                    height: isCoarse ? 32 : 24,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.4,
                    padding: 0,
                    borderRadius: '3px',
                    fontFamily: 'inherit',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1,
                    transition: 'opacity 100ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.4'
                  }}
                >
                  {sym === 'slash' ? (
                    <svg
                      width="9"
                      height="13"
                      viewBox="0 0 9 13"
                      style={{ display: 'block', position: 'relative', top: `${nudgeY}px` }}
                    >
                      <line
                        x1="8"
                        y1="1"
                        x2="1"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <span style={{ position: 'relative', top: `${nudgeY}px` }}>{sym}</span>
                  )}
                </button>
              ))}
            {canEdit !== false && contextUsage && (
              <ContextUsageIndicator
                usage={contextUsage}
                history={contextHistory}
                compactions={contextCompactions}
                projectId={projectId}
                conversationId={conversationId}
                onOpenSettings={() => openPanelOverlay('settings')}
              />
            )}
            <div
              style={{
                // 'auto' pins the stop/send cluster right; the context ring
                // (hidden for viewers even when contextUsage exists) otherwise
                // carries the auto margin and this becomes a 4px gap.
                marginLeft: canEdit !== false && contextUsage ? '4px' : 'auto',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              {/* Shown whenever ANY backend turn streams for this conversation —
                  a local send (isLoading) OR a remote one this client doesn't own
                  (isRemoteStreaming: another tab / teammate / server continuation),
                  so a running turn can ALWAYS be stopped. */}
              {canEdit !== false && (isLoading || isRemoteStreaming) && (
                <button
                  type="button"
                  data-mol-id="chat-stop-button"
                  onClick={handleAbort}
                  title={t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
                  aria-label={t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
                  // The composer's two action buttons (Stop, Send) are design-system
                  // buttons in the ERROR and PRIMARY semantics — same radius, height
                  // and states as every other action button in the panel. They were a
                  // matched pair of hand-rolled 6px-radius frames with hardcoded
                  // rgba(248,81,73,*) / rgba(96,160,240,*) and hand-written hover.
                  className={cm.button({ variant: 'solid', color: 'error', size: 'xs' })}
                  style={{
                    // The composer's documented touch box: wide for hit spacing but
                    // deliberately flat (40×32) so the row doesn't balloon. This is the
                    // one thing the ClassMap can't express here, and the reason this is
                    // NOT cm.touchTargetCompact — a 36px floor would out-grow the
                    // neighbouring icon buttons.
                    ...(isCoarse ? { minWidth: 40, minHeight: 32 } : {}),
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
                    <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                data-mol-id="chat-send-button"
                onClick={() => void handleSubmit()}
                title={t('ide.chat.send', undefined, { defaultValue: 'Send' })}
                aria-label={t('ide.chat.send', undefined, { defaultValue: 'Send' })}
                disabled={!hasInput && attachedFiles.length === 0}
                // Stop's twin in the PRIMARY semantic. The real `disabled`
                // attribute above carries the muted/inert look via the CVA
                // (`disabled:opacity-50 disabled:pointer-events-none`), so the
                // hand-rolled cursor/opacity pair is gone with the rest.
                className={cm.button({ variant: 'solid', color: 'primary', size: 'xs' })}
                style={{
                  // See the Stop button: the composer's documented flat 40×32 touch
                  // box, which the ClassMap can't express.
                  ...(isCoarse ? { minWidth: 40, minHeight: 32 } : {}),
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
                  <path
                    d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bug-report modal (/report, /bug, header bug button) ── */}
      {reportModal && (
        <ReportModal
          projectId={projectId}
          conversationId={conversationId}
          initialTitle={reportModal.title}
          productName={productName}
          appVersion={version || APP_VERSION}
          onClose={closeReportModal}
          onSubmitted={handleReportSubmitted}
        />
      )}

      {/* ── Share-link modal (/share, header share button) ── */}
      {shareModal && (
        <ShareModal
          projectId={projectId}
          initialRole={shareModal.role}
          canManage={shareAllowed}
          showLinks={shareLinksAllowed ?? shareAllowed}
          refreshSignal={shareLinksRefreshSignal}
          onClose={closeShareModal}
          onCreated={(result: ShareLinkResult) => {
            // Surface the created link in the timeline so it persists after the
            // modal closes — the role label and the public URL are both shown.
            addSystemCard(
              t(
                'ide.chat.share.created',
                { role: result.role },
                { defaultValue: 'Created a {{role}} share link.' },
              ),
              {
                action: {
                  label: t('ide.chat.share.openLink', undefined, { defaultValue: 'Open link' }),
                  href: buildShareUrl(
                    result,
                    typeof window !== 'undefined' ? window.location.origin : '',
                  ),
                },
              },
            )
          }}
        >
          {shareModalContent}
        </ShareModal>
      )}
    </div>
  )

  // Lets a Wait card name the command it waits on (see background-task-context).
  return (
    <BackgroundTaskCommandsContext.Provider value={bgCommands}>
      {root}
    </BackgroundTaskCommandsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// ChatPanel — outer shell: conversation selector header + ChatInner
// ---------------------------------------------------------------------------

/**
 * AI chat panel with conversation history dropdown and Claude Code-style tool display.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered chat panel element.
 */
export function ChatPanel({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  activeFile,
  openTabs,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onFileChange,
  onFileDeleted,
  onCommit,
  onActivityClick,
  onRenderError,
  onProfileClick,
  currentUserId,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
  onLoadingChange,
  onNavigatePreview,
  onRegisterPushHandler,
  onRegisterHistoryReconcile,
  autoSubmitSignal,
  initialInputValue,
  hideConversationMenu,
  renderConversationHeader = true,
  conversationId: controlledConversationId,
  chatKey: controlledChatKey,
  onConversationId: controlledOnConversationId,
  openShareSignal: controlledShareSignal,
  openReportSignal: controlledReportSignal,
  openSettingsSignal: controlledSettingsSignal,
  modelSelectionSignal,
  onManageCustomModels,
  gitStatusTick,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  pendingMessageUserInitiated,
  userEditedFile,
  userEditedFileKey,
  isPro,
  isAnonymous,
  canEdit = true,
  canSendTeamMessages = true,
  canShare,
  shareLinksAllowed,
  shareLinksRefreshSignal,
  shareModalContent,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  userAvatar,
  agentName,
  productName,
  version,
  extraCommands,
  feedbackUrl,
  listTests,
  runTests,
  watchTestRuns,
  nativeTests,
  canRunTests,
  testsAvailable,
  skipToolCall,
  className,
}: ChatPanelProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  // Share management may be gated ABOVE canEdit by the host (see
  // ChatPanelProps.canShare) — gates the built-in header share button here and
  // is threaded into ChatInner for the /share command + modal.
  const shareAllowed = canShare ?? canEdit !== false
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const http = useHttpClient()
  const baseEndpoint = endpoint ?? `/projects/${projectId}/chat`

  // When the host renders its own conversation chrome (headless mode), it drives
  // the active conversation through the controlled props; otherwise the panel
  // owns it internally (localStorage-backed). `controlledConversationId !==
  // undefined` is the switch — `null` is a valid controlled "no conversation".
  const isConversationControlled = controlledConversationId !== undefined

  const storageKey = chatConversationStorageKey(projectId)
  const [internalActiveConversationId, setActiveConversationId] = useState<string | null>(() =>
    localStorage.getItem(storageKey),
  )
  // Separate key that only changes on *user-initiated* conversation switches
  // (new chat, select conversation). The backend assigns a conversation ID
  // mid-stream which updates activeConversationId, but must NOT remount
  // ChatInner (that would lose the in-flight messages).
  const [internalChatKey, setChatKey] = useState(
    () => localStorage.getItem(storageKey) ?? 'default',
  )
  const [showDropdown, setShowDropdown] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [convSearch, setConvSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const convSearchRef = useRef<HTMLInputElement>(null)
  // Opening the conversation dropdown is a user action; focus its search field
  // from an effect rather than with `autoFocus`.
  useEffect(() => {
    if (showDropdown) convSearchRef.current?.focus()
  }, [showDropdown])
  // Incremented by the header gear button to open the /settings view inside
  // ChatInner (which owns the slash-command dispatch + system-card timeline).
  // A host-supplied signal prop (headless mode) overrides the internal one.
  const [internalOpenSettingsSignal, setOpenSettingsSignal] = useState(0)
  // Incremented by the header bug-report button to open the /report modal inside
  // ChatInner (same dispatch target as the /report and /bug commands).
  const [internalOpenReportSignal, setOpenReportSignal] = useState(0)
  // Incremented by the header share button to open the /share modal inside
  // ChatInner (same dispatch target as the /share command).
  const [internalOpenShareSignal, setOpenShareSignal] = useState(0)

  // Effective values: host-controlled when provided, else internal.
  const activeConversationId = isConversationControlled
    ? controlledConversationId
    : internalActiveConversationId
  const chatKey = controlledChatKey ?? internalChatKey
  const effectiveSettingsSignal = controlledSettingsSignal ?? internalOpenSettingsSignal
  const effectiveReportSignal = controlledReportSignal ?? internalOpenReportSignal
  const effectiveShareSignal = controlledShareSignal ?? internalOpenShareSignal

  const chatEndpoint = activeConversationId
    ? `${baseEndpoint}?conversationId=${activeConversationId}`
    : baseEndpoint

  const fetchConversations = useCallback(async () => {
    try {
      await http
        .get<{ conversations: ConversationSummary[] }>(`/projects/${projectId}/conversations`)
        .then((res) => setConversations(res.data.conversations))
    } catch (_error) {
      // non-critical — conversation list is display-only; header works fine without it
    }
  }, [http, projectId])

  // Fetch conversations on mount so the header shows the current chat title.
  // Skipped in headless mode — the host owns the conversation list/picker and
  // this internal fetch would be redundant.
  useEffect(() => {
    if (!renderConversationHeader) return
    void fetchConversations()
  }, [fetchConversations, renderConversationHeader])

  const handleToggleDropdown = useCallback(() => {
    setShowDropdown((v) => {
      if (!v) void fetchConversations()
      return !v
    })
  }, [fetchConversations])

  const persistConversationId = useCallback(
    (id: string | null) => {
      setActiveConversationId(id)
      if (id) localStorage.setItem(storageKey, id)
      else localStorage.removeItem(storageKey)
    },
    [storageKey],
  )

  // What ChatInner reports a (backend-assigned or switched) conversation id to:
  // the host's handler in controlled/headless mode (it owns the picker +
  // persistence), else the internal localStorage-backed persist.
  const reportConversationId = controlledOnConversationId ?? persistConversationId

  const handleNewChat = useCallback(async () => {
    try {
      const res = await http.post<{ id: string }>(`/projects/${projectId}/conversations`, {})
      persistConversationId(res.data.id)
      setChatKey(res.data.id)
    } catch (_error) {
      // Server conversation creation failed — fall back to a client-side key so
      // the user can still start a new chat without a persisted conversation id
      persistConversationId(null)
      setChatKey(`new-${Date.now()}`)
    }
    setShowDropdown(false)
    setConvSearch('')
  }, [http, persistConversationId, projectId])

  const handleSelectConversation = useCallback(
    (id: string) => {
      persistConversationId(id)
      setChatKey(id)
      setShowDropdown(false)
      setConvSearch('')
    },
    [persistConversationId],
  )

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const filteredConvs = convSearch
    ? conversations.filter((c) => c.preview?.toLowerCase().includes(convSearch.toLowerCase()))
    : conversations

  const activeConv = conversations.find((c) => c.id === activeConversationId)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('full'),
        cm.surface,
        cm.borderR,
        className,
      )}
    >
      {/* ── Header: conversation selector (hidden during discovery, and entirely
          in headless mode where the host renders its own conversation chrome) ── */}
      {renderConversationHeader && !hideConversationMenu && (
        <div
          ref={dropdownRef}
          className={cm.cn(
            cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
            cm.sp('px', 2),
            cm.shrink0,
            cm.borderB,
          )}
          style={{
            position: 'relative',
            // Fixed 33px on fine pointers; on touch the header grows to fit the
            // cm.touchTarget (44px) header buttons instead of clipping them.
            height: isCoarse ? undefined : '33px',
            minHeight: '33px',
            zIndex: 10,
          }}
        >
          {/* Conversation picker button */}
          <button
            /* mol-bespoke-button: conversation picker — the header title row, a full-width disclosure for the history dropdown */
            type="button"
            data-mol-id="chat-conversation-toggle"
            onClick={handleToggleDropdown}
            className={cm.cn(cm.textSize('xs'), cm.textMuted)}
            onMouseEnter={(e) => {
              const s = e.currentTarget.querySelector('span')
              if (s) (s as HTMLElement).style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              const s = e.currentTarget.querySelector('span')
              if (s) (s as HTMLElement).style.opacity = '0.7'
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '6px 6px 6px 0',
              textAlign: 'left',
              overflow: 'hidden',
              borderRadius: '4px',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              style={{
                display: 'block',
                flexShrink: 0,
                opacity: 0.5,
                transform: showDropdown ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 100ms',
              }}
            >
              <polyline
                points="6,4 10,8 6,12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: 0.7,
              }}
            >
              {activeConv?.preview ??
                t('ide.chat.historyFallback', undefined, { defaultValue: 'Chat history' })}
            </span>
          </button>

          {/* Share button — opens the /share link modal. Hidden below the
              host's share capability (admin+ on molecule.dev), viewers included. */}
          {shareAllowed && (
            <button
              type="button"
              data-mol-id="chat-share-button"
              onClick={() => setOpenShareSignal((n) => n + 1)}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
              title={t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })}
              aria-label={t('ide.chat.share.openShare', undefined, {
                defaultValue: 'Share project',
              })}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
            >
              <Icon name="share" size={14} aria-hidden="true" />
            </button>
          )}

          {/* Bug-report button — opens the /report modal */}
          <button
            type="button"
            data-mol-id="chat-report-button"
            onClick={() => setOpenReportSignal((n) => n + 1)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
            title={t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' })}
            aria-label={t('ide.chat.report.openReport', undefined, {
              defaultValue: 'Report a bug',
            })}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
          >
            <Icon name="bug" size={14} aria-hidden="true" />
          </button>

          {/* Settings button — opens the /settings view */}
          <button
            type="button"
            data-mol-id="chat-settings-button"
            onClick={() => setOpenSettingsSignal((n) => n + 1)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
            title={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
            aria-label={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
          >
            <Icon name="gear" size={14} aria-hidden="true" />
          </button>

          {/* New chat button — hidden for viewers (creating a conversation is editor work) */}
          {canEdit !== false && (
            <button
              type="button"
              data-mol-id="chat-new-conversation"
              onClick={handleNewChat}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
              title={t('ide.chat.newChat', undefined, { defaultValue: 'New chat' })}
              style={{ flexShrink: 0 }}
            >
              +
            </button>
          )}

          {/* Dropdown */}
          {showDropdown && (
            <div
              className={cm.cn(cm.surface, cm.borderAll)}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                // dvh on phones (vh ignores collapsing browser chrome); the fixed
                // 280px cap is desktop-only. (molecule-dev hides this header, but
                // other consumers render it.)
                maxHeight: isNarrow ? 'min(50dvh, 420px)' : '280px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Search */}
              <div
                style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(128,128,128,0.12)',
                  position: 'sticky',
                  top: 0,
                }}
                className={cm.surface}
              >
                <input
                  ref={convSearchRef}
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder={t('ide.chat.searchConversations', undefined, {
                    defaultValue: 'Search conversations…',
                  })}
                  className={cm.textSize('xs')}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    // Deliberate iOS-zoom guard overriding cm.textSize('xs'): a
                    // focused input below 16px makes iOS Safari zoom the page.
                    ...(isNarrow ? { fontSize: 16 } : {}),
                  }}
                />
              </div>

              {/* Conversation list */}
              {filteredConvs.length === 0 && (
                <div
                  className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                  style={{ padding: '10px 12px' }}
                >
                  {t('ide.chat.noConversations', undefined, {
                    defaultValue: 'No conversations yet',
                  })}
                </div>
              )}
              {filteredConvs.map((conv) => (
                <button
                  /* mol-bespoke-button: conversation row — full-width list item in the history dropdown */
                  key={conv.id}
                  type="button"
                  data-mol-id={`chat-conversation-${conv.id}`}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cm.cn(
                    cm.w('full'),
                    conv.id === activeConversationId ? cm.surfaceSecondary : '',
                  )}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(128,128,128,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = ''
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '8px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span
                    className={cm.textSize('xs')}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}
                  >
                    {conv.preview ??
                      t('ide.chat.newConversation', undefined, {
                        defaultValue: 'New conversation',
                      })}
                  </span>
                  <span
                    className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                    style={{ opacity: 0.55 }}
                  >
                    {relativeTime(conv.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Chat inner — remounts on conversation switch ── */}
      <ChatInner
        key={chatKey}
        projectId={projectId}
        endpoint={chatEndpoint}
        initialMessage={initialMessage}
        onInitialMessageSent={onInitialMessageSent}
        isPro={isPro}
        isAnonymous={isAnonymous}
        canEdit={canEdit}
        canSendTeamMessages={canSendTeamMessages}
        canShare={shareAllowed}
        shareLinksAllowed={shareLinksAllowed}
        shareLinksRefreshSignal={shareLinksRefreshSignal}
        shareModalContent={shareModalContent}
        buildUpgradeCta={buildUpgradeCta}
        buildHelpUpgradeSection={buildHelpUpgradeSection}
        activeFile={activeFile}
        openTabs={openTabs}
        onFileOpen={onFileOpen}
        onFileDoubleClick={onFileDoubleClick}
        onFileDiff={onFileDiff}
        onFileRevert={onFileRevert}
        onFileChange={onFileChange}
        onFileDeleted={onFileDeleted}
        onCommit={onCommit}
        onConversationId={reportConversationId}
        onActivityClick={onActivityClick}
        onRenderError={onRenderError}
        onProfileClick={onProfileClick}
        currentUserId={currentUserId}
        onReadyToBuild={onReadyToBuild}
        awaitingSandboxBoot={awaitingSandboxBoot}
        onClientAction={onClientAction}
        onTurnComplete={onTurnComplete}
        onLoadingChange={onLoadingChange}
        onNavigatePreview={onNavigatePreview}
        onRegisterPushHandler={onRegisterPushHandler}
        onRegisterHistoryReconcile={onRegisterHistoryReconcile}
        autoSubmitSignal={autoSubmitSignal}
        openSettingsSignal={effectiveSettingsSignal}
        modelSelectionSignal={modelSelectionSignal}
        onManageCustomModels={onManageCustomModels}
        openReportSignal={effectiveReportSignal}
        openShareSignal={effectiveShareSignal}
        initialInputValue={initialInputValue}
        pendingMessage={pendingMessage}
        pendingMessageKey={pendingMessageKey}
        pendingMessageSuppressUser={pendingMessageSuppressUser}
        pendingMessageUserInitiated={pendingMessageUserInitiated}
        userEditedFile={userEditedFile}
        userEditedFileKey={userEditedFileKey}
        gitStatusTick={gitStatusTick}
        discovery={hideConversationMenu}
        userAvatar={userAvatar}
        agentName={agentName}
        productName={productName}
        version={version}
        extraCommands={extraCommands}
        feedbackUrl={feedbackUrl}
        listTests={listTests}
        runTests={runTests}
        watchTestRuns={watchTestRuns}
        nativeTests={nativeTests}
        canRunTests={canRunTests}
        testsAvailable={testsAvailable}
        skipToolCall={skipToolCall}
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

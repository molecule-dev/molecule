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
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import type { CardEvent, ChatMessage, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { AppModelDefinition } from '@molecule/app-ai-models'
import {
  formatTokenCount,
  isDeprecated,
  partitionByDeprecation,
  PROVIDER_BRAND_COLORS,
} from '@molecule/app-ai-models'
import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import {
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '@molecule/app-ai-voice'
import { getCountryFlag } from '@molecule/app-country-flags'
import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { getLogger } from '@molecule/app-logger'
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_PRODUCT_NAME,
  useAIModels,
  useChat,
  useHttpClient,
  useThemeMode,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import { timelineSortKey } from '../chatTimelineOrdering.js'
import type {
  ChatEventCard,
  ChatEventCardAction,
  ChatEventCardCode,
  ChatEventCardSegment,
} from '../customEventCards.js'
import { getCustomEventCardFactory } from '../customEventCards.js'
import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { ChatPanelProps, ChatUserIdentity, IdeClientAction } from '../types.js'
import type { Activity } from './activity-utilities.js'
import { activityFromEvent } from './activity-utilities.js'
import { ActivityCard } from './ActivityCard.js'
import { AutoCommitBadge } from './AutoCommitBadge.js'
import {
  AUTO_COMMIT_DISABLED,
  autoCommitReducer,
  isAutoCommitArmed,
  isAutoCommitDue,
  isAutoCommitEnabled,
  parseAutoCommitCommand,
  resolveAutoCommitSeconds,
} from './chat-autocommit-utilities.js'
import { CHAT_CARD_ICON_SIZE, chatCardBorder, chatCardStyle } from './chat-card-style.js'
import type { CommandId } from './chat-commands.js'
import {
  COMMAND_CATEGORIES,
  type CommandDef,
  COMMANDS,
  matchesSideChannelCommand,
} from './chat-commands.js'
import { stripCommitCoauthorTrailer } from './chat-commit-utilities.js'
import { cachedPromptTokens, formatTokenTotal } from './chat-cost-utilities.js'
import type { EffortLevel, EffortMode, EffortOption } from './chat-effort-utilities.js'
import {
  defaultEffortForModel,
  effortOptionsForModel,
  nativeEffortName,
  parseEffortCommand,
  resolveEffortArg,
} from './chat-effort-utilities.js'
import { buildHelpText } from './chat-help-utilities.js'
import type { FreeTierLockReason, ModelMode } from './chat-model-mode-utilities.js'
import {
  effectiveModeModelId,
  freeTierLockReason,
  freeTierUsableMode,
  isModeModelLocked,
  modeSettingKey,
  parseModelModeCommand,
  resolveModeModel,
} from './chat-model-mode-utilities.js'
import type { ModelSortColumn, SortDirection } from './chat-models-utilities.js'
import {
  modelHasPeakPricing,
  modelPeakMultiplier,
  modelPeakWindowLabels,
  modelUsageRate,
  sortModels,
} from './chat-models-utilities.js'
import type { ReportResult } from './chat-report-utilities.js'
import { formatReportConfirmation, parseReportCommand } from './chat-report-utilities.js'
import type { ScriptInfo, ScriptRunResult } from './chat-scripts-utilities.js'
import {
  findScriptByName,
  formatRunOutput,
  missingRequiredParams,
  parseRunCommand,
  parseScriptsCommand,
  runSucceeded,
} from './chat-scripts-utilities.js'
import type { SettingDescriptor } from './chat-settings-utilities.js'
import { buildSettingsList, summarizeSounds } from './chat-settings-utilities.js'
import type { ShareLinkResult, ShareRole } from './chat-share-utilities.js'
import {
  buildShareUrl,
  DEFAULT_SHARE_ROLE,
  parseShareCommand,
  SHARE_ROLES,
} from './chat-share-utilities.js'
import type { SkillInfo } from './chat-skills-utilities.js'
import {
  buildNewSkillTemplate,
  loadProjectSkills,
  newSkillPath,
  parseSkillMeta,
  pickRelevantSkill,
  recentUserText,
} from './chat-skills-utilities.js'
import { estimateTurnTokens } from './chat-stream-utilities.js'
import {
  ENTRY_TIP,
  pickIdleTip,
  shouldShowIdleTip,
  TIP_IDLE_MS,
  TIP_MIN_MESSAGES,
} from './chat-tips-utilities.js'
import { ChatItemBoundary } from './ChatItemBoundary.js'
import { HelpCard } from './HelpCard.js'
import { Icon } from './Icon.js'
import { MarkdownContent } from './MarkdownContent.js'
import { RelevantSkillSuggestion } from './RelevantSkillSuggestion.js'
import { ReportModal } from './ReportModal.js'
import { ScriptsCard } from './ScriptsCard.js'
import { SettingsCard } from './SettingsCard.js'
import { ShareModal } from './ShareModal.js'
import { SkillsCard } from './SkillsCard.js'
import { StreamingIndicator } from './StreamingIndicator.js'
import { TipCard } from './TipCard.js'
import { ToolCallCard } from './ToolCallCard.js'
import { UserAvatar } from './UserAvatar.js'

const logger = getLogger('chat-panel')

// Processing region for a model, as an arbitrary region code ('us', 'cn',
// potentially 'eu' etc. later — deliberately NOT a closed union). The server
// reads `project.settings.modelRegions` (a Record<modelId, regionCode>) and
// dispatches to the provider it registered for that region; unknown codes fall
// back to the model's default region.
type ModelRegion = string

// Every region the picker can offer: the flag's country code (resolved via the
// bonded @molecule/app-country-flags set) + the English fallback for its i18n
// label (`ide.chat.model.region.<code>`). Adding a region here (plus a
// server-side provider registration) is ALL the UI needs — the region
// control's menu lists whatever `availableModelRegions` returns.
const MODEL_REGION_META: Record<string, { flagCode: string; defaultLabel: string }> = {
  us: { flagCode: 'US', defaultLabel: 'US' },
  cn: { flagCode: 'CN', defaultLabel: 'CN' },
}

/**
 * Renders a region's rectangular flag from the bonded country-flag set at the
 * given total height, falling back to the uppercase code as text when no flag
 * set is bonded or the code has no flag. The SVG markup ships with
 * viewBox-only sizing, so the inner dimensions are injected here; the hairline
 * border keeps light flag edges (e.g. the US stripes) from blending into a
 * light surface.
 *
 * @param props - `code` (ISO/pseudo country code) and total `height` in px
 *   (border included).
 * @returns The flag element, or the textual fallback.
 */
function RegionFlag({ code, height }: { code: string; height: number }): JSX.Element {
  const flag = getCountryFlag(code)
  if (!flag) {
    return <span style={{ fontSize: '10px', lineHeight: `${height}px` }}>{code.toUpperCase()}</span>
  }
  const innerHeight = height - 2
  const innerWidth = Math.round(innerHeight * flag.aspectRatio)
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        border: '1px solid rgba(128,128,128,0.4)',
        borderRadius: 1,
        overflow: 'hidden',
      }}
      // The bonded set's markup is trusted static artwork (a build-time
      // dependency, never user input), so injecting it verbatim is safe.
      dangerouslySetInnerHTML={{
        __html: flag.svg.replace(
          '<svg',
          `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
        ),
      }}
    />
  )
}
/**
 * Regions a model can be processed in, first entry = its default — straight
 * from the catalog (`AppModelDefinition.regions`; the server enforces the same
 * list). A single-entry list is a pinned model (fixed, non-interactive flag);
 * omission means the US-only platform default. The control/menu UI renders
 * whatever this returns, so new regions only need catalog data + a
 * `MODEL_REGION_META` entry.
 * @param model - The model to resolve regions for.
 * @returns Available region codes, default first.
 */
const availableModelRegions = (model: AppModelDefinition): ModelRegion[] => model.regions ?? ['us']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
}

interface AttachedFile {
  /** Sandbox file path for @-mentioned text files. */
  path?: string
  /** Browser File object for drag-dropped/pasted/picked binary files. */
  file?: File
  /** Display name. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
  /** Object URL for image thumbnail preview (revoked on removal). */
  previewUrl?: string
}

interface FilePicker {
  entries: FileEntry[]
  query: string
  selectedIdx: number
}

interface CommandMenu {
  selectedIdx: number
  /**
   * Opened via the slash BUTTON with text already in the composer: list every
   * runnable command instead of filtering by the composer text (which the
   * toggle deliberately leaves untouched). Cleared the moment typing re-derives
   * the menu from the input.
   */
  showAll?: boolean
}

interface ConversationSummary {
  id: string
  createdAt: string
  updatedAt: string
  preview: string | null
}

interface CommitCard {
  id: string
  message: string
  files: string[]
  timestamp: number
  status: 'running' | 'done' | 'error'
  hash?: string
}

/** Subtle inline monospace code style for command/identifier spans in chat cards. */
const CHAT_CARD_CODE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--mol-font-mono, monospace)',
  fontSize: '0.92em',
  padding: '1px 5px',
  borderRadius: 4,
  background: 'rgba(128,128,128,0.16)',
  border: '1px solid rgba(128,128,128,0.18)',
  whiteSpace: 'nowrap',
}

/** Inline link style for action segments in chat cards (theme primary, underlined). */
const CHAT_CARD_LINK_STYLE: React.CSSProperties = {
  color: 'var(--color-primary, #4070e0)',
  textDecoration: 'underline',
  cursor: 'pointer',
}

/**
 * Render one composable card-body segment: a plain string, an inline monospace
 * {@link ChatEventCardCode} span, or a {@link ChatEventCardAction} (link/button,
 * optionally monospace via `code`). Shared by the tip (toned) and default system cards.
 *
 * @param seg - The segment to render.
 * @param key - React list key.
 * @returns The rendered node.
 */
function renderCardSegment(seg: ChatEventCardSegment, key: number): ReactNode {
  if (typeof seg === 'string') return <span key={key}>{seg}</span>
  if ('code' in seg && !('label' in seg)) {
    return (
      <code key={key} style={CHAT_CARD_CODE_STYLE}>
        {(seg as ChatEventCardCode).code}
      </code>
    )
  }
  const act = seg as ChatEventCardAction
  const linkStyle: React.CSSProperties = act.code
    ? { ...CHAT_CARD_CODE_STYLE, color: CHAT_CARD_LINK_STYLE.color, cursor: 'pointer' }
    : CHAT_CARD_LINK_STYLE
  return act.href ? (
    <a key={key} href={act.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {act.label}
    </a>
  ) : (
    <button
      key={key}
      type="button"
      onClick={act.onClick}
      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', ...linkStyle }}
    >
      {act.label}
    </button>
  )
}

/**
 * `Omit` that distributes over a union, so each member keeps its own remaining keys
 * (plain `Omit<A | B, K>` collapses to the common keys only).
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * Fields shared by every system card. `action` (an optional CTA button, or array of
 * them) is common — any card may carry one; its in-session `onClick` is dropped on
 * persist, so a restored card is informational.
 */
interface SystemCardBase {
  id: string
  text: string
  timestamp: number
  action?: ChatEventCardAction | ChatEventCardAction[]
  /**
   * Marks a card as THIS client's own per-user UI ephemera — a command browser
   * (`/help`, `/settings`, `/scripts`) or transient command output — that is irrelevant
   * to the shared conversation and must NOT be persisted: it stays in this session's
   * timeline but is never written to the conversation, so it can't leak onto a reload or
   * to other collaborators (multi-user). Cards WITHOUT this flag are conversation content
   * (the server-driven model/mode/skills/build notices, a created skill, a share link, …)
   * and persist as before — the default is "persist", so nothing silently loses its
   * history; only the explicitly-ephemeral cards opt out.
   */
  clientOnly?: boolean
  /**
   * Set when this card was applied from a teammate's broadcast (the chat push channel),
   * not this client's own stream. Rendered but NEVER persisted — the originating member
   * already persisted it; if every viewer re-PUT, members would race on the conversation
   * row.
   */
  received?: boolean
}

/**
 * Default card (no `variant`): a plain inline notice, or — with `tone` set — a
 * dismissable tip box. Owns the body/styling fields the rich variants never use.
 */
interface PlainSystemCard extends SystemCardBase {
  variant?: undefined
  /**
   * Composable inline body for a `tone` (tip) card — an ordered list of segments
   * (plain strings + inline link actions) rendered in sequence, used INSTEAD of
   * `text` + appended `action`s so a link can sit mid-sentence (see
   * {@link ChatEventCard.content}). `text` stays the plain-text fallback.
   */
  content?: ChatEventCardSegment[]
  /**
   * When true, render with the emphasized (highlighted box) style instead of the
   * muted inline style — e.g. a host-supplied sign-up / upgrade nudge. The caller
   * opts in explicitly; the styling is never inferred from the card's route or copy.
   */
  emphasized?: boolean
  /**
   * Tip TONE — picks the card's accent colour + default icon so every notice card shares
   * ONE consistent box, differing only by colour/icon: `info` (blue), `gold` (amber tip),
   * `upgrade` (amber clock), `success` (green check), `signup` (primary sign-in). Setting
   * a tone implies emphasis; `emphasized` without a tone falls back to `info`. See
   * {@link ChatEventCard.tone}.
   */
  tone?: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  /** Icon-name override (a `@molecule/app-icons` glyph); defaults to the tone's icon. */
  icon?: IconName
  /**
   * The limit this card already explains (a backend `limitType`). While a live error
   * carries the same `limitType` — i.e. the limit banner is restating it right above the
   * composer — this card is dropped from the timeline so the same limit is stated once,
   * not twice. See {@link ChatEventCard.coversLimitType}.
   */
  coversLimitType?: string
}

/** The `/settings` view. */
interface SettingsSystemCard extends SystemCardBase {
  variant: 'settings'
}

/**
 * The `/skills` browser — `'skills'` opens the browser; `'skillsCreate'` opens it with
 * the inline "New skill" form already open. `query` seeds the search (`/skills <query>`).
 */
interface SkillsSystemCard extends SystemCardBase {
  variant: 'skills' | 'skillsCreate'
  query?: string
}

/** The `/scripts` browser. `query` seeds the search (`/scripts <query>`). */
interface ScriptsSystemCard extends SystemCardBase {
  variant: 'scripts'
  query?: string
}

/** The `/help` high-level guide card. `text` carries the {@link buildHelpText} fallback. */
interface HelpSystemCard extends SystemCardBase {
  variant: 'help'
}

/**
 * The compact, clickable "Loaded {{count}} skills" notice whose onClick opens the
 * `/skills` browser (re-attached at render time — the persisted card drops callbacks).
 * `count` is persisted so the copy restores verbatim across reloads.
 */
interface SkillsLoadedSystemCard extends SystemCardBase {
  variant: 'skillsLoaded'
  count?: number
}

/**
 * A system card — a discriminated union keyed on `variant`, so each card type declares
 * ONLY its own fields and the compiler enforces validity (e.g. `count` only on the
 * loaded notice, `query` only on the browsers, `content`/`tone` only on the plain/tip
 * card). Replaces the former flat shape where every field was optional regardless of
 * variant. The render switch narrows on `variant`; persistence drops only `action`.
 */
type SystemCard =
  | PlainSystemCard
  | SettingsSystemCard
  | SkillsSystemCard
  | ScriptsSystemCard
  | HelpSystemCard
  | SkillsLoadedSystemCard

/**
 * Options for {@link addSystemCard}: the card's fields minus the generated `id` and the
 * positional `text`, with `timestamp` made optional (the SERVER-ms override — omit it to
 * use the client clock). Distributes over the union (see {@link DistributiveOmit}) so a
 * caller only ever names the fields valid for the variant it sets.
 */
type AddSystemCardOptions = DistributiveOmit<SystemCard, 'id' | 'text' | 'timestamp'> & {
  timestamp?: number
}

/** A dismissable auto-tip entry in the chat timeline. */
interface TipCardEntry {
  id: string
  text: string
  /** Numeric timestamp for timeline ordering. */
  timestamp: number
  /**
   * Accent colour override (border/background tint + icon colour) for a
   * semantic tip — e.g. the viewer tip goes gold to match the team-only
   * message treatment it explains. Default: the neutral primary tint.
   */
  accent?: string
  /** Leading-icon override (e.g. `people` for the viewer tip). Default: `lightbulb`. */
  icon?: IconName
}

/** An inline activity card entry in the chat timeline (a captured side effect). */
interface ActivityCardEntry {
  id: string
  activity: Activity
  /** Numeric timestamp for timeline ordering (derived from the activity's ISO timestamp). */
  timestamp: number
  /**
   * Set when this card was applied from a teammate's broadcast (the chat push channel),
   * not this client's own stream. Rendered but NEVER persisted — the originating member
   * already persisted it; if every viewer re-PUT, members would race on the conversation
   * row.
   */
  received?: boolean
}

interface ModelPicker {
  selectedIdx: number
  /**
   * When set, the picker is scoped to a mode: selections persist to that
   * mode's settings field (`planModel` / `executeModel` / `commitModel` /
   * `compactModel`) and the free-tier lock follows the mode's rules. Unset =
   * the legacy single `chatModel` ("Default"). Driven live by the mode
   * dropdown at the top of the picker; the `/model --plan` etc. flags merely
   * preselect it.
   */
  mode?: ModelMode
}

/**
 * The `/effort` level picker — a selectable list of the target mode's model's
 * own effort levels (mirrors how bare `/model` opens the model picker).
 */
interface EffortPicker {
  selectedIdx: number
  /**
   * The mode being edited — a selection persists to `effortByMode[mode]`.
   * Opens scoped to the live conversation mode (or the `--plan` / `--execute`
   * flag); the picker's own mode dropdown re-scopes it in place, and the
   * listed levels follow that mode's MODEL (plan and execute can run models
   * with entirely different native effort scales).
   */
  mode: EffortMode
}

// ---------------------------------------------------------------------------
// Sound types & playTone
// ---------------------------------------------------------------------------

/** Possible modes for each notification sound event. */
type SoundMode = 'off' | 'whenNotFocused' | 'always'

/** All stream event types that can trigger a notification sound. */
const SOUND_EVENTS = [
  'message',
  'done',
  'error',
  'tool_result',
  'file_diff',
  'commit_suggestion',
  'mode',
  'loop_limit_reached',
  'verification_result',
  'preview_error',
] as const

type SoundEventType = (typeof SOUND_EVENTS)[number]

/** User-friendly labels for each sound event (used as i18n defaultValues). */
const SOUND_EVENT_LABELS: Record<SoundEventType, string> = {
  message: 'Team message',
  done: 'Response complete',
  error: 'Error',
  tool_result: 'Tool finished',
  file_diff: 'File changed',
  commit_suggestion: 'Commit suggested',
  mode: 'Mode changed',
  loop_limit_reached: 'Loop limit reached',
  verification_result: 'Verification result',
  preview_error: 'Preview error',
}

/** Brief descriptions for each sound event. */
const SOUND_EVENT_DESCRIPTIONS: Record<SoundEventType, string> = {
  message: 'A teammate posted a team-only note',
  done: '{{agentName}} finished responding',
  error: 'Something went wrong during a response',
  tool_result: 'A tool call (file read, command, etc.) completed',
  file_diff: 'A file was created or modified',
  commit_suggestion: '{{agentName}} is suggesting files to commit',
  mode: 'Switched between plan mode and execute mode',
  loop_limit_reached: 'Hit the max tool iterations limit',
  verification_result: 'Lint or type-check finished running',
  preview_error: 'The live preview encountered an error',
}

/** Mode cycle order and display labels. */
const SOUND_MODES: SoundMode[] = ['off', 'whenNotFocused', 'always']
const SOUND_MODE_LABELS: Record<SoundMode, string> = {
  off: 'off',
  whenNotFocused: 'when not focused',
  always: 'always',
}

type SoundsConfig = Record<SoundEventType, SoundMode>

/** Per-device sounds preference (see the soundsConfig state comment). */
const SOUNDS_STORAGE_KEY = 'molecule.ide.sounds'

const DEFAULT_SOUNDS_CONFIG: SoundsConfig = {
  message: 'always',
  done: 'whenNotFocused',
  error: 'whenNotFocused',
  tool_result: 'off',
  file_diff: 'off',
  commit_suggestion: 'off',
  mode: 'whenNotFocused',
  loop_limit_reached: 'whenNotFocused',
  verification_result: 'whenNotFocused',
  preview_error: 'whenNotFocused',
}

interface SoundsPicker {
  selectedIdx: number
}

let audioCtx: AudioContext | null = null

/**
 * Play a short notification tone using the Web Audio API.
 * Creates the AudioContext lazily on first call (after user interaction).
 *
 * The default variant is a single 660 Hz blip (status events). The `team`
 * variant is the SAME blip an octave up (1320 Hz) — recognizably "a message,
 * not a status event" while staying consistent with the sound family.
 * @param variant - Which tone to play.
 */
function playTone(variant: 'default' | 'team' = 'default'): void {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.value = variant === 'team' ? 1320 : 660
    // Equal-loudness compensation: hearing is far more sensitive near 1–4 kHz
    // than at 660 Hz, so the octave-up tone needs roughly half the amplitude
    // to sound the same volume as the default blip.
    const peak = variant === 'team' ? 0.08 : 0.15
    gain.gain.setValueAtTime(peak, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.15)
  } catch (_error) {
    // AudioContext not available in this environment — silently skip
  }
}

/**
 * Check if a sound should play based on the mode and current page focus.
 * @param mode - The sound mode for the event.
 * @returns Whether the sound should play.
 */
function shouldPlaySound(mode: SoundMode): boolean {
  if (mode === 'off') return false
  if (mode === 'always') return true
  return !document.hasFocus()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO timestamp as a relative time string (e.g. "5m ago", "2h ago").
 * @param iso - The ISO 8601 timestamp string.
 * @returns A human-readable relative time string.
 */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/**
 * Long-form relative time (e.g. "just now", "43 minutes ago", "2 hours ago",
 * "3 days ago") for the Slack-style message header.
 * @param ms - Epoch milliseconds of the message.
 * @returns A human-readable long-form relative time string.
 */
function relativeTimeLong(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

/**
 * Format an AI-allowance window reset (epoch ms) as a short countdown phrase for
 * the /cost used-up line ("refreshes in about 3 hours"). Under an hour reads "in
 * under an hour"; ≥ 6h out on a later local calendar day reads "tomorrow".
 * @param resetAt - Epoch ms of the window end (always in the future from the API).
 * @returns A localized human countdown phrase.
 */
function allowanceResetCountdown(resetAt: number): string {
  const diffMs = resetAt - Date.now()
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return t('ide.chat.resetSoon', undefined, { defaultValue: 'soon' })
  }
  const hours = diffMs / 3_600_000
  if (hours < 1) {
    return t('ide.chat.resetUnderHour', undefined, { defaultValue: 'in under an hour' })
  }
  const rounded = Math.round(hours)
  const laterLocalDay = new Date(resetAt).toDateString() !== new Date().toDateString()
  if (laterLocalDay && rounded >= 6) {
    return t('ide.chat.resetTomorrow', undefined, { defaultValue: 'tomorrow' })
  }
  return t(
    'ide.chat.resetInHours',
    { hours: rounded },
    { defaultValue: `in about ${rounded} ${rounded === 1 ? 'hour' : 'hours'}` },
  )
}

/**
 * User-message accent stripe. The left edge of a real user message draws a vertical,
 * multi-tone BLUE gradient swept gently up and down (the same smooth single-gradient
 * technique as the composer ring, but vertical + blue) — NOT a repeating barber-pole,
 * which read busy + janky. The host supplies the curated blues via
 * `--mol-chat-accent-gradient`; the fallback is a lightened primary so it stays blue +
 * never dark in any theme (the theme's primary-light/-dark tokens are actually a medium
 * + a dark blue with no light tone). It's a full-box gradient (so the sweep has room to
 * travel) clipped to a 3px LEFT band that follows the row's rounded corners. A
 * `::before` + its keyframe can't be expressed inline (and inline `animation` can't be
 * media-queried), so — like AutoCommitBadge — it is injected once and gated on the
 * existing `data-mol-id`; the auto-sent row keeps its solid success accent.
 */
const USER_ACCENT_STYLE = `
[data-mol-id="chat-user-message"] { position: relative; }
[data-mol-id="chat-user-message"]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--mol-chat-accent-gradient, linear-gradient(to bottom, color-mix(in srgb, var(--mol-color-primary, #3060c0) 85%, #fff), color-mix(in srgb, var(--mol-color-primary, #3060c0) 50%, #fff) 50%, color-mix(in srgb, var(--mol-color-primary, #3060c0) 85%, #fff)));
  background-size: 100% 300%;
  animation: mol-chat-accent-flow 6s ease-in-out infinite;
  -webkit-mask: linear-gradient(to right, #000 3px, transparent 3px);
  mask: linear-gradient(to right, #000 3px, transparent 3px);
  pointer-events: none;
}
@keyframes mol-chat-accent-flow {
  0%, 100% { background-position: 50% 0%; }
  50% { background-position: 50% 100%; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mol-id="chat-user-message"]::before { animation: none; }
}`

/** Maximum file size for attachments (20 MB). */
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

/** MIME types accepted by the file input for AI provider attachments. */
const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/webm,video/mp4,video/webm'

/**
 * Reads a File as base64 (without data-URL prefix).
 * @param file - The file to encode.
 * @returns Base64-encoded string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Formats a byte count as a human-readable size string.
 * @param bytes - The size in bytes.
 * @returns Formatted string (e.g., "1.2MB").
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

// ---------------------------------------------------------------------------
// Thinking block
// ---------------------------------------------------------------------------

/**
 * Format a duration in milliseconds as a human-readable string.
 * @param ms - Duration in milliseconds.
 * @returns Formatted string like "Thought for 5 seconds" or "Thought for 2 minutes".
 */
function formatThinkingDuration(ms: number): string {
  if (ms < 1000) return t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    // Singular/plural split (the codebase's pluralization convention, e.g.
    // typeErrorCount/typeErrorsCount): each key is a clean i18n template so the
    // bond value matches the inline default verbatim and interpolates {{count}}
    // — never a JS `${}` literal, which a bond value would silently override.
    return seconds === 1
      ? t('ide.chat.thoughtForSecond', { count: seconds }, { defaultValue: 'Thought for 1 second' })
      : t(
          'ide.chat.thoughtForSeconds',
          { count: seconds },
          {
            defaultValue: 'Thought for {{count}} seconds',
          },
        )
  }
  const minutes = Math.round(seconds / 60)
  return minutes === 1
    ? t('ide.chat.thoughtForMinute', { count: minutes }, { defaultValue: 'Thought for 1 minute' })
    : t(
        'ide.chat.thoughtForMinutes',
        { count: minutes },
        {
          defaultValue: 'Thought for {{count}} minutes',
        },
      )
}

/**
 * Derive a real current-activity label for the streaming indicator from the
 * in-flight assistant message's latest block, so the user sees what's actually
 * happening (e.g. "Reading App.tsx", "Writing the plan") instead of a generic
 * spinner. Returns undefined when there's nothing specific to show (the
 * indicator then falls back to its rotating generic messages).
 *
 * @param msg - The streaming assistant message.
 * @param msg.blocks - The ordered stream blocks (thinking / tool_use / text).
 * @param msg.toolCalls - The message's tool calls, looked up by block id.
 * @returns A short activity label, or undefined.
 */
function streamingActivityLabel(msg: {
  blocks?: Array<{ type: string; id?: string }>
  toolCalls?: Array<{ id: string; name: string; input?: unknown }>
}): string | undefined {
  const blocks = msg.blocks
  if (!blocks || blocks.length === 0) return undefined
  const last = blocks[blocks.length - 1]
  if (last.type === 'thinking')
    return t('ide.chat.activity.thinking', undefined, { defaultValue: 'Synthesizing' })
  if (last.type !== 'tool_use') return undefined
  const tc = msg.toolCalls?.find((c) => c.id === last.id)
  if (!tc) return undefined
  const inp = (tc.input ?? {}) as { path?: string; query?: string; command?: string; url?: string }
  const base = (p?: string): string => (p ? (p.split('/').filter(Boolean).pop() ?? p) : '')
  const clip = (s?: string, n = 48): string => (s && s.length > n ? `${s.slice(0, n)}…` : (s ?? ''))
  switch (tc.name) {
    case 'read_file':
      return `${t('ide.chat.activity.reading', undefined, { defaultValue: 'Reading' })} ${base(inp.path)}`
    case 'write_file':
      return `${t('ide.chat.activity.writing', undefined, { defaultValue: 'Writing' })} ${base(inp.path)}`
    case 'edit_file':
      return `${t('ide.chat.activity.editing', undefined, { defaultValue: 'Editing' })} ${base(inp.path)}`
    case 'search_files':
      return `${t('ide.chat.activity.searching', undefined, { defaultValue: 'Searching' })} ${clip(inp.query)}`
    case 'list_files':
    case 'find_files':
      return t('ide.chat.activity.exploring', undefined, { defaultValue: 'Exploring files' })
    case 'exec_command':
      return `${t('ide.chat.activity.running', undefined, { defaultValue: 'Running' })} ${clip(inp.command)}`
    case 'save_plan':
      return t('ide.chat.activity.writingPlan', undefined, { defaultValue: 'Writing the plan' })
    case 'sandbox_fetch':
      return `${t('ide.chat.activity.fetching', undefined, { defaultValue: 'Fetching' })} ${clip(inp.url)}`
    case 'set_mode':
      return t('ide.chat.activity.switching', undefined, { defaultValue: 'Switching mode' })
    default:
      return undefined
  }
}

// estimateTurnTokens (and the per-message estimateStreamTokens it sums) live in
// ./chat-stream-utilities.js — they run on every stream flush, so each tool-input's
// length is cached there to stay O(1) per call (re-stringifying every write_file's
// full content per flush was an O(n²) freeze).

/**
 * Collapsible block for displaying AI thinking/reasoning content.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered thinking block element.
 */
function ThinkingBlock({
  content,
  durationMs,
  isStreaming,
}: {
  content: string
  durationMs?: number
  isStreaming?: boolean
}): JSX.Element {
  const cm = getClassMap()
  const contentRef = useRef<HTMLDivElement>(null)
  // Auto-expand while streaming so the user can see thinking in real-time.
  // Once streaming ends, the user's manual toggle takes over.
  const [manualToggle, setManualToggle] = useState<boolean | null>(null)
  const open = manualToggle ?? isStreaming === true

  // Auto-scroll to the bottom as new thinking content streams in.
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [open, content])

  const label = isStreaming
    ? t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
    : durationMs != null
      ? formatThinkingDuration(durationMs)
      : t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })

  return (
    <div style={{ marginBottom: '6px' }}>
      <button
        type="button"
        onClick={() => setManualToggle((v) => !(v ?? isStreaming === true))}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: '2px 0',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            display: 'block',
            flexShrink: 0,
            opacity: 0.5,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
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
        <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>{label}</span>
      </button>
      {open && (
        <div
          ref={contentRef}
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{
            paddingLeft: '16px',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            fontStyle: 'italic',
            opacity: 0.7,
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleUserMessage — height-limited user message with expand toggle
// ---------------------------------------------------------------------------

/** Height threshold (px) above which user messages get collapsed. */
const USER_MSG_COLLAPSE_HEIGHT = 150

// ---------------------------------------------------------------------------
// App version (P4-08)
// ---------------------------------------------------------------------------
//
// The single source of truth for the version this IDE reports — used BOTH by the
// `/version` command output AND by the `/version` entry's description in the
// slash-command menu (so the menu shows the real number, not a stale literal).
//
// This shared package owns no product branding, and there is currently no
// `version` prop on ChatPanelProps (and `types.ts` is owned elsewhere), so this
// is the minimal in-package wiring: one constant the menu + the command both
// read. When the host's real build version becomes available via a prop, point
// both sites at that prop instead of this fallback — the menu interpolation
// (`{{version}}`) already flows through, so only the value source changes.
const APP_VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// Chat timeline vertical rhythm (P4-05)
// ---------------------------------------------------------------------------
//
// ONE convention for EVERY item rendered into the chat timeline — message rows,
// the "Now using <model>" / "Switched to <mode>" / "Building your app" system
// cards, toned-tip + emphasized cards, commit cards, activity cards:
//
//   1. Each timeline item owns its spacing as a SINGLE BOTTOM MARGIN only.
//   2. NO timeline item sets a TOP margin — and NEVER a NEGATIVE one.
//
// The gap between any two stacked items is therefore exactly the upper item's
// bottom margin (no margin-collapsing surprises, no negatives), so adjacent
// items can never collide. The scale follows the 8px grid (DESIGN.md): 16px is
// the standard rhythm unit; discovery messages get a roomier 24px (kept
// intentional, but consistent).
//
// Why bottom-margin-only with no negatives: the old code gave a message
// `marginTop: -12px` whenever it shared a role with the *previous message*
// (computed from `prevMsg`, which skips intervening cards). In the timeline DOM
// a system card often sits between two same-role assistant messages, so that
// -12px yanked the message UP over the card's 10px bottom margin — net -2px,
// i.e. the message visually ATE the "Now using <model>" card's bottom spacing
// (the exact collision reported in P4-05). Removing the negative and giving
// every item the same bottom margin fixes it at the root for ALL item pairs.
/** Standard bottom margin (px) every chat-timeline item owns. 8px-grid rhythm unit. */
const TIMELINE_ITEM_GAP = 16
/** Roomier bottom margin (px) for discovery-phase message cards (intentionally looser). */
const TIMELINE_ITEM_GAP_DISCOVERY = 24

/**
 * Accent (success green) for an auto-sent message card — drives its tint, 1px border
 * and `sync` icon via {@link chatCardStyle}, so an agent-sent message is unmistakably
 * green while sharing the exact card shape of the user message and info cards.
 */
const AUTO_SENT_ACCENT = 'var(--mol-color-success, #16a34a)'

/**
 * Renders user message content with a max height and a chevron-down expand button
 * when the content overflows. Similar to the compaction summary expand pattern.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered collapsible message element.
 */
function CollapsibleUserMessage({
  content,
  isLight,
}: {
  content: string
  isLight: boolean
}): JSX.Element {
  const innerRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = innerRef.current
    if (el) setOverflows(el.scrollHeight > USER_MSG_COLLAPSE_HEIGHT)
  }, [content])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={innerRef}
        style={{
          maxHeight: expanded ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
      {overflows && !expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: isLight
              ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
              : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))',
            pointerEvents: 'none',
          }}
        />
      )}
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = isLight
              ? 'rgba(99,102,241,0.12)'
              : 'rgba(99,102,241,0.18)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '2px 0',
            margin: '2px 0 0',
            background: 'transparent',
            border: 'none',
            borderRadius: '0 0 4px 4px',
            cursor: 'pointer',
            color: 'inherit',
            transition: 'background 100ms',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            style={{
              display: 'block',
              opacity: 0.5,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }}
          >
            <polyline
              points="4,6 8,10 12,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VerificationBadge — inline lint result indicator
// ---------------------------------------------------------------------------

/**
 * Inline badge showing lint verification status — green check for pass, expandable error card for fail.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered verification badge element.
 */
function VerificationBadge({
  status,
  output,
  categories,
}: {
  status: 'ok' | 'error'
  output?: string
  workspaces: string[]
  categories?: string[]
}): JSX.Element {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)

  if (status === 'ok') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          padding: '3px 0',
          fontSize: '13px',
        }}
        className={cm.textMuted}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ flexShrink: 0, alignSelf: 'center', position: 'relative', top: '-1px' }}
        >
          <path
            d="M2 5.5 L4.2 7.8 L8 3"
            fill="none"
            stroke="#3fb950"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          {t('ide.chat.verificationPassed', undefined, { defaultValue: 'Checks passed' })}
        </span>
      </div>
    )
  }

  // Count errors from the output text
  const cats = categories ?? []
  const errorCount = output ? (output.match(/\berror\b/gi) ?? []).length || 1 : 1
  const warningCount = output ? (output.match(/\bwarning\b/gi) ?? []).length : 0

  // Build label with counts
  const parts: string[] = []
  if (cats.includes('type')) {
    const n = output ? (output.match(/error TS\d+/g) ?? []).length || errorCount : errorCount
    parts.push(
      n === 1
        ? t('ide.chat.typeErrorCount', { count: 1 }, { defaultValue: '1 type error' })
        : t('ide.chat.typeErrorsCount', { count: n }, { defaultValue: '{{count}} type errors' }),
    )
  }
  if (cats.includes('lint')) {
    const n = output ? (output.match(/\d+:\d+\s+error/g) ?? []).length || 1 : 1
    const w = warningCount
    if (n > 0)
      parts.push(
        n === 1
          ? t('ide.chat.lintErrorCount', { count: 1 }, { defaultValue: '1 lint error' })
          : t('ide.chat.lintErrorsCount', { count: n }, { defaultValue: '{{count}} lint errors' }),
      )
    if (w > 0)
      parts.push(
        w === 1
          ? t('ide.chat.lintWarningCount', { count: 1 }, { defaultValue: '1 warning' })
          : t('ide.chat.lintWarningsCount', { count: w }, { defaultValue: '{{count}} warnings' }),
      )
  }
  if (cats.includes('runtime')) {
    parts.push(t('ide.chat.runtimeErrors', undefined, { defaultValue: 'Runtime errors' }))
  }
  const label =
    parts.length > 0
      ? parts.join(', ')
      : t('ide.chat.verificationFailed', undefined, { defaultValue: 'Errors found' })

  // Use amber for lint-only warnings, red for type/runtime errors
  const isLintOnly = cats.length > 0 && cats.every((c) => c === 'lint')
  const borderColor = isLintOnly ? 'rgba(234,179,8,0.4)' : 'rgba(248,81,73,0.3)'
  const bgColor = isLintOnly ? 'rgba(234,179,8,0.06)' : 'rgba(248,81,73,0.06)'
  const textColor = isLintOnly ? '#d4a017' : '#f85149'

  return (
    <div
      style={{
        margin: '4px 0',
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cm.cn(cm.textSize('xs'), cm.w('full'))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          border: 'none',
          background: 'transparent',
          color: textColor,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
            opacity: 0.6,
          }}
        >
          <polyline
            points="4,6 8,10 12,6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded && output && (
        <pre
          className={cm.cn(cm.textSize('xs'))}
          style={{
            margin: 0,
            padding: '6px 8px',
            borderTop: `1px solid ${borderColor}`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflow: 'auto',
            opacity: 0.85,
            fontFamily: 'var(--mol-font-mono, monospace)',
            color: 'inherit',
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// NoticeCard — the ONE shared tone-accented notice treatment
// ---------------------------------------------------------------------------

/** The accent + default icon per tone. Exported shape via {@link NoticeCard}. */
const NOTICE_TONE: Record<
  'info' | 'gold' | 'upgrade' | 'success' | 'signup',
  { accent: string; icon: IconName }
> = {
  info: { accent: 'var(--mol-color-primary, #6366f1)', icon: 'info-circle' },
  gold: { accent: '#e0a100', icon: 'lightbulb' },
  // Limit / degraded / budget / upgrade notices: a `clock` icon — an OUTLINE ring
  // built exactly like `info-circle`, so it matches the other tone icons' weight
  // (the solid `exclamation-triangle`/`sparkle` glyphs read far heavier). The accent
  // is the theme WARNING token so the border stays visible on light backgrounds too.
  upgrade: { accent: 'var(--mol-color-warning, #e0a100)', icon: 'clock' },
  success: { accent: '#3fb950', icon: 'check-circle' },
  signup: { accent: 'var(--mol-color-primary, #6366f1)', icon: 'sign-in' },
}

/**
 * The single shared notice-card treatment: a matched-weight accent {@link Icon},
 * an optional composable body (or plain text), and a left-aligned row of accent
 * outline action buttons. EVERY inline notice renders through this — the system
 * tip/notice cards AND the resource-limit / upgrade banners (see
 * {@link ResourceLimitBanner}) — so their icon + buttons can never drift apart
 * again. The host owns the button routes/copy; it passes them in as `action`.
 *
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered notice card.
 */
function NoticeCard({
  tone,
  text,
  content,
  action,
  icon: iconOverride,
}: {
  tone: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  text?: string
  content?: ChatEventCardSegment[]
  action?: ChatEventCardAction | ChatEventCardAction[] | null
  icon?: IconName
}): JSX.Element {
  const cm = getClassMap()
  const isCoarse = useCoarsePointer()
  const { accent, icon: defaultIcon } = NOTICE_TONE[tone]
  const icon = iconOverride ?? defaultIcon
  const actions = action ? (Array.isArray(action) ? action : [action]) : []
  const multiLine = (text ?? '').includes('\n')
  // Buttons sit ON the card's tint, so they need their OWN opaque background to read
  // as real buttons (a transparent "ghost" fill blends into the card). Opaque surface
  // + a stronger accent border than the card frame + a hairline shadow.
  const buttonBg = 'var(--mol-color-surface, transparent)'
  const buttonHoverBg = `color-mix(in srgb, ${accent} 15%, var(--mol-color-surface, transparent))`
  const onEnter = (e: React.MouseEvent<HTMLElement>): void => {
    ;(e.currentTarget as HTMLElement).style.background = buttonHoverBg
  }
  const onLeave = (e: React.MouseEvent<HTMLElement>): void => {
    ;(e.currentTarget as HTMLElement).style.background = buttonBg
  }
  return (
    <div
      data-mol-id="chat-notice-card"
      data-tone={tone}
      className={cm.textSize('xs')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: TIMELINE_ITEM_GAP,
        ...chatCardStyle(accent),
        lineHeight: 1.5,
      }}
    >
      <Icon
        name={icon}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: 1, color: accent }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {content ? (
          content.map((seg, i) => renderCardSegment(seg, i))
        ) : (
          <span style={multiLine ? { whiteSpace: 'pre-wrap' } : undefined}>{text}</span>
        )}
        {!content && actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {actions.map((act, i) => {
              // An action with a semantic `color` renders as a REAL design-system
              // button (`cm.button`, sm) so the same CTA looks identical wherever
              // the app shows it (auth page, banners, chat cards). No inline
              // colors — the ClassMap owns the look, including hover states.
              // Colorless actions keep the legacy accent-outline treatment.
              if (act.color) {
                // touchTargetCompact (36px), not the full 44px touchTarget — these
                // sit inside a dense chat card (the floor agreed for its actions).
                const className = cm.cn(
                  cm.button({ color: act.color, size: 'sm' }),
                  cm.touchTargetCompact,
                )
                const coloredStyle: React.CSSProperties = {
                  textDecoration: 'none',
                  fontFamily: act.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
                }
                return act.href ? (
                  <a
                    key={i}
                    href={act.href}
                    target={act.href.startsWith('http') ? '_blank' : undefined}
                    rel={act.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={className}
                    style={coloredStyle}
                  >
                    {act.label}
                  </a>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={act.onClick}
                    className={className}
                    style={coloredStyle}
                  >
                    {act.label}
                  </button>
                )
              }
              const style: React.CSSProperties = {
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                // Secondary inline actions: 36px is the touch floor agreed for
                // these (44 would overwhelm the compact card).
                ...(isCoarse ? { minHeight: 36 } : {}),
                borderRadius: 6,
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: act.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
                border: `1px solid ${chatCardBorder(accent, 55)}`,
                color: accent,
                background: buttonBg,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                transition: 'background 100ms',
              }
              return act.href ? (
                <a
                  key={i}
                  href={act.href}
                  target={act.href.startsWith('http') ? '_blank' : undefined}
                  rel={act.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={style}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  {act.label}
                </a>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={act.onClick}
                  style={style}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  {act.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ResourceLimitBanner — upgrade prompt when sandbox runs out of memory / a limit hits
// ---------------------------------------------------------------------------

/**
 * Inline banner shown when the sandbox runs out of memory (or another usage limit
 * is hit), prompting the user to upgrade. Renders through the shared
 * {@link NoticeCard} so it has the SAME matched-weight icon + accent button row as
 * every other upgrade notice — no bespoke icon, no single-link special case. The
 * host supplies the sign-in / upgrade buttons via `buildUpgradeCta` → `action`.
 *
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered upgrade banner element.
 */
function ResourceLimitBanner({
  message,
  action,
}: {
  message: string
  action?: ChatEventCardAction | ChatEventCardAction[] | null
}): JSX.Element {
  return <NoticeCard tone="upgrade" text={message} action={action} />
}

// CommitCardItem — expandable tool-call-style card for commits
// ---------------------------------------------------------------------------

/**
 * Expandable tool-call-style card displaying a commit with its files.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered commit card element.
 */
export function CommitCardItem({
  card,
  onRevert,
}: {
  card: CommitCard
  onRevert?: (hash: string) => Promise<string | undefined>
}): JSX.Element {
  const cm = getClassMap()
  const isCoarse = useCoarsePointer()
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  // Track undo/redo state: each revert produces a new hash that can itself be reverted
  const [isReverted, setIsReverted] = useState(false)
  const [revertHash, setRevertHash] = useState<string | undefined>()
  const hasFiles = card.files.length > 0
  const isRunning = card.status === 'running'
  const isDone = card.status === 'done'
  const canRevert = isDone && (isReverted ? revertHash : card.hash) && onRevert
  const dotColor = isRunning ? '#e8a000' : card.status === 'error' ? '#f04040' : '#4070e0'

  const handleRevert = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canRevert || isReverting) return
      const hashToRevert = isReverted ? revertHash! : card.hash!
      setIsReverting(true)
      try {
        const newHash = await onRevert(hashToRevert)
        if (newHash) {
          if (isReverted) {
            // Re-applying: store the new hash so we can undo again
            setRevertHash(newHash)
          } else {
            // Undoing: store the revert commit hash so we can redo
            setRevertHash(newHash)
          }
          setIsReverted((v) => !v)
        }
      } finally {
        setIsReverting(false)
      }
    },
    [canRevert, isReverting, isReverted, revertHash, card.hash, onRevert],
  )

  return (
    // One timeline rhythm: bottom margin only (see TIMELINE_ITEM_GAP).
    <div style={{ marginBottom: TIMELINE_ITEM_GAP }}>
      <div style={{ marginBottom: '4px' }}>
        <button
          type="button"
          onClick={hasFiles ? () => setExpanded((e) => !e) : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: hasFiles ? 'pointer' : 'default',
            color: 'inherit',
            textAlign: 'left',
            padding: '2px 0',
            width: '100%',
          }}
        >
          {/* Status dot — orange while running, red on error, blue when done */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{ flexShrink: 0, marginTop: '5px' }}
          >
            <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35" />
            <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} strokeWidth="2" />
          </svg>

          {/* Label — single truncated line unless expanded */}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: expanded ? 'normal' : 'nowrap',
            }}
          >
            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  // flex:1 so the message fills the row and pushes the revert icon to
                  // the right edge (directly left of the chevron), matching the
                  // tool-call cards instead of letting it hug the commit text.
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: expanded ? 'normal' : 'nowrap',
                }}
              >
                {isRunning ? (
                  t('ide.chat.committing', undefined, { defaultValue: 'Committing' })
                ) : (
                  <>
                    {t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })}{' '}
                    <code
                      style={{
                        fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                        fontSize: 'inherit',
                      }}
                    >
                      {stripCommitCoauthorTrailer(card.message)}
                    </code>
                  </>
                )}
              </span>
              {canRevert && (
                <span
                  role="button"
                  tabIndex={0}
                  title={
                    isReverted
                      ? t('ide.chat.redoCommit', undefined, {
                          defaultValue: 'Re-apply this commit',
                        })
                      : t('ide.chat.revertCommit', undefined, {
                          defaultValue: 'Revert this commit',
                        })
                  }
                  onClick={handleRevert}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRevert(e as unknown as React.MouseEvent)
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.opacity = ''
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'flex-start',
                    // Touch: hover can't reveal it, so it rests visible at 0.6 and
                    // gets a 32px hit box (the floor for these dense inline rows).
                    width: isCoarse ? 32 : 20,
                    height: isCoarse ? 32 : 20,
                    borderRadius: 4,
                    flexShrink: 0,
                    cursor: isReverting ? 'wait' : 'pointer',
                    opacity: isReverting ? 0.3 : isHovered || isCoarse ? 0.6 : 0,
                    transition: 'opacity 100ms, background 100ms',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="13"
                    height="13"
                    fill="currentColor"
                  >
                    {isReverted ? (
                      <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
                    ) : (
                      <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
                    )}
                  </svg>
                </span>
              )}
            </span>
            {hasFiles && !expanded && (
              <span
                className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style={{ display: 'block', marginTop: '1px' }}
              >
                {t(
                  'ide.chat.fileCount',
                  { count: card.files.length },
                  { defaultValue: '{{count}} files' },
                )}
              </span>
            )}
          </span>

          {/* Expand chevron */}
          {hasFiles && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={{
                display: 'block',
                flexShrink: 0,
                marginTop: '3px',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered ? 0.85 : 0.35,
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
          )}
        </button>

        {/* Expanded file list */}
        {expanded && hasFiles && (
          <div
            className={cm.surfaceSecondary}
            style={{
              marginLeft: '14px',
              marginTop: '4px',
              marginBottom: '4px',
              borderRadius: '4px',
              overflowX: 'auto',
              padding: '6px 10px',
            }}
          >
            <div
              style={{
                fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                fontSize: '11px',
                lineHeight: 1.6,
              }}
            >
              {card.files.map((f) => {
                const path = typeof f === 'string' ? f : (f as { path: string }).path
                return <div key={path}>{path}</div>
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MessageItem — memo'd to avoid re-rendering all messages when one changes
// ---------------------------------------------------------------------------

/** Props for the memoized per-message timeline row (see {@link MessageItem}). */
export interface MessageItemProps {
  msg: ChatMessage
  sendMessage: (msg: string) => void
  handleAskUserResponse: (response: string) => void
  isLoading: boolean
  /**
   * Transient background-phase label (e.g. "Type-checking the API") shown in the
   * streaming spinner in place of the generic rotating messages; null when idle.
   */
  streamingStatus: string | null
  /** Navigates the preview to a route path when a `[label](/route)` link in a message is clicked. */
  onNavigatePreview?: (path: string) => void
  undoneTcIds: Set<string>
  handleUndoToggle: (tcId: string, undone: boolean) => void
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  handleFileRevert: (path: string, content: string) => Promise<void>
  setInputAndCursorEnd: (val: string) => void
  setModelPicker: React.Dispatch<React.SetStateAction<ModelPicker | null>>
  /**
   * The live conversation mode (discovery maps to 'plan') — scopes the
   * loop-limit banner's "Change model" picker so the pick lands on the mode the
   * user is actually in.
   */
  chatMode: 'plan' | 'execute'
  /** Signed-in user's avatar shown beside their own messages (SOC1); icon fallback when absent/unsafe. */
  userAvatar?: string | null
  /** When set, the user avatar becomes clickable and fires this to open the user's profile (C5). */
  onAvatarClick?: () => void
  /** Discovery phase — gives consecutive question/answer cards roomier, uncollapsed spacing (B3). */
  discovery?: boolean
  /**
   * Host-supplied upgrade/sign-in CTA builder — used to give the in-message
   * resource-limit (OOM) banner its sign-in/upgrade buttons. See
   * {@link ChatPanelProps.buildUpgradeCta}.
   */
  buildUpgradeCta?: ChatPanelProps['buildUpgradeCta']
  /** Agent display name — used in the team-only badge tooltip ("{{agentName}} ignores it"). */
  agentName?: string
  /** Whether the user may write shared project state — false hides/inertizes write affordances in the message (revert, ask_user answers). */
  canEdit?: boolean
}

/**
 * Renders a single message (user or assistant) in the chat timeline.
 * Wrapped in React.memo so unchanged messages skip re-rendering when
 * only the streaming message updates.
 * @param props - Message item props.
 * @returns The rendered message item.
 */
const MessageItem = memo(function MessageItem(props: MessageItemProps): JSX.Element {
  const {
    msg,
    sendMessage,
    handleAskUserResponse,
    isLoading,
    streamingStatus,
    onNavigatePreview,
    undoneTcIds,
    handleUndoToggle,
    onFileOpen,
    onFileDoubleClick,
    onFileDiff,
    handleFileRevert,
    setInputAndCursorEnd,
    setModelPicker,
    chatMode,
    userAvatar,
    onAvatarClick,
    discovery,
    buildUpgradeCta,
    agentName,
    canEdit,
  } = props

  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const borderClr = isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'

  // A message sent automatically on the user's behalf (e.g. an auto-fix prompt):
  // it has role 'user' but must NOT look like the user typed it (C2).
  const isAutomatic = msg.role === 'user' && !!msg.automatic
  // A human-only team note (side channel, e.g. /teamsay): renders like a user
  // message — author header, time, plain content — but with the gold team-only
  // accent + badge, and never the user message's blue stripe. `role` is 'system'
  // (the model never sees it), so this is checked before isUser.
  const isTeamNote = !!msg.teamOnly
  // A real, user-typed message (the only one styled with the blue border + the
  // user's own avatar).
  const isUser = msg.role === 'user' && !isAutomatic

  // Spacing follows the one timeline convention (see TIMELINE_ITEM_GAP above): a
  // single bottom margin, no top margin, no negatives — so a message can never
  // pull itself up over the previous item's spacing. Discovery is roomier but
  // uses the same bottom-margin-only scheme. The former `sameRoleAsPrev`
  // `marginTop: -12px` run-tightening is gone on purpose: it keyed on the
  // previous *message* (skipping intervening system cards) and so ate the
  // "Now using <model>" card's bottom margin (P4-05).
  const wrapperSpacing: React.CSSProperties = {
    marginBottom: `${discovery ? TIMELINE_ITEM_GAP_DISCOVERY : TIMELINE_ITEM_GAP}px`,
  }

  return (
    <div style={wrapperSpacing}>
      {isUser || isAutomatic || isTeamNote ? (
        <div
          className={
            // Auto-sent card matches the info cards' `xs` body; a real user message keeps
            // its slightly larger `sm` (it's a different kind of row, not an info card).
            isAutomatic ? cm.textSize('xs') : cm.cn(cm.surfaceSecondary, cm.textSize('sm'))
          }
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            minWidth: 0,
            // A real user message keeps its classic look: a gray surface with the
            // molecule brand's ANIMATED blue gradient stripe (3px) on the left edge,
            // drawn by the `::before` injected via USER_ACCENT_STYLE + gated on the
            // data-mol-id below, PLUS a solid blue outline ring (host-tunable via
            // `--mol-chat-accent-border`) so a sent-to-Synthase message reads bordered
            // the same way a team note does, and the user's full-size avatar. An
            // auto-sent message is instead a green (success) tinted card — same chrome
            // as the info cards — so it's unmistakably agent-sent, not user-typed (C2).
            // A team note keeps the user-message look but swaps the blue chrome (its
            // data-mol-id differs, so USER_ACCENT_STYLE never applies) for the gold
            // team-only border — with its own solid 3px left band (an inset box-shadow,
            // which starts at the border's inner edge exactly like the stripe's
            // `inset: 0` ::before, so the two rows' left accents match in geometry).
            ...(isAutomatic
              ? chatCardStyle(AUTO_SENT_ACCENT)
              : {
                  borderRadius: '4px',
                  paddingLeft: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingRight: '10px',
                  border: isTeamNote
                    ? `1px solid ${NOTICE_TONE.gold.accent}`
                    : '1px solid var(--mol-chat-accent-border, var(--mol-color-primary, #3060c0))',
                  ...(isTeamNote
                    ? { boxShadow: `inset 3px 0 0 0 ${NOTICE_TONE.gold.accent}` }
                    : {}),
                }),
          }}
          data-mol-id={
            isTeamNote
              ? 'chat-team-message'
              : isAutomatic
                ? 'chat-automatic-message'
                : 'chat-user-message'
          }
        >
          {/* A real user message shows the user's full-size profile avatar (SOC1); an
              auto-sent message shows a small `sync` glyph — NOT the molecule logo —
              signalling the agent acted automatically (C2). The user message is its own
              look; the auto-sent card lines up with the other info cards. */}
          {isAutomatic ? (
            <Icon
              name="sync"
              size={CHAT_CARD_ICON_SIZE}
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1, color: AUTO_SENT_ACCENT }}
            />
          ) : (
            <UserAvatar
              // An AUTHORED message shows that author's avatar — or their initial
              // when they have none — NEVER the viewing user's picture (which made
              // a teammate's avatar-less message wear the viewer's own face). Only
              // an author-less message (the local optimistic echo, legacy rows) is
              // the signed-in user's own and uses their avatar.
              userAvatar={msg.author ? msg.author.avatar : userAvatar}
              name={msg.author?.name ?? undefined}
              size={36}
              onClick={onAvatarClick}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, marginTop: 1 }}>
            {isAutomatic ? null : (
              // Slack-style header: the author's username (bold) with the relative time
              // (small, lighter) to its right. The username comes from the per-message
              // `author` (multi-user-ready); a solo conversation falls back to the "You"
              // label. The header lineHeight is tuned against the 36px avatar so the
              // username's top aligns with the avatar's top and the first line of the
              // message beneath aligns with the avatar's bottom.
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  lineHeight: 1.3,
                  marginBottom: 1,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' })}
                </span>
                {isTeamNote && (
                  // Gold team-only badge right after the username (left of the time):
                  // this note is a human side channel — every project member sees it,
                  // the agent ignores it. The viewer tip explains this same icon.
                  <span
                    title={t(
                      'ide.chat.teamOnly.badge',
                      { agentName: agentName ?? 'the assistant' },
                      {
                        defaultValue:
                          'Team only — visible to your team; {{agentName}} will ignore it',
                      },
                    )}
                    aria-label={t(
                      'ide.chat.teamOnly.badge',
                      { agentName: agentName ?? 'the assistant' },
                      {
                        defaultValue:
                          'Team only — visible to your team; {{agentName}} will ignore it',
                      },
                    )}
                    // Centered in the header row with a -0.5px optical nudge. Platform
                    // font metrics make a single integer offset impossible: against
                    // plain center, macOS rendered the glyph ~1px low and Ubuntu spot-on
                    // (measured in Brave on both, 2026-08-27), so -0.5 splits the
                    // difference — each platform lands within half a pixel, and retina
                    // displays render the half-pixel crisply. (Baseline alignment was
                    // tried and rode too HIGH: a text-less inline-flex item's
                    // synthesized baseline is its bottom edge.)
                    style={{
                      display: 'inline-flex',
                      alignSelf: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      top: -0.5,
                    }}
                    data-mol-id="chat-team-only-badge"
                  >
                    <Icon
                      // 16px so the glyph reads at the username's optical size — the
                      // people glyph has internal viewBox padding, so a nominal 14px
                      // renders visibly smaller than the 14px text next to it.
                      name="people"
                      size={16}
                      aria-hidden="true"
                      style={{ color: NOTICE_TONE.gold.accent }}
                    />
                  </span>
                )}
                {typeof msg.timestamp === 'number' && (
                  <span className={cm.textMuted} style={{ fontSize: 11 }}>
                    {relativeTimeLong(msg.timestamp)}
                  </span>
                )}
              </div>
            )}
            <CollapsibleUserMessage content={msg.content} isLight={isLight} />
            {msg.attachments && msg.attachments.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {msg.attachments.map((att, ai) => (
                  <span
                    key={ai}
                    className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
                  >
                    {att.mediaType.startsWith('image/')
                      ? '\uD83D\uDDBC\uFE0F'
                      : att.mediaType.startsWith('audio/')
                        ? '\uD83C\uDFB5'
                        : att.mediaType.startsWith('video/')
                          ? '\uD83C\uDFA5'
                          : '\uD83D\uDCC4'}{' '}
                    {att.filename}
                    <span style={{ fontSize: 10, opacity: 0.7 }}>({formatSize(att.size)})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {msg.blocks && msg.blocks.length > 0 ? (
            msg.blocks.map((block, bi) => {
              const blockType = (block as { type: string }).type

              if (blockType === 'thinking') {
                const isLastBlock = bi === (msg.blocks?.length ?? 0) - 1
                return (
                  <ThinkingBlock
                    key={bi}
                    content={(block as { type: string; content: string }).content}
                    durationMs={(block as { durationMs?: number }).durationMs}
                    isStreaming={msg.isStreaming && isLastBlock}
                  />
                )
              }

              const isLast = bi === msg.blocks!.length - 1

              if (blockType === 'text') {
                const textContent = (block as { type: string; content: string }).content
                const isCompaction =
                  textContent.startsWith('**Context compacted**') ||
                  textContent.startsWith('> **Context compacted**')
                if (isCompaction) {
                  // Split into headline (first line) and optional summary (rest)
                  const nlIdx = textContent.indexOf('\n\n')
                  const headline = (nlIdx > -1 ? textContent.slice(0, nlIdx) : textContent).replace(
                    /^>\s*/,
                    '',
                  ) // strip leading blockquote
                  const summary = nlIdx > -1 ? textContent.slice(nlIdx + 2) : ''
                  return (
                    <div
                      key={bi}
                      className={cm.textSize('sm')}
                      style={{
                        padding: '10px 16px',
                        // Same blue-box treatment as the emphasized system card →
                        // same timeline rhythm: bottom margin only (TIMELINE_ITEM_GAP).
                        marginBottom: TIMELINE_ITEM_GAP,
                        background: 'rgba(64,112,224,0.10)',
                        border: '1px solid rgba(64,112,224,0.25)',
                        borderRadius: 8,
                        color: 'var(--mol-color-text-secondary, #aaa)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      <MarkdownContent text={headline} isStreaming={false} />
                      {summary && (
                        <details
                          style={{ margin: '14px -16px -10px', textAlign: 'left' }}
                          onToggle={(e) => {
                            const svg = (e.currentTarget as HTMLElement).querySelector(
                              '[data-chevron]',
                            ) as HTMLElement | null
                            if (svg)
                              svg.style.transform = (e.currentTarget as HTMLDetailsElement).open
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)'
                          }}
                        >
                          <summary
                            onMouseEnter={(e) => {
                              ;(e.currentTarget as HTMLElement).style.background = isLight
                                ? 'rgba(64,112,224,0.12)'
                                : 'rgba(64,112,224,0.18)'
                            }}
                            onMouseLeave={(e) => {
                              ;(e.currentTarget as HTMLElement).style.background = isLight
                                ? 'rgba(64,112,224,0.05)'
                                : 'rgba(64,112,224,0.08)'
                            }}
                            style={{
                              cursor: 'pointer',
                              textAlign: 'center',
                              listStyle: 'none',
                              padding: '3px 0',
                              borderRadius: '0 0 8px 8px',
                              background: isLight
                                ? 'rgba(64,112,224,0.05)'
                                : 'rgba(64,112,224,0.08)',
                              transition: 'background 100ms',
                            }}
                          >
                            <svg
                              data-chevron=""
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              width="14"
                              height="14"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                transition: 'transform 150ms',
                                color: isLight ? '#2850a0' : '#80b0ff',
                              }}
                            >
                              <polyline
                                points="4,6 8,10 12,6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </summary>
                          <div style={{ padding: '8px 16px 10px' }}>
                            <MarkdownContent text={summary} isStreaming={false} />
                          </div>
                        </details>
                      )}
                    </div>
                  )
                }
                return (
                  <MarkdownContent
                    key={bi}
                    text={textContent}
                    isStreaming={isLast && msg.isStreaming}
                    statusLabel={isLast && msg.isStreaming ? streamingStatus : undefined}
                    statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
                    onNavigatePreview={onNavigatePreview}
                    hideStreamingIndicator
                  />
                )
              }

              if (blockType === 'verification') {
                const vBlock = block as unknown as {
                  type: 'verification'
                  status: 'ok' | 'error'
                  output?: string
                  workspaces: string[]
                  categories?: string[]
                }
                return (
                  <VerificationBadge
                    key={`verification-${bi}`}
                    status={vBlock.status}
                    output={vBlock.output}
                    workspaces={vBlock.workspaces}
                    categories={vBlock.categories}
                  />
                )
              }

              if (blockType === 'resource_limit') {
                const rlBlock = block as unknown as {
                  type: 'resource_limit'
                  message: string
                }
                return (
                  <ResourceLimitBanner
                    key={`resource-limit-${bi}`}
                    message={rlBlock.message}
                    action={buildUpgradeCta?.({})}
                  />
                )
              }

              const tc = msg.toolCalls?.find(
                (c) => c.id === (block as { type: string; id: string }).id,
              )
              if (!tc) return null
              return (
                <div key={tc.id} style={{ marginTop: '4px' }}>
                  <ToolCallCard
                    id={tc.id}
                    name={tc.name}
                    input={tc.input}
                    output={tc.output}
                    status={tc.status}
                    fileDiff={tc.fileDiff}
                    isUndone={undoneTcIds.has(tc.id)}
                    onUndoToggle={handleUndoToggle}
                    onFileOpen={onFileOpen}
                    onFileDoubleClick={onFileDoubleClick}
                    onFileDiff={onFileDiff}
                    onFileRevert={canEdit === false ? undefined : handleFileRevert}
                    onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
                  />
                </div>
              )
            })
          ) : msg.content ? (
            <MarkdownContent
              text={msg.content}
              isStreaming={msg.isStreaming}
              statusLabel={msg.isStreaming ? streamingStatus : undefined}
              statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
              onNavigatePreview={onNavigatePreview}
              hideStreamingIndicator
            />
          ) : null}

          {msg.toolCalls &&
            msg.toolCalls.length > 0 &&
            (!msg.blocks || msg.blocks.length === 0) &&
            msg.toolCalls.map((tc) => (
              <ToolCallCard
                key={tc.id}
                id={tc.id}
                name={tc.name}
                input={tc.input}
                output={tc.output}
                status={tc.status}
                fileDiff={tc.fileDiff}
                isUndone={undoneTcIds.has(tc.id)}
                onUndoToggle={handleUndoToggle}
                onFileOpen={onFileOpen}
                onFileDoubleClick={onFileDoubleClick}
                onFileDiff={onFileDiff}
                onFileRevert={canEdit === false ? undefined : handleFileRevert}
                onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
              />
            ))}

          {msg.aborted && (
            <span
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}
            >
              {t('ide.chat.responseStopped', undefined, {
                defaultValue: 'Response stopped',
              })}
            </span>
          )}

          {msg.loopLimitReached &&
            !msg.isStreaming &&
            (() => {
              const loopActions: Array<{ label: string; action: () => void }> = [
                {
                  label: t('ide.chat.changeModel', undefined, {
                    defaultValue: 'Change model',
                  }),
                  action: () => {
                    setInputAndCursorEnd('/model ')
                    setModelPicker({ selectedIdx: -1, mode: chatMode })
                  },
                },
                {
                  label: t('ide.chat.increaseLoops', undefined, {
                    defaultValue: 'Increase max loops',
                  }),
                  action: () => {
                    setInputAndCursorEnd('/maxloops ')
                  },
                },
                {
                  label: t('ide.chat.continueButton', undefined, {
                    defaultValue: 'Continue',
                  }),
                  action: () => {
                    void sendMessage(
                      t('ide.chat.continuePrompt', undefined, {
                        defaultValue: 'Continue implementing from where you left off.',
                      }),
                    )
                  },
                },
              ]
              return (
                <div
                  style={{
                    marginTop: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${borderClr}`,
                    background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderBottom: `1px solid ${borderClr}`,
                    }}
                  >
                    {t(
                      'ide.chat.loopLimitReached',
                      { max: msg.loopLimitReached },
                      {
                        defaultValue: `Reached the maximum of ${msg.loopLimitReached} tool iterations.`,
                      },
                    )}
                  </div>
                  {loopActions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={i === 0 && isLoading}
                      onClick={opt.action}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = isLight
                          ? '#eaeef2'
                          : 'rgba(255,255,255,0.06)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        transition: 'background 80ms',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '5px',
                          border: `1px solid ${borderClr}`,
                          background: isLight ? '#fff' : 'rgba(255,255,255,0.08)',
                          color: isLight ? '#57606a' : '#848d97',
                          fontSize: '11px',
                          fontWeight: 600,
                          flexShrink: 0,
                          fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
        </div>
      )}
    </div>
  )
})

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
  /** Whether the user may manage public share links — see {@link ChatPanelProps.canShare}. */
  canShare?: boolean
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
  /** Called when a user avatar in the chat timeline is clicked — see {@link ChatPanelProps.onProfileClick}. */
  onProfileClick?: ChatPanelProps['onProfileClick']
  /** The signed-in user's id — gates avatar clicks to their OWN messages. See {@link ChatPanelProps.currentUserId}. */
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
  canShare,
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
  // feedbackUrl: prop kept for back-compat (callers still pass it), but no longer
  // consumed here — its only use was the command-menu footer link removed in P3-21.
}: ChatInnerProps): JSX.Element {
  const cm = getClassMap()
  // Share-link management may be gated ABOVE canEdit by the host (molecule.dev
  // mints/lists/revokes at admin+) — every /share surface below uses this, so
  // an editor without the capability gets no dead modal.
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
  // Bind the host's profile-click callback to the SIGNED-IN user's identity once.
  // Hosts open the *own*-profile surface from this, so it is only ever attached to
  // the signed-in user's OWN messages (see the per-message gate at the MessageItem
  // call site — a teammate's avatar must never open the viewer's profile). Stable
  // so MessageItem's memo isn't broken; `undefined` when the host opts out, which
  // keeps every avatar non-interactive.
  const onUserAvatarClick = useMemo<(() => void) | undefined>(
    () =>
      onProfileClick
        ? (): void => onProfileClick({ avatar: userAvatar } satisfies ChatUserIdentity)
        : undefined,
    [onProfileClick, userAvatar],
  )
  // If there's already a conversation (conversationId in the URL), always load
  // history — even when initialMessage is set. This prevents a refresh from
  // re-sending the initial prompt instead of restoring the existing conversation.
  const hasConversation = endpoint.includes('conversationId=')
  const conversationId = endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null
  // Kept in sync with `conversationId` so the (memoized) pushed-event handler reads the
  // current conversation without becoming a stale closure — see applyPushedStreamEvent.
  const conversationIdRef = useRef(conversationId)
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  // Ref for sounds config so the onStreamEvent callback always reads the latest value.
  const soundsConfigRef = useRef<SoundsConfig>({ ...DEFAULT_SOUNDS_CONFIG })

  // ── Context usage tracking (ring indicator) ─────────────────────────────
  const [contextUsage, setContextUsage] = useState<{
    inputTokens: number
    contextWindow: number
  } | null>(null)

  // Restore context usage from the history endpoint on mount. Retries a few
  // times on failure: this used to be one-shot, so a single transient error at
  // mount (an API deploy restart, a rate-limit blip) silently cost the context
  // ring for the entire session — the state only ever refills from the next
  // turn's `done` event (observed live 2026-08-29: ring gone, server data fine,
  // reload fixed it).
  useEffect(() => {
    if (!hasConversation) return
    let cancelled = false
    let attempt = 0
    const load = (): void => {
      http
        .get<{ contextUsage?: { inputTokens: number; contextWindow: number } }>(endpoint)
        .then((res) => {
          if (cancelled) return
          if (res.data.contextUsage) setContextUsage(res.data.contextUsage)
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

  // ── Auto-fix countdown state ──────────────────────────────────────────────
  // After the AI finishes, if verification found errors, show a countdown
  // before auto-sending a fix message. User can cancel/pause.
  const [autoFixCountdown, setAutoFixCountdown] = useState<{
    output: string
    categories: string[]
    changedPaths: string[]
    secondsLeft: number
    paused: boolean
  } | null>(null)
  const autoFixIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingVerificationRef = useRef<{
    output: string
    categories: string[]
    changedPaths: string[]
  } | null>(null)

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
  useEffect(
    () => () => {
      if (autoFixIntervalRef.current) clearInterval(autoFixIntervalRef.current)
    },
    [],
  )

  // Ref so the stream-event callback can push activity cards without depending
  // on the state setter.
  const addActivityCardRef = useRef<(activity: Activity) => void>(() => {})
  // (A teammate's broadcast `card` / `message` events are ingested by
  // useChat.applyRemoteEvent — applyPushedStreamEvent routes every pushed frame
  // through it before this panel's handler runs, so no append refs live here.)
  // Kept current each render so handleStreamEvent (memoized) always calls the latest.
  const onReadyToBuildRef = useRef<(() => void) | undefined>(onReadyToBuild)
  onReadyToBuildRef.current = onReadyToBuild
  const onClientActionRef = useRef<((action: IdeClientAction) => void) | undefined>(onClientAction)
  onClientActionRef.current = onClientAction
  const onTurnCompleteRef = useRef<(() => void) | undefined>(onTurnComplete)
  onTurnCompleteRef.current = onTurnComplete
  const onLoadingChangeRef = useRef<((loading: boolean) => void) | undefined>(onLoadingChange)
  onLoadingChangeRef.current = onLoadingChange

  const handleStreamEvent = useCallback(
    (event: {
      type: string
      usage?: { inputTokens?: number; contextWindow?: number }
      [key: string]: unknown
    }) => {
      // Capture context usage from done events
      if (event.type === 'done' && event.usage?.inputTokens && event.usage?.contextWindow) {
        setContextUsage({
          inputTokens: event.usage.inputTokens,
          contextWindow: event.usage.contextWindow,
        })
      }
      // Capture verification errors to trigger countdown after stream ends —
      // SENDER-ONLY: a pushed frame from a teammate's turn must not arm this
      // client's auto-fix (the sender's client owns the follow-up; two clients
      // arming it would double-send the fix).
      // Also drop any deferred preview error — verification's countdown handles it.
      if (
        !applyingPushedRef.current &&
        event.type === 'verification_result' &&
        event.status === 'error' &&
        event.output
      ) {
        pendingVerificationRef.current = {
          output: event.output as string,
          categories: (event.categories as string[]) ?? [],
          changedPaths: (event.changedPaths as string[]) ?? [],
        }
        deferredPendingRef.current = null
      }
      // When stream ends, start countdown if there are pending verification errors
      if (event.type === 'done' && pendingVerificationRef.current) {
        const pending = pendingVerificationRef.current
        pendingVerificationRef.current = null
        setAutoFixCountdown({ ...pending, secondsLeft: 3, paused: false })
      }
      // Clear pending verification if a new verification comes back clean
      if (event.type === 'verification_result' && event.status === 'ok') {
        pendingVerificationRef.current = null
      }
      // NOTE: pushed `card` / `message` events are ingested into the message store by
      // useChat.applyRemoteEvent (applyPushedStreamEvent calls it before this handler),
      // through the same append helpers as an own stream — no panel-side append here.
      // Captured outbound side effect (email/sms/push/webhook/channel) — push an
      // inline activity card into the timeline. Non-text card, mirroring how
      // system cards are appended.
      if (event.type === 'activity' && event.activity) {
        addActivityCardRef.current(
          activityFromEvent(
            event.activity as {
              id?: string
              type?: string
              status?: string
              recipient?: string
              summary?: string
              timestamp?: string
            },
          ),
        )
      }
      // Discovery finished and the server selected a starting point — boot the
      // sandbox. SENDER-ONLY: the sender's client drives the boot; a watching
      // client's host follows the project's sandbox status instead of racing a
      // second boot request. The template choice is internal; this event carries
      // no user-facing payload and is never rendered in the transcript.
      if (event.type === 'ready_to_build' && !applyingPushedRef.current) {
        onReadyToBuildRef.current?.()
      }
      // The agent asked the IDE to reload/navigate the preview, open a file, or drive the
      // preview bridge. Forward to the host (Workspace); not rendered in the transcript.
      // Forward EVERY IdeClientAction field (keep this list in sync with that interface):
      // preview_ui carries requestId/command/molId/selector/text/value, and forwarding only
      // {action, path} silently broke the SSE delivery path (only the host's collab-socket
      // duplicate made interact_preview work at all).
      if (event.type === 'client_action' && typeof event.action === 'string') {
        const e = event as Record<string, unknown>
        const str = (k: string): string | undefined =>
          typeof e[k] === 'string' ? (e[k] as string) : undefined
        onClientActionRef.current?.({
          action: event.action as IdeClientAction['action'],
          path: str('path'),
          requestId: str('requestId'),
          command: str('command') as IdeClientAction['command'],
          molId: str('molId'),
          selector: str('selector'),
          text: str('text'),
          value: str('value'),
        })
      }
      // Turn finished (done OR error) — let the host know. Used to keep the boot
      // view up until the parallel during-boot plan stream completes, so the
      // panel swap can't cut it off. Firing on error too prevents a failed
      // stream from stranding the boot view forever.
      if (event.type === 'done' || event.type === 'error') {
        onTurnCompleteRef.current?.()
      }
      // NOTE: the `model` (planner→executor) + `mode` ("Building your app") transcript markers
      // are no longer derived here. The server now RECORDS them (and the skills + custom
      // notices) as card-messages in the ONE transcript via recordCard, emitted as `card`
      // events and rendered from `cardEvent` (see cardEventToSystemCard) — so they persist and
      // reload identically, with no client-side "last shown" heuristic. The raw `mode` event
      // still drives the phase STATE (useChat's setMode); it just no longer spawns a card.
      const cfg = soundsConfigRef.current
      const eventType = event.type as SoundEventType
      // 'message' is the team-note ping: it fires only for a TEAMMATE's note
      // (the pushed broadcast) — never for the sender's own SSE echo.
      const isOwnTeamNote = event.type === 'message' && !applyingPushedRef.current
      if (!isOwnTeamNote && eventType in cfg && shouldPlaySound(cfg[eventType])) {
        playTone(eventType === 'message' ? 'team' : 'default')
      }
    },
    [t],
  )

  // Countdown timer effect — ticks down and auto-sends fix message
  useEffect(() => {
    if (autoFixIntervalRef.current) {
      clearInterval(autoFixIntervalRef.current)
      autoFixIntervalRef.current = null
    }
    if (!autoFixCountdown || autoFixCountdown.paused || autoFixCountdown.secondsLeft <= 0) return

    autoFixIntervalRef.current = setInterval(() => {
      setAutoFixCountdown((prev) => {
        if (!prev || prev.paused) return prev
        if (prev.secondsLeft <= 1) {
          // Countdown complete — will send in the effect below
          return { ...prev, secondsLeft: 0 }
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 }
      })
    }, 1000)

    return () => {
      if (autoFixIntervalRef.current) {
        clearInterval(autoFixIntervalRef.current)
        autoFixIntervalRef.current = null
      }
    }
  }, [autoFixCountdown?.paused, autoFixCountdown?.secondsLeft])

  // When countdown reaches 0, send the fix message
  const sendMessageRef = useRef<
    (
      msg: string,
      attachments?: undefined,
      options?: { suppressUserMessage?: boolean; automatic?: boolean; askUserAnswer?: boolean },
    ) => void
  >(() => {})
  useEffect(() => {
    if (autoFixCountdown && autoFixCountdown.secondsLeft === 0 && !autoFixCountdown.paused) {
      // Defense-in-depth: arming is sender-only (a viewer never owns a stream),
      // but an autonomous agent-turn dispatch must never fire from a read-only
      // client regardless of how the countdown came to exist.
      if (canEdit === false) {
        setAutoFixCountdown(null)
        return
      }
      const msg = `Fix these issues:\n\n${autoFixCountdown.output}`
      setAutoFixCountdown(null)
      // Auto-sent on the user's behalf — flag it so the chat renders it in the
      // distinct auto-sent style (agent avatar + green border), not as if the
      // user typed it (C2).
      sendMessageRef.current(msg, undefined, { automatic: true })
    }
  }, [autoFixCountdown, canEdit])

  // Auto-pause countdown when user starts typing
  const handleAutoFixPauseOnInput = useCallback(() => {
    setAutoFixCountdown((prev) => (prev && !prev.paused ? { ...prev, paused: true } : prev))
  }, [])

  // Cancel countdown when file changes arrive (AI likely fixing things in a new turn)
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
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit
  const autoCommitPersistedRef = useRef<number>(0)
  const autoCommitPatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set after debouncedFetchPendingFiles is defined below (it depends on state
  // declared later); lets the file-change callback refresh the uncommitted-files
  // bar LIVE while a turn is still streaming.
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
        if (isRelevant) setAutoFixCountdown(null)
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

  // Keep sendMessageRef in sync so the countdown effect can call the latest sendMessage
  sendMessageRef.current = sendMessage

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
    pendingVerificationRef.current = null
    setAutoFixCountdown(null)
    abort()
  }, [abort])

  // Surface the chat's loading state to the host (the authoritative "agent is actively
  // building" signal). The host drives the preview's "Building your app…" overlay from this,
  // so a half-built / blank preview during a long build shows progress, not a white screen.
  useEffect(() => {
    onLoadingChangeRef.current?.(isLoading)
  }, [isLoading])

  // Ref-stable callback for ToolCallCard's onAskUserResponse — avoids breaking
  // React.memo when sendMessage's identity changes (provider/endpoint deps).
  // Suppress the optimistic user bubble: the answer is reflected in the ask_user
  // card itself (a checkmark on the chosen option, or the custom text shown
  // in-card) rather than echoed as a separate message below it.
  const handleAskUserResponse = useCallback((response: string) => {
    // `askUserAnswer` resolves the pending ask_user card in the store (sets its output to
    // the answer) so the chosen option STAYS checked across the discovery→IDE remount —
    // the live selection used to live only in ephemeral component state and vanished.
    sendMessageRef.current(response, undefined, {
      suppressUserMessage: true,
      askUserAnswer: true,
    })
  }, [])

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
  /** Number of timeline items rendered in the DOM. Increases when user clicks "Show earlier". */
  const [maxVisibleItems, setMaxVisibleItems] = useState(60)

  // ── Undo tracking ───────────────────────────────────────────────────────────
  // Tracks which tool calls are currently in the "undone" state so /undo can
  // flip them in bulk and individual undo buttons stay in sync.
  // Initialized from persisted isUndone flags on loaded messages.
  const [undoneTcIds, setUndoneTcIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.isUndone) ids.add(tc.id)
        }
      }
    }
    return ids
  })

  // Re-sync when messages load from history (e.g. after page refresh)
  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    // Only re-sync on bulk message loads (history), not on individual stream appends
    if (messages.length > 0 && prevMessageCountRef.current === 0) {
      const ids = new Set<string>()
      for (const msg of messages) {
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            if (tc.isUndone) ids.add(tc.id)
          }
        }
      }
      if (ids.size > 0) setUndoneTcIds(ids)
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  /** Persist undo state to the server and update local tracking. */
  const persistUndoToggle = useCallback(
    (toolCallIds: string[], undone: boolean) => {
      http.post(`/projects/${projectId}/tool-call-undo`, { toolCallIds, undone }).catch(() => {
        // Non-critical — undo state won't survive refresh but still works in-session
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

  // ── Input ──────────────────────────────────────────────────────────────────
  // The textarea is uncontrolled to avoid re-rendering the entire ChatInner on
  // every keystroke.  `inputRef` holds the current value; `hasInput` is a
  // boolean state used only by the submit button's disabled prop.
  const draftKey = `mol-chat-draft:${projectId}`
  const inputRef = useRef<string>(
    (() => {
      // Seed from an explicit initial value (prompt→chat morph) first, else the
      // persisted draft.
      if (initialInputValue) return initialInputValue
      try {
        return sessionStorage.getItem(draftKey) ?? ''
      } catch (_error) {
        // sessionStorage unavailable (e.g. private browsing restrictions) — fall back to empty
        return ''
      }
    })(),
  )
  const [hasInput, setHasInput] = useState(() => Boolean(inputRef.current))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /** Auto-resize the textarea to fit its content (max 200px). */
  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [])

  // Seed the textarea with the draft value on mount
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
    [draftKey, autoResize, canEdit],
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

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const speechCtorRef = useRef(
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ??
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : undefined,
  )
  const hasSpeechRecognition = Boolean(speechCtorRef.current)
  type SpeechRec = {
    start(): void
    stop(): void
    abort(): void
    onstart: (() => void) | null
    onresult: ((e: unknown) => void) | null
    onend: (() => void) | null
    onerror: ((e: unknown) => void) | null
    continuous: boolean
    interimResults: boolean
    lang: string
  }
  const recognitionRef = useRef<SpeechRec | null>(null)
  const [isListening, setIsListening] = useState(false)
  // The mic button NEVER hides — when dictation can't work (e.g. Brave's
  // Web Speech stub with nothing wired to fall back to), clicking it shows
  // the reason via voiceError instead of the button silently vanishing.
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const voiceErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceIntentRef = useRef(false)
  const voiceRestartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Detects the dead-service case where start() succeeds but no event ever fires
  const voiceWatchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Count rapid consecutive failures to bail out of restart loops
  const voiceFailCount = useRef(0)
  const voiceLastStart = useRef(0)

  // ── Local (on-device) dictation fallback via the ai-voice bond ────────────
  // When the browser's Web Speech API is missing or proven dead, dictation
  // falls back to a bonded AIVoiceProvider (e.g. `@molecule/app-ai-voice-whisper`,
  // which runs Whisper on-device). Wire one at app startup with setProvider().
  // Availability is NOT snapshotted at mount — `startLocalVoice()` re-checks
  // `getVoiceProvider()?.isRecognitionSupported()` at the moment of use, so a
  // provider bonded (or a model loaded) after mount still works.
  // Once true, all dictation goes through the bonded provider.
  const useLocalVoiceRef = useRef(false)
  // Web Speech proven dead earlier this tab-session — skip its 5s watchdog.
  const webSpeechDeadRef = useRef(false)
  const WEB_SPEECH_DEAD_KEY = 'molecule.ide.webSpeechDead'
  useEffect(() => {
    try {
      webSpeechDeadRef.current = sessionStorage.getItem(WEB_SPEECH_DEAD_KEY) === '1'
    } catch (_error) {
      // sessionStorage unavailable — the watchdog re-detects within one session
    }
  }, [])
  // Secondary (non-error) notice: "preparing dictation" while the model loads
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null)
  // Set on submit so a trailing transcript from the provider is not inserted
  // into the freshly-cleared composer.
  const voiceDiscardRef = useRef(false)

  // ── Dictation engine picker (/mic) ─────────────────────────────────────────
  // When the app registers a voice-engine catalog, the USER chooses which
  // engine to use (and download) — on the first mic click, or anytime via
  // /mic. Without a catalog the legacy automatic behavior stands.
  const [voiceEngines] = useState<readonly VoiceEngineDef[]>(() => listVoiceEngines())
  const voiceEngineRef = useRef<VoiceEngineDef | null>(null)
  // autoStart: opened from a mic click (start dictating right after choosing)
  // vs from /mic (just a settings change).
  const [micPicker, setMicPicker] = useState<{ autoStart: boolean } | null>(null)
  const MIC_ENGINE_KEY = 'molecule.ide.voiceEngine'
  useEffect(() => {
    if (voiceEngines.length === 0) return
    try {
      const savedId = localStorage.getItem(MIC_ENGINE_KEY)
      if (savedId) {
        const def = selectVoiceEngine(savedId)
        if (def) voiceEngineRef.current = def
      }
    } catch (_error) {
      // localStorage unavailable — the picker simply reopens on first use
    }
  }, [voiceEngines])

  /**
   * Why an engine can't be used here, or null when it can: 'browser' = the
   * native speech service is missing/proven dead in this browser; 'language'
   * = the engine doesn't cover the UI language.
   */
  const voiceEngineDisabledReason = useCallback(
    (def: VoiceEngineDef): 'browser' | 'language' | null => {
      if (def.kind === 'native' && (!hasSpeechRecognition || webSpeechDeadRef.current)) {
        return 'browser'
      }
      if (!voiceEngineCoversLanguage(def, navigator.language || 'en-US')) return 'language'
      return null
    },
    [hasSpeechRecognition],
  )

  const showVoiceError = useCallback((message: string) => {
    setVoiceError(message)
    if (voiceErrorTimer.current) clearTimeout(voiceErrorTimer.current)
    voiceErrorTimer.current = setTimeout(() => {
      voiceErrorTimer.current = null
      setVoiceError(null)
    }, 8000)
  }, [])

  /**
   * Starts dictation through the bonded on-device provider. Returns false when
   * no usable provider is wired, so the caller can fall through to the
   * "dictation unavailable" path.
   */
  const startLocalVoice = useCallback((): boolean => {
    const localVoice = getVoiceProvider()
    if (!localVoice || !localVoice.isRecognitionSupported()) return false
    useLocalVoiceRef.current = true
    // Shown until the provider reaches 'listening' (model may need a download)
    setVoiceNotice(
      t('ide.chat.voicePreparing', undefined, {
        defaultValue: 'Preparing dictation — this can take a moment on first use.',
      }),
    )
    localVoice.startListening(
      {
        language: navigator.language || 'en-US',
        continuous: true,
        interimResults: false,
      },
      {
        onTranscript: (event) => {
          if (voiceDiscardRef.current || !event.isFinal || !event.transcript) return
          const prev = inputRef.current as string
          setInputValue(prev ? `${prev} ${event.transcript}` : event.transcript)
          autoResize()
        },
        onStateChange: (state) => {
          if (state === 'listening') setVoiceNotice(null)
        },
        onError: (event) => {
          if (event.code === 'not-allowed') {
            voiceIntentRef.current = false
            setIsListening(false)
            setVoiceNotice(null)
            showVoiceError(
              t('ide.chat.voiceMicBlocked', undefined, {
                defaultValue: 'Microphone access is blocked.',
              }),
            )
            return
          }
          if (event.code === 'transcription-failed') {
            // One chunk failed; the session keeps listening
            showVoiceError(
              t('ide.chat.voiceTranscribeFailed', undefined, {
                defaultValue: 'Transcription failed.',
              }),
            )
            return
          }
          // not-supported / start-failed — the fallback itself is unusable
          voiceIntentRef.current = false
          setIsListening(false)
          setVoiceNotice(null)
          showVoiceError(
            t('ide.chat.voiceUnavailable', undefined, {
              defaultValue: 'Dictation is not available in this browser.',
            }),
          )
        },
      },
    )
    return true
  }, [setInputValue, autoResize, showVoiceError])

  const startRecognition = useCallback(() => {
    const Ctor = speechCtorRef.current as (new () => SpeechRec) | undefined
    if (!Ctor || !voiceIntentRef.current) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    let gotResult = false

    const clearWatchdog = (): void => {
      if (voiceWatchdogTimer.current) {
        clearTimeout(voiceWatchdogTimer.current)
        voiceWatchdogTimer.current = null
      }
    }

    // The Web Speech service itself is broken (not just this session): stop
    // retrying it for good — instead of flicker-restarting forever. If an
    // on-device provider is bonded, hand the same gesture over to it
    // seamlessly; otherwise turn the button off and say so.
    const giveUp = (): void => {
      clearWatchdog()
      voiceFailCount.current = 0
      recognitionRef.current = null
      webSpeechDeadRef.current = true
      try {
        sessionStorage.setItem(WEB_SPEECH_DEAD_KEY, '1')
      } catch (_error) {
        // sessionStorage unavailable — the watchdog re-detects next time
      }
      try {
        recognition.abort()
      } catch (_error) {
        // abort() on a never-started/already-ended session throws harmlessly
      }
      // With an engine catalog, the native engine just proved dead: clear the
      // user's (native) choice and reopen the picker so THEY pick a fallback —
      // the native row now shows as disabled with the reason.
      if (voiceEngines.length > 0) {
        voiceEngineRef.current = null
        try {
          localStorage.removeItem(MIC_ENGINE_KEY)
        } catch (_error) {
          // localStorage unavailable — the stale choice re-fails harmlessly
        }
        voiceIntentRef.current = false
        setIsListening(false)
        setCommandMenu(null)
        setModelPicker(null)
        setEffortPicker(null)
        setSoundsPicker(null)
        setFilePicker(null)
        setPanelOverlay(null)
        setMicPicker({ autoStart: true })
        return
      }
      if (voiceIntentRef.current && startLocalVoice()) {
        return
      }
      voiceIntentRef.current = false
      setIsListening(false)
      showVoiceError(
        t('ide.chat.voiceUnavailable', undefined, {
          defaultValue: 'Dictation is not available in this browser.',
        }),
      )
    }

    recognition.onstart = () => {
      clearWatchdog()
    }

    recognition.onresult = (e: unknown) => {
      gotResult = true
      voiceFailCount.current = 0
      const event = e as {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
        resultIndex: number
      }
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        const prev = inputRef.current as string
        setInputValue(prev ? `${prev} ${transcript}` : transcript)
        autoResize()
      }
    }

    recognition.onend = () => {
      clearWatchdog()
      recognitionRef.current = null
      if (!voiceIntentRef.current) {
        setIsListening(false)
        return
      }
      // If we got results, the session was healthy — restart immediately
      if (gotResult) {
        voiceFailCount.current = 0
        startRecognition()
        return
      }
      // No results — could be a rapid failure loop. Track it.
      const elapsed = Date.now() - voiceLastStart.current
      if (elapsed < 1000) {
        voiceFailCount.current++
      } else {
        voiceFailCount.current = 0
      }
      // Too many rapid no-result failures — the service is not working
      if (voiceFailCount.current >= 3) {
        giveUp()
        return
      }
      // Restart after a short delay so we don't spin
      voiceRestartTimer.current = setTimeout(() => {
        voiceRestartTimer.current = null
        if (voiceIntentRef.current) startRecognition()
      }, 300)
    }

    recognition.onerror = (e: unknown) => {
      const error = (e as { error?: string }).error
      // In the Chromium family a 'network' error means the browser has no
      // reachable speech backend (Brave, ungoogled builds) — it will fail
      // identically every session, so retrying just flickers.
      if (error === 'network' || error === 'language-not-supported') {
        giveUp()
        return
      }
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        clearWatchdog()
        voiceIntentRef.current = false
        recognitionRef.current = null
        setIsListening(false)
        showVoiceError(
          t('ide.chat.voiceMicBlocked', undefined, {
            defaultValue: 'Microphone access is blocked.',
          }),
        )
      }
      // Other errors (no-speech, audio-capture, aborted) — onend will handle restart
    }

    recognitionRef.current = recognition
    voiceLastStart.current = Date.now()
    try {
      recognition.start()
    } catch (_error) {
      // start() throws InvalidStateError if a previous session is still tearing
      // down — treat it like any other dead session rather than crash the click
      giveUp()
      return
    }
    // Watchdog: some broken implementations accept start() and then never fire a
    // single event (verified in Brave: no onstart, no onerror, no onend).
    voiceWatchdogTimer.current = setTimeout(() => {
      voiceWatchdogTimer.current = null
      giveUp()
    }, 5000)
  }, [setInputValue, autoResize, showVoiceError, startLocalVoice, voiceEngines])

  /** Begins a dictation session on whatever engine/path is active. */
  const beginDictation = useCallback(() => {
    voiceIntentRef.current = true
    voiceDiscardRef.current = false
    voiceFailCount.current = 0
    setVoiceError(null)
    if (voiceErrorTimer.current) {
      clearTimeout(voiceErrorTimer.current)
      voiceErrorTimer.current = null
    }
    setIsListening(true)
    handleAutoFixPauseOnInput()
    if (voiceEngines.length > 0) {
      // Catalog mode: the chosen engine decides the path
      if (voiceEngineRef.current?.kind === 'native') {
        startRecognition()
      } else {
        useLocalVoiceRef.current = true
        if (!startLocalVoice()) {
          voiceIntentRef.current = false
          setIsListening(false)
          showVoiceError(
            t('ide.chat.voiceUnavailable', undefined, {
              defaultValue: 'Dictation is not available in this browser.',
            }),
          )
        }
      }
      return
    }
    // Legacy (no catalog): Web Speech first, on-device fallback automatic
    if (!hasSpeechRecognition || webSpeechDeadRef.current || useLocalVoiceRef.current) {
      if (startLocalVoice()) return
      voiceIntentRef.current = false
      setIsListening(false)
      showVoiceError(
        t('ide.chat.voiceUnavailable', undefined, {
          defaultValue: 'Dictation is not available in this browser.',
        }),
      )
      return
    }
    startRecognition()
  }, [startRecognition, startLocalVoice, hasSpeechRecognition, showVoiceError, voiceEngines])

  /**
   * Applies a picker choice: wires the engine, persists it, and (for a
   * mic-click-initiated pick) starts dictating immediately.
   */
  const chooseVoiceEngine = useCallback(
    (def: VoiceEngineDef, autoStart: boolean) => {
      setMicPicker(null)
      const selected = selectVoiceEngine(def.id)
      if (!selected) return
      voiceEngineRef.current = selected
      useLocalVoiceRef.current = selected.kind !== 'native'
      try {
        localStorage.setItem(MIC_ENGINE_KEY, selected.id)
      } catch (_error) {
        // localStorage unavailable — the picker reopens next session
      }
      if (autoStart) beginDictation()
    },
    [beginDictation],
  )

  const toggleVoice = useCallback(() => {
    if (isListening) {
      voiceIntentRef.current = false
      if (voiceRestartTimer.current) {
        clearTimeout(voiceRestartTimer.current)
        voiceRestartTimer.current = null
      }
      if (voiceWatchdogTimer.current) {
        clearTimeout(voiceWatchdogTimer.current)
        voiceWatchdogTimer.current = null
      }
      // Don't wait for onend — a hung session (dead service) never fires it
      setIsListening(false)
      setVoiceNotice(null)
      if (useLocalVoiceRef.current) {
        // On-device provider: trailing speech is still transcribed + inserted
        getVoiceProvider()?.stopListening()
      } else {
        recognitionRef.current?.stop()
      }
      return
    }
    // With an engine catalog and no choice made yet, the first mic click asks
    // the user which engine to use (and download) instead of picking for them.
    if (voiceEngines.length > 0 && !voiceEngineRef.current) {
      // Popups are one-at-a-time — close any sibling before opening the picker
      setCommandMenu(null)
      setModelPicker(null)
      setEffortPicker(null)
      setSoundsPicker(null)
      setFilePicker(null)
      setPanelOverlay(null)
      setMicPicker({ autoStart: true })
      return
    }
    beginDictation()
  }, [isListening, beginDictation, voiceEngines])

  // Stop recognition on unmount
  useEffect(
    () => () => {
      voiceIntentRef.current = false
      if (voiceRestartTimer.current) {
        clearTimeout(voiceRestartTimer.current)
        voiceRestartTimer.current = null
      }
      if (voiceWatchdogTimer.current) {
        clearTimeout(voiceWatchdogTimer.current)
        voiceWatchdogTimer.current = null
      }
      if (voiceErrorTimer.current) {
        clearTimeout(voiceErrorTimer.current)
        voiceErrorTimer.current = null
      }
      recognitionRef.current?.abort()
      if (useLocalVoiceRef.current) {
        // stopListening, not dispose — the bonded provider is an app-wide
        // singleton other consumers may use after this panel unmounts
        voiceDiscardRef.current = true
        getVoiceProvider()?.stopListening()
      }
    },
    [],
  )

  // ── File picker ────────────────────────────────────────────────────────────
  const [filePicker, setFilePicker] = useState<FilePicker | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  // ── Command menu ───────────────────────────────────────────────────────────
  const [commandMenu, setCommandMenu] = useState<CommandMenu | null>(null)

  // ── Model picker (shown when typing /model <filter>) ──────────────────────
  const [modelPicker, setModelPicker] = useState<ModelPicker | null>(null)
  const [effortPicker, setEffortPicker] = useState<EffortPicker | null>(null)

  // ── System cards (persistent inline notifications in chat history) ────────
  const [systemCards, setSystemCards] = useState<SystemCard[]>([])
  // Bug-report modal — `{ title }` (seed) when open, null when closed. Opened by
  // the /report and /bug commands and the header bug-report button.
  const [reportModal, setReportModal] = useState<{ title: string } | null>(null)
  // Share-link modal — `{ role }` (seed) when open, null when closed. Opened by
  // the /share command and the header share button.
  const [shareModal, setShareModal] = useState<{ role: ShareRole } | null>(null)
  // Keep a ref to the latest messages so addSystemCard can read them
  // without adding messages to its dependency array (avoids re-creation on
  // every streaming chunk).
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  // True only while applying a teammate's broadcast through handleStreamEvent (see
  // applyPushedStreamEvent). addActivityCard reads it to mark a pushed activity card
  // `received` so this viewer renders but never re-persists it (activity cards keep their
  // own persisted store). Transcript cards (model/mode/skills/custom) are server-recorded
  // card-messages: a pushed one is appended ephemerally (never persisted by the client), so
  // it needs no `received` flag.
  const applyingPushedRef = useRef(false)
  // addSystemCard now serves ONLY this session's LOCAL command cards — the `/help`,
  // `/settings`, `/scripts` browsers and command output (all `clientOnly`). These are
  // ephemeral chrome: never persisted, never broadcast. The server-driven transcript notices
  // (model / mode / skills / custom) no longer come through here — they are card-messages in
  // the ONE transcript (recordCard → cardEventToSystemCard). The `received` + timestamp-dedup
  // paths below are inert for local cards (they carry no server timestamp and never broadcast)
  // but kept harmless for any caller that does pass a server timestamp.
  const addSystemCard = useCallback((text: string, opts: AddSystemCardOptions = {}) => {
    // Split off `timestamp` (handled below) and spread the rest of the variant's own
    // fields verbatim — no field-by-field copy, so this never drifts from the union.
    const { timestamp, ...rest } = opts
    // Capture the pushed-event flag NOW, synchronously while this call runs inside
    // applyPushedStreamEvent (the ref is true only for that window). It must NOT be read
    // inside the setState updater below: React invokes that updater during reconciliation,
    // after applyPushedStreamEvent's `finally` has already reset the ref — which would
    // leave a teammate's card unflagged and let this viewer wrongly persist it.
    const received = applyingPushedRef.current || undefined
    // Cards land chronologically — wherever/whenever they occur. A card emitted during
    // a turn's preamble still sorts ABOVE the streamed response: the response message is
    // stamped at its server `message_start` (iteration top — AFTER these preamble
    // events), and while still empty it sorts last anyway (see timelineSortKey). Pass an
    // explicit `timestamp` (a SERVER ms from the originating event, e.g. mode/model) so
    // the card shares the messages' clock and the order can't skew on a mis-set client
    // clock; otherwise fall back to the client clock. (A queued USER message that waits
    // for the active stream is a separate mechanism, not this.)
    const ts = timestamp ?? Date.now()
    setSystemCards((prev) => {
      // De-dupe a SERVER-stamped card by its unique, monotonic server timestamp: a client
      // that receives its OWN broadcast echo (e.g. a second tab of the same user viewing the
      // project) must not double-add a card it already has from its SSE stream — in either
      // arrival order. Client-stamped cards (no server `timestamp` — a /help, a tip) are
      // NEVER de-duped this way, since their Date.now() could coincide with a server ms.
      if (timestamp !== undefined && prev.some((c) => c.timestamp === ts)) return prev
      return [...prev, { id: crypto.randomUUID(), text, timestamp: ts, ...rest, received }]
    })
    // Auto-scroll after the card renders so the user sees it immediately
    if (!userScrolledUpRef.current) {
      setTimeout(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [])

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
  useEffect(() => {
    onRegisterPushHandler?.(applyPushedStreamEvent)
    return () => onRegisterPushHandler?.(null)
  }, [onRegisterPushHandler, applyPushedStreamEvent])

  // Register the history reconcile with the parent so it can converge this
  // panel on the persisted transcript whenever its push channel (re)connects —
  // a broadcast sent while that socket was down (a teammate's team note against
  // a backgrounded tab or a slept laptop) is otherwise lost until a page
  // lifecycle event happens to fire.
  useEffect(() => {
    onRegisterHistoryReconcile?.(reconcileHistory)
    return () => onRegisterHistoryReconcile?.(null)
  }, [onRegisterHistoryReconcile, reconcileHistory])

  // Inject the user-message accent-stripe styles once (the gradient `::before` + its
  // keyframe can't live inline; gated on the row's data-mol-id, so no other row is
  // touched). Guarded by id so it injects a single time across the app.
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

  // ── Activity cards (captured outbound side effects) ───────────────────────
  const [activityCards, setActivityCards] = useState<ActivityCardEntry[]>([])
  const addActivityCard = useCallback((activity: Activity) => {
    // Captured synchronously here (NOT inside the setState updater, which React invokes
    // during reconciliation after applyPushedStreamEvent has reset the ref) so a pushed
    // card is reliably flagged received and excluded from this viewer's persist PUT.
    const received = applyingPushedRef.current || undefined
    // Place just before an actively-streaming message so the card isn't pinned
    // below the growing response (same heuristic as addSystemCard).
    let ts = new Date(activity.timestamp).getTime()
    if (Number.isNaN(ts)) ts = Date.now()
    const streaming = messagesRef.current.find((m) => m.isStreaming)
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
  }, [])
  addActivityCardRef.current = addActivityCard

  // Persist + restore the inline activity cards on the conversation (mirrors systemCards) so
  // the captured side effects the user saw live reappear on reload — live === stored. The
  // entries are fully serializable (id + activity data + timestamp), so unlike systemCards
  // there is no in-session callback to strip.
  const activityCardsLoadedConvRef = useRef<string | null>(null)
  const prevActivityCardsConvRef = useRef<string | null>(null)
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
  const dismissTip = useCallback((id: string) => {
    setTipCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // Reset tips when switching to a *different* existing conversation. The null→id
  // transition (a brand-new conversation getting its server id) is NOT a switch.
  const prevConvIdRef = useRef<string | null>(conversationId)
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
  useEffect(() => {
    if (entryTipShownRef.current) return
    // No onboarding tip during the initial discovery phase (mvp B1) — discovery is
    // its own guided Q&A; a blue tip there is noise.
    if (discovery) return
    if (conversationId != null || messages.length > 0) return
    entryTipShownRef.current = true
    shownTipIdsRef.current = [...shownTipIdsRef.current, ENTRY_TIP.id]
    const text = t(`ide.chat.tip.${ENTRY_TIP.id}`, { agentName }, { defaultValue: ENTRY_TIP.text })
    setTipCards((prev) => [...prev, { id: crypto.randomUUID(), text, timestamp: Date.now() }])
  }, [conversationId, messages.length, agentName, discovery])

  // Viewer orientation tip: a read-only member's explainer — GOLD like the
  // team-only messages and led by the same `people` icon it explains, so the
  // badge on a team note is self-describing. A regular dismissable tip (never a
  // permanent composer note); shown once per panel mount, skipped in discovery
  // like the other tips (mvp B1). Gated on an EXPLICIT canEdit === false so
  // hosts that don't do roles never see it.
  const viewerTipShownRef = useRef(false)
  useEffect(() => {
    if (canEdit !== false || discovery || viewerTipShownRef.current) return
    viewerTipShownRef.current = true
    const text = t(
      'ide.chat.tip.viewerTeamOnly',
      { agentName },
      {
        defaultValue:
          'View-only access — read along and /teamsay (or just /t) the team. This gold icon marks team-only messages ({{agentName}} ignores them). Running the assistant and changing the model or settings need editor access.',
      },
    )
    setTipCards((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        timestamp: Date.now(),
        accent: NOTICE_TONE.gold.accent,
        icon: 'people',
      },
    ])
  }, [canEdit, discovery, agentName])

  // Surface an occasional idle tip. This effect re-runs on every message change, so
  // the idle timer is continually reset by activity; it only fires once the
  // conversation has been quiet for TIP_IDLE_MS — and even then only when the
  // cooldown + random roll allow, and never before TIP_MIN_MESSAGES (so never on the
  // first prompt). Skipped entirely while a message is streaming.
  useEffect(() => {
    // No idle tips during the initial discovery phase (mvp B1).
    if (discovery) return
    if (messages.some((m) => m.isStreaming) || messages.length < TIP_MIN_MESSAGES) return
    const armedAt = Date.now()
    const timer = setTimeout(() => {
      const show = shouldShowIdleTip(
        {
          messageCount: messagesRef.current.length,
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
      const text = t(`ide.chat.tip.${tip.id}`, { agentName }, { defaultValue: tip.text })
      setTipCards((prev) => [...prev, { id: crypto.randomUUID(), text, timestamp: Date.now() }])
    }, TIP_IDLE_MS)
    return () => clearTimeout(timer)
  }, [messages, discovery])

  // ── Sounds picker (shown when /sounds is executed) ────────────────────────
  const [soundsPicker, setSoundsPicker] = useState<SoundsPicker | null>(null)
  // Notification sounds are a PER-DEVICE, per-user preference — localStorage,
  // never project settings. They used to persist via PATCH /projects settings
  // (shared with every member, and unreachable for read-only viewers, whose
  // PATCH 403s); the old project-level value is still read once as a migration
  // fallback when this device has no local preference yet.
  const [soundsConfig, setSoundsConfig] = useState<SoundsConfig>(() => {
    try {
      const raw = localStorage.getItem(SOUNDS_STORAGE_KEY)
      if (raw) return { ...DEFAULT_SOUNDS_CONFIG, ...(JSON.parse(raw) as Partial<SoundsConfig>) }
    } catch (_error) {
      // localStorage unavailable / bad JSON — fall through to the defaults.
    }
    return { ...DEFAULT_SOUNDS_CONFIG }
  })
  const soundsLocallySetRef = useRef(false)
  useEffect(() => {
    try {
      soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
    } catch (_error) {
      // localStorage unavailable — treat as unset; the project fallback may apply.
    }
  }, [])

  // ── Panel overlay (/skills, /scripts, /settings — closeable popups) ──────────
  // These three commands open a closeable overlay above the composer (mirrors how
  // /model and /sounds own this popup region) instead of dropping an inline card
  // into the timeline. `panelOverlayQuery` seeds the skills/scripts search from a
  // `/skills <query>` / `/scripts <query>` invocation. Mutually exclusive with the
  // model + sounds pickers — only one popup owns the region at a time.
  const [panelOverlay, setPanelOverlay] = useState<'skills' | 'scripts' | 'settings' | null>(null)
  const [panelOverlayQuery, setPanelOverlayQuery] = useState('')
  const openPanelOverlay = useCallback(
    (variant: 'skills' | 'scripts' | 'settings', query = ''): void => {
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

  // Keep ref in sync so the streaming callback always sees latest config
  useEffect(() => {
    soundsConfigRef.current = soundsConfig
  }, [soundsConfig])

  /** Cycle a single sound event's mode and persist to project settings. */
  const cycleSoundMode = useCallback(
    async (eventType: SoundEventType | 'all') => {
      let updated: SoundsConfig
      if (eventType === 'all') {
        const current = soundsConfig[SOUND_EVENTS[0]]
        const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length
        const next = SOUND_MODES[nextIdx]
        updated = Object.fromEntries(SOUND_EVENTS.map((e) => [e, next])) as SoundsConfig
      } else {
        const current = soundsConfig[eventType]
        const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length
        const next = SOUND_MODES[nextIdx]
        updated = { ...soundsConfig, [eventType]: next }
      }
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
  const [currentModel, setCurrentModel] = useState<string>('')
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
  useEffect(() => {
    if (!currentModel && DEFAULT_MODEL) {
      setCurrentModel(DEFAULT_MODEL)
    }
  }, [currentModel, DEFAULT_MODEL])

  // The model a conversation mode will ACTUALLY use, for every display surface
  // (picker pill, /model suffix, settings rows, fast-mode gating). Mirrors the
  // server's selection chain: per-mode setting → SAVED chatModel → the
  // server-sent per-mode default (owner account settings + tier already folded
  // in) → the catalog clamp.
  const effectiveModelForMode = (m: 'plan' | 'execute'): string =>
    effectiveModeModelId(
      m,
      { planModel, executeModel, chatModel: savedChatModel },
      serverModelDefaults,
      isFreeTier,
      AVAILABLE_MODELS,
      FREE_TIER_MODEL,
    )
  useEffect(() => {
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        if (typeof s?.chatModel === 'string') {
          setCurrentModel(s.chatModel)
          setSavedChatModel(s.chatModel)
        }
        if (typeof s?.planModel === 'string') setPlanModel(s.planModel)
        if (typeof s?.executeModel === 'string') setExecuteModel(s.executeModel)
        if (typeof s?.commitModel === 'string') setCommitModel(s.commitModel)
        if (typeof s?.compactModel === 'string') setCompactModel(s.compactModel)
        // The persisted value is the model's own native level — accept any
        // non-empty string; it's resolved against the active model at use time.
        if (typeof s?.effortLevel === 'string' && s.effortLevel) {
          setEffortLevel(s.effortLevel)
        }
        // Per-mode effort map — accept each string entry (untrusted JSON bag).
        if (
          s?.effortByMode &&
          typeof s.effortByMode === 'object' &&
          !Array.isArray(s.effortByMode)
        ) {
          const next: Partial<Record<EffortMode, EffortLevel>> = {}
          for (const m of ['plan', 'execute'] as const) {
            const raw = (s.effortByMode as Record<string, unknown>)[m]
            if (typeof raw === 'string' && raw) next[m] = raw
          }
          setEffortByMode(next)
        }
        // Per-model processing region map — accept each known-region entry
        // (untrusted JSON bag), mirroring effortByMode above.
        if (
          s?.modelRegions &&
          typeof s.modelRegions === 'object' &&
          !Array.isArray(s.modelRegions)
        ) {
          const nextRegions: Record<string, ModelRegion> = {}
          for (const [id, raw] of Object.entries(s.modelRegions as Record<string, unknown>)) {
            if (typeof raw === 'string' && raw in MODEL_REGION_META) nextRegions[id] = raw
          }
          setModelRegions(nextRegions)
        }
        // Persisted per-project default-loaded skills (P2-06/P2-08).
        const savedDefaultSkills = s?.defaultSkills
        if (Array.isArray(savedDefaultSkills)) {
          // An explicit saved set wins over the "all initial skills" default (P3-11).
          defaultSkillsExplicitRef.current = true
          setDefaultSkillPaths(
            new Set(savedDefaultSkills.filter((p): p is string => typeof p === 'string')),
          )
        }
        // (The "Loaded {{count}} skills" announce marker is now read + maintained
        // server-side — see the skills_loaded emit in chat-handler — so the client no
        // longer hydrates it here.)
        if (typeof s?.maxToolLoops === 'number') setCurrentMaxLoops(s.maxToolLoops)
        if (typeof s?.autoFix === 'boolean') setAutoFixEnabled(s.autoFix)
        if (typeof s?.autoApproveCommands === 'boolean') {
          setAutoApproveCommandsEnabled(s.autoApproveCommands)
        }
        // Legacy migration only: sounds are per-device (localStorage) now — apply
        // the old project-level value only when this device has no local pref.
        if (s?.sounds && typeof s.sounds === 'object' && !soundsLocallySetRef.current) {
          setSoundsConfig((prev) => ({ ...prev, ...(s.sounds as Partial<SoundsConfig>) }))
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
        if (savedAutoCommit > 0 && canEditRef.current !== false) {
          dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
        }
        setAutoCommitLoaded(true)
      })
      .catch(() => {
        // Settings load failed: leave auto-commit off for this session — we
        // can't know whether the user explicitly disabled it, and committing
        // against an explicit off is worse than skipping the default-on. A
        // later explicit /autocommit still persists (we never silently lose a
        // user choice).
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
  useEffect(() => {
    if (!modelSelectionSignal) return
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        if (typeof s?.chatModel === 'string') {
          setCurrentModel(s.chatModel)
          setSavedChatModel(s.chatModel)
        }
        if (typeof s?.planModel === 'string') setPlanModel(s.planModel)
        if (typeof s?.executeModel === 'string') setExecuteModel(s.executeModel)
        if (typeof s?.commitModel === 'string') setCommitModel(s.commitModel)
        if (typeof s?.compactModel === 'string') setCompactModel(s.compactModel)
        if (typeof s?.effortLevel === 'string' && s.effortLevel) setEffortLevel(s.effortLevel)
        if (
          s?.effortByMode &&
          typeof s.effortByMode === 'object' &&
          !Array.isArray(s.effortByMode)
        ) {
          const next: Partial<Record<EffortMode, EffortLevel>> = {}
          for (const m of ['plan', 'execute'] as const) {
            const raw = (s.effortByMode as Record<string, unknown>)[m]
            if (typeof raw === 'string' && raw) next[m] = raw
          }
          setEffortByMode(next)
        }
        if (
          s?.modelRegions &&
          typeof s.modelRegions === 'object' &&
          !Array.isArray(s.modelRegions)
        ) {
          const nextRegions: Record<string, ModelRegion> = {}
          for (const [id, raw] of Object.entries(s.modelRegions as Record<string, unknown>)) {
            if (typeof raw === 'string' && raw in MODEL_REGION_META) nextRegions[id] = raw
          }
          setModelRegions(nextRegions)
        }
        if (typeof s?.maxToolLoops === 'number') setCurrentMaxLoops(s.maxToolLoops)
        if (typeof s?.autoFix === 'boolean') setAutoFixEnabled(s.autoFix)
        if (typeof s?.autoApproveCommands === 'boolean') {
          setAutoApproveCommandsEnabled(s.autoApproveCommands)
        }
      })
      .catch(() => {
        // Non-fatal: the change was persisted server-side; this view just won't
        // refresh until the next signal or full settings read.
      })
  }, [modelSelectionSignal, http, projectId])

  // Persist the auto-commit cadence to project.settings (debounced) so it
  // survives a reload/reconnect like every other setting. The reducer is the
  // live source of truth; this mirrors intervalSeconds (0 = off) back to the
  // server whenever the user changes it (/autocommit or the badge's cancel),
  // skipping the value just hydrated on load and gated until that load resolves.
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

  // ── Removed-model recovery ──────────────────────────────────────────────────
  // If the saved chatModel is no longer in the catalog (a provider retired it,
  // or we pruned the entry), notify once and fall back to the free-tier model.
  // Guarded by a ref so re-renders don't keep firing the card / patching the
  // project. Tracks the removed id so a user could in theory hit this twice
  // for two different removed models in the same session.
  const removedModelNotifiedRef = useRef<string | null>(null)
  useEffect(() => {
    if (modelsLoading) return
    if (!currentModel) return
    if (AVAILABLE_MODELS.some((m) => m.id === currentModel)) return
    if (removedModelNotifiedRef.current === currentModel) return
    removedModelNotifiedRef.current = currentModel
    const removedId = currentModel
    // Prefer a still-available model from the SAME custom provider before a
    // platform model: when a BYO provider's model is renamed (custom/<prov>/A →
    // custom/<prov>/B), keep the user on their own endpoint rather than bouncing
    // them to a platform free model.
    const sameProviderPrefix = removedId.match(/^(custom\/[^/]+\/)/)?.[1]
    const sameProviderModel = sameProviderPrefix
      ? AVAILABLE_MODELS.find((m) => m.id.startsWith(sameProviderPrefix))?.id
      : undefined
    const fallback = sameProviderModel || FREE_TIER_MODEL || AVAILABLE_MODELS[0]?.id
    addSystemCard(
      fallback
        ? t(
            'ide.chat.modelRemoved',
            { removed: removedId, fallback },
            {
              defaultValue:
                'Your selected model "{{removed}}" is no longer available. Switched to "{{fallback}}". Type /model to pick another.',
            },
          )
        : t(
            'ide.chat.modelRemovedNoFallback',
            { removed: removedId },
            {
              defaultValue:
                'Your selected model "{{removed}}" is no longer available, and no replacement is bonded on the server. Ask your admin to wire an AI provider.',
            },
          ),
    )
    if (fallback) {
      setCurrentModel(fallback)
      setSavedChatModel(fallback)
      // Persisting the swap writes project settings — editor+ server-side, so a
      // viewer's tab keeps the in-memory switch (all this session needs) and
      // skips a PATCH that could only 403.
      if (canEdit !== false) {
        http.patch(settingsPatchUrl(), { settings: { chatModel: fallback } }).catch(() => {
          /* persistence is best-effort; the in-memory switch is what matters */
        })
      }
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
  ])

  // ── Queued message editing ──────────────────────────────────────────────────
  const [editingQueuedId, setEditingQueuedId] = useState<string | null>(null)
  const [editingQueuedText, setEditingQueuedText] = useState('')

  // ── Input focus ────────────────────────────────────────────────────────────

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const sentInitialRef = useRef<string | null>(null)

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
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = (): void => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // ── Git status ─────────────────────────────────────────────────────────────
  const [gitStatusTick, setGitStatusTick] = useState(0)
  const refreshGitStatus = useCallback(() => setGitStatusTick((n) => n + 1), [])

  const fetchPendingFiles = useCallback(() => {
    http
      .get<{ files: { path: string; status: string; additions?: number; deletions?: number }[] }>(
        `/projects/${projectId}/git-status`,
      )
      .then((res) => setPendingFiles(res.data.files.length > 0 ? res.data.files : null))
      .catch(() => setPendingFiles(null))
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
  debouncedFetchPendingFilesRef.current = debouncedFetchPendingFiles

  // Fetch on turn boundaries and internal refreshGitStatus() calls. Deliberately
  // NOT gated on isLoading: mid-turn updates must go through (the live per-write
  // refresh is the debounced path above; this one settles the final state).
  useEffect(() => {
    fetchPendingFiles()
  }, [isLoading, gitStatusTick, fetchPendingFiles])
  // Fetch when the parent signals a file mutation (edit, rename, delete) —
  // debounced so save+format coalesces into one fetch after the final write.
  useEffect(() => {
    if (!externalGitStatusTick) return
    debouncedFetchPendingFiles()
  }, [externalGitStatusTick, debouncedFetchPendingFiles])

  // A user-side file mutation (edit/rename/delete) also restarts the auto-commit
  // countdown — the parent's externalGitStatusTick is the canonical "files moved"
  // signal. Skipped on the initial 0 so opening a project doesn't arm anything.
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
  useEffect(() => {
    if (!autoCommitArmed || autoCommitHeld) return
    const id = setInterval(() => dispatchAutoCommit({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [autoCommitArmed, autoCommitHeld])

  // Wrap onFileRevert so undo/redo also refreshes git status
  const handleFileRevert = useCallback(
    async (path: string, content: string) => {
      await onFileRevert?.(path, content)
      refreshGitStatus()
    },
    [onFileRevert, refreshGitStatus],
  )

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  // Debounced to batch rapid streaming updates. Uses direct scrollTop assignment
  // instead of scrollIntoView to avoid smooth-scroll animation timing issues
  // (intermediate onScroll events, unpredictable animation duration).
  // Skipped when the user has scrolled up via wheel/touch.
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // ── Auto-send initial message ──────────────────────────────────────────────
  // Skip if a conversation already exists (e.g. page refresh with router state preserved).
  useEffect(() => {
    if (initialMessage && !hasConversation && sentInitialRef.current !== initialMessage) {
      sentInitialRef.current = initialMessage
      // A read-only VIEWER never auto-sends the initial prompt: the host sources
      // it from PROJECT-keyed localStorage, which survives a role demotion and a
      // shared browser — a stale entry would auto-POST an agent turn the server
      // 403s, surfacing a spurious red error on mount. Consume the ref (above)
      // so it is never retried either.
      if (canEdit === false) return
      const sideChannel = matchesSideChannelCommand(
        extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS,
        initialMessage,
      )
      sendMessage(
        initialMessage,
        undefined,
        sideChannel ? { suppressUserMessage: true } : undefined,
      )
      onInitialMessageSent?.()
    }
  }, [initialMessage, hasConversation, sendMessage, onInitialMessageSent, extraCommands, canEdit])

  // ── Auto-send pending message (e.g. "Fix with AI", preview errors) ──────
  // Defers sending while the AI is streaming to avoid queueing up auto-fix
  // messages during active work. Messages are sent once streaming ends.
  const lastPendingKeyRef = useRef(pendingMessageKey)

  // When a new pending message arrives, either send immediately or defer
  useEffect(() => {
    if (
      pendingMessage &&
      pendingMessageKey !== undefined &&
      pendingMessageKey !== lastPendingKeyRef.current
    ) {
      lastPendingKeyRef.current = pendingMessageKey
      // A read-only VIEWER never dispatches platform-composed sends (build
      // kickoffs, auto-fixes, preview-failure reports): the server 403s them
      // and the denial used to surface as a red error in the viewer's chat.
      // Consume the key (above) so the same message isn't retried.
      if (canEdit === false) return
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
    }
  }, [
    pendingMessage,
    pendingMessageKey,
    pendingMessageSuppressUser,
    pendingMessageUserInitiated,
    sendMessage,
    isLoading,
    canEdit,
  ])

  // When streaming ends, send any deferred message. (A user Stop also ends
  // streaming, but handleAbort drops the deferred message first — and useChat's
  // stop guard would drop an autonomous automatic send anyway — so a stopped
  // turn is never auto-resumed by a fix that queued up mid-stream.)
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
      if (canEdit === false) return
      // Same rule as the immediate path: a deferred pending message is system-composed —
      // always `automatic` (suppressed or visible), never a plain user bubble.
      sendMessage(msg, undefined, {
        ...(suppress ? { suppressUserMessage: true } : {}),
        automatic: true,
        ...(userInitiated ? { userInitiated: true } : {}),
      })
    }
  }, [isLoading, sendMessage, canEdit])

  // ── Auto-delete queued autofix messages when user edits a relevant file ────
  const lastUserEditKeyRef = useRef(userEditedFileKey)
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

  // ── Commit ─────────────────────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
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
      }>(`/projects/${projectId}/commit`, {})
      if (result.data.committed) {
        const msg = result.data.message ?? t('ide.chat.committed')
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
        setTimeout(() => setCommitState(null), 3000)
      } else {
        setCommitCards((prev) => prev.filter((c) => c.id !== cardId))
        setCommitState(null)
      }
    } catch (error) {
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
      setTimeout(() => setCommitState(null), 3000)
    }
  }, [http, projectId, onCommit])

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
    [filePicker, mentionStart],
  )

  const removeAttachment = useCallback((key: string) => {
    setAttachedFiles((prev) => {
      const removed = prev.find((f) => (f.path ?? f.filename) === key)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => (f.path ?? f.filename) !== key)
    })
  }, [])

  // "Loaded this session" — the SINGLE source of truth for which skills the user
  // has opened via Load. Shared by BOTH the proactive suggestion (so a skill stops
  // being re-nudged once loaded) and the /skills browser's "Loaded" badge (P2-06).
  const [loadedSkillPaths, setLoadedSkillPaths] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )
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
      addSystemCard(
        t(
          'ide.chat.skills.loaded',
          { name: skill.name },
          { defaultValue: 'Loaded {{name}} skill' },
        ),
        {
          content: [
            t('ide.chat.skills.loadedPrefix', undefined, { defaultValue: 'Loaded ' }),
            {
              label: skill.name,
              code: true,
              onClick: () => onFileOpen?.(skill.path, { focus: true }),
            },
            t('ide.chat.skills.loadedSuffix', undefined, { defaultValue: ' skill' }),
          ],
        },
      )
    },
    [onFileOpen, addSystemCard],
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
    [http, projectId, onFileOpen, addSystemCard],
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
    setDefaultSkillPaths(new Set(projectSkills.map((s) => s.path)))
    http.patch(`/projects/${projectId}`, { settings: { defaultSkills: null } }).catch((error) => {
      // Roll back so the badge/toggle reflect the server.
      logger.warn('Failed to reset default skills on server', { error })
      defaultSkillsExplicitRef.current = previousExplicit
      setDefaultSkillPaths(previous)
    })
  }, [defaultSkillPaths, http, projectId, projectSkills])

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
    [http, projectId, addSystemCard, openPanelOverlay],
  )

  // ── File attachment handlers ──────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFileAttachments = useCallback((files: File[]) => {
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
  }, [])

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

  // ── Input change ───────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      inputRef.current = val
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
        setModelPicker({ selectedIdx: -1, mode: parseModelModeCommand(val)?.mode ?? liveModelMode })
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
          }))
          setCommandMenu(null)
          return
        }
      }
      setEffortPicker(null)

      if (val.startsWith('/') && !val.includes(' ')) {
        setCommandMenu({ selectedIdx: -1 })
      } else {
        setCommandMenu(null)
      }
    },
    [openFilePicker, autoResize, persistDraft, liveModelMode],
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
  // message). Once per mount, and never over text the user already has.
  const viewerPrefillDoneRef = useRef(false)
  useEffect(() => {
    if (canEdit !== false || viewerPrefillDoneRef.current) return
    viewerPrefillDoneRef.current = true
    if (!(inputRef.current as string).trim()) setInputAndCursorEnd('/teamsay ')
  }, [canEdit, setInputAndCursorEnd, conversationId])

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
          setCurrentModel(modelId)
          setSavedChatModel(modelId)
          addSystemCard(
            t(
              'ide.chat.modelSet',
              { name },
              {
                defaultValue: `Chat model set to ${name}`,
              },
            ),
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
    [http, projectId],
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
    [http, projectId, modelRegions],
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
    [http, effortByMode, settingsPatchUrl, addSystemCard],
  )

  // The shared command registry UNION any host-provided commands (e.g.
  // molecule.dev's /deploy, /push, /invite, /teamsay), so the menu, grouping,
  // and dispatch all see one list and host commands never go missing. Declared
  // before executeCommand since it lives in that callback's dependency list.
  const allCommands = useMemo<readonly CommandDef[]>(
    () => (extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS),
    [extraCommands],
  )
  const extraCommandIds = useMemo(
    () => new Set((extraCommands ?? []).map((c) => c.id)),
    [extraCommands],
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
        if (def && !def.viewerSafe) {
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
        setModelPicker({ selectedIdx: -1, mode: liveModelMode })
      } else if (id === 'mic' || id === 'dictate') {
        setInputValue('')
        setMicPicker({ autoStart: false })
      } else if (id === 'maxloops') {
        setInputAndCursorEnd('/maxloops ')
      } else if (id === 'effort') {
        // Open the selectable level picker (mirrors /model) scoped to the live
        // conversation mode; its mode dropdown re-scopes in place.
        setInputValue('')
        setEffortPicker({ selectedIdx: -1, mode: liveModelMode })
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
        // Per-user UI — the /help browser is this client's own command output, never
        // shared conversation context, so it must not persist onto a reload or to other
        // collaborators.
        addSystemCard(buildHelpText({ agentName, productName }), {
          variant: 'help',
          clientOnly: true,
        })
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
                {
                  defaultValue: `Compacted ${res.data.compactedCount} messages.`,
                },
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
          .catch(() => setMode(mode))
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
            model: string
            streaming?: boolean
          }>(usageUrl)
          const d = res.data
          const fmt = formatTokenTotal
          // AI usage is shown as a UNITLESS share of today's allowance —
          // currency never appears on AI-usage surfaces. The percent is the
          // owner's rolling-24h window spend (the number the chat gate actually
          // enforces), so 100% here IS the block point; at/above it the card
          // switches to the used-up line with the window's reset countdown.
          const allowanceLine =
            typeof d.allowancePercent === 'number'
              ? '\n' +
                (d.allowancePercent >= 100 && typeof d.allowanceResetAt === 'number'
                  ? t(
                      'ide.chat.usageAllowanceUsedUpLine',
                      { when: allowanceResetCountdown(d.allowanceResetAt) },
                      {
                        defaultValue: "Today's AI allowance is used up — refreshes {{when}}.",
                      },
                    )
                  : t(
                      'ide.chat.usageAllowanceTodayLine',
                      { percent: d.allowancePercent },
                      {
                        // Neutral phrasing on purpose: the allowance belongs to
                        // the PROJECT (its owner's plan window) — "you've used"
                        // misattributed it to whichever teammate ran /cost.
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
        // Find the last assistant turn that has file-changing tool calls with fileDiff snapshots.
        // Skip tool calls that are already undone.
        const lastTurn = [...messages]
          .reverse()
          .find(
            (m) =>
              m.role === 'assistant' &&
              m.toolCalls?.some(
                (tc) =>
                  (tc.name === 'write_file' || tc.name === 'edit_file') &&
                  tc.fileDiff &&
                  !undoneTcIds.has(tc.id),
              ),
          )
        if (!lastTurn) {
          addSystemCard(
            t('ide.chat.undoNoChanges', undefined, { defaultValue: 'No file changes to undo.' }),
          )
          return
        }
        // Collect the tool calls to undo and their original content.
        // Use a Map so that if multiple tool calls touched the same file, we restore
        // to the earliest original (first write wins).
        const fileOriginals = new Map<string, string>()
        const tcIdsToUndo: string[] = []
        for (const tc of lastTurn.toolCalls ?? []) {
          if (
            (tc.name === 'write_file' || tc.name === 'edit_file') &&
            tc.fileDiff &&
            !undoneTcIds.has(tc.id)
          ) {
            const path = (tc.input as { path?: string })?.path
            const original = (tc.fileDiff as { original: string }).original
            if (path && !fileOriginals.has(path)) {
              fileOriginals.set(path, original)
            }
            tcIdsToUndo.push(tc.id)
          }
        }
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
              {
                defaultValue: `Reverted ${fileOriginals.size} file(s) from last AI turn.`,
              },
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
        try {
          const status = await http.get<{ files: { path: string }[] }>(
            `/projects/${projectId}/git-status`,
          )
          if (!status.data.files.length) {
            addSystemCard(
              t('ide.chat.commitNoChanges', undefined, { defaultValue: 'No changes to commit.' }),
            )
            return
          }
          const res = await http.post<{
            ok: boolean
            committed: boolean
            message?: string
            files?: string[]
          }>(`/projects/${projectId}/commit`)
          if (res.data.committed) {
            setCommitCards((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                message: res.data.message ?? '',
                files: res.data.files ?? [],
                timestamp: Date.now(),
                status: 'done' as const,
              },
            ])
            refreshGitStatus()
          }
        } catch (error) {
          logger.warn('Failed to commit changes via /commit command', { error })
          addSystemCard(
            t('ide.chat.commitError', undefined, { defaultValue: 'Failed to commit changes.' }),
          )
        }
      } else if (id === 'test') {
        setInputValue('')
        sendMessage(
          'Run the project test suite (npm test) and report the results. If tests fail, analyze the failures.',
        )
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
      clearHistory,
      setInputAndCursorEnd,
      http,
      projectId,
      conversationId,
      addSystemCard,
      currentModel,
      currentMaxLoops,
      autoFixEnabled,
      messages,
      sendMessage,
      refreshGitStatus,
      openPanelOverlay,
      extraCommandIds,
      canEdit,
      allCommands,
      liveModelMode,
      t,
    ],
  )

  // When the auto-commit countdown reaches zero, fire the existing /commit path
  // (no new backend) and pause until the next file change re-arms it. /commit
  // itself no-ops on a clean tree, so a stray fire is harmless. Guarded by the
  // same hold as the tick interval (belt for the race where a turn starts on
  // the exact render the countdown hits zero): never commit mid-turn — the
  // effect re-runs when the hold clears and fires then.
  useEffect(() => {
    // A read-only VIEWER never fires auto-commit: /commit is an editor action,
    // and the client-side dispatch here surfaced the "view-only access, so this
    // command is unavailable" denial card out of nowhere on viewers whenever a
    // synced countdown lapsed (observed 2026-08-31, right after a watched turn
    // settled and released the hold). The hydrate below is also viewer-gated,
    // so this is the belt for a mid-session demotion.
    if (canEdit === false || !isAutoCommitDue(autoCommit) || autoCommitHeld) return
    void executeCommand('commit')
    dispatchAutoCommit({ type: 'fired' })
  }, [autoCommit, autoCommitHeld, executeCommand, canEdit])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Stop voice recognition on submit
    voiceIntentRef.current = false
    if (voiceWatchdogTimer.current) {
      clearTimeout(voiceWatchdogTimer.current)
      voiceWatchdogTimer.current = null
    }
    setIsListening(false)
    setVoiceNotice(null)
    if (useLocalVoiceRef.current) {
      // Discard any trailing transcript — it belongs to the message just sent,
      // not the freshly-cleared composer
      voiceDiscardRef.current = true
      getVoiceProvider()?.stopListening()
    } else {
      recognitionRef.current?.stop()
    }

    const trimmed = (inputRef.current as string).trim()
    if (!trimmed && attachedFiles.length === 0) return

    // Read-only VIEWER guard. A viewer cannot run the assistant (the server 403s
    // the chat route) or any project-mutating command, so block a plain message
    // or a write-command here with a read-only note instead of a silent 403 —
    // but let team side-channel messages (/teamsay) and viewerSafe commands
    // through so viewers can still talk to the team and read. (Menu-dispatched
    // commands are gated in executeCommand; this covers composer typing.)
    if (!canEdit) {
      const token = trimmed.match(/^\/(\S+)/)?.[1]?.toLowerCase()
      const def = token
        ? allCommands.find((c) => c.id.toLowerCase() === token || c.aliases?.includes(token))
        : undefined
      const allowed = matchesSideChannelCommand(allCommands, trimmed) || def?.viewerSafe === true
      if (!allowed) {
        setInputValue('')
        addSystemCard(
          t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          }),
        )
        return
      }
    }

    // Handle /autofix toggle locally
    if (/^\/autofix$/i.test(trimmed)) {
      void executeCommand('autofix')
      return
    }

    // Handle /autoapprove toggle locally
    if (/^\/autoapprove$/i.test(trimmed)) {
      void executeCommand('autoapprove')
      return
    }

    // Handle /sounds command locally
    if (/^\/sounds$/i.test(trimmed)) {
      setInputValue('')
      // Sounds owns the popup region exclusively — close any open panel overlay.
      setPanelOverlay(null)
      setSoundsPicker({ selectedIdx: -1 })
      return
    }

    // Handle /settings command locally
    if (/^\/settings$/i.test(trimmed)) {
      void executeCommand('settings')
      return
    }

    // Handle /skills [query] command locally — opens the skills browser overlay,
    // seeded with the query (if any) so it opens pre-filtered.
    const skillsMatch = trimmed.match(/^\/skills(?:\s+(.*))?$/i)
    if (skillsMatch) {
      setInputValue('')
      openPanelOverlay('skills', skillsMatch[1]?.trim() ?? '')
      return
    }

    // Handle /scripts [query] command locally — opens the scripts browser overlay,
    // seeded with the query (if any) so it opens pre-filtered.
    const scriptsMatch = parseScriptsCommand(trimmed)
    if (scriptsMatch) {
      setInputValue('')
      openPanelOverlay('scripts', scriptsMatch.query)
      return
    }

    // Handle /run <name> command locally — resolves + runs a saved script.
    const runMatch = parseRunCommand(trimmed)
    if (runMatch) {
      setInputValue('')
      if (!runMatch.name) {
        addSystemCard(
          t('ide.chat.scripts.runUsage', undefined, {
            defaultValue: 'Usage: /run <name> — run a saved script. Use /scripts to see them.',
          }),
        )
      } else {
        void runSavedScript(runMatch.name, runMatch.params)
      }
      return
    }

    // Handle /report [title] and /bug [title] commands locally — opens the
    // bug-report modal, seeding the title from any trailing text.
    const reportMatch = parseReportCommand(trimmed)
    if (reportMatch) {
      setInputValue('')
      setReportModal({ title: reportMatch.title })
      return
    }

    // Handle /share [role] locally — opens the share-link modal at the requested
    // role (default viewer). An unrecognized role shows usage instead. Below the
    // host's share capability (e.g. an editor where minting is admin+), say so
    // plainly instead of opening a modal whose every request 403s.
    const shareMatch = parseShareCommand(trimmed)
    if (shareMatch) {
      setInputValue('')
      if (!shareAllowed) {
        addSystemCard(
          t('ide.chat.share.notAllowed', undefined, {
            defaultValue: 'Managing share links needs an admin role on this project.',
          }),
        )
        return
      }
      if (shareMatch.kind === 'invalid') {
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
        setShareModal({ role: shareMatch.role })
      }
      return
    }

    // Handle /autocommit <seconds> locally — arms/cancels the countdown that
    // auto-fires the existing /commit path N seconds after the last file change.
    const autoCommitMatch = parseAutoCommitCommand(trimmed)
    if (autoCommitMatch) {
      setInputValue('')
      if (autoCommitMatch.seconds === null) {
        addSystemCard(
          t('ide.chat.autoCommit.usage', undefined, {
            defaultValue:
              'Usage: /autocommit <seconds> — auto-commit that many seconds after the last file change. /autocommit 0 cancels.',
          }),
        )
      } else if (autoCommitMatch.seconds <= 0) {
        dispatchAutoCommit({ type: 'set', seconds: 0 })
        addSystemCard(
          t('ide.chat.autoCommit.cancelled', undefined, { defaultValue: 'Auto-commit cancelled.' }),
        )
      } else {
        dispatchAutoCommit({ type: 'set', seconds: autoCommitMatch.seconds })
        addSystemCard(
          t(
            'ide.chat.autoCommit.enabled',
            { seconds: autoCommitMatch.seconds },
            {
              defaultValue:
                'Auto-commit on: committing {{seconds}}s after the last file change.\nSet to 0 to disable autocommit.',
            },
          ),
        )
      }
      return
    }

    // Handle /model --plan / --execute / --commit / --compact locally — opens
    // the picker scoped to that mode so a selection persists to planModel /
    // executeModel / commitModel / compactModel. Must run BEFORE the generic
    // /model handler so the flag isn't treated as a model name.
    const modelModeMatch = parseModelModeCommand(trimmed)
    if (modelModeMatch) {
      setInputValue('')
      // Model picker owns the popup region exclusively — close any open overlay.
      setPanelOverlay(null)
      setModelPicker({ selectedIdx: -1, mode: modelModeMatch.mode })
      return
    }

    // Handle /mic (alias /dictate) locally — opens the dictation engine picker
    if (/^\/(mic|dictate)$/i.test(trimmed)) {
      setInputValue('')
      setPanelOverlay(null)
      setCommandMenu(null)
      setModelPicker(null)
      setEffortPicker(null)
      setSoundsPicker(null)
      setMicPicker({ autoStart: false })
      return
    }

    // Handle /model <name> command locally
    const modelCmdMatch = trimmed.match(/^\/model(?:\s+(.+))?$/i)
    if (modelCmdMatch) {
      const query = modelCmdMatch[1]?.trim()
      if (!query) {
        addSystemCard(
          t('ide.chat.modelUsage', undefined, {
            defaultValue:
              'Usage: /model <model-name>  (e.g. claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001)',
          }),
        )
      } else {
        // Resolve partial name to closest model
        const q = query.toLowerCase()
        const resolved =
          AVAILABLE_MODELS.find((m) => m.id === q) ??
          AVAILABLE_MODELS.find((m) => m.id.toLowerCase().includes(q)) ??
          AVAILABLE_MODELS.find((m) => m.label.toLowerCase().includes(q))
        const name = resolved?.id ?? query
        // Block free-tier users from selecting paid models. Custom
        // (bring-your-own AI) models are exempt on every tier — the user pays
        // their own provider directly.
        if (isFreeTier && name !== FREE_TIER_MODEL && resolved?.provider !== 'custom') {
          addSystemCard(
            t(
              'ide.chat.modelUpgradeRequired',
              { model: resolved?.label ?? name },
              {
                defaultValue: `${resolved?.label ?? name} is available on a paid plan. Upgrade to access all models.`,
              },
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

    // Handle /effort locally — effort is PER-MODE (settings.effortByMode; the
    // legacy single effortLevel is the fallback) and is shown/typed in the
    // target mode's MODEL-NATIVE values (e.g. xhigh on Claude, 16K thinking
    // tokens on budget-scaled models) — never the internal S/M/L/XL letters.
    // The backend applies it to the provider reasoning param (and the
    // agent-loop budget) at chat-call time.
    const effortCmd = parseEffortCommand(trimmed)
    if (effortCmd) {
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
        setEffortPicker({ selectedIdx: -1, mode: effortCmd.mode ?? liveModelMode })
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
      const modeStatusLine = (m: EffortMode): string => {
        const model = modelForMode(m)
        const options = effortOptionsForModel(model)
        const current = nativeEffortName(model, effectiveEffort(m))
        return current === null || options.length === 0
          ? t(
              'ide.chat.effort.modeFixed',
              { mode: m, model: model?.label ?? '?' },
              { defaultValue: '  {{mode}} ({{model}}): fixed — this model has one reasoning mode' },
            )
          : t(
              'ide.chat.effort.modeLine',
              {
                mode: m,
                model: model?.label ?? '?',
                current,
                levels: options.map((o) => o.value).join(', '),
              },
              { defaultValue: '  {{mode}} ({{model}}): {{current}} — available: {{levels}}' },
            )
      }
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
            t('ide.chat.effort.header', undefined, { defaultValue: 'Reasoning effort per mode:' }),
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

    // Handle /maxloops <N> command locally — server enforces tier cap
    const maxLoopsMatch = trimmed.match(/^\/maxloops\s+(\d+)$/i)
    if (maxLoopsMatch) {
      const n = Math.max(1, Number(maxLoopsMatch[1]))
      try {
        await http.patch(settingsPatchUrl(), { settings: { maxToolLoops: n } })
        setCurrentMaxLoops(n)
        addSystemCard(
          t(
            'ide.chat.maxLoopsSet',
            { n },
            {
              defaultValue: `Max tool iterations set to ${n}`,
            },
          ),
        )
      } catch (err) {
        const data = (
          err as {
            response?: { data?: { error?: string; limitType?: string; requiresSignup?: boolean } }
          }
        )?.response?.data
        if (data?.limitType === 'max_tool_loops') {
          addSystemCard(
            data.error ??
              t('ide.chat.maxLoopsReached', undefined, {
                defaultValue: 'Max loops limit reached.',
              }),
            // Host owns the upgrade/sign-in button(s); `requiresSignup` is the
            // backend's hint that the user must sign up rather than upgrade.
            { action: buildUpgradeCta?.({ requiresSignup: data.requiresSignup }) ?? undefined },
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

    // Handle /test [args] — inject prompt for AI to run tests
    const testMatch = trimmed.match(/^\/test(?:\s+(.*))?$/i)
    if (testMatch) {
      const args = testMatch[1]?.trim()
      const prompt = args
        ? `Run this test command and report the results: npm test -- ${args}`
        : 'Run the project test suite (npm test) and report the results. If tests fail, analyze the failures.'
      setInputValue('')
      sendMessage(prompt)
      return
    }

    // Handle /explain [target] — inject prompt for AI to explain code
    // NOTE: does NOT return early — falls through to attachment processing below
    // so that @-attached files are included in the message sent to the AI.
    const explainMatch = trimmed.match(/^\/explain(?:\s+(.*))?$/i)
    if (explainMatch && attachedFiles.length === 0) {
      const target = explainMatch[1]?.trim()
      const prompt = target
        ? `Explain this in detail: ${target}`
        : 'Explain the code I just shared or the most recently discussed code. Be thorough but concise.'
      setInputValue('')
      sendMessage(prompt)
      return
    }

    // Handle /lint [args] — inject prompt for AI to run linter
    const lintMatch = trimmed.match(/^\/lint(?:\s+(.*))?$/i)
    if (lintMatch) {
      const args = lintMatch[1]?.trim()
      const prompt = args
        ? `Run the linter on ${args} and fix any issues found: npm run lint -- ${args}`
        : 'Run the project linter (npm run lint) and fix any issues found. Show what you fixed.'
      setInputValue('')
      sendMessage(prompt)
      return
    }

    // A host side-channel command (CommandDef.sideChannel, matched by id or alias — e.g.
    // molecule.dev's /teamsay + /t): send the raw text to the host's server intercept but
    // suppress the optimistic user bubble. The server emits the canonical `message` stream
    // event (persisted + broadcast to every member), which IS the visible message — so the
    // transcript never shows the literal "/command" text, and never shows it twice.
    if (matchesSideChannelCommand(allCommands, trimmed)) {
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
      sendMessage(trimmed, undefined, { suppressUserMessage: true, sideChannel: true })
      return
    }

    // Rewrite /explain with attachments into a proper prompt (attachments processed below)
    let message = trimmed
    if (explainMatch) {
      const target = explainMatch[1]?.trim()
      message = target
        ? `Explain this in detail: ${target}`
        : 'Explain the attached file(s) in detail. Be thorough but concise.'
    }
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
          try {
            const res = await http.get<{ content: string }>(`/projects/${projectId}/files${f.path}`)
            const ext = f.path.split('.').pop() ?? ''
            message =
              (message ? `${message}\n\n` : '') +
              `<file path="${displayPath}">\n\`\`\`${ext}\n${res.data.content}\n\`\`\`\n</file>`
          } catch (_error) {
            // File unreadable (sandbox not responding, permission error, etc.) — include a
            // placeholder so the AI still sees which file was intended
            message =
              (message ? `${message}\n\n` : '') +
              `<file path="${displayPath}">[Could not read file]</file>`
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

    setInputValue('')
    setAttachedFiles([])
    setAttachmentError(null)
    sendMessage(message, chatAttachments.length > 0 ? chatAttachments : undefined)
  }, [
    attachedFiles,
    http,
    projectId,
    sendMessage,
    setInputValue,
    runSavedScript,
    allCommands,
    selectModel,
    applyEffortLevel,
    liveModelMode,
  ])

  // External auto-submit. When the signal changes, submit the current input —
  // used by the prompt → chat morph to send the prefilled prompt once the chat
  // has docked into place (handleSubmit clears the input as it sends).
  const lastAutoSubmitRef = useRef(autoSubmitSignal)
  useEffect(() => {
    if (autoSubmitSignal !== undefined && autoSubmitSignal !== lastAutoSubmitRef.current) {
      lastAutoSubmitRef.current = autoSubmitSignal
      if ((inputRef.current as string).trim()) void handleSubmit()
    }
  }, [autoSubmitSignal, handleSubmit])

  // External "open settings" trigger from the header gear button. When the
  // signal changes, open the /settings view (same path as the slash command).
  const lastOpenSettingsRef = useRef(openSettingsSignal)
  useEffect(() => {
    if (openSettingsSignal !== undefined && openSettingsSignal !== lastOpenSettingsRef.current) {
      lastOpenSettingsRef.current = openSettingsSignal
      void executeCommand('settings')
    }
  }, [openSettingsSignal, executeCommand])

  // External "open report" trigger from the header bug-report button. When the
  // signal changes, open the bug-report modal (same path as /report and /bug).
  const lastOpenReportRef = useRef(openReportSignal)
  useEffect(() => {
    if (openReportSignal !== undefined && openReportSignal !== lastOpenReportRef.current) {
      lastOpenReportRef.current = openReportSignal
      setReportModal({ title: '' })
    }
  }, [openReportSignal])

  // External "open share" trigger from the header share button. When the signal
  // changes, open the share-link modal (same path as the /share command).
  const lastOpenShareRef = useRef(openShareSignal)
  useEffect(() => {
    if (openShareSignal !== undefined && openShareSignal !== lastOpenShareRef.current) {
      lastOpenShareRef.current = openShareSignal
      if (shareAllowed) setShareModal({ role: DEFAULT_SHARE_ROLE })
    }
  }, [openShareSignal, shareAllowed])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const filteredCmds = commandMenu
    ? allCommands.filter(
        (c) =>
          // A showAll menu (slash-button toggle over existing text) lists every
          // command; a typed menu filters by the composer's text.
          (commandMenu.showAll === true || c.label.startsWith(inputRef.current as string)) &&
          // Viewers see only commands they can actually run (viewer-safe reads +
          // the /teamsay side channel) — no dead entries in the menu.
          (canEdit !== false || c.viewerSafe === true || c.sideChannel === true) &&
          // /share is gated separately: hosts commonly mint at admin+, so an
          // editor without the capability gets no dead menu entry either.
          (c.id !== 'share' || shareAllowed),
      )
    : []

  const filteredModels = useMemo(() => {
    if (!modelPicker) return []
    const val = inputRef.current as string
    // For a mode-scoped command the filter is the text after the flag; otherwise
    // it's the text after "/model ".
    const modeMatch = parseModelModeCommand(val)
    const q = (modeMatch ? modeMatch.query : (val.match(/^\/model\s+(.*)/i)?.[1] ?? ''))
      .trim()
      .toLowerCase()
    if (!q) return AVAILABLE_MODELS
    return AVAILABLE_MODELS.filter(
      (m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q),
    )
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
  useEffect(() => {
    // Auto-expand when the user's saved model is deprecated, or when a search
    // query matched only deprecated entries. The user can still collapse manually.
    const currentIsDeprecated = deprecatedModels.some((m) => m.id === currentModel)
    const onlyDeprecatedMatched = currentModels.length === 0 && deprecatedModels.length > 0
    if (currentIsDeprecated || onlyDeprecatedMatched) {
      setShowDeprecated(true)
    }
  }, [deprecatedModels, currentModels, currentModel])
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
  // Closing the model picker closes any open region menu with it.
  useEffect(() => {
    if (!modelPicker) setRegionMenu(null)
  }, [modelPicker])
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
  const pickerModeOptions = ((): { value: string; label: string }[] => {
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
    const rows: { value: string; mode: string; model: string }[] = [
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

  // The row that gets the "current" pill — the model the selected picker mode
  // actually uses (its per-mode value with the mode's REAL fallback chain), not
  // unconditionally the legacy chatModel. The generic (no-mode) picker edits
  // the default slot, so its pill is the SAVED default only — a seeded catalog
  // default is not a choice and must not masquerade as one.
  const pickerCurrentModelId = modelPicker
    ? modelPicker.mode === 'plan' || modelPicker.mode === 'execute'
      ? effectiveModelForMode(modelPicker.mode)
      : modelPicker.mode
        ? (resolveModeModel(
            { planModel, executeModel, commitModel, compactModel, chatModel: savedChatModel },
            modelPicker.mode,
          ) ?? serverModelDefaults?.[modelPicker.mode])
        : savedChatModel || undefined
    : undefined

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
  const effortPickerVisibleOptions = ((): typeof effortPickerOptions => {
    if (!effortPicker) return []
    const typed = parseEffortCommand(inputRef.current as string)
    const q = typed?.kind === 'set' ? typed.arg.toLowerCase() : ''
    if (!q) return effortPickerOptions
    return effortPickerOptions.filter((o) => o.value.toLowerCase().includes(q))
  })()
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
    const q = filePicker.query.toLowerCase()

    // Normalize active file and open tabs to match entry names (relative paths without leading /)
    const normalizeTabPath = (p: string): string =>
      p.startsWith('/workspace/')
        ? p.slice('/workspace/'.length)
        : p.startsWith('/')
          ? p.slice(1)
          : p
    const activeNorm = activeFile ? normalizeTabPath(activeFile) : null
    const openTabSet = new Set((openTabs ?? []).map(normalizeTabPath))

    // Filter by query
    const matches = q
      ? filePicker.entries.filter((e) => e.name.toLowerCase().includes(q))
      : filePicker.entries

    // Rank: active file first, then open tabs, then rest (by match position)
    const scored = matches.map((e) => {
      const name = e.name
      const nameLower = name.toLowerCase()
      let score = 0
      if (activeNorm && name === activeNorm) score = 3
      else if (openTabSet.has(name)) score = 2
      // Boost prefix matches (query matches start of filename)
      else if (q && nameLower.split('/').pop()?.startsWith(q)) score = 1
      return { entry: e, score }
    })

    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return a.entry.name.localeCompare(b.entry.name)
    })

    return scored.map((s) => s.entry).slice(0, 15)
  }, [filePicker, activeFile, openTabs])

  /**
   * Wrap-around index: Down from -1 → 0, Up from -1 → last, wraps at both ends.
   * @param cur - The current index (-1 means no selection).
   * @param delta - The direction to move (+1 down, -1 up).
   * @param len - The total number of items.
   * @returns The new wrapped index.
   */
  const wrapIdx = (cur: number, delta: number, len: number): number => {
    if (cur === -1) return delta > 0 ? 0 : len - 1
    return (((cur + delta) % len) + len) % len
  }

  // Store the handler in a ref so the native listener always calls the latest version.
  const keyDownRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyDownRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (soundsPicker) {
        setSoundsPicker(null)
        return
      }
      if (micPicker) {
        setMicPicker(null)
        return
      }
      if (effortPicker) {
        setEffortPicker(null)
        return
      }
      if (modelPicker) {
        setModelPicker(null)
        return
      }
      if (panelOverlay) {
        setPanelOverlay(null)
        return
      }
      if (filePicker) {
        setFilePicker(null)
        return
      }
      if (commandMenu) {
        setCommandMenu(null)
        return
      }
      if (isLoading || isRemoteStreaming) {
        // Same path as the Stop button: kill the stream AND drop the pending
        // automatic follow-ups (deferred auto-fix, verification countdown).
        handleAbort()
        return
      }
    }

    // Sounds picker: "All" row at index 0, then one row per event
    const soundsRowCount = SOUND_EVENTS.length + 1
    if (soundsPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSoundsPicker((s) =>
          s ? { selectedIdx: wrapIdx(s.selectedIdx, 1, soundsRowCount) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSoundsPicker((s) =>
          s ? { selectedIdx: wrapIdx(s.selectedIdx, -1, soundsRowCount) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const idx = soundsPicker.selectedIdx >= 0 ? soundsPicker.selectedIdx : 0
        const target = idx === 0 ? 'all' : SOUND_EVENTS[idx - 1]
        void cycleSoundMode(target)
        return
      }
    }

    // Effort picker: one row per (typed-filter-matching) level of the selected
    // mode's model. A fixed-reasoning model or an unmatched filter lists
    // nothing — arrows/Enter fall through (Escape closes; Enter submits the
    // typed text, so an unknown level still gets the "isn't available" card).
    if (effortPicker && effortPickerVisibleOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setEffortPicker((p) =>
          p
            ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, 1, effortPickerVisibleOptions.length) }
            : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setEffortPicker((p) =>
          p
            ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, -1, effortPickerVisibleOptions.length) }
            : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        // Highlighted row wins; otherwise an exactly-typed level beats the
        // first substring match ("/effort high" must never apply xhigh's
        // neighbor), then default to the first visible row (mirrors /model).
        let option: EffortOption | undefined = effortPickerVisibleOptions[effortPicker.selectedIdx]
        if (!option) {
          const typed = parseEffortCommand(inputRef.current as string)
          const q = typed?.kind === 'set' ? typed.arg.toLowerCase() : ''
          option =
            (q ? effortPickerVisibleOptions.find((o) => o.value.toLowerCase() === q) : undefined) ??
            effortPickerVisibleOptions[0]
        }
        if (option) void applyEffortLevel(effortPicker.mode, option.value, effortPickerModel)
        return
      }
    }

    // The optional "manage your own models" row sits after the model rows and
    // participates in arrow/Enter navigation as the last index.
    const modelRowCount = visibleModels.length + (onManageCustomModels ? 1 : 0)
    if (modelPicker && modelRowCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, 1, modelRowCount) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, -1, modelRowCount) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const idx = modelPicker.selectedIdx >= 0 ? modelPicker.selectedIdx : 0
        if (onManageCustomModels && idx === visibleModels.length) {
          const manageMode =
            modelPicker.mode === 'plan' || modelPicker.mode === 'execute'
              ? modelPicker.mode
              : liveModelMode
          setModelPicker(null)
          setInputValue('')
          onManageCustomModels({ mode: manageMode })
          return
        }
        const model = visibleModels[idx]
        if (model) {
          // Honor the free-tier clamp for the active mode; ignore Enter on a
          // locked model (the click path shows the upgrade card). Custom
          // (bring-your-own AI) models are never locked — the user pays their
          // own provider directly.
          const pickerMode = modelPicker.mode
          const isLocked = pickerMode
            ? isModeModelLocked(model.id, pickerMode, isFreeTier, AVAILABLE_MODELS, FREE_TIER_MODEL)
            : isFreeTier && model.id !== FREE_TIER_MODEL && model.provider !== 'custom'
          if (!isLocked) void selectModel(model.id, model.label, pickerMode)
        }
        return
      }
    }

    if (filePicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFilePicker((p) =>
          p ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, 1, filteredEntries.length) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFilePicker((p) =>
          p ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, -1, filteredEntries.length) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const entry = filteredEntries[filePicker.selectedIdx]
        if (entry) selectFileEntry(entry)
        return
      }
    }

    if (commandMenu && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCommandMenu((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, 1, filteredCmds.length) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCommandMenu((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, -1, filteredCmds.length) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        // A showAll menu (opened by the slash BUTTON over existing text) only
        // executes an explicitly highlighted command — a bare Enter closes it
        // and falls through to submit the composer text as typed.
        if (commandMenu.showAll && commandMenu.selectedIdx < 0 && e.key === 'Enter') {
          setCommandMenu(null)
        } else {
          e.preventDefault()
          const cmd = filteredCmds[commandMenu.selectedIdx >= 0 ? commandMenu.selectedIdx : 0]
          if (cmd) void executeCommand(cmd.id)
          return
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  // Attach native keydown listener directly to the textarea element.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const handler = (e: KeyboardEvent): void => keyDownRef.current(e)
    ta.addEventListener('keydown', handler)
    return () => ta.removeEventListener('keydown', handler)
  }, [])

  // Never render hidden driver messages (the post-boot kickoff etc.). The server
  // already filters them on read, but guard here too so the client NEVER shows
  // one — even an optimistic/in-flight hidden message.
  const visibleMessages = useMemo(() => messages.filter((m) => !m.hidden), [messages])

  // Queued messages (user/auto messages waiting to send while the agent works)
  // are NOT rendered inline in the scrolling timeline — they'd be pushed around
  // and reflow as the response streams. They render instead in an anchored bar
  // pinned above the composer (see "Queued messages" in the input area below),
  // the same fixed-position treatment as the commit bar. Split them out here so
  // the timeline never includes them.
  const queuedMessages = useMemo(() => visibleMessages.filter((m) => m.queued), [visibleMessages])

  // Build a renderable SystemCard from a card-message's raw CardEvent. This is the ONE
  // construction, used IDENTICALLY for a live `card` event (now a card-message in `messages`)
  // and for a card-message loaded on refresh — so the rendered card is the same in both, with
  // no separate store and no client-side "should I show this" decision. App-specific copy /
  // actions stay client-side (the server records only the raw data); returns null for an
  // unrenderable card (a custom event with no registered factory, or a non-execute mode) so
  // the timeline simply omits it.
  const cardEventToSystemCard = useCallback(
    (cardEvent: CardEvent, id: string, timestamp: number): SystemCard | null => {
      // Suffix a card's copy with the member who made the change, when the
      // server attributed one — so a teammate watching knows WHO flipped the
      // model/effort/mode, live and on reload.
      const withBy = (text: string): string => {
        const by = (cardEvent as { by?: string }).by
        return by
          ? t('ide.chat.cardBy', { text, name: by }, { defaultValue: '{{text}} — {{name}}' })
          : text
      }
      switch (cardEvent.kind) {
        case 'model': {
          const label = cardEvent.label || cardEvent.model
          // Append the model's effective processing-region code — catalog
          // models only. A custom/BYO endpoint has no meaningful region: its
          // catalog `regions` defaults to ['us'] as a placeholder, not a real
          // re-host choice, so never surface a region for it.
          const def = AVAILABLE_MODELS.find((m) => m.id === cardEvent.model)
          const regionCode =
            def && def.provider !== 'custom' ? effectiveModelRegion(def).toUpperCase() : null
          return {
            id,
            text: withBy(
              regionCode
                ? t(
                    'ide.chat.modelInUseRegion',
                    { model: label, region: regionCode },
                    { defaultValue: 'Now using {{model}} ({{region}})' },
                  )
                : t(
                    'ide.chat.modelInUse',
                    { model: label },
                    { defaultValue: 'Now using {{model}}' },
                  ),
            ),
            timestamp,
          }
        }
        case 'mode':
          // The plan→build handoff ("🔨 Building your app") and the plan-mode
          // announcement a new conversation is seeded with ("📝 Plan mode") —
          // the server records mode cards only for those two.
          if (cardEvent.mode === 'plan') {
            return {
              id,
              text: withBy(
                t('ide.chat.phasePlanning', undefined, { defaultValue: '📝 Plan mode' }),
              ),
              timestamp,
            }
          }
          if (cardEvent.mode !== 'execute') return null
          return {
            id,
            text: withBy(
              t('ide.chat.phaseBuilding', undefined, { defaultValue: '🔨 Building your app' }),
            ),
            timestamp,
          }
        case 'setting': {
          // A Synthase-altering setting changed (effort / fast mode / max loops /
          // region / auto-fix / auto-approve) — announced to every member, live
          // and on reload. Copy reuses the same localized strings as the local
          // confirmation cards, so the shared card reads identically.
          let text: string | null = null
          if (cardEvent.setting === 'effort') {
            const level = String(cardEvent.value ?? 'default')
            const cardMode = cardEvent.mode ?? ''
            text = cardEvent.label
              ? t(
                  'ide.chat.effort.setMode',
                  { mode: cardMode, level, model: cardEvent.label },
                  { defaultValue: 'Reasoning effort for {{mode}} set to {{level}} ({{model}}).' },
                )
              : t(
                  'ide.chat.setting.effort',
                  { mode: cardMode, level },
                  { defaultValue: 'Reasoning effort for {{mode}} set to {{level}}.' },
                )
          } else if (cardEvent.setting === 'fastMode') {
            text = cardEvent.value
              ? t('ide.chat.fastModeOn', undefined, {
                  defaultValue: 'Fast mode on — faster responses at a higher rate',
                })
              : t('ide.chat.fastModeOff', undefined, { defaultValue: 'Fast mode off' })
          } else if (cardEvent.setting === 'maxToolLoops') {
            text = t(
              'ide.chat.maxLoopsSet',
              { n: Number(cardEvent.value ?? 0) },
              { defaultValue: 'Max tool iterations set to {{n}}' },
            )
          } else if (cardEvent.setting === 'region') {
            text = t(
              'ide.chat.modelInUseRegion',
              {
                model: cardEvent.label ?? '',
                region: String(cardEvent.value ?? '').toUpperCase(),
              },
              { defaultValue: 'Now using {{model}} ({{region}})' },
            )
          } else if (cardEvent.setting === 'autoFix') {
            text = cardEvent.value
              ? t('ide.chat.autoFixEnabled', undefined, { defaultValue: 'Auto-fix enabled.' })
              : t('ide.chat.autoFixDisabled', undefined, { defaultValue: 'Auto-fix disabled.' })
          } else if (cardEvent.setting === 'autoApprove') {
            text = cardEvent.value
              ? t('ide.chat.autoApproveEnabled', undefined, {
                  defaultValue:
                    'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
                })
              : t('ide.chat.autoApproveDisabled', undefined, {
                  defaultValue: 'Auto-approve off — destructive commands ask before running.',
                })
          }
          if (!text) return null
          return { id, text: withBy(text), timestamp }
        }
        case 'skills':
          return {
            id,
            variant: 'skillsLoaded',
            count: cardEvent.count,
            text: t(
              'ide.chat.skills.loadedCount',
              { count: cardEvent.count },
              { defaultValue: '🧠 Loaded {{count}} skills' },
            ),
            timestamp,
          }
        case 'custom': {
          // App-registered renderer (registerCustomEventCard) builds the copy/actions/tone
          // from the raw data — keeping app-specific text out of this shared package.
          //
          // This runs in a memo ABOVE the timeline's per-item boundaries, so a factory
          // that throws would take the whole panel down rather than one card — and the
          // factory is host code reading model-authored `data`, exactly the combination
          // that caused the 2026-08-14 outage. One unrenderable card must cost one card.
          let card: ChatEventCard | undefined | null
          try {
            card = getCustomEventCardFactory(cardEvent.name)?.(cardEvent.data)
          } catch (error) {
            logger.error('Custom chat card factory threw — dropping the card', {
              error,
              name: cardEvent.name,
            })
            return null
          }
          if (!card) return null
          return {
            id,
            text: card.text,
            ...(card.action ? { action: card.action } : {}),
            ...(card.emphasized ? { emphasized: card.emphasized } : {}),
            ...(card.tone ? { tone: card.tone } : {}),
            ...(card.icon ? { icon: card.icon } : {}),
            ...(card.content ? { content: card.content } : {}),
            ...(card.coversLimitType ? { coversLimitType: card.coversLimitType } : {}),
            timestamp,
          }
        }
        default:
          return null
      }
    },
    [t, AVAILABLE_MODELS, effectiveModelRegion],
  )

  // A limit the backend raised for an ANONYMOUS caller — `requiresSignup`, whose
  // whole message is "…for guests … or create a free account for more" and whose
  // CTAs are Sign up / Log in — is STALE the moment the viewer signs in: they now
  // have an account, a different allowance, and two dead-end buttons. The error
  // state survives the in-place auth modal (nothing navigates, and useChat only
  // clears it on the next send), so without this the freshly-signed-up user keeps
  // reading the guest limit they just escaped. Same reasoning the host's
  // `upgrade_prompt` card factory already applies to the recorded guest card.
  const isStaleAnonymousLimit = errorMeta?.requiresSignup === true && isAnonymous === false

  // A read-only viewer's access-denied chat error must never sit as the
  // persistent red banner — every legitimate viewer action is already gated
  // client-side, so this only fires when something slipped through to the
  // server (or an older tab raced a role change). Flash a calm, gold
  // view-only notice for a few seconds instead, then clear.
  const isViewerAccessDenied = canEdit === false && !!error && /access denied/i.test(error)
  const [viewerDeniedFlash, setViewerDeniedFlash] = useState(false)
  useEffect(() => {
    if (!isViewerAccessDenied) return
    setViewerDeniedFlash(true)
    const timer = setTimeout(() => setViewerDeniedFlash(false), 6000)
    return () => clearTimeout(timer)
  }, [isViewerAccessDenied, error])

  // Build a unified timeline so commit cards appear at the correct position
  type TimelineItem =
    | { kind: 'message'; msg: (typeof messages)[number] }
    | { kind: 'commit'; card: CommitCard }
    | { kind: 'system'; card: SystemCard }
    | { kind: 'activity'; card: ActivityCardEntry }
    | { kind: 'tip'; card: TipCardEntry }
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    // A card-message (role:'system' carrying a cardEvent) renders as a SYSTEM CARD, not a chat
    // bubble — split it out here so it flows through the same card render path as before, now
    // sourced from the ONE transcript instead of a separate array. Every other message renders
    // as a message.
    // A limit the LIVE banner (below the timeline) is already stating. A limit is hit
    // once but surfaces twice — the card recorded when the turn was interrupted, then
    // the banner when the next send is refused — so a card that declares it covers this
    // same limit is dropped while the banner is up (it comes back when the error
    // clears). The banner stays: it is the refused send's only feedback, and its message
    // can be the more specific one (platform capacity vs the user's own budget, same
    // `limitType`). See {@link ChatEventCard.coversLimitType}.
    const liveLimitType = error && !isStaleAnonymousLimit ? errorMeta?.limitType : undefined
    for (const msg of visibleMessages) {
      // Queued messages render in the anchored bar above the composer, not inline.
      if (msg.queued) continue
      if (msg.cardEvent) {
        const card = cardEventToSystemCard(msg.cardEvent, msg.id, msg.timestamp)
        if (!card) continue
        if (liveLimitType && card.variant === undefined && card.coversLimitType === liveLimitType)
          continue
        items.push({ kind: 'system', card })
      } else {
        items.push({ kind: 'message', msg })
      }
    }
    // systemCards now holds ONLY this session's local command cards (ephemeral, see above).
    items.push(
      ...commitCards.map((card) => ({ kind: 'commit' as const, card })),
      ...systemCards.map((card) => ({ kind: 'system' as const, card })),
      ...activityCards.map((card) => ({ kind: 'activity' as const, card })),
      ...tipCards.map((card) => ({ kind: 'tip' as const, card })),
    )
    // Order by timestamp, EXCEPT an empty (still-thinking) streaming response sorts
    // last — so a turn's preamble cards (mode/model/skills notices, onboarding tips),
    // emitted a beat after the placeholder is created, render ABOVE the response
    // rather than below the whole streamed block. See timelineSortKey.
    items.sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    return items
  }, [
    visibleMessages,
    cardEventToSystemCard,
    commitCards,
    systemCards,
    activityCards,
    tipCards,
    error,
    errorMeta,
    isStaleAnonymousLimit,
  ])

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
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
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
        className={cm.sp('p', 3)}
        // Symmetric padding on all four sides (P3-04) — the old asymmetric pr-1 hack
        // is gone. No scrollbar-gutter:stable reservation (it made the right padding
        // visibly larger than the left); the thin scrollbar just overlays when the
        // timeline overflows.
        style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}
      >
        {/* Empty-conversation hint — rendered ONLY when there is literally nothing
            else to show: no timeline items, no local/remote streaming, no sandbox-boot
            wait (the activity slot's own conditions), and no error banner — so it can
            never coexist with content. Height reserves the 28px always-in-layout
            activity slot below, so an empty conversation never grows a scrollbar. */}
        {timeline.length === 0 &&
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
        {timeline.length > maxVisibleItems && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <button
              onClick={() => setMaxVisibleItems((n) => n + 40)}
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{
                background: 'none',
                border: '1px solid currentColor',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              {t('ide.chat.showEarlier', undefined, {
                defaultValue: 'Show earlier messages',
              })}
            </button>
          </div>
        )}
        {/* Every item renders inside its own boundary: the timeline is built from
            model-authored data, so one malformed payload must cost one inline
            notice, never the whole IDE. See ChatItemBoundary. */}
        {(timeline.length > maxVisibleItems ? timeline.slice(-maxVisibleItems) : timeline).map(
          (item) => (
            <ChatItemBoundary
              key={item.kind === 'message' ? item.msg.id : item.card.id}
              onError={onRenderError}
              render={() => {
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
                      text={item.card.text}
                      accent={item.card.accent}
                      icon={item.card.icon}
                      onDismiss={() => dismissTip(item.card.id)}
                    />
                  )

                if (item.kind === 'system') {
                  if (item.card.variant === 'settings') {
                    // Legacy inline branch — kept so any 'settings' card persisted
                    // before /settings became an overlay still renders. New /settings
                    // invocations open the closeable overlay (see panelOverlay below).
                    return (
                      <SettingsCard
                        key={item.card.id}
                        settings={computeSettingsList()}
                        onRunCommand={(commandId) => void executeCommand(commandId)}
                        onPrefillInput={(input) => setInputAndCursorEnd(`${input} `)}
                        isLight={isLight}
                        agentName={agentName}
                      />
                    )
                  }
                  if (item.card.variant === 'skills' || item.card.variant === 'skillsCreate') {
                    return (
                      <SkillsCard
                        key={item.card.id}
                        projectId={projectId}
                        initialQuery={item.card.query ?? ''}
                        onLoad={loadSkill}
                        onCreate={createSkill}
                        // The 'skillsCreate' variant opens the card with its "New skill" form
                        // already open (vs plain 'skills', which opens the browser).
                        startCreating={item.card.variant === 'skillsCreate'}
                        loadedSkillPaths={loadedSkillPaths}
                        defaultSkillPaths={defaultSkillPaths}
                        onToggleDefault={toggleDefaultSkill}
                        onResetDefault={resetDefaultSkills}
                        defaultsExplicit={defaultSkillsExplicitRef.current}
                        isLight={isLight}
                      />
                    )
                  }
                  if (item.card.variant === 'scripts') {
                    return (
                      <ScriptsCard
                        key={item.card.id}
                        projectId={projectId}
                        initialQuery={item.card.query ?? ''}
                        isLight={isLight}
                        agentName={agentName}
                      />
                    )
                  }
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
                    // /skills browser overlay, exactly what typing /skills does — so it
                    // survives the persistence round-trip (which stores only variant + count +
                    // text, never callbacks). Text restores from the persisted copy; re-derive
                    // from `count` if a caller passed none.
                    const skillsLoadedLabel =
                      item.card.text ||
                      t(
                        'ide.chat.skills.loadedCount',
                        { count: item.card.count ?? 0 },
                        { defaultValue: '🧠 Loaded {{count}} skills' },
                      )
                    return (
                      <div
                        key={item.card.id}
                        style={{ textAlign: 'center', marginBottom: TIMELINE_ITEM_GAP }}
                      >
                        <button
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
                            ;(e.currentTarget as HTMLElement).style.textDecoration = 'underline'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.textDecoration = 'none'
                          }}
                        >
                          {skillsLoadedLabel}
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
                    // Avatar clicks open the signed-in user's OWN profile, so only
                    // their own messages get the handler: author-less ones (the
                    // local echo, legacy solo rows) or an author matching
                    // currentUserId. A teammate's avatar stays non-interactive —
                    // clicking Test's face must not open Luke's profile editor.
                    onAvatarClick={
                      !msg.author?.id || (currentUserId != null && msg.author.id === currentUserId)
                        ? onUserAvatarClick
                        : undefined
                    }
                    discovery={discovery}
                    buildUpgradeCta={buildUpgradeCta}
                    agentName={agentName}
                    canEdit={canEdit}
                  />
                )
              }}
            />
          ),
        )}

        {error &&
          !isStaleAnonymousLimit &&
          (errorMeta?.limitType ? (
            // The CTA routes/copy are the host's — ask buildUpgradeCta for the FULL
            // upgrade/sign-in button set (none rendered if the host supplies nothing).
            <ResourceLimitBanner
              message={error}
              action={buildUpgradeCta?.({ requiresSignup: errorMeta.requiresSignup })}
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
            ? (streamingStatus ?? (streamingMsg ? streamingActivityLabel(streamingMsg) : undefined))
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
                  {
                    defaultValue: `Auto-fixing in ${autoFixCountdown.secondsLeft}s...`,
                  },
                )}
          </span>
          {autoFixCountdown.paused ? (
            <button
              type="button"
              onClick={() =>
                setAutoFixCountdown((prev) =>
                  prev ? { ...prev, paused: false, secondsLeft: 3 } : prev,
                )
              }
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid rgba(128,128,128,0.3)',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setAutoFixCountdown((prev) => (prev ? { ...prev, paused: true } : prev))
              }
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid rgba(128,128,128,0.3)',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })}
            </button>
          )}
          <button
            type="button"
            onClick={() => setAutoFixCountdown(null)}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(128,128,128,0.3)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
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
                defaultValue: `Server error — retrying in ${retryCountdown.secondsRemaining}s… (attempt ${retryCountdown.attempt})`,
              },
            )}
          </span>
          <button
            type="button"
            data-mol-id="chat-retry-cancel"
            onClick={cancelRetry}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(128,128,128,0.3)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
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
                    type="button"
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
                            key={cmd.id}
                            type="button"
                            onClick={() => void executeCommand(cmd.id as CommandId)}
                            onMouseEnter={(e) => {
                              ;(e.currentTarget as HTMLElement).style.background =
                                'rgba(128,128,128,0.15)'
                            }}
                            onMouseLeave={(e) => {
                              ;(e.currentTarget as HTMLElement).style.background =
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
                              {t(
                                `ide.chat.cmd.${cmd.id}.desc`,
                                { agentName },
                                {
                                  defaultValue: cmd.description,
                                },
                              )}
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
              const isCurrent = voiceEngineRef.current?.id === def.id
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
                  key={def.id}
                  type="button"
                  data-mol-id={`chat-mic-engine-${def.id}`}
                  onClick={() => {
                    if (!disabled) chooseVoiceEngine(def, micPicker.autoStart)
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
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
                  <select
                    data-mol-id="chat-model-mode-select"
                    aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                    value={modelPicker.mode ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      // Reset the highlighted row — the lock rules (and thus
                      // which rows are selectable) change with the mode.
                      setModelPicker((m) =>
                        m
                          ? {
                              ...m,
                              mode: v === '' ? undefined : (v as ModelMode),
                              selectedIdx: -1,
                            }
                          : m,
                      )
                    }}
                    className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                    style={{
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
                  >
                    {pickerModeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
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
                  <select
                    data-mol-id="model-sort-column"
                    aria-label={t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
                    value={modelSort.column}
                    onChange={(e) =>
                      setModelSort((s) => ({ ...s, column: e.target.value as ModelSortColumn }))
                    }
                    className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                    style={{
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
                  >
                    <option value="name">
                      {t('ide.chat.models.colName', undefined, { defaultValue: 'Model' })}
                    </option>
                    <option value="context">
                      {t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' })}
                    </option>
                    <option value="cost">
                      {t('ide.chat.models.colUsageRate', undefined, { defaultValue: 'Usage rate' })}
                    </option>
                    <option value="cutoff">
                      {t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' })}
                    </option>
                    <option value="free">
                      {t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' })}
                    </option>
                    <option value="region">
                      {t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' })}
                    </option>
                  </select>
                  <Tooltip
                    content={t('ide.chat.modelSortDirection', undefined, {
                      defaultValue: 'Toggle sort direction',
                    })}
                    placement="top"
                  >
                    <button
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
                    const badges: Array<{ label: string; bg: string; fg: string }> = []
                    if (model.supportsVision)
                      badges.push({
                        label: 'vision',
                        bg: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
                        fg: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)',
                      })
                    if (model.supportsThinking)
                      badges.push({
                        label: 'thinking',
                        bg: isLight ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.18)',
                        fg: isLight ? 'rgb(126,34,206)' : 'rgb(192,132,252)',
                      })
                    if (model.webSearchToolType)
                      badges.push({
                        label: 'web search',
                        bg: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
                        fg: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)',
                      })
                    if (model.supportsPromptCaching)
                      badges.push({
                        label: 'caching',
                        bg: isLight ? 'rgba(202,138,4,0.12)' : 'rgba(234,179,8,0.18)',
                        fg: isLight ? 'rgb(161,98,7)' : 'rgb(250,204,21)',
                      })
                    if (model.fastPricing)
                      badges.push({
                        label: 'fast mode',
                        bg: isLight ? 'rgba(234,88,12,0.12)' : 'rgba(249,115,22,0.18)',
                        fg: isLight ? 'rgb(194,65,12)' : 'rgb(251,146,60)',
                      })
                    if (isDeprecated(model))
                      badges.push({
                        label: `deprecated ${model.deprecatedAt}`,
                        bg: isLight ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.18)',
                        fg: isLight ? 'rgb(180,83,9)' : 'rgb(251,191,36)',
                      })
                    // Region flag pill: shown when the model has a region CHOICE,
                    // or runs outside the default US region (a fixed flag).
                    const modelRegionOptions = availableModelRegions(model)
                    const modelRegion = effectiveModelRegion(model)
                    const showRegionPill = modelRegionOptions.length > 1 || modelRegion !== 'us'
                    const accent = PROVIDER_BRAND_COLORS[model.provider] ?? '#888'
                    // Free tier is clamped per mode (plan → deepseek-v4-pro,
                    // execute → deepseek-v4-flash); the unscoped picker keeps
                    // the single free-tier model. Custom (bring-your-own AI)
                    // models are never locked — the user pays their own
                    // provider directly. The lock REASON matters: 'paid' gets
                    // the Pro pill + upgrade card, while 'mode' (a model the
                    // free tier uses in a DIFFERENT mode, e.g. the execute
                    // clamp shown in the plan scope) must never claim "Pro".
                    const lockReason: FreeTierLockReason | null = modelPicker.mode
                      ? freeTierLockReason(
                          model.id,
                          modelPicker.mode,
                          isFreeTier,
                          AVAILABLE_MODELS,
                          FREE_TIER_MODEL,
                        )
                      : isFreeTier && model.id !== FREE_TIER_MODEL && model.provider !== 'custom'
                        ? 'paid'
                        : null
                    const locked = lockReason !== null
                    // For 'mode' locks: which mode the free tier actually uses
                    // this model in ('commit' stands for both aux jobs).
                    const usableMode =
                      lockReason === 'mode'
                        ? freeTierUsableMode(model.id, AVAILABLE_MODELS, FREE_TIER_MODEL)
                        : null
                    const freeInLabel =
                      usableMode === 'plan'
                        ? t('ide.chat.freeInPlan', undefined, { defaultValue: 'free in plan' })
                        : usableMode === 'execute'
                          ? t('ide.chat.freeInExecute', undefined, {
                              defaultValue: 'free in execute',
                            })
                          : t('ide.chat.freeInCommit', undefined, {
                              defaultValue: 'free in commit',
                            })
                    // Relative usage rate vs the cheapest available model — the
                    // unitless "how fast does this eat my allowance" figure
                    // shown INSTEAD of currency. Green ≤×5, yellow ≤×25, red
                    // above. Custom (bring-your-own AI) models have all-zero
                    // list prices and consume no allowance, so they show a
                    // neutral "your key" instead of a misleading ×1.
                    const isCustom = model.provider === 'custom'
                    // Priced at the model's EFFECTIVE region so flipping a
                    // region immediately re-rates the row (e.g. DeepSeek V4
                    // Pro: ×3 native-CN vs ×9 US-rehosted).
                    const usageRate = modelUsageRate(model, AVAILABLE_MODELS, modelRegion)
                    // Whether the rate above is currently inflated by a peak window.
                    const peakNow = modelPeakMultiplier(model, modelRegion)
                    const priceColor =
                      usageRate <= 5
                        ? isLight
                          ? 'rgb(22,163,74)'
                          : 'rgb(74,222,128)'
                        : usageRate <= 25
                          ? isLight
                            ? 'rgb(161,98,7)'
                            : 'rgb(250,204,21)'
                          : isLight
                            ? 'rgb(220,38,38)'
                            : 'rgb(248,113,113)'
                    return (
                      <Fragment key={model.id}>
                        {dividerBefore && (
                          <button
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
                        <button
                          type="button"
                          onClick={() => {
                            if (lockReason === 'paid') {
                              setModelPicker(null)
                              setInputValue('')
                              addSystemCard(
                                t(
                                  'ide.chat.modelUpgradeRequired',
                                  { model: model.label },
                                  {
                                    defaultValue: `${model.label} is available on a paid plan. Upgrade to access all models.`,
                                  },
                                ),
                                // Host owns the upgrade/sign-in button(s) (its routes/copy).
                                { action: buildUpgradeCta?.({}) ?? undefined },
                              )
                            } else if (lockReason === 'mode') {
                              // Free-usable in a DIFFERENT mode — a plain
                              // one-liner, never the paid-upgrade pitch.
                              setModelPicker(null)
                              setInputValue('')
                              addSystemCard(
                                usableMode === 'plan'
                                  ? t('ide.chat.modeOnlyPlan', undefined, {
                                      defaultValue:
                                        'On the free plan, this model is used in plan mode.',
                                    })
                                  : usableMode === 'execute'
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
                              void selectModel(model.id, model.label, modelPicker.mode)
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!locked)
                              (e.currentTarget as HTMLElement).style.background =
                                'rgba(128,128,128,0.15)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background =
                              idx === modelPicker.selectedIdx && !locked
                                ? 'rgba(128,128,128,0.1)'
                                : 'transparent'
                          }}
                          className={cm.w('full')}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '2px',
                            padding: '8px 12px 8px 15px',
                            border: 'none',
                            borderTop: '1px solid rgba(128,128,128,0.12)',
                            borderLeft: `3px solid ${accent}`,
                            cursor: locked ? 'default' : 'pointer',
                            color: 'inherit',
                            textAlign: 'left',
                            fontSize: '13px',
                            opacity: locked ? 0.45 : isDeprecatedRow ? 0.7 : 1,
                            background:
                              idx === modelPicker.selectedIdx && !locked
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
                                color: accent,
                                opacity: 0.85,
                                flexShrink: 0,
                              }}
                            >
                              {model.provider}
                            </span>
                            {model.id === pickerCurrentModelId && (
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
                                {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                              </span>
                            )}
                            {lockReason === 'paid' && (
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
                            {lockReason === 'mode' && (
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
                                {freeInLabel}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', opacity: 0.7 }}>
                            {model.description}
                          </span>
                          <span style={{ fontSize: '11px', opacity: 0.65 }}>
                            {formatTokenCount(model.contextWindow)} ctx ·{' '}
                            {formatTokenCount(model.maxOutputTokens)} out ·{' '}
                            {isCustom ? (
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
                                style={{ color: priceColor }}
                                title={t('ide.chat.models.usageRateHint', undefined, {
                                  defaultValue:
                                    'How fast this model uses your AI allowance, relative to the most economical model',
                                })}
                              >
                                {t(
                                  'ide.chat.models.usageRateValue',
                                  { rate: usageRate },
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
                            {!isCustom && modelHasPeakPricing(model, modelRegion) && (
                              <>
                                {' · '}
                                <span
                                  style={{
                                    color: peakNow > 1 ? priceColor : undefined,
                                    opacity: peakNow > 1 ? 1 : 0.8,
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
                                  {peakNow > 1
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
                          {(badges.length > 0 || showRegionPill) && (
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
                              {badges.map((b) => (
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
                              {/* Processing-region dropdown, anchored to the
                                  BOTTOM-RIGHT of the row (marginLeft auto +
                                  alignSelf flex-end on the badge line). Reads
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
                              {showRegionPill &&
                                (() => {
                                  const interactive = modelRegionOptions.length > 1
                                  const meta = MODEL_REGION_META[modelRegion]
                                  const regionLabel = t(
                                    `ide.chat.model.region.${modelRegion}`,
                                    undefined,
                                    {
                                      defaultValue: meta?.defaultLabel ?? modelRegion.toUpperCase(),
                                    },
                                  )
                                  const hint = interactive
                                    ? t(
                                        'ide.chat.model.regionHint',
                                        { region: regionLabel },
                                        {
                                          defaultValue:
                                            'Processed in: {{region}} — click to change',
                                        },
                                      )
                                    : t(
                                        'ide.chat.model.regionOnlyHint',
                                        { region: regionLabel },
                                        { defaultValue: 'Only hosted in: {{region}}' },
                                      )
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
                                        toggleRegionMenu(model.id, e.currentTarget as HTMLElement)
                                      }}
                                      onKeyDown={(e) => {
                                        if (!interactive) return
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.stopPropagation()
                                          e.preventDefault()
                                          toggleRegionMenu(model.id, e.currentTarget as HTMLElement)
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
                                          (e.currentTarget as HTMLElement).style.background =
                                            'rgba(128,128,128,0.25)'
                                      }}
                                      onMouseLeave={(e) => {
                                        ;(e.currentTarget as HTMLElement).style.background =
                                          menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent'
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '1px 4px',
                                        borderRadius: 4,
                                        background: menuOpen
                                          ? 'rgba(128,128,128,0.25)'
                                          : 'transparent',
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
                                        code={meta?.flagCode ?? modelRegion}
                                        height={14}
                                      />
                                    </span>
                                  )
                                  return (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        marginLeft: 'auto',
                                        alignSelf: 'flex-end',
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
                                          aria-label={t(
                                            'ide.chat.model.regionMenuLabel',
                                            undefined,
                                            { defaultValue: 'Processing region' },
                                          )}
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
                                            const rMeta = MODEL_REGION_META[r]
                                            const rLabel = t(
                                              `ide.chat.model.region.${r}`,
                                              undefined,
                                              {
                                                defaultValue:
                                                  rMeta?.defaultLabel ?? r.toUpperCase(),
                                              },
                                            )
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
                                                  if (!active) void setModelRegion(model.id, r)
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.stopPropagation()
                                                    e.preventDefault()
                                                    setRegionMenu(null)
                                                    if (!active) void setModelRegion(model.id, r)
                                                  }
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!active)
                                                    (
                                                      e.currentTarget as HTMLElement
                                                    ).style.background = 'rgba(128,128,128,0.15)'
                                                }}
                                                onMouseLeave={(e) => {
                                                  ;(
                                                    e.currentTarget as HTMLElement
                                                  ).style.background = active
                                                    ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                                                    : 'transparent'
                                                }}
                                                className={
                                                  active ? cm.fontWeight('medium') : undefined
                                                }
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
                                                  code={rMeta?.flagCode ?? r}
                                                  height={12}
                                                />
                                                <span>{rLabel}</span>
                                                <span
                                                  className={active ? undefined : cm.textMuted}
                                                  style={{ fontSize: '10px' }}
                                                >
                                                  (
                                                  {t(
                                                    'ide.chat.models.usageRateValue',
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
                            </span>
                          )}
                        </button>
                      </Fragment>
                    )
                  })}
                  {!showDeprecated && deprecatedModels.length > 0 && (
                    <button
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
                    ;(e.currentTarget as HTMLElement).style.background =
                      'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
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
                <select
                  data-mol-id="chat-effort-mode-select"
                  aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                  value={effortPicker.mode}
                  onChange={(e) => {
                    const v = e.target.value as EffortMode
                    // Reset the highlighted row — the level list changes with
                    // the mode's model.
                    setEffortPicker((p) => (p ? { mode: v, selectedIdx: -1 } : p))
                  }}
                  className={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                  style={{
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
                >
                  {effortPickerModeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
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
                effortPickerVisibleOptions.map((option, idx) => (
                  <button
                    key={option.value}
                    type="button"
                    data-mol-id={`chat-effort-level-${option.value}`}
                    onClick={() =>
                      void applyEffortLevel(effortPicker.mode, option.value, effortPickerModel)
                    }
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background =
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
                  ? t(`ide.chat.soundMode.${allModes[0]}`, undefined, {
                      defaultValue: SOUND_MODE_LABELS[allModes[0]],
                    })
                  : t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })
                return (
                  <button
                    type="button"
                    onClick={() => void cycleSoundMode('all')}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background =
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
                    key={eventType}
                    type="button"
                    onClick={() => void cycleSoundMode(eventType)}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background =
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
                      <span>
                        {t(`ide.chat.soundEvent.${eventType}`, undefined, {
                          defaultValue: SOUND_EVENT_LABELS[eventType],
                        })}
                      </span>
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
                        {t(`ide.chat.soundMode.${mode}`, undefined, {
                          defaultValue: SOUND_MODE_LABELS[mode],
                        })}
                      </span>
                    </div>
                    <div
                      className={cm.textMuted}
                      style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}
                    >
                      {t(
                        `ide.chat.soundEventDesc.${eventType}`,
                        { agentName },
                        {
                          defaultValue: SOUND_EVENT_DESCRIPTIONS[eventType],
                        },
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Panel overlay popup (/skills, /scripts, /settings) — a closeable popup
            above the composer, mirroring the model + sounds picker shell. A thin
            header bar carries the title (left) + the ✕ (right) — NOT absolutely
            positioned over the card, so it never overlaps the card's own top-right
            actions (New skill / New script). The card mounts `embedded` in the
            scrollable body below, rendering transparent so the overlay's `cm.surface`
            is the single clean background (no nested gray panel). Esc also closes. */}
        {panelOverlay && (
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
            // Esc closes it even when focus is inside the card's own search input
            // (the textarea's native keydown listener only fires while it is focused).
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setPanelOverlay(null)
              }
            }}
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
                {panelOverlay === 'skills'
                  ? t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })
                  : panelOverlay === 'scripts'
                    ? t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })
                    : t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })}
              </span>
              <button
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
                  defaultsExplicit={defaultSkillsExplicitRef.current}
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
            </div>
          </div>
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
                      key={entry.name}
                      type="button"
                      onClick={() => selectFileEntry(entry)}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background =
                          'rgba(128,128,128,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background =
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
                        autoFocus
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
                        <button
                          type="button"
                          onClick={() => setEditingQueuedId(null)}
                          className={cm.textSize('xs')}
                          style={{
                            padding: '4px 12px',
                            border: `1px solid ${isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '4px',
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            ...(isCoarse ? { minHeight: 32 } : {}),
                          }}
                        >
                          {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = editingQueuedText.trim()
                            if (trimmed) editQueuedMessage(qm.id, trimmed)
                            else deleteQueuedMessage(qm.id)
                            setEditingQueuedId(null)
                          }}
                          className={cm.textSize('xs')}
                          style={{
                            padding: '4px 12px',
                            border: `1px solid ${isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '4px',
                            background: 'rgba(128,128,128,0.1)',
                            color: 'inherit',
                            cursor: 'pointer',
                            ...(isCoarse ? { minHeight: 32 } : {}),
                          }}
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
                          color: isLight ? 'rgb(185,28,28)' : 'rgb(248,113,113)',
                          opacity: 0.6,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'opacity 100ms, background 100ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.background = 'rgba(220,38,38,0.12)'
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
                            color: isLight ? 'rgb(21,128,61)' : 'rgb(74,222,128)',
                            opacity: 0.7,
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'opacity 100ms, background 100ms',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.background = 'rgba(34,197,94,0.14)'
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

        {/* Commit bar — anchored above the textarea (hidden when a popup menu is open).
            Hidden entirely for a read-only VIEWER: committing/reverting is editor work,
            so the bar is a dead control for them. */}
        {canEdit !== false &&
          pendingFiles != null &&
          pendingFiles.length > 0 &&
          !commandMenu &&
          !modelPicker &&
          !effortPicker &&
          !panelOverlay && (
            <div
              style={{
                borderTop: '1px solid rgba(128,128,128,0.15)',
                // Equal top/right/bottom (8px) so the commit button — flush to the
                // right edge via the row's space-between — has the same gap on its
                // top, right, and bottom (P5-05). Left stays 10px so the chevron +
                // "N uncommitted files" text keep their indent. The green
                // AutoCommitBadge (inline) shares this slot + box model, so it
                // inherits the identical margins and sits in the same spot.
                padding: '8px 8px 8px 10px',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCommitBarExpanded((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setCommitBarExpanded((v) => !v)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    style={{
                      transform: commitBarExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 120ms',
                      opacity: 0.5,
                    }}
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                    {commitState?.status === 'committed'
                      ? stripCommitCoauthorTrailer(commitState.message ?? '')
                      : commitState?.status === 'error'
                        ? t('ide.chat.commitFailed')
                        : t(
                            'ide.chat.uncommittedFileCount',
                            { count: pendingFiles.length },
                            { defaultValue: '{{count}} uncommitted files' },
                          )}
                  </span>
                </div>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          if (commitBusy) return
                          handleCommit()
                        }}
                        disabled={commitBusy}
                        onMouseEnter={(e) => {
                          if (!commitBusy) {
                            e.currentTarget.style.background = 'rgba(64,112,224,0.3)'
                            e.currentTarget.style.borderColor = 'rgba(64,112,224,0.65)'
                            e.currentTarget.style.color = '#6090f0'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(64,112,224,0.2)'
                          e.currentTarget.style.borderColor = 'rgba(64,112,224,0.4)'
                          e.currentTarget.style.color = '#4070e0'
                        }}
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          // Touch floor for this inline bar action (36px, matching
                          // the notice-card buttons).
                          ...(isCoarse ? { minHeight: 36 } : {}),
                          borderRadius: 6,
                          border: '1px solid rgba(64,112,224,0.4)',
                          background: 'rgba(64,112,224,0.2)',
                          color: '#4070e0',
                          cursor: commitBusy ? 'not-allowed' : 'pointer',
                          opacity: commitBusy ? 0.5 : 1,
                          transition: 'background 100ms, border-color 100ms, color 100ms',
                        }}
                      >
                        {commitState?.status === 'committing'
                          ? t('ide.chat.committing')
                          : t('ide.chat.commit')}
                      </button>
                    )
                  })()
                )}
              </div>
              {commitBarExpanded && (
                <div style={{ marginTop: 4, paddingLeft: 16, maxHeight: 200, overflowY: 'auto' }}>
                  {pendingFiles.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => onFileDiff?.(f.path)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#6090f0'
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
                                    .catch(() => {
                                      /* ignore */
                                    })
                                }
                              })
                              .catch(() => {
                                /* ignore */
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
              )}
            </div>
          )}

        {/* Input container — matches user message card style. data-mol-viewer
            marks view-only mode for HOST CSS: molecule-dev's composer ring
            (index.css :has(> textarea[data-mol-chat-input])) neutralizes the
            container's own border-color with !important and paints a ::before
            ring, so the gold view-mode border must be applied to the RING via
            this attribute — the inline border below only serves ring-less hosts. */}
        <div
          className={cm.surfaceSecondary}
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
            defaultValue={inputRef.current as string}
            autoComplete="off"
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder={
              canEdit === false
                ? t('ide.chat.placeholderViewer', undefined, {
                    defaultValue: 'Message your team',
                  })
                : t('ide.chat.placeholder')
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
                type="button"
                onClick={() => {
                  const newMode = mode === 'plan' ? 'execute' : 'plan'
                  setMode(newMode)
                  http
                    .patch(`/projects/${projectId}/chat-mode`, { mode: newMode, conversationId })
                    .catch(() => setMode(mode))
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
                type="button"
                data-mol-id="chat-fast-mode-toggle"
                disabled={!canEdit}
                onClick={() => {
                  const next = !fastMode
                  setFastMode(next)
                  http
                    .patch(`/projects/${projectId}/chat-mode`, { fastMode: next, conversationId })
                    .catch(() => setFastMode(fastMode))
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
                type="button"
                data-mol-id="chat-mic-button"
                onClick={toggleVoice}
                title={t('ide.chat.voice', undefined, {
                  defaultValue: isListening ? 'Stop dictation' : 'Dictate',
                })}
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
                  onClick: () => {
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
                  },
                },
                {
                  sym: 'slash',
                  nudgeY: 1,
                  size: 15,
                  title: t('ide.chat.slashCommands', undefined, {
                    defaultValue: 'Slash commands',
                  }),
                  onClick: () => {
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
                    setCommandMenu({ selectedIdx: -1, showAll: cur !== '' && cur !== '/' })
                  },
                },
              ] as const
            )
              // Viewers keep the / shortcut (viewer-safe commands + /teamsay) but not @ —
              // file mentions only feed Synthase turns.
              .filter(({ sym }) => canEdit !== false || sym !== '@')
              .map(({ sym, nudgeY, size: fontSize, title, onClick }) => (
                <button
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
            {/* Context usage ring — hidden for viewers (they spend no context) */}
            {canEdit !== false &&
              contextUsage &&
              (() => {
                // The ring represents usage toward the auto-compaction threshold,
                // not the raw context window. 100% = compaction will trigger.
                const RESERVE = 0.15
                const COMPACT_THRESHOLD = 0.75
                const budget = Math.floor(contextUsage.contextWindow * (1 - RESERVE))
                const compactAt = Math.floor(budget * COMPACT_THRESHOLD)
                const ratio = Math.min(contextUsage.inputTokens / compactAt, 1)
                const thresholdRatio = COMPACT_THRESHOLD
                const size = 18
                const stroke = 2
                const r = (size - stroke) / 2
                const c = 2 * Math.PI * r
                const dashOffset = c * (1 - ratio)
                const color =
                  ratio < 0.5
                    ? isLight
                      ? 'rgb(22,163,74)'
                      : 'rgb(74,222,128)'
                    : ratio < thresholdRatio
                      ? isLight
                        ? 'rgb(161,98,7)'
                        : 'rgb(250,204,21)'
                      : ratio < 0.9
                        ? isLight
                          ? 'rgb(194,65,12)'
                          : 'rgb(251,146,60)'
                        : isLight
                          ? 'rgb(220,38,38)'
                          : 'rgb(248,113,113)'
                const pct = Math.round(ratio * 100)
                const label = `${formatTokenCount(contextUsage.inputTokens)} / ${formatTokenCount(compactAt)} tokens (${pct}%) — auto-compacts at 100%`
                return (
                  <span
                    title={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: 'auto',
                      opacity: 0.7,
                      cursor: 'default',
                    }}
                    // Hover-reveal is meaningless without hover: on coarse pointers
                    // the % stays visible (rendered below), so no handlers to fight.
                    onMouseEnter={
                      isCoarse
                        ? undefined
                        : (e) => {
                            const pctEl =
                              e.currentTarget.querySelector<HTMLElement>('[data-ctx-pct]')
                            if (pctEl) {
                              pctEl.style.opacity = '1'
                              pctEl.style.width = 'auto'
                            }
                          }
                    }
                    onMouseLeave={
                      isCoarse
                        ? undefined
                        : (e) => {
                            const pctEl =
                              e.currentTarget.querySelector<HTMLElement>('[data-ctx-pct]')
                            if (pctEl) {
                              pctEl.style.opacity = '0'
                              pctEl.style.width = '0'
                            }
                          }
                    }
                  >
                    <span
                      data-ctx-pct=""
                      style={{
                        color,
                        fontSize: '10px',
                        lineHeight: 1,
                        opacity: isCoarse ? 1 : 0,
                        width: isCoarse ? 'auto' : 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        transition: 'opacity 150ms',
                      }}
                    >
                      {pct}%
                    </span>
                    <svg
                      width={size}
                      height={size}
                      viewBox={`0 0 ${size} ${size}`}
                      style={{ display: 'block', transform: 'rotate(-90deg)', flexShrink: 0 }}
                    >
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={stroke}
                        opacity={0.15}
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={`${c}`}
                        strokeDashoffset={`${dashOffset}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                )
              })()}
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
                  onClick={handleAbort}
                  title={t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(248,81,73,0.3)'
                    e.currentTarget.style.borderColor = 'rgba(248,81,73,0.65)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(248,81,73,0.2)'
                    e.currentTarget.style.borderColor = 'rgba(248,81,73,0.4)'
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(248,81,73,0.4)',
                    background: 'rgba(248,81,73,0.2)',
                    color: '#f85149',
                    cursor: 'pointer',
                    transition: 'background 100ms, border-color 100ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Touch hit-area floor for the composer's action buttons.
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
                onClick={() => void handleSubmit()}
                title={t('ide.chat.send', undefined, { defaultValue: 'Send' })}
                disabled={!hasInput && attachedFiles.length === 0}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'rgba(96,160,240,0.3)'
                    e.currentTarget.style.borderColor = 'rgba(96,160,240,0.7)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(96,160,240,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(96,160,240,0.5)'
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(96,160,240,0.5)',
                  background: 'rgba(96,160,240,0.2)',
                  color: '#6aa3f0',
                  cursor: !hasInput && attachedFiles.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: !hasInput && attachedFiles.length === 0 ? 0.5 : 1,
                  transition: 'background 100ms, border-color 100ms, color 100ms',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Touch hit-area floor for the composer's action buttons.
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
          onClose={() => setReportModal(null)}
          onSubmitted={(result: ReportResult) => {
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
          }}
        />
      )}

      {/* ── Share-link modal (/share, header share button) ── */}
      {shareModal && (
        <ShareModal
          projectId={projectId}
          initialRole={shareModal.role}
          canManage={shareAllowed}
          onClose={() => setShareModal(null)}
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
        />
      )}
    </div>
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
  canShare,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  userAvatar,
  agentName,
  productName,
  version,
  extraCommands,
  feedbackUrl,
  className,
}: ChatPanelProps): JSX.Element {
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

  const storageKey = `mol-chat-conv:${projectId}`
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
      const res = await http.get<{ conversations: ConversationSummary[] }>(
        `/projects/${projectId}/conversations`,
      )
      setConversations(res.data.conversations)
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
            type="button"
            onClick={handleToggleDropdown}
            className={cm.cn(cm.textSize('xs'), cm.textMuted)}
            onMouseEnter={(e) => {
              const s = (e.currentTarget as HTMLElement).querySelector('span')
              if (s) (s as HTMLElement).style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              const s = (e.currentTarget as HTMLElement).querySelector('span')
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
              {activeConv?.preview ?? 'Chat history'}
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
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder={t('ide.chat.searchConversations', undefined, {
                    defaultValue: 'Search conversations…',
                  })}
                  autoFocus
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
                  No conversations yet
                </div>
              )}
              {filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cm.cn(
                    cm.w('full'),
                    conv.id === activeConversationId ? cm.surfaceSecondary : '',
                  )}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = ''
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
                    {conv.preview ?? 'New conversation'}
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
        canShare={shareAllowed}
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
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

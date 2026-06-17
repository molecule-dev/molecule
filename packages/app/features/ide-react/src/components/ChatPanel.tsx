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

import type { ChatMessage } from '@molecule/app-ai-chat'
import {
  formatTokenCount,
  isDeprecated,
  partitionByDeprecation,
  PROVIDER_BRAND_COLORS,
} from '@molecule/app-ai-models'
import { t } from '@molecule/app-i18n'
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

import type {
  ChatEventCardAction,
  ChatEventCardCode,
  ChatEventCardSegment,
} from '../customEventCards.js'
import { getCustomEventCardFactory } from '../customEventCards.js'
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
} from './chat-autocommit-utilities.js'
import type { CommandId } from './chat-commands.js'
import { COMMAND_CATEGORIES, COMMANDS } from './chat-commands.js'
import { stripCommitCoauthorTrailer } from './chat-commit-utilities.js'
import type { EffortLevel } from './chat-effort-utilities.js'
import {
  DEFAULT_EFFORT_LEVEL,
  EFFORT_LEVEL_LABELS,
  effortLevelsForModel,
  isEffortLevel,
  modelsSupportingEffort,
  parseEffortCommand,
} from './chat-effort-utilities.js'
import { buildHelpText } from './chat-help-utilities.js'
import type { ModelMode } from './chat-model-mode-utilities.js'
import {
  isModeModelLocked,
  modeSettingKey,
  parseModelModeCommand,
  resolveModeModel,
} from './chat-model-mode-utilities.js'
import type { ModelSortColumn, SortDirection } from './chat-models-utilities.js'
import { sortModels } from './chat-models-utilities.js'
import type { ReportResult } from './chat-report-utilities.js'
import { formatReportConfirmation, parseReportCommand } from './chat-report-utilities.js'
import type { ScriptInfo, ScriptRunResult } from './chat-scripts-utilities.js'
import {
  findScriptByName,
  formatRunOutput,
  parseRunCommand,
  parseScriptsCommand,
  runSucceeded,
} from './chat-scripts-utilities.js'
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
  recentUserText,
  suggestRelevantSkills,
} from './chat-skills-utilities.js'
import { estimateStreamTokens } from './chat-stream-utilities.js'
import {
  ENTRY_TIP,
  pickIdleTip,
  shouldShowIdleTip,
  TIP_IDLE_MS,
  TIP_MIN_MESSAGES,
} from './chat-tips-utilities.js'
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

interface SystemCard {
  id: string
  text: string
  timestamp: number
  action?: ChatEventCardAction | ChatEventCardAction[]
  /**
   * Composable inline body for a `tone` (tip) card — an ordered list of segments
   * (plain strings + inline link actions) rendered in sequence, used INSTEAD of
   * `text` + appended `action`s so a link can sit mid-sentence (see
   * {@link ChatEventCard.content}). `text` stays the plain-text fallback.
   */
  content?: ChatEventCardSegment[]
  /**
   * Optional rich-content variant rendered in place of the plain text:
   * `'settings'` → the `/settings` view; `'skills'` → the `/skills` browser;
   * `'scripts'` → the `/scripts` browser; `'help'` → the `/help` high-level guide
   * card. Default (undefined) is plain text. For `'help'`, `text` still carries
   * the {@link buildHelpText} plain-text fallback.
   */
  variant?: 'settings' | 'skills' | 'scripts' | 'help'
  /** Seed query for the `'skills'`/`'scripts'` variants (from `/skills <query>` or `/scripts <query>`). */
  query?: string
  /**
   * For the `'skills'` variant: mount the card with its inline "New skill" form
   * already open. (Reserved — kept for callers that want to open the form
   * directly; the standalone `/newskill` command was removed in favor of the
   * `/skills` browser's own "New skill" button.)
   */
  skillsCreate?: boolean
  /**
   * When true, render with the emphasized (highlighted box) style instead of the
   * muted inline style — e.g. a host-supplied sign-up / upgrade nudge. The caller
   * opts in explicitly; the styling is never inferred from the card's route or copy.
   */
  emphasized?: boolean
  /**
   * Optional tip-style tone: `'info'` (blue) or `'gold'`. When set, the card renders
   * in the dismissable tip-box style (rounded, tinted, with a lightbulb glyph) in that
   * tone, and any actions render as inline underlined links rather than buttons — for
   * low-key, honest notices (e.g. a "what powers this" model note). Mutually exclusive
   * with `emphasized` in practice; the caller opts in.
   */
  tone?: 'info' | 'gold'
}

/**
 * Returns the first action carrying an `href` from a single action or an array of
 * actions (or undefined). Used to feed host-supplied upgrade CTAs into the
 * single-link {@link ResourceLimitBanner}.
 * @param action - One action, an array of actions, or null/undefined.
 * @returns The first action with an `href`, or undefined.
 */
function firstLinkAction(
  action: ChatEventCardAction | ChatEventCardAction[] | null | undefined,
): ChatEventCardAction | undefined {
  if (!action) return undefined
  const list = Array.isArray(action) ? action : [action]
  return list.find((a) => !!a.href)
}

/** A dismissable auto-tip entry in the chat timeline. */
interface TipCardEntry {
  id: string
  text: string
  /** Numeric timestamp for timeline ordering. */
  timestamp: number
}

/** An inline activity card entry in the chat timeline (a captured side effect). */
interface ActivityCardEntry {
  id: string
  activity: Activity
  /** Numeric timestamp for timeline ordering (derived from the activity's ISO timestamp). */
  timestamp: number
}

interface ModelPicker {
  selectedIdx: number
  /**
   * When set, the picker is scoped to a conversation mode (`/model --plan` /
   * `--execute`): selections persist to `settings.planModel` / `executeModel`
   * and the free-tier clamp is the mode's clamped model. Unset = the legacy
   * single `chatModel`.
   */
  mode?: ModelMode
}

// ---------------------------------------------------------------------------
// Sound types & playTone
// ---------------------------------------------------------------------------

/** Possible modes for each notification sound event. */
type SoundMode = 'off' | 'whenNotFocused' | 'always'

/** All stream event types that can trigger a notification sound. */
const SOUND_EVENTS = [
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

const DEFAULT_SOUNDS_CONFIG: SoundsConfig = {
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
 */
function playTone(): void {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
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

// estimateStreamTokens lives in ./chat-stream-utilities.js — it runs on every
// stream flush, so its per-tool-input length is cached there to stay O(1) per call
// (re-stringifying every write_file's full content per flush was an O(n²) freeze).

/**
 * Collapsible block for displaying AI thinking/reasoning content.
 * @param root0 - Component props.
 * @param root0.content - The raw thinking text to render.
 * @param root0.durationMs - How long the thinking took in milliseconds.
 * @param root0.isStreaming - Whether the thinking is still in progress.
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
 * Renders user message content with a max height and a chevron-down expand button
 * when the content overflows. Similar to the compaction summary expand pattern.
 * @param root0 - Component props.
 * @param root0.content - The message text.
 * @param root0.isLight - Whether the current theme is light mode.
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
 * @param root0 - Component props.
 * @param root0.status - Whether lint passed or found errors.
 * @param root0.output - Lint error output (only present on error).
 * @param root0.workspaces - Which workspaces were checked.
 * @param root0.categories - Which verification categories were checked (type, lint, runtime).
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
// ResourceLimitBanner — upgrade prompt when sandbox runs out of memory
// ---------------------------------------------------------------------------

/**
 * Inline banner shown when the sandbox runs out of memory, prompting the user to upgrade.
 * @param root0 - Component props.
 * @param root0.message - The resource limit message.
 * @param root0.ctaLabel - Label for the call-to-action button.
 * @param root0.ctaHref - Link target for the call-to-action button.
 * @returns The rendered upgrade banner element.
 */
function ResourceLimitBanner({
  message,
  ctaLabel,
  ctaHref,
}: {
  message: string
  ctaLabel?: string
  ctaHref?: string
}): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      style={{
        margin: '6px 0',
        padding: '10px 14px',
        borderRadius: 6,
        border: '1px solid rgba(234,179,8,0.4)',
        background: 'rgba(234,179,8,0.08)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="#d4a017"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div style={{ flex: 1 }}>
        <span className={cm.textSize('xs')} style={{ display: 'block' }}>
          {message}
        </span>
        {/* The CTA route is owned by the host app (passed as `ctaHref`); the shared
            package hardcodes none. Render the button only when the host supplies a link. */}
        {ctaHref && (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'opacity 100ms',
              fontFamily: 'inherit',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'
            }}
          >
            {ctaLabel ?? t('ide.chat.viewPlans', undefined, { defaultValue: 'View plans' })}
          </a>
        )}
      </div>
    </div>
  )
}

// CommitCardItem — expandable tool-call-style card for commits
// ---------------------------------------------------------------------------

/**
 * Expandable tool-call-style card displaying a commit with its files.
 * @param root0 - Component props.
 * @param root0.card - The commit card data including message, files, and status.
 * @param root0.onRevert - Callback to revert a commit by hash. Returns the new commit hash on success.
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
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    flexShrink: 0,
                    cursor: isReverting ? 'wait' : 'pointer',
                    opacity: isReverting ? 0.3 : isHovered ? 0.6 : 0,
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
// MoleculeAvatar — the agent's molecule logo, shown beside a message that was
// sent automatically on the user's behalf (C2), so it's obvious the agent sent
// it rather than the user. Mirrors UserAvatar's icon-fallback rounded square,
// swapping the `user` glyph for the molecule `logo-mark` tinted with the success accent.
// ---------------------------------------------------------------------------

/**
 * Renders the molecule logo glyph in a circle, the avatar for auto-sent messages.
 * @param root0 - Props.
 * @param root0.size - Diameter of the avatar in pixels (default 20).
 * @returns The molecule-logo avatar.
 */
function MoleculeAvatar({ size = 20 }: { size?: number }): JSX.Element {
  const cm = getClassMap()
  const label = t('ide.chat.molecule', undefined, { defaultValue: 'Molecule' })
  return (
    <span
      className={cm.surfaceSecondary}
      data-mol-id="chat-automatic-avatar"
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        // The accent tint is a property ClassMap doesn't manage here, so it's
        // safe to set inline; it ties the avatar to the green auto-sent border.
        color: 'var(--mol-color-success, #16a34a)',
      }}
    >
      <Icon name="logo-mark" size={Math.round(size * 0.7)} aria-hidden="true" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// MessageItem — memo'd to avoid re-rendering all messages when one changes
// ---------------------------------------------------------------------------

interface MessageItemProps {
  msg: ChatMessage
  editingQueuedId: string | null
  editingQueuedText: string
  setEditingQueuedId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingQueuedText: React.Dispatch<React.SetStateAction<string>>
  editQueuedMessage: (id: string, content: string) => void
  deleteQueuedMessage: (id: string) => void
  sendMessage: (msg: string) => void
  handleAskUserResponse: (response: string) => void
  isLoading: boolean
  /**
   * Transient background-phase label (e.g. "Type-checking the API") shown in the
   * streaming spinner in place of the generic rotating messages; null when idle.
   */
  streamingStatus: string | null
  undoneTcIds: Set<string>
  handleUndoToggle: (tcId: string, undone: boolean) => void
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  handleFileRevert: (path: string, content: string) => Promise<void>
  setInputAndCursorEnd: (val: string) => void
  setModelPicker: React.Dispatch<React.SetStateAction<ModelPicker | null>>
  /** Signed-in user's avatar shown beside their own messages (SOC1); icon fallback when absent/unsafe. */
  userAvatar?: string | null
  /** When set, the user avatar becomes clickable and fires this to open the user's profile (C5). */
  onAvatarClick?: () => void
  /** Discovery phase — gives consecutive question/answer cards roomier, uncollapsed spacing (B3). */
  discovery?: boolean
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
    editingQueuedId,
    editingQueuedText,
    setEditingQueuedId,
    setEditingQueuedText,
    editQueuedMessage,
    deleteQueuedMessage,
    sendMessage,
    handleAskUserResponse,
    isLoading,
    streamingStatus,
    undoneTcIds,
    handleUndoToggle,
    onFileOpen,
    onFileDoubleClick,
    onFileDiff,
    handleFileRevert,
    setInputAndCursorEnd,
    setModelPicker,
    userAvatar,
    onAvatarClick,
    discovery,
  } = props

  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const borderClr = isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'

  // A message sent automatically on the user's behalf (e.g. an auto-fix prompt):
  // it has role 'user' but must NOT look like the user typed it (C2).
  const isAutomatic = msg.role === 'user' && !!msg.automatic
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
      {isUser || isAutomatic ? (
        <div
          className={cm.cn(cm.surfaceSecondary, cm.textSize('sm'))}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            // Consistent spacing all around the avatar — equal gap to the accent
            // border (paddingLeft), the top (paddingTop) and the text (gap).
            gap: '10px',
            minWidth: 0,
            borderRadius: '4px',
            // Auto-sent on the user's behalf → a solid green (success) left border so
            // it's obvious the agent sent it, not the user. A real user message gets
            // the molecule brand's ANIMATED gradient stripe instead — drawn by the
            // `::before` injected via USER_ACCENT_STYLE, gated on the `data-mol-id`
            // below — so no inline border here for the user case.
            ...(isAutomatic ? { borderLeft: '2px solid var(--mol-color-success, #16a34a)' } : {}),
            // Keep the avatar's gap to the accent equal (10px) on both: the auto-sent
            // 2px border + 10px padding, vs the user's 2px gradient stripe + 12px.
            paddingLeft: isAutomatic ? '10px' : '12px',
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingRight: '10px',
          }}
          data-mol-id={isAutomatic ? 'chat-automatic-message' : 'chat-user-message'}
        >
          {/* Avatar sits INSIDE the card, just right of the accent border, so it
              reads as part of the message. User messages show the user's real
              profile avatar (SOC1); an auto-sent message shows the molecule logo
              so it's unmistakably from the agent, not the user (C2). */}
          {isAutomatic ? (
            <MoleculeAvatar size={36} />
          ) : (
            <UserAvatar
              userAvatar={msg.author?.avatar ?? userAvatar}
              size={36}
              onClick={onAvatarClick}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, marginTop: 1 }}>
            {isAutomatic ? (
              <div
                className={cm.cn(cm.textSize('xs'))}
                style={{
                  color: 'var(--mol-color-success, #16a34a)',
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                {t('ide.chat.automatic', undefined, { defaultValue: 'Sent automatically' })}
              </div>
            ) : (
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
            {msg.queued && (
              <div style={{ marginTop: 6 }}>
                {editingQueuedId === msg.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea
                      autoFocus
                      defaultValue={editingQueuedText}
                      onChange={(e) => setEditingQueuedText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          const trimmed = editingQueuedText.trim()
                          if (trimmed) editQueuedMessage(msg.id, trimmed)
                          else deleteQueuedMessage(msg.id)
                          setEditingQueuedId(null)
                        }
                        if (e.key === 'Escape') setEditingQueuedId(null)
                      }}
                      className={cm.cn(cm.surface, cm.textSize('sm'))}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 10px',
                        border: `1px solid ${borderClr}`,
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
                          border: `1px solid ${borderClr}`,
                          borderRadius: '4px',
                          background: 'transparent',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = editingQueuedText.trim()
                          if (trimmed) editQueuedMessage(msg.id, trimmed)
                          else deleteQueuedMessage(msg.id)
                          setEditingQueuedId(null)
                        }}
                        className={cm.textSize('xs')}
                        style={{
                          padding: '4px 12px',
                          border: `1px solid ${borderClr}`,
                          borderRadius: '4px',
                          background: 'rgba(128,128,128,0.1)',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.save', undefined, { defaultValue: 'Save' })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 6,
                      paddingRight: 4,
                    }}
                  >
                    <span
                      className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                      style={{ fontStyle: 'italic', marginRight: 'auto' }}
                    >
                      {t('ide.chat.queued', undefined, { defaultValue: 'Queued' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQueuedId(msg.id)
                        setEditingQueuedText(msg.content)
                      }}
                      className={cm.textSize('xs')}
                      style={{
                        padding: '3px 10px',
                        border: `1px solid ${borderClr}`,
                        borderRadius: '4px',
                        background: 'rgba(128,128,128,0.1)',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(128,128,128,0.1)'
                      }}
                    >
                      {t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQueuedMessage(msg.id)}
                      className={cm.textSize('xs')}
                      style={{
                        padding: '3px 10px',
                        border: '1px solid rgba(220,38,38,0.3)',
                        borderRadius: '4px',
                        background: 'rgba(220,38,38,0.08)',
                        color: isLight ? 'rgb(185,28,28)' : 'rgb(248,113,113)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(220,38,38,0.18)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(220,38,38,0.08)'
                      }}
                    >
                      {t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' })}
                    </button>
                    {!isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          const content = msg.content
                          deleteQueuedMessage(msg.id)
                          sendMessage(content)
                        }}
                        className={cm.textSize('xs')}
                        style={{
                          padding: '3px 10px',
                          border: '1px solid rgba(34,197,94,0.4)',
                          borderRadius: '4px',
                          background: 'rgba(34,197,94,0.12)',
                          color: isLight ? 'rgb(21,128,61)' : 'rgb(74,222,128)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(34,197,94,0.22)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(34,197,94,0.12)'
                        }}
                      >
                        {t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {msg.isStreaming &&
            (!msg.blocks || msg.blocks.every((b) => (b as { type: string }).type === 'thinking')) &&
            !msg.content && (
              <StreamingIndicator
                label={streamingStatus ?? streamingActivityLabel(msg)}
                tokens={estimateStreamTokens(msg)}
                startedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
              />
            )}

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
                  <ResourceLimitBanner key={`resource-limit-${bi}`} message={rlBlock.message} />
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
                    onFileRevert={handleFileRevert}
                    onAskUserResponse={handleAskUserResponse}
                  />
                  {isLast && msg.isStreaming && (
                    <StreamingIndicator
                      label={streamingStatus ?? streamingActivityLabel(msg)}
                      tokens={estimateStreamTokens(msg)}
                      startedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
                    />
                  )}
                </div>
              )
            })
          ) : msg.content ? (
            <MarkdownContent
              text={msg.content}
              isStreaming={msg.isStreaming}
              statusLabel={msg.isStreaming ? streamingStatus : undefined}
              statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
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
                onFileRevert={handleFileRevert}
                onAskUserResponse={handleAskUserResponse}
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
                    setModelPicker({ selectedIdx: -1 })
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

interface ChatInnerProps {
  projectId: string
  endpoint: string
  initialMessage?: string
  onInitialMessageSent?: () => void
  isPro?: boolean
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
  /** Called when a user avatar in the chat timeline is clicked — see {@link ChatPanelProps.onProfileClick}. */
  onProfileClick?: ChatPanelProps['onProfileClick']
  /** Called on the `ready_to_build` stream event — discovery is done; boot the sandbox. */
  onReadyToBuild?: () => void
  /** True after the plan streams but while the sandbox is still booting (pre-kickoff) — drives the chat "waiting for environment" indicator. */
  awaitingSandboxBoot?: boolean
  /** Called on the `client_action` stream event — the agent wants a preview reload/navigate or a file opened. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done/error — host keeps the boot view up until the during-boot plan stream completes. */
  onTurnComplete?: () => void
  /** Changing this value submits the current input draft (used by the prompt→chat morph). */
  autoSubmitSignal?: number
  /** Changing this value opens the `/settings` view (used by the header gear button). */
  openSettingsSignal?: number
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
  /** Command-menu "Report a problem" URL — see {@link ChatPanelProps.feedbackUrl}. */
  feedbackUrl?: string
}

/**
 * Inner chat component that owns useChat state, message rendering, and input handling.
 * @param root0 - Component props.
 * @param root0.projectId - The project ID for the chat session.
 * @param root0.endpoint - The chat API endpoint URL.
 * @param root0.initialMessage - Optional message to auto-send on mount.
 * @param root0.onInitialMessageSent - Callback fired after the initial message is sent.
 * @param root0.isPro - Whether the current user has a Pro plan.
 * @param root0.buildUpgradeCta - Host-supplied builder for upgrade/sign-in CTA buttons.
 * @param root0.buildHelpUpgradeSection - Host-supplied builder for the `/help` upgrade section.
 * @param root0.activeFile - Path of the currently focused file in the editor.
 * @param root0.openTabs - Paths of all open editor tabs.
 * @param root0.onFileOpen - Callback to preview a file in the editor.
 * @param root0.onFileDoubleClick - Callback to pin a file tab in the editor.
 * @param root0.onFileDiff - Callback to open a side-by-side diff view.
 * @param root0.onFileRevert - Callback to revert a file to previous content.
 * @param root0.onFileChange - Callback when a file's content changes from AI edits.
 * @param root0.onFileDeleted - Callback fired when a file is deleted.
 * @param root0.onCommit - Callback fired after a successful commit.
 * @param root0.onConversationId - Callback when the conversation ID is assigned.
 * @param root0.onActivityClick - Callback to open the Activity panel filtered to a clicked activity card.
 * @param root0.onReadyToBuild - Callback fired on the ready_to_build stream event to boot the sandbox.
 * @param root0.onClientAction - Callback fired on the client_action stream event (reload/navigate preview, open file).
 * @param root0.onTurnComplete - Callback fired on each stream done/error; host uses it to keep the boot view up until the during-boot plan stream completes.
 * @param root0.autoSubmitSignal - Changing this submits the current input draft (prompt→chat morph).
 * @param root0.openSettingsSignal - Changing this opens the /settings view (header gear button).
 * @param root0.openReportSignal - Changing this opens the /report bug-report modal (header bug button).
 * @param root0.openShareSignal - Changing this opens the /share link modal (header share button).
 * @param root0.initialInputValue - Seeds the input with this text on mount (prompt→chat morph).
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @param root0.pendingMessageSuppressUser - When true, send the pending message without rendering a user bubble (auto-sent build kickoff).
 * @param root0.userEditedFile - File path the user just edited — auto-deletes queued autofix messages referencing it.
 * @param root0.userEditedFileKey - Key to distinguish repeated edits to the same file.
 * @param root0.gitStatusTick - Counter that increments when git status changes.
 * @param root0.userAvatar - Signed-in user's avatar shown beside their own messages (SOC1).
 * @returns The rendered chat inner component.
 */
function ChatInner({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  isPro,
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
  onProfileClick,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
  autoSubmitSignal,
  openSettingsSignal,
  openReportSignal,
  openShareSignal,
  initialInputValue,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  userEditedFile,
  userEditedFileKey,
  gitStatusTick: externalGitStatusTick,
  discovery,
  userAvatar,
  agentName = DEFAULT_AGENT_NAME,
  productName = DEFAULT_PRODUCT_NAME,
  version,
  // feedbackUrl: prop kept for back-compat (callers still pass it), but no longer
  // consumed here — its only use was the command-menu footer link removed in P3-21.
}: ChatInnerProps): JSX.Element {
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const http = useHttpClient()
  // Bind the host's profile-click callback to the clicked user's identity once
  // (the chat is solo, so every user avatar is the signed-in user — the only
  // known identity is `userAvatar`). Stable so MessageItem's memo isn't broken;
  // `undefined` when the host opts out, which keeps every avatar non-interactive.
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
  // Ref for sounds config so the onStreamEvent callback always reads the latest value.
  const soundsConfigRef = useRef<SoundsConfig>({ ...DEFAULT_SOUNDS_CONFIG })

  // ── Context usage tracking (ring indicator) ─────────────────────────────
  const [contextUsage, setContextUsage] = useState<{
    inputTokens: number
    contextWindow: number
  } | null>(null)

  // Restore context usage from the history endpoint on mount
  useEffect(() => {
    if (!hasConversation) return
    http
      .get<{ contextUsage?: { inputTokens: number; contextWindow: number } }>(endpoint)
      .then((res) => {
        if (res.data.contextUsage) setContextUsage(res.data.contextUsage)
      })
      .catch(() => {
        /* ignore */
      })
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

  // Clear countdown interval on unmount
  useEffect(
    () => () => {
      if (autoFixIntervalRef.current) clearInterval(autoFixIntervalRef.current)
    },
    [],
  )

  const addSystemCardRef = useRef<
    (
      text: string,
      action?: SystemCard['action'],
      variant?: SystemCard['variant'],
      query?: string,
      emphasized?: boolean,
      tone?: SystemCard['tone'],
      content?: SystemCard['content'],
    ) => void
  >(() => {})
  // Ref so the stream-event callback can push activity cards without depending
  // on the state setter (mirrors addSystemCardRef).
  const addActivityCardRef = useRef<(activity: Activity) => void>(() => {})
  // Last model surfaced in the transcript, so we mark a change (planner →
  // executor) without announcing the same model every turn.
  const lastShownModelRef = useRef<string | null>(null)
  // Last phase (mode) surfaced as a transcript card, so phase markers appear on
  // change only (not every turn). See the 'mode' event handler.
  const lastShownModeRef = useRef<string | null>(null)
  // Kept current each render so handleStreamEvent (memoized) always calls the latest.
  const onReadyToBuildRef = useRef<(() => void) | undefined>(onReadyToBuild)
  onReadyToBuildRef.current = onReadyToBuild
  const onClientActionRef = useRef<((action: IdeClientAction) => void) | undefined>(onClientAction)
  onClientActionRef.current = onClientAction
  const onTurnCompleteRef = useRef<(() => void) | undefined>(onTurnComplete)
  onTurnCompleteRef.current = onTurnComplete

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
      // Capture verification errors to trigger countdown after stream ends.
      // Also drop any deferred preview error — verification's countdown handles it.
      if (event.type === 'verification_result' && event.status === 'error' && event.output) {
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
      // App-specific custom event: look up a renderer the host app registered via
      // registerCustomEventCard and surface it as a system card. This is how host
      // apps deliver their OWN notices (e.g. the host app's upgrade_prompt /
      // guest_reminder / build_degraded cards) — including the periodic sign-up
      // reminder, now emitted by the host's backend rather than counted here — so
      // their copy/routes stay out of this shared component. `emphasized` lets the
      // app opt a card into the highlighted box style without route-sniffing.
      if (event.type === 'custom') {
        const card = getCustomEventCardFactory(event.name as string)?.(
          event.data as Record<string, unknown> | undefined,
        )
        if (card) {
          addSystemCardRef.current(
            card.text,
            card.action,
            undefined,
            undefined,
            card.emphasized,
            card.tone,
            card.content,
          )
        }
      }
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
      // sandbox. The template choice is internal; this event carries no
      // user-facing payload and is never rendered in the transcript.
      if (event.type === 'ready_to_build') {
        onReadyToBuildRef.current?.()
      }
      // The agent asked the IDE to reload/navigate the preview or open a file.
      // Forward to the host (Workspace); not rendered in the transcript.
      if (event.type === 'client_action') {
        onClientActionRef.current?.({
          action: event.action as IdeClientAction['action'],
          path: event.path as string | undefined,
        })
      }
      // Turn finished (done OR error) — let the host know. Used to keep the boot
      // view up until the parallel during-boot plan stream completes, so the
      // panel swap can't cut it off. Firing on error too prevents a failed
      // stream from stranding the boot view forever.
      if (event.type === 'done' || event.type === 'error') {
        onTurnCompleteRef.current?.()
      }
      // Model changed (e.g. planner → executor) — drop a marker in the
      // transcript so it's always clear which model is doing the work. Only on
      // an actual change, not the same model every turn.
      if (event.type === 'model' && event.model) {
        const label = (event.label as string) || (event.model as string)
        if (lastShownModelRef.current && lastShownModelRef.current !== event.model) {
          addSystemCardRef.current(
            t('ide.chat.modelInUse', { model: label }, { defaultValue: 'Now using {{model}}' }),
          )
        }
        lastShownModelRef.current = event.model as string
      }
      // Phase marker for the plan→build handoff. We intentionally do NOT add a
      // "Creating the plan" card: the plan is written as visible streaming text
      // (so the card is redundant), and the parallel build flow emits a transient
      // mode:'plan' during the post-boot save+execute turn — that would drop the
      // card AFTER the plan was already shown, which reads backwards. "Building
      // your app" stays: it cleanly marks the switch from planning to building.
      if (event.type === 'mode' && event.mode) {
        if (lastShownModeRef.current !== event.mode && event.mode === 'execute') {
          addSystemCardRef.current(
            t('ide.chat.phaseBuilding', undefined, { defaultValue: '🔨 Building your app' }),
          )
        }
        lastShownModeRef.current = event.mode as string
      }
      const cfg = soundsConfigRef.current
      const eventType = event.type as SoundEventType
      if (eventType in cfg && shouldPlaySound(cfg[eventType])) {
        playTone()
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
      options?: { suppressUserMessage?: boolean; automatic?: boolean },
    ) => void
  >(() => {})
  useEffect(() => {
    if (autoFixCountdown && autoFixCountdown.secondsLeft === 0 && !autoFixCountdown.paused) {
      const msg = `Fix these issues:\n\n${autoFixCountdown.output}`
      setAutoFixCountdown(null)
      // Auto-sent on the user's behalf — flag it so the chat renders it in the
      // distinct auto-sent style (agent avatar + green border), not as if the
      // user typed it (C2).
      sendMessageRef.current(msg, undefined, { automatic: true })
    }
  }, [autoFixCountdown])

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
  const autoCommitPersistedRef = useRef<number>(0)
  const autoCommitPatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onFileChangeWrapped = useCallback(
    (path: string, content: string) => {
      // A file changed (AI write) — restart the auto-commit countdown if armed.
      dispatchAutoCommit({ type: 'reset' })
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
    error,
    errorMeta,
    mode,
    streamingStatus,
    setMode,
    sendMessage,
    abort,
    clearHistory,
    editQueuedMessage,
    deleteQueuedMessage,
    clearQueuedForFile,
    retryCountdown,
    cancelRetry,
  } = useChat({
    endpoint,
    projectId,
    agentName,
    // Skip the on-mount history load when this panel will auto-send a fresh
    // message — either the `initialMessage` prop or a seeded `initialInputValue`
    // (the prompt→chat morph). The server creates the conversation with the user
    // message persisted up front and emits its id mid-stream; that id flips the
    // endpoint, which would otherwise re-fire loadHistory and overwrite the
    // still-streaming assistant placeholder with the (assistant-less) history.
    // loadOnMount is captured once at mount, so a false here stays false even
    // after the endpoint changes. Existing conversations still load normally.
    loadOnMount: hasConversation || (!initialMessage && !initialInputValue),
    onFileChange: onFileChangeWrapped,
    onConversationId,
    onStreamEvent: handleStreamEvent,
  })

  // Keep sendMessageRef in sync so the countdown effect can call the latest sendMessage
  sendMessageRef.current = sendMessage

  // Ref-stable callback for ToolCallCard's onAskUserResponse — avoids breaking
  // React.memo when sendMessage's identity changes (provider/endpoint deps).
  // Suppress the optimistic user bubble: the answer is reflected in the ask_user
  // card itself (a checkmark on the chosen option, or the custom text shown
  // in-card) rather than echoed as a separate message below it.
  const handleAskUserResponse = useCallback((response: string) => {
    sendMessageRef.current(response, undefined, { suppressUserMessage: true })
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

  /** Update the ref, the DOM element, and the hasInput flag without re-rendering the parent. */
  const setInputValue = useCallback(
    (val: string) => {
      inputRef.current = val
      const ta = textareaRef.current
      if (ta && ta.value !== val) ta.value = val
      setHasInput(Boolean(val.trim()))
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
    [draftKey, autoResize],
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
    onresult: ((e: unknown) => void) | null
    onend: (() => void) | null
    onerror: ((e: unknown) => void) | null
    continuous: boolean
    interimResults: boolean
    lang: string
  }
  const recognitionRef = useRef<SpeechRec | null>(null)
  const [isListening, setIsListening] = useState(false)
  const voiceIntentRef = useRef(false)
  const voiceRestartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Count rapid consecutive failures to bail out of restart loops
  const voiceFailCount = useRef(0)
  const voiceLastStart = useRef(0)

  const startRecognition = useCallback(() => {
    const Ctor = speechCtorRef.current as (new () => SpeechRec) | undefined
    if (!Ctor || !voiceIntentRef.current) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    let gotResult = false

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
      // Too many rapid failures — give up
      if (voiceFailCount.current >= 3) {
        voiceIntentRef.current = false
        voiceFailCount.current = 0
        setIsListening(false)
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
      if (
        error === 'not-allowed' ||
        error === 'service-not-allowed' ||
        error === 'language-not-supported'
      ) {
        voiceIntentRef.current = false
        recognitionRef.current = null
        setIsListening(false)
      }
      // Other errors (no-speech, audio-capture, network, aborted) — onend will handle restart
    }

    recognitionRef.current = recognition
    voiceLastStart.current = Date.now()
    recognition.start()
  }, [setInputValue, autoResize])

  const toggleVoice = useCallback(() => {
    if (isListening) {
      voiceIntentRef.current = false
      if (voiceRestartTimer.current) {
        clearTimeout(voiceRestartTimer.current)
        voiceRestartTimer.current = null
      }
      recognitionRef.current?.stop()
      return
    }
    voiceIntentRef.current = true
    voiceFailCount.current = 0
    setIsListening(true)
    handleAutoFixPauseOnInput()
    startRecognition()
  }, [isListening, startRecognition])

  // Stop recognition on unmount
  useEffect(
    () => () => {
      voiceIntentRef.current = false
      if (voiceRestartTimer.current) {
        clearTimeout(voiceRestartTimer.current)
        voiceRestartTimer.current = null
      }
      recognitionRef.current?.abort()
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
  const addSystemCard = useCallback(
    (
      text: string,
      action?: SystemCard['action'],
      variant?: SystemCard['variant'],
      query?: string,
      emphasized?: boolean,
      tone?: SystemCard['tone'],
      content?: SystemCard['content'],
      skillsCreate?: boolean,
    ) => {
      // If a message is actively streaming, place the card just before it so
      // it doesn't get pinned below the growing response.
      let ts = Date.now()
      const streaming = messagesRef.current.find((m) => m.isStreaming)
      if (streaming && streaming.timestamp <= ts) {
        ts = streaming.timestamp - 1
      }
      setSystemCards((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text,
          timestamp: ts,
          action,
          variant,
          query,
          emphasized,
          tone,
          content,
          skillsCreate,
        },
      ])
      // Auto-scroll after the card renders so the user sees it immediately
      if (!userScrolledUpRef.current) {
        setTimeout(() => {
          const el = messagesContainerRef.current
          if (el) el.scrollTop = el.scrollHeight
        }, 50)
      }
    },
    [],
  )
  addSystemCardRef.current = addSystemCard

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

  // ── Persist system cards across reloads ───────────────────────────────────
  // The system cards above are frontend state; on their own they vanish on every
  // reload. These two effects restore them from the conversation on load and save
  // them back when they change, so a notice like the model-switch message survives a
  // refresh. Only the serializable card data is sent — the in-session `action`
  // callback is dropped, so a restored card is informational. Best-effort: a failed
  // fetch/save just means a card doesn't restore; the in-memory set still drives the
  // UI. (Requires an existing conversation; cards added before the first message
  // creates one start persisting once it has an id.)
  const sysCardsLoadedConvRef = useRef<string | null>(null)
  const prevSysCardsConvRef = useRef<string | null>(null)
  useEffect(() => {
    const prevConv = prevSysCardsConvRef.current
    prevSysCardsConvRef.current = conversationId
    sysCardsLoadedConvRef.current = null
    if (!conversationId) return
    // Clear only when switching FROM another conversation, so a brand-new
    // conversation receiving its id keeps the cards already added to it.
    if (prevConv && prevConv !== conversationId) setSystemCards([])
    let cancelled = false
    void http
      .get<{ systemCards?: SystemCard[] }>(
        `/projects/${projectId}/conversations/${conversationId}/system-cards`,
      )
      .then((res) => {
        if (cancelled) return
        const loaded = res.data?.systemCards ?? []
        // Merge by id so a card added before the fetch resolved is preserved.
        setSystemCards((prev) => {
          const byId = new Map<string, SystemCard>()
          for (const c of loaded) byId.set(c.id, c)
          for (const c of prev) byId.set(c.id, c)
          return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
        })
        sysCardsLoadedConvRef.current = conversationId
      })
      .catch(() => {
        // Best-effort restore; on failure just allow newly-added cards to persist.
        if (!cancelled) sysCardsLoadedConvRef.current = conversationId
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, projectId, http])
  useEffect(() => {
    if (!conversationId || sysCardsLoadedConvRef.current !== conversationId) return
    const serializable = systemCards.map((c) => ({
      id: c.id,
      text: c.text,
      timestamp: c.timestamp,
      content: c.content,
      variant: c.variant,
      query: c.query,
      skillsCreate: c.skillsCreate,
      emphasized: c.emphasized,
      tone: c.tone,
    }))
    void http
      .put(`/projects/${projectId}/conversations/${conversationId}/system-cards`, {
        systemCards: serializable,
      })
      .catch(() => {
        // Best-effort; the in-memory cards remain the source of truth this session.
      })
  }, [systemCards, conversationId, projectId, http])

  // ── Activity cards (captured outbound side effects) ───────────────────────
  const [activityCards, setActivityCards] = useState<ActivityCardEntry[]>([])
  const addActivityCard = useCallback((activity: Activity) => {
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
        : [...prev, { id: activity.id, activity, timestamp: ts }],
    )
    if (!userScrolledUpRef.current) {
      setTimeout(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [])
  addActivityCardRef.current = addActivityCard

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
  const [soundsConfig, setSoundsConfig] = useState<SoundsConfig>({ ...DEFAULT_SOUNDS_CONFIG })

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
      try {
        await http.patch(`/projects/${projectId}`, { settings: { sounds: updated } })
      } catch (error) {
        logger.warn('Failed to persist sound settings to server', { error })
        addSystemCard(
          t('ide.chat.soundsError', undefined, {
            defaultValue: 'Failed to update sound settings.',
          }),
        )
      }
    },
    [soundsConfig, http, projectId, addSystemCard],
  )

  // ── Current project settings (model + maxloops + sounds) ──────────────────
  const { models: AVAILABLE_MODELS, freeTierModel, loading: modelsLoading } = useAIModels()
  const FREE_TIER_MODEL = freeTierModel?.id ?? AVAILABLE_MODELS[0]?.id ?? ''
  const DEFAULT_MODEL = FREE_TIER_MODEL
  const isFreeTier = !isPro
  const [currentModel, setCurrentModel] = useState<string>('')
  // Per-mode model overrides (SYN5). Empty string = unset; resolveModeModel then
  // falls back to currentModel (the legacy single chatModel) for back-compat.
  const [planModel, setPlanModel] = useState<string>('')
  const [executeModel, setExecuteModel] = useState<string>('')
  // Reasoning effort level (SYN6) — applied by the backend at chat-call time.
  const [effortLevel, setEffortLevel] = useState<EffortLevel>(DEFAULT_EFFORT_LEVEL)
  const [currentMaxLoops, setCurrentMaxLoops] = useState<number>(100)
  const [autoFixEnabled, setAutoFixEnabled] = useState<boolean>(true)
  // Adopt the free-tier model id as soon as the catalog resolves, unless the
  // project-settings fetch already populated currentModel with a saved choice.
  useEffect(() => {
    if (!currentModel && DEFAULT_MODEL) {
      setCurrentModel(DEFAULT_MODEL)
    }
  }, [currentModel, DEFAULT_MODEL])
  useEffect(() => {
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        if (typeof s?.chatModel === 'string') setCurrentModel(s.chatModel)
        if (typeof s?.planModel === 'string') setPlanModel(s.planModel)
        if (typeof s?.executeModel === 'string') setExecuteModel(s.executeModel)
        if (typeof s?.effortLevel === 'string' && isEffortLevel(s.effortLevel)) {
          setEffortLevel(s.effortLevel)
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
        if (typeof s?.maxToolLoops === 'number') setCurrentMaxLoops(s.maxToolLoops)
        if (typeof s?.autoFix === 'boolean') setAutoFixEnabled(s.autoFix)
        if (s?.sounds && typeof s.sounds === 'object') {
          setSoundsConfig((prev) => ({ ...prev, ...(s.sounds as Partial<SoundsConfig>) }))
        }
        // Restore the persisted auto-commit cadence in the paused state (it
        // re-arms on the next file change). Missing/invalid → off (0).
        const savedAutoCommit =
          typeof s?.autoCommitSeconds === 'number' && s.autoCommitSeconds > 0
            ? Math.floor(s.autoCommitSeconds)
            : 0
        autoCommitPersistedRef.current = savedAutoCommit
        if (savedAutoCommit > 0) dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
        setAutoCommitLoaded(true)
      })
      .catch(() => {
        // Settings load failed: treat auto-commit as off so a later explicit
        // /autocommit still persists (we never silently lose a user choice).
        autoCommitPersistedRef.current = 0
        setAutoCommitLoaded(true)
      })
  }, [http, projectId])

  // Persist the auto-commit cadence to project.settings (debounced) so it
  // survives a reload/reconnect like every other setting. The reducer is the
  // live source of truth; this mirrors intervalSeconds (0 = off) back to the
  // server whenever the user changes it (/autocommit or the badge's cancel),
  // skipping the value just hydrated on load and gated until that load resolves.
  useEffect(() => {
    if (!autoCommitLoaded) return
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
  }, [autoCommit.intervalSeconds, autoCommitLoaded, http, projectId])

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
    const fallback = FREE_TIER_MODEL || AVAILABLE_MODELS[0]?.id
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
      http.patch(`/projects/${projectId}`, { settings: { chatModel: fallback } }).catch(() => {
        /* persistence is best-effort; the in-memory switch is what matters */
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

  // Detect user scroll intent via wheel/touch events. These never fire during
  // programmatic scrollTop changes, so they cleanly separate user intent from
  // auto-scroll without false positives from animation timing.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const check = (): void => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }
    const onWheel = (): void => {
      requestAnimationFrame(check)
    }
    let touchY = 0
    const onTouchStart = (e: TouchEvent): void => {
      touchY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent): void => {
      // Swipe down (finger moves down) = scroll up
      if (e.touches[0].clientY > touchY) userScrolledUpRef.current = true
      else requestAnimationFrame(check)
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
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

  // Debounced version — coalesces rapid ticks (e.g. save → format) into a
  // single fetch after the last write settles.
  const gitFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedFetchPendingFiles = useCallback(() => {
    if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
    gitFetchTimerRef.current = setTimeout(() => {
      gitFetchTimerRef.current = null
      fetchPendingFiles()
    }, 400)
  }, [fetchPendingFiles])

  // Fetch after AI finishes or internal refreshGitStatus() calls
  useEffect(() => {
    if (isLoading) return
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
  // down). When paused/disabled (remaining === null) no interval runs.
  const autoCommitArmed = isAutoCommitArmed(autoCommit)
  useEffect(() => {
    if (!autoCommitArmed) return
    const id = setInterval(() => dispatchAutoCommit({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [autoCommitArmed])

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

  // ── Auto-send initial message ──────────────────────────────────────────────
  // Skip if a conversation already exists (e.g. page refresh with router state preserved).
  useEffect(() => {
    if (initialMessage && !hasConversation && sentInitialRef.current !== initialMessage) {
      sentInitialRef.current = initialMessage
      sendMessage(initialMessage)
      onInitialMessageSent?.()
    }
  }, [initialMessage, hasConversation, sendMessage, onInitialMessageSent])

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
      const sendOpts = pendingMessageSuppressUser ? { suppressUserMessage: true } : undefined
      if (isLoading) {
        // AI is busy — defer until streaming ends
        deferredPendingRef.current = pendingMessage
        deferredPendingSuppressRef.current = !!pendingMessageSuppressUser
      } else {
        deferredPendingRef.current = null
        sendMessage(pendingMessage, undefined, sendOpts)
      }
    }
  }, [pendingMessage, pendingMessageKey, pendingMessageSuppressUser, sendMessage, isLoading])

  // When streaming ends, send any deferred message
  useEffect(() => {
    if (!isLoading && deferredPendingRef.current) {
      const msg = deferredPendingRef.current
      const suppress = deferredPendingSuppressRef.current
      deferredPendingRef.current = null
      deferredPendingSuppressRef.current = false
      sendMessage(msg, undefined, suppress ? { suppressUserMessage: true } : undefined)
    }
  }, [isLoading, sendMessage])

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
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [
          t('ide.chat.skills.loadedPrefix', undefined, { defaultValue: 'Loaded ' }),
          {
            label: skill.name,
            code: true,
            onClick: () => onFileOpen?.(skill.path, { focus: true }),
          },
          t('ide.chat.skills.loadedSuffix', undefined, { defaultValue: ' skill' }),
        ],
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
    if (skillsLoadedRef.current) return
    skillsLoadedRef.current = true
    let cancelled = false
    void (async () => {
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
        setProjectSkills(loaded)
        // P3-11: with no explicit saved set, ALL initial/discovered skills are
        // default — seed the badge set so the /skills browser reflects it (the
        // backend likewise injects every initial skill when defaultSkills is unset).
        if (!defaultSkillsExplicitRef.current) {
          setDefaultSkillPaths(new Set(loaded.map((s) => s.path)))
        }
      } catch (error) {
        // Best-effort — a failed skills fetch must never disrupt the chat; we
        // simply skip the suggestion + default-seed for this conversation.
        logger.debug('Skipping relevant-skill suggestion; failed to load project skills', { error })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, projectId])

  const relevantSkill = useMemo<SkillInfo | null>(() => {
    if (projectSkills.length === 0) return null
    const attached = new Set(attachedFiles.map((f) => f.path))
    // Compute the genuine top match for the CURRENT recent messages, excluding only
    // dismissed + already-@-attached skills. We deliberately do NOT drop loaded
    // skills from the candidate pool here; instead, if the top match is one the user
    // already loaded, we show nothing (below). That way clicking Load does NOT make
    // the next-best skill immediately pop up — the tip changes only when the recent
    // messages produce a genuinely different top match, never just because the last
    // one was loaded. This kills the "suggests a bunch, one after another" parade
    // the user reported (P2-06).
    const candidates = projectSkills.filter(
      (s) => !dismissedSkillPaths.includes(s.path) && !attached.has('/' + s.path),
    )
    if (candidates.length === 0) return null
    const top = suggestRelevantSkills(candidates, recentUserText(messages))[0]?.skill ?? null
    if (!top) return null
    // The most relevant skill is already loaded this session → nothing to nudge.
    return loadedSkillPaths.has(top.path) ? null : top
  }, [projectSkills, attachedFiles, dismissedSkillPaths, loadedSkillPaths, messages])

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
    async (rawName: string) => {
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
        const run = await http.post<ScriptRunResult>(
          `/projects/${projectId}/scripts/${encodeURIComponent(target.name)}/run`,
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
    [http, projectId, addSystemCard],
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

      // Close sounds picker when user starts typing
      setSoundsPicker(null)

      const atMatch = before.match(/@(\S*)$/)
      if (atMatch) {
        setMentionStart(cursor - atMatch[0].length)
        void openFilePicker(atMatch[1])
        setCommandMenu(null)
        return
      }
      setFilePicker(null)

      // Show model picker when typing "/model <filter>" — scoped to a mode when
      // the input carries a --plan / --execute flag.
      const modelMatch = val.match(/^\/model\s+/i)
      if (modelMatch) {
        setModelPicker({ selectedIdx: -1, mode: parseModelModeCommand(val)?.mode })
        setCommandMenu(null)
        return
      }
      setModelPicker(null)

      if (val.startsWith('/') && !val.includes(' ')) {
        setCommandMenu({ selectedIdx: -1 })
      } else {
        setCommandMenu(null)
      }
    },
    [openFilePicker, autoResize, persistDraft],
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

  /**
   * Select and apply a model by ID. When `mode` is given the choice persists to
   * that mode's per-mode field (`planModel` / `executeModel`); otherwise it sets
   * the legacy single `chatModel`.
   */
  const selectModel = useCallback(
    async (modelId: string, displayName?: string, mode?: ModelMode) => {
      setModelPicker(null)
      setInputValue('')
      const name = displayName ?? modelId
      try {
        if (mode) {
          await http.patch(`/projects/${projectId}`, {
            settings: { [modeSettingKey(mode)]: modelId },
          })
          if (mode === 'plan') setPlanModel(modelId)
          else setExecuteModel(modelId)
          addSystemCard(
            mode === 'plan'
              ? t(
                  'ide.chat.planModelSet',
                  { name },
                  { defaultValue: 'Plan-mode model set to {{name}}' },
                )
              : t(
                  'ide.chat.executeModelSet',
                  { name },
                  { defaultValue: 'Execute-mode model set to {{name}}' },
                ),
          )
        } else {
          await http.patch(`/projects/${projectId}`, { settings: { chatModel: modelId } })
          setCurrentModel(modelId)
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

  const executeCommand = useCallback(
    async (id: CommandId) => {
      setCommandMenu(null)
      if (id === 'clear') {
        setInputValue('')
        await clearHistory()
        setCommitCards([])
        setSystemCards([])
        setContextUsage(null)
        setMaxVisibleItems(60)
      } else if (id === 'model') {
        setInputAndCursorEnd('/model ')
        setModelPicker({ selectedIdx: -1 })
      } else if (id === 'maxloops') {
        setInputAndCursorEnd('/maxloops ')
      } else if (id === 'effort') {
        // Prefill so the user types a level; /effort ? (or bare) shows status.
        setInputAndCursorEnd('/effort ')
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
        addSystemCard(buildHelpText({ agentName, productName }), undefined, 'help')
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
            estimatedCost: number
            model: string
          }>(usageUrl)
          const d = res.data
          const fmt = (n: number): string =>
            n >= 1_000_000
              ? (n / 1_000_000).toFixed(1) + 'M'
              : n >= 1_000
                ? (n / 1_000).toFixed(1) + 'K'
                : String(n)
          addSystemCard(
            t(
              'ide.chat.costSummary',
              {
                model: d.model,
                input: fmt(d.inputTokens),
                output: fmt(d.outputTokens),
                cost: d.estimatedCost.toFixed(4),
              },
              {
                // The figure is the WHOLE-conversation total across every model used,
                // not just the model shown (P2-04). Keep this in sync with the reworded
                // ide.chat.costSummary value in the ide locale bond.
                defaultValue:
                  'Model: {{model}}\nInput: {{input}} tokens\nOutput: {{output}} tokens\nTotal cost this conversation (all models): ~${{cost}}',
              },
            ),
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
          await http.patch(`/projects/${projectId}`, { settings: { autoFix: newValue } })
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
      } else if (id === 'sounds') {
        setInputValue('')
        setSoundsPicker({ selectedIdx: -1 })
      } else if (id === 'settings') {
        setInputValue('')
        // Renders the settings + command-reference card (see the 'settings' variant branch).
        addSystemCard('', undefined, 'settings')
      } else if (id === 'skills') {
        setInputValue('')
        // Renders the skills browser (see the 'skills' variant branch). A query,
        // if any, is supplied via the /skills <query> path in handleSubmit.
        addSystemCard('', undefined, 'skills')
      } else if (id === 'scripts') {
        setInputValue('')
        // Renders the scripts browser (see the 'scripts' variant branch). A query,
        // if any, is supplied via the /scripts <query> path in handleSubmit.
        addSystemCard('', undefined, 'scripts')
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
            { productName, version: version ?? APP_VERSION },
            { defaultValue: '{{productName}} v{{version}}' },
          ),
        )
      } else if (id === 'share') {
        setInputValue('')
        setShareModal({ role: DEFAULT_SHARE_ROLE })
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
    ],
  )

  // When the auto-commit countdown reaches zero, fire the existing /commit path
  // (no new backend) and pause until the next file change re-arms it. /commit
  // itself no-ops on a clean tree, so a stray fire is harmless.
  useEffect(() => {
    if (!isAutoCommitDue(autoCommit)) return
    void executeCommand('commit')
    dispatchAutoCommit({ type: 'fired' })
  }, [autoCommit, executeCommand])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Stop voice recognition on submit
    voiceIntentRef.current = false
    recognitionRef.current?.stop()

    const trimmed = (inputRef.current as string).trim()
    if (!trimmed && attachedFiles.length === 0) return

    // Handle /autofix toggle locally
    if (/^\/autofix$/i.test(trimmed)) {
      void executeCommand('autofix')
      return
    }

    // Handle /sounds command locally
    if (/^\/sounds$/i.test(trimmed)) {
      setInputValue('')
      setSoundsPicker({ selectedIdx: -1 })
      return
    }

    // Handle /settings command locally
    if (/^\/settings$/i.test(trimmed)) {
      void executeCommand('settings')
      return
    }

    // Handle /skills [query] command locally — renders the skills browser,
    // seeded with the query (if any) so the card opens pre-filtered.
    const skillsMatch = trimmed.match(/^\/skills(?:\s+(.*))?$/i)
    if (skillsMatch) {
      setInputValue('')
      addSystemCard('', undefined, 'skills', skillsMatch[1]?.trim() ?? '')
      return
    }

    // Handle /scripts [query] command locally — renders the scripts browser,
    // seeded with the query (if any) so the card opens pre-filtered.
    const scriptsMatch = parseScriptsCommand(trimmed)
    if (scriptsMatch) {
      setInputValue('')
      addSystemCard('', undefined, 'scripts', scriptsMatch.query)
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
        void runSavedScript(runMatch.name)
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
    // role (default viewer). An unrecognized role shows usage instead.
    const shareMatch = parseShareCommand(trimmed)
    if (shareMatch) {
      setInputValue('')
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

    // Handle /model --plan / --execute locally — opens the picker scoped to that
    // mode so a selection persists to planModel / executeModel. Must run BEFORE
    // the generic /model handler so the flag isn't treated as a model name.
    const modelModeMatch = parseModelModeCommand(trimmed)
    if (modelModeMatch) {
      setInputValue('')
      setModelPicker({ selectedIdx: -1, mode: modelModeMatch.mode })
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
        // Block free-tier users from selecting paid models
        if (isFreeTier && name !== FREE_TIER_MODEL) {
          addSystemCard(
            t(
              'ide.chat.modelUpgradeRequired',
              { model: resolved?.label ?? name },
              {
                defaultValue: `${resolved?.label ?? name} is available on a paid plan. Upgrade to access all models.`,
              },
            ),
            // The upgrade/sign-in button(s) are the host's (its own routes/copy).
            buildUpgradeCta?.({}) ?? undefined,
          )
        } else {
          try {
            await http.patch(`/projects/${projectId}`, { settings: { chatModel: name } })
            setCurrentModel(name)
            addSystemCard(
              t(
                'ide.chat.modelSet',
                { name: resolved?.label ?? name },
                {
                  defaultValue: `Chat model set to ${resolved?.label ?? name}`,
                },
              ),
            )
          } catch (error) {
            logger.warn('Failed to update chat model via /model command', { error })
            addSystemCard(
              t('ide.chat.modelError', undefined, {
                defaultValue: 'Failed to update chat model.',
              }),
            )
          }
        }
      }
      setInputValue('')
      setModelPicker(null)
      return
    }

    // Handle /effort <S|M|L|XL> and /effort ? locally — persists effortLevel;
    // the backend applies it to the provider reasoning/budget param (and the
    // agent-loop budget) at chat-call time.
    const effortCmd = parseEffortCommand(trimmed)
    if (effortCmd) {
      setInputValue('')
      // Resolve the model the ACTIVE conversation mode will actually use, so the
      // status view and the level validation reflect THIS model's reasoning
      // capabilities (P2-10) — different models support different effort levels.
      // Mirrors the /model picker + slash-suffix resolveModeModel logic.
      const effortModelId =
        resolveModeModel({ planModel, executeModel, chatModel: currentModel }, mode) ?? currentModel
      const effortModel = AVAILABLE_MODELS.find((m) => m.id === effortModelId)
      const allowedLevels = effortLevelsForModel(effortModel)
      const effortModelLabel = effortModel?.label ?? effortModelId
      if (effortCmd.kind === 'invalid') {
        addSystemCard(
          t('ide.chat.effort.usage', undefined, {
            defaultValue: 'Usage: /effort <S|M|L|XL>. Use /effort ? to see the current level.',
          }),
        )
      } else if (effortCmd.kind === 'query') {
        const supported = modelsSupportingEffort(AVAILABLE_MODELS)
        const lines: string[] = [
          t(
            'ide.chat.effort.current',
            { level: effortLevel, label: EFFORT_LEVEL_LABELS[effortLevel] },
            { defaultValue: 'Reasoning effort: {{level}} ({{label}})' },
          ),
          '',
          // List ONLY the levels the active model actually supports (P2-10), named
          // by the model so it's obvious why the set may be a subset.
          t(
            'ide.chat.effort.currentModelLevels',
            { model: effortModelLabel, levels: allowedLevels.join(', ') },
            { defaultValue: 'Effort levels for {{model}}: {{levels}}' },
          ),
          ...allowedLevels.map((lvl) =>
            t(
              'ide.chat.effort.levelLine',
              { level: lvl, label: EFFORT_LEVEL_LABELS[lvl] },
              { defaultValue: '  {{level}} — {{label}}' },
            ),
          ),
          '',
          supported.length
            ? t(
                'ide.chat.effort.supported',
                { models: supported.map((m) => m.label).join(', ') },
                {
                  defaultValue:
                    'Tunes the reasoning budget on: {{models}}. Other models still get the effort applied to the agent loop budget.',
                },
              )
            : t('ide.chat.effort.noneSupported', undefined, {
                defaultValue:
                  'No bonded model exposes a configurable reasoning budget — effort still scales the agent loop budget.',
              }),
        ]
        addSystemCard(lines.join('\n'))
      } else {
        const level = effortCmd.level
        if (!allowedLevels.includes(level)) {
          // The active model doesn't support this level — reject and name what IS
          // available, rather than silently persisting an unsupported level (P2-10).
          addSystemCard(
            t(
              'ide.chat.effort.notSupportedForModel',
              { level, model: effortModelLabel, levels: allowedLevels.join(', ') },
              { defaultValue: "{{level}} isn't available for {{model}}. Available: {{levels}}" },
            ),
          )
          return
        }
        try {
          await http.patch(`/projects/${projectId}`, { settings: { effortLevel: level } })
          setEffortLevel(level)
          addSystemCard(
            t(
              'ide.chat.effort.set',
              { level, label: EFFORT_LEVEL_LABELS[level] },
              { defaultValue: 'Reasoning effort set to {{level}} ({{label}}).' },
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
      }
      return
    }

    // Handle /maxloops <N> command locally — server enforces tier cap
    const maxLoopsMatch = trimmed.match(/^\/maxloops\s+(\d+)$/i)
    if (maxLoopsMatch) {
      const n = Math.max(1, Number(maxLoopsMatch[1]))
      try {
        await http.patch(`/projects/${projectId}`, { settings: { maxToolLoops: n } })
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
            buildUpgradeCta?.({ requiresSignup: data.requiresSignup }) ?? undefined,
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
  }, [attachedFiles, http, projectId, sendMessage, setInputValue, runSavedScript])

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
      setShareModal({ role: DEFAULT_SHARE_ROLE })
    }
  }, [openShareSignal])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const filteredCmds = commandMenu
    ? COMMANDS.filter((c) => c.label.startsWith(inputRef.current as string))
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
  }, [modelPicker])

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
  const visibleModels = useMemo(() => {
    // Sort WITHIN each partition so the current/deprecated split (and the
    // `idx >= currentModels.length` divider logic below) is preserved while the
    // chosen sort orders the rows the user actually sees.
    const sortedCurrent = sortModels(currentModels, modelSort.column, modelSort.direction)
    if (!showDeprecated) return sortedCurrent
    const sortedDeprecated = sortModels(deprecatedModels, modelSort.column, modelSort.direction)
    return [...sortedCurrent, ...sortedDeprecated]
  }, [showDeprecated, currentModels, deprecatedModels, modelSort])

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
      if (modelPicker) {
        setModelPicker(null)
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
      if (isLoading) {
        abort()
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

    if (modelPicker && visibleModels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, 1, visibleModels.length) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { ...m, selectedIdx: wrapIdx(m.selectedIdx, -1, visibleModels.length) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const model = visibleModels[modelPicker.selectedIdx >= 0 ? modelPicker.selectedIdx : 0]
        if (model) {
          // Honor the free-tier clamp for the active mode; ignore Enter on a
          // locked model (the click path shows the upgrade card).
          const pickerMode = modelPicker.mode
          const isLocked = pickerMode
            ? isModeModelLocked(model.id, pickerMode, isFreeTier, AVAILABLE_MODELS, FREE_TIER_MODEL)
            : isFreeTier && model.id !== FREE_TIER_MODEL
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
          m ? { selectedIdx: wrapIdx(m.selectedIdx, 1, filteredCmds.length) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCommandMenu((m) =>
          m ? { selectedIdx: wrapIdx(m.selectedIdx, -1, filteredCmds.length) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const cmd = filteredCmds[commandMenu.selectedIdx >= 0 ? commandMenu.selectedIdx : 0]
        if (cmd) void executeCommand(cmd.id)
        return
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

  // Build a unified timeline so commit cards appear at the correct position
  type TimelineItem =
    | { kind: 'message'; msg: (typeof messages)[number] }
    | { kind: 'commit'; card: CommitCard }
    | { kind: 'system'; card: SystemCard }
    | { kind: 'activity'; card: ActivityCardEntry }
    | { kind: 'tip'; card: TipCardEntry }
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...visibleMessages.map((msg) => ({ kind: 'message' as const, msg })),
      ...commitCards.map((card) => ({ kind: 'commit' as const, card })),
      ...systemCards.map((card) => ({ kind: 'system' as const, card })),
      ...activityCards.map((card) => ({ kind: 'activity' as const, card })),
      ...tipCards.map((card) => ({ kind: 'tip' as const, card })),
    ]
    items.sort((a, b) => {
      const tA = a.kind === 'message' ? a.msg.timestamp : a.card.timestamp
      const tB = b.kind === 'message' ? b.msg.timestamp : b.card.timestamp
      return tA - tB
    })
    return items
  }, [visibleMessages, commitCards, systemCards, activityCards, tipCards])

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
        {(timeline.length > maxVisibleItems ? timeline.slice(-maxVisibleItems) : timeline).map(
          (item) => {
            if (item.kind === 'commit')
              return (
                <CommitCardItem key={item.card.id} card={item.card} onRevert={handleRevertCommit} />
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
                  onDismiss={() => dismissTip(item.card.id)}
                />
              )

            if (item.kind === 'system') {
              if (item.card.variant === 'settings') {
                const soundsSummary = summarizeSounds(soundsConfig)
                const notSet = t('ide.chat.settings.modelUnset', undefined, {
                  defaultValue: 'Not set',
                })
                const modelLabel = (id: string): string =>
                  AVAILABLE_MODELS.find((m) => m.id === id)?.label || id
                // Per-mode models fall back to the default model when unset; show
                // that explicitly so the panel never understates the config (SYN11).
                const followsDefault = t('ide.chat.settings.modelFollowsDefault', undefined, {
                  defaultValue: 'Follows default model',
                })
                const settings = buildSettingsList({
                  model: currentModel ? modelLabel(currentModel) : notSet,
                  planModel: planModel ? modelLabel(planModel) : followsDefault,
                  executeModel: executeModel ? modelLabel(executeModel) : followsDefault,
                  mode:
                    mode === 'plan'
                      ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
                      : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
                  effort: t(
                    'ide.chat.settings.effortValue',
                    { level: effortLevel, label: EFFORT_LEVEL_LABELS[effortLevel] },
                    { defaultValue: '{{label}} ({{level}})' },
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
                  sounds: t(
                    'ide.chat.settings.soundsSummary',
                    { enabled: soundsSummary.enabled, total: soundsSummary.total },
                    { defaultValue: '{{enabled}} of {{total}} events enabled' },
                  ),
                })
                return (
                  <SettingsCard
                    key={item.card.id}
                    settings={settings}
                    onRunCommand={(commandId) => void executeCommand(commandId)}
                    onPrefillInput={(input) => setInputAndCursorEnd(`${input} `)}
                    isLight={isLight}
                    agentName={agentName}
                  />
                )
              }
              if (item.card.variant === 'skills') {
                return (
                  <SkillsCard
                    key={item.card.id}
                    projectId={projectId}
                    initialQuery={item.card.query ?? ''}
                    onLoad={loadSkill}
                    onCreate={createSkill}
                    startCreating={item.card.skillsCreate}
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
              if (item.card.tone) {
                // Tip-style toned card (info=blue / gold): the dismissable tip-box look
                // with any actions rendered as inline underlined links (not buttons).
                const gold = item.card.tone === 'gold'
                const accent = gold ? '#d4a017' : 'var(--mol-color-primary, #6366f1)'
                const border = gold ? 'rgba(234,179,8,0.30)' : 'rgba(99,102,241,0.25)'
                const bg = gold ? 'rgba(234,179,8,0.08)' : 'rgba(99,102,241,0.08)'
                const toneActions = item.card.action
                  ? Array.isArray(item.card.action)
                    ? item.card.action
                    : [item.card.action]
                  : []
                return (
                  <div
                    key={item.card.id}
                    data-mol-id="chat-tone-card"
                    className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      // One timeline rhythm: bottom margin only (see TIMELINE_ITEM_GAP).
                      marginBottom: TIMELINE_ITEM_GAP,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: bg,
                      lineHeight: 1.5,
                    }}
                  >
                    <Icon
                      name="lightbulb"
                      size={18}
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 1, opacity: 0.85, color: accent }}
                    />
                    <span style={{ flex: 1 }}>
                      {item.card.content ? (
                        // Composable inline body: render each segment in order — strings as
                        // text, monospace code spans, actions as inline links — so prose, code,
                        // links + trailing punctuation flow naturally.
                        item.card.content.map((seg, i) => renderCardSegment(seg, i))
                      ) : (
                        <>
                          {item.card.text}
                          {toneActions.map((act, i) => (
                            <span key={i}> {renderCardSegment(act, i)}</span>
                          ))}
                        </>
                      )}
                    </span>
                  </div>
                )
              }
              const isMultiLine = item.card.text.includes('\n')
              // The card opts into the emphasized (highlighted box) style explicitly
              // via `emphasized` — never inferred from its route/copy (those are the
              // host's, not this shared package's). See SystemCard.emphasized.
              const isEmphasized = item.card.emphasized ?? false
              return (
                <div
                  key={item.card.id}
                  className={cm.cn(
                    cm.textSize(isEmphasized ? 'sm' : 'xs'),
                    isEmphasized ? undefined : cm.textMuted,
                  )}
                  style={
                    isEmphasized
                      ? {
                          textAlign: 'center',
                          padding: '10px 16px',
                          // One timeline rhythm: bottom margin only (see TIMELINE_ITEM_GAP).
                          marginBottom: TIMELINE_ITEM_GAP,
                          background: 'rgba(64,112,224,0.10)',
                          border: '1px solid rgba(64,112,224,0.25)',
                          borderRadius: 8,
                          color: 'var(--mol-color-text-secondary, #aaa)',
                        }
                      : {
                          textAlign: isMultiLine ? 'left' : 'center',
                          padding: isMultiLine ? '8px 12px' : '6px 0',
                          marginBottom: TIMELINE_ITEM_GAP,
                          whiteSpace: isMultiLine ? 'pre-wrap' : undefined,
                          fontFamily: isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
                          lineHeight: isMultiLine ? 1.5 : undefined,
                        }
                  }
                >
                  {item.card.content
                    ? item.card.content.map((seg, i) => renderCardSegment(seg, i))
                    : item.card.text}
                  {item.card.action &&
                    (() => {
                      const btnStyle: React.CSSProperties = {
                        display: 'inline-block',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        textDecoration: 'none',
                        transition: 'opacity 100ms',
                        fontFamily: 'inherit',
                        border: 'none',
                        color: '#fff',
                        background: 'var(--color-primary)',
                      }
                      const actions = Array.isArray(item.card.action)
                        ? item.card.action
                        : [item.card.action!]
                      return (
                        <div
                          style={{
                            marginTop: '10px',
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center',
                          }}
                        >
                          {actions.map((act, i) =>
                            act.href ? (
                              <a
                                key={i}
                                href={act.href}
                                target={act.href.startsWith('http') ? '_blank' : undefined}
                                rel={
                                  act.href.startsWith('http') ? 'noopener noreferrer' : undefined
                                }
                                style={btnStyle}
                                onMouseEnter={(e) => {
                                  ;(e.currentTarget as HTMLElement).style.background =
                                    'var(--color-primary-hover)'
                                }}
                                onMouseLeave={(e) => {
                                  ;(e.currentTarget as HTMLElement).style.background =
                                    'var(--color-primary)'
                                }}
                              >
                                {act.label}
                              </a>
                            ) : (
                              <button
                                key={i}
                                type="button"
                                onClick={act.onClick}
                                style={btnStyle}
                                onMouseEnter={(e) => {
                                  ;(e.currentTarget as HTMLElement).style.background =
                                    'var(--color-primary-hover)'
                                }}
                                onMouseLeave={(e) => {
                                  ;(e.currentTarget as HTMLElement).style.background =
                                    'var(--color-primary)'
                                }}
                              >
                                {act.label}
                              </button>
                            ),
                          )}
                        </div>
                      )
                    })()}
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
                  onRevert={handleRevertCommit}
                />
              )
            }

            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                editingQueuedId={editingQueuedId}
                editingQueuedText={editingQueuedText}
                setEditingQueuedId={setEditingQueuedId}
                setEditingQueuedText={setEditingQueuedText}
                editQueuedMessage={editQueuedMessage}
                deleteQueuedMessage={deleteQueuedMessage}
                sendMessage={sendMessage}
                handleAskUserResponse={handleAskUserResponse}
                isLoading={isLoading}
                streamingStatus={streamingStatus}
                undoneTcIds={undoneTcIds}
                handleUndoToggle={handleUndoToggle}
                onFileOpen={onFileOpen}
                onFileDoubleClick={onFileDoubleClick}
                onFileDiff={onFileDiff}
                handleFileRevert={handleFileRevert}
                setInputAndCursorEnd={setInputAndCursorEnd}
                setModelPicker={setModelPicker}
                userAvatar={userAvatar}
                onAvatarClick={onUserAvatarClick}
                discovery={discovery}
              />
            )
          },
        )}

        {error &&
          (errorMeta?.limitType ? (
            // The CTA route/copy are the host's — ask buildUpgradeCta for the
            // upgrade/sign-in link (none rendered if the host supplies nothing).
            (() => {
              const limitCta = firstLinkAction(
                buildUpgradeCta?.({ requiresSignup: errorMeta.requiresSignup }),
              )
              return (
                <ResourceLimitBanner
                  message={error}
                  ctaLabel={limitCta?.label}
                  ctaHref={limitCta?.href}
                />
              )
            })()
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

        {/* The plan finished streaming but the sandbox is still booting (after
            ready_to_build, before the post-boot build kickoff). The turn has
            ended so nothing is streaming — without this the chat looks stalled.
            Show a labeled waiting indicator until the kickoff request starts
            (isLoading flips true) or the host clears awaitingSandboxBoot. */}
        {awaitingSandboxBoot && !isLoading && (
          <StreamingIndicator
            label={t('ide.chat.awaitingSandbox', undefined, {
              defaultValue: 'Waiting for the development environment to finish starting…',
            })}
          />
        )}

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
          <svg width="14" height="14" viewBox="0 0 20 20" fill="#d4a017" style={{ flexShrink: 0 }}>
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
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
          <svg width="14" height="14" viewBox="0 0 20 20" fill="#d4a017" style={{ flexShrink: 0 }}>
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
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
        {/* Auto-commit indicator. When ARMED (counting down) the countdown lives in
            the commit bar's button slot (P3-15); here we only show the muted
            "Auto-commit on" pill for the paused state, so the countdown is never
            shown in two places at once. */}
        {!isAutoCommitArmed(autoCommit) && (
          <AutoCommitBadge
            state={autoCommit}
            onCancel={() => dispatchAutoCommit({ type: 'set', seconds: 0 })}
          />
        )}

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
                  maxHeight: '70vh',
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
                          // actually use (plan/execute) — NOT the legacy single
                          // chatModel (which defaults to the free-tier model and
                          // is misleading once a per-mode model is set). Mirrors
                          // the picker header's resolveModeModel logic.
                          // Always resolve a non-empty current model id so the
                          // parentheses never render as an empty " ()" before the
                          // catalog loads (P3-16): fall through plan/execute ->
                          // chatModel -> the default / free-tier model id (|| so an
                          // empty string also falls through).
                          const effId =
                            resolveModeModel(
                              { planModel, executeModel, chatModel: currentModel },
                              mode,
                            ) ||
                            currentModel ||
                            DEFAULT_MODEL ||
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
                          suffix = ` (v${version ?? APP_VERSION})`
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
                maxHeight: '70vh',
              }}
            >
              <div
                className={cm.cn(cm.textSize('xs'), cm.textMuted)}
                style={{
                  padding: '5px 12px',
                  borderBottom: '1px solid rgba(128,128,128,0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <span>
                  {modelPicker.mode === 'plan'
                    ? t('ide.chat.selectPlanModel', undefined, {
                        defaultValue: 'Select plan-mode model',
                      })
                    : modelPicker.mode === 'execute'
                      ? t('ide.chat.selectExecuteModel', undefined, {
                          defaultValue: 'Select execute-mode model',
                        })
                      : t('ide.chat.selectModel', undefined, { defaultValue: 'Select model' })}
                </span>
                {/*
                  Sort control (replaces the old "Current: X" text — the active
                  model is now shown by the right-aligned per-row "current" pill
                  below). Reuses the removed `/models` table's sortModels helper.
                */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}</span>
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
                      padding: '1px 4px',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="name">
                      {t('ide.chat.models.colName', undefined, { defaultValue: 'Model' })}
                    </option>
                    <option value="context">
                      {t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' })}
                    </option>
                    <option value="cost">
                      {t('ide.chat.models.colCost', undefined, { defaultValue: 'Cost / 1M' })}
                    </option>
                    <option value="cutoff">
                      {t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' })}
                    </option>
                    <option value="free">
                      {t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' })}
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
                        padding: '2px 4px',
                        color: 'inherit',
                        cursor: 'pointer',
                        // Match the sort <select>'s height exactly (P3-18): stretch to
                        // the flex row's height instead of sizing to the 12px icon.
                        alignSelf: 'stretch',
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
                    if (isDeprecated(model))
                      badges.push({
                        label: `deprecated ${model.deprecatedAt}`,
                        bg: isLight ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.18)',
                        fg: isLight ? 'rgb(180,83,9)' : 'rgb(251,191,36)',
                      })
                    const accent = PROVIDER_BRAND_COLORS[model.provider] ?? '#888'
                    // Free tier is clamped per mode (plan → Sonnet, execute →
                    // deepseek-v4-flash); the unscoped picker keeps the single
                    // free-tier model.
                    const locked = modelPicker.mode
                      ? isModeModelLocked(
                          model.id,
                          modelPicker.mode,
                          isFreeTier,
                          AVAILABLE_MODELS,
                          FREE_TIER_MODEL,
                        )
                      : isFreeTier && model.id !== FREE_TIER_MODEL
                    // Price-based color: green ≤$1, yellow ≤$3, red >$3 (input per MTok)
                    const priceColor =
                      model.inputPricePerMTok <= 1
                        ? isLight
                          ? 'rgb(22,163,74)'
                          : 'rgb(74,222,128)'
                        : model.inputPricePerMTok <= 3
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
                            if (locked) {
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
                                buildUpgradeCta?.({}) ?? undefined,
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
                            <span className={cm.fontWeight('medium')}>{model.label}</span>
                            <span style={{ fontSize: '10px', color: accent, opacity: 0.85 }}>
                              {model.provider}
                            </span>
                            {model.id === currentModel && (
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
                            {locked && (
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
                          </div>
                          <span style={{ fontSize: '12px', opacity: 0.7 }}>
                            {model.description}
                          </span>
                          <span style={{ fontSize: '11px', opacity: 0.65 }}>
                            {formatTokenCount(model.contextWindow)} ctx ·{' '}
                            {formatTokenCount(model.maxOutputTokens)} out ·{' '}
                            <span style={{ color: priceColor }}>
                              ${model.inputPricePerMTok}/{model.outputPricePerMTok}
                            </span>
                            /MTok · {model.knowledgeCutoff}
                          </span>
                          {badges.length > 0 && (
                            <span
                              style={{
                                display: 'flex',
                                gap: '4px',
                                flexWrap: 'wrap',
                                marginTop: '1px',
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
              maxHeight: '70vh',
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
                  maxHeight: '70vh',
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

        {/* Commit bar — anchored above the textarea (hidden when a popup menu is open) */}
        {pendingFiles != null && pendingFiles.length > 0 && !commandMenu && !modelPicker && (
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
              {/* When auto-commit is armed, the green countdown occupies the Commit
                  button's slot (P3-15); cancelling it (click) falls back to the
                  manual Commit button. */}
              {isAutoCommitArmed(autoCommit) ? (
                <AutoCommitBadge
                  state={autoCommit}
                  onCancel={() => dispatchAutoCommit({ type: 'set', seconds: 0 })}
                  inline
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCommit()
                  }}
                  disabled={
                    commitState?.status === 'committing' || commitState?.status === 'committed'
                  }
                  onMouseEnter={(e) => {
                    if (
                      !(commitState?.status === 'committing' || commitState?.status === 'committed')
                    ) {
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
                    borderRadius: 6,
                    border: '1px solid rgba(64,112,224,0.4)',
                    background: 'rgba(64,112,224,0.2)',
                    color: '#4070e0',
                    cursor:
                      commitState?.status === 'committing' || commitState?.status === 'committed'
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      commitState?.status === 'committing' || commitState?.status === 'committed'
                        ? 0.5
                        : 1,
                    transition: 'background 100ms, border-color 100ms, color 100ms',
                  }}
                >
                  {commitState?.status === 'committing'
                    ? t('ide.chat.committing')
                    : t('ide.chat.commit')}
                </button>
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
                        {!!f.additions && <span style={{ color: '#3fb950' }}>+{f.additions}</span>}
                        {!!f.additions && !!f.deletions && ' '}
                        {!!f.deletions && <span style={{ color: '#f85149' }}>-{f.deletions}</span>}
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
                          width: 18,
                          height: 18,
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

        {/* Input container — matches user message card style */}
        <div
          className={cm.surfaceSecondary}
          style={{
            // Full IDE: flush with the panel's left/right/bottom edges (no rounding).
            // Discovery: round ALL FOUR corners (8px) so the composer's gradient ring
            // is rounded uniformly on every corner, flush inside the rounded discovery
            // card (P3-23). The ring's `border-radius: inherit` follows this; the card
            // is full-width here (its stray right-divider is suppressed in discovery —
            // see Workspace.css) so the composer reaches both side edges.
            ...(discovery ? { borderRadius: 8 } : {}),
            padding: '8px 10px',
            cursor: 'text',
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
            placeholder={t('ide.chat.placeholder')}
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
                fixed 24×24 flex-centered boxes so text glyphs and SVGs align identically. */}
            {/* Plan/Execute mode toggle */}
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
                width: 24,
                height: 24,
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
                cursor: 'pointer',
                color: mode === 'plan' ? (isLight ? '#d97706' : '#eab308') : 'inherit',
                opacity: mode === 'plan' ? 1 : 0.4,
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
            {/* Voice input button — only rendered when Web Speech API is available */}
            {hasSpeechRecognition && (
              <button
                type="button"
                onClick={toggleVoice}
                title={t('ide.chat.voice', undefined, {
                  defaultValue: isListening ? 'Stop dictation' : 'Dictate',
                })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
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
            )}
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
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
                    if (!(inputRef.current as string)) {
                      setInputValue('/')
                      autoResize()
                      setCommandMenu({ selectedIdx: -1 })
                    }
                    setTimeout(() => {
                      textareaRef.current?.focus()
                    }, 0)
                  },
                },
              ] as const
            ).map(({ sym, nudgeY, size: fontSize, title, onClick }) => (
              <button
                key={sym}
                type="button"
                onClick={onClick}
                title={title}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
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
            {/* Context usage ring */}
            {contextUsage &&
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
                    onMouseEnter={(e) => {
                      const pctEl = e.currentTarget.querySelector<HTMLElement>('[data-ctx-pct]')
                      if (pctEl) {
                        pctEl.style.opacity = '1'
                        pctEl.style.width = 'auto'
                      }
                    }}
                    onMouseLeave={(e) => {
                      const pctEl = e.currentTarget.querySelector<HTMLElement>('[data-ctx-pct]')
                      if (pctEl) {
                        pctEl.style.opacity = '0'
                        pctEl.style.width = '0'
                      }
                    }}
                  >
                    <span
                      data-ctx-pct=""
                      style={{
                        color,
                        fontSize: '10px',
                        lineHeight: 1,
                        opacity: 0,
                        width: 0,
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
                marginLeft: contextUsage ? '4px' : 'auto',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              {isLoading && (
                <button
                  type="button"
                  onClick={abort}
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
          onClose={() => setReportModal(null)}
          onSubmitted={(result: ReportResult) => {
            setReportModal(null)
            const { key, defaultValue } = formatReportConfirmation(result)
            addSystemCard(
              t(key, { productName }, { defaultValue }),
              result.url
                ? {
                    label: t('ide.chat.report.viewIssue', undefined, {
                      defaultValue: 'View issue',
                    }),
                    href: result.url,
                  }
                : undefined,
            )
          }}
        />
      )}

      {/* ── Share-link modal (/share, header share button) ── */}
      {shareModal && (
        <ShareModal
          projectId={projectId}
          initialRole={shareModal.role}
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
                label: t('ide.chat.share.openLink', undefined, { defaultValue: 'Open link' }),
                href: buildShareUrl(
                  result,
                  typeof window !== 'undefined' ? window.location.origin : '',
                ),
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
 * @param root0 - Component props.
 * @param root0.projectId - The project ID for the chat session.
 * @param root0.endpoint - Optional custom chat API endpoint URL.
 * @param root0.initialMessage - Optional initial message to auto-send on mount.
 * @param root0.onInitialMessageSent - Callback fired after the initial message is sent.
 * @param root0.activeFile - Path of the currently focused file in the editor.
 * @param root0.openTabs - Paths of all open editor tabs.
 * @param root0.onFileOpen - Callback to preview a file in the editor.
 * @param root0.onFileDoubleClick - Callback to pin a file tab in the editor.
 * @param root0.onFileDiff - Callback to open a side-by-side diff view.
 * @param root0.onFileRevert - Callback to revert a file to previous content.
 * @param root0.onFileChange - Callback when a file's content changes from AI edits.
 * @param root0.onFileDeleted - Callback fired when a file is deleted.
 * @param root0.onCommit - Callback fired after a successful commit.
 * @param root0.onActivityClick - Callback to open the Activity panel filtered to a clicked activity card.
 * @param root0.onReadyToBuild - Callback fired on the ready_to_build stream event to boot the sandbox.
 * @param root0.onClientAction - Callback fired on the client_action stream event (reload/navigate preview, open file).
 * @param root0.onTurnComplete - Callback fired on each stream done/error; host uses it to keep the boot view up until the during-boot plan stream completes.
 * @param root0.autoSubmitSignal - Changing this submits the current input draft (prompt→chat morph).
 * @param root0.initialInputValue - Seeds the input with this text on mount (prompt→chat morph).
 * @param root0.hideConversationMenu - Hide the conversation-selector header (e.g. during discovery).
 * @param root0.gitStatusTick - Counter that increments when git status changes.
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @param root0.pendingMessageSuppressUser - When true, send the pending message without rendering a user bubble (auto-sent build kickoff).
 * @param root0.userEditedFile - File path the user just edited — auto-deletes queued autofix messages referencing it.
 * @param root0.userEditedFileKey - Key to distinguish repeated edits to the same file.
 * @param root0.isPro - Whether the current user has a Pro plan.
 * @param root0.buildUpgradeCta - Host-supplied builder for upgrade/sign-in CTA buttons.
 * @param root0.buildHelpUpgradeSection - Host-supplied builder for the `/help` upgrade section.
 * @param root0.className - Optional CSS class name for the container.
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
  onProfileClick,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
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
  gitStatusTick,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  userEditedFile,
  userEditedFileKey,
  isPro,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  userAvatar,
  agentName,
  productName,
  version,
  feedbackUrl,
  className,
}: ChatPanelProps): JSX.Element {
  const cm = getClassMap()
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
          style={{ position: 'relative', height: '33px', zIndex: 10 }}
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

          {/* Share button — opens the /share link modal */}
          <button
            type="button"
            data-mol-id="chat-share-button"
            onClick={() => setOpenShareSignal((n) => n + 1)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
            title={t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })}
            aria-label={t('ide.chat.share.openShare', undefined, {
              defaultValue: 'Share project',
            })}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
          >
            <Icon name="share" size={14} aria-hidden="true" />
          </button>

          {/* Bug-report button — opens the /report modal */}
          <button
            type="button"
            data-mol-id="chat-report-button"
            onClick={() => setOpenReportSignal((n) => n + 1)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
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
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
            title={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
            aria-label={t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
          >
            <Icon name="gear" size={14} aria-hidden="true" />
          </button>

          {/* New chat button */}
          <button
            type="button"
            onClick={handleNewChat}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
            title={t('ide.chat.newChat', undefined, { defaultValue: 'New chat' })}
            style={{ flexShrink: 0 }}
          >
            +
          </button>

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
                maxHeight: '280px',
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
        onProfileClick={onProfileClick}
        onReadyToBuild={onReadyToBuild}
        awaitingSandboxBoot={awaitingSandboxBoot}
        onClientAction={onClientAction}
        onTurnComplete={onTurnComplete}
        autoSubmitSignal={autoSubmitSignal}
        openSettingsSignal={effectiveSettingsSignal}
        openReportSignal={effectiveReportSignal}
        openShareSignal={effectiveShareSignal}
        initialInputValue={initialInputValue}
        pendingMessage={pendingMessage}
        pendingMessageKey={pendingMessageKey}
        pendingMessageSuppressUser={pendingMessageSuppressUser}
        userEditedFile={userEditedFile}
        userEditedFileKey={userEditedFileKey}
        gitStatusTick={gitStatusTick}
        discovery={hideConversationMenu}
        userAvatar={userAvatar}
        agentName={agentName}
        productName={productName}
        version={version}
        feedbackUrl={feedbackUrl}
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

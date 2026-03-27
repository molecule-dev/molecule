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

import type { JSX } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatTokenCount, MODELS, PROVIDER_BRAND_COLORS } from '@molecule/ai-models'
import type { ChatMessage } from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'
import { useChat, useHttpClient, useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ChatPanelProps } from '../types.js'
import { MarkdownContent } from './MarkdownContent.js'
import { StreamingIndicator } from './StreamingIndicator.js'
import { ToolCallCard } from './ToolCallCard.js'

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

interface SystemCard {
  id: string
  text: string
  timestamp: number
  action?:
    | { label: string; href?: string; onClick?: () => void }
    | { label: string; href?: string; onClick?: () => void }[]
}

interface CommandDef {
  id: string
  label: string
  description: string
  category: 'context' | 'code' | 'model' | 'settings' | 'support'
}

const COMMAND_CATEGORIES = [
  { key: 'context' as const, label: 'Context' },
  { key: 'code' as const, label: 'Code' },
  { key: 'model' as const, label: 'Model' },
  { key: 'settings' as const, label: 'Settings' },
  { key: 'support' as const, label: 'Support' },
] as const

const COMMANDS: CommandDef[] = [
  // Context
  { id: 'clear', label: '/clear', description: 'Clear conversation', category: 'context' },
  {
    id: 'compact',
    label: '/compact',
    description: 'Compress context to free space',
    category: 'context',
  },
  {
    id: 'cost',
    label: '/cost',
    description: 'Show token usage & estimated cost',
    category: 'context',
  },

  // Code
  { id: 'commit', label: '/commit', description: 'Commit current changes', category: 'code' },
  { id: 'diff', label: '/diff', description: 'Show uncommitted changes', category: 'code' },
  {
    id: 'explain',
    label: '/explain',
    description: 'Explain code (e.g. /explain @file)',
    category: 'code',
  },
  { id: 'lint', label: '/lint', description: 'Run linter and fix issues', category: 'code' },
  { id: 'test', label: '/test', description: 'Run project test suite', category: 'code' },
  {
    id: 'undo',
    label: '/undo',
    description: "Revert last AI turn's file changes",
    category: 'code',
  },

  // Model
  { id: 'model', label: '/model', description: 'Switch model...', category: 'model' },
  { id: 'plan', label: '/plan', description: 'Toggle plan/execute mode', category: 'model' },
  { id: 'maxloops', label: '/maxloops', description: 'Set max tool iterations', category: 'model' },

  // Settings
  {
    id: 'autofix',
    label: '/autofix',
    description: 'Toggle auto-fix after AI file changes',
    category: 'settings',
  },
  { id: 'sounds', label: '/sounds', description: 'Notification sounds', category: 'settings' },

  // Support
  { id: 'help', label: '/help', description: 'Workflow guide & tips', category: 'support' },
]

type CommandId = CommandDef['id']

const FREE_TIER_MODEL = MODELS.find((m) => m.freeTier)?.id ?? MODELS[0].id

interface ModelPicker {
  selectedIdx: number
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
  done: 'Synthase finished responding',
  error: 'Something went wrong during a response',
  tool_result: 'A tool call (file read, command, etc.) completed',
  file_diff: 'A file was created or modified',
  commit_suggestion: 'Synthase is suggesting files to commit',
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
  } catch {
    // AudioContext not available — silently skip
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
    return t(
      'ide.chat.thoughtForSeconds',
      { count: seconds },
      { defaultValue: `Thought for ${seconds} second${seconds === 1 ? '' : 's'}` },
    )
  }
  const minutes = Math.round(seconds / 60)
  return t(
    'ide.chat.thoughtForMinutes',
    { count: minutes },
    { defaultValue: `Thought for ${minutes} minute${minutes === 1 ? '' : 's'}` },
  )
}

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
          width="12"
          height="12"
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
        : t('ide.chat.typeErrorsCount', { count: n }, { defaultValue: `${n} type errors` }),
    )
  }
  if (cats.includes('lint')) {
    const n = output ? (output.match(/\d+:\d+\s+error/g) ?? []).length || 1 : 1
    const w = warningCount
    if (n > 0)
      parts.push(
        n === 1
          ? t('ide.chat.lintErrorCount', { count: 1 }, { defaultValue: '1 lint error' })
          : t('ide.chat.lintErrorsCount', { count: n }, { defaultValue: `${n} lint errors` }),
      )
    if (w > 0)
      parts.push(
        w === 1
          ? t('ide.chat.lintWarningCount', { count: 1 }, { defaultValue: '1 warning' })
          : t('ide.chat.lintWarningsCount', { count: w }, { defaultValue: `${w} warnings` }),
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
        <a
          href={ctaHref ?? '/pricing'}
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
function CommitCardItem({
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
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '4px' }}>
        <button
          type="button"
          onClick={hasFiles ? () => setExpanded((e) => !e) : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '4px',
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
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: expanded ? 'normal' : 'nowrap',
                }}
              >
                {isRunning ? (
                  t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
                ) : (
                  <>
                    {t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })}{' '}
                    <code
                      style={{
                        fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                        fontSize: 'inherit',
                      }}
                    >
                      {card.message}
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
// MessageItem — memo'd to avoid re-rendering all messages when one changes
// ---------------------------------------------------------------------------

interface MessageItemProps {
  msg: ChatMessage
  prevMsg: ChatMessage | undefined
  editingQueuedId: string | null
  editingQueuedText: string
  setEditingQueuedId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingQueuedText: React.Dispatch<React.SetStateAction<string>>
  editQueuedMessage: (id: string, content: string) => void
  deleteQueuedMessage: (id: string) => void
  sendMessage: (msg: string) => void
  handleAskUserResponse: (response: string) => void
  isLoading: boolean
  undoneTcIds: Set<string>
  handleUndoToggle: (tcId: string, undone: boolean) => void
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  handleFileRevert: (path: string, content: string) => Promise<void>
  setInputAndCursorEnd: (val: string) => void
  setModelPicker: React.Dispatch<React.SetStateAction<ModelPicker | null>>
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
    prevMsg,
    editingQueuedId,
    editingQueuedText,
    setEditingQueuedId,
    setEditingQueuedText,
    editQueuedMessage,
    deleteQueuedMessage,
    sendMessage,
    handleAskUserResponse,
    isLoading,
    undoneTcIds,
    handleUndoToggle,
    onFileOpen,
    onFileDoubleClick,
    onFileDiff,
    handleFileRevert,
    setInputAndCursorEnd,
    setModelPicker,
  } = props

  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const borderClr = isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'

  const sameRoleAsPrev = prevMsg?.role === msg.role
  const isUser = msg.role === 'user'

  return (
    <div style={{ marginBottom: '16px' }}>
      {isUser ? (
        <div
          className={cm.cn(cm.surfaceSecondary, cm.textSize('sm'))}
          style={{
            borderRadius: '4px',
            borderLeft: '2px solid var(--mol-color-primary, #6366f1)',
            paddingLeft: '10px',
            paddingTop: '4px',
            paddingBottom: '4px',
          }}
        >
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
      ) : (
        <div style={{ paddingLeft: sameRoleAsPrev ? '0' : '0' }}>
          {msg.isStreaming &&
            (!msg.blocks || msg.blocks.every((b) => (b as { type: string }).type === 'thinking')) &&
            !msg.content && <StreamingIndicator />}

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
                        margin: '8px 0 16px',
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
                  {isLast && msg.isStreaming && <StreamingIndicator />}
                </div>
              )
            })
          ) : msg.content ? (
            <MarkdownContent text={msg.content} isStreaming={msg.isStreaming} />
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
  isAnonymous?: boolean
  isPro?: boolean
  activeFile?: string | null
  openTabs?: string[]
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  onFileRevert?: (path: string, content: string) => Promise<void>
  onFileChange?: (path: string, content: string) => void
  onFileDeleted?: (path: string) => void
  onCommit?: () => void
  onConversationId?: (id: string) => void
  pendingMessage?: string
  pendingMessageKey?: number
  /** File path edited by the user in the editor — triggers auto-deletion of queued autofix messages referencing this file. */
  userEditedFile?: string
  userEditedFileKey?: number
  gitStatusTick?: number
}

/**
 * Inner chat component that owns useChat state, message rendering, and input handling.
 * @param root0 - Component props.
 * @param root0.projectId - The project ID for the chat session.
 * @param root0.endpoint - The chat API endpoint URL.
 * @param root0.initialMessage - Optional message to auto-send on mount.
 * @param root0.onInitialMessageSent - Callback fired after the initial message is sent.
 * @param root0.isAnonymous - Whether the current user is anonymous.
 * @param root0.isPro - Whether the current user has a Pro plan.
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
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @param root0.userEditedFile - File path the user just edited — auto-deletes queued autofix messages referencing it.
 * @param root0.userEditedFileKey - Key to distinguish repeated edits to the same file.
 * @param root0.gitStatusTick - Counter that increments when git status changes.
 * @returns The rendered chat inner component.
 */
function ChatInner({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  isAnonymous,
  isPro,
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
  pendingMessage,
  pendingMessageKey,
  userEditedFile,
  userEditedFileKey,
  gitStatusTick: externalGitStatusTick,
}: ChatInnerProps): JSX.Element {
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const http = useHttpClient()
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

  // Clear countdown interval on unmount
  useEffect(
    () => () => {
      if (autoFixIntervalRef.current) clearInterval(autoFixIntervalRef.current)
    },
    [],
  )

  // Track completed assistant turns to inject periodic sign-up reminders.
  // First reminder after 3 turns, then every 10 turns thereafter.
  const turnCountRef = useRef(0)
  const addSystemCardRef = useRef<(text: string, action?: SystemCard['action']) => void>(() => {})
  const GUEST_REMINDER_FIRST = 3
  const GUEST_REMINDER_INTERVAL = 10

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
      // Upgrade prompt from backend (e.g. free user tried to raise max loops)
      if (event.type === 'upgrade_prompt') {
        addSystemCardRef.current(event.message as string, {
          label: t('upgrade.viewPlans', undefined, { defaultValue: 'Upgrade' }),
          href: '/pricing',
        })
      }
      // Periodic sign-up reminder for anonymous users in chat history
      if (event.type === 'done' && isAnonymous) {
        turnCountRef.current++
        const n = turnCountRef.current
        if (
          n === GUEST_REMINDER_FIRST ||
          (n > GUEST_REMINDER_FIRST && (n - GUEST_REMINDER_FIRST) % GUEST_REMINDER_INTERVAL === 0)
        ) {
          addSystemCardRef.current(
            t('guest.reminder.message', undefined, {
              defaultValue:
                'Sign up or log in to keep your work \u2014 guest sessions expire after 72 hours.',
            }),
            [
              {
                label: t('upgrade.signUp', undefined, { defaultValue: 'Sign up' }),
                href: '/signup',
              },
              {
                label: t('guest.reminder.logIn', undefined, { defaultValue: 'Log in' }),
                href: '/login',
              },
            ],
          )
        }
      }
      const cfg = soundsConfigRef.current
      const eventType = event.type as SoundEventType
      if (eventType in cfg && shouldPlaySound(cfg[eventType])) {
        playTone()
      }
    },
    [isAnonymous, t],
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
  const sendMessageRef = useRef<(msg: string) => void>(() => {})
  useEffect(() => {
    if (autoFixCountdown && autoFixCountdown.secondsLeft === 0 && !autoFixCountdown.paused) {
      const msg = `Fix these issues:\n\n${autoFixCountdown.output}`
      setAutoFixCountdown(null)
      sendMessageRef.current(msg)
    }
  }, [autoFixCountdown])

  // Auto-pause countdown when user starts typing
  const handleAutoFixPauseOnInput = useCallback(() => {
    setAutoFixCountdown((prev) => (prev && !prev.paused ? { ...prev, paused: true } : prev))
  }, [])

  // Cancel countdown when file changes arrive (AI likely fixing things in a new turn)
  const onFileChangeWrapped = useCallback(
    (path: string, content: string) => {
      if (autoFixCountdown) {
        const norm = path.replace(/^\/workspace\//, '')
        const isRelevant = autoFixCountdown.changedPaths.some(
          (p) => p.replace(/^\/workspace\//, '') === norm,
        )
        if (isRelevant) setAutoFixCountdown(null)
      }
      // Auto-open plan files in the editor when saved
      const cleanPath = path.replace(/^\/workspace\//, '')
      if (cleanPath.startsWith('.agents/plans/') && onFileOpen) {
        onFileOpen(cleanPath)
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
    setMode,
    sendMessage,
    abort,
    clearHistory,
    editQueuedMessage,
    deleteQueuedMessage,
    clearQueuedForFile,
  } = useChat({
    endpoint,
    projectId,
    loadOnMount: hasConversation || !initialMessage,
    onFileChange: onFileChangeWrapped,
    onConversationId,
    onStreamEvent: handleStreamEvent,
  })

  // Keep sendMessageRef in sync so the countdown effect can call the latest sendMessage
  sendMessageRef.current = sendMessage

  // Ref-stable callback for ToolCallCard's onAskUserResponse — avoids breaking
  // React.memo when sendMessage's identity changes (provider/endpoint deps).
  const handleAskUserResponse = useCallback((response: string) => {
    sendMessageRef.current(response)
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
      try {
        return sessionStorage.getItem(draftKey) ?? ''
      } catch {
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
        } catch {
          /* unavailable */
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
      } catch {
        /* quota exceeded or unavailable */
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
  // Keep a ref to the latest messages so addSystemCard can read them
  // without adding messages to its dependency array (avoids re-creation on
  // every streaming chunk).
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const addSystemCard = useCallback((text: string, action?: SystemCard['action']) => {
    // If a message is actively streaming, place the card just before it so
    // it doesn't get pinned below the growing response.
    let ts = Date.now()
    const streaming = messagesRef.current.find((m) => m.isStreaming)
    if (streaming && streaming.timestamp <= ts) {
      ts = streaming.timestamp - 1
    }
    setSystemCards((prev) => [...prev, { id: crypto.randomUUID(), text, timestamp: ts, action }])
    // Auto-scroll after the card renders so the user sees it immediately
    if (!userScrolledUpRef.current) {
      setTimeout(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [])
  addSystemCardRef.current = addSystemCard

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
      } catch {
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
  const DEFAULT_MODEL = FREE_TIER_MODEL
  const AVAILABLE_MODELS = MODELS
  const isFreeTier = !isPro
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODEL)
  const [currentMaxLoops, setCurrentMaxLoops] = useState<number>(100)
  const [autoFixEnabled, setAutoFixEnabled] = useState<boolean>(true)
  useEffect(() => {
    http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        if (typeof s?.chatModel === 'string') setCurrentModel(s.chatModel)
        if (typeof s?.maxToolLoops === 'number') setCurrentMaxLoops(s.maxToolLoops)
        if (typeof s?.autoFix === 'boolean') setAutoFixEnabled(s.autoFix)
        if (s?.sounds && typeof s.sounds === 'object') {
          setSoundsConfig((prev) => ({ ...prev, ...(s.sounds as Partial<SoundsConfig>) }))
        }
      })
      .catch(() => {
        /* ignore */
      })
  }, [http, projectId])

  // ── Queued message editing ──────────────────────────────────────────────────
  const [editingQueuedId, setEditingQueuedId] = useState<string | null>(null)
  const [editingQueuedText, setEditingQueuedText] = useState('')

  // ── Input focus ────────────────────────────────────────────────────────────
  const [isFocused, setIsFocused] = useState(false)

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
    const check = () => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }
    const onWheel = () => requestAnimationFrame(check)
    let touchY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
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
      if (isLoading) {
        // AI is busy — defer until streaming ends
        deferredPendingRef.current = pendingMessage
      } else {
        deferredPendingRef.current = null
        sendMessage(pendingMessage)
      }
    }
  }, [pendingMessage, pendingMessageKey, sendMessage, isLoading])

  // When streaming ends, send any deferred message
  useEffect(() => {
    if (!isLoading && deferredPendingRef.current) {
      const msg = deferredPendingRef.current
      deferredPendingRef.current = null
      sendMessage(msg)
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
    } catch {
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
      } catch {
        // handled by caller
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
        } catch {
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

      // Show model picker when typing "/model <filter>"
      const modelMatch = val.match(/^\/model\s+/i)
      if (modelMatch) {
        setModelPicker({ selectedIdx: -1 })
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

  /** Select and apply a model by ID. */
  const selectModel = useCallback(
    async (modelId: string, displayName?: string) => {
      setModelPicker(null)
      setInputValue('')
      try {
        await http.patch(`/projects/${projectId}`, { settings: { chatModel: modelId } })
        setCurrentModel(modelId)
        addSystemCard(
          t(
            'ide.chat.modelSet',
            { name: displayName ?? modelId },
            {
              defaultValue: `Chat model set to ${displayName ?? modelId}`,
            },
          ),
        )
      } catch {
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
      } else if (id === 'help') {
        setInputValue('')
        const lines = [
          '── Getting Started ──',
          "Synthase is Molecule.dev's AI coding agent. Describe what you want to build and it will scaffold, code, and iterate with you.",
          '',
          '── Workflow ──',
          '1. Describe your app or feature in plain language',
          '2. Synthase writes code, creates files, and runs tools',
          '3. See changes live in the preview panel',
          '4. Use @filename to reference project files, or drag & drop any file as context',
          "5. Use /commit when you're happy with the changes",
          '6. Deploy from the project dashboard',
          '',
          '── Tips ──',
          '• Be specific — "Add a login page with email/password and Google OAuth" works better than "add auth"',
          '• Use /plan to have the AI research before making changes',
          '• Use /undo if the AI goes in the wrong direction',
          '• Use /compact if the conversation gets long',
          '• Type / to see all available commands',
          '',
          'Press Cmd+/ (Ctrl+/ on Windows/Linux) to view all keyboard shortcuts.',
        ]
        if (isAnonymous) {
          lines.push(
            '',
            '── Upgrade ──',
            "You're using Molecule.dev as a guest. Sign up for free to unlock:",
            '• Deployments & environment variable management',
            '• 50 AI messages/day (vs 30 as guest)',
            '• Persistent project history',
            '',
            'Go Pro ($19/mo) for even more:',
            '• All models — Opus 4.6, Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro, and more',
            '• 500 AI messages/day',
            '• Larger sandboxes — 2 CPU, 2 GB RAM, 30 min timeout',
            '• 10 projects, 10 deployments, custom domains',
            '• 5 GB storage & email support',
          )
        } else {
          lines.push(
            '',
            '── Upgrade to Pro ──',
            'Unlock the full Molecule.dev experience ($19/mo):',
            '• All models — Opus 4.6, Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro, and more',
            '• 500 AI messages/day (vs 50 on free)',
            '• Larger sandboxes — 2 CPU, 2 GB RAM, 30 min timeout',
            '• 10 projects, 10 deployments, custom domains',
            '• 5 GB storage & email support',
          )
        }
        addSystemCard(
          lines.join('\n'),
          isAnonymous
            ? [
                { label: 'Sign up free', href: '/signup' },
                { label: 'Log in', href: '/login' },
              ]
            : { label: 'View plans', href: '/pricing' },
        )
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
        } catch {
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
            t('ide.chat.costSummary', undefined, {
              defaultValue: [
                `Model:  ${d.model}`,
                `Input:  ${fmt(d.inputTokens)} tokens`,
                `Output: ${fmt(d.outputTokens)} tokens`,
                `Cost:   ~$${d.estimatedCost.toFixed(4)}`,
              ].join('\n'),
            }),
          )
        } catch {
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
        } catch {
          addSystemCard(
            t('ide.chat.undoError', undefined, { defaultValue: 'Failed to revert changes.' }),
          )
        }
      } else if (id === 'diff') {
        setInputValue('')
        try {
          const res = await http.get<{
            files: { path: string; status: string; additions?: number; deletions?: number }[]
          }>(`/projects/${projectId}/git-status`)
          const files = res.data.files
          if (!files.length) {
            addSystemCard(
              t('ide.chat.diffNoChanges', undefined, { defaultValue: 'No uncommitted changes.' }),
            )
          } else {
            const lines = files.map((f) => {
              const adds = f.additions != null ? ` +${f.additions}` : ''
              const dels = f.deletions != null ? ` -${f.deletions}` : ''
              return `${f.status.padEnd(10)} ${f.path}${adds}${dels}`
            })
            addSystemCard(
              t('ide.chat.diffSummary', undefined, {
                defaultValue: `${files.length} changed file(s):\n${lines.join('\n')}`,
              }),
            )
          }
        } catch {
          addSystemCard(
            t('ide.chat.diffError', undefined, { defaultValue: 'Failed to fetch changes.' }),
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
        } catch {
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
        } catch {
          addSystemCard(
            t('ide.chat.autoFixError', undefined, {
              defaultValue: 'Failed to update auto-fix setting.',
            }),
          )
        }
      } else if (id === 'sounds') {
        setInputValue('')
        setSoundsPicker({ selectedIdx: -1 })
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
                defaultValue: `${resolved?.label ?? name} is available on Pro. Upgrade to access all models.`,
              },
            ),
            isAnonymous
              ? [
                  {
                    label: t('upgrade.signUp', undefined, { defaultValue: 'Sign up' }),
                    href: '/signup',
                  },
                  {
                    label: t('upgrade.viewPlans', undefined, { defaultValue: 'View plans' }),
                    href: '/pricing',
                  },
                ]
              : {
                  label: t('upgrade.viewPlans', undefined, { defaultValue: 'Upgrade' }),
                  href: '/pricing',
                },
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
          } catch {
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
            {
              label: data.requiresSignup
                ? t('upgrade.signUp', undefined, { defaultValue: 'Sign up' })
                : t('upgrade.viewPlans', undefined, { defaultValue: 'Upgrade' }),
              href: data.requiresSignup ? '/signup' : '/pricing',
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
          } catch {
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
  }, [attachedFiles, http, projectId, sendMessage, setInputValue])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const filteredCmds = commandMenu
    ? COMMANDS.filter((c) => c.label.startsWith(inputRef.current as string))
    : []

  const filteredModels = useMemo(() => {
    if (!modelPicker) return []
    const val = inputRef.current as string
    const match = val.match(/^\/model\s+(.*)/i)
    const q = (match?.[1] ?? '').trim().toLowerCase()
    if (!q) return AVAILABLE_MODELS
    return AVAILABLE_MODELS.filter(
      (m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q),
    )
  }, [modelPicker])

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

    if (modelPicker && filteredModels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { selectedIdx: wrapIdx(m.selectedIdx, 1, filteredModels.length) } : null,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setModelPicker((m) =>
          m ? { selectedIdx: wrapIdx(m.selectedIdx, -1, filteredModels.length) } : null,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const model = filteredModels[modelPicker.selectedIdx >= 0 ? modelPicker.selectedIdx : 0]
        if (model) void selectModel(model.id, model.label)
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

  // Build a unified timeline so commit cards appear at the correct position
  type TimelineItem =
    | { kind: 'message'; msg: (typeof messages)[number]; msgIdx: number }
    | { kind: 'commit'; card: CommitCard }
    | { kind: 'system'; card: SystemCard }
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...messages.map((msg, i) => ({ kind: 'message' as const, msg, msgIdx: i })),
      ...commitCards.map((card) => ({ kind: 'commit' as const, card })),
      ...systemCards.map((card) => ({ kind: 'system' as const, card })),
    ]
    items.sort((a, b) => {
      const tA = a.kind === 'message' ? a.msg.timestamp : a.card.timestamp
      const tB = b.kind === 'message' ? b.msg.timestamp : b.card.timestamp
      return tA - tB
    })
    return items
  }, [messages, commitCards, systemCards])

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
        style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', ...cm.sp({ pr: 1 }) }}
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

            if (item.kind === 'system') {
              const isMultiLine = item.card.text.includes('\n')
              const actions = item.card.action
                ? Array.isArray(item.card.action)
                  ? item.card.action
                  : [item.card.action]
                : []
              const isGuestReminder = actions.some(
                (a) => a.href === '/signup' || a.href === '/login',
              )
              return (
                <div
                  key={item.card.id}
                  className={cm.cn(
                    cm.textSize(isGuestReminder ? 'sm' : 'xs'),
                    isGuestReminder ? undefined : cm.textMuted,
                  )}
                  style={
                    isGuestReminder
                      ? {
                          textAlign: 'center',
                          padding: '10px 16px',
                          margin: '8px 0 16px',
                          background: 'rgba(64,112,224,0.10)',
                          border: '1px solid rgba(64,112,224,0.25)',
                          borderRadius: 8,
                          color: 'var(--mol-color-text-secondary, #aaa)',
                        }
                      : {
                          textAlign: isMultiLine ? 'left' : 'center',
                          padding: isMultiLine ? '8px 12px' : '6px 0',
                          whiteSpace: isMultiLine ? 'pre-wrap' : undefined,
                          fontFamily: isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
                          lineHeight: isMultiLine ? 1.5 : undefined,
                        }
                  }
                >
                  {item.card.text}
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

            const { msg, msgIdx } = item

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
                prevMsg={messages[msgIdx - 1]}
                editingQueuedId={editingQueuedId}
                editingQueuedText={editingQueuedText}
                setEditingQueuedId={setEditingQueuedId}
                setEditingQueuedText={setEditingQueuedText}
                editQueuedMessage={editQueuedMessage}
                deleteQueuedMessage={deleteQueuedMessage}
                sendMessage={sendMessage}
                handleAskUserResponse={handleAskUserResponse}
                isLoading={isLoading}
                undoneTcIds={undoneTcIds}
                handleUndoToggle={handleUndoToggle}
                onFileOpen={onFileOpen}
                onFileDoubleClick={onFileDoubleClick}
                onFileDiff={onFileDiff}
                handleFileRevert={handleFileRevert}
                setInputAndCursorEnd={setInputAndCursorEnd}
                setModelPicker={setModelPicker}
              />
            )
          },
        )}

        {error &&
          (errorMeta?.limitType ? (
            <ResourceLimitBanner
              message={error}
              ctaLabel={
                errorMeta.requiresSignup
                  ? t('upgrade.signUp', undefined, { defaultValue: 'Sign up' })
                  : t('upgrade.viewPlans', undefined, { defaultValue: 'Upgrade' })
              }
              ctaHref={errorMeta.requiresSignup ? '/signup' : '/pricing'}
            />
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

      {/* ── Input area ── */}
      <div className={cm.cn(cm.shrink0, cm.borderT)} style={{ position: 'relative' }}>
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
                        if (cmd.id === 'model')
                          suffix = ` (${AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel})`
                        else if (cmd.id === 'maxloops') suffix = ` (${currentMaxLoops})`
                        else if (cmd.id === 'autofix')
                          suffix = ` (${autoFixEnabled ? 'on' : 'off'})`
                        else if (cmd.id === 'sounds') {
                          const modes = SOUND_EVENTS.map((e) => soundsConfig[e])
                          const allSame = modes.every((m) => m === modes[0])
                          suffix = ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
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
                              style={{ fontFamily: 'monospace', opacity: 0.9, flexShrink: 0 }}
                            >
                              {cmd.label}
                            </span>
                            <span className={cm.textMuted} style={{ fontSize: '12px' }}>
                              {cmd.description}
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
                {/* Footer: version + report */}
                <div
                  className={cm.textMuted}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 12px',
                    borderTop: '1px solid rgba(128,128,128,0.12)',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  <a
                    href="https://github.com/molecule-dev/molecule/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', opacity: 0.7, textDecoration: 'underline' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('ide.chat.reportProblem', undefined, { defaultValue: 'Report a problem' })}
                  </a>
                  <span style={{ opacity: 0.5 }}>
                    {t('ide.chat.version', undefined, { defaultValue: 'Molecule.dev v0.1.0' })}
                  </span>
                </div>
              </div>
            )
          })()}

        {/* Model picker popup */}
        {modelPicker && filteredModels.length > 0 && (
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
                flexShrink: 0,
              }}
            >
              <span>{t('ide.chat.selectModel', undefined, { defaultValue: 'Select model' })}</span>
              <span>
                {t(
                  'ide.chat.currentModelLabel',
                  {
                    model:
                      AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel,
                  },
                  {
                    defaultValue: `Current: ${AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel}`,
                  },
                )}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredModels.map((model, idx) => {
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
                const accent = PROVIDER_BRAND_COLORS[model.provider] ?? '#888'
                const locked = isFreeTier && model.id !== FREE_TIER_MODEL
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
                  <button
                    key={model.id}
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
                              defaultValue: `${model.label} is available on Pro. Upgrade to access all models.`,
                            },
                          ),
                          isAnonymous
                            ? [
                                {
                                  label: t('upgrade.signUp', undefined, {
                                    defaultValue: 'Sign up',
                                  }),
                                  href: '/signup',
                                },
                                {
                                  label: t('upgrade.viewPlans', undefined, {
                                    defaultValue: 'View plans',
                                  }),
                                  href: '/pricing',
                                },
                              ]
                            : {
                                label: t('upgrade.viewPlans', undefined, {
                                  defaultValue: 'Upgrade',
                                }),
                                href: '/pricing',
                              },
                        )
                      } else {
                        void selectModel(model.id, model.label)
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!locked)
                        (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
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
                      opacity: locked ? 0.45 : 1,
                      background:
                        idx === modelPicker.selectedIdx && !locked
                          ? 'rgba(128,128,128,0.1)'
                          : 'transparent',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}
                    >
                      <span className={cm.fontWeight('medium')}>{model.label}</span>
                      <span style={{ fontSize: '10px', color: accent, opacity: 0.85 }}>
                        {model.provider}
                      </span>
                      {model.id === currentModel && (
                        <span
                          style={{
                            fontSize: '10px',
                            background: 'rgba(128,128,128,0.2)',
                            padding: '1px 5px',
                            borderRadius: '3px',
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
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{model.description}</span>
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
                        style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '1px' }}
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
                )
              })}
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
                      {t(`ide.chat.soundEventDesc.${eventType}`, undefined, {
                        defaultValue: SOUND_EVENT_DESCRIPTIONS[eventType],
                      })}
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
              padding: '5px 10px 8px',
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
                    ? commitState.message
                    : commitState?.status === 'error'
                      ? t('ide.chat.commitFailed')
                      : t(
                          'ide.chat.uncommittedFileCount',
                          { count: pendingFiles.length },
                          { defaultValue: '{{count}} uncommitted files' },
                        )}
                </span>
              </div>
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
            borderRadius: '4px',
            borderTop: `1px solid ${isFocused ? 'rgba(99,102,241,0.5)' : 'rgba(128,128,128,0.18)'}`,
            borderRight: `1px solid ${isFocused ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
            borderBottom: `1px solid ${isFocused ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
            borderLeft: `1px solid ${isFocused ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
            transition: 'border-color 120ms',
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
            defaultValue={inputRef.current as string}
            autoComplete="off"
            onChange={handleInputChange}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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
                background: 'none',
                border:
                  mode === 'plan'
                    ? `1px solid ${isLight ? 'rgba(180,130,0,0.45)' : 'rgba(234,179,8,0.5)'}`
                    : 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                color: mode === 'plan' ? (isLight ? '#a16207' : '#eab308') : 'inherit',
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
            ).map(({ sym, nudgeY, size: fontSize, onClick }) => (
              <button
                key={sym}
                type="button"
                onClick={onClick}
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
 * @param root0.gitStatusTick - Counter that increments when git status changes.
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @param root0.userEditedFile - File path the user just edited — auto-deletes queued autofix messages referencing it.
 * @param root0.userEditedFileKey - Key to distinguish repeated edits to the same file.
 * @param root0.isAnonymous - Whether the current user is anonymous.
 * @param root0.isPro - Whether the current user has a Pro plan.
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
  gitStatusTick,
  pendingMessage,
  pendingMessageKey,
  userEditedFile,
  userEditedFileKey,
  isAnonymous,
  isPro,
  className,
}: ChatPanelProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const baseEndpoint = endpoint ?? `/projects/${projectId}/chat`

  const storageKey = `mol-chat-conv:${projectId}`
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
    localStorage.getItem(storageKey),
  )
  // Separate key that only changes on *user-initiated* conversation switches
  // (new chat, select conversation). The backend assigns a conversation ID
  // mid-stream which updates activeConversationId, but must NOT remount
  // ChatInner (that would lose the in-flight messages).
  const [chatKey, setChatKey] = useState(() => localStorage.getItem(storageKey) ?? 'default')
  const [showDropdown, setShowDropdown] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [convSearch, setConvSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const chatEndpoint = activeConversationId
    ? `${baseEndpoint}?conversationId=${activeConversationId}`
    : baseEndpoint

  const fetchConversations = useCallback(async () => {
    try {
      const res = await http.get<{ conversations: ConversationSummary[] }>(
        `/projects/${projectId}/conversations`,
      )
      setConversations(res.data.conversations)
    } catch {
      // non-critical
    }
  }, [http, projectId])

  // Fetch conversations on mount so the header shows the current chat title
  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

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

  const handleNewChat = useCallback(async () => {
    try {
      const res = await http.post<{ id: string }>(`/projects/${projectId}/conversations`, {})
      persistConversationId(res.data.id)
      setChatKey(res.data.id)
    } catch {
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
      {/* ── Header: conversation selector ── */}
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
                <span className={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ opacity: 0.55 }}>
                  {relativeTime(conv.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat inner — remounts on conversation switch ── */}
      <ChatInner
        key={chatKey}
        projectId={projectId}
        endpoint={chatEndpoint}
        initialMessage={initialMessage}
        onInitialMessageSent={onInitialMessageSent}
        isAnonymous={isAnonymous}
        isPro={isPro}
        activeFile={activeFile}
        openTabs={openTabs}
        onFileOpen={onFileOpen}
        onFileDoubleClick={onFileDoubleClick}
        onFileDiff={onFileDiff}
        onFileRevert={onFileRevert}
        onFileChange={onFileChange}
        onFileDeleted={onFileDeleted}
        onCommit={onCommit}
        onConversationId={persistConversationId}
        pendingMessage={pendingMessage}
        pendingMessageKey={pendingMessageKey}
        userEditedFile={userEditedFile}
        userEditedFileKey={userEditedFileKey}
        gitStatusTick={gitStatusTick}
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

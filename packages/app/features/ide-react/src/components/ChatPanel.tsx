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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatTokenCount, MODELS } from '@molecule/ai-models'
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
  currentPath: string
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
}

interface SystemCard {
  id: string
  text: string
  timestamp: number
}

const COMMANDS = [
  { id: 'clear' as const, label: '/clear', description: 'Clear chat history' },
  { id: 'model' as const, label: '/model', description: 'Set AI model (e.g. /model claude-sonnet-4-6)' },
  { id: 'maxloops' as const, label: '/maxloops', description: 'Set max tool iterations (e.g. /maxloops 50)' },
]

type CommandId = (typeof COMMANDS)[number]['id']

const AVAILABLE_MODELS = MODELS

interface ModelPicker {
  selectedIdx: number
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
const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/webm,video/mp4,video/webm'

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
 * Collapsible block for displaying AI thinking/reasoning content.
 * @param root0 - Component props.
 * @param root0.content - The raw thinking text to render.
 * @returns The rendered thinking block element.
 */
function ThinkingBlock({ content }: { content: string }): JSX.Element {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: '6px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
          <polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>Thinking</span>
      </button>
      {open && (
        <div
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{
            paddingLeft: '16px',
            marginTop: '4px',
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
// CommitCardItem — expandable tool-call-style card for commits
// ---------------------------------------------------------------------------

/**
 * Expandable tool-call-style card displaying a commit with its files.
 * @param root0 - Component props.
 * @param root0.card - The commit card data including message, files, and status.
 * @returns The rendered commit card element.
 */
function CommitCardItem({ card }: { card: CommitCard }): JSX.Element {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hasFiles = card.files.length > 0
  const isRunning = card.status === 'running'
  const dotColor = isRunning ? '#e8a000' : card.status === 'error' ? '#f04040' : '#4070e0'

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
            gap: '8px',
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
          <span style={{ color: dotColor, fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>
            ●
          </span>

          {/* Label — single truncated line unless expanded */}
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>
            <span style={{ fontSize: '13px' }}>
              {isRunning
                ? t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
                : <>Commit <code style={{ fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace', fontSize: 'inherit' }}>{card.message}</code></>}
            </span>
            {hasFiles && !expanded && (
              <span
                className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style={{ display: 'block', marginTop: '1px' }}
              >
                {card.files.length} {card.files.length === 1 ? 'file' : 'files'}
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
                marginTop: '6px',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered ? 0.85 : 0.35,
              }}
            >
              <polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
            <div style={{ fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace', fontSize: '11px', lineHeight: 1.6 }}>
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
// ChatInner — owns useChat, messages, input, commit
// ---------------------------------------------------------------------------

interface ChatInnerProps {
  projectId: string
  endpoint: string
  initialMessage?: string
  onInitialMessageSent?: () => void
  isAnonymous?: boolean
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  onFileRevert?: (path: string, content: string) => Promise<void>
  onFileChange?: (path: string, content: string) => void
  onCommit?: () => void
  onConversationId?: (id: string) => void
  pendingMessage?: string
  pendingMessageKey?: number
}

/**
 * Inner chat component that owns useChat state, message rendering, and input handling.
 * @param root0 - Component props.
 * @param root0.projectId - The project ID for the chat session.
 * @param root0.endpoint - The chat API endpoint URL.
 * @param root0.initialMessage - Optional message to auto-send on mount.
 * @param root0.onInitialMessageSent - Callback fired after the initial message is sent.
 * @param root0.onFileOpen - Callback to preview a file in the editor.
 * @param root0.onFileDoubleClick - Callback to pin a file tab in the editor.
 * @param root0.onFileDiff - Callback to open a side-by-side diff view.
 * @param root0.onFileRevert - Callback to revert a file to previous content.
 * @param root0.onFileChange - Callback when a file's content changes from AI edits.
 * @param root0.onCommit - Callback fired after a successful commit.
 * @param root0.onConversationId - Callback when the conversation ID is assigned.
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @returns The rendered chat inner component.
 */
function ChatInner({ projectId, endpoint, initialMessage, onInitialMessageSent, isAnonymous, onFileOpen, onFileDoubleClick, onFileDiff, onFileRevert, onFileChange, onCommit, onConversationId, pendingMessage, pendingMessageKey }: ChatInnerProps): JSX.Element {
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const borderClr = isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'
  const http = useHttpClient()
  // If there's already a conversation (conversationId in the URL), always load
  // history — even when initialMessage is set. This prevents a refresh from
  // re-sending the initial prompt instead of restoring the existing conversation.
  const hasConversation = endpoint.includes('conversationId=')
  const { messages, isLoading, error, sendMessage, abort, clearHistory } = useChat({
    endpoint,
    projectId,
    loadOnMount: hasConversation || !initialMessage,
    onFileChange,
    onConversationId,
  })

  // ── Commit ─────────────────────────────────────────────────────────────────
  const [commitState, setCommitState] = useState<{
    status: 'committing' | 'committed' | 'error'
    message?: string
  } | null>(null)
  const [pendingFiles, setPendingFiles] = useState<{ path: string; status: string; additions?: number; deletions?: number }[] | null>(null)
  const [commitBarExpanded, setCommitBarExpanded] = useState(false)
  const [commitCards, setCommitCards] = useState<CommitCard[]>([])

  // ── Input ──────────────────────────────────────────────────────────────────
  // The textarea is uncontrolled to avoid re-rendering the entire ChatInner on
  // every keystroke.  `inputRef` holds the current value; `hasInput` is a
  // boolean state used only by the submit button's disabled prop.
  const draftKey = `mol-chat-draft:${projectId}`
  const inputRef = useRef<string>((() => {
    try { return sessionStorage.getItem(draftKey) ?? '' } catch { return '' }
  })())
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
  const setInputValue = useCallback((val: string) => {
    inputRef.current = val
    const ta = textareaRef.current
    if (ta && ta.value !== val) ta.value = val
    setHasInput(Boolean(val.trim()))
  }, [])

  // Persist draft text to sessionStorage so it survives refresh (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistDraft = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const v = inputRef.current
        if (v) sessionStorage.setItem(draftKey, v)
        else sessionStorage.removeItem(draftKey)
      } catch { /* quota exceeded or unavailable */ }
    }, 500)
  }, [draftKey])

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const speechCtorRef = useRef(
    typeof window !== 'undefined'
      ? (window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      : undefined,
  )
  const hasSpeechRecognition = Boolean(speechCtorRef.current)
  type SpeechRec = { start(): void; stop(): void; abort(): void; onresult: ((e: unknown) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null; continuous: boolean; interimResults: boolean; lang: string }
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
      const event = e as { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }
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
      if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'language-not-supported') {
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
      if (voiceRestartTimer.current) { clearTimeout(voiceRestartTimer.current); voiceRestartTimer.current = null }
      recognitionRef.current?.stop()
      return
    }
    voiceIntentRef.current = true
    voiceFailCount.current = 0
    setIsListening(true)
    startRecognition()
  }, [isListening, startRecognition])

  // Stop recognition on unmount
  useEffect(() => () => {
    voiceIntentRef.current = false
    if (voiceRestartTimer.current) { clearTimeout(voiceRestartTimer.current); voiceRestartTimer.current = null }
    recognitionRef.current?.abort()
  }, [])

  // ── File picker ────────────────────────────────────────────────────────────
  const [filePicker, setFilePicker] = useState<FilePicker | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  // ── Command menu ───────────────────────────────────────────────────────────
  const [commandMenu, setCommandMenu] = useState<CommandMenu | null>(null)

  // ── Model picker (shown when typing /model <filter>) ──────────────────────
  const [modelPicker, setModelPicker] = useState<ModelPicker | null>(null)

  // ── Current project settings (model + maxloops) ───────────────────────────
  const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODEL)
  const [currentMaxLoops, setCurrentMaxLoops] = useState<number>(25)
  useEffect(() => {
    http.get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        if (typeof s?.chatModel === 'string') setCurrentModel(s.chatModel)
        if (typeof s?.maxToolLoops === 'number') setCurrentMaxLoops(s.maxToolLoops)
      })
      .catch(() => {/* ignore */})
  }, [http, projectId])

  // ── System cards (persistent inline notifications in chat history) ────────
  const [systemCards, setSystemCards] = useState<SystemCard[]>([])
  const addSystemCard = useCallback((text: string) => {
    setSystemCards((prev) => [...prev, { id: crypto.randomUUID(), text, timestamp: Date.now() }])
  }, [])

  // ── Input focus ────────────────────────────────────────────────────────────
  const [isFocused, setIsFocused] = useState(false)

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sentInitialRef = useRef<string | null>(null)

  // ── Git status ─────────────────────────────────────────────────────────────
  const [gitStatusTick, setGitStatusTick] = useState(0)
  const refreshGitStatus = useCallback(() => setGitStatusTick((n) => n + 1), [])
  useEffect(() => {
    if (isLoading) return
    http
      .get<{ files: { path: string; status: string; additions?: number; deletions?: number }[] }>(`/projects/${projectId}/git-status`)
      .then((res) => setPendingFiles(res.data.files.length > 0 ? res.data.files : null))
      .catch(() => setPendingFiles(null))
  }, [isLoading, projectId, gitStatusTick])

  // Wrap onFileRevert so undo/redo also refreshes git status
  const handleFileRevert = useCallback(
    async (path: string, content: string) => {
      await onFileRevert?.(path, content)
      refreshGitStatus()
    },
    [onFileRevert, refreshGitStatus],
  )

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  // Debounced to avoid stacking smooth-scroll animations during streaming,
  // which can cause the browser to spend all its time computing scroll positions.
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  // ── Auto-send pending message (e.g. "Fix with AI") ────────────────────────
  // Initialize ref with current key so remounting (conversation switch) won't re-send.
  const lastPendingKeyRef = useRef(pendingMessageKey)
  useEffect(() => {
    if (pendingMessage && pendingMessageKey !== undefined && pendingMessageKey !== lastPendingKeyRef.current) {
      lastPendingKeyRef.current = pendingMessageKey
      sendMessage(pendingMessage)
    }
  }, [pendingMessage, pendingMessageKey, sendMessage])

  // ── Commit ─────────────────────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    setCommitState({ status: 'committing' })
    const cardId = `commit-${Date.now()}`
    setCommitCards((prev) => [
      ...prev,
      { id: cardId, message: '', files: [], timestamp: Date.now(), status: 'running' },
    ])
    try {
      const result = await http.post<{ ok: boolean; committed: boolean; message?: string; files?: string[] }>(
        `/projects/${projectId}/commit`,
        {},
      )
      if (result.data.committed) {
        const msg = result.data.message ?? t('ide.chat.committed')
        setCommitState({ status: 'committed', message: msg })
        setPendingFiles(null)
        setCommitBarExpanded(false)
        setCommitCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, message: msg, files: result.data.files ?? [], status: 'done' as const } : c)),
        )
        onCommit?.()
        setTimeout(() => setCommitState(null), 3000)
      } else {
        setCommitCards((prev) => prev.filter((c) => c.id !== cardId))
        setCommitState(null)
      }
    } catch {
      setCommitCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: 'error' as const, message: t('ide.chat.commitFailed', undefined, { defaultValue: 'Commit failed' }) } : c)),
      )
      setCommitState({ status: 'error' })
      setTimeout(() => setCommitState(null), 3000)
    }
  }, [http, projectId, onCommit])

  // ── File picker ────────────────────────────────────────────────────────────
  const openFilePicker = useCallback(
    async (query: string, currentPath = '/app') => {
      try {
        const res = await http.get<{ path: string; entries: FileEntry[] }>(
          `/projects/${projectId}/files?path=${encodeURIComponent(currentPath)}`,
        )
        setFilePicker({ entries: res.data.entries, currentPath, query, selectedIdx: 0 })
      } catch {
        setFilePicker(null)
      }
    },
    [http, projectId],
  )

  const selectFileEntry = useCallback(
    (entry: FileEntry, currentPath: string) => {
      const entryPath = `${currentPath}/${entry.name}`
      if (entry.type === 'directory') {
        if (!entryPath.startsWith('/app')) return
        void openFilePicker(filePicker?.query ?? '', entryPath)
      } else {
        setAttachedFiles((prev) =>
          prev.some((f) => f.path === entryPath)
            ? prev
            : [...prev, {
                path: entryPath,
                filename: entry.name,
                mediaType: 'text/plain',
                size: entry.size ?? 0,
              }],
        )
        const prev = inputRef.current
        const before = prev.slice(0, mentionStart)
        const after = prev.slice(mentionStart + 1 + (filePicker?.query.length ?? 0))
        setInputValue(before + after)
        setFilePicker(null)
      }
    },
    [filePicker, mentionStart, openFilePicker],
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
        setAttachmentError(t('ide.chat.fileTooLarge', { maxSize: '20' }, { defaultValue: 'File is too large. Maximum size is {{maxSize}}MB.' }))
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFileAttachments(Array.from(e.target.files ?? []))
    e.target.value = ''
  }, [addFileAttachments])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
  }, [addFileAttachments])

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    addFileAttachments(Array.from(e.dataTransfer.files))
  }, [addFileAttachments])

  // ── Input change ───────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      inputRef.current = val
      setHasInput(Boolean(val.trim()))
      autoResize()
      persistDraft()

      const cursor = e.target.selectionStart ?? val.length
      const before = val.slice(0, cursor)

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
  const setInputAndCursorEnd = useCallback((val: string) => {
    setInputValue(val)
    autoResize()
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(val.length, val.length)
      }
    }, 0)
  }, [setInputValue, autoResize])

  /** Select and apply a model by ID. */
  const selectModel = useCallback(
    async (modelId: string, displayName?: string) => {
      setModelPicker(null)
      setInputValue('')
      try {
        await http.patch(`/projects/${projectId}`, { settings: { chatModel: modelId } })
        setCurrentModel(modelId)
        addSystemCard(
          t('ide.chat.modelSet', { name: displayName ?? modelId }, {
            defaultValue: `Chat model set to ${displayName ?? modelId}`,
          }),
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
      } else if (id === 'model') {
        setInputAndCursorEnd('/model ')
        setModelPicker({ selectedIdx: -1 })
      } else if (id === 'maxloops') {
        setInputAndCursorEnd('/maxloops ')
      }
    },
    [clearHistory, setInputAndCursorEnd],
  )

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Stop voice recognition on submit
    voiceIntentRef.current = false
    recognitionRef.current?.stop()

    const trimmed = (inputRef.current as string).trim()
    if (!trimmed && attachedFiles.length === 0) return

    // Handle /model <name> command locally
    const modelCmdMatch = trimmed.match(/^\/model(?:\s+(.+))?$/i)
    if (modelCmdMatch) {
      const query = modelCmdMatch[1]?.trim()
      if (!query) {
        addSystemCard(
          t('ide.chat.modelUsage', undefined, {
            defaultValue: 'Usage: /model <model-name>  (e.g. claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001)',
          }),
        )
      } else {
        // Resolve partial name to closest model
        const q = query.toLowerCase()
        const resolved = AVAILABLE_MODELS.find((m) => m.id === q)
          ?? AVAILABLE_MODELS.find((m) => m.id.toLowerCase().includes(q))
          ?? AVAILABLE_MODELS.find((m) => m.label.toLowerCase().includes(q))
        const name = resolved?.id ?? query
        try {
          await http.patch(`/projects/${projectId}`, { settings: { chatModel: name } })
          setCurrentModel(name)
          addSystemCard(
            t('ide.chat.modelSet', { name: resolved?.label ?? name }, {
              defaultValue: `Chat model set to ${resolved?.label ?? name}`,
            }),
          )
        } catch {
          addSystemCard(
            t('ide.chat.modelError', undefined, {
              defaultValue: 'Failed to update chat model.',
            }),
          )
        }
      }
      setInputValue('')
      setModelPicker(null)
      return
    }

    // Handle /maxloops <N> command locally
    const maxLoopsMatch = trimmed.match(/^\/maxloops\s+(\d+)$/i)
    if (maxLoopsMatch) {
      const n = Math.max(1, Math.min(Number(maxLoopsMatch[1]), 100))
      try {
        await http.patch(`/projects/${projectId}`, { settings: { maxToolLoops: n } })
        setCurrentMaxLoops(n)
        addSystemCard(
          t('ide.chat.maxLoopsSet', { n }, {
            defaultValue: `Max tool iterations set to ${n}`,
          }),
        )
      } catch {
        addSystemCard(
          t('ide.chat.maxLoopsError', undefined, {
            defaultValue: 'Failed to update max tool iterations.',
          }),
        )
      }
      setInputValue('')
      return
    }

    let message = trimmed
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
          try {
            const res = await http.get<{ content: string }>(
              `/projects/${projectId}/files${f.path}`,
            )
            const ext = f.path.split('.').pop() ?? ''
            message = (message ? `${message}\n\n` : '') +
              `<file path="${f.path}">\n\`\`\`${ext}\n${res.data.content}\n\`\`\`\n</file>`
          } catch {
            message = (message ? `${message}\n\n` : '') +
              `<file path="${f.path}">[Could not read file]</file>`
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
  const filteredCmds = commandMenu ? COMMANDS.filter((c) => c.label.startsWith(inputRef.current as string)) : []

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

  const filteredEntries = filePicker
    ? filePicker.entries
        .filter(
          (e) =>
            !filePicker.query || e.name.toLowerCase().includes(filePicker.query.toLowerCase()),
        )
        .slice(0, 12)
    : []

  /**
   * Wrap-around index: Down from -1 → 0, Up from -1 → last, wraps at both ends.
   * @param cur - The current index (-1 means no selection).
   * @param delta - The direction to move (+1 down, -1 up).
   * @param len - The total number of items.
   * @returns The new wrapped index.
   */
  const wrapIdx = (cur: number, delta: number, len: number): number => {
    if (cur === -1) return delta > 0 ? 0 : len - 1
    return ((cur + delta) % len + len) % len
  }

  // Store the handler in a ref so the native listener always calls the latest version.
  const keyDownRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyDownRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (modelPicker) { setModelPicker(null); return }
      if (filePicker) { setFilePicker(null); return }
      if (commandMenu) { setCommandMenu(null); return }
      if (isLoading) { abort(); return }
    }

    if (modelPicker && filteredModels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setModelPicker((m) => m ? { selectedIdx: wrapIdx(m.selectedIdx, 1, filteredModels.length) } : null)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setModelPicker((m) => m ? { selectedIdx: wrapIdx(m.selectedIdx, -1, filteredModels.length) } : null)
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
        setFilePicker((p) => p ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, 1, filteredEntries.length) } : null)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFilePicker((p) => p ? { ...p, selectedIdx: wrapIdx(p.selectedIdx, -1, filteredEntries.length) } : null)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const entry = filteredEntries[filePicker.selectedIdx]
        if (entry) selectFileEntry(entry, filePicker.currentPath)
        return
      }
    }

    if (commandMenu && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCommandMenu((m) => m ? { selectedIdx: wrapIdx(m.selectedIdx, 1, filteredCmds.length) } : null)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCommandMenu((m) => m ? { selectedIdx: wrapIdx(m.selectedIdx, -1, filteredCmds.length) } : null)
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
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay — covers entire chat area */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(64,112,224,0.08)', border: '2px dashed rgba(64,112,224,0.5)',
            borderRadius: '6px', pointerEvents: 'none',
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
      <div className={cm.sp('p', 3)} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', ...cm.sp({ pr: 1 }) }}>
        {timeline.map((item) => {
          if (item.kind === 'commit') return <CommitCardItem key={item.card.id} card={item.card} />

          if (item.kind === 'system') return (
            <div
              key={item.card.id}
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{ textAlign: 'center', padding: '6px 0' }}
            >
              {item.card.text}
            </div>
          )

          const { msg, msgIdx } = item

          // Persisted commit records render as commit cards
          if (msg.commitRecord) {
            const files = msg.commitRecord.files.map((f: string | { path: string }) => typeof f === 'string' ? f : f.path)
            return <CommitCardItem key={msg.id} card={{ id: msg.id, message: msg.commitRecord.message, files, timestamp: msg.timestamp, status: 'done' }} />
          }

          const prevMsg = messages[msgIdx - 1]
          const sameRoleAsPrev = prevMsg?.role === msg.role
          const isUser = msg.role === 'user'

          return (
            <div key={msg.id} style={{ marginBottom: '16px' }}>
              {isUser ? (
                <div
                  className={cm.cn(cm.surfaceSecondary, cm.textSize('sm'))}
                  style={{
                    borderRadius: '4px',
                    paddingLeft: '10px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {msg.attachments.map((att, ai) => (
                        <span
                          key={ai}
                          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
                        >
                          {att.mediaType.startsWith('image/') ? '\uD83D\uDDBC\uFE0F' : att.mediaType.startsWith('audio/') ? '\uD83C\uDFB5' : att.mediaType.startsWith('video/') ? '\uD83C\uDFA5' : '\uD83D\uDCC4'}
                          {' '}{att.filename}
                          <span style={{ fontSize: 10, opacity: 0.7 }}>({formatSize(att.size)})</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.queued && (
                    <span
                      className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                      style={{ display: 'block', marginTop: 2, fontStyle: 'italic' }}
                    >
                      {t('ide.chat.queued', undefined, { defaultValue: 'Queued' })}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ paddingLeft: sameRoleAsPrev ? '0' : '0' }}>
                  {msg.blocks?.map((block, bi) =>
                    (block as { type: string }).type === 'thinking' ? (
                      <ThinkingBlock
                        key={bi}
                        content={(block as { type: string; content: string }).content}
                      />
                    ) : null,
                  )}

                  {msg.isStreaming &&
                    (!msg.blocks || msg.blocks.every((b) => (b as { type: string }).type === 'thinking')) &&
                    !msg.content && (
                      <StreamingIndicator />
                    )}

                  {msg.blocks && msg.blocks.length > 0
                    ? msg.blocks.map((block, bi) => {
                        const blockType = (block as { type: string }).type
                        if (blockType === 'thinking') return null

                        const isLast = bi === msg.blocks!.length - 1

                        if (blockType === 'text') {
                          return (
                            <MarkdownContent
                              key={bi}
                              text={(block as { type: string; content: string }).content}
                              isStreaming={isLast && msg.isStreaming}
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
                              onFileOpen={onFileOpen}
                              onFileDoubleClick={onFileDoubleClick}
                              onFileDiff={onFileDiff}
                              onFileRevert={handleFileRevert}
                              onAskUserResponse={sendMessage}
                            />
                            {isLast && msg.isStreaming && (
                              <StreamingIndicator />
                            )}
                          </div>
                        )
                      })
                    : msg.content
                      ? <MarkdownContent text={msg.content} isStreaming={msg.isStreaming} />
                      : null}

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
                        onFileOpen={onFileOpen}
                        onFileDoubleClick={onFileDoubleClick}
                        onFileDiff={onFileDiff}
                        onFileRevert={handleFileRevert}
                        onAskUserResponse={sendMessage}
                      />
                    ))}

                  {msg.aborted && (
                    <span className={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                      {t('ide.chat.responseStopped', undefined, { defaultValue: 'Response stopped' })}
                    </span>
                  )}

                  {msg.loopLimitReached && !msg.isStreaming && (() => {
                    const loopActions: Array<{ label: string; action: () => void }> = [
                      {
                        label: t('ide.chat.changeModel', undefined, { defaultValue: 'Change model' }),
                        action: () => { setInputAndCursorEnd('/model '); setModelPicker({ selectedIdx: -1 }) },
                      },
                      {
                        label: t('ide.chat.increaseLoops', undefined, { defaultValue: 'Increase max loops' }),
                        action: () => { setInputAndCursorEnd('/maxloops ') },
                      },
                      {
                        label: t('ide.chat.continueButton', undefined, { defaultValue: 'Continue' }),
                        action: () => { void sendMessage(t('ide.chat.continuePrompt', undefined, { defaultValue: 'Continue implementing from where you left off.' })) },
                      },
                    ]
                    return (
                      <div style={{
                        marginTop: '8px',
                        borderRadius: '8px',
                        border: `1px solid ${borderClr}`,
                        background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '10px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderBottom: `1px solid ${borderClr}`,
                        }}>
                          {t('ide.chat.loopLimitReached', { max: msg.loopLimitReached }, {
                            defaultValue: `Reached the maximum of ${msg.loopLimitReached} tool iterations.`,
                          })}
                        </div>
                        {loopActions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={i === 0 && isLoading}
                            onClick={opt.action}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isLight ? '#eaeef2' : 'rgba(255,255,255,0.06)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
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
                            <span style={{
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
                            }}>
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
        })}


        {error && (
          <div
            className={cm.cn(cm.textSize('sm'), cm.sp('p', 2), cm.sp('mb', 2), cm.bgErrorSubtle, cm.textError)}
            style={{ borderRadius: '6px' }}
          >
            {error}
          </div>
        )}



        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        className={cm.cn(cm.shrink0, cm.borderT)}
        style={{ position: 'relative' }}
      >
        {/* Attachment error */}
        {attachmentError && (
          <div
            className={cm.cn(cm.textSize('xs'), cm.textError)}
            style={{ padding: '4px 10px' }}
          >
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '4px', padding: '2px 6px' }}
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, lineHeight: 1, padding: 0, fontSize: '13px' }}
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
        {commandMenu && filteredCmds.length > 0 && (
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
            }}
          >
            {filteredCmds.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => void executeCommand(cmd.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx === commandMenu.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent' }}
                className={cm.w('full')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  border: 'none',
                  borderTop: idx > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  textAlign: 'left',
                  fontSize: '13px',
                  background: idx === commandMenu.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                }}
              >
                <span className={cm.fontWeight('medium')} style={{ fontFamily: 'monospace', opacity: 0.9 }}>{cmd.label}</span>
                <span className={cm.textMuted} style={{ fontSize: '12px' }}>
                  {cmd.description}
                  {cmd.id === 'model' && ` (current: ${AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel})`}
                  {cmd.id === 'maxloops' && ` (current: ${currentMaxLoops})`}
                </span>
              </button>
            ))}
          </div>
        )}

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
              maxHeight: '60vh',
            }}
          >
            <div
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{ padding: '5px 12px', borderBottom: '1px solid rgba(128,128,128,0.12)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}
            >
              <span>{t('ide.chat.selectModel', undefined, { defaultValue: 'Select model' })}</span>
              <span>{t('ide.chat.currentModelLabel', { model: AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel }, { defaultValue: `Current: ${AVAILABLE_MODELS.find((m) => m.id === currentModel)?.label ?? currentModel}` })}</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredModels.map((model, idx) => {
              const badges: Array<{ label: string; bg: string; fg: string }> = []
              if (model.supportsVision) badges.push({ label: 'vision',
                bg: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
                fg: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)' })
              if (model.supportsThinking) badges.push({ label: 'thinking',
                bg: isLight ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.18)',
                fg: isLight ? 'rgb(126,34,206)' : 'rgb(192,132,252)' })
              if (model.webSearchToolType) badges.push({ label: 'web search',
                bg: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
                fg: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)' })
              if (model.supportsPromptCaching) badges.push({ label: 'caching',
                bg: isLight ? 'rgba(202,138,4,0.12)' : 'rgba(234,179,8,0.18)',
                fg: isLight ? 'rgb(161,98,7)' : 'rgb(250,204,21)' })
              const providerColors: Record<string, string> = {
                anthropic: '#d97706',
                openai: '#10b981',
                google: '#3b82f6',
                xai: '#ef4444',
                meta: '#6366f1',
                moonshot: '#8b5cf6',
                minimax: '#ec4899',
                alibaba: '#f97316',
                zhipu: '#14b8a6',
              }
              const accent = providerColors[model.provider] ?? '#888'
              const locked = isAnonymous && model.id !== DEFAULT_MODEL
              // Price-based color: green ≤$1, yellow ≤$3, red >$3 (input per MTok)
              const priceColor = model.inputPricePerMTok <= 1
                ? (isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)')
                : model.inputPricePerMTok <= 3
                  ? (isLight ? 'rgb(161,98,7)' : 'rgb(250,204,21)')
                  : (isLight ? 'rgb(220,38,38)' : 'rgb(248,113,113)')
              return (
              <button
                key={model.id}
                type="button"
                onClick={() => { if (!locked) void selectModel(model.id, model.label) }}
                onMouseEnter={(e) => { if (!locked) (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx === modelPicker.selectedIdx && !locked ? 'rgba(128,128,128,0.1)' : 'transparent' }}
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
                  background: idx === modelPicker.selectedIdx && !locked ? 'rgba(128,128,128,0.1)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span className={cm.fontWeight('medium')}>{model.label}</span>
                  <span style={{ fontSize: '10px', color: accent, opacity: 0.85 }}>{model.provider}</span>
                  {model.id === currentModel && (
                    <span style={{ fontSize: '10px', background: 'rgba(128,128,128,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
                      {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                    </span>
                  )}
                  {locked && (
                    <span style={{ fontSize: '10px', marginLeft: 'auto', background: 'rgba(128,128,128,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
                      {t('ide.chat.signUpRequired', undefined, { defaultValue: 'Sign up to use' })}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{model.description}</span>
                <span style={{ fontSize: '11px', opacity: 0.65 }}>
                  {formatTokenCount(model.contextWindow)} ctx · {formatTokenCount(model.maxOutputTokens)} out · <span style={{ color: priceColor }}>${model.inputPricePerMTok}/{model.outputPricePerMTok}</span>/MTok · {model.knowledgeCutoff}
                </span>
                {badges.length > 0 && (
                  <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '1px' }}>
                    {badges.map((b) => (
                      <span key={b.label} style={{ fontSize: '10px', color: b.fg, background: b.bg, padding: '1px 5px', borderRadius: '3px' }}>{b.label}</span>
                    ))}
                  </span>
                )}
              </button>
              )
            })}
            </div>
          </div>
        )}

        {/* File picker popup */}
        {filePicker && filteredEntries.length > 0 && (
          <div
            className={cm.cn(cm.surfaceSecondary, cm.borderAll)}
            style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, borderRadius: '6px', overflow: 'hidden', zIndex: 50 }}
          >
            <div
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={{ padding: '3px 10px', borderBottom: '1px solid rgba(128,128,128,0.2)', fontFamily: 'monospace' }}
            >
              {filePicker.currentPath}
            </div>
            {filteredEntries.map((entry, idx) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => selectFileEntry(entry, filePicker.currentPath)}
                className={cm.cn(cm.w('full'), cm.textSize('sm'), idx === filePicker.selectedIdx ? cm.surface : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', border: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}
              >
                <span style={{ opacity: 0.5, fontSize: '10px', width: '12px' }}>
                  {entry.type === 'directory' ? '▶' : ''}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{entry.name}</span>
                {entry.type !== 'directory' && entry.size != null && (
                  <span className={cm.textMuted} style={{ marginLeft: 'auto', fontSize: '10px' }}>
                    {entry.size < 1024 ? `${entry.size}B` : `${Math.round(entry.size / 1024)}KB`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCommitBarExpanded((v) => !v) } }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
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
                  <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                  {commitState?.status === 'committed'
                    ? commitState.message
                    : commitState?.status === 'error'
                      ? t('ide.chat.commitFailed')
                      : `${pendingFiles.length} uncommitted ${pendingFiles.length === 1 ? 'file' : 'files'}`}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCommit() }}
                disabled={commitState?.status === 'committing' || commitState?.status === 'committed'}
                onMouseEnter={(e) => { if (!(commitState?.status === 'committing' || commitState?.status === 'committed')) { e.currentTarget.style.background = 'rgba(64,112,224,0.25)'; e.currentTarget.style.borderColor = 'rgba(64,112,224,0.65)'; e.currentTarget.style.color = '#6090f0' } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(64,112,224,0.15)'; e.currentTarget.style.borderColor = 'rgba(64,112,224,0.4)'; e.currentTarget.style.color = '#4070e0' }}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(64,112,224,0.4)',
                  background: 'rgba(64,112,224,0.15)',
                  color: '#4070e0',
                  cursor: commitState?.status === 'committing' || commitState?.status === 'committed' ? 'not-allowed' : 'pointer',
                  opacity: commitState?.status === 'committing' || commitState?.status === 'committed' ? 0.5 : 1,
                  transition: 'background 100ms, border-color 100ms, color 100ms',
                }}
              >
                {commitState?.status === 'committing' ? t('ide.chat.committing') : t('ide.chat.commit')}
              </button>
            </div>
            {commitBarExpanded && (
              <div style={{ marginTop: 4, paddingLeft: 16 }}>
                {pendingFiles.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => onFileDiff?.(f.path)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#6090f0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '' }}
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
                      <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, opacity: 0.8 }}>
                        {!!f.additions && <span style={{ color: '#3fb950' }}>+{f.additions}</span>}
                        {!!f.additions && !!f.deletions && ' '}
                        {!!f.deletions && <span style={{ color: '#f85149' }}>-{f.deletions}</span>}
                      </span>
                    )}
                    {onFileRevert && (
                      <span
                        role="button"
                        tabIndex={0}
                        title={t('ide.chat.revertFile', undefined, { defaultValue: 'Revert to last commit' })}
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
                                onFileChange?.(f.path, '')
                              } else {
                                // Re-fetch file content from sandbox to update editor
                                http
                                  .get<{ content: string }>(`/projects/${projectId}/files/${f.path}`)
                                  .then((res) => onFileChange?.(f.path, res.data.content))
                                  .catch(() => {/* ignore */})
                              }
                            })
                            .catch(() => {/* ignore */})
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(128,128,128,0.2)'; e.currentTarget.style.opacity = '1' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.5' }}
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
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
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
          {/* Hint row: shortcuts · send */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '6px', gap: '4px' }}>
            {([
              {
                sym: '@',
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
                sym: '/',
                onClick: () => {
                  if (!(inputRef.current as string)) {
                    setInputValue('/')
                    autoResize()
                    setCommandMenu({ selectedIdx: -1 })
                  }
                  setTimeout(() => { textareaRef.current?.focus() }, 0)
                },
              },
            ] as const).map(({ sym, onClick }) => (
              <button
                key={sym}
                type="button"
                className={cm.textSize('xs')}
                onClick={onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  opacity: 0.4,
                  padding: '2px 5px',
                  borderRadius: '3px',
                  fontFamily: 'inherit',
                  transition: 'opacity 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
              >
                {sym}
              </button>
            ))}
            {/* Attachment button */}
            <button
              type="button"
              className={cm.textSize('xs')}
              onClick={() => fileInputRef.current?.click()}
              title={t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                opacity: 0.4,
                padding: '2px 5px',
                borderRadius: '3px',
                fontFamily: 'inherit',
                transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" style={{ display: 'block' }}>
                <path d="M14 5.5L7.5 12a3.54 3.54 0 01-5-5L9 .5a2.12 2.12 0 013 3l-6.5 6.5a.71.71 0 01-1-1L11 2.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Voice input button — only rendered when Web Speech API is available */}
            {hasSpeechRecognition && (
              <button
                type="button"
                className={cm.textSize('xs')}
                onClick={toggleVoice}
                title={t('ide.chat.voice', undefined, { defaultValue: isListening ? 'Stop dictation' : 'Dictate' })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isListening ? 'rgb(239,68,68)' : 'inherit',
                  opacity: isListening ? 1 : 0.4,
                  padding: '2px 5px',
                  borderRadius: '3px',
                  fontFamily: 'inherit',
                  transition: 'opacity 100ms, color 100ms',
                }}
                onMouseEnter={(e) => { if (!isListening) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { if (!isListening) e.currentTarget.style.opacity = '0.4' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" style={{ display: 'block' }}>
                  <rect x="6" y="1" width="4" height="8" rx="2" fill={isListening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.25" />
                  <path d="M4 7v1a4 4 0 008 0V7" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div style={{ marginLeft: '4px', display: 'flex', gap: '4px' }}>
              {isLoading && (
                <button type="button" onClick={abort} className={cm.button({ color: 'error', size: 'sm' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" style={{ display: 'block' }}>
                    <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!hasInput && attachedFiles.length === 0}
                className={cm.button({ color: 'primary', size: 'sm' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" style={{ display: 'block' }}>
                  <path d="M 4,8 L 8,4 L 12,8 M 8,4 L 8,13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
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
 * @param root0.onFileOpen - Callback to preview a file in the editor.
 * @param root0.onFileDoubleClick - Callback to pin a file tab in the editor.
 * @param root0.onFileDiff - Callback to open a side-by-side diff view.
 * @param root0.onFileRevert - Callback to revert a file to previous content.
 * @param root0.onFileChange - Callback when a file's content changes from AI edits.
 * @param root0.onCommit - Callback fired after a successful commit.
 * @param root0.pendingMessage - An externally triggered message to send.
 * @param root0.pendingMessageKey - Key to distinguish repeated pending messages.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered chat panel element.
 */
export function ChatPanel({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onFileChange,
  onCommit,
  pendingMessage,
  pendingMessageKey,
  isAnonymous,
  className,
}: ChatPanelProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const baseEndpoint = endpoint ?? `/projects/${projectId}/chat`

  const storageKey = `mol-chat-conv:${projectId}`
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => localStorage.getItem(storageKey),
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

  const handleToggleDropdown = useCallback(() => {
    setShowDropdown((v) => {
      if (!v) void fetchConversations()
      return !v
    })
  }, [fetchConversations])

  const persistConversationId = useCallback((id: string | null) => {
    setActiveConversationId(id)
    if (id) localStorage.setItem(storageKey, id)
    else localStorage.removeItem(storageKey)
  }, [storageKey])

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

  const handleSelectConversation = useCallback((id: string) => {
    persistConversationId(id)
    setChatKey(id)
    setShowDropdown(false)
    setConvSearch('')
  }, [persistConversationId])

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
    ? conversations.filter((c) =>
        c.preview?.toLowerCase().includes(convSearch.toLowerCase()),
      )
    : conversations

  const activeConv = conversations.find((c) => c.id === activeConversationId)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, cm.borderR, className)}>

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
          onMouseEnter={(e) => { const s = (e.currentTarget as HTMLElement).querySelector('span'); if (s) (s as HTMLElement).style.opacity = '1' }}
          onMouseLeave={(e) => { const s = (e.currentTarget as HTMLElement).querySelector('span'); if (s) (s as HTMLElement).style.opacity = '0.7' }}
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
            <polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.7,
            }}
          >
            {activeConv?.preview ? activeConv.preview.slice(0, 40) : 'Chat history'}
          </span>
        </button>

        {/* New chat button */}
        <button
          type="button"
          onClick={handleNewChat}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
          title="New chat"
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
                placeholder="Search conversations…"
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
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
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
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}
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
        onFileOpen={onFileOpen}
        onFileDoubleClick={onFileDoubleClick}
        onFileDiff={onFileDiff}
        onFileRevert={onFileRevert}
        onFileChange={onFileChange}
        onCommit={onCommit}
        onConversationId={persistConversationId}
        pendingMessage={pendingMessage}
        pendingMessageKey={pendingMessageKey}
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

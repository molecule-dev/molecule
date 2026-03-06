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
 * - Commit button at bottom of messages; commit records appear inline
 * - Escape: close menus or abort the active stream
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useChat, useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ChatPanelProps } from '../types.js'
import { MarkdownContent } from './MarkdownContent.js'
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
  path: string // absolute within sandbox, e.g. /app/src/App.tsx
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

const COMMANDS = [
  { id: 'clear' as const, label: '/clear', description: 'Clear chat history' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 *
 * @param iso
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

// ---------------------------------------------------------------------------
// Thinking block
// ---------------------------------------------------------------------------

/**
 *
 * @param root0
 * @param root0.content
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
 *
 * @param root0
 * @param root0.card
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
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string) => void
}

/**
 *
 * @param root0
 * @param root0.projectId
 * @param root0.endpoint
 * @param root0.initialMessage
 * @param root0.onFileOpen
 * @param root0.onFileDoubleClick
 * @param root0.onFileDiff
 */
function ChatInner({ projectId, endpoint, initialMessage, onFileOpen, onFileDoubleClick, onFileDiff }: ChatInnerProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { messages, isLoading, error, sendMessage, abort, clearHistory } = useChat({
    endpoint,
    projectId,
    loadOnMount: !initialMessage,
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
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── File picker ────────────────────────────────────────────────────────────
  const [filePicker, setFilePicker] = useState<FilePicker | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  // ── Command menu ───────────────────────────────────────────────────────────
  const [commandMenu, setCommandMenu] = useState<CommandMenu | null>(null)

  // ── Input focus ────────────────────────────────────────────────────────────
  const [isFocused, setIsFocused] = useState(false)

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sentInitialRef = useRef<string | null>(null)

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [inputValue])

  // ── Git status ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    http
      .get<{ files: { path: string; status: string }[] }>(`/projects/${projectId}/git-status`)
      .then((res) => setPendingFiles(res.data.files.length > 0 ? res.data.files : null))
      .catch(() => setPendingFiles(null))
  }, [isLoading, projectId])

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, commitCards])

  // ── Auto-send initial message ──────────────────────────────────────────────
  useEffect(() => {
    if (initialMessage && sentInitialRef.current !== initialMessage) {
      sentInitialRef.current = initialMessage
      sendMessage(initialMessage)
    }
  }, [initialMessage, sendMessage])

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
  }, [http, projectId])

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
          prev.some((f) => f.path === entryPath) ? prev : [...prev, { path: entryPath }],
        )
        setInputValue((prev) => {
          const before = prev.slice(0, mentionStart)
          const after = prev.slice(mentionStart + 1 + (filePicker?.query.length ?? 0))
          return before + after
        })
        setFilePicker(null)
      }
    },
    [filePicker, mentionStart, openFilePicker],
  )

  const removeAttachment = useCallback((path: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== path))
  }, [])

  // ── Input change ───────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInputValue(val)

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

      if (val.startsWith('/') && !val.includes(' ')) {
        setCommandMenu({ selectedIdx: 0 })
      } else {
        setCommandMenu(null)
      }
    },
    [openFilePicker],
  )

  // ── Execute command ────────────────────────────────────────────────────────
  const executeCommand = useCallback(
    async (_id: 'clear') => {
      setCommandMenu(null)
      setInputValue('')
      await clearHistory()
      setCommitCards([])
    },
    [clearHistory],
  )

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim()
    if ((!trimmed && attachedFiles.length === 0) || isLoading) return

    let message = trimmed
    if (attachedFiles.length > 0) {
      const fileContexts = await Promise.all(
        attachedFiles.map(async (f) => {
          try {
            const res = await http.get<{ content: string }>(
              `/projects/${projectId}/files${f.path}`,
            )
            const ext = f.path.split('.').pop() ?? ''
            return `<file path="${f.path}">\n\`\`\`${ext}\n${res.data.content}\n\`\`\`\n</file>`
          } catch {
            return `<file path="${f.path}">[Could not read file]</file>`
          }
        }),
      )
      message = (message ? `${message}\n\n` : '') + fileContexts.join('\n\n')
    }

    setInputValue('')
    setAttachedFiles([])
    sendMessage(message)
  }, [attachedFiles, http, inputValue, isLoading, projectId, sendMessage])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const filteredCmds = commandMenu ? COMMANDS.filter((c) => c.label.startsWith(inputValue)) : []

  const filteredEntries = filePicker
    ? filePicker.entries
        .filter(
          (e) =>
            !filePicker.query || e.name.toLowerCase().includes(filePicker.query.toLowerCase()),
        )
        .slice(0, 12)
    : []

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        if (filePicker) { setFilePicker(null); return }
        if (commandMenu) { setCommandMenu(null); return }
        if (isLoading) { abort(); return }
      }

      if (filePicker) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setFilePicker((p) =>
            p ? { ...p, selectedIdx: Math.min(p.selectedIdx + 1, filteredEntries.length - 1) } : null,
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setFilePicker((p) => (p ? { ...p, selectedIdx: Math.max(p.selectedIdx - 1, 0) } : null))
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const entry = filteredEntries[filePicker.selectedIdx]
          if (entry) selectFileEntry(entry, filePicker.currentPath)
          return
        }
      }

      if (commandMenu) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setCommandMenu((m) =>
            m ? { selectedIdx: Math.min(m.selectedIdx + 1, filteredCmds.length - 1) } : null,
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setCommandMenu((m) => (m ? { selectedIdx: Math.max(m.selectedIdx - 1, 0) } : null))
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const cmd = filteredCmds[commandMenu.selectedIdx]
          if (cmd) void executeCommand(cmd.id)
          return
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [abort, commandMenu, executeCommand, filePicker, filteredCmds, filteredEntries, handleSubmit, isLoading, selectFileEntry],
  )

  // Build a unified timeline so commit cards appear at the correct position
  type TimelineItem =
    | { kind: 'message'; msg: (typeof messages)[number]; msgIdx: number }
    | { kind: 'commit'; card: CommitCard }
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...messages.map((msg, i) => ({ kind: 'message' as const, msg, msgIdx: i })),
      ...commitCards.map((card) => ({ kind: 'commit' as const, card })),
    ]
    items.sort((a, b) => {
      const tA = a.kind === 'message' ? a.msg.timestamp : a.card.timestamp
      const tB = b.kind === 'message' ? b.msg.timestamp : b.card.timestamp
      return tA - tB
    })
    return items
  }, [messages, commitCards])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Messages ── */}
      <div className={cm.sp('p', 3)} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', ...cm.sp({ pr: 1 }) }}>
        {timeline.map((item) => {
          if (item.kind === 'commit') return <CommitCardItem key={item.card.id} card={item.card} />

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
                      <span style={{ animation: 'mol-cursor-blink 1s step-start infinite' }}>{'\u2588'}</span>
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
                            />
                            {isLast && msg.isStreaming && (
                              <span style={{ animation: 'mol-cursor-blink 1s step-start infinite' }}>
                                {'\u2588'}
                              </span>
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
                      />
                    ))}

                  {msg.aborted && (
                    <span className={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                      {t('ide.chat.responseStopped', undefined, { defaultValue: 'Response stopped' })}
                    </span>
                  )}
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
        {/* File attachment chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {attachedFiles.map((f) => (
              <span
                key={f.path}
                className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '4px', padding: '2px 6px' }}
              >
                <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>{f.path.split('/').pop()}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(f.path)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, lineHeight: 1, padding: 0, fontSize: '13px' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Command menu popup */}
        {commandMenu && filteredCmds.length > 0 && (
          <div
            className={cm.cn(cm.surfaceSecondary, cm.borderAll)}
            style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, borderRadius: '6px', overflow: 'hidden', zIndex: 50 }}
          >
            {filteredCmds.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => void executeCommand(cmd.id)}
                className={cm.cn(cm.w('full'), cm.textSize('sm'), idx === commandMenu.selectedIdx ? cm.surface : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', border: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}
              >
                <span className={cm.fontWeight('medium')} style={{ fontFamily: 'monospace' }}>{cmd.label}</span>
                <span className={cm.textMuted}>{cmd.description}</span>
              </button>
            ))}
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

        {/* Commit bar — anchored above the textarea */}
        {pendingFiles != null && pendingFiles.length > 0 && (
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
                    {(f.additions != null || f.deletions != null) && (
                      <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, opacity: 0.8 }}>
                        {f.additions != null && <span style={{ color: '#3fb950' }}>+{f.additions}</span>}
                        {f.additions != null && f.deletions != null && ' '}
                        {f.deletions != null && <span style={{ color: '#f85149' }}>-{f.deletions}</span>}
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
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
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
                  const pos = textareaRef.current?.selectionStart ?? inputValue.length
                  const newVal = inputValue.slice(0, pos) + '@' + inputValue.slice(pos)
                  setInputValue(newVal)
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
                  if (!inputValue) {
                    setInputValue('/')
                    setCommandMenu({ selectedIdx: 0 })
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
            <div style={{ marginLeft: '4px' }}>
              {isLoading ? (
                <button type="button" onClick={abort} className={cm.button({ color: 'error', size: 'sm' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" style={{ display: 'block' }}>
                    <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!inputValue.trim() && attachedFiles.length === 0}
                  className={cm.button({ color: 'primary', size: 'sm' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" style={{ display: 'block' }}>
                    <path d="M 4,8 L 8,4 L 12,8 M 8,4 L 8,13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
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
 * @param root0.onFileOpen
 * @param root0.onFileDoubleClick
 * @param root0.onFileDiff
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered chat panel element.
 */
export function ChatPanel({
  projectId,
  endpoint,
  initialMessage,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  className,
}: ChatPanelProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const baseEndpoint = endpoint ?? `/projects/${projectId}/chat`

  const storageKey = `mol-chat-conv:${projectId}`
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => localStorage.getItem(storageKey),
  )
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
    } catch {
      persistConversationId(null)
    }
    setShowDropdown(false)
    setConvSearch('')
  }, [http, persistConversationId, projectId])

  const handleSelectConversation = useCallback((id: string) => {
    persistConversationId(id)
    setShowDropdown(false)
    setConvSearch('')
  }, [persistConversationId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
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
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>

      {/* ── Header: conversation selector ── */}
      <div
        ref={dropdownRef}
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
          cm.sp('px', 2),
          cm.shrink0,
          cm.borderB,
        )}
        style={{ position: 'relative', minHeight: '36px' }}
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
        key={activeConversationId ?? 'default'}
        projectId={projectId}
        endpoint={chatEndpoint}
        initialMessage={initialMessage}
        onFileOpen={onFileOpen}
        onFileDoubleClick={onFileDoubleClick}
        onFileDiff={onFileDiff}
      />
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'

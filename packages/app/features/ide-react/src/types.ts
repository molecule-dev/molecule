/**
 * Types for IDE React components.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { EditorTab } from '@molecule/app-code-editor'
import type { DeviceFrame } from '@molecule/app-live-preview'

/**
 * Properties for workspace layout.
 */
export interface WorkspaceLayoutProps {
  children: ReactNode
  className?: string
}

/**
 * Properties for chat panel.
 */
export interface ChatPanelProps {
  projectId: string
  endpoint?: string
  /** If provided, auto-send this message once on mount (e.g., prompt from landing page). */
  initialMessage?: string
  className?: string
}

/**
 * Properties for the editor panel component.
 */
export interface EditorPanelProps {
  className?: string
}

/**
 * Properties for preview panel.
 */
export interface PreviewPanelProps {
  className?: string
}

/**
 * Properties for tab bar.
 */
export interface TabBarProps {
  tabs: EditorTab[]
  activeFile: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  className?: string
}

/**
 * Properties for file explorer.
 */
export interface FileExplorerProps {
  files: FileNode[]
  onFileSelect: (path: string) => void
  className?: string
}

/**
 * File Node interface.
 */
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

/**
 * Properties for resize handle.
 */
export interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Properties for device frame selector.
 */
export interface DeviceFrameSelectorProps {
  current: DeviceFrame
  onChange: (device: DeviceFrame) => void
  className?: string
}

/**
 * Properties for tool call card.
 */
export interface ToolCallCardProps {
  id: string
  name: string
  input?: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  className?: string
}

/**
 * Properties for the chat message item component.
 */
export interface ChatMessageItemProps {
  message: ChatMessage
  className?: string
}
